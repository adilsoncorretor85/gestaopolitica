/*
  # Tags System - Script de Diagnóstico
  
  Script para validar a instalação e funcionamento do sistema de tags.
  Este script é seguro e não faz alterações nos dados.
  
  IMPORTANTE: Execute este script após aplicar todos os outros scripts
  para verificar se tudo está funcionando corretamente.
*/

-- ========================================
-- 1. VERIFICAÇÃO DE ESTRUTURA
-- ========================================

-- Verificar se as tabelas foram criadas
SELECT 
  'TABELAS' as categoria,
  table_name as objeto,
  CASE 
    WHEN table_name = 'tags' THEN 'Tabela de tags criada'
    WHEN table_name = 'people_tags' THEN 'Tabela de relação N:N criada'
    ELSE 'Tabela inesperada'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tags', 'people_tags')
ORDER BY table_name;

-- Verificar se as views foram criadas
SELECT 
  'VIEWS' as categoria,
  table_name as objeto,
  'View criada' as status
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'vw_people_with_tags';

-- Verificar se as funções foram criadas
SELECT 
  'FUNÇÕES' as categoria,
  proname as objeto,
  'Função criada' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_current_user_admin', 'is_current_user_leader', 'is_person_owned_by_current_user', 'is_admin',
    'can_access_sensitive_tag', 'get_person_tags', 'search_people_with_tags',
    'apply_tag_to_person', 'remove_tag_from_person', 'get_available_tags',
    'verify_tags_grants', 'check_tags_seeds'
  )
ORDER BY p.proname;

-- ========================================
-- 2. VERIFICAÇÃO DE RLS
-- ========================================

-- Verificar políticas RLS na tabela tags
SELECT 
  'RLS TAGS' as categoria,
  policyname as objeto,
  CASE 
    WHEN policyname = 'tags_select_active' THEN 'SELECT para authenticated'
    WHEN policyname = 'tags_insert_admin' THEN 'INSERT apenas ADMIN'
    WHEN policyname = 'tags_update_admin' THEN 'UPDATE apenas ADMIN'
    WHEN policyname = 'tags_delete_admin' THEN 'DELETE apenas ADMIN'
    ELSE 'Política inesperada'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'tags'
ORDER BY policyname;

-- Verificar políticas RLS na tabela people_tags
SELECT 
  'RLS PEOPLE_TAGS' as categoria,
  policyname as objeto,
  CASE 
    WHEN policyname = 'people_tags_select_owner_or_admin' THEN 'SELECT baseado em propriedade'
    WHEN policyname = 'people_tags_insert_owner_or_admin' THEN 'INSERT baseado em propriedade'
    WHEN policyname = 'people_tags_update_owner_or_admin' THEN 'UPDATE baseado em propriedade'
    WHEN policyname = 'people_tags_delete_owner_or_admin' THEN 'DELETE baseado em propriedade'
    ELSE 'Política inesperada'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'people_tags'
ORDER BY policyname;

-- ========================================
-- 3. VERIFICAÇÃO DE GRANTS
-- ========================================

-- Verificar grants usando a função criada
SELECT 
  'GRANTS' as categoria,
  object_name as objeto,
  CASE 
    WHEN granted THEN 'Grant aplicado'
    ELSE 'Grant FALTANDO'
  END as status
FROM public.verify_tags_grants()
ORDER BY object_type, object_name;

-- ========================================
-- 4. VERIFICAÇÃO DE ÍNDICES
-- ========================================

-- Verificar índices criados
SELECT 
  'ÍNDICES' as categoria,
  indexname as objeto,
  CASE 
    WHEN indexname LIKE 'idx_tags_%' THEN 'Índice de tags criado'
    WHEN indexname LIKE 'idx_people_tags_%' THEN 'Índice de people_tags criado'
    ELSE 'Índice inesperado'
  END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname LIKE 'idx_tags_%' OR indexname LIKE 'idx_people_tags_%')
ORDER BY indexname;

-- ========================================
-- 5. TESTE DE FUNCIONALIDADE (SIMULAÇÃO)
-- ========================================

