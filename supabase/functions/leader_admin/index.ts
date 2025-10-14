// supabase/functions/leader_admin/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
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
async function listPending(origin) {
  // usa a view que criamos
  const { data, error } = await admin.from('app_leaders_list').select('*').eq('status', 'PENDING').order('invited_at', {
    ascending: false
  });
  if (error) return createCorsErrorResponse(error.message, 400, origin);
  return createCorsResponse({
    ok: true,
    data
  }, 200, origin);
}
async function resendInvite(payload, origin) {
  const email = payload?.email?.trim();
  if (!email) return createCorsErrorResponse('email is required', 400, origin);
  // garante que existe registro pendente
  const { data: lp } = await admin.from('leader_profiles').select('id, status, full_name').eq('email', email).maybeSingle();
  if (!lp || lp.status !== 'PENDING') {
    return createCorsErrorResponse('Convite não está pendente', 400, origin);
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
  return createCorsResponse({
    ok: true,
    message: 'Convite reenviado',
    acceptUrl
  }, 200, origin);
}
async function revokeInvite(payload, origin) {
  const email = payload?.email?.trim();
  if (!email) return createCorsErrorResponse('email is required', 400, origin);
  // remove token
  const { error: tokErr } = await admin.from('invite_tokens').delete().eq('email', email);
  if (tokErr) return createCorsErrorResponse(`invite_tokens: ${tokErr.message}`, 400, origin);
  // apaga leader_profiles pendente
  const { error: lpErr } = await admin.from('leader_profiles').delete().eq('email', email).eq('status', 'PENDING');
  if (lpErr) return createCorsErrorResponse(`leader_profiles: ${lpErr.message}`, 400, origin);
  // se existir usuário no Auth que nunca logou, apaga do Auth
  const { data: page } = await admin.auth.admin.listUsers();
  const user = page?.users?.find((u)=>(u.email || '').toLowerCase() === email.toLowerCase());
  if (user && !user.last_sign_in_at) {
    await admin.auth.admin.deleteUser(user.id);
  }
  return createCorsResponse({
    ok: true,
    message: 'Convite cancelado'
  }, 200, origin);
}
// --------- HANDLER ---------
Deno.serve(async (req)=>{
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.ADMIN, origin);
  if (rateLimitResponse) return rateLimitResponse;
  try {
    // valida admin
    await requireAdminUser(req);
    const { action, payload } = await req.json();
    // origem para links (fallback: localhost:5173)
    const origin = req.headers.get('origin') ?? req.headers.get('referer')?.split('/').slice(0, 3).join('/') ?? 'http://localhost:5173';
    switch(action){
      case 'list_pending':
        return await listPending(origin);
      case 'resend_invite':
        return await resendInvite(payload, origin);
      case 'revoke_invite':
        return await revokeInvite(payload, origin);
      case 'delete':
        return await revokeInvite(payload, origin);
      default:
        return createCorsErrorResponse(`Unknown action: ${action}`, 400, origin);
    }
  } catch (e) {
    const code = e?.message === 'missing_token' ? 401 : e?.message === 'invalid_token' ? 401 : e?.message === 'forbidden' ? 403 : 400;
    return createCorsErrorResponse(
      e?.message || 'unexpected_error', 
      code, 
      origin
    );
  }
});
