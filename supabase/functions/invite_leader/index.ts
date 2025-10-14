// supabase/functions/invite_leader/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { applyRateLimit, RATE_LIMITS } from '../_shared/rateLimiter.ts';
import { createRequestContext, logSuccess, logError, logWarning } from '../_shared/auditLogger.ts';
Deno.serve(async (req)=>{
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;
  
  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.INVITE, origin);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Criar contexto de auditoria
  const auditContext = createRequestContext(req, 'invite_leader', 'invite_leader');
  
  let phase = 'start';
  try {
    // ── ENV / CLIENTS ────────────────────────────────────────────────────────
    phase = 'env';
    const url = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !service || !anon) throw new Error('Missing SUPABASE_* env vars');
    const admin = createClient(url, service); // ignora RLS
    const caller = createClient(url, anon, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? ''
        }
      }
    });
    // ── AUTH + ADMIN CHECK ───────────────────────────────────────────────────
    phase = 'auth_getUser';
    const { data: me } = await caller.auth.getUser();
    if (!me?.user) {
      logError(auditContext, 401, 'Unauthorized - No user found');
      return createCorsErrorResponse('Unauthorized', 401, origin);
    }
    
    // Atualizar contexto de auditoria com informações do usuário
    auditContext.userId = me.user.id;
    auditContext.userEmail = me.user.email;
    
    phase = 'check_admin';
    {
      const { data: profile, error: profErr } = await admin.from('profiles').select('role').eq('id', me.user.id).single();
      if (profErr) throw new Error('profiles read failed: ' + profErr.message);
      if (!profile || profile.role !== 'ADMIN') {
        auditContext.userRole = profile?.role || 'unknown';
        logError(auditContext, 403, 'Forbidden - Not admin', { userRole: profile?.role });
        return createCorsErrorResponse('Forbidden', 403, origin);
      }
      
      auditContext.userRole = profile.role;
    }
    // ── INPUT ────────────────────────────────────────────────────────────────
    phase = 'parse_body';
    const body = await req.json();
    if (!body?.full_name || !body?.email) {
      logError(auditContext, 400, 'Missing required fields', { 
        hasFullName: !!body?.full_name, 
        hasEmail: !!body?.email 
      });
      return createCorsErrorResponse('Nome e email são obrigatórios', 400, origin);
    }
    // origem para links
    phase = 'origin';
    const appOrigin = body.appUrl || req.headers.get('origin') || (req.headers.get('referer')?.split('/').slice(0, 3).join('/') ?? '');
    const redirectTo = `${appOrigin}/convite`;
    const fallbackUrl = `${appOrigin}/convite`;
    // ── CRIAR / LOCALIZAR USUÁRIO (AUTH) ────────────────────────────────────
    let userId = '';
    let status = 'INVITED';
    let acceptUrl = '';
    let emailStatus = 'skipped';
    phase = 'create_user';
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      email_confirm: false,
      user_metadata: {
        full_name: body.full_name,
        phone: body.phone ?? null
      }
    });
    if (createErr) {
      // === Usuário já existe ou erro na criação ===
      phase = 'get_user_by_email';
      const { data: got } = await admin.auth.admin.getUserByEmail(body.email);
      if (!got?.user) {
        // Se não encontrou o usuário, pode ser que ele foi removido
        // Vamos tentar criar novamente com um método diferente
        phase = 'retry_create_user';
        const { data: retryCreated, error: retryErr } = await admin.auth.admin.createUser({
          email: body.email,
          email_confirm: false,
          user_metadata: {
            full_name: body.full_name,
            phone: body.phone ?? null
          }
        });
        if (retryErr) {
          throw new Error('Falha ao criar usuário: ' + retryErr.message);
        }
        userId = retryCreated.user.id;
        status = 'INVITED';
      } else {
        userId = got.user.id;
        status = 'USER_EXISTS';
      }
      
      // Enviar email apropriado baseado no status
      if (status === 'USER_EXISTS') {
        phase = 'send_recovery';
        const { data: rec, error: recErr } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: body.email,
          options: {
            redirectTo
          }
        });
        if (recErr) {
          emailStatus = 'failed';
          console.error('recovery error:', recErr);
        } else {
          emailStatus = 'sent';
          acceptUrl = rec?.properties?.action_link ?? fallbackUrl;
        }
      } else {
        // Usuário recriado, enviar convite
        phase = 'send_invite_retry';
        const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
          redirectTo,
          data: {
            full_name: body.full_name
          }
        });
        if (inviteErr) {
          emailStatus = 'failed';
          console.error('invite error:', inviteErr);
        } else {
          emailStatus = 'sent';
          acceptUrl = invited?.properties?.action_link ?? fallbackUrl;
        }
      }
      
      // Criar/atualizar registros nas tabelas
      phase = 'upserts_existing_user';
      await admin.from('profiles').upsert({
        id: userId,
        email: body.email,
        role: 'LEADER',
        full_name: body.full_name
      });
      await admin.from('leader_profiles').upsert({
        id: userId,
        email: body.email,
        phone: body.phone ?? null,
        birth_date: body.birth_date ?? null,
        gender: body.gender ?? null,
        cep: body.cep ?? null,
        street: body.street ?? null,
        number: body.number ?? null,
        complement: body.complement ?? null,
        neighborhood: body.neighborhood ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        notes: body.notes ?? null,
        goal: body.goal ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        status: 'PENDING'
      });
    } else {
      // === Criado agora (comportamento antigo) — *Apenas* ajuste de email no profiles ===
      userId = created.user.id;
      status = 'INVITED';
      phase = 'send_invite';
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
        redirectTo,
        data: {
          full_name: body.full_name
        }
      });
      if (inviteErr) {
        emailStatus = 'failed';
        console.error('invite error:', inviteErr);
      } else {
        emailStatus = 'sent';
        acceptUrl = invited?.properties?.action_link ?? fallbackUrl;
      }
      phase = 'upserts';
      // ✅ HOTFIX: profiles.email é NOT NULL no teu schema → enviar email aqui
      await admin.from('profiles').upsert({
        id: userId,
        email: body.email,
        role: 'LEADER',
        full_name: body.full_name
      });
      await admin.from('leader_profiles').upsert({
        id: userId,
        email: body.email,
        phone: body.phone ?? null,
        birth_date: body.birth_date ?? null,
        gender: body.gender ?? null,
        cep: body.cep ?? null,
        street: body.street ?? null,
        number: body.number ?? null,
        complement: body.complement ?? null,
        neighborhood: body.neighborhood ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        notes: body.notes ?? null,
        goal: body.goal ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        status: 'PENDING'
      });
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await admin.from('invite_tokens').upsert({
        email: body.email,
        full_name: body.full_name,
        phone: body.phone ?? null,
        role: 'LEADER',
        token,
        expires_at: expiresAt.toISOString(),
        created_by: me.user.id,
        leader_profile_id: userId
      });
    }
    // ── OK ───────────────────────────────────────────────────────────────────
    logSuccess(auditContext, 200, {
      status,
      userId,
      emailStatus,
      targetEmail: body.email,
      targetName: body.full_name
    });
    
    return createCorsResponse({
      ok: true,
      acceptUrl,
      status,
      userId,
      emailStatus,
      message: status === 'USER_EXISTS' ? 'Usuário já existe — link de recuperação enviado.' : 'Convite enviado com sucesso!'
    }, 200, origin);
  } catch (err) {
    console.error('invite_leader error phase=', phase, 'msg=', err?.message);
    logError(auditContext, 500, err?.message ?? 'Erro interno', { phase });
    return createCorsErrorResponse(
      err?.message ?? 'Erro interno', 
      500, 
      origin
    );
  }
});
