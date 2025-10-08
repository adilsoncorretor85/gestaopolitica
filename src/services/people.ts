import { devLog } from '@/lib/logger';
import { getSupabaseClient, handleSupabaseError } from "@/lib/supabaseClient";
import type { Person, PersonInsert, PersonUpdate } from '@/types/database';
import { searchPeople } from './searchPeople';
import { ESTADOS_BRASIL } from '@/data/estadosBrasil';
import { Tag } from './tags';

export type { Person, PersonInsert, PersonUpdate };

// Interface estendida para Person com tags
export interface PersonWithTags extends Person {
  tags?: Tag[];
}

// Interface para criação de pessoa com tags
export interface PersonInsertWithTags extends PersonInsert {
  tagIds?: string[];
}

// Interface para atualização de pessoa com tags
export interface PersonUpdateWithTags extends PersonUpdate {
  tagIds?: string[];
}

// Função para verificar duplicatas no frontend (validação em tempo real)
export async function checkWhatsAppDuplicate(whatsapp: string, currentPersonId?: string): Promise<{ isDuplicate: boolean; message?: string }> {
  try {
    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
      return { isDuplicate: false };
    }
    
    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');
    const supabase = getSupabaseClient();
    
    // Buscar pessoa existente com informações do owner
    const { data: existingPerson, error } = await supabase
      .from("people")
      .select(`
        id,
        whatsapp,
        full_name,
        owner:profiles!owner_id(
          id,
          full_name,
          role
        )
      `)
      .eq('whatsapp', normalizedWhatsapp)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao verificar duplicata:', error);
      return { isDuplicate: false };
    }
    
    // Se encontrou uma pessoa e não é a mesma que está sendo editada
    if (existingPerson && existingPerson.id !== currentPersonId) {
      const roleText = existingPerson.owner?.role === 'ADMIN' ? 'administrador' : 'líder';
      return {
        isDuplicate: true,
        message: `Já existe uma pessoa cadastrada com este WhatsApp pelo ${roleText} ${existingPerson.owner?.full_name || 'usuário'}.`
      };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error('Erro ao verificar duplicata:', error);
    return { isDuplicate: false };
  }
}

// Função para normalizar estado (UF ou nome) para UF
function toUF(s?: string | null): string | null {
  if (!s) return null;
  const txt = s.trim();
  devLog('🔍 toUF - Normalizando estado:', { original: s, trimmed: txt });
  
  const hit = ESTADOS_BRASIL.find(
    e => e.sigla.toLowerCase() === txt.toLowerCase() || e.nome.toLowerCase() === txt.toLowerCase()
  );
  
  const result = hit ? hit.sigla : null;
  devLog('🔍 toUF - Resultado:', { found: !!hit, result, estado: hit });
  
  return result;
}

