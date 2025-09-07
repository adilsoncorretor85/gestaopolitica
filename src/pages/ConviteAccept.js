import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getInviteToken, acceptInvite } from '@/services/invite';
import { supabase } from '@/lib/supabaseClient';
import { Vote, Loader2, CheckCircle, XCircle } from 'lucide-react';
const acceptInviteSchema = z.object({
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
});
export default function ConviteAcceptPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [inviteData, setInviteData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(acceptInviteSchema)
    });
    useEffect(() => {
        if (token) {
            loadInviteData();
        }
    }, [token]);
    const loadInviteData = async () => {
        if (!token)
            return;
        try {
            setLoading(true);
            setError('');
            const data = await getInviteToken(token);
            setInviteData(data);
        }
        catch (error) {
            console.error('Erro ao carregar convite:', error);
            setError('Convite inválido ou expirado');
        }
        finally {
            setLoading(false);
        }
    };
    const onSubmit = async (_data) => {
        if (!token)
            return;
        try {
            setAccepting(true);
            setError('');
            await acceptInvite({ token });
            // Marcar líder como ativo após aceitar convite
            await marcarLeaderAtivoSeLogado();
            // Show success message and redirect
            alert('Conta criada com sucesso! Faça login para continuar.');
            navigate('/login');
        }
        catch (error) {
            console.error('Erro ao aceitar convite:', error);
            setError(error instanceof Error ? error.message : 'Erro ao criar conta');
        }
        finally {
            setAccepting(false);
        }
    };
    const marcarLeaderAtivoSeLogado = async () => {
        try {
            const { data: { user } } = await supabase?.auth.getUser() || { data: { user: null } };
            if (user?.id) {
                await supabase?.from('leader_profiles')
                    .update({ status: 'ACTIVE' })
                    .eq('id', user.id);
                await supabase?.from('profiles')
                    .update({ role: 'LEADER' })
                    .eq('id', user.id);
            }
        }
        catch (error) {
            console.error('Erro ao ativar líder:', error);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center", children: [_jsx(Loader2, { className: "mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600", children: "Validando convite..." })] }) }));
    }
    if (error || !inviteData) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center", children: [_jsx(XCircle, { className: "mx-auto h-12 w-12 text-red-500 mb-4" }), _jsx("h2", { className: "text-xl font-bold text-gray-900 mb-2", children: "Convite Inv\u00E1lido" }), _jsx("p", { className: "text-gray-600 mb-4", children: error || 'Este convite não é válido ou já expirou.' }), _jsx("button", { onClick: () => navigate('/login'), className: "w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors", children: "Ir para Login" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-blue-600 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-white" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Aceitar Convite" }), _jsx("p", { className: "text-gray-600", children: "Gest\u00E3o Pol\u00EDtica - Vereador Wilian Tonezi" })] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [_jsx(CheckCircle, { className: "h-5 w-5 text-blue-600" }), _jsx("span", { className: "font-medium text-blue-900", children: "Convite V\u00E1lido" })] }), _jsxs("p", { className: "text-sm text-blue-800", children: ["Voc\u00EA foi convidado como ", _jsx("strong", { children: inviteData.full_name })] }), _jsxs("p", { className: "text-sm text-blue-600 mt-1", children: ["Email: ", inviteData.email] })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", value: inviteData.email, disabled: true, className: "w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Senha *" }), _jsx("input", { type: "password", ...register('password'), className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "M\u00EDnimo 6 caracteres" }), errors.password && (_jsx("p", { className: "text-red-500 text-sm mt-1", children: errors.password.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Confirmar Senha *" }), _jsx("input", { type: "password", ...register('confirmPassword'), className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Digite a senha novamente" }), errors.confirmPassword && (_jsx("p", { className: "text-red-500 text-sm mt-1", children: errors.confirmPassword.message }))] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded", children: error })), _jsxs("button", { type: "submit", disabled: accepting, className: "w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2", children: [accepting && _jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: accepting ? 'Criando conta...' : 'Criar Conta' })] })] }), _jsx("div", { className: "mt-6 text-center text-sm text-gray-600", children: _jsxs("p", { children: ["J\u00E1 tem uma conta? ", _jsx("a", { href: "/login", className: "text-blue-600 hover:text-blue-800", children: "Fazer login" })] }) })] }) }));
}
