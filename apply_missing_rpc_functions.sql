-- Funções RPC que estão faltando no Supabase local
-- Extraídas do arquivo: supabase/migrations/20250113000012_apply_complete_online_schema.sql

-- Remover funções existentes para evitar conflitos
DROP FUNCTION IF EXISTS "public"."get_current_election"();
DROP FUNCTION IF EXISTS "public"."get_my_effective_goal"();
DROP FUNCTION IF EXISTS "public"."get_my_goal_info"();
DROP FUNCTION IF EXISTS "public"."get_top_leaders"(integer, text, text);

-- 1. Função get_current_election
CREATE OR REPLACE FUNCTION "public"."get_current_election"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', es.id,
    'election_name', es.election_name,
    'election_date', es.election_date,
    'timezone', COALESCE(es.timezone,'America/Sao_Paulo'),
    'election_type', es.election_type,
    'election_level', COALESCE(es.election_level, es.election_type),
    'scope_state', COALESCE(es.scope_state, es.uf),
    'scope_city', COALESCE(es.scope_city, es.city),
    'scope_city_ibge', 
        CASE WHEN es.scope_city_ibge IS NULL OR es.scope_city_ibge = '' THEN NULL
             ELSE es.scope_city_ibge::text::bigint END,
    'uf', es.uf,
    'city', es.city,
    'created_at', es.created_at,
    'updated_at', es.updated_at
  ) INTO result
  FROM public.election_settings es
  ORDER BY es.updated_at DESC NULLS LAST, es.created_at DESC
  LIMIT 1;

  IF result IS NULL THEN
    result := jsonb_build_object(
      'id', NULL,
      'election_name', NULL,
      'election_date', NULL,
      'timezone', 'America/Sao_Paulo',
      'election_type', NULL,
      'election_level', NULL,
      'scope_state', NULL,
      'scope_city', NULL,
      'scope_city_ibge', NULL,
      'uf', NULL,
      'city', NULL,
      'created_at', NULL,
      'updated_at', NULL
    );
  END IF;
  
  RETURN result;
END $$;

-- 2. Função get_my_effective_goal
CREATE OR REPLACE FUNCTION "public"."get_my_effective_goal"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_id uuid;
    user_goal integer;
    default_goal integer;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN 120; -- Meta padrão se não autenticado
    END IF;
    
    -- Buscar meta do usuário
    SELECT goal INTO user_goal
    FROM public.leader_targets
    WHERE leader_id = user_id;
    
    -- Buscar meta padrão
    SELECT default_goal INTO default_goal
    FROM public.org_settings
    WHERE id = 1;
    
    -- Retornar meta efetiva
    IF user_goal IS NOT NULL AND user_goal > 0 THEN
        RETURN user_goal;
    ELSE
        RETURN COALESCE(default_goal, 120);
    END IF;
END;
$$;

-- 3. Função get_my_goal_info
CREATE OR REPLACE FUNCTION "public"."get_my_goal_info"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_user_goal    integer := NULL;
  v_default_goal integer := NULL;
  v_source       text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error','unauthorized');
  END IF;

  -- Meta do usuário (se a tabela/coluna não existir, ignora e segue)
  BEGIN
    SELECT lt.goal INTO v_user_goal
    FROM public.leader_targets lt
    WHERE lt.leader_id = v_user_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_user_goal := NULL;
  END;

  -- Meta padrão da organização (id=1)
  BEGIN
    SELECT os.default_goal INTO v_default_goal
    FROM public.org_settings os
    WHERE os.id = 1;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_default_goal := NULL;
  END;

  v_source := CASE WHEN v_user_goal IS NOT NULL AND v_user_goal > 0 THEN 'user_defined' ELSE 'default' END;

  RETURN jsonb_build_object(
    'effective_goal', COALESCE(NULLIF(v_user_goal,0), COALESCE(v_default_goal,120), 120),
    'user_goal',      COALESCE(v_user_goal,0),
    'default_goal',   COALESCE(v_default_goal,120),
    'source',         v_source
  );
END;
$$;

-- 4. Função get_top_leaders
CREATE OR REPLACE FUNCTION "public"."get_top_leaders"("limit_count" integer DEFAULT 5, "filter_city" "text" DEFAULT NULL::"text", "filter_state" "text" DEFAULT NULL::"text") RETURNS TABLE("leader_id" "uuid", "leader_name" "text", "total_people" bigint, "confirmed_votes" bigint, "probable_votes" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.owner_id as leader_id,
    COALESCE(prof.full_name, 'Nome não encontrado') as leader_name,
    COUNT(*) as total_people,
    COUNT(*) FILTER (WHERE p.vote_status = 'CONFIRMADO') as confirmed_votes,
    COUNT(*) FILTER (WHERE p.vote_status = 'PROVAVEL') as probable_votes
  FROM public.people p
  LEFT JOIN public.profiles prof ON p.owner_id = prof.id
  WHERE p.owner_id IS NOT NULL
    AND (filter_city IS NULL OR p.city = filter_city)
    AND (filter_state IS NULL OR p.state = filter_state)
  GROUP BY p.owner_id, prof.full_name
  ORDER BY COUNT(*) DESC
  LIMIT limit_count;
END;
$$;

-- Definir proprietários das funções
ALTER FUNCTION "public"."get_current_election"() OWNER TO "postgres";
ALTER FUNCTION "public"."get_my_effective_goal"() OWNER TO "postgres";
ALTER FUNCTION "public"."get_my_goal_info"() OWNER TO "postgres";
ALTER FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") OWNER TO "postgres";

-- Comentários das funções
COMMENT ON FUNCTION "public"."get_current_election"() IS 'Retorna configuração de eleição mais recente em formato JSONB único';
COMMENT ON FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") IS 'Retorna os top líderes com contagem de contatos e votos';
