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
    // Em produção, usar valores padrão se não estiverem definidos
    if (import.meta.env.PROD) {
      console.warn(`Variável de ambiente ${name} não definida, usando valor padrão`);
      // Valores padrão para produção (você deve configurar no Netlify)
      const defaults: Record<string, string> = {
        'VITE_SUPABASE_URL': 'https://ojxwwjurwhwtoydywvch.supabase.co',
        'VITE_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI',
        'VITE_GOOGLE_MAPS_API_KEY': 'AIzaSyDGJnbNad10CANDkpLAqVy7c3fSV0V3SK8'
      };
      return defaults[name] || '';
    }
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


