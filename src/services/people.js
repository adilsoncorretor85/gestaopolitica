import { supabase } from "@/lib/supabaseClient";
export async function listPeople(params) {
    if (!supabase)
        throw new Error('Supabase não configurado');
    const page = params?.page ?? 1, size = params?.pageSize ?? 20;
    const sortBy = params?.sortBy ?? 'full_name';
    const sortOrder = params?.sortOrder ?? 'asc';
    let q = supabase.from("people").select("*", { count: "exact" })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * size, page * size - 1);
    if (params?.leaderId)
        q = q.eq("owner_id", params.leaderId);
    if (params?.q)
        q = q.ilike("full_name", `%${params.q}%`);
    if (params?.city)
        q = q.ilike("city", `%${params.city}%`);
    if (params?.state)
        q = q.ilike("state", `%${params.state}%`);
    return await q;
}
export async function getPerson(id) {
    if (!supabase)
        throw new Error('Supabase não configurado');
    return await supabase.from("people").select("*").eq("id", id).single();
}
export async function createPerson(p) {
    if (!supabase)
        throw new Error('Supabase não configurado');
    // Get current user to set owner_id automatically
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Usuário não autenticado');
    }
    // Set owner_id to current user
    const personWithOwner = { ...p, owner_id: user.id };
    const { data, error } = await supabase
        .from("people")
        .insert({
        ...personWithOwner,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
    })
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
export async function updatePerson(id, p) {
    if (!supabase)
        throw new Error('Supabase não configurado');
    const { data, error } = await supabase
        .from("people")
        .update({
        ...p,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
    })
        .eq("id", id)
        .select('*')
        .single();
    if (error)
        throw error;
    return data;
}
export async function deletePerson(id) {
    if (!supabase)
        throw new Error('Supabase não configurado');
    return await supabase.from("people").delete().eq("id", id);
}
