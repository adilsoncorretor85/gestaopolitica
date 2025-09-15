// src/lib/auth.ts
import { supabase } from "@/lib/supabaseClient";

export async function getCurrentProfile() {
  if (!supabase) {
    console.error('Supabase não configurado');
    return null;
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle(); // 👈 evita erro "0 rows"

  return data ?? null;
}

export async function isAdmin() {
  const p = await getCurrentProfile();
  return p?.role === "ADMIN";
}