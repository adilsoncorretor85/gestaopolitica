import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';
import config from '@/config/env';

if (import.meta.env.DEV) {
  logger.info('Carregando configuração do Supabase');
}

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Função helper para garantir que o cliente Supabase existe
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

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