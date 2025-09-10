import { getSupabaseClient } from "@/lib/supabaseClient";

export type LeaderRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  invited_at: string | null;
};

type ToggleBanInput = {
  userId: string;
  action: 'ban' | 'unban';
  reason?: string;
};

export async function toggleUserBan(input: ToggleBanInput) {
  const supabase = getSupabaseClient();
  
  console.log('Chamando Edge Function admin_ban_user com:', input);
  
  const { data, error } = await supabase.functions.invoke('admin_ban_user', {
    body: {
      userId: input.userId,
      action: input.action,
      reason: input.reason || 'Solicitado pelo admin'
    }
  });

  console.log('Resposta da Edge Function:', { data, error });

  if (error) {
    console.error('Erro na Edge Function:', error);
    // tentar extrair o JSON retornado pela função
    const respText = (error as any)?.context?.response
      ? await (error as any).context.response.text()
      : '';
    let serverMsg = '';
    try { serverMsg = JSON.parse(respText)?.error; } catch { /* ignore */ }

    throw new Error(serverMsg || error.message || 'Falha ao bloquear/desbloquear usuário');
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Falha ao bloquear/desbloquear usuário');
  }

  return data as { ok: true; userId: string; action: string; message: string };
}

export async function fetchLeaders(status?: "PENDING" | "ACTIVE" | "INACTIVE") {
  if (!getSupabaseClient()) throw new Error('Supabase não configurado');

  let q = getSupabaseClient()
    .from("app_leaders_list")
    .select("id,email,full_name,status,invited_at")
    .order("invited_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}

export async function countPendingLeaders() {
  const { count, error } = await (getSupabaseClient() as any)
    ?.from("app_leaders_list")
    .select("id", { head: true, count: "exact" })
    .eq("status", "PENDING") || { count: 0, error: null };

  if (error) throw error;
  return count ?? 0;
}

export async function countActiveLeaders() {
  const { count, error } = await getSupabaseClient()
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


export async function countLeaders(_profile?: any) {
  return await (getSupabaseClient() as any)?.from("profiles").select("*", { count:"exact", head:false }).eq("role","LEADER");
}

export async function countPeople(profile?: any) {
  let query = (getSupabaseClient() as any)?.from("people").select("*", { count:"exact", head:false });
  
  // Se for LEADER, filtrar apenas seus próprios registros
  if (profile && profile.role === 'LEADER') {
    query = query.eq('owner_id', profile.id);
  }
  
  return await query;
}

export async function countVotes(kind: "CONFIRMADO" | "PROVAVEL", profile?: any) {
  let query = (getSupabaseClient() as any)?.from("people").select("*", { count:"exact", head:false }).eq("vote_status", kind);
  
  // Se for LEADER, filtrar apenas seus próprios registros
  if (profile && profile.role === 'LEADER') {
    query = query.eq('owner_id', profile.id);
  }
  
  return await query;
}

export async function getDefaultGoal() {
  return await (getSupabaseClient() as any)?.from("org_settings").select("default_goal").eq("id",1).single();
}

export async function listLeaderStats() {
  // Admin only (controle na UI)
  return await (getSupabaseClient() as any)?.from("v_leader_stats").select("*").order("total_people", { ascending:false }).limit(5);
}

export async function setRole(userId: string, role: "ADMIN"|"LEADER") {
  return await (getSupabaseClient() as any)?.from("profiles").update({ role }).eq("id", userId);
}

export async function upsertLeaderGoal(leaderId: string, goal: number) {
  return await (getSupabaseClient() as any)?.from("leader_targets").upsert({ leader_id: leaderId, goal }).select().single();
}