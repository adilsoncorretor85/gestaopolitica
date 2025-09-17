-- Grants e permissões para sistema de tags
-- Versão final funcional - aplicada e testada

-- ========================================
-- GRANTS DE SCHEMA
-- ========================================

-- Grant de uso do schema public (se necessário)
GRANT USAGE ON SCHEMA public TO authenticated;

-- ========================================
-- GRANTS DE TABELAS
-- ========================================

-- Grants para tabela tags
-- Nota: INSERT/UPDATE/DELETE são controlados por RLS (apenas admin)
GRANT SELECT ON public.tags TO authenticated;

-- Grants para tabela people_tags
-- Nota: Todas operações controladas por RLS (admin ou líder+dono)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people_tags TO authenticated;

-- Grant para view vw_people_with_tags
GRANT SELECT ON public.vw_people_with_tags TO authenticated;

-- ========================================
-- GRANTS DE FUNÇÕES AUXILIARES
-- ========================================

-- Funções de verificação de acesso (helper functions)
GRANT EXECUTE ON FUNCTION public.is_current_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_leader TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_person_owned_by_current_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_sensitive_tag TO authenticated;

-- Funções de manipulação de tags
GRANT EXECUTE ON FUNCTION public.apply_tag_to_person TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_tag_from_person TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_person_tags TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_tags TO authenticated;

-- ========================================
-- GRANTS DE RPCS E VIEWS
-- ========================================

-- RPC principal de busca
GRANT EXECUTE ON FUNCTION public.search_people_with_tags TO authenticated;

-- RPCs auxiliares/diagnóstico
GRANT EXECUTE ON FUNCTION public.check_tags_seeds TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_tags_grants TO authenticated;

-- ========================================
-- GRANTS DE FUNÇÕES ADMINISTRATIVAS
-- ========================================

-- NOTA: Os grants das funções administrativas estão em 08_admin_rpcs.sql
-- Este arquivo deve ser executado APÓS 08_admin_rpcs.sql
-- Se houver erro "function not found", execute 08_admin_rpcs.sql primeiro

-- Verificar se funções administrativas existem antes de aplicar grants
DO $$
BEGIN
  -- Só aplicar grants se as funções existirem
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_tag' AND routine_schema = 'public') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_tag TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.update_tag TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.toggle_tag_status TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_tag TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_all_tags_admin TO authenticated';
    RAISE NOTICE '✅ Grants das funções administrativas aplicados';
  ELSE
    RAISE NOTICE '⚠️ Funções administrativas não encontradas. Execute 08_admin_rpcs.sql primeiro';
  END IF;
END $$;

-- ========================================
-- VERIFICAÇÃO DOS GRANTS
-- ========================================

-- Função para verificar se todos os grants foram aplicados
DO $$
DECLARE
  table_grants_count INTEGER;
  function_grants_count INTEGER;
  expected_functions TEXT[] := ARRAY[
    'is_current_user_admin',
    'is_current_user_leader', 
    'is_person_owned_by_current_user',
    'can_access_sensitive_tag',
    'apply_tag_to_person',
    'remove_tag_from_person',
    'get_person_tags',
    'get_available_tags',
    'search_people_with_tags',
    'check_tags_seeds',
    'verify_tags_grants',
    'create_tag',
    'update_tag',
    'toggle_tag_status',
    'delete_tag',
    'get_all_tags_admin'
  ];
  func_name TEXT;
  missing_grants TEXT[] := '{}';
BEGIN
  -- Verificar grants de tabelas
  SELECT COUNT(*) INTO table_grants_count
  FROM information_schema.table_privileges 
  WHERE table_schema = 'public' 
  AND table_name IN ('tags', 'people_tags', 'vw_people_with_tags')
  AND grantee = 'authenticated';
  
  -- Verificar grants de funções
  SELECT COUNT(*) INTO function_grants_count
  FROM information_schema.routine_privileges 
  WHERE routine_schema = 'public' 
  AND routine_name = ANY(expected_functions)
  AND grantee = 'authenticated';
  
  -- Verificar funções faltando grants
  FOREACH func_name IN ARRAY expected_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routine_privileges 
      WHERE routine_schema = 'public' 
      AND routine_name = func_name
      AND grantee = 'authenticated'
    ) THEN
      missing_grants := missing_grants || func_name;
    END IF;
  END LOOP;
  
  -- Log dos resultados
  RAISE NOTICE 'Grants aplicados:';
  RAISE NOTICE '- Tabelas/Views: % grants', table_grants_count;
  RAISE NOTICE '- Funções: % de % esperadas', function_grants_count, array_length(expected_functions, 1);
  
  IF array_length(missing_grants, 1) > 0 THEN
    RAISE WARNING 'Funções sem grants: %', missing_grants;
  ELSE
    RAISE NOTICE 'Todos os grants de funções foram aplicados com sucesso!';
  END IF;
  
  -- Avisos se algo estiver faltando
  IF table_grants_count < 3 THEN
    RAISE WARNING 'Esperados pelo menos 3 grants de tabelas, encontrados %', table_grants_count;
  END IF;
  
  IF function_grants_count < array_length(expected_functions, 1) THEN
    RAISE WARNING 'Esperados % grants de funções, encontrados %', array_length(expected_functions, 1), function_grants_count;
  END IF;
END $$;

-- ========================================
-- COMENTÁRIOS SOBRE SEGURANÇA
-- ========================================

/*
NOTAS DE SEGURANÇA:

1. TABELAS:
   - tags: SELECT livre para authenticated, CRUD apenas para admin (via RLS)
   - people_tags: Todas operações para authenticated, mas controladas por RLS
   
2. FUNÇÕES:
   - Helper functions: EXECUTE para authenticated, SECURITY DEFINER para proteção
   - RPCs de manipulação: EXECUTE para authenticated, SECURITY INVOKER para RLS
   - RPCs administrativas: EXECUTE para authenticated, SECURITY DEFINER com verificação interna
   
3. RLS (Row Level Security):
   - tags: Apenas admin pode INSERT/UPDATE/DELETE
   - people_tags: Admin pode tudo, líder apenas suas pessoas
   
4. TAGS SENSÍVEIS:
   - can_access_sensitive_tag() controla acesso (apenas admin para tags sensíveis)
   - Implementação via função, não RLS, para flexibilidade
   
5. AUDITORIA:
   - created_by registra quem aplicou/criou
   - created_at/updated_at para temporal
   - Triggers automáticos para updated_at
*/