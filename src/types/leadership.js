// Catálogo de opções de papéis
export const ROLE_OPTIONS = [
    { code: 'POL_ELEITO', label: 'Político Eleito', group: 'Política' },
    { code: 'ORG_EXEC', label: 'Empresário / Executivo', group: 'Institucional' },
    { code: 'PUB_GESTOR', label: 'Gestor público / Governante', group: 'Institucional' },
    { code: 'PUB_CHEFIA', label: 'Militar / Forças de segurança', group: 'Institucional' },
    { code: 'ORG_ACADEMICO', label: 'Acadêmico / Pesquisador', group: 'Institucional' },
    { code: 'SOC_COMUNITARIO', label: 'Líder comunitário', group: 'Social' },
    { code: 'SOC_RELIGIOSO', label: 'Líder religioso', group: 'Social' },
    { code: 'SOC_EDUCADOR', label: 'Educador / Professor', group: 'Social' },
    { code: 'SOC_CULTURAL', label: 'Influenciador cultural/artístico', group: 'Social' },
    { code: 'POL_PARTIDARIA', label: 'Liderança partidária', group: 'Política' },
    { code: 'POL_PRESIDENTE_ENTIDADE', label: 'Presidente de entidade', group: 'Política' },
    { code: 'MID_INFLUENCER', label: 'Influenciador digital', group: 'Midiática' },
    { code: 'MID_JORNALISTA', label: 'Jornalista / Comunicador', group: 'Midiática' },
    { code: 'MID_CELEBRIDADE', label: 'Celebridade pública', group: 'Midiática' },
    { code: 'INF_MUNICIPE', label: 'Munícipe engajado', group: 'Informal' },
    { code: 'INF_MENTOR', label: 'Mentor / Coach / Conselheiro', group: 'Informal' },
    { code: 'INF_PATRIARCA', label: 'Patriarca/Matriarca familiar', group: 'Informal' },
];
export const POLITICAL_OFFICES = ['Vereador', 'Prefeito', 'Deputado Estadual', 'Deputado Federal', 'Senador'];
export const POLITICAL_STATUS = ['Em Mandato', 'Suplente', 'Ex', 'Pré-candidato'];
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
];
export const GOVERNMENT_LEVELS = [
    { value: 'MUNICIPAL', label: 'Municipal' },
    { value: 'ESTADUAL', label: 'Estadual' },
    { value: 'FEDERAL', label: 'Federal' }
];
// Helper para detectar papel Mentor
export const isMentorRole = (role) => {
    if (typeof role === 'string') {
        return role === 'INF_MENTOR';
    }
    return role.code === 'INF_MENTOR' || role.label === 'Mentor / Coach / Conselheiro';
};
// Helper para detectar papel Celebridade
export const isCelebrityRole = (role) => {
    if (typeof role === 'string') {
        return role === 'MID_CELEBRIDADE';
    }
    return role.code === 'MID_CELEBRIDADE' || role.label === 'Celebridade pública';
};
// Helper para detectar papel Jornalista
export const isJournalistRole = (role) => {
    if (typeof role === 'string') {
        return role === 'MID_JORNALISTA';
    }
    return role.code === 'MID_JORNALISTA' || role.label === 'Jornalista / Comunicador';
};
// Helper para detectar papel Influenciador digital
export const isInfluencerRole = (role) => {
    if (typeof role === 'string') {
        return role === 'MID_INFLUENCER';
    }
    return role.code === 'MID_INFLUENCER' || role.label === 'Influenciador digital';
};
// Helper para detectar papel Presidente de entidade
export const isPresidentEntityRole = (role) => {
    if (typeof role === 'string') {
        return role === 'POL_PRESIDENTE_ENTIDADE';
    }
    return role.code === 'POL_PRESIDENTE_ENTIDADE' || role.label === 'Presidente de entidade';
};
// Opções para Jornalista/Comunicador
export const MEDIA_AREAS = ['Política', 'Economia', 'Cultura', 'Esportes', 'Segurança', 'Internacional', 'Religião', 'Tecnologia', 'Saúde', 'Educação', 'Agronegócio', 'Variedades', 'Outro'];
export const AUDIENCE_SCOPES = [
    { value: 'LOCAL', label: 'Local' },
    { value: 'REGIONAL', label: 'Regional' },
    { value: 'NACIONAL', label: 'Nacional' },
    { value: 'INTERNACIONAL', label: 'Internacional' },
    { value: 'ONLINE', label: 'Online' },
];
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
];
export const INFLUENCE_TYPE_OPTIONS = [
    { value: 'Pessoal', label: 'Pessoal' },
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Comunitária', label: 'Comunitária' },
    { value: 'Política', label: 'Política' },
];
// Opções para Presidente de entidade
export const ENTITY_TYPE_OPTIONS = [
    { value: 'ASSOCIACAO_BAIRRO', label: 'Associação de bairro' },
    { value: 'SINDICATO', label: 'Sindicato' },
    { value: 'ONG_FUNDACAO', label: 'ONG/Fundação' },
    { value: 'CLUBE_SOCIEDADE', label: 'Clube/Sociedade' },
    { value: 'CONSELHO_PROFISSIONAL', label: 'Conselho Profissional' },
    { value: 'CAMARA_COMERCIO', label: 'Câmara de Comércio' },
    { value: 'OUTRO', label: 'Outro' },
];
export const PRESIDENT_SCOPE_OPTIONS = [
    { value: 'CIDADE', label: 'Cidade' },
    { value: 'REGIAO', label: 'Região' },
    { value: 'ESTADUAL', label: 'Estadual' },
    { value: 'NACIONAL', label: 'Nacional' },
];
export const PUBLIC_POSITIONS = [
    'Secretário Municipal',
    'Diretor',
    'Coordenador',
    'Chefe de Gabinete',
    'Outro'
];
// Opções para Educador/Professor
export const EDUCATION_LEVEL_OPTIONS = [
    { value: 'INFANTIL', label: 'Educação Infantil' },
    { value: 'FUNDAMENTAL', label: 'Ensino Fundamental' },
    { value: 'MEDIO', label: 'Ensino Médio' },
    { value: 'TECNICO', label: 'Ensino Técnico' },
    { value: 'SUPERIOR', label: 'Ensino Superior' },
    { value: 'POS_GRADUACAO', label: 'Pós-graduação / Pesquisa' },
    { value: 'CURSOS_LIVRES', label: 'Cursos Livres / Formação Complementar' },
];
export const EDUCATOR_REACH_SCOPE_OPTIONS = [
    { value: 'SALA_AULA', label: 'Sala de aula / turmas' },
    { value: 'INSTITUICAO', label: 'Escola / Instituição inteira' },
    { value: 'REGIONAL', label: 'Rede municipal/estadual' },
    { value: 'NACIONAL', label: 'Autor/Referência nacional' },
];
// Opções para Líder Comunitário
export const COMMUNITY_AREAS = [
    "Segurança pública / Conselho comunitário",
    "Saúde / Conselho local de saúde",
    "Educação / Conselho escolar / Grêmio",
    "Esporte e cultura / Grupos locais",
    "Infraestrutura / Associação de moradores",
    "Assistência social / Voluntariado",
    "Outro",
];
export const REACH_SCOPE_OPTIONS = [
    { label: "Rua / Quadra", value: "FAMILIA" },
    { label: "Bairro", value: "BAIRRO" },
    { label: "Região da cidade", value: "REGIAO" },
    { label: "Município", value: "CIDADE" },
    { label: "Online", value: "ONLINE" },
];
// Opções para Militar/Forças de segurança
export const MILITARY_SERVICE_BRANCHES = [
    "Polícia Militar",
    "Exército Brasileiro",
    "Polícia Civil",
    "Bombeiros Militares",
    "Guarda Municipal",
    "Polícia Federal",
    "Outro",
];
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
];
// Helper para detectar papel Educador
export const isEducatorRole = (role) => {
    if (typeof role === 'string') {
        return role === 'SOC_EDUCADOR';
    }
    return role.code === 'SOC_EDUCADOR' || role.label === 'Educador / Professor';
};
// Helper para detectar papel Líder Comunitário
export const isCommunityLeaderRole = (role) => {
    if (typeof role === 'string') {
        return role === 'COM_LIDER';
    }
    return role.code === 'COM_LIDER' || role.label === 'Líder Comunitário';
};
// Helper para detectar papel Militar/Forças de segurança
export const isMilitaryRole = (role) => {
    if (typeof role === 'string') {
        return role === 'PUB_CHEFIA';
    }
    return role.code === 'PUB_CHEFIA' || role.label === 'Militar / Forças de segurança';
};
