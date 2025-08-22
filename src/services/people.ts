import { supabase } from "@/lib/supabaseClient";

export type Person = {
  id?: string;
  owner_id: string;
  full_name: string;
  whatsapp: string;
  email?: string;
  facebook?: string;
  instagram?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  consent?: boolean;
  contacted_at?: string | null;
  vote_status?: "CONFIRMADO" | "PROVAVEL" | "INDEFINIDO";
};

export async function listPeople(params?: {
  leaderId?: string;
  q?: string;
  city?: string;
  state?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params?.page ?? 1, size = params?.pageSize ?? 20;
  let q = supabase.from("people").select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page-1)*size, page*size - 1);

  if (params?.leaderId) q = q.eq("owner_id", params.leaderId);
  if (params?.q) q = q.ilike("full_name", `%${params.q}%`);
  if (params?.city) q = q.eq("city", params.city);
  if (params?.state) q = q.eq("state", params.state);

  return await q;
}

export async function getPerson(id: string) {
  return await supabase.from("people").select("*").eq("id", id).single();
}

export async function createPerson(p: Person) {
  // Get current user to set owner_id automatically
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  // Set owner_id to current user
  const personWithOwner = { ...p, owner_id: user.id };
  
  return await supabase.from("people").insert([personWithOwner]).select().single();
}

export async function updatePerson(id: string, p: Partial<Person>) {
  return await supabase.from("people").update(p).eq("id", id).select().single();
}

export async function deletePerson(id: string) {
  return await supabase.from("people").delete().eq("id", id);
}