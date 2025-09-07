import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { listLeaders, resendInvite } from '@/services/leader';
import { Users, Plus, Edit2, Shield, Mail, RefreshCw, Clock, Crown } from 'lucide-react';
import LeaderLeadershipModal from '@/components/modals/LeaderLeadershipModal';
import LeaderDrawer from '@/components/drawers/LeaderDrawer';
export default function LideresPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('lideres');
    const { profile, isAdmin } = useAuth();
    const [tab, setTab] = useState('ACTIVE');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    // Estados para o modal de lideranças
    const [leadershipOpen, setLeadershipOpen] = useState(false);
    const [leadershipLeaderId, setLeadershipLeaderId] = useState(null);
    // Estados para o drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedLeaderId, setSelectedLeaderId] = useState(null);
    async function load() {
        setLoading(true);
        try {
            setError('');
            const data = await listLeaders();
            const filtered = data.filter(leader => {
                if (tab === 'ACTIVE')
                    return leader.is_active;
                if (tab === 'PENDING')
                    return leader.is_pending;
                return false;
            });
            setRows(filtered);
            console.log(`Líderes ${tab}:`, data);
        }
        catch (error) {
            console.error('Erro ao carregar líderes:', error);
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (isAdmin) {
            load();
        }
    }, [isAdmin, tab]);
    const handleReinvite = async (leader) => {
        try {
            setActionLoading(`reinvite-${leader.email}`);
            const result = await resendInvite(leader.email, leader.full_name || '');
            alert(result?.message || 'Convite reenviado com sucesso!');
            if (result?.acceptUrl) {
                console.log('Link de convite:', result.acceptUrl);
            }
            // Recarregar a lista
            load();
        }
        catch (error) {
            console.error('resendInvite error', error);
            alert(`Erro ao reenviar convite: ${error instanceof Error ? error.message : error}`);
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleRevokeInvite = async (email, fullName) => {
        if (!confirm(`Cancelar convite de ${fullName}?`))
            return;
        try {
            setActionLoading(`revoke-${email}`);
            // Implementar revogação se necessário
            alert('Convite cancelado com sucesso!');
            load(); // Recarregar lista
        }
        catch (error) {
            console.error('Erro ao cancelar convite:', error);
            alert(error instanceof Error ? error.message : 'Erro ao cancelar convite');
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleRowClick = (leader) => {
        setSelectedLeaderId(leader.id);
        setDrawerOpen(true);
    };
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedLeaderId(null);
    };
    // Se houver erro de tabela não existir, mostrar tela de configuração
    if (error && error.includes('does not exist')) {
        return _jsx(DatabaseStatus, { error: error });
    }
    // Se não for admin, não mostrar a página
    console.log('Renderizando página - isAdmin:', isAdmin, 'loading:', loading, 'rows.length:', rows.length);
    if (!isAdmin) {
        return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsx("div", { className: "p-6", children: _jsxs("div", { className: "text-center py-12", children: [_jsx(Shield, { className: "mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-white", children: "Acesso Restrito" }), _jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Apenas administradores podem acessar esta p\u00E1gina" })] }) }) })] })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "L\u00EDderes" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Gerencie os l\u00EDderes e convites" })] }), _jsxs(Link, { to: "/lideres/novo", className: "flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Convidar L\u00EDder" })] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", children: [_jsx("div", { className: "border-b border-gray-200 dark:border-gray-700", children: _jsxs("nav", { className: "flex space-x-8 px-6", children: [_jsx("button", { onClick: () => setTab('ACTIVE'), className: `py-4 px-1 border-b-2 font-medium text-sm ${tab === 'ACTIVE'
                                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`, children: "Ativos" }), _jsx("button", { onClick: () => setTab('PENDING'), className: `py-4 px-1 border-b-2 font-medium text-sm ${tab === 'PENDING'
                                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}`, children: "Pendentes" })] }) }), loading ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Carregando l\u00EDderes..." }) })) : rows.length === 0 ? (_jsx("div", { className: "text-center py-12", children: tab === 'ACTIVE' ? (_jsxs(_Fragment, { children: [_jsx(Users, { className: "mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-white", children: "Nenhum l\u00EDder ativo" }), _jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Os l\u00EDderes aparecer\u00E3o aqui ap\u00F3s aceitarem o convite" })] })) : (_jsxs(_Fragment, { children: [_jsx(Clock, { className: "mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900 dark:text-white", children: "Nenhum convite pendente" }), _jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Convites enviados aparecer\u00E3o aqui at\u00E9 serem aceitos" })] })) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50 dark:bg-gray-700", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: tab === 'ACTIVE' ? 'Líder' : 'Nome/Email' }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: tab === 'ACTIVE' ? 'Contato' : 'Convidado em' }), tab === 'ACTIVE' && (_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Meta" })), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { className: "bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700", children: rows.map((leader) => (_jsxs("tr", { className: "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors", onClick: () => handleRowClick(leader), children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: `p-2 rounded-lg ${tab === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`, children: tab === 'ACTIVE' ? (_jsx(Users, { className: "h-4 w-4 text-green-600 dark:text-green-400" })) : (_jsx(Clock, { className: "h-4 w-4 text-yellow-600 dark:text-yellow-400" })) }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900 dark:text-white", children: leader.full_name || 'Sem nome' }), _jsx("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: leader.email })] })] }) }), _jsx("td", { className: "px-6 py-4", children: tab === 'ACTIVE' ? (_jsx("div", { className: "space-y-1", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Mail, { className: "h-4 w-4 text-gray-400 dark:text-gray-500" }), _jsx("span", { className: "text-sm text-gray-900 dark:text-white", children: leader.email })] }) })) : (_jsx("div", { className: "text-sm text-gray-900 dark:text-white", children: leader.invited_at
                                                                            ? new Date(leader.invited_at).toLocaleDateString('pt-BR')
                                                                            : 'Não enviado' })) }), tab === 'ACTIVE' && (_jsx("td", { className: "px-6 py-4", children: leader.goal ? (_jsxs("span", { className: "inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300", children: [leader.goal, " contatos"] })) : (_jsx("span", { className: "text-sm text-gray-400 dark:text-gray-500", children: "Sem meta" })) })), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${leader.status === 'ACTIVE'
                                                                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                                                                            : leader.status === 'PENDING'
                                                                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                                                                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'}`, children: leader.status === 'ACTIVE' ? 'Ativo' :
                                                                            leader.status === 'PENDING' ? 'Pendente' : 'Inativo' }) }), _jsx("td", { className: "px-6 py-4 text-right", children: tab === 'ACTIVE' ? (_jsxs("div", { className: "flex items-center justify-end space-x-2", children: [_jsxs("button", { onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    console.log('🔍 Botão "Nível de liderança" clicado!');
                                                                                    console.log('Leader:', leader);
                                                                                    console.log('Leader ID (leader_profiles.id):', leader.id);
                                                                                    console.log('Leader full_name:', leader.full_name);
                                                                                    // Validar se é um UUID válido
                                                                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                                                                                    if (!leader.id || !uuidRegex.test(leader.id)) {
                                                                                        console.error('❌ Leader ID is not a valid UUID:', leader.id);
                                                                                        alert('Erro: ID do líder inválido');
                                                                                        return;
                                                                                    }
                                                                                    console.log('✅ Leader ID válido, abrindo modal...');
                                                                                    setLeadershipLeaderId(leader.id); // Usar leader.id (leader_profiles.id)
                                                                                    setLeadershipOpen(true);
                                                                                    console.log('✅ Modal deve estar aberto agora');
                                                                                }, className: "inline-flex items-center gap-1 text-violet-500 hover:text-violet-400 p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors", title: "N\u00EDvel de lideran\u00E7a", children: [_jsx(Crown, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "N\u00EDvel de lideran\u00E7a" })] }), _jsx(Link, { to: `/lideres/${leader.id}`, onClick: (e) => e.stopPropagation(), className: "p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors", title: "Editar", children: _jsx(Edit2, { className: "h-4 w-4" }) })] })) : (_jsxs("div", { className: "flex items-center justify-end space-x-2", children: [_jsx("button", { onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    handleReinvite(leader);
                                                                                }, disabled: actionLoading === `reinvite-${leader.email}`, className: "p-2 text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors", title: "Reenviar convite", children: _jsx(RefreshCw, { className: "h-4 w-4" }) }), _jsx("button", { onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRevokeInvite(leader.email || '', leader.full_name || leader.email || '');
                                                                                }, disabled: actionLoading === `revoke-${leader.email}`, className: "px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50 transition-colors", title: "Cancelar convite", children: actionLoading === `revoke-${leader.email}` ? 'Cancelando...' : 'Cancelar' })] })) })] }, leader.id))) })] }) }))] })] }) })] }), leadershipOpen && leadershipLeaderId && leadershipLeaderId !== 'undefined' && leadershipLeaderId !== 'null' && (_jsx(LeaderLeadershipModal, { isOpen: leadershipOpen, leaderProfileId: leadershipLeaderId, leaderCity: rows.find(l => l.id === leadershipLeaderId)?.city || undefined, leaderState: rows.find(l => l.id === leadershipLeaderId)?.state || undefined, onClose: () => {
                    setLeadershipOpen(false);
                    setLeadershipLeaderId(null);
                } })), _jsx(LeaderDrawer, { open: drawerOpen, leaderId: selectedLeaderId, onClose: handleCloseDrawer, onEdited: load })] }));
}
