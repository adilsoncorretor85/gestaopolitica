// supabase/functions/_shared/cors.ts
// Função compartilhada para CORS dinâmico baseado em variáveis de ambiente

export interface CorsConfig {
  allowedOrigins: Set<string>;
  defaultOrigin: string;
}

export function getCorsConfig(): CorsConfig {
  // Ler ALLOWED_ORIGINS do ambiente (CSV)
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS') || '';
  const defaultOrigin = Deno.env.get('DEFAULT_ORIGIN') || 'https://app.gabitechnology.cloud';
  
  // Parse CSV e criar Set
  const allowedOrigins = new Set(
    allowedOriginsEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0)
  );
  
  // Adicionar origens padrão se não especificadas
  if (allowedOrigins.size === 0) {
    allowedOrigins.add('https://app.gabitechnology.cloud');
    allowedOrigins.add('http://localhost:5173');
    allowedOrigins.add('http://127.0.0.1:5173');
  }
  
  return {
    allowedOrigins,
    defaultOrigin
  };
}

export function makeCorsHeaders(origin: string | null): Record<string, string> {
  const config = getCorsConfig();
  
  // Verificar se a origem está na lista permitida
  const allow = origin && config.allowedOrigins.has(origin) 
    ? origin 
    : config.defaultOrigin;
  
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Vary': 'Origin'
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    const corsHeaders = makeCorsHeaders(origin);
    
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }
  
  return null;
}

export function createCorsResponse(
  data: any, 
  status: number = 200, 
  origin: string | null = null
): Response {
  const corsHeaders = makeCorsHeaders(origin);
  
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status
  });
}

export function createCorsErrorResponse(
  error: string,
  status: number = 400,
  origin: string | null = null
): Response {
  return createCorsResponse({ error }, status, origin);
}
