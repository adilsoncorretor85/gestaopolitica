import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "@/components/ThemeToggle";
export default function UserMenu() {
    const nav = useNavigate();
    return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(ThemeToggle, {}), _jsx("button", { onClick: async () => {
                    await supabase?.auth.signOut();
                    nav("/login", { replace: true });
                }, className: "text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors duration-200", title: "Sair", children: "Sair" })] }));
}
