import { supabase } from "@/lib/supabaseClient";

export type LeaderRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  invited_at: string | null;
};

type ToggleBanInput = {
  user_id: string;
  ban: boolean;                 // true = banir, false = desbanir
  until?: number | string;      // dias (número) OU ISO string (ex: "2030-01-01T00:00:00.000Z")
  reason?: string;
  mirrorLeaderStatus?: "ACTIVE" | "INACTIVE" | null; // opcional: espelhar em leader_profiles
};

export async function toggleUserBan(input: ToggleBanInput) {
  const payload = {
    user_id: input.user_id,
    ban: input.ban,
    until: input.until ?? undefined,
    reason: input.reason ?? null,
    set_leader_status: input.mirrorLeaderStatus ?? null,
  };

  const { data, error } = await supabase.functions.invoke("admin_ban_user", {
    body: payload,
  });

  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Falha ao bloquear/desbloquear usuário");
  }
  return data as { ok: true; user_id: string; banned_until: string | null };
}

export async function fetchLeaders(status?: "PENDING" | "ACTIVE" | "INACTIVE") {
  let q = supabase
    .from("app_leaders_list")
    .select("id,email,full_name,status,invited_at")
    .order("invited_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}

export async function countPendingLeaders() {
  const { count, error } = await supabase
    .from("app_leaders_list")
    .select("id", { head: true, count: "exact" })
    .eq("status", "PENDING");

  if (error) throw error;
  return count ?? 0;
}

export async function countActiveLeaders() {
  const { count, error } = await supabase
    .from("app_leaders_list")
    .select("id", { head: true, count: "exact" })
    .eq("status", "ACTIVE");

  if (error) throw error;
  return count ?? 0;
}

// Manter funções existentes para compatibilidade
export async function listLeaders(includePending = true): Promise<any[]> {
  if (includePending) {
    return await fetchLeaders();
  } else {
    return await fetchLeaders("ACTIVE");
  }
}

export async function reinviteLeader(payload: {
  full_name: string;
  email: string;
  phone?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sem sessão');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_leader`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ ...payload, appUrl: window.location.origin }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Falha ao reenviar convite');
  return json;
}

export async function countLeaders(profile?: any) {
  return await supabase.from("profiles").select("*", { count:"exact", head:false }).eq("role","LEADER");
}

export async function countPeople(profile?: any) {
  let query = supabase.from("people").select("*", { count:"exact", head:false });
  
  // Se for LEADER, filtrar apenas seus próprios registros
  if (profile && profile.role === 'LEADER') {
    query = query.eq('owner_id', profile.id);
  }
  
  return await query;
}

export async function countVotes(kind: "CONFIRMADO" | "PROVAVEL", profile?: any) {
  let query = supabase.from("people").select("*", { count:"exact", head:false }).eq("vote_status", kind);
  
  // Se for LEADER, filtrar apenas seus próprios registros
  if (profile && profile.role === 'LEADER') {
    query = query.eq('owner_id', profile.id);
  }
  
  return await query;
}

export async function getDefaultGoal() {
  return await supabase.from("org_settings").select("default_goal").eq("id",1).single();
}

export async function listLeaderStats() {
  // Admin only (controle na UI)
  return await supabase.from("v_leader_stats").select("*").order("total_people", { ascending:false }).limit(5);
}

export async function setRole(userId: string, role: "ADMIN"|"LEADER") {
  return await supabase.from("profiles").update({ role }).eq("id", userId);
}

export async function upsertLeaderGoal(leaderId: string, goal: number) {
  return await supabase.from("leader_targets").upsert({ leader_id: leaderId, goal }).select().single();
}