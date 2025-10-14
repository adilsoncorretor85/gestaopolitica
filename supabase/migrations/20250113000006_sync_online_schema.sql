-- Sincronizar schema local com o online
-- Adicionar tabelas que estão faltando

-- 1. Criar tabela app_admins
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid NOT NULL,
  note text,
  CONSTRAINT app_admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 2. Criar tabela leader_targets
CREATE TABLE IF NOT EXISTS public.leader_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL UNIQUE,
  goal integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leader_targets_pkey PRIMARY KEY (id),
  CONSTRAINT leader_targets_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id)
);

-- 3. Criar tabela org_settings
CREATE TABLE IF NOT EXISTS public.org_settings (
  id integer NOT NULL DEFAULT 1,
  default_goal integer DEFAULT 100,
  organization_name text DEFAULT 'Organização Política'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT org_settings_pkey PRIMARY KEY (id)
);

-- 4. Criar tabela profile_leaderships
CREATE TABLE IF NOT EXISTS public.profile_leaderships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  role_code text NOT NULL,
  level integer,
  reach_scope text CHECK (reach_scope = ANY (ARRAY['FAMILIA'::text, 'BAIRRO'::text, 'CIDADE'::text, 'REGIAO'::text, 'ONLINE'::text])),
  reach_size integer,
  organization text,
  title text,
  extra jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_leaderships_pkey PRIMARY KEY (id),
  CONSTRAINT profile_leaderships_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

-- 5. Criar tabela public_settings
CREATE TABLE IF NOT EXISTS public.public_settings (
  id integer NOT NULL DEFAULT 1,
  organization_name text,
  default_goal integer DEFAULT 100,
  election_name text,
  election_date date,
  timezone text DEFAULT 'America/Sao_Paulo'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  election_level text,
  scope_state text,
  scope_city text,
  scope_city_ibge bigint,
  CONSTRAINT public_settings_pkey PRIMARY KEY (id)
);

-- 6. Corrigir tabela city_goals (renomear goal para goal_total e adicionar campos)
ALTER TABLE public.city_goals 
  RENAME COLUMN goal TO goal_total;

ALTER TABLE public.city_goals 
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Adicionar constraint para goal_total > 0 (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'city_goals_goal_total_check'
    ) THEN
        ALTER TABLE public.city_goals 
        ADD CONSTRAINT city_goals_goal_total_check CHECK (goal_total > 0);
    END IF;
END $$;

-- Adicionar foreign key para updated_by (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'city_goals_updated_by_fkey'
    ) THEN
        ALTER TABLE public.city_goals 
        ADD CONSTRAINT city_goals_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 7. Corrigir tabela election_settings (adicionar campos que estão faltando)
ALTER TABLE public.election_settings 
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo'::text,
  ADD COLUMN IF NOT EXISTS election_type text,
  ADD COLUMN IF NOT EXISTS uf text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS election_level text,
  ADD COLUMN IF NOT EXISTS scope_state text,
  ADD COLUMN IF NOT EXISTS scope_city text,
  ADD COLUMN IF NOT EXISTS scope_city_ibge text;

-- Adicionar constraints para election_type e election_level (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'election_settings_election_type_check'
    ) THEN
        ALTER TABLE public.election_settings 
        ADD CONSTRAINT election_settings_election_type_check 
        CHECK (election_type = ANY (ARRAY['MUNICIPAL'::text, 'ESTADUAL'::text, 'FEDERAL'::text]));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'election_settings_election_level_check'
    ) THEN
        ALTER TABLE public.election_settings 
        ADD CONSTRAINT election_settings_election_level_check 
        CHECK (election_level = ANY (ARRAY['MUNICIPAL'::text, 'ESTADUAL'::text, 'FEDERAL'::text]));
    END IF;
END $$;

-- 8. Corrigir tabela tags (adicionar campos que estão faltando)
ALTER TABLE public.tags 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_sensitive boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Adicionar constraint unique para name (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tags_name_unique'
    ) THEN
        ALTER TABLE public.tags 
        ADD CONSTRAINT tags_name_unique UNIQUE (name);
    END IF;
END $$;

-- 9. Corrigir tabela people (adicionar campos que estão faltando)
ALTER TABLE public.people 
  ADD COLUMN IF NOT EXISTS treatment text,
  ADD COLUMN IF NOT EXISTS gender text;

