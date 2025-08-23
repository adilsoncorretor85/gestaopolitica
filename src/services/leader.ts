import { supabase } from '@/lib/supabaseClient'

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

export async function getLeaderById(id: string) {
  // 1) leader_profiles
  const { data: lp, error: e1 } = await supabase
    .from('leader_profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (e1) throw e1

  // 2) profiles (só para pegar/salvar o full_name)
  const { data: pr, error: e2 } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', id)
    .single()
  if (e2) throw e2

  return { ...lp, full_name: pr?.full_name ?? '' }
}

type LeaderUpdate = {
  full_name?: string
  email?: string
  phone?: string
  birth_date?: string | null
  gender?: 'M' | 'F' | 'O' | null
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
  // Atualiza leader_profiles (contato/endereço/etc.)
  const lp: any = { ...payload }
  delete lp.full_name // nome fica em profiles

  const { error: lpErr } = await supabase
    .from('leader_profiles')
    .update(lp)
    .eq('id', id)
  if (lpErr) throw lpErr

  // Se veio full_name, atualiza em profiles
  if (payload.full_name) {
    const { error: prErr } = await supabase
      .from('profiles')
      .update({ full_name: payload.full_name })
      .eq('id', id)
    if (prErr) throw prErr
  }

  // Retorna o detalhe atualizado
  return await getLeaderById(id)
}

export async function deactivateLeader(id: string) {
  // "Excluir" no painel = desativar (some de Ativos)
  const { error } = await supabase
    .from('leader_profiles')
    .update({ status: 'INACTIVE' })
    .eq('id', id)
  if (error) throw error
}

export const listPendingLeaders = () => callActions('list_pending')

export const resendInvite = (email: string, full_name?: string) =>
  callActions('resend_invite', { email, full_name })

export const revokeInvite = (email: string) =>
  callActions('revoke_invite', { email })
