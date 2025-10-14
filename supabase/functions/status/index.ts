// supabase/functions/status/index.ts
// Endpoint de status para verificar outras Edge Functions
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';

interface FunctionStatus {
  name: string;
  status: 'up' | 'down' | 'unknown';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

interface StatusResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  functions: FunctionStatus[];
  summary: {
    total: number;
    up: number;
    down: number;
    unknown: number;
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  try {
    // Verificar método
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      return createCorsErrorResponse('Method not allowed', 405, origin);
    }
    
    // Lista de funções para verificar
    const functionsToCheck = [
      'invite_leader',
      'admin_ban_user',
      'leader_actions',
      'leader_admin',
      'health',
      'ping'
    ];
    
    const functionStatuses: FunctionStatus[] = [];
    
    // Verificar cada função
    for (const functionName of functionsToCheck) {
      const startTime = Date.now();
      
      try {
        // Fazer uma requisição simples para cada função
        const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`;
        
        const response = await fetch(functionUrl, {
          method: 'OPTIONS', // Usar OPTIONS para não executar a lógica da função
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          }
        });
        
        const responseTime = Date.now() - startTime;
        
        functionStatuses.push({
          name: functionName,
          status: response.ok ? 'up' : 'down',
          lastCheck: new Date().toISOString(),
          responseTime,
          error: response.ok ? undefined : `HTTP ${response.status}`
        });
        
      } catch (error) {
        functionStatuses.push({
          name: functionName,
          status: 'down',
          lastCheck: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Calcular resumo
    const summary = {
      total: functionStatuses.length,
      up: functionStatuses.filter(f => f.status === 'up').length,
      down: functionStatuses.filter(f => f.status === 'down').length,
      unknown: functionStatuses.filter(f => f.status === 'unknown').length
    };
    
    // Determinar status geral
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (summary.down > 0) {
      overallStatus = summary.down > summary.total / 2 ? 'unhealthy' : 'degraded';
    } else if (summary.unknown > 0) {
      overallStatus = 'degraded';
    }
    
    const statusResponse: StatusResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      functions: functionStatuses,
      summary
    };
    
    // Retornar status
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return createCorsResponse(statusResponse, statusCode, origin);
    
  } catch (error) {
    console.error('Status check error:', error);
    
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      origin
    );
  }
});
