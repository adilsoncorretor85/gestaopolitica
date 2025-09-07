export type LeadershipRoleCode = 'POL_ELEITO' | 'POL_PARTIDARIA' | 'POL_PRESIDENTE_ENTIDADE' | 'ORG_EXEC' | 'ORG_ACADEMICO' | 'PUB_GESTOR' | 'PUB_CHEFIA' | 'MID_INFLUENCER' | 'MID_JORNALISTA' | 'MID_CELEBRIDADE' | 'SOC_COMUNITARIO' | 'SOC_RELIGIOSO' | 'SOC_EDUCADOR' | 'SOC_CULTURAL' | 'COM_LIDER' | 'INF_MUNICIPE' | 'INF_MENTOR' | 'INF_PATRIARCA';
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
    influence_roles?: Array<'CONSELHEIRO' | 'FINANCEIRO' | 'ESPIRITUAL' | 'CUIDADOR' | 'REFERENCIA_FAMILIAR'>;
    tradition?: 'CATOLICA' | 'EVANGELICA' | 'LUTERANA' | 'ESPIRITA' | 'MATRIZ_AFRICANA' | 'ISLAMICA' | 'JUDAICA' | 'AGNOSTICA' | 'ATEIA' | 'SEM_RELIGIAO' | 'OUTRA';
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
    celebrity_area?: string;
    public_role?: string;
    audience?: string;
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
    mandate_start?: string;
    mandate_end?: string;
};
export type CulturalInfluencerExtra = {
    segment: string;
    segment_other?: string;
    role?: string;
    role_other?: string;
    scope?: 'Local/Bairro' | 'Municipal' | 'Regional' | 'Nacional' | 'Internacional';
    notes?: string;
};
export type EducatorExtra = {
    education_level: 'INFANTIL' | 'FUNDAMENTAL' | 'MEDIO' | 'TECNICO' | 'SUPERIOR' | 'POS_GRADUACAO' | 'CURSOS_LIVRES';
    subject_area?: string;
    reach_scope?: 'SALA_AULA' | 'INSTITUICAO' | 'REGIONAL' | 'NACIONAL';
    notes?: string;
};
export type CommunityLeadershipExtra = {
    community_area: string;
    projects?: string;
    other_community_area?: string;
};
export type ExtraMilitary = {
    service_branch?: string;
    unit?: string;
    org_custom?: string;
    rank_custom?: string;
};
export type LeadershipExtra = AcademicExtra | PatriarcaExtra | MentorExtra | CelebrityExtra | JournalistExtra | InfluencerExtra | PresidentEntityExtra | CulturalInfluencerExtra | EducatorExtra | CommunityLeadershipExtra | ExtraMilitary | Record<string, unknown>;
export interface ProfileLeadership {
    id: string;
    profile_id: string;
    role_code: LeadershipRoleCode;
    organization?: string | null;
    title?: string | null;
    level: number | null;
    reach_scope: string | null;
    reach_size: number | null;
    extra?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
}
export interface LeadershipFormValues {
    role_code: LeadershipRoleCode;
    organization?: string;
    title?: string;
    field_of_study?: string;
    influence_level?: InfluenceLevel;
    family_size?: number;
    generation_scope?: 'FILHOS' | 'NETOS' | 'BISNETOS' | 'MULTIGERACIONAL';
    influence_roles?: Array<'CONSELHEIRO' | 'FINANCEIRO' | 'ESPIRITUAL' | 'CUIDADOR' | 'REFERENCIA_FAMILIAR'>;
    tradition?: 'CATOLICA' | 'EVANGELICA' | 'LUTERANA' | 'ESPIRITA' | 'MATRIZ_AFRICANA' | 'ISLAMICA' | 'JUDAICA' | 'AGNOSTICA' | 'ATEIA' | 'SEM_RELIGIAO' | 'OUTRA';
    tradition_other?: string;
    mentorship_type?: 'DESENVOLVIMENTO_PESSOAL' | 'CARREIRA' | 'EMPRESARIAL' | 'ESPIRITUAL' | 'ACADEMICO' | 'OUTRO';
    mentorship_type_other?: string;
    target_audience?: ('JOVENS' | 'PROFISSIONAIS_INICIANTES' | 'EMPRESARIOS_EXECUTIVOS' | 'COMUNIDADE' | 'ATLETAS_ARTISTAS' | 'OUTRO')[];
    target_audience_other?: string;
    mentees_count?: number;
    certification?: string;
    celebrity_area?: string;
    public_role?: string;
    audience?: string;
    media_area?: 'Política' | 'Economia' | 'Cultura' | 'Esportes' | 'Segurança' | 'Internacional' | 'Religião' | 'Tecnologia' | 'Saúde' | 'Educação' | 'Agronegócio' | 'Variedades' | 'Outro';
    audience_scope?: 'LOCAL' | 'REGIONAL' | 'NACIONAL' | 'INTERNACIONAL' | 'ONLINE';
    platform?: string;
    niche?: string;
    reach_estimate?: string | number;
    influence_type?: 'Pessoal' | 'Comercial' | 'Comunitária' | 'Política';
    entity_type?: 'ASSOCIACAO_BAIRRO' | 'SINDICATO' | 'ONG_FUNDACAO' | 'CLUBE_SOCIEDADE' | 'CONSELHO_PROFISSIONAL' | 'CAMARA_COMERCIO' | 'OUTRO';
    scope?: 'CIDADE' | 'REGIAO' | 'ESTADUAL' | 'NACIONAL';
    mandate_start?: string;
    mandate_end?: string;
    party?: string;
    party_office?: string;
    party_office_other?: string;
    party_scope?: 'MUNICIPAL' | 'ESTADUAL' | 'NACIONAL';
    party_status?: 'EM_EXERCICIO' | 'SUPLENTE' | 'EX_DIRIGENTE' | 'PRE_CANDIDATO';
    party_mandate_start?: string;
    party_mandate_end?: string;
    cultural_segment?: string;
    cultural_segment_other?: string;
    cultural_role?: string;
    cultural_role_other?: string;
    cultural_scope?: 'Local/Bairro' | 'Municipal' | 'Regional' | 'Nacional' | 'Internacional';
    cultural_notes?: string;
    education_level?: 'INFANTIL' | 'FUNDAMENTAL' | 'MEDIO' | 'TECNICO' | 'SUPERIOR' | 'POS_GRADUACAO' | 'CURSOS_LIVRES';
    subject_area?: string;
    reach_scope?: 'SALA_AULA' | 'INSTITUICAO' | 'REGIONAL' | 'NACIONAL';
    notes?: string;
    community_area?: string;
    projects?: string;
    other_community_area?: string;
    service_branch?: string;
    unit?: string;
    org_custom?: string;
    rank_custom?: string;
}
export declare const ROLE_OPTIONS: {
    code: RoleCode;
    label: string;
    group: 'Institucional' | 'Social' | 'Política' | 'Midiática' | 'Informal';
}[];
export declare const POLITICAL_OFFICES: readonly ["Vereador", "Prefeito", "Deputado Estadual", "Deputado Federal", "Senador"];
export declare const POLITICAL_STATUS: readonly ["Em Mandato", "Suplente", "Ex", "Pré-candidato"];
export type GovernmentLevel = 'MUNICIPAL' | 'ESTADUAL' | 'FEDERAL';
export declare const PUBLIC_AREAS: readonly ["Educação", "Saúde", "Segurança", "Obras/Infraestrutura", "Fazenda/Finanças", "Meio Ambiente", "Cultura/Esporte", "Administração/Governo", "Outro"];
export declare const GOVERNMENT_LEVELS: readonly [{
    readonly value: "MUNICIPAL";
    readonly label: "Municipal";
}, {
    readonly value: "ESTADUAL";
    readonly label: "Estadual";
}, {
    readonly value: "FEDERAL";
    readonly label: "Federal";
}];
export declare const isMentorRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const isCelebrityRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const isJournalistRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const isInfluencerRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const isPresidentEntityRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const MEDIA_AREAS: readonly ["Política", "Economia", "Cultura", "Esportes", "Segurança", "Internacional", "Religião", "Tecnologia", "Saúde", "Educação", "Agronegócio", "Variedades", "Outro"];
export declare const AUDIENCE_SCOPES: readonly [{
    readonly value: "LOCAL";
    readonly label: "Local";
}, {
    readonly value: "REGIONAL";
    readonly label: "Regional";
}, {
    readonly value: "NACIONAL";
    readonly label: "Nacional";
}, {
    readonly value: "INTERNACIONAL";
    readonly label: "Internacional";
}, {
    readonly value: "ONLINE";
    readonly label: "Online";
}];
export declare const PLATFORM_OPTIONS: readonly [{
    readonly value: "Instagram";
    readonly label: "Instagram";
}, {
    readonly value: "TikTok";
    readonly label: "TikTok";
}, {
    readonly value: "YouTube";
    readonly label: "YouTube";
}, {
    readonly value: "Twitch";
    readonly label: "Twitch";
}, {
    readonly value: "Podcast";
    readonly label: "Podcast";
}, {
    readonly value: "Blog";
    readonly label: "Blog";
}, {
    readonly value: "Facebook";
    readonly label: "Facebook";
}, {
    readonly value: "X/Twitter";
    readonly label: "X/Twitter";
}, {
    readonly value: "LinkedIn";
    readonly label: "LinkedIn";
}, {
    readonly value: "Outros";
    readonly label: "Outros";
}];
export declare const INFLUENCE_TYPE_OPTIONS: readonly [{
    readonly value: "Pessoal";
    readonly label: "Pessoal";
}, {
    readonly value: "Comercial";
    readonly label: "Comercial";
}, {
    readonly value: "Comunitária";
    readonly label: "Comunitária";
}, {
    readonly value: "Política";
    readonly label: "Política";
}];
export declare const ENTITY_TYPE_OPTIONS: readonly [{
    readonly value: "ASSOCIACAO_BAIRRO";
    readonly label: "Associação de bairro";
}, {
    readonly value: "SINDICATO";
    readonly label: "Sindicato";
}, {
    readonly value: "ONG_FUNDACAO";
    readonly label: "ONG/Fundação";
}, {
    readonly value: "CLUBE_SOCIEDADE";
    readonly label: "Clube/Sociedade";
}, {
    readonly value: "CONSELHO_PROFISSIONAL";
    readonly label: "Conselho Profissional";
}, {
    readonly value: "CAMARA_COMERCIO";
    readonly label: "Câmara de Comércio";
}, {
    readonly value: "OUTRO";
    readonly label: "Outro";
}];
export declare const PRESIDENT_SCOPE_OPTIONS: readonly [{
    readonly value: "CIDADE";
    readonly label: "Cidade";
}, {
    readonly value: "REGIAO";
    readonly label: "Região";
}, {
    readonly value: "ESTADUAL";
    readonly label: "Estadual";
}, {
    readonly value: "NACIONAL";
    readonly label: "Nacional";
}];
export declare const PUBLIC_POSITIONS: readonly ["Secretário Municipal", "Diretor", "Coordenador", "Chefe de Gabinete", "Outro"];
export declare const EDUCATION_LEVEL_OPTIONS: readonly [{
    readonly value: "INFANTIL";
    readonly label: "Educação Infantil";
}, {
    readonly value: "FUNDAMENTAL";
    readonly label: "Ensino Fundamental";
}, {
    readonly value: "MEDIO";
    readonly label: "Ensino Médio";
}, {
    readonly value: "TECNICO";
    readonly label: "Ensino Técnico";
}, {
    readonly value: "SUPERIOR";
    readonly label: "Ensino Superior";
}, {
    readonly value: "POS_GRADUACAO";
    readonly label: "Pós-graduação / Pesquisa";
}, {
    readonly value: "CURSOS_LIVRES";
    readonly label: "Cursos Livres / Formação Complementar";
}];
export declare const EDUCATOR_REACH_SCOPE_OPTIONS: readonly [{
    readonly value: "SALA_AULA";
    readonly label: "Sala de aula / turmas";
}, {
    readonly value: "INSTITUICAO";
    readonly label: "Escola / Instituição inteira";
}, {
    readonly value: "REGIONAL";
    readonly label: "Rede municipal/estadual";
}, {
    readonly value: "NACIONAL";
    readonly label: "Autor/Referência nacional";
}];
export declare const COMMUNITY_AREAS: readonly ["Segurança pública / Conselho comunitário", "Saúde / Conselho local de saúde", "Educação / Conselho escolar / Grêmio", "Esporte e cultura / Grupos locais", "Infraestrutura / Associação de moradores", "Assistência social / Voluntariado", "Outro"];
export declare const REACH_SCOPE_OPTIONS: readonly [{
    readonly label: "Rua / Quadra";
    readonly value: "FAMILIA";
}, {
    readonly label: "Bairro";
    readonly value: "BAIRRO";
}, {
    readonly label: "Região da cidade";
    readonly value: "REGIAO";
}, {
    readonly label: "Município";
    readonly value: "CIDADE";
}, {
    readonly label: "Online";
    readonly value: "ONLINE";
}];
export declare const MILITARY_SERVICE_BRANCHES: readonly ["Polícia Militar", "Exército Brasileiro", "Polícia Civil", "Bombeiros Militares", "Guarda Municipal", "Polícia Federal", "Outro"];
export declare const MILITARY_RANKS: readonly ["Soldado", "Cabo", "Sargento", "Tenente", "Capitão", "Major", "Tenente-Coronel", "Coronel", "Delegado", "Agente", "Inspetor", "Comandante", "Subcomandante", "Outro"];
export declare const isEducatorRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const isCommunityLeaderRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
export declare const isMilitaryRole: (role: string | {
    code: string;
    label: string;
}) => boolean;
