// supabase/functions/leader_admin/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS – importante para o navegador não bloquear
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// helpers de resposta
const json = (status, body)=>new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
// carrega variáveis de ambiente (definidas em Edge Functions → Secrets)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
// clients
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);
// --------- AÇÕES ---------
// somente ADMIN
async function requireAdminUser(req) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('missing_token');
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) throw new Error('invalid_token');
  const { data: profile, error: pErr } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (pErr || !profile || profile.role !== 'ADMIN') throw new Error('forbidden');
  return data.user.id;
}
async function listPending() {
  // usa a view que criamos
  const { data, error } = await admin.from('app_leaders_list').select('*').eq('status', 'PENDING').order('invited_at', {
    ascending: false
  });
  if (error) return json(400, {
    ok: false,
    error: error.message
  });
  return json(200, {
    ok: true,
    data
  });
}
async function resendInvite(payload, origin) {
  const email = payload?.email?.trim();
  if (!email) return json(400, {
    ok: false,
    error: 'email is required'
  });
  // garante que existe registro pendente
  const { data: lp } = await admin.from('leader_profiles').select('id, status, full_name').eq('email', email).maybeSingle();
  if (!lp || lp.status !== 'PENDING') {
    return json(400, {
      ok: false,
      error: 'Convite não está pendente'
    });
  }
  // recria token de convite (ou reaproveita se quiser)
  const token = crypto.randomUUID();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  await admin.from('invite_tokens').upsert({
    email,
    full_name: lp.full_name ?? email,
    role: 'LEADER',
    token,
    expires_at: expires.toISOString(),
    created_by: null,
    leader_profile_id: lp.id
  });
  // envia e-mail de convite (se o usuário já existe no Auth, Supabase retorna 422 – OK)
  const acceptUrl = `${origin}/convite/${token}`;
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: acceptUrl,
    data: {
      invite_token: token,
      full_name: lp.full_name ?? email
    }
  });
  // não falha a operação por 422 (email_exists)
  if (inviteErr && inviteErr['status'] !== 422) {
    return json(400, {
      ok: false,
      error: `invite: ${inviteErr.message}`
    });
  }
  return json(200, {
    ok: true,
    message: 'Convite reenviado',
    acceptUrl
  });
}
async function revokeInvite(payload) {
  const email = payload?.email?.trim();
  if (!email) return json(400, {
    ok: false,
    error: 'email is required'
  });
  // remove token
  const { error: tokErr } = await admin.from('invite_tokens').delete().eq('email', email);
  if (tokErr) return json(400, {
    ok: false,
    error: `invite_tokens: ${tokErr.message}`
  });
  // apaga leader_profiles pendente
  const { error: lpErr } = await admin.from('leader_profiles').delete().eq('email', email).eq('status', 'PENDING');
  if (lpErr) return json(400, {
    ok: false,
    error: `leader_profiles: ${lpErr.message}`
  });
  // se existir usuário no Auth que nunca logou, apaga do Auth
  const { data: page } = await admin.auth.admin.listUsers();
  const user = page?.users?.find((u)=>(u.email || '').toLowerCase() === email.toLowerCase());
  if (user && !user.last_sign_in_at) {
    await admin.auth.admin.deleteUser(user.id);
  }
  return json(200, {
    ok: true,
    message: 'Convite cancelado'
  });
}
// --------- HANDLER ---------
Deno.serve(async (req)=>{
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: corsHeaders
  });
  try {
    // valida admin
    await requireAdminUser(req);
    const { action, payload } = await req.json();
    // origem para links (fallback: localhost:5173)
    const origin = req.headers.get('origin') ?? req.headers.get('referer')?.split('/').slice(0, 3).join('/') ?? 'http://localhost:5173';
    switch(action){
      case 'list_pending':
        return await listPending();
      case 'resend_invite':
        return await resendInvite(payload, origin);
      case 'revoke_invite':
        return await revokeInvite(payload);
      case 'delete':
        return await revokeInvite(payload);
      default:
        return json(400, {
          ok: false,
          error: `Unknown action: ${action}`
        });
    }
  } catch (e) {
    const code = e?.message === 'missing_token' ? 401 : e?.message === 'invalid_token' ? 401 : e?.message === 'forbidden' ? 403 : 400;
    return json(code, {
      ok: false,
      error: e?.message || 'unexpected_error'
    });
  }
});
