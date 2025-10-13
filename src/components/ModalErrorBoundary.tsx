import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { devLog } from '@/lib/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onClose?: () => void;
  modalTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    devLog('ModalErrorBoundary capturou um erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      modalTitle: this.props.modalTitle,
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
          errorBoundary: 'ModalErrorBoundary',
          modalTitle: this.props.modalTitle || 'unknown'
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {this.props.modalTitle || 'Modal'}
              </h2>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertTriangle className="h-12 w-12 mb-4 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Erro no Modal
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {this.props.fallbackMessage || 
                    'Ocorreu um erro inesperado no modal. Por favor, tente novamente.'}
                </p>
                
                {this.state.error && (
                  <details className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm max-w-full w-full">
                    <summary className="cursor-pointer font-medium text-red-700 dark:text-red-300">
                      Detalhes do Erro
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-red-600 dark:text-red-400 text-xs">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack && (
                        `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`
                      )}
                    </pre>
                  </details>
                )}
                
                <div className="flex space-x-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </button>
                  {this.props.onClose && (
                    <button
                      onClick={this.props.onClose}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Fechar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;