-- Adicionar constraint para gender (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'people_gender_check'
    ) THEN
        ALTER TABLE public.people 
        ADD CONSTRAINT people_gender_check 
        CHECK (gender = ANY (ARRAY['M'::text, 'F'::text, 'O'::text]));
    END IF;
END $$;

-- 10. Corrigir tabela leader_profiles (adicionar campos que estão faltando)
ALTER TABLE public.leader_profiles 
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS complement text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS goal integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

-- Adicionar constraints para leader_profiles (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leader_profiles_gender_check'
    ) THEN
        ALTER TABLE public.leader_profiles 
        ADD CONSTRAINT leader_profiles_gender_check 
        CHECK (gender = ANY (ARRAY['M'::text, 'F'::text, 'O'::text]));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leader_profiles_status_check'
    ) THEN
        ALTER TABLE public.leader_profiles 
        ADD CONSTRAINT leader_profiles_status_check 
        CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'INACTIVE'::text]));
    END IF;
END $$;

-- 11. Corrigir tabela neighborhood_goals (adicionar campos que estão faltando)
ALTER TABLE public.neighborhood_goals 
  ADD COLUMN IF NOT EXISTS goal_total integer,
  ADD COLUMN IF NOT EXISTS city_goal_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Atualizar goal_total com o valor de goal se existir
UPDATE public.neighborhood_goals 
SET goal_total = goal 
WHERE goal_total IS NULL AND goal IS NOT NULL;

-- Remover coluna goal antiga
ALTER TABLE public.neighborhood_goals 
  DROP COLUMN IF EXISTS goal;

-- Adicionar constraint para goal_total > 0 (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'neighborhood_goals_goal_total_check'
    ) THEN
        ALTER TABLE public.neighborhood_goals 
        ADD CONSTRAINT neighborhood_goals_goal_total_check CHECK (goal_total > 0);
    END IF;
END $$;

-- Adicionar foreign keys (se não existirem)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'neighborhood_goals_city_goal_id_fkey'
    ) THEN
        ALTER TABLE public.neighborhood_goals 
        ADD CONSTRAINT neighborhood_goals_city_goal_id_fkey 
        FOREIGN KEY (city_goal_id) REFERENCES public.city_goals(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'neighborhood_goals_updated_by_fkey'
    ) THEN
        ALTER TABLE public.neighborhood_goals 
        ADD CONSTRAINT neighborhood_goals_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 12. Corrigir tabela invite_tokens (adicionar campos que estão faltando)
ALTER TABLE public.invite_tokens 
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'LEADER'::text,
  ADD COLUMN IF NOT EXISTS data jsonb;

-- Adicionar constraint para role (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invite_tokens_role_check'
    ) THEN
        ALTER TABLE public.invite_tokens 
        ADD CONSTRAINT invite_tokens_role_check 
        CHECK (role = ANY (ARRAY['ADMIN'::text, 'LEADER'::text]));
    END IF;
END $$;

-- 13. Corrigir tabela leader_areas (adicionar campos que estão faltando)
ALTER TABLE public.leader_areas 
  ADD COLUMN IF NOT EXISTS target integer,
  ADD COLUMN IF NOT EXISTS notes text;

-- Adicionar constraint para target > 0 (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leader_areas_target_check'
    ) THEN
        ALTER TABLE public.leader_areas 
        ADD CONSTRAINT leader_areas_target_check CHECK (target > 0);
    END IF;
END $$;

-- 14. Corrigir tabela profiles (adicionar constraint para role se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_role_check 
        CHECK (role = ANY (ARRAY['ADMIN'::text, 'LEADER'::text]));
    END IF;
END $$;

-- 15. Corrigir tabela people (adicionar constraint para vote_status se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'people_vote_status_check'
    ) THEN
        ALTER TABLE public.people 
        ADD CONSTRAINT people_vote_status_check 
        CHECK (vote_status = ANY (ARRAY['CONFIRMADO'::text, 'PROVAVEL'::text, 'INDEFINIDO'::text]));
    END IF;
END $$;

-- 16. Corrigir tabela audit_logs (adicionar constraint para action se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'audit_logs_action_check'
    ) THEN
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT audit_logs_action_check 
        CHECK (action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text]));
    END IF;
END $$;