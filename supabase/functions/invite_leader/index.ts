// supabase/functions/invite_leader/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !service || !anon) throw new Error('Missing SUPABASE_* env vars');

    const admin = createClient(url, service);
    const caller = createClient(url, anon, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? ''
        }
      }
    });

    // 1) precisa estar logado
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

    // 2) precisa ser ADMIN (usa admin client pra ignorar RLS na leitura)
    const { data: profile, error: profErr } = await admin.from('profiles').select('role').eq('id', me.user.id).single();
    if (profErr) throw profErr;
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

    // 3) valida body
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

    // 4) origem e redirect
    const origin = body.appUrl || req.headers.get('origin') || (req.headers.get('referer')?.split('/').slice(0, 3).join('/') ?? '');
    const redirectTo = `${origin}/convite`; // rota oficial
    const fallbackUrl = `${origin}/convite`;

    let userId = '';
    let status = 'INVITED';
    let acceptUrl = '';

    // 5) usuário já existe?
    const { data: byEmail } = await admin.auth.admin.getUserByEmail(body.email);
    const existing = byEmail?.user ?? null;

    if (existing) {
      // já existe ⇒ manda link de recovery
      userId = existing.id;
      status = 'USER_EXISTS';
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: body.email,
        options: {
          redirectTo
        }
      });
      if (!linkErr) acceptUrl = link.properties?.action_link ?? fallbackUrl;
    } else {
      // não existe ⇒ cria e convida
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: body.email,
        email_confirm: false,
        user_metadata: {
          full_name: body.full_name,
          phone: body.phone
        }
      });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message || 'Falha ao criar usuário');
      }
      userId = created.user.id;
      status = 'INVITED';

      // envia e-mail de convite
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
        redirectTo,
        data: {
          full_name: body.full_name
        }
      });
      if (!inviteErr) acceptUrl = invited?.properties?.action_link ?? fallbackUrl;

      // upsert nos dados de domínio (ignora RLS via service role)
      await admin.from('profiles').upsert({
        id: userId,
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

      // registra um token pra controle (opcional, mas útil)
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

    return new Response(JSON.stringify({
      ok: true,
      acceptUrl,
      status,
      userId,
      message: status === 'USER_EXISTS' ? 'Usuário já existe — link de recuperação enviado.' : 'Convite enviado com sucesso!'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (err) {
    console.error('invite_leader error:', err);
    return new Response(JSON.stringify({
      ok: false,
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