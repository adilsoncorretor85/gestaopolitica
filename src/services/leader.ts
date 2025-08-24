// src/services/leader.ts
import { supabase } from "@/lib/supabaseClient";

export type LeaderListItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  goal: number | null;
  status: "INVITED" | "PENDING" | "ACTIVE" | "INACTIVE" | null;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean | null;
  is_pending: boolean | null;
};

export type LeaderDetail = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: "M" | "F" | "O" | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  goal: number | null;
  status: "PENDING" | "INVITED" | "ACTIVE" | "INACTIVE" | null;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean | null;
};

export async function listLeaders() {
  const { data, error } = await supabase
    .from("app_leaders_list")
    .select(`
      id, full_name, email, phone, status, invited_at, accepted_at, is_active, is_pending,
      goal:leader_profiles!inner(goal)
    `)
    .order("invited_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  
  // Processar dados para incluir goal
  const processedData = (data ?? []).map(leader => ({
    ...leader,
    goal: leader.goal?.goal || null
  }));
  
  return processedData as LeaderListItem[];
}

export async function getLeaderDetail(id: string) {
  const { data, error } = await supabase
    .from("app_leader_detail")
    .select(`
      *,
      goal:leader_profiles!inner(goal)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  
  // Se não conseguir buscar goal da view, buscar diretamente
  if (!data.goal) {
    const { data: goalData } = await supabase
      .from("leader_profiles")
      .select("goal")
      .eq("id", id)
      .single();
    data.goal = goalData?.goal || null;
  }
  
  return data as LeaderDetail;
}

export async function updateLeaderProfile(
  id: string,
  values: Partial<LeaderDetail>
) {
  const editableLP: (keyof LeaderDetail)[] = [
    "email","phone","birth_date","gender","cep","street","number",
    "complement","neighborhood","city","state","notes","goal",
  ];

  const lpPayload: Record<string, any> = {};
  for (const k of editableLP) {
    if (k in values) {
      const v = (values as any)[k];
      if (v !== undefined) lpPayload[k] = v === "" ? null : v;
    }
  }

  if (Object.keys(lpPayload).length > 0) {
    const { error } = await supabase
      .from("leader_profiles")
      .update(lpPayload)
      .eq("id", id);
    if (error) throw new Error(`leader_profiles: ${error.message}`);
  }

  if ("full_name" in values && values.full_name !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: values.full_name || null })
      .eq("id", id);
    if (error) throw new Error(`profiles: ${error.message}`);
  }

  return true;
}

export async function inviteLeader(payload: {
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
  appUrl?: string;
}) {
  // 1) Garante sessão
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Você não está autenticado.');

  // 2) Chama a edge function COM o Bearer token
  const { data, error } = await supabase.functions.invoke('invite_leader', {
    body: { ...payload, appUrl: payload.appUrl || window.location.origin },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  if (data?.ok === false) throw new Error(data?.error || 'Falha ao enviar convite.');

  return data; // { ok, acceptUrl, status, userId, message }
}

export async function resendInvite(email: string, full_name?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Você não está autenticado.');

  const { data, error } = await supabase.functions.invoke('invite_leader', {
    body: { 
      email, 
      full_name: full_name || '',
      appUrl: window.location.origin 
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  if (data?.ok === false) throw new Error(data?.error || 'Falha ao reenviar convite.');

  return data;
}

// Manter funções antigas para compatibilidade
export async function deactivateLeader(id: string) {
  const { error } = await supabase
    .from('leader_profiles')
    .update({ status: 'INACTIVE' })
    .eq('id', id)
  if (error) throw error
}

// Funções antigas para compatibilidade
export const listPendingLeaders = () => listLeaders().then(leaders => leaders.filter(l => l.is_pending))
export const revokeInvite = async (email: string) => {
  const { error } = await supabase.from('invite_tokens').delete().eq('email', email)
  if (error) throw error
}