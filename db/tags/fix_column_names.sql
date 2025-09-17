-- Correção para consultas com nomes de colunas incorretos
-- Execute este script se houver erros relacionados a "column does not exist"

-- ========================================
-- TESTE DE SINTAXE DAS VIEWS
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Testando sintaxe das views do information_schema...';
  
  -- Verificar se as colunas existem nas views
  PERFORM 1 FROM information_schema.table_privileges 
  WHERE table_schema = 'public' LIMIT 1;
  
  PERFORM 1 FROM information_schema.routine_privileges 
  WHERE routine_schema = 'public' LIMIT 1;
  
  PERFORM 1 FROM pg_policies 
  WHERE schemaname = 'public' LIMIT 1;
  
  RAISE NOTICE 'Todas as views estão acessíveis!';
END $$;

-- ========================================
-- VERIFICAÇÃO DE GRANTS (VERSÃO CORRIGIDA)
-- ========================================

SELECT 
  'table_privileges' as view_name,
  COUNT(*) as count
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name IN ('tags', 'people_tags')
  AND grantee = 'authenticated'

UNION ALL

SELECT 
  'routine_privileges' as view_name,
  COUNT(*) as count
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%tag%'
  AND grantee = 'authenticated'

UNION ALL

SELECT 
  'pg_policies' as view_name,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tags', 'people_tags');
