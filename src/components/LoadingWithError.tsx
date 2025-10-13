import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingSpinner from './ui/loading-spinner';

interface LoadingWithErrorProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingText?: string;
  errorTitle?: string;
  className?: string;
}

export default function LoadingWithError({
  loading,
  error,
  onRetry,
  children,
  loadingText = 'Carregando...',
  errorTitle = 'Erro ao carregar',
  className = ''
}: LoadingWithErrorProps) {
  if (loading) {
    return (
      <LoadingSpinner 
        size="lg" 
        text={loadingText}
        className={className}
      />
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex flex-col items-center space-y-4 text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {errorTitle}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
