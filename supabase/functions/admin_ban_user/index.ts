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
        JSON.stringify({ error: 'userId and action are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!['ban', 'unban'].includes(body.action)) {
      return new Response(
        JSON.stringify({ error: 'action must be "ban" or "unban"' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Prevent self-ban
    if (body.userId === meUser.user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot ban yourself' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Check if target user exists
    const { data: targetUser, error: getUserError } = await admin.auth.admin.getUserById(body.userId)
    if (getUserError || !targetUser.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Perform ban/unban action
    if (body.action === 'ban') {
      // Update user to banned status
      const { error: banError } = await admin.auth.admin.updateUserById(body.userId, {
        ban_duration: 'none', // Permanent ban
      })

      if (banError) {
        throw new Error(`Failed to ban user: ${banError.message}`)
      }

      // Update leader profile status to INACTIVE
      const { error: profileError } = await admin
        .from('leader_profiles')
        .update({ status: 'INACTIVE' })
        .eq('id', body.userId)

      if (profileError) {
        console.error('Failed to update leader profile:', profileError)
        // Don't fail the whole operation for this
      }

      // Log the ban action
      await admin
        .from('audit_logs')
        .insert({
          table_name: 'auth.users',
          record_id: body.userId,
          action: 'UPDATE',
          actor_id: meUser.user.id,
          details: {
            action: 'ban_user',
            reason: body.reason || 'No reason provided',
            target_user_email: targetUser.user.email,
          },
        })

      return new Response(
        JSON.stringify({ 
          ok: true,
          message: 'User banned successfully',
          userId: body.userId,
          action: 'ban'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } else { // unban
      // Remove ban from user
      const { error: unbanError } = await admin.auth.admin.updateUserById(body.userId, {
        ban_duration: 'none', // This actually removes the ban
      })

      if (unbanError) {
        throw new Error(`Failed to unban user: ${unbanError.message}`)
      }

      // Update leader profile status to ACTIVE (if it's a leader)
      const { data: leaderProfile } = await admin
        .from('leader_profiles')
        .select('id')
        .eq('id', body.userId)
        .single()

      if (leaderProfile) {
        const { error: profileError } = await admin
          .from('leader_profiles')
          .update({ status: 'ACTIVE' })
          .eq('id', body.userId)

        if (profileError) {
          console.error('Failed to update leader profile:', profileError)
          // Don't fail the whole operation for this
        }
      }

      // Log the unban action
      await admin
        .from('audit_logs')
        .insert({
          table_name: 'auth.users',
          record_id: body.userId,
          action: 'UPDATE',
          actor_id: meUser.user.id,
          details: {
            action: 'unban_user',
            reason: body.reason || 'No reason provided',
            target_user_email: targetUser.user.email,
          },
        })

      return new Response(
        JSON.stringify({ 
          ok: true,
          message: 'User unbanned successfully',
          userId: body.userId,
          action: 'unban'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

  } catch (error) {
    console.error('Admin ban user error:', error)
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})