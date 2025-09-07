import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const FormLideranca = ({ lideranca, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        endereco: '',
        bairro: '',
        zona: '',
        secao: '',
        metaContatos: 0,
        contatosAtingidos: 0,
        status: 'ativo',
        observacoes: '',
    });
    useEffect(() => {
        if (lideranca) {
            setFormData({
                nome: lideranca.nome,
                telefone: lideranca.telefone,
                email: lideranca.email || '',
                endereco: lideranca.endereco,
                bairro: lideranca.bairro,
                zona: lideranca.zona,
                secao: lideranca.secao,
                metaContatos: lideranca.metaContatos,
                contatosAtingidos: lideranca.contatosAtingidos,
                status: lideranca.status,
                observacoes: lideranca.observacoes || '',
            });
        }
    }, [lideranca]);
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'metaContatos' || name === 'contatosAtingidos' ? parseInt(value) || 0 : value
        }));
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nome Completo *" }), _jsx("input", { type: "text", name: "nome", value: formData.nome, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Telefone *" }), _jsx("input", { type: "tel", name: "telefone", value: formData.telefone, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", name: "email", value: formData.email, onChange: handleChange, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Status *" }), _jsxs("select", { name: "status", value: formData.status, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "inativo", children: "Inativo" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Endere\u00E7o Completo *" }), _jsx("input", { type: "text", name: "endereco", value: formData.endereco, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Bairro *" }), _jsx("input", { type: "text", name: "bairro", value: formData.bairro, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Zona Eleitoral *" }), _jsx("input", { type: "text", name: "zona", value: formData.zona, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Se\u00E7\u00E3o Eleitoral *" }), _jsx("input", { type: "text", name: "secao", value: formData.secao, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Meta de Contatos *" }), _jsx("input", { type: "number", name: "metaContatos", value: formData.metaContatos, onChange: handleChange, min: "0", required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Contatos Atingidos" }), _jsx("input", { type: "number", name: "contatosAtingidos", value: formData.contatosAtingidos, onChange: handleChange, min: "0", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { name: "observacoes", value: formData.observacoes, onChange: handleChange, rows: 3, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Informa\u00E7\u00F5es adicionais sobre a lideran\u00E7a..." })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors", children: "Cancelar" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: lideranca ? 'Salvar Alterações' : 'Cadastrar Liderança' })] })] }));
};
export default FormLideranca;
