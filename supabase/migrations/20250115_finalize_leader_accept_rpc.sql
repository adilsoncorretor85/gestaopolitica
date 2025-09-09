-- Função RPC para finalizar aceite de convite de líder
-- Esta função é chamada após o usuário definir sua senha no fluxo de convite

CREATE OR REPLACE FUNCTION finalize_leader_accept()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  leader_profile RECORD;
  invite_token RECORD;
  result JSON;
BEGIN
  -- Obter o ID do usuário atual
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Usuário não autenticado');
  END IF;

  -- Buscar o perfil do líder
  SELECT * INTO leader_profile
  FROM leader_profiles
  WHERE id = current_user_id;

  -- Se não encontrou o perfil, retorna erro
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Perfil de líder não encontrado');
  END IF;

  -- Buscar o convite mais recente para este líder
  SELECT * INTO invite_token
  FROM invite_tokens
  WHERE leader_profile_id = current_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Atualizar o perfil do líder para ACTIVE
  UPDATE leader_profiles
  SET 
    status = 'ACTIVE',
    accepted_at = COALESCE(accepted_at, NOW())
  WHERE id = current_user_id;

  -- Marcar o convite como aceito se existir
  IF FOUND THEN
    UPDATE invite_tokens
    SET accepted_at = NOW()
    WHERE id = invite_token.id;
  END IF;

  -- Retornar resultado
  result := json_build_object(
    'success', true,
    'message', 'Convite aceito com sucesso',
    'leader_id', current_user_id,
    'accepted_at', NOW()
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retorna informações seguras
    RETURN json_build_object(
      'error', 'Erro interno ao finalizar aceite do convite',
      'code', SQLSTATE
    );
END;
$$;

-- Comentário sobre segurança
COMMENT ON FUNCTION finalize_leader_accept() IS 'Finaliza o aceite de convite de líder após definição de senha. Função segura para ser chamada no cliente.';
