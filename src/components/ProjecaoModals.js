import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { upsertCityGoalWithUpsert, saveNeighborhoodGoal, listCityGoals } from '@/services/projecoes';
// Lista de UFs brasileiras
const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
export function CityGoalModal({ isOpen, onClose, onSuccess, editData, defaultDeadline, onToast }) {
    const [formData, setFormData] = useState({
        city: '',
        state: '',
        goal: '',
        deadline: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (editData) {
            setFormData({
                city: editData.city,
                state: editData.state,
                goal: editData.goal.toString(),
                deadline: editData.deadline || ''
            });
        }
        else {
            setFormData({
                city: '',
                state: '',
                goal: '',
                deadline: defaultDeadline || ''
            });
        }
    }, [editData, isOpen, defaultDeadline]);
    // Forçar o deadline quando o modal abrir
    useEffect(() => {
        if (isOpen && defaultDeadline && !formData.deadline) {
            setFormData(prev => ({ ...prev, deadline: defaultDeadline }));
        }
    }, [isOpen, defaultDeadline, formData.deadline]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await upsertCityGoalWithUpsert({
                city: formData.city,
                state: formData.state,
                goal: parseInt(formData.goal),
                deadline: formData.deadline || null
            });
            onToast('Meta da cidade salva com sucesso!', 'success');
            onSuccess();
            onClose();
        }
        catch (err) {
            console.error('❌ Erro ao salvar meta da cidade:', err);
            const errorMessage = err.message || 'Erro ao salvar meta da cidade';
            onToast(errorMessage, 'error');
            setError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: editData ? 'Editar Meta da Cidade' : 'Nova Meta da Cidade' }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300", children: _jsx(X, { className: "h-5 w-5" }) })] }), error && (_jsxs("div", { className: "mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md flex items-center space-x-2", children: [_jsx(AlertCircle, { className: "h-4 w-4 text-red-600 dark:text-red-400" }), _jsx("span", { className: "text-sm text-red-600 dark:text-red-400", children: error })] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Cidade *" }), _jsx("input", { type: "text", value: formData.city, onChange: (e) => setFormData({ ...formData, city: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Estado (UF) *" }), _jsxs("select", { value: formData.state, onChange: (e) => setFormData({ ...formData, state: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true, children: [_jsx("option", { value: "", children: "Selecione o estado" }), UFS.map(uf => (_jsx("option", { value: uf, children: uf }, uf)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Meta Total *" }), _jsx("input", { type: "number", value: formData.goal, onChange: (e) => setFormData({ ...formData, goal: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "1", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Prazo" }), _jsx("input", { type: "date", value: formData.deadline, onChange: (e) => setFormData({ ...formData, deadline: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors", children: "Cancelar" }), _jsxs("button", { type: "submit", disabled: loading, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" })) : (_jsx(Save, { className: "h-4 w-4" })), _jsx("span", { children: loading ? 'Salvando...' : 'Salvar' })] })] })] })] }) }));
}
export function NeighborhoodGoalModal({ isOpen, onClose, onSuccess, editData, onToast }) {
    const [formData, setFormData] = useState({
        city: '',
        state: '',
        neighborhood: '',
        goal: ''
    });
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (isOpen) {
            loadCities();
        }
    }, [isOpen]);
    useEffect(() => {
        if (editData) {
            setFormData({
                city: editData.city,
                state: editData.state,
                neighborhood: editData.neighborhood,
                goal: editData.goal.toString()
            });
        }
        else {
            setFormData({
                city: '',
                state: '',
                neighborhood: '',
                goal: ''
            });
        }
    }, [editData, isOpen]);
    const loadCities = async () => {
        try {
            const data = await listCityGoals();
            setCities(data || []);
        }
        catch (err) {
            console.error('Erro ao carregar cidades:', err);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await saveNeighborhoodGoal({
                id: editData?.id, // <- ESSENCIAL para UPDATE
                city: formData.city,
                state: formData.state,
                neighborhood: formData.neighborhood,
                goal: parseInt(formData.goal)
            });
            onToast('Meta do bairro salva com sucesso!', 'success');
            onSuccess();
            onClose();
        }
        catch (err) {
            console.error('❌ Erro ao salvar meta do bairro:', err);
            const errorMessage = err.message || 'Erro ao salvar meta do bairro';
            onToast(errorMessage, 'error');
            setError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: editData ? 'Editar Meta do Bairro' : 'Nova Meta do Bairro' }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300", children: _jsx(X, { className: "h-5 w-5" }) })] }), error && (_jsxs("div", { className: "mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md flex items-center space-x-2", children: [_jsx(AlertCircle, { className: "h-4 w-4 text-red-600 dark:text-red-400" }), _jsx("span", { className: "text-sm text-red-600 dark:text-red-400", children: error })] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Cidade *" }), _jsxs("select", { value: formData.city, onChange: (e) => {
                                        const selectedCity = cities.find(c => c.city === e.target.value);
                                        setFormData({
                                            ...formData,
                                            city: e.target.value,
                                            state: selectedCity?.state || ''
                                        });
                                    }, disabled: !!editData, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed", required: true, children: [_jsx("option", { value: "", children: "Selecione uma cidade" }), cities.map((city, index) => (_jsxs("option", { value: city.city, children: [city.city.toUpperCase(), " - ", city.state.toUpperCase()] }, `${city.city}-${city.state}-${index}`)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Estado (UF) *" }), _jsxs("select", { value: formData.state, onChange: (e) => setFormData({ ...formData, state: e.target.value }), disabled: !!editData, className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed", required: true, children: [_jsx("option", { value: "", children: "Selecione o estado" }), UFS.map(uf => (_jsx("option", { value: uf, children: uf }, uf)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Bairro *" }), _jsx("input", { type: "text", value: formData.neighborhood, onChange: (e) => setFormData({ ...formData, neighborhood: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Meta Total *" }), _jsx("input", { type: "number", value: formData.goal, onChange: (e) => setFormData({ ...formData, goal: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "1", required: true })] }), _jsxs("div", { className: "flex justify-end space-x-3 pt-4", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors", children: "Cancelar" }), _jsxs("button", { type: "submit", disabled: loading, className: "px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2", children: [loading ? (_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" })) : (_jsx(Save, { className: "h-4 w-4" })), _jsx("span", { children: loading ? 'Salvando...' : 'Salvar' })] })] })] })] }) }));
}
