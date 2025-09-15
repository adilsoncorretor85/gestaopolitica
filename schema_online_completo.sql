

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


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "graphql_public";


ALTER SCHEMA "graphql_public" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "public"."election_level_enum" AS ENUM (
    'MUNICIPAL',
    'ESTADUAL',
    'FEDERAL'
);


ALTER TYPE "public"."election_level_enum" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



CREATE OR REPLACE FUNCTION "public"."activate_leader"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_email      text;
  v_full_name  text;
  v_now        timestamptz := now();
  v_upd_count  int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- Buscar email e nome diretamente do auth.users (sem função auxiliar)
  SELECT 
    au.email::text,
    COALESCE(au.raw_user_meta_data->>'full_name', '')::text
  INTO v_email, v_full_name
  FROM auth.users au
  WHERE au.id = v_uid;

  -- verificar se email foi obtido
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Email não encontrado no auth.users para o usuário: ' || v_uid::text);
  END IF;

  -- garante profiles (idempotente). Se já existir, mantém role atual.
  INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
  VALUES (v_uid, v_email, 'LEADER', COALESCE(v_full_name, ''), v_now, v_now)
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(excluded.email, public.profiles.email),
        full_name = COALESCE(excluded.full_name, public.profiles.full_name),
        updated_at = v_now;

  -- sinaliza para eventuais triggers "guard" que esta atualização é uma ativação legítima
  PERFORM set_config('app.allow_self_activation','on', true);

  -- garante leader_profiles e ativa
  INSERT INTO public.leader_profiles (id, email, status, accepted_at, created_at, updated_at)
  VALUES (v_uid, v_email, 'ACTIVE', v_now, v_now, v_now)
  ON CONFLICT (id) DO UPDATE
    SET email       = COALESCE(excluded.email, public.leader_profiles.email),
        status      = 'ACTIVE',
        accepted_at = COALESCE(public.leader_profiles.accepted_at, v_now),
        updated_at  = v_now;

  GET DIAGNOSTICS v_upd_count = row_count;

  -- retorno amigável
  RETURN jsonb_build_object(
    'ok', true,
    'user_id', v_uid,
    'activated', (v_upd_count IS NOT NULL),
    'email', v_email
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', sqlstate || ' ' || sqlerrm);
END
$$;


ALTER FUNCTION "public"."activate_leader"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."activate_leader"() IS 'Ativa líder no sistema - SECURITY DEFINER bypassa RLS (versão simples sem função auxiliar)';



CREATE OR REPLACE FUNCTION "public"."app_is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = uid);
$$;


ALTER FUNCTION "public"."app_is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."election_settings_normalize"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_clean_ibge text;
BEGIN
  -- timezone default e trim
  IF NEW.timezone IS NULL OR btrim(NEW.timezone) = '' THEN
    NEW.timezone := 'America/Sao_Paulo';
  ELSE
    NEW.timezone := btrim(NEW.timezone);
  END IF;

  -- espelhar level/type e uppercase
  IF NEW.election_level IS NULL AND NEW.election_type IS NOT NULL THEN
    NEW.election_level := NEW.election_type;
  ELSIF NEW.election_type IS NULL AND NEW.election_level IS NOT NULL THEN
    NEW.election_type := NEW.election_level;
  END IF;

  IF NEW.election_level IS NOT NULL THEN
    NEW.election_level := upper(btrim(NEW.election_level));
  END IF;
  IF NEW.election_type IS NOT NULL THEN
    NEW.election_type := upper(btrim(NEW.election_type));
  END IF;

  -- validar domínio (erro claro caso payload inválido)
  IF NEW.election_level NOT IN ('MUNICIPAL','ESTADUAL','FEDERAL') THEN
    RAISE EXCEPTION 'invalid election_level: % (use MUNICIPAL|ESTADUAL|FEDERAL)', NEW.election_level
      USING ERRCODE = '22023';
  END IF;
  IF NEW.election_type NOT IN ('MUNICIPAL','ESTADUAL','FEDERAL') THEN
    RAISE EXCEPTION 'invalid election_type: % (use MUNICIPAL|ESTADUAL|FEDERAL)', NEW.election_type
      USING ERRCODE = '22023';
  END IF;

  -- UF/Cidade: normaliza vazio -> NULL e preenche escopo
  IF NEW.uf   IS NOT NULL THEN NEW.uf   := nullif(btrim(NEW.uf),'');   END IF;
  IF NEW.city IS NOT NULL THEN NEW.city := nullif(btrim(NEW.city),''); END IF;
  IF NEW.scope_state IS NULL THEN NEW.scope_state := NEW.uf;   END IF;
  IF NEW.scope_city  IS NULL THEN NEW.scope_city  := NEW.city; END IF;

  -- IBGE: manter apenas dígitos; se vazio vira NULL (coluna é TEXT)
  IF NEW.scope_city_ibge IS NOT NULL THEN
    v_clean_ibge := regexp_replace(NEW.scope_city_ibge::text, '[^0-9]', '', 'g');
    IF v_clean_ibge = '' THEN
      NEW.scope_city_ibge := NULL;
    ELSE
      NEW.scope_city_ibge := v_clean_ibge;
    END IF;
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
    SET "search_path" TO 'public'
    AS $$
DECLARE v_goal int;
BEGIN
  SELECT COALESCE(lp.goal, os.default_goal, 100)
  INTO v_goal
  FROM public.profiles p
  LEFT JOIN public.leader_profiles lp ON lp.id = p.id
  LEFT JOIN public.org_settings os ON os.id = 1
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_goal, 100);
END;
$$;


