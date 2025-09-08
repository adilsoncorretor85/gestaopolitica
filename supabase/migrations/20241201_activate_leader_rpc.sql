-- Função RPC para ativar líder automaticamente no primeiro login
-- Esta função é idempotente e segura para ser chamada múltiplas vezes

CREATE OR REPLACE FUNCTION activate_leader()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  leader_profile RECORD;
  org_settings RECORD;
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

  -- Se não encontrou o perfil ou já está ativo, retorna sucesso
  IF NOT FOUND OR leader_profile.status = 'ACTIVE' THEN
    RETURN json_build_object('success', true, 'message', 'Líder já ativo ou não encontrado');
  END IF;

  -- Buscar configurações da organização para goal padrão
  SELECT * INTO org_settings
  FROM org_settings
  LIMIT 1;

  -- Buscar o convite mais recente para este líder
  SELECT * INTO invite_token
  FROM invite_tokens
  WHERE leader_profile_id = current_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Atualizar o perfil do líder
  UPDATE leader_profiles
  SET 
    status = 'ACTIVE',
    accepted_at = COALESCE(accepted_at, NOW()),
    goal = COALESCE(goal, org_settings.default_goal, 50) -- fallback para 50 se não houver configuração
  WHERE id = current_user_id;

  -- Marcar o convite como aceito
  IF FOUND THEN
    UPDATE invite_tokens
    SET accepted_at = NOW()
    WHERE id = invite_token.id;
  END IF;

  -- Retornar resultado
  result := json_build_object(
    'success', true,
    'message', 'Líder ativado com sucesso',
    'leader_id', current_user_id,
    'activated_at', NOW()
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retorna informações seguras
    RETURN json_build_object(
      'error', 'Erro interno ao ativar líder',
      'code', SQLSTATE
    );
END;
$$;

-- Comentário sobre segurança
COMMENT ON FUNCTION activate_leader() IS 'Ativa automaticamente um líder no primeiro login. Função idempotente e segura.';
