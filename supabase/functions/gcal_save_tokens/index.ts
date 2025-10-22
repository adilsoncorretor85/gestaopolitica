import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Edge Function SEM require de Authorization header
// (usa SERVICE_ROLE_KEY internamente para salvar tokens)
export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { state, tokens, userInfo} = await req.json();

    if (!state || !tokens || !userInfo) {
      return new Response(JSON.stringify({ error: "Missing data in request body" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Usar env vars do Supabase (disponíveis automaticamente nas Edge Functions)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://kong:8000";
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    console.log('🔵 gcal_save_tokens: URL=', SUPABASE_URL, 'KEY=', SERVICE_ROLE_KEY ? 'exists' : 'missing');

    if (!SERVICE_ROLE_KEY) {
      console.error('Missing SERVICE_ROLE_KEY env secret');
      return new Response(JSON.stringify({ error: "Missing env secrets" }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔵 gcal_save_tokens: Creating Supabase client...');
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
    });
    console.log('🔵 gcal_save_tokens: Client created, checking profile...');

    // Verify if the user is an ADMIN
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", state)
      .maybeSingle();
    
    console.log('🔵 gcal_save_tokens: Profile check result - profile:', profile, 'error:', profileError);

    if (profileError) {
      console.error('profiles check failed:', profileError);
      return new Response(JSON.stringify({ error: "profiles check failed", details: profileError.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!profile || profile.role !== "ADMIN") {
      console.warn('Forbidden: admin only. User role:', profile?.role);
      return new Response(JSON.stringify({ error: "forbidden: admin only" }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 55 * 60 * 1000).toISOString();

    console.log('🔵 gcal_save_tokens: Upserting tokens into gcal_accounts...');
    const { error: upsertErr } = await admin
      .from("gcal_accounts")
      .upsert({
        owner_profile_id: state,
        google_user_id: userInfo.sub,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expires_at: expiresAt,
      }, { onConflict: "owner_profile_id" });
    
    console.log('🔵 gcal_save_tokens: Upsert result - error:', upsertErr);

    if (upsertErr) {
      console.error('🔴 gcal_save_tokens: Upsert failed:', upsertErr);
      return new Response(JSON.stringify({ error: "upsert failed", details: upsertErr.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ gcal_save_tokens: SUCCESS!');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('gcal_save_tokens error:', err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};