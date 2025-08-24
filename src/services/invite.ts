// src/services/invite.ts
import { supabase } from "@/lib/supabaseClient";

export type InviteLeaderInput = {
  full_name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: "M" | "F" | "O";
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
};

/**
 * Envia convite via Edge Function (injeta Authorization automaticamente).
 */
export async function inviteLeader(input: InviteLeaderInput) {
  const appUrl = window.location.origin;

  const { data, error } = await supabase.functions.invoke("invite_leader", {
    body: { ...input, appUrl },
  });

  if (error) throw new Error(error.message || "Falha ao enviar convite");
  if (!data?.ok) throw new Error(data?.error || "Falha ao enviar convite");

  return data as {
    ok: true;
    acceptUrl: string;
    status: "INVITED" | "USER_EXISTS";
    userId: string;
    message: string;
  };
}

/**
 * Compatibilidade: alguns pontos da UI ainda importam resendInvite.
 * Aqui apenas reutilizamos inviteLeader.
 */
export async function resendInvite(input: InviteLeaderInput) {
  return inviteLeader(input);
}

/**
 * Compatibilidade: a aceitação real do convite é feita pelo link do e-mail
 * (rota /convite do app + fluxo do Supabase). Mantemos esse stub para
 * não quebrar a página AcceptInvite.tsx, caso ela ainda faça o import.
 */
export async function acceptInvite(_args?: { token?: string }) {
  return { ok: true };
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