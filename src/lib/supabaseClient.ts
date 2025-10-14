import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Valores padrão para fallback
const DEFAULT_SUPABASE_URL = 'https://ojxwwjurwhwtoydywvch.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeHd3anVyd2h3dG95ZHl3dmNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDMzMzUsImV4cCI6MjA3MTM3OTMzNX0.yYNiRdi0Ve9fzdAHGYsIi1iQf4Lredve3PMbRjw41BI';

// Cliente Supabase lazy (inicializado sob demanda)
let _supabase: SupabaseClient | null = null;

// Função para inicializar o cliente Supabase de forma segura
function createSupabaseClient(): SupabaseClient {
  try {
    // Tentar usar variáveis de ambiente diretamente primeiro
    const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    
    if (import.meta.env.DEV) {
      logger.info('Carregando configuração do Supabase');
    }
    
    return createClient(url, anonKey);
  } catch (error) {
    console.error('Erro ao inicializar Supabase:', error);
    // Fallback com valores diretos se tudo falhar
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
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