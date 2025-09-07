import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
export default function ProtectedAdmin({ children }) {
    const { user, isAdmin, loading } = useAuth();
    if (loading) {
        return _jsx("div", { className: "p-8 text-sm text-gray-600", children: "Carregando\u2026" });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (!isAdmin) {
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
