// src/services/elections.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type ElectionLevel = 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';

export interface ElectionSettings {
  id: string;
  election_name: string;
  election_date: string; // ISO
  timezone: string;
  election_level: ElectionLevel | null;
  scope_state: string | null;      // UF
  scope_city: string | null;       // Nome do município
  scope_city_ibge: number | null;  // Código IBGE
  created_at: string;
  updated_at: string;
}

export async function getCurrentElection(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('election_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  console.log('getCurrentElection - data:', data);
  return data as ElectionSettings | null;
}

// Atualiza a linha existente (única) mantendo-a como corrente
export async function upsertElectionCurrent(
  supabase: SupabaseClient,
  payload: Partial<ElectionSettings>
) {
  const { data: current } = await supabase
    .from('election_settings')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = { ...(payload as any), id: current?.id };
  const { data, error } = await supabase
    .from('election_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as ElectionSettings;
}
