import { ReactNode } from 'react';
type ThemeContextType = {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    isDark: boolean;
};
interface ThemeProviderProps {
    children: ReactNode;
}
export declare function ThemeProvider({ children }: ThemeProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useThemeContext(): ThemeContextType;
export {};
