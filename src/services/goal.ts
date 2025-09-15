// src/services/goal.ts
import { getSupabaseClient } from '@/lib/supabaseClient';

export interface GoalInfo {
  effective_goal: number;
  user_goal: number | null;
  default_goal: number;
  source: 'user_defined' | 'organization_default';
}

/**
 * Busca a meta efetiva do usuário logado usando função RPC
 * Retorna apenas o valor da meta (integer)
 */
export async function getMyEffectiveGoal(): Promise<number> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('get_my_effective_goal');
  
  if (error) {
    console.error('Erro ao buscar meta efetiva:', error);
    throw new Error(`Falha ao buscar meta: ${error.message}`);
  }
  
  return data ?? 0;
}

/**
 * Busca informações completas sobre a meta do usuário logado
 * Retorna objeto com detalhes da meta
 */
export async function getMyGoalInfo(): Promise<GoalInfo> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('get_my_goal_info');
  
  if (error) {
    console.error('Erro ao buscar informações da meta:', error);
    throw new Error(`Falha ao buscar informações da meta: ${error.message}`);
  }
  
  // Se a função retornar null, usar valores padrão
  if (!data) {
    return {
      effective_goal: 100,
      user_goal: null,
      default_goal: 100,
      source: 'organization_default'
    };
  }
  
  return data as GoalInfo;
}

/**
 * Hook para usar a meta efetiva do usuário
 * Retorna apenas o valor da meta
 */
export async function useMyEffectiveGoal(): Promise<number> {
  try {
    return await getMyEffectiveGoal();
  } catch (error) {
    console.error('Erro no hook useMyEffectiveGoal:', error);
    return 100; // Valor padrão em caso de erro
  }
}
