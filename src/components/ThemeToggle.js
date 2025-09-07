import { jsx as _jsx } from "react/jsx-runtime";
import { Sun, Moon } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
export default function ThemeToggle() {
    const { theme, toggleTheme } = useThemeContext();
    return (_jsx("button", { onClick: toggleTheme, className: "p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200", title: theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro', children: theme === 'light' ? (_jsx(Moon, { className: "h-5 w-5 text-gray-600 dark:text-gray-300" })) : (_jsx(Sun, { className: "h-5 w-5 text-yellow-500" })) }));
}
