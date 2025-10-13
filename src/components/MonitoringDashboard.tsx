import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  TrendingUp,
  RefreshCw,
  BarChart3,
  Server
} from 'lucide-react';
import { useHealthCheck } from '@/lib/healthCheck';
import { usePerformanceMonitor } from '@/lib/performanceMonitor';
import { useErrorHandler } from '@/lib/errorHandler';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

interface MonitoringDashboardProps {
  className?: string;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { runHealthCheck, getUptime } = useHealthCheck();
  const { getRecentMetrics, getMetrics } = usePerformanceMonitor();
  const { getRecentErrors, hasTooManyErrors } = useErrorHandler();

  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [health, metrics, errors] = await Promise.all([
        runHealthCheck(),
        Promise.resolve(getRecentMetrics(10)),
        Promise.resolve(getRecentErrors(5)),
      ]);

      setHealthStatus(health);
      setPerformanceMetrics(metrics);
      setRecentErrors(errors);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao atualizar dados de monitoramento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'unhealthy': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5" />;
      case 'unhealthy': return <AlertTriangle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div 
      className={`space-y-6 ${className}`}
      {...staggerContainer}
    >
      {/* Header */}
      <motion.div className="flex items-center justify-between" {...staggerItem}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard de Monitoramento
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </motion.div>

      {/* Status Geral */}
      {healthStatus && (
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" {...staggerItem}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getStatusColor(healthStatus.overall)}`}>
                {getStatusIcon(healthStatus.overall)}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Status Geral
                </h3>
                <p className={`text-sm font-medium capitalize ${getStatusColor(healthStatus.overall)}`}>
                  {healthStatus.overall}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Uptime
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatUptime(getUptime())}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Checks
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {healthStatus.checks?.length || 0} serviços
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Health Checks */}
      {healthStatus?.checks && (
        <motion.div className="bg-white dark:bg-gray-800 rounded-lg shadow" {...staggerItem}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Health Checks
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {healthStatus.checks.map((check: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(check.status)}`}>
                      {getStatusIcon(check.status)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                        {check.service}
                      </h4>
                      {check.error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {check.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {check.responseTime && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {check.responseTime}ms
                      </p>
                    )}
                    <p className={`text-sm font-medium capitalize ${getStatusColor(check.status)}`}>
                      {check.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Performance Metrics */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" {...staggerItem}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Métricas de Performance
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {performanceMetrics.slice(0, 5).map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metric.name.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metric.name.includes('size') ? formatBytes(metric.value) : `${metric.value.toFixed(2)}ms`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Erros Recentes
            </h3>
          </div>
          <div className="p-6">
            {recentErrors.length > 0 ? (
              <div className="space-y-4">
                {recentErrors.map((error, index) => (
                  <div key={index} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="font-medium text-red-900 dark:text-red-400">
                      {error.message}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                    {error.context?.component && (
                      <p className="text-xs text-red-500 dark:text-red-600">
                        Componente: {error.context.component}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum erro recente
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MonitoringDashboard;


