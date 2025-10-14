/**
 * Sistema de preload inteligente baseado no comportamento do usuário
 * Precarrega recursos baseado em padrões de navegação
 */

interface PreloadConfig {
  priority: 'high' | 'medium' | 'low';
  delay?: number;
  condition?: () => boolean;
}

class PreloadManager {
  private preloadedModules = new Set<string>();
  private preloadQueue = new Map<string, PreloadConfig>();
  private isPreloading = false;

  /**
   * Registra um módulo para preload
   */
  register(moduleName: string, config: PreloadConfig) {
    this.preloadQueue.set(moduleName, config);
  }

  /**
   * Precarrega um módulo específico
   */
  async preload(moduleName: string): Promise<void> {
    if (this.preloadedModules.has(moduleName)) {
      return;
    }

    try {
      const config = this.preloadQueue.get(moduleName);
      if (!config) {
        console.warn(`Módulo ${moduleName} não registrado para preload`);
        return;
      }

      // Verifica condição se especificada
      if (config.condition && !config.condition()) {
        return;
      }

      // Aplica delay se especificado
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      // Precarrega o módulo
      await this.loadModule(moduleName);
      this.preloadedModules.add(moduleName);
      
      console.log(`✅ Módulo ${moduleName} precarregado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao precarregar módulo ${moduleName}:`, error);
    }
  }

  /**
   * Precarrega módulos baseado na prioridade
   */
  async preloadByPriority(priority: 'high' | 'medium' | 'low' = 'high'): Promise<void> {
    if (this.isPreloading) return;
    
    this.isPreloading = true;

    try {
      const modules = Array.from(this.preloadQueue.entries())
        .filter(([_, config]) => config.priority === priority)
        .map(([name, _]) => name);

      // Precarrega em paralelo (máximo 3 por vez)
      const chunks = this.chunkArray(modules, 3);
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(module => this.preload(module)));
      }
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Precarrega baseado na rota atual
   */
  preloadByRoute(route: string): void {
    const routePreloadMap: Record<string, string[]> = {
      '/dashboard': ['pessoas', 'lideres', 'mapa'],
      '/pessoas': ['pessoas-form', 'mapa'],
      '/lideres': ['lideres-form', 'admin-tags'],
      '/mapa': ['pessoas', 'lideres'],
      '/projecao': ['dashboard', 'pessoas']
    };

    const modulesToPreload = routePreloadMap[route] || [];
    
    modulesToPreload.forEach(module => {
      if (!this.preloadedModules.has(module)) {
        this.preload(module);
      }
    });
  }

  /**
   * Precarrega baseado em hover (quando usuário passa mouse sobre link)
   */
  preloadOnHover(moduleName: string): void {
    if (!this.preloadedModules.has(moduleName)) {
      // Precarrega com delay para evitar preload desnecessário
      setTimeout(() => {
        this.preload(moduleName);
      }, 100);
    }
  }

  /**
   * Precarrega baseado em scroll (quando usuário está próximo do final da página)
   */
  preloadOnScroll(threshold = 0.8): void {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const scrollPercentage = (scrollTop + windowHeight) / documentHeight;
      
      if (scrollPercentage >= threshold) {
        // Precarrega módulos de baixa prioridade
        this.preloadByPriority('low');
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * Precarrega baseado em idle time (quando usuário não está interagindo)
   */
  preloadOnIdle(idleTime = 2000): void {
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        this.preloadByPriority('medium');
      }, idleTime);
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
  }

  /**
   * Carrega um módulo específico
   */
  private async loadModule(moduleName: string): Promise<void> {
    const moduleMap: Record<string, () => Promise<any>> = {
      'dashboard': () => import('@/pages/Dashboard'),
      'pessoas': () => import('@/pages/Pessoas'),
      'pessoas-form': () => import('@/pages/PessoasForm'),
      'lideres': () => import('@/pages/Lideres'),
      'lideres-form': () => import('@/pages/LideresForm'),
      'mapa': () => import('@/pages/Mapa'),
      'projecao': () => import('@/pages/Projecao'),
      'admin-tags': () => import('@/pages/AdminTags'),
      'convite': () => import('@/pages/Convite'),
      'complete-profile': () => import('@/pages/CompleteProfile'),
      'login': () => import('@/pages/Login'),
      'reset-password': () => import('@/pages/ResetPassword'),
      'conta-bloqueada': () => import('@/pages/ContaBloqueada')
    };

    const loader = moduleMap[moduleName];
    if (loader) {
      await loader();
    } else {
      throw new Error(`Módulo ${moduleName} não encontrado`);
    }
  }

  /**
   * Divide array em chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Retorna estatísticas do preload
   */
  getStats() {
    return {
      preloaded: this.preloadedModules.size,
      queued: this.preloadQueue.size,
      isPreloading: this.isPreloading
    };
  }
}

// Instância global do preload manager
export const preloadManager = new PreloadManager();

// Configuração inicial dos módulos
preloadManager.register('dashboard', { priority: 'high' });
preloadManager.register('pessoas', { priority: 'high' });
preloadManager.register('pessoas-form', { priority: 'medium' });
preloadManager.register('lideres', { priority: 'medium' });
preloadManager.register('lideres-form', { priority: 'medium' });
preloadManager.register('mapa', { priority: 'medium' });
preloadManager.register('projecao', { priority: 'low' });
preloadManager.register('admin-tags', { priority: 'low' });
preloadManager.register('convite', { priority: 'low' });
preloadManager.register('complete-profile', { priority: 'low' });

// Hook para React
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook para preload automático baseado na rota
 */
export function usePreload() {
  const location = useLocation();

  useEffect(() => {
    // Precarrega módulos baseado na rota atual
    preloadManager.preloadByRoute(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    // Precarrega módulos de alta prioridade após carregamento inicial
    const timer = setTimeout(() => {
      preloadManager.preloadByPriority('high');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Precarrega baseado em idle time
    preloadManager.preloadOnIdle(3000);
  }, []);
}

/**
 * Hook para preload em hover
 */
export function usePreloadOnHover(moduleName: string) {
  const handleMouseEnter = () => {
    preloadManager.preloadOnHover(moduleName);
  };

  return { onMouseEnter: handleMouseEnter };
}

export default preloadManager;
