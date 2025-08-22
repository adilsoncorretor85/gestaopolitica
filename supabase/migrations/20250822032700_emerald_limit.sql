/*
  # Create contacts table

  1. New Tables
    - `contacts`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references profiles.id)
      - `nome` (text, required)
      - `telefone` (text, required)
      - `endereco` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `contacts` table
    - Add policies for CRUD operations based on owner_id and admin role
  
  3. Indexes
    - Add index on owner_id for performance
    - Add index on nome for search functionality
*/

-- Create contacts table
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL,
  endereco text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS contacts_owner_idx ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS contacts_nome_idx ON public.contacts USING gin (to_tsvector('simple', nome));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
DROP POLICY IF EXISTS contacts_select_self_or_admin ON public.contacts;
CREATE POLICY contacts_select_self_or_admin
  ON public.contacts
  FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS contacts_insert_self_or_admin ON public.contacts;
CREATE POLICY contacts_insert_self_or_admin
  ON public.contacts
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS contacts_update_self_or_admin ON public.contacts;
CREATE POLICY contacts_update_self_or_admin
  ON public.contacts
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS contacts_delete_self_or_admin ON public.contacts;
CREATE POLICY contacts_delete_self_or_admin
  ON public.contacts
  FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );