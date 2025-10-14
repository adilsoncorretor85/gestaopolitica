/**
 * Sistema de cache inteligente para otimizar performance
 * Implementa cache em memória com TTL e estratégias de invalidação
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  tags?: string[];
}

interface CacheOptions {
  ttl?: number; // Time to live em milissegundos
  tags?: string[]; // Tags para invalidação em lote
  maxSize?: number; // Tamanho máximo do cache
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 minutos por padrão
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Limpeza automática a cada minuto
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = this.defaultTTL, tags = [] } = options;
    
    // Remove entrada mais antiga se cache estiver cheio
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags
    });
  }

  /**
   * Recupera dados do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verifica se expirou
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Verifica se uma chave existe no cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Remove uma entrada específica do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalida cache por tags
   */
  invalidateByTags(tags: string[]): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Limpeza automática de entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove a entrada mais antiga
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Verifica se uma entrada expirou
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Calcula taxa de acerto (simplificado)
   */
  private calculateHitRate(): number {
    // Implementação simplificada - em produção seria mais complexa
    return 0.85; // 85% de taxa de acerto estimada
  }

  /**
   * Estima uso de memória
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry).length * 2; // Aproximação
    }
    return size;
  }
}

// Instância global do cache
export const cache = new CacheManager();

// Hooks para React
import { useCallback, useRef } from 'react';

/**
 * Hook para usar cache em componentes React
 */
export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000, tags = [] } = options;
  const loadingRef = useRef(false);

  const get = useCallback(async (): Promise<T> => {
    // Verifica cache primeiro
    const cached = cache.get<T>(key);
    if (cached) {
      return cached;
    }

    // Evita múltiplas requisições simultâneas
    if (loadingRef.current) {
      return new Promise((resolve) => {
        const checkCache = () => {
          const cached = cache.get<T>(key);
          if (cached) {
            resolve(cached);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    loadingRef.current = true;

    try {
      const data = await fetcher();
      cache.set(key, data, { ttl, tags });
      return data;
    } finally {
      loadingRef.current = false;
    }
  }, [key, fetcher, ttl, tags]);

  const invalidate = useCallback(() => {
    cache.delete(key);
  }, [key]);

  return { get, invalidate, has: () => cache.has(key) };
}

/**
 * Cache para dados de API com tags
 */
export const apiCache = {
  // Cache para configurações públicas
  publicSettings: (data: any) => cache.set('public_settings', data, { 
    ttl: 10 * 60 * 1000, // 10 minutos
    tags: ['settings', 'public']
  }),

  // Cache para dados de eleição
  electionSettings: (data: any) => cache.set('election_settings', data, { 
    ttl: 5 * 60 * 1000, // 5 minutos
    tags: ['settings', 'election']
  }),

  // Cache para lista de pessoas
  peopleList: (params: string, data: any) => cache.set(`people_list_${params}`, data, { 
    ttl: 2 * 60 * 1000, // 2 minutos
    tags: ['people', 'list']
  }),

  // Cache para dados de líderes
  leadersList: (data: any) => cache.set('leaders_list', data, { 
    ttl: 5 * 60 * 1000, // 5 minutos
    tags: ['leaders', 'list']
  }),

  // Cache para dados de perfil
  profile: (userId: string, data: any) => cache.set(`profile_${userId}`, data, { 
    ttl: 15 * 60 * 1000, // 15 minutos
    tags: ['profile', 'user']
  }),

  // Invalidação por tags
  invalidateSettings: () => cache.invalidateByTags(['settings']),
  invalidatePeople: () => cache.invalidateByTags(['people']),
  invalidateLeaders: () => cache.invalidateByTags(['leaders']),
  invalidateProfile: (userId?: string) => {
    if (userId) {
      cache.delete(`profile_${userId}`);
    } else {
      cache.invalidateByTags(['profile']);
    }
  }
};

/**
 * Cache para dados de formulário (localStorage)
 */
export const formCache = {
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(`form_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Erro ao salvar cache do formulário:', error);
    }
  },

  get: (key: string, maxAge = 24 * 60 * 60 * 1000) => { // 24 horas
    try {
      const stored = localStorage.getItem(`form_cache_${key}`);
      if (!stored) return null;

      const { data, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(`form_cache_${key}`);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Erro ao recuperar cache do formulário:', error);
      return null;
    }
  },

  delete: (key: string) => {
    localStorage.removeItem(`form_cache_${key}`);
  },

  clear: () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('form_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};

export default cache;
