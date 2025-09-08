-- Adicionar coluna city_norm na tabela people
ALTER TABLE people ADD COLUMN city_norm TEXT;

-- Criar índice para melhor performance
CREATE INDEX idx_people_city_norm ON people(city_norm);

-- Função para normalizar cidade (remove todos os acentos)
CREATE OR REPLACE FUNCTION normalize_city(city_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF city_name IS NULL OR city_name = '' THEN
    RETURN '';
  END IF;
  
  RETURN lower(trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(city_name, '[áàâãä]', 'a', 'gi'),
                    '[éèêë]', 'e', 'gi'
                  ),
                  '[íìîï]', 'i', 'gi'
                ),
                '[óòôõö]', 'o', 'gi'
              ),
              '[úùûü]', 'u', 'gi'
            ),
            '[ç]', 'c', 'gi'
          ),
          '[ñ]', 'n', 'gi'
        ),
        '[ýÿ]', 'y', 'gi'
      ),
      '[ß]', 'ss', 'gi'
    ),
    '[^a-z0-9\s]', '', 'gi'
  )));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para atualizar city_norm automaticamente
CREATE OR REPLACE FUNCTION update_city_norm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.city_norm = normalize_city(NEW.city);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_update_city_norm ON people;
CREATE TRIGGER trigger_update_city_norm
  BEFORE INSERT OR UPDATE OF city ON people
  FOR EACH ROW
  EXECUTE FUNCTION update_city_norm();

-- Atualizar registros existentes
UPDATE people SET city_norm = normalize_city(city) WHERE city_norm IS NULL;
