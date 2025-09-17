-- Criação de tabelas para sistema de tags
-- Versão final funcional - aplicada e testada

-- Tabela principal de tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text,
  is_active boolean DEFAULT true,
  is_sensitive boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Constraint de nome único
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tags_name_key' 
    AND table_name = 'tags' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_name_key UNIQUE (name);
  END IF;
END $$;

-- Tabela de relação N:N entre pessoas e tags
CREATE TABLE IF NOT EXISTS public.people_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Constraint de unicidade para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'people_tags_unique' 
    AND table_name = 'people_tags' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.people_tags ADD CONSTRAINT people_tags_unique UNIQUE (person_id, tag_id);
  END IF;
END $$;

-- Índices para performance
DO $$
BEGIN
  -- Índice para nome das tags (busca)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tags_name') THEN
    CREATE INDEX idx_tags_name ON public.tags (name);
  END IF;

  -- Índice parcial para tags ativas (performance)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tags_active') THEN
    CREATE INDEX idx_tags_active ON public.tags (is_active) WHERE is_active = true;
  END IF;

  -- Índices para people_tags (JOINs e buscas)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_people_tags_person_id') THEN
    CREATE INDEX idx_people_tags_person_id ON public.people_tags (person_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_people_tags_tag_id') THEN
    CREATE INDEX idx_people_tags_tag_id ON public.people_tags (tag_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_people_tags_created_by') THEN
    CREATE INDEX idx_people_tags_created_by ON public.people_tags (created_by);
  END IF;
END $$;

-- Triggers para updated_at (usando função existente set_updated_at)
DO $$
BEGIN
  -- Trigger para tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_tags_updated_at' 
    AND event_object_table = 'tags'
  ) THEN
    CREATE TRIGGER trg_tags_updated_at
      BEFORE UPDATE ON public.tags
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  -- Trigger para people_tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trg_people_tags_updated_at' 
    AND event_object_table = 'people_tags'
  ) THEN
    CREATE TRIGGER trg_people_tags_updated_at
      BEFORE UPDATE ON public.people_tags
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE public.tags IS 'Catálogo global de tags para categorizar pessoas';
COMMENT ON TABLE public.people_tags IS 'Relação N:N entre pessoas e tags aplicadas';

COMMENT ON COLUMN public.tags.name IS 'Nome único da tag (ex: Empresário, Estudante)';
COMMENT ON COLUMN public.tags.description IS 'Descrição opcional da tag';
COMMENT ON COLUMN public.tags.color IS 'Cor da tag em hexadecimal (ex: #FF6B6B)';
COMMENT ON COLUMN public.tags.is_active IS 'Se false, tag não aparece para seleção';
COMMENT ON COLUMN public.tags.is_sensitive IS 'Se true, apenas admins podem ver (LGPD)';

COMMENT ON COLUMN public.people_tags.person_id IS 'ID da pessoa que recebeu a tag';
COMMENT ON COLUMN public.people_tags.tag_id IS 'ID da tag aplicada';
COMMENT ON COLUMN public.people_tags.created_by IS 'Usuário que aplicou a tag';