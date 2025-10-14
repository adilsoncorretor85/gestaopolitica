// supabase/functions/admin_ban_user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { createRequestContext, logSuccess, logError, logWarning } from '../_shared/auditLogger.ts';
Deno.serve(async (req)=>{
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting (muito restritivo para ban/unban)
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.BAN, origin);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Criar contexto de auditoria
  const auditContext = createRequestContext(req, 'admin_ban_user', 'ban_user');
  
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !svc || !anon) throw new Error('Missing SUPABASE_* envs');
    // admin = ignora RLS (para checar role sem depender de policies)
    const admin = createClient(url, svc);
    // caller = valida sessão do chamador
    const caller = createClient(url, anon, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? ''
        }
      }
    });
    // 1) precisa estar autenticado
    const { data: me } = await caller.auth.getUser();
    if (!me?.user) {
      return createCorsErrorResponse('Unauthorized', 401, origin);
    }
    // 2) precisa ser ADMIN
    const { data: prof, error: profErr } = await admin.from('profiles').select('role').eq('id', me.user.id).single();
    if (profErr) throw profErr;
    if (prof?.role !== 'ADMIN') {
      return createCorsErrorResponse('Forbidden', 403, origin);
    }
    
    // Atualizar contexto de auditoria
    auditContext.userId = me.user.id;
    auditContext.userEmail = me.user.email;
    auditContext.userRole = prof.role;
    // 3) body
    const body = await req.json();
    if (!body?.userId || body.action !== 'ban' && body.action !== 'unban') {
      return createCorsErrorResponse('Bad request: userId/action required', 400, origin);
    }
    if (body.userId === me.user.id) {
      return createCorsErrorResponse('Você não pode desativar a si mesmo', 400, origin);
    }
    // 4) usuário alvo existe?
    const { data: target, error: getErr } = await admin.auth.admin.getUserById(body.userId);
    if (getErr || !target?.user) {
      return createCorsErrorResponse('Usuário não encontrado', 404, origin);
    }
    // 5) ação
    if (body.action === 'ban') {
      // BANIR: bloqueia logins futuros usando banned_until
      const { error: e1 } = await admin.auth.admin.updateUserById(body.userId, {
        banned_until: '9999-12-31T00:00:00Z',
        user_metadata: {
          banned: true,
          banned_at: new Date().toISOString(),
          banned_by: me.user.id,
          ban_reason: body.reason ?? 'Banned by admin'
        }
      });
      if (e1) throw e1;
      
      // Revogar sessões ativas (refresh tokens)
      try {
        await admin.auth.admin.signOut(body.userId);
        logSuccess(auditContext, 200, { action: 'ban', userId: body.userId, sessions_revoked: true });
      } catch (revokeError) {
        logWarning(auditContext, 200, 'Failed to revoke sessions', { action: 'ban', userId: body.userId, error: revokeError.message });
        // Não falha o processo se não conseguir revogar sessões
      }
      
      // Domínio
      const { error: e2 } = await admin.from('leader_profiles').update({
        status: 'INACTIVE'
      }).eq('id', body.userId);
      if (e2) console.warn('leader_profiles update warn:', e2);
    } else {
      // DESBANIR
      const { error: e1 } = await admin.auth.admin.updateUserById(body.userId, {
        banned_until: null,
        user_metadata: {
          banned: false,
          unbanned_at: new Date().toISOString(),
          unbanned_by: me.user.id
        }
      });
      if (e1) throw e1;
      const { error: e2 } = await admin.from('leader_profiles').update({
        status: 'ACTIVE'
      }).eq('id', body.userId);
      if (e2) console.warn('leader_profiles update warn:', e2);
      
      logSuccess(auditContext, 200, { action: 'unban', userId: body.userId });
    }
    // 6) auditoria
    await admin.from('audit_logs').insert({
      table_name: 'auth.users',
      record_id: body.userId,
      action: 'UPDATE',
      actor_id: me.user.id,
      details: {
        action: body.action,
        reason: body.reason ?? null
      }
    });
    return createCorsResponse({
      ok: true,
      action: body.action
    }, 200, origin);
  } catch (err) {
    logError(auditContext, 500, err?.message ?? 'Internal error', { error: err });
    return createCorsErrorResponse(
      err?.message ?? 'Internal error', 
      500, 
      origin
    );
  }
});
