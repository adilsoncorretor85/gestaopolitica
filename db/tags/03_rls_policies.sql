-- Políticas RLS para sistema de tags
-- Versão final funcional - aplicada e testada

-- Habilitar RLS nas tabelas
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_tags ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICAS PARA TABELA TAGS
-- ========================================

-- Política para SELECT: apenas tags ativas (simplificada)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tags' AND policyname='tags_select_active') THEN
    DROP POLICY tags_select_active ON public.tags;
  END IF;
  
  CREATE POLICY tags_select_active ON public.tags 
    FOR SELECT TO authenticated 
    USING (is_active = true);
END $$;

-- Política para INSERT: apenas admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tags' AND policyname='tags_insert_admin') THEN
    DROP POLICY tags_insert_admin ON public.tags;
  END IF;
  
  CREATE POLICY tags_insert_admin ON public.tags 
    FOR INSERT TO authenticated 
    WITH CHECK (is_current_user_admin());
END $$;

-- Política para UPDATE: apenas admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tags' AND policyname='tags_update_admin') THEN
    DROP POLICY tags_update_admin ON public.tags;
  END IF;
  
  CREATE POLICY tags_update_admin ON public.tags 
    FOR UPDATE TO authenticated 
    USING (is_current_user_admin()) 
    WITH CHECK (is_current_user_admin());
END $$;

-- Política para DELETE: apenas admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tags' AND policyname='tags_delete_admin') THEN
    DROP POLICY tags_delete_admin ON public.tags;
  END IF;
  
  CREATE POLICY tags_delete_admin ON public.tags 
    FOR DELETE TO authenticated 
    USING (is_current_user_admin());
END $$;

-- ========================================
-- POLÍTICAS PARA TABELA PEOPLE_TAGS
-- ========================================

-- Política para SELECT: admin ou líder que possui a pessoa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='people_tags' AND policyname='people_tags_select_owner_or_admin') THEN
    DROP POLICY people_tags_select_owner_or_admin ON public.people_tags;
  END IF;
  
  CREATE POLICY people_tags_select_owner_or_admin ON public.people_tags 
    FOR SELECT TO authenticated 
    USING (
      is_current_user_admin() 
      OR (
        is_current_user_leader() 
        AND is_person_owned_by_current_user(person_id)
      )
    );
END $$;

-- Política para INSERT: admin ou líder que possui a pessoa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='people_tags' AND policyname='people_tags_insert_owner_or_admin') THEN
    DROP POLICY people_tags_insert_owner_or_admin ON public.people_tags;
  END IF;
  
  CREATE POLICY people_tags_insert_owner_or_admin ON public.people_tags 
    FOR INSERT TO authenticated 
    WITH CHECK (
      is_current_user_admin() 
      OR (
        is_current_user_leader() 
        AND is_person_owned_by_current_user(person_id)
      )
    );
END $$;

-- Política para UPDATE: admin ou líder que possui a pessoa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='people_tags' AND policyname='people_tags_update_owner_or_admin') THEN
    DROP POLICY people_tags_update_owner_or_admin ON public.people_tags;
  END IF;
  
  CREATE POLICY people_tags_update_owner_or_admin ON public.people_tags 
    FOR UPDATE TO authenticated 
    USING (
      is_current_user_admin() 
      OR (
        is_current_user_leader() 
        AND is_person_owned_by_current_user(person_id)
      )
    ) 
    WITH CHECK (
      is_current_user_admin() 
      OR (
        is_current_user_leader() 
        AND is_person_owned_by_current_user(person_id)
      )
    );
END $$;

-- Política para DELETE: admin ou líder que possui a pessoa
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='people_tags' AND policyname='people_tags_delete_owner_or_admin') THEN
    DROP POLICY people_tags_delete_owner_or_admin ON public.people_tags;
  END IF;
  
  CREATE POLICY people_tags_delete_owner_or_admin ON public.people_tags 
    FOR DELETE TO authenticated 
    USING (
      is_current_user_admin() 
      OR (
        is_current_user_leader() 
        AND is_person_owned_by_current_user(person_id)
      )
    );
END $$;

-- ========================================
-- POLÍTICA OPCIONAL PARA TAGS SENSÍVEIS
-- ========================================
-- Esta política está documentada mas não ativada por padrão
-- Para ativar, descomente o bloco abaixo:

/*
-- Política adicional para restringir acesso a tags sensíveis
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tags' AND policyname='tags_select_sensitive_admin_only') THEN
    DROP POLICY tags_select_sensitive_admin_only ON public.tags;
  END IF;
  
  CREATE POLICY tags_select_sensitive_admin_only ON public.tags 
    FOR SELECT TO authenticated 
    USING (
      is_active = true 
      AND (
        is_sensitive = false 
        OR is_current_user_admin()
      )
    );
    
  -- Importante: Esta política substitui a tags_select_active
  -- Se ativada, remova a política tags_select_active primeiro
END $$;
*/

-- Comentários sobre as políticas
COMMENT ON TABLE public.tags IS 'RLS: SELECT para authenticated (apenas is_active=true), CRUD apenas para admin';
COMMENT ON TABLE public.people_tags IS 'RLS: Todas operações requerem ser admin OU (líder E dono da pessoa)';

-- Verificação das políticas criadas
DO $$
DECLARE
  tags_policies_count INTEGER;
  people_tags_policies_count INTEGER;
BEGIN
  -- Contar políticas da tabela tags
  SELECT COUNT(*) INTO tags_policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'tags';
  
  -- Contar políticas da tabela people_tags
  SELECT COUNT(*) INTO people_tags_policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'people_tags';
  
  -- Log das políticas criadas
  RAISE NOTICE 'Políticas RLS aplicadas:';
  RAISE NOTICE '- tags: % políticas', tags_policies_count;
  RAISE NOTICE '- people_tags: % políticas', people_tags_policies_count;
  
  -- Verificar se todas as políticas esperadas foram criadas
  IF tags_policies_count < 4 THEN
    RAISE WARNING 'Esperadas 4 políticas para tags, encontradas %', tags_policies_count;
  END IF;
  
  IF people_tags_policies_count < 4 THEN
    RAISE WARNING 'Esperadas 4 políticas para people_tags, encontradas %', people_tags_policies_count;
  END IF;
END $$;