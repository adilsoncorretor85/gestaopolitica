import { getSupabaseClient } from '@/lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Força a sincronização da tabela public_settings com election_settings
 * Útil quando há discrepâncias entre as configurações
 */
export async function syncPublicSettings(client?: SupabaseClient): Promise<boolean> {
  try {
    const supabase = client || getSupabaseClient();
    
    console.log('🔄 [syncPublicSettings] Iniciando sincronização...');
    
    // 1. Buscar a configuração mais recente de election_settings
    const { data: electionData, error: electionError } = await supabase
      .from('election_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (electionError) {
      console.error('❌ [syncPublicSettings] Erro ao buscar election_settings:', electionError);
      return false;
    }

    if (!electionData) {
      console.warn('⚠️ [syncPublicSettings] Nenhuma configuração de eleição encontrada');
      return false;
    }

    console.log('📋 [syncPublicSettings] Configuração encontrada:', {
      id: electionData.id,
      election_name: electionData.election_name,
      election_date: electionData.election_date,
      election_level: electionData.election_level,
      election_type: electionData.election_type,
      timezone: electionData.timezone,
      scope_state: electionData.scope_state,
      scope_city: electionData.scope_city,
      updated_at: electionData.updated_at
    });

    // 2. Preparar dados para public_settings
    const publicSettingsPayload = {
      id: 1,
      election_name: electionData.election_name,
      election_date: electionData.election_date,
      timezone: electionData.timezone || 'America/Sao_Paulo',
      election_level: electionData.election_level || electionData.election_type,
      scope_state: electionData.scope_state || electionData.uf,
      scope_city: electionData.scope_city || electionData.city,
      scope_city_ibge: electionData.scope_city_ibge || electionData.city_ibge,
    };

    console.log('📤 [syncPublicSettings] Dados para public_settings:', publicSettingsPayload);

    // 3. Primeiro, verificar se o registro existe
    const { data: existingData, error: checkError } = await supabase
      .from('public_settings')
      .select('id')
      .eq('id', 1)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [syncPublicSettings] Erro ao verificar registro existente:', checkError);
      return false;
    }

    console.log('🔍 [syncPublicSettings] Registro existente:', existingData);

    // 4. Atualizar ou inserir public_settings
    let result;
    if (existingData) {
      console.log('💾 [syncPublicSettings] Atualizando registro existente...');
      result = await supabase
        .from('public_settings')
        .update(publicSettingsPayload)
        .eq('id', 1)
        .select();
    } else {
      console.log('💾 [syncPublicSettings] Inserindo novo registro...');
      result = await supabase
        .from('public_settings')
        .insert(publicSettingsPayload)
        .select();
    }

    if (result.error) {
      console.error('❌ [syncPublicSettings] Erro ao atualizar public_settings:', result.error);
      return false;
    }

    console.log('✅ [syncPublicSettings] Sincronização concluída com sucesso:', result.data);
    return true;
  } catch (error) {
    console.error('❌ [syncPublicSettings] Erro inesperado:', error);
    return false;
  }
}

/**
 * Verifica se há discrepâncias entre election_settings e public_settings
 */
