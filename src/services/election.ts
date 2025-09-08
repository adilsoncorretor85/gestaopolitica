// src/services/election.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type ElectionLevel = 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';

export interface ElectionSettings {
  id: string;
  election_name: string;
  election_date: string;         // ISO (YYYY-MM-DD)
  timezone: string;              // IANA (ex.: America/Sao_Paulo)
  election_level: ElectionLevel | null;
  scope_state: string | null;    // UF
  scope_city: string | null;     // nome do município
  scope_city_ibge: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Mantém compatibilidade:
 * - aceita colunas novas (election_level, scope_state, scope_city, scope_city_ibge)
 * - ou antigas (election_type, uf, city, city_ibge)
 * Retorna o registro mais recente.
 */
export async function getElectionSettings(
  supabase: SupabaseClient
): Promise<ElectionSettings | null> {
  const { data, error } = await supabase
    .from('election_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const r: any = data;

  return {
    id: r.id,
    election_name: r.election_name,
    election_date: r.election_date,
    timezone: r.timezone ?? 'America/Sao_Paulo',
    election_level: (r.election_level ?? r.election_type) ?? null,
    scope_state: (r.scope_state ?? r.uf) ?? null,
    scope_city: (r.scope_city ?? r.city) ?? null,
    scope_city_ibge: (r.scope_city_ibge ?? r.city_ibge) ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Retorna uma string pronta para exibir (ex.: "Faltam 123d 4h").
 * Mantém o nome esperado pelo Dashboard.
 */
export function formatCountdown(dateISO: string, _timezone?: string): string {
  // Obs.: se quiser considerar timezone, troque por luxon; aqui mantemos simples.
  const now = new Date();
  const target = new Date(dateISO);
  const diffMs = target.getTime() - now.getTime();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);

  const days = Math.floor(abs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return past ? `Encerrada há ${days}d ${hours}h` : `Faltam ${days}d ${hours}h`;
  if (hours > 0) return past ? `Encerrada há ${hours}h ${minutes}m` : `Faltam ${hours}h ${minutes}m`;
  const mins = Math.max(0, minutes);
  return past ? `Encerrada há ${mins}m` : `Faltam ${mins}m`;
}

/** Aliases úteis (não obrigatórios, mas ajudam em outros pontos do app) */
export const getActiveElection = getElectionSettings;

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

  const row = { ...payload, id: current?.id };
  const { data, error } = await supabase
    .from('election_settings')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data as ElectionSettings;
}