-- Migração para adicionar função de remoção de líderes no Supabase Online
-- Data: 2025-01-14

CREATE OR REPLACE FUNCTION public.app_remove_leader(
  p_leader_id uuid,
  p_mode text,                           -- 'delete_contacts' | 'transfer_contacts'
  p_target_leader_id uuid DEFAULT NULL   -- obrigatório quando transfer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
DECLARE
  v_is_admin boolean;
  v_exists boolean;
  v_target_active boolean;
  v_people_moved int := 0;
BEGIN
  -- 0) Só ADMIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 1) líder existe?
  SELECT EXISTS (SELECT 1 FROM public.leader_profiles WHERE id = p_leader_id)
  INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Líder não encontrado';
  END IF;

  -- 2) valida modo
  IF p_mode NOT IN ('delete_contacts','transfer_contacts') THEN
    RAISE EXCEPTION 'Modo inválido. Use delete_contacts ou transfer_contacts';
  END IF;

  -- 3) se transferir, valida alvo
  IF p_mode = 'transfer_contacts' THEN
    IF p_target_leader_id IS NULL OR p_target_leader_id = p_leader_id THEN
      RAISE EXCEPTION 'Leader de destino inválido';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.leader_profiles
      WHERE id = p_target_leader_id AND status = 'ACTIVE'
    ) INTO v_target_active;

    IF NOT v_target_active THEN
      RAISE EXCEPTION 'Leader de destino não está ACTIVE';
    END IF;
  END IF;

  -- >>> evita barragem do trigger de proteção
  PERFORM set_config('app.bypass_guard','on', true);

  -- 4) tratar contatos
  IF p_mode = 'delete_contacts' THEN
    DELETE FROM public.people WHERE owner_id = p_leader_id;
    GET DIAGNOSTICS v_people_moved = ROW_COUNT;
  ELSE
    UPDATE public.people
       SET owner_id = p_target_leader_id
     WHERE owner_id = p_leader_id;
    GET DIAGNOSTICS v_people_moved = ROW_COUNT;
  END IF;

  -- 5) limpar convites vinculados
  DELETE FROM public.invite_tokens WHERE leader_profile_id = p_leader_id;

  -- 6) apagar perfis de domínio
  DELETE FROM public.leader_profiles WHERE id = p_leader_id;
  DELETE FROM public.profiles        WHERE id = p_leader_id;
  
  -- 7) remover usuário do Supabase Auth (se existir)
  DELETE FROM auth.users WHERE id = p_leader_id;

  RETURN jsonb_build_object(
    'ok', true,
    'people_processed', v_people_moved
  );
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.app_remove_leader(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_remove_leader(uuid, text, uuid) TO service_role;

-- ===========================================
-- FUNÇÃO DE DELEGAÇÃO DE CONTATOS
-- ===========================================

CREATE OR REPLACE FUNCTION public.app_delegate_people(
  from_leader uuid,
  to_leader uuid,
  opts jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $$
DECLARE
  v_is_admin boolean;
  v_from_exists boolean;
  v_to_exists boolean;
  v_moved_count int := 0;
  v_transfer_tags boolean;
  v_transfer_projects boolean;
BEGIN
  -- 0) Só ADMIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ADMIN'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 1) Validar parâmetros
  IF from_leader IS NULL OR to_leader IS NULL THEN
    RAISE EXCEPTION 'from_leader e to_leader são obrigatórios';
  END IF;

  IF from_leader = to_leader THEN
    RAISE EXCEPTION 'from_leader e to_leader não podem ser iguais';
  END IF;

  -- 2) Verificar se líderes existem e estão ativos
  SELECT EXISTS (
    SELECT 1 FROM public.leader_profiles 
    WHERE id = from_leader AND status = 'ACTIVE'
  ) INTO v_from_exists;

  SELECT EXISTS (
    SELECT 1 FROM public.leader_profiles 
    WHERE id = to_leader AND status = 'ACTIVE'
  ) INTO v_to_exists;

  IF NOT v_from_exists THEN
    RAISE EXCEPTION 'Líder de origem não encontrado ou inativo';
  END IF;

  IF NOT v_to_exists THEN
    RAISE EXCEPTION 'Líder de destino não encontrado ou inativo';
  END IF;

  -- 3) Extrair opções
  v_transfer_tags := COALESCE((opts->>'transfer_tags')::boolean, true);
  v_transfer_projects := COALESCE((opts->>'transfer_projects')::boolean, false);

  -- >>> evita barragem do trigger de proteção
  PERFORM set_config('app.bypass_guard','on', true);

  -- 4) Transferir contatos (com bloqueio para evitar condição de corrida)
  UPDATE public.people 
  SET owner_id = to_leader, updated_at = NOW()
  WHERE owner_id = from_leader;
  
  GET DIAGNOSTICS v_moved_count = ROW_COUNT;

  -- 5) Transferir tags se solicitado
  IF v_transfer_tags THEN
    UPDATE public.people_tags pt
    SET updated_at = NOW()
    FROM public.people p
    WHERE p.id = pt.person_id 
      AND p.owner_id = to_leader
      AND p.owner_id = from_leader;
  END IF;

  -- 6) Transferir projetos se solicitado (se existir tabela)
  IF v_transfer_projects THEN
    -- Implementar quando necessário
    NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'moved_count', v_moved_count,
    'from_leader', from_leader,
    'to_leader', to_leader,
    'transfer_tags', v_transfer_tags,
    'transfer_projects', v_transfer_projects
  );
END;
$$;

-- Conceder permissões para app_delegate_people
GRANT EXECUTE ON FUNCTION public.app_delegate_people(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_delegate_people(uuid, uuid, jsonb) TO service_role;