ALTER FUNCTION "public"."get_my_effective_goal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_goal_info"() RETURNS TABLE("user_id" "uuid", "role" "text", "my_goal" integer, "org_default_goal" integer, "effective_goal" integer, "source" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.role,
    lp.goal,
    os.default_goal,
    COALESCE(lp.goal, os.default_goal, 100) AS effective_goal,
    CASE WHEN lp.goal IS NOT NULL THEN 'LEADER' ELSE 'ORG_DEFAULT' END AS source
  FROM public.profiles p
  LEFT JOIN public.leader_profiles lp ON lp.id = p.id
  LEFT JOIN public.org_settings os ON os.id = 1
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_my_goal_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles(id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'LEADER')
  on conflict (id) do nothing;

  insert into public.leader_profiles(id, email, status)
  values (new.id, new.email, 'ACTIVE')
  on conflict (id) do nothing;

  return new;
end;
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


CREATE OR REPLACE FUNCTION "public"."leader_profiles_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF tg_op = 'UPDATE' THEN
    -- Se for atualização crítica, só admin ou ativação controlada pode mexer
    IF (new.status      IS DISTINCT FROM old.status)
       OR (new.email    IS DISTINCT FROM old.email)
       OR (new.accepted_at IS DISTINCT FROM old.accepted_at) THEN

       -- bypass para a função de ativação
       IF COALESCE(current_setting('app.allow_self_activation', true),'off') = 'on' THEN
         RETURN new;
       END IF;

       -- admin pode (usando a função existente)
       IF NOT public.app_is_admin(auth.uid()) THEN
         RAISE EXCEPTION 'blocked: only ADMIN or activation flow may change status/email/accepted_at';
       END IF;
    END IF;
  END IF;
  RETURN new;
END
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


CREATE OR REPLACE FUNCTION "public"."trigger_sync_public_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN 
  PERFORM public.sync_public_settings(); 
  RETURN COALESCE(NEW,OLD); 
END $$;


ALTER FUNCTION "public"."trigger_sync_public_settings"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret_hash" "text" NOT NULL,
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text"
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



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
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "goal" integer DEFAULT 100,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "leader_profiles_gender_check" CHECK (("gender" = ANY (ARRAY['M'::"text", 'F'::"text", 'O'::"text"]))),
    CONSTRAINT "leader_profiles_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
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
    CONSTRAINT "people_vote_status_check" CHECK (("vote_status" = ANY (ARRAY['CONFIRMADO'::"text", 'PROVAVEL'::"text", 'INDEFINIDO'::"text"])))
);


ALTER TABLE "public"."people" OWNER TO "postgres";


COMMENT ON TABLE "public"."people" IS 'Contatos e eleitores do sistema';



COMMENT ON COLUMN "public"."people"."vote_status" IS 'Status do voto: CONFIRMADO, PROVAVEL, INDEFINIDO';



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


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_city_state_neighborhood_key" UNIQUE ("city", "state", "neighborhood");



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_settings"
    ADD CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_leaderships"
    ADD CONSTRAINT "profile_leaderships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_settings"
    ADD CONSTRAINT "public_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_clients_client_id_idx" ON "auth"."oauth_clients" USING "btree" ("client_id");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "city_goals_city_state_idx" ON "public"."city_goals" USING "btree" ("city", "state");



CREATE INDEX "leader_areas_city_state_idx" ON "public"."leader_areas" USING "btree" ("city", "state");



CREATE INDEX "leader_areas_leader_idx" ON "public"."leader_areas" USING "btree" ("leader_id");



CREATE INDEX "neighborhood_goals_city_idx" ON "public"."neighborhood_goals" USING "btree" ("city");



CREATE INDEX "neighborhood_goals_city_state_idx" ON "public"."neighborhood_goals" USING "btree" ("city", "state");



CREATE INDEX "people_city_state_idx" ON "public"."people" USING "btree" ("city", "state");



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



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "Atualizar banco de dados" AFTER INSERT OR UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://n8n.adilson-martins-jlle.workers.dev/', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "es_set_updated_at" BEFORE UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "people_set_owner" BEFORE INSERT ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_set_owner"();



CREATE OR REPLACE TRIGGER "sync_public_settings_trigger" AFTER INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_public_settings"();



CREATE OR REPLACE TRIGGER "trg_election_settings_b1_normalize" BEFORE INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."election_settings_normalize"();



CREATE OR REPLACE TRIGGER "trg_election_settings_b2_upsert" BEFORE INSERT ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."election_settings_upsert_on_insert"();



