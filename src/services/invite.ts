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

export async function finalizeInvite(password: string) {
  const supabase = getSupabaseClient();

  // define senha do usuário (já logado via hash)
  const { error: e1 } = await supabase.auth.updateUser({ password });
  if (e1) throw e1;

  // ativa via RPC (bypass RLS)
  const { data, error: e2 } = await supabase.rpc('activate_leader');
  if (e2) throw e2;
  if (!data?.ok) throw new Error(data?.error ?? 'Falha ao ativar o líder');

  return data;
}


export async function inviteLeader(input: InviteLeaderInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('invite_leader', {
    body: input,
  });

  if (error) {
    // tentar extrair o JSON retornado pela função
    const respText = (error as any)?.context?.response
      ? await (error as any).context.response.text()
      : '';
    let serverMsg = '';
    try { serverMsg = JSON.parse(respText)?.error; } catch { /* ignore */ }

    throw new Error(serverMsg || error.message || 'Falha ao enviar convite');
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Falha ao enviar convite');
  }

  return data as {
    ok: true;
    acceptUrl: string;
    status: 'INVITED' | 'USER_EXISTS';
    userId: string;
    emailStatus: 'sent'|'failed'|'skipped';
    message: string;
  };
}

// stubs de compat se páginas antigas ainda importarem
export async function resendInvite(input: InviteLeaderInput) {
  return inviteLeader(input);
}
export async function acceptInvite(): Promise<{ ok: true }> {
  return { ok: true };
}