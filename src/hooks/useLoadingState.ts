import { useState, useCallback } from 'react';

interface LoadingState {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useLoadingState(initialLoading = false): LoadingState {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    setLoading,
    setError,
    execute,
    reset
  };
}

// Hook específico para operações CRUD
export function useCrudLoading() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeWithLoading = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    operation: 'load' | 'save' | 'delete' = 'load'
  ): Promise<T | null> => {
    try {
      setError(null);
      
      switch (operation) {
        case 'load':
          setLoading(true);
          break;
        case 'save':
          setSaving(true);
          break;
        case 'delete':
          setDeleting(true);
          break;
      }

      const result = await asyncFn();
      return result;
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
      return null;
    } finally {
      setLoading(false);
      setSaving(false);
      setDeleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setSaving(false);
    setDeleting(false);
    setError(null);
  }, []);

  return {
    loading,
    saving,
    deleting,
    error,
    setError,
    executeWithLoading,
    reset
  };
}

