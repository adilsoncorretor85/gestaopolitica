import { devLog } from '@/lib/logger';
import { getSupabaseClient } from '@/lib/supabaseClient';

export type BirthdayPerson = {
  id: string;
  full_name: string;
  birth_date: string;
  age: number;
  phone: string | null;
  email: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

/**
 * Busca líderes e pessoas que fazem aniversário hoje
 */
export async function getTodayBirthdays(): Promise<BirthdayPerson[]> {
  try {
    const supabase = getSupabaseClient();
    
    devLog('🎂 [getTodayBirthdays] Buscando aniversariantes do dia...');
    
    // Buscar configuração de eleição para obter o fuso horário
    const { getElectionSettings } = await import('@/services/election');
    const election = await getElectionSettings(supabase);
    const timezone = election?.timezone || 'America/Sao_Paulo';
    
    // Buscar líderes que fazem aniversário hoje
    const { data: leadersData, error: leadersError } = await supabase
      .from('leader_profiles')
      .select(`
        id,
        birth_date,
        email,
        phone,
        neighborhood,
        city,
        state,
        profiles!inner(full_name)
      `)
      .not('birth_date', 'is', null)
      .eq('status', 'ACTIVE');

    // Buscar pessoas (contatos) que fazem aniversário hoje
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select(`
        id,
        birth_date,
        email,
        whatsapp,
        neighborhood,
        city,
        state,
        full_name
      `)
      .not('birth_date', 'is', null);

    if (leadersError) {
      console.error('❌ [getTodayBirthdays] Erro ao buscar líderes aniversariantes:', leadersError);
    }

    if (peopleError) {
      console.error('❌ [getTodayBirthdays] Erro ao buscar pessoas aniversariantes:', peopleError);
    }

    // Combinar dados de líderes e pessoas
    const allData = [
      ...(leadersData || []).map(leader => ({
        ...leader,
        full_name: leader.profiles?.full_name || '',
        phone: leader.phone
      })),
      ...(peopleData || []).map(person => ({
        ...person,
        phone: person.whatsapp
      }))
    ];

    if (!allData || allData.length === 0) {
      devLog('🎂 [getTodayBirthdays] Nenhum dado retornado');
      return [];
    }

    devLog('🎂 [getTodayBirthdays] Dados encontrados:', allData.length, 'pessoas com data de nascimento');

    // Obter a data atual no fuso horário configurado
    const now = new Date();
    const todayInTimezone = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const today = new Date(todayInTimezone);
    const todayMonth = today.getMonth() + 1; // getMonth() retorna 0-11
    const todayDay = today.getDate();
    
    devLog('🎂 [getTodayBirthdays] Data de hoje no fuso horário', timezone, ':', today.toLocaleDateString('pt-BR'), `(mês: ${todayMonth}, dia: ${todayDay})`);

    // Filtrar apenas os que fazem aniversário hoje
    const todayBirthdays = allData
      .filter(person => {
        if (!person.birth_date) return false;
        
        const birthDate = new Date(person.birth_date);
        const birthMonth = birthDate.getMonth() + 1;
        const birthDay = birthDate.getDate();
        
        return birthMonth === todayMonth && birthDay === todayDay;
      })
      .map(person => {
        const birthDate = new Date(person.birth_date!);
        const age = today.getFullYear() - birthDate.getFullYear();
        
        // Ajustar idade se ainda não fez aniversário este ano
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          return {
            id: person.id,
            full_name: person.full_name || 'Nome não informado',
            birth_date: person.birth_date!,
            age: age - 1,
            phone: person.phone,
            email: person.email,
            neighborhood: person.neighborhood,
            city: person.city,
            state: person.state,
          };
        }
        
        return {
          id: person.id,
          full_name: person.full_name || 'Nome não informado',
          birth_date: person.birth_date!,
          age,
          phone: person.phone,
          email: person.email,
          neighborhood: person.neighborhood,
          city: person.city,
          state: person.state,
        };
      });

    devLog('🎂 [getTodayBirthdays] Aniversariantes encontrados hoje:', todayBirthdays.length);
    return todayBirthdays;
  } catch (error) {
    console.error('Erro ao buscar aniversariantes:', error);
    return [];
  }
}

/**
 * Busca aniversariantes dos próximos 7 dias (líderes e pessoas)
 */
export async function getUpcomingBirthdays(days: number = 7): Promise<BirthdayPerson[]> {
  try {
    const supabase = getSupabaseClient();
    
    // Buscar configuração de eleição para obter o fuso horário
    const { getElectionSettings } = await import('@/services/election');
    const election = await getElectionSettings(supabase);
    const timezone = election?.timezone || 'America/Sao_Paulo';
    
    // Buscar líderes
    const { data: leadersData, error: leadersError } = await supabase
      .from('leader_profiles')
      .select(`
        id,
        birth_date,
        email,
        phone,
        neighborhood,
        city,
        state,
        profiles!inner(full_name)
      `)
      .not('birth_date', 'is', null)
      .eq('status', 'ACTIVE');

    // Buscar pessoas (contatos)
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select(`
        id,
        birth_date,
        email,
        whatsapp,
        neighborhood,
        city,
        state,
        full_name
      `)
      .not('birth_date', 'is', null);

    if (leadersError) {
      console.error('Erro ao buscar líderes próximos aniversariantes:', leadersError);
    }

    if (peopleError) {
      console.error('Erro ao buscar pessoas próximos aniversariantes:', peopleError);
    }

    // Combinar dados de líderes e pessoas
    const allData = [
      ...(leadersData || []).map(leader => ({
        ...leader,
        full_name: leader.profiles?.full_name || '',
        phone: leader.phone
      })),
      ...(peopleData || []).map(person => ({
        ...person,
        phone: person.whatsapp
      }))
    ];

    if (!allData || allData.length === 0) return [];

    // Obter a data atual no fuso horário configurado
    const now = new Date();
    const todayInTimezone = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const today = new Date(todayInTimezone);
    const upcomingBirthdays: BirthdayPerson[] = [];

    allData.forEach(person => {
      if (!person.birth_date) return;
      
      const birthDate = new Date(person.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      // Se o aniversário já passou este ano, considerar o próximo ano
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilBirthday <= days) {
        const age = thisYearBirthday.getFullYear() - birthDate.getFullYear();
        
        upcomingBirthdays.push({
          id: person.id,
          full_name: person.full_name || 'Nome não informado',
          birth_date: person.birth_date,
          age,
          phone: person.phone,
          email: person.email,
          neighborhood: person.neighborhood,
          city: person.city,
          state: person.state,
        });
      }
    });

    // Ordenar por proximidade do aniversário
    return upcomingBirthdays.sort((a, b) => {
      const aBirthday = new Date(a.birth_date);
      const bBirthday = new Date(b.birth_date);
      const aThisYear = new Date(today.getFullYear(), aBirthday.getMonth(), aBirthday.getDate());
      const bThisYear = new Date(today.getFullYear(), bBirthday.getMonth(), bBirthday.getDate());
      
      if (aThisYear < today) aThisYear.setFullYear(today.getFullYear() + 1);
      if (bThisYear < today) bThisYear.setFullYear(today.getFullYear() + 1);
      
      return aThisYear.getTime() - bThisYear.getTime();
    });
  } catch (error) {
    console.error('Erro ao buscar próximos aniversariantes:', error);
    return [];
  }
}
