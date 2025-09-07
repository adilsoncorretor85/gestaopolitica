import { getSupabaseClient } from "@/lib/supabaseClient";
export async function toggleUserBan(input) {
    if (!getSupabaseClient())
        throw new Error('Supabase não configurado');
    const payload = {
        user_id: input.user_id,
        ban: input.ban,
        until: input.until ?? undefined,
        reason: input.reason ?? null,
        set_leader_status: input.mirrorLeaderStatus ?? null,
    };
    const { data, error } = await getSupabaseClient().functions.invoke("admin_ban_user", {
        body: payload,
    });
    if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Falha ao bloquear/desbloquear usuário");
    }
    return data;
}
export async function fetchLeaders(status) {
    if (!getSupabaseClient())
        throw new Error('Supabase não configurado');
    let q = getSupabaseClient()
        .from("app_leaders_list")
        .select("id,email,full_name,status,invited_at")
        .order("invited_at", { ascending: false });
    if (status)
        q = q.eq("status", status);
    const { data, error } = await q;
    if (error)
        throw error;
    return (data ?? []);
}
export async function countPendingLeaders() {
    const { count, error } = await getSupabaseClient()
        ?.from("app_leaders_list")
        .select("id", { head: true, count: "exact" })
        .eq("status", "PENDING") || { count: 0, error: null };
    if (error)
        throw error;
    return count ?? 0;
}
export async function countActiveLeaders() {
    const { count, error } = await getSupabaseClient()
        .from("app_leaders_list")
        .select("id", { head: true, count: "exact" })
        .eq("status", "ACTIVE");
    if (error)
        throw error;
    return count ?? 0;
}
// Manter funções existentes para compatibilidade
export async function listLeaders(includePending = true) {
    if (includePending) {
        return await fetchLeaders();
    }
    else {
        return await fetchLeaders("ACTIVE");
    }
}
export async function reinviteLeader(payload) {
    const { data: { session } } = await getSupabaseClient()?.auth.getSession() || { data: { session: null } };
    if (!session?.access_token)
        throw new Error('Sem sessão');
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite_leader`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...payload, appUrl: window.location.origin }),
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json?.error || 'Falha ao reenviar convite');
    return json;
}
export async function countLeaders(_profile) {
    return await getSupabaseClient()?.from("profiles").select("*", { count: "exact", head: false }).eq("role", "LEADER");
}
export async function countPeople(profile) {
    let query = getSupabaseClient()?.from("people").select("*", { count: "exact", head: false });
    // Se for LEADER, filtrar apenas seus próprios registros
    if (profile && profile.role === 'LEADER') {
        query = query.eq('owner_id', profile.id);
    }
    return await query;
}
export async function countVotes(kind, profile) {
    let query = getSupabaseClient()?.from("people").select("*", { count: "exact", head: false }).eq("vote_status", kind);
    // Se for LEADER, filtrar apenas seus próprios registros
    if (profile && profile.role === 'LEADER') {
        query = query.eq('owner_id', profile.id);
    }
    return await query;
}
export async function getDefaultGoal() {
    return await getSupabaseClient()?.from("org_settings").select("default_goal").eq("id", 1).single();
}
export async function listLeaderStats() {
    // Admin only (controle na UI)
    return await getSupabaseClient()?.from("v_leader_stats").select("*").order("total_people", { ascending: false }).limit(5);
}
export async function setRole(userId, role) {
    return await getSupabaseClient()?.from("profiles").update({ role }).eq("id", userId);
}
export async function upsertLeaderGoal(leaderId, goal) {
    return await getSupabaseClient()?.from("leader_targets").upsert({ leader_id: leaderId, goal }).select().single();
}
