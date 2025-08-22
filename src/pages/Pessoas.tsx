import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { listPeople, deletePerson, type Person } from '@/services/people';
import { listLeaders, type LeaderRow } from '@/services/admin';
import { Plus, Search, Filter, Phone, MapPin, Edit2, Trash2, ExternalLink } from 'lucide-react';

export default function PessoasPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pessoas');
  const { profile, isAdmin } = useAuth();
  
  const [people, setPeople] = useState<Person[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [leaderFilter, setLeaderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [search, cityFilter, stateFilter, leaderFilter, page]);

  useEffect(() => {
    if (isAdmin) {
      loadLeaders();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error, count } = await listPeople({
        q: search || undefined,
        city: cityFilter || undefined,
        state: stateFilter || undefined,
        leaderId: leaderFilter || undefined,
        page,
        pageSize: 20
      });

      if (error) throw error;
      setPeople(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaders = async () => {
    try {
      const data = await listLeaders(true);
      setLeaders(data || []);
    } catch (error) {
      console.error('Erro ao carregar líderes:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pessoa?')) return;
    
    try {
      const { error } = await deletePerson(id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      alert('Erro ao excluir pessoa');
    }
  };

  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  const formatWhatsApp = (whatsapp: string) => {
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    }
    return whatsapp;
  };

  const getWhatsAppLink = (whatsapp: string) => {
    const digits = whatsapp.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  };

  const getVoteStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMADO': return 'bg-green-100 text-green-800';
      case 'PROVAVEL': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVoteStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMADO': return 'Confirmado';
      case 'PROVAVEL': return 'Provável';
      default: return 'Indefinido';
    }
  };

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pessoas</h1>
                <p className="text-gray-600">Gerencie os contatos cadastrados</p>
              </div>
              <Link
                to="/pessoas/nova"
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Cadastrar Pessoa</span>
              </Link>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Cidade"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <input
                  type="text"
                  placeholder="Estado"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {isAdmin && (
                  <select
                    value={leaderFilter}
                    onChange={(e) => setLeaderFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os líderes</option>
                    {leaders.map(leader => (
                      <option key={leader.id} value={leader.id}>
                        {leader.status === 'INVITED' ? `${leader.full_name || 'Sem nome'} (pendente)` : (leader.full_name || 'Sem nome')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Carregando...</p>
                </div>
              ) : people.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Nenhuma pessoa encontrada
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comece cadastrando uma nova pessoa
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          WhatsApp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Localização
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contatado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {people.map((person) => (
                        <tr key={person.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {person.full_name}
                              </div>
                              {person.email && (
                                <div className="text-sm text-gray-500">{person.email}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {formatWhatsApp(person.whatsapp)}
                              </span>
                              <a
                                href={getWhatsAppLink(person.whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-500">
                                {person.city && person.state 
                                  ? `${person.city}, ${person.state}`
                                  : person.city || person.state || '-'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoteStatusColor(person.vote_status || 'INDEFINIDO')}`}>
                              {getVoteStatusLabel(person.vote_status || 'INDEFINIDO')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {person.contacted_at 
                                ? new Date(person.contacted_at).toLocaleDateString('pt-BR')
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Link
                                to={`/pessoas/${person.id}`}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleDelete(person.id!)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Paginação */}
            {total > 20 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total} resultados
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 20 >= total}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}