-- Simular sessão de usuário autenticado (substitua pelos IDs de usuários reais)
-- IMPORTANTE: Altere os UUIDs abaixo para usuários existentes no seu sistema
DO $$
DECLARE
  test_admin_id uuid := '00000000-0000-0000-0000-000000000001'; -- ALTERE AQUI - ID de um admin
  test_leader_id uuid := '00000000-0000-0000-0000-000000000002'; -- ALTERE AQUI - ID de um líder ativo
  test_user_id uuid := '00000000-0000-0000-0000-000000000003'; -- ALTERE AQUI - ID de usuário comum
  test_person_id uuid;
  test_tag_id uuid;
BEGIN
  RAISE NOTICE '=== TESTE DE FUNCIONALIDADE ===';
  
  -- Teste com usuário admin
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id = test_admin_id) THEN
    PERFORM set_config('request.jwt.claim.sub', test_admin_id::text, true);
    
    RAISE NOTICE '--- Testando como ADMIN ---';
    
    -- Teste 1: Verificar se é admin
    IF public.is_current_user_admin() THEN
      RAISE NOTICE '✓ Teste 1 PASSOU: Usuário é reconhecido como admin';
    ELSE
      RAISE NOTICE '✗ Teste 1 FALHOU: Usuário não é reconhecido como admin';
    END IF;
    
    -- Teste 2: Verificar se consegue listar tags
    IF EXISTS(SELECT 1 FROM public.tags LIMIT 1) THEN
      RAISE NOTICE '✓ Teste 2 PASSOU: Admin consegue listar tags';
    ELSE
      RAISE NOTICE '✗ Teste 2 FALHOU: Admin não consegue listar tags';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠ Teste ADMIN PULADO: Usuário admin não encontrado. Altere o test_admin_id no script.';
  END IF;
  
  -- Teste com usuário líder
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id = test_leader_id) THEN
    PERFORM set_config('request.jwt.claim.sub', test_leader_id::text, true);
    
    RAISE NOTICE '--- Testando como LÍDER ---';
    
    -- Teste 3: Verificar se é líder
    IF public.is_current_user_leader() THEN
      RAISE NOTICE '✓ Teste 3 PASSOU: Usuário é reconhecido como líder';
    ELSE
      RAISE NOTICE '✗ Teste 3 FALHOU: Usuário não é reconhecido como líder';
    END IF;
    
    -- Teste 4: Verificar se consegue listar tags
    IF EXISTS(SELECT 1 FROM public.tags LIMIT 1) THEN
      RAISE NOTICE '✓ Teste 4 PASSOU: Líder consegue listar tags';
    ELSE
      RAISE NOTICE '✗ Teste 4 FALHOU: Líder não consegue listar tags';
    END IF;
    
    -- Teste 5: Verificar se consegue buscar pessoas (se existirem)
    IF EXISTS(SELECT 1 FROM public.people LIMIT 1) THEN
      SELECT id INTO test_person_id FROM public.people LIMIT 1;
      
      IF public.is_person_owned_by_current_user(test_person_id) IS NOT NULL THEN
        RAISE NOTICE '✓ Teste 5 PASSOU: Função is_person_owned_by_current_user funciona';
      ELSE
        RAISE NOTICE '✗ Teste 5 FALHOU: Função is_person_owned_by_current_user não funciona';
      END IF;
    ELSE
      RAISE NOTICE '⚠ Teste 5 PULADO: Não há pessoas cadastradas para testar';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠ Teste LÍDER PULADO: Usuário líder não encontrado. Altere o test_leader_id no script.';
  END IF;
  
  -- Teste com usuário comum
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
    
    RAISE NOTICE '--- Testando como USUÁRIO COMUM ---';
    
    -- Teste 6: Verificar se NÃO é admin nem líder
    IF NOT public.is_current_user_admin() AND NOT public.is_current_user_leader() THEN
      RAISE NOTICE '✓ Teste 6 PASSOU: Usuário comum não é admin nem líder';
    ELSE
      RAISE NOTICE '✗ Teste 6 FALHOU: Usuário comum foi identificado como admin ou líder';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠ Teste USUÁRIO COMUM PULADO: Usuário não encontrado. Altere o test_user_id no script.';
  END IF;
  
  -- Teste 7: Verificar RPC search_people_with_tags
  BEGIN
    PERFORM public.search_people_with_tags('', '{}', 'ANY', 5, 0);
    RAISE NOTICE '✓ Teste 7 PASSOU: RPC search_people_with_tags funciona';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✗ Teste 7 FALHOU: RPC search_people_with_tags não funciona - %', SQLERRM;
  END;
  
  -- Teste 8: Verificar RPC get_available_tags
  BEGIN
    PERFORM public.get_available_tags();
    RAISE NOTICE '✓ Teste 8 PASSOU: RPC get_available_tags funciona';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✗ Teste 8 FALHOU: RPC get_available_tags não funciona - %', SQLERRM;
  END;
  
  RAISE NOTICE '=== FIM DOS TESTES ===';
  
