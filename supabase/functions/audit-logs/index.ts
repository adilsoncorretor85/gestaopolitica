// supabase/functions/audit-logs/index.ts
// Endpoint para visualizar logs de auditoria
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { getAuditStats, getRecentAuditLogs } from '../_shared/auditLogger.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.ADMIN, origin);
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    // Verificar método
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      return createCorsErrorResponse('Method not allowed', 405, origin);
    }
    
    // Verificar autenticação e permissões de admin
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    if (!token) {
      return createCorsErrorResponse('Unauthorized', 401, origin);
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData.user) {
      return createCorsErrorResponse('Invalid token', 401, origin);
    }
    
    // Verificar se é admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'ADMIN') {
      return createCorsErrorResponse('Forbidden - Admin access required', 403, origin);
    }
    
    // Obter parâmetros da query
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const severity = url.searchParams.get('severity');
    const functionName = url.searchParams.get('function');
    const action = url.searchParams.get('action');
    
    // Obter logs
    let logs = getRecentAuditLogs(limit);
    
    // Filtrar por severidade
    if (severity && ['info', 'warn', 'error', 'critical'].includes(severity)) {
      logs = logs.filter(log => log.severity === severity);
    }
    
    // Filtrar por função
    if (functionName) {
      logs = logs.filter(log => log.function === functionName);
    }
    
    // Filtrar por ação
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    
    // Obter estatísticas
    const stats = getAuditStats();
    
    // Resposta
    const response = {
      success: true,
      data: {
        logs: logs.reverse(), // Mais recentes primeiro
        stats,
        filters: {
          limit,
          severity,
          function: functionName,
          action
        },
        total: logs.length
      },
      timestamp: new Date().toISOString()
    };
    
    return createCorsResponse(response, 200, origin);
    
  } catch (error) {
    console.error('Audit logs error:', error);
    
    return createCorsErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500,
      origin
    );
  }
});
