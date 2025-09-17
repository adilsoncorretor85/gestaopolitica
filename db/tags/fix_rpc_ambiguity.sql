-- ========================================
-- CORREÇÃO: Ambiguidade na função search_people_with_tags
-- ========================================

-- Recriar a função com aliases corretos para evitar ambiguidade
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
STABLE
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

  -- Retorna os dados paginados
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
    -- Tags da pessoa
    COALESCE(
      json_agg(
        json_build_object(
          'id', t.id,
          'name', t.name,
          'color', t.color,
          'description', t.description,
          'is_sensitive', t.is_sensitive,
          'applied_at', pt.created_at
        ) ORDER BY t.name
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::json
    ) as tags,
    total_records
  FROM public.people p
  LEFT JOIN public.people_tags pt ON p.id = pt.person_id
  LEFT JOIN public.tags t ON pt.tag_id = t.id AND t.is_active = true
  WHERE 
    -- Filtro de texto
    (q = '' OR (
      p.full_name ILIKE '%' || q || '%' OR
      p.whatsapp ILIKE '%' || q || '%' OR
      p.email ILIKE '%' || q || '%'
    ))
    -- Filtro de tags
    AND (
      array_length(tag_ids, 1) IS NULL OR
      p.id IN (
        SELECT pt_filter.person_id
        FROM public.people_tags pt_filter
        JOIN public.tags t_filter ON pt_filter.tag_id = t_filter.id
        WHERE pt_filter.tag_id = ANY(tag_ids)
          AND t_filter.is_active = true
          AND public.can_access_sensitive_tag(t_filter.id)
        GROUP BY pt_filter.person_id
        HAVING 
          CASE 
            WHEN mode = 'ALL' THEN COUNT(DISTINCT pt_filter.tag_id) = array_length(tag_ids, 1)
            ELSE COUNT(DISTINCT pt_filter.tag_id) > 0
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
    )
  GROUP BY p.id, p.owner_id, p.full_name, p.whatsapp, p.email, p.city, p.state, p.vote_status, p.created_at, p.updated_at, total_records
  ORDER BY p.full_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.search_people_with_tags TO authenticated;

-- Comentário de correção
COMMENT ON FUNCTION public.search_people_with_tags IS 'Correção de ambiguidade: aliases únicos para todas as subconsultas';
