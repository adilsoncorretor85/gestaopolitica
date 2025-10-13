/**
 * Sistema de Analytics para o projeto
 */

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

interface UserProperties {
  userId?: string;
  userRole?: string;
  userPlan?: string;
}

class Analytics {
  private isEnabled: boolean;
  private events: AnalyticsEvent[] = [];
  private userProperties: UserProperties = {};

  constructor() {
    this.isEnabled = import.meta.env.PROD && import.meta.env.VITE_ANALYTICS_ENABLED === 'true';
  }

  /**
   * Identificar usuário
   */
  identify(userId: string, properties?: UserProperties) {
    if (!this.isEnabled) return;

    this.userProperties = { userId, ...properties };
    
    // Enviar para serviço de analytics
    this.sendEvent('user_identified', {
      userId,
      ...properties,
    });
  }

  /**
   * Rastrear evento
   */
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        userId: this.userProperties.userId,
        userRole: this.userProperties.userRole,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.events.push(event);
    this.sendEvent(eventName, event.properties || {});
  }

  /**
   * Rastrear página visitada
   */
  page(pageName: string, properties?: Record<string, any>) {
    this.track('page_view', {
      page: pageName,
      ...properties,
    });
  }

  /**
   * Rastrear erro
   */
  error(error: Error, context?: Record<string, any>) {
    this.track('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      ...context,
    });
  }

  /**
   * Rastrear performance
   */
  performance(metric: string, value: number, properties?: Record<string, any>) {
    this.track('performance_metric', {
      metric,
      value,
      ...properties,
    });
  }

  /**
   * Enviar evento para serviço externo
   */
  private async sendEvent(eventName: string, properties: Record<string, any>) {
    try {
      // Aqui você pode integrar com serviços como:
      // - Google Analytics
      // - Mixpanel
      // - Amplitude
      // - PostHog
      
      if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
        await fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: eventName,
            properties,
            timestamp: Date.now(),
          }),
        });
      }

      // Log local em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('📊 Analytics Event:', eventName, properties);
      }
    } catch (error) {
      console.error('Erro ao enviar evento de analytics:', error);
    }
  }

  /**
   * Obter eventos armazenados
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Limpar eventos
   */
  clearEvents() {
    this.events = [];
  }
}

// Instância singleton
export const analytics = new Analytics();

// Hooks para React
export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    page: analytics.page.bind(analytics),
    identify: analytics.identify.bind(analytics),
    error: analytics.error.bind(analytics),
    performance: analytics.performance.bind(analytics),
  };
};

// Eventos pré-definidos
export const AnalyticsEvents = {
  // Autenticação
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  
  // Navegação
  PAGE_VIEW: 'page_view',
  NAVIGATION: 'navigation',
  
  // Ações do usuário
  PERSON_CREATED: 'person_created',
  PERSON_UPDATED: 'person_updated',
  PERSON_DELETED: 'person_deleted',
  PERSON_SEARCHED: 'person_searched',
  
  LEADER_CREATED: 'leader_created',
  LEADER_UPDATED: 'leader_updated',
  LEADER_DELETED: 'leader_deleted',
  
  TAG_CREATED: 'tag_created',
  TAG_UPDATED: 'tag_updated',
  TAG_DELETED: 'tag_deleted',
  
  // Performance
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  BUNDLE_SIZE: 'bundle_size',
  
  // Erros
  ERROR_OCCURRED: 'error_occurred',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
  
  // Features
  FEATURE_USED: 'feature_used',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
} as const;


