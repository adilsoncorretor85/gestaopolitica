// src/services/searchPeople.ts
import { devLog } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PersonSearchRow {
  id: string;
  full_name: string;
  city: string | null;
  state: string | null;
  rank: number;
}

export async function searchPeople(
  supabase: SupabaseClient,
  q: string,
  limit = 20,
  offset = 0
): Promise<PersonSearchRow[]> {
  const query = q.trim();
  if (!query) return [];

  devLog('[searchPeople] Executando RPC search_people com:', { query, limit, offset });

  const { data, error } = await supabase.rpc('search_people', {
    q: query,
    p_limit: limit,
    p_offset: offset
  });

  if (error) {
    console.error('[searchPeople] Erro na RPC:', error);
    throw error;
  }

  devLog('[searchPeople] Dados retornados:', data?.length || 0);
  return (data ?? []) as PersonSearchRow[];
}

