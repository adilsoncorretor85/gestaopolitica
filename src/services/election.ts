import type { SupabaseClient } from '@supabase/supabase-js';

export type ElectionType = 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';

export interface ElectionSettings {
  id: string;
  election_name: string;
  election_date: string; // ISO date
  timezone: string;
  election_type: ElectionType;
  uf: string | null;     // 'SC', 'SP'...
  city: string | null;   // 'Joinville'...
}

export async function getActiveElection(supabase: SupabaseClient): Promise<ElectionSettings | null> {
  const { data, error } = await supabase
    .from('election_settings')
    .select('id,election_name,election_date,timezone,election_type,uf,city')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active election:', error);
    return null;
  }
  return data as ElectionSettings | null;
}