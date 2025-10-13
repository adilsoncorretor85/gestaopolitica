/**
 * Sistema de tratamento de erros globais
 */

import { analytics } from './analytics';
import { structuredLogger } from './structuredLogger';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ErrorInfo {
  message: string;
  stack?: string;
  name: string;
  context?: ErrorContext;
  timestamp: number;
  userAgent: string;
  url: string;
}

class GlobalErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 100;

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Capturar erros JavaScript não tratados
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        stack: event.error?.stack,
        name: event.error?.name || 'Error',
        context: {
          component: 'global',
          action: 'unhandled_error',
        },
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });

    // Capturar promises rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        name: event.reason?.name || 'PromiseRejection',
        context: {
          component: 'global',
          action: 'unhandled_promise_rejection',
        },
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });
  }

  private handleError(errorInfo: ErrorInfo) {
    // Adicionar à fila
    this.errorQueue.push(errorInfo);
    
    // Manter apenas os últimos N erros
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log estruturado
    structuredLogger.error(
      `Global error: ${errorInfo.message}`,
      new Error(errorInfo.message),
      errorInfo.context,
      {
        stack: errorInfo.stack,
        name: errorInfo.name,
        timestamp: errorInfo.timestamp,
        userAgent: errorInfo.userAgent,
        url: errorInfo.url,
      }
    );

    // Enviar para analytics
    analytics.error(new Error(errorInfo.message), {
      ...errorInfo.context,
      stack: errorInfo.stack,
      name: errorInfo.name,
      timestamp: errorInfo.timestamp,
      userAgent: errorInfo.userAgent,
      url: errorInfo.url,
    });

    // Em desenvolvimento, mostrar no console
    if (import.meta.env.DEV) {
      console.group('🚨 Global Error Handler');
      console.error('Error:', errorInfo.message);
      console.error('Stack:', errorInfo.stack);
      console.error('Context:', errorInfo.context);
      console.error('Timestamp:', new Date(errorInfo.timestamp).toISOString());
      console.groupEnd();
    }
  }

  // Método público para reportar erros manualmente
  reportError(error: Error, context?: ErrorContext) {
    this.handleError({
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  // Obter erros recentes
  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errorQueue.slice(-count);
  }

  // Limpar fila de erros
  clearErrors() {
    this.errorQueue = [];
  }

  // Verificar se há muitos erros recentes
  hasTooManyErrors(timeWindow: number = 60000, maxErrors: number = 10): boolean {
    const now = Date.now();
    const recentErrors = this.errorQueue.filter(
      error => now - error.timestamp < timeWindow
    );
    return recentErrors.length > maxErrors;
  }
}

// Instância singleton
export const globalErrorHandler = new GlobalErrorHandler();

// Hook para React
export const useErrorHandler = () => {
  const reportError = (error: Error, context?: ErrorContext) => {
    globalErrorHandler.reportError(error, context);
  };

  const getRecentErrors = (count?: number) => {
    return globalErrorHandler.getRecentErrors(count);
  };

  const clearErrors = () => {
    globalErrorHandler.clearErrors();
  };

  const hasTooManyErrors = (timeWindow?: number, maxErrors?: number) => {
    return globalErrorHandler.hasTooManyErrors(timeWindow, maxErrors);
  };

  return {
    reportError,
    getRecentErrors,
    clearErrors,
    hasTooManyErrors,
  };
};

// Função utilitária para wrapping de funções com tratamento de erro
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => R,
  context?: ErrorContext
) => {
  return (...args: T): R | undefined => {
    try {
      return fn(...args);
    } catch (error) {
      globalErrorHandler.reportError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return undefined;
    }
  };
};

// Função utilitária para wrapping de funções assíncronas
export const withAsyncErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext
) => {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      globalErrorHandler.reportError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return undefined;
    }
  };
};


