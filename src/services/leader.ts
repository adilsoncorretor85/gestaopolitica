import { supabase } from '@/lib/supabaseClient'

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leader_admin`

async function callLeaderAdmin(action: string, payload: any) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sem sessão')

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  })

  if (!res.ok) {
    // mostrar o texto de erro ajuda MUITO
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json()
}

// Funções administrativas usando a Edge Function
export const revokeInvite = (email: string) =>
  callLeaderAdmin('revoke_invite', { email })

export const listPendingLeaders = () =>
  callLeaderAdmin('list_pending', {})

export const resendInvite = (email: string) =>
  callLeaderAdmin('resend_invite', { email })

export const removeLeader = (leaderId: string, opts?: { hard?: boolean; reassignTo?: string }) =>
  callLeaderAdmin('remove_leader', { leaderId, ...opts })

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

export async function inviteLeader(data: InviteLeaderData): Promise<InviteLeaderResponse> {
  try {
    // Get current session
    const { data: session } = await supabase.auth.getSession()
    
    if (!session.session) {
      throw new Error('Usuário não autenticado')
    }

    // Call Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_leader`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Erro ao enviar convite')
    }

    return result
  } catch (error) {
    console.error('Erro ao convidar líder:', error)
    throw error
  }
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