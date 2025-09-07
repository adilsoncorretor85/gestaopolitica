export type LeadershipRoleCode =
  | 'POL_ELEITO'
  | 'POL_PARTIDARIA'
  | 'POL_PRESIDENTE_ENTIDADE'
  | 'ORG_EXEC'            // Empresário / Executivo
  | 'ORG_ACADEMICO'       // Acadêmico / Pesquisador
  | 'PUB_GESTOR'
  | 'PUB_CHEFIA'
  | 'MID_INFLUENCER'
  | 'MID_JORNALISTA'
  | 'MID_CELEBRIDADE'
  | 'SOC_COMUNITARIO'
  | 'SOC_RELIGIOSO'
  | 'SOC_EDUCADOR'
  | 'SOC_CULTURAL'
  | 'COM_LIDER'           // Líder Comunitário
  | 'INF_MUNICIPE'
  | 'INF_MENTOR'
  | 'INF_PATRIARCA';

// Manter compatibilidade com código existente
export type RoleCode = LeadershipRoleCode;

export type InfluenceLevel = 'LOCAL' | 'REGIONAL' | 'NACIONAL' | 'INTERNACIONAL';

export interface AcademicExtra {
  /** Área de atuação/linha de pesquisa, ex.: Direito Constitucional, Eng. Civil, Educação Básica */
  field_of_study?: string;
  /** Nível de influência acadêmica */
  influence_level?: InfluenceLevel;
}

export type PatriarcaExtra = {
  family_size?: number;
  generation_scope?: 'FILHOS' | 'NETOS' | 'BISNETOS' | 'MULTIGERACIONAL';
  influence_roles?: Array<'CONSELHEIRO'|'FINANCEIRO'|'ESPIRITUAL'|'CUIDADOR'|'REFERENCIA_FAMILIAR'>;
  tradition?: 'CATOLICA'|'EVANGELICA'|'LUTERANA'|'ESPIRITA'|'MATRIZ_AFRICANA'|'ISLAMICA'|'JUDAICA'|'AGNOSTICA'|'ATEIA'|'SEM_RELIGIAO'|'OUTRA';
  tradition_other?: string;
};

export type MentorExtra = {
  mentorship_type: 'DESENVOLVIMENTO_PESSOAL' | 'CARREIRA' | 'EMPRESARIAL' | 'ESPIRITUAL' | 'ACADEMICO' | 'OUTRO';
  mentorship_type_other?: string;
  target_audience?: ('JOVENS' | 'PROFISSIONAIS_INICIANTES' | 'EMPRESARIOS_EXECUTIVOS' | 'COMUNIDADE' | 'ATLETAS_ARTISTAS' | 'OUTRO')[];
  target_audience_other?: string;
  mentees_count?: number;
  certification?: string;
};

export type CelebrityExtra = {
  celebrity_area?: string;   // Música, Esporte, TV, etc.
  public_role?: string;      // Cantor, Ator, Atleta, etc.
  audience?: string;         // opcional
};

export type JournalistExtra = {
  media_area?: 'Política' | 'Economia' | 'Cultura' | 'Esportes' | 'Segurança' | 'Internacional' | 'Religião' | 'Tecnologia' | 'Saúde' | 'Educação' | 'Agronegócio' | 'Variedades' | 'Outro';
  audience_scope?: 'LOCAL' | 'REGIONAL' | 'NACIONAL' | 'INTERNACIONAL' | 'ONLINE';
};

export type InfluencerExtra = {
  platform?: string;
  niche?: string;
  reach_estimate?: string | number;
  influence_type?: 'Pessoal' | 'Comercial' | 'Comunitária' | 'Política';
};

export type PresidentEntityExtra = {
  entity_type?: 'ASSOCIACAO_BAIRRO' | 'SINDICATO' | 'ONG_FUNDACAO' | 'CLUBE_SOCIEDADE' | 'CONSELHO_PROFISSIONAL' | 'CAMARA_COMERCIO' | 'OUTRO';
  scope?: 'CIDADE' | 'REGIAO' | 'ESTADUAL' | 'NACIONAL';
  mandate_start?: string; // ISO date (YYYY-MM-DD)
  mandate_end?: string;   // ISO date (YYYY-MM-DD)
};

