/**
 * Sistema de Health Checks para monitoramento
 */

import { supabase } from './supabaseClient';
import { analytics } from './analytics';
import { structuredLogger } from './structuredLogger';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface HealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  checks: HealthCheckResult[];
  uptime: number;
}

class HealthChecker {
  private startTime: number;
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  constructor() {
    this.startTime = Date.now();
    this.registerDefaultChecks();
  }

  private registerDefaultChecks() {
    // Check do Supabase
    this.registerCheck('supabase', async () => {
      const start = Date.now();
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        const responseTime = Date.now() - start;
        
        if (error) {
          return {
            service: 'supabase',
            status: 'unhealthy',
            responseTime,
            error: error.message,
          };
        }

        return {
          service: 'supabase',
          status: 'healthy',
          responseTime,
          metadata: { hasData: !!data },
        };
      } catch (error) {
        return {
          service: 'supabase',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Check de conectividade
    this.registerCheck('connectivity', async () => {
      const start = Date.now();
      try {
        const response = await fetch('https://httpbin.org/get', {
          method: 'GET',
          timeout: 5000,
        } as any);
        
        const responseTime = Date.now() - start;
        
        if (!response.ok) {
          return {
            service: 'connectivity',
            status: 'degraded',
            responseTime,
            error: `HTTP ${response.status}`,
          };
        }

        return {
          service: 'connectivity',
          status: 'healthy',
          responseTime,
        };
      } catch (error) {
        return {
          service: 'connectivity',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Check de performance
    this.registerCheck('performance', async () => {
      const start = Date.now();
      
      // Simular operação pesada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const responseTime = Date.now() - start;
      
      if (responseTime > 1000) {
        return {
          service: 'performance',
          status: 'degraded',
          responseTime,
          error: 'Slow response time',
        };
      }

      return {
        service: 'performance',
        status: 'healthy',
        responseTime,
      };
    });
  }

  registerCheck(name: string, checkFn: () => Promise<HealthCheckResult>) {
    this.checks.set(name, checkFn);
  }

  async runAllChecks(): Promise<HealthStatus> {
    const start = Date.now();
    const results: HealthCheckResult[] = [];
    
    structuredLogger.info('Running health checks', {
      action: 'health_check_start',
      metadata: { checkCount: this.checks.size },
    });

    // Executar todos os checks em paralelo
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await checkFn();
        results.push(result);
        return result;
      } catch (error) {
        const result: HealthCheckResult = {
          service: name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        results.push(result);
        return result;
      }
    });

    await Promise.allSettled(checkPromises);

    // Determinar status geral
    const hasUnhealthy = results.some(r => r.status === 'unhealthy');
    const hasDegraded = results.some(r => r.status === 'degraded');
    
    let overall: 'healthy' | 'unhealthy' | 'degraded';
    if (hasUnhealthy) {
      overall = 'unhealthy';
    } else if (hasDegraded) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const healthStatus: HealthStatus = {
      overall,
      timestamp: Date.now(),
      checks: results,
      uptime: Date.now() - this.startTime,
    };

    // Log do resultado
    structuredLogger.info('Health checks completed', {
      action: 'health_check_complete',
      metadata: {
        overall,
        totalChecks: results.length,
        healthyChecks: results.filter(r => r.status === 'healthy').length,
        degradedChecks: results.filter(r => r.status === 'degraded').length,
        unhealthyChecks: results.filter(r => r.status === 'unhealthy').length,
        duration: Date.now() - start,
      },
    });

    // Enviar métricas para analytics
    analytics.performance('health_check_duration', Date.now() - start);
    analytics.track('health_check_completed', {
      overall,
      totalChecks: results.length,
      healthyChecks: results.filter(r => r.status === 'healthy').length,
    });

    return healthStatus;
  }

  async runSingleCheck(name: string): Promise<HealthCheckResult | null> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return null;
    }

    try {
      return await checkFn();
    } catch (error) {
      return {
        service: name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }
}

// Instância singleton
export const healthChecker = new HealthChecker();

// Hook para React
export const useHealthCheck = () => {
  const runHealthCheck = async () => {
    return await healthChecker.runAllChecks();
  };

  const runSingleCheck = async (name: string) => {
    return await healthChecker.runSingleCheck(name);
  };

  const getUptime = () => {
    return healthChecker.getUptime();
  };

  return {
    runHealthCheck,
    runSingleCheck,
    getUptime,
  };
};


