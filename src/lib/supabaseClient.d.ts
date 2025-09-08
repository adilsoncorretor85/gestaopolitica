import { type SupabaseClient } from '@supabase/supabase-js';
export declare const supabase: SupabaseClient | null;
export declare function getSupabaseClient(): SupabaseClient;
export declare function handleSupabaseError(error: any, context?: string): string;
