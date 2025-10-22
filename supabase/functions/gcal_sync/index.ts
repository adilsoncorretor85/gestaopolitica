import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use SERVICE_ROLE_KEY to bypass RLS and network issues
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Get the first Google Calendar account (simplified for testing)
    const { data: account, error: accountError } = await supabaseClient
      .from('gcal_accounts')
      .select('*')
      .limit(1)
      .single()

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'No Google Calendar account connected' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }


    // Check if token is expired and refresh if needed
    let accessToken = account.access_token
    if (account.expires_at && new Date(account.expires_at) <= new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        accessToken = refreshData.access_token

        // Update stored token
        await supabaseClient
          .from('gcal_accounts')
          .update({
            access_token: refreshData.access_token,
            expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
          })
          .eq('owner_profile_id', account.owner_profile_id)
      }
    }

    // Fetch events from Google Calendar
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&singleEvents=true&orderBy=startTime',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarResponse.ok) {
      throw new Error('Failed to fetch calendar events')
    }

    const calendarData = await calendarResponse.json()
    const events = calendarData.items || []

    // Clear existing events and insert new ones
    await supabaseClient
      .from('gcal_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    let syncedCount = 0
    for (const event of events) {
      if (event.status === 'cancelled') continue

      const startTime = event.start?.dateTime || event.start?.date
      const endTime = event.end?.dateTime || event.end?.date
      const isAllDay = !event.start?.dateTime

      await supabaseClient
        .from('gcal_events')
        .insert({
          google_event_id: event.id,
          title: event.summary || 'Sem título',
          description: event.description,
          location: event.location,
          start_time: startTime,
          end_time: endTime,
          is_all_day: isAllDay,
        })

      syncedCount++
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        count: syncedCount,
        message: `${syncedCount} eventos sincronizados com sucesso`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in gcal_sync:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})



