/**
 * Gerenciador avançado de tema
 */

import { useState, useEffect } from 'react';
import { structuredLogger } from './structuredLogger';
import { analytics } from './analytics';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'blue' | 'green' | 'purple' | 'red' | 'orange';

interface ThemeConfig {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  autoSwitch: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

class ThemeManager {
  private config: ThemeConfig = {
    mode: 'system',
    colorScheme: 'blue',
    autoSwitch: true,
    highContrast: false,
    reducedMotion: false,
  };

  private colorSchemes: Record<ColorScheme, { light: ThemeColors; dark: ThemeColors }> = {
    blue: {
      light: {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#60a5fa',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
      },
      dark: {
        primary: '#60a5fa',
        secondary: '#3b82f6',
        accent: '#93c5fd',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#60a5fa',
      },
    },
    green: {
      light: {
        primary: '#10b981',
        secondary: '#059669',
        accent: '#34d399',
        background: '#ffffff',
        surface: '#f0fdf4',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
      },
      dark: {
        primary: '#34d399',
        secondary: '#10b981',
        accent: '#6ee7b7',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#60a5fa',
      },
    },
    purple: {
      light: {
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        accent: '#a78bfa',
        background: '#ffffff',
        surface: '#faf5ff',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
      },
      dark: {
        primary: '#a78bfa',
        secondary: '#8b5cf6',
        accent: '#c4b5fd',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#60a5fa',
      },
    },
    red: {
      light: {
        primary: '#ef4444',
        secondary: '#dc2626',
        accent: '#f87171',
        background: '#ffffff',
        surface: '#fef2f2',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
      },
      dark: {
        primary: '#f87171',
        secondary: '#ef4444',
        accent: '#fca5a5',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#60a5fa',
      },
    },
    orange: {
      light: {
        primary: '#f59e0b',
        secondary: '#d97706',
        accent: '#fbbf24',
        background: '#ffffff',
        surface: '#fffbeb',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#e5e7eb',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
      },
      dark: {
        primary: '#fbbf24',
        secondary: '#f59e0b',
        accent: '#fcd34d',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        border: '#374151',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#60a5fa',
      },
    },
  };

  constructor() {
    this.loadConfig();
    this.setupSystemThemeListener();
    this.applyTheme();
  }

  // Carregar configuração salva
  private loadConfig() {
    try {
      const saved = localStorage.getItem('theme-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      structuredLogger.error('Erro ao carregar configuração de tema', error as Error, {
        action: 'theme_config_load_error',
      });
    }
  }

  // Salvar configuração
  private saveConfig() {
    try {
      localStorage.setItem('theme-config', JSON.stringify(this.config));
    } catch (error) {
      structuredLogger.error('Erro ao salvar configuração de tema', error as Error, {
        action: 'theme_config_save_error',
      });
    }
  }

