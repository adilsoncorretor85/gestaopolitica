-- Migration: Dados iniciais do sistema
-- Data: 2025-01-13
-- Descrição: Inserção de dados iniciais e configurações padrão

-- ===========================================
-- DADOS INICIAIS
-- ===========================================

-- Inserir configuração de eleição padrão
INSERT INTO public.election_settings (
    election_name,
    election_date,
    target_votes,
    created_by
) VALUES (
    'Eleição Municipal 2024',
    '2024-10-06',
    1000,
    NULL  -- Meta padrão do sistema
) ON CONFLICT DO NOTHING;

-- Inserir tags padrão
INSERT INTO public.tags (name, color, description, created_by) VALUES
    ('Apoiador', '#10B981', 'Pessoas que apoiam a candidatura', NULL),
    ('Indeciso', '#F59E0B', 'Pessoas que ainda não decidiram o voto', NULL),
    ('Oposição', '#EF4444', 'Pessoas que votam na oposição', NULL),
    ('Família', '#8B5CF6', 'Membros da família', NULL),
    ('Amigos', '#06B6D4', 'Círculo de amizade', NULL),
    ('Trabalho', '#84CC16', 'Colegas de trabalho', NULL),
    ('Vizinhos', '#F97316', 'Vizinhos da região', NULL),
    ('Religioso', '#EC4899', 'Círculo religioso', NULL),
    ('Esportivo', '#14B8A6', 'Círculo esportivo', NULL),
    ('Estudantil', '#6366F1', 'Círculo estudantil', NULL)
ON CONFLICT (name) DO NOTHING;

-- Inserir metas por cidade padrão (exemplo)
INSERT INTO public.city_goals (city, state, goal, created_by) VALUES
    ('Joinville', 'SC', 500, NULL),
    ('Florianópolis', 'SC', 300, NULL),
    ('Blumenau', 'SC', 200, NULL)
ON CONFLICT (city, state) DO NOTHING;

-- Inserir metas por bairro padrão (exemplo para Joinville)
INSERT INTO public.neighborhood_goals (neighborhood, city, state, goal, created_by) VALUES
    ('Centro', 'Joinville', 'SC', 100, NULL),
    ('Boa Vista', 'Joinville', 'SC', 80, NULL),
    ('América', 'Joinville', 'SC', 70, NULL),
    ('Saguaçu', 'Joinville', 'SC', 60, NULL),
    ('Aventureiro', 'Joinville', 'SC', 50, NULL)
ON CONFLICT (neighborhood, city, state) DO NOTHING;

-- ===========================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ===========================================

-- Comentários nas tabelas
COMMENT ON TABLE public.profiles IS 'Perfis de usuários do sistema (ADMIN e LEADER)';
COMMENT ON TABLE public.leader_profiles IS 'Perfis específicos de líderes com status de ativação';
COMMENT ON TABLE public.people IS 'Pessoas cadastradas pelos líderes para gestão política';
COMMENT ON TABLE public.tags IS 'Tags para categorização de pessoas';
COMMENT ON TABLE public.people_tags IS 'Relacionamento many-to-many entre pessoas e tags';
COMMENT ON TABLE public.invite_tokens IS 'Tokens de convite para novos líderes';
COMMENT ON TABLE public.audit_logs IS 'Logs de auditoria para todas as operações';
COMMENT ON TABLE public.election_settings IS 'Configurações de eleição e metas';
COMMENT ON TABLE public.city_goals IS 'Metas de votos por cidade';
COMMENT ON TABLE public.neighborhood_goals IS 'Metas de votos por bairro';
COMMENT ON TABLE public.leader_areas IS 'Áreas de atuação dos líderes';

-- Comentários nas colunas importantes
COMMENT ON COLUMN public.profiles.role IS 'Papel do usuário: ADMIN (administrador) ou LEADER (líder)';
COMMENT ON COLUMN public.leader_profiles.status IS 'Status do líder: PENDING (pendente), ACTIVE (ativo), INACTIVE (inativo)';
COMMENT ON COLUMN public.people.owner_id IS 'ID do líder responsável por esta pessoa';
COMMENT ON COLUMN public.people.vote_status IS 'Status do voto: SIM, NAO, INDEFINIDO, ABSTENCAO';
COMMENT ON COLUMN public.people.full_name_fts IS 'Campo de busca full-text para nomes';
COMMENT ON COLUMN public.invite_tokens.expires_at IS 'Data de expiração do token de convite';
COMMENT ON COLUMN public.invite_tokens.accepted_at IS 'Data de aceitação do convite (NULL se não aceito)';

-- ===========================================
-- VIEWS ÚTEIS
-- ===========================================