export type CulturalInfluencerExtra = {
  segment: string;              // obrigatório
  segment_other?: string;       // se segment === 'Outro'
  role?: string;                // opcional
  role_other?: string;          // se role === 'Outro'
  scope?: 'Local/Bairro' | 'Municipal' | 'Regional' | 'Nacional' | 'Internacional';
  notes?: string;
};

export type EducatorExtra = {
  education_level: 'INFANTIL' | 'FUNDAMENTAL' | 'MEDIO' | 'TECNICO' | 'SUPERIOR' | 'POS_GRADUACAO' | 'CURSOS_LIVRES'; // obrigatório
  subject_area?: string;        // opcional
  reach_scope?: 'SALA_AULA' | 'INSTITUICAO' | 'REGIONAL' | 'NACIONAL'; // opcional
  notes?: string;               // opcional
};

export type CommunityLeadershipExtra = {
  community_area: string;       // obrigatório
  projects?: string;            // opcional
  other_community_area?: string; // opcional, se "Outro"
};

export type ExtraMilitary = {
  service_branch?: string;      // obrigatório
  unit?: string;                // opcional
  org_custom?: string;          // opcional, se "Outro"
  rank_custom?: string;         // opcional, se "Outro"
           // opcional
};

export type LeadershipExtra =
  | AcademicExtra
  | PatriarcaExtra
  | MentorExtra
  | CelebrityExtra
  | JournalistExtra
  | InfluencerExtra
  | PresidentEntityExtra
  | CulturalInfluencerExtra
  | EducatorExtra
  | CommunityLeadershipExtra
  | ExtraMilitary
  | Record<string, unknown>; // demais papéis mantêm compatibilidade

export interface ProfileLeadership {
  id: string;
  profile_id: string;          // referencia leader_profiles.id
  role_code: LeadershipRoleCode;
  organization?: string | null;
  title?: string | null;
  level: number | null;
  reach_scope: string | null;
  reach_size: number | null;
  extra?: Record<string, any>; // manter genérico; no caso acadêmico segue AcademicExtra
  created_at?: string;
  updated_at?: string;
}

