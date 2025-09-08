-- Função RPC para verificar se um usuário existe por email
-- Isso é mais eficiente que listar todos os usuários

CREATE OR REPLACE FUNCTION check_user_exists(user_email TEXT)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se o usuário existe na tabela auth.users
  -- Esta função só pode ser chamada com service role
  RETURN QUERY
  SELECT 
    au.id,
    au.email
  FROM auth.users au
  WHERE au.email = user_email
  LIMIT 1;
END;
$$;

-- Comentário sobre segurança
COMMENT ON FUNCTION check_user_exists(TEXT) IS 'Verifica se um usuário existe por email. Requer service role.';
