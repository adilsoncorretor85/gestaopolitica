import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, MapPin, Edit2 } from 'lucide-react';
import { liderancas as initialLiderancas } from '../data/mockData';
import Modal from './Modal';
import FormLideranca from './FormLideranca';
const Liderancas = () => {
    const [liderancas, setLiderancas] = useState(initialLiderancas);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLideranca, setEditingLideranca] = useState(null);
    const filteredLiderancas = liderancas.filter(lideranca => {
        const matchesSearch = lideranca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lideranca.bairro.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || lideranca.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const handleSaveLideranca = (liderancaData) => {
        if (editingLideranca) {
            setLiderancas(liderancas.map(l => l.id === editingLideranca.id
                ? { ...liderancaData, id: editingLideranca.id, dataCadastro: editingLideranca.dataCadastro }
                : l));
        }
        else {
            const newLideranca = {
                ...liderancaData,
                id: Date.now().toString(),
                dataCadastro: new Date().toISOString().split('T')[0],
            };
            setLiderancas([...liderancas, newLideranca]);
        }
        setModalOpen(false);
        setEditingLideranca(null);
    };
    const handleEdit = (lideranca) => {
        setEditingLideranca(lideranca);
        setModalOpen(true);
    };
    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingLideranca(null);
    };
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Lideran\u00E7as" }), _jsx("p", { className: "text-gray-600", children: "Gerencie suas lideran\u00E7as pol\u00EDticas" })] }), _jsxs("button", { onClick: () => setModalOpen(true), className: "flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { children: "Nova Lideran\u00E7a" })] })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" }), _jsx("input", { type: "text", placeholder: "Buscar por nome ou bairro...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Filter, { className: "h-4 w-4 text-gray-400" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "all", children: "Todos os Status" }), _jsx("option", { value: "ativo", children: "Ativos" }), _jsx("option", { value: "inativo", children: "Inativos" })] })] })] }) }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: filteredLiderancas.map((lideranca) => {
                    const progresso = Math.round((lideranca.contatosAtingidos / lideranca.metaContatos) * 100);
                    return (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "bg-blue-100 p-2 rounded-lg", children: _jsx(Users, { className: "h-5 w-5 text-blue-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: lideranca.nome }), _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${lideranca.status === 'ativo'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'}`, children: lideranca.status === 'ativo' ? 'Ativo' : 'Inativo' })] })] }), _jsx("button", { onClick: () => handleEdit(lideranca), className: "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors", children: _jsx(Edit2, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "mt-4 space-y-2", children: [_jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-600", children: [_jsx(Phone, { className: "h-4 w-4" }), _jsx("span", { children: lideranca.telefone })] }), lideranca.email && (_jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-600", children: [_jsx(Mail, { className: "h-4 w-4" }), _jsx("span", { children: lideranca.email })] })), _jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-600", children: [_jsx(MapPin, { className: "h-4 w-4" }), _jsxs("span", { children: [lideranca.bairro, " - Zona ", lideranca.zona] })] })] }), _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-gray-600 mb-2", children: [_jsx("span", { children: "Progresso da Meta" }), _jsxs("span", { children: [lideranca.contatosAtingidos, "/", lideranca.metaContatos, " (", progresso, "%)"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300", style: { width: `${Math.min(progresso, 100)}%` } }) })] }), lideranca.observacoes && (_jsx("div", { className: "mt-4 p-3 bg-gray-50 rounded-lg", children: _jsx("p", { className: "text-sm text-gray-600", children: lideranca.observacoes }) }))] }, lideranca.id));
                }) }), filteredLiderancas.length === 0 && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Users, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "Nenhuma lideran\u00E7a encontrada" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: searchTerm || statusFilter !== 'all'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando uma nova liderança' })] })), _jsx(Modal, { isOpen: modalOpen, onClose: handleCloseModal, title: editingLideranca ? 'Editar Liderança' : 'Nova Liderança', children: _jsx(FormLideranca, { lideranca: editingLideranca, onSave: handleSaveLideranca, onCancel: handleCloseModal }) })] }));
};
export default Liderancas;
