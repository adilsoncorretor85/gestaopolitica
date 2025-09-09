-- Função RPC para aceitar convite de líder
-- Simplifica o processo removendo dependências externas

CREATE OR REPLACE FUNCTION public.accept_leader_invite(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invite_record record;
    result json;
BEGIN
    -- Buscar o convite pelo token
    SELECT * INTO invite_record
    FROM public.invite_tokens
    WHERE token = p_token
        AND accepted_at IS NULL
        AND expires_at > now();
    
    -- Verificar se o convite existe e é válido
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Convite inválido ou expirado'
        );
    END IF;
    
    -- Verificar se já existe um leader_profile para este email
    IF EXISTS (
        SELECT 1 FROM public.leader_profiles 
        WHERE email = invite_record.email
    ) THEN
        -- Atualizar o status para ACTIVE se encontrou o perfil
        UPDATE public.leader_profiles
        SET status = 'ACTIVE',
            updated_at = now()
        WHERE email = invite_record.email;
        
        -- Marcar convite como aceito
        UPDATE public.invite_tokens
        SET accepted_at = now(),
            leader_profile_id = (
                SELECT id FROM public.leader_profiles 
                WHERE email = invite_record.email 
                LIMIT 1
            )
        WHERE id = invite_record.id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Convite aceito com sucesso'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Perfil de líder não encontrado'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Erro interno: ' || SQLERRM
        );
END;
$$;

-- Dar permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.accept_leader_invite(text) TO authenticated;
