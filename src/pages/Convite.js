import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Vote } from "lucide-react";
function useInviteHash() {
    return useMemo(() => {
        const p = new URLSearchParams(window.location.hash.slice(1)); // remove "#"
        return {
            type: p.get("type"),
            access_token: p.get("access_token"),
            refresh_token: p.get("refresh_token"),
            error: p.get("error_description"),
        };
    }, []);
}
export default function Convite() {
    const nav = useNavigate();
    const { type, access_token, refresh_token, error } = useInviteHash();
    const [loading, setLoading] = useState(true);
    const [sessionOk, setSessionOk] = useState(false);
    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [msg, setMsg] = useState(null);
    const [userEmail, setUserEmail] = useState("");
    // 1) Garantir sessão a partir do hash
    useEffect(() => {
        (async () => {
            try {
                if (error)
                    throw new Error(error);
                if (!access_token || !refresh_token) {
                    throw new Error("Link inválido ou expirado.");
                }
                if (type !== "invite" && type !== "recovery") {
                    throw new Error("Tipo de link inválido.");
                }
                const { error: sErr } = await getSupabaseClient().auth.setSession({
                    access_token,
                    refresh_token,
                });
                if (sErr)
                    throw sErr;
                // Pegar email do usuário
                const { data: { user } } = await getSupabaseClient().auth.getUser();
                if (user?.email) {
                    setUserEmail(user.email);
                }
                // limpa o hash para não ficar poluindo a URL
                window.history.replaceState(null, "", window.location.pathname);
                setSessionOk(true);
            }
            catch (e) {
                setMsg(e.message ?? "Erro ao validar convite.");
            }
            finally {
                setLoading(false);
            }
        })();
    }, [type, access_token, refresh_token, error]);
    // 2) Submeter nova senha
    async function onSubmit(e) {
        e.preventDefault();
        setMsg(null);
        try {
            if (pwd.length < 6)
                throw new Error("A senha precisa ter ao menos 6 caracteres.");
            if (pwd !== pwd2)
                throw new Error("As senhas não conferem.");
            const { error: uErr } = await getSupabaseClient().auth.updateUser({ password: pwd });
            if (uErr)
                throw uErr;
            // Marcar convite como aceito e ativar líder
            const { data: { user } } = await getSupabaseClient().auth.getUser();
            if (user?.email) {
                await getSupabaseClient()
                    .from('invite_tokens')
                    .update({ accepted_at: new Date().toISOString() })
                    .eq('email', user.email)
                    .is('accepted_at', null);
                await getSupabaseClient()
                    .from('leader_profiles')
                    .update({ status: 'ACTIVE' })
                    .eq('id', user.id);
            }
            setMsg("Senha definida com sucesso! Redirecionando...");
            setTimeout(() => nav("/dashboard"), 1200);
        }
        catch (e) {
            setMsg(e.message ?? "Erro ao definir senha.");
        }
    }
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-blue-600 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-white animate-pulse" }) }) }), _jsx("p", { className: "text-gray-600", children: "Validando convite\u2026" })] }) }));
    }
    if (!sessionOk) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-red-100 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-red-600" }) }) }), _jsx("h1", { className: "text-xl font-semibold mb-2 text-gray-900", children: "Convite Inv\u00E1lido" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: msg ?? "Convite inválido." }), _jsx("button", { onClick: () => nav("/login"), className: "px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors", children: "Ir para Login" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-blue-600 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-white" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Definir Senha" }), _jsx("p", { className: "text-gray-600", children: "Gest\u00E3o Pol\u00EDtica - Vereador Wilian Tonezi" }), userEmail && (_jsxs("p", { className: "text-sm text-blue-600 mt-2", children: ["Bem-vindo, ", userEmail] }))] }), _jsxs("form", { onSubmit: onSubmit, className: "space-y-4", children: [msg && (_jsx("div", { className: `px-4 py-3 rounded-lg ${msg.includes('sucesso')
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-red-50 border border-red-200 text-red-700'}`, children: msg })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nova Senha *" }), _jsx("input", { type: "password", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "M\u00EDnimo 6 caracteres", value: pwd, onChange: (e) => setPwd(e.target.value), required: true, minLength: 6 })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Confirmar Senha *" }), _jsx("input", { type: "password", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Digite a senha novamente", value: pwd2, onChange: (e) => setPwd2(e.target.value), required: true, minLength: 6 })] }), _jsx("button", { type: "submit", className: "w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors", children: "Criar Conta" })] }), _jsx("div", { className: "mt-6 text-center text-sm text-gray-600", children: _jsx("p", { children: "Ap\u00F3s definir sua senha, voc\u00EA ter\u00E1 acesso completo ao sistema." }) })] }) }));
}
