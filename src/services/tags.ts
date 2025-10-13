import { supabase, handleSupabaseError } from '../lib/supabaseClient';
import { devLog } from '../lib/logger';

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_sensitive: boolean;
  is_active: boolean;
  usage_count?: number;
}

export interface PersonTag {
  id: string;
  person_id: string;
  tag_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonWithTags {
  id: string;
  owner_id: string;
  full_name: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  vote_status?: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  total_count: number;
}

export interface SearchPeopleParams {
  q?: string;
  tag_ids?: string[];
  mode?: 'ANY' | 'ALL';
  limit?: number;
  offset?: number;
}

// Interfaces para administração
export interface CreateTagParams {
  name: string;
  description?: string;
  color?: string;
  is_sensitive?: boolean;
}

export interface UpdateTagParams extends CreateTagParams {
  id: string;
}

export interface AdminTag extends Tag {
  usage_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const tagsService = {
  // Buscar todas as tags disponíveis
  async getAvailableTags(): Promise<Tag[]> {
    const { data, error } = await supabase.rpc('get_available_tags');
    
    if (error) {
      const errorMessage = handleSupabaseError(error, 'buscar tags');
      devLog('❌ Erro ao buscar tags:', error);
      throw new Error(errorMessage);
    }
    
    return data || [];
  },

  // Buscar pessoas com tags
  async searchPeopleWithTags(params: SearchPeopleParams = {}): Promise<PersonWithTags[]> {
    const { data, error } = await supabase.rpc('search_people_with_tags', {
      q: params.q || '',
      tag_ids: params.tag_ids || [],
      mode: params.mode || 'ANY',
      p_limit: params.limit || 50,
      p_offset: params.offset || 0
    });
    
    if (error) {
      console.error('Erro ao buscar pessoas com tags:', error);
      throw error;
    }
    
    return data || [];
  },

  // Aplicar tag a uma pessoa
  async applyTagToPerson(personId: string, tagId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('apply_tag_to_person', {
      p_person_id: personId,
      p_tag_id: tagId
    });
    
    if (error) {
      console.error('Erro ao aplicar tag:', error);
      return { success: false, error: error.message };
    }
    
    return data || { success: false, error: 'Erro desconhecido' };
  },

  // Remover tag de uma pessoa
  async removeTagFromPerson(personId: string, tagId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('remove_tag_from_person', {
      p_person_id: personId,
      p_tag_id: tagId
    });
    
    if (error) {
      console.error('Erro ao remover tag:', error);
      return { success: false, error: error.message };
    }
    
    return data || { success: false, error: 'Erro desconhecido' };
  },

  // Buscar tags de uma pessoa específica
  async getPersonTags(personId: string): Promise<Tag[]> {
    const { data, error } = await supabase.rpc('get_person_tags', {
      person_id: personId
    });
    
    if (error) {
      console.error('Erro ao buscar tags da pessoa:', error);
      throw error;
    }
    
    return data || [];
  },

  // === FUNÇÕES ADMINISTRATIVAS (apenas para admins) ===

  // Buscar todas as tags para administração (incluindo inativas)
  async getAllTagsAdmin(): Promise<AdminTag[]> {
    const { data, error } = await supabase.rpc('get_all_tags_admin');
    
    if (error) {
      console.error('Erro ao buscar tags administrativas:', error);
      throw error;
    }
    
    return data || [];
  },

  // Criar nova tag
  async createTag(params: CreateTagParams): Promise<{ success: boolean; error?: string; tagId?: string }> {
    const { data, error } = await supabase.rpc('create_tag', {
      p_name: params.name,
      p_description: params.description || '',
      p_color: params.color || '#808080',
      p_is_sensitive: params.is_sensitive || false
    });
    
    if (error) {
      console.error('Erro ao criar tag:', error);
      return { success: false, error: error.message };
    }
    
    return data || { success: false, error: 'Erro desconhecido' };
  },

  // Editar tag existente
  async updateTag(params: UpdateTagParams): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('update_tag', {
      p_tag_id: params.id,
      p_name: params.name,
      p_description: params.description || '',
      p_color: params.color || '#808080',
      p_is_sensitive: params.is_sensitive || false
    });
    
    if (error) {
      console.error('Erro ao editar tag:', error);
      return { success: false, error: error.message };
    }
    
    return data || { success: false, error: 'Erro desconhecido' };
  },

  // Excluir tag
  async deleteTag(tagId: string): Promise<{ success: boolean; error?: string; usageCount?: number }> {
    const { data, error } = await supabase.rpc('delete_tag', {
      p_tag_id: tagId
    });
    
    if (error) {
      console.error('Erro ao excluir tag:', error);
      return { success: false, error: error.message };
    }
    
    return data || { success: false, error: 'Erro desconhecido' };
  }
};
