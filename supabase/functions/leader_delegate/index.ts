// supabase/functions/leader_delegate/index.ts
// Edge Function para delegar/transferir contatos entre líderes
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { createRequestContext, logSuccess, logError, logWarning } from '../_shared/auditLogger.ts';

type Body = {
  from_leader: string;
  to_leader: string;
  opts?: {
    deactivate_from?: boolean;
    transfer_tags?: boolean;
    transfer_projects?: boolean;
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.ADMIN, origin);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Criar contexto de auditoria
  const auditContext = createRequestContext(req, 'leader_delegate', 'delegate_leader');
  
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!url || !svc || !anon) {
      throw new Error('Missing SUPABASE_* env vars');
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
    if (!body?.from_leader || !body?.to_leader) {
      return createCorsErrorResponse('Parâmetros inválidos: from_leader e to_leader são obrigatórios', 400, origin);
    }

    if (body.from_leader === body.to_leader) {
      return createCorsErrorResponse('Líder de origem e destino não podem ser o mesmo', 400, origin);
    }

    const opts = {
      deactivate_from: false,
      transfer_tags: true,
      transfer_projects: false,
      ...body.opts
    };

    // 1) RPC no banco (delega contatos)
    const { data: rpc, error: rpcErr } = await admin
      .rpc('app_delegate_people', {
        from_leader: body.from_leader,
        to_leader: body.to_leader,
        opts: opts
      });

    if (rpcErr) throw rpcErr;

    // 2) Se solicitado, desativar líder de origem
    if (opts.deactivate_from) {
      try {
        const { error: deactivateErr } = await admin
          .from('leader_profiles')
          .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
          .eq('id', body.from_leader);

        if (deactivateErr) {
          logWarning(auditContext, 200, 'Failed to deactivate leader', { 
            from_leader: body.from_leader, 
            error: deactivateErr.message 
          });
        }
      } catch (deactivateErr) {
        logWarning(auditContext, 200, 'Leader deactivation failed', { 
          from_leader: body.from_leader, 
          error: deactivateErr.message 
        });
      }
    }

    // 3) Log de auditoria
    await admin.from('audit_logs').insert({
      table_name: 'people',
      record_id: body.from_leader,
      action: 'DELEGATE_LEADER_CONTACTS',
      actor_id: me.user.id,
      details: { 
        from_leader: body.from_leader,
        to_leader: body.to_leader,
        moved_count: rpc?.moved_count ?? 0,
        deactivate_from: opts.deactivate_from,
        transfer_tags: opts.transfer_tags,
        transfer_projects: opts.transfer_projects
      }
    });

    logSuccess(auditContext, 200, { 
      from_leader: body.from_leader, 
      to_leader: body.to_leader,
      moved_count: rpc?.moved_count ?? 0,
      deactivate_from: opts.deactivate_from
    });

    return createCorsResponse({ 
      ok: true, 
      rpc,
      deactivated: opts.deactivate_from
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

