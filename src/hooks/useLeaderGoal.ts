import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { z } from 'zod';

// Schema de validação para os dados da meta
const GoalInfo = z.object({
  goal: z.number().int().min(0),
  source: z.enum(['LEADER', 'ORG', 'FALLBACK']),
});

export type GoalInfo = z.infer<typeof GoalInfo>;

/**
 * Hook canônico para buscar a meta do líder autenticado
 * 
 * Fonte de verdade: RPC get_my_goal_info
 * Fallback: leader_profiles.goal -> org_settings.default_goal
 * 
 * @returns {Object} Objeto com goal, source, isLoading, error, refetch
 */
async function fetchGoal(): Promise<GoalInfo> {
  const debug = import.meta.env.VITE_DEBUG_GOAL === '1';
  const supabase = getSupabaseClient();

  if (debug) {
    console.debug('🎯 [useLeaderGoal] Iniciando busca da meta...');
  }

  // 1) Tenta RPC primeiro (fonte de verdade)
  try {
    const rpc = await supabase.rpc('get_my_goal_info');
    
    if (rpc.data) {
      // A RPC retorna um objeto com effective_goal, user_goal, default_goal, source
      const rpcData = rpc.data as any;
      
      if (rpcData.effective_goal && typeof rpcData.effective_goal === 'number') {
        const result = {
          goal: rpcData.effective_goal,
          source: rpcData.source === 'user_defined' ? 'LEADER' as const : 'ORG' as const
        };
        
        if (debug) {
          console.debug('✅ [useLeaderGoal] RPC get_my_goal_info →', result);
        }
        
        return result;
      }
    }
    
    if (rpc.error) {
      if (debug) {
        console.debug('❌ [useLeaderGoal] RPC falhou, usando fallback:', rpc.error);
      }
    }
  } catch (rpcError) {
    if (debug) {
      console.debug('❌ [useLeaderGoal] RPC erro, usando fallback:', rpcError);
    }
  }

  // 2) Fallback controlado
  if (debug) {
    console.debug('🔄 [useLeaderGoal] Iniciando fallback...');
  }

  // Obter usuário autenticado
  const { data: me, error: meErr } = await supabase.auth.getUser();
  if (meErr || !me?.user?.id) {
    throw new Error('Usuário não autenticado');
  }

  const uid = me.user.id;

  // Tentar buscar meta do leader_profiles
  const { data: lp, error: lpErr } = await supabase
    .from('leader_profiles')
    .select('goal')
    .eq('id', uid)
    .maybeSingle();

  if (lpErr) {
    if (debug) {
      console.debug('❌ [useLeaderGoal] Erro ao buscar leader_profiles:', lpErr);
    }
    throw lpErr;
  }

  // Se tem meta no leader_profiles, usar ela
  if (lp?.goal != null && lp.goal > 0) {
    const result = { goal: lp.goal, source: 'LEADER' as const };
    if (debug) {
      console.debug('✅ [useLeaderGoal] Fallback leader_profiles →', result);
    }
    return result;
  }

  // Se não tem meta no leader_profiles, usar org_settings.default_goal
  const { data: org, error: orgErr } = await supabase
    .from('org_settings')
    .select('default_goal')
    .eq('id', 1)
    .maybeSingle(); // 👈 evita erro "0 rows"

  if (orgErr) {
    if (debug) {
      console.debug('❌ [useLeaderGoal] Erro ao buscar org_settings:', orgErr);
    }
    throw orgErr;
  }

  const result = { 
    goal: org?.default_goal ?? 100, 
    source: 'ORG' as const 
  };
  
  if (debug) {
    console.debug('✅ [useLeaderGoal] Fallback org_settings →', result);
  }
  
  return result;
}

export function useLeaderGoal() {
  return useQuery({
    queryKey: ['leader-goal'],
    queryFn: fetchGoal,
    staleTime: 60_000, // 1 minuto
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook para invalidar cache da meta quando necessário
 * Útil para refetch após atualizações
 */
export function useInvalidateLeaderGoal() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['leader-goal'] });
  };
}
