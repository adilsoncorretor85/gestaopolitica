import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { useElection } from '@/contexts/ElectionContext';
import { getLeaderCounters, getGoalSummary, updateOrgGoalFromElectionType, type GoalSummary } from '@/lib/dashboard';
import { getSupabaseClient, handleSupabaseError } from '@/lib/supabaseClient';
import { formatCountdown } from '@/services/election';
import { useLeaderGoal, useInvalidateLeaderGoal } from '@/hooks/useLeaderGoal';
import DashboardGoalCard from '@/components/DashboardGoalCard';
import { Users, UserCheck, Target, TrendingUp, Calendar, Settings } from 'lucide-react';

// Tipos para o Dashboard
type TopLeader = {
  leader_id: string;
  leader_name: string;
  total_people: number;
  confirmed_votes: number;
};

// Função para formatar números com separadores de milhares
const formatNumber = (num: number | string): string => {
  if (typeof num === 'string') return num;
  return num.toLocaleString('pt-BR');
};

export default function DashboardPage() {
  console.log('🔍 [Dashboard] Componente sendo renderizado');
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  console.log('🔍 [Dashboard] Antes de chamar useAuth');
  const { profile, isAdmin: isAdminUser, loading: authLoading } = useAuth();
  const { election, defaultFilters } = useElection();
  console.log('🔍 [Dashboard] Depois de chamar useAuth');
  
  // Debug: verificar se está sendo reconhecido como admin
  console.log('🔍 [Dashboard] Verificação de admin:', {
    profile,
    isAdminUser,
    profileRole: profile?.role,
    profileId: profile?.id
  });
  const { data: leaderGoalData } = useLeaderGoal();
  const invalidateLeaderGoal = useInvalidateLeaderGoal();
  
  const [stats, setStats] = useState({
    activeLeaders: 0,
    pendingLeaders: 0,
    totalPeople: 0,
    confirmedVotes: 0,
    probableVotes: 0,
    effectiveTotalGoal: 0 // Será calculado dinamicamente
  });
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [topLeaders, setTopLeaders] = useState<TopLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  
  // Estados para eleição
  const [countdownText, setCountdownText] = useState<string>("");
  const [electionLabel, setElectionLabel] = useState<string>("");
  const [countdownLoading, setCountdownLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('🔍 [Dashboard] useEffect (auth loading/isAdmin/profile/election)');
    if (authLoading) return; // aguarda auth resolver
    
    // Carregar configurações de eleição para todos os usuários
    loadElectionSettings();
    
    // Carregar estatísticas para ADMIN e LÍDER
    loadStats().catch(error => {
      console.error('Erro ao carregar dados do dashboard:', error);
    });
  }, [authLoading, isAdminUser, profile?.id, election?.election_level, defaultFilters]);

  // Invalidar cache da meta quando o usuário trocar
  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Invalidar cache da meta quando há mudança de autenticação
        invalidateLeaderGoal();
      }
    });

    return () => subscription.unsubscribe();
  }, [invalidateLeaderGoal]);

  const loadElectionSettings = async () => {
    try {
      setCountdownLoading(true);
      
      // Usar a função real de countdown
      const { loadCountdownData } = await import('@/services/publicSettings');
      const countdownData = await loadCountdownData();
      
      if (countdownData) {
        const { formatCountdown } = await import('@/services/election');
        const countdown = formatCountdown(countdownData.date);
        setCountdownText(countdown);
        setElectionLabel(`${countdownData.name || 'Eleição'} • ${new Date(countdownData.date).toLocaleDateString('pt-BR')}`);
      } else {
        setCountdownText("Erro ao carregar");
        setElectionLabel("Erro na configuração");
      }
      
    } catch (error) {
      console.error('Erro:', error);
      setCountdownText("Erro ao carregar");
      setElectionLabel("Erro na configuração");
    } finally {
      setCountdownLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const supabase = getSupabaseClient();
      
      if (isAdminUser) {
        // Para ADMIN: carregar estatísticas gerais com filtros de eleição
        console.log('🔍 [Dashboard] Filtros de eleição:', { election, defaultFilters });
        
        // Construir filtros baseados na eleição
        let peopleQuery = supabase.from('people').select('id', { count: 'exact', head: true });
        let confirmedQuery = supabase.from('people').select('id', { count: 'exact', head: true }).eq('vote_status', 'CONFIRMADO');
        let probableQuery = supabase.from('people').select('id', { count: 'exact', head: true }).eq('vote_status', 'PROVAVEL');
        
        // Aplicar filtros se for eleição municipal
        if (election?.election_level === 'MUNICIPAL' && defaultFilters.city && defaultFilters.state) {
          console.log('🔍 [Dashboard] Aplicando filtros municipais:', { city: defaultFilters.city, state: defaultFilters.state });
          peopleQuery = peopleQuery.eq('city', defaultFilters.city).eq('state', defaultFilters.state);
          confirmedQuery = confirmedQuery.eq('city', defaultFilters.city).eq('state', defaultFilters.state);
          probableQuery = probableQuery.eq('city', defaultFilters.city).eq('state', defaultFilters.state);
        }
        
        const [leaderCounters, goalData, totalQ, confirmedQ, probableQ] = await Promise.all([
          getLeaderCounters(),
          getGoalSummary(),
          peopleQuery,
          confirmedQuery,
          probableQuery
        ]);
        
        console.log('🔍 [Dashboard] Dados do admin carregados:', {
          leaderCounters,
          goalData,
          effectiveTotalGoal: goalData.effective_total_goal,
          totalLeadersGoal: goalData.total_leaders_goal,
          defaultOrgGoal: goalData.default_org_goal
        });
        
        const totalPeople = totalQ.count ?? 0;
        const confirmedVotes = confirmedQ.count ?? 0;
        const probableVotes = probableQ.count ?? 0;

        console.log('🔍 [Dashboard] DEBUG - Contagem de pessoas:', {
          totalQ: totalQ,
          totalQCount: totalQ.count,
          totalPeople: totalPeople,
          confirmedQ: confirmedQ,
          probableQ: probableQ
        });

        console.log('Dashboard - Admin logado:', {
          leaderCounters,
          goalData,
          totalPeople,
          confirmedVotes,
          probableVotes
        });

        setStats({
          activeLeaders: leaderCounters.active,
          pendingLeaders: leaderCounters.pending,
          totalPeople: totalPeople || 0,
          confirmedVotes: confirmedVotes || 0,
          probableVotes: probableVotes || 0,
          effectiveTotalGoal: goalData.effective_total_goal
        });

        setGoalSummary(goalData);
        await loadTopLeaders();
      } else {
        // Para LÍDER: carregar apenas suas próprias estatísticas
        console.log('🔍 [Dashboard] isAdminUser é FALSE - executando lógica de líder');
        if (!profile?.id) { setLoading(false); return; }
        
        console.log('🔍 Carregando estatísticas do líder...');
        console.log('🔍 Profile ID:', profile.id);
        console.log('🔍 Profile Role:', profile.role);
        console.log('🔍 Is Admin:', isAdminUser);
        
        console.log('🔍 [Dashboard] DEBUG - Contagem para LÍDER:', {
          profileId: profile.id,
          queryFilter: `owner_id = ${profile.id}`
        });
        
        // Contagem apenas das pessoas cadastradas por este líder
        const [
          { count: totalPeople, error: totalError },
          { count: confirmedVotes, error: confirmedError },
          { count: probableVotes, error: probableError }
        ] = await Promise.all([
          supabase
            .from('people')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', profile.id),
          supabase
            .from('people')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', profile.id)
            .eq('vote_status', 'CONFIRMADO'),
          supabase
            .from('people')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', profile.id)
            .eq('vote_status', 'PROVAVEL')
        ]);

        if (totalError) throw totalError;
        if (confirmedError) throw confirmedError;
        if (probableError) throw probableError;

        // Usar meta do líder via hook (já carregada)
        const leaderGoal = leaderGoalData?.goal || 100;
        console.log('✅ Usando meta do líder via hook:', leaderGoal, 'Fonte:', leaderGoalData?.source);
        
        console.log('Dashboard - Líder logado:', {
          profileId: profile.id,
          leaderGoalData,
          leaderGoal,
          totalPeople,
          confirmedVotes,
          probableVotes
        });

        setStats({
          activeLeaders: 0, // Líder não vê contadores de outros líderes
          pendingLeaders: 0,
          totalPeople: totalPeople || 0,
          confirmedVotes: confirmedVotes || 0,
          probableVotes: probableVotes || 0,
          effectiveTotalGoal: leaderGoal
        });

        setGoalSummary(null); // Líder não vê resumo geral
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setError(handleSupabaseError(error, 'carregar estatísticas'));
    } finally {
      setLoading(false);
    }
  };

  const loadTopLeaders = async () => {
    try {
      const supabase = getSupabaseClient();
      
      // Query otimizada para top líderes usando agregação no banco
      let query = supabase
        .from('people')
        .select(`
          owner_id,
          vote_status,
          profiles!owner_id(full_name)
        `)
        .not('owner_id', 'is', null)
        .limit(1000); // Limite razoável para agregação
      
      // Aplicar filtros se for eleição municipal
      if (election?.election_level === 'MUNICIPAL' && defaultFilters.city && defaultFilters.state) {
        console.log('🔍 [Dashboard] Aplicando filtros municipais no Top Leaders:', { city: defaultFilters.city, state: defaultFilters.state });
        query = query.eq('city', defaultFilters.city).eq('state', defaultFilters.state);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      // Agregação no cliente (idealmente seria uma view/RPC no banco)
      const leaderStats = new Map<string, { name: string; total: number; confirmed: number }>();
      
      data?.forEach(person => {
        const leaderId = person.owner_id;
        const leaderName = (person.profiles as any)?.full_name || 'Líder';
        
        if (!leaderStats.has(leaderId)) {
          leaderStats.set(leaderId, { name: leaderName, total: 0, confirmed: 0 });
        }
        
        const stats = leaderStats.get(leaderId)!;
        stats.total++;
        if (person.vote_status === 'CONFIRMADO') {
          stats.confirmed++;
        }
      });

      // Converter para array e ordenar por total de pessoas
      const topLeadersData: TopLeader[] = Array.from(leaderStats.entries())
        .map(([leaderId, stats]) => ({
          leader_id: leaderId,
          leader_name: stats.name,
          total_people: stats.total,
          confirmed_votes: stats.confirmed
        }))
        .sort((a, b) => b.total_people - a.total_people)
        .slice(0, 5); // Top 5

      setTopLeaders(topLeadersData);
    } catch (error) {
      console.error('Erro ao carregar top líderes:', error);
      // Não falha o dashboard inteiro se top líderes falhar
    }
  };

  const handleUpdateOrgGoal = async () => {
    try {
      console.log('🔍 [Dashboard] Atualizando meta da organização...');
      const newGoal = await updateOrgGoalFromElectionType();
      
      if (newGoal > 0) {
        console.log('✅ [Dashboard] Meta atualizada:', newGoal);
        // Recarregar estatísticas para mostrar a nova meta
        await loadStats();
      } else {
        console.warn('⚠️ [Dashboard] Nenhuma meta foi calculada');
      }
    } catch (error) {
      console.error('❌ [Dashboard] Erro ao atualizar meta:', error);
    }
  };

  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  // Calcular progresso da meta
  const metaAtual = isAdminUser ? stats.effectiveTotalGoal : (leaderGoalData?.goal || 100);
  const progressoMeta = metaAtual > 0 
    ? Math.round((stats.totalPeople / metaAtual) * 100)
    : 0;
  
  const estatisticasCards = [
    // Mostrar card de lideranças apenas para ADMIN
    ...(isAdminUser ? [{
      titulo: 'Total de Lideranças',
      valor: stats.activeLeaders,
      icon: Users,
      cor: 'bg-blue-500',
      descricao: `${stats.pendingLeaders} pendentes`
    }] : []),
    {
      titulo: isAdminUser ? 'Total de Contatos' : 'Meus Contatos',
      valor: stats.totalPeople,
      icon: UserCheck,
      cor: 'bg-green-500',
      descricao: `Meta: ${metaAtual}`
    },
    {
      titulo: isAdminUser ? 'Votos Confirmados' : 'Meus Votos Confirmados',
      valor: stats.confirmedVotes,
      icon: Target,
      cor: 'bg-emerald-500',
      descricao: `${stats.probableVotes} prováveis`
    },
    // Card de Meta Geral (apenas para ADMIN)
    ...(isAdminUser && goalSummary ? [{
      titulo: 'Meta Geral',
      valor: goalSummary.effective_total_goal,
      icon: Settings,
      cor: 'bg-purple-500',
      descricao: `Líderes: ${goalSummary.total_leaders_goal}`,
      editable: true,
      onUpdate: handleUpdateOrgGoal
    }] : []),
    // Card de Meta Pessoal (apenas para LÍDER) - será renderizado separadamente
    {
      titulo: isAdminUser ? 'Progresso da Meta' : 'Meu Progresso',
      valor: `${progressoMeta}%`,
      icon: TrendingUp,
      cor: 'bg-purple-500',
      descricao: `${stats.totalPeople}/${metaAtual}`
    },
    // Card de contagem regressiva
    {
      titulo: 'Contagem regressiva',
      valor: countdownLoading ? "Carregando..." : (countdownText || "—"),
      icon: Calendar,
      cor: 'bg-orange-500',
      descricao: countdownLoading ? "Carregando..." : (countdownText.includes("Hoje") ? "É hoje!" : "para a eleição"),
      extraInfo: electionLabel
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header 
          profile={profile as any}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <div className="flex">
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          
          <main className="flex-1 overflow-x-hidden">
            <div className="p-6 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Carregando estatísticas...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        profile={profile as any}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Visão geral da campanha política</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Última atualização: hoje</span>
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isAdminUser ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              {estatisticasCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.titulo}</p>
                          {card.editable && card.onUpdate && (
                            <button
                              onClick={card.onUpdate}
                              className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 px-2 py-1 rounded transition-colors"
                              title="Atualizar meta automaticamente"
                            >
                              ↻
                            </button>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatNumber(card.valor)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.descricao}</p>
                        {card.extraInfo && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.extraInfo}</p>
                        )}
                      </div>
                      <div className={`p-3 rounded-lg ${card.cor}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Card de Meta do Líder (apenas para LÍDER) */}
            {!isAdminUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardGoalCard />
              </div>
            )}

            {/* Gráfico de Progresso */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {isAdminUser ? 'Progresso da Meta de Contatos' : 'Meu Progresso de Contatos'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{isAdminUser ? 'Contatos Realizados' : 'Meus Contatos'}</span>
                  <span>{formatNumber(stats.totalPeople)} / {formatNumber(metaAtual)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progressoMeta, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>0%</span>
                  <span className="font-medium">{progressoMeta}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Lideranças - Apenas para Admin */}
              {console.log('🔍 DEBUG Top Leaders:', { isAdminUser, topLeadersLength: topLeaders.length, topLeaders })}
              {isAdminUser && topLeaders.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 5 Lideranças</h3>
                  <div className="space-y-4">
                    {topLeaders.map((leader, index) => (
                      <div key={leader.leader_id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {leader.leader_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatNumber(leader.total_people)} contatos
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {formatNumber(leader.confirmed_votes)} confirmados
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distribuição de Votos */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribuição de Votos</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Confirmados', valor: stats.confirmedVotes, cor: 'bg-green-500' },
                    { label: 'Prováveis', valor: stats.probableVotes, cor: 'bg-yellow-500' },
                    { label: 'Indefinidos', valor: stats.totalPeople - stats.confirmedVotes - stats.probableVotes, cor: 'bg-gray-500' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.cor}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(item.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
