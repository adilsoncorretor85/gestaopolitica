/**
 * Sistema de monitoramento de performance
 * Rastreia métricas de performance e otimizações
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
  tags?: Record<string, string>;
}

interface WebVitals {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = typeof window !== 'undefined' && 'performance' in window;
    
    if (this.isEnabled) {
      this.initializeObservers();
      this.measureWebVitals();
    }
  }

  /**
   * Inicializa observadores de performance
   */
  private initializeObservers(): void {
    // Observer para métricas de navegação
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });
      
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Observer para métricas de recursos
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceTiming(entry as PerformanceResourceTiming);
          }
        }
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }
  }

  /**
   * Mede Web Vitals
   */
  private measureWebVitals(): void {
    // First Contentful Paint
    this.measureFCP();
    
    // Largest Contentful Paint
    this.measureLCP();
    
    // First Input Delay
    this.measureFID();
    
    // Cumulative Layout Shift
    this.measureCLS();
    
    // Time to First Byte
    this.measureTTFB();
  }

  /**
   * Mede First Contentful Paint
   */
  private measureFCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime, 'timing');
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    }
  }

  /**
   * Mede Largest Contentful Paint
   */
  private measureLCP(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime, 'timing');
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }
  }

  /**
   * Mede First Input Delay
   */
  private measureFID(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('FID', entry.processingStart - entry.startTime, 'timing');
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    }
  }

  /**
   * Mede Cumulative Layout Shift
   */
  private measureCLS(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric('CLS', clsValue, 'gauge');
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    }
  }

  /**
   * Mede Time to First Byte
   */
  private measureTTFB(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const ttfb = navigation.responseStart - navigation.requestStart;
      this.recordMetric('TTFB', ttfb, 'timing');
    }
  }

  /**
   * Registra métrica de navegação
   */
  private recordNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      'DNS Lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'TCP Connection': entry.connectEnd - entry.connectStart,
      'TLS Negotiation': entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      'Request': entry.responseStart - entry.requestStart,
      'Response': entry.responseEnd - entry.responseStart,
      'DOM Processing': entry.domContentLoadedEventEnd - entry.responseEnd,
      'Load Complete': entry.loadEventEnd - entry.loadEventStart
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.recordMetric(name, value, 'timing', { type: 'navigation' });
    });
  }

  /**
   * Registra métrica de recurso
   */
  private recordResourceTiming(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;
    
    this.recordMetric('Resource Load', duration, 'timing', {
      type: 'resource',
      resource: entry.name,
      size: size.toString()
    });
  }

  /**
   * Registra uma métrica personalizada
   */
  recordMetric(
    name: string, 
    value: number, 
    type: 'timing' | 'counter' | 'gauge' = 'timing',
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type,
      tags
    };

    this.metrics.push(metric);

    // Limita o número de métricas armazenadas
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }

    // Log em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`📊 Performance Metric: ${name} = ${value}ms`, tags);
    }
  }

  /**
   * Mede tempo de execução de uma função
   */
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start, 'timing');
    return result;
  }

  /**
   * Mede tempo de execução de uma função assíncrona
   */
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start, 'timing');
    return result;
  }

  /**
   * Obtém métricas por nome
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Obtém estatísticas de performance
   */
  getStats(): {
    totalMetrics: number;
    averageLoadTime: number;
    slowestResources: PerformanceMetric[];
    webVitals: WebVitals;
  } {
    const loadMetrics = this.metrics.filter(m => m.name === 'Resource Load');
    const averageLoadTime = loadMetrics.length > 0 
      ? loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length 
      : 0;

    const slowestResources = loadMetrics
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const webVitals: WebVitals = {};
    ['FCP', 'LCP', 'FID', 'CLS', 'TTFB'].forEach(vital => {
      const metric = this.metrics.find(m => m.name === vital);
      if (metric) {
        (webVitals as any)[vital] = metric.value;
      }
    });

    return {
      totalMetrics: this.metrics.length,
      averageLoadTime,
      slowestResources,
      webVitals
    };
  }

  /**
   * Exporta métricas para análise
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      stats: this.getStats()
    }, null, 2);
  }

  /**
   * Limpa métricas
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Destrói observadores
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Instância global
export const performanceMonitor = new PerformanceMonitor();

// Hook para React
import { useEffect, useRef } from 'react';

/**
 * Hook para medir performance de componentes
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStart = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    if (renderStart.current > 0) {
      const renderTime = performance.now() - renderStart.current;
      performanceMonitor.recordMetric(
        `Component Render: ${componentName}`,
        renderTime,
        'timing'
      );
    }
  });

  return {
    measure: (name: string, fn: () => void) => {
      performanceMonitor.measureFunction(`${componentName}: ${name}`, fn);
    },
    measureAsync: (name: string, fn: () => Promise<any>) => {
      return performanceMonitor.measureAsyncFunction(`${componentName}: ${name}`, fn);
    }
  };
}

/**
 * Decorator para medir performance de funções
 */
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureFunction(metricName, () => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

export default performanceMonitor;
