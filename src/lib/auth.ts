// src/lib/auth.ts
import { supabase } from "@/lib/supabaseClient";

export async function getCurrentProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  return data ?? null;
}

export async function isAdmin() {
  const p = await getCurrentProfile();
  return p?.role === "ADMIN";
}