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
  birth_date: string | null; // ISO (aaaa-mm-dd)
  gender: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  status: string | null;
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

// Atualiza SOMENTE campos preenchidos (evita apagar com vazio)
export async function updateLeaderProfile(id: string, input: Partial<LeaderDetail>) {
  const payload: Record<string, any> = {};

  const add = (k: keyof LeaderDetail) => {
    const v = input[k];
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    payload[k] = v;
  };

  const fields: (keyof LeaderDetail)[] = [
    "full_name","email","phone","birth_date","gender","cep","street","number","complement",
    "neighborhood","city","state","notes",
  ];
  fields.forEach(add);

  if (Object.keys(payload).length === 0) return; // nada pra salvar

  const { error } = await supabase.from("leader_profiles").update(payload).eq("id", id);
  if (error) throw error;
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