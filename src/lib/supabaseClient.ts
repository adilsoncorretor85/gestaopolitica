import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Valores padrão para fallback (LOCAL) - SEM CHAVES HARDCODED
const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321';
const DEFAULT_SUPABASE_ANON_KEY = ''; // Não expor chaves no código!

// Cliente Supabase lazy (inicializado sob demanda)
let _supabase: SupabaseClient | null = null;

// Função para inicializar o cliente Supabase de forma segura
function createSupabaseClient(): SupabaseClient {
  try {
    // OBRIGATÓRIO: usar apenas variáveis de ambiente
    const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    
    // Validações de segurança
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      throw new Error(`[Supabase] URL inválida: "${url}". Use uma URL válida do Supabase.`);
    }
    if (!anonKey) {
      throw new Error('[Supabase] ANON KEY ausente.');
    }
    if (anonKey.startsWith('sb_publishable_')) {
      throw new Error("[Supabase] No local, NÃO use 'sb_publishable_*'. Use a ANON (JWT que começa com 'eyJ').");
    }
    
    if (import.meta.env.DEV) {
      logger.info('Carregando configuração do Supabase');
      console.info('[SB URL]', url);
      console.info('[SB KEY]', anonKey.slice(0, 10) + '...'); // Log do prefixo da chave
    }
    
    return createClient(url, anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  } catch (error) {
    console.error('Erro ao inicializar Supabase:', error);
    throw new Error('Falha ao inicializar Supabase. Verifique as variáveis de ambiente.');
  }
}

// Função para obter o cliente Supabase (lazy initialization)
export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient();
  }
  return _supabase;
}

// Export para compatibilidade (mas usar getSupabaseClient() é preferível)
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient];
  }
});


// Função helper para tratamento seguro de erros do Supabase
export function handleSupabaseError(error: any, context: string = 'operação'): string {
  if (!error) return 'Erro desconhecido';
  
  // Log detalhado apenas em desenvolvimento
  if (import.meta.env.DEV) {
    logger.error(`[${context}] Erro Supabase:`, error);
  }
  
  // Mensagens seguras para o usuário (não vazam estrutura interna)
  if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
    return 'Sem permissão para este recurso. Peça acesso ao administrador.';
  }
  
  if (error.code === 'PGRST116' || error.message?.includes('not found')) {
    return 'Recurso não encontrado.';
  }
  
  // Tratamento específico para erros de duplicação/constraint
  if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
    return 'DUPLICATE_ENTRY'; // Código especial para tratamento específico
  }
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  if (error.message?.includes('timeout')) {
    return 'Operação demorou muito para responder. Tente novamente.';
  }
  
  // Erro genérico para casos não mapeados
  return 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.';
}