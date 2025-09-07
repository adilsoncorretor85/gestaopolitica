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
export declare function inviteLeader(input: InviteLeaderInput): Promise<{
    ok: true;
    acceptUrl: string;
    status: "INVITED" | "USER_EXISTS";
    userId: string;
    message: string;
}>;
/**
 * Compatibilidade: alguns pontos da UI ainda importam resendInvite.
 * Aqui apenas reutilizamos inviteLeader.
 */
export declare function resendInvite(input: InviteLeaderInput): Promise<{
    ok: true;
    acceptUrl: string;
    status: "INVITED" | "USER_EXISTS";
    userId: string;
    message: string;
}>;
/**
 * Compatibilidade: a aceitação real do convite é feita pelo link do e-mail
 * (rota /convite do app + fluxo do Supabase). Mantemos esse stub para
 * não quebrar a página AcceptInvite.tsx, caso ela ainda faça o import.
 */
export declare function acceptInvite(_args?: {
    token?: string;
}): Promise<{
    ok: boolean;
}>;
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
export declare function getInviteToken(token: string): Promise<InviteToken>;
