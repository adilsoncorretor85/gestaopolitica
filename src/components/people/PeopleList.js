'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { getPeople } from '@/lib/people';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users } from 'lucide-react';
export default function PeopleList() {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    useEffect(() => {
        loadPeople();
    }, [search]);
    const loadPeople = async () => {
        try {
            setLoading(true);
            const result = await getPeople({ search, page: 1, pageSize: 20 });
            setPeople(result.data);
        }
        catch (error) {
            console.error('Erro ao carregar pessoas:', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsxs("div", { className: "text-center", children: [_jsx(Users, { className: "mx-auto h-12 w-12 text-gray-400 mb-4" }), _jsx("p", { className: "text-gray-500", children: "Carregando pessoas..." })] }) }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" }), _jsx(Input, { placeholder: "Buscar por nome...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10" })] }), _jsxs(Button, { children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Nova Pessoa"] })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200", children: people.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(Users, { className: "mx-auto h-12 w-12 text-gray-400" }), _jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "Nenhuma pessoa encontrada" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: search ? 'Tente ajustar os filtros de busca' : 'Comece adicionando uma nova pessoa' })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Nome" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "WhatsApp" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cidade" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "L\u00EDder" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: people.map((person) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: person.full_name }), person.email && (_jsx("div", { className: "text-sm text-gray-500", children: person.email }))] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm text-gray-900", children: person.whatsapp }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm text-gray-900", children: person.city && person.state
                                                    ? `${person.city}, ${person.state}`
                                                    : person.city || person.state || '-' }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("div", { className: "text-sm text-gray-900", children: person.owner.full_name || 'N/A' }) })] }, person.id))) })] }) })) })] }));
}