-- View para estatísticas de pessoas por líder
CREATE OR REPLACE VIEW public.leader_stats AS
SELECT 
    lp.id,
    lp.full_name,
    lp.email,
    lp.status,
    COUNT(p.id) as total_people,
    COUNT(CASE WHEN p.contacted_at IS NOT NULL THEN 1 END) as contacted_people,
    COUNT(CASE WHEN p.vote_status = 'SIM' THEN 1 END) as positive_votes,
    COUNT(CASE WHEN p.vote_status = 'NAO' THEN 1 END) as negative_votes,
    COUNT(CASE WHEN p.vote_status = 'INDEFINIDO' THEN 1 END) as undefined_votes,
    COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_people
FROM public.leader_profiles lp
LEFT JOIN public.people p ON lp.id = p.owner_id
GROUP BY lp.id, lp.full_name, lp.email, lp.status;

-- View para estatísticas de pessoas por cidade
CREATE OR REPLACE VIEW public.city_stats AS
SELECT 
    city,
    state,
    COUNT(*) as total_people,
    COUNT(CASE WHEN vote_status = 'SIM' THEN 1 END) as positive_votes,
    COUNT(CASE WHEN vote_status = 'NAO' THEN 1 END) as negative_votes,
    COUNT(CASE WHEN vote_status = 'INDEFINIDO' THEN 1 END) as undefined_votes,
    COUNT(CASE WHEN contacted_at IS NOT NULL THEN 1 END) as contacted_people,
    ROUND(
        COUNT(CASE WHEN vote_status = 'SIM' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as positive_percentage
FROM public.people
WHERE city IS NOT NULL AND state IS NOT NULL
GROUP BY city, state
ORDER BY total_people DESC;

-- View para pessoas com aniversário próximo
CREATE OR REPLACE VIEW public.upcoming_birthdays AS
SELECT 
    p.id,
    p.full_name,
    p.birth_date,
    p.phone,
    p.whatsapp,
    p.owner_id,
    lp.full_name as leader_name,
    EXTRACT(DOY FROM p.birth_date) as day_of_year,
    EXTRACT(DOY FROM CURRENT_DATE) as current_day_of_year,
    CASE 
        WHEN EXTRACT(DOY FROM p.birth_date) >= EXTRACT(DOY FROM CURRENT_DATE) 
        THEN EXTRACT(DOY FROM p.birth_date) - EXTRACT(DOY FROM CURRENT_DATE)
        ELSE (365 + EXTRACT(DOY FROM p.birth_date)) - EXTRACT(DOY FROM CURRENT_DATE)
    END as days_until_birthday
FROM public.people p
JOIN public.leader_profiles lp ON p.owner_id = lp.id
WHERE p.birth_date IS NOT NULL
AND lp.status = 'ACTIVE'
ORDER BY days_until_birthday;

-- ===========================================
-- FUNÇÕES AUXILIARES
-- ===========================================

-- Função para obter estatísticas gerais do sistema
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_people', (SELECT COUNT(*) FROM public.people),
        'total_leaders', (SELECT COUNT(*) FROM public.leader_profiles WHERE status = 'ACTIVE'),
        'pending_leaders', (SELECT COUNT(*) FROM public.leader_profiles WHERE status = 'PENDING'),
        'total_tags', (SELECT COUNT(*) FROM public.tags),
        'total_cities', (SELECT COUNT(DISTINCT city) FROM public.people WHERE city IS NOT NULL),
        'recent_people', (
            SELECT COUNT(*) FROM public.people 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        ),
        'contacted_people', (
            SELECT COUNT(*) FROM public.people 
            WHERE contacted_at IS NOT NULL
        ),
        'positive_votes', (
            SELECT COUNT(*) FROM public.people 
            WHERE vote_status = 'SIM'
        ),
        'negative_votes', (
            SELECT COUNT(*) FROM public.people 
            WHERE vote_status = 'NAO'
        ),
        'undefined_votes', (
            SELECT COUNT(*) FROM public.people 
            WHERE vote_status = 'INDEFINIDO'
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar dados de teste (apenas em desenvolvimento)
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS TEXT AS $$
BEGIN
    -- Só permite em desenvolvimento
    IF current_setting('app.environment', true) != 'development' THEN
        RETURN 'Função disponível apenas em desenvolvimento';
    END IF;
    
    -- Limpar dados de teste
    DELETE FROM public.people WHERE owner_id IN (
        SELECT id FROM public.leader_profiles WHERE email LIKE '%@teste.com'
    );
    
    DELETE FROM public.leader_profiles WHERE email LIKE '%@teste.com';
    DELETE FROM public.profiles WHERE email LIKE '%@teste.com';
    
    RETURN 'Dados de teste removidos com sucesso';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
