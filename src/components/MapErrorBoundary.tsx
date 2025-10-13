import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MapPin, RefreshCw, AlertTriangle } from 'lucide-react';
import { devLog } from '@/lib/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    devLog('MapErrorBoundary capturou um erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });

    // Report to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: 'MapErrorBoundary'
        }
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 min-h-[400px]">
          <MapPin className="h-16 w-16 mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2 text-center">
            Erro no Mapa
          </h3>
          <p className="text-center mb-4 max-w-md">
            {this.props.fallbackMessage || 
              'Ocorreu um erro ao carregar o mapa. Isso pode ser devido a problemas de conexão ou configuração da API do Google Maps.'}
          </p>
          
          {this.state.error && (
            <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm max-w-lg w-full">
              <summary className="cursor-pointer font-medium">Detalhes do Erro</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack && (
                  `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`
                )}
              </pre>
            </details>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;

