import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, installPWA } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verificar se deve mostrar o prompt
    const shouldShow = isInstallable && !isInstalled && !isDismissed;
    setIsVisible(shouldShow);
  }, [isInstallable, isInstalled, isDismissed]);

  const handleInstall = async () => {
    try {
      await installPWA();
      setIsVisible(false);
    } catch (error) {
      console.error('Erro ao instalar PWA:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    onClose?.();
    
    // Salvar no localStorage para não mostrar novamente
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Verificar se foi dispensado anteriormente
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Instalar App
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Acesso rápido e offline
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Instale o app para ter acesso rápido e funcionalidades offline:
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <Smartphone className="h-3 w-3" />
              <span>Acesso direto da tela inicial</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <Monitor className="h-3 w-3" />
              <span>Funciona offline</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <Download className="h-3 w-3" />
              <span>Notificações push</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
