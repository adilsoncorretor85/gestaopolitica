import { devLog } from '@/lib/logger';
import { supabase } from "@/lib/supabaseClient";

export type GoalSummary = {
  total_leaders_goal: number;
  default_org_goal: number;
  effective_total_goal: number;
};

export async function getGoalSummary(): Promise<GoalSummary> {
  devLog('🔍 [getGoalSummary] Iniciando busca de metas...');

  try {
    if (!supabase) {
      console.error('❌ [getGoalSummary] Supabase não configurado');
      throw new Error('Supabase não configurado');
    }

    devLog('🔍 [getGoalSummary] Executando queries...');
    
    // 1. Buscar configuração da eleição para saber o tipo
    const { getElectionSettings } = await import('@/services/election');
    const election = await getElectionSettings(supabase);
    devLog('🔍 [getGoalSummary] Tipo de eleição:', election?.election_level);
    
    // 2. Buscar org_settings
    const orgSettings = await supabase.from("org_settings").select("default_goal").eq("id", 1).maybeSingle();
    devLog('🔍 [getGoalSummary] org_settings resultado:', orgSettings);
    
    // 3. Buscar metas dos líderes
    const leaderGoals = await supabase.from("leader_targets").select("goal");
    devLog('🔍 [getGoalSummary] leader_targets resultado:', leaderGoals);
    
    // 4. Calcular meta baseada no tipo de eleição
    let calculatedGoal = 0;
    
    if (election?.election_level === 'ESTADUAL') {
      // Eleição Estadual: somar metas das cidades
      devLog('🔍 [getGoalSummary] Calculando meta para eleição ESTADUAL (cidades)...');
      const cityGoals = await supabase.from("city_goals").select("goal_total");
      if (!cityGoals.error && cityGoals.data) {
        calculatedGoal = cityGoals.data.reduce((sum, row: any) => sum + (row.goal_total || 0), 0);
        devLog('🔍 [getGoalSummary] Meta calculada das cidades:', calculatedGoal);
      }
    } else if (election?.election_level === 'MUNICIPAL') {
      // Eleição Municipal: somar metas dos bairros
      devLog('🔍 [getGoalSummary] Calculando meta para eleição MUNICIPAL (bairros)...');
      const neighborhoodGoals = await supabase.from("neighborhood_goals").select("goal_total");
      if (!neighborhoodGoals.error && neighborhoodGoals.data) {
        calculatedGoal = neighborhoodGoals.data.reduce((sum, row: any) => sum + (row.goal_total || 0), 0);
        devLog('🔍 [getGoalSummary] Meta calculada dos bairros:', calculatedGoal);
      }
    }
    
    // 5. Fallback para metas dos líderes se não houver metas de cidade/bairro
    const totalLeadersGoal = leaderGoals.data?.reduce((sum, row: any) => sum + (row.goal || 0), 0) ?? 0;
    const defaultOrgGoal = orgSettings.data?.default_goal ?? 120;
    
    // 6. Definir meta efetiva
    const effectiveTotalGoal = calculatedGoal > 0 ? calculatedGoal : (totalLeadersGoal > 0 ? totalLeadersGoal : defaultOrgGoal);

    const result = {
      total_leaders_goal: totalLeadersGoal,
      default_org_goal: defaultOrgGoal,
      effective_total_goal: effectiveTotalGoal
    };

    devLog('🔍 [getGoalSummary] Resultado final:', {
      ...result,
      electionLevel: election?.election_level,
      calculatedGoal
    });
    return result;
  } catch (error) {
    console.error('❌ [getGoalSummary] Erro geral:', error);
    // Fallback: retornar valores padrão se houver erro
    return {
      total_leaders_goal: 0,
      default_org_goal: 120,
      effective_total_goal: 120
    };
  }
}

export async function setOrgDefaultGoal(newGoal: number) {
  if (!supabase) throw new Error('Supabase não configurado');

  const { error } = await supabase
    .from("org_settings")
    .update({ default_goal: newGoal })
    .eq("id", 1);

  if (error) throw error;
}

/**
 * Atualiza automaticamente a meta da organização baseada no tipo de eleição
 * - Eleição Estadual: soma das metas das cidades
 * - Eleição Municipal: soma das metas dos bairros
 */
