

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."election_level_enum" AS ENUM (
    'MUNICIPAL',
    'ESTADUAL',
    'FEDERAL'
);


ALTER TYPE "public"."election_level_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."activate_leader"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_id uuid;
    result jsonb;
BEGIN
    -- Obter o ID do usuário autenticado
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado');
    END IF;
    
    -- Verificar se o usuário já tem perfil ativo
    IF EXISTS (SELECT 1 FROM public.leader_profiles WHERE id = user_id AND status = 'ACTIVE') THEN
        RETURN jsonb_build_object('ok', true, 'message', 'Líder já está ativo');
    END IF;
    
    -- Verificar se o usuário está inativo
    IF EXISTS (SELECT 1 FROM public.leader_profiles WHERE id = user_id AND status = 'INACTIVE') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Líder está inativo. Contate o administrador.');
    END IF;
    
    -- Ativar o líder (apenas se estiver PENDING)
    UPDATE public.leader_profiles 
    SET 
        status = 'ACTIVE',
        updated_at = now()
    WHERE id = user_id AND status = 'PENDING';
    
    -- Se não havia registro PENDING, criar um novo ACTIVE
    IF NOT FOUND THEN
        INSERT INTO public.leader_profiles (
            id, email, status, created_at, updated_at
        ) VALUES (
            user_id, 
            (SELECT email FROM auth.users WHERE id = user_id),
            'ACTIVE',
            now(),
            now()
        ) ON CONFLICT (id) DO UPDATE SET
            status = 'ACTIVE',
            updated_at = now();
    END IF;
    
    -- Criar meta padrão se não existir
    INSERT INTO public.leader_targets (leader_id, goal, updated_at)
    VALUES (user_id, 100, now())
    ON CONFLICT (leader_id) DO NOTHING;
    
    RETURN jsonb_build_object('ok', true, 'message', 'Líder ativado com sucesso');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."activate_leader"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."app_is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = uid);
$$;


