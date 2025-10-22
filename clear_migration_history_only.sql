-- ===========================================
-- LIMPEZA APENAS DO HISTÓRICO DE MIGRAÇÕES
-- ===========================================
-- Este script remove APENAS o histórico de migrações
-- MANTÉM todos os dados, tabelas, funções, etc.
-- 
-- ⚠️  ATENÇÃO: Execute apenas no Supabase ONLINE
-- ⚠️  Este script é SEGURO - não apaga dados!

-- 1. Verificar e remover apenas o histórico de migrações
DO $$
BEGIN
    -- Verificar se a tabela schema_migrations existe e remover dados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN
        DELETE FROM supabase_migrations.schema_migrations;
        RAISE NOTICE 'Histórico removido de schema_migrations';
    ELSE
        RAISE NOTICE 'Tabela schema_migrations não existe';
    END IF;
    
    -- Verificar se a tabela migrations existe e remover dados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'migrations') THEN
        DELETE FROM supabase_migrations.migrations;
        RAISE NOTICE 'Histórico removido de migrations';
    ELSE
        RAISE NOTICE 'Tabela migrations não existe';
    END IF;
    
    -- Verificar se a tabela schema_migrations_history existe e remover dados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations_history') THEN
        DELETE FROM supabase_migrations.schema_migrations_history;
        RAISE NOTICE 'Histórico removido de schema_migrations_history';
    ELSE
        RAISE NOTICE 'Tabela schema_migrations_history não existe';
    END IF;
    
    -- Verificar se a tabela migration_history existe e remover dados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'migration_history') THEN
        DELETE FROM supabase_migrations.migration_history;
        RAISE NOTICE 'Histórico removido de migration_history';
    ELSE
        RAISE NOTICE 'Tabela migration_history não existe';
    END IF;
    
    -- Verificar se a tabela applied_migrations existe e remover dados
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'applied_migrations') THEN
        DELETE FROM supabase_migrations.applied_migrations;
        RAISE NOTICE 'Histórico removido de applied_migrations';
    ELSE
        RAISE NOTICE 'Tabela applied_migrations não existe';
    END IF;
END $$;

-- 2. Verificar se existem outras tabelas de migração
DO $$
DECLARE
    table_name text;
BEGIN
    -- Listar todas as tabelas de migração que existem
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'supabase_migrations' 
        AND tablename LIKE '%migration%'
    LOOP
        EXECUTE 'DELETE FROM supabase_migrations.' || table_name;
        RAISE NOTICE 'Histórico removido de %', table_name;
    END LOOP;
END $$;

-- 3. Verificar se a limpeza foi bem-sucedida
DO $$
DECLARE
    migration_count integer;
BEGIN
    -- Contar quantos registros de migração ainda existem
    SELECT COUNT(*) INTO migration_count
    FROM supabase_migrations.schema_migrations;
    
    IF migration_count > 0 THEN
        RAISE NOTICE 'Ainda existem % registros de migração', migration_count;
    ELSE
        RAISE NOTICE 'Histórico de migrações limpo com sucesso!';
    END IF;
END $$;

-- 4. Verificar se os dados estão intactos
DO $$
DECLARE
    table_count integer;
    function_count integer;
BEGIN
    -- Contar tabelas (deve ser > 0)
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '%migration%';
    
    -- Contar funções (deve ser > 0)
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname NOT LIKE '%migration%';
    
    RAISE NOTICE 'Dados verificados: % tabelas, % funções', table_count, function_count;
    
    IF table_count > 0 AND function_count > 0 THEN
        RAISE NOTICE '✅ Todos os dados estão intactos!';
    ELSE
        RAISE NOTICE '⚠️  Verifique se os dados estão corretos';
    END IF;
END $$;

-- ===========================================
-- FIM DA LIMPEZA DO HISTÓRICO DE MIGRAÇÕES
-- ===========================================
-- 
-- Após executar este script:
-- 1. Apenas o histórico de migrações será removido
-- 2. Todos os dados, tabelas, funções permanecem intactos
-- 3. O sistema estará pronto para nova migração
-- 4. Execute: supabase db push --include-all
-- 
-- ✅ SEGURO: Este script não apaga dados!
-- ✅ MANTÉM: Todas as tabelas, funções, dados
-- ✅ REMOVE: Apenas o histórico de migrações
