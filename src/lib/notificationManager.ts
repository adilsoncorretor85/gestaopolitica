/**
 * Gerenciador de notificações push
 */

import { analytics } from './analytics';
import { structuredLogger } from './structuredLogger';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: any[]; // NotificationAction não existe no tipo padrão
  requireInteraction?: boolean;
  silent?: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class NotificationManager {
  private isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  private permission: NotificationPermission = 'default';
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.permission = Notification.permission;
    this.getServiceWorkerRegistration();
  }

  private async getServiceWorkerRegistration() {
    if ('serviceWorker' in navigator) {
      this.registration = await navigator.serviceWorker.ready;
    }
  }

  // Verificar se notificações são suportadas
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  // Solicitar permissão para notificações
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Notificações não são suportadas neste navegador');
    }

    try {
      this.permission = await Notification.requestPermission();
      
      structuredLogger.info('Permissão de notificação solicitada', {
        action: 'notification_permission_requested',
        metadata: { permission: this.permission },
      });

      analytics.track('notification_permission_requested', {
        permission: this.permission,
      });

      return this.permission;
    } catch (error) {
      structuredLogger.error('Erro ao solicitar permissão de notificação', error as Error, {
        action: 'notification_permission_error',
      });
      throw error;
    }
  }

  // Verificar se tem permissão
  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  // Enviar notificação local
  async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.hasPermission()) {
      throw new Error('Permissão para notificações não concedida');
    }

    if (!this.registration) {
      throw new Error('Service Worker não está registrado');
    }

    try {
      await this.registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        badge: options.badge || '/icon-192.png',
        tag: options.tag,
        data: options.data,
        // actions: options.actions, // Removido - não suportado em todos os browsers
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        // vibrate: [100, 50, 100], // Removido - não suportado em todos os browsers
      });

      structuredLogger.info('Notificação local enviada', {
        action: 'local_notification_sent',
        metadata: { title: options.title, tag: options.tag },
      });

      analytics.track('local_notification_sent', {
        title: options.title,
        tag: options.tag,
      });

    } catch (error) {
      structuredLogger.error('Erro ao enviar notificação local', error as Error, {
        action: 'local_notification_error',
        metadata: { title: options.title },
      });
      throw error;
    }
  }

  // Configurar notificações push
  async setupPushNotifications(): Promise<PushSubscription | null> {
    if (!this.hasPermission()) {
      throw new Error('Permissão para notificações não concedida');
    }

    if (!this.registration) {
      throw new Error('Service Worker não está registrado');
    }

    try {
      // Verificar se já existe uma subscription
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Criar nova subscription
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        if (!vapidPublicKey) {
          throw new Error('VAPID public key não configurada');
        }

        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as any,
        });
      }

      // Enviar subscription para o servidor
      await this.sendSubscriptionToServer(subscription as any);

      structuredLogger.info('Push notifications configuradas', {
        action: 'push_notifications_setup',
        metadata: { endpoint: subscription.endpoint },
      });

      analytics.track('push_notifications_setup', {
        endpoint: subscription.endpoint,
      });

      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
        },
      };

    } catch (error) {
      structuredLogger.error('Erro ao configurar push notifications', error as Error, {
        action: 'push_notifications_setup_error',
      });
      throw error;
    }
  }

  // Cancelar push notifications
  async unsubscribeFromPush(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker não está registrado');
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        structuredLogger.info('Push notifications canceladas', {
          action: 'push_notifications_unsubscribed',
        });

        analytics.track('push_notifications_unsubscribed');
      }
    } catch (error) {
      structuredLogger.error('Erro ao cancelar push notifications', error as Error, {
        action: 'push_notifications_unsubscribe_error',
      });
      throw error;
    }
  }

  // Enviar subscription para o servidor
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: this.arrayBufferToBase64((subscription as any).getKey('p256dh')!),
              auth: this.arrayBufferToBase64((subscription as any).getKey('auth')!),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar subscription: ${response.status}`);
      }

    } catch (error) {
      structuredLogger.error('Erro ao enviar subscription para servidor', error as Error, {
        action: 'subscription_server_error',
      });
      throw error;
    }
  }

  // Utilitários
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Notificações específicas do sistema
  async notifyPersonCreated(personName: string) {
    await this.showNotification({
      title: 'Nova pessoa cadastrada',
      body: `${personName} foi adicionado ao sistema`,
      tag: 'person-created',
      data: { type: 'person-created' },
    });
  }

  async notifyPersonUpdated(personName: string) {
    await this.showNotification({
      title: 'Pessoa atualizada',
      body: `Os dados de ${personName} foram atualizados`,
      tag: 'person-updated',
      data: { type: 'person-updated' },
    });
  }

  async notifyBirthdayReminder(personName: string) {
    await this.showNotification({
      title: 'Lembrete de aniversário',
      body: `Hoje é aniversário de ${personName}!`,
      tag: 'birthday-reminder',
      data: { type: 'birthday-reminder' },
      requireInteraction: true,
    });
  }

  async notifySyncComplete(syncedItems: number) {
    await this.showNotification({
      title: 'Sincronização concluída',
      body: `${syncedItems} itens foram sincronizados`,
      tag: 'sync-complete',
      data: { type: 'sync-complete' },
    });
  }
}

// Instância singleton
export const notificationManager = new NotificationManager();

// Hook para React
export const useNotificationManager = () => {
  const requestPermission = () => {
    return notificationManager.requestPermission();
  };

  const showNotification = (options: NotificationOptions) => {
    return notificationManager.showNotification(options);
  };

  const setupPushNotifications = () => {
    return notificationManager.setupPushNotifications();
  };

  const unsubscribeFromPush = () => {
    return notificationManager.unsubscribeFromPush();
  };

  const hasPermission = () => {
    return notificationManager.hasPermission();
  };

  const isSupported = () => {
    return notificationManager.isNotificationSupported();
  };

  return {
    requestPermission,
    showNotification,
    setupPushNotifications,
    unsubscribeFromPush,
    hasPermission,
    isSupported,
  };
};