ALTER FUNCTION "public"."app_is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_tag_to_person"("p_person_id" "uuid", "p_tag_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."apply_tag_to_person"("p_person_id" "uuid", "p_tag_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_tag_to_person"("p_person_id" "uuid", "p_tag_id" "uuid") IS 'Aplica tag - parâmetros p_ para evitar conflito';



CREATE OR REPLACE FUNCTION "public"."can_access_sensitive_tag"("tag_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."can_access_sensitive_tag"("tag_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_sensitive_tag"("tag_id" "uuid") IS 'Verifica acesso a tags sensíveis (apenas admin)';



CREATE OR REPLACE FUNCTION "public"."check_tags_seeds"() RETURNS TABLE("category" "text", "total_tags" bigint, "sensitive_tags" bigint, "active_tags" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'TOTAL'::text as category,
    COUNT(*)::bigint as total_tags,
    COUNT(*) FILTER (WHERE is_sensitive = true)::bigint as sensitive_tags,
    COUNT(*) FILTER (WHERE is_active = true)::bigint as active_tags
  FROM public.tags;
END;
$$;


ALTER FUNCTION "public"."check_tags_seeds"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_tags_seeds"() IS 'Verifica quantas tags foram criadas pelos seeds';



CREATE OR REPLACE FUNCTION "public"."create_tag"("p_name" "text", "p_description" "text" DEFAULT ''::"text", "p_color" "text" DEFAULT '#808080'::"text", "p_is_sensitive" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_tag_id uuid;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem criar tags');
  END IF;

  -- Validar nome (obrigatório e único)
  IF trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome da tag é obrigatório');
  END IF;

  -- Verificar se já existe tag com esse nome (case insensitive)
  IF EXISTS(SELECT 1 FROM public.tags WHERE LOWER(name) = LOWER(trim(p_name))) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe uma tag com este nome');
  END IF;

  -- Criar a tag
  INSERT INTO public.tags (name, description, color, is_sensitive, created_by)
  VALUES (trim(p_name), trim(p_description), p_color, p_is_sensitive, auth.uid())
  RETURNING id INTO new_tag_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Tag criada com sucesso',
    'tagId', new_tag_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_tag"("p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_tag"("p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) IS 'Criar nova tag (apenas admin) - valida nome único e campos obrigatórios';



CREATE OR REPLACE FUNCTION "public"."deactivate_leader"("leader_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_id uuid;
BEGIN
    -- Verificar se o usuário é admin
    admin_id := auth.uid();
    
    IF admin_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_id AND role = 'ADMIN') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Apenas administradores podem desativar líderes');
    END IF;
    
    -- Desativar o líder
    UPDATE public.leader_profiles 
    SET 
        status = 'INACTIVE',
        updated_at = now()
    WHERE id = leader_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Líder não encontrado');
    END IF;
    
    RETURN jsonb_build_object('ok', true, 'message', 'Líder desativado com sucesso');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."deactivate_leader"("leader_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_tag"("p_tag_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tag_name text;
  usage_count integer;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem excluir tags');
  END IF;

  -- Verificar se tag existe e obter informações
  SELECT name INTO tag_name FROM public.tags WHERE id = p_tag_id;
  
  IF tag_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag não encontrada');
  END IF;

  -- Verificar se há pessoas usando a tag
  SELECT COUNT(*) INTO usage_count 
  FROM public.people_tags 
  WHERE tag_id = p_tag_id;
  
  IF usage_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Não é possível excluir a tag "%s" pois está sendo usada por %s pessoa(s). Remova a tag das pessoas primeiro.', tag_name, usage_count),
      'usageCount', usage_count
    );
  END IF;

  -- Excluir a tag
  DELETE FROM public.tags WHERE id = p_tag_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Tag "%s" excluída com sucesso', tag_name)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."delete_tag"("p_tag_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_tag"("p_tag_id" "uuid") IS 'Excluir tag permanentemente (apenas admin) - verifica uso antes de excluir';



CREATE OR REPLACE FUNCTION "public"."election_settings_normalize"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.election_level := UPPER(COALESCE(NEW.election_level, NEW.election_type));

  IF NEW.election_level IN ('ESTADUAL','FEDERAL') THEN
    NEW.city            := NULL;
    NEW.scope_city      := NULL;
    NEW.scope_city_ibge := NULL;
  END IF;

  IF NEW.election_level = 'FEDERAL' THEN
    NEW.uf         := NULL;
    NEW.scope_state:= NULL;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."election_settings_normalize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."election_settings_upsert_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  -- Já normalizado para UPPER pela trigger b1
  SELECT id
    INTO v_existing_id
  FROM public.election_settings
  WHERE election_level = NEW.election_level
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Atualiza a linha existente
    UPDATE public.election_settings
       SET election_name   = NEW.election_name,
           election_date   = NEW.election_date,
           timezone        = NEW.timezone,
           election_type   = NEW.election_type,
           election_level  = NEW.election_level,
           uf              = NEW.uf,
           city            = NEW.city,
           scope_state     = NEW.scope_state,
           scope_city      = NEW.scope_city,
           scope_city_ibge = NEW.scope_city_ibge,
           updated_at      = now()
     WHERE id = v_existing_id;

    -- dispara sync pelo trigger AFTER UPDATE já existente
    RETURN NULL; -- cancela o INSERT (emula UPSERT)
  END IF;

  RETURN NEW; -- segue com o INSERT normal
END;
$$;


ALTER FUNCTION "public"."election_settings_upsert_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_leader_target_from_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_default int := 50000;
  v_email   text;
  v_goal    int;
BEGIN
  -- email do novo perfil: usa profiles.email se existir; senão, busca em auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='email'
  ) THEN
    v_email := NEW.email;
  ELSE
    SELECT u.email INTO v_email
    FROM auth.users u WHERE u.id = NEW.id;
  END IF;

  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- meta padrão
  SELECT COALESCE(default_goal, 50000) INTO v_default
  FROM public.org_settings WHERE id = 1;

  -- meta individual (se houver) na lista de líderes
  SELECT l.goal INTO v_goal
  FROM public.app_leaders_list l
  WHERE LOWER(l.email) = LOWER(v_email);

  -- cria a meta, se não existir ainda
  INSERT INTO public.leader_targets (leader_id, goal)
  VALUES (NEW.id, COALESCE(NULLIF(v_goal,0), v_default))
  ON CONFLICT (leader_id) DO NOTHING;

  RETURN NEW;
END
$$;


ALTER FUNCTION "public"."ensure_leader_target_from_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_tags_admin"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "color" "text", "is_active" boolean, "is_sensitive" boolean, "usage_count" bigint, "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar esta função';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    COALESCE(t.description, '') as description,
    COALESCE(t.color, '#808080') as color,
    COALESCE(t.is_active, true) as is_active,
    COALESCE(t.is_sensitive, false) as is_sensitive,
    (SELECT COUNT(*) FROM public.people_tags pt WHERE pt.tag_id = t.id) as usage_count,
    t.created_by,
    t.created_at,
    t.updated_at
  FROM public.tags t
  ORDER BY t.is_active DESC, t.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_all_tags_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_tags_admin"() IS 'Listar todas as tags para administração (apenas admin) - inclui inativas e estatísticas';



CREATE OR REPLACE FUNCTION "public"."get_available_tags"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "color" "text", "is_sensitive" boolean, "usage_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_available_tags"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_tags"() IS 'Versão simplificada para funcionar com frontend - SECURITY INVOKER';



CREATE OR REPLACE FUNCTION "public"."get_current_election"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_current_election"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_election"() IS 'Retorna configuração de eleição mais recente em formato JSONB único';



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


ALTER FUNCTION "public"."get_my_effective_goal"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_my_goal_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_person_tags"("person_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "color" "text", "is_sensitive" boolean, "applied_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_person_tags"("person_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_person_tags"("person_id" "uuid") IS 'Obtém tags de pessoa - compatível com frontend usando SECURITY INVOKER';



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


ALTER FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") IS 'Retorna os top líderes com contagem de contatos e votos';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles(id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), 'LEADER')
  ON CONFLICT (id) DO NOTHING;

  -- CORREÇÃO: Usar PENDING em vez de ACTIVE para novos usuários
  INSERT INTO public.leader_profiles(id, email, status)
  VALUES (NEW.id, NEW.email, 'PENDING')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer DEFAULT 7) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_now     timestamptz := now();
  v_expires timestamptz := v_now + make_interval(days => GREATEST(COALESCE(p_expires_in_days,7),1));
  v_email   text        := lower(trim(p_email));
  v_id      uuid;
BEGIN
  -- Só ADMIN pode convidar
  IF NOT public.app_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden: admin only');
  END IF;

  INSERT INTO public.invite_tokens (email, created_at, expires_at, accepted_at, data)
  VALUES (v_email, v_now, v_expires, NULL, jsonb_build_object('full_name', trim(p_full_name)))
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true,
    'invite_id', v_id,
    'email', v_email,
    'expires_at', v_expires
  );
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END
$$;


ALTER FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."is_current_user_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_current_user_admin"() IS 'Verifica se usuário atual é admin (usa app_admins)';



CREATE OR REPLACE FUNCTION "public"."is_current_user_leader"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."is_current_user_leader"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_current_user_leader"() IS 'Verifica se usuário atual é líder ativo (usa app_leaders_list)';



CREATE OR REPLACE FUNCTION "public"."is_person_owned_by_current_user"("person_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."is_person_owned_by_current_user"("person_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_person_owned_by_current_user"("person_id" "uuid") IS 'Verifica se pessoa pertence ao usuário atual (people.owner_id)';



CREATE OR REPLACE FUNCTION "public"."leader_profiles_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Para INSERTs, permitir PENDING (novos convites)
  IF tg_op = 'INSERT' THEN
    -- Permitir INSERT com status PENDING (novos convites)
    IF NEW.status = 'PENDING' THEN
      RETURN NEW;
    END IF;
    
    -- Para outros status em INSERT, verificar se é admin
    IF NOT public.app_is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'blocked: only ADMIN may insert with status %', NEW.status;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Para UPDATEs, manter a lógica existente
  IF tg_op = 'UPDATE' THEN
    -- Se for atualização crítica, só admin ou ativação controlada pode mexer
    IF (NEW.status      IS DISTINCT FROM OLD.status)
       OR (NEW.email    IS DISTINCT FROM OLD.email)
       OR (NEW.accepted_at IS DISTINCT FROM OLD.accepted_at) THEN

       -- bypass para a função de ativação
       IF COALESCE(current_setting('app.allow_self_activation', true),'off') = 'on' THEN
         RETURN NEW;
       END IF;

       -- admin pode (usando a função existente)
       IF NOT public.app_is_admin(auth.uid()) THEN
         RAISE EXCEPTION 'blocked: only ADMIN or activation flow may change status/email/accepted_at';
       END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."leader_profiles_guard"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."leader_profiles_guard"() IS 'Trigger guard que permite ativação controlada';



CREATE OR REPLACE FUNCTION "public"."norm_scope_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.scope_state is null or btrim(new.scope_state) = '' then
    new.scope_state := null;
  else
    new.scope_state := public.to_uf(new.scope_state);
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."norm_scope_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_leader_activated_mark_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Futuro: marcar convite como aceito quando status = 'ACTIVE'
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."on_leader_activated_mark_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."people_set_full_name_fts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.full_name_fts = to_tsvector('portuguese', unaccent(COALESCE(NEW.full_name, '')));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."people_set_full_name_fts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."people_set_full_name_fts"() IS 'Trigger function to automatically update FTS column when full_name changes';



CREATE OR REPLACE FUNCTION "public"."people_set_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."people_set_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reactivate_leader"("leader_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_id uuid;
BEGIN
    -- Verificar se o usuário é admin
    admin_id := auth.uid();
    
    IF admin_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Usuário não autenticado');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_id AND role = 'ADMIN') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Apenas administradores podem reativar líderes');
    END IF;
    
    -- Reativar o líder
    UPDATE public.leader_profiles 
    SET 
        status = 'ACTIVE',
        updated_at = now()
    WHERE id = leader_id AND status = 'INACTIVE';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Líder não encontrado ou não está inativo');
    END IF;
    
    RETURN jsonb_build_object('ok', true, 'message', 'Líder reativado com sucesso');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."reactivate_leader"("leader_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_tag_from_person"("p_person_id" "uuid", "p_tag_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."remove_tag_from_person"("p_person_id" "uuid", "p_tag_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_tag_from_person"("p_person_id" "uuid", "p_tag_id" "uuid") IS 'Remove tag - parâmetros p_ para evitar conflito';



CREATE OR REPLACE FUNCTION "public"."search_people"("q" "text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "full_name" "text", "city" "text", "state" "text", "rank" real)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.city,
    p.state,
    ts_rank(p.full_name_fts, plainto_tsquery('portuguese', unaccent(q))) as rank
  FROM public.people p
  WHERE p.full_name_fts @@ plainto_tsquery('portuguese', unaccent(q))
  ORDER BY rank DESC, p.full_name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_people"("q" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_people"("q" "text", "p_limit" integer, "p_offset" integer) IS 'Search people using full-text search with Portuguese language support';



CREATE OR REPLACE FUNCTION "public"."search_people_with_tags"("q" "text" DEFAULT ''::"text", "tag_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "mode" "text" DEFAULT 'ANY'::"text", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "owner_id" "uuid", "full_name" "text", "whatsapp" "text", "email" "text", "city" "text", "state" "text", "vote_status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "tags" "jsonb", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_people_with_tags"("q" "text", "tag_ids" "uuid"[], "mode" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_people_with_tags"("q" "text", "tag_ids" "uuid"[], "mode" "text", "p_limit" integer, "p_offset" integer) IS 'Busca pessoas com filtro por tags - suporta modo ANY/ALL e RLS';



CREATE OR REPLACE FUNCTION "public"."set_leader_accepted_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at = now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_leader_accepted_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at := now(); return new; end$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_public_settings"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.public_settings
  SET election_name = es.election_name,
      election_date = es.election_date,
      timezone = COALESCE(es.timezone,'America/Sao_Paulo'),
      election_level = COALESCE(es.election_level, es.election_type),
      scope_state = COALESCE(es.scope_state, es.uf),
      scope_city = COALESCE(es.scope_city, es.city),
      scope_city_ibge = CASE WHEN es.scope_city_ibge IS NULL OR es.scope_city_ibge = '' THEN NULL
                             ELSE es.scope_city_ibge::text::bigint END,
      updated_at = now()
  FROM (SELECT * FROM public.election_settings
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 1) es
  WHERE public.public_settings.id = 1;
END $$;


ALTER FUNCTION "public"."sync_public_settings"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_public_settings"() IS 'Sincroniza public_settings com election_settings';



CREATE OR REPLACE FUNCTION "public"."to_uf"("txt" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
with s as (select unaccent(upper(trim($1))) v)
select case
  when s.v ~ '^[A-Z]{2}$' then s.v
  when s.v = 'ACRE' then 'AC' when s.v = 'ALAGOAS' then 'AL'
  when s.v = 'AMAPA' then 'AP' when s.v = 'AMAZONAS' then 'AM'
  when s.v = 'BAHIA' then 'BA' when s.v = 'CEARA' then 'CE'
  when s.v = 'DISTRITO FEDERAL' then 'DF' when s.v = 'ESPIRITO SANTO' then 'ES'
  when s.v = 'GOIAS' then 'GO' when s.v = 'MARANHAO' then 'MA'
  when s.v = 'MATO GROSSO' then 'MT' when s.v = 'MATO GROSSO DO SUL' then 'MS'
  when s.v = 'MINAS GERAIS' then 'MG' when s.v = 'PARA' then 'PA'
  when s.v = 'PARAIBA' then 'PB' when s.v = 'PARANA' then 'PR'
  when s.v = 'PERNAMBUCO' then 'PE' when s.v = 'PIAUI' then 'PI'
  when s.v = 'RIO DE JANEIRO' then 'RJ' when s.v = 'RIO GRANDE DO NORTE' then 'RN'
  when s.v = 'RIO GRANDE DO SUL' then 'RS' when s.v = 'RONDONIA' then 'RO'
  when s.v = 'RORAIMA' then 'RR' when s.v = 'SANTA CATARINA' then 'SC'
  when s.v = 'SAO PAULO' then 'SP' when s.v = 'SERGIPE' then 'SE'
  when s.v = 'TOCANTINS' then 'TO'
  else null end from s;
$_$;


ALTER FUNCTION "public"."to_uf"("txt" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_tag_status"("p_tag_id" "uuid", "p_is_active" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tag_name text;
  usage_count integer;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem alterar status de tags');
  END IF;

  -- Verificar se tag existe e obter informações
  SELECT name INTO tag_name FROM public.tags WHERE id = p_tag_id;
  
  IF tag_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag não encontrada');
  END IF;

  -- Se está desativando, verificar se há pessoas usando a tag
  IF NOT p_is_active THEN
    SELECT COUNT(*) INTO usage_count 
    FROM public.people_tags 
    WHERE tag_id = p_tag_id;
    
    IF usage_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', format('Não é possível desativar a tag "%s" pois está sendo usada por %s pessoa(s)', tag_name, usage_count),
        'usageCount', usage_count
      );
    END IF;
  END IF;

  -- Atualizar status
  UPDATE public.tags 
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_tag_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', format('Tag "%s" %s com sucesso', tag_name, CASE WHEN p_is_active THEN 'ativada' ELSE 'desativada' END)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."toggle_tag_status"("p_tag_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."toggle_tag_status"("p_tag_id" "uuid", "p_is_active" boolean) IS 'Ativar/desativar tag (apenas admin) - verifica uso antes de desativar';



CREATE OR REPLACE FUNCTION "public"."trigger_sync_public_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN 
  PERFORM public.sync_public_settings(); 
  RETURN COALESCE(NEW,OLD); 
END $$;


ALTER FUNCTION "public"."trigger_sync_public_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tag"("p_tag_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT ''::"text", "p_color" "text" DEFAULT '#808080'::"text", "p_is_sensitive" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas administradores podem editar tags');
  END IF;

  -- Validar nome (obrigatório e único)
  IF trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome da tag é obrigatório');
  END IF;

  -- Verificar se tag existe
  IF NOT EXISTS(SELECT 1 FROM public.tags WHERE id = p_tag_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tag não encontrada');
  END IF;

  -- Verificar se já existe outra tag com esse nome (excluindo a atual)
  IF EXISTS(
    SELECT 1 FROM public.tags 
    WHERE LOWER(name) = LOWER(trim(p_name)) 
    AND id != p_tag_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe uma tag com este nome');
  END IF;

  -- Atualizar a tag
  UPDATE public.tags 
  SET 
    name = trim(p_name),
    description = trim(p_description),
    color = p_color,
    is_sensitive = p_is_sensitive,
    updated_at = now()
  WHERE id = p_tag_id;

  RETURN jsonb_build_object('success', true, 'message', 'Tag atualizada com sucesso');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."update_tag"("p_tag_id" "uuid", "p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_tag"("p_tag_id" "uuid", "p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) IS 'Editar tag existente (apenas admin) - valida nome único e existência';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    v_id     uuid;
    v_level  text;
    v_state  text;
    v_city   text;
    v_ibge   bigint;
BEGIN
    -- 1) Autoriza somente ADMIN
    IF NOT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;

    -- 2) Normalizações (casing/trim/IBGE)
    v_level := UPPER(TRIM(COALESCE(p_level_or_type, 'MUNICIPAL')));
    IF v_level NOT IN ('MUNICIPAL','ESTADUAL','FEDERAL') THEN
        RAISE EXCEPTION 'invalid election level/type: %', p_level_or_type USING ERRCODE = '22023';
    END IF;

    v_state := NULLIF(TRIM(p_uf), '');
    v_city  := NULLIF(TRIM(p_city), '');

    IF p_city_ibge IS NULL THEN
        v_ibge := NULL;
    ELSIF (p_city_ibge::text ~ '^[0-9]+$') THEN
        v_ibge := p_city_ibge::text::bigint;
    ELSE
        v_ibge := NULL;
    END IF;

    -- 3) UPSERT: Atualizar se existir registro com mesma data, senão inserir novo
    INSERT INTO public.election_settings (
        election_name, election_date, timezone,
        election_level, election_type,
        scope_state, uf, scope_city, city, scope_city_ibge
    ) VALUES (
        p_election_name,
        p_election_date,
        COALESCE(p_timezone, 'America/Sao_Paulo'),
        v_level, v_level,
        v_state, v_state,
        v_city,  v_city,
        v_ibge
    )
    ON CONFLICT (election_date) DO UPDATE SET
        election_name = EXCLUDED.election_name,
        timezone = EXCLUDED.timezone,
        election_level = EXCLUDED.election_level,
        election_type = EXCLUDED.election_type,
        scope_state = EXCLUDED.scope_state,
        uf = EXCLUDED.uf,
        scope_city = EXCLUDED.scope_city,
        city = EXCLUDED.city,
        scope_city_ibge = EXCLUDED.scope_city_ibge,
        updated_at = now()
    RETURNING id INTO v_id;

    -- 4) Atualiza o cache público (id=1)
    PERFORM public.sync_public_settings();

    RETURN v_id;
END;
$_$;


ALTER FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_leader_target_from_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- meta precisa ser > 0
  IF COALESCE(NEW.goal,0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- 1a) tenta usar NEW.id como UUID do usuário
  IF NEW.id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.id) THEN
    v_user_id := NEW.id;

  -- 1b) senão, tenta achar pelo e-mail
  ELSIF NEW.email IS NOT NULL THEN
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(NEW.email)
    LIMIT 1;
  END IF;

  -- se não achou usuário ainda, não faz nada (ele pode não ter confirmado a conta)
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- garante que existe profiles (para não violar a FK de leader_targets)
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id) THEN
    RETURN NEW;
  END IF;

  -- UPSERT com proteção para não escrever igual
  INSERT INTO public.leader_targets AS lt (leader_id, goal)
  VALUES (v_user_id, NEW.goal)
  ON CONFLICT (leader_id) DO UPDATE
     SET goal = EXCLUDED.goal,
         updated_at = now()
  WHERE lt.goal IS DISTINCT FROM EXCLUDED.goal;

  RETURN NEW;
END
$$;


ALTER FUNCTION "public"."upsert_leader_target_from_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_full_name"("name" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verifica se o nome não é nulo ou vazio
  IF name IS NULL OR trim(name) = '' THEN
    RETURN false;
  END IF;
  
  -- Verifica se tem pelo menos 3 caracteres
  IF length(trim(name)) < 3 THEN
    RETURN false;
  END IF;
  
  -- Verifica se tem pelo menos 2 palavras (nome e sobrenome)
  -- Remove espaços extras e conta palavras
  IF array_length(string_to_array(trim(regexp_replace(name, '\s+', ' ', 'g')), ' '), 1) < 2 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."validate_full_name"("name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_tags_grants"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."verify_tags_grants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_tags_grants"() IS 'Verifica grants de tabelas e funções relacionadas a tags';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_admins" (
    "user_id" "uuid" NOT NULL,
    "note" "text"
);


ALTER TABLE "public"."app_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leader_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "birth_date" "date",
    "gender" "text",
    "cep" "text",
    "street" "text",
    "number" "text",
    "complement" "text",
    "neighborhood" "text",
    "city" "text",
    "state" "text",
    "notes" "text",
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "goal" integer DEFAULT 100,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "leader_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['M'::"text", 'F'::"text", 'O'::"text"]))),
    CONSTRAINT "leader_profiles_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."leader_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."leader_profiles" IS 'Dados estendidos dos líderes';



COMMENT ON COLUMN "public"."leader_profiles"."status" IS 'Status do líder: ACTIVE, INACTIVE';



COMMENT ON COLUMN "public"."leader_profiles"."goal" IS 'Meta de contatos para o líder';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'LEADER'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['ADMIN'::"text", 'LEADER'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Perfis básicos de usuários do sistema (ADMIN/LEADER)';



COMMENT ON COLUMN "public"."profiles"."role" IS 'Papel do usuário: ADMIN (acesso total) ou LEADER (acesso limitado)';



CREATE OR REPLACE VIEW "public"."app_leaders_list" AS
 SELECT "p"."id",
    "p"."email",
    "p"."full_name",
    "p"."role",
    "lp"."goal",
    "lp"."status",
    "lp"."city",
    "lp"."state",
    "lp"."created_at",
    "lp"."updated_at",
    "lp"."accepted_at" AS "invited_at"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."leader_profiles" "lp" ON (("lp"."id" = "p"."id")))
  WHERE (("p"."role" = 'LEADER'::"text") OR ("lp"."id" IS NOT NULL));


ALTER VIEW "public"."app_leaders_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "action" "text" NOT NULL,
    "actor_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['CREATE'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Log de auditoria do sistema';



CREATE SEQUENCE IF NOT EXISTS "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_logs_id_seq" OWNED BY "public"."audit_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."city_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "goal_total" integer NOT NULL,
    "deadline" "date",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "city_goals_goal_total_check" CHECK (("goal_total" > 0))
);


ALTER TABLE "public"."city_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."city_goals" IS 'Metas por cidade';



CREATE TABLE IF NOT EXISTS "public"."election_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "election_name" "text" NOT NULL,
    "election_date" "date" NOT NULL,
    "timezone" "text" DEFAULT 'America/Sao_Paulo'::"text",
    "election_type" "text" NOT NULL,
    "uf" "text",
    "city" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "election_level" "text",
    "scope_state" "text",
    "scope_city" "text",
    "scope_city_ibge" "text",
    CONSTRAINT "election_settings_election_level_check" CHECK (("election_level" = ANY (ARRAY['MUNICIPAL'::"text", 'ESTADUAL'::"text", 'FEDERAL'::"text"]))),
    CONSTRAINT "election_settings_election_type_check" CHECK (("election_type" = ANY (ARRAY['MUNICIPAL'::"text", 'ESTADUAL'::"text", 'FEDERAL'::"text"]))),
    CONSTRAINT "es_scope_chk" CHECK ((("election_level" IS NULL) OR (("election_level" = 'MUNICIPAL'::"text") AND ("scope_state" IS NOT NULL) AND ("scope_city" IS NOT NULL)) OR (("election_level" = 'ESTADUAL'::"text") AND ("scope_state" IS NOT NULL) AND ("scope_city" IS NULL)) OR (("election_level" = 'FEDERAL'::"text") AND ("scope_state" IS NULL) AND ("scope_city" IS NULL))))
);


ALTER TABLE "public"."election_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."election_settings" IS 'Configurações das eleições';



COMMENT ON COLUMN "public"."election_settings"."election_level" IS 'Nível da eleição: MUNICIPAL, ESTADUAL, FEDERAL';



COMMENT ON COLUMN "public"."election_settings"."scope_state" IS 'Estado de escopo da eleição';



COMMENT ON COLUMN "public"."election_settings"."scope_city" IS 'Cidade de escopo da eleição';



COMMENT ON COLUMN "public"."election_settings"."scope_city_ibge" IS 'Código IBGE da cidade de escopo';



CREATE TABLE IF NOT EXISTS "public"."invite_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "role" "text" DEFAULT 'LEADER'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_by" "uuid",
    "accepted_at" timestamp with time zone,
    "leader_profile_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb"
);


ALTER TABLE "public"."invite_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."invite_tokens" IS 'Tokens de convite para novos líderes';



CREATE TABLE IF NOT EXISTS "public"."leader_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "neighborhood" "text",
    "target" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "leader_areas_target_check" CHECK (("target" > 0))
);


ALTER TABLE "public"."leader_areas" OWNER TO "postgres";


COMMENT ON TABLE "public"."leader_areas" IS 'Áreas de atuação dos líderes';



CREATE TABLE IF NOT EXISTS "public"."leader_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "leader_id" "uuid" NOT NULL,
    "goal" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."leader_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."neighborhood_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "neighborhood" "text" NOT NULL,
    "goal_total" integer NOT NULL,
    "city_goal_id" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "neighborhood_goals_goal_total_check" CHECK (("goal_total" > 0))
);


ALTER TABLE "public"."neighborhood_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."neighborhood_goals" IS 'Metas por bairro';



CREATE TABLE IF NOT EXISTS "public"."org_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "default_goal" integer DEFAULT 100,
    "organization_name" "text" DEFAULT 'Organização Política'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."org_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."org_settings" IS 'Configurações gerais da organização';



COMMENT ON COLUMN "public"."org_settings"."default_goal" IS 'Meta padrão para novos líderes';



CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "whatsapp" "text" NOT NULL,
    "email" "text",
    "facebook" "text",
    "instagram" "text",
    "cep" "text",
    "street" "text",
    "number" "text",
    "complement" "text",
    "neighborhood" "text",
    "city" "text",
    "state" "text",
    "notes" "text",
    "latitude" numeric,
    "longitude" numeric,
    "vote_status" "text" DEFAULT 'INDEFINIDO'::"text",
    "contacted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name_fts" "tsvector",
    CONSTRAINT "people_full_name_check" CHECK ("public"."validate_full_name"("full_name")),
    CONSTRAINT "people_vote_status_check" CHECK (("vote_status" = ANY (ARRAY['CONFIRMADO'::"text", 'PROVAVEL'::"text", 'INDEFINIDO'::"text"])))
);


