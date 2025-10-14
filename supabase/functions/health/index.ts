// supabase/functions/health/index.ts
// Endpoint de healthcheck para monitoramento das Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'up' | 'down' | 'degraded';
    auth: 'up' | 'down' | 'degraded';
    storage: 'up' | 'down' | 'degraded';
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  responseTime: number;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const startTime = Date.now();
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.GENERAL, origin);
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    // Verificar método
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      return createCorsErrorResponse('Method not allowed', 405, origin);
    }
    
    // Inicializar status
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: Deno.env.get('ENVIRONMENT') || 'development',
      services: {
        database: 'up',
        auth: 'up',
        storage: 'up'
      },
      uptime: 0,
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      responseTime: 0
    };
    
    // Verificar variáveis de ambiente
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !Deno.env.get(envVar));
    if (missingEnvVars.length > 0) {
      healthStatus.status = 'unhealthy';
      healthStatus.services.database = 'down';
      healthStatus.services.auth = 'down';
      
      return createCorsResponse({
        ...healthStatus,
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`
      }, 503, origin);
    }
    
    // Verificar conexão com o banco de dados
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      // Teste simples de conexão
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        healthStatus.services.database = 'degraded';
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.services.database = 'down';
      healthStatus.status = 'unhealthy';
    }
    
    // Verificar autenticação
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      // Teste de autenticação (sem token)
      const { data, error } = await supabase.auth.getSession();
      
      if (error && error.message.includes('Invalid JWT')) {
        // Isso é esperado sem token, então está funcionando
        healthStatus.services.auth = 'up';
      } else if (error) {
        healthStatus.services.auth = 'degraded';
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      healthStatus.services.auth = 'down';
      healthStatus.status = 'unhealthy';
    }
    
    // Verificar storage (opcional)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      // Teste de listagem de buckets
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        healthStatus.services.storage = 'degraded';
        if (healthStatus.status === 'healthy') {
          healthStatus.status = 'degraded';
        }
      }
    } catch (error) {
      healthStatus.services.storage = 'down';
      if (healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
      }
    }
    
    // Calcular métricas de memória
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      healthStatus.memory = {
        used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024), // MB
        percentage: Math.round((memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100)
      };
    }
    
    // Calcular tempo de resposta
    healthStatus.responseTime = Date.now() - startTime;
    
    // Determinar status final
    if (healthStatus.services.database === 'down' || healthStatus.services.auth === 'down') {
      healthStatus.status = 'unhealthy';
    } else if (healthStatus.services.database === 'degraded' || 
               healthStatus.services.auth === 'degraded' || 
               healthStatus.services.storage === 'degraded') {
      healthStatus.status = 'degraded';
    }
    
    // Retornar status
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return createCorsResponse(healthStatus, statusCode, origin);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: Deno.env.get('ENVIRONMENT') || 'development',
      services: {
        database: 'down',
        auth: 'down',
        storage: 'down'
      },
      uptime: 0,
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      responseTime: Date.now() - startTime
    };
    
    return createCorsResponse({
      ...errorStatus,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 503, origin);
  }
});
