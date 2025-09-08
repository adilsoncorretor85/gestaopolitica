import { supabase } from '@/lib/supabaseClient';
import { PersonInsert, PersonUpdate, PeopleFilters, PaginatedResponse, PersonWithProfile } from '@/types';
import { logAudit } from './audit';
import { getCurrentProfile } from './auth';
import { searchPeople } from '@/services/searchPeople';

export async function getPeople(filters: PeopleFilters = {}): Promise<PaginatedResponse<PersonWithProfile>> {
  if (!supabase) throw new Error('Supabase não configurado');
  const profile = await getCurrentProfile();
  
  if (!profile) {
    throw new Error('Usuário não autenticado');
  }

  const {
    search = '',
    city = '',
    state = '',
    ownerId = '',
    page = 1,
    pageSize = 20,
  } = filters;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Se há busca por texto, usar FTS
  if (search && search.trim()) {
    const ftsResults = await searchPeople(supabase, search, pageSize, from);
    
    // Buscar dados completos das pessoas encontradas
    if (ftsResults.length > 0) {
      const ids = ftsResults.map(r => r.id);
      let query = supabase.from('people').select(`
        *,
        owner:profiles(*)
      `, { count: 'exact' })
        .in('id', ids);

      if (city) query = query.eq('city', city);
      if (state) query = query.eq('state', state);

      // Se for LEADER, só pode ver seus próprios contatos
      if (profile.role === 'LEADER') {
        query = query.eq('owner_id', profile.id);
      } else if (ownerId && profile.role === 'ADMIN') {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }

      // Ordenar pelos resultados do FTS (por rank)
      const sortedData = data ? data.sort((a, b) => {
        const aRank = ftsResults.find(r => r.id === a.id)?.rank || 0;
        const bRank = ftsResults.find(r => r.id === b.id)?.rank || 0;
        return bRank - aRank; // Maior rank primeiro
      }) : [];

      return {
        data: sortedData as PersonWithProfile[] || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } else {
      return {
        data: [],
        count: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  // Busca normal sem texto (listagem padrão)
  let query = supabase
    .from('people')
    .select(`
      *,
      owner:profiles(*)
    `, { count: 'exact' });

  if (city) {
    query = query.eq('city', city);
  }

  if (state) {
    query = query.eq('state', state);
  }

  // Se for LEADER, só pode ver seus próprios contatos
  if (profile.role === 'LEADER') {
    query = query.eq('owner_id', profile.id);
  } else if (ownerId && profile.role === 'ADMIN') {
    query = query.eq('owner_id', ownerId);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    data: data as PersonWithProfile[] || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function createPerson(personData: PersonInsert) {
  if (!supabase) throw new Error('Supabase não configurado');
  const profile = await getCurrentProfile();
  
  if (!profile) {
    throw new Error('Usuário não autenticado');
  }

  // Se for LEADER, só pode criar para si mesmo
  if (profile.role === 'LEADER') {
    personData.owner_id = profile.id;
  }

  const { data, error } = await supabase
    .from('people')
    .insert(personData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log de auditoria
  await logAudit({
    tableName: 'people',
    recordId: data.id,
    action: 'CREATE',
    actorId: profile.id,
    details: {
      owner_id: data.owner_id,
      full_name: data.full_name,
    },
  });

  return data;
}

export async function updatePerson(id: string, personData: PersonUpdate) {
  if (!supabase) throw new Error('Supabase não configurado');
  const profile = await getCurrentProfile();
  
  if (!profile) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('people')
    .update(personData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log de auditoria
  await logAudit({
    tableName: 'people',
    recordId: data.id,
    action: 'UPDATE',
    actorId: profile.id,
    details: {
      owner_id: data.owner_id,
      changes: personData,
    },
  });

  return data;
}

export async function deletePerson(id: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  const profile = await getCurrentProfile();
  
  if (!profile) {
    throw new Error('Usuário não autenticado');
  }

  // Buscar dados antes de deletar para auditoria
  const { data: personToDelete } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  // Log de auditoria
  if (personToDelete) {
    await logAudit({
      tableName: 'people',
      recordId: id,
      action: 'DELETE',
      actorId: profile.id,
      details: {
        owner_id: personToDelete.owner_id,
        full_name: personToDelete.full_name,
      },
    });
  }
}

export async function getPerson(id: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from('people')
    .select(`
      *,
      owner:profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data as PersonWithProfile;
}

export function normalizeWhatsApp(whatsapp: string): string {
  // Remove todos os caracteres não numéricos
  const digits = whatsapp.replace(/\D/g, '');
  
  // Se começar com 55 (código do Brasil), remove
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.substring(2);
  }
  
  return digits;
}

export function formatWhatsApp(whatsapp: string): string {
  const digits = normalizeWhatsApp(whatsapp);
  
  if (digits.length === 11) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  }
  
  return whatsapp;
}

export function getWhatsAppLink(whatsapp: string): string {
  const digits = normalizeWhatsApp(whatsapp);
  return `https://wa.me/55${digits}`;
}