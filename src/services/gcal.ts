import { getSupabaseClient } from '@/lib/supabaseClient';

export async function gcalBegin(): Promise<{ authUrl: string }> {
  const supabase = getSupabaseClient();
  
  // Obter o token de sessão atual
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Usuário não autenticado. Faça login primeiro.');
  }
  
  // Enviar o token de autorização no header
  const { data, error } = await supabase.functions.invoke('gcal_begin', { 
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  
  if (error) throw error;
  return data;
}

export async function gcalSync(): Promise<{ ok: boolean; count?: number }> {
  try {
    // Buscar conta do Google Calendar
    const supabase = getSupabaseClient();
    const { data: account, error: accountError } = await supabase
      .from('gcal_accounts')
      .select('*')
      .limit(1)
      .single();

    if (accountError || !account) {
      throw new Error('Nenhuma conta do Google Calendar conectada');
    }

    // Verificar se o token expirou
    let accessToken = account.access_token;
    if (account.expires_at && new Date(account.expires_at) <= new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? '',
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        // Atualizar token no banco
        await supabase
          .from('gcal_accounts')
          .update({
            access_token: refreshData.access_token,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('owner_profile_id', account.owner_profile_id);
      }
    }

    // Buscar eventos do Google Calendar (aumentar limite e filtrar aniversários)
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1000&singleEvents=true&orderBy=startTime&timeMin=' + new Date().toISOString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      throw new Error('Falha ao buscar eventos do Google Calendar');
    }

    const calendarData = await calendarResponse.json();
    const events = calendarData.items || [];
    
    console.log('📅 Eventos encontrados no Google Calendar:', events.length);
    console.log('📅 Primeiros eventos:', events.slice(0, 3));

    // Limpar eventos existentes
    await supabase
      .from('gcal_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserir novos eventos (filtrar aniversários automáticos)
    let syncedCount = 0;
    for (const event of events) {
      if (event.status === 'cancelled') continue;
      
      // Filtrar aniversários automáticos do Google
      const title = event.summary || '';
      const isBirthday = title.toLowerCase().includes('aniversário') || 
                        title.toLowerCase().includes('birthday') ||
                        event.description?.toLowerCase().includes('aniversário') ||
                        event.description?.toLowerCase().includes('birthday');
      
      if (isBirthday) {
        console.log('🚫 Filtrando aniversário:', title);
        continue;
      }

      const startTime = event.start?.dateTime || event.start?.date;
      const endTime = event.end?.dateTime || event.end?.date;
      const isAllDay = !event.start?.dateTime;

      console.log('✅ Adicionando evento real:', title);

      await supabase
        .from('gcal_events')
        .insert({
          google_event_id: event.id,
          title: title,
          description: event.description,
          location: event.location,
          start_time: startTime,
          end_time: endTime,
          is_all_day: isAllDay,
        });

      syncedCount++;
    }

    return { ok: true, count: syncedCount };
  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    throw error;
  }
}

export async function gcalRevoke(): Promise<{ ok: boolean }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('gcal_revoke', { method: 'POST' });
  if (error) throw error;
  return data;
}

export type GcalEvent = {
  id: string;
  google_event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
};

export async function listCachedEvents(): Promise<GcalEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('gcal_events')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data as GcalEvent[];
}

export async function getGcalAccountStatus(): Promise<{ connected: boolean; email?: string }> {
  const supabase = getSupabaseClient();
  const { data, error} = await supabase
    .from('gcal_accounts')
    .select('email')
    .limit(1);
  
  if (error) {
    console.error('Error checking gcal status:', error);
    return { connected: false };
  }
  
  const account = data && data.length > 0 ? data[0] : null;
  
  return {
    connected: !!account,
    email: account?.email
  };
}

// Nova função: troca tokens no FRONTEND (workaround para problema de rede do Docker)
export async function exchangeCodeForTokens(code: string, state: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? '';
    const redirectUri = 'http://localhost:5173/agenda'; // Frontend recebe o callback

    // Trocar code por tokens diretamente no frontend
    console.log('🔄 Frontend: Trocando code por tokens...');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error('❌ Token exchange failed:', errorBody);
      return { success: false, error: `Falha ao trocar tokens: ${errorBody}` };
    }

    const tokens = await tokenRes.json();
    console.log('✅ Tokens recebidos!');

    // Buscar informações do usuário
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error('❌ Failed to fetch user info');
      return { success: false, error: 'Falha ao obter informações do usuário' };
    }

    const userInfo = await userInfoRes.json();
    console.log('✅ User info:', userInfo);

    // Salvar tokens DIRETAMENTE no banco (sem Edge Function)
    // Como admin, conseguimos fazer upsert diretamente
    const supabase = getSupabaseClient();
    console.log('💾 Salvando tokens diretamente no banco...');
    
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 55 * 60 * 1000).toISOString();

    const { error: saveError } = await supabase
      .from('gcal_accounts')
      .upsert({
        owner_profile_id: state,
        google_user_id: userInfo.sub,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? '',
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expires_at: expiresAt,
      }, { onConflict: 'owner_profile_id' });

    if (saveError) {
      console.error('❌ Failed to save tokens:', saveError);
      return { success: false, error: `Falha ao salvar tokens: ${saveError.message || JSON.stringify(saveError)}` };
    }

    console.log('✅ Tokens salvos com sucesso diretamente no banco!');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Exchange error:', error);
    return { success: false, error: error.message };
  }
}
