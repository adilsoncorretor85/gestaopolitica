import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapPicker from '@/components/MapPicker';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import useAuth from '@/hooks/useAuth';
import { getLeaderDetail, updateLeaderProfile, inviteLeader } from '@/services/leader';
import { toggleUserBan } from '@/services/admin';
import { fetchAddressByCep } from '@/services/viacep';
import { geocodeAddress } from '@/services/geocoding';
// HOTFIX: Imports de leadership comentados temporariamente
// import { listLeadershipCatalog, createProfileLeadership, getRoleRequirements } from '@/services/leadership';
import { ArrowLeft, Loader2, MapPin, Crown } from 'lucide-react';
// Funções utilitárias para CEP
function onlyDigits(s) { return (s || '').replace(/\D/g, ''); }
function maskCep(s) {
    const d = onlyDigits(s).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
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
export default function LideresFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('lideres');
    const { profile, isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);
    const [errorCep, setErrorCep] = useState(null);
    const [openMap, setOpenMap] = useState(false);
    const [coords, setCoords] = useState(null);
    const [leaderData, setLeaderData] = useState(null);
    const debounceRef = useRef(null);
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
      extra: {} as Record<string, any>
    });
    */
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(leaderSchema)
    });
    useEffect(() => {
        if (id) {
            loadLeader();
        }
        // HOTFIX: Comentado temporariamente
        // loadLeadershipCatalog();
    }, [id]);
    // HOTFIX: Função comentada temporariamente
    /*
    const loadLeadershipCatalog = async () => {
      try {
        const catalog = await listLeadershipCatalog();
        setLeadershipCatalog(catalog);
      } catch (error) {
        console.error('Erro ao carregar catálogo de lideranças:', error);
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
        if (!id)
            return;
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
        }
        catch (error) {
            console.error('Erro ao carregar líder:', error);
            alert('Erro ao carregar líder');
        }
        finally {
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
        if (!rua || !cidade || !estado)
            return;
        const c = await geocodeAddress({ street: rua, number: numero, neighborhood: bairro, city: cidade, state: estado, cep });
        if (c)
            setCoords(c);
    }
    // Handler para quando um endereço é selecionado no autocomplete
    function handleAddressSelect(parts) {
        if (parts.street)
            setValue('street', parts.street);
        if (parts.number)
            setValue('number', parts.number);
        if (parts.neighborhood)
            setValue('neighborhood', parts.neighborhood);
        if (parts.city)
            setValue('city', parts.city);
        if (parts.state)
            setValue('state', parts.state);
        if (parts.cep)
            setValue('cep', parts.cep);
        // Se temos coordenadas, atualizar
        if (parts.latitude && parts.longitude) {
            setCoords({ lat: parts.latitude, lng: parts.longitude });
        }
    }
    async function handleCepChange(v) {
        setErrorCep(null);
        setValue('cep', maskCep(v));
        const d = onlyDigits(v);
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            if (d.length !== 8)
                return;
            setLoadingCep(true);
            const adr = await fetchAddressByCep(d).catch(() => null);
            setLoadingCep(false);
            if (!adr) {
                setErrorCep('CEP não encontrado');
                return;
            }
            if (!watch('street'))
                setValue('street', adr.street);
            if (!watch('neighborhood'))
                setValue('neighborhood', adr.neighborhood);
            if (!watch('city'))
                setValue('city', adr.city);
            if (!watch('state'))
                setValue('state', adr.state);
            // Se já houver número, geocodifica de imediato
            if (watch('number')) {
                await tryGeocodeFromForm();
            }
        }, 400);
    }
    const onSubmit = async (data) => {
        if (!isAdmin)
            return;
        try {
            setSaving(true);
            const payload = {
                ...data,
                cep: onlyDigits(data.cep || ''),
                latitude: coords?.lat ?? null,
                longitude: coords?.lng ?? null,
            };
            if (id) {
                // Update existing leader
                try {
                    await updateLeaderProfile(id, payload);
                    alert('Líder atualizado com sucesso!');
                }
                catch (e) {
                    alert(`Erro ao salvar líder: ${e?.message ?? String(e)}`);
                    return;
                }
            }
            else {
                // Invite new leader
                try {
                    const result = await inviteLeader(payload);
                    alert(result?.message || 'Convite enviado com sucesso!');
                    if (result?.acceptUrl) {
                        console.log('Link de convite:', result.acceptUrl);
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
                        console.log('Liderança criada com sucesso');
                      } catch (leadershipError: any) {
                        console.error('Erro ao criar liderança:', leadershipError);
                        // Não falha o convite por causa da liderança
                      }
                    }
                    */
                }
                catch (e) {
                    console.error('inviteLeader error', e);
                    alert(`Erro ao enviar convite: ${e?.message || e}`);
                    return;
                }
            }
            navigate('/lideres');
        }
        catch (error) {
            console.error('Erro geral:', error);
            alert(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
        finally {
            setSaving(false);
        }
    };
    const handleDeactivate = async () => {
        if (!id || !confirm('Desativar este líder? Ele não conseguirá mais fazer login.'))
            return;
        try {
            setSaving(true);
            // Atualiza o status no leader_profiles
            await updateLeaderProfile(id, { status: 'INACTIVE' });
            // Bane o usuário no auth
            await toggleUserBan({
                user_id: id,
                ban: true,
                reason: 'Desativado pelo administrador',
            });
            alert('Líder desativado com sucesso.');
            navigate('/lideres');
        }
        catch (error) {
            console.error('Erro ao desativar líder:', error);
            alert(`Erro ao desativar líder: ${error instanceof Error ? error.message : error}`);
        }
        finally {
            setSaving(false);
        }
    };
    const handleReactivate = async () => {
        if (!id || !confirm('Reativar este líder? Ele poderá fazer login novamente.'))
            return;
        try {
            setSaving(true);
            // Atualiza o status no leader_profiles
            await updateLeaderProfile(id, { status: 'ACTIVE' });
            // Remove o ban do usuário no auth
            await toggleUserBan({
                user_id: id,
                ban: false,
                reason: 'Reativado pelo administrador',
            });
            alert('Líder reativado com sucesso.');
            navigate('/lideres');
        }
        catch (error) {
            console.error('Erro ao reativar líder:', error);
            alert(`Erro ao reativar líder: ${error instanceof Error ? error.message : error}`);
        }
        finally {
            setSaving(false);
        }
    };
    if (!isAdmin) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Acesso restrito a administradores" }) }));
    }
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Carregando..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsxs(Link, { to: "/lideres", className: "flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), _jsx("span", { children: "Voltar para lista" })] }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: id ? 'Editar Líder' : 'Convidar Líder' })] }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-4", children: "Dados B\u00E1sicos" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Nome Completo *" }), _jsx("input", { ...register('full_name'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), errors.full_name && (_jsx("p", { className: "text-red-500 text-sm mt-1", children: errors.full_name.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Email *" }), _jsx("input", { type: "email", ...register('email'), disabled: !!id, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600" }), errors.email && (_jsx("p", { className: "text-red-600 dark:text-red-400 text-sm mt-1", children: errors.email.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Telefone" }), _jsx("input", { type: "tel", ...register('phone'), placeholder: "(11) 99999-9999", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Data de Nascimento" }), _jsx("input", { type: "date", ...register('birth_date'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Sexo" }), _jsxs("select", { ...register('gender'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "", children: "Selecione" }), _jsx("option", { value: "M", children: "Masculino" }), _jsx("option", { value: "F", children: "Feminino" }), _jsx("option", { value: "O", children: "Outro" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Meta do l\u00EDder" }), _jsx("input", { type: "number", min: "0", ...register('goal', { valueAsNumber: true }), placeholder: "Meta de contatos", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), errors.goal && (_jsx("p", { className: "text-red-500 text-sm mt-1", children: errors.goal.message }))] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-4", children: "Endere\u00E7o" }), _jsx(AddressAutocomplete, { label: "Endere\u00E7o (autocomplete)", placeholder: "Digite o endere\u00E7o completo...", onSelect: handleAddressSelect, className: "mb-6" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "CEP" }), _jsx("input", { value: watch('cep') || '', onChange: (e) => handleCepChange(e.target.value), placeholder: "00000-000", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), loadingCep && (_jsxs("p", { className: "text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin" }), "Buscando endere\u00E7o..."] })), errorCep && (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400 mt-1", children: errorCep }))] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Rua" }), _jsx("input", { ...register('street'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "N\u00FAmero" }), _jsx("input", { value: watch('number') || '', onChange: async (e) => {
                                                                            setValue('number', e.target.value);
                                                                            // se já tem CEP válido (8) e rua/cidade/UF, geocodifica depois de breve debounce
                                                                            if (onlyDigits(watch('cep') || '').length === 8) {
                                                                                if (debounceRef.current)
                                                                                    clearTimeout(debounceRef.current);
                                                                                debounceRef.current = setTimeout(tryGeocodeFromForm, 300);
                                                                            }
                                                                        }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Complemento" }), _jsx("input", { ...register('complement'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Bairro" }), _jsx("input", { ...register('neighborhood'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Cidade" }), _jsx("input", { ...register('city'), className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Estado" }), _jsx("input", { ...register('state'), placeholder: "SP", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] })] }), false && (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 mb-4", children: [_jsx(Crown, { className: "h-5 w-5 text-violet-500" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white", children: "Lideran\u00E7a (opcional)" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Papel" }), _jsxs("select", { value: "", onChange: () => { }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "", children: "Selecione um papel (opcional)" }), _jsx("option", { value: "", children: "Funcionalidade temporariamente desabilitada" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Organiza\u00E7\u00E3o" }), _jsx("input", { type: "text", value: "", onChange: () => { }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Nome da organiza\u00E7\u00E3o" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Cargo" }), _jsx("input", { type: "text", value: "", onChange: () => { }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "T\u00EDtulo do cargo" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "N\u00EDvel (1-5)" }), _jsx("input", { type: "number", min: "1", max: "5", value: "", onChange: () => { }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "1-5" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Alcance" }), _jsxs("select", { value: "", onChange: () => { }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "", children: "Selecione o alcance" }), _jsx("option", { value: "FAMILIA", children: "Fam\u00EDlia" }), _jsx("option", { value: "BAIRRO", children: "Bairro" }), _jsx("option", { value: "CIDADE", children: "Cidade" }), _jsx("option", { value: "REGIAO", children: "Regi\u00E3o" }), _jsx("option", { value: "ONLINE", children: "Online" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Tamanho do Alcance" }), _jsx("input", { type: "number", min: "0", value: "", onChange: () => { }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "N\u00FAmero de pessoas" })] })] }), false && (_jsx("div", { className: "mt-4 space-y-4", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400 text-sm", children: "Funcionalidade temporariamente desabilitada" }) }))] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { ...register('notes'), rows: 3, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Informa\u00E7\u00F5es adicionais sobre o l\u00EDder..." })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx(Link, { to: "/lideres", className: "px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors", children: "Cancelar" }), id && leaderData && (_jsx(_Fragment, { children: leaderData.status === 'ACTIVE' ? (_jsx("button", { type: "button", onClick: handleDeactivate, disabled: saving, className: "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors", children: "Desativar L\u00EDder" })) : (_jsx("button", { type: "button", onClick: handleReactivate, disabled: saving, className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors", children: "Reativar L\u00EDder" })) })), !id && (_jsx("button", { type: "button", onClick: () => { }, disabled: saving, className: "px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50", style: { display: 'none' }, children: "A\u00E7\u00E3o Adicional" })), _jsxs("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2", children: [saving && _jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: saving
                                                                    ? 'Salvando...'
                                                                    : (id ? 'Salvar Alterações' : 'Enviar Convite') })] })] }), _jsxs("div", { className: "mt-4 flex gap-2 items-center", children: [_jsxs("button", { type: "button", onClick: () => setOpenMap(true), className: "px-3 py-2 rounded border border-gray-300 dark:border-gray-600 inline-flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300", children: [_jsx(MapPin, { className: "w-4 h-4" }), "Definir no mapa"] }), coords && (_jsxs("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: ["Marcado: ", coords.lat.toFixed(5), ", ", coords.lng.toFixed(5)] }))] }), _jsx(MapPicker, { open: openMap, onClose: () => setOpenMap(false), initialCoords: coords, initialAddress: {
                                                    street: watch('street'),
                                                    number: watch('number'),
                                                    neighborhood: watch('neighborhood'),
                                                    city: watch('city'),
                                                    state: watch('state'),
                                                    cep: watch('cep')
                                                }, onConfirm: (c) => setCoords(c) })] }) })] }) })] })] }));
}