ALTER TABLE "public"."people" OWNER TO "postgres";


COMMENT ON TABLE "public"."people" IS 'Contatos e eleitores do sistema';



COMMENT ON COLUMN "public"."people"."vote_status" IS 'Status do voto: CONFIRMADO, PROVAVEL, INDEFINIDO';



COMMENT ON COLUMN "public"."people"."full_name_fts" IS 'Full-text search vector for full_name column';



COMMENT ON CONSTRAINT "people_full_name_check" ON "public"."people" IS 'Garante que full_name tenha pelo menos 2 palavras (nome e sobrenome) e mínimo 3 caracteres';



CREATE TABLE IF NOT EXISTS "public"."people_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."people_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."people_tags" IS 'RLS: Todas operações requerem ser admin OU (líder E dono da pessoa)';



COMMENT ON COLUMN "public"."people_tags"."person_id" IS 'ID da pessoa que recebeu a tag';



COMMENT ON COLUMN "public"."people_tags"."tag_id" IS 'ID da tag aplicada';



COMMENT ON COLUMN "public"."people_tags"."created_by" IS 'Usuário que aplicou a tag';



CREATE TABLE IF NOT EXISTS "public"."profile_leaderships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role_code" "text" NOT NULL,
    "level" integer,
    "reach_scope" "text",
    "reach_size" integer,
    "organization" "text",
    "title" "text",
    "extra" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profile_leaderships_reach_scope_check" CHECK (("reach_scope" = ANY (ARRAY['FAMILIA'::"text", 'BAIRRO'::"text", 'CIDADE'::"text", 'REGIAO'::"text", 'ONLINE'::"text"])))
);


