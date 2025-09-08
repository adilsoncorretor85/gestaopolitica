import { useState, useCallback } from 'react';

interface AsyncOperationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface AsyncOperationReturn extends AsyncOperationState {
  execute: <T>(operation: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  setError: (error: string) => void;
  setSuccess: (success: boolean) => void;
}

export function useAsyncOperation(): AsyncOperationReturn {
  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    setState({ loading: true, error: null, success: false });
    
    try {
      const result = await operation();
      setState({ loading: false, error: null, success: true });
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Ocorreu um erro inesperado';
      setState({ loading: false, error: errorMessage, success: false });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const setSuccess = useCallback((success: boolean) => {
    setState(prev => ({ ...prev, success, loading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setError,
    setSuccess,
  };
}