export async function checkSettingsSync(client?: SupabaseClient): Promise<{
  isSynced: boolean;
  discrepancies: string[];
  electionData: any;
  publicData: any;
}> {
  try {
    const supabase = client || getSupabaseClient();
    
    console.log('🔍 [checkSettingsSync] Verificando sincronização...');
    
    // Buscar dados de ambas as tabelas
    const [electionResult, publicResult] = await Promise.all([
      supabase
        .from('election_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('public_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
    ]);

    if (electionResult.error) {
      console.error('❌ [checkSettingsSync] Erro ao buscar election_settings:', electionResult.error);
      return { isSynced: false, discrepancies: ['Erro ao buscar election_settings'], electionData: null, publicData: null };
    }

    if (publicResult.error) {
      console.error('❌ [checkSettingsSync] Erro ao buscar public_settings:', publicResult.error);
      return { isSynced: false, discrepancies: ['Erro ao buscar public_settings'], electionData: null, publicData: null };
    }

    const electionData = electionResult.data;
    const publicData = publicResult.data;

    if (!electionData) {
      return { isSynced: false, discrepancies: ['Nenhuma configuração de eleição encontrada'], electionData: null, publicData };
    }

    if (!publicData) {
      return { isSynced: false, discrepancies: ['Nenhuma configuração pública encontrada'], electionData, publicData: null };
    }

    // Verificar discrepâncias
    const discrepancies: string[] = [];

    if (electionData.election_name !== publicData.election_name) {
      discrepancies.push(`Nome: "${electionData.election_name}" vs "${publicData.election_name}"`);
    }

    if (electionData.election_date !== publicData.election_date) {
      discrepancies.push(`Data: "${electionData.election_date}" vs "${publicData.election_date}"`);
    }

    if ((electionData.timezone || 'America/Sao_Paulo') !== (publicData.timezone || 'America/Sao_Paulo')) {
      discrepancies.push(`Timezone: "${electionData.timezone}" vs "${publicData.timezone}"`);
    }

    if ((electionData.election_level || electionData.election_type) !== publicData.election_level) {
      discrepancies.push(`Nível: "${electionData.election_level || electionData.election_type}" vs "${publicData.election_level}"`);
    }

    const isSynced = discrepancies.length === 0;

    console.log('📊 [checkSettingsSync] Resultado:', {
      isSynced,
      discrepancies,
      electionData: {
        name: electionData.election_name,
        date: electionData.election_date,
        level: electionData.election_level || electionData.election_type,
        timezone: electionData.timezone
      },
      publicData: {
        name: publicData.election_name,
        date: publicData.election_date,
        level: publicData.election_level,
        timezone: publicData.timezone
      }
    });

    return { isSynced, discrepancies, electionData, publicData };
  } catch (error) {
    console.error('❌ [checkSettingsSync] Erro inesperado:', error);
    return { isSynced: false, discrepancies: ['Erro inesperado'], electionData: null, publicData: null };
  }
}

/**
 * Força a atualização da tabela public_settings com dados específicos
 * Útil para corrigir dados incorretos diretamente
 */
export async function forceUpdatePublicSettings(
  data: {
    election_name: string;
    election_date: string;
    election_level: string;
    timezone?: string;
    scope_state?: string;
    scope_city?: string;
  },
  client?: SupabaseClient
): Promise<boolean> {
  try {
    const supabase = client || getSupabaseClient();
    
    console.log('🔄 [forceUpdatePublicSettings] Forçando atualização com dados:', data);
    
    const payload = {
      id: 1,
      election_name: data.election_name,
      election_date: data.election_date,
      election_level: data.election_level,
      timezone: data.timezone || 'America/Sao_Paulo',
      scope_state: data.scope_state || null,
      scope_city: data.scope_city || null,
    };

    console.log('📤 [forceUpdatePublicSettings] Payload final:', payload);

    // Verificar se o registro existe
    const { data: existingData, error: checkError } = await supabase
      .from('public_settings')
      .select('id')
      .eq('id', 1)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [forceUpdatePublicSettings] Erro ao verificar registro existente:', checkError);
      return false;
    }

    let result;
    if (existingData) {
      console.log('💾 [forceUpdatePublicSettings] Atualizando registro existente...');
      result = await supabase
        .from('public_settings')
        .update(payload)
        .eq('id', 1)
        .select();
    } else {
      console.log('💾 [forceUpdatePublicSettings] Inserindo novo registro...');
      result = await supabase
        .from('public_settings')
        .insert(payload)
        .select();
    }

    if (result.error) {
      console.error('❌ [forceUpdatePublicSettings] Erro ao atualizar public_settings:', result.error);
      return false;
    }

    console.log('✅ [forceUpdatePublicSettings] Atualização forçada concluída:', result.data);
    return true;
  } catch (error) {
    console.error('❌ [forceUpdatePublicSettings] Erro inesperado:', error);
    return false;
  }
}
