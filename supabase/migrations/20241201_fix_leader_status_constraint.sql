-- Corrigir constraint de status na tabela leader_profiles
-- Adicionar PENDING como status válido

-- Primeiro, remover o constraint existente
ALTER TABLE public.leader_profiles 
DROP CONSTRAINT IF EXISTS leader_profiles_status_check;

-- Adicionar o novo constraint que inclui PENDING
ALTER TABLE public.leader_profiles 
ADD CONSTRAINT leader_profiles_status_check 
CHECK (status IN ('PENDING', 'INVITED', 'ACTIVE', 'INACTIVE'));

-- Comentário sobre os status
COMMENT ON COLUMN public.leader_profiles.status IS 'Status do líder: PENDING (convite enviado, aguardando primeiro login), INVITED (convite enviado), ACTIVE (ativo), INACTIVE (inativo/banido)';
