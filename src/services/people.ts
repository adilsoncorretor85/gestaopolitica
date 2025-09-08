import { getSupabaseClient, handleSupabaseError } from "@/lib/supabaseClient";
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

// Usar tipos gerados do Supabase
export type Person = Tables<'people'>;
export type PersonInsert = TablesInsert<'people'>;
export type PersonUpdate = TablesUpdate<'people'>;

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
  try {
    const supabase = getSupabaseClient();

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

    const { data, error, count } = await q;
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'listar pessoas'));
    }

    return { data, error: null, count };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      count: 0
    };
  }
}

export async function getPerson(id: string): Promise<{ data: Person | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("people").select("*").eq("id", id).single();
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'buscar pessoa'));
    }
    
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function createPerson(p: PersonInsert): Promise<{ data: Person | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();

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
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'criar pessoa'));
    }
    
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function updatePerson(id: string, p: PersonUpdate): Promise<{ data: Person | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
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
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'atualizar pessoa'));
    }
    
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function deletePerson(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("people").delete().eq("id", id);
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'deletar pessoa'));
    }
    
    return { error: null };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}