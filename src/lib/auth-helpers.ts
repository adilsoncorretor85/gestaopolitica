import { devLog } from '@/lib/logger';
import { supabase } from './supabaseClient';

/**
 * Ativa automaticamente um líder se ele estiver com status PENDING (convite não aceito)
 * Esta função é chamada após o login para garantir que líderes convidados
 * sejam ativados automaticamente no primeiro acesso
 */
export async function activateLeaderIfPending(): Promise<void> {
  try {
    // Buscar o registro do líder atual
    const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
    
    if (!user?.id) {
      devLog('[activateLeaderIfPending] Nenhum usuário autenticado');
      return;
    }

    // Buscar o registro do líder
    const { data: leaderProfile, error: fetchError } = await supabase
      ?.from('leader_profiles')
      .select('id, status, email')
      .eq('id', user.id)
      .maybeSingle() || { data: null, error: null }; // 👈 evita erro "0 rows"

    if (fetchError) {
      devLog('[activateLeaderIfPending] Erro ao buscar perfil do líder:', fetchError);
      return;
    }

    if (!leaderProfile) {
      devLog('[activateLeaderIfPending] Perfil de líder não encontrado para o usuário:', user.id);
      return;
    }

    // Se já está ativo, não faz nada
    if (leaderProfile.status === 'ACTIVE') {
      devLog('[activateLeaderIfPending] Líder já está ativo:', leaderProfile.email);
      return;
    }

    // Se não está PENDING, não faz nada (pode ser INACTIVE por banimento ou já ativo)
    if (leaderProfile.status !== 'PENDING') {
      devLog('[activateLeaderIfPending] Líder não está pendente (status:', leaderProfile.status, '):', leaderProfile.email);
      return;
    }

    // Ativar o líder - os triggers do banco cuidam do resto
    const { error: updateError } = await supabase
      ?.from('leader_profiles')
      .update({ 
        status: 'ACTIVE'
        // Os triggers cuidam de:
        // - accepted_at (trg_set_leader_accepted_at)
        // - invite_tokens (trg_mark_invite_on_activate)
        // - updated_at (update_leader_profiles_updated_at)
      })
      .eq('id', user.id) || { error: null };

    if (updateError) {
      console.error('[activateLeaderIfPending] Erro ao ativar líder:', updateError);
      return;
    }

    devLog('[activateLeaderIfPending] ✅ Líder ativado com sucesso:', leaderProfile.email);

  } catch (error) {
    console.error('[activateLeaderIfPending] Erro inesperado:', error);
    // Falha silenciosa para não travar o login
  }
}

/**
 * Verifica se o usuário atual é um líder ativo
 */
export async function isActiveLeader(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
    
    if (!user?.id) return false;

    const { data: leaderProfile } = await supabase
      ?.from('leader_profiles')
      .select('status')
      .eq('id', user.id)
      .maybeSingle() || { data: null }; // 👈 evita erro "0 rows"

    return leaderProfile?.status === 'ACTIVE';
  } catch (error) {
    console.error('[isActiveLeader] Erro ao verificar status do líder:', error);
    return false;
  }
}