export interface LeadershipFormValues {
  role_code: LeadershipRoleCode;
  // Campos genéricos
  organization?: string;
  title?: string;
  // Campos específicos para acadêmicos (ficam em extra)
  field_of_study?: string;
  influence_level?: InfluenceLevel;
  // Campos específicos para patriarca (ficam em extra)
  family_size?: number;
  generation_scope?: 'FILHOS' | 'NETOS' | 'BISNETOS' | 'MULTIGERACIONAL';
  influence_roles?: Array<'CONSELHEIRO'|'FINANCEIRO'|'ESPIRITUAL'|'CUIDADOR'|'REFERENCIA_FAMILIAR'>;
  tradition?: 'CATOLICA'|'EVANGELICA'|'LUTERANA'|'ESPIRITA'|'MATRIZ_AFRICANA'|'ISLAMICA'|'JUDAICA'|'AGNOSTICA'|'ATEIA'|'SEM_RELIGIAO'|'OUTRA';
  tradition_other?: string;
  // Campos específicos para mentor (ficam em extra)
  mentorship_type?: 'DESENVOLVIMENTO_PESSOAL' | 'CARREIRA' | 'EMPRESARIAL' | 'ESPIRITUAL' | 'ACADEMICO' | 'OUTRO';
  mentorship_type_other?: string;
  target_audience?: ('JOVENS' | 'PROFISSIONAIS_INICIANTES' | 'EMPRESARIOS_EXECUTIVOS' | 'COMUNIDADE' | 'ATLETAS_ARTISTAS' | 'OUTRO')[];
  target_audience_other?: string;
  mentees_count?: number;
  certification?: string;
  // Campos específicos para celebridade (ficam em extra)
  celebrity_area?: string;
  public_role?: string;
  audience?: string;
  // Campos específicos para jornalista (ficam em extra)
  media_area?: 'Política' | 'Economia' | 'Cultura' | 'Esportes' | 'Segurança' | 'Internacional' | 'Religião' | 'Tecnologia' | 'Saúde' | 'Educação' | 'Agronegócio' | 'Variedades' | 'Outro';
  audience_scope?: 'LOCAL' | 'REGIONAL' | 'NACIONAL' | 'INTERNACIONAL' | 'ONLINE';
  // Campos específicos para influenciador digital (ficam em extra)
  platform?: string;
  niche?: string;
  reach_estimate?: string | number;
  influence_type?: 'Pessoal' | 'Comercial' | 'Comunitária' | 'Política';
  // Campos específicos para presidente de entidade (ficam em extra)
  entity_type?: 'ASSOCIACAO_BAIRRO' | 'SINDICATO' | 'ONG_FUNDACAO' | 'CLUBE_SOCIEDADE' | 'CONSELHO_PROFISSIONAL' | 'CAMARA_COMERCIO' | 'OUTRO';
  scope?: 'CIDADE' | 'REGIAO' | 'ESTADUAL' | 'NACIONAL';
  mandate_start?: string;
  mandate_end?: string;
  // Campos específicos para liderança partidária (ficam em extra)
  party?: string;
  party_office?: string;
  party_office_other?: string;
  party_scope?: 'MUNICIPAL' | 'ESTADUAL' | 'NACIONAL';
  party_status?: 'EM_EXERCICIO' | 'SUPLENTE' | 'EX_DIRIGENTE' | 'PRE_CANDIDATO';
  party_mandate_start?: string;
  party_mandate_end?: string;
  // Campos específicos para influenciador cultural (ficam em extra)
  cultural_segment?: string;
  cultural_segment_other?: string;
  cultural_role?: string;
  cultural_role_other?: string;
  cultural_scope?: 'Local/Bairro' | 'Municipal' | 'Regional' | 'Nacional' | 'Internacional';
  cultural_notes?: string;
  // Campos específicos para educador (ficam em extra)
  education_level?: 'INFANTIL' | 'FUNDAMENTAL' | 'MEDIO' | 'TECNICO' | 'SUPERIOR' | 'POS_GRADUACAO' | 'CURSOS_LIVRES';
  subject_area?: string;
  reach_scope?: 'SALA_AULA' | 'INSTITUICAO' | 'REGIONAL' | 'NACIONAL';
  notes?: string;
  // Campos específicos para líder comunitário (ficam em extra)
  community_area?: string;
  projects?: string;
  other_community_area?: string;
  // Campos específicos para militar/forças de segurança (ficam em extra)
  service_branch?: string;
  unit?: string;
  org_custom?: string;
  rank_custom?: string;
}

// Catálogo de opções de papéis
export const ROLE_OPTIONS: { code: RoleCode; label: string; group: 'Institucional'|'Social'|'Política'|'Midiática'|'Informal' }[] = [
  { code:'POL_ELEITO', label:'Político Eleito', group:'Política' },
  { code:'ORG_EXEC', label:'Empresário / Executivo', group:'Institucional' },
  { code:'PUB_GESTOR', label:'Gestor público / Governante', group:'Institucional' },
  { code:'PUB_CHEFIA', label:'Militar / Forças de segurança', group:'Institucional' },
  { code:'ORG_ACADEMICO', label:'Acadêmico / Pesquisador', group:'Institucional' },
  { code:'SOC_COMUNITARIO', label:'Líder comunitário', group:'Social' },
  { code:'SOC_RELIGIOSO', label:'Líder religioso', group:'Social' },
  { code:'SOC_EDUCADOR', label:'Educador / Professor', group:'Social' },
  { code:'SOC_CULTURAL', label:'Influenciador cultural/artístico', group:'Social' },
  { code:'POL_PARTIDARIA', label:'Liderança partidária', group:'Política' },
  { code:'POL_PRESIDENTE_ENTIDADE', label:'Presidente de entidade', group:'Política' },
  { code:'MID_INFLUENCER', label:'Influenciador digital', group:'Midiática' },
  { code:'MID_JORNALISTA', label:'Jornalista / Comunicador', group:'Midiática' },
  { code:'MID_CELEBRIDADE', label:'Celebridade pública', group:'Midiática' },
  { code:'INF_MUNICIPE', label:'Munícipe engajado', group:'Informal' },
  { code:'INF_MENTOR', label:'Mentor / Coach / Conselheiro', group:'Informal' },
  { code:'INF_PATRIARCA', label:'Patriarca/Matriarca familiar', group:'Informal' },
];