ALTER TABLE "public"."profile_leaderships" OWNER TO "postgres";


COMMENT ON TABLE "public"."profile_leaderships" IS 'Papéis de liderança dos usuários';



CREATE TABLE IF NOT EXISTS "public"."public_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "organization_name" "text",
    "default_goal" integer DEFAULT 100,
    "election_name" "text",
    "election_date" "date",
    "timezone" "text" DEFAULT 'America/Sao_Paulo'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "election_level" "text",
    "scope_state" "text",
    "scope_city" "text",
    "scope_city_ibge" bigint
);


ALTER TABLE "public"."public_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."public_settings" IS 'Cache público de configurações para acesso rápido';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text",
    "is_active" boolean DEFAULT true,
    "is_sensitive" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'RLS: SELECT para authenticated (apenas is_active=true), CRUD apenas para admin';



COMMENT ON COLUMN "public"."tags"."name" IS 'Nome único da tag (ex: Empresário, Estudante)';



COMMENT ON COLUMN "public"."tags"."description" IS 'Descrição opcional da tag';



COMMENT ON COLUMN "public"."tags"."color" IS 'Cor da tag em hexadecimal (ex: #FF6B6B)';



COMMENT ON COLUMN "public"."tags"."is_active" IS 'Se false, tag não aparece para seleção';



