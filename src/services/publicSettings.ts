import { devLog } from '@/lib/logger';
import { supabase as sbDefault } from '@/lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PublicSettings {
  id: number;
  election_name: string;
  election_date: string;
  timezone: string;
  election_level?: string;
  scope_state?: string;
  scope_city?: string;
  scope_city_ibge?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca configurações públicas (cache rápido) - liberado para todos autenticados
 * Esta tabela é preenchida automaticamente pelo Supabase via trigger
 */
export async function getPublicSettings(
  client?: SupabaseClient
): Promise<PublicSettings | null> {
  try {
    const sb = client ?? sbDefault;

    // consulta direta à linha única (evita varredura da tabela)
    const { data, error } = await sb
      .from('public_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      devLog('[getPublicSettings] erro:', error);
      return null;
    }
    return data as PublicSettings;
  } catch (err) {
    devLog('[getPublicSettings] erro inesperado:', err);
    return null;
  }
}

/**
 * Função auxiliar para carregar dados do countdown
 * Prioriza public_settings (rápido) e usa RPC como fallback
 */
export async function loadCountdownData(
  client?: SupabaseClient
): Promise<{ date: string; tz: string; name?: string } | null> {
  try {
    // 1) prioriza cache
    const ps = await getPublicSettings(client);
    if (ps?.election_date) {
      return {
        date: ps.election_date,
        tz: ps.timezone || 'America/Sao_Paulo',
        name: ps.election_name,
      };
    }

    // 2) fallback RPC
    const { getElectionSettings } = await import('./election');
    const e = await getElectionSettings(client);
    if (e?.election_date) {
      return {
        date: e.election_date,
        tz: e.timezone || 'America/Sao_Paulo',
        name: e.election_name,
      };
    }
    return null;
  } catch (err) {
    console.error('[loadCountdownData] erro:', err);
    return null;
  }
}
