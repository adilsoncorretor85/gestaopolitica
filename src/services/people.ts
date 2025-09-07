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
  contacted_at?: string | null;
  vote_status?: "CONFIRMADO" | "PROVAVEL" | "INDEFINIDO";
  latitude?: number | null;
  longitude?: number | null;
};

export type PersonInsert = {
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
  contacted_at?: string | null;
  vote_status?: "CONFIRMADO" | "PROVAVEL" | "INDEFINIDO";
  latitude?: number | null;
  longitude?: number | null;
};

export async function listPeople(params?: {
  leaderId?: string;
  q?: string;
  city?: string;
  state?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'full_name' | 'created_at' | 'city' | 'state';
  sortOrder?: 'asc' | 'desc';
}) {
  if (!supabase) throw new Error('Supabase não configurado');

  const page = params?.page ?? 1, size = params?.pageSize ?? 20;
  const sortBy = params?.sortBy ?? 'full_name';
  const sortOrder = params?.sortOrder ?? 'asc';
  
  let q = supabase.from("people").select("*", { count: "exact" })
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range((page-1)*size, page*size - 1);

  if (params?.leaderId) q = q.eq("owner_id", params.leaderId);
  if (params?.q) q = q.ilike("full_name", `%${params.q}%`);
  if (params?.city) q = q.ilike("city", `%${params.city}%`);
  if (params?.state) q = q.ilike("state", `%${params.state}%`);

  return await q;
}

export async function getPerson(id: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  return await supabase.from("people").select("*").eq("id", id).single();
}

export async function createPerson(p: PersonInsert) {
  if (!supabase) throw new Error('Supabase não configurado');

  // Get current user to set owner_id automatically
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  // Set owner_id to current user
  const personWithOwner = { ...p, owner_id: user.id };
  
  const { data, error } = await supabase
    .from("people")
    .insert({
      ...personWithOwner,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    })
    .select('*')
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePerson(id: string, p: Partial<PersonInsert>) {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from("people")
    .update({
      ...p,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    })
    .eq("id", id)
    .select('*')
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePerson(id: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  return await supabase.from("people").delete().eq("id", id);
}