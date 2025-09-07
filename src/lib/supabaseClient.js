import { createClient } from '@supabase/supabase-js';
// Em Vite, use import.meta.env (NÃO use process.env)
const env = import.meta.env ?? import.meta.env;
const url = env?.VITE_SUPABASE_URL;
const anon = env?.VITE_SUPABASE_ANON_KEY;
// Logs de diagnóstico removidos por segurança
if (!url || !anon) {
    console.error('ENV faltando: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env na RAIZ do projeto.');
}
export const supabase = url && anon ? createClient(url, anon) : null;
// Função helper para garantir que o cliente Supabase existe
export function getSupabaseClient() {
    if (!supabase) {
        throw new Error('Supabase client não foi inicializado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    }
    return supabase;
}
