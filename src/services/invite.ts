import { getSupabaseClient } from '@/lib/supabaseClient';

export type InviteLeaderInput = {
  full_name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  goal?: number;
  latitude?: number | null;
  longitude?: number | null;
  appUrl?: string;
};

// Aceite de convite (client-side, com a sessão válida do usuário)
export async function finalizeInvite(password: string) {
  const supabase = getSupabaseClient();

  // 1) define a senha do usuário que entrou pelo link de invite
  const { error: e1 } = await supabase.auth.updateUser({ password });
  if (e1) throw e1;

  // 2) ativa o líder via RPC (bypass RLS)
  const { data, error: e2 } = await supabase.rpc('activate_leader');
  if (e2) throw e2;
  if (!data?.ok) throw new Error(data?.error ?? 'Falha ao ativar o líder');

  return data;
}

/**
 * Abaixo: funções "stub/compat" para telas antigas não quebrarem build.
 * Não fazem nenhuma escrita direta em tabelas protegidas.
 */

export async function inviteLeader(input: InviteLeaderInput) {
  const supabase = getSupabaseClient();
  const appUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke('invite_leader', {
    body: { ...input, appUrl },
  });
  if (error) throw new Error(error.message || 'Falha ao enviar convite');
  if (!data?.ok) throw new Error(data?.error || 'Falha ao enviar convite');
  return data as {
    ok: true;
    acceptUrl?: string;
    status: 'INVITED' | 'USER_EXISTS';
    userId: string;
    message: string;
  };
}

export async function resendInvite(input: InviteLeaderInput) {
  return inviteLeader(input);
}

export interface InviteToken {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  token: string;
  expires_at: string;
  created_by: string;
  accepted_at?: string;
  leader_profile_id?: string;
  created_at: string;
}

export async function getInviteToken(token: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error) throw error;
  return data as InviteToken;
}

// Compat: páginas que ainda importam acceptInvite não devem escrever em tabelas
export async function acceptInvite(_args?: { token?: string }) {
  return { ok: true };
}