export async function updateOrgGoalFromElectionType(): Promise<number> {
  devLog('🔍 [updateOrgGoalFromElectionType] Iniciando atualização automática...');

  try {
    if (!supabase) {
      console.error('❌ [updateOrgGoalFromElectionType] Supabase não configurado');
      throw new Error('Supabase não configurado');
    }

    // 1. Buscar configuração da eleição
    const { getElectionSettings } = await import('@/services/election');
    const election = await getElectionSettings(supabase);
    
    if (!election?.election_level) {
      devLog('⚠️ [updateOrgGoalFromElectionType] Tipo de eleição não definido');
      return 0;
    }

    let calculatedGoal = 0;

    if (election.election_level === 'ESTADUAL') {
      // Eleição Estadual: somar metas das cidades
      devLog('🔍 [updateOrgGoalFromElectionType] Calculando meta para eleição ESTADUAL (cidades)...');
      const cityGoals = await supabase.from("city_goals").select("goal_total");
      if (!cityGoals.error && cityGoals.data) {
        calculatedGoal = cityGoals.data.reduce((sum, row: any) => sum + (row.goal_total || 0), 0);
        devLog('🔍 [updateOrgGoalFromElectionType] Meta calculada das cidades:', calculatedGoal);
      }
    } else if (election.election_level === 'MUNICIPAL') {
      // Eleição Municipal: somar metas dos bairros
      devLog('🔍 [updateOrgGoalFromElectionType] Calculando meta para eleição MUNICIPAL (bairros)...');
      const neighborhoodGoals = await supabase.from("neighborhood_goals").select("goal_total");
      if (!neighborhoodGoals.error && neighborhoodGoals.data) {
        calculatedGoal = neighborhoodGoals.data.reduce((sum, row: any) => sum + (row.goal_total || 0), 0);
        devLog('🔍 [updateOrgGoalFromElectionType] Meta calculada dos bairros:', calculatedGoal);
      }
    }

    if (calculatedGoal > 0) {
      // Atualizar org_settings com a meta calculada
      const { error } = await supabase
        .from("org_settings")
        .update({ default_goal: calculatedGoal })
        .eq("id", 1);

      if (error) {
        console.error('❌ [updateOrgGoalFromElectionType] Erro ao atualizar org_settings:', error);
        throw error;
      }

      devLog('✅ [updateOrgGoalFromElectionType] Meta atualizada com sucesso:', calculatedGoal);
      return calculatedGoal;
    }

    devLog('⚠️ [updateOrgGoalFromElectionType] Nenhuma meta encontrada para calcular');
    return 0;
  } catch (error) {
    console.error('❌ [updateOrgGoalFromElectionType] Erro geral:', error);
    throw error;
  }
}

export async function getLeaderCounters() {
  devLog('🔍 [getLeaderCounters] Executando...');
  
  try {
    if (!supabase) {
      console.error('❌ [getLeaderCounters] Supabase não configurado');
      throw new Error('Supabase não configurado');
    }

    const [pendingQ, activeQ] = await Promise.all([
      supabase
        .from("leader_profiles")
        .select("*", { count: 'exact', head: true })
        .eq("status", "PENDING"),
      supabase
        .from("leader_profiles")
        .select("*", { count: 'exact', head: true })
        .eq("status", "ACTIVE"),
    ]);
    
    devLog('🔍 [getLeaderCounters] Queries executadas:', {
      pendingCount: pendingQ.count,
      activeCount: activeQ.count,
      pendingError: pendingQ.error,
      activeError: activeQ.error
    });

    if (pendingQ.error) {
      console.error('❌ [getLeaderCounters] Erro em pending:', pendingQ.error);
      throw pendingQ.error;
    }
    if (activeQ.error) {
      console.error('❌ [getLeaderCounters] Erro em active:', activeQ.error);
      throw activeQ.error;
    }
    
    const result = { pending: pendingQ.count ?? 0, active: activeQ.count ?? 0 };
    devLog('🔍 [getLeaderCounters] Resultado final:', result);
    return result;
  } catch (error) {
    console.error('❌ [getLeaderCounters] Erro geral:', error);
    // Fallback: retornar valores padrão se houver erro
    return { pending: 0, active: 0 };
  }
}
