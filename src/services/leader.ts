import { supabase } from '@/lib/supabaseClient'

const FN = '/functions/v1/invite_leader'

async function call(action: string, payload: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('No session')

  const url = `${import.meta.env.VITE_SUPABASE_URL}${FN}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload, appUrl: window.location.origin }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json?.error || res.statusText
    throw new Error(String(err))
  }
  return json
}

export async function inviteLeader(data: {
  full_name: string
  email: string
  phone?: string
  birth_date?: string | null
  gender?: string | null
  cep?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
}) {
  return call('invite', data)
}

export async function listPendingLeaders() {
  return call('list_pending')
}

export async function resendInvite(email: string, full_name?: string) {
  return call('resend_invite', { email, full_name })
}

export async function revokeInvite(email: string) {
  return call('revoke_invite', { email })
}

// Funções existentes mantidas para compatibilidade
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

export interface InviteLeaderResponse {
  ok: boolean
  acceptUrl: string
  status: 'INVITED' | 'USER_EXISTS'
  userId: string
  message?: string
  error?: string
}

export async function getLeaders() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      created_at,
      leader_profiles (
        email,
        phone,
        birth_date,
        gender,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        notes,
        status,
        created_at,
        updated_at
      )
    `)
    .eq('role', 'LEADER')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getLeader(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      created_at,
      leader_profiles (
        email,
        phone,
        birth_date,
        gender,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        notes,
        status,
        created_at,
        updated_at
      )
    `)
    .eq('id', id)
    .eq('role', 'LEADER')
    .single()

  if (error) throw error
  return data
}

export async function updateLeader(id: string, data: Partial<InviteLeaderData>) {
  const { profile_data, leader_data } = separateProfileData(data)

  // Update profile if needed
  if (Object.keys(profile_data).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profile_data)
      .eq('id', id)

    if (profileError) throw profileError
  }

  // Update leader profile
  if (Object.keys(leader_data).length > 0) {
    const { error: leaderError } = await supabase
      .from('leader_profiles')
      .update(leader_data)
      .eq('id', id)

    if (leaderError) throw leaderError
  }

  return getLeader(id)
}

export async function updateLeaderStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
  const { error } = await supabase
    .from('leader_profiles')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

function separateProfileData(data: Partial<InviteLeaderData>) {
  const { full_name, ...leader_data } = data
  const profile_data: any = {}
  
  if (full_name !== undefined) {
    profile_data.full_name = full_name
  }

  return { profile_data, leader_data }
}