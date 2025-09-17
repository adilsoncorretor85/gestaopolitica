-- RPCs e Views para sistema de tags
-- Versão final funcional - aplicada e testada

-- ========================================
-- RPC PRINCIPAL: search_people_with_tags
-- ========================================

CREATE OR REPLACE FUNCTION public.search_people_with_tags(
  q text DEFAULT '',
  tag_ids uuid[] DEFAULT '{}',
  mode text DEFAULT 'ANY',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  owner_id uuid,
  full_name text,
  whatsapp text,
  email text,
  city text,
  state text,
  vote_status text,
  created_at timestamptz,
  updated_at timestamptz,
  tags jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_records bigint;
BEGIN
  -- Conta total de registros (para paginação)
  SELECT COUNT(DISTINCT p.id) INTO total_records
  FROM public.people p
  WHERE 
    -- Filtro de texto (busca em nome, whatsapp, email)
    (q = '' OR (
      p.full_name ILIKE '%' || q || '%' OR
      p.whatsapp ILIKE '%' || q || '%' OR
      p.email ILIKE '%' || q || '%'
    ))
    -- Filtro de tags
    AND (
      array_length(tag_ids, 1) IS NULL OR
      p.id IN (
        SELECT pt_count.person_id
        FROM public.people_tags pt_count
        JOIN public.tags t_count ON pt_count.tag_id = t_count.id
        WHERE pt_count.tag_id = ANY(tag_ids)
          AND t_count.is_active = true
          AND public.can_access_sensitive_tag(t_count.id)
        GROUP BY pt_count.person_id
        HAVING 
          CASE 
            WHEN mode = 'ALL' THEN COUNT(DISTINCT pt_count.tag_id) = array_length(tag_ids, 1)
            ELSE COUNT(DISTINCT pt_count.tag_id) > 0
          END
      )
    )
    -- Verificação de acesso: admin pode ver todas, líder apenas suas pessoas
    AND (
      public.is_current_user_admin()
      OR (
        public.is_current_user_leader() 
        AND p.owner_id = auth.uid()
      )
    );

  -- Retorna os registros paginados com tags agregadas
  RETURN QUERY
  SELECT 
    p.id,
    p.owner_id,
    p.full_name,
    p.whatsapp,
    p.email,
    p.city,
    p.state,
    p.vote_status,
    p.created_at,
    p.updated_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', t_filter.id,
            'name', t_filter.name,
            'description', COALESCE(t_filter.description, ''),
            'color', COALESCE(t_filter.color, '#808080'),
            'is_sensitive', COALESCE(t_filter.is_sensitive, false),
            'applied_at', pt_filter.created_at
          ) ORDER BY t_filter.name
        )::jsonb
        FROM public.people_tags pt_filter
        JOIN public.tags t_filter ON pt_filter.tag_id = t_filter.id
        WHERE pt_filter.person_id = p.id
          AND t_filter.is_active = true
          AND public.can_access_sensitive_tag(t_filter.id)
      ),
      '[]'::jsonb
    ) as tags,
    total_records as total_count
  FROM public.people p
  WHERE 
    -- Repetir os mesmos filtros da contagem
    (q = '' OR (
      p.full_name ILIKE '%' || q || '%' OR
      p.whatsapp ILIKE '%' || q || '%' OR
      p.email ILIKE '%' || q || '%'
    ))
    AND (
      array_length(tag_ids, 1) IS NULL OR
      p.id IN (
        SELECT pt_filter2.person_id
        FROM public.people_tags pt_filter2
        JOIN public.tags t_filter2 ON pt_filter2.tag_id = t_filter2.id
        WHERE pt_filter2.tag_id = ANY(tag_ids)
          AND t_filter2.is_active = true
          AND public.can_access_sensitive_tag(t_filter2.id)
        GROUP BY pt_filter2.person_id
        HAVING 
          CASE 
            WHEN mode = 'ALL' THEN COUNT(DISTINCT pt_filter2.tag_id) = array_length(tag_ids, 1)
            ELSE COUNT(DISTINCT pt_filter2.tag_id) > 0
          END
      )
    )
    AND (
      public.is_current_user_admin()
      OR (
        public.is_current_user_leader() 
        AND p.owner_id = auth.uid()
      )
    )
  ORDER BY p.full_name
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ========================================
-- VIEW: vw_people_with_tags
-- ========================================

