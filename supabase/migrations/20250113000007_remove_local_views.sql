-- Remover views que não existem no Supabase Online
-- Manter apenas o schema que está no online

-- Remover views locais que não existem no online
DROP VIEW IF EXISTS public.upcoming_birthdays;
DROP VIEW IF EXISTS public.city_stats;
DROP VIEW IF EXISTS public.leader_stats;