COMMENT ON COLUMN "public"."tags"."is_sensitive" IS 'Se true, apenas admins podem ver (LGPD)';



CREATE OR REPLACE VIEW "public"."vw_people_with_tags" AS
 SELECT "id",
    "owner_id",
    "full_name",
    "whatsapp",
    "email",
    "city",
    "state",
    "vote_status",
    "created_at",
    "updated_at",
    COALESCE(( SELECT "json_agg"("json_build_object"('id', "t"."id", 'name', "t"."name", 'description', COALESCE("t"."description", ''::"text"), 'color', COALESCE("t"."color", '#808080'::"text"), 'is_sensitive', COALESCE("t"."is_sensitive", false), 'applied_at', "pt"."created_at") ORDER BY "t"."name") AS "json_agg"
           FROM ("public"."people_tags" "pt"
             JOIN "public"."tags" "t" ON (("pt"."tag_id" = "t"."id")))
          WHERE (("pt"."person_id" = "p"."id") AND ("t"."is_active" = true))), '[]'::json) AS "tags",
    ( SELECT "count"(*) AS "count"
           FROM ("public"."people_tags" "pt2"
             JOIN "public"."tags" "t2" ON (("pt2"."tag_id" = "t2"."id")))
          WHERE (("pt2"."person_id" = "p"."id") AND ("t2"."is_active" = true))) AS "tag_count"
   FROM "public"."people" "p";


ALTER VIEW "public"."vw_people_with_tags" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_people_with_tags" IS 'View com pessoas e suas tags agregadas - respeitando RLS';



CREATE OR REPLACE VIEW "public"."vw_votes_by_city" AS
 SELECT "city",
    "state",
    "count"(*) AS "total_people",
    "count"(
        CASE
            WHEN ("vote_status" = 'CONFIRMADO'::"text") THEN 1
            ELSE NULL::integer
        END) AS "confirmed",
    "count"(
        CASE
            WHEN ("vote_status" = 'PROVAVEL'::"text") THEN 1
            ELSE NULL::integer
        END) AS "probable",
    "count"(
        CASE
            WHEN ("vote_status" = 'INDEFINIDO'::"text") THEN 1
            ELSE NULL::integer
        END) AS "undefined"
   FROM "public"."people" "p"
  WHERE (("city" IS NOT NULL) AND ("state" IS NOT NULL))
  GROUP BY "city", "state"
  ORDER BY "city", "state";


