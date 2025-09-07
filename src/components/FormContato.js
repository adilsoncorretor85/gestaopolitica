import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const FormContato = ({ contato, liderancas, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        endereco: '',
        bairro: '',
        zona: '',
        secao: '',
        liderancaId: '',
        compromissoVoto: 'incerto',
        observacoes: '',
    });
    useEffect(() => {
        if (contato) {
            setFormData({
                nome: contato.nome,
                telefone: contato.telefone,
                email: contato.email || '',
                endereco: contato.endereco,
                bairro: contato.bairro,
                zona: contato.zona,
                secao: contato.secao,
                liderancaId: contato.liderancaId,
                compromissoVoto: contato.compromissoVoto,
                observacoes: contato.observacoes || '',
            });
        }
    }, [contato]);
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nome Completo *" }), _jsx("input", { type: "text", name: "nome", value: formData.nome, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Telefone *" }), _jsx("input", { type: "tel", name: "telefone", value: formData.telefone, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", name: "email", value: formData.email, onChange: handleChange, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Lideran\u00E7a Respons\u00E1vel *" }), _jsxs("select", { name: "liderancaId", value: formData.liderancaId, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "", children: "Selecione uma lideran\u00E7a" }), liderancas.map(lideranca => (_jsxs("option", { value: lideranca.id, children: [lideranca.nome, " - ", lideranca.bairro] }, lideranca.id)))] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Endere\u00E7o Completo *" }), _jsx("input", { type: "text", name: "endereco", value: formData.endereco, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Bairro *" }), _jsx("input", { type: "text", name: "bairro", value: formData.bairro, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Zona Eleitoral *" }), _jsx("input", { type: "text", name: "zona", value: formData.zona, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Se\u00E7\u00E3o Eleitoral *" }), _jsx("input", { type: "text", name: "secao", value: formData.secao, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Compromisso de Voto *" }), _jsxs("select", { name: "compromissoVoto", value: formData.compromissoVoto, onChange: handleChange, required: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsx("option", { value: "confirmado", children: "Confirmado" }), _jsx("option", { value: "provavel", children: "Prov\u00E1vel" }), _jsx("option", { value: "incerto", children: "Incerto" }), _jsx("option", { value: "contrario", children: "Contr\u00E1rio" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { name: "observacoes", value: formData.observacoes, onChange: handleChange, rows: 3, className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Informa\u00E7\u00F5es adicionais sobre o contato..." })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors", children: "Cancelar" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors", children: contato ? 'Salvar Alterações' : 'Cadastrar Contato' })] })] }));
};
export default FormContato;
