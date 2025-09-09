import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import useAuth from '@/hooks/useAuth';
import { useElection } from '@/contexts/ElectionContext';
import {
  listCitiesForFilter, listNeighborhoodGoals, listCityProjection, listNeighborhoodProjection
} from '@/services/projecoes';
import { listLeaders } from '@/services/admin';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, Target, Users, TrendingUp, MapPin, CalendarDays, Edit3, Search } from 'lucide-react';
import { CityGoalModal, NeighborhoodGoalModal } from '@/components/ProjecaoModals';
import ElectionSettingsModal from '@/components/modals/ElectionSettingsModal';
import type { CityGoal, NeighborhoodGoal, CityProjection, NeighborhoodProjection } from '@/types/projecoes';

// Função para formatar números com separadores de milhares
const formatNumber = (num: number | string): string => {
  if (typeof num === 'string') return num;
  return num.toLocaleString('pt-BR');
};

export default function Projecao() {
  const { profile } = useAuth();
  const { election, setElection } = useElection();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projecao');

  // Estados dos dados
  const [cities, setCities] = useState<{ city: string; state: string; goal?: number; deadline?: string | null }[]>([]);
  const [hoods, setHoods] = useState<NeighborhoodGoal[]>([]);
  const [hoodProjections, setHoodProjections] = useState<NeighborhoodProjection[]>([]);
  const [cityProjections, setCityProjections] = useState<CityProjection[]>([]);
  // const [leaders] = useState<unknown[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('__all__');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [citySearchTerm, setCitySearchTerm] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Estados dos modais
  const [showCityModal, setShowCityModal] = useState(false);
  const [showHoodModal, setShowHoodModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados para edição
  const [editingCityGoal, setEditingCityGoal] = useState<CityGoal | null>(null);
  const [editingHoodGoal, setEditingHoodGoal] = useState<NeighborhoodGoal | null>(null);
  
  // Estados para eleição
  const [electionOpen, setElectionOpen] = useState(false);

  // Proteção de rota - apenas admin
  useEffect(() => {
    if (profile && profile.role !== 'ADMIN') {
      navigate('/', { replace: true });
    }
  }, [profile, navigate]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [citiesRes, cityProjectionRes] = await Promise.all([
          listCitiesForFilter(),
          listCityProjection(),
          listLeaders(true)
        ]);
        
        setCities(citiesRes ?? []);
        setCityProjections(cityProjectionRes ?? []);
        // setLeaders(leadersRes ?? []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setToast({ message: 'Erro ao carregar dados. Tente novamente.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (profile?.role === 'ADMIN') {
      loadData();
    }
  }, [profile]);

  // Carregar dados por cidade quando selecionada
  useEffect(() => {
    if (selectedCity !== '__all__') {
      const loadCityData = async () => {
        try {
          // Extrair cidade e estado do valor selecionado
          const [rawCity, rawState] = selectedCity.split('-');
          const city = (rawCity ?? '').trim().toLowerCase();
          const state = (rawState ?? '').trim().toUpperCase();
          
          // Carregar metas e projeções em paralelo
          const [hoodsRes, projRes] = await Promise.all([
            listNeighborhoodGoals(),
            listNeighborhoodProjection(city, state)
          ]);
          
          // Filtrar bairros da cidade selecionada
          const filteredHoods = hoodsRes.filter(h =>
            (h.city ?? '').toLowerCase() === city &&
            (h.state ?? '').toUpperCase() === state
          );
          
          setHoods(filteredHoods);
          setHoodProjections(projRes ?? []);
        } catch (error) {
          console.error('Erro ao carregar dados da cidade:', error);
          setToast({ message: 'Erro ao carregar dados da cidade.', type: 'error' });
        }
      };

      loadCityData();
    } else {
      setHoods([]);
      setHoodProjections([]);
    }
  }, [selectedCity]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    if (selectedCity === '__all__') {
      // por cidade - usar dados da projeção
      return (cityProjections ?? []).map(proj => ({
        name: `${proj.city.toUpperCase()}-${proj.state.toUpperCase()}`,
        meta: proj.meta,
        confirmados: proj.confirmados,
        provaveis: proj.provaveis,
        realizado: proj.realizado,
        cobertura_pct: proj.cobertura_pct,
      }));
    }
    // por bairro da cidade - com dados reais das projeções
    return (hoods ?? []).map(hg => {
      // Encontrar a projeção correspondente
      const p = hoodProjections.find(x =>
        x.neighborhood.toLowerCase() === (hg.neighborhood ?? '').toLowerCase()
      );
      
      const confirmados = p?.confirmed ?? 0;
      const provaveis = p?.probable ?? 0;
      const realizado = confirmados + provaveis;
      
      return {
        name: hg.neighborhood?.toUpperCase(),
        meta: hg.goal,
        confirmados,
        provaveis,
        realizado,
      };
    });
  }, [selectedCity, cityProjections, hoods, hoodProjections]);

  // Totais calculados
  const totals = useMemo(() => {
    if (selectedCity === '__all__') {
      const meta = cityProjections.reduce((sum, proj) => sum + proj.meta, 0);
      const conf = cityProjections.reduce((sum, proj) => sum + proj.confirmados, 0);
      const prob = cityProjections.reduce((sum, proj) => sum + proj.provaveis, 0);
      const realizado = cityProjections.reduce((sum, proj) => sum + proj.realizado, 0);
      return { meta, conf, prob, realizado, cov: meta ? Math.round((realizado/meta)*100) : 0 };
    } else {
      const meta = hoods.reduce((sum, hood) => sum + hood.goal, 0);
      
      // Calcular totais com dados reais das projeções
      let conf = 0, prob = 0, realizado = 0;
      
      hoods.forEach(hg => {
        const p = hoodProjections.find(x =>
          x.neighborhood.toLowerCase() === (hg.neighborhood ?? '').toLowerCase()
        );
        
        if (p) {
          conf += p.confirmed;
          prob += p.probable;
          realizado += p.confirmed + p.probable;
        }
      });
      
      const cov = meta > 0 ? Math.round((realizado / meta) * 100) : 0;
      return { meta, conf, prob, realizado, cov };
    }
  }, [selectedCity, cityProjections, hoods, hoodProjections]);

  // Dados da tabela
  const tableData = useMemo(() => {
    if (selectedCity === '__all__') {
      // Filtrar cidades por termo de busca
      const filteredCities = citySearchTerm.trim() 
        ? (cityProjections ?? []).filter(proj => 
            proj.city.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
            proj.state.toLowerCase().includes(citySearchTerm.toLowerCase())
          )
        : (cityProjections ?? []);
        
      return filteredCities.map(proj => ({
        id: `${proj.city}-${proj.state}`,
        name: `${proj.city.toUpperCase()} - ${proj.state.toUpperCase()}`,
        meta: proj.meta,
        confirmados: proj.confirmados,
        provaveis: proj.provaveis,
        indefinidos: proj.indefinidos,
        total: proj.total,
        realizado: proj.realizado,
        gap: proj.gap,
        cobertura: proj.cobertura_pct,
        type: 'city'
      })).sort((a, b) => b.meta - a.meta);
    } else {
      // Filtrar bairros por termo de busca
      const filteredHoods = searchTerm.trim() 
        ? hoods.filter(hg => 
            hg.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : hoods;
        
      return filteredHoods.map(hg => {
        // Encontrar a projeção correspondente
        const p = hoodProjections.find(x =>
          x.neighborhood.toLowerCase() === (hg.neighborhood ?? '').toLowerCase()
        );
        
        const confirmados = p?.confirmed ?? 0;
        const provaveis = p?.probable ?? 0;
        const indefinidos = p?.undefined ?? 0;
        const total = p?.total_people ?? 0;
        const realizado = confirmados + provaveis;
        const gap = hg.goal - realizado;
        const cobertura = hg.goal > 0 ? Math.round((realizado * 100) / hg.goal) : 0;
        
        return {
          id: `${hg.city}-${hg.state}-${hg.neighborhood}`,
          name: hg.neighborhood?.toUpperCase(),
          meta: hg.goal,
          confirmados,
          provaveis,
          indefinidos,
          total,
          realizado,
          gap,
          cobertura,
          type: 'neighborhood'
        };
      }).sort((a, b) => b.meta - a.meta);
    }
  }, [selectedCity, cityProjections, hoods, hoodProjections, searchTerm, citySearchTerm]);

  // Funções de callback para recarregar dados
  const handleCityGoalSuccess = async () => {
    try {
      const [citiesRes, cityProjectionRes] = await Promise.all([
        listCitiesForFilter(),
        listCityProjection()
      ]);
      setCities(citiesRes ?? []);
      setCityProjections(cityProjectionRes ?? []);
    } catch (error) {
      console.error('Erro ao recarregar dados:', error);
      setToast({ message: 'Erro ao recarregar dados.', type: 'error' });
    }
  };

  const handleHoodGoalSuccess = async () => {
    try {
      if (selectedCity !== '__all__') {
        const [city, state] = selectedCity.split('-');
        const [hoodsRes, projRes] = await Promise.all([
          listNeighborhoodGoals(),
          listNeighborhoodProjection(city, state)
        ]);
        
        const filteredHoods = hoodsRes.filter(h => 
          h.city.toLowerCase() === city.toLowerCase() && 
          h.state.toUpperCase() === state.toUpperCase()
        );
        
        setHoods(filteredHoods);
        setHoodProjections(projRes ?? []);
      }
    } catch (error) {
      console.error('Erro ao recarregar dados do bairro:', error);
      setToast({ message: 'Erro ao recarregar dados do bairro.', type: 'error' });
    }
  };

  // Funções para abrir modais de edição
  const handleEditCityGoal = (cityGoal: CityGoal) => {
    setEditingCityGoal(cityGoal);
    setShowCityModal(true);
  };

  const handleEditHoodGoal = (hoodGoal: NeighborhoodGoal) => {
    setEditingHoodGoal(hoodGoal);
    setShowHoodModal(true);
  };

  // Funções para fechar modais
  const handleCloseCityModal = () => {
    setShowCityModal(false);
    setEditingCityGoal(null);
  };

  const handleCloseHoodModal = () => {
    setShowHoodModal(false);
    setEditingHoodGoal(null);
  };

  // Função para toast
  const handleToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (profile?.role !== 'ADMIN') {
    return null; // Será redirecionado
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} profile={profile as any} />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-x-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projeção de Votação</h1>
                <p className="text-gray-600 dark:text-gray-400">Metas por cidade/bairro, desempenho e alocação de lideranças.</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setElectionOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Definir eleição</span>
                </button>
                {election?.election_level === 'ESTADUAL' && (
                  <button
                    onClick={() => setShowCityModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Meta Cidade</span>
                  </button>
                )}
                <button
                  onClick={() => setShowHoodModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Meta Bairro</span>
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300">Cidade:</label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSearchTerm(''); // Limpar busca ao trocar cidade
                  setCitySearchTerm(''); // Limpar busca de cidade
                }}
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="__all__">Todas</option>
                {cities.map((c, index) => (
                  <option key={`${c.city}-${c.state}-${index}`} value={`${c.city}-${c.state}`}>{c.city.toUpperCase()} - {c.state.toUpperCase()}</option>
                ))}
              </select>
              
              {/* Campo de busca para cidades */}
              {selectedCity === '__all__' && (
                <>
                  <label className="text-sm text-gray-700 dark:text-gray-300">Pesquisar cidade:</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={citySearchTerm}
                      onChange={(e) => setCitySearchTerm(e.target.value)}
                      placeholder="Digite o nome da cidade ou estado..."
                      className="pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                  </div>
                </>
              )}
              
              {/* Campo de busca para bairros */}
              {selectedCity !== '__all__' && (
                <>
                  <label className="text-sm text-gray-700 dark:text-gray-300">Pesquisar bairro:</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Digite o nome do bairro..."
                      className="pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card label="Meta" value={totals.meta} icon={<Target className="h-5 w-5" />} />
              <Card label="Confirmados" value={totals.conf} icon={<Users className="h-5 w-5" />} />
              <Card label="Prováveis" value={totals.prob} icon={<TrendingUp className="h-5 w-5" />} />
              <Card label="Realizado" value={totals.realizado} icon={<Users className="h-5 w-5" />} />
              <Card label="Cobertura" value={`${totals.cov}%`} icon={<MapPin className="h-5 w-5" />} />
            </div>

            {/* Gráfico */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                {selectedCity === '__all__' ? 'Meta x Votos por Cidade' : `Meta x Votos por Bairro — ${selectedCity.split('-')[0].toUpperCase()}`}
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: any) => [formatNumber(value), '']}
                    />
                    <Legend />
                    <Bar dataKey="meta" name="Meta" fill="#3B82F6" />
                    <Bar dataKey="confirmados" name="Confirmados" fill="#10B981" />
                    <Bar dataKey="provaveis" name="Prováveis" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedCity === '__all__' ? 'Resumo por Cidade' : `Resumo por Bairro - ${selectedCity.split('-')[0].toUpperCase()}`}
                    </h3>
                    {selectedCity === '__all__' && citySearchTerm.trim() && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Mostrando {tableData.length} de {cityProjections.length} cidades
                      </p>
                    )}
                    {selectedCity !== '__all__' && searchTerm.trim() && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Mostrando {tableData.length} de {hoods.length} bairros
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                    <Edit3 className="h-4 w-4" />
                    <span>Clique na linha para editar a meta</span>
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {selectedCity === '__all__' ? 'Cidade' : 'Bairro'}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Meta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Confirmados
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Prováveis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Realizado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Gap
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Cobertura
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tableData.map((row) => (
                      <tr 
                        key={row.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                        onClick={() => {
                          if (row.type === 'city') {
                            // Buscar na lista de cityProjections que tem os dados corretos
                            const cityProj = cityProjections.find(cp => `${cp.city}-${cp.state}` === row.id);
                            if (cityProj) {
                              // Criar um CityGoal temporário para edição
                              const cityGoal: CityGoal = {
                                city: cityProj.city,
                                state: cityProj.state,
                                goal: cityProj.meta,
                                deadline: null // Não temos deadline nas projeções, será preenchido pelo modal
                              };
                              handleEditCityGoal(cityGoal);
                            }
                          } else {
                            const hoodGoal = hoods.find(h => `${h.city}-${h.state}-${h.neighborhood}` === row.id);
                            if (hoodGoal) {
                              handleEditHoodGoal(hoodGoal);
                            }
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span>{row.name}</span>
                            <Edit3 className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.meta)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.confirmados)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.provaveis)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.realizado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatNumber(row.gap)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            row.cobertura >= 80 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : row.cobertura >= 60
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {row.cobertura}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <button 
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.type === 'city') {
                                // Buscar na lista de cityProjections que tem os dados corretos
                                const cityProj = cityProjections.find(cp => `${cp.city}-${cp.state}` === row.id);
                                if (cityProj) {
                                  // Criar um CityGoal temporário para edição
                                  const cityGoal: CityGoal = {
                                    city: cityProj.city,
                                    state: cityProj.state,
                                    goal: cityProj.meta,
                                    deadline: null // Não temos deadline nas projeções, será preenchido pelo modal
                                  };
                                  handleEditCityGoal(cityGoal);
                                }
                              } else {
                                const hoodGoal = hoods.find(h => `${h.city}-${h.state}-${h.neighborhood}` === row.id);
                                if (hoodGoal) {
                                  handleEditHoodGoal(hoodGoal);
                                }
                              }
                            }}
                          >
                            Editar Meta
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modais */}
      <CityGoalModal
        isOpen={showCityModal}
        onClose={handleCloseCityModal}
        onSuccess={handleCityGoalSuccess}
        editData={editingCityGoal}
        defaultDeadline={election?.election_date}
        onToast={handleToast}
      />
      
      <NeighborhoodGoalModal
        isOpen={showHoodModal}
        onClose={handleCloseHoodModal}
        onSuccess={handleHoodGoalSuccess}
        editData={editingHoodGoal}
        defaultDeadline={election?.election_date}
        onToast={handleToast}
      />
      
      <ElectionSettingsModal
        open={electionOpen}
        onClose={() => setElectionOpen(false)}
        onSaved={(savedSettings) => {
          // Atualizar o contexto manualmente
          setElection(savedSettings);
          setElectionOpen(false);
        }}
      />

      {/* Toast de Feedback */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="text-current hover:opacity-70 transition-opacity"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        </div>
        <div className="ml-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{formatNumber(value)}</div>
        </div>
      </div>
    </div>
  );
}
