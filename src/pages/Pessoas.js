import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import Drawer from '@/components/Drawer';
import useAuth from '@/hooks/useAuth';
import { listPeople, deletePerson, updatePerson } from '@/services/people';
import { listLeaders } from '@/services/admin';
import { Plus, Search, Phone, MapPin, Edit2, Trash2, ExternalLink, Mail, Copy, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
export default function PessoasPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('pessoas');
    const { profile, isAdmin } = useAuth();
    const [people, setPeople] = useState([]);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [leaderFilter, setLeaderFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const [sortBy, setSortBy] = useState('full_name');
    const [sortOrder, setSortOrder] = useState('asc');
    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [toast, setToast] = useState(null);
    // Notes editing state
    const [editingNotes, setEditingNotes] = useState(null);
    const [notesText, setNotesText] = useState('');
    const [updatingNotes, setUpdatingNotes] = useState(false);
    useEffect(() => {
        loadData();
    }, [search, cityFilter, stateFilter, leaderFilter, page, sortBy, sortOrder]);
    useEffect(() => {
        if (isAdmin) {
            loadLeaders();
        }
    }, [isAdmin]);
    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const { data, error, count } = await listPeople({
                q: search || undefined,
                city: cityFilter || undefined,
                state: stateFilter || undefined,
                leaderId: leaderFilter || undefined,
                page,
                pageSize: 20,
                sortBy,
                sortOrder
            });
            if (error)
                throw error;
            setPeople(data || []);
            setTotal(count || 0);
        }
        catch (error) {
            console.error('Erro ao carregar pessoas:', error);
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
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
    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta pessoa?'))
            return;
        try {
            const { error } = await deletePerson(id);
            if (error)
                throw error;
            loadData();
            setDrawerOpen(false); // Fechar drawer após exclusão
        }
        catch (error) {
            console.error('Erro ao excluir pessoa:', error);
            alert('Erro ao excluir pessoa');
        }
    };
    const handleEdit = (person) => {
        // Navegar para a página de edição
        window.location.href = `/pessoas/${person.id}`;
    };
    const handleRowClick = (person) => {
        setSelectedPerson(person);
        setDrawerOpen(true);
    };
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedPerson(null);
        setEditingNotes(null);
        setNotesText('');
    };
    // Função para atualizar status do voto
    const handleStatusChange = async (newStatus) => {
        if (!selectedPerson?.id || updatingStatus)
            return;
        const previousStatus = selectedPerson.vote_status;
        try {
            setUpdatingStatus(true);
            // Update otimista - atualizar estado local imediatamente
            setSelectedPerson(prev => prev ? { ...prev, vote_status: newStatus } : null);
            // Atualizar na lista também
            setPeople(prev => prev.map(person => person.id === selectedPerson.id
                ? { ...person, vote_status: newStatus }
                : person));
            // Salvar no Supabase
            const { error } = await updatePerson(selectedPerson.id, { vote_status: newStatus });
            if (error) {
                throw error;
            }
            // Sucesso - mostrar toast
            setToast({ message: 'Status atualizado com sucesso!', type: 'success' });
        }
        catch (error) {
            console.error('Erro ao atualizar status:', error);
            // Reverter mudanças em caso de erro
            setSelectedPerson(prev => prev ? { ...prev, vote_status: previousStatus } : null);
            setPeople(prev => prev.map(person => person.id === selectedPerson.id
                ? { ...person, vote_status: previousStatus }
                : person));
            setToast({ message: 'Erro ao atualizar status. Tente novamente.', type: 'error' });
        }
        finally {
            setUpdatingStatus(false);
            // Limpar toast após 3 segundos
            setTimeout(() => setToast(null), 3000);
        }
    };
    // Função para gerar timestamp no formato DD/MM/YYYY HH:mm
    const getTimestamp = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };
    // Função para adicionar observação
    const handleAddNote = async () => {
        if (!selectedPerson?.id || !notesText.trim() || updatingNotes)
            return;
        const timestamp = getTimestamp();
        const newNote = `- [${timestamp}] ${notesText.trim()}`;
        const currentNotes = selectedPerson.notes || '';
        const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;
        const previousNotes = selectedPerson.notes;
        try {
            setUpdatingNotes(true);
            // Update otimista
            setSelectedPerson(prev => prev ? { ...prev, notes: updatedNotes } : null);
            setPeople(prev => prev.map(person => person.id === selectedPerson.id
                ? { ...person, notes: updatedNotes }
                : person));
            // Salvar no Supabase
            const { error } = await updatePerson(selectedPerson.id, { notes: updatedNotes });
            if (error) {
                throw error;
            }
            setToast({ message: 'Observação adicionada com sucesso!', type: 'success' });
            setEditingNotes(null);
            setNotesText('');
        }
        catch (error) {
            console.error('Erro ao adicionar observação:', error);
            // Reverter mudanças
            setSelectedPerson(prev => prev ? { ...prev, notes: previousNotes } : null);
            setPeople(prev => prev.map(person => person.id === selectedPerson.id
                ? { ...person, notes: previousNotes }
                : person));
            setToast({ message: 'Erro ao adicionar observação. Tente novamente.', type: 'error' });
        }
        finally {
            setUpdatingNotes(false);
            setTimeout(() => setToast(null), 3000);
        }
    };
    // Função para editar observações completas
    const handleEditNotes = async () => {
        if (!selectedPerson?.id || updatingNotes)
            return;
        const previousNotes = selectedPerson.notes;
        try {
            setUpdatingNotes(true);
            // Update otimista
            setSelectedPerson(prev => prev ? { ...prev, notes: notesText } : null);
            setPeople(prev => prev.map(person => person.id === selectedPerson.id
                ? { ...person, notes: notesText }
                : person));
            // Salvar no Supabase
            const { error } = await updatePerson(selectedPerson.id, { notes: notesText });
            if (error) {
                throw error;
            }
            setToast({ message: 'Observações atualizadas com sucesso!', type: 'success' });
            setEditingNotes(null);
            setNotesText('');
        }
        catch (error) {
            console.error('Erro ao editar observações:', error);
            // Reverter mudanças
            setSelectedPerson(prev => prev ? { ...prev, notes: previousNotes } : null);
            setPeople(prev => prev.map(person => person.id === selectedPerson.id
                ? { ...person, notes: previousNotes }
                : person));
            setToast({ message: 'Erro ao editar observações. Tente novamente.', type: 'error' });
        }
        finally {
            setUpdatingNotes(false);
            setTimeout(() => setToast(null), 3000);
        }
    };
    // Função para cancelar edição
    const handleCancelEdit = () => {
        setEditingNotes(null);
        setNotesText('');
    };
    // Função para iniciar adição de observação
    const handleStartAddNote = () => {
        setEditingNotes('add');
        setNotesText('');
    };
    // Função para iniciar edição completa
    const handleStartEditNotes = () => {
        setEditingNotes('edit');
        setNotesText(selectedPerson?.notes || '');
    };
    // Se houver erro de tabela não existir, mostrar tela de configuração
    if (error && error.includes('does not exist')) {
        return _jsx(DatabaseStatus, { error: error });
    }
    const formatWhatsApp = (whatsapp) => {
        if (!whatsapp)
            return '';
        const digits = whatsapp.replace(/\D/g, '');
        // Formato brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (digits.length === 11) {
            return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
        }
        else if (digits.length === 10) {
            return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
        }
        else if (digits.length === 9) {
            return `${digits.substring(0, 5)}-${digits.substring(5)}`;
        }
        else if (digits.length === 8) {
            return `${digits.substring(0, 4)}-${digits.substring(4)}`;
        }
        return whatsapp;
    };
    const getWhatsAppLink = (whatsapp) => {
        const digits = whatsapp.replace(/\D/g, '');
        return `https://wa.me/55${digits}`;
    };
    const getGoogleMapsLink = (latitude, longitude) => {
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    };
    const copyPhoneNumber = async (phone) => {
        try {
            const digits = phone.replace(/\D/g, '');
            await navigator.clipboard.writeText(digits);
            setToast({ message: 'Número copiado para a área de transferência!', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        }
        catch (error) {
            console.error('Erro ao copiar número:', error);
            setToast({ message: 'Erro ao copiar número', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        }
    };
    const handleSortChange = (newSortBy) => {
        if (sortBy === newSortBy) {
            // Se já está ordenando por este campo, inverte a ordem
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }
        else {
            // Se é um novo campo, define como ascendente
            setSortBy(newSortBy);
            setSortOrder('asc');
        }
        setPage(1); // Volta para a primeira página
    };
    const getSortIcon = (field) => {
        if (sortBy !== field) {
            return _jsx(ArrowUpDown, { className: "h-4 w-4 text-gray-400" });
        }
        return sortOrder === 'asc'
            ? _jsx(ArrowUp, { className: "h-4 w-4 text-blue-600" })
            : _jsx(ArrowDown, { className: "h-4 w-4 text-blue-600" });
    };
    const getVoteStatusColor = (status) => {
        switch (status) {
            case 'CONFIRMADO': return 'bg-green-100 text-green-800';
            case 'PROVAVEL': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getVoteStatusLabel = (status) => {
        switch (status) {
            case 'CONFIRMADO': return 'Confirmado';
            case 'PROVAVEL': return 'Provável';
            default: return 'Indefinido';
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Pessoas" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Gerencie os contatos cadastrados" })] }), _jsxs(Link, { to: "/pessoas/nova", className: "flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Cadastrar Pessoa" })] })] }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" }), _jsx("input", { type: "text", placeholder: "Buscar por nome, cidade ou estado...", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsx("input", { type: "text", placeholder: "Cidade", value: cityFilter, onChange: (e) => setCityFilter(e.target.value), className: "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), _jsx("input", { type: "text", placeholder: "Estado", value: stateFilter, onChange: (e) => setStateFilter(e.target.value), className: "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), isAdmin && (_jsxs("select", { value: leaderFilter, onChange: (e) => setLeaderFilter(e.target.value), className: "border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "", children: "Todos os l\u00EDderes" }), leaders.map(leader => (_jsx("option", { value: leader.id, children: leader.status === 'PENDING' ? `${leader.full_name || 'Sem nome'} (pendente)` : (leader.full_name || 'Sem nome') }, leader.id)))] })), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("label", { className: "text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap", children: "Ordenar por:" }), _jsxs("select", { value: `${sortBy}-${sortOrder}`, onChange: (e) => {
                                                            const [field, order] = e.target.value.split('-');
                                                            setSortBy(field);
                                                            setSortOrder(order);
                                                            setPage(1);
                                                        }, className: "flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm", children: [_jsx("option", { value: "full_name-asc", children: "Nome (A-Z)" }), _jsx("option", { value: "full_name-desc", children: "Nome (Z-A)" }), _jsx("option", { value: "city-asc", children: "Cidade (A-Z)" }), _jsx("option", { value: "city-desc", children: "Cidade (Z-A)" }), _jsx("option", { value: "state-asc", children: "Estado (A-Z)" }), _jsx("option", { value: "state-desc", children: "Estado (Z-A)" }), _jsx("option", { value: "created_at-desc", children: "Mais recentes" }), _jsx("option", { value: "created_at-asc", children: "Mais antigos" })] })] })] }) }), _jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", children: loading ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Carregando..." }) })) : people.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-white", children: "Nenhuma pessoa encontrada" }), _jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Comece cadastrando uma nova pessoa" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden md:block overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-700", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors", onClick: () => handleSortChange('full_name'), children: _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("span", { children: "Nome" }), getSortIcon('full_name')] }) }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "WhatsApp" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors", onClick: () => handleSortChange('city'), children: _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("span", { children: "Localiza\u00E7\u00E3o" }), getSortIcon('city')] }) }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors", onClick: () => handleSortChange('created_at'), children: _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("span", { children: "Contatado" }), getSortIcon('created_at')] }) })] }) }), _jsx("tbody", { className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700", children: people.map((person) => (_jsxs("tr", { className: "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors", onClick: () => handleRowClick(person), children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900 dark:text-white", children: person.full_name }), person.email && (_jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: person.email }))] }) }), _jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Phone, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-sm text-gray-900 dark:text-white font-mono", children: formatWhatsApp(person.whatsapp) }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("button", { onClick: (e) => {
                                                                                                e.stopPropagation();
                                                                                                copyPhoneNumber(person.whatsapp);
                                                                                            }, className: "p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors", title: "Copiar n\u00FAmero", children: _jsx(Copy, { className: "h-3 w-3" }) }), _jsx("a", { href: getWhatsAppLink(person.whatsapp), target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation(), className: "p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors", title: "Abrir WhatsApp", children: _jsx(ExternalLink, { className: "h-3 w-3" }) })] })] }) }), _jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(MapPin, { className: "h-3 w-3 text-gray-400" }), _jsx("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: person.city && person.state
                                                                                        ? `${person.city}, ${person.state}`
                                                                                        : person.city || person.state || '-' })] }) }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoteStatusColor(person.vote_status || 'INDEFINIDO')}`, children: getVoteStatusLabel(person.vote_status || 'INDEFINIDO') }) }), _jsx("td", { className: "px-6 py-4", children: _jsx("div", { className: "text-sm text-gray-900 dark:text-white", children: person.contacted_at
                                                                                ? new Date(person.contacted_at).toLocaleDateString('pt-BR')
                                                                                : '-' }) })] }, person.id))) })] }) }), _jsx("div", { className: "md:hidden space-y-4 p-4", children: people.map((person) => (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors", onClick: () => handleRowClick(person), children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-900 dark:text-white", children: person.full_name }), person.email && (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: person.email }))] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Phone, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-sm text-gray-900 dark:text-white font-mono", children: formatWhatsApp(person.whatsapp) })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    copyPhoneNumber(person.whatsapp);
                                                                                }, className: "p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors", title: "Copiar n\u00FAmero", children: _jsx(Copy, { className: "h-4 w-4" }) }), _jsx("a", { href: getWhatsAppLink(person.whatsapp), target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation(), className: "p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors", title: "Abrir WhatsApp", children: _jsx(ExternalLink, { className: "h-4 w-4" }) })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(MapPin, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: person.city && person.state
                                                                            ? `${person.city}, ${person.state}`
                                                                            : person.city || person.state || '-' })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoteStatusColor(person.vote_status || 'INDEFINIDO')}`, children: getVoteStatusLabel(person.vote_status || 'INDEFINIDO') }), _jsx("span", { className: "text-xs text-gray-500 dark:text-gray-400", children: person.contacted_at
                                                                            ? new Date(person.contacted_at).toLocaleDateString('pt-BR')
                                                                            : 'Não contatado' })] })] }) }, person.id))) })] })) }), total > 20 && (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-sm text-gray-700 dark:text-gray-300", children: ["Mostrando ", ((page - 1) * 20) + 1, " a ", Math.min(page * 20, total), " de ", total, " resultados"] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1, className: "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300", children: "Anterior" }), _jsx("button", { onClick: () => setPage(p => p + 1), disabled: page * 20 >= total, className: "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300", children: "Pr\u00F3ximo" })] })] }))] }) })] }), _jsx(Drawer, { isOpen: drawerOpen, onClose: handleCloseDrawer, title: selectedPerson?.full_name || 'Detalhes do Contato', children: selectedPerson && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("button", { onClick: () => handleEdit(selectedPerson), className: "flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(Edit2, { className: "h-4 w-4" }), _jsx("span", { children: "Editar" })] }), _jsxs("button", { onClick: () => handleDelete(selectedPerson.id), className: "flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors", children: [_jsx(Trash2, { className: "h-4 w-4" }), _jsx("span", { children: "Excluir" })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Nome" }), _jsx("p", { className: "text-gray-900 dark:text-white", children: selectedPerson.full_name })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-2", children: "WhatsApp" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Phone, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white font-mono text-lg", children: formatWhatsApp(selectedPerson.whatsapp) })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsxs("button", { onClick: () => copyPhoneNumber(selectedPerson.whatsapp), className: "flex items-center justify-center space-x-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors", title: "Copiar n\u00FAmero", children: [_jsx(Copy, { className: "h-3 w-3" }), _jsx("span", { children: "Copiar n\u00FAmero" })] }), _jsxs("a", { href: getWhatsAppLink(selectedPerson.whatsapp), target: "_blank", rel: "noopener noreferrer", className: "flex items-center justify-center space-x-1 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors", title: "Abrir WhatsApp", children: [_jsx(ExternalLink, { className: "h-3 w-3" }), _jsx("span", { children: "Abrir WhatsApp" })] })] })] })] }), selectedPerson.email && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Email" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Mail, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: selectedPerson.email })] })] })), (selectedPerson.city || selectedPerson.state) && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Localiza\u00E7\u00E3o" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(MapPin, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: selectedPerson.city && selectedPerson.state
                                                        ? `${selectedPerson.city}, ${selectedPerson.state}`
                                                        : selectedPerson.city || selectedPerson.state || '-' }), selectedPerson.latitude && selectedPerson.longitude && (_jsx("a", { href: getGoogleMapsLink(selectedPerson.latitude, selectedPerson.longitude), target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300", title: "Abrir no Google Maps", children: _jsx(ExternalLink, { className: "h-4 w-4" }) }))] })] })), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-3", children: "Status do Voto" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3", children: [_jsx("button", { onClick: () => handleStatusChange('CONFIRMADO'), disabled: updatingStatus, className: `px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${selectedPerson.vote_status === 'CONFIRMADO'
                                                        ? 'bg-green-600 text-white border-green-600'
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600'} disabled:opacity-50 disabled:cursor-not-allowed`, children: "Confirmado" }), _jsx("button", { onClick: () => handleStatusChange('PROVAVEL'), disabled: updatingStatus, className: `px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${selectedPerson.vote_status === 'PROVAVEL'
                                                        ? 'bg-yellow-600 text-white border-yellow-600'
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-300 dark:hover:border-yellow-600'} disabled:opacity-50 disabled:cursor-not-allowed`, children: "Prov\u00E1vel" }), _jsx("button", { onClick: () => handleStatusChange('INDEFINIDO'), disabled: updatingStatus, className: `px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${selectedPerson.vote_status === 'INDEFINIDO'
                                                        ? 'bg-gray-600 text-white border-gray-600'
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'} disabled:opacity-50 disabled:cursor-not-allowed`, children: "Indefinido" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-xs text-gray-500 dark:text-gray-400", children: "Status atual:" }), _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoteStatusColor(selectedPerson.vote_status || 'INDEFINIDO')}`, children: getVoteStatusLabel(selectedPerson.vote_status || 'INDEFINIDO') })] })] }), selectedPerson.contacted_at && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Data do Contato" }), _jsx("p", { className: "text-gray-900 dark:text-white", children: new Date(selectedPerson.contacted_at).toLocaleDateString('pt-BR') })] })), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-3", children: "Observa\u00E7\u00F5es" }), !editingNotes && (_jsxs("div", { className: "flex flex-col sm:flex-row gap-2 mb-3", children: [_jsx("button", { onClick: handleStartAddNote, className: "px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors", children: "+ Adicionar observa\u00E7\u00E3o" }), _jsx("button", { onClick: handleStartEditNotes, className: "px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors", children: "Editar tudo" })] })), editingNotes && (_jsxs("div", { className: "space-y-3", children: [_jsx("textarea", { value: notesText, onChange: (e) => setNotesText(e.target.value), placeholder: editingNotes === 'add' ? 'Digite a nova observação...' : 'Edite as observações...', rows: 4, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsx("button", { onClick: editingNotes === 'add' ? handleAddNote : handleEditNotes, disabled: updatingNotes || !notesText.trim(), className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: updatingNotes ? 'Salvando...' : 'Salvar' }), _jsx("button", { onClick: handleCancelEdit, disabled: updatingNotes, className: "px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: "Cancelar" })] })] })), selectedPerson.notes && !editingNotes && (_jsx("div", { className: "mt-3", children: _jsx("div", { className: "bg-gray-50 dark:bg-gray-800 rounded-lg p-3", children: _jsx("p", { className: "text-gray-900 dark:text-white whitespace-pre-wrap text-sm", children: selectedPerson.notes }) }) })), !selectedPerson.notes && !editingNotes && (_jsx("div", { className: "text-gray-500 dark:text-gray-400 text-sm italic", children: "Nenhuma observa\u00E7\u00E3o registrada" }))] })] })] })) }), toast && (_jsx("div", { className: "fixed top-4 right-4 z-50", children: _jsx("div", { className: `px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${toast.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`, children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-sm font-medium", children: toast.message }), _jsx("button", { onClick: () => setToast(null), className: "text-current hover:opacity-70 transition-opacity", children: "\u00D7" })] }) }) }))] }));
}