ALTER VIEW "public"."vw_votes_by_city" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_projection_city_compat" AS
 SELECT COALESCE("g"."city", "v"."city") AS "city",
    COALESCE("g"."state", "v"."state") AS "state",
    COALESCE("g"."goal_total", 0) AS "goal_total",
    COALESCE("v"."total_people", (0)::bigint) AS "total_people",
    COALESCE("v"."confirmed", (0)::bigint) AS "confirmed",
    COALESCE("v"."probable", (0)::bigint) AS "probable",
    COALESCE("v"."undefined", (0)::bigint) AS "undefined",
    (COALESCE("v"."confirmed", (0)::bigint) + COALESCE("v"."probable", (0)::bigint)) AS "realizado"
   FROM ("public"."vw_votes_by_city" "v"
     FULL JOIN "public"."city_goals" "g" ON ((("upper"("v"."state") = "upper"("g"."state")) AND ("lower"("v"."city") = "lower"("g"."city")))));


ALTER VIEW "public"."vw_projection_city_compat" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_votes_by_neighborhood" AS
 SELECT "city",
    "state",
    "neighborhood",
    "count"(*) AS "total_people",
    "count"(
        CASE
            WHEN ("vote_status" = 'CONFIRMADO'::"text") THEN 1
            ELSE NULL::integer
        END) AS "confirmed",
    "count"(
        CASE
            WHEN ("vote_status" = 'PROVAVEL'::"text") THEN 1
            ELSE NULL::integer
        END) AS "probable",
    "count"(
        CASE
            WHEN ("vote_status" = 'INDEFINIDO'::"text") THEN 1
            ELSE NULL::integer
        END) AS "undefined"
   FROM "public"."people" "p"
  WHERE (("city" IS NOT NULL) AND ("state" IS NOT NULL) AND ("neighborhood" IS NOT NULL))
  GROUP BY "city", "state", "neighborhood"
  ORDER BY "city", "neighborhood";


ALTER VIEW "public"."vw_votes_by_neighborhood" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."app_admins"
    ADD CONSTRAINT "app_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."city_goals"
    ADD CONSTRAINT "city_goals_city_state_key" UNIQUE ("city", "state");



ALTER TABLE ONLY "public"."city_goals"
    ADD CONSTRAINT "city_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."election_settings"
    ADD CONSTRAINT "election_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."leader_areas"
    ADD CONSTRAINT "leader_areas_leader_id_city_state_neighborhood_key" UNIQUE ("leader_id", "city", "state", "neighborhood");



ALTER TABLE ONLY "public"."leader_areas"
    ADD CONSTRAINT "leader_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leader_profiles"
    ADD CONSTRAINT "leader_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leader_targets"
    ADD CONSTRAINT "leader_targets_leader_id_key" UNIQUE ("leader_id");



ALTER TABLE ONLY "public"."leader_targets"
    ADD CONSTRAINT "leader_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_city_state_neighborhood_key" UNIQUE ("city", "state", "neighborhood");



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people_tags"
    ADD CONSTRAINT "people_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people_tags"
    ADD CONSTRAINT "people_tags_unique" UNIQUE ("person_id", "tag_id");



ALTER TABLE ONLY "public"."profile_leaderships"
    ADD CONSTRAINT "profile_leaderships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_settings"
    ADD CONSTRAINT "public_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "city_goals_city_state_idx" ON "public"."city_goals" USING "btree" ("city", "state");



CREATE INDEX "idx_people_tags_created_by" ON "public"."people_tags" USING "btree" ("created_by");



CREATE INDEX "idx_people_tags_person_id" ON "public"."people_tags" USING "btree" ("person_id");



CREATE INDEX "idx_people_tags_tag_id" ON "public"."people_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_tags_active" ON "public"."tags" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_tags_name" ON "public"."tags" USING "btree" ("name");



CREATE INDEX "leader_areas_city_state_idx" ON "public"."leader_areas" USING "btree" ("city", "state");



CREATE INDEX "leader_areas_leader_idx" ON "public"."leader_areas" USING "btree" ("leader_id");



CREATE INDEX "neighborhood_goals_city_idx" ON "public"."neighborhood_goals" USING "btree" ("city");



CREATE INDEX "neighborhood_goals_city_state_idx" ON "public"."neighborhood_goals" USING "btree" ("city", "state");



CREATE INDEX "people_city_state_idx" ON "public"."people" USING "btree" ("city", "state");



CREATE INDEX "people_full_name_fts" ON "public"."people" USING "gin" ("full_name_fts");



CREATE INDEX "people_full_name_idx" ON "public"."people" USING "gin" ("to_tsvector"('"simple"'::"regconfig", "full_name"));



CREATE INDEX "people_neighborhood_idx" ON "public"."people" USING "btree" ("neighborhood");



CREATE INDEX "people_owner_idx" ON "public"."people" USING "btree" ("owner_id");



CREATE INDEX "people_whatsapp_idx" ON "public"."people" USING "btree" ("whatsapp");



CREATE UNIQUE INDEX "profile_leaderships_profile_id_unique" ON "public"."profile_leaderships" USING "btree" ("profile_id");



CREATE INDEX "profile_leaderships_profile_idx" ON "public"."profile_leaderships" USING "btree" ("profile_id");



CREATE INDEX "profile_leaderships_role_idx" ON "public"."profile_leaderships" USING "btree" ("role_code");



CREATE UNIQUE INDEX "public_settings_id_uidx" ON "public"."public_settings" USING "btree" ("id");



CREATE UNIQUE INDEX "uidx_election_settings_date" ON "public"."election_settings" USING "btree" ("election_date");



CREATE UNIQUE INDEX "uidx_election_settings_level" ON "public"."election_settings" USING "btree" ("election_level");



CREATE OR REPLACE TRIGGER "Atualizar banco de dados" AFTER INSERT OR UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://n8n.adilson-martins-jlle.workers.dev/', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "es_set_updated_at" BEFORE UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "people_set_owner" BEFORE INSERT ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_set_owner"();



CREATE OR REPLACE TRIGGER "sync_public_settings_trigger" AFTER INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_public_settings"();



CREATE OR REPLACE TRIGGER "trg_election_settings_b1_normalize" BEFORE INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."election_settings_normalize"();



CREATE OR REPLACE TRIGGER "trg_election_settings_b2_upsert" BEFORE INSERT ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."election_settings_upsert_on_insert"();



CREATE OR REPLACE TRIGGER "trg_election_settings_updated_at" BEFORE UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_leader_profiles_updated_at" BEFORE UPDATE ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_norm_scope_state" BEFORE INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."norm_scope_state"();



CREATE OR REPLACE TRIGGER "trg_on_leader_activated_mark_invite" AFTER UPDATE OF "status" ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."on_leader_activated_mark_invite"();



CREATE OR REPLACE TRIGGER "trg_org_settings_updated_at" BEFORE UPDATE ON "public"."org_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_people_set_full_name_fts" BEFORE INSERT OR UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_set_full_name_fts"();



