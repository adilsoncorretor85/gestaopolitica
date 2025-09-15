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
    
    console.log('🔍 [getPublicSettings] Tentando buscar public_settings...');
    const { data, error } = await sb
      .from('public_settings')
      .select('*')
      .eq('id', 1) // Sempre id=1 (linha única)
      .maybeSingle(); // 👈 evita erro "0 rows"

    if (error) {
      console.warn('⚠️ [getPublicSettings] Erro ao buscar public_settings:', error);
      console.warn('⚠️ [getPublicSettings] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      return null;
    }

    if (data) {
      console.log('✅ [getPublicSettings] Dados encontrados:', data);
    } else {
      console.warn('⚠️ [getPublicSettings] Nenhum dado encontrado');
    }

    return data as PublicSettings;
  } catch (error) {
    console.warn('❌ [getPublicSettings] Erro inesperado:', error);
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
    // 1. Tentar public_settings primeiro (mais rápido)
    const publicSettings = await getPublicSettings(client);
    
    if (publicSettings?.election_date) {
      console.log('✅ Countdown: usando public_settings (cache)');
      return {
        date: publicSettings.election_date,
        tz: publicSettings.timezone || 'America/Sao_Paulo',
        name: publicSettings.election_name
      };
    }

    // 2. Fallback para RPC se public_settings não disponível
    console.log('⚠️ Countdown: public_settings não disponível, usando RPC fallback');
    const { getElectionSettings } = await import('./election');
    const election = await getElectionSettings(client);
    
    if (election?.election_date) {
      return {
        date: election.election_date,
        tz: election.timezone || 'America/Sao_Paulo',
        name: election.election_name
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao carregar dados do countdown:', error);
    return null;
  }
}