  // Configurar listener para mudanças do sistema
  private setupSystemThemeListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.config.mode === 'system') {
          this.applyTheme();
        }
      });
    }
  }

  // Aplicar tema
  private applyTheme() {
    const isDark = this.getEffectiveTheme() === 'dark';
    const colors = this.getCurrentColors();

    // Aplicar classes CSS
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.documentElement.classList.toggle('high-contrast', this.config.highContrast);
    document.documentElement.classList.toggle('reduced-motion', this.config.reducedMotion);

    // Aplicar cores CSS customizadas
    this.applyCSSVariables(colors);

    // Atualizar meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.primary);
    }

    structuredLogger.info('Tema aplicado', {
      action: 'theme_applied',
      metadata: {
        mode: this.config.mode,
        effectiveTheme: this.getEffectiveTheme(),
        colorScheme: this.config.colorScheme,
        highContrast: this.config.highContrast,
        reducedMotion: this.config.reducedMotion,
      },
    });

    analytics.track('theme_applied', {
      mode: this.config.mode,
      effectiveTheme: this.getEffectiveTheme(),
      colorScheme: this.config.colorScheme,
      highContrast: this.config.highContrast,
      reducedMotion: this.config.reducedMotion,
    });
  }

  // Aplicar variáveis CSS
  private applyCSSVariables(colors: ThemeColors) {
    const root = document.documentElement;
    
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }

  // Obter tema efetivo
  private getEffectiveTheme(): 'light' | 'dark' {
    if (this.config.mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.config.mode;
  }

  // Obter cores atuais
  private getCurrentColors(): ThemeColors {
    const isDark = this.getEffectiveTheme() === 'dark';
    const scheme = this.colorSchemes[this.config.colorScheme];
    
    let colors = isDark ? scheme.dark : scheme.light;

    // Aplicar alto contraste se habilitado
    if (this.config.highContrast) {
      colors = this.applyHighContrast(colors);
    }

    return colors;
  }

  // Aplicar alto contraste
  private applyHighContrast(colors: ThemeColors): ThemeColors {
    return {
      ...colors,
      text: colors.background === '#ffffff' ? '#000000' : '#ffffff',
      textSecondary: colors.background === '#ffffff' ? '#333333' : '#cccccc',
      border: colors.background === '#ffffff' ? '#000000' : '#ffffff',
    };
  }

  // Definir modo do tema
  setMode(mode: ThemeMode) {
    this.config.mode = mode;
    this.saveConfig();
    this.applyTheme();
  }

  // Definir esquema de cores
  setColorScheme(colorScheme: ColorScheme) {
    this.config.colorScheme = colorScheme;
    this.saveConfig();
    this.applyTheme();
  }

  // Alternar alto contraste
  toggleHighContrast() {
    this.config.highContrast = !this.config.highContrast;
    this.saveConfig();
    this.applyTheme();
  }

  // Alternar movimento reduzido
  toggleReducedMotion() {
    this.config.reducedMotion = !this.config.reducedMotion;
    this.saveConfig();
    this.applyTheme();
  }

  // Obter configuração atual
  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  // Obter tema efetivo (público)
  getEffectiveThemePublic(): 'light' | 'dark' {
    return this.getEffectiveTheme();
  }

  // Obter cores atuais (público)
  getCurrentColorsPublic(): ThemeColors {
    return this.getCurrentColors();
  }

  // Verificar se está no modo escuro
  isDarkMode(): boolean {
    return this.getEffectiveTheme() === 'dark';
  }

  // Verificar se está no modo claro
  isLightMode(): boolean {
    return this.getEffectiveTheme() === 'light';
  }

  // Verificar se está no modo sistema
  isSystemMode(): boolean {
    return this.config.mode === 'system';
  }

  // Obter esquemas de cores disponíveis
  getAvailableColorSchemes(): ColorScheme[] {
    return Object.keys(this.colorSchemes) as ColorScheme[];
  }

  // Obter cores de um esquema específico
  getColorSchemeColors(colorScheme: ColorScheme, isDark: boolean): ThemeColors {
    const scheme = this.colorSchemes[colorScheme];
    return isDark ? scheme.dark : scheme.light;
  }

  // Resetar para configuração padrão
  resetToDefault() {
    this.config = {
      mode: 'system',
      colorScheme: 'blue',
      autoSwitch: true,
      highContrast: false,
      reducedMotion: false,
    };
    this.saveConfig();
    this.applyTheme();
  }
}

// Instância singleton
export const themeManager = new ThemeManager();

// Hook para React
export const useThemeManager = () => {
  const [config, setConfig] = useState<ThemeConfig>(themeManager.getConfig());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(themeManager.getEffectiveThemePublic());
  const [colors, setColors] = useState<ThemeColors>(themeManager.getCurrentColorsPublic());

  useEffect(() => {
    const updateTheme = () => {
      setConfig(themeManager.getConfig());
      setEffectiveTheme(themeManager.getEffectiveThemePublic());
      setColors(themeManager.getCurrentColorsPublic());
    };

    // Listener para mudanças de tema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, []);

  const setMode = (mode: ThemeMode) => {
    themeManager.setMode(mode);
  };

  const setColorScheme = (colorScheme: ColorScheme) => {
    themeManager.setColorScheme(colorScheme);
  };

  const toggleHighContrast = () => {
    themeManager.toggleHighContrast();
  };

  const toggleReducedMotion = () => {
    themeManager.toggleReducedMotion();
  };

  const resetToDefault = () => {
    themeManager.resetToDefault();
  };

  return {
    config,
    effectiveTheme,
    colors,
    setMode,
    setColorScheme,
    toggleHighContrast,
    toggleReducedMotion,
    resetToDefault,
    isDarkMode: themeManager.isDarkMode(),
    isLightMode: themeManager.isLightMode(),
    isSystemMode: themeManager.isSystemMode(),
    availableColorSchemes: themeManager.getAvailableColorSchemes(),
  };
};
