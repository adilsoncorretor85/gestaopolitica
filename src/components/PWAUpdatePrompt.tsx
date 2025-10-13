import React, { useState } from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface PWAUpdatePromptProps {
  onClose?: () => void;
}

const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({ onClose }) => {
  const { isUpdateAvailable, updatePWA } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      updatePWA();
    } catch (error) {
      console.error('Erro ao atualizar PWA:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    onClose?.();
  };

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-orange-200 dark:border-orange-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Atualização Disponível
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nova versão do app
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Uma nova versão do aplicativo está disponível com melhorias e correções.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 bg-orange-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Atualizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
