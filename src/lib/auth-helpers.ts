import { supabase } from './supabaseClient';

/**
 * Ativa automaticamente um líder se ele estiver com status INACTIVE (convite não aceito)
 * Esta função é chamada após o login para garantir que líderes convidados
 * sejam ativados automaticamente no primeiro acesso
 */
export async function activateLeaderIfPending(): Promise<void> {
  try {
    // Buscar o registro do líder atual
    const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
    
    if (!user?.id) {
      console.warn('[activateLeaderIfPending] Nenhum usuário autenticado');
      return;
    }

    // Buscar o registro do líder
    const { data: leaderProfile, error: fetchError } = await supabase
      ?.from('leader_profiles')
      .select('id, status, email')
      .eq('id', user.id)
      .single() || { data: null, error: null };

    if (fetchError) {
      console.warn('[activateLeaderIfPending] Erro ao buscar perfil do líder:', fetchError);
      return;
    }

    if (!leaderProfile) {
      console.warn('[activateLeaderIfPending] Perfil de líder não encontrado para o usuário:', user.id);
      return;
    }

    // Se já está ativo, não faz nada
    if (leaderProfile.status === 'ACTIVE') {
      console.log('[activateLeaderIfPending] Líder já está ativo:', leaderProfile.email);
      return;
    }

    // Se não está INACTIVE, não faz nada (pode ser INACTIVE por banimento ou convite não aceito)
    if (leaderProfile.status !== 'INACTIVE') {
      console.log('[activateLeaderIfPending] Líder não está inativo (status:', leaderProfile.status, '):', leaderProfile.email);
      return;
    }

    // Ativar o líder
    const { error: updateError } = await supabase
      ?.from('leader_profiles')
      .update({ 
        status: 'ACTIVE',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id) || { error: null };

    if (updateError) {
      console.error('[activateLeaderIfPending] Erro ao ativar líder:', updateError);
      return;
    }

    // Marcar o convite como aceito
    if (leaderProfile.email) {
      const { error: inviteError } = await supabase
        ?.from('invite_tokens')
        .update({ 
          accepted_at: new Date().toISOString(),
          leader_profile_id: user.id
        })
        .eq('email', leaderProfile.email)
        .is('accepted_at', null) || { error: null };

      if (inviteError) {
        console.warn('[activateLeaderIfPending] Erro ao marcar convite como aceito:', inviteError);
        // Não falha a operação por causa disso
      } else {
        console.log('[activateLeaderIfPending] Convite marcado como aceito para:', leaderProfile.email);
      }
    }

    console.log('[activateLeaderIfPending] ✅ Líder ativado com sucesso:', leaderProfile.email);

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
      .single() || { data: null };

    return leaderProfile?.status === 'ACTIVE';
  } catch (error) {
    console.error('[isActiveLeader] Erro ao verificar status do líder:', error);
    return false;
  }
}
