export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'ADMIN' | 'LEADER'
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'ADMIN' | 'LEADER'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'ADMIN' | 'LEADER'
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leader_profiles: {
        Row: {
          id: string
          email: string
          phone: string | null
          birth_date: string | null
          gender: string | null
          cep: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          notes: string | null
          status: string
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          phone?: string | null
          birth_date?: string | null
          gender?: string | null
          cep?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          notes?: string | null
          status?: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          birth_date?: string | null
          gender?: string | null
          cep?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          notes?: string | null
          status?: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      people: {
        Row: {
          id: string
          owner_id: string
          full_name: string
          whatsapp: string
          email: string | null
          facebook: string | null
          instagram: string | null
          cep: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          notes: string | null
          latitude: number | null
          longitude: number | null
          vote_status: string | null
          contacted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          full_name: string
          whatsapp: string
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          cep?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          notes?: string | null
          latitude?: number | null
          longitude?: number | null
          vote_status?: string | null
          contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          full_name?: string
          whatsapp?: string
          email?: string | null
          facebook?: string | null
          instagram?: string | null
          cep?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          notes?: string | null
          latitude?: number | null
          longitude?: number | null
          vote_status?: string | null
          contacted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: number
          table_name: string
          record_id: string | null
          action: 'CREATE' | 'UPDATE' | 'DELETE'
          actor_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          table_name: string
          record_id?: string | null
          action: 'CREATE' | 'UPDATE' | 'DELETE'
          actor_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          table_name?: string
          record_id?: string | null
          action?: 'CREATE' | 'UPDATE' | 'DELETE'
          actor_id?: string | null
          details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares para compatibilidade
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Tipos específicos para facilitar o uso
export type Person = Tables<'people'>
export type PersonInsert = TablesInsert<'people'>
export type PersonUpdate = TablesUpdate<'people'>

export type LeaderProfile = Tables<'leader_profiles'>
export type LeaderProfileInsert = TablesInsert<'leader_profiles'>
export type LeaderProfileUpdate = TablesUpdate<'leader_profiles'>

export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>