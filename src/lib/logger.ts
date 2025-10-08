/**
 * Sistema de logging condicional para desenvolvimento e produção
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

class LoggerImpl implements Logger {
  private isDevelopment = import.meta.env.DEV;
  private isDebugEnabled = import.meta.env.VITE_DEBUG === 'true';

  private log(level: LogLevel, message: string, ...args: any[]): void {
    // Em produção, só mostra warn e error
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    // Em desenvolvimento, mostra tudo se debug estiver habilitado
    if (this.isDevelopment && !this.isDebugEnabled && level === 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.log(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}

// Instância singleton do logger
export const logger = new LoggerImpl();

// Função helper para logs de desenvolvimento
export const devLog = (message: string, ...args: any[]): void => {
  if (import.meta.env.DEV) {
    console.log(`[DEV] ${message}`, ...args);
  }
};

// Função helper para logs de erro (sempre visível)
export const errorLog = (message: string, error?: any): void => {
  console.error(`[ERROR] ${message}`, error);
};

// Função helper para logs de Supabase (apenas em desenvolvimento)
export const supabaseLog = (context: string, data?: any): void => {
  if (import.meta.env.DEV) {
    console.log(`[SUPABASE] ${context}`, data);
  }
};