export const POLITICAL_OFFICES = ['Vereador','Prefeito','Deputado Estadual','Deputado Federal','Senador'] as const;
export const POLITICAL_STATUS = ['Em Mandato','Suplente','Ex','Pré-candidato'] as const;

// Tipos para gestor público
export type GovernmentLevel = 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';

export const PUBLIC_AREAS = [
  'Educação',
  'Saúde', 
  'Segurança',
  'Obras/Infraestrutura',
  'Fazenda/Finanças',
  'Meio Ambiente',
  'Cultura/Esporte',
  'Administração/Governo',
  'Outro'
] as const;

export const GOVERNMENT_LEVELS = [
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'FEDERAL', label: 'Federal' }
] as const;

// Helper para detectar papel Mentor
export const isMentorRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'INF_MENTOR';
  }
  return role.code === 'INF_MENTOR' || role.label === 'Mentor / Coach / Conselheiro';
};

// Helper para detectar papel Celebridade
export const isCelebrityRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'MID_CELEBRIDADE';
  }
  return role.code === 'MID_CELEBRIDADE' || role.label === 'Celebridade pública';
};

// Helper para detectar papel Jornalista
export const isJournalistRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'MID_JORNALISTA';
  }
  return role.code === 'MID_JORNALISTA' || role.label === 'Jornalista / Comunicador';
};

// Helper para detectar papel Influenciador digital
export const isInfluencerRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'MID_INFLUENCER';
  }
  return role.code === 'MID_INFLUENCER' || role.label === 'Influenciador digital';
};

// Helper para detectar papel Presidente de entidade
export const isPresidentEntityRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'POL_PRESIDENTE_ENTIDADE';
  }
  return role.code === 'POL_PRESIDENTE_ENTIDADE' || role.label === 'Presidente de entidade';
};

// Opções para Jornalista/Comunicador
export const MEDIA_AREAS = ['Política','Economia','Cultura','Esportes','Segurança','Internacional','Religião','Tecnologia','Saúde','Educação','Agronegócio','Variedades','Outro'] as const;

export const AUDIENCE_SCOPES = [
  { value: 'LOCAL', label: 'Local' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'NACIONAL', label: 'Nacional' },
  { value: 'INTERNACIONAL', label: 'Internacional' },
  { value: 'ONLINE', label: 'Online' },
] as const;

