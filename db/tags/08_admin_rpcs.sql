-- RPCs administrativas para sistema de tags
-- Versão final funcional - aplicada e testada
-- NOVO: Funções para administração de tags (criar, editar, desativar)

-- ========================================
-- RPC: create_tag
-- ========================================

CREATE OR REPLACE FUNCTION public.create_tag(
  p_name text,
  p_description text DEFAULT '',
  p_color text DEFAULT '#808080',
  p_is_sensitive boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tag_id uuid;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem criar tags');
  END IF;

  -- Validar nome (obrigatório e único)
  IF trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome da tag é obrigatório');
  END IF;

  -- Verificar se já existe tag com esse nome (case insensitive)
  IF EXISTS(SELECT 1 FROM public.tags WHERE LOWER(name) = LOWER(trim(p_name))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe uma tag com este nome');
  END IF;

  -- Criar a tag
  INSERT INTO public.tags (name, description, color, is_sensitive, created_by)
  VALUES (trim(p_name), trim(p_description), p_color, p_is_sensitive, auth.uid())
  RETURNING id INTO new_tag_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Tag criada com sucesso',
    'tagId', new_tag_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ========================================
-- RPC: update_tag
-- ========================================

CREATE OR REPLACE FUNCTION public.update_tag(
  p_tag_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_color text DEFAULT '#808080',
  p_is_sensitive boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem editar tags');
  END IF;

  -- Validar nome (obrigatório e único)
  IF trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome da tag é obrigatório');
  END IF;

  -- Verificar se tag existe
  IF NOT EXISTS(SELECT 1 FROM public.tags WHERE id = p_tag_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag não encontrada');
  END IF;

  -- Verificar se já existe outra tag com esse nome (excluindo a atual)
  IF EXISTS(
    SELECT 1 FROM public.tags 
    WHERE LOWER(name) = LOWER(trim(p_name)) 
    AND id != p_tag_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe uma tag com este nome');
  END IF;

  -- Atualizar a tag
  UPDATE public.tags 
  SET 
    name = trim(p_name),
    description = trim(p_description),
    color = p_color,
    is_sensitive = p_is_sensitive,
    updated_at = now()
  WHERE id = p_tag_id;

  RETURN jsonb_build_object('success', true, 'message', 'Tag atualizada com sucesso');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ========================================
-- RPC: toggle_tag_status
-- ========================================

CREATE OR REPLACE FUNCTION public.toggle_tag_status(
  p_tag_id uuid,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tag_name text;
  usage_count integer;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem alterar status de tags');
  END IF;

  -- Verificar se tag existe e obter informações
  SELECT name INTO tag_name FROM public.tags WHERE id = p_tag_id;
  
  IF tag_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag não encontrada');
  END IF;

  -- Se está desativando, verificar se há pessoas usando a tag
  IF NOT p_is_active THEN
    SELECT COUNT(*) INTO usage_count 
    FROM public.people_tags 
    WHERE tag_id = p_tag_id;
    
    IF usage_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', format('Não é possível desativar a tag "%s" pois está sendo usada por %s pessoa(s)', tag_name, usage_count),
        'usageCount', usage_count
      );
    END IF;
  END IF;

  -- Atualizar status
  UPDATE public.tags 
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_tag_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Tag "%s" %s com sucesso', tag_name, CASE WHEN p_is_active THEN 'ativada' ELSE 'desativada' END)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ========================================
-- RPC: get_all_tags_admin
-- ========================================

CREATE OR REPLACE FUNCTION public.get_all_tags_admin()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  color text,
  is_active boolean,
  is_sensitive boolean,
  usage_count bigint,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    COALESCE(t.description, '') as description,
    COALESCE(t.color, '#808080') as color,
    COALESCE(t.is_active, true) as is_active,
    COALESCE(t.is_sensitive, false) as is_sensitive,
    (SELECT COUNT(*) FROM public.people_tags pt WHERE pt.tag_id = t.id) as usage_count,
    t.created_by,
    t.created_at,
    t.updated_at
  FROM public.tags t
  ORDER BY t.is_active DESC, t.name ASC;
END;
$$;

-- ========================================
-- RPC: delete_tag
-- ========================================

CREATE OR REPLACE FUNCTION public.delete_tag(p_tag_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tag_name text;
  usage_count integer;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem excluir tags');
  END IF;

  -- Verificar se tag existe e obter informações
  SELECT name INTO tag_name FROM public.tags WHERE id = p_tag_id;
  
  IF tag_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag não encontrada');
  END IF;

  -- Verificar se há pessoas usando a tag
  SELECT COUNT(*) INTO usage_count 
  FROM public.people_tags 
  WHERE tag_id = p_tag_id;
  
  IF usage_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Não é possível excluir a tag "%s" pois está sendo usada por %s pessoa(s). Remova a tag das pessoas primeiro.', tag_name, usage_count),
      'usageCount', usage_count
    );
  END IF;

  -- Excluir a tag
  DELETE FROM public.tags WHERE id = p_tag_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Tag "%s" excluída com sucesso', tag_name)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ========================================
-- GRANTS PARA FUNÇÕES ADMINISTRATIVAS
-- ========================================

-- Garantir permissões para authenticated
GRANT EXECUTE ON FUNCTION public.create_tag TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tag TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_tag_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tag TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_tags_admin TO authenticated;

-- ========================================
-- COMENTÁRIOS
-- ========================================

COMMENT ON FUNCTION public.create_tag IS 'Criar nova tag (apenas admin) - valida nome único e campos obrigatórios';
COMMENT ON FUNCTION public.update_tag IS 'Editar tag existente (apenas admin) - valida nome único e existência';
COMMENT ON FUNCTION public.toggle_tag_status IS 'Ativar/desativar tag (apenas admin) - verifica uso antes de desativar';
COMMENT ON FUNCTION public.delete_tag IS 'Excluir tag permanentemente (apenas admin) - verifica uso antes de excluir';
COMMENT ON FUNCTION public.get_all_tags_admin IS 'Listar todas as tags para administração (apenas admin) - inclui inativas e estatísticas';

-- ========================================
-- VERIFICAÇÃO DAS FUNÇÕES ADMINISTRATIVAS
-- ========================================

DO $$
DECLARE
  admin_functions TEXT[] := ARRAY[
    'create_tag',
    'update_tag', 
    'toggle_tag_status',
    'delete_tag',
    'get_all_tags_admin'
  ];
  func_name TEXT;
  missing_functions TEXT[] := '{}';
  function_count INTEGER := 0;
BEGIN
  -- Verificar se todas as funções administrativas existem
  FOREACH func_name IN ARRAY admin_functions
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = func_name
    ) THEN
      function_count := function_count + 1;
    ELSE
      missing_functions := missing_functions || func_name;
    END IF;
  END LOOP;
  
  -- Log dos resultados
  RAISE NOTICE 'Funções administrativas de tags:';
  RAISE NOTICE '- Criadas: % de %', function_count, array_length(admin_functions, 1);
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING 'Funções administrativas faltando: %', missing_functions;
  ELSE
    RAISE NOTICE 'Todas as funções administrativas foram criadas com sucesso!';
  END IF;
  
  -- Verificar grants
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routine_privileges 
  WHERE routine_schema = 'public' 
  AND routine_name = ANY(admin_functions)
  AND grantee = 'authenticated';
  
  RAISE NOTICE '- Grants aplicados: % de %', function_count, array_length(admin_functions, 1);
END $$;
