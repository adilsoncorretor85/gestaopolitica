-- Create election_settings table
CREATE TABLE IF NOT EXISTS public.election_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_name text NOT NULL,
  election_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  election_type text NOT NULL CHECK (election_type IN ('MUNICIPAL', 'ESTADUAL', 'FEDERAL')),
  uf text, -- 'SC', 'SP', etc.
  city text, -- 'Joinville', etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.election_settings ENABLE ROW LEVEL SECURITY;

-- Create update trigger
DROP TRIGGER IF EXISTS update_election_settings_updated_at ON public.election_settings;
CREATE TRIGGER update_election_settings_updated_at
  BEFORE UPDATE ON public.election_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies - Allow all authenticated users to read, only admins to write
DROP POLICY IF EXISTS election_settings_select_all ON public.election_settings;
CREATE POLICY election_settings_select_all
  ON public.election_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS election_settings_insert_admin ON public.election_settings;
CREATE POLICY election_settings_insert_admin
  ON public.election_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS election_settings_update_admin ON public.election_settings;
CREATE POLICY election_settings_update_admin
  ON public.election_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- Insert default election settings
INSERT INTO public.election_settings (election_name, election_date, election_type, uf, city)
VALUES ('Eleições 2026', '2026-10-05', 'FEDERAL', null, null)
ON CONFLICT DO NOTHING;
