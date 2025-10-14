// supabase/functions/_shared/rateLimiter.ts
// Sistema de rate limiting para proteção contra spam

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requests por janela
  keyGenerator?: (req: Request) => string; // Função para gerar chave única
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: number;

  constructor() {
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Gerar chave padrão baseada em IP + User-Agent
  private defaultKeyGenerator(req: Request): string {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }

  // Gerar chave para admin baseada em hash do token
  private adminKeyGenerator(req: Request): string {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    if (!token) {
      return this.defaultKeyGenerator(req);
    }
    
    // Criar hash simples do token (primeiros 8 caracteres)
    const tokenHash = token.substring(0, 8);
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    return `admin:${ip}:${tokenHash}`;
  }

  // Verificar se request está dentro do limite
  checkLimit(req: Request, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const keyGenerator = config.keyGenerator || this.defaultKeyGenerator;
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Limpar entradas expiradas
    this.cleanup();
    
    let entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Nova janela de tempo
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      this.store.set(key, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: entry.resetTime
      };
    }
    
    if (entry.count >= config.maxRequests) {
      // Limite excedido
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter
      };
    }
    
    // Incrementar contador
    entry.count++;
    this.store.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  // Limpeza de entradas expiradas
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  // Obter estatísticas
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    memoryUsage: number;
  } {
    const now = Date.now();
    let activeKeys = 0;
    
    for (const entry of this.store.values()) {
      if (now <= entry.resetTime) {
        activeKeys++;
      }
    }
    
    return {
      totalKeys: this.store.size,
      activeKeys,
      memoryUsage: this.store.size * 100 // Estimativa aproximada
    };
  }

  // Destruir limiter
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Instância singleton
const rateLimiter = new RateLimiter();

// Configurações padrão
export const RATE_LIMITS = {
  // Limite geral para endpoints públicos
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100
  },
  
  // Limite para convites (mais restritivo)
  INVITE: {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 10,
    keyGenerator: (req: Request) => {
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      return `invite:${ip}`;
    }
  },
  
  // Limite para admin (baseado em token)
  ADMIN: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 50,
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      
      if (!token) {
        const ip = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
        return `admin:${ip}`;
      }
      
      const tokenHash = token.substring(0, 8);
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      
      return `admin:${ip}:${tokenHash}`;
    }
  },
  
  // Limite para ban/unban (muito restritivo)
  BAN: {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 5,
    keyGenerator: (req: Request) => {
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      
      if (!token) {
        const ip = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
        return `ban:${ip}`;
      }
      
      const tokenHash = token.substring(0, 8);
      const ip = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown';
      
      return `ban:${ip}:${tokenHash}`;
    }
  }
};

// Função helper para aplicar rate limiting
export function applyRateLimit(
  req: Request, 
  config: RateLimitConfig,
  origin: string | null = null
): Response | null {
  const result = rateLimiter.checkLimit(req, config);
  
  if (!result.allowed) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Vary': 'Origin'
    };
    
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
      resetTime: new Date(result.resetTime).toISOString()
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': result.retryAfter?.toString() || '60',
        ...corsHeaders
      }
    });
  }
  
  return null;
}

// Função para obter estatísticas de rate limiting
export function getRateLimitStats() {
  return rateLimiter.getStats();
}

export default rateLimiter;
