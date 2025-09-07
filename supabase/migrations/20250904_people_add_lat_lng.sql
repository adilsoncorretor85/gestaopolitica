-- Adicionar campos de latitude e longitude na tabela people
ALTER TABLE public.people 
ADD COLUMN latitude numeric NULL,
ADD COLUMN longitude numeric NULL;

-- Criar índice para owner_id
CREATE INDEX IF NOT EXISTS people_owner_idx ON public.people (owner_id);

-- Comentários para documentação
COMMENT ON COLUMN public.people.latitude IS 'Latitude geográfica do endereço da pessoa';
COMMENT ON COLUMN public.people.longitude IS 'Longitude geográfica do endereço da pessoa';

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration 20250904_people_add_lat_lng completed successfully';
    RAISE NOTICE 'Added latitude and longitude columns to people table';
    RAISE NOTICE 'Created people_owner_idx index on owner_id column';
END $$;