export async function listPeople(params?: {
  leaderId?: string;
  q?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  state?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'full_name' | 'created_at' | 'city' | 'state';
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    devLog('🔍 listPeople - Parâmetros recebidos:', params);
    const supabase = getSupabaseClient();

    const page = params?.page ?? 1, size = params?.pageSize ?? 20;
    const sortBy = params?.sortBy ?? 'full_name';
    const sortOrder = params?.sortOrder ?? 'asc';
    
    // Se há busca por texto, tentar FTS primeiro, depois fallback
    if (params?.q && params.q.trim()) {
      devLog('[listPeople] Realizando busca para:', params.q);
      
      try {
        const offset = (page - 1) * size;
        const ftsResults = await searchPeople(supabase, params.q, size, offset);
        devLog('[listPeople] Resultados FTS:', ftsResults.length);
        
        // Buscar dados completos das pessoas encontradas
        if (ftsResults.length > 0) {
          const ids = ftsResults.map(r => r.id);
          let query = supabase.from("people").select("*", { count: "exact" })
            .in("id", ids);

          if (params?.leaderId) query = query.eq("owner_id", params.leaderId);
          if (params?.city) {
            // Busca por cidade usando ILIKE
            query = query.ilike("city", `%${params.city}%`);
          }
          if (params?.neighborhood) {
            // Busca por bairro usando ILIKE
            query = query.ilike("neighborhood", `%${params.neighborhood}%`);
          }
          if (params?.street) {
            // Busca por rua usando ILIKE
            query = query.ilike("street", `%${params.street}%`);
          }
          if (params?.state) {
            const uf = params.state.toUpperCase();
            const est = ESTADOS_BRASIL.find(e =>
              e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
            );
            // Buscar tanto por UF quanto por nome completo
            if (est) {
              devLog('🔍 listPeople - Filtro de estado (FTS):', { original: params.state, uf, est });
              query = query.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
            } else {
              devLog('🔍 listPeople - Filtro de estado (FTS) - estado não encontrado:', params.state);
              query = query.ilike("state", `%${params.state}%`);
            }
          }

          const { data, error, count } = await query;
          
          if (error) {
            throw new Error(handleSupabaseError(error, 'listar pessoas'));
          }

          // Ordenar pelos resultados do FTS (por rank)
          const sortedData = data ? data.sort((a, b) => {
            const aRank = ftsResults.find(r => r.id === a.id)?.rank || 0;
            const bRank = ftsResults.find(r => r.id === b.id)?.rank || 0;
            return bRank - aRank; // Maior rank primeiro
          }) : [];

          devLog('[listPeople] Dados ordenados por FTS:', sortedData.length);
          return { data: sortedData, error: null, count };
        } else {
          devLog('[listPeople] Nenhum resultado FTS, tentando busca simples como fallback');
          // Fallback: busca simples com ILIKE quando FTS não encontra resultados
          const offset = (page - 1) * size;
          let query = supabase.from("people")
            .select("*", { count: "exact" })
            .ilike("full_name", `%${params.q}%`)
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range(offset, offset + size - 1);

          if (params?.leaderId) query = query.eq("owner_id", params.leaderId);
          if (params?.city) {
            query = query.ilike("city", `%${params.city}%`);
          }
          if (params?.neighborhood) {
            query = query.ilike("neighborhood", `%${params.neighborhood}%`);
          }
          if (params?.street) {
            query = query.ilike("street", `%${params.street}%`);
          }
          if (params?.state) {
            const uf = params.state.toUpperCase();
            const est = ESTADOS_BRASIL.find(e =>
              e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
            );
            if (est) {
              devLog('🔍 listPeople - Filtro de estado (fallback):', { original: params.state, uf, est });
              query = query.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
            } else {
              devLog('🔍 listPeople - Filtro de estado (fallback) - estado não encontrado:', params.state);
              query = query.ilike("state", `%${params.state}%`);
            }
          }

          const { data, error, count } = await query;
          
          if (error) {
            throw new Error(handleSupabaseError(error, 'listar pessoas'));
          }

          devLog('[listPeople] Resultados fallback:', data?.length || 0);
          return { data: data || [], error: null, count };
        }
      } catch (ftsError) {
        console.error('[listPeople] Erro no FTS, tentando busca simples:', ftsError);
        
        // Fallback: busca simples com ILIKE
        const offset = (page - 1) * size;
        let query = supabase.from("people")
          .select("*", { count: "exact" })
          .ilike("full_name", `%${params.q}%`)
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(offset, offset + size - 1);

        if (params?.leaderId) query = query.eq("owner_id", params.leaderId);
        if (params?.city) {
          // Busca por cidade usando ILIKE
          query = query.ilike("city", `%${params.city}%`);
        }
        if (params?.neighborhood) {
          // Busca por bairro usando ILIKE
          query = query.ilike("neighborhood", `%${params.neighborhood}%`);
        }
        if (params?.street) {
          // Busca por rua usando ILIKE
          query = query.ilike("street", `%${params.street}%`);
        }
        if (params?.state) {
          const uf = params.state.toUpperCase();
          const est = ESTADOS_BRASIL.find(e =>
            e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
          );
          // Buscar tanto por UF quanto por nome completo
          if (est) {
            devLog('🔍 listPeople - Filtro de estado (fallback):', { original: params.state, uf, est });
            query = query.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
          } else {
            devLog('🔍 listPeople - Filtro de estado (fallback) - estado não encontrado:', params.state);
            query = query.ilike("state", `%${params.state}%`);
          }
        }

        const { data, error, count } = await query;
        
        if (error) {
          throw new Error(handleSupabaseError(error, 'listar pessoas'));
        }

        devLog('[listPeople] Fallback executado com sucesso:', data?.length || 0);
        return { data, error: null, count };
      }
    }
    
    // Busca normal sem texto (listagem padrão)
    let q = supabase.from("people").select("*", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page-1)*size, page*size - 1);

    if (params?.leaderId) q = q.eq("owner_id", params.leaderId);
    if (params?.city) {
      // Busca por cidade usando ILIKE
      q = q.ilike("city", `%${params.city}%`);
    }
    if (params?.neighborhood) {
      // Busca por bairro usando ILIKE
      q = q.ilike("neighborhood", `%${params.neighborhood}%`);
    }
    if (params?.street) {
      // Busca por rua usando ILIKE
      q = q.ilike("street", `%${params.street}%`);
    }
    if (params?.state) {
      const uf = params.state.toUpperCase();
      const est = ESTADOS_BRASIL.find(e =>
        e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
      );
      // Buscar tanto por UF quanto por nome completo
      if (est) {
        devLog('🔍 listPeople - Filtro de estado (normal):', { original: params.state, uf, est });
        q = q.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
      } else {
        devLog('🔍 listPeople - Filtro de estado (normal) - estado não encontrado:', params.state);
        q = q.ilike("state", `%${params.state}%`);
      }
    }

    const { data, error, count } = await q;
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'listar pessoas'));
    }

    devLog('🔍 listPeople - Resultado final:', { count: count || 0, dataLength: data?.length || 0 });
    
    return { data, error: null, count };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      count: 0
    };
  }
}

