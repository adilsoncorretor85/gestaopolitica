import { devLog } from '@/lib/logger';
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";
import config from "./config/env";

// Configurar React Query com cache otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (renomeado de cacheTime)
      retry: (failureCount, error: any) => {
        // Não tentar novamente para erros 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Configurar Sentry apenas em produção
if (config.app.isProd && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: config.app.isProd ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: config.app.isProd ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Filtrar eventos sensíveis
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.value?.includes('password') || error?.value?.includes('token')) {
          return null;
        }
      }
      return event;
    },
  });
}

// Registrar Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (import.meta.env.DEV) {
          console.log('SW registrado com sucesso:', registration);
        }
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.log('Falha ao registrar SW:', error);
        }
      });
  });
}

devLog('🔍 [main.tsx] Iniciando aplicação');

const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: ({ error, resetError }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 text-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Algo deu errado
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ocorreu um erro inesperado. Nossa equipe foi notificada.
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  ),
  beforeCapture: (scope, error, errorInfo) => {
    scope.setTag("errorBoundary", true);
    scope.setContext("errorInfo", errorInfo as any);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SentryApp />
    </QueryClientProvider>
  </React.StrictMode>
);