-- Migration: Row Level Security (RLS) Policies
-- Data: 2025-01-13
-- Descrição: Criação das políticas de segurança para controle de acesso

-- ===========================================
-- HABILITAR RLS
-- ===========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_areas ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLICIES - PROFILES
-- ===========================================

-- Profiles: usuários podem ler e atualizar seu próprio perfil
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Profiles: admins podem ler e atualizar todos os perfis
CREATE POLICY "Admins can read all profiles" ON public.profiles
    FOR SELECT USING (app_is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (app_is_admin());

-- Profiles: permitir inserção de novos perfis (via signup)
CREATE POLICY "Allow profile creation" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===========================================
-- POLICIES - LEADER_PROFILES
-- ===========================================

-- Leader profiles: usuários podem ler seu próprio perfil de líder
CREATE POLICY "Users can read own leader profile" ON public.leader_profiles
    FOR SELECT USING (auth.uid() = id);

-- Leader profiles: admins podem fazer tudo
CREATE POLICY "Admins can read all leader profiles" ON public.leader_profiles
    FOR SELECT USING (app_is_admin());

CREATE POLICY "Admins can update all leader profiles" ON public.leader_profiles
    FOR UPDATE USING (app_is_admin());

CREATE POLICY "Admins can insert leader profiles" ON public.leader_profiles
    FOR INSERT WITH CHECK (app_is_admin());

CREATE POLICY "Admins can delete leader profiles" ON public.leader_profiles
    FOR DELETE USING (app_is_admin());

-- Leader profiles: permitir self-activation via RPC
CREATE POLICY "Allow leader self activation" ON public.leader_profiles
    FOR UPDATE USING (
        auth.uid() = id AND 
        status = 'PENDING' AND 
        -- Esta policy permite apenas mudança de PENDING para ACTIVE
        -- O trigger leader_profiles_guard() controla os detalhes
        true
    );

-- ===========================================
-- POLICIES - PEOPLE
-- ===========================================

-- People: líderes podem ler e gerenciar suas próprias pessoas
CREATE POLICY "Leaders can read own people" ON public.people
    FOR SELECT USING (
        owner_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Leaders can insert own people" ON public.people
    FOR INSERT WITH CHECK (
        owner_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Leaders can update own people" ON public.people
    FOR UPDATE USING (
        owner_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Leaders can delete own people" ON public.people
    FOR DELETE USING (
        owner_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- People: admins podem fazer tudo
CREATE POLICY "Admins can read all people" ON public.people
    FOR SELECT USING (app_is_admin());

CREATE POLICY "Admins can insert people" ON public.people
    FOR INSERT WITH CHECK (app_is_admin());

CREATE POLICY "Admins can update all people" ON public.people
    FOR UPDATE USING (app_is_admin());

CREATE POLICY "Admins can delete all people" ON public.people
    FOR DELETE USING (app_is_admin());

-- ===========================================
-- POLICIES - TAGS
-- ===========================================

-- Tags: todos podem ler tags
CREATE POLICY "Anyone can read tags" ON public.tags
    FOR SELECT USING (true);

-- Tags: apenas admins podem gerenciar tags
CREATE POLICY "Admins can insert tags" ON public.tags
    FOR INSERT WITH CHECK (app_is_admin());

CREATE POLICY "Admins can update tags" ON public.tags
    FOR UPDATE USING (app_is_admin());

CREATE POLICY "Admins can delete tags" ON public.tags
    FOR DELETE USING (app_is_admin());

-- ===========================================
-- POLICIES - PEOPLE_TAGS
-- ===========================================

-- People tags: líderes podem gerenciar tags de suas pessoas
CREATE POLICY "Leaders can manage own people tags" ON public.people_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.people p
            JOIN public.leader_profiles lp ON p.owner_id = lp.id
            WHERE p.id = person_id 
            AND lp.id = auth.uid() 
            AND lp.status = 'ACTIVE'
        )
    );

-- People tags: admins podem fazer tudo
CREATE POLICY "Admins can manage all people tags" ON public.people_tags
    FOR ALL USING (app_is_admin());

-- ===========================================
-- POLICIES - INVITE_TOKENS
-- ===========================================

-- Invite tokens: apenas admins podem gerenciar
CREATE POLICY "Admins can read invite tokens" ON public.invite_tokens
    FOR SELECT USING (app_is_admin());

CREATE POLICY "Admins can insert invite tokens" ON public.invite_tokens
    FOR INSERT WITH CHECK (app_is_admin());

CREATE POLICY "Admins can update invite tokens" ON public.invite_tokens
    FOR UPDATE USING (app_is_admin());

CREATE POLICY "Admins can delete invite tokens" ON public.invite_tokens
    FOR DELETE USING (app_is_admin());

-- ===========================================
-- POLICIES - AUDIT_LOGS
-- ===========================================

-- Audit logs: apenas admins podem ler
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
    FOR SELECT USING (app_is_admin());

-- Audit logs: ninguém pode inserir/atualizar/deletar (apenas triggers)
CREATE POLICY "No manual audit log changes" ON public.audit_logs
    FOR INSERT WITH CHECK (false);

CREATE POLICY "No manual audit log updates" ON public.audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "No manual audit log deletes" ON public.audit_logs
    FOR DELETE USING (false);

-- ===========================================
-- POLICIES - ELECTION_SETTINGS
-- ===========================================

-- Election settings: todos podem ler
CREATE POLICY "Anyone can read election settings" ON public.election_settings
    FOR SELECT USING (true);

-- Election settings: líderes podem criar suas próprias metas
CREATE POLICY "Leaders can create own election settings" ON public.election_settings
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Election settings: admins podem fazer tudo
CREATE POLICY "Admins can manage election settings" ON public.election_settings
    FOR ALL USING (app_is_admin());

-- ===========================================
-- POLICIES - CITY_GOALS
-- ===========================================

-- City goals: todos podem ler
CREATE POLICY "Anyone can read city goals" ON public.city_goals
    FOR SELECT USING (true);

-- City goals: apenas admins podem gerenciar
CREATE POLICY "Admins can manage city goals" ON public.city_goals
    FOR ALL USING (app_is_admin());

-- ===========================================
-- POLICIES - NEIGHBORHOOD_GOALS
-- ===========================================

-- Neighborhood goals: todos podem ler
CREATE POLICY "Anyone can read neighborhood goals" ON public.neighborhood_goals
    FOR SELECT USING (true);

-- Neighborhood goals: apenas admins podem gerenciar
CREATE POLICY "Admins can manage neighborhood goals" ON public.neighborhood_goals
    FOR ALL USING (app_is_admin());

-- ===========================================
-- POLICIES - LEADER_AREAS
-- ===========================================

-- Leader areas: líderes podem ler suas próprias áreas
CREATE POLICY "Leaders can read own areas" ON public.leader_areas
    FOR SELECT USING (
        leader_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Leader areas: líderes podem gerenciar suas próprias áreas
CREATE POLICY "Leaders can manage own areas" ON public.leader_areas
    FOR ALL USING (
        leader_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.leader_profiles 
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    );

-- Leader areas: admins podem fazer tudo
CREATE POLICY "Admins can manage all leader areas" ON public.leader_areas
    FOR ALL USING (app_is_admin());
