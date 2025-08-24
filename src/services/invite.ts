import { supabase } from '@/lib/supabaseClient'

export type InviteLeaderInput = {
  full_name: string
  email: string
  phone?: string
  birth_date?: string // "dd/mm/aaaa" ou "aaaa-mm-dd"
  gender?: "M" | "F" | "O"
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  notes?: string
}

export async function inviteLeader(input: InviteLeaderInput) {
  const appUrl = window.location.origin; // garante redirect correto /convite

  const { data, error } = await supabase.functions.invoke("invite_leader", {
    body: { ...input, appUrl },
  });

  if (error) {
    // propaga erro legível para o UI
    throw new Error(error.message || "Falha ao enviar convite");
  }
  if (!data?.ok) {
    throw new Error(data?.error || "Falha ao enviar convite");
  }
  return data; // { ok, acceptUrl, status, userId, message }
}

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
