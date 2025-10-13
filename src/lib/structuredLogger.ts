/**
 * Sistema de logging estruturado para o projeto
 */

import { analytics } from './analytics';

interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class StructuredLogger {
  private level: number;
  private isDev: boolean;
  private sessionId: string;
  private context: LogContext = {};

  constructor() {
    this.isDev = import.meta.env.DEV;
    this.level = this.isDev ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldLog(level: number): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, context?: LogContext, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    const logData = {
      message,
      sessionId: this.sessionId,
      context: { ...this.context, ...context },
      args: args.length > 0 ? args : undefined,
    };
    
    return `${prefix} ${JSON.stringify(logData, null, 2)}`;
  }

  private sendToAnalytics(level: string, message: string, context?: LogContext, error?: Error) {
    if (level === 'ERROR' && error) {
      analytics.error(error, {
        message,
        context: { ...this.context, ...context },
        sessionId: this.sessionId,
      });
    }
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  error(message: string, error?: Error, context?: LogContext, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage('ERROR', message, context, ...args));
      this.sendToAnalytics('ERROR', message, context, error);
    }
  }

  warn(message: string, context?: LogContext, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, context, ...args));
    }
  }

  info(message: string, context?: LogContext, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.info(this.formatMessage('INFO', message, context, ...args));
    }
  }

  debug(message: string, context?: LogContext, ...args: any[]): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context, ...args));
    }
  }

  // Métodos específicos para diferentes tipos de logs
  apiCall(method: string, url: string, status?: number, duration?: number, context?: LogContext): void {
    this.info(`API ${method} ${url}`, {
      ...context,
      action: 'api_call',
      metadata: { method, url, status, duration },
    });
  }

  userAction(action: string, component: string, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      component,
      action,
    });
  }

  performance(metric: string, value: number, context?: LogContext): void {
    this.info(`Performance: ${metric}`, {
      ...context,
      action: 'performance',
      metadata: { metric, value },
    });
  }
}

// Instância singleton
export const structuredLogger = new StructuredLogger();

// Hook para React
export const useStructuredLogger = () => {
  return {
    setContext: structuredLogger.setContext.bind(structuredLogger),
    clearContext: structuredLogger.clearContext.bind(structuredLogger),
    error: structuredLogger.error.bind(structuredLogger),
    warn: structuredLogger.warn.bind(structuredLogger),
    info: structuredLogger.info.bind(structuredLogger),
    debug: structuredLogger.debug.bind(structuredLogger),
    apiCall: structuredLogger.apiCall.bind(structuredLogger),
    userAction: structuredLogger.userAction.bind(structuredLogger),
    performance: structuredLogger.performance.bind(structuredLogger),
  };
};


