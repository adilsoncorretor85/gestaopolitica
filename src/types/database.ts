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
      election_settings: {
        Row: {
          id: string
          election_name: string
          election_date: string
          timezone: string
          election_type: string
          uf: string | null
          city: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          election_name: string
          election_date: string
          timezone?: string
          election_type: string
          uf?: string | null
          city?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          election_name?: string
          election_date?: string
          timezone?: string
          election_type?: string
          uf?: string | null
          city?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      city_goals: {
        Row: {
          id: string
          city: string
          state: string
          goal_total: number
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          city: string
          state: string
          goal_total: number
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          city?: string
          state?: string
          goal_total?: number
          deadline?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      neighborhood_goals: {
        Row: {
          id: string
          city: string
          state: string
          neighborhood: string
          goal_total: number
          city_goal_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          city: string
          state: string
          neighborhood: string
          goal_total: number
          city_goal_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          city?: string
          state?: string
          neighborhood?: string
          goal_total?: number
          city_goal_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leader_areas: {
        Row: {
          id: string
          leader_id: string
          city: string
          state: string
          neighborhood: string | null
          target: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          leader_id: string
          city: string
          state: string
          neighborhood?: string | null
          target?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          leader_id?: string
          city?: string
          state?: string
          neighborhood?: string | null
          target?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profile_leaderships: {
        Row: {
          id: string
          profile_id: string
          role_code: string
          level: number | null
          reach_scope: 'FAMILIA' | 'BAIRRO' | 'CIDADE' | 'REGIAO' | 'ONLINE' | null
          reach_size: number | null
          organization: string | null
          title: string | null
          extra: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role_code: string
          level?: number | null
          reach_scope?: 'FAMILIA' | 'BAIRRO' | 'CIDADE' | 'REGIAO' | 'ONLINE' | null
          reach_size?: number | null
          organization?: string | null
          title?: string | null
          extra?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          role_code?: string
          level?: number | null
          reach_scope?: 'FAMILIA' | 'BAIRRO' | 'CIDADE' | 'REGIAO' | 'ONLINE' | null
          reach_size?: number | null
          organization?: string | null
          title?: string | null
          extra?: Json
          created_at?: string
          updated_at?: string
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

export type ElectionSettings = Tables<'election_settings'>
export type ElectionSettingsInsert = TablesInsert<'election_settings'>
export type ElectionSettingsUpdate = TablesUpdate<'election_settings'>

export type CityGoal = Tables<'city_goals'>
export type CityGoalInsert = TablesInsert<'city_goals'>
export type CityGoalUpdate = TablesUpdate<'city_goals'>

export type NeighborhoodGoal = Tables<'neighborhood_goals'>
export type NeighborhoodGoalInsert = TablesInsert<'neighborhood_goals'>
export type NeighborhoodGoalUpdate = TablesUpdate<'neighborhood_goals'>

export type LeaderArea = Tables<'leader_areas'>
export type LeaderAreaInsert = TablesInsert<'leader_areas'>
export type LeaderAreaUpdate = TablesUpdate<'leader_areas'>

export type ProfileLeadership = Tables<'profile_leaderships'>
export type ProfileLeadershipInsert = TablesInsert<'profile_leaderships'>
export type ProfileLeadershipUpdate = TablesUpdate<'profile_leaderships'>