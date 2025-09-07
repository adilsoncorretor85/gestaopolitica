-- PROFILE LEADERSHIPS TABLE
-- Execute este SQL no painel do Supabase: https://supabase.com/dashboard/project/ojxwwjurwhwtoydywvch/sql

CREATE TABLE IF NOT EXISTS public.profile_leaderships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_code text NOT NULL,
  organization text,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id) -- Garante apenas 1 registro por líder
);

-- Enable RLS
ALTER TABLE public.profile_leaderships ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS profile_leaderships_profile_id_idx ON public.profile_leaderships(profile_id);
CREATE INDEX IF NOT EXISTS profile_leaderships_role_code_idx ON public.profile_leaderships(role_code);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_profile_leaderships_updated_at ON public.profile_leaderships;
CREATE TRIGGER update_profile_leaderships_updated_at
  BEFORE UPDATE ON public.profile_leaderships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES - ADMIN e o próprio líder podem acessar
DROP POLICY IF EXISTS "profile_leaderships_select_self_or_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_select_self_or_admin"
  ON public.profile_leaderships
  FOR SELECT
  USING (
    profile_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "profile_leaderships_update_self_or_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_update_self_or_admin"
  ON public.profile_leaderships
  FOR UPDATE
  USING (
    profile_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "profile_leaderships_insert_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_insert_admin"
  ON public.profile_leaderships
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS "profile_leaderships_delete_admin" ON public.profile_leaderships;
CREATE POLICY "profile_leaderships_delete_admin"
  ON public.profile_leaderships
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Tabela profile_leaderships criada com sucesso!';
    RAISE NOTICE 'Colunas: id, profile_id, role_code, organization, title, created_at, updated_at';
    RAISE NOTICE 'Constraint UNIQUE em profile_id (1 registro por líder)';
    RAISE NOTICE 'RLS habilitado com políticas para ADMIN e próprio líder';
END $$;

