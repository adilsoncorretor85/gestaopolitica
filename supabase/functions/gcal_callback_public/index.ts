// Edge Function PÚBLICA para Google OAuth Callback
// Esta função NÃO exige JWT e processa o callback do Google

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async (req: Request) => {
  console.log('🔵 gcal_callback_public: Request received', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    console.log('🔵 gcal_callback_public: Processing callback', {
      hasCode: !!code,
      codeLength: code?.length,
      state: state
    });

    if (!code) {
      console.log('❌ Missing code parameter');
      return new Response(JSON.stringify({ error: "Missing code" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configurações
    const SUPABASE_URL = "https://ojxwwjurwhwtoydywvch.supabase.co";
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
    const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
    const REDIRECT_URI = "https://ojxwwjurwhwtoydywvch.supabase.co/functions/v1/gcal_callback_public";
    const SITE_URL = "http://localhost:5173";

    if (!SERVICE_ROLE_KEY || !CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ Missing env secrets:', { 
        hasServiceRole: !!SERVICE_ROLE_KEY, 
        hasClientId: !!CLIENT_ID, 
        hasClientSecret: !!CLIENT_SECRET 
      });
      return new Response(JSON.stringify({ error: "Missing env secrets" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Admin client (ignora RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Validar state
    const ownerId = (state && /^[0-9a-f-]{36}$/i.test(state))
      ? state
      : crypto.randomUUID();

    console.log('🔄 Exchanging code for tokens...', { 
      hasCode: !!code, 
      codeLength: code?.length,
      clientIdPrefix: CLIENT_ID.substring(0, 10),
      redirectUri: REDIRECT_URI
    });

    // Trocar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("❌ Token exchange failed:", errorBody);
      return new Response(JSON.stringify({ error: `Failed to exchange tokens: ${errorBody}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokens = await tokenRes.json();
    console.log("✅ Tokens exchanged successfully.");

    // Buscar informações do usuário
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error("❌ Failed to fetch user info");
      return new Response(JSON.stringify({ error: "Failed to fetch user info" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userInfo = await userInfoRes.json();
    console.log("✅ User info:", userInfo);

    // Salvar tokens no banco
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 55 * 60 * 1000).toISOString();

    const { error: upsertError } = await admin.from("gcal_accounts").upsert(
      {
        owner_profile_id: ownerId,
        google_user_id: userInfo.sub,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expires_at: expiresAt,
      },
      { onConflict: "owner_profile_id" }
    );

    if (upsertError) {
      console.error("❌ Failed to save tokens:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save tokens", details: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ Google Calendar connected successfully!");

    // Redirecionar para o frontend
    return Response.redirect(`${SITE_URL}/agenda?gcal_connected=true`, 302);

  } catch (err: any) {
    console.error("❌ gcal_callback_public error:", err);
    return new Response(JSON.stringify({ error: "gcal_callback_public failed", detail: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
