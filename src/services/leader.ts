// src/services/leader.ts
import { devLog } from '@/lib/logger';
import { getSupabaseClient } from "@/lib/supabaseClient";

export type LeaderListItem = {
  id: string; // leader_profiles.id
  profile_id: string; // profiles.id (para usar no modal de liderança)
  full_name: string | null;
  email: string | null;
  phone: string | null;
  goal: number | null;
  status: "INVITED" | "PENDING" | "ACTIVE" | "INACTIVE" | null;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean | null;
  is_pending: boolean | null;
  city: string | null;
  state: string | null;
};

export type LeaderDetail = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: "M" | "F" | "O" | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  goal: number | null;
  status: "PENDING" | "INVITED" | "ACTIVE" | "INACTIVE" | null;
  invited_at: string | null;
  accepted_at: string | null;
  is_active: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LeaderInsert = {
  full_name: string;
  email: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function listLeaders() {
  devLog('listLeaders chamada');
  
  // Usar query direta com join para profiles
  try {
    const { data, error } = await getSupabaseClient()
      .from("leader_profiles")
      .select(`
        id,
        status,
        city, state, neighborhood,
        goal,
        email,
        phone,
        created_at,
        updated_at,
        profiles!inner(
          id,
          full_name
        )
      `)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error('Erro na query direta:', error);
      throw error;
    }
    
    devLog('Query direta funcionou, dados brutos:', data);
    
    // Transformar para o formato esperado
    const transformed = (data ?? []).map((leader: any) => ({
      id: leader.id, // leader_profiles.id
      profile_id: leader.profiles.id, // profiles.id (para usar no modal de liderança)
      full_name: leader.profiles.full_name || null,
      email: leader.email || null,
      phone: leader.phone || null,
      goal: leader.goal,
      status: leader.status,
      invited_at: null, // Não existe na tabela atual
      accepted_at: null, // Não existe na tabela atual
      is_active: leader.status === 'ACTIVE',
      is_pending: leader.status === 'PENDING',
      city: leader.city || null,
      state: leader.state || null,
    }));
    
    devLog('Dados transformados:', transformed);
    const leaders = transformed as LeaderListItem[];
    devLog('Leaders com IDs:', leaders.map(l => ({ id: l.id, name: l.full_name })));
    return leaders;
  } catch (directError) {
    console.error('Query falhou:', directError);
    throw directError;
  }
}

export async function getLeaderDetail(id: string) {
  // Como a view app_leader_detail pode não existir ou não ter latitude/longitude,
  // vamos fazer uma consulta direta na tabela leader_profiles
  const { data, error } = await getSupabaseClient()
    .from("leader_profiles")
    .select(`
      id,
      email,
      phone,
      birth_date,
      gender,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      notes,
      status,
      goal,
      latitude,
      longitude,
      created_at,
      updated_at,
      profiles!inner(
        full_name,
        created_at,
        updated_at
      )
    `)
    .eq("id", id)
    .maybeSingle(); // 👈 evita erro "0 rows"
  
  if (error) throw error;
  
  // Buscar informações de liderança se existirem
  const { data: leadershipData } = await getSupabaseClient()
    .from("profile_leaderships")
    .select("role_code, organization, title, extra")
    .eq("profile_id", data?.id || '')
    .maybeSingle();
  
  // Transformar os dados para o formato esperado
  const transformedData = {
    id: data?.id || '',
    full_name: (data?.profiles as any)?.full_name || '',
    email: data?.email || '',
    phone: data?.phone || '',
    birth_date: data?.birth_date || '',
    gender: data?.gender || '',
    cep: data?.cep || '',
    street: data?.street || '',
    number: data?.number || '',
    complement: data?.complement || '',
    neighborhood: data?.neighborhood || '',
    city: data?.city || '',
    state: data?.state || '',
    notes: data?.notes || '',
    status: data?.status || '',
    goal: data?.goal || '',
    latitude: data?.latitude || null,
    longitude: data?.longitude || null,
    invited_at: null, // Será preenchido se necessário
    accepted_at: null, // Será preenchido se necessário
    is_active: data?.status === 'ACTIVE',
    created_at: data?.created_at || '',
    updated_at: data?.updated_at || ''
  };
  
  return {
    ...transformedData,
    leadership: leadershipData
  } as LeaderDetail & { leadership?: any };
}

export async function updateLeaderProfile(
  id: string,
  values: Partial<LeaderDetail>
) {
  const editableLP: (keyof LeaderDetail)[] = [
    "email","phone","birth_date","gender","cep","street","number",
    "complement","neighborhood","city","state","notes","goal","latitude","longitude",
  ];

  const lpPayload: Record<string, any> = {};
  for (const k of editableLP) {
    if (k in values) {
      const v = (values as any)[k];
      if (v !== undefined) lpPayload[k] = v === "" ? null : v;
    }
  }

  if (Object.keys(lpPayload).length > 0) {
    const { error } = await getSupabaseClient()
      .from("leader_profiles")
      .update(lpPayload)
      .eq("id", id);
    if (error) throw new Error(`leader_profiles: ${error.message}`);
  }

  if ("full_name" in values && values.full_name !== undefined) {
    const { error } = await getSupabaseClient()
      .from("profiles")
      .update({ full_name: values.full_name || null })
      .eq("id", id);
    if (error) throw new Error(`profiles: ${error.message}`);
  }

  return true;
}

export async function createLeader(payload: LeaderInsert) {
  if (!getSupabaseClient()) throw new Error('Supabase não configurado');
  const { data, error } = await getSupabaseClient()
    .from('leader_profiles')
    .insert({
      ...payload,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    })
    .select('*').maybeSingle(); // 👈 evita erro "0 rows"
  if (error) throw error;
  return data;
}

export async function updateLeader(id: string, payload: Partial<LeaderInsert>) {
  if (!getSupabaseClient()) throw new Error('Supabase não configurado');
  const { data, error } = await getSupabaseClient()
    .from('leader_profiles')
    .update({
      ...payload,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    })
    .eq('id', id)
    .select('*').maybeSingle(); // 👈 evita erro "0 rows"
  if (error) throw error;
  return data;
}


export async function deactivateLeader(id: string) {
  const { error } = await getSupabaseClient()
    .from("leader_profiles")
    .update({ status: "INACTIVE" })
    .eq("id", id);

  if (error) {
    // jogue o erro pra cima pra UI mostrar; ajuda muito no debug
    throw new Error(error.message || "Falha ao desativar líder");
  }
}

// Funções antigas para compatibilidade
export const listPendingLeaders = () => listLeaders().then(leaders => leaders.filter(l => l.is_pending))
export const revokeInvite = async (email: string) => {
  const { error } = await getSupabaseClient().from('invite_tokens').delete().eq('email', email)
  if (error) throw error
}