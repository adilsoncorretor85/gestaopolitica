-- Script para criar triggers que preenchem created_by automaticamente
-- Execute este SQL no Supabase Dashboard: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql

-- Função para preencher created_by automaticamente
CREATE OR REPLACE FUNCTION set_created_by() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END $$;

-- Trigger para city_goals
DROP TRIGGER IF EXISTS tg_city_goals_created_by ON city_goals;
CREATE TRIGGER tg_city_goals_created_by
  BEFORE INSERT ON city_goals
  FOR EACH ROW 
  EXECUTE FUNCTION set_created_by();

-- Trigger para neighborhood_goals
DROP TRIGGER IF EXISTS tg_neigh_goals_created_by ON neighborhood_goals;
CREATE TRIGGER tg_neigh_goals_created_by
  BEFORE INSERT ON neighborhood_goals
  FOR EACH ROW 
  EXECUTE FUNCTION set_created_by();

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Triggers criados com sucesso!';
    RAISE NOTICE 'Agora created_by será preenchido automaticamente em INSERTs';
END $$;




















