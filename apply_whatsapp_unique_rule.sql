-- =====================================================
-- APLICAR REGRA: WhatsApp único no sistema
-- =====================================================
-- Este script aplica a regra de que um número de WhatsApp
-- só pode ser cadastrado uma vez no sistema inteiro.
-- 
-- Execute este script no SQL Editor do Supabase Online
-- =====================================================

-- 1. Criar função para verificar duplicatas de WhatsApp
-- Esta função ignora RLS para permitir que líderes verifiquem duplicatas entre todos os usuários
CREATE OR REPLACE FUNCTION public.check_whatsapp_exists(
  p_whatsapp text,
  p_current_person_id uuid DEFAULT NULL
)
RETURNS TABLE (
  is_duplicate boolean,
  owner_id uuid,
  owner_name text,
  owner_role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do dono da função (ignora RLS)
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_duplicate,
    p.owner_id,
    pr.full_name as owner_name,
    pr.role as owner_role,
    p.created_at
  FROM people p
  LEFT JOIN profiles pr ON pr.id = p.owner_id
  WHERE p.whatsapp = p_whatsapp
    AND (p_current_person_id IS NULL OR p.id != p_current_person_id)
  ORDER BY p.created_at ASC
  LIMIT 1;
  
  -- Se não encontrou nenhum resultado, retorna is_duplicate = false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::timestamptz;
  END IF;
END;
$$;

-- 2. Conceder permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.check_whatsapp_exists(text, uuid) TO authenticated;

-- 3. Criar constraint única no banco (opcional - mais restritivo)
-- ATENÇÃO: Isso pode falhar se já existirem duplicatas no banco
-- Descomente apenas se quiser uma constraint de banco também
/*
ALTER TABLE public.people 
ADD CONSTRAINT unique_whatsapp_system 
UNIQUE (whatsapp);
*/

-- =====================================================
-- VERIFICAÇÃO: Testar a função
-- =====================================================
-- Para testar se a função está funcionando, execute:
-- 
-- SELECT * FROM public.check_whatsapp_exists('11999999999');
-- 
-- Deve retornar:
-- - is_duplicate: true/false
-- - owner_id: UUID do dono (se duplicata)
-- - owner_name: Nome do dono
-- - owner_role: Role do dono (ADMIN/LEADER)
-- - created_at: Data de criação
-- =====================================================

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. A função check_whatsapp_exists() é usada pelo frontend
--    em src/services/people.ts na função checkWhatsAppDuplicate()
--
-- 2. A função ignora RLS (Row Level Security) para permitir
--    que qualquer líder verifique duplicatas entre todos os usuários
--
-- 3. O frontend já está configurado para usar esta função
--    e mostrar mensagens detalhadas sobre quem cadastrou primeiro
--
-- 4. Se você quiser uma constraint de banco também (mais restritiva),
--    descomente a linha do ALTER TABLE acima, mas certifique-se
--    de que não há duplicatas existentes primeiro
-- =====================================================



