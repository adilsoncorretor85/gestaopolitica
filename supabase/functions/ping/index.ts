// supabase/functions/ping/index.ts
// Endpoint simples de ping para monitoramento básico
import { handleCorsPreflight, createCorsResponse } from '../_shared/cors.ts';

interface PingResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const startTime = Date.now();
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  try {
    // Verificar método
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      return createCorsResponse({
        status: 'error',
        message: 'Method not allowed'
      }, 405, origin);
    }
    
    // Resposta simples
    const pingResponse: PingResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: '1.0.0',
      environment: Deno.env.get('ENVIRONMENT') || 'development'
    };
    
    return createCorsResponse(pingResponse, 200, origin);
    
  } catch (error) {
    console.error('Ping error:', error);
    
    return createCorsResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500, origin);
  }
});
