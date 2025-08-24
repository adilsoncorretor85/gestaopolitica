import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { getLeaderCounters } from '@/lib/dashboard';
import { listPeople } from '@/services/people';
import { Users, UserCheck, Target, TrendingUp, Calendar, MapPin } from 'lucide-react';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { profile, isAdmin: isAdminUser } = useAuth();
  
  const [stats, setStats] = useState({
    activeLeaders: 0,
    pendingLeaders: 0,
    totalPeople: 0,
    confirmedVotes: 0,
    probableVotes: 0,
    defaultGoal: 120
  });
  const [topLeaders, setTopLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Carregar contadores de líderes
      const { active: activeLeaders, pending: pendingLeaders } = await getLeaderCounters();
      
      // Carregar pessoas
      const peopleResult = await listPeople({
        page: 1,
        pageSize: 1000 // Para contar todos
      });
      
      const people = peopleResult.data || [];
      const confirmedVotes = people.filter(p => p.vote_status === 'CONFIRMADO').length;
      const probableVotes = people.filter(p => p.vote_status === 'PROVAVEL').length;

      setStats({
        activeLeaders,
        pendingLeaders,
        totalPeople: people.length,
        confirmedVotes,
        probableVotes,
        defaultGoal: 120
      });

      // Top líderes por número de pessoas cadastradas (apenas para admin)
      if (isAdminUser) {
        // TODO: Implementar top líderes quando necessário
        setTopLeaders([]);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  const progressoMeta = Math.round((stats.totalPeople / stats.defaultGoal) * 100);
  
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
      titulo: 'Total de Contatos',
      valor: stats.totalPeople,
      icon: UserCheck,
      cor: 'bg-green-500',
      descricao: `Meta: ${stats.defaultGoal}`
    },
    {
      titulo: 'Votos Confirmados',
      valor: stats.confirmedVotes,
      icon: Target,
      cor: 'bg-emerald-500',
      descricao: `${stats.probableVotes} prováveis`
    },
    {
      titulo: 'Progresso da Meta',
      valor: `${progressoMeta}%`,
      icon: TrendingUp,
      cor: 'bg-purple-500',
      descricao: `${stats.totalPeople}/${stats.defaultGoal}`
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          profile={profile}
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
              <p className="text-gray-500">Carregando estatísticas...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        profile={profile}
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
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Visão geral da campanha política</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Última atualização: hoje</span>
              </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isAdminUser ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {estatisticasCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{card.titulo}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{card.valor}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.descricao}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${card.cor}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gráfico de Progresso */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso da Meta de Contatos</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Contatos Realizados</span>
                  <span>{stats.totalPeople} / {stats.defaultGoal}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progressoMeta, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span className="font-medium">{progressoMeta}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Lideranças - Apenas para Admin */}
              {isAdminUser && topLeaders.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Lideranças</h3>
                  <div className="space-y-4">
                    {topLeaders.map((leader, index) => (
                      <div key={leader.leader_id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {leader.leader_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {leader.total_people} contatos
                          </p>
                          <p className="text-xs text-green-600">
                            {leader.confirmed_votes} confirmados
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distribuição de Votos */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Votos</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Confirmados', valor: stats.confirmedVotes, cor: 'bg-green-500' },
                    { label: 'Prováveis', valor: stats.probableVotes, cor: 'bg-yellow-500' },
                    { label: 'Indefinidos', valor: stats.totalPeople - stats.confirmedVotes - stats.probableVotes, cor: 'bg-gray-500' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.cor}`} />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.valor}</span>
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