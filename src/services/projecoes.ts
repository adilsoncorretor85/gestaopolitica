import { supabase } from "@/lib/supabaseClient";
import type {
  CityVotesRow,
  NeighborhoodVotesRow,
  CityGoal,
  NeighborhoodGoal,
  CityProjection,
  NeighborhoodProjection,
} from "@/types/projecoes";

function norm(s: string | null | undefined) {
  return (s ?? "").trim();
}
function normUF(uf: string | null | undefined) {
  return (uf ?? "").trim().toUpperCase();
}

/** Lê votos agregados por cidade a partir da view — mapeia nomes reais */
export async function listVotesByCity(): Promise<CityVotesRow[]> {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from("vw_votes_by_city")
    .select('city, state, confirmed, probable, "undefined", total_people');

  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => ({
    city: String(r.city ?? ''),
    state: String(r.state ?? ''),
    confirmed: Number(r.confirmed ?? 0),
    probable: Number(r.probable ?? 0),
    undefined: Number(r["undefined"] ?? 0), // acessar por bracket
    total_people: Number(r.total_people ?? 0),
  }));
}

/** Lê votos por bairro */
export async function listVotesByNeighborhood(): Promise<NeighborhoodVotesRow[]> {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from("vw_votes_by_neighborhood")
    .select('city, state, neighborhood, confirmed, probable, "undefined", total_people');

  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => ({
    city: String(r.city ?? ''),
    state: String(r.state ?? ''),
    neighborhood: String(r.neighborhood ?? ''),
    confirmed: Number(r.confirmed ?? 0),
    probable: Number(r.probable ?? 0),
    undefined: Number(r["undefined"] ?? 0),
    total_people: Number(r.total_people ?? 0),
  }));
}

/** Lê metas de cidade e normaliza goal_total -> goal */
export async function listCityGoals(): Promise<CityGoal[]> {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from("city_goals")
    .select("city, state, goal_total, deadline")
    .order("state", { ascending: true })
    .order("city", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => ({
    city: String(r.city ?? ''),
    state: String(r.state ?? ''),
    goal: Number(r.goal_total ?? 0),
    deadline: r.deadline ? String(r.deadline) : null,
  }));
}

/** Lê metas de bairro e normaliza goal_total -> goal */
export async function listNeighborhoodGoals(): Promise<NeighborhoodGoal[]> {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from("neighborhood_goals")
    .select("id, city, state, neighborhood, goal_total, city_goal_id, created_at, updated_at")
    .order("city", { ascending: true })
    .order("neighborhood", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id ?? ''),
    city: String(r.city ?? ''),
    state: String(r.state ?? ''),
    neighborhood: String(r.neighborhood ?? ''),
    goal: Number(r.goal_total ?? 0),
    city_goal_id: r.city_goal_id ? String(r.city_goal_id) : null,
    deadline: null, // bairro NÃO tem deadline
    created_at: r.created_at ? String(r.created_at) : undefined,
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  }));
}

/** Projeção por cidade: junta view + metas de cidade */
export async function listCityProjection(): Promise<CityProjection[]> {
  const [votes, goals] = await Promise.all([listVotesByCity(), listCityGoals()]);

  // index votes por (state|city)
  const key = (s: string, c: string) => `${normUF(s)}|${norm(c).toLowerCase()}`;
  const vmap = new Map<string, CityVotesRow>();
  votes.forEach(v => vmap.set(key(v.state, v.city), v));

  return goals.map(g => {
    const k = key(g.state, g.city);
    const v = vmap.get(k);
    const confirmados = v ? v.confirmed : 0;
    const provaveis   = v ? v.probable  : 0;
    const indefinidos = v ? v.undefined : 0;
    const total       = v ? v.total_people : 0;
    const realizado   = confirmados + provaveis;
    const meta        = g.goal;
    const cobertura   = meta > 0 ? Math.round((1000 * realizado) / meta) / 10 : 0; // 1 casa
    const gap         = meta - realizado;

    return {
      city: g.city,
      state: g.state,
      meta,
      confirmados,
      provaveis,
      indefinidos,
      total,
      realizado,
      cobertura_pct: cobertura,
      gap,
    } satisfies CityProjection;
  });
}

/** Projeção por bairro: junta view + metas de bairro */
export async function listNeighborhoodProjection(city: string, state: string): Promise<NeighborhoodProjection[]> {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data, error } = await supabase
    .from("vw_votes_by_neighborhood")
    .select('city, state, neighborhood, confirmed, probable, "undefined", total_people')
    .eq('city', city.toLowerCase())
    .eq('state', state.toUpperCase());

  if (error) throw error;

  return (data ?? []).map((r: Record<string, unknown>) => ({
    city: String(r.city ?? ''),
    state: String(r.state ?? ''),
    neighborhood: String(r.neighborhood ?? ''),
    confirmed: Number(r.confirmed ?? 0),
    probable: Number(r.probable ?? 0),
    undefined: Number(r["undefined"] ?? 0),
    total_people: Number(r.total_people ?? 0),
  }));
}

