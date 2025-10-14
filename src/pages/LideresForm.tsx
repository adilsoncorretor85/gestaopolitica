import { devLog, logger } from '@/lib/logger';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapPicker from '@/components/MapPicker';
import AddressAutocomplete, { type AddressParts } from '@/components/AddressAutocomplete';
import useAuth from '@/hooks/useAuth';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getLeaderDetail, updateLeaderProfile, type LeaderDetail } from '@/services/leader';
import { inviteLeader } from '@/services/invite';
import { toggleUserBan } from '@/services/admin';
import { fetchAddressByCep } from '@/services/viacep';
import { geocodeAddress } from '@/services/geocoding';
// HOTFIX: Imports de leadership comentados temporariamente
// import { listLeadershipCatalog, createProfileLeadership, getRoleRequirements } from '@/services/leadership';
import { ArrowLeft, Loader2, MapPin, Crown } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

// Funções utilitárias para CEP
function onlyDigits(s: string) { return (s || '').replace(/\D/g, ''); }
function maskCep(s: string) {
  const d = onlyDigits(s).slice(0,8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

// Schema minimalista para convite
const inviteSchema = z.object({
  full_name: z.string().min(3, 'Informe o nome completo'),
  email: z.string().email('E-mail inválido'),
  goal: z.coerce.number().int().positive().optional(), // opcional
});

// Schema completo para edição
const leaderSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  goal: z.number().min(0, 'Meta deve ser maior ou igual a 0').optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

type LeaderFormData = z.infer<typeof leaderSchema>;
type InviteFormData = z.infer<typeof inviteSchema>;

function LideresFormContent() {
  const navigate = useNavigate();
  const params = useParams();
  const { id } = params || {};
  
  // Verificação de segurança para evitar erro de contexto
  if (!params) {
    return <LoadingSpinner text="Carregando..." />;
  }
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lideres');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const { profile, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errorCep, setErrorCep] = useState<string | null>(null);
  const [openMap, setOpenMap] = useState(false);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [leaderData, setLeaderData] = useState<LeaderDetail | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    message: string;
    emailStatus: 'sent'|'failed'|'skipped';
    acceptUrl?: string;
  } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para liderança - HOTFIX: Comentados temporariamente
  /*
  const [leadershipCatalog, setLeadershipCatalog] = useState<LeadershipCatalog>([]);
  const [leadershipData, setLeadershipData] = useState({
    role_code: '' as LeadershipRoleCode | '',
    organization: '',
    title: '',
    level: null as number | null,
    reach_scope: null as 'FAMILIA' | 'BAIRRO' | 'CIDADE' | 'REGIAO' | 'ONLINE' | null,
    reach_size: null as number | null,
    extra: {} as Record<string, unknown>
  });
  */

  const isInvite = !id; // Se não tem ID, é um convite
  
  // Debug: verificar se isInvite está correto
  devLog('LideresForm Debug:', { id, isInvite, params });
  
  // Debug: verificar localStorage
  if (isInvite) {
    const savedData = localStorage.getItem('lideres-form-draft');
    devLog('LideresForm localStorage:', savedData);
  }
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors }
  } = useForm<LeaderFormData | InviteFormData>({
    resolver: isInvite 
      ? zodResolver(inviteSchema) as any
      : zodResolver(leaderSchema) as any
  });

  // Auto-save para formulários de convite (novos líderes)
  const { restoreData, clearStorage } = useAutoSave(
    { watch, setValue, getValues },
    {
      key: 'lideres-form-draft',
      debounceMs: 2000,
      enabled: isInvite // Só ativa para novos convites
    }
  );

  useEffect(() => {
    if (id) {
      loadLeader();
    } else {
      // Se é um novo convite, tentar restaurar dados salvos
      const restored = restoreData();
      if (restored) {
        devLog('Dados do formulário restaurados do auto-save');
      }
    }
    // HOTFIX: Comentado temporariamente
    // loadLeadershipCatalog();
  }, [id]); // Removido restoreData das dependências para evitar loops

  // HOTFIX: Função comentada temporariamente
  /*
  const loadLeadershipCatalog = async () => {
    try {
      const catalog = await listLeadershipCatalog();
      setLeadershipCatalog(catalog);
    } catch (error) {
      logger.error('Erro ao carregar catálogo de lideranças:', error);
    }
  };
  */

  // HOTFIX: Funções comentadas temporariamente
  /*
  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      business_sector: 'Ramo de atividade',
      public_area: 'Área de atuação',
      status: 'Status',
      office: 'Cargo'
    };
    return labels[field] || field;
  };

  const getGroupName = (group: string) => {
    const groups: Record<string, string> = {
      INSTITUCIONAL: 'Institucional',
      SOCIAL: 'Social',
      POLITICA: 'Política',
      MIDIATICA: 'Midática',
      INFORMAL: 'Informal'
    };
    return groups[group] || group;
  };
  */

  const loadLeader = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getLeaderDetail(id);
      setLeaderData(data);
      setValue('full_name', data.full_name || '');
      setValue('email', data.email || '');
      setValue('phone', data.phone || '');
      setValue('birth_date', data.birth_date || '');
      setValue('gender', data.gender || undefined);
      setValue('goal', data.goal || undefined);
      setValue('cep', data.cep || '');
      setValue('street', data.street || '');
      setValue('number', data.number || '');
      setValue('complement', data.complement || '');
      setValue('neighborhood', data.neighborhood || '');
      setValue('city', data.city || '');
      setValue('state', data.state || '');
      setValue('notes', data.notes || '');
      
      // Carregar coordenadas se existirem
      if (data.latitude && data.longitude) {
        setCoords({ lat: data.latitude, lng: data.longitude });
      }
    } catch (error) {
      logger.error('Erro ao carregar líder:', error);
      alert('Erro ao carregar líder');
    } finally {
      setLoading(false);
    }
  };

  async function tryGeocodeFromForm() {
    const rua = watch('street');
    const numero = watch('number');
    const bairro = watch('neighborhood');
    const cidade = watch('city');
    const estado = watch('state');
    const cep = watch('cep');

    if (!rua || !cidade || !estado) return;
    const c = await geocodeAddress({ street: rua, number: numero, neighborhood: bairro, city: cidade, state: estado, cep });
    if (c) setCoords({ lat: c.latitude, lng: c.longitude });
  }

  // Handler para quando um endereço é selecionado no autocomplete
  function handleAddressSelect(parts: AddressParts) {
    if (parts.street) setValue('street', parts.street);
    if (parts.number) setValue('number', parts.number);
    if (parts.neighborhood) setValue('neighborhood', parts.neighborhood);
    if (parts.city) setValue('city', parts.city);
    if (parts.state) setValue('state', parts.state);
    if (parts.cep) setValue('cep', parts.cep);

    // Se temos coordenadas, atualizar
    if (parts.latitude && parts.longitude) {
      setCoords({ lat: parts.latitude, lng: parts.longitude });
    }
  }

  async function handleCepChange(v: string) {
    setErrorCep(null);
    setValue('cep', maskCep(v));
    const d = onlyDigits(v);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (d.length !== 8) return;
      setLoadingCep(true);
      const adr = await fetchAddressByCep(d).catch(() => null);
      setLoadingCep(false);

      if (!adr) { setErrorCep('CEP não encontrado'); return; }

      if (!watch('street')) setValue('street', adr.street);
      if (!watch('neighborhood')) setValue('neighborhood', adr.neighborhood);
      if (!watch('city')) setValue('city', adr.city);
      if (!watch('state')) setValue('state', adr.state);

      // Se já houver número, geocodifica de imediato
      if (watch('number')) {
        await tryGeocodeFromForm();
      }
    }, 400);
  }

  const onSubmit = async (data: LeaderFormData | InviteFormData) => {
    if (!isAdmin) return;
    
    try {
      setSaving(true);
      
      if (id) {
        // Update existing leader - usar schema completo
        const fullData = data as LeaderFormData;
        const payload = {
          ...fullData,
          cep: onlyDigits(fullData.cep || ''),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        };
        
        try {
          await updateLeaderProfile(id, payload);
          alert('Líder atualizado com sucesso!');
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          alert(`Erro ao salvar líder: ${errorMessage}`);
          return;
        }
      } else {
        // Invite new leader - usar schema minimalista
        const inviteData = data as InviteFormData;
        const payload = {
          full_name: inviteData.full_name,
          email: inviteData.email,
          goal: inviteData.goal,
          // Campos opcionais podem ser adicionados aqui se necessário
        };
        
        try {
          const result = await inviteLeader(payload);
          
          // Armazenar resultado para exibição
          setInviteResult({
            message: result?.message || 'Convite enviado com sucesso!',
            emailStatus: result?.emailStatus || 'skipped',
            acceptUrl: result?.acceptUrl
          });
          
          // Limpar auto-save após sucesso
          clearStorage();
          
          // Log para debug
          if (result?.acceptUrl) {
            devLog('Link de convite:', result.acceptUrl);
            devLog('Email status:', result.emailStatus);
          }
          
          // Se foi preenchida uma liderança, criar após o convite
          // HOTFIX: Comentado temporariamente para estabilização
          /*
          if (leadershipData.role_code && result?.userId) {
            try {
              await createProfileLeadership({
                profile_id: result.userId, // ID do leader_profiles criado
                role_code: leadershipData.role_code,
                organization: leadershipData.organization || null,
                title: leadershipData.title || null,
                level: leadershipData.level,
                reach_scope: leadershipData.reach_scope,
                reach_size: leadershipData.reach_size,
                extra: leadershipData.extra
              });
              devLog('Liderança criada com sucesso');
            } catch (leadershipError: unknown) {
              const errorMessage = leadershipError instanceof Error ? leadershipError.message : String(leadershipError);
              console.error('Erro ao criar liderança:', errorMessage);
              // Não falha o convite por causa da liderança
            }
          }
          */
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error('inviteLeader error', e);
          alert(`Erro ao enviar convite: ${errorMessage}`);
          return;
        }
      }
      
      // Para edição de líder existente, navegar após salvar
      if (id) {
        navigate('/lideres');
      }
    } catch (error) {
      console.error('Erro geral:', error);
      alert(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!id || !confirm('Desativar este líder? Ele não conseguirá mais fazer login.')) return;
    
    try {
      setSaving(true);
      
      devLog('Iniciando desativação do líder:', id);
      
      // Bane o usuário usando a Edge Function
      const result = await toggleUserBan({
        userId: id,
        action: 'ban',
        reason: 'Desativado pelo administrador',
      });
      
      devLog('Resultado da desativação:', result);
      
      alert('Líder desativado com sucesso.');
      navigate('/lideres');
    } catch (error) {
      console.error('Erro ao desativar líder:', error);
      alert(`Erro ao desativar líder: ${error instanceof Error ? error.message : error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!id || !confirm('Reativar este líder? Ele poderá fazer login novamente.')) return;
    
    try {
      setSaving(true);
      
      // Remove o ban do usuário usando a Edge Function
      await toggleUserBan({
        userId: id,
        action: 'unban',
        reason: 'Reativado pelo administrador',
      });
      
      alert('Líder reativado com sucesso.');
      navigate('/lideres');
    } catch (error) {
      console.error('Erro ao reativar líder:', error);
      alert(`Erro ao reativar líder: ${error instanceof Error ? error.message : error}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Acesso restrito a administradores</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        profile={profile || undefined}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6">
            <div className="mb-6">
              <Link
                to="/lideres"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para lista</span>
              </Link>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {id ? 'Editar Líder' : 'Convidar Líder'}
              </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Dados Básicos */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {isInvite ? 'Dados do Convite' : 'Dados Básicos'}
                  </h3>
                  
                  {/* Campos essenciais - sempre visíveis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        {...register('full_name')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.full_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        {...register('email')}
                        disabled={!!id} // Disable email editing for existing leaders
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600"
                      />
                      {errors.email && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Meta do líder {isInvite && '(opcional)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('goal', { valueAsNumber: true })}
                        placeholder="Meta de contatos"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.goal && (
                        <p className="text-red-500 text-sm mt-1">{errors.goal.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Botão para expandir campos avançados (apenas no convite) */}
                  {isInvite && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                        className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        <span>{showAdvancedFields ? 'Ocultar' : 'Mostrar'} campos avançados</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${showAdvancedFields ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Campos avançados - visíveis apenas se não for convite ou se expandido */}
                  {(!isInvite || showAdvancedFields) && (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isInvite ? 'mt-4' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          {...register('phone')}
                          placeholder="(11) 99999-9999"
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Data de Nascimento
                        </label>
                        <input
                          type="date"
                          {...register('birth_date')}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sexo
                        </label>
                        <select
                          {...register('gender')}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione</option>
                          <option value="M">Masculino</option>
                          <option value="F">Feminino</option>
                          <option value="O">Outro</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Endereço - apenas para edição ou convite com campos avançados */}
                {(!isInvite || showAdvancedFields) && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Endereço</h3>
                  
                  {/* Autocomplete de Endereço */}
                  <AddressAutocomplete
                    label="Endereço (autocomplete)"
                    placeholder="Digite o endereço completo..."
                    onSelect={handleAddressSelect}
                    className="mb-6"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CEP
                      </label>
                      <input
                        value={watch('cep') || ''}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {loadingCep && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Buscando endereço...
                        </p>
                      )}
                      {errorCep && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorCep}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rua
                      </label>
                      <input
                        {...register('street')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número
                      </label>
                      <input
                        value={watch('number') || ''}
                        onChange={async (e) => {
                          setValue('number', e.target.value);
                          // se já tem CEP válido (8) e rua/cidade/UF, geocodifica depois de breve debounce
                          if (onlyDigits(watch('cep') || '').length === 8) {
                            if (debounceRef.current) clearTimeout(debounceRef.current);
                            debounceRef.current = setTimeout(tryGeocodeFromForm, 300);
                          }
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Complemento
                      </label>
                      <input
                        {...register('complement')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bairro
                      </label>
                      <input
                        {...register('neighborhood')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cidade
                      </label>
                      <input
                        {...register('city')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Estado
                      </label>
                      <input
                        {...register('state')}
                        placeholder="SP"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Liderança (opcional) - apenas para convites */}
                {false && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Crown className="h-5 w-5 text-violet-500" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Liderança (opcional)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Papel */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Papel
                        </label>
                        <select
                          value=""
                          onChange={() => {}}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione um papel (opcional)</option>
                          <option value="">Funcionalidade temporariamente desabilitada</option>
                        </select>
                      </div>

                      {/* Organização */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Organização
                        </label>
                        <input
                          type="text"
                          value=""
                          onChange={() => {}}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nome da organização"
                        />
                      </div>

                      {/* Cargo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cargo
                        </label>
                        <input
                          type="text"
                          value=""
                          onChange={() => {}}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Título do cargo"
                        />
                      </div>

                      {/* Nível */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nível (1-5)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value=""
                          onChange={() => {}}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="1-5"
                        />
                      </div>

                      {/* Alcance */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Alcance
                        </label>
                        <select
                          value=""
                          onChange={() => {}}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione o alcance</option>
                          <option value="FAMILIA">Família</option>
                          <option value="BAIRRO">Bairro</option>
                          <option value="CIDADE">Cidade</option>
                          <option value="REGIAO">Região</option>
                          <option value="ONLINE">Online</option>
                        </select>
                      </div>

                      {/* Tamanho do alcance */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tamanho do Alcance
                        </label>
                        <input
                          type="number"
                          min="0"
                          value=""
                          onChange={() => {}}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Número de pessoas"
                        />
                      </div>
                    </div>

                    {/* Campos extras dinâmicos - TEMPORARIAMENTE DESABILITADOS */}
                    {false && (
                      <div className="mt-4 space-y-4">
                        {/* {[].map((req) => (
                          <div key={req}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Campo *
                            </label>
                            {req === 'business_sector' && (
                              <input
                                type="text"
                                value={leadershipData.extra?.[req] || ''}
                                onChange={(e) => setLeadershipData(prev => ({
                                  ...prev,
                                  extra: { ...prev.extra, [req]: e.target.value }
                                }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: Tecnologia, Saúde, Educação"
                                required
                              />
                            )}
                            {req === 'public_area' && (
                              <input
                                type="text"
                                value={leadershipData.extra?.[req] || ''}
                                onChange={(e) => setLeadershipData(prev => ({
                                  ...prev,
                                  extra: { ...prev.extra, [req]: e.target.value }
                                }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: Saúde, Educação, Segurança"
                                required
                              />
                            )}
                            {req === 'status' && (
                              <select
                                value={leadershipData.extra?.[req] || ''}
                                onChange={(e) => setLeadershipData(prev => ({
                                  ...prev,
                                  extra: { ...prev.extra, [req]: e.target.value }
                                }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              >
                                <option value="">Selecione o status</option>
                                <option value="EM MANDATO">Em Mandato</option>
                                <option value="SUPLENTE">Suplente</option>
                                <option value="EX">Ex</option>
                                <option value="PRE-CANDIDATO">Pré-candidato</option>
                              </select>
                            )}
                            {req === 'office' && (
                              <div className="space-y-2">
                                <select
                                  value={leadershipData.extra?.[req] || ''}
                                  onChange={(e) => setLeadershipData(prev => ({
                                    ...prev,
                                    extra: { ...prev.extra, [req]: e.target.value }
                                  }))}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Selecione o cargo</option>
                                  <option value="VEREADOR">Vereador</option>
                                  <option value="PREFEITO">Prefeito</option>
                                  <option value="DEPUTADO ESTADUAL">Deputado Estadual</option>
                                  <option value="DEPUTADO FEDERAL">Deputado Federal</option>
                                  <option value="SENADOR">Senador</option>
                                  <option value="OUTRO">Outro</option>
                                </select>
                                {leadershipData.extra?.[req] === 'OUTRO' && (
                                  <input
                                    type="text"
                                    value={leadershipData.extra?.office_other || ''}
                                    onChange={(e) => setLeadershipData(prev => ({
                                      ...prev,
                                      extra: { ...prev.extra, office_other: e.target.value }
                                    }))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Especifique o cargo"
                                    required
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))} */}
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Funcionalidade temporariamente desabilitada
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais sobre o líder..."
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Link
                    to="/lideres"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </Link>
                  {id && leaderData && (
                    <>
                      {leaderData.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={handleDeactivate}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Desativar Líder
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleReactivate}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Reativar Líder
                        </button>
                      )}
                    </>
                  )}
                  {!id && (
                    <button
                      type="button"
                      onClick={() => {}} // placeholder for new leader actions if needed
                      disabled={saving}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
                      style={{ display: 'none' }} // hide for now
                    >
                      Ação Adicional
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {saving 
                        ? 'Salvando...' 
                        : (id ? 'Salvar Alterações' : 'Enviar Convite')
                      }
                    </span>
                  </button>
                </div>

                {/* Botão Definir no mapa - apenas quando campos avançados estão visíveis */}
                {(!isInvite || showAdvancedFields) && (
                  <div className="mt-4 flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setOpenMap(true)}
                      className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 inline-flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <MapPin className="w-4 h-4" />
                      Definir no mapa
                    </button>
                    {coords && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Marcado: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                      </span>
                    )}
                  </div>
                )}

                <MapPicker
                  open={openMap}
                  onClose={() => setOpenMap(false)}
                  initialCoords={coords}
                  initialAddress={{
                    street: watch('street'),
                    number: watch('number'),
                    neighborhood: watch('neighborhood'),
                    city: watch('city'),
                    state: watch('state'),
                    cep: watch('cep')
                  }}
                  onConfirm={(c) => setCoords(c)}
                />
              </form>
            </div>

            {/* Feedback do Convite */}
            {inviteResult && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    inviteResult.emailStatus === 'sent' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : inviteResult.emailStatus === 'failed'
                      ? 'bg-yellow-100 dark:bg-yellow-900'
                      : 'bg-blue-100 dark:bg-blue-900'
                  }`}>
                    {inviteResult.emailStatus === 'sent' ? (
                      <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                    ) : inviteResult.emailStatus === 'failed' ? (
                      <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400 text-lg">ℹ️</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Resultado do Convite
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {inviteResult.message}
                    </p>
                    
                    {inviteResult.emailStatus === 'failed' && inviteResult.acceptUrl && (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Como o email não foi enviado, você pode copiar o link de convite abaixo:
                        </p>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={inviteResult.acceptUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(inviteResult.acceptUrl!);
                              alert('Link copiado para a área de transferência!');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setInviteResult(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Fechar
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/lideres')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Ver Lista de Líderes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LideresFormPage() {
  return <LideresFormContent />;
}