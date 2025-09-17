-- Funções auxiliares para sistema de tags
-- Versão final funcional - aplicada e testada

-- Função para verificar se usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Verifica se existe o usuário na tabela app_admins
  RETURN EXISTS(
    SELECT 1 
    FROM public.app_admins 
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Função para verificar se usuário atual é líder ativo
CREATE OR REPLACE FUNCTION public.is_current_user_leader()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- IMPORTANTE: app_leaders_list é uma view Security Definer
  -- Verifica se o usuário é líder ativo
  RETURN EXISTS(
    SELECT 1 
    FROM public.app_leaders_list 
    WHERE id = auth.uid() 
    AND status = 'ACTIVE'
  );
END;
$$;

-- Função para verificar se pessoa pertence ao usuário atual
CREATE OR REPLACE FUNCTION public.is_person_owned_by_current_user(person_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Verifica se a pessoa tem owner_id igual ao usuário atual
  RETURN EXISTS(
    SELECT 1 
    FROM public.people p 
    WHERE p.id = person_id 
    AND p.owner_id = auth.uid()
  );
END;
$$;

-- Função para verificar acesso a tags sensíveis
CREATE OR REPLACE FUNCTION public.can_access_sensitive_tag(tag_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_tag_sensitive boolean;
BEGIN
  -- Busca se a tag é sensível
  SELECT is_sensitive INTO is_tag_sensitive
  FROM public.tags
  WHERE id = tag_id;
  
  -- Se não é sensível, todos podem acessar
  IF NOT COALESCE(is_tag_sensitive, false) THEN
    RETURN true;
  END IF;
  
  -- Se é sensível, apenas admins podem acessar
  RETURN public.is_current_user_admin();
END;
$$;

-- Função para obter tags de uma pessoa específica
CREATE OR REPLACE FUNCTION public.get_person_tags(
  person_id uuid  -- Nome original que o frontend espera
)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  color text,
  is_sensitive boolean,
  applied_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.name,
    COALESCE(t.description, '') as description,
    COALESCE(t.color, '#808080') as color,
    COALESCE(t.is_sensitive, false) as is_sensitive,
    pt.created_at as applied_at
  FROM public.people_tags pt
  JOIN public.tags t ON pt.tag_id = t.id
  WHERE pt.person_id = get_person_tags.person_id
    AND t.is_active = true
  ORDER BY t.name;
$$;

-- Função para aplicar tag a uma pessoa
CREATE OR REPLACE FUNCTION public.apply_tag_to_person(
  p_person_id uuid,  -- Mudar nome para evitar conflito
  p_tag_id uuid      -- Mudar nome para evitar conflito
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Aplica a tag com nomes sem conflito
  INSERT INTO public.people_tags (person_id, tag_id, created_by)
  VALUES (p_person_id, p_tag_id, auth.uid())
  ON CONFLICT (person_id, tag_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Tag aplicada com sucesso');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Função para remover tag de uma pessoa
CREATE OR REPLACE FUNCTION public.remove_tag_from_person(
  p_person_id uuid,  -- Mudar nome para evitar conflito
  p_tag_id uuid      -- Mudar nome para evitar conflito
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Remove a tag
  DELETE FROM public.people_tags 
  WHERE person_id = p_person_id 
    AND tag_id = p_tag_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  IF affected_rows > 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'Tag removida com sucesso');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tag não estava aplicada');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Função para buscar tags disponíveis (versão simplificada)
CREATE OR REPLACE FUNCTION public.get_available_tags()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  color text,
  is_sensitive boolean,
  usage_count bigint
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    COALESCE(t.description, '') as description,
    COALESCE(t.color, '#808080') as color,
    COALESCE(t.is_sensitive, false) as is_sensitive,
    0::bigint as usage_count
  FROM public.tags t
  WHERE t.is_active = true
  ORDER BY t.name;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.is_current_user_admin IS 'Verifica se usuário atual é admin (usa app_admins)';
COMMENT ON FUNCTION public.is_current_user_leader IS 'Verifica se usuário atual é líder ativo (usa app_leaders_list)';
COMMENT ON FUNCTION public.is_person_owned_by_current_user IS 'Verifica se pessoa pertence ao usuário atual (people.owner_id)';
COMMENT ON FUNCTION public.can_access_sensitive_tag IS 'Verifica acesso a tags sensíveis (apenas admin)';
COMMENT ON FUNCTION public.get_person_tags IS 'Obtém tags de pessoa - compatível com frontend usando SECURITY INVOKER';
COMMENT ON FUNCTION public.apply_tag_to_person IS 'Aplica tag - parâmetros p_ para evitar conflito';
COMMENT ON FUNCTION public.remove_tag_from_person IS 'Remove tag - parâmetros p_ para evitar conflito';
COMMENT ON FUNCTION public.get_available_tags IS 'Versão simplificada para funcionar com frontend - SECURITY INVOKER';