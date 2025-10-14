-- Substituir completamente o schema local pelo schema online
-- Primeiro, remover todas as tabelas existentes

DROP TABLE IF EXISTS public.people_tags CASCADE;
DROP TABLE IF EXISTS public.people CASCADE;
DROP TABLE IF EXISTS public.leader_areas CASCADE;
DROP TABLE IF EXISTS public.leader_profiles CASCADE;
DROP TABLE IF EXISTS public.leader_targets CASCADE;
DROP TABLE IF EXISTS public.invite_tokens CASCADE;
DROP TABLE IF EXISTS public.neighborhood_goals CASCADE;
DROP TABLE IF EXISTS public.city_goals CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.profile_leaderships CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.app_admins CASCADE;
DROP TABLE IF EXISTS public.election_settings CASCADE;
DROP TABLE IF EXISTS public.org_settings CASCADE;
DROP TABLE IF EXISTS public.public_settings CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Recriar tabelas com o schema correto do online

-- 1. Tabela app_admins
CREATE TABLE public.app_admins (
  user_id uuid NOT NULL,
  note text,
  CONSTRAINT app_admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 2. Tabela profiles (precisa vir antes de audit_logs)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'LEADER'::text CHECK (role = ANY (ARRAY['ADMIN'::text, 'LEADER'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 3. Tabela audit_logs
CREATE SEQUENCE public.audit_logs_id_seq;
CREATE TABLE public.audit_logs (
  id bigint NOT NULL DEFAULT nextval('public.audit_logs_id_seq'::regclass),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text])),
  actor_id uuid,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);

-- 3. Tabela city_goals
CREATE TABLE public.city_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  goal_total integer NOT NULL CHECK (goal_total > 0),
  deadline date,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT city_goals_pkey PRIMARY KEY (id),
  CONSTRAINT city_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT city_goals_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);

-- 4. Tabela election_settings
CREATE TABLE public.election_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  election_name text NOT NULL,
  election_date date NOT NULL,
  timezone text DEFAULT 'America/Sao_Paulo'::text,
  election_type text NOT NULL CHECK (election_type = ANY (ARRAY['MUNICIPAL'::text, 'ESTADUAL'::text, 'FEDERAL'::text])),
  uf text,
  city text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  election_level text CHECK (election_level = ANY (ARRAY['MUNICIPAL'::text, 'ESTADUAL'::text, 'FEDERAL'::text])),
  scope_state text,
  scope_city text,
  scope_city_ibge text,
  CONSTRAINT election_settings_pkey PRIMARY KEY (id)
);

-- 5. Tabela invite_tokens
CREATE TABLE public.invite_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'LEADER'::text,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_by uuid,
  accepted_at timestamp with time zone,
  leader_profile_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  data jsonb,
  CONSTRAINT invite_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT invite_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT invite_tokens_leader_profile_id_fkey FOREIGN KEY (leader_profile_id) REFERENCES public.profiles(id),
  CONSTRAINT invite_tokens_role_check CHECK (role = ANY (ARRAY['ADMIN'::text, 'LEADER'::text]))
);

-- 6. Tabela leader_areas
CREATE TABLE public.leader_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  neighborhood text,
  target integer CHECK (target > 0),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leader_areas_pkey PRIMARY KEY (id),
  CONSTRAINT leader_areas_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id)
);

-- 7. Tabela leader_profiles
CREATE TABLE public.leader_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  phone text,
  birth_date date,
  gender text CHECK (gender = ANY (ARRAY['M'::text, 'F'::text, 'O'::text])),
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  notes text,
  status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'INACTIVE'::text])),
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  goal integer DEFAULT 100,
  accepted_at timestamp with time zone,
  CONSTRAINT leader_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT leader_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id)
);

-- 8. Tabela leader_targets
CREATE TABLE public.leader_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL UNIQUE,
  goal integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leader_targets_pkey PRIMARY KEY (id),
  CONSTRAINT leader_targets_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id)
);

-- 9. Tabela neighborhood_goals
CREATE TABLE public.neighborhood_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text NOT NULL,
  neighborhood text NOT NULL,
  goal_total integer NOT NULL CHECK (goal_total > 0),
  city_goal_id uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT neighborhood_goals_pkey PRIMARY KEY (id),
  CONSTRAINT neighborhood_goals_city_goal_id_fkey FOREIGN KEY (city_goal_id) REFERENCES public.city_goals(id),
  CONSTRAINT neighborhood_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT neighborhood_goals_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id)
);

-- 10. Tabela org_settings
CREATE TABLE public.org_settings (
  id integer NOT NULL DEFAULT 1,
  default_goal integer DEFAULT 100,
  organization_name text DEFAULT 'Organização Política'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT org_settings_pkey PRIMARY KEY (id)
);

-- 11. Tabela tags (precisa vir antes de people_tags)
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text,
  is_active boolean DEFAULT true,
  is_sensitive boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- 12. Tabela people
CREATE TABLE public.people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  full_name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  facebook text,
  instagram text,
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  notes text,
  latitude numeric,
  longitude numeric,
  vote_status text DEFAULT 'INDEFINIDO'::text CHECK (vote_status = ANY (ARRAY['CONFIRMADO'::text, 'PROVAVEL'::text, 'INDEFINIDO'::text])),
  contacted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  full_name_fts tsvector,
  birth_date date,
  treatment text,
  gender text CHECK (gender = ANY (ARRAY['M'::text, 'F'::text, 'O'::text])),
  CONSTRAINT people_pkey PRIMARY KEY (id),
  CONSTRAINT people_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);

-- 13. Tabela people_tags
CREATE TABLE public.people_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT people_tags_pkey PRIMARY KEY (id),
  CONSTRAINT people_tags_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id),
  CONSTRAINT people_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id),
  CONSTRAINT people_tags_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- 13. Tabela profile_leaderships
CREATE TABLE public.profile_leaderships (
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

-- 14. Tabela profiles (já criada acima)

-- 15. Tabela public_settings
CREATE TABLE public.public_settings (
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

-- 16. Tabela tags (já criada acima)
