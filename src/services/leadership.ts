import { devLog } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { ProfileLeadership, LeadershipFormValues } from '@/types/leadership';
import { ROLE_OPTIONS } from '@/types/leadership';

/**
 * Chama a RPC activate_leader() de forma idempotente.
 * Protege contra chamadas duplicadas com uma flag no localStorage.
 */
export async function ensureLeaderActivated(): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data: session } = await supabase.auth.getSession();
    const uid = session?.session?.user?.id;
    if (!uid) return { ok: false, error: 'Sem sessão' };

    // evita chamadas repetidas no mesmo browser
    const key = `leader-activated:${uid}`;
    if (localStorage.getItem(key) === '1') {
      return { ok: true };
    }

    const { error } = await supabase.rpc('activate_leader');
    if (error) {
      // não grava a flag; vamos tentar de novo no próximo ciclo
      console.error('[ensureLeaderActivated] RPC error:', error);
      return { ok: false, error: error.message };
    }

    localStorage.setItem(key, '1');
    return { ok: true };
  } catch (err: any) {
    console.error('[ensureLeaderActivated] unexpected error:', err);
    return { ok: false, error: err?.message ?? 'unknown' };
  }
}

// Função para validar UUID
function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// 1) Buscar 1 registro do líder
export async function getProfileLeadershipByLeader(profileId: string): Promise<ProfileLeadership | null> {
  if (!getSupabaseClient()) throw new Error('Supabase client not initialized');
  
  // Validar UUID
  if (!profileId || !isUuid(profileId)) {
    throw new Error('profileId inválido (UUID obrigatório).');
  }
  
  const { data, error } = await getSupabaseClient()
    .from('profile_leaderships')
    .select('id, profile_id, role_code, organization, title, level, reach_scope, reach_size, extra, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // no rows
    console.error('[leadership] get error', error);
    throw error;
  }
  return data ?? null;
}

