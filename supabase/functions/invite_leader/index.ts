import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteLeaderRequest {
  full_name: string
  email: string
  phone?: string
  birth_date?: string
  gender?: 'M' | 'F' | 'O'
  goal?: number
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  notes?: string
  latitude?: number
  longitude?: number
  appUrl?: string
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
    const body: InviteLeaderRequest = await req.json()

    if (!body.full_name || !body.email) {
      return new Response(
        JSON.stringify({ error: 'Nome completo e email são obrigatórios' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get origin for acceptUrl fallback
    const origin = body.appUrl || req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || ''
    const fallbackUrl = `${origin}/convite`
    const redirectTo = `${origin}/convite`

    let authUserId: string
    let acceptUrl: string
    let status: 'INVITED' | 'USER_EXISTS' = 'INVITED'

    // Check if user already exists using optimized query
    // Query auth.users directly using RPC or direct SQL
    let existingUser = null
    try {
      // Use a more efficient approach - query auth.users table directly
      const { data: authUsers, error: authQueryError } = await admin
        .rpc('check_user_exists', { user_email: body.email })
      
      if (!authQueryError && authUsers && authUsers.length > 0) {
        // User exists, get full user details
        const { data: userData } = await admin.auth.admin.getUserById(authUsers[0].id)
        existingUser = userData?.user
      }
    } catch (error) {
      console.error('Error checking user existence:', error)
      // Fallback: try to get user by email using admin API
      try {
        const { data: usersData, error: listUsersError } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 1,
          filter: { email: body.email }
        })
        
        if (!listUsersError && usersData?.users?.length > 0) {
          existingUser = usersData.users[0]
        }
      } catch (fallbackError) {
        console.error('Fallback user check failed:', fallbackError)
        // Continue with invite flow - assume user doesn't exist
      }
    }

    if (existingUser) {
      // User already exists - generate recovery link
      authUserId = existingUser.id
      status = 'USER_EXISTS'

      try {
        const { data: recoveryLink } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: body.email,
          options: { redirectTo }
        })
        acceptUrl = recoveryLink.properties?.action_link ?? fallbackUrl
      } catch (recoveryError) {
        console.error('Recovery link generation failed:', recoveryError)
        acceptUrl = fallbackUrl
      }
    } else {
      // User doesn't exist - create new user and send invite
      const { data: newUser, error: createUserError } = await admin.auth.admin.createUser({
        email: body.email,
        email_confirm: false,
        user_metadata: {
          full_name: body.full_name,
          phone: body.phone,
        }
      })

      if (createUserError || !newUser.user) {
        throw new Error(`Erro ao criar usuário: ${createUserError?.message || 'Unknown error'}`)
      }

      authUserId = newUser.user.id

      // Send invitation email
      try {
        const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email, {
          redirectTo,
          data: {
            full_name: body.full_name,
            invite_token: crypto.randomUUID(),
          }
        })

        if (inviteData?.properties?.action_link) {
          acceptUrl = inviteData.properties.action_link
        } else {
          acceptUrl = fallbackUrl
        }

        if (inviteError) {
          console.error('Invite email error:', inviteError)
          acceptUrl = fallbackUrl
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        acceptUrl = fallbackUrl
      }

      // Create invite token record for new users
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      try {
        await admin
          .from('invite_tokens')
          .upsert({
            email: body.email,
            full_name: body.full_name,
            phone: body.phone,
            role: 'LEADER',
            token,
            expires_at: expiresAt.toISOString(),
            created_by: meUser.user.id,
            leader_profile_id: authUserId,
          })
      } catch (tokenError) {
        console.error('Token creation error:', tokenError)
        // Don't fail the whole operation for token creation
      }
    }

    // Upsert profile (preserve existing role if user exists)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', authUserId)
      .single()

    const profileRole = existingProfile?.role || 'LEADER'

    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: authUserId,
        role: profileRole,
        full_name: body.full_name,
      })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      // Continue - this is not critical for the invite flow
    }

    // Upsert leader_profiles
    const { error: leaderProfileError } = await admin
      .from('leader_profiles')
      .upsert({
        id: authUserId,
        email: body.email,
        phone: body.phone,
        birth_date: body.birth_date,
        gender: body.gender,
        goal: body.goal,
        cep: body.cep,
        street: body.street,
        number: body.number,
        complement: body.complement,
        neighborhood: body.neighborhood,
        city: body.city,
        state: body.state,
        notes: body.notes,
        latitude: body.latitude,
        longitude: body.longitude,
        status: 'PENDING', // <<< manter pendente até aceitar (será ativado no primeiro login)
      })

    if (leaderProfileError) {
      console.error('Leader profile upsert error:', leaderProfileError)
      // Continue - this is not critical for the invite flow
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        acceptUrl,
        status,
        userId: authUserId,
        message: status === 'USER_EXISTS' 
          ? 'Usuário já existe. Link de recuperação de senha enviado.'
          : 'Convite enviado com sucesso! O líder receberá um email com instruções.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Invite leader error:', error)
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