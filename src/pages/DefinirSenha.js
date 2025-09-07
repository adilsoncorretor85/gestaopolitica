import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Vote } from 'lucide-react';
export default function DefinirSenha() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const navigate = useNavigate();
    useEffect(() => {
        // garante que existe sessão (veio do convite)
        supabase?.auth.getUser().then(({ data, error }) => {
            if (!data.user || error) {
                navigate('/login', { replace: true });
            }
            else {
                setUserEmail(data.user.email || '');
            }
        });
    }, [navigate]);
    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        if (!password || password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (password !== confirm) {
            setError('As senhas não conferem.');
            return;
        }
        setLoading(true);
        try {
            // 1) define a senha do usuário autenticado
            const { error: upErr } = await supabase?.auth.updateUser({ password }) || { error: null };
            if (upErr)
                throw upErr;
            // 2) marca o convite como aceito (se sua tabela tiver essas colunas)
            const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
            if (user?.email) {
                await supabase
                    ?.from('invite_tokens')
                    .update({ accepted_at: new Date().toISOString() })
                    .eq('email', user.email)
                    .is('accepted_at', null);
                await supabase
                    ?.from('leader_profiles')
                    .update({ status: 'ACTIVE' })
                    .eq('id', user.id);
            }
            // pronto!
            navigate('/dashboard', { replace: true });
        }
        catch (err) {
            console.error(err);
            setError(err.message ?? 'Falha ao definir senha');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-blue-600 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-white" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Crie sua senha" }), _jsx("p", { className: "text-gray-600", children: "Gest\u00E3o Pol\u00EDtica - Vereador Wilian Tonezi" }), userEmail && (_jsxs("p", { className: "text-sm text-blue-600 mt-2", children: ["Bem-vindo, ", userEmail] }))] }), _jsxs("form", { onSubmit: handleSave, className: "space-y-4", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded", children: error })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nova Senha *" }), _jsx("input", { type: "password", autoFocus: true, placeholder: "M\u00EDnimo 6 caracteres", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", value: password, onChange: (e) => setPassword(e.target.value), minLength: 6, required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Confirmar Senha *" }), _jsx("input", { type: "password", placeholder: "Digite a senha novamente", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", value: confirm, onChange: (e) => setConfirm(e.target.value), minLength: 6, required: true })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: loading ? 'Salvando...' : 'Salvar senha e entrar' })] }), _jsx("div", { className: "mt-6 text-center text-sm text-gray-600", children: _jsx("p", { children: "Ap\u00F3s definir sua senha, voc\u00EA ter\u00E1 acesso completo ao sistema." }) })] }) }));
}
