import { getSupabaseClient, handleSupabaseError } from "@/lib/supabaseClient";
import type { Person, PersonInsert, PersonUpdate } from '@/types/database';
import { searchPeople } from './searchPeople';
import { ESTADOS_BRASIL } from '@/data/estadosBrasil';

export type { Person, PersonInsert, PersonUpdate };

// Função para normalizar estado (UF ou nome) para UF
function toUF(s?: string | null): string | null {
  if (!s) return null;
  const txt = s.trim();
  const hit = ESTADOS_BRASIL.find(
    e => e.sigla.toLowerCase() === txt.toLowerCase() || e.nome.toLowerCase() === txt.toLowerCase()
  );
  return hit ? hit.sigla : txt.toUpperCase();
}

export async function listPeople(params?: {
  leaderId?: string;
  q?: string;
  city?: string;
  state?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'full_name' | 'created_at' | 'city' | 'state';
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    console.log('🔍 listPeople - Parâmetros recebidos:', params);
    const supabase = getSupabaseClient();

    const page = params?.page ?? 1, size = params?.pageSize ?? 20;
    const sortBy = params?.sortBy ?? 'full_name';
    const sortOrder = params?.sortOrder ?? 'asc';
    
    // Se há busca por texto, tentar FTS primeiro, depois fallback
    if (params?.q && params.q.trim()) {
      console.log('[listPeople] Realizando busca para:', params.q);
      
      try {
        const offset = (page - 1) * size;
        const ftsResults = await searchPeople(supabase, params.q, size, offset);
        console.log('[listPeople] Resultados FTS:', ftsResults.length);
        
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
          if (params?.state) {
            const uf = params.state.toUpperCase();
            const est = ESTADOS_BRASIL.find(e =>
              e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
            );
            // Buscar tanto por UF quanto por nome completo
            if (est) {
              console.log('🔍 listPeople - Filtro de estado (FTS):', { original: params.state, uf, est });
              query = query.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
            } else {
              console.log('🔍 listPeople - Filtro de estado (FTS) - estado não encontrado:', params.state);
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

          console.log('[listPeople] Dados ordenados por FTS:', sortedData.length);
          return { data: sortedData, error: null, count };
        } else {
          console.log('[listPeople] Nenhum resultado FTS, retornando vazio');
          return { data: [], error: null, count: 0 };
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
        if (params?.state) {
          const uf = params.state.toUpperCase();
          const est = ESTADOS_BRASIL.find(e =>
            e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
          );
          // Buscar tanto por UF quanto por nome completo
          if (est) {
            console.log('🔍 listPeople - Filtro de estado (fallback):', { original: params.state, uf, est });
            query = query.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
          } else {
            console.log('🔍 listPeople - Filtro de estado (fallback) - estado não encontrado:', params.state);
            query = query.ilike("state", `%${params.state}%`);
          }
        }

        const { data, error, count } = await query;
        
        if (error) {
          throw new Error(handleSupabaseError(error, 'listar pessoas'));
        }

        console.log('[listPeople] Fallback executado com sucesso:', data?.length || 0);
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
    if (params?.state) {
      const uf = params.state.toUpperCase();
      const est = ESTADOS_BRASIL.find(e =>
        e.sigla.toUpperCase() === uf || e.nome.toLowerCase() === params.state!.toLowerCase()
      );
      // Buscar tanto por UF quanto por nome completo
      if (est) {
        console.log('🔍 listPeople - Filtro de estado (normal):', { original: params.state, uf, est });
        q = q.or(`state.ilike.%${est.sigla}%,state.ilike.%${est.nome}%`);
      } else {
        console.log('🔍 listPeople - Filtro de estado (normal) - estado não encontrado:', params.state);
        q = q.ilike("state", `%${params.state}%`);
      }
    }

    const { data, error, count } = await q;
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'listar pessoas'));
    }

    console.log('🔍 listPeople - Resultado final:', { count: count || 0, dataLength: data?.length || 0 });
    
    return { data, error: null, count };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      count: 0
    };
  }
}

export async function getPerson(id: string): Promise<{ data: Person | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle(); // 👈 evita erro "0 rows"
    
    if (error) {
      throw new Error(handleSupabaseError(error, 'buscar pessoa'));
    }
    
    return { data, error: null };
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
        phone,
        owner:profiles!owner_id(
          id,
          full_name,
          role
        )
      `);
    
    if (normalizedWhatsapp) {
      query.eq('whatsapp', normalizedWhatsapp);
    } else if (normalizedPhone) {
      query.eq('whatsapp', normalizedPhone); // Usar whatsapp em vez de phone
    }
    
    const { data, error } = await query.limit(1).maybeSingle(); // 👈 evita erro "0 rows"
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao verificar pessoa existente:', error);
      return { exists: false };
    }
    
    if (data && data.owner) {
      return {
        exists: true,
        ownerName: data.owner?.[0]?.full_name || data.owner.full_name,
        ownerRole: data.owner?.[0]?.role || data.owner.role
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Erro na verificação de pessoa existente:', error);
    return { exists: false };
  }
}

export async function createPerson(p: PersonInsert): Promise<{ data: Person | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();

    // Get current user to set owner_id automatically
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
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
    
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function updatePerson(id: string, p: PersonUpdate): Promise<{ data: Person | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    
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
    
    return { data, error: null };
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