-- Adicionar constraint UNIQUE na coluna owner_profile_id da tabela gcal_accounts
-- Isso permite que o upsert funcione corretamente

-- 1. Primeiro, garantir que não há duplicatas (caso existam, manter só a mais recente)
DELETE FROM gcal_accounts a
USING gcal_accounts b
WHERE a.owner_profile_id = b.owner_profile_id
  AND a.created_at < b.created_at;

-- 2. Adicionar a constraint UNIQUE
ALTER TABLE gcal_accounts 
  ADD CONSTRAINT gcal_accounts_owner_profile_id_key 
  UNIQUE (owner_profile_id);

-- 3. Confirmar que a constraint foi criada
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'gcal_accounts'::regclass
  AND conname = 'gcal_accounts_owner_profile_id_key';




