import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, List } from 'lucide-react';
import { devLog } from '@/lib/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ListErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    devLog('ListErrorBoundary capturou um erro:', {
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
          errorBoundary: 'ListErrorBoundary'
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
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 min-h-[200px]">
          <List className="h-12 w-12 mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2 text-center">
            {this.props.fallbackTitle || 'Erro ao carregar lista'}
          </h3>
          <p className="text-center mb-4 max-w-md">
            {this.props.fallbackMessage || 
              'Ocorreu um erro ao carregar os dados da lista. Por favor, tente novamente.'}
          </p>
          
          {this.state.error && (
            <details className="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded-md text-sm max-w-lg w-full">
              <summary className="cursor-pointer font-medium">Detalhes do Erro</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-red-700 dark:text-red-300">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack && (
                  `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`
                )}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleRetry}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ListErrorBoundary;

