-- ATUALIZAÇÃO INCREMENTAL: Adicionar função delete_tag
-- Execute este arquivo se você já tem o sistema de tags instalado
-- e quer apenas adicionar a função de excluir tags

-- ========================================
-- NOVA FUNÇÃO: delete_tag
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
-- GRANT PARA NOVA FUNÇÃO
-- ========================================

GRANT EXECUTE ON FUNCTION public.delete_tag TO authenticated;

-- ========================================
-- COMENTÁRIO
-- ========================================

COMMENT ON FUNCTION public.delete_tag IS 'Excluir tag permanentemente (apenas admin) - verifica uso antes de excluir';

-- ========================================
-- VERIFICAÇÃO
-- ========================================

DO $$
BEGIN
  -- Verificar se a função foi criada
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'delete_tag'
  ) THEN
    RAISE NOTICE '✅ Função delete_tag criada com sucesso!';
  ELSE
    RAISE WARNING '❌ Erro: Função delete_tag não foi criada';
  END IF;
  
  -- Verificar grant
  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' 
    AND routine_name = 'delete_tag'
    AND grantee = 'authenticated'
  ) THEN
    RAISE NOTICE '✅ Grant aplicado com sucesso!';
  ELSE
    RAISE WARNING '❌ Erro: Grant não foi aplicado';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ATUALIZAÇÃO CONCLUÍDA!';
  RAISE NOTICE '💡 Agora você pode excluir tags na interface /admin/tags';
  RAISE NOTICE '';
END $$;
