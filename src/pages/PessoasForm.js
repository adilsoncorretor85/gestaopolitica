import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapPicker from '@/components/MapPicker';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import useAuth from '@/hooks/useAuth';
import { getPerson, createPerson, updatePerson } from '@/services/people';
import { listLeaders } from '@/services/admin';
import { fetchAddressByCep } from '@/services/viacep';
import { geocodeAddress } from '@/services/geocoding';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';
// Função utilitária para obter a data atual no formato YYYY-MM-DD
const getCurrentDate = () => new Date().toISOString().split('T')[0];
// Funções utilitárias para CEP
function onlyDigits(s) { return (s || '').replace(/\D/g, ''); }
function maskCep(s) {
    const d = onlyDigits(s).slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
export default function PessoasFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('pessoas');
    const { profile } = useAuth();
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);
    const [errorCep, setErrorCep] = useState(null);
    const [openMap, setOpenMap] = useState(false);
    const [coords, setCoords] = useState(null);
    const cepRef = useRef(null);
    const [formData, setFormData] = useState({
        full_name: '',
        whatsapp: '',
        email: '',
        facebook: '',
        instagram: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        notes: '',
        contacted_at: id ? null : getCurrentDate(), // Preenche automaticamente para novas pessoas
        vote_status: 'INDEFINIDO',
        latitude: null,
        longitude: null
    });
    useEffect(() => {
        if (id) {
            loadPerson();
        }
        else {
            // Para novas pessoas, sempre definir a data atual
            setFormData(prev => ({
                ...prev,
                contacted_at: getCurrentDate()
            }));
        }
        loadLeaders();
    }, [id]);
    const loadPerson = async () => {
        if (!id)
            return;
        try {
            setLoading(true);
            const { data, error } = await getPerson(id);
            if (error)
                throw error;
            setFormData({
                ...data,
                contacted_at: data.contacted_at ? data.contacted_at.split('T')[0] : null
            });
            // Carregar coordenadas se existirem
            if (data.latitude && data.longitude) {
                setCoords({ lat: data.latitude, lng: data.longitude });
            }
        }
        catch (error) {
            console.error('Erro ao carregar pessoa:', error);
            alert('Erro ao carregar pessoa');
        }
        finally {
            setLoading(false);
        }
    };
    const loadLeaders = async () => {
        try {
            const data = await listLeaders(true);
            setLeaders(data || []);
        }
        catch (error) {
            console.error('Erro ao carregar líderes:', error);
        }
    };
    async function tryGeocodeFromForm() {
        const street = formData.street;
        const number = formData.number;
        const neighborhood = formData.neighborhood;
        const city = formData.city;
        const state = formData.state;
        const cep = formData.cep;
        if (!street || !city || !state)
            return;
        const c = await geocodeAddress({ street, number, neighborhood, city, state, cep });
        if (c)
            setCoords(c);
    }
    // Handler para quando um endereço é selecionado no autocomplete
    function handleAddressSelect(parts) {
        setFormData(prev => ({
            ...prev,
            street: parts.street || prev.street,
            number: parts.number || prev.number,
            neighborhood: parts.neighborhood || prev.neighborhood,
            city: parts.city || prev.city,
            state: parts.state || prev.state,
            cep: parts.cep || prev.cep
        }));
        // Se temos coordenadas, atualizar
        if (parts.latitude && parts.longitude) {
            setCoords({ lat: parts.latitude, lng: parts.longitude });
        }
    }
    async function handleCepChange(v) {
        // mask visual
        setFormData(prev => ({ ...prev, cep: maskCep(v) }));
        const d = onlyDigits(v);
        setErrorCep(null);
        if (cepRef.current)
            clearTimeout(cepRef.current);
        cepRef.current = setTimeout(async () => {
            if (d.length !== 8)
                return; // só busca com CEP completo
            setLoadingCep(true);
            const adr = await fetchAddressByCep(d);
            setLoadingCep(false);
            if (!adr) {
                setErrorCep('CEP não encontrado');
                return;
            }
            // preenche campos (libere edição depois se quiser)
            setFormData(prev => ({
                ...prev,
                street: prev.street || adr.street,
                neighborhood: prev.neighborhood || adr.neighborhood,
                city: prev.city || adr.city,
                state: prev.state || adr.state,
                cep: adr.cep
            }));
            // se já houver número, geocodifique
            if (formData.number) {
                await tryGeocodeFromForm();
            }
        }, 400);
    }
    const handleOpenMap = async () => {
        // Tenta geocodificar a partir do endereço preenchido no form
        const addr = {
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            cep: formData.cep
        };
        const g = await geocodeAddress(addr);
        setCoords(g); // Centra o mapa no provável ponto
        setOpenMap(true);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!profile)
            return;
        // Validação: não permitir datas futuras
        if (formData.contacted_at && new Date(formData.contacted_at) > new Date()) {
            alert('A data do contato não pode ser futura');
            return;
        }
        try {
            setSaving(true);
            // Normalizar WhatsApp para apenas dígitos
            const normalizedData = {
                ...formData,
                whatsapp: formData.whatsapp?.replace(/\D/g, '') || '',
                owner_id: formData.owner_id || profile.id, // Usa o owner_id do form se for admin, senão usa o profile.id
                contacted_at: id ? formData.contacted_at : (formData.contacted_at || getCurrentDate()),
                latitude: coords?.lat ?? null,
                longitude: coords?.lng ?? null
            };
            if (id) {
                const { error } = await updatePerson(id, normalizedData);
                if (error)
                    throw error;
            }
            else {
                const { error } = await createPerson(normalizedData);
                if (error)
                    throw error;
            }
            navigate('/pessoas');
        }
        catch (error) {
            console.error('Erro ao salvar pessoa:', error);
            alert('Erro ao salvar pessoa');
        }
        finally {
            setSaving(false);
        }
    };
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? e.target.checked : value
        }));
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Carregando..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsxs(Link, { to: "/pessoas", className: "flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), _jsx("span", { children: "Voltar para lista" })] }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: id ? 'Editar Pessoa' : 'Cadastrar Pessoa' })] }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-4", children: "Dados B\u00E1sicos" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Nome Completo *" }), _jsx("input", { type: "text", name: "full_name", value: formData.full_name || '', onChange: handleChange, required: true, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "WhatsApp *" }), _jsx("input", { type: "tel", name: "whatsapp", value: formData.whatsapp || '', onChange: handleChange, required: true, placeholder: "(11) 99999-9999", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Email" }), _jsx("input", { type: "email", name: "email", value: formData.email || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Facebook" }), _jsx("input", { type: "text", name: "facebook", value: formData.facebook || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Instagram" }), _jsx("input", { type: "text", name: "instagram", value: formData.instagram || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), profile?.role === 'ADMIN' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "L\u00EDder Respons\u00E1vel" }), _jsxs("select", { name: "owner_id", value: formData.owner_id || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "", children: "Selecione um l\u00EDder" }), leaders.map(leader => (_jsx("option", { value: leader.id, children: leader.status === 'PENDING' ? `${leader.full_name || 'Sem nome'} (pendente)` : (leader.full_name || 'Sem nome') }, leader.id)))] })] }))] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-4", children: "Endere\u00E7o" }), _jsx(AddressAutocomplete, { label: "Endere\u00E7o (autocomplete)", placeholder: "Digite o endere\u00E7o completo...", onSelect: handleAddressSelect, className: "mb-6" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "CEP" }), _jsx("input", { type: "text", value: formData.cep || '', onChange: (e) => handleCepChange(e.target.value), placeholder: "00000-000", className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), loadingCep && (_jsxs("p", { className: "text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin" }), "Buscando endere\u00E7o..."] })), errorCep && (_jsx("p", { className: "text-sm text-red-600 dark:text-red-400 mt-1", children: errorCep }))] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Rua" }), _jsx("input", { type: "text", name: "street", value: formData.street || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "N\u00FAmero" }), _jsx("input", { type: "text", name: "number", value: formData.number || '', onChange: (e) => {
                                                                            setFormData(prev => ({ ...prev, number: e.target.value }));
                                                                            // se já tem CEP válido (8) e rua/cidade/UF, geocodifica depois de breve debounce
                                                                            if (onlyDigits(formData.cep || '').length === 8) {
                                                                                if (cepRef.current)
                                                                                    clearTimeout(cepRef.current);
                                                                                cepRef.current = setTimeout(tryGeocodeFromForm, 300);
                                                                            }
                                                                        }, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Complemento" }), _jsx("input", { type: "text", name: "complement", value: formData.complement || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Bairro" }), _jsx("input", { type: "text", name: "neighborhood", value: formData.neighborhood || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Cidade" }), _jsx("input", { type: "text", name: "city", value: formData.city || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Estado" }), _jsx("input", { type: "text", name: "state", value: formData.state || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), _jsxs("div", { className: "mt-4 flex gap-2 items-center", children: [_jsxs("button", { type: "button", onClick: handleOpenMap, className: "px-3 py-2 rounded border border-gray-300 dark:border-gray-600 inline-flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300", children: [_jsx(MapPin, { className: "w-4 h-4" }), "Definir no mapa"] }), coords && (_jsxs("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: ["Marcado: ", coords.lat.toFixed(5), ", ", coords.lng.toFixed(5)] }))] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-4", children: "Informa\u00E7\u00F5es Pol\u00EDticas" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Status do Voto" }), _jsxs("select", { name: "vote_status", value: formData.vote_status || 'INDEFINIDO', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "INDEFINIDO", children: "Indefinido" }), _jsx("option", { value: "PROVAVEL", children: "Prov\u00E1vel" }), _jsx("option", { value: "CONFIRMADO", children: "Confirmado" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Data do Contato" }), _jsx("input", { type: "date", name: "contacted_at", value: formData.contacted_at || '', onChange: handleChange, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), !id && (_jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: "Preenchido automaticamente com a data atual" }))] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { name: "notes", value: formData.notes || '', onChange: handleChange, rows: 3, className: "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Informa\u00E7\u00F5es adicionais..." })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx(Link, { to: "/pessoas", className: "px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: saving, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors", children: saving ? 'Salvando...' : (id ? 'Salvar Alterações' : 'Cadastrar Pessoa') })] })] }) })] }) })] }), _jsx(MapPicker, { open: openMap, onClose: () => setOpenMap(false), initialCoords: coords, initialAddress: {
                    street: formData.street,
                    number: formData.number,
                    neighborhood: formData.neighborhood,
                    city: formData.city,
                    state: formData.state,
                    cep: formData.cep
                }, onConfirm: (c) => setCoords(c) })] }));
}