export async function getPerson(id: string): Promise<{ data: PersonWithTags | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle(); // 👈 evita erro "0 rows"
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'buscar pessoa'));
    }
    
    if (!data) {
      return { data: null, error: null };
    }
    
    // Buscar tags da pessoa
    try {
      const { data: tagsData, error: tagsError } = await supabase.rpc('get_person_tags', {
        person_id: id
      });
      
      if (tagsError) {
        devLog('Erro ao buscar tags da pessoa:', tagsError);
      }
      
      return { 
        data: { 
          ...data, 
          tags: tagsData || [] 
        }, 
        error: null 
      };
    } catch (tagsError) {
      devLog('Erro ao buscar tags da pessoa:', tagsError);
      return { data, error: null };
    }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Função para verificar se pessoa já existe e buscar informações do líder
async function checkExistingPerson(whatsapp: string, phone: string): Promise<{ exists: boolean; ownerName?: string; ownerRole?: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // Normalizar números para busca
    const normalizedWhatsapp = whatsapp?.replace(/\D/g, '') || '';
    const normalizedPhone = phone?.replace(/\D/g, '') || '';
    
    if (!normalizedWhatsapp && !normalizedPhone) {
      return { exists: false };
    }
    
    // Buscar pessoa existente com informações do owner
    const query = supabase
      .from("people")
      .select(`
        id,
        whatsapp,
        full_name,
        owner:profiles!owner_id(
          id,
          full_name,
          role
        )
      `);
    
    // Buscar por WhatsApp normalizado
    if (normalizedWhatsapp) {
      query.eq('whatsapp', normalizedWhatsapp);
    } else if (normalizedPhone) {
      query.eq('whatsapp', normalizedPhone);
    }
    
    const { data, error } = await query.limit(1).maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar pessoa existente:', error);
      return { exists: false };
    }
    
    if (data && data.owner) {
      // Tratar tanto array quanto objeto único
      const owner = Array.isArray(data.owner) ? data.owner[0] : data.owner;
      
      return {
        exists: true,
        ownerName: owner?.full_name || 'Usuário',
        ownerRole: owner?.role || 'LEADER'
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Erro na verificação de pessoa existente:', error);
    return { exists: false };
  }
}

