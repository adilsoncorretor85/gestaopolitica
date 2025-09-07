import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { getLeaderCounters, getGoalSummary } from '@/lib/dashboard';
import { listPeople } from '@/services/people';
import { getElectionSettings, formatCountdown } from '@/services/election';
import { Users, UserCheck, Target, TrendingUp, Calendar, Settings } from 'lucide-react';
// Função para formatar números com separadores de milhares
const formatNumber = (num) => {
    if (typeof num === 'string')
        return num;
    return num.toLocaleString('pt-BR');
};
export default function DashboardPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const { profile, isAdmin: isAdminUser } = useAuth();
    const [stats, setStats] = useState({
        activeLeaders: 0,
        pendingLeaders: 0,
        totalPeople: 0,
        confirmedVotes: 0,
        probableVotes: 0,
        effectiveTotalGoal: 120
    });
    const [goalSummary, setGoalSummary] = useState(null);
    const [topLeaders, setTopLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Estados para eleição
    const [countdownText, setCountdownText] = useState("");
    const [electionLabel, setElectionLabel] = useState("");
    useEffect(() => {
        loadStats();
        loadElectionSettings();
    }, []);
    const loadElectionSettings = async () => {
        try {
            const settings = await getElectionSettings();
            if (settings?.election_date) {
                const countdown = formatCountdown(settings.election_date);
                setCountdownText(countdown.text);
                setElectionLabel(`${settings.election_name} • ${new Date(settings.election_date).toLocaleDateString("pt-BR")}`);
            }
        }
        catch (error) {
            console.error('Erro ao carregar configurações de eleição:', error);
        }
    };
    const loadStats = async () => {
        try {
            setLoading(true);
            setError('');
            // Carregar contadores de líderes e metas
            const [leaderCounters, goalData] = await Promise.all([
                getLeaderCounters(),
                getGoalSummary()
            ]);
            // Carregar pessoas
            const peopleResult = await listPeople({
                page: 1,
                pageSize: 1000 // Para contar todos
            });
            const people = peopleResult.data || [];
            const confirmedVotes = people.filter(p => p.vote_status === 'CONFIRMADO').length;
            const probableVotes = people.filter(p => p.vote_status === 'PROVAVEL').length;
            setStats({
                activeLeaders: leaderCounters.active,
                pendingLeaders: leaderCounters.pending,
                totalPeople: people.length,
                confirmedVotes,
                probableVotes,
                effectiveTotalGoal: goalData.effective_total_goal
            });
            setGoalSummary(goalData);
            // Top líderes por número de pessoas cadastradas (apenas para admin)
            if (isAdminUser) {
                // TODO: Implementar top líderes quando necessário
                setTopLeaders([]);
            }
        }
        catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            setError(error instanceof Error ? error.message : 'Erro desconhecido');
        }
        finally {
            setLoading(false);
        }
    };
    // Se houver erro de tabela não existir, mostrar tela de configuração
    if (error && error.includes('does not exist')) {
        return _jsx(DatabaseStatus, { error: error });
    }
    const progressoMeta = Math.round((stats.totalPeople / stats.effectiveTotalGoal) * 100);
    const estatisticasCards = [
        // Mostrar card de lideranças apenas para ADMIN
        ...(isAdminUser ? [{
                titulo: 'Total de Lideranças',
                valor: stats.activeLeaders,
                icon: Users,
                cor: 'bg-blue-500',
                descricao: `${stats.pendingLeaders} pendentes`
            }] : []),
        {
            titulo: 'Total de Contatos',
            valor: stats.totalPeople,
            icon: UserCheck,
            cor: 'bg-green-500',
            descricao: `Meta: ${stats.effectiveTotalGoal}`
        },
        {
            titulo: 'Votos Confirmados',
            valor: stats.confirmedVotes,
            icon: Target,
            cor: 'bg-emerald-500',
            descricao: `${stats.probableVotes} prováveis`
        },
        // Card de Meta Geral (apenas para ADMIN)
        ...(isAdminUser && goalSummary ? [{
                titulo: 'Meta Geral',
                valor: goalSummary.effective_total_goal,
                icon: Settings,
                cor: 'bg-purple-500',
                descricao: `Líderes: ${goalSummary.total_leaders_goal}`,
                editable: true
            }] : []),
        {
            titulo: 'Progresso da Meta',
            valor: `${progressoMeta}%`,
            icon: TrendingUp,
            cor: 'bg-purple-500',
            descricao: `${stats.totalPeople}/${stats.effectiveTotalGoal}`
        },
        // Card de contagem regressiva
        {
            titulo: 'Contagem regressiva',
            valor: countdownText || "—",
            icon: Calendar,
            cor: 'bg-orange-500',
            descricao: countdownText.includes("Hoje") ? "É hoje!" : "para a eleição",
            extraInfo: electionLabel
        }
    ];
    if (loading) {
        return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsx("div", { className: "p-6 flex items-center justify-center", children: _jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Carregando estat\u00EDsticas..." }) }) })] })] }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900", children: [_jsx(Header, { profile: profile, sidebarOpen: sidebarOpen, setSidebarOpen: setSidebarOpen }), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, { activeTab: activeTab, setActiveTab: setActiveTab, isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: "flex-1 overflow-x-hidden", children: _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Dashboard" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Vis\u00E3o geral da campanha pol\u00EDtica" })] }), _jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400", children: [_jsx(Calendar, { className: "h-4 w-4" }), _jsx("span", { children: "\u00DAltima atualiza\u00E7\u00E3o: hoje" })] })] }), _jsx("div", { className: `grid grid-cols-1 md:grid-cols-2 gap-6 ${isAdminUser ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`, children: estatisticasCards.map((card, index) => {
                                        const Icon = card.icon;
                                        return (_jsx("div", { className: "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: card.titulo }), _jsx("p", { className: "text-2xl font-bold text-gray-900 dark:text-white mt-1", children: formatNumber(card.valor) }), _jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1", children: card.descricao }), card.extraInfo && (_jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: card.extraInfo }))] }), _jsx("div", { className: `p-3 rounded-lg ${card.cor}`, children: _jsx(Icon, { className: "h-6 w-6 text-white" }) })] }) }, index));
                                    }) }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Progresso da Meta de Contatos" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-600 dark:text-gray-400", children: [_jsx("span", { children: "Contatos Realizados" }), _jsxs("span", { children: [formatNumber(stats.totalPeople), " / ", formatNumber(stats.effectiveTotalGoal)] })] }), _jsx("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3", children: _jsx("div", { className: "bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-700", style: { width: `${Math.min(progressoMeta, 100)}%` } }) }), _jsxs("div", { className: "flex justify-between text-xs text-gray-500 dark:text-gray-400", children: [_jsx("span", { children: "0%" }), _jsxs("span", { className: "font-medium", children: [progressoMeta, "%"] }), _jsx("span", { children: "100%" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [isAdminUser && topLeaders.length > 0 && (_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Top 5 Lideran\u00E7as" }), _jsx("div", { className: "space-y-4", children: topLeaders.map((leader, index) => (_jsxs("div", { className: "flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("div", { className: "w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center", children: _jsxs("span", { className: "text-sm font-medium text-blue-600 dark:text-blue-400", children: ["#", index + 1] }) }) }), _jsx("div", { className: "flex-1 min-w-0", children: _jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white truncate", children: leader.leader_name }) }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: [formatNumber(leader.total_people), " contatos"] }), _jsxs("p", { className: "text-xs text-green-600 dark:text-green-400", children: [formatNumber(leader.confirmed_votes), " confirmados"] })] })] }, leader.leader_id))) })] })), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Distribui\u00E7\u00E3o de Votos" }), _jsx("div", { className: "space-y-3", children: [
                                                        { label: 'Confirmados', valor: stats.confirmedVotes, cor: 'bg-green-500' },
                                                        { label: 'Prováveis', valor: stats.probableVotes, cor: 'bg-yellow-500' },
                                                        { label: 'Indefinidos', valor: stats.totalPeople - stats.confirmedVotes - stats.probableVotes, cor: 'bg-gray-500' },
                                                    ].map((item, index) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${item.cor}` }), _jsx("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: item.label })] }), _jsx("span", { className: "text-sm font-medium text-gray-900 dark:text-white", children: formatNumber(item.valor) })] }, index))) })] })] })] }) })] })] }));
}
