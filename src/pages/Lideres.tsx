import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import useAuth from '@/hooks/useAuth';
import { fetchLeaders, reinviteLeader, type LeaderRow } from '@/services/admin';
import { revokeInvite, resendInvite } from '@/services/leader';
import { Users, Plus, Edit2, Shield, Mail, Phone, MapPin, Copy, RefreshCw, Clock } from 'lucide-react';

export default function LideresPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lideres');
  const { profile, isAdmin } = useAuth();
  
  const [tab, setTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setError('');
      const data = await fetchLeaders(tab);
      setRows(data);
      console.log(`Líderes ${tab}:`, data);
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

  const handleReinvite = async (leader: LeaderRow) => {
    try {
      setActionLoading(`reinvite-${leader.email}`);
      const result = await resendInvite(leader.email, leader.full_name || undefined);
      
      if (result.ok) {
        if (result.sent) {
          alert('E-mail de convite reenviado com sucesso!');
        } else if (result.link) {
          const message = `Convite criado. Link para copiar:\n\n${result.link}`;
          alert(message);
        } else {
          alert('Convite processado com sucesso!');
        }
      }
      
      // Recarregar a lista
      load();
    } catch (error) {
      console.error('Erro ao reenviar convite:', error);
      alert(error instanceof Error ? error.message : 'Erro ao reenviar convite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvite = async (email: string, fullName: string) => {
    if (!confirm(`Cancelar convite de ${fullName}?`)) return;
    
    try {
      setActionLoading(`revoke-${email}`);
      await revokeInvite(email);
      alert('Convite cancelado com sucesso!');
      load(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      alert(error instanceof Error ? error.message : 'Erro ao cancelar convite');
    } finally {
      setActionLoading(null);
    }
  };

  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  // Se não for admin, não mostrar a página
  if (!isAdmin) {
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
            <div className="p-6">
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Acesso Restrito</h3>
                <p className="mt-1 text-sm text-gray-500">
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
                <h1 className="text-2xl font-bold text-gray-900">Líderes</h1>
                <p className="text-gray-600">Gerencie os líderes e convites</p>
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setTab('ACTIVE')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      tab === 'ACTIVE'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Ativos
                  </button>
                  <button
                    onClick={() => setTab('PENDING')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      tab === 'PENDING'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pendentes
                  </button>
                </nav>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Carregando líderes...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center py-12">
                  {tab === 'ACTIVE' ? (
                    <>
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Nenhum líder ativo
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Os líderes aparecerão aqui após aceitarem o convite
                      </p>
                    </>
                  ) : (
                    <>
                      <Clock className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Nenhum convite pendente
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Convites enviados aparecerão aqui até serem aceitos
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {tab === 'ACTIVE' ? 'Líder' : 'Nome/Email'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {tab === 'ACTIVE' ? 'Contato' : 'Convidado em'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rows.map((leader) => (
                        <tr key={leader.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                tab === 'ACTIVE' ? 'bg-green-100' : 'bg-yellow-100'
                              }`}>
                                {tab === 'ACTIVE' ? (
                                  <Users className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Clock className="h-4 w-4 text-yellow-600" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {leader.full_name || 'Sem nome'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {leader.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {tab === 'ACTIVE' ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-900">{leader.email}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900">
                                {leader.invited_at 
                                  ? new Date(leader.invited_at).toLocaleDateString('pt-BR')
                                  : 'Não enviado'
                                }
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              leader.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800'
                                : leader.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {leader.status === 'ACTIVE' ? 'Ativo' : 
                               leader.status === 'PENDING' ? 'Pendente' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {tab === 'ACTIVE' ? (
                              <div className="flex items-center justify-end space-x-2">
                                <Link
                                  to={`/lideres/${leader.id}`}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Link>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleReinvite(leader)}
                                  disabled={actionLoading === `reinvite-${leader.email}`}
                                  className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Reenviar convite"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(leader.email, leader.full_name || leader.email)}
                                  disabled={actionLoading === `revoke-${leader.email}`}
                                  className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
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
    </div>
  );
}