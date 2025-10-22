-- ===========================================
-- LIMPEZA COMPLETA DE MIGRAÇÕES - SUPABASE ONLINE
-- ===========================================
-- Este script remove TODAS as migrações do Supabase online
-- para permitir criar uma migração 100% nova
-- 
-- ⚠️  ATENÇÃO: Este script é DESTRUTIVO!
-- ⚠️  Execute apenas no Supabase ONLINE
-- ⚠️  Faça backup antes de executar!

-- 1. Remover todas as migrações da tabela supabase_migrations
DELETE FROM supabase_migrations.schema_migrations;

-- 2. Remover todas as migrações da tabela supabase_migrations (se existir)
DELETE FROM supabase_migrations.migrations;

-- 3. Remover todas as migrações da tabela supabase_migrations (versão mais recente)
DELETE FROM supabase_migrations.schema_migrations_history;

-- 4. Limpar tabela de migrações (múltiplas possibilidades)
DO $$
BEGIN
    -- Tentar remover de diferentes tabelas de migração
    BEGIN
        DELETE FROM supabase_migrations.schema_migrations;
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
    
    BEGIN
        DELETE FROM supabase_migrations.migrations;
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
    
    BEGIN
        DELETE FROM supabase_migrations.schema_migrations_history;
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
    
    BEGIN
        DELETE FROM supabase_migrations.migration_history;
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
    
    BEGIN
        DELETE FROM supabase_migrations.applied_migrations;
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
END $$;

-- 5. Remover todas as funções relacionadas a migrações
DROP FUNCTION IF EXISTS supabase_migrations.apply_migration(text, text);
DROP FUNCTION IF EXISTS supabase_migrations.rollback_migration(text);
DROP FUNCTION IF EXISTS supabase_migrations.get_migration_history();

-- 6. Remover todas as tabelas de migração (se existirem)
DROP TABLE IF EXISTS supabase_migrations.schema_migrations CASCADE;
DROP TABLE IF EXISTS supabase_migrations.migrations CASCADE;
DROP TABLE IF EXISTS supabase_migrations.schema_migrations_history CASCADE;
DROP TABLE IF EXISTS supabase_migrations.migration_history CASCADE;
DROP TABLE IF EXISTS supabase_migrations.applied_migrations CASCADE;

-- 7. Remover schema de migrações (se existir)
DROP SCHEMA IF EXISTS supabase_migrations CASCADE;

-- 8. Limpar cache de migrações
DO $$
BEGIN
    -- Tentar limpar cache de migrações
    BEGIN
        DELETE FROM pg_stat_statements WHERE query LIKE '%supabase_migrations%';
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
END $$;

-- 9. Verificar se há outras tabelas de migração
DO $$
DECLARE
    table_name text;
BEGIN
    -- Listar todas as tabelas que podem conter migrações
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE '%migration%'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || table_name || ' CASCADE';
    END LOOP;
END $$;

-- 10. Limpar sequências relacionadas a migrações
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public' 
        AND sequencename LIKE '%migration%'
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || seq_name || ' CASCADE';
    END LOOP;
END $$;

-- 11. Limpar índices relacionados a migrações
DO $$
DECLARE
    index_name text;
BEGIN
    FOR index_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || index_name || ' CASCADE';
    END LOOP;
END $$;

-- 12. Limpar views relacionadas a migrações
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || view_name || ' CASCADE';
    END LOOP;
END $$;

-- 13. Limpar funções relacionadas a migrações
DO $$
DECLARE
    func_name text;
    func_signature text;
BEGIN
    FOR func_name, func_signature IN 
        SELECT proname, pg_get_function_identity_arguments(oid)
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND proname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_name || '(' || func_signature || ') CASCADE';
    END LOOP;
END $$;

-- 14. Limpar triggers relacionados a migrações
DO $$
DECLARE
    trigger_name text;
    table_name text;
BEGIN
    FOR trigger_name, table_name IN 
        SELECT tgname, tgrelid::regclass::text
        FROM pg_trigger 
        WHERE tgname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON ' || table_name || ' CASCADE';
    END LOOP;
END $$;

-- 15. Limpar políticas RLS relacionadas a migrações
DO $$
DECLARE
    policy_name text;
    table_name text;
BEGIN
    FOR policy_name, table_name IN 
        SELECT policyname, tablename
        FROM pg_policies 
        WHERE policyname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || policy_name || ' ON public.' || table_name || ' CASCADE';
    END LOOP;
END $$;

-- 16. Limpar extensões relacionadas a migrações
DROP EXTENSION IF EXISTS supabase_migrations CASCADE;

-- 17. Limpar tipos customizados relacionados a migrações
DO $$
DECLARE
    type_name text;
BEGIN
    FOR type_name IN 
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || type_name || ' CASCADE';
    END LOOP;
END $$;

-- 18. Limpar domínios relacionados a migrações
DO $$
DECLARE
    domain_name text;
BEGIN
    FOR domain_name IN 
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND typtype = 'd'
        AND typname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP DOMAIN IF EXISTS public.' || domain_name || ' CASCADE';
    END LOOP;