export async function createPerson(p: PersonInsertWithTags): Promise<{ data: PersonWithTags | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();

    // Get current user to set owner_id automatically
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    // Validação proativa: verificar se já existe pessoa com o mesmo WhatsApp
    if (p.whatsapp) {
      const normalizedWhatsapp = p.whatsapp.replace(/\D/g, '');
      if (normalizedWhatsapp.length >= 10) {
        const existingInfo = await checkExistingPerson(normalizedWhatsapp, '');
        
        if (existingInfo.exists) {
          const roleText = existingInfo.ownerRole === 'ADMIN' ? 'administrador' : 'líder';
          throw new Error(`Já existe uma pessoa cadastrada com este WhatsApp pelo ${roleText} ${existingInfo.ownerName}.`);
        }
      }
    }
    
    // Set owner_id to current user and normalize state
    const personWithOwner = { ...p, owner_id: user.id, state: toUF(p.state) };
    
    const { data, error } = await supabase
      .from("people")
      .insert({
        ...personWithOwner,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
      })
      .select('*')
      .maybeSingle(); // 👈 evita erro "0 rows"
    
    if (error) {
      const errorMessage = handleSupabaseError(error, 'criar pessoa');
      
      // Se for erro de duplicação, buscar informações do líder que já cadastrou
      if (errorMessage === 'DUPLICATE_ENTRY') {
        const existingInfo = await checkExistingPerson(p.whatsapp || '', p.phone || '');
        
        if (existingInfo.exists && existingInfo.ownerName) {
          const roleText = existingInfo.ownerRole === 'ADMIN' ? 'administrador' : 'líder';
          throw new Error(`Esta pessoa já foi cadastrada pelo ${roleText} ${existingInfo.ownerName}.`);
        } else {
          throw new Error('Esta pessoa já foi cadastrada por outro usuário.');
        }
      }
      
      throw new Error(errorMessage);
    }
    
    if (!data) {
      return { data: null, error: 'Erro ao criar pessoa' };
    }
    
    // Aplicar tags se fornecidas
    if (p.tagIds && p.tagIds.length > 0) {
      try {
        for (const tagId of p.tagIds) {
          const { error: tagError } = await supabase.rpc('apply_tag_to_person', {
            p_person_id: data.id,
            p_tag_id: tagId
          });
          
          if (tagError) {
            devLog('Erro ao aplicar tag:', tagError);
            // Não falha a criação da pessoa se a tag falhar
          }
        }
      } catch (tagError) {
        devLog('Erro ao aplicar tags:', tagError);
        // Não falha a criação da pessoa se as tags falharem
      }
    }
    
    // Buscar tags aplicadas para retornar
    let tags: Tag[] = [];
    try {
      const { data: tagsData, error: tagsError } = await supabase.rpc('get_person_tags', {
        person_id: data.id
      });
      
      if (tagsError) {
        devLog('Erro ao buscar tags da pessoa:', tagsError);
      } else {
        tags = tagsData || [];
      }
    } catch (tagsError) {
      devLog('Erro ao buscar tags da pessoa:', tagsError);
    }
    
    return { data: { ...data, tags }, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function updatePerson(id: string, p: PersonUpdateWithTags): Promise<{ data: PersonWithTags | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
    // Validação proativa: verificar se já existe pessoa com o mesmo WhatsApp (exceto a própria pessoa)
    if (p.whatsapp) {
      const normalizedWhatsapp = p.whatsapp.replace(/\D/g, '');
      if (normalizedWhatsapp.length >= 10) {
        const existingInfo = await checkExistingPerson(normalizedWhatsapp, '');
        
        if (existingInfo.exists) {
          // Verificar se não é a própria pessoa sendo atualizada
          const { data: currentPerson } = await supabase
            .from("people")
            .select("whatsapp")
            .eq("id", id)
            .single();
          
          const currentWhatsapp = currentPerson?.whatsapp?.replace(/\D/g, '');
          
          if (currentWhatsapp !== normalizedWhatsapp) {
            const roleText = existingInfo.ownerRole === 'ADMIN' ? 'administrador' : 'líder';
            throw new Error(`Já existe uma pessoa cadastrada com este WhatsApp pelo ${roleText} ${existingInfo.ownerName}.`);
          }
        }
      }
    }
    
    const payload = { ...p, state: toUF(p.state ?? null) };
    
    const { data, error } = await supabase
      .from("people")
      .update({
        ...payload,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
      })
      .eq("id", id)
      .select('*')
      .maybeSingle(); // 👈 evita erro "0 rows"
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'atualizar pessoa'));
    }
    
    if (!data) {
      return { data: null, error: 'Pessoa não encontrada' };
    }
    
    // Atualizar tags se fornecidas
    if (p.tagIds !== undefined) {
      try {
        // Primeiro, remover todas as tags existentes
        const { error: removeError } = await supabase
          .from('people_tags')
          .delete()
          .eq('person_id', id);
        
        if (removeError) {
          devLog('Erro ao remover tags existentes:', removeError);
        }
        
        // Depois, aplicar as novas tags
        if (p.tagIds.length > 0) {
          for (const tagId of p.tagIds) {
            const { error: tagError } = await supabase.rpc('apply_tag_to_person', {
              p_person_id: id,
              p_tag_id: tagId
            });
            
            if (tagError) {
              devLog('Erro ao aplicar tag:', tagError);
              // Não falha a atualização da pessoa se a tag falhar
            }
          }
        }
      } catch (tagError) {
        devLog('Erro ao atualizar tags:', tagError);
        // Não falha a atualização da pessoa se as tags falharem
      }
    }
    
    // Buscar tags aplicadas para retornar
    let tags: Tag[] = [];
    try {
      const { data: tagsData, error: tagsError } = await supabase.rpc('get_person_tags', {
        person_id: id
      });
      
      if (tagsError) {
        devLog('Erro ao buscar tags da pessoa:', tagsError);
      } else {
        tags = tagsData || [];
      }
    } catch (tagsError) {
      devLog('Erro ao buscar tags da pessoa:', tagsError);
    }
    
    return { data: { ...data, tags }, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function deletePerson(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("people").delete().eq("id", id);
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'deletar pessoa'));
    }
    
    return { error: null };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}