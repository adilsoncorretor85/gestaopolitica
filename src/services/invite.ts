import { supabase } from '@/lib/supabaseClient'

export interface InviteToken {
  id: string
  email: string
  full_name: string
  phone?: string
  role: string
  token: string
  expires_at: string
  created_by: string
  accepted_at?: string
  leader_profile_id?: string
  created_at: string
}

export interface InviteLeaderData {
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

export async function inviteLeader(data: InviteLeaderData) {
  const { data: session } = await supabase.auth.getSession()
  
  if (!session.session) {
    throw new Error('Não autenticado')
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-leader`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao enviar convite')
  }

  return response.json()
}

export async function getInviteToken(token: string) {
  const { data, error } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error) throw error
  return data as InviteToken
}

export async function acceptInvite(token: string, password: string) {
  // Get invite data
  const inviteData = await getInviteToken(token)
  
  // Sign up user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: inviteData.email,
    password,
    options: {
      data: {
        full_name: inviteData.full_name,
        phone: inviteData.phone,
      }
    }
  })

  if (signUpError) throw signUpError

  if (!authData.user) {
    throw new Error('Erro ao criar usuário')
  }

  // Mark invite as accepted
  const { error: updateError } = await supabase
    .from('invite_tokens')
    .update({
      accepted_at: new Date().toISOString(),
      leader_profile_id: authData.user.id,
    })
    .eq('token', token)

  if (updateError) throw updateError

  return authData
}

export async function resendInvite(email: string) {
  // Find existing invite
  const { data: existingInvite } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('email', email)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!existingInvite) {
    throw new Error('Convite não encontrado')
  }

  // Call edge function to resend
  const { data: session } = await supabase.auth.getSession()
  
  if (!session.session) {
    throw new Error('Não autenticado')
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-leader`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: existingInvite.full_name,
      email: existingInvite.email,
      phone: existingInvite.phone,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao reenviar convite')
  }

  return response.json()
}