-- Adicionar campo birth_date na tabela people
-- Para permitir que contatos também tenham data de nascimento, não apenas líderes

-- Adicionar a coluna birth_date
ALTER TABLE public.people 
ADD COLUMN IF NOT EXISTS birth_date date;

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.people.birth_date IS 'Data de nascimento da pessoa (opcional)';

-- Criar índice para melhorar performance em consultas de aniversários
CREATE INDEX IF NOT EXISTS idx_people_birth_date 
ON public.people (birth_date) 
WHERE birth_date IS NOT NULL;

-- Criar índice composto para consultas de aniversários por owner
CREATE INDEX IF NOT EXISTS idx_people_owner_birth_date 
ON public.people (owner_id, birth_date) 
WHERE birth_date IS NOT NULL;
