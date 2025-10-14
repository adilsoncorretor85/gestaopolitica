// supabase/functions/_shared/auditLogger.ts
// Sistema de auditoria aprimorado para Edge Functions

interface AuditLogEntry {
  id: string;
  timestamp: string;
  function: string;
  action: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ip: string;
  userAgent: string;
  requestId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warn' | 'error' | 'critical';
}

interface RequestContext {
  req: Request;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  functionName: string;
  action: string;
  startTime: number;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000; // Manter apenas os últimos 1000 logs em memória

  // Gerar ID único para request
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Extrair informações do request
  private extractRequestInfo(req: Request): {
    ip: string;
    userAgent: string;
    method: string;
    endpoint: string;
  } {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown';
    
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const method = req.method;
    const url = new URL(req.url);
    const endpoint = url.pathname + url.search;
    
    return { ip, userAgent, method, endpoint };
  }

  // Criar entrada de log
  private createLogEntry(
    context: RequestContext,
    statusCode: number,
    error?: string,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    const { ip, userAgent, method, endpoint } = this.extractRequestInfo(context.req);
    const responseTime = Date.now() - context.startTime;
    
    // Determinar severidade baseada no status code
    let severity: 'info' | 'warn' | 'error' | 'critical' = 'info';
    if (statusCode >= 500) {
      severity = 'critical';
    } else if (statusCode >= 400) {
      severity = 'error';
    } else if (statusCode >= 300) {
      severity = 'warn';
    }
    
    // Se há erro, aumentar severidade
    if (error) {
      if (severity === 'info') severity = 'warn';
      if (severity === 'warn') severity = 'error';
    }
    
    return {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      function: context.functionName,
      action: context.action,
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      ip,
      userAgent,
      requestId: this.generateRequestId(),
      method,
      endpoint,
      statusCode,
      responseTime,
      error,
      metadata,
      severity
    };
  }

  // Log de sucesso
  logSuccess(
    context: RequestContext,
    statusCode: number = 200,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createLogEntry(context, statusCode, undefined, metadata);
    this.addLog(entry);
    this.consoleLog(entry);
  }

  // Log de erro
  logError(
    context: RequestContext,
    statusCode: number,
    error: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createLogEntry(context, statusCode, error, metadata);
    this.addLog(entry);
    this.consoleLog(entry);
  }

  // Log de warning
  logWarning(
    context: RequestContext,
    statusCode: number,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.createLogEntry(context, statusCode, message, metadata);
    this.addLog(entry);
    this.consoleLog(entry);
  }

  // Adicionar log à lista
  private addLog(entry: AuditLogEntry): void {
    this.logs.push(entry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // Log no console com formatação
  private consoleLog(entry: AuditLogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.severity.toUpperCase().padEnd(8);
    const functionName = entry.function.padEnd(15);
    const action = entry.action.padEnd(20);
    const status = entry.statusCode.toString().padStart(3);
    const time = `${entry.responseTime}ms`.padStart(8);
    
    const baseMessage = `[${timestamp}] ${level} ${functionName} ${action} ${status} ${time}`;
    
    if (entry.error) {
      console.error(`${baseMessage} - ERROR: ${entry.error}`);
    } else if (entry.severity === 'warn') {
      console.warn(`${baseMessage} - WARNING: ${entry.metadata?.message || 'Unknown warning'}`);
    } else {
      console.log(baseMessage);
    }
    
    // Log adicional para erros críticos
    if (entry.severity === 'critical') {
      console.error('CRITICAL ERROR DETAILS:', {
        function: entry.function,
        action: entry.action,
        userId: entry.userId,
        ip: entry.ip,
        error: entry.error,
        metadata: entry.metadata
      });
    }
  }

  // Obter logs recentes
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  // Obter logs por severidade
  getLogsBySeverity(severity: 'info' | 'warn' | 'error' | 'critical'): AuditLogEntry[] {
    return this.logs.filter(log => log.severity === severity);
  }

  // Obter logs por função
  getLogsByFunction(functionName: string): AuditLogEntry[] {
    return this.logs.filter(log => log.function === functionName);
  }

  // Obter estatísticas
  getStats(): {
    totalLogs: number;
    bySeverity: Record<string, number>;
    byFunction: Record<string, number>;
    averageResponseTime: number;
    errorRate: number;
  } {
    const bySeverity: Record<string, number> = {};
    const byFunction: Record<string, number> = {};
    let totalResponseTime = 0;
    let errorCount = 0;
    
    for (const log of this.logs) {
      // Contar por severidade
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      
      // Contar por função
      byFunction[log.function] = (byFunction[log.function] || 0) + 1;
      
      // Somar tempo de resposta
      totalResponseTime += log.responseTime;
      
      // Contar erros
      if (log.severity === 'error' || log.severity === 'critical') {
        errorCount++;
      }
    }
    
    return {
      totalLogs: this.logs.length,
      bySeverity,
      byFunction,
      averageResponseTime: this.logs.length > 0 ? Math.round(totalResponseTime / this.logs.length) : 0,
      errorRate: this.logs.length > 0 ? Math.round((errorCount / this.logs.length) * 100) : 0
    };
  }

  // Limpar logs antigos
  clearLogs(): void {
    this.logs = [];
  }
}

// Instância singleton
const auditLogger = new AuditLogger();

// Função helper para criar contexto de request
export function createRequestContext(
  req: Request,
  functionName: string,
  action: string,
  userId?: string,
  userEmail?: string,
  userRole?: string
): RequestContext {
  return {
    req,
    userId,
    userEmail,
    userRole,
    functionName,
    action,
    startTime: Date.now()
  };
}

// Função helper para log de sucesso
export function logSuccess(
  context: RequestContext,
  statusCode: number = 200,
  metadata?: Record<string, any>
): void {
  auditLogger.logSuccess(context, statusCode, metadata);
}

// Função helper para log de erro
export function logError(
  context: RequestContext,
  statusCode: number,
  error: string,
  metadata?: Record<string, any>
): void {
  auditLogger.logError(context, statusCode, error, metadata);
}

// Função helper para log de warning
export function logWarning(
  context: RequestContext,
  statusCode: number,
  message: string,
  metadata?: Record<string, any>
): void {
  auditLogger.logWarning(context, statusCode, message, metadata);
}

// Função para obter estatísticas
export function getAuditStats() {
  return auditLogger.getStats();
}

// Função para obter logs recentes
export function getRecentAuditLogs(limit: number = 100) {
  return auditLogger.getRecentLogs(limit);
}

export default auditLogger;
