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

  // 1) define a senha do usuário que veio pelo link (invite/recovery)
  const { error: passErr } = await supabase.auth.updateUser({ password });
  if (passErr) throw new Error(passErr.message);

  // 2) ativa o perfil de líder no banco (bypass RLS via SECURITY DEFINER)
  const { data, error: rpcErr } = await supabase.rpc('activate_leader');
  if (rpcErr) throw new Error(rpcErr.message);
  if (!data?.ok) throw new Error(data?.error ?? 'Falha ao ativar líder');

  // 3) retorna data
  return data;
}