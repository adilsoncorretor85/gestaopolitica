-- Migração para corrigir a função app_remove_leader para remover usuários do auth.users
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
