// supabase/functions/admin_ban_user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- CORS dinâmico -----------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  'https://app.gabitechnology.cloud',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);
function makeCorsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://app.gabitechnology.cloud';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}
// -----------------------------------------------------------------------------
Deno.serve(async (req)=>{
  const origin = req.headers.get('Origin');
  const corsHeaders = makeCorsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
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
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        headers: corsHeaders,
        status: 401
      });
    }
    // 2) precisa ser ADMIN
    const { data: prof, error: profErr } = await admin.from('profiles').select('role').eq('id', me.user.id).single();
    if (profErr) throw profErr;
    if (prof?.role !== 'ADMIN') {
      return new Response(JSON.stringify({
        error: 'Forbidden'
      }), {
        headers: corsHeaders,
        status: 403
      });
    }
    // 3) body
    const body = await req.json();
    if (!body?.userId || body.action !== 'ban' && body.action !== 'unban') {
      return new Response(JSON.stringify({
        error: 'Bad request: userId/action required'
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    if (body.userId === me.user.id) {
      return new Response(JSON.stringify({
        error: 'Você não pode desativar a si mesmo'
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    // 4) usuário alvo existe?
    const { data: target, error: getErr } = await admin.auth.admin.getUserById(body.userId);
    if (getErr || !target?.user) {
      return new Response(JSON.stringify({
        error: 'Usuário não encontrado'
      }), {
        headers: corsHeaders,
        status: 404
      });
    }
    // 5) ação
    if (body.action === 'ban') {
      // BANIR: bloqueia logins futuros
      // (ban_duration aceita formatos "1h", "24h", "7d", etc. Usamos ~100 anos.)
      const { error: e1 } = await admin.auth.admin.updateUserById(body.userId, {
        ban_duration: '876000h',
        user_metadata: {
          banned: true,
          banned_at: new Date().toISOString(),
          banned_by: me.user.id,
          ban_reason: body.reason ?? 'Banned by admin'
        }
      });
      if (e1) throw e1;
      // Domínio
      const { error: e2 } = await admin.from('leader_profiles').update({
        status: 'INACTIVE'
      }).eq('id', body.userId);
      if (e2 && Deno.env.get('ENVIRONMENT') === 'development') {
        console.warn('leader_profiles update warn:', e2);
      }
    } else {
      // DESBANIR
      const { error: e1 } = await admin.auth.admin.updateUserById(body.userId, {
        ban_duration: 'none',
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
      if (e2 && Deno.env.get('ENVIRONMENT') === 'development') {
        console.warn('leader_profiles update warn:', e2);
      }
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
    return new Response(JSON.stringify({
      ok: true,
      action: body.action
    }), {
      headers: corsHeaders,
      status: 200
    });
  } catch (err) {
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      console.error('admin_ban_user error:', err);
    }
    return new Response(JSON.stringify({
      ok: false,
      error: err?.message ?? 'Internal error'
    }), {
      headers: makeCorsHeaders(origin),
      status: 500
    });
  }
});
