import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BanUserRequest {
  userId: string
  action: 'ban' | 'unban'
  reason?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error('Missing required environment variables')
    }

    // Create clients
    const admin = createClient(supabaseUrl, serviceKey)
    const caller = createClient(supabaseUrl, anonKey, {
      global: { 
        headers: { 
          Authorization: req.headers.get("Authorization") ?? "" 
        } 
      },
    })

    // Validate user authentication
    const { data: meUser } = await caller.auth.getUser()
    if (!meUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Check if user is ADMIN
    const { data: profile } = await caller
      .from('profiles')
      .select('role')
      .eq('id', meUser.user.id)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions - ADMIN role required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Parse request body
    const body: BanUserRequest = await req.json()

    if (!body.userId || !body.action) {
      return new Response(
        JSON.stringify({ error: 'userId e action são obrigatórios' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (body.action !== 'ban' && body.action !== 'unban') {
      return new Response(
        JSON.stringify({ error: 'action deve ser "ban" ou "unban"' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Perform ban/unban action
    if (body.action === 'ban') {
      // 1. Ban no Supabase Auth
      const { error: banError } = await admin.auth.admin.updateUserById(body.userId, {
        ban_duration: '876000h', // 100 years (effectively permanent)
        user_metadata: {
          banned: true,
          banned_at: new Date().toISOString(),
          banned_by: meUser.user.id,
          ban_reason: body.reason || 'Banned by administrator'
        }
      })

      if (banError) {
        throw new Error(`Erro ao banir usuário: ${banError.message}`)
      }

      // 2. Atualizar status no leader_profiles
      const { error: statusError } = await admin
        .from('leader_profiles')
        .update({ status: 'INACTIVE' })
        .eq('id', body.userId)

      if (statusError) {
        console.error('Erro ao atualizar status do líder:', statusError)
        // Não falha o ban por causa disso, mas loga o erro
      }
    } else {
      // Unban
      // 1. Unban no Supabase Auth
      const { error: unbanError } = await admin.auth.admin.updateUserById(body.userId, {
        ban_duration: 'none',
        user_metadata: {
          banned: false,
          unbanned_at: new Date().toISOString(),
          unbanned_by: meUser.user.id
        }
      })

      if (unbanError) {
        throw new Error(`Erro ao desbanir usuário: ${unbanError.message}`)
      }

      // 2. Atualizar status no leader_profiles
      const { error: statusError } = await admin
        .from('leader_profiles')
        .update({ status: 'ACTIVE' })
        .eq('id', body.userId)

      if (statusError) {
        console.error('Erro ao atualizar status do líder:', statusError)
        // Não falha o unban por causa disso, mas loga o erro
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: body.action === 'ban' 
          ? 'Usuário banido com sucesso'
          : 'Usuário desbanido com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Admin ban user error:', error)
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})