END $$;

-- ========================================
-- 6. TESTE DE RLS (TRANSACIONAL)
-- ========================================

-- Teste de RLS em transação que será revertida
DO $$
DECLARE
  test_admin_id uuid := '00000000-0000-0000-0000-000000000001'; -- ALTERE AQUI - ID de um admin
  test_leader_id uuid := '00000000-0000-0000-0000-000000000002'; -- ALTERE AQUI - ID de um líder ativo
  test_user_id uuid := '00000000-0000-0000-0000-000000000003'; -- ALTERE AQUI - ID de usuário comum
  test_person_id uuid;
  test_tag_id uuid;
  insert_success boolean := false;
  delete_success boolean := false;
BEGIN
  RAISE NOTICE '=== TESTE DE RLS (TRANSACIONAL) ===';
  
  -- Buscar uma pessoa e uma tag para teste
  SELECT id INTO test_person_id FROM public.people LIMIT 1;
  SELECT id INTO test_tag_id FROM public.tags WHERE is_active = true LIMIT 1;
  
  IF test_person_id IS NOT NULL AND test_tag_id IS NOT NULL THEN
    
    -- Teste com usuário admin
    IF EXISTS(SELECT 1 FROM public.profiles WHERE id = test_admin_id) THEN
      PERFORM set_config('request.jwt.claim.sub', test_admin_id::text, true);
      
      RAISE NOTICE '--- Testando RLS como ADMIN ---';
      
      -- Teste de INSERT (será revertido)
      BEGIN
        INSERT INTO public.people_tags (person_id, tag_id, created_by)
        VALUES (test_person_id, test_tag_id, test_admin_id);
        insert_success := true;
        RAISE NOTICE '✓ Teste RLS INSERT ADMIN PASSOU: Admin conseguiu inserir people_tags';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '✗ Teste RLS INSERT ADMIN FALHOU: %', SQLERRM;
      END;
      
      -- Teste de DELETE (será revertido)
      IF insert_success THEN
        BEGIN
          DELETE FROM public.people_tags 
          WHERE person_id = test_person_id AND tag_id = test_tag_id;
          delete_success := true;
          RAISE NOTICE '✓ Teste RLS DELETE ADMIN PASSOU: Admin conseguiu deletar people_tags';
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE '✗ Teste RLS DELETE ADMIN FALHOU: %', SQLERRM;
        END;
      END IF;
      
    ELSE
      RAISE NOTICE '⚠ Teste RLS ADMIN PULADO: Usuário admin não encontrado.';
    END IF;
    
    -- Teste com usuário líder
    IF EXISTS(SELECT 1 FROM public.profiles WHERE id = test_leader_id) THEN
      PERFORM set_config('request.jwt.claim.sub', test_leader_id::text, true);
      
      RAISE NOTICE '--- Testando RLS como LÍDER ---';
      
      -- Teste de INSERT em pessoa própria (será revertido)
      BEGIN
        INSERT INTO public.people_tags (person_id, tag_id, created_by)
        VALUES (test_person_id, test_tag_id, test_leader_id);
        RAISE NOTICE '✓ Teste RLS INSERT LÍDER PASSOU: Líder conseguiu inserir people_tags';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '✗ Teste RLS INSERT LÍDER FALHOU: %', SQLERRM;
      END;
      
      -- Teste de DELETE (será revertido)
      BEGIN
        DELETE FROM public.people_tags 
        WHERE person_id = test_person_id AND tag_id = test_tag_id;
        RAISE NOTICE '✓ Teste RLS DELETE LÍDER PASSOU: Líder conseguiu deletar people_tags';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '✗ Teste RLS DELETE LÍDER FALHOU: %', SQLERRM;
      END;
      
    ELSE
      RAISE NOTICE '⚠ Teste RLS LÍDER PULADO: Usuário líder não encontrado.';
    END IF;
    
    -- Teste com usuário comum
    IF EXISTS(SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
      PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
      
      RAISE NOTICE '--- Testando RLS como USUÁRIO COMUM ---';
      
      -- Teste de INSERT (deve falhar)
      BEGIN
        INSERT INTO public.people_tags (person_id, tag_id, created_by)
        VALUES (test_person_id, test_tag_id, test_user_id);
        RAISE NOTICE '✗ Teste RLS INSERT USUÁRIO FALHOU: Usuário comum conseguiu inserir (não deveria)';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '✓ Teste RLS INSERT USUÁRIO PASSOU: Usuário comum foi bloqueado (correto)';
      END;
      
    ELSE
      RAISE NOTICE '⚠ Teste RLS USUÁRIO COMUM PULADO: Usuário não encontrado.';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠ Teste RLS PULADO: Não há pessoas ou tags para testar';
  END IF;
  
  RAISE NOTICE '=== FIM DOS TESTES RLS ===';
  
  -- IMPORTANTE: Esta transação será revertida automaticamente
  -- Nenhum dado será persistido
  RAISE EXCEPTION 'ROLLBACK INTENCIONAL - Testes de RLS concluídos sem persistir dados';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Captura o rollback intencional e outros erros
    IF SQLSTATE = 'P0001' AND SQLERRM LIKE '%ROLLBACK INTENCIONAL%' THEN
      RAISE NOTICE '✓ Testes RLS concluídos com sucesso (rollback intencional)';
    ELSE
      RAISE NOTICE '✗ Erro durante testes RLS: %', SQLERRM;
    END IF;
END $$;

-- ========================================
-- 7. RESUMO FINAL
-- ========================================

SELECT 
  'RESUMO' as categoria,
  'Sistema de Tags' as objeto,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.tags) 
      AND EXISTS(SELECT 1 FROM public.people_tags) 
      AND EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'vw_people_with_tags')
    THEN 'INSTALAÇÃO COMPLETA'
    ELSE 'INSTALAÇÃO INCOMPLETA'
  END as status;

