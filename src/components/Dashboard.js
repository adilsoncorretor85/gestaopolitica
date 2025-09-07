import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Users, UserCheck, Target, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { liderancas, contatos } from '../data/mockData';
const Dashboard = () => {
    const metricas = {
        title: 'Dashboard',
        value: 0,
        change: 0,
        changeType: 'increase',
        totalLiderancas: liderancas.length,
        liderancasAtivas: liderancas.filter(l => l.status === 'ativo').length,
        totalContatos: contatos.length,
        votosConfirmados: contatos.filter(c => c.compromissoVoto === 'confirmado').length,
        votosProvaveis: contatos.filter(c => c.compromissoVoto === 'provavel').length,
        metaTotalContatos: liderancas.reduce((total, l) => total + l.metaContatos, 0),
    };
    const progressoMeta = Math.round((metricas.totalContatos / metricas.metaTotalContatos) * 100);
    const estatisticasCards = [
        {
            titulo: 'Total de Lideranças',
            valor: metricas.totalLiderancas,
            icon: Users,
            cor: 'bg-blue-500',
            descricao: `${metricas.liderancasAtivas} ativas`
        },
        {
            titulo: 'Total de Contatos',
            valor: metricas.totalContatos,
            icon: UserCheck,
            cor: 'bg-green-500',
            descricao: `Meta: ${metricas.metaTotalContatos}`
        },
        {
            titulo: 'Votos Confirmados',
            valor: metricas.votosConfirmados,
            icon: Target,
            cor: 'bg-emerald-500',
            descricao: `${metricas.votosProvaveis} prováveis`
        },
        {
            titulo: 'Progresso da Meta',
            valor: `${progressoMeta}%`,
            icon: TrendingUp,
            cor: 'bg-purple-500',
            descricao: `${metricas.totalContatos}/${metricas.metaTotalContatos}`
        }
    ];
    const liderancasTop = liderancas
        .sort((a, b) => b.contatosAtingidos - a.contatosAtingidos)
        .slice(0, 5);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Dashboard" }), _jsx("p", { className: "text-gray-600", children: "Vis\u00E3o geral da campanha pol\u00EDtica" })] }), _jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-500", children: [_jsx(Calendar, { className: "h-4 w-4" }), _jsx("span", { children: "\u00DAltima atualiza\u00E7\u00E3o: hoje" })] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: estatisticasCards.map((card, index) => {
                    const Icon = card.icon;
                    return (_jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: card.titulo }), _jsx("p", { className: "text-2xl font-bold text-gray-900 mt-1", children: card.valor }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: card.descricao })] }), _jsx("div", { className: `p-3 rounded-lg ${card.cor}`, children: _jsx(Icon, { className: "h-6 w-6 text-white" }) })] }) }, index));
                }) }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Progresso da Meta de Contatos" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between text-sm text-gray-600", children: [_jsx("span", { children: "Contatos Realizados" }), _jsxs("span", { children: [metricas.totalContatos, " / ", metricas.metaTotalContatos] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-3", children: _jsx("div", { className: "bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-700", style: { width: `${Math.min(progressoMeta, 100)}%` } }) }), _jsxs("div", { className: "flex justify-between text-xs text-gray-500", children: [_jsx("span", { children: "0%" }), _jsxs("span", { className: "font-medium", children: [progressoMeta, "%"] }), _jsx("span", { children: "100%" })] })] })] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Top 5 Lideran\u00E7as" }), _jsx("div", { className: "space-y-4", children: liderancasTop.map((lideranca, index) => {
                            const progresso = Math.round((lideranca.contatosAtingidos / lideranca.metaContatos) * 100);
                            return (_jsxs("div", { className: "flex items-center space-x-4 p-4 bg-gray-50 rounded-lg", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("div", { className: "w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center", children: _jsxs("span", { className: "text-sm font-medium text-blue-600", children: ["#", index + 1] }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: lideranca.nome }), _jsxs("div", { className: "flex items-center space-x-2 mt-1", children: [_jsx(MapPin, { className: "h-3 w-3 text-gray-400" }), _jsx("p", { className: "text-xs text-gray-500", children: lideranca.bairro })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-sm font-medium text-gray-900", children: [lideranca.contatosAtingidos, "/", lideranca.metaContatos] }), _jsxs("p", { className: "text-xs text-gray-500", children: [progresso, "% da meta"] })] })] }, lideranca.id));
                        }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Distribui\u00E7\u00E3o de Votos" }), _jsx("div", { className: "space-y-3", children: [
                                    { label: 'Confirmados', valor: metricas.votosConfirmados, cor: 'bg-green-500' },
                                    { label: 'Prováveis', valor: metricas.votosProvaveis, cor: 'bg-yellow-500' },
                                    { label: 'Incertos', valor: contatos.filter(c => c.compromissoVoto === 'incerto').length, cor: 'bg-orange-500' },
                                    { label: 'Contrários', valor: contatos.filter(c => c.compromissoVoto === 'contrario').length, cor: 'bg-red-500' },
                                ].map((item, index) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${item.cor}` }), _jsx("span", { className: "text-sm text-gray-700", children: item.label })] }), _jsx("span", { className: "text-sm font-medium text-gray-900", children: item.valor })] }, index))) })] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Resumo por Zona" }), _jsx("div", { className: "space-y-3", children: Array.from(new Set(contatos.map(c => c.zona))).map((zona) => {
                                    const contatosZona = contatos.filter(c => c.zona === zona);
                                    const confirmadosZona = contatosZona.filter(c => c.compromissoVoto === 'confirmado').length;
                                    return (_jsxs("div", { className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-gray-900", children: ["Zona ", zona] }), _jsxs("p", { className: "text-xs text-gray-500", children: [contatosZona.length, " contatos"] })] }), _jsx("div", { className: "text-right", children: _jsxs("p", { className: "text-sm font-medium text-green-600", children: [confirmadosZona, " confirmados"] }) })] }, zona));
                                }) })] })] })] }));
};
export default Dashboard;
