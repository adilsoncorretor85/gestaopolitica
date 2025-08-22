import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InviteRequest {
  full_name: string
  email: string
  phone?: string
  birth_date?: string
  gender?: 'M' | 'F' | 'O'
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  notes?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get service role client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get regular client for auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'ADMIN') {
      throw new Error('Insufficient permissions')
    }

    // Parse request body
    const body: InviteRequest = await req.json()

    // Generate invite token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invite token record
    const { data: inviteData, error: inviteError } = await supabaseAdmin
      .from('invite_tokens')
      .insert({
        email: body.email,
        full_name: body.full_name,
        phone: body.phone,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single()

    if (inviteError) {
      throw inviteError
    }

    // Send invitation email using admin client
    const { error: inviteEmailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email,
      {
        redirectTo: `${req.headers.get('origin')}/convite/${token}`,
        data: {
          full_name: body.full_name,
          invite_token: token,
        }
      }
    )

    if (inviteEmailError) {
      console.error('Email invite error:', inviteEmailError)
      // Don't throw here - token is created, user can still use direct link
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        token,
        message: 'Convite enviado com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Invite error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})