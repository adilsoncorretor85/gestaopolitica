import { useState, useEffect } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdated: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

export const useServiceWorker = () => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdated: false,
    registration: null,
    error: null,
  });

  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Verificar se há uma nova versão
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({
                  ...prev,
                  isUpdated: true,
                }));
              }
            });
          }
        });

        // Escutar mensagens do Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_READY') {
            console.log('Service Worker está pronto');
          }
        });

      } catch (error) {
        console.error('Falha ao registrar Service Worker:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        }));
      }
    };

    registerServiceWorker();
  }, [state.isSupported]);

  const updateServiceWorker = () => {
    if (state.registration && state.registration.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const unregisterServiceWorker = async () => {
    if (state.registration) {
      await state.registration.unregister();
      setState(prev => ({
        ...prev,
        isRegistered: false,
        registration: null,
      }));
    }
  };

  return {
    ...state,
    updateServiceWorker,
    unregisterServiceWorker,
  };
};


