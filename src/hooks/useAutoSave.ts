import { useEffect, useRef, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { logger } from '@/lib/logger';

interface UseAutoSaveOptions {
  key: string;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T extends Record<string, any>>(
  form: Pick<UseFormReturn<T>, 'watch' | 'setValue' | 'getValues'>,
  options: UseAutoSaveOptions
) {
  const { key, debounceMs = 2000, enabled = true } = options;
  const { watch, setValue, getValues } = form;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Função para salvar no localStorage
  const saveToStorage = useCallback((data: T) => {
    try {
      const dataString = JSON.stringify(data);
      if (dataString !== lastSavedRef.current) {
        localStorage.setItem(key, dataString);
        lastSavedRef.current = dataString;
        logger.debug(`Auto-save: Dados salvos em ${key}`);
      }
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }, [key]);

  // Função para carregar do localStorage
  const loadFromStorage = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        logger.debug(`Auto-save: Dados carregados de ${key}`);
        return data;
      }
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
    }
    return null;
  }, [key]);

  // Função para limpar o localStorage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = '';
      logger.debug(`Auto-save: Dados limpos de ${key}`);
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
  }, [key]);

  // Auto-save com debounce
  useEffect(() => {
    if (!enabled) {
      logger.debug(`Auto-save desabilitado para ${key}`);
      return;
    }

    logger.debug(`Auto-save ativado para ${key} com debounce de ${debounceMs}ms`);
    logger.debug(`Auto-save enabled: ${enabled}, key: ${key}, debounceMs: ${debounceMs}`);

    const subscription = watch((data, { name, type }) => {
      logger.debug(`Auto-save: Campo ${name} alterado (${type})`, data);
      
      // Limpar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Configurar novo timeout
      timeoutRef.current = setTimeout(() => {
        const formData = getValues();
        logger.debug(`Auto-save: Salvando dados para ${key}`, formData);
        
        // Só salva se houver dados válidos
        if (formData && Object.keys(formData).length > 0) {
          saveToStorage(formData);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, getValues, saveToStorage, debounceMs, enabled, key]);

  // Função para restaurar dados salvos
  const restoreData = useCallback(() => {
    const savedData = loadFromStorage();
    if (savedData) {
      logger.debug(`Auto-save: Restaurando dados para ${key}`, savedData);
      let restoredCount = 0;
      
      Object.entries(savedData).forEach(([fieldKey, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          setValue(fieldKey as any, value, { shouldValidate: false });
          restoredCount++;
        }
      });
      
      logger.debug(`Auto-save: ${restoredCount} campos restaurados para ${key}`);
      return restoredCount > 0;
    }
    return false;
  }, [loadFromStorage, setValue, key]);

  return {
    saveToStorage,
    loadFromStorage,
    clearStorage,
    restoreData,
  };
}
