/*
  # Tags System - Seeds
  
  Dados iniciais opcionais para o sistema de tags.
  Este script é seguro e pode ser executado múltiplas vezes (usa ON CONFLICT DO NOTHING).
  
  IMPORTANTE: Este script NÃO é executado automaticamente.
  Execute manualmente no Dashboard se desejar dados iniciais.
  
  NOTA SOBRE TAGS SENSÍVEIS:
  - Tags marcadas com is_sensitive=true são visíveis apenas para administradores
  - Líderes não conseguem visualizar tags sensíveis (mesmo que possam aplicá-las via RPCs)
  - Se a política opcional de tags sensíveis estiver ativada, líderes não verão essas tags
*/

-- ========================================
-- TAGS INICIAIS
-- ========================================

-- Tags de perfil profissional/atividade
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('Empresário', 'Pessoa que possui ou gerencia negócios', '#2E8B57', false),
('Profissional Liberal', 'Advogado, médico, engenheiro, etc.', '#4169E1', false),
('Funcionário Público', 'Servidor público municipal, estadual ou federal', '#FF6347', false),
('Aposentado', 'Pessoa aposentada', '#708090', false),
('Estudante', 'Pessoa que estuda', '#32CD32', false),
('Desempregado', 'Pessoa em busca de emprego', '#DC143C', false)
ON CONFLICT (name) DO NOTHING;

-- Tags de perfil social/comunitário
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('Líder Comunitário', 'Líder em associações de bairro, ONGs, etc.', '#8B4513', false),
('Voluntário', 'Pessoa que faz trabalho voluntário', '#FFD700', false),
('Esportista', 'Pratica esportes regularmente', '#00CED1', false),
('Artista', 'Músico, pintor, ator, etc.', '#DA70D6', false),
('Religioso', 'Pessoa ativa em atividades religiosas', '#B22222', false)
ON CONFLICT (name) DO NOTHING;

-- Tags de perfil político/eleitoral
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('Eleitor Frequente', 'Vota em todas as eleições', '#228B22', false),
('Eleitor Esporádico', 'Vota ocasionalmente', '#FFA500', false),
('Primeiro Voto', 'Vai votar pela primeira vez', '#FF69B4', false),
('Simpatizante', 'Simpatiza com o partido/candidato', '#1E90FF', false),
('Indeciso', 'Ainda não decidiu o voto', '#FF4500', false)
ON CONFLICT (name) DO NOTHING;

-- Tags de perfil demográfico (SENSÍVEIS - apenas para admins)
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('Católico', 'Religião católica', '#800080', true),
('Evangélico', 'Religião evangélica', '#8B0000', true),
('Espírita', 'Religião espírita', '#2F4F4F', true),
('Ateu/Agnóstico', 'Sem religião ou não acredita', '#696969', true),
('Idoso', 'Pessoa idosa (60+ anos)', '#CD853F', true),
('Jovem', 'Pessoa jovem (18-30 anos)', '#20B2AA', true),
('Família com Crianças', 'Possui filhos menores', '#FF1493', true)
ON CONFLICT (name) DO NOTHING;

-- Tags de perfil econômico (SENSÍVEIS - apenas para admins)
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('Classe A', 'Alta renda', '#000080', true),
('Classe B', 'Média-alta renda', '#0000CD', true),
('Classe C', 'Média renda', '#4169E1', true),
('Classe D', 'Baixa renda', '#6495ED', true),
('Classe E', 'Muito baixa renda', '#87CEEB', true),
('Beneficiário Bolsa Família', 'Recebe auxílio social', '#FFB6C1', true),
('Beneficiário Auxílio Brasil', 'Recebe auxílio social', '#FFA07A', true)
ON CONFLICT (name) DO NOTHING;

-- Tags de perfil de contato
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('WhatsApp Ativo', 'Responde mensagens no WhatsApp', '#25D366', false),
('Email Ativo', 'Responde emails', '#EA4335', false),
('Facebook Ativo', 'Ativo no Facebook', '#1877F2', false),
('Instagram Ativo', 'Ativo no Instagram', '#E4405F', false),
('Difícil Contato', 'Não responde mensagens facilmente', '#FF6B6B', false),
('Contato Preferencial', 'Prefere ser contatado de forma específica', '#4ECDC4', false)
ON CONFLICT (name) DO NOTHING;

-- Tags de perfil de localização
INSERT INTO public.tags (name, description, color, is_sensitive) VALUES
('Centro', 'Mora no centro da cidade', '#FF8C00', false),
('Zona Norte', 'Mora na zona norte', '#32CD32', false),
('Zona Sul', 'Mora na zona sul', '#1E90FF', false),
('Zona Leste', 'Mora na zona leste', '#FF1493', false),
('Zona Oeste', 'Mora na zona oeste', '#8A2BE2', false),
('Zona Rural', 'Mora na zona rural', '#228B22', false),
('Bairro Nobre', 'Mora em bairro de alta renda', '#FFD700', false),
('Bairro Popular', 'Mora em bairro popular', '#FF6347', false)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- VERIFICAÇÃO DOS SEEDS
-- ========================================

-- Função para verificar quantas tags foram criadas
-- Primeiro, remover função se existir com assinatura diferente
DROP FUNCTION IF EXISTS public.check_tags_seeds();

CREATE OR REPLACE FUNCTION public.check_tags_seeds()
RETURNS TABLE(
  category text,
  total_tags bigint,
  sensitive_tags bigint,
  active_tags bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'TOTAL'::text as category,
    COUNT(*)::bigint as total_tags,
    COUNT(*) FILTER (WHERE is_sensitive = true)::bigint as sensitive_tags,
    COUNT(*) FILTER (WHERE is_active = true)::bigint as active_tags
  FROM public.tags;
END;
$$;

-- Comentário na função de verificação
COMMENT ON FUNCTION public.check_tags_seeds() IS 'Verifica quantas tags foram criadas pelos seeds';

-- ========================================
-- INSTRUÇÕES DE USO
-- ========================================

/*
  Para verificar se os seeds foram aplicados corretamente, execute:
  
  SELECT * FROM public.check_tags_seeds();
  
  Para ver todas as tags criadas:
  
  SELECT name, description, color, is_sensitive, is_active 
  FROM public.tags 
  ORDER BY is_sensitive, name;
  
  Para ver apenas tags não sensíveis (visíveis para líderes):
  
  SELECT name, description, color 
  FROM public.tags 
  WHERE is_sensitive = false AND is_active = true
  ORDER BY name;
  
  Para ver apenas tags sensíveis (visíveis apenas para admins):
  
  SELECT name, description, color 
  FROM public.tags 
  WHERE is_sensitive = true AND is_active = true
  ORDER BY name;
*/