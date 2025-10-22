-- Script para importar apenas dados das tabelas públicas
-- Ignorando tabelas de autenticação que podem causar conflitos

-- Limpar dados existentes das tabelas públicas
TRUNCATE TABLE public.people_tags CASCADE;
TRUNCATE TABLE public.people CASCADE;
TRUNCATE TABLE public.leader_areas CASCADE;
TRUNCATE TABLE public.leader_profiles CASCADE;
TRUNCATE TABLE public.leader_targets CASCADE;
TRUNCATE TABLE public.invite_tokens CASCADE;
TRUNCATE TABLE public.neighborhood_goals CASCADE;
TRUNCATE TABLE public.city_goals CASCADE;
TRUNCATE TABLE public.tags CASCADE;
TRUNCATE TABLE public.profile_leaderships CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.app_admins CASCADE;
TRUNCATE TABLE public.election_settings CASCADE;
TRUNCATE TABLE public.org_settings CASCADE;
TRUNCATE TABLE public.public_settings CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
