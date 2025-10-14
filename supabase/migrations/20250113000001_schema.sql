-- Migration: Schema básico do sistema
-- Data: 2025-01-13
-- Descrição: Criação das tabelas principais do sistema

-- ===========================================
-- TABELAS PRINCIPAIS
-- ===========================================

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'LEADER' CHECK (role IN ('ADMIN', 'LEADER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de perfis de líderes
CREATE TABLE IF NOT EXISTS public.leader_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pessoas
CREATE TABLE IF NOT EXISTS public.people (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    full_name_fts TSVECTOR,
    email TEXT,
    whatsapp TEXT,
    phone TEXT,
    treatment TEXT CHECK (treatment IN ('SR', 'SRA', 'DR', 'DRA')),
    gender TEXT CHECK (gender IN ('M', 'F', 'O')),
    birth_date DATE,
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    facebook TEXT,
    instagram TEXT,
    notes TEXT,
    contacted_at DATE DEFAULT CURRENT_DATE,
    vote_status TEXT DEFAULT 'INDEFINIDO' CHECK (vote_status IN ('SIM', 'NAO', 'INDEFINIDO', 'ABSTENCAO')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de tags
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relacionamento pessoas-tags
CREATE TABLE IF NOT EXISTS public.people_tags (
    person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, tag_id)
);

-- Tabela de tokens de convite
CREATE TABLE IF NOT EXISTS public.invite_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações de eleição
CREATE TABLE IF NOT EXISTS public.election_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_name TEXT NOT NULL,
    election_date DATE,
    target_votes INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de metas por cidade
CREATE TABLE IF NOT EXISTS public.city_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    goal INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(city, state)
);

-- Tabela de metas por bairro
CREATE TABLE IF NOT EXISTS public.neighborhood_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    goal INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(neighborhood, city, state)
);

-- Tabela de áreas de líderes
CREATE TABLE IF NOT EXISTS public.leader_areas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    leader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    area_type TEXT NOT NULL CHECK (area_type IN ('CITY', 'NEIGHBORHOOD', 'REGION')),
    area_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leader_id, area_type, area_name)
);

-- ===========================================
-- ÍNDICES
-- ===========================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_people_owner_id ON public.people(owner_id);
CREATE INDEX IF NOT EXISTS idx_people_city_state ON public.people(city, state);
CREATE INDEX IF NOT EXISTS idx_people_full_name_fts ON public.people USING GIN(full_name_fts);
CREATE INDEX IF NOT EXISTS idx_people_created_at ON public.people(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON public.invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_leader_areas_leader_id ON public.leader_areas(leader_id);

-- ===========================================
-- TRIGGERS DE ATUALIZAÇÃO
-- ===========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leader_profiles_updated_at BEFORE UPDATE ON public.leader_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON public.people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_election_settings_updated_at BEFORE UPDATE ON public.election_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_city_goals_updated_at BEFORE UPDATE ON public.city_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_neighborhood_goals_updated_at BEFORE UPDATE ON public.neighborhood_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- FUNÇÃO PARA FULL-TEXT SEARCH
-- ===========================================

-- Função para atualizar full_name_fts
CREATE OR REPLACE FUNCTION update_people_full_name_fts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name_fts = to_tsvector('portuguese', COALESCE(NEW.full_name, ''));
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para full-text search
CREATE TRIGGER update_people_full_name_fts_trigger
    BEFORE INSERT OR UPDATE OF full_name ON public.people
    FOR EACH ROW EXECUTE FUNCTION update_people_full_name_fts();