CREATE OR REPLACE TRIGGER "trg_election_settings_updated_at" BEFORE UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_leader_profiles_guard" BEFORE UPDATE ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."leader_profiles_guard"();



CREATE OR REPLACE TRIGGER "trg_leader_profiles_updated_at" BEFORE UPDATE ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_norm_scope_state" BEFORE INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."norm_scope_state"();



CREATE OR REPLACE TRIGGER "trg_on_leader_activated_mark_invite" AFTER UPDATE OF "status" ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."on_leader_activated_mark_invite"();



CREATE OR REPLACE TRIGGER "trg_org_settings_updated_at" BEFORE UPDATE ON "public"."org_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_people_updated_at" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_public_settings_updated_at" BEFORE UPDATE ON "public"."public_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_set_leader_accepted_at" BEFORE UPDATE ON "public"."leader_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_leader_accepted_at"();



CREATE OR REPLACE TRIGGER "trg_sync_public_from_election" AFTER INSERT OR UPDATE ON "public"."election_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_public_settings"();



CREATE OR REPLACE TRIGGER "trg_sync_public_from_org" AFTER INSERT OR UPDATE ON "public"."org_settings" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_sync_public_settings"();



CREATE OR REPLACE TRIGGER "update_city_goals_updated_at" BEFORE UPDATE ON "public"."city_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_leader_areas_updated_at" BEFORE UPDATE ON "public"."leader_areas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_neighborhood_goals_updated_at" BEFORE UPDATE ON "public"."neighborhood_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profile_leaderships_updated_at" BEFORE UPDATE ON "public"."profile_leaderships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_city_goal_id_fkey" FOREIGN KEY ("city_goal_id") REFERENCES "public"."city_goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."neighborhood_goals"
    ADD CONSTRAINT "neighborhood_goals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_leaderships"
    ADD CONSTRAINT "profile_leaderships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


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



CREATE POLICY "public_settings_read" ON "public"."public_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "public_settings_read_auth" ON "public"."public_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "public_settings_read_authenticated" ON "public"."public_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "public_settings_write_admin" ON "public"."public_settings" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins"))) WITH CHECK (("auth"."uid"() IN ( SELECT "app_admins"."user_id"
   FROM "public"."app_admins")));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."activate_leader"() TO "anon";
GRANT ALL ON FUNCTION "public"."activate_leader"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_leader"() TO "service_role";



GRANT ALL ON FUNCTION "public"."app_is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."app_is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."app_is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."election_settings_normalize"() TO "anon";
GRANT ALL ON FUNCTION "public"."election_settings_normalize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."election_settings_normalize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."election_settings_upsert_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."election_settings_upsert_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."election_settings_upsert_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_election"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_election"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_election"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_effective_goal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_effective_goal"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_effective_goal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_effective_goal"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_goal_info"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_goal_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_goal_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_goal_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_leader_min"("p_full_name" "text", "p_email" "text", "p_expires_in_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."leader_profiles_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."leader_profiles_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."leader_profiles_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."norm_scope_state"() TO "anon";
GRANT ALL ON FUNCTION "public"."norm_scope_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."norm_scope_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_leader_activated_mark_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_leader_activated_mark_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_leader_activated_mark_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."people_set_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."people_set_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."people_set_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_leader_accepted_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_leader_accepted_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_leader_accepted_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_public_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_public_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_public_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."to_uf"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."to_uf"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."to_uf"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_sync_public_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_sync_public_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sync_public_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_election_current"("p_election_name" "text", "p_election_date" "date", "p_timezone" "text", "p_level_or_type" "text", "p_uf" "text", "p_city" "text", "p_city_ibge" "text") TO "service_role";



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



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



GRANT ALL ON TABLE "public"."neighborhood_goals" TO "anon";
GRANT ALL ON TABLE "public"."neighborhood_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."neighborhood_goals" TO "service_role";



GRANT ALL ON TABLE "public"."org_settings" TO "anon";
GRANT ALL ON TABLE "public"."org_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."org_settings" TO "service_role";



GRANT ALL ON TABLE "public"."people" TO "anon";
GRANT ALL ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT ALL ON TABLE "public"."profile_leaderships" TO "anon";
GRANT ALL ON TABLE "public"."profile_leaderships" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_leaderships" TO "service_role";



GRANT ALL ON TABLE "public"."public_settings" TO "anon";
GRANT ALL ON TABLE "public"."public_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."public_settings" TO "service_role";



GRANT ALL ON TABLE "public"."vw_votes_by_city" TO "anon";
GRANT ALL ON TABLE "public"."vw_votes_by_city" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_votes_by_city" TO "service_role";



GRANT ALL ON TABLE "public"."vw_projection_city_compat" TO "anon";
GRANT ALL ON TABLE "public"."vw_projection_city_compat" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_projection_city_compat" TO "service_role";



GRANT ALL ON TABLE "public"."vw_votes_by_neighborhood" TO "anon";
GRANT ALL ON TABLE "public"."vw_votes_by_neighborhood" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_votes_by_neighborhood" TO "service_role";



GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";












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






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";



RESET ALL;
