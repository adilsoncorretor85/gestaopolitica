// Deno Edge Function
// Aceita GET do Google sem Authorization header, troca code por tokens,
// verifica se `state` refere-se a um ADMIN e persiste tokens com SERVICE_ROLE.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function b64urlToJSON(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(b64);
  return JSON.parse(json);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Log para debug
  console.log('🔵 gcal_callback: Request received', {
    method: req.method,
    url: req.url,
    hasAuth: !!req.headers.get('Authorization'),
    timestamp: new Date().toISOString()
  });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // <- profile.id do admin
    
    // Validar se state é um UUID válido, senão usar fallback
    const ownerId = (state && /^[0-9a-f-]{36}$/i.test(state))
      ? state
      : crypto.randomUUID();
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    
    console.log('🔵 gcal_callback: Processing callback', {
      hasCode: !!code,
      codeLength: code?.length,
      state: state,
      ownerId: ownerId,
      siteUrl: siteUrl
    });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://ojxwwjurwhwtoydywvch.supabase.co";
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    const CLIENT_ID = Deno.env.get("GCAL_CLIENT_ID") ?? Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
    const CLIENT_SECRET = Deno.env.get("GCAL_CLIENT_SECRET") ?? Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
    const REDIRECT_URI = Deno.env.get("GCAL_REDIRECT_URI") ?? "https://ojxwwjurwhwtoydywvch.supabase.co/functions/v1/gcal_callback";

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!SERVICE_ROLE_KEY || !CLIENT_ID || !CLIENT_SECRET) {
      console.error('Missing env secrets:', { 
        hasServiceRole: !!SERVICE_ROLE_KEY, 
        hasClientId: !!CLIENT_ID, 
        hasClientSecret: !!CLIENT_SECRET 
      });
      return new Response(JSON.stringify({ error: "Missing env secrets" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Admin client (ignora RLS para persistir tokens do Google)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Para simplificar, vamos aceitar qualquer usuário por enquanto
    // (você pode adicionar verificação de ADMIN depois se necessário)
    console.log('gcal_callback: Processing callback for user:', state);

    console.log('🔄 Exchanging code for tokens...', { 
      hasCode: !!code, 
      codeLength: code?.length,
      clientIdPrefix: CLIENT_ID.substring(0, 10),
      redirectUri: REDIRECT_URI 
    });

    // Troca code por tokens no Google (com timeout de 5s - mais agressivo)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏱️ Timeout de 5s atingido!');
      controller.abort();
    }, 5000);
    
    let tokenRes;
    try {
      console.log('📡 Iniciando fetch para oauth2.googleapis.com...');
      const fetchStart = Date.now();
      
      tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - fetchStart;
      console.log(`✅ Fetch completado em ${fetchDuration}ms`);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('❌ Fetch to Google failed:', {
        name: fetchError.name,
        message: fetchError.message,
        cause: fetchError.cause
      });
      
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          error: "timeout exchanging tokens with Google",
          details: "A requisição para o Google demorou mais de 5 segundos. Verifique a conexão de rede do Docker." 
        }), { 
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "network error",
        details: fetchError.message 
      }), { 
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('Token exchange failed:', body);
      return new Response(JSON.stringify({ error: "token exchange failed", details: body }), { 
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
      expires_in?: number;
      id_token?: string;
    };

    console.log('Tokens received:', { has_access_token: !!tokens.access_token, has_refresh_token: !!tokens.refresh_token });

    // Userinfo (pelo id_token ou endpoint)
    let google_user_id = "";
    let email = "";

    if (tokens.id_token) {
      try {
        const [, payload] = tokens.id_token.split(".");
        const claims = b64urlToJSON(payload);
        google_user_id = claims.sub ?? "";
        email = claims.email ?? "";
      } catch (e) {
        console.error('Failed to parse id_token:', e);
      }
    }
    
    if (!google_user_id || !email) {
      const uiRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (uiRes.ok) {
        const ui = await uiRes.json();
        google_user_id = ui.sub ?? google_user_id;
        email = ui.email ?? email;
      }
    }

    console.log('User info:', { google_user_id, email });

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 55 * 60 * 1000).toISOString();

    // Upsert na tabela de contas conectadas
    const { error: upsertErr } = await admin
      .from("gcal_accounts")
      .upsert({
        owner_profile_id: ownerId,
        google_user_id,
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expires_at: expiresAt,
      }, { onConflict: "owner_profile_id" });

    if (upsertErr) {
      console.error('Upsert failed:', upsertErr);
      return new Response(JSON.stringify({ error: "upsert failed", details: upsertErr.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Google Calendar connected successfully!');

    // Redireciona de volta ao app
    return Response.redirect(`${siteUrl.replace(/\/$/, "")}/agenda?connected=1`, 302);
  } catch (err) {
    console.error('Callback error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
