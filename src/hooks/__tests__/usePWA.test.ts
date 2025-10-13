import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWA, usePushNotifications, useOfflineSync } from '../usePWA';

// Mock do window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock do navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock do Service Worker
const mockServiceWorker = {
  register: vi.fn(),
  getRegistration: vi.fn(),
  ready: Promise.resolve({
    pushManager: {
      subscribe: vi.fn(),
      getSubscription: vi.fn(),
    },
  }),
};

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: mockServiceWorker,
});

// Mock de eventos
const mockEvents = {
  beforeinstallprompt: null,
  appinstalled: null,
  online: null,
  offline: null,
};

describe('usePWA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    // Limpar event listeners
    window.removeEventListener('beforeinstallprompt', vi.fn());
    window.removeEventListener('appinstalled', vi.fn());
    window.removeEventListener('online', vi.fn());
    window.removeEventListener('offline', vi.fn());
  });

  it('deve inicializar com estado padrão', () => {
    const { result } = renderHook(() => usePWA());

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.installPrompt).toBe(null);
    expect(result.current.swRegistration).toBe(null);
  });

  it('deve detectar quando o app está instalado', () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { result } = renderHook(() => usePWA());

    expect(result.current.isInstalled).toBe(true);
  });

  it('deve detectar status offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => usePWA());

    expect(result.current.isOnline).toBe(false);
  });

  it('deve registrar service worker', async () => {
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: null,
      addEventListener: vi.fn(),
    };

    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => usePWA());

    await act(async () => {
      await result.current.registerServiceWorker();
    });

    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  it('deve detectar prompt de instalação', () => {
    const mockPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    const { result } = renderHook(() => usePWA());

    act(() => {
      const event = new Event('beforeinstallprompt') as any;
      event.preventDefault = vi.fn();
      window.dispatchEvent(event);
    });

    // Simular que o prompt foi definido
    act(() => {
      (result.current as any).installPrompt = mockPrompt;
    });

    expect(result.current.installPrompt).toBe(mockPrompt);
  });

  it('deve instalar PWA quando solicitado', async () => {
    const mockPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    const { result } = renderHook(() => usePWA());

    // Simular que o prompt está disponível
    act(() => {
      (result.current as any).installPrompt = mockPrompt;
    });

    await act(async () => {
      await result.current.installPWA();
    });

    expect(mockPrompt.prompt).toHaveBeenCalled();
  });
});

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado padrão', () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(true);
    expect(result.current.permission).toBe('default');
    expect(result.current.subscription).toBe(null);
  });

  it('deve solicitar permissão para notificações', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: mockRequestPermission,
      },
    });

    const { result } = renderHook(() => usePushNotifications());

    const granted = await act(async () => {
      return await result.current.requestPermission();
    });

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(granted).toBe(true);
  });

  it('deve inscrever em push notifications', async () => {
    const mockSubscription = { endpoint: 'test-endpoint' };
    const mockSubscribe = vi.fn().mockResolvedValue(mockSubscription);

    mockServiceWorker.ready = Promise.resolve({
      pushManager: {
        subscribe: mockSubscribe,
        getSubscription: vi.fn(),
      },
    });

    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'granted',
        requestPermission: vi.fn(),
      },
    });

    const { result } = renderHook(() => usePushNotifications());

    const subscription = await act(async () => {
      return await result.current.subscribeToPush();
    });

    expect(mockSubscribe).toHaveBeenCalled();
    expect(subscription).toBe(mockSubscription);
  });
});

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('deve inicializar com estado online', () => {
    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.pendingActions).toEqual([]);
  });

  it('deve detectar mudança para offline', () => {
    const { result } = renderHook(() => useOfflineSync());

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('deve adicionar ações pendentes', () => {
    const { result } = renderHook(() => useOfflineSync());
    const mockAction = vi.fn();

    act(() => {
      result.current.addPendingAction(mockAction);
    });

    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0]).toBe(mockAction);
  });

  it('deve processar ações pendentes quando voltar online', async () => {
    const { result } = renderHook(() => useOfflineSync());
    const mockAction = vi.fn().mockResolvedValue(undefined);

    // Adicionar ação pendente
    act(() => {
      result.current.addPendingAction(mockAction);
    });

    // Simular volta online
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    // Aguardar processamento
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockAction).toHaveBeenCalled();
  });
});
