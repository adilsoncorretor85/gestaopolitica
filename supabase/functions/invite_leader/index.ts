// supabase/functions/invite_leader/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
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
      return new Response(JSON.stringify({
        ok: false,
        error: 'Unauthorized'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    phase = 'check_admin';
    {
      const { data: profile, error: profErr } = await admin.from('profiles').select('role').eq('id', me.user.id).single();
      if (profErr) throw new Error('profiles read failed: ' + profErr.message);
      if (!profile || profile.role !== 'ADMIN') {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Forbidden'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 403
        });
      }
    }
    // ── INPUT ────────────────────────────────────────────────────────────────
    phase = 'parse_body';
    const body = await req.json();
    if (!body?.full_name || !body?.email) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Nome e email são obrigatórios'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // origem para links
    phase = 'origin';
    const origin = body.appUrl || req.headers.get('origin') || (req.headers.get('referer')?.split('/').slice(0, 3).join('/') ?? '');
    const redirectTo = `${origin}/convite`;
    const fallbackUrl = `${origin}/convite`;
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
      // === Usuário já existe (mantemos o comportamento antigo) ===
      phase = 'get_user_by_email';
      const { data: got } = await admin.auth.admin.getUserByEmail(body.email);
      if (!got?.user) throw new Error('Falha ao criar e também não encontrei usuário: ' + createErr.message);
      userId = got.user.id;
      status = 'USER_EXISTS';
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
    // ⚠️ Como você pediu: NÃO grava no schema no ramo USER_EXISTS.
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
    return new Response(JSON.stringify({
      ok: true,
      acceptUrl,
      status,
      userId,
      emailStatus,
      message: status === 'USER_EXISTS' ? 'Usuário já existe — link de recuperação enviado.' : 'Convite enviado com sucesso!'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (err) {
    console.error('invite_leader error phase=', phase, 'msg=', err?.message);
    return new Response(JSON.stringify({
      ok: false,
      phase,
      error: err?.message ?? 'Erro interno'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
