import { createClient, type SupabaseClient } from '@supabase/supabase-js';

console.log('🔍 [supabaseClient] Carregando configuração do Supabase');

// Em Vite, use import.meta.env (NÃO use process.env)
const env = import.meta.env;

const url  = env?.VITE_SUPABASE_URL as string | undefined;
const anon = env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// Logs de diagnóstico removidos por segurança

if (!url || !anon) {
  console.error('ENV faltando: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env na RAIZ do projeto.');
  console.error('URL:', url);
  console.error('ANON:', anon ? 'definida' : 'não definida');
}

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

// Função helper para garantir que o cliente Supabase existe
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client não foi inicializado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

// Função helper para tratamento seguro de erros do Supabase
export function handleSupabaseError(error: any, context: string = 'operação'): string {
  if (!error) return 'Erro desconhecido';
  
  // Log detalhado apenas em desenvolvimento
  if (import.meta.env.DEV) {
    console.error(`[${context}] Erro Supabase:`, error);
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