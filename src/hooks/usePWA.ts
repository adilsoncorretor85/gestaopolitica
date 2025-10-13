import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isInstallable: boolean;
  installPrompt: any;
  swRegistration: ServiceWorkerRegistration | null;
}

interface PWAInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isInstallable: false,
    installPrompt: null,
    swRegistration: null,
  });

  // Verificar se o app está instalado
  const checkIfInstalled = useCallback(() => {
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setPwaState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Verificar se há atualizações disponíveis
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setPwaState(prev => ({ ...prev, swRegistration: registration }));
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setPwaState(prev => ({ ...prev, isUpdateAvailable: true }));
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
      }
    }
  }, []);

  // Instalar PWA
  const installPWA = useCallback(async () => {
    if (pwaState.installPrompt) {
      const result = await pwaState.installPrompt.prompt();
      const choiceResult = await pwaState.installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA instalada com sucesso!');
        setPwaState(prev => ({ ...prev, isInstalled: true, installPrompt: null }));
      }
    }
  }, [pwaState.installPrompt]);

  // Atualizar PWA
  const updatePWA = useCallback(() => {
    if (pwaState.swRegistration && pwaState.swRegistration.waiting) {
      pwaState.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [pwaState.swRegistration]);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado:', registration);
        
        setPwaState(prev => ({ ...prev, swRegistration: registration }));
        
        // Verificar atualizações
        await checkForUpdates();
        
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    }
  }, [checkForUpdates]);

  // Verificar conectividade
  const updateOnlineStatus = useCallback(() => {
    setPwaState(prev => ({ ...prev, isOnline: navigator.onLine }));
  }, []);

  // Configurar listeners
  useEffect(() => {
    // Verificar instalação
    checkIfInstalled();

    // Registrar Service Worker
    registerServiceWorker();

    // Listener para prompt de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaState(prev => ({ 
        ...prev, 
        installPrompt: e as PWAInstallPromptEvent,
        isInstallable: true 
      }));
    };

    // Listener para app instalado
    const handleAppInstalled = () => {
      setPwaState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        installPrompt: null,
        isInstallable: false 
      }));
    };

    // Listeners de conectividade
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Listeners de PWA
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIfInstalled, registerServiceWorker, updateOnlineStatus]);

  // Verificar atualizações periodicamente
  useEffect(() => {
    const interval = setInterval(checkForUpdates, 60000); // A cada minuto
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    ...pwaState,
    installPWA,
    updatePWA,
    registerServiceWorker,
  };
}

// Hook para notificações push
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, [isSupported]);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported || permission !== 'granted') return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
      });

      setSubscription(subscription);
      return subscription;
    } catch (error) {
      console.error('Erro ao inscrever em push notifications:', error);
      return null;
    }
  }, [isSupported, permission]);

  const unsubscribeFromPush = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
    }
  }, [subscription]);

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
}

// Hook para sincronização offline
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Processar ações pendentes quando voltar online
      processPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingAction = useCallback((action: any) => {
    setPendingActions(prev => [...prev, action]);
  }, []);

  const processPendingActions = useCallback(async () => {
    if (pendingActions.length === 0) return;

    try {
      // Processar cada ação pendente
      for (const action of pendingActions) {
        await action();
      }
      
      // Limpar ações processadas
      setPendingActions([]);
    } catch (error) {
      console.error('Erro ao processar ações pendentes:', error);
    }
  }, [pendingActions]);

  return {
    isOnline,
    pendingActions,
    addPendingAction,
    processPendingActions,
  };
}
