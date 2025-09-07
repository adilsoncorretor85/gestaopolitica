import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DefinirSenha from "@/pages/DefinirSenha";
import Pessoas from "@/pages/Pessoas";
import PessoasForm from "@/pages/PessoasForm";
import Mapa from "@/pages/Mapa";
import Lideres from "@/pages/Lideres";
import LideresForm from "@/pages/LideresForm";
import Projecao from "@/pages/Projecao";
import ConviteAccept from "@/pages/ConviteAccept";
import Convite from "@/pages/Convite";
import ProtectedAdmin from "@/components/ProtectedAdmin";
function ProtectedRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    useEffect(() => {
        if (!supabase) {
            console.error('Supabase não configurado. Verifique o .env e reinicie o Vite.');
            setLoading(false);
            return;
        }
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setLoading(false);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s);
        });
        return () => sub.subscription.unsubscribe();
    }, []);
    if (loading)
        return _jsx("div", { children: "Carregando\u2026" });
    if (!supabase)
        return _jsx("div", { children: "Erro: Supabase n\u00E3o configurado. Verifique o .env e reinicie o Vite." });
    if (!session)
        return _jsx(Navigate, { to: "/login", replace: true });
    return children;
}
export default function App() {
    return (_jsx(ThemeProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/definir-senha", element: _jsx(DefinirSenha, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/pessoas", element: _jsx(ProtectedRoute, { children: _jsx(Pessoas, {}) }) }), _jsx(Route, { path: "/pessoas/nova", element: _jsx(ProtectedRoute, { children: _jsx(PessoasForm, {}) }) }), _jsx(Route, { path: "/pessoas/:id", element: _jsx(ProtectedRoute, { children: _jsx(PessoasForm, {}) }) }), _jsx(Route, { path: "/mapa", element: _jsx(ProtectedRoute, { children: _jsx(Mapa, {}) }) }), _jsx(Route, { path: "/lideres", element: _jsx(ProtectedAdmin, { children: _jsx(Lideres, {}) }) }), _jsx(Route, { path: "/lideres/novo", element: _jsx(ProtectedAdmin, { children: _jsx(LideresForm, {}) }) }), _jsx(Route, { path: "/lideres/:id", element: _jsx(ProtectedAdmin, { children: _jsx(LideresForm, {}) }) }), _jsx(Route, { path: "/projecao", element: _jsx(ProtectedAdmin, { children: _jsx(Projecao, {}) }) }), _jsx(Route, { path: "/convite/:token", element: _jsx(ConviteAccept, {}) }), _jsx(Route, { path: "/convite", element: _jsx(Convite, {}) }), _jsx(Route, { path: "/contatos", element: _jsx(Navigate, { to: "/pessoas", replace: true }) }), _jsx(Route, { path: "/contacts", element: _jsx(Navigate, { to: "/pessoas", replace: true }) }), _jsx(Route, { path: "/contatos/*", element: _jsx(Navigate, { to: "/pessoas", replace: true }) }), _jsx(Route, { path: "/contacts/*", element: _jsx(Navigate, { to: "/pessoas", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/dashboard", replace: true }) })] }) }) }));
}
