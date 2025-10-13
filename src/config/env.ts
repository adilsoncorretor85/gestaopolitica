/**
 * Configuração centralizada de variáveis de ambiente
 */

interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  googleMaps: {
    apiKey: string;
  };
  app: {
    isDev: boolean;
    isProd: boolean;
    isDebug: boolean;
    version: string;
  };
}

function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ${name} é obrigatória`);
  }
  return value;
}

function getConfig(): AppConfig {
  const env = import.meta.env;

  return {
    supabase: {
      url: validateEnvVar('VITE_SUPABASE_URL', env.VITE_SUPABASE_URL),
      anonKey: validateEnvVar('VITE_SUPABASE_ANON_KEY', env.VITE_SUPABASE_ANON_KEY),
    },
    googleMaps: {
      apiKey: validateEnvVar('VITE_GOOGLE_MAPS_API_KEY', env.VITE_GOOGLE_MAPS_API_KEY),
    },
    app: {
      isDev: env.DEV,
      isProd: env.PROD,
      isDebug: env.VITE_DEBUG === 'true',
      version: env.VITE_APP_VERSION || '1.0.0',
    },
  };
}

// Validar configuração na inicialização
let config: AppConfig;
try {
  config = getConfig();
} catch (error) {
  if (import.meta.env.DEV) {
    console.error('Erro na configuração:', error);
  }
  throw error;
}

export default config;