CREATE OR REPLACE TRIGGER "trg_people_tags_updated_at" BEFORE UPDATE ON "public"."people_tags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_people_updated_at" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_profile_upsert_target" AFTER INSERT OR UPDATE OF "goal", "email" ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."upsert_leader_target_from_profile"();



CREATE OR REPLACE TRIGGER "trg_profiles_seed_leader_target" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_leader_target_from_email"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_public_settings_updated_at" BEFORE UPDATE ON "public"."public_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_set_leader_accepted_at" BEFORE UPDATE ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_leader_accepted_at"();



CREATE OR REPLACE TRIGGER "trg_sync_public_from_org" AFTER INSERT OR UPDATE ON "public"."org_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_public_settings"();



CREATE OR REPLACE TRIGGER "trg_tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_city_goals_updated_at" BEFORE UPDATE ON "public"."city_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leader_areas_updated_at" BEFORE UPDATE ON "public"."leader_areas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leader_targets_updated_at" BEFORE UPDATE ON "public"."leader_targets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_neighborhood_goals_updated_at" BEFORE UPDATE ON "public"."neighborhood_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profile_leaderships_updated_at" BEFORE UPDATE ON "public"."profile_leaderships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."app_admins"
    ADD CONSTRAINT "app_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."city_goals"
    ADD CONSTRAINT "city_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."city_goals"
    ADD CONSTRAINT "city_goals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_leader_profile_id_fkey" FOREIGN KEY ("leader_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leader_areas"
    ADD CONSTRAINT "leader_areas_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leader_profiles"
    ADD CONSTRAINT "leader_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leader_targets"
    ADD CONSTRAINT "leader_targets_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_city_goal_id_fkey" FOREIGN KEY ("city_goal_id") REFERENCES "public"."city_goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people_tags"
    ADD CONSTRAINT "people_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people_tags"
    ADD CONSTRAINT "people_tags_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people_tags"
    ADD CONSTRAINT "people_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_leaderships"
    ADD CONSTRAINT "profile_leaderships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_admin_only" ON "public"."audit_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text")))));



ALTER TABLE "public"."city_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "city_goals_admin_all" ON "public"."city_goals" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



CREATE POLICY "city_goals_admin_only" ON "public"."city_goals" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



CREATE POLICY "city_goals_insert_policy" ON "public"."city_goals" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "city_goals_read_auth" ON "public"."city_goals" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."election_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "election_settings_modify_admin_only" ON "public"."election_settings" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



CREATE POLICY "election_settings_read_authenticated" ON "public"."election_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "election_settings_select_authenticated" ON "public"."election_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "election_settings_write_admin" ON "public"."election_settings" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



ALTER TABLE "public"."invite_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invite_tokens_admin_only" ON "public"."invite_tokens" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text")))));



CREATE POLICY "invite_tokens_delete_admin" ON "public"."invite_tokens" FOR DELETE TO "authenticated" USING ("public"."app_is_admin"("auth"."uid"()));



CREATE POLICY "invite_tokens_insert_admin" ON "public"."invite_tokens" FOR INSERT TO "authenticated" WITH CHECK ("public"."app_is_admin"("auth"."uid"()));



CREATE POLICY "invite_tokens_select_admin" ON "public"."invite_tokens" FOR SELECT TO "authenticated" USING ("public"."app_is_admin"("auth"."uid"()));



CREATE POLICY "invite_tokens_update_admin" ON "public"."invite_tokens" FOR UPDATE TO "authenticated" USING ("public"."app_is_admin"("auth"."uid"())) WITH CHECK ("public"."app_is_admin"("auth"."uid"()));



ALTER TABLE "public"."leader_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leader_areas_admin_only" ON "public"."leader_areas" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



ALTER TABLE "public"."leader_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leader_profiles_delete_admin" ON "public"."leader_profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "leader_profiles_insert_admin" ON "public"."leader_profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "leader_profiles_insert_self" ON "public"."leader_profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "leader_profiles_select_all" ON "public"."leader_profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "leader_profiles_select_self_or_admin" ON "public"."leader_profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))));



CREATE POLICY "leader_profiles_update_admin" ON "public"."leader_profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "leader_profiles_update_self" ON "public"."leader_profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "leader_profiles_update_self_or_admin" ON "public"."leader_profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")))) WITH CHECK ((("id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))));



ALTER TABLE "public"."leader_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leader_targets_delete_admin" ON "public"."leader_targets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text")))));



CREATE POLICY "leader_targets_insert_admin" ON "public"."leader_targets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text")))));



CREATE POLICY "leader_targets_select_self_or_admin" ON "public"."leader_targets" FOR SELECT USING ((("leader_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text"))))));



CREATE POLICY "leader_targets_self_or_admin" ON "public"."leader_targets" FOR SELECT TO "authenticated" USING ((("leader_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."app_admins" "a"
  WHERE ("a"."user_id" = "auth"."uid"())))));



CREATE POLICY "leader_targets_update_self_or_admin" ON "public"."leader_targets" FOR UPDATE USING ((("leader_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text"))))));



ALTER TABLE "public"."neighborhood_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "neighborhood_goals_admin_all" ON "public"."neighborhood_goals" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



CREATE POLICY "neighborhood_goals_admin_only" ON "public"."neighborhood_goals" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



ALTER TABLE "public"."org_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_settings_modify_admin_only" ON "public"."org_settings" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



CREATE POLICY "org_settings_select_authenticated" ON "public"."org_settings" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "people_delete_admin_or_owner" ON "public"."people" FOR DELETE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))));



CREATE POLICY "people_insert_admin_or_owner" ON "public"."people" FOR INSERT TO "authenticated" WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))));



CREATE POLICY "people_select_admin_or_owner" ON "public"."people" FOR SELECT TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))));



ALTER TABLE "public"."people_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "people_tags_delete_owner_or_admin" ON "public"."people_tags" FOR DELETE TO "authenticated" USING (("public"."is_current_user_admin"() OR ("public"."is_current_user_leader"() AND "public"."is_person_owned_by_current_user"("person_id"))));



CREATE POLICY "people_tags_insert_owner_or_admin" ON "public"."people_tags" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_current_user_admin"() OR ("public"."is_current_user_leader"() AND "public"."is_person_owned_by_current_user"("person_id"))));



CREATE POLICY "people_tags_select_owner_or_admin" ON "public"."people_tags" FOR SELECT TO "authenticated" USING (("public"."is_current_user_admin"() OR ("public"."is_current_user_leader"() AND "public"."is_person_owned_by_current_user"("person_id"))));



CREATE POLICY "people_tags_update_owner_or_admin" ON "public"."people_tags" FOR UPDATE TO "authenticated" USING (("public"."is_current_user_admin"() OR ("public"."is_current_user_leader"() AND "public"."is_person_owned_by_current_user"("person_id")))) WITH CHECK (("public"."is_current_user_admin"() OR ("public"."is_current_user_leader"() AND "public"."is_person_owned_by_current_user"("person_id"))));



CREATE POLICY "people_update_admin_or_owner" ON "public"."people" FOR UPDATE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))));



ALTER TABLE "public"."profile_leaderships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_leaderships_delete_admin" ON "public"."profile_leaderships" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "profile_leaderships_insert_admin_or_self" ON "public"."profile_leaderships" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))) OR ("profile_id" = "auth"."uid"())));



