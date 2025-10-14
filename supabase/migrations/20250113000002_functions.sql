-- Migration: Funções RPC do sistema
-- Data: 2025-01-13
-- Descrição: Criação das funções RPC para operações seguras

-- ===========================================
-- FUNÇÕES RPC
-- ===========================================

-- Função para ativar líder
CREATE OR REPLACE FUNCTION activate_leader()
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    result JSON;
BEGIN
    -- Obter ID do usuário atual
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;
    
    -- Verificar se é um líder pendente
    IF NOT EXISTS (
        SELECT 1 FROM public.leader_profiles 
        WHERE id = user_id AND status = 'PENDING'
    ) THEN
        RETURN json_build_object('error', 'Usuário não é um líder pendente');
    END IF;
    
    -- Ativar o líder
    UPDATE public.leader_profiles 
    SET 
        status = 'ACTIVE',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Atualizar o perfil
    UPDATE public.profiles 
    SET 
        role = 'LEADER',
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Log de auditoria
    INSERT INTO public.audit_logs (table_name, record_id, action, actor_id, details)
    VALUES ('leader_profiles', user_id::text, 'UPDATE', user_id, 
            json_build_object('action', 'activate_leader', 'status', 'ACTIVE'));
    
    RETURN json_build_object('success', true, 'message', 'Líder ativado com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aceitar convite (se ainda usar token)
CREATE OR REPLACE FUNCTION accept_leader_invite(token TEXT)
RETURNS JSON AS $$
DECLARE
    invite_record RECORD;
    user_id UUID;
BEGIN
    -- Obter ID do usuário atual
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;
    
    -- Buscar convite válido
    SELECT * INTO invite_record
    FROM public.invite_tokens
    WHERE token = accept_leader_invite.token
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Convite inválido ou expirado');
    END IF;
    
    -- Verificar se o email corresponde
    IF invite_record.email != (SELECT email FROM auth.users WHERE id = user_id) THEN
        RETURN json_build_object('error', 'Email não corresponde ao convite');
    END IF;
    
    -- Marcar convite como aceito
    UPDATE public.invite_tokens
    SET accepted_at = NOW()
    WHERE token = accept_leader_invite.token;
    
    -- Ativar o líder
    UPDATE public.leader_profiles 
    SET 
        status = 'ACTIVE',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Atualizar o perfil
    UPDATE public.profiles 
    SET 
        role = 'LEADER',
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Log de auditoria
    INSERT INTO public.audit_logs (table_name, record_id, action, actor_id, details)
    VALUES ('leader_profiles', user_id::text, 'UPDATE', user_id, 
            json_build_object('action', 'accept_invite', 'token', accept_leader_invite.token));
    
    RETURN json_build_object('success', true, 'message', 'Convite aceito com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter meta efetiva do usuário
CREATE OR REPLACE FUNCTION get_my_effective_goal()
RETURNS INTEGER AS $$
DECLARE
    user_id UUID;
    goal INTEGER := 0;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Buscar meta específica do usuário (se existir)
    SELECT target_votes INTO goal
    FROM public.election_settings
    WHERE created_by = user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Se não encontrou meta específica, usar meta padrão
    IF goal IS NULL OR goal = 0 THEN
        SELECT target_votes INTO goal
        FROM public.election_settings
        WHERE created_by IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(goal, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter informações completas da meta
CREATE OR REPLACE FUNCTION get_my_goal_info()
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    goal_info JSON;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;
    
    -- Buscar informações da meta
    SELECT json_build_object(
        'target_votes', target_votes,
        'election_name', election_name,
        'election_date', election_date,
        'is_personal', created_by = user_id,
        'created_at', created_at
    ) INTO goal_info
    FROM public.election_settings
    WHERE created_by = user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Se não encontrou meta específica, usar meta padrão
    IF goal_info IS NULL THEN
        SELECT json_build_object(
            'target_votes', target_votes,
            'election_name', election_name,
            'election_date', election_date,
            'is_personal', false,
            'created_at', created_at
        ) INTO goal_info
        FROM public.election_settings
        WHERE created_by IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(goal_info, json_build_object('target_votes', 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função helper para verificar se usuário é admin
CREATE OR REPLACE FUNCTION app_is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    user_id UUID;
    user_role TEXT;
    stats JSON;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN json_build_object('error', 'Usuário não autenticado');
    END IF;
    
    -- Obter role do usuário
    SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
    
    IF user_role = 'ADMIN' THEN
        -- Estatísticas para admin
        SELECT json_build_object(
            'total_people', (SELECT COUNT(*) FROM public.people),
            'total_leaders', (SELECT COUNT(*) FROM public.leader_profiles WHERE status = 'ACTIVE'),
            'pending_leaders', (SELECT COUNT(*) FROM public.leader_profiles WHERE status = 'PENDING'),
            'total_tags', (SELECT COUNT(*) FROM public.tags),
            'recent_people', (
                SELECT COUNT(*) FROM public.people 
                WHERE created_at >= NOW() - INTERVAL '7 days'
            )
        ) INTO stats;
    ELSE
        -- Estatísticas para líder
        SELECT json_build_object(
            'my_people', (SELECT COUNT(*) FROM public.people WHERE owner_id = user_id),
            'recent_people', (
                SELECT COUNT(*) FROM public.people 
                WHERE owner_id = user_id AND created_at >= NOW() - INTERVAL '7 days'
            ),
            'contacted_people', (
                SELECT COUNT(*) FROM public.people 
                WHERE owner_id = user_id AND contacted_at IS NOT NULL
            ),
            'my_goal', get_my_effective_goal()
        ) INTO stats;
    END IF;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
