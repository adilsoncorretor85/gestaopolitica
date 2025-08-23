import { supabase } from '@/lib/supabaseClient'

export async function getLeaderById(id: string) {
  // usa a view de detalhe
  const { data, error } = await supabase
    .from('app_leader_detail')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

type LeaderUpdate = {
  full_name?: string
  email?: string
  phone?: string
  birth_date?: string | null
  gender?: 'Masculino' | 'Feminino' | 'Outro' | null
  cep?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  status?: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'PENDING'
}

export async function updateLeader(id: string, payload: LeaderUpdate) {
  // Atualiza leader_profiles (campos de contato/endereço/etc.)
  const lp: any = { ...payload }
  delete lp.full_name // full_name fica na tabela profiles

  const { error: lpErr } = await supabase
    .from('leader_profiles')
    .update(lp)
    .eq('id', id)

  if (lpErr) throw lpErr

  // Se mudou o nome, atualiza em profiles
  if (payload.full_name) {
    const { error: prErr } = await supabase
      .from('profiles')
      .update({ full_name: payload.full_name })
      .eq('id', id)

    if (prErr) throw prErr
  }

  // retorna o novo detalhe
  return await getLeaderById(id)
}

export async function deactivateLeader(id: string) {
  // "Excluir" soft: marca INACTIVE
  const { error } = await supabase
    .from('leader_profiles')
    .update({ status: 'INACTIVE' })
    .eq('id', id)

  if (error) throw error
}

const FN = '/functions/v1/invite_leader'
const ACTIONS_FN = '/functions/v1/leader_actions'

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

async function callActions(action: string, payload: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('No session')

  const url = `${import.meta.env.VITE_SUPABASE_URL}${ACTIONS_FN}`
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
    const err = json?.error || json?.message || res.statusText
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
  const payload = {
    ...data,
    redirectTo: `${window.location.origin}/convite`,
  }
  return call('invite', payload)
}

export const listPendingLeaders = () => callActions('list_pending')

export const resendInvite = (email: string, full_name?: string) =>
  callActions('resend_invite', { email, full_name })

export const revokeInvite = (email: string) =>
  callActions('revoke_invite', { email })

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