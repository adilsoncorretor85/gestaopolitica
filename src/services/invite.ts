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

  const { error: e1 } = await supabase.auth.updateUser({ password });
  if (e1) throw e1;

  const { data, error: e2 } = await supabase.rpc('activate_leader');
  if (e2) throw e2;
  if (!data?.ok) throw new Error(data?.error ?? 'Falha ao ativar o líder');

  return data;
}