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

// Função de compatibilidade para o Dashboard
export async function getElectionSettings(): Promise<ElectionSettings | null> {
  // Importação dinâmica para evitar dependência circular
  const { getSupabaseClient } = await import('@/lib/supabaseClient');
  const supabase = getSupabaseClient();
  return getActiveElection(supabase);
}

// Função para formatar countdown
export function formatCountdown(electionDate: string): { text: string; days: number } {
  const now = new Date();
  const election = new Date(electionDate);
  const diffTime = election.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: 'Eleição já ocorreu', days: 0 };
  } else if (diffDays === 0) {
    return { text: 'Eleição é hoje!', days: 0 };
  } else if (diffDays === 1) {
    return { text: 'Eleição é amanhã', days: 1 };
  } else {
    return { text: `${diffDays} dias para a eleição`, days: diffDays };
  }
}