import React, { Suspense, ComponentType, ReactNode } from 'react';
import LoadingSpinner from './ui/loading-spinner';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  delay?: number;
}

// Componente wrapper para lazy loading com fallback otimizado
export function LazyWrapper({ 
  children, 
  fallback, 
  delay = 200 
}: LazyWrapperProps) {
  return (
    <Suspense 
      fallback={
        fallback || (
          <LoadingSpinner 
            size="lg" 
            text="Carregando..." 
            className="min-h-96"
          />
        )
      }
    >
      {children}
    </Suspense>
  );
}

// Hook para lazy loading com retry
export function useLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  retries = 3
) {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const module = await importFunc();
        
        if (isMounted) {
          setComponent(() => module.default);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          const error = err as Error;
          setError(error);
          
          if (retryCount < retries) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              if (isMounted) {
                loadComponent();
              }
            }, 1000 * (retryCount + 1)); // Backoff exponencial
          } else {
            setLoading(false);
          }
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, [importFunc, retries, retryCount]);

  const retry = React.useCallback(() => {
    setRetryCount(0);
    setError(null);
  }, []);

  return { Component, loading, error, retry };
}

// Componente para lazy loading de rotas com retry
interface LazyRouteProps {
  importFunc: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  retries?: number;
}

export function LazyRoute({ 
  importFunc, 
  fallback, 
  retries = 3 
}: LazyRouteProps) {
  const { Component, loading, error, retry } = useLazyComponent(importFunc, retries);

  if (loading) {
    return fallback || (
      <LoadingSpinner 
        size="lg" 
        text="Carregando página..." 
        className="min-h-96"
      />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 min-h-96">
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar página</h3>
        <p className="text-center mb-4 max-w-md">
          Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!Component) {
    return null;
  }

  return <Component />;
}

