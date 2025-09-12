// src/services/election.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type ElectionLevel = 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';

export interface ElectionSettings {
  id: string;
  election_name: string;
  election_date: string;         // ISO (YYYY-MM-DD)
  timezone: string;              // IANA (ex.: America/Sao_Paulo)
  election_type: ElectionLevel;  // Campo obrigatório na tabela
  election_level: ElectionLevel | null;
  scope_state: string | null;    // UF
  scope_city: string | null;     // nome do município
  scope_city_ibge: string | null; // Código IBGE como string
  uf: string | null;             // Campo legado
  city: string | null;           // Campo legado
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

// Helper
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate(); // m: 0-11
}

// Diferença civil (Y/M/D), ignorando hora
function diffYMD(fromISO: string, toISO: string) {
  const from = new Date(fromISO);
  const to = new Date(toISO);

  let y = to.getFullYear() - from.getFullYear();
  let m = to.getMonth() - from.getMonth();
  let d = to.getDate() - from.getDate();

  if (d < 0) {
    const pm = (to.getMonth() - 1 + 12) % 12;
    const py = pm === 11 ? to.getFullYear() - 1 : to.getFullYear();
    d += daysInMonth(py, pm);
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }

  return { y, m, d };
}

/**
 * Retorna uma string pronta para exibir (ex.: "Faltam 1 ano e 2 meses e 3 dias").
 * Mantém o nome esperado pelo Dashboard.
 */
export function formatCountdown(dateISO: string): string {
  const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const past = new Date(dateISO).getTime() < new Date(todayISO).getTime();

  const { y, m, d } = past
    ? diffYMD(dateISO, todayISO)  // já passou
    : diffYMD(todayISO, dateISO); // falta

  const p = (n: number, s: string, p: string) => (n ? `${n} ${n === 1 ? s : p}` : '');
  const parts = [p(y,'ano','anos'), p(m,'mês','meses'), p(d,'dia','dias')].filter(Boolean);
  const text = parts.join(' e ');

  return past ? `Encerrada há ${text}` : `Faltam ${text}`;
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