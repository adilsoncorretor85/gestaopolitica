import { devLog } from '@/lib/logger';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Crown } from 'lucide-react';
import {
  getProfileLeadershipByLeader,
  upsertProfileLeadershipLegacy,
  deleteProfileLeadership,
  getLeadershipCatalog
} from '@/services/leadership';
import type { ProfileLeadership, LeadershipRoleCode, GovernmentLevel, InfluenceLevel } from '@/types/leadership';
import { POLITICAL_OFFICES, POLITICAL_STATUS, PUBLIC_AREAS, GOVERNMENT_LEVELS, PUBLIC_POSITIONS, EDUCATION_LEVEL_OPTIONS, EDUCATOR_REACH_SCOPE_OPTIONS, COMMUNITY_AREAS, REACH_SCOPE_OPTIONS, MILITARY_SERVICE_BRANCHES, MILITARY_RANKS } from '@/types/leadership';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leaderProfileId: string;
  leaderCity?: string;
  leaderState?: string;
}

// Mapeamento de cargos políticos para organizações
const POL_OFFICE_DEFAULT_ORG: Record<string, (ctx: {city?: string, state?: string}) => string> = {
  'Vereador': ({city}) => city ? `Câmara Municipal de ${city}` : 'Câmara Municipal',
  'Prefeito': ({city}) => city ? `Prefeitura Municipal de ${city}` : 'Prefeitura Municipal',
  'Deputado Estadual': () => 'Assembleia Legislativa',
  'Deputado Federal': () => 'Câmara dos Deputados',
  'Senador': () => 'Senado Federal',
  'GOVERNADOR': () => 'Governo do Estado',
  'PRESIDENTE': () => 'Presidência da República',
};

// Opções de tradição religiosa
const RELIGION_FAMILIES = [
  'Católico',
  'Evangélico', 
  'Luterano',
  'Espírita',
  'Matriz Africana',
  'Islâmico',
  'Judaico',
  'Agnóstico/Atéu',
  'Outras'
] as const;

// Opções de nível de influência para acadêmicos
const INFLUENCE_OPTIONS: { value: InfluenceLevel; label: string }[] = [
  { value: 'LOCAL',         label: 'Local' },
  { value: 'REGIONAL',      label: 'Regional' },
  { value: 'NACIONAL',      label: 'Nacional' },
  { value: 'INTERNACIONAL', label: 'Internacional' },
];

// Opções para Patriarca/Matriarca
const GENERATION_SCOPE_OPTIONS = [
  { value: 'FILHOS', label: 'Filhos' },
  { value: 'NETOS', label: 'Netos' },
  { value: 'BISNETOS', label: 'Bisnetos' },
  { value: 'MULTIGERACIONAL', label: 'Multigeracional' },
];

const INFLUENCE_ROLE_OPTIONS = [
  { value: 'CONSELHEIRO', label: 'Conselheiro' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'ESPIRITUAL', label: 'Espiritual' },
  { value: 'CUIDADOR', label: 'Cuidador' },
  { value: 'REFERENCIA_FAMILIAR', label: 'Referência familiar' },
];

const TRADITION_OPTIONS = [
  { value: 'CATOLICA', label: 'Católica' },
  { value: 'EVANGELICA', label: 'Evangélica' },
  { value: 'LUTERANA', label: 'Luterana' },
  { value: 'ESPIRITA', label: 'Espírita' },
  { value: 'MATRIZ_AFRICANA', label: 'Matriz Africana' },
  { value: 'ISLAMICA', label: 'Islâmica' },
  { value: 'JUDAICA', label: 'Judaica' },
  { value: 'AGNOSTICA', label: 'Agnóstica' },
  { value: 'ATEIA', label: 'Ateia' },
  { value: 'SEM_RELIGIAO', label: 'Sem religião' },
  { value: 'OUTRA', label: 'Outra' },
];

// Opções para Mentor/Coach/Conselheiro
const MENTORSHIP_TYPE_OPTIONS = [
  { value: 'DESENVOLVIMENTO_PESSOAL', label: 'Desenvolvimento pessoal' },
  { value: 'CARREIRA', label: 'Carreira / Profissional' },
  { value: 'EMPRESARIAL', label: 'Empresarial / Negócios' },
  { value: 'ESPIRITUAL', label: 'Espiritual' },
  { value: 'ACADEMICO', label: 'Acadêmico' },
  { value: 'OUTRO', label: 'Outro' },
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: 'JOVENS', label: 'Jovens / Estudantes' },
  { value: 'PROFISSIONAIS_INICIANTES', label: 'Profissionais iniciantes' },
  { value: 'EMPRESARIOS_EXECUTIVOS', label: 'Empresários / Executivos' },
  { value: 'COMUNIDADE', label: 'Comunidade / Sociedade civil' },
  { value: 'ATLETAS_ARTISTAS', label: 'Atletas / Artistas' },
  { value: 'OUTRO', label: 'Outro' },
];

// Opções para Celebridade pública
const CELEBRITY_AREA_OPTIONS = [
  { value: 'Música', label: 'Música' },
  { value: 'Esporte', label: 'Esporte' },
  { value: 'TV', label: 'TV' },
  { value: 'Cinema', label: 'Cinema' },
  { value: 'Internet/Influencer', label: 'Internet/Influencer' },
  { value: 'Teatro', label: 'Teatro' },
  { value: 'Moda', label: 'Moda' },
  { value: 'Jornalismo', label: 'Jornalismo' },
  { value: 'Humor', label: 'Humor' },
  { value: 'Outros', label: 'Outros' },
];

// Opções para Jornalista/Comunicador
const MEDIA_AREA_OPTIONS = [
  { value: 'Política', label: 'Política' },
  { value: 'Economia', label: 'Economia' },
  { value: 'Cultura', label: 'Cultura' },
  { value: 'Esportes', label: 'Esportes' },
  { value: 'Segurança', label: 'Segurança' },
  { value: 'Internacional', label: 'Internacional' },
  { value: 'Religião', label: 'Religião' },
  { value: 'Tecnologia', label: 'Tecnologia' },
  { value: 'Saúde', label: 'Saúde' },
  { value: 'Educação', label: 'Educação' },
  { value: 'Agronegócio', label: 'Agronegócio' },
  { value: 'Variedades', label: 'Variedades' },
  { value: 'Outro', label: 'Outro' },
];

const AUDIENCE_SCOPE_OPTIONS = [
  { value: 'LOCAL', label: 'Local' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'NACIONAL', label: 'Nacional' },
  { value: 'INTERNACIONAL', label: 'Internacional' },
  { value: 'ONLINE', label: 'Online' },
];

