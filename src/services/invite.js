// src/services/invite.ts
import { supabase } from "@/lib/supabaseClient";
/**
 * Envia convite via Edge Function (injeta Authorization automaticamente).
 */
export async function inviteLeader(input) {
    const appUrl = window.location.origin;
    const { data, error } = await supabase?.functions.invoke("invite_leader", {
        body: { ...input, appUrl },
    });
    if (error)
        throw new Error(error.message || "Falha ao enviar convite");
    if (!data?.ok)
        throw new Error(data?.error || "Falha ao enviar convite");
    return data;
}
/**
 * Compatibilidade: alguns pontos da UI ainda importam resendInvite.
 * Aqui apenas reutilizamos inviteLeader.
 */
export async function resendInvite(input) {
    return inviteLeader(input);
}
/**
 * Compatibilidade: a aceitação real do convite é feita pelo link do e-mail
 * (rota /convite do app + fluxo do Supabase). Mantemos esse stub para
 * não quebrar a página AcceptInvite.tsx, caso ela ainda faça o import.
 */
export async function acceptInvite(_args) {
    return { ok: true };
}
export async function getInviteToken(token) {
    const { data, error } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();
    if (error)
        throw error;
    return data;
}
