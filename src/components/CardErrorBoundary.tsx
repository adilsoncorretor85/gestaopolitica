import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import { devLog } from '@/lib/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  cardTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class CardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    devLog('CardErrorBoundary capturou um erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      cardTitle: this.props.cardTitle,
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
          errorBoundary: 'CardErrorBoundary',
          cardTitle: this.props.cardTitle || 'unknown'
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-8 w-8 mb-3 text-red-500" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {this.props.cardTitle || 'Card'}
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400 mb-3">
              {this.props.fallbackMessage || 'Erro ao carregar dados'}
            </p>
            
            {this.state.error && (
              <details className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs max-w-full w-full">
                <summary className="cursor-pointer font-medium text-red-700 dark:text-red-300">
                  Detalhes
                </summary>
                <pre className="mt-1 whitespace-pre-wrap break-words text-red-600 dark:text-red-400 text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <button
              onClick={this.handleRetry}
              className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CardErrorBoundary;

