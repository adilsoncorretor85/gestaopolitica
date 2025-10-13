import { useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { handleSupabaseError } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  context?: string;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const { error: showErrorToast } = useToast();

  const handleError = useCallback((
    error: any,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      context = 'operação',
      fallbackMessage = 'Ocorreu um erro inesperado'
    } = options;

    // Log do erro se habilitado
    if (logError) {
      logger.error(`[${context}] Erro capturado:`, {
        error: error?.message || error,
        stack: error?.stack,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Determinar mensagem de erro
    let errorMessage = fallbackMessage;
    
    if (error) {
      // Se for erro do Supabase, usar handler específico
      if (error.code || error.message?.includes('supabase')) {
        errorMessage = handleSupabaseError(error, context);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }

    // Mostrar toast se habilitado
    if (showToast) {
      showErrorToast('Erro', errorMessage);
    }

    // Retornar mensagem para uso programático
    return errorMessage;
  }, [showErrorToast]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
}