CREATE POLICY "profile_leaderships_select_all" ON "public"."profile_leaderships" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "profile_leaderships_update_admin_or_self" ON "public"."profile_leaderships" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))) OR ("profile_id" = "auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))) OR ("profile_id" = "auth"."uid"())));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_admin" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'ADMIN'::"text")))));



CREATE POLICY "profiles_delete_simple" ON "public"."profiles" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'ADMIN'::"text")))));



CREATE POLICY "profiles_insert_admin" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'ADMIN'::"text")))));



CREATE POLICY "profiles_select_all" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update_admin_or_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'ADMIN'::"text")))) OR ("id" = "auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'ADMIN'::"text")))) OR ("id" = "auth"."uid"())));



ALTER TABLE "public"."public_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_settings_admin" ON "public"."public_settings" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



CREATE POLICY "public_settings_select_authenticated" ON "public"."public_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "public_settings_write_admin" ON "public"."public_settings" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tags_delete_admin" ON "public"."tags" FOR DELETE TO "authenticated" USING ("public"."is_current_user_admin"());



CREATE POLICY "tags_insert_admin" ON "public"."tags" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_current_user_admin"());



CREATE POLICY "tags_select_active" ON "public"."tags" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "tags_update_admin" ON "public"."tags" FOR UPDATE TO "authenticated" USING ("public"."is_current_user_admin"()) WITH CHECK ("public"."is_current_user_admin"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."activate_leader"() TO "anon";
GRANT ALL ON FUNCTION "public"."activate_leader"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_leader"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."app_is_admin"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."app_is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_tag_to_person"("p_person_id" "uuid", "p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_tag_to_person"("p_person_id" "uuid", "p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_tag_to_person"("p_person_id" "uuid", "p_tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_sensitive_tag"("tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_sensitive_tag"("tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_sensitive_tag"("tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tags_seeds"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_tags_seeds"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tags_seeds"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_tag"("p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_tag"("p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_tag"("p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_leader"("leader_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_leader"("leader_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_leader"("leader_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tag"("p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tag"("p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tag"("p_tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."election_settings_normalize"() TO "anon";
GRANT ALL ON FUNCTION "public"."election_settings_normalize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."election_settings_normalize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."election_settings_upsert_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."election_settings_upsert_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."election_settings_upsert_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_leader_target_from_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_leader_target_from_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_leader_target_from_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_tags_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_tags_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_tags_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_tags"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_tags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_tags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_election"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_election"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_effective_goal"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_effective_goal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_effective_goal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_goal_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_goal_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_goal_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_person_tags"("person_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_person_tags"("person_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_person_tags"("person_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_leaders"("limit_count" integer, "filter_city" "text", "filter_state" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_current_user_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_current_user_leader"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_leader"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_leader"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_person_owned_by_current_user"("person_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_person_owned_by_current_user"("person_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_person_owned_by_current_user"("person_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."leader_profiles_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."leader_profiles_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."leader_profiles_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."norm_scope_state"() TO "anon";
GRANT ALL ON FUNCTION "public"."norm_scope_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."norm_scope_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_leader_activated_mark_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_leader_activated_mark_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_leader_activated_mark_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."people_set_full_name_fts"() TO "anon";
GRANT ALL ON FUNCTION "public"."people_set_full_name_fts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."people_set_full_name_fts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."people_set_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."people_set_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."people_set_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reactivate_leader"("leader_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reactivate_leader"("leader_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reactivate_leader"("leader_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_tag_from_person"("p_person_id" "uuid", "p_tag_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_tag_from_person"("p_person_id" "uuid", "p_tag_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_tag_from_person"("p_person_id" "uuid", "p_tag_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_people"("q" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_people"("q" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_people"("q" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_people_with_tags"("q" "text", "tag_ids" "uuid"[], "mode" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_people_with_tags"("q" "text", "tag_ids" "uuid"[], "mode" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_people_with_tags"("q" "text", "tag_ids" "uuid"[], "mode" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_leader_accepted_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_leader_accepted_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_leader_accepted_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_public_settings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_public_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_public_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."to_uf"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."to_uf"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."to_uf"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_tag_status"("p_tag_id" "uuid", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_tag_status"("p_tag_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_tag_status"("p_tag_id" "uuid", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_sync_public_settings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_sync_public_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sync_public_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tag"("p_tag_id" "uuid", "p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_tag"("p_tag_id" "uuid", "p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tag"("p_tag_id" "uuid", "p_name" "text", "p_description" "text", "p_color" "text", "p_is_sensitive" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_leader_target_from_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_leader_target_from_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_leader_target_from_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_full_name"("name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_full_name"("name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_full_name"("name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_tags_grants"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_tags_grants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_tags_grants"() TO "service_role";



GRANT ALL ON TABLE "public"."app_admins" TO "anon";
GRANT ALL ON TABLE "public"."app_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."app_admins" TO "service_role";



GRANT ALL ON TABLE "public"."leader_profiles" TO "anon";
GRANT ALL ON TABLE "public"."leader_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."leader_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."app_leaders_list" TO "anon";
GRANT ALL ON TABLE "public"."app_leaders_list" TO "authenticated";
GRANT ALL ON TABLE "public"."app_leaders_list" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."city_goals" TO "anon";
GRANT ALL ON TABLE "public"."city_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."city_goals" TO "service_role";



GRANT ALL ON TABLE "public"."election_settings" TO "anon";
GRANT ALL ON TABLE "public"."election_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."election_settings" TO "service_role";



GRANT ALL ON TABLE "public"."invite_tokens" TO "anon";
GRANT ALL ON TABLE "public"."invite_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."leader_areas" TO "anon";
GRANT ALL ON TABLE "public"."leader_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."leader_areas" TO "service_role";



GRANT ALL ON TABLE "public"."leader_targets" TO "anon";
GRANT ALL ON TABLE "public"."leader_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."leader_targets" TO "service_role";



GRANT ALL ON TABLE "public"."neighborhood_goals" TO "anon";
GRANT ALL ON TABLE "public"."neighborhood_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."neighborhood_goals" TO "service_role";



GRANT ALL ON TABLE "public"."org_settings" TO "anon";
GRANT ALL ON TABLE "public"."org_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."org_settings" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."people_tags" TO "anon";
GRANT ALL ON TABLE "public"."people_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."people_tags" TO "service_role";



GRANT ALL ON TABLE "public"."profile_leaderships" TO "anon";
GRANT ALL ON TABLE "public"."profile_leaderships" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_leaderships" TO "service_role";



GRANT ALL ON TABLE "public"."public_settings" TO "anon";
GRANT ALL ON TABLE "public"."public_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."public_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."vw_people_with_tags" TO "anon";
GRANT ALL ON TABLE "public"."vw_people_with_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_people_with_tags" TO "service_role";



GRANT ALL ON TABLE "public"."vw_votes_by_city" TO "anon";
GRANT ALL ON TABLE "public"."vw_votes_by_city" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_votes_by_city" TO "service_role";



GRANT ALL ON TABLE "public"."vw_projection_city_compat" TO "anon";
GRANT ALL ON TABLE "public"."vw_projection_city_compat" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_projection_city_compat" TO "service_role";



GRANT ALL ON TABLE "public"."vw_votes_by_neighborhood" TO "anon";
GRANT ALL ON TABLE "public"."vw_votes_by_neighborhood" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_votes_by_neighborhood" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
