// src/services/leader.ts
import { getSupabaseClient } from "@/lib/supabaseClient";
export async function listLeaders() {
    console.log('listLeaders chamada');
    // Tentar usar a view original primeiro
    try {
        console.log('Tentando usar app_leaders_list...');
        const { data, error } = await getSupabaseClient()
            .from("app_leaders_list")
            .select("id, full_name, email, phone, status, invited_at, accepted_at, is_active, is_pending, goal")
            .order("invited_at", { ascending: false, nullsFirst: false });
        if (error) {
            console.error('Erro na view app_leaders_list:', error);
            throw error;
        }
        console.log('View app_leaders_list funcionou, dados:', data);
        const leaders = (data ?? []);
        console.log('Leaders com IDs:', leaders.map(l => ({ id: l.id, name: l.full_name })));
        return leaders;
    }
    catch (viewError) {
        console.warn('View app_leaders_list falhou, tentando query direta:', viewError);
        // Fallback: query direta na leader_profiles
        try {
            const { data, error } = await getSupabaseClient()
                .from("leader_profiles")
                .select(`
          id,
          profile_id,
          status,
          city, state, neighborhood,
          goal,
          invited_at,
          accepted_at,
          profiles:profile_id (
            id,
            full_name,
            email,
            phone
          )
        `)
                .order("invited_at", { ascending: false, nullsFirst: false });
            if (error) {
                console.error('Erro na query direta:', error);
                throw error;
            }
            console.log('Query direta funcionou, dados brutos:', data);
            // Transformar para o formato esperado e calcular is_active/is_pending
            const transformed = (data ?? []).map((leader) => ({
                id: leader.id, // leader_profiles.id
                profile_id: leader.profile_id, // profiles.id (para usar no modal de liderança)
                full_name: leader.profiles?.full_name || null,
                email: leader.profiles?.email || null,
                phone: leader.profiles?.phone || null,
                goal: leader.goal,
                status: leader.status,
                invited_at: leader.invited_at,
                accepted_at: leader.accepted_at,
                is_active: leader.status === 'ACTIVE',
                is_pending: leader.status === 'PENDING',
                city: leader.city || null,
                state: leader.state || null,
            }));
            console.log('Dados transformados:', transformed);
            const leaders = transformed;
            console.log('Leaders com IDs (fallback):', leaders.map(l => ({ id: l.id, name: l.full_name })));
            return leaders;
        }
        catch (directError) {
            console.error('Ambas as queries falharam:', directError);
            throw directError;
        }
    }
}
export async function getLeaderDetail(id) {
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
        .single();
    if (error)
        throw error;
    // Buscar informações de liderança se existirem
    const { data: leadershipData } = await getSupabaseClient()
        .from("profile_leaderships")
        .select("role_code, organization, title, extra")
        .eq("profile_id", data.id)
        .maybeSingle();
    // Transformar os dados para o formato esperado
    const transformedData = {
        id: data.id,
        full_name: data.profiles?.full_name,
        email: data.email,
        phone: data.phone,
        birth_date: data.birth_date,
        gender: data.gender,
        cep: data.cep,
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        notes: data.notes,
        status: data.status,
        goal: data.goal,
        latitude: data.latitude,
        longitude: data.longitude,
        invited_at: null, // Será preenchido se necessário
        accepted_at: null, // Será preenchido se necessário
        is_active: data.status === 'ACTIVE'
    };
    return {
        ...transformedData,
        leadership: leadershipData
    };
}
export async function updateLeaderProfile(id, values) {
    const editableLP = [
        "email", "phone", "birth_date", "gender", "cep", "street", "number",
        "complement", "neighborhood", "city", "state", "notes", "goal", "latitude", "longitude",
    ];
    const lpPayload = {};
    for (const k of editableLP) {
        if (k in values) {
            const v = values[k];
            if (v !== undefined)
                lpPayload[k] = v === "" ? null : v;
        }
    }
    if (Object.keys(lpPayload).length > 0) {
        const { error } = await getSupabaseClient()
            .from("leader_profiles")
            .update(lpPayload)
            .eq("id", id);
        if (error)
            throw new Error(`leader_profiles: ${error.message}`);
    }
    if ("full_name" in values && values.full_name !== undefined) {
        const { error } = await getSupabaseClient()
            .from("profiles")
            .update({ full_name: values.full_name || null })
            .eq("id", id);
        if (error)
            throw new Error(`profiles: ${error.message}`);
    }
    return true;
}
export async function createLeader(payload) {
    if (!getSupabaseClient())
        throw new Error('Supabase não configurado');
    const { data, error } = await getSupabaseClient()
        .from('leader_profiles')
        .insert({
        ...payload,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
    })
        .select('*').single();
    if (error)
        throw error;
    return data;
}
export async function updateLeader(id, payload) {
    if (!getSupabaseClient())
        throw new Error('Supabase não configurado');
    const { data, error } = await getSupabaseClient()
        .from('leader_profiles')
        .update({
        ...payload,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
    })
        .eq('id', id)
        .select('*').single();
    if (error)
        throw error;
    return data;
}
export async function inviteLeader(payload) {
    // 1) Garante sessão
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session)
        throw new Error('Você não está autenticado.');
    // 2) Chama a edge function COM o Bearer token
    const { data, error } = await getSupabaseClient().functions.invoke('invite_leader', {
        body: { ...payload, appUrl: payload.appUrl || window.location.origin },
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error)
        throw error;
    if (data?.ok === false)
        throw new Error(data?.error || 'Falha ao enviar convite.');
    return data; // { ok, acceptUrl, status, userId, message }
}
export async function resendInvite(email, full_name) {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session)
        throw new Error('Você não está autenticado.');
    const { data, error } = await getSupabaseClient().functions.invoke('invite_leader', {
        body: {
            email,
            full_name: full_name || '',
            appUrl: window.location.origin
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error)
        throw error;
    if (data?.ok === false)
        throw new Error(data?.error || 'Falha ao reenviar convite.');
    return data;
}
export async function deactivateLeader(id) {
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
export const listPendingLeaders = () => listLeaders().then(leaders => leaders.filter(l => l.is_pending));
export const revokeInvite = async (email) => {
    const { error } = await getSupabaseClient().from('invite_tokens').delete().eq('email', email);
    if (error)
        throw error;
};
