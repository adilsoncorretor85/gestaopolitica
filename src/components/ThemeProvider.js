import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { useTheme } from '@/hooks/useTheme';
const ThemeContext = createContext(undefined);
export function ThemeProvider({ children }) {
    const themeData = useTheme();
    return (_jsx(ThemeContext.Provider, { value: themeData, children: children }));
}
export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext deve ser usado dentro de um ThemeProvider');
    }
    return context;
}