// Opções para Influenciador digital
export const PLATFORM_OPTIONS = [
  { value: 'Instagram', label: 'Instagram' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Twitch', label: 'Twitch' },
  { value: 'Podcast', label: 'Podcast' },
  { value: 'Blog', label: 'Blog' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'X/Twitter', label: 'X/Twitter' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Outros', label: 'Outros' },
] as const;

export const INFLUENCE_TYPE_OPTIONS = [
  { value: 'Pessoal', label: 'Pessoal' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Comunitária', label: 'Comunitária' },
  { value: 'Política', label: 'Política' },
] as const;

// Opções para Presidente de entidade
export const ENTITY_TYPE_OPTIONS = [
  { value: 'ASSOCIACAO_BAIRRO', label: 'Associação de bairro' },
  { value: 'SINDICATO', label: 'Sindicato' },
  { value: 'ONG_FUNDACAO', label: 'ONG/Fundação' },
  { value: 'CLUBE_SOCIEDADE', label: 'Clube/Sociedade' },
  { value: 'CONSELHO_PROFISSIONAL', label: 'Conselho Profissional' },
  { value: 'CAMARA_COMERCIO', label: 'Câmara de Comércio' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export const PRESIDENT_SCOPE_OPTIONS = [
  { value: 'CIDADE', label: 'Cidade' },
  { value: 'REGIAO', label: 'Região' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'NACIONAL', label: 'Nacional' },
] as const;

export const PUBLIC_POSITIONS = [
  'Secretário Municipal',
  'Diretor',
  'Coordenador', 
  'Chefe de Gabinete',
  'Outro'
] as const;

// Opções para Educador/Professor
export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'INFANTIL', label: 'Educação Infantil' },
  { value: 'FUNDAMENTAL', label: 'Ensino Fundamental' },
  { value: 'MEDIO', label: 'Ensino Médio' },
  { value: 'TECNICO', label: 'Ensino Técnico' },
  { value: 'SUPERIOR', label: 'Ensino Superior' },
  { value: 'POS_GRADUACAO', label: 'Pós-graduação / Pesquisa' },
  { value: 'CURSOS_LIVRES', label: 'Cursos Livres / Formação Complementar' },
] as const;

export const EDUCATOR_REACH_SCOPE_OPTIONS = [
  { value: 'SALA_AULA', label: 'Sala de aula / turmas' },
  { value: 'INSTITUICAO', label: 'Escola / Instituição inteira' },
  { value: 'REGIONAL', label: 'Rede municipal/estadual' },
  { value: 'NACIONAL', label: 'Autor/Referência nacional' },
] as const;

// Opções para Líder Comunitário
export const COMMUNITY_AREAS = [
  "Segurança pública / Conselho comunitário",
  "Saúde / Conselho local de saúde",
  "Educação / Conselho escolar / Grêmio",
  "Esporte e cultura / Grupos locais",
  "Infraestrutura / Associação de moradores",
  "Assistência social / Voluntariado",
  "Outro",
] as const;

export const REACH_SCOPE_OPTIONS = [
  { label: "Rua / Quadra", value: "FAMILIA" },
  { label: "Bairro", value: "BAIRRO" },
  { label: "Região da cidade", value: "REGIAO" },
  { label: "Município", value: "CIDADE" },
  { label: "Online", value: "ONLINE" },
] as const;

// Opções para Militar/Forças de segurança
export const MILITARY_SERVICE_BRANCHES = [
  "Polícia Militar",
  "Exército Brasileiro",
  "Polícia Civil",
  "Bombeiros Militares",
  "Guarda Municipal",
  "Polícia Federal",
  "Outro",
] as const;

export const MILITARY_RANKS = [
  "Soldado",
  "Cabo",
  "Sargento",
  "Tenente",
  "Capitão",
  "Major",
  "Tenente-Coronel",
  "Coronel",
  "Delegado",
  "Agente",
  "Inspetor",
  "Comandante",
  "Subcomandante",
  "Outro",
] as const;

// Helper para detectar papel Educador
export const isEducatorRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'SOC_EDUCADOR';
  }
  return role.code === 'SOC_EDUCADOR' || role.label === 'Educador / Professor';
};

// Helper para detectar papel Líder Comunitário
export const isCommunityLeaderRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'COM_LIDER';
  }
  return role.code === 'COM_LIDER' || role.label === 'Líder Comunitário';
};

// Helper para detectar papel Militar/Forças de segurança
export const isMilitaryRole = (role: string | { code: string; label: string }) => {
  if (typeof role === 'string') {
    return role === 'PUB_CHEFIA';
  }
  return role.code === 'PUB_CHEFIA' || role.label === 'Militar / Forças de segurança';
};