/** UPSERT: cidade (city,state) → goal_total */
export async function upsertCityGoalWithUpsert(payload: {
  city: string;
  state: string;
  goal: number;
  deadline?: string | null;
}) {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data: authRes } = await supabase.auth.getUser();
  const uid = authRes?.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const city = norm(payload.city);
  const state = normUF(payload.state);
  const goal_total = Number(payload.goal ?? 0);
  const deadline = payload.deadline ?? null;

  if (!city) throw new Error("Cidade é obrigatória");
  if (!state) throw new Error("UF é obrigatória");

  // 1) Tenta UPDATE (não mexe em created_by)
  const upd = await supabase
    .from("city_goals")
    .update({
      goal_total,
      deadline,
      updated_by: uid,
      // updated_at é preenchido por trigger, se houver. Se não houver:
      // updated_at: new Date().toISOString(),
    })
    .eq("city", city)
    .eq("state", state)
    .select("id"); // retorna linhas afetadas

  if (upd.error) throw upd.error;
  if (Array.isArray(upd.data) && upd.data.length > 0) {
    return upd.data[0];
  }

  // 2) Se não existia, faz INSERT com created_by + updated_by
  const ins = await supabase
    .from("city_goals")
    .insert({
      city,
      state,
      goal_total,
      deadline,
      created_by: uid,
      updated_by: uid,
      // created_at/updated_at via trigger, se houver
    })
    .select("id")
    .single();

  if (ins.error) throw ins.error;
  return ins.data;
}

export async function saveNeighborhoodGoal(params: {
  id?: string;                 // <- vem do modal quando for edição
  city: string;
  state: string;
  neighborhood: string;
  goal: number;
  city_goal_id?: string | null;
}) {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data: authRes } = await supabase.auth.getUser();
  const uid = authRes?.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const city = params.city.trim().toLowerCase();
  const state = params.state.trim().toUpperCase();
  const neighborhood = params.neighborhood.trim().toLowerCase();
  const goal_total = Number(params.goal ?? 0);

  if (!city) throw new Error("Cidade é obrigatória");
  if (!state) throw new Error("UF é obrigatória");
  if (!neighborhood) throw new Error("Bairro é obrigatório");

  // 1) Se veio id -> UPDATE direto (nunca insere)
  if (params.id) {
    const { error: updErr } = await supabase
      .from('neighborhood_goals')
      .update({ 
        goal_total,
        updated_by: uid,
        // updated_at por trigger se houver
      })
      .eq('id', params.id);

    if (updErr) throw updErr;
    return { mode: 'updated', id: params.id };
  }

  // 2) Sem id -> tenta localizar por chave normalizada
  const { data: existing, error: selErr } = await supabase
    .from('neighborhood_goals')
    .select('id')
    .eq('city', city)
    .eq('state', state)
    .eq('neighborhood', neighborhood)
    .limit(1);

  if (selErr) throw selErr;

  if (existing && existing.length === 1) {
    const id = existing[0].id as string;
    const { error: updErr } = await supabase
      .from('neighborhood_goals')
      .update({ 
        goal_total,
        updated_by: uid,
        // updated_at por trigger se houver
      })
      .eq('id', id);

    if (updErr) throw updErr;
    return { mode: 'updated', id };
  }

  // 3) Senão existe -> INSERT (a chave única impede duplicar)
  const { data: ins, error: insErr } = await supabase
    .from('neighborhood_goals')
    .insert({
      city,
      state,
      neighborhood,
      goal_total,
      city_goal_id: params.city_goal_id ?? null,
      created_by: uid,
      updated_by: uid,
    })
    .select('id')
    .single();

  if (insErr) throw insErr;
  return { mode: 'inserted', id: ins.id as string };
}

/** DELETE: Remove meta de cidade */
export async function deleteCityGoal(city: string, state: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data: authRes } = await supabase.auth.getUser();
  const uid = authRes?.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const normalizedCity = norm(city);
  const normalizedState = normUF(state);

  if (!normalizedCity) throw new Error("Cidade é obrigatória");
  if (!normalizedState) throw new Error("UF é obrigatória");

  const { error } = await supabase
    .from("city_goals")
    .delete()
    .eq("city", normalizedCity)
    .eq("state", normalizedState);

  if (error) throw error;
  return { success: true };
}

/** DELETE: Remove meta de bairro */
export async function deleteNeighborhoodGoal(id: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const { data: authRes } = await supabase.auth.getUser();
  const uid = authRes?.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  if (!id) throw new Error("ID é obrigatório");

  const { error } = await supabase
    .from("neighborhood_goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

// Lista cidades para o filtro: união de metas (city_goals) + realidade (vw_votes_by_city)
export async function listCitiesForFilter(): Promise<{ city: string; state: string }[]> {
  if (!supabase) throw new Error('Supabase não configurado');
  
  const [goalsRes, votesRes] = await Promise.all([
    supabase.from('city_goals').select('city, state'),
    supabase.from('vw_votes_by_city').select('city, state'),
  ]);

  const list: { city: string; state: string }[] = [];

  const pushNormalized = (city?: string | null, state?: string | null) => {
    if (!city || !state) return;
    list.push({ city: city.toLowerCase(), state: state.toUpperCase() });
  };

  (goalsRes.data ?? []).forEach((r: Record<string, unknown>) => pushNormalized(String(r.city), String(r.state)));
  (votesRes.data ?? []).forEach((r: Record<string, unknown>) => pushNormalized(String(r.city), String(r.state)));

  // remover duplicatas e ordenar
  const unique = Array.from(
    new Map(list.map((x) => [`${x.city}-${x.state}`, x])).values()
  ).sort((a, b) => (a.state === b.state ? a.city.localeCompare(b.city) : a.state.localeCompare(b.state)));

  return unique;
}