import { createClient } from '@/lib/supabase/client';
import { DashboardStats } from '@/types';
import { getCurrentProfile, isAdmin } from './auth';
import { format, subDays } from 'date-fns';

export async function getLeaderCounters() {
  const supabase = createClient();
  
  const pending = await supabase
    .from("app_leaders_list")
    .select("*", { count: "exact", head: true })
    .eq("is_pending", true);
    
  const active = await supabase
    .from("app_leaders_list")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
    
  return { 
    pending: pending.count ?? 0, 
    active: active.count ?? 0 
  };
}

export async function getDashboardStats(days = 30): Promise<DashboardStats> {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  
  if (!profile) {
    throw new Error('Usuário não autenticado');
  }

  const isUserAdmin = isAdmin(profile);
  const startDate = subDays(new Date(), days);

  // Base query com filtro por owner se for LEADER
  let baseQuery = supabase.from('people');
  if (!isUserAdmin) {
    baseQuery = baseQuery.eq('owner_id', profile.id);
  }

  // Total de pessoas
  const { count: totalPeople } = await baseQuery
    .select('*', { count: 'exact', head: true });

  // Cidades distintas
  const { data: cities } = await baseQuery
    .select('city')
    .not('city', 'is', null);
  
  const uniqueCities = new Set(cities?.map(c => c.city).filter(Boolean));

  // Estados distintos
  const { data: states } = await baseQuery
    .select('state')
    .not('state', 'is', null);
  
  const uniqueStates = new Set(states?.map(s => s.state).filter(Boolean));

  // Pessoas recentes
  const { data: recentPeople } = await baseQuery
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  let peopleByDay: { date: string; count: number }[] = [];
  let topLeaders: { leader: any; count: number }[] = [];

  // Dados específicos para ADMIN
  if (isUserAdmin) {
    // Cadastros por dia
    const { data: dailyData } = await supabase
      .from('people')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    // Agrupar por dia
    const dayGroups: Record<string, number> = {};
    dailyData?.forEach(person => {
      const day = format(new Date(person.created_at), 'yyyy-MM-dd');
      dayGroups[day] = (dayGroups[day] || 0) + 1;
    });

    peopleByDay = Object.entries(dayGroups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top líderes
    const { data: leaderStats } = await supabase
      .from('people')
      .select(`
        owner_id,
        owner:profiles(*)
      `);

    const leaderGroups: Record<string, { leader: any; count: number }> = {};
    leaderStats?.forEach(person => {
      const ownerId = person.owner_id;
      if (!leaderGroups[ownerId]) {
        leaderGroups[ownerId] = {
          leader: person.owner,
          count: 0,
        };
      }
      leaderGroups[ownerId].count++;
    });

    topLeaders = Object.values(leaderGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  return {
    totalPeople: totalPeople || 0,
    totalCities: uniqueCities.size,
    totalStates: uniqueStates.size,
    recentPeople: recentPeople || [],
    peopleByDay,
    topLeaders,
  };
}

export async function getLeaderStats() {
  const supabase = createClient();
  
  const { data: leaders } = await supabase
    .from('profiles')
    .select(`
      *,
      people:people(count)
    `)
    .eq('role', 'LEADER');

  return leaders?.map(leader => ({
    ...leader,
    peopleCount: leader.people?.[0]?.count || 0,
  })) || [];
}