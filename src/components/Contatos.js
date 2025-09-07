import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Vote, Plus, Search, Filter, Phone, Mail, MapPin, User, Edit2, Users } from 'lucide-react';
import { contatos as initialContatos, liderancas } from '../data/mockData';
import Modal from './Modal';
import FormContato from './FormContato';
const Contatos = () => {
    const [contatos, setContatos] = useState(initialContatos);
    const [searchTerm, setSearchTerm] = useState('');
    const [compromissoFilter, setCompromissoFilter] = useState('all');
    const [liderancaFilter, setLiderancaFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingContato, setEditingContato] = useState(null);
    const filteredContatos = contatos.filter(contato => {
        const matchesSearch = contato.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contato.bairro.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contato.liderancaNome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompromisso = compromissoFilter === 'all' || contato.compromissoVoto === compromissoFilter;
        const matchesLideranca = liderancaFilter === 'all' || contato.liderancaId === liderancaFilter;
        return matchesSearch && matchesCompromisso && matchesLideranca;
    });
    const handleSaveContato = (contatoData) => {
        const lideranca = liderancas.find(l => l.id === contatoData.liderancaId);
        const contatoCompleto = {
            ...contatoData,
            liderancaNome: lideranca?.nome || '',
        };
        if (editingContato) {
            setContatos(contatos.map(c => c.id === editingContato.id
                ? { ...contatoCompleto, id: editingContato.id, dataCadastro: editingContato.dataCadastro }
                : c));
        }
        else {
            const newContato = {
                ...contatoCompleto,
                id: Date.now().toString(),
                dataCadastro: new Date().toISOString().split('T')[0],
            };
            setContatos([...contatos, newContato]);
        }
        setModalOpen(false);
        setEditingContato(null);
    };
    const handleEdit = (contato) => {
        setEditingContato(contato);
        setModalOpen(true);
    };
    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingContato(null);
    };
    const getCompromissoColor = (compromisso) => {
        switch (compromisso) {
            case 'confirmado': return 'bg-green-100 text-green-800';
            case 'provavel': return 'bg-yellow-100 text-yellow-800';
            case 'incerto': return 'bg-orange-100 text-orange-800';
            case 'contrario': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getCompromissoLabel = (compromisso) => {
        switch (compromisso) {
            case 'confirmado': return 'Confirmado';
            case 'provavel': return 'Provável';
            case 'incerto': return 'Incerto';
            case 'contrario': return 'Contrário';
            default: return 'N/A';
        }
    };
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Contatos" }), _jsx("p", { className: "text-gray-600", children: "Gerencie os contatos das suas lideran\u00E7as" })] }), _jsxs("button", { onClick: () => setModalOpen(true), className: "flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Novo Contato" })] })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
                    { label: 'Total', valor: contatos.length, cor: 'bg-blue-500' },
                    { label: 'Confirmados', valor: contatos.filter(c => c.compromissoVoto === 'confirmado').length, cor: 'bg-green-500' },
                    { label: 'Prováveis', valor: contatos.filter(c => c.compromissoVoto === 'provavel').length, cor: 'bg-yellow-500' },
                    { label: 'Incertos', valor: contatos.filter(c => c.compromissoVoto === 'incerto').length, cor: 'bg-orange-500' },
                ].map((stat, index) => (_jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: `p-2 rounded-lg ${stat.cor}`, children: _jsx(Vote, { className: "h-4 w-4 text-white" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: stat.label }), _jsx("p", { className: "text-lg font-semibold text-gray-900", children: stat.valor })] })] }) }, index))) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" }), _jsx("input", { type: "text", placeholder: "Buscar por nome, bairro ou lideran\u00E7a...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Filter, { className: "h-4 w-4 text-gray-400" }), _jsxs("select", { value: compromissoFilter, onChange: (e) => setCompromissoFilter(e.target.value), className: "flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "all", children: "Todos os Compromissos" }), _jsx("option", { value: "confirmado", children: "Confirmados" }), _jsx("option", { value: "provavel", children: "Prov\u00E1veis" }), _jsx("option", { value: "incerto", children: "Incertos" }), _jsx("option", { value: "contrario", children: "Contr\u00E1rios" })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Users, { className: "h-4 w-4 text-gray-400" }), _jsxs("select", { value: liderancaFilter, onChange: (e) => setLiderancaFilter(e.target.value), className: "flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "all", children: "Todas as Lideran\u00E7as" }), liderancas.map(lideranca => (_jsx("option", { value: lideranca.id, children: lideranca.nome }, lideranca.id)))] })] })] }) }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Contato" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Lideran\u00E7a" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Localiza\u00E7\u00E3o" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Compromisso" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: filteredContatos.map((contato) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4", children: _jsx("div", { children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "bg-gray-100 p-2 rounded-lg", children: _jsx(User, { className: "h-4 w-4 text-gray-600" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-900", children: contato.nome }), _jsxs("div", { className: "flex items-center space-x-4 mt-1", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Phone, { className: "h-3 w-3 text-gray-400" }), _jsx("span", { className: "text-xs text-gray-500", children: contato.telefone })] }), contato.email && (_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Mail, { className: "h-3 w-3 text-gray-400" }), _jsx("span", { className: "text-xs text-gray-500", children: contato.email })] }))] })] })] }) }) }), _jsx("td", { className: "px-6 py-4", children: _jsx("p", { className: "text-sm text-gray-900", children: contato.liderancaNome }) }), _jsxs("td", { className: "px-6 py-4", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(MapPin, { className: "h-3 w-3 text-gray-400" }), _jsx("span", { className: "text-sm text-gray-500", children: contato.bairro })] }), _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: ["Zona ", contato.zona, " - Se\u00E7\u00E3o ", contato.secao] })] }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCompromissoColor(contato.compromissoVoto)}`, children: getCompromissoLabel(contato.compromissoVoto) }) }), _jsx("td", { className: "px-6 py-4 text-right", children: _jsx("button", { onClick: () => handleEdit(contato), className: "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors", children: _jsx(Edit2, { className: "h-4 w-4" }) }) })] }, contato.id))) })] }) }), filteredContatos.length === 0 && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Vote, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "Nenhum contato encontrado" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: searchTerm || compromissoFilter !== 'all' || liderancaFilter !== 'all'
                                    ? 'Tente ajustar os filtros de busca'
                                    : 'Comece adicionando um novo contato' })] }))] }), _jsx(Modal, { isOpen: modalOpen, onClose: handleCloseModal, title: editingContato ? 'Editar Contato' : 'Novo Contato', children: _jsx(FormContato, { contato: editingContato, liderancas: liderancas, onSave: handleSaveContato, onCancel: handleCloseModal }) })] }));
};
export default Contatos;
