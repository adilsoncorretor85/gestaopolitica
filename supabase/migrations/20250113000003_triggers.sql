-- Migration: Triggers do sistema
-- Data: 2025-01-13
-- Descrição: Criação dos triggers para automatizar operações

-- ===========================================
-- FUNÇÕES DE TRIGGER
-- ===========================================

-- Função para garantir que existe leader_profile quando role vira LEADER
CREATE OR REPLACE FUNCTION ensure_leader_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o role mudou para LEADER e não existe leader_profile, criar
    IF NEW.role = 'LEADER' AND OLD.role != 'LEADER' THEN
        INSERT INTO public.leader_profiles (id, email, full_name, status)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.full_name, ''),
            'PENDING'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para proteger leader_profiles contra self-update
CREATE OR REPLACE FUNCTION leader_profiles_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloquear self-update de campos sensíveis
    IF OLD.id = auth.uid() THEN
        -- Permitir apenas mudanças de status via RPC
        IF TG_OP = 'UPDATE' THEN
            -- Bloquear mudanças em campos sensíveis
            IF OLD.email != NEW.email OR 
               OLD.status != NEW.status OR 
               OLD.accepted_at != NEW.accepted_at THEN
                -- Verificar se é uma mudança permitida via RPC
                IF NOT (OLD.status = 'PENDING' AND NEW.status = 'ACTIVE' AND NEW.accepted_at IS NOT NULL) THEN
                    RAISE EXCEPTION 'Self-update não permitido em leader_profiles';
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar convite como aceito quando líder é ativado
CREATE OR REPLACE FUNCTION on_leader_activated_mark_invite()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou de PENDING para ACTIVE
    IF OLD.status = 'PENDING' AND NEW.status = 'ACTIVE' THEN
        -- Marcar convite como aceito
        UPDATE public.invite_tokens
        SET accepted_at = NOW()
        WHERE email = NEW.email
        AND accepted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para log de auditoria automático
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSON;
    new_data JSON;
    operation TEXT;
BEGIN
    -- Determinar operação
    IF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        old_data := row_to_json(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        old_data := row_to_json(OLD);
        new_data := row_to_json(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        old_data := NULL;
        new_data := row_to_json(NEW);
    END IF;
    
    -- Inserir log de auditoria
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        actor_id,
        details
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::text,
        operation,
        auth.uid(),
        json_build_object(
            'old_data', old_data,
            'new_data', new_data,
            'timestamp', NOW()
        )
    );
    
    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Trigger para garantir leader_profile
CREATE TRIGGER ensure_leader_profile_trigger
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_leader_profile();

-- Trigger para proteger leader_profiles
CREATE TRIGGER leader_profiles_guard_trigger
    BEFORE UPDATE ON public.leader_profiles
    FOR EACH ROW
    EXECUTE FUNCTION leader_profiles_guard();

-- Trigger para marcar convite como aceito
CREATE TRIGGER on_leader_activated_mark_invite_trigger
    AFTER UPDATE OF status ON public.leader_profiles
    FOR EACH ROW
    EXECUTE FUNCTION on_leader_activated_mark_invite();

-- Triggers de auditoria para tabelas sensíveis
CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_leader_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.leader_profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_people_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.people
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_tags_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_invite_tokens_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invite_tokens
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_election_settings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.election_settings
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_city_goals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.city_goals
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_neighborhood_goals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.neighborhood_goals
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_leader_areas_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.leader_areas
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger();
