import { getSupabaseClient, handleSupabaseError } from "@/lib/supabaseClient";
import type { Person, PersonInsert, PersonUpdate } from '@/types/database';
import { searchPeople } from './searchPeople';

export type { Person, PersonInsert, PersonUpdate };

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
    
    // Se há busca por texto, usar FTS
    if (params?.q && params.q.trim()) {
      const offset = (page - 1) * size;
      const ftsResults = await searchPeople(supabase, params.q, size, offset);
      
      // Buscar dados completos das pessoas encontradas
      if (ftsResults.length > 0) {
        const ids = ftsResults.map(r => r.id);
        let query = supabase.from("people").select("*", { count: "exact" })
          .in("id", ids);

        if (params?.leaderId) query = query.eq("owner_id", params.leaderId);
        if (params?.city) query = query.ilike("city", `%${params.city}%`);
        if (params?.state) query = query.ilike("state", `%${params.state}%`);

        const { data, error, count } = await query;
        
        if (error) {
          throw new Error(handleSupabaseError(error, 'listar pessoas'));
        }

        // Ordenar pelos resultados do FTS (por rank)
        const sortedData = data ? data.sort((a, b) => {
          const aRank = ftsResults.find(r => r.id === a.id)?.rank || 0;
          const bRank = ftsResults.find(r => r.id === b.id)?.rank || 0;
          return bRank - aRank; // Maior rank primeiro
        }) : [];

        return { data: sortedData, error: null, count };
      } else {
        return { data: [], error: null, count: 0 };
      }
    }
    
    // Busca normal sem texto (listagem padrão)
    let q = supabase.from("people").select("*", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page-1)*size, page*size - 1);

    if (params?.leaderId) q = q.eq("owner_id", params.leaderId);
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