// src/lib/dashboard.ts
import { supabase } from "@/lib/supabaseClient";

export async function getLeaderCounters() {
  const [pendingQ, activeQ] = await Promise.all([
    supabase.from("app_leaders_list").select("*", { count: "exact", head: true }).eq("is_pending", true),
    supabase.from("app_leaders_list").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return { pending: pendingQ.count ?? 0, active: activeQ.count ?? 0 };
}