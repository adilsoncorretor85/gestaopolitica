-- Script para remover a tabela gestaopoliticacontacts incorreta
-- Execute este script no painel do Supabase: SQL Editor

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'gestaopoliticacontacts'
) AS table_exists;

-- Remover a tabela se ela existir (com CASCADE para remover dependências)
DROP TABLE IF EXISTS public.gestaopoliticacontacts CASCADE;

-- Verificar se foi removida com sucesso
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'gestaopoliticacontacts'
) AS table_still_exists;

-- Listar todas as tabelas para confirmar a estrutura correta
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name NOT LIKE 'pg_%' 
AND table_name NOT LIKE 'sql_%'
ORDER BY table_name;

