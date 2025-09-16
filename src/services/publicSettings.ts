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
    
    // Primeiro, verificar se a tabela existe e tem dados
    const { data: allData, error: allError } = await sb
      .from('public_settings')
      .select('*');
    
    console.log('🔍 [getPublicSettings] Todos os dados da tabela:', { allData, allError });
    
    // Agora buscar o registro específico
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
      console.log('✅ [getPublicSettings] Dados encontrados:', {
        id: data.id,
        election_name: data.election_name,
        election_date: data.election_date,
        election_level: data.election_level,
        timezone: data.timezone,
        scope_state: data.scope_state,
        scope_city: data.scope_city,
        created_at: data.created_at,
        updated_at: data.updated_at
      });
    } else {
      console.warn('⚠️ [getPublicSettings] Nenhum dado encontrado para id=1');
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
    
    console.log('🔍 [loadCountdownData] public_settings carregado:', publicSettings);
    
    if (publicSettings?.election_date) {
      console.log('✅ [loadCountdownData] usando public_settings (cache):', {
        date: publicSettings.election_date,
        name: publicSettings.election_name,
        timezone: publicSettings.timezone
      });
             return {
               date: publicSettings.election_date,
               tz: publicSettings.timezone || 'America/Sao_Paulo',
               name: publicSettings.election_name,
               election_level: publicSettings.election_level
             };
    }

    // 2. Fallback para RPC se public_settings não disponível
    console.log('⚠️ [loadCountdownData] public_settings não disponível, usando RPC fallback');
    const { getElectionSettings } = await import('./election');
    const election = await getElectionSettings(client);
    
    console.log('🔍 [loadCountdownData] election_settings carregado:', election);
    
    if (election?.election_date) {
      console.log('✅ [loadCountdownData] usando election_settings (fallback):', {
        date: election.election_date,
        name: election.election_name,
        timezone: election.timezone
      });
             return {
               date: election.election_date,
               tz: election.timezone || 'America/Sao_Paulo',
               name: election.election_name,
               election_level: election.election_level
             };
    }

    console.warn('⚠️ [loadCountdownData] Nenhuma configuração de eleição encontrada');
    return null;
  } catch (error) {
    console.error('❌ [loadCountdownData] Erro ao carregar dados do countdown:', error);
    return null;
  }
}
