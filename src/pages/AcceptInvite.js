import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Vote } from "lucide-react";
export default function AcceptInvite() {
    const navigate = useNavigate();
    const [checking, setChecking] = useState(true);
    const [email, setEmail] = useState(null);
    const [error, setError] = useState(null);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);
    // Lê os parâmetros do fragmento (#) inseridos pelo Supabase (type=invite, access_token, etc.)
    const params = useMemo(() => {
        const hash = window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : "";
        return new URLSearchParams(hash);
    }, []);
    useEffect(() => {
        (async () => {
            try {
                const type = params.get("type");
                const accessToken = params.get("access_token");
                if (type !== "invite" || !accessToken) {
                    setError("Link de convite inválido ou expirado.");
                    setChecking(false);
                    return;
                }
                // Troca o token do link por uma sessão válida
                const { data, error } = await supabase?.auth.getUser(accessToken) || { data: null, error: null };
                if (error || !data?.user) {
                    setError("Não foi possível validar o convite.");
                }
                else {
                    setEmail(data?.user?.email ?? null);
                }
            }
            catch (e) {
                setError(e.message ?? "Erro ao validar convite.");
            }
            finally {
                setChecking(false);
            }
        })();
    }, [params]);
    async function handleCreate() {
        setError(null);
        if (!password || password.length < 6) {
            setError("Defina uma senha com ao menos 6 caracteres.");
            return;
        }
        if (password !== confirm) {
            setError("As senhas não conferem.");
            return;
        }
        setSaving(true);
        try {
            // Define a senha do usuário convidado
            const { error } = await supabase?.auth.updateUser({ password }) || { error: null };
            if (error)
                throw error;
            // Opcional: encerra a sessão e manda para o login
            await supabase?.auth.signOut();
            navigate("/login?ok=invite");
        }
        catch (e) {
            setError(e.message ?? "Falha ao criar a conta.");
        }
        finally {
            setSaving(false);
        }
    }
    if (checking) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-blue-600 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-white animate-pulse" }) }) }), _jsx("p", { className: "text-gray-600", children: "Validando convite\u2026" })] }) }));
    }
    if (error) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md text-center", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-red-100 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-red-600" }) }) }), _jsx("h1", { className: "text-xl font-semibold mb-2 text-gray-900", children: "Convite Inv\u00E1lido" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: error }), _jsx("button", { onClick: () => (window.location.href = "/login"), className: "px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors", children: "Ir para Login" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-lg", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx("div", { className: "bg-blue-600 p-3 rounded-full", children: _jsx(Vote, { className: "h-8 w-8 text-white" }) }) }), _jsx("h1", { className: "text-2xl font-bold mb-1 text-gray-900", children: "Aceitar Convite" }), _jsx("p", { className: "text-sm text-gray-600", children: "Gest\u00E3o Pol\u00EDtica - Vereador Wilian Tonezi" })] }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6", children: _jsx("p", { className: "text-sm text-blue-800", children: email ? (_jsxs(_Fragment, { children: ["Voc\u00EA foi convidado para o sistema com o e-mail ", _jsx("strong", { children: email }), "."] })) : ("Convite válido.") }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Senha *" }), _jsx("input", { type: "password", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Crie uma senha (m\u00EDnimo 6 caracteres)" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Confirmar senha *" }), _jsx("input", { type: "password", className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent", value: confirm, onChange: (e) => setConfirm(e.target.value), placeholder: "Repita a senha" })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg", children: error })), _jsx("button", { onClick: handleCreate, disabled: saving, className: "w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: saving ? "Criando conta..." : "Criar Conta" })] }), _jsx("div", { className: "mt-6 text-center text-sm text-gray-600", children: _jsxs("p", { children: ["J\u00E1 tem uma conta? ", _jsx("a", { href: "/login", className: "text-blue-600 hover:text-blue-800", children: "Fazer login" })] }) })] }) }));
}