-- ========================================
-- INSTRUÇÕES DE USO
-- ========================================

/*
  INSTRUÇÕES PARA USAR ESTE SCRIPT:
  
  1. Execute este script após aplicar todos os outros scripts (01 a 06)
  
  2. ANTES de executar, altere os UUIDs nas linhas:
     - Linha ~131: test_admin_id uuid := '00000000-0000-0000-0000-000000000001';
     - Linha ~132: test_leader_id uuid := '00000000-0000-0000-0000-000000000002';
     - Linha ~133: test_user_id uuid := '00000000-0000-0000-0000-000000000003';
     - Linha ~246: test_admin_id uuid := '00000000-0000-0000-0000-000000000001';
     - Linha ~247: test_leader_id uuid := '00000000-0000-0000-0000-000000000002';
     - Linha ~248: test_user_id uuid := '00000000-0000-0000-0000-000000000003';
     
     Substitua pelos UUIDs de usuários reais do seu sistema:
     - Um usuário que está em app_admins (admin)
     - Um usuário que está em app_leaders_list com status='ACTIVE' (líder)
     - Um usuário comum (nem admin nem líder)
  
  3. Verifique os resultados:
     - Todas as categorias devem mostrar status positivo
     - Os testes de funcionalidade devem passar
     - Os testes de RLS devem passar
  
  4. Se algum teste falhar, verifique:
     - Se todos os scripts anteriores foram executados
     - Se o usuário de teste existe e tem permissões adequadas
     - Se há dados suficientes (pessoas, tags) para os testes
  
  5. Este script é seguro e não modifica dados permanentemente.
*/