// Nova função upsert para o formulário acadêmico
export async function upsertProfileLeadership(profileId: string, payload: LeadershipFormValues) {
  // Monta colunas padrão
  const base = {
    profile_id: profileId,
    role_code: payload.role_code,
    organization: payload.organization?.trim() || null,
    title: payload.title?.trim() || null,
  };

  // Monta extra SÓ com o que existir (para não sujar o jsonb)
  const extra: Record<string, any> = {};
  if (payload.field_of_study) extra.field_of_study = payload.field_of_study.trim();
  if (payload.influence_level) extra.influence_level = payload.influence_level;
  
  // Campos específicos para Patriarca/Matriarca
  if (payload.family_size !== undefined) extra.family_size = payload.family_size;
  if (payload.generation_scope) extra.generation_scope = payload.generation_scope;
  if (payload.influence_roles && payload.influence_roles.length > 0) extra.influence_roles = payload.influence_roles;
  if (payload.tradition) extra.tradition = payload.tradition;
  if (payload.tradition_other) extra.tradition_other = payload.tradition_other.trim();
  
  // Campos específicos para Mentor/Coach/Conselheiro
  if (payload.mentorship_type) extra.mentorship_type = payload.mentorship_type;
  if (payload.mentorship_type_other) extra.mentorship_type_other = payload.mentorship_type_other.trim();
  if (payload.target_audience && payload.target_audience.length > 0) extra.target_audience = payload.target_audience;
  if (payload.target_audience_other) extra.target_audience_other = payload.target_audience_other.trim();
  if (payload.mentees_count !== undefined) extra.mentees_count = payload.mentees_count;
  if (payload.certification) extra.certification = payload.certification.trim();
  
  // Campos específicos para Celebridade pública
  if (payload.celebrity_area) extra.celebrity_area = payload.celebrity_area.trim();
  if (payload.public_role) extra.public_role = payload.public_role.trim();
  if (payload.audience) extra.audience = payload.audience.trim();
  
  // Campos específicos para Jornalista/Comunicador
  if (payload.media_area) extra.media_area = payload.media_area;
  if (payload.audience_scope) extra.audience_scope = payload.audience_scope;
  
  // Campos específicos para Influenciador digital
  if (payload.platform) extra.platform = payload.platform.trim();
  if (payload.niche) extra.niche = payload.niche.trim();
  if (payload.reach_estimate) extra.reach_estimate = payload.reach_estimate;
  if (payload.influence_type) extra.influence_type = payload.influence_type;
  
  // Campos específicos para Presidente de entidade
  if (payload.entity_type) extra.entity_type = payload.entity_type;
  if (payload.scope) extra.scope = payload.scope;
  if (payload.mandate_start) extra.mandate_start = payload.mandate_start;
  if (payload.mandate_end) extra.mandate_end = payload.mandate_end;
  
  // Campos específicos para Liderança partidária
  if (payload.party) extra.party = payload.party.trim();
  if (payload.party_office) extra.office = payload.party_office.trim();
  if (payload.party_office_other) extra.office_other = payload.party_office_other.trim();
  if (payload.party_scope) extra.scope = payload.party_scope;
  if (payload.party_status) extra.status = payload.party_status;
  if (payload.party_mandate_start) extra.mandate_start = payload.party_mandate_start;
  if (payload.party_mandate_end) extra.mandate_end = payload.party_mandate_end;
  
  // Campos específicos para Influenciador cultural
  if (payload.cultural_segment) extra.segment = payload.cultural_segment.trim();
  if (payload.cultural_segment_other) extra.segment_other = payload.cultural_segment_other.trim();
  if (payload.cultural_role) extra.role = payload.cultural_role.trim();
  if (payload.cultural_role_other) extra.role_other = payload.cultural_role_other.trim();
  if (payload.cultural_scope) extra.scope = payload.cultural_scope;
  if (payload.cultural_notes) extra.notes = payload.cultural_notes.trim();
  
  // Campos específicos para Educador/Professor
  if (payload.education_level) extra.education_level = payload.education_level;
  if (payload.subject_area) extra.subject_area = payload.subject_area.trim();
  if (payload.reach_scope) extra.reach_scope = payload.reach_scope;
  if (payload.notes) extra.notes = payload.notes.trim();
  
  // Campos específicos para Líder Comunitário
  if (payload.community_area) {
    if (payload.community_area === 'Outro' && payload.other_community_area) {
      extra.community_area = payload.other_community_area.trim();
    } else {
      extra.community_area = payload.community_area;
    }
  }
  if (payload.projects) extra.projects = payload.projects.trim();
  
  // Campos específicos para Militar/Forças de segurança
  if (payload.service_branch) extra.service_branch = payload.service_branch;
  if (payload.unit) extra.unit = payload.unit.trim();
  if (payload.org_custom) extra.org_custom = payload.org_custom.trim();
  if (payload.rank_custom) extra.rank_custom = payload.rank_custom.trim();

  const toInsert = {
    ...base,
    extra: Object.keys(extra).length ? extra : {},
    updated_at: new Date().toISOString(),
  };

  // Log de desenvolvimento para Mentor
  if (payload.role_code === 'INF_MENTOR' && import.meta.env.DEV) {
    devLog('upsert mentor leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Celebridade
  if (payload.role_code === 'MID_CELEBRIDADE' && import.meta.env.DEV) {
    devLog('upsert celebrity leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Jornalista
  if (payload.role_code === 'MID_JORNALISTA' && import.meta.env.DEV) {
    devLog('upsert journalist leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Influenciador digital
  if (payload.role_code === 'MID_INFLUENCER' && import.meta.env.DEV) {
    devLog('upsert influencer leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Presidente de entidade
  if (payload.role_code === 'POL_PRESIDENTE_ENTIDADE' && import.meta.env.DEV) {
    devLog('upsert president entity leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Liderança partidária
  if (payload.role_code === 'POL_PARTIDARIA' && import.meta.env.DEV) {
    devLog('upsert party leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Influenciador cultural
  if (payload.role_code === 'SOC_CULTURAL' && import.meta.env.DEV) {
    devLog('upsert cultural influencer leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Educador
  if (payload.role_code === 'SOC_EDUCADOR' && import.meta.env.DEV) {
    devLog('upsert educator leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Líder Comunitário
  if (payload.role_code === 'COM_LIDER' && import.meta.env.DEV) {
    devLog('upsert community leader leadership -> payload extra:', extra);
  }

  // Log de desenvolvimento para Militar/Forças de segurança
  if (payload.role_code === 'PUB_CHEFIA' && import.meta.env.DEV) {
    devLog('upsert military leadership -> payload extra:', extra);
  }

  // upsert idempotente por profile_id (há índice único em profile_id)
  const { data, error } = await getSupabaseClient()
    .from('profile_leaderships')
    .upsert(toInsert, { onConflict: 'profile_id' })
    .select('*')
    .maybeSingle(); // 👈 evita erro "0 rows"

  if (error) throw error;
  return data as ProfileLeadership;
}

// 2) Upsert (1 por líder) — usando onConflict: 'profile_id' (função legada)
export async function upsertProfileLeadershipLegacy(payload: {
  profile_id: string;
  role_code: string;
  organization?: string;
  title?: string;
  level?: number;
  reach_scope?: 'FAMILIA'|'BAIRRO'|'CIDADE'|'REGIAO'|'ONLINE';
  reach_size?: number;
  extra?: Record<string, any>;
}): Promise<ProfileLeadership> {
  if (!getSupabaseClient()) throw new Error('Supabase client not initialized');
  
  // Validar UUID
  if (!payload.profile_id || !isUuid(payload.profile_id)) {
    throw new Error('profile_id inválido (UUID obrigatório).');
  }
  
  const row = {
    profile_id: payload.profile_id,
    role_code: payload.role_code,
    organization: (payload.organization ?? '').trim() || null,
    title: (payload.title ?? '').trim() || null,
    level: payload.level || null,
    reach_scope: payload.reach_scope || null,
    reach_size: payload.reach_size || null,
    extra: payload.extra || {}
  };

  const { data, error } = await getSupabaseClient()
    .from('profile_leaderships')
    .upsert(row, { onConflict: 'profile_id' })
    .select('*')
    .maybeSingle(); // 👈 evita erro "0 rows"

  if (error) {
    console.error('[leadership] upsert error', error);
    
    // Tratamento de erros específicos
    if (error.message?.includes('chk_politico_extra')) {
      throw new Error('Políticos devem ter status e cargo preenchidos');
    } else if (error.message?.includes('chk_exec_empresa_extra')) {
      throw new Error('Empresários devem ter ramo de atividade preenchido');
    } else if (error.message?.includes('chk_servidor_extra')) {
      throw new Error('Servidores públicos devem ter área de atuação preenchida');
    } else if (error.message?.includes('foreign key constraint')) {
      throw new Error('Papel selecionado não é válido');
    } else {
      throw new Error('Falha ao salvar nível de liderança');
    }
  }
  return data;
}

// 3) Deleta nível de liderança pelo ID do registro
export async function deleteProfileLeadership(profileLeadershipId: string): Promise<void> {
  if (!getSupabaseClient()) throw new Error('Supabase client not initialized');
  
  // Validar UUID
  if (!profileLeadershipId || !isUuid(profileLeadershipId)) {
    throw new Error('profileLeadershipId inválido (UUID obrigatório).');
  }
  
  const { error } = await getSupabaseClient()
    .from('profile_leaderships')
    .delete()
    .eq('id', profileLeadershipId);
  
  if (error) throw error;
}

// 4) Catálogo de opções (fallback estático)
export function getLeadershipCatalog() {
  // Tenta buscar de uma tabela leadership_roles (se existir)
  // Por enquanto, retorna o catálogo estático
  return ROLE_OPTIONS;
}
