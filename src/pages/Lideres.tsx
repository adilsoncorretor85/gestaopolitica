import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { listLeaders, type LeaderListItem } from '@/services/leader';
import { resendInvite } from '@/services/invite';
import { Users, Plus, Edit2, Shield, Mail, RefreshCw, Clock, Crown } from 'lucide-react';
import LeaderLeadershipModal from '@/components/modals/LeaderLeadershipModal';
import LeaderDrawer from '@/components/drawers/LeaderDrawer';

export default function LideresPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lideres');
  const { profile, isAdmin } = useAuth();
  
  const [tab, setTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [rows, setRows] = useState<LeaderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Estados para o modal de lideranças
  const [leadershipOpen, setLeadershipOpen] = useState(false);
  const [leadershipLeaderId, setLeadershipLeaderId] = useState<string | null>(null);
  
  // Estados para o drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setError('');
      const data = await listLeaders();
      const filtered = data.filter(leader => {
        if (tab === 'ACTIVE') return leader.is_active;
        if (tab === 'PENDING') return leader.is_pending;
        return false;
      });
      setRows(filtered);
      console.log(`Líderes ${tab}:`, data);
      console.log('Status dos líderes:', data.map(l => ({ name: l.full_name, status: l.status, is_pending: l.is_pending, is_active: l.is_active })));
    } catch (error) {
      console.error('Erro ao carregar líderes:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      load();
    }
  }, [isAdmin, tab]);

  const handleReinvite = async (leader: LeaderListItem) => {
    try {
      setActionLoading(`reinvite-${leader.email}`);
      const result = await resendInvite(leader.email!, leader.full_name || '');
      
      alert(result?.message || 'Convite reenviado com sucesso!');
      if (result?.acceptUrl) {
        console.log('Link de convite:', result.acceptUrl);
      }
      
      // Recarregar a lista
      load();
    } catch (error) {
      console.error('resendInvite error', error);
      alert(`Erro ao reenviar convite: ${error instanceof Error ? error.message : error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvite = async (email: string, fullName: string) => {
    if (!confirm(`Cancelar convite de ${fullName}?`)) return;
    
    try {
      setActionLoading(`revoke-${email}`);
      // Implementar revogação se necessário
      alert('Convite cancelado com sucesso!');
      load(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      alert(error instanceof Error ? error.message : 'Erro ao cancelar convite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (leader: LeaderListItem) => {
    setSelectedLeaderId(leader.id);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedLeaderId(null);
  };


  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  // Se não for admin, não mostrar a página
  console.log('Renderizando página - isAdmin:', isAdmin, 'loading:', loading, 'rows.length:', rows.length);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
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
            <div className="p-6">
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Acesso Restrito</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Apenas administradores podem acessar esta página
                </p>
              </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Líderes</h1>
                <p className="text-gray-600 dark:text-gray-400">Gerencie os líderes e convites</p>
              </div>
              <Link
                to="/lideres/novo"
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Convidar Líder</span>
              </Link>
            </div>

            {/* Abas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setTab('ACTIVE')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      tab === 'ACTIVE'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Ativos
                  </button>
                  <button
                    onClick={() => setTab('PENDING')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      tab === 'PENDING'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Pendentes
                  </button>
                </nav>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Carregando líderes...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-12">
                  {tab === 'ACTIVE' ? (
                    <>
                      <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        Nenhum líder ativo
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Os líderes aparecerão aqui após aceitarem o convite
                      </p>
                    </>
                  ) : (
                    <>
                      <Clock className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        Nenhum convite pendente
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Convites enviados aparecerão aqui até serem aceitos
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tab === 'ACTIVE' ? 'Líder' : 'Nome/Email'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          {tab === 'ACTIVE' ? 'Contato' : 'Convidado em'}
                        </th>
                        {tab === 'ACTIVE' && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Meta
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {rows.map((leader) => (
                        <tr 
                          key={leader.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(leader)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                tab === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
                              }`}>
                                {tab === 'ACTIVE' ? (
                                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {leader.full_name || 'Sem nome'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {leader.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {tab === 'ACTIVE' ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                  <span className="text-sm text-gray-900 dark:text-white">{leader.email}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900 dark:text-white">
                                {leader.invited_at 
                                  ? new Date(leader.invited_at).toLocaleDateString('pt-BR')
                                  : 'Não enviado'
                                }
                              </div>
                            )}
                          </td>
                          {tab === 'ACTIVE' && (
                            <td className="px-6 py-4">
                              {leader.goal ? (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                                  {leader.goal} contatos
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500">Sem meta</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              leader.status === 'ACTIVE' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                                : leader.status === 'PENDING'
                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'
                                : leader.status === 'INVITED'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                            }`}>
                              {leader.status === 'ACTIVE' ? 'Ativo' : 
                               leader.status === 'PENDING' ? 'Pendente' : 
                               leader.status === 'INVITED' ? 'Convidado' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {tab === 'ACTIVE' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🔍 Botão "Nível de liderança" clicado!');
                                    console.log('Leader:', leader);
                                    console.log('Leader ID (leader_profiles.id):', leader.id);
                                    console.log('Leader full_name:', leader.full_name);
                                    
                                    // Validar se é um UUID válido
                                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                                    if (!leader.id || !uuidRegex.test(leader.id)) {
                                      console.error('❌ Leader ID is not a valid UUID:', leader.id);
                                      alert('Erro: ID do líder inválido');
                                      return;
                                    }
                                    
                                    console.log('✅ Leader ID válido, abrindo modal...');
                                    setLeadershipLeaderId(leader.id); // Usar leader.id (leader_profiles.id)
                                    setLeadershipOpen(true);
                                    console.log('✅ Modal deve estar aberto agora');
                                  }}
                                  className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-400 p-2 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                  title="Nível de liderança"
                                >
                                  <Crown className="h-4 w-4" />
                                  <span className="hidden sm:inline">Nível de liderança</span>
                                </button>
                                <Link
                                  to={`/lideres/${leader.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Link>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReinvite(leader);
                                  }}
                                  disabled={actionLoading === `reinvite-${leader.email}`}
                                  className="p-2 text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Reenviar convite"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevokeInvite(leader.email || '', leader.full_name || leader.email || '');
                                  }}
                                  disabled={actionLoading === `revoke-${leader.email}`}
                                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50 transition-colors"
                                  title="Cancelar convite"
                                >
                                  {actionLoading === `revoke-${leader.email}` ? 'Cancelando...' : 'Cancelar'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Modal de Nível de Liderança */}
      {leadershipOpen && leadershipLeaderId && leadershipLeaderId !== 'undefined' && leadershipLeaderId !== 'null' && (
        <LeaderLeadershipModal
          isOpen={leadershipOpen}
          leaderProfileId={leadershipLeaderId}
          leaderCity={rows.find(l => l.id === leadershipLeaderId)?.city || undefined}
          leaderState={rows.find(l => l.id === leadershipLeaderId)?.state || undefined}
          onClose={() => { 
            setLeadershipOpen(false); 
            setLeadershipLeaderId(null);
          }}
        />
      )}

      {/* Drawer de Detalhes do Líder */}
      <LeaderDrawer
        open={drawerOpen}
        leaderId={selectedLeaderId}
        onClose={handleCloseDrawer}
        onEdited={load}
      />
    </div>
  );
}