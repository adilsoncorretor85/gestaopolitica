import { supabase } from "@/lib/supabaseClient";

export type GoalSummary = {
  total_leaders_goal: number;
  default_org_goal: number;
  effective_total_goal: number;
};

export async function getGoalSummary(): Promise<GoalSummary> {
  if (!supabase) throw new Error('Supabase não configurado');

  try {
    // Tenta buscar da view app_goal_summary
    const { data, error } = await supabase
      .from("app_goal_summary")
      .select("total_leaders_goal, default_org_goal, effective_total_goal")
      .single();

    if (!error && data) {
      return data;
    }
  } catch (viewError) {
    console.warn("View app_goal_summary não encontrada, usando fallback");
  }

  // Fallback: calcular manualmente
  const [orgSettings, leaderGoals] = await Promise.all([
    supabase.from("org_settings").select("default_goal").eq("id", 1).single(),
    supabase.from("leader_profiles").select("goal").not("goal", "is", null)
  ]);

  const defaultOrgGoal = orgSettings.data?.default_goal ?? 120;
  const totalLeadersGoal = leaderGoals.data?.reduce((sum, leader) => sum + (leader.goal || 0), 0) ?? 0;
  const effectiveTotalGoal = totalLeadersGoal > 0 ? totalLeadersGoal : defaultOrgGoal;

  return {
    total_leaders_goal: totalLeadersGoal,
    default_org_goal: defaultOrgGoal,
    effective_total_goal: effectiveTotalGoal
  };
}

export async function setOrgDefaultGoal(newGoal: number) {
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase
    .from("org_settings")
    .update({ default_goal: newGoal })
    .eq("id", 1);

  if (error) throw error;
}

export async function getLeaderCounters() {
  if (!supabase) throw new Error('Supabase não configurado');

  const [pendingQ, activeQ] = await Promise.all([
    supabase.from("app_leaders_list").select("*", { count: "exact", head: true }).eq("is_pending", true),
    supabase.from("app_leaders_list").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return { pending: pendingQ.count ?? 0, active: activeQ.count ?? 0 };
}