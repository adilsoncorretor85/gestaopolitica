-- Migração para criar função de delegação de contatos entre líderes
-- Permite transferir contatos de um líder para outro de forma transacional

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

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.app_delegate_people(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_delegate_people(uuid, uuid, jsonb) TO service_role;

