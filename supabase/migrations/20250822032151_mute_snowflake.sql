/*
  # Leader Management System Migration

  1. New Tables
    - `leader_profiles` - Extended profile data for leaders
    - `invite_tokens` - Invitation tokens with expiration tracking
  
  2. Security
    - Enable RLS on both tables
    - Add policies for ADMIN/LEADER access control
  
  3. Triggers
    - Auto-update timestamps on leader_profiles
*/

-- Create leader_profiles table
CREATE TABLE IF NOT EXISTS public.leader_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone text,
  birth_date date,
  gender text CHECK (gender IN ('M', 'F', 'O')),
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  notes text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invite_tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'LEADER',
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  accepted_at timestamptz,
  leader_profile_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Create update trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for leader_profiles
DROP TRIGGER IF EXISTS update_leader_profiles_updated_at ON public.leader_profiles;
CREATE TRIGGER update_leader_profiles_updated_at
  BEFORE UPDATE ON public.leader_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for leader_profiles
DROP POLICY IF EXISTS leader_profiles_select_self_or_admin ON public.leader_profiles;
CREATE POLICY leader_profiles_select_self_or_admin
  ON public.leader_profiles FOR SELECT
  USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS leader_profiles_update_self_or_admin ON public.leader_profiles;
CREATE POLICY leader_profiles_update_self_or_admin
  ON public.leader_profiles FOR UPDATE
  USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS leader_profiles_insert_admin ON public.leader_profiles;
CREATE POLICY leader_profiles_insert_admin
  ON public.leader_profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

DROP POLICY IF EXISTS leader_profiles_delete_admin ON public.leader_profiles;
CREATE POLICY leader_profiles_delete_admin
  ON public.leader_profiles FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- RLS Policies for invite_tokens
DROP POLICY IF EXISTS invite_tokens_admin_only ON public.invite_tokens;
CREATE POLICY invite_tokens_admin_only
  ON public.invite_tokens FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- Allow public select and update for invite acceptance
DROP POLICY IF EXISTS invite_tokens_public_select ON public.invite_tokens;
CREATE POLICY invite_tokens_public_select
  ON public.invite_tokens FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS invite_tokens_public_update ON public.invite_tokens;
CREATE POLICY invite_tokens_public_update
  ON public.invite_tokens FOR UPDATE
  TO public
  USING (true);