// Opções para Influenciador digital
const PLATFORM_OPTIONS = [
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

const INFLUENCE_TYPE_OPTIONS = [
  { value: 'Pessoal', label: 'Pessoal' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Comunitária', label: 'Comunitária' },
  { value: 'Política', label: 'Política' },
];

// Opções para Presidente de entidade
const ENTITY_TYPE_OPTIONS = [
  { value: 'ASSOCIACAO_BAIRRO', label: 'Associação de bairro' },
  { value: 'SINDICATO', label: 'Sindicato' },
  { value: 'ONG_FUNDACAO', label: 'ONG/Fundação' },
  { value: 'CLUBE_SOCIEDADE', label: 'Clube/Sociedade' },
  { value: 'CONSELHO_PROFISSIONAL', label: 'Conselho Profissional' },
  { value: 'CAMARA_COMERCIO', label: 'Câmara de Comércio' },
  { value: 'OUTRO', label: 'Outro' },
];

const PRESIDENT_SCOPE_OPTIONS = [
  { value: 'CIDADE', label: 'Cidade' },
  { value: 'REGIAO', label: 'Região' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'NACIONAL', label: 'Nacional' },
];

// Opções para Liderança partidária
const PARTY_OPTIONS = [
  'UNIÃO', 'PL', 'PSD', 'MDB', 'PT', 'PP', 'REPUBLICANOS', 'PODEMOS', 
  'PSDB', 'NOVO', 'PSB', 'PDT', 'PRD', 'PCdoB', 'PV', 'REDE'
];

const PARTY_OFFICE_OPTIONS = [
  { value: 'Presidente municipal', label: 'Presidente municipal' },
  { value: 'Presidente estadual', label: 'Presidente estadual' },
  { value: 'Presidente nacional', label: 'Presidente nacional' },
  { value: 'Vice-presidente', label: 'Vice-presidente' },
  { value: 'Secretário-geral', label: 'Secretário-geral' },
  { value: 'Tesoureiro', label: 'Tesoureiro' },
  { value: 'Coordenador de núcleo', label: 'Coordenador de núcleo' },
  { value: 'Membro da executiva', label: 'Membro da executiva' },
  { value: 'Outro', label: 'Outro' },
];

const PARTY_SCOPE_OPTIONS = [
  { value: 'MUNICIPAL', label: 'Municipal' },
  { value: 'ESTADUAL', label: 'Estadual' },
  { value: 'NACIONAL', label: 'Nacional' },
];

const PARTY_STATUS_OPTIONS = [
  { value: 'EM_EXERCICIO', label: 'Em exercício' },
  { value: 'SUPLENTE', label: 'Suplente' },
  { value: 'EX_DIRIGENTE', label: 'Ex-dirigente' },
  { value: 'PRE_CANDIDATO', label: 'Pré-candidato' },
];

// Opções para Influenciador cultural/artístico
const CULTURAL_SEGMENT_OPTIONS = [
  { value: 'Música', label: 'Música' },
  { value: 'Dança', label: 'Dança' },
  { value: 'Teatro', label: 'Teatro' },
  { value: 'Artes plásticas', label: 'Artes plásticas' },
  { value: 'Literatura', label: 'Literatura' },
  { value: 'Grupos folclóricos/tradicionalistas', label: 'Grupos folclóricos/tradicionalistas' },
  { value: 'Cultura digital', label: 'Cultura digital' },
  { value: 'Outro', label: 'Outro' },
];

const CULTURAL_ROLE_OPTIONS = [
  { value: 'Professor de dança', label: 'Professor de dança' },
  { value: 'Coreógrafo', label: 'Coreógrafo' },
  { value: 'Maestro', label: 'Maestro' },
  { value: 'Escritor', label: 'Escritor' },
  { value: 'Ator/atriz', label: 'Ator/atriz' },
  { value: 'Artesão', label: 'Artesão' },
  { value: 'Outro', label: 'Outro' },
];

const CULTURAL_SCOPE_OPTIONS = [
  { value: 'Local/Bairro', label: 'Local/Bairro' },
  { value: 'Municipal', label: 'Municipal' },
  { value: 'Regional', label: 'Regional' },
  { value: 'Nacional', label: 'Nacional' },
  { value: 'Internacional', label: 'Internacional' },
];

export default function LeaderLeadershipModal({ isOpen, onClose, leaderProfileId, leaderCity, leaderState }: Props) {
  const [leadership, setLeadership] = useState<ProfileLeadership | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    role_code: '' as LeadershipRoleCode | '',
    organization: '',
    title: '',
    // Campos específicos para políticos
    political_status: '',
    political_office: '',
    // Campos específicos para religiosos
    religion_family: '',
    denomination: '',
    church_community: '',
    // Campos específicos para empresários
    business_sector: '',
    company_name: '',
    // Campos específicos para gestor público
    public_area: '',
    government_level: '' as GovernmentLevel | '',
    public_position: '',
    custom_public_area: '',
    custom_public_position: '',
    // Campos específicos para acadêmicos
    field_of_study: '',
    influence_level: '' as InfluenceLevel | '',
    // Campos específicos para patriarca
    family_size: '',
    generation_scope: '',
    influence_roles: [] as string[],
    tradition: '',
    tradition_other: '',
    // Campos específicos para mentor
    mentorship_type: '',
    mentorship_type_other: '',
    target_audience: [] as string[],
    target_audience_other: '',
    mentees_count: '',
    specialty: '',
    certification: '',
    // Campos específicos para celebridade
    celebrity_area: '',
    public_role: '',
    audience: '',
    // Campos específicos para jornalista
    media_area: '',
    audience_scope: '',
    // Campos específicos para influenciador digital
    platform: '',
    niche: '',
    reach_estimate: '',
    influence_type: '',
    // Campos específicos para presidente de entidade
    entity_type: '',
    scope: '',
    mandate_start: '',
    mandate_end: '',
    // Campos específicos para liderança partidária
    party: '',
    party_office: '',
    party_office_other: '',
    party_scope: '',
    party_status: '',
    party_mandate_start: '',
    party_mandate_end: '',
    // Campos específicos para influenciador cultural
    cultural_segment: '',
    cultural_segment_other: '',
    cultural_role: '',
    cultural_role_other: '',
    cultural_scope: '',
    cultural_notes: '',
    // Campos específicos para educador
    education_level: '',
    subject_area: '',
    reach_scope: '',
    notes: '',
    // Campos específicos para líder comunitário
    community_area: '',
    projects: '',
    other_community_area: '',
    // Campos específicos para militar/forças de segurança
    service_branch: '',
    unit: '',
    org_custom: '',
    rank_custom: '',
  });

  const roleOptions = getLeadershipCatalog();

  // Função para validar UUID
  const isUuid = (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  // Verificar se o leaderProfileId é válido
  const isValidProfileId = leaderProfileId && isUuid(leaderProfileId);

  useEffect(() => {
    if (isOpen && isValidProfileId) {
      loadLeadership();
    } else if (isOpen && !isValidProfileId) {
      setError('ID do perfil inválido');
      setLoading(false);
    }
  }, [isOpen, leaderProfileId, isValidProfileId]);

  // Auto-preenchimento do título "Presidente" para presidente de entidade
  useEffect(() => {
    if (formData.role_code === 'POL_PRESIDENTE_ENTIDADE' && !formData.title) {
      setFormData(prev => ({ ...prev, title: 'Presidente' }));
    }
  }, [formData.role_code, formData.title]);

  const loadLeadership = async () => {
    try {
      setLoading(true);
      setError('');
      
      const leadershipData = await getProfileLeadershipByLeader(leaderProfileId);
      setLeadership(leadershipData);
      
      if (leadershipData) {
        parseExistingData(leadershipData);
      } else {
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar nível de liderança');
    } finally {
      setLoading(false);
    }
  };

  const parseExistingData = (data: ProfileLeadership) => {
    setFormData({
      role_code: data.role_code,
      organization: data.organization ?? '',
      title: data.title ?? '',
      political_status: data.extra?.status || '',
      political_office: data.extra?.office || '',
      religion_family: data.extra?.religion_family || '',
      denomination: data.extra?.denomination || '',
      church_community: data.organization || '', // Para religiosos, organization = igreja
      business_sector: data.extra?.business_sector || '',
      company_name: data.organization || '', // Para empresário, organization = empresa
      public_area: data.extra?.public_area || '',
      government_level: data.extra?.government_level || '',
      public_position: data.title || '',
      custom_public_area: data.extra?.public_area === 'Outro' ? data.extra?.custom_public_area || '' : '',
      custom_public_position: data.title === 'Outro' ? data.extra?.custom_public_position || '' : '',
      // Campos específicos para acadêmicos
      field_of_study: data.extra?.field_of_study || '',
      influence_level: data.extra?.influence_level || '',
      // Campos específicos para patriarca
      family_size: data.extra?.family_size?.toString() || '',
      generation_scope: data.extra?.generation_scope || '',
      influence_roles: data.extra?.influence_roles || [],
      tradition: data.extra?.tradition || '',
      tradition_other: data.extra?.tradition_other || '',
      // Campos específicos para mentor
      mentorship_type: data.extra?.mentorship_type || '',
      mentorship_type_other: data.extra?.mentorship_type_other || '',
      target_audience: data.extra?.target_audience || [],
      target_audience_other: data.extra?.target_audience_other || '',
      mentees_count: data.extra?.mentees_count?.toString() || '',
      specialty: data.extra?.specialty || '',
      certification: data.extra?.certification || '',
      // Campos específicos para celebridade
      celebrity_area: data.extra?.celebrity_area || '',
      public_role: data.extra?.public_role || '',
      audience: data.extra?.audience || '',
      // Campos específicos para jornalista
      media_area: data.extra?.media_area || '',
      audience_scope: data.extra?.audience_scope || '',
      // Campos específicos para influenciador digital
      platform: data.extra?.platform || '',
      niche: data.extra?.niche || '',
      reach_estimate: data.extra?.reach_estimate?.toString() || '',
      influence_type: data.extra?.influence_type || '',
      // Campos específicos para presidente de entidade
      entity_type: data.extra?.entity_type || '',
      scope: data.extra?.scope || '',
      mandate_start: data.extra?.mandate_start || '',
      mandate_end: data.extra?.mandate_end || '',
      // Campos específicos para liderança partidária
      party: data.extra?.party || '',
      party_office: data.extra?.office || '',
      party_office_other: data.extra?.office === 'Outro' ? data.extra?.office_other || '' : '',
      party_scope: data.extra?.scope || '',
      party_status: data.extra?.status || '',
      party_mandate_start: data.extra?.mandate_start || '',
      party_mandate_end: data.extra?.mandate_end || '',
      // Campos específicos para influenciador cultural
      cultural_segment: data.extra?.segment || '',
      cultural_segment_other: data.extra?.segment === 'Outro' ? data.extra?.segment_other || '' : '',
      cultural_role: data.extra?.role || '',
      cultural_role_other: data.extra?.role === 'Outro' ? data.extra?.role_other || '' : '',
      cultural_scope: data.extra?.scope || '',
      cultural_notes: data.extra?.notes || '',
      // Campos específicos para educador
      education_level: data.extra?.education_level || '',
      subject_area: data.extra?.subject_area || '',
      reach_scope: data.extra?.reach_scope || '',
      notes: data.extra?.notes || '',
      // Campos específicos para líder comunitário
      community_area: data.extra?.community_area || '',
      projects: data.extra?.projects || '',
      other_community_area: data.extra?.other_community_area || '',
      // Campos específicos para militar/forças de segurança
      service_branch: data.role_code === 'PUB_CHEFIA' ? 
        (data.extra?.service_branch || (MILITARY_SERVICE_BRANCHES.includes(data.organization as any) ? data.organization : 'Outro')) : '',
      unit: data.extra?.unit || '',
      org_custom: data.role_code === 'PUB_CHEFIA' ? 
        (data.extra?.service_branch === 'Outro' ? (data.organization ?? '') : '') : '',
      rank_custom: data.extra?.rank_custom || '',
      // Para militar, mapear title de volta
      ...(data.role_code === 'PUB_CHEFIA' ? {
        title: data.extra?.rank_custom ? 'Outro' : (MILITARY_RANKS.includes(data.title as any) ? (data.title ?? '') : 'Outro'),
      } : {}),
    });
  };

  const resetForm = () => {
    setFormData({
      role_code: '',
      organization: '',
      title: '',
      political_status: '',
      political_office: '',
      religion_family: '',
      denomination: '',
      church_community: '',
      business_sector: '',
      company_name: '',
      public_area: '',
      government_level: '',
      public_position: '',
      custom_public_area: '',
      custom_public_position: '',
      // Campos específicos para acadêmicos
      field_of_study: '',
      influence_level: '',
      // Campos específicos para patriarca
      family_size: '',
      generation_scope: '',
      influence_roles: [],
      tradition: '',
      tradition_other: '',
      // Campos específicos para mentor
      mentorship_type: '',
      mentorship_type_other: '',
      target_audience: [],
      target_audience_other: '',
      mentees_count: '',
      specialty: '',
      certification: '',
      // Campos específicos para celebridade
      celebrity_area: '',
      public_role: '',
      audience: '',
      // Campos específicos para jornalista
      media_area: '',
      audience_scope: '',
      // Campos específicos para influenciador digital
      platform: '',
      niche: '',
      reach_estimate: '',
      influence_type: '',
      // Campos específicos para presidente de entidade
      entity_type: '',
      scope: '',
      mandate_start: '',
      mandate_end: '',
      // Campos específicos para liderança partidária
      party: '',
      party_office: '',
      party_office_other: '',
      party_scope: '',
      party_status: '',
      party_mandate_start: '',
      party_mandate_end: '',
      // Campos específicos para influenciador cultural
      cultural_segment: '',
      cultural_segment_other: '',
      cultural_role: '',
      cultural_role_other: '',
      cultural_scope: '',
      cultural_notes: '',
      // Campos específicos para educador
      education_level: '',
      subject_area: '',
      reach_scope: '',
      notes: '',
      // Campos específicos para líder comunitário
      community_area: '',
      projects: '',
      other_community_area: '',
      // Campos específicos para militar/forças de segurança
      service_branch: '',
      unit: '',
      org_custom: '',
      rank_custom: '',
    });
  };

  const handleDelete = async () => {
    if (!leadership?.id || !confirm('Tem certeza que deseja excluir o nível de liderança?')) return;
    
    try {
      await deleteProfileLeadership(leadership.id);
      setLeadership(null);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir nível de liderança');
    }
  };

  const handlePoliticalOfficeChange = (office: string) => {
    devLog('🔄 handlePoliticalOfficeChange chamado:', { office, leaderCity, leaderState });
    setFormData(prev => ({ ...prev, political_office: office }));
    
    // Autopreenchimento da organização baseado no cargo
    if (office && office !== 'Outro' && POL_OFFICE_DEFAULT_ORG[office]) {
      const defaultOrg = POL_OFFICE_DEFAULT_ORG[office]({ city: leaderCity, state: leaderState });
      devLog('✅ Autopreenchimento:', { office, defaultOrg });
      setFormData(prev => ({ ...prev, organization: defaultOrg }));
    } else if (office === 'Outro') {
      // Limpar organização se for "Outro"
      devLog('🧹 Limpando organização para "Outro"');
      setFormData(prev => ({ ...prev, organization: '' }));
    } else {
      devLog('❌ Cargo não encontrado no mapeamento:', office);
    }
  };

  const handleGovernmentLevelChange = (level: GovernmentLevel) => {
    devLog('🔄 handleGovernmentLevelChange chamado:', { level, leaderCity, leaderState });
    setFormData(prev => ({ ...prev, government_level: level }));
    
    let defaultOrg = '';
    if (level === 'MUNICIPAL' && leaderCity) {
      defaultOrg = `Prefeitura de ${leaderCity}`;
    } else if (level === 'ESTADUAL' && leaderState) {
      defaultOrg = `Governo do Estado de ${leaderState}`;
    } else if (level === 'FEDERAL') {
      defaultOrg = 'Governo Federal';
    }
    
    if (defaultOrg) {
      devLog('✅ Autopreenchimento organização:', { level, defaultOrg });
      setFormData(prev => ({ ...prev, organization: defaultOrg }));
    }
  };

  const buildPayload = () => {
    const { role_code, organization, title, political_status, political_office, religion_family, denomination, church_community, business_sector, company_name, public_area, government_level, public_position, custom_public_area, custom_public_position, field_of_study, influence_level, family_size, generation_scope, influence_roles, tradition, tradition_other, mentorship_type, mentorship_type_other, target_audience, target_audience_other, mentees_count, specialty, certification, celebrity_area, public_role, audience, media_area, audience_scope, platform, niche, reach_estimate, influence_type, entity_type, scope, mandate_start, mandate_end, party, party_office, party_office_other, party_scope, party_status, party_mandate_start, party_mandate_end, cultural_segment, cultural_segment_other, cultural_role, cultural_role_other, cultural_scope, cultural_notes, education_level, subject_area, reach_scope, notes, community_area, projects, other_community_area, service_branch, unit, org_custom, rank_custom, specialty: military_specialty } = formData;
    
    let extra: Record<string, any> = {};
    let finalOrganization: string | undefined = organization;
    let finalTitle: string | undefined = title;

    if (role_code === 'POL_ELEITO') {
      extra.status = political_status;
      extra.office = political_office;
      finalTitle = political_office ? `${political_office}${political_status ? ` (${political_status})` : ''}` : title;
    } else if (role_code === 'SOC_RELIGIOSO') {
      extra.religion_family = religion_family;
      extra.denomination = denomination;
      finalOrganization = church_community;
      finalTitle = denomination ? `${denomination} - ${religion_family}` : religion_family;
    } else if (role_code === 'ORG_EXEC') {
      extra.business_sector = business_sector;
      finalOrganization = company_name;
      finalTitle = business_sector ? `Empresário - ${business_sector}` : 'Empresário';
    } else if (role_code === 'PUB_GESTOR') {
      extra.public_area = public_area === 'Outro' ? custom_public_area : public_area;
      extra.government_level = government_level;
      finalTitle = public_position === 'Outro' ? custom_public_position : public_position;
      finalOrganization = organization;
    } else if (role_code === 'ORG_ACADEMICO') {
      // Para acadêmicos, armazenar campos específicos no extra
      if (field_of_study) extra.field_of_study = field_of_study;
      if (influence_level) extra.influence_level = influence_level;
    } else if (role_code === 'INF_PATRIARCA') {
      // Para patriarca, armazenar campos específicos no extra
      if (family_size) extra.family_size = parseInt(family_size);
      if (generation_scope) extra.generation_scope = generation_scope;
      if (influence_roles && influence_roles.length > 0) extra.influence_roles = influence_roles;
      if (tradition) extra.tradition = tradition;
      if (tradition_other) extra.tradition_other = tradition_other;
    } else if (role_code === 'INF_MENTOR') {
      // Para mentor, armazenar campos específicos no extra
      if (mentorship_type) extra.mentorship_type = mentorship_type;
      if (mentorship_type_other) extra.mentorship_type_other = mentorship_type_other;
      if (target_audience && target_audience.length > 0) extra.target_audience = target_audience;
      if (target_audience_other) extra.target_audience_other = target_audience_other;
      if (mentees_count) extra.mentees_count = parseInt(mentees_count);
      if (specialty) extra.specialty = specialty;
      if (certification) extra.certification = certification;
      // Para mentor, não usar organization e title
      finalOrganization = undefined;
      finalTitle = undefined;
    } else if (role_code === 'MID_CELEBRIDADE') {
      // Para celebridade, armazenar campos específicos no extra
      if (celebrity_area) extra.celebrity_area = celebrity_area;
      if (public_role) extra.public_role = public_role;
      if (audience) extra.audience = audience;
      // Para celebridade, não usar organization e title
      finalOrganization = undefined;
      finalTitle = undefined;
    } else if (role_code === 'MID_JORNALISTA') {
      // Para jornalista, armazenar campos específicos no extra
      if (media_area) extra.media_area = media_area;
      if (audience_scope) extra.audience_scope = audience_scope;
      // Para jornalista, manter organization e title (mas com labels diferentes)
    } else if (role_code === 'MID_INFLUENCER') {
      // Para influenciador digital, armazenar campos específicos no extra
      if (platform) extra.platform = platform;
      if (niche) extra.niche = niche;
      if (reach_estimate) extra.reach_estimate = reach_estimate;
      if (influence_type) extra.influence_type = influence_type;
      // Para influenciador digital, não usar organization e title
      finalOrganization = undefined;
      finalTitle = undefined;
    } else if (role_code === 'POL_PRESIDENTE_ENTIDADE') {
      // Para presidente de entidade, armazenar campos específicos no extra
      if (entity_type) extra.entity_type = entity_type;
      if (scope) extra.scope = scope;
      if (mandate_start) extra.mandate_start = mandate_start;
      if (mandate_end) extra.mandate_end = mandate_end;
      // Para presidente de entidade, manter organization e title (mas com labels diferentes)
      // Auto-preenchir title com "Presidente" se estiver vazio
      if (!finalTitle) finalTitle = 'Presidente';
    } else if (role_code === 'POL_PARTIDARIA') {
      // Para liderança partidária, armazenar campos específicos no extra
      if (party) extra.party = party;
      if (party_office) {
        extra.office = party_office === 'Outro' ? party_office_other : party_office;
      }
      if (party_scope) extra.scope = party_scope;
      if (party_status) extra.status = party_status;
      if (party_mandate_start) extra.mandate_start = party_mandate_start;
      if (party_mandate_end) extra.mandate_end = party_mandate_end;
      // Para liderança partidária, não usar organization e title genéricos
      finalOrganization = undefined;
      finalTitle = undefined;
    } else if (role_code === 'SOC_CULTURAL') {
      // Para influenciador cultural, armazenar campos específicos no extra
      if (cultural_segment) {
        extra.segment = cultural_segment === 'Outro' ? cultural_segment_other : cultural_segment;
      }
      if (cultural_role) {
        extra.role = cultural_role === 'Outro' ? cultural_role_other : cultural_role;
      }
      if (cultural_scope) extra.scope = cultural_scope;
      if (cultural_notes) extra.notes = cultural_notes;
      // Para influenciador cultural, usar organization (Grupo/Coletivo/Instituição) mas não title
      finalTitle = undefined;
    } else if (role_code === 'SOC_EDUCADOR') {
      // Para educador, armazenar campos específicos no extra
      if (education_level) extra.education_level = education_level;
      if (subject_area) extra.subject_area = subject_area;
      if (reach_scope) extra.reach_scope = reach_scope;
      if (notes) extra.notes = notes;
      // Para educador, manter organization e title (Instituição e Cargo/Título)
    } else if (role_code === 'COM_LIDER') {
      // Para líder comunitário, armazenar campos específicos no extra
      if (community_area) {
        if (community_area === 'Outro' && other_community_area) {
          extra.community_area = other_community_area;
        } else {
          extra.community_area = community_area;
        }
      }
      if (projects) extra.projects = projects;
      // Para líder comunitário, manter organization e title (Organização/Associação e Cargo/Título)
    } else if (role_code === 'PUB_CHEFIA') {
      // Para militar/forças de segurança, armazenar campos específicos no extra
      if (service_branch) {
        extra.service_branch = service_branch;
        // Definir organization baseado na seleção
        if (service_branch === 'Outro' && org_custom) {
          finalOrganization = org_custom;
        } else {
          finalOrganization = service_branch;
        }
      }
      if (unit) extra.unit = unit;
      if (org_custom) extra.org_custom = org_custom;
      if (rank_custom) extra.rank_custom = rank_custom;
      if (military_specialty) extra.specialty = military_specialty;
      // Para militar, title será definido baseado na patente selecionada
      if (title) {
        if (title === 'Outro' && rank_custom) {
          finalTitle = rank_custom;
        } else {
          finalTitle = title;
        }
      }
    }

    return {
      profile_id: leaderProfileId,
      role_code: role_code,
      organization: finalOrganization || undefined,
      title: finalTitle || undefined,
      level: undefined,
      reach_scope: undefined,
      reach_size: undefined,
      extra: extra
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role_code) {
      setError('Selecione um papel');
      return;
    }

    // Validações específicas
    if (formData.role_code === 'POL_ELEITO') {
      if (!formData.political_status || !formData.political_office) {
        setError('Status e cargo são obrigatórios para políticos');
        return;
      }
    }

    if (formData.role_code === 'SOC_RELIGIOSO') {
      if (!formData.religion_family || !formData.church_community) {
        setError('Tradição religiosa e igreja/comunidade são obrigatórios');
        return;
      }
    }

    if (formData.role_code === 'ORG_EXEC') {
      if (!formData.business_sector || !formData.company_name) {
        setError('Ramo de atividade e nome da empresa são obrigatórios');
        return;
      }
    }

    if (formData.role_code === 'PUB_GESTOR') {
      if (!formData.public_area || !formData.government_level || !formData.public_position || !formData.organization) {
        setError('Área de atuação, esfera de governo, cargo/função e organização são obrigatórios');
        return;
      }
      if (formData.public_area === 'Outro' && !formData.custom_public_area) {
        setError('Especifique a área de atuação personalizada');
        return;
      }
      if (formData.public_position === 'Outro' && !formData.custom_public_position) {
        setError('Especifique o cargo/função personalizado');
        return;
      }
    }

    if (formData.role_code === 'ORG_ACADEMICO') {
      if (!formData.organization?.trim()) {
        setError('Informe a Instituição');
        return;
      }
      if (!formData.field_of_study?.trim()) {
        setError('Informe a área de atuação');
        return;
      }
    }

    if (formData.role_code === 'INF_PATRIARCA') {
      if (formData.family_size) {
        const familySize = parseInt(formData.family_size);
        if (isNaN(familySize) || familySize < 0 || familySize > 200) {
          setError('Número de familiares deve ser entre 0 e 200');
          return;
        }
      }
      if (formData.tradition === 'OUTRA' && !formData.tradition_other?.trim()) {
        setError('Especifique a tradição familiar/religiosa');
        return;
      }
    }

    if (formData.role_code === 'INF_MENTOR') {
      if (!formData.mentorship_type?.trim()) {
        setError('Informe o tipo de atuação da mentoria');
        return;
      }
      if (formData.mentorship_type === 'OUTRO' && !formData.mentorship_type_other?.trim()) {
        setError('Especifique o tipo de atuação da mentoria');
        return;
      }
      if (formData.mentees_count) {
        const menteesCount = parseInt(formData.mentees_count);
        if (isNaN(menteesCount) || menteesCount < 0) {
          setError('Alcance estimado deve ser um número maior ou igual a 0');
          return;
        }
      }
    }

    if (formData.role_code === 'MID_CELEBRIDADE') {
      if (!formData.celebrity_area?.trim()) {
        setError('Para "Celebridade pública", preencha a Área de destaque');
        return;
      }
      if (!formData.public_role?.trim()) {
        setError('Para "Celebridade pública", preencha a Função/Papel público');
        return;
      }
    }

    if (formData.role_code === 'MID_INFLUENCER') {
      if (!formData.platform?.trim()) {
        setError('Para "Influenciador digital", preencha a Plataforma principal');
        return;
      }
      if (!formData.niche?.trim()) {
        setError('Para "Influenciador digital", preencha a Área de atuação');
        return;
      }
    }

    if (formData.role_code === 'POL_PRESIDENTE_ENTIDADE') {
      if (!formData.entity_type?.trim()) {
        setError('Para "Presidente de entidade", preencha o Tipo de entidade');
        return;
      }
      if (!formData.scope?.trim()) {
        setError('Para "Presidente de entidade", preencha o Âmbito de atuação');
        return;
      }
    }

    if (formData.role_code === 'POL_PARTIDARIA') {
      if (!formData.party?.trim()) {
        setError('Para "Liderança partidária", preencha o Partido Político');
        return;
      }
      if (!formData.party_office?.trim()) {
        setError('Para "Liderança partidária", preencha o Cargo no partido');
        return;
      }
      if (formData.party_office === 'Outro' && !formData.party_office_other?.trim()) {
        setError('Para "Liderança partidária", especifique o cargo no partido');
        return;
      }
      if (!formData.party_scope?.trim()) {
        setError('Para "Liderança partidária", preencha o Âmbito de atuação');
        return;
      }
    }

    if (formData.role_code === 'SOC_CULTURAL') {
      if (!formData.cultural_segment?.trim()) {
        setError('Para "Influenciador cultural/artístico", preencha o Segmento cultural/artístico');
        return;
      }
      if (formData.cultural_segment === 'Outro' && !formData.cultural_segment_other?.trim()) {
        setError('Para "Influenciador cultural/artístico", especifique o segmento');
        return;
      }
      if (formData.cultural_role === 'Outro' && !formData.cultural_role_other?.trim()) {
        setError('Para "Influenciador cultural/artístico", especifique o papel cultural/artístico');
        return;
      }
    }

    if (formData.role_code === 'SOC_EDUCADOR') {
      if (!formData.education_level?.trim()) {
        setError('Para "Educador / Professor", selecione o Nível de ensino');
        return;
      }
    }

    if (formData.role_code === 'COM_LIDER') {
      if (!formData.organization?.trim()) {
        setError('Para "Líder Comunitário", informe a Organização/Associação');
        return;
      }
      if (!formData.community_area?.trim()) {
        setError('Para "Líder Comunitário", selecione a Área de Atuação Comunitária');
        return;
      }
      if (formData.community_area === 'Outro' && !formData.other_community_area?.trim()) {
        setError('Para "Líder Comunitário", especifique a área de atuação comunitária');
        return;
      }
      if (!formData.reach_scope?.trim()) {
        setError('Para "Líder Comunitário", selecione o Alcance da Atuação');
        return;
      }
    }

    if (formData.role_code === 'PUB_CHEFIA') {
      if (!formData.service_branch?.trim()) {
        setError('Para "Militar / Forças de segurança", selecione a Organização');
        return;
      }
      if (formData.service_branch === 'Outro' && !formData.org_custom?.trim()) {
        setError('Para "Militar / Forças de segurança", especifique a organização');
        return;
      }
      if (!formData.title?.trim()) {
        setError('Para "Militar / Forças de segurança", selecione a Patente/Cargo');
        return;
      }
      if (formData.title === 'Outro' && !formData.rank_custom?.trim()) {
        setError('Para "Militar / Forças de segurança", especifique a patente/cargo');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      
      const payload = buildPayload();
      const result = await upsertProfileLeadershipLegacy(payload);
      
      setLeadership(result);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setError(err.message || 'Falha ao salvar nível de liderança');
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (roleCode: string) => {
    return roleOptions.find(role => role.code === roleCode)?.label || roleCode;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nível de Liderança
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Carregando nível de liderança...</p>
            </div>
          ) : (
            <>
              {/* Exibição do nível atual */}
              {leadership && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Nível atual: {getRoleLabel(leadership.role_code)}
                        {leadership.role_code === 'INF_MENTOR' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.extra?.mentorship_type && (
                              <span>Mentoria: {MENTORSHIP_TYPE_OPTIONS.find(opt => opt.value === leadership.extra?.mentorship_type)?.label || leadership.extra?.mentorship_type}</span>
                            )}
                            {leadership.extra?.target_audience && leadership.extra?.target_audience.length > 0 && (
                              <span> • Público: {leadership.extra?.target_audience.map((audience: string) => TARGET_AUDIENCE_OPTIONS.find(opt => opt.value === audience)?.label || audience).join(', ')}</span>
                            )}
                            {leadership.extra?.mentees_count && (
                              <span> • Alcance: {leadership.extra?.mentees_count}</span>
                            )}
                            {leadership.extra?.specialty && (
                              <span> • Área: {leadership.extra?.specialty}</span>
                            )}
                          </span>
                        ) : leadership.role_code === 'MID_CELEBRIDADE' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.extra?.public_role && (
                              <span>Celebridade: {leadership.extra?.public_role}</span>
                            )}
                            {leadership.extra?.celebrity_area && (
                              <span> • Área: {leadership.extra?.celebrity_area}</span>
                            )}
                            {leadership.extra?.audience && (
                              <span> • Público: {leadership.extra?.audience}</span>
                            )}
                          </span>
                        ) : leadership.role_code === 'MID_JORNALISTA' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.organization && (
                              <span>Veículo: {leadership.organization}</span>
                            )}
                            {leadership.title && (
                              <span> • Função: {leadership.title}</span>
                            )}
                            {leadership.extra?.media_area && (
                              <span> • Área: {leadership.extra?.media_area}</span>
                            )}
                            {leadership.extra?.audience_scope && (
                              <span> • Alcance: {AUDIENCE_SCOPE_OPTIONS.find(opt => opt.value === leadership.extra?.audience_scope)?.label || leadership.extra?.audience_scope}</span>
                            )}
                          </span>
                        ) : leadership.role_code === 'MID_INFLUENCER' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.extra?.platform && (
                              <span>Plataforma: {leadership.extra?.platform}</span>
                            )}
                            {leadership.extra?.niche && (
                              <span> • Área: {leadership.extra?.niche}</span>
                            )}
                            {leadership.extra?.reach_estimate && (
                              <span> • Alcance: {leadership.extra?.reach_estimate}</span>
                            )}
                            {leadership.extra?.influence_type && (
                              <span> • Tipo: {leadership.extra?.influence_type}</span>
                            )}
                          </span>
                        ) : leadership.role_code === 'POL_PRESIDENTE_ENTIDADE' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.organization && (
                              <span>Entidade: {leadership.organization}</span>
                            )}
                            {leadership.title && (
                              <span> • Cargo: {leadership.title}</span>
                            )}
                            {leadership.extra?.entity_type && (
                              <span> • Tipo: {ENTITY_TYPE_OPTIONS.find(opt => opt.value === leadership.extra?.entity_type)?.label || leadership.extra?.entity_type}</span>
                            )}
                            {leadership.extra?.scope && (
                              <span> • Âmbito: {PRESIDENT_SCOPE_OPTIONS.find(opt => opt.value === leadership.extra?.scope)?.label || leadership.extra?.scope}</span>
                            )}
                          </span>
                        ) : leadership.role_code === 'POL_PARTIDARIA' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.extra?.party && (
                              <span>Partido: {leadership.extra?.party}</span>
                            )}
                            {leadership.extra?.office && (
                              <span> • Cargo: {leadership.extra?.office}</span>
                            )}
                            {leadership.extra?.scope && (
                              <span> • Âmbito: {PARTY_SCOPE_OPTIONS.find(opt => opt.value === leadership.extra?.scope)?.label || leadership.extra?.scope}</span>
                            )}
                            {leadership.extra?.status && (
                              <span> • Status: {PARTY_STATUS_OPTIONS.find(opt => opt.value === leadership.extra?.status)?.label || leadership.extra?.status}</span>
                            )}
                          </span>
                        ) : leadership.role_code === 'SOC_CULTURAL' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mt-1">
                            {leadership.extra?.segment && (
                              <span>Segmento: {leadership.extra?.segment}</span>
                            )}
                            {leadership.extra?.role && (
                              <span> • Papel: {leadership.extra?.role}</span>
                            )}
                            {leadership.extra?.scope && (
                              <span> • Alcance: {CULTURAL_SCOPE_OPTIONS.find(opt => opt.value === leadership.extra?.scope)?.label || leadership.extra?.scope}</span>
                            )}
                            {leadership.organization && (
                              <span> • Grupo: {leadership.organization}</span>
                            )}
                          </span>
                        ) : (
                          <>
                            {leadership.organization && ` — ${leadership.organization}`}
                            {leadership.title && ` — ${leadership.title}`}
                          </>
                        )}
                      </h4>
                    </div>
                    
                    <button
                      onClick={handleDelete}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir nível de liderança"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Papel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Papel *
                  </label>
                  <select
                    value={formData.role_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_code: e.target.value as LeadershipRoleCode }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione um papel</option>
                    <option value="POL_ELEITO">Político / Figura política</option>
                    <option value="SOC_RELIGIOSO">Líder religioso</option>
                    <option value="ORG_EXEC">Empresário / Executivo</option>
                    <option value="PUB_GESTOR">Gestor público / Governante</option>
                    <option value="PUB_CHEFIA">Militar / Forças de segurança</option>
                    <option value="ORG_ACADEMICO">Acadêmico / Pesquisador</option>
                    <option value="COM_LIDER">Líder Comunitário</option>
                    <option value="SOC_EDUCADOR">Educador / Professor</option>
                    <option value="SOC_CULTURAL">Influenciador cultural/artístico</option>
                    <option value="POL_PARTIDARIA">Liderança partidária</option>
                    <option value="POL_PRESIDENTE_ENTIDADE">Presidente de entidade</option>
                    <option value="MID_INFLUENCER">Influenciador digital</option>
                    <option value="MID_JORNALISTA">Jornalista / Comunicador</option>
                    <option value="MID_CELEBRIDADE">Celebridade pública</option>
                    <option value="INF_MUNICIPE">Munícipe engajado</option>
                    <option value="INF_MENTOR">Mentor / Coach / Conselheiro</option>
                    <option value="INF_PATRIARCA">Patriarca/Matriarca familiar</option>
                  </select>
                </div>

                {/* Campos específicos para Político */}
                {formData.role_code === 'POL_ELEITO' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status *
                      </label>
                      <select
                        value={formData.political_status}
                        onChange={(e) => setFormData(prev => ({ ...prev, political_status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione o status</option>
                        {POLITICAL_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cargo *
                      </label>
                      <select
                        value={formData.political_office}
                        onChange={(e) => handlePoliticalOfficeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione o cargo</option>
                        {POLITICAL_OFFICES.map((office) => (
                          <option key={office} value={office}>
                            {office}
                          </option>
                        ))}
                        <option value="GOVERNADOR">Governador</option>
                        <option value="PRESIDENTE">Presidente</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Organização
                      </label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Câmara Municipal, Prefeitura"
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos para Líder Religioso */}
                {formData.role_code === 'SOC_RELIGIOSO' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tradição/Religião *
                      </label>
                      <select
                        value={formData.religion_family}
                        onChange={(e) => setFormData(prev => ({ ...prev, religion_family: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione a tradição religiosa</option>
                        {RELIGION_FAMILIES.map((religion) => (
                          <option key={religion} value={religion}>
                            {religion}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Denominação
                      </label>
                      <input
                        type="text"
                        value={formData.denomination}
                        onChange={(e) => setFormData(prev => ({ ...prev, denomination: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Igreja Católica, Assembleia de Deus"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Igreja/Paróquia/Comunidade *
                      </label>
                      <input
                        type="text"
                        value={formData.church_community}
                        onChange={(e) => setFormData(prev => ({ ...prev, church_community: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Paróquia São João, Igreja Central"
                        required
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos para Empresário */}
                {formData.role_code === 'ORG_EXEC' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ramo de Atividade *
                      </label>
                      <input
                        type="text"
                        value={formData.business_sector}
                        onChange={(e) => setFormData(prev => ({ ...prev, business_sector: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Tecnologia, Comércio, Indústria, Serviços"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome da Empresa *
                      </label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Empresa XYZ Ltda"
                        required
                      />
                    </div>
                  </>
                )}

                {/* Campos específicos para Gestor Público */}
                {formData.role_code === 'PUB_GESTOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Área de Atuação *
                      </label>
                      <select
                        value={formData.public_area}
                        onChange={(e) => setFormData(prev => ({ ...prev, public_area: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione a área de atuação</option>
                        {PUBLIC_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.public_area === 'Outro' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Especifique a Área de Atuação *
                        </label>
                        <input
                          type="text"
                          value={formData.custom_public_area}
                          onChange={(e) => setFormData(prev => ({ ...prev, custom_public_area: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: Desenvolvimento Social, Habitação"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Esfera / Nível de Governo *
                      </label>
                      <select
                        value={formData.government_level}
                        onChange={(e) => handleGovernmentLevelChange(e.target.value as GovernmentLevel)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione a esfera de governo</option>
                        {GOVERNMENT_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cargo / Função *
                      </label>
                      <select
                        value={formData.public_position}
                        onChange={(e) => setFormData(prev => ({ ...prev, public_position: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Selecione o cargo/função</option>
                        {PUBLIC_POSITIONS.map((position) => (
                          <option key={position} value={position}>
                            {position}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.public_position === 'Outro' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Especifique o Cargo/Função *
                        </label>
                        <input
                          type="text"
                          value={formData.custom_public_position}
                          onChange={(e) => setFormData(prev => ({ ...prev, custom_public_position: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ex: Assessor Especial, Gerente de Projetos"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Organização / Órgão *
                      </label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Prefeitura de Joinville, Ministério da Saúde"
                        required
                      />
                      {formData.government_level && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Sugerido com base na esfera; edite se necessário
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Campos específicos para Acadêmico/Pesquisador */}
                {formData.role_code === 'ORG_ACADEMICO' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Instituição (Universidade/Instituto) *
                      </label>
                      <input
                        type="text"
                        value={formData.organization}
                        onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: USP, UFSC, EMBRAPA, Instituto Carlos Chagas"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cargo/Função
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Professor Titular, Pesquisador Sênior, Coordenador de Curso"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Área de atuação *
                      </label>
                      <input
                        type="text"
                        value={formData.field_of_study}
                        onChange={(e) => setFormData(prev => ({ ...prev, field_of_study: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Ciências Biológicas, Direito Constitucional, Engenharia Civil"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nível de influência
                      </label>
                      <select
                        value={formData.influence_level}
                        onChange={(e) =>
                          setFormData(prev => ({ ...prev, influence_level: (e.target.value || '') as InfluenceLevel }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione…</option>
                        {INFLUENCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Campos específicos para Patriarca/Matriarca */}
                {formData.role_code === 'INF_PATRIARCA' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">📌</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Dados familiares
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Número de familiares influenciados
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            value={formData.family_size}
                            onChange={(e) => setFormData(prev => ({ ...prev, family_size: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Número de pessoas influenciadas (aprox.)"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Geração predominante
                          </label>
                          <select
                            value={formData.generation_scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, generation_scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione…</option>
                            {GENERATION_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Papel de influência
                          </label>
                          <div className="space-y-2">
                            {INFLUENCE_ROLE_OPTIONS.map(opt => (
                              <label key={opt.value} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.influence_roles.includes(opt.value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        influence_roles: [...prev.influence_roles, opt.value]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        influence_roles: prev.influence_roles.filter(role => role !== opt.value)
                                      }));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tradição familiar/religiosa
                          </label>
                          <select
                            value={formData.tradition}
                            onChange={(e) => setFormData(prev => ({ ...prev, tradition: e.target.value, tradition_other: '' }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione…</option>
                            {TRADITION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.tradition === 'OUTRA' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Qual?
                            </label>
                            <input
                              type="text"
                              value={formData.tradition_other}
                              onChange={(e) => setFormData(prev => ({ ...prev, tradition_other: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Especifique a tradição familiar/religiosa"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Mentor/Coach/Conselheiro */}
                {formData.role_code === 'INF_MENTOR' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🎯</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Mentoria
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de atuação *
                          </label>
                          <select
                            value={formData.mentorship_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, mentorship_type: e.target.value, mentorship_type_other: '' }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o tipo de atuação</option>
                            {MENTORSHIP_TYPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.mentorship_type === 'OUTRO' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Especifique o tipo de atuação *
                            </label>
                            <input
                              type="text"
                              value={formData.mentorship_type_other}
                              onChange={(e) => setFormData(prev => ({ ...prev, mentorship_type_other: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: Coaching de vida, Mentoria esportiva"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Público-alvo principal
                          </label>
                          <div className="space-y-2">
                            {TARGET_AUDIENCE_OPTIONS.map(opt => (
                              <label key={opt.value} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={formData.target_audience.includes(opt.value)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({
                                        ...prev,
                                        target_audience: [...prev.target_audience, opt.value]
                                      }));
                                    } else {
                                      setFormData(prev => ({
                                        ...prev,
                                        target_audience: prev.target_audience.filter(audience => audience !== opt.value)
                                      }));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {formData.target_audience.includes('OUTRO') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Especifique o público-alvo
                            </label>
                            <input
                              type="text"
                              value={formData.target_audience_other}
                              onChange={(e) => setFormData(prev => ({ ...prev, target_audience_other: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: Idosos, Pessoas com deficiência"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alcance estimado
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.mentees_count}
                            onChange={(e) => setFormData(prev => ({ ...prev, mentees_count: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Número de pessoas mentoradas"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Área de especialidade
                          </label>
                          <input
                            type="text"
                            value={formData.specialty}
                            onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Liderança organizacional"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Formação/Certificação
                          </label>
                          <input
                            type="text"
                            value={formData.certification}
                            onChange={(e) => setFormData(prev => ({ ...prev, certification: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: ICF, SBCoaching, Certificação em Coaching"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Celebridade pública */}
                {formData.role_code === 'MID_CELEBRIDADE' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">⭐</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Celebridade pública
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Área de destaque *
                          </label>
                          <select
                            value={formData.celebrity_area}
                            onChange={(e) => setFormData(prev => ({ ...prev, celebrity_area: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione a área de destaque</option>
                            {CELEBRITY_AREA_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Função / Papel público *
                          </label>
                          <input
                            type="text"
                            value={formData.public_role}
                            onChange={(e) => setFormData(prev => ({ ...prev, public_role: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex.: Cantor, Ator, Jogador de futebol, Apresentador…"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Público-alvo (opcional)
                          </label>
                          <input
                            type="text"
                            value={formData.audience}
                            onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex.: Jovens, Famílias, Torcedores do JEC, Nicho sertanejo…"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Jornalista/Comunicador */}
                {formData.role_code === 'MID_JORNALISTA' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">📰</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Comunicação
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Área de Atuação
                          </label>
                          <select
                            value={formData.media_area}
                            onChange={(e) => setFormData(prev => ({ ...prev, media_area: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione a área de atuação</option>
                            {MEDIA_AREA_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alcance de Audiência
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400" title="Ajuda a entender o impacto do comunicador (ex.: Local, Regional, Nacional, Internacional ou Online).">
                              ℹ️
                            </span>
                          </label>
                          <select
                            value={formData.audience_scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, audience_scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione o alcance de audiência</option>
                            {AUDIENCE_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Influenciador digital */}
                {formData.role_code === 'MID_INFLUENCER' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">📱</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Influenciador digital
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Plataforma principal *
                          </label>
                          <select
                            value={formData.platform}
                            onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione a plataforma</option>
                            {PLATFORM_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Área de atuação *
                          </label>
                          <input
                            type="text"
                            value={formData.niche}
                            onChange={(e) => setFormData(prev => ({ ...prev, niche: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Moda, Educação, Política, Games, Fitness…"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alcance estimado
                          </label>
                          <input
                            type="text"
                            value={formData.reach_estimate}
                            onChange={(e) => setFormData(prev => ({ ...prev, reach_estimate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="85 mil seguidores, 2M views/mês…"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de influência
                          </label>
                          <select
                            value={formData.influence_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, influence_type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione o tipo</option>
                            {INFLUENCE_TYPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Presidente de entidade */}
                {formData.role_code === 'POL_PRESIDENTE_ENTIDADE' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🏛️</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Presidente de entidade
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de entidade *
                          </label>
                          <select
                            value={formData.entity_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, entity_type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o tipo de entidade</option>
                            {ENTITY_TYPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Âmbito de atuação *
                          </label>
                          <select
                            value={formData.scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o âmbito de atuação</option>
                            {PRESIDENT_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Início do mandato (opcional)
                            </label>
                            <input
                              type="date"
                              value={formData.mandate_start}
                              onChange={(e) => setFormData(prev => ({ ...prev, mandate_start: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fim do mandato (opcional)
                            </label>
                            <input
                              type="date"
                              value={formData.mandate_end}
                              onChange={(e) => setFormData(prev => ({ ...prev, mandate_end: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Liderança partidária */}
                {formData.role_code === 'POL_PARTIDARIA' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🏛️</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Liderança partidária
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Partido Político *
                          </label>
                          <input
                            type="text"
                            value={formData.party}
                            onChange={(e) => setFormData(prev => ({ ...prev, party: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="PL, PSD, MDB, PT…"
                            list="party-suggestions"
                            required
                          />
                          <datalist id="party-suggestions">
                            {PARTY_OPTIONS.map(party => (
                              <option key={party} value={party} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cargo no partido *
                          </label>
                          <select
                            value={formData.party_office}
                            onChange={(e) => setFormData(prev => ({ ...prev, party_office: e.target.value, party_office_other: '' }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o cargo no partido</option>
                            {PARTY_OFFICE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.party_office === 'Outro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Especifique o cargo *
                            </label>
                            <input
                              type="text"
                              value={formData.party_office_other}
                              onChange={(e) => setFormData(prev => ({ ...prev, party_office_other: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Especifique o cargo"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Âmbito de atuação *
                          </label>
                          <select
                            value={formData.party_scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, party_scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o âmbito de atuação</option>
                            {PARTY_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status
                          </label>
                          <select
                            value={formData.party_status}
                            onChange={(e) => setFormData(prev => ({ ...prev, party_status: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione o status</option>
                            {PARTY_STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Início do mandato (opcional)
                            </label>
                            <input
                              type="date"
                              value={formData.party_mandate_start}
                              onChange={(e) => setFormData(prev => ({ ...prev, party_mandate_start: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fim do mandato (opcional)
                            </label>
                            <input
                              type="date"
                              value={formData.party_mandate_end}
                              onChange={(e) => setFormData(prev => ({ ...prev, party_mandate_end: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Influenciador cultural/artístico */}
                {formData.role_code === 'SOC_CULTURAL' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🎭</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Influenciador cultural/artístico
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Segmento cultural/artístico *
                          </label>
                          <select
                            value={formData.cultural_segment}
                            onChange={(e) => setFormData(prev => ({ ...prev, cultural_segment: e.target.value, cultural_segment_other: '' }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione um segmento</option>
                            {CULTURAL_SEGMENT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.cultural_segment === 'Outro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Outro segmento (especifique) *
                            </label>
                            <input
                              type="text"
                              value={formData.cultural_segment_other}
                              onChange={(e) => setFormData(prev => ({ ...prev, cultural_segment_other: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Descreva o segmento"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Grupo/Coletivo/Instituição
                          </label>
                          <input
                            type="text"
                            value={formData.organization}
                            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex.: Escola de Samba XYZ, CTG Tropeiros, Associação Cultural Italiana"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Papel cultural/artístico
                          </label>
                          <select
                            value={formData.cultural_role}
                            onChange={(e) => setFormData(prev => ({ ...prev, cultural_role: e.target.value, cultural_role_other: '' }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione o papel</option>
                            {CULTURAL_ROLE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {formData.cultural_role === 'Outro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Outro papel (especifique) *
                            </label>
                            <input
                              type="text"
                              value={formData.cultural_role_other}
                              onChange={(e) => setFormData(prev => ({ ...prev, cultural_role_other: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Descreva o papel"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alcance cultural
                          </label>
                          <select
                            value={formData.cultural_scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, cultural_scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione o alcance</option>
                            {CULTURAL_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Observações
                          </label>
                          <textarea
                            value={formData.cultural_notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, cultural_notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Informações adicionais (eventos, prêmios, atividades recorrentes, etc.)"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Educador/Professor */}
                {formData.role_code === 'SOC_EDUCADOR' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🎓</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Educador / Professor
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nível de ensino *
                          </label>
                          <select
                            value={formData.education_level}
                            onChange={(e) => setFormData(prev => ({ ...prev, education_level: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o nível de ensino</option>
                            {EDUCATION_LEVEL_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Disciplina / Área de atuação
                          </label>
                          <input
                            type="text"
                            value={formData.subject_area}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject_area: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Matemática, História, Educação Física, Música, Filosofia..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alcance educacional
                          </label>
                          <select
                            value={formData.reach_scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, reach_scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Selecione o alcance</option>
                            {EDUCATOR_REACH_SCOPE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Projetos / Iniciativas relevantes
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Projeto de leitura comunitária, Feira de Ciências, Olimpíadas de Matemática..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Líder Comunitário */}
                {formData.role_code === 'COM_LIDER' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🏘️</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Líder Comunitário
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Área de Atuação Comunitária *
                          </label>
                          <select
                            value={formData.community_area}
                            onChange={(e) => setFormData(prev => ({ ...prev, community_area: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione a área de atuação...</option>
                            {COMMUNITY_AREAS.map(area => (
                              <option key={area} value={area}>{area}</option>
                            ))}
                          </select>
                        </div>

                        {formData.community_area === 'Outro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Especifique a área de atuação *
                            </label>
                            <input
                              type="text"
                              value={formData.other_community_area}
                              onChange={(e) => setFormData(prev => ({ ...prev, other_community_area: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: Meio ambiente, Direitos humanos, Tecnologia..."
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Alcance da Atuação *
                          </label>
                          <select
                            value={formData.reach_scope}
                            onChange={(e) => setFormData(prev => ({ ...prev, reach_scope: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione o alcance...</option>
                            {REACH_SCOPE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Projetos / Iniciativas
                          </label>
                          <textarea
                            value={formData.projects}
                            onChange={(e) => setFormData(prev => ({ ...prev, projects: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Mutirão de limpeza, Feira do Bairro, Campeonato comunitário, Defesa da praça pública..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Campos específicos para Militar/Forças de segurança */}
                {formData.role_code === 'PUB_CHEFIA' && (
                  <>
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-4">
                        <span className="text-lg">🛡️</span>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          Militar / Forças de segurança
                        </h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Organização *
                          </label>
                          <select
                            value={formData.service_branch}
                            onChange={(e) => setFormData(prev => ({ ...prev, service_branch: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione a organização...</option>
                            {MILITARY_SERVICE_BRANCHES.map(branch => (
                              <option key={branch} value={branch}>{branch}</option>
                            ))}
                          </select>
                        </div>

                        {formData.service_branch === 'Outro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Qual organização? *
                            </label>
                            <input
                              type="text"
                              value={formData.org_custom}
                              onChange={(e) => setFormData(prev => ({ ...prev, org_custom: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: Marinha do Brasil, Força Aérea..."
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Patente/Cargo *
                          </label>
                          <select
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Selecione a patente/cargo...</option>
                            {MILITARY_RANKS.map(rank => (
                              <option key={rank} value={rank}>{rank}</option>
                            ))}
                          </select>
                        </div>

                        {formData.title === 'Outro' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Qual patente/cargo? *
                            </label>
                            <input
                              type="text"
                              value={formData.rank_custom}
                              onChange={(e) => setFormData(prev => ({ ...prev, rank_custom: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: Subtenente, Aspirante..."
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unidade / Área de atuação
                          </label>
                          <input
                            type="text"
                            value={formData.unit}
                            onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 8º BPM, BOPE, Delegacia Regional de Joinville, GM Joinville"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Especialidade
                          </label>
                          <input
                            type="text"
                            value={formData.specialty}
                            onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Operações Especiais, Trânsito, Inteligência"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Organização (campo geral para outros papéis) */}
                {!['POL_ELEITO', 'SOC_RELIGIOSO', 'ORG_EXEC', 'PUB_GESTOR', 'ORG_ACADEMICO', 'INF_PATRIARCA', 'INF_MENTOR', 'MID_CELEBRIDADE', 'MID_INFLUENCER', 'POL_PARTIDARIA', 'SOC_CULTURAL'].includes(formData.role_code) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {formData.role_code === 'MID_JORNALISTA' ? 'Veículo de Comunicação' : 
                       formData.role_code === 'POL_PRESIDENTE_ENTIDADE' ? 'Nome da entidade' : 
                       formData.role_code === 'SOC_EDUCADOR' ? 'Instituição' : 
                       formData.role_code === 'COM_LIDER' ? 'Organização/Associação' : 'Organização'}
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={formData.role_code === 'MID_JORNALISTA' ? 'Ex: Jovem Pan, Gazeta do Povo, Canal XYZ no YouTube, Portal ABC' : 
                                   formData.role_code === 'POL_PRESIDENTE_ENTIDADE' ? 'Ex: Associação Comercial de Joinville, Sindicato dos Metalúrgicos, Clube América, Câmara de Comércio' : 
                                   formData.role_code === 'SOC_EDUCADOR' ? 'Ex: Escola Municipal José do Patrocínio, Universidade Federal...' : 
                                   formData.role_code === 'COM_LIDER' ? 'Ex: Associação de Moradores do Bairro América, Movimento Jovem XYZ, Conselho Local de Saúde...' : 'Ex: Empresa XYZ, Universidade ABC'}
                    />
                  </div>
                )}

                {/* Título (campo geral - não aparece para políticos, empresários, gestor público, acadêmicos, patriarca, mentor, celebridade, influenciador digital, liderança partidária e influenciador cultural) */}
                {!['POL_ELEITO', 'ORG_EXEC', 'PUB_GESTOR', 'ORG_ACADEMICO', 'INF_PATRIARCA', 'INF_MENTOR', 'MID_CELEBRIDADE', 'MID_INFLUENCER', 'POL_PARTIDARIA', 'SOC_CULTURAL'].includes(formData.role_code) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {formData.role_code === 'MID_JORNALISTA' ? 'Função' : 
                       formData.role_code === 'POL_PRESIDENTE_ENTIDADE' ? 'Cargo/Título' : 
                       formData.role_code === 'SOC_EDUCADOR' ? 'Cargo/Título' : 
                       formData.role_code === 'COM_LIDER' ? 'Cargo/Título' : 'Cargo/Título'}
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={formData.role_code === 'MID_JORNALISTA' ? 'Ex: Repórter, Colunista, Apresentador, Radialista, Editor' : 
                                   formData.role_code === 'POL_PRESIDENTE_ENTIDADE' ? 'Ex: Presidente, Vice-presidente, Diretor' : 
                                   formData.role_code === 'SOC_EDUCADOR' ? 'Ex: Professor, Coordenador, Diretor' : 
                                   formData.role_code === 'COM_LIDER' ? 'Ex: Presidente, Coordenador de Projeto, Voluntário Ativo...' : 'Ex: Diretor, Coordenador, Pastor'}
                      maxLength={120}
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !isValidProfileId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{saving ? 'Salvando...' : (leadership ? 'Salvar alterações' : 'Definir')}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}