-- Adicionar campos de latitude e longitude na tabela leader_profiles
ALTER TABLE public.leader_profiles 
ADD COLUMN latitude numeric NULL,
ADD COLUMN longitude numeric NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.leader_profiles.latitude IS 'Latitude geográfica do endereço do líder';
COMMENT ON COLUMN public.leader_profiles.longitude IS 'Longitude geográfica do endereço do líder';

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration 20250115_add_lat_lng_leader_profiles completed successfully';
    RAISE NOTICE 'Added latitude and longitude columns to leader_profiles table';
END $$;



