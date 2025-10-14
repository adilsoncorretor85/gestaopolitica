-- Corrigir constraints duplicadas

-- Remover constraint duplicada em tags
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_name_key;
