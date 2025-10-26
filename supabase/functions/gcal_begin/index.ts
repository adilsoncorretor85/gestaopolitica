// supabase/functions/gcal_begin/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL  = (Deno.env.get('SUPABASE_URL') || '').trim();
    const ANON_KEY      = (Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY') || '').trim();
    const CLIENT_ID     = (Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('GCAL_CLIENT_ID') || '').trim();
    const BASE_REDIRECT_URI  = (Deno.env.get('GCAL_REDIRECT_URI') || 'https://ojxwwjurwhwtoydywvch.supabase.co/functions/v1/gcal_callback_public').trim();
    // Adicionar apikey na URL para permitir que Edge Function aceite callback do Google (free tier exige)
    const REDIRECT_URI = `${BASE_REDIRECT_URI}?apikey=${ANON_KEY}`;
    
    console.log('🔵 gcal_begin: Environment variables', {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'NOT SET',
      ANON_KEY: ANON_KEY ? 'SET' : 'NOT SET',
      CLIENT_ID: CLIENT_ID ? 'SET' : 'NOT SET',
      REDIRECT_URI: REDIRECT_URI ? 'SET' : 'NOT SET'
    });

    if (!CLIENT_ID || !REDIRECT_URI) {
      return new Response(JSON.stringify({
        error: 'Missing env vars',
        missing: { GOOGLE_CLIENT_ID: !!CLIENT_ID, GCAL_REDIRECT_URI: !!REDIRECT_URI }
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  // pega o usuário se tiver Authorization; senão usa fallback UUID
  let state: string | undefined;
  const auth = req.headers.get('Authorization');
  if (auth && SUPABASE_URL && ANON_KEY) {
    const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (user) state = user.id;
  }

  // fallback seguro: precisa ser um UUID válido
  if (!state || !/^[0-9a-f-]{36}$/i.test(state)) {
    state = crypto.randomUUID();
  }

    const scopes = [
      'openid', 'email', 'profile',
      'https://www.googleapis.com/auth/calendar'
    ].join(' ');

    console.log('🔵 gcal_begin: Creating auth URL', {
      CLIENT_ID: CLIENT_ID,
      BASE_REDIRECT_URI: BASE_REDIRECT_URI,
      REDIRECT_URI_has_apikey: REDIRECT_URI.includes('apikey='),
      state: state
    });
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);   // <- callback da Function
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('gcal_begin error:', err);
    return new Response(JSON.stringify({ error: 'gcal_begin failed', detail: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});


