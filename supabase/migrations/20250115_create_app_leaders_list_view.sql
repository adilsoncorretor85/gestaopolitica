-- Criar view app_leaders_list para listar líderes com status correto
-- Esta view combina dados de leader_profiles, profiles e invite_tokens

CREATE OR REPLACE VIEW public.app_leaders_list AS
SELECT 
  lp.id,
  lp.profile_id,
  p.full_name,
  p.email,
  lp.phone,
  lp.goal,
  lp.status,
  lp.invited_at,
  lp.accepted_at,
  lp.city,
  lp.state,
  lp.neighborhood,
  -- Campos calculados para facilitar filtros
  CASE 
    WHEN lp.status = 'ACTIVE' THEN true 
    ELSE false 
  END as is_active,
  CASE 
    WHEN lp.status = 'PENDING' THEN true 
    ELSE false 
  END as is_pending
FROM public.leader_profiles lp
LEFT JOIN public.profiles p ON lp.id = p.id
ORDER BY lp.invited_at DESC NULLS LAST;

-- Comentário sobre a view
COMMENT ON VIEW public.app_leaders_list IS 'View para listar líderes com status e informações combinadas de profiles e leader_profiles';

-- Garantir que a view seja acessível via RLS
ALTER VIEW public.app_leaders_list SET (security_invoker = true);
