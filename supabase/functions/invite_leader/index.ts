// supabase/functions/invite_leader/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function normalizeBirthDate(val) {
  if (!val || typeof val !== 'string') return undefined;
  const s = val.trim();
  if (!s) return undefined;
  // dd/mm/aaaa -> aaaa-mm-dd
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // aaaa-mm-dd (deixa passar)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return undefined;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Env
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error('Missing required environment variables');
    }

    // Clients
    const admin = createClient(supabaseUrl, serviceKey);
    const caller = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? ''
        }
      }
    });

    // Auth do chamador
    const { data: meUser } = await caller.auth.getUser();
    if (!meUser?.user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }

    // Verifica ADMIN
    const { data: profile } = await caller.from('profiles').select('role').eq('id', meUser.user.id).single();
    if (!profile || profile.role !== 'ADMIN') {
      return new Response(JSON.stringify({
        error: 'Insufficient permissions - ADMIN role required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }

    // Body
    const body = await req.json();
    if (!body.full_name || !body.email) {
      return new Response(JSON.stringify({
        error: 'Nome completo e email são obrigatórios'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // URL base do app
    const origin = body.appUrl || req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || '';
    const redirectTo = `${origin}/convite`;
    const fallbackUrl = `${origin}/convite`;

    let authUserId;
    let acceptUrl;
    let status = 'INVITED';

    // Descobre se já existe usuário por e-mail (primeira página é suficiente p/ nosso caso)
    const { data: usersData, error: listUsersError } = await admin.auth.admin.listUsers();
    if (listUsersError) {
      console.error('Error listing users:', listUsersError);
    }
    const existingUser = usersData?.users?.find((u) => u.email === body.email);

    if (existingUser) {
      // Usuário já existe -> link de recuperação
      authUserId = existingUser.id;
      status = 'USER_EXISTS';
      try {
        const { data: recoveryLink, error } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: body.email,
          options: {
            redirectTo
          }
        });
        if (error) console.error('generateLink(recovery) error:', error);
        acceptUrl = recoveryLink?.properties?.action_link ?? fallbackUrl;
      } catch (err) {
        console.error('Recovery link generation failed:', err);
        acceptUrl = fallbackUrl;
      }
    } else {
      // Cria usuário + convida
      const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
        email: body.email,
        email_confirm: false,
        user_metadata: {
          full_name: body.full_name,
          phone: body.phone
        }
      });
      if (createUserError || !newUser?.user) {
        throw new Error(`Erro ao criar usuário: ${createUserError?.message || 'Unknown error'}`);
      }
      authUserId = newUser.user.id;

      try {
        const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email, {
          redirectTo,
          data: {
            full_name: body.full_name,
            invite_token: crypto.randomUUID()
          }
        });
        if (inviteError) console.error('Invite email error:', inviteError);
        acceptUrl = inviteData?.properties?.action_link ?? fallbackUrl;
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        acceptUrl = fallbackUrl;
      }
    }

    // Garante profile (mantendo role existente, se houver)
    if (!authUserId) throw new Error('authUserId indefinido');
    const { data: existingProfile } = await admin.from('profiles').select('role').eq('id', authUserId).maybeSingle();
    const profileRole = existingProfile?.role || 'LEADER';
    const { error: profileError } = await admin.from('profiles').upsert({
      id: authUserId,
      role: profileRole,
      full_name: body.full_name
    });
    if (profileError) console.error('Profile upsert error:', profileError);

    // Monta payload condicional para leader_profiles (não sobrescrever com vazio)
    const leaderPayload = {
      id: authUserId,
      email: body.email
    };

    const addIfPresent = (k, v) => {
      if (v === undefined || v === null) return;
      if (typeof v === 'string' && v.trim() === '') return;
      leaderPayload[k] = v;
    };

    addIfPresent('phone', body.phone);
    addIfPresent('gender', body.gender);
    addIfPresent('cep', body.cep);
    addIfPresent('street', body.street);
    addIfPresent('number', body.number);
    addIfPresent('complement', body.complement);
    addIfPresent('neighborhood', body.neighborhood);
    addIfPresent('city', body.city);
    addIfPresent('state', body.state);
    addIfPresent('notes', body.notes);
    addIfPresent('goal', body.goal);
    addIfPresent('latitude', body.latitude);
    addIfPresent('longitude', body.longitude);

    const birthIso = normalizeBirthDate(body.birth_date);
    if (birthIso) leaderPayload.birth_date = birthIso;

    // Não rebaixar status se já for ACTIVE
    const { data: lpExist } = await admin.from('leader_profiles').select('status').eq('id', authUserId).maybeSingle();
    if (!lpExist) {
      leaderPayload.status = 'PENDING';
    } else if (lpExist.status !== 'ACTIVE') {
      // mantém ACTIVE se já estiver ativo; se não, pode marcar PENDING
      leaderPayload.status = 'PENDING';
    }

    const { error: leaderProfileError } = await admin.from('leader_profiles').upsert(leaderPayload, {
      onConflict: 'id'
    });
    if (leaderProfileError) console.error('Leader profile upsert error:', leaderProfileError);

    // Sempre registra um invite_tokens para alimentar dashboards/pendências
    try {
      const trackingToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { error: invErr } = await admin.from('invite_tokens').insert({
        email: body.email,
        full_name: body.full_name,
        phone: body.phone ?? null,
        role: 'LEADER',
        token: trackingToken,
        expires_at: expiresAt.toISOString(),
        created_by: meUser.user.id,
        leader_profile_id: authUserId
      });
      if (invErr) console.error('invite_tokens insert error:', invErr);
    } catch (tokenError) {
      console.error('Token creation error:', tokenError);
    }

    return new Response(JSON.stringify({
      ok: true,
      acceptUrl,
      status,
      userId: authUserId,
      message: status === 'USER_EXISTS' ? 'Usuário já existe. Enviamos um link para redefinir a senha.' : 'Convite enviado com sucesso! O líder receberá um email com instruções.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Invite leader error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error?.message || 'Erro interno do servidor'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});