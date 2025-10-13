/**
 * Sistema de monitoramento de performance
 */

import { analytics } from './analytics';
import { structuredLogger } from './structuredLogger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
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
  private maxMetrics = 1000;
  private observer?: PerformanceObserver;

  constructor() {
    this.setupPerformanceObserver();
    this.measureInitialLoad();
  }

  private setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      // Observar diferentes tipos de métricas
      this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      structuredLogger.warn('Failed to setup PerformanceObserver', {
        action: 'performance_observer_setup',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry) {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.startTime,
      timestamp: Date.now(),
      metadata: {
        entryType: entry.entryType,
        duration: entry.duration,
      },
    };

    this.addMetric(metric);

    // Log métricas importantes
    if (entry.entryType === 'navigation') {
      this.logNavigationMetrics(entry as PerformanceNavigationTiming);
    } else if (entry.entryType === 'paint') {
      this.logPaintMetrics(entry as PerformancePaintTiming);
    }
  }

  private logNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
      total: entry.loadEventEnd - (entry as any).navigationStart,
    };

    structuredLogger.performance('page_load_total', metrics.total, {
      action: 'navigation_metrics',
      metadata: metrics,
    });

    // Enviar para analytics
    analytics.performance('page_load_total', metrics.total);
    analytics.performance('dns_lookup', metrics.dns);
    analytics.performance('tcp_connection', metrics.tcp);
    analytics.performance('request_time', metrics.request);
    analytics.performance('response_time', metrics.response);
  }

  private logPaintMetrics(entry: PerformancePaintTiming) {
    if (entry.name === 'first-contentful-paint') {
      structuredLogger.performance('first_contentful_paint', entry.startTime, {
        action: 'paint_metrics',
        metadata: { paintType: 'first-contentful-paint' },
      });
      analytics.performance('first_contentful_paint', entry.startTime);
    }
  }

  private measureInitialLoad() {
    // Medir tempo de carregamento inicial
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.measureWebVitals();
        this.measureBundleSize();
      }, 0);
    });
  }

  private measureWebVitals() {
    // Medir Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();
  }

  private measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        if (lastEntry) {
          this.addMetric({
            name: 'largest_contentful_paint',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            metadata: { element: lastEntry.element?.tagName },
          });
          
          analytics.performance('largest_contentful_paint', lastEntry.startTime);
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      structuredLogger.warn('Failed to measure LCP', {
        action: 'lcp_measurement',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  private measureFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          
          this.addMetric({
            name: 'first_input_delay',
            value: fid,
            timestamp: Date.now(),
            metadata: { eventType: (entry as any).name },
          });
          
          analytics.performance('first_input_delay', fid);
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      structuredLogger.warn('Failed to measure FID', {
        action: 'fid_measurement',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  private measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        
        this.addMetric({
          name: 'cumulative_layout_shift',
          value: clsValue,
          timestamp: Date.now(),
        });
        
        analytics.performance('cumulative_layout_shift', clsValue);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      structuredLogger.warn('Failed to measure CLS', {
        action: 'cls_measurement',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }

  private measureBundleSize() {
    // Estimar tamanho do bundle
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('assets')) {
        // Estimativa baseada no nome do arquivo
        totalSize += 100000; // 100KB por script como estimativa
      }
    });

    this.addMetric({
      name: 'bundle_size_estimate',
      value: totalSize,
      timestamp: Date.now(),
      metadata: { scriptCount: scripts.length },
    });

    analytics.performance('bundle_size_estimate', totalSize);
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Manter apenas os últimos N métricas
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  // Método público para medir performance de funções
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    const duration = end - start;
    
    this.addMetric({
      name: `function_${name}`,
      value: duration,
      timestamp: Date.now(),
    });

    structuredLogger.performance(`function_${name}`, duration, {
      action: 'function_performance',
      metadata: { functionName: name },
    });

    return result;
  }

  // Método público para medir performance de funções assíncronas
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    const duration = end - start;
    
    this.addMetric({
      name: `async_function_${name}`,
      value: duration,
      timestamp: Date.now(),
    });

    structuredLogger.performance(`async_function_${name}`, duration, {
      action: 'async_function_performance',
      metadata: { functionName: name },
    });

    return result;
  }

  // Obter métricas
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  // Obter métricas recentes
  getRecentMetrics(count: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  // Limpar métricas
  clearMetrics() {
    this.metrics = [];
  }

  // Destruir observer
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Instância singleton
export const performanceMonitor = new PerformanceMonitor();

// Hook para React
export const usePerformanceMonitor = () => {
  const measureFunction = <T>(name: string, fn: () => T): T => {
    return performanceMonitor.measureFunction(name, fn);
  };

  const measureAsyncFunction = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.measureAsyncFunction(name, fn);
  };

  const getMetrics = (name?: string) => {
    return performanceMonitor.getMetrics(name);
  };

  const getRecentMetrics = (count?: number) => {
    return performanceMonitor.getRecentMetrics(count);
  };

  const clearMetrics = () => {
    performanceMonitor.clearMetrics();
  };

  return {
    measureFunction,
    measureAsyncFunction,
    getMetrics,
    getRecentMetrics,
    clearMetrics,
  };
};

