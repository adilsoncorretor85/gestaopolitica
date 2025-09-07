export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    role: 'ADMIN' | 'LEADER';
                    full_name: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    role: 'ADMIN' | 'LEADER';
                    full_name?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    role?: 'ADMIN' | 'LEADER';
                    full_name?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            leader_profiles: {
                Row: {
                    id: string;
                    email: string;
                    phone: string | null;
                    birth_date: string | null;
                    gender: string | null;
                    cep: string | null;
                    street: string | null;
                    number: string | null;
                    complement: string | null;
                    neighborhood: string | null;
                    city: string | null;
                    state: string | null;
                    notes: string | null;
                    status: string;
                    latitude: number | null;
                    longitude: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    phone?: string | null;
                    birth_date?: string | null;
                    gender?: string | null;
                    cep?: string | null;
                    street?: string | null;
                    number?: string | null;
                    complement?: string | null;
                    neighborhood?: string | null;
                    city?: string | null;
                    state?: string | null;
                    notes?: string | null;
                    status?: string;
                    latitude?: number | null;
                    longitude?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    phone?: string | null;
                    birth_date?: string | null;
                    gender?: string | null;
                    cep?: string | null;
                    street?: string | null;
                    number?: string | null;
                    complement?: string | null;
                    neighborhood?: string | null;
                    city?: string | null;
                    state?: string | null;
                    notes?: string | null;
                    status?: string;
                    latitude?: number | null;
                    longitude?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            people: {
                Row: {
                    id: string;
                    owner_id: string;
                    full_name: string;
                    whatsapp: string;
                    email: string | null;
                    facebook: string | null;
                    instagram: string | null;
                    cep: string | null;
                    street: string | null;
                    number: string | null;
                    complement: string | null;
                    neighborhood: string | null;
                    city: string | null;
                    state: string | null;
                    notes: string | null;
                    latitude: number | null;
                    longitude: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    owner_id: string;
                    full_name: string;
                    whatsapp: string;
                    email?: string | null;
                    facebook?: string | null;
                    instagram?: string | null;
                    cep?: string | null;
                    street?: string | null;
                    number?: string | null;
                    complement?: string | null;
                    neighborhood?: string | null;
                    city?: string | null;
                    state?: string | null;
                    notes?: string | null;
                    latitude?: number | null;
                    longitude?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    owner_id?: string;
                    full_name?: string;
                    whatsapp?: string;
                    email?: string | null;
                    facebook?: string | null;
                    instagram?: string | null;
                    cep?: string | null;
                    street?: string | null;
                    number?: string | null;
                    complement?: string | null;
                    neighborhood?: string | null;
                    city?: string | null;
                    state?: string | null;
                    notes?: string | null;
                    latitude?: number | null;
                    longitude?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            audit_logs: {
                Row: {
                    id: number;
                    table_name: string;
                    record_id: string | null;
                    action: 'CREATE' | 'UPDATE' | 'DELETE';
                    actor_id: string | null;
                    details: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    table_name: string;
                    record_id?: string | null;
                    action: 'CREATE' | 'UPDATE' | 'DELETE';
                    actor_id?: string | null;
                    details?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    table_name?: string;
                    record_id?: string | null;
                    action?: 'CREATE' | 'UPDATE' | 'DELETE';
                    actor_id?: string | null;
                    details?: Json | null;
                    created_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}
