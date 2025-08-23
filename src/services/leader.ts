// src/services/leader.ts
import { supabase } from "@/lib/supabaseClient";

export type LeaderListItem = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
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
  status: "PENDING" | "INVITED" | "ACTIVE" | "INACTIVE" | null;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean | null;
};

export async function listLeaders() {
  const { data, error } = await supabase
    .from("app_leaders_list")
    .select("id, full_name, email, phone, status, invited_at, accepted_at, is_active, is_pending")
    .order("invited_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as LeaderListItem[];
}

export async function getLeaderDetail(id: string) {
  const { data, error } = await supabase
    .from("app_leader_detail")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as LeaderDetail;
}

export async function updateLeaderProfile(
  id: string,
  values: Partial<LeaderDetail>
) {
  const editableLP: (keyof LeaderDetail)[] = [
    "email","phone","birth_date","gender","cep","street","number",
    "complement","neighborhood","city","state","notes",
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

// Reenviar convite: reutilize a função invite_leader (ela detecta usuário existente e manda recovery)
export async function resendInvite(email: string, full_name: string) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_leader`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, full_name, appUrl: window.location.origin }),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Falha ao reenviar convite");
  return res.json();
}

// Manter funções antigas para compatibilidade
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
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_leader`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Falha ao enviar convite");
  return res.json();
}

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