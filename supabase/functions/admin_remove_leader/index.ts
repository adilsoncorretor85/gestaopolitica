// supabase/functions/admin_remove_leader/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { createRequestContext, logSuccess, logError, logWarning } from '../_shared/auditLogger.ts';

type Body = {
  leaderId: string;
  mode: 'delete_contacts' | 'transfer_contacts';
  targetLeaderId?: string | null;
  deleteAuthUser?: boolean;  // default true
};

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting (muito restritivo para remoção de líderes)
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.ADMIN, origin);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Criar contexto de auditoria
  const auditContext = createRequestContext(req, 'admin_remove_leader', 'remove_leader');
  
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!url || !svc || !anon) {
      throw new Error('Missing SUPABASE_* envs');
    }

    const admin = createClient(url, svc);
    const caller = createClient(url, anon, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? ''
        }
      }
    });

    // auth + admin
    const { data: me } = await caller.auth.getUser();
    if (!me?.user) {
      return createCorsErrorResponse('Unauthorized', 401, origin);
    }

    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('role')
      .eq('id', me.user.id)
      .single();

    if (profErr || !prof || prof.role !== 'ADMIN') {
      return createCorsErrorResponse('Forbidden', 403, origin);
    }

    // Atualizar contexto de auditoria
    auditContext.userId = me.user.id;
    auditContext.userEmail = me.user.email;
    auditContext.userRole = prof.role;

    // body
    const body = (await req.json()) as Body;
    if (!body?.leaderId || !body?.mode) {
      return createCorsErrorResponse('Parâmetros inválidos', 400, origin);
    }
    
    const delAuth = body.deleteAuthUser ?? true;

    // 1) RPC no banco (move ou deleta contatos + remove perfis)
    const { data: rpc, error: rpcErr } = await admin
      .rpc('app_remove_leader', {
        p_leader_id: body.leaderId,
        p_mode: body.mode,
        p_target_leader_id: body.mode === 'transfer_contacts' ? (body.targetLeaderId ?? null) : null
      });

    if (rpcErr) throw rpcErr;

    // 2) Remover do Auth (opcional)
    let removedFromAuth = false;
    if (delAuth) {
      try {
        const { error: delErr } = await admin.auth.admin.deleteUser(body.leaderId);
        if (delErr) {
          // se der ruim aqui, o domínio já foi limpo; retornamos ok, mas avisamos
          logWarning(auditContext, 200, 'Failed to delete user from Auth', { 
            leaderId: body.leaderId, 
            error: delErr.message 
          });
        } else {
          removedFromAuth = true;
        }
      } catch (authErr) {
        logWarning(auditContext, 200, 'Auth deletion failed', { 
          leaderId: body.leaderId, 
          error: authErr.message 
        });
      }
    }

    // 3) Log de auditoria
    await admin.from('audit_logs').insert({
      table_name: 'leader_profiles',
      record_id: body.leaderId,
      action: body.mode === 'delete_contacts' ? 'DELETE_LEADER_WITH_CONTACTS' : 'DELETE_LEADER_TRANSFER_CONTACTS',
      actor_id: me.user.id,
      details: { 
        targetLeaderId: body.targetLeaderId ?? null,
        peopleProcessed: rpc?.people_processed ?? 0,
        removedFromAuth: removedFromAuth
      }
    });

    logSuccess(auditContext, 200, { 
      leaderId: body.leaderId, 
      mode: body.mode, 
      targetLeaderId: body.targetLeaderId,
      peopleProcessed: rpc?.people_processed ?? 0,
      removedFromAuth 
    });

    return createCorsResponse({ 
      ok: true, 
      rpc, 
      removedFromAuth 
    }, 200, origin);

  } catch (err: any) {
    logError(auditContext, 500, err?.message ?? 'Erro interno', { error: err });
    return createCorsErrorResponse(
      err?.message ?? 'Erro interno', 
      500, 
      origin
    );
  }
});

