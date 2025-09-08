import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import Drawer from '@/components/Drawer';
import useAuth from '@/hooks/useAuth';
import { listPeople, deletePerson, updatePerson, type Person } from '@/services/people';
import { listLeaders, type LeaderRow } from '@/services/admin';
import { ESTADOS_BRASIL } from '@/data/estadosBrasil';
import { useElection } from '@/contexts/ElectionContext';
import { Plus, Search, Phone, MapPin, Edit2, Trash2, ExternalLink, Mail, Copy, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function PessoasPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pessoas');
  const { profile, isAdmin } = useAuth();
  const { defaultFilters } = useElection();
  
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
  const [sortBy, setSortBy] = useState<'full_name' | 'created_at' | 'city' | 'state'>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [overrode, setOverrode] = useState(false);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<'add' | 'edit' | null>(null);
  const [notesText, setNotesText] = useState('');
  const [updatingNotes, setUpdatingNotes] = useState(false);

  // Aplicar filtros padrão da eleição
  useEffect(() => {
    console.log('Pessoas - defaultFilters:', defaultFilters, 'overrode:', overrode);
    if (!overrode && defaultFilters) {
      if (defaultFilters.state) {
        console.log('Aplicando filtro de estado:', defaultFilters.state);
        setStateFilter(defaultFilters.state);
      }
      if (defaultFilters.city) {
        console.log('Aplicando filtro de cidade:', defaultFilters.city);
        setCityFilter(defaultFilters.city);
      }
    }
  }, [defaultFilters, overrode]);

  useEffect(() => {
    loadData();
  }, [search, cityFilter, stateFilter, leaderFilter, page, sortBy, sortOrder]);

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
        pageSize: 20,
        sortBy,
        sortOrder
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
      setDrawerOpen(false); // Fechar drawer após exclusão
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      alert('Erro ao excluir pessoa');
    }
  };

  const handleEdit = (person: Person) => {
    // Navegar para a página de edição
    window.location.href = `/pessoas/${person.id}`;
  };

  const handleRowClick = (person: Person) => {
    setSelectedPerson(person);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedPerson(null);
    setEditingNotes(null);
    setNotesText('');
  };

  // Função para atualizar status do voto
  const handleStatusChange = async (newStatus: 'CONFIRMADO' | 'PROVAVEL' | 'INDEFINIDO') => {
    if (!selectedPerson?.id || updatingStatus) return;

    const previousStatus = selectedPerson.vote_status;
    
    try {
      setUpdatingStatus(true);
      
      // Update otimista - atualizar estado local imediatamente
      setSelectedPerson(prev => prev ? { ...prev, vote_status: newStatus } : null);
      
      // Atualizar na lista também
      setPeople(prev => prev.map(person => 
        person.id === selectedPerson.id 
          ? { ...person, vote_status: newStatus }
          : person
      ));

      // Salvar no Supabase
      const { error } = await updatePerson(selectedPerson.id, { vote_status: newStatus });
      
      if (error) {
        throw error;
      }

      // Sucesso - mostrar toast
      setToast({ message: 'Status atualizado com sucesso!', type: 'success' });
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      
      // Reverter mudanças em caso de erro
      setSelectedPerson(prev => prev ? { ...prev, vote_status: previousStatus } : null);
      setPeople(prev => prev.map(person => 
        person.id === selectedPerson.id 
          ? { ...person, vote_status: previousStatus }
          : person
      ));
      
      setToast({ message: 'Erro ao atualizar status. Tente novamente.', type: 'error' });
    } finally {
      setUpdatingStatus(false);
      
      // Limpar toast após 3 segundos
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Função para gerar timestamp no formato DD/MM/YYYY HH:mm
  const getTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Função para adicionar observação
  const handleAddNote = async () => {
    if (!selectedPerson?.id || !notesText.trim() || updatingNotes) return;

    const timestamp = getTimestamp();
    const newNote = `- [${timestamp}] ${notesText.trim()}`;
    const currentNotes = selectedPerson.notes || '';
    const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;
    const previousNotes = selectedPerson.notes;

    try {
      setUpdatingNotes(true);
      
      // Update otimista
      setSelectedPerson(prev => prev ? { ...prev, notes: updatedNotes } : null);
      setPeople(prev => prev.map(person => 
        person.id === selectedPerson.id 
          ? { ...person, notes: updatedNotes }
          : person
      ));

      // Salvar no Supabase
      const { error } = await updatePerson(selectedPerson.id, { notes: updatedNotes });
      
      if (error) {
        throw error;
      }

      setToast({ message: 'Observação adicionada com sucesso!', type: 'success' });
      setEditingNotes(null);
      setNotesText('');
      
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      
      // Reverter mudanças
      setSelectedPerson(prev => prev ? { ...prev, notes: previousNotes } : null);
      setPeople(prev => prev.map(person => 
        person.id === selectedPerson.id 
          ? { ...person, notes: previousNotes }
          : person
      ));
      
      setToast({ message: 'Erro ao adicionar observação. Tente novamente.', type: 'error' });
    } finally {
      setUpdatingNotes(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Função para editar observações completas
  const handleEditNotes = async () => {
    if (!selectedPerson?.id || updatingNotes) return;

    const previousNotes = selectedPerson.notes;

    try {
      setUpdatingNotes(true);
      
      // Update otimista
      setSelectedPerson(prev => prev ? { ...prev, notes: notesText } : null);
      setPeople(prev => prev.map(person => 
        person.id === selectedPerson.id 
          ? { ...person, notes: notesText }
          : person
      ));

      // Salvar no Supabase
      const { error } = await updatePerson(selectedPerson.id, { notes: notesText });
      
      if (error) {
        throw error;
      }

      setToast({ message: 'Observações atualizadas com sucesso!', type: 'success' });
      setEditingNotes(null);
      setNotesText('');
      
    } catch (error) {
      console.error('Erro ao editar observações:', error);
      
      // Reverter mudanças
      setSelectedPerson(prev => prev ? { ...prev, notes: previousNotes } : null);
      setPeople(prev => prev.map(person => 
        person.id === selectedPerson.id 
          ? { ...person, notes: previousNotes }
          : person
      ));
      
      setToast({ message: 'Erro ao editar observações. Tente novamente.', type: 'error' });
    } finally {
      setUpdatingNotes(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesText('');
  };

  // Função para iniciar adição de observação
  const handleStartAddNote = () => {
    setEditingNotes('add');
    setNotesText('');
  };

  // Função para iniciar edição completa
  const handleStartEditNotes = () => {
    setEditingNotes('edit');
    setNotesText(selectedPerson?.notes || '');
  };

  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  const formatWhatsApp = (whatsapp: string) => {
    if (!whatsapp) return '';
    
    const digits = whatsapp.replace(/\D/g, '');
    
    // Formato brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    } else if (digits.length === 9) {
      return `${digits.substring(0, 5)}-${digits.substring(5)}`;
    } else if (digits.length === 8) {
      return `${digits.substring(0, 4)}-${digits.substring(4)}`;
    }
    
    return whatsapp;
  };

  const getWhatsAppLink = (whatsapp: string) => {
    const digits = whatsapp.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  };

  const getGoogleMapsLink = (latitude: number, longitude: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  };

  const copyPhoneNumber = async (phone: string) => {
    try {
      const digits = phone.replace(/\D/g, '');
      await navigator.clipboard.writeText(digits);
      setToast({ message: 'Número copiado para a área de transferência!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Erro ao copiar número:', error);
      setToast({ message: 'Erro ao copiar número', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSortChange = (newSortBy: 'full_name' | 'created_at' | 'city' | 'state') => {
    if (sortBy === newSortBy) {
      // Se já está ordenando por este campo, inverte a ordem
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, define como ascendente
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setPage(1); // Volta para a primeira página
  };

  const getSortIcon = (field: 'full_name' | 'created_at' | 'city' | 'state') => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pessoas</h1>
                <p className="text-gray-600 dark:text-gray-400">Gerencie os contatos cadastrados</p>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, cidade ou estado..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Cidade"
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setOverrode(true);
                  }}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value);
                    setOverrode(true);
                  }}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos os estados</option>
                  {ESTADOS_BRASIL.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.sigla} - {estado.nome}
                    </option>
                  ))}
                </select>

                {isAdmin && (
                  <select
                    value={leaderFilter}
                    onChange={(e) => setLeaderFilter(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos os líderes</option>
                    {leaders.map(leader => (
                      <option key={leader.id} value={leader.id}>
                        {leader.status === 'PENDING' ? `${leader.full_name || 'Sem nome'} (pendente)` : (leader.full_name || 'Sem nome')}
                      </option>
                    ))}
                  </select>
                )}

                {/* Ordenação */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Ordenar por:
                  </label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as 'full_name' | 'created_at' | 'city' | 'state');
                      setSortOrder(order as 'asc' | 'desc');
                      setPage(1);
                    }}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="full_name-asc">Nome (A-Z)</option>
                    <option value="full_name-desc">Nome (Z-A)</option>
                    <option value="city-asc">Cidade (A-Z)</option>
                    <option value="city-desc">Cidade (Z-A)</option>
                    <option value="state-asc">Estado (A-Z)</option>
                    <option value="state-desc">Estado (Z-A)</option>
                    <option value="created_at-desc">Mais recentes</option>
                    <option value="created_at-asc">Mais antigos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
                </div>
              ) : people.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Nenhuma pessoa encontrada
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Comece cadastrando uma nova pessoa
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => handleSortChange('full_name')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Nome</span>
                              {getSortIcon('full_name')}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            WhatsApp
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => handleSortChange('city')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Localização</span>
                              {getSortIcon('city')}
                            </div>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => handleSortChange('created_at')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Contatado</span>
                              {getSortIcon('created_at')}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {people.map((person) => (
                          <tr 
                            key={person.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                            onClick={() => handleRowClick(person)}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {person.full_name}
                                </div>
                                {person.email && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{person.email}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-white font-mono">
                                  {formatWhatsApp(person.whatsapp)}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyPhoneNumber(person.whatsapp);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Copiar número"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <a
                                    href={getWhatsAppLink(person.whatsapp)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                    title="Abrir WhatsApp"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">
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
                              <div className="text-sm text-gray-900 dark:text-white">
                                {person.contacted_at 
                                  ? new Date(person.contacted_at).toLocaleDateString('pt-BR')
                                  : '-'
                                }
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4 p-4">
                    {people.map((person) => (
                      <div 
                        key={person.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => handleRowClick(person)}
                      >
                        <div className="space-y-3">
                          {/* Nome e Email */}
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {person.full_name}
                            </h3>
                            {person.email && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{person.email}</p>
                            )}
                          </div>

                          {/* WhatsApp */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white font-mono">
                                {formatWhatsApp(person.whatsapp)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPhoneNumber(person.whatsapp);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="Copiar número"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <a
                                href={getWhatsAppLink(person.whatsapp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                                title="Abrir WhatsApp"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </div>

                          {/* Localização */}
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {person.city && person.state 
                                ? `${person.city}, ${person.state}`
                                : person.city || person.state || '-'
                              }
                            </span>
                          </div>

                          {/* Status e Data */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoteStatusColor(person.vote_status || 'INDEFINIDO')}`}>
                              {getVoteStatusLabel(person.vote_status || 'INDEFINIDO')}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {person.contacted_at 
                                ? new Date(person.contacted_at).toLocaleDateString('pt-BR')
                                : 'Não contatado'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Paginação */}
            {total > 20 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, total)} de {total} resultados
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 20 >= total}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        title={selectedPerson?.full_name || 'Detalhes do Contato'}
      >
        {selectedPerson && (
          <div className="space-y-6">
            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleEdit(selectedPerson)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => handleDelete(selectedPerson.id!)}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir</span>
              </button>
            </div>

            {/* Informações do Contato */}
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nome</h3>
                <p className="text-gray-900 dark:text-white">{selectedPerson.full_name}</p>
              </div>

              {/* WhatsApp */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">WhatsApp</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white font-mono text-lg">
                      {formatWhatsApp(selectedPerson.whatsapp)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => copyPhoneNumber(selectedPerson.whatsapp)}
                      className="flex items-center justify-center space-x-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Copiar número"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copiar número</span>
                    </button>
                    <a
                      href={getWhatsAppLink(selectedPerson.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1 px-3 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Abrir WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Email */}
              {selectedPerson.email && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</h3>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{selectedPerson.email}</span>
                  </div>
                </div>
              )}

              {/* Endereço */}
              {(selectedPerson.city || selectedPerson.state) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Localização</h3>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {selectedPerson.city && selectedPerson.state 
                        ? `${selectedPerson.city}, ${selectedPerson.state}`
                        : selectedPerson.city || selectedPerson.state || '-'
                      }
                    </span>
                    {selectedPerson.latitude && selectedPerson.longitude && (
                      <a
                        href={getGoogleMapsLink(selectedPerson.latitude, selectedPerson.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Abrir no Google Maps"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}


              {/* Status do Voto */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Status do Voto</h3>
                
                {/* Botões de Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <button
                    onClick={() => handleStatusChange('CONFIRMADO')}
                    disabled={updatingStatus}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      selectedPerson.vote_status === 'CONFIRMADO'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Confirmado
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('PROVAVEL')}
                    disabled={updatingStatus}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      selectedPerson.vote_status === 'PROVAVEL'
                        ? 'bg-yellow-600 text-white border-yellow-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-300 dark:hover:border-yellow-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Provável
                  </button>
                  
                  <button
                    onClick={() => handleStatusChange('INDEFINIDO')}
                    disabled={updatingStatus}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      selectedPerson.vote_status === 'INDEFINIDO'
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Indefinido
                  </button>
                </div>
                
                {/* Badge de Status Atual (para reforço visual) */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Status atual:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVoteStatusColor(selectedPerson.vote_status || 'INDEFINIDO')}`}>
                    {getVoteStatusLabel(selectedPerson.vote_status || 'INDEFINIDO')}
                  </span>
                </div>
              </div>

              {/* Data do Contato */}
              {selectedPerson.contacted_at && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Data do Contato</h3>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedPerson.contacted_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {/* Observações */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Observações</h3>
                
                {/* Botões de Ação */}
                {!editingNotes && (
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <button
                      onClick={handleStartAddNote}
                      className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      + Adicionar observação
                    </button>
                    <button
                      onClick={handleStartEditNotes}
                      className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Editar tudo
                    </button>
                  </div>
                )}

                {/* Editor de Texto */}
                {editingNotes && (
                  <div className="space-y-3">
                    <textarea
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      placeholder={editingNotes === 'add' ? 'Digite a nova observação...' : 'Edite as observações...'}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={editingNotes === 'add' ? handleAddNote : handleEditNotes}
                        disabled={updatingNotes || !notesText.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {updatingNotes ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={updatingNotes}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Exibição das Observações */}
                {selectedPerson.notes && !editingNotes && (
                  <div className="mt-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-sm">
                        {selectedPerson.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mensagem quando não há observações */}
                {!selectedPerson.notes && !editingNotes && (
                  <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                    Nenhuma observação registrada
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

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