END $$;

-- 19. Limpar operadores relacionados a migrações
DO $$
DECLARE
    op_name text;
    op_left text;
    op_right text;
BEGIN
    FOR op_name, op_left, op_right IN 
        SELECT oprname, oprleft::regtype::text, oprright::regtype::text
        FROM pg_operator 
        WHERE oprnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND oprname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP OPERATOR IF EXISTS public.' || op_name || '(' || op_left || ', ' || op_right || ') CASCADE';
    END LOOP;
END $$;

-- 20. Limpar agregações relacionadas a migrações
DO $$
DECLARE
    agg_name text;
    agg_signature text;
BEGIN
    FOR agg_name, agg_signature IN 
        SELECT proname, pg_get_function_identity_arguments(oid)
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND prokind = 'a'
        AND proname LIKE '%migration%'
    LOOP
        EXECUTE 'DROP AGGREGATE IF EXISTS public.' || agg_name || '(' || agg_signature || ') CASCADE';
    END LOOP;
END $$;

-- 21. Limpar regras relacionadas a migrações
DO $$
DECLARE
    rule_name text;
    table_name text;
BEGIN
    FOR rule_name, table_name IN 
        SELECT rulename, tablename
        FROM pg_rules 
        WHERE rulename LIKE '%migration%'
    LOOP
        EXECUTE 'DROP RULE IF EXISTS ' || rule_name || ' ON public.' || table_name || ' CASCADE';
    END LOOP;
END $$;

-- 22. Limpar comentários relacionados a migrações
DO $$
DECLARE
    obj_name text;
    obj_type text;
BEGIN
    FOR obj_name, obj_type IN 
        SELECT obj_description(oid), objtype
        FROM pg_description 
        WHERE obj_description(oid) LIKE '%migration%'
    LOOP
        EXECUTE 'COMMENT ON ' || obj_type || ' ' || obj_name || ' IS NULL';
    END LOOP;
END $$;

-- 23. Limpar configurações relacionadas a migrações
DO $$
BEGIN
    -- Limpar configurações de sessão relacionadas a migrações
    SET search_path = 'public';
    RESET ALL;
END $$;

-- 24. Verificar se há outras referências a migrações
DO $$
DECLARE
    obj_name text;
    obj_type text;
BEGIN
    -- Listar objetos que ainda podem ter referências a migrações
    FOR obj_name, obj_type IN 
        SELECT 
            CASE 
                WHEN c.relkind = 'r' THEN 'TABLE ' || c.relname
                WHEN c.relkind = 'v' THEN 'VIEW ' || c.relname
                WHEN c.relkind = 'm' THEN 'MATERIALIZED VIEW ' || c.relname
                WHEN c.relkind = 'S' THEN 'SEQUENCE ' || c.relname
                WHEN c.relkind = 'f' THEN 'FOREIGN TABLE ' || c.relname
                ELSE 'OBJECT ' || c.relname
            END,
            c.relkind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname LIKE '%migration%'
    LOOP
        RAISE NOTICE 'Ainda existe: %', obj_name;
    END LOOP;
END $$;

-- 25. Limpar logs de migrações
DO $$
BEGIN
    -- Limpar logs do sistema relacionados a migrações
    BEGIN
        DELETE FROM pg_stat_statements WHERE query LIKE '%migration%';
    EXCEPTION WHEN undefined_table THEN
        -- Tabela não existe, continuar
    END;
END $$;

-- 26. Limpar cache de planos relacionados a migrações
DO $$
BEGIN
    -- Limpar cache de planos
    DISCARD PLANS;
    DISCARD SEQUENCES;
    DISCARD TEMPORARY;
END $$;

-- 27. Verificar se a limpeza foi bem-sucedida
DO $$
DECLARE
    migration_count integer;
BEGIN
    -- Contar quantas tabelas de migração ainda existem
    SELECT COUNT(*) INTO migration_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE '%migration%';
    
    IF migration_count > 0 THEN
        RAISE NOTICE 'Ainda existem % tabelas de migração', migration_count;
    ELSE
        RAISE NOTICE 'Limpeza de migrações concluída com sucesso!';
    END IF;
END $$;

-- 28. Finalizar limpeza
DO $$
BEGIN
    -- Limpar cache de funções
    DISCARD ALL;
    
    -- Resetar configurações
    RESET ALL;
    
    -- Definir search_path padrão
    SET search_path = 'public';
    
    RAISE NOTICE 'Sistema pronto para nova migração!';
END $$;

-- ===========================================
-- FIM DA LIMPEZA DE MIGRAÇÕES
-- ===========================================
-- 
-- Após executar este script:
-- 1. Todas as migrações serão removidas
-- 2. O sistema estará limpo para nova migração
-- 3. Você pode criar uma migração 100% nova
-- 4. Execute: supabase db push --include-all
-- 
-- ⚠️  LEMBRE-SE: Faça backup antes de executar!
-- ⚠️  Este script é DESTRUTIVO e não pode ser desfeito!