CREATE OR REPLACE VIEW public.vw_people_with_tags AS
SELECT 
  p.id,
  p.owner_id,
  p.full_name,
  p.whatsapp,
  p.email,
  p.city,
  p.state,
  p.vote_status,
  p.created_at,
  p.updated_at,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'description', COALESCE(t.description, ''),
          'color', COALESCE(t.color, '#808080'),
          'is_sensitive', COALESCE(t.is_sensitive, false),
          'applied_at', pt.created_at
        ) ORDER BY t.name
      )
      FROM public.people_tags pt
      JOIN public.tags t ON pt.tag_id = t.id
      WHERE pt.person_id = p.id
        AND t.is_active = true
    ),
    '[]'::json
  ) as tags,
  (
    SELECT COUNT(*)
    FROM public.people_tags pt2
    JOIN public.tags t2 ON pt2.tag_id = t2.id
    WHERE pt2.person_id = p.id
      AND t2.is_active = true
  ) as tag_count
FROM public.people p;

-- ========================================
-- RPCS AUXILIARES
-- ========================================

-- RPC para verificar seeds das tags
CREATE OR REPLACE FUNCTION public.check_tags_seeds()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_tags INTEGER;
  active_tags INTEGER;
  sensitive_tags INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tags FROM public.tags;
  SELECT COUNT(*) INTO active_tags FROM public.tags WHERE is_active = true;
  SELECT COUNT(*) INTO sensitive_tags FROM public.tags WHERE is_sensitive = true;
  
  RETURN jsonb_build_object(
    'total_tags', total_tags,
    'active_tags', active_tags,
    'sensitive_tags', sensitive_tags,
    'seeds_applied', total_tags > 0
  );
END;
$$;

-- RPC para verificar grants
CREATE OR REPLACE FUNCTION public.verify_tags_grants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grants_info jsonb := '[]'::jsonb;
  rec RECORD;
BEGIN
  -- Verificar grants nas tabelas
  FOR rec IN 
    SELECT 
      schemaname,
      tablename,
      grantee,
      privilege_type
    FROM information_schema.table_privileges 
    WHERE schemaname = 'public' 
    AND tablename IN ('tags', 'people_tags')
    AND grantee = 'authenticated'
  LOOP
    grants_info := grants_info || jsonb_build_object(
      'type', 'table',
      'object', rec.schemaname || '.' || rec.tablename,
      'grantee', rec.grantee,
      'privilege', rec.privilege_type
    );
  END LOOP;
  
  -- Verificar grants nas funções
  FOR rec IN 
    SELECT 
      routine_schema,
      routine_name,
      grantee,
      privilege_type
    FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' 
    AND routine_name LIKE '%tag%'
    AND grantee = 'authenticated'
  LOOP
    grants_info := grants_info || jsonb_build_object(
      'type', 'function',
      'object', rec.routine_schema || '.' || rec.routine_name,
      'grantee', rec.grantee,
      'privilege', rec.privilege_type
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'grants', grants_info,
    'total_grants', jsonb_array_length(grants_info)
  );
END;
$$;

-- ========================================
-- COMENTÁRIOS
-- ========================================

COMMENT ON FUNCTION public.search_people_with_tags IS 'Busca pessoas com filtro por tags - suporta modo ANY/ALL e RLS';
COMMENT ON VIEW public.vw_people_with_tags IS 'View com pessoas e suas tags agregadas - respeitando RLS';
COMMENT ON FUNCTION public.check_tags_seeds IS 'Verifica se as seeds de tags foram aplicadas';
COMMENT ON FUNCTION public.verify_tags_grants IS 'Verifica grants de tabelas e funções relacionadas a tags';