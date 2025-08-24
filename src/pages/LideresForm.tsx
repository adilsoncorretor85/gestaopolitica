import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import useAuth from '@/hooks/useAuth';
import { getLeaderDetail, updateLeaderProfile, inviteLeader, deactivateLeader, type LeaderDetail } from '@/services/leader';
import { getLeaderDetail, updateLeaderProfile, inviteLeader, deactivateLeader, reactivateLeader, type LeaderDetail } from '@/services/leader';
import { toggleUserBan } from '@/services/admin';
import { fetchCep } from '@/lib/viacep';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';

const leaderSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  goal: z.number().min(0, 'Meta deve ser maior ou igual a 0').optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

type LeaderFormData = z.infer<typeof leaderSchema>;

export default function LideresFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lideres');
  const { profile, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [leaderData, setLeaderData] = useState<LeaderDetail | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<LeaderFormData>({
    resolver: zodResolver(leaderSchema)
  });

  const cepValue = watch('cep');

  useEffect(() => {
    if (id) {
      loadLeader();
    }
  }, [id]);

  const loadLeader = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getLeaderDetail(id);
      setLeaderData(data);
      setValue('full_name', data.full_name || '');
      setValue('email', data.email || '');
      setValue('phone', data.phone || '');
      setValue('birth_date', data.birth_date || '');
      setValue('gender', data.gender);
      setValue('goal', data.goal || undefined);
      setValue('cep', data.cep || '');
      setValue('street', data.street || '');
      setValue('number', data.number || '');
      setValue('complement', data.complement || '');
      setValue('neighborhood', data.neighborhood || '');
      setValue('city', data.city || '');
      setValue('state', data.state || '');
      setValue('notes', data.notes || '');
    } catch (error) {
      console.error('Erro ao carregar líder:', error);
      alert('Erro ao carregar líder');
    } finally {
      setLoading(false);
    }
  };

  const handleCepSearch = async () => {
    if (!cepValue) return;
    
    try {
      setSearchingCep(true);
      const result = await fetchCep(cepValue);
      if (result) {
        setValue('street', result.street);
        setValue('neighborhood', result.neighborhood);
        setValue('city', result.city);
        setValue('state', result.state);
        setValue('cep', result.cep);
      } else {
        alert('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar CEP');
    } finally {
      setSearchingCep(false);
    }
  };

  const onSubmit = async (data: LeaderFormData) => {
    if (!isAdmin) return;
    
    try {
      setSaving(true);
      
      if (id) {
        // Update existing leader
        try {
          await updateLeaderProfile(id, data);
          alert('Líder atualizado com sucesso!');
        } catch (e: any) {
          alert(`Erro ao salvar líder: ${e?.message ?? String(e)}`);
          return;
        }
      } else {
        // Invite new leader
        try {
          const result = await inviteLeader(data);
          alert(result?.message || 'Convite enviado com sucesso!');
          if (result?.acceptUrl) {
            console.log('Link de convite:', result.acceptUrl);
          }
        } catch (e: any) {
          console.error('inviteLeader error', e);
          alert(`Erro ao enviar convite: ${e?.message || e}`);
          return;
        }
      }
      
      navigate('/lideres');
    } catch (error) {
      console.error('Erro geral:', error);
      alert(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!id || !confirm('Desativar este líder? Ele não conseguirá mais fazer login.')) return;
    
    try {
      setSaving(true);
      
      await deactivateLeader(id, 'Desativado pelo administrador');
      
      alert('Líder desativado com sucesso.');
      navigate('/lideres');
    } catch (error) {
      console.error('Erro ao desativar líder:', error);
      alert(`Erro ao desativar líder: ${error instanceof Error ? error.message : error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!id || !confirm('Reativar este líder? Ele poderá fazer login novamente.')) return;
    
    try {
      setSaving(true);
      
      await reactivateLeader(id, 'Reativado pelo administrador');
      
      alert('Líder reativado com sucesso.');
      navigate('/lideres');
    } catch (error) {
      console.error('Erro ao reativar líder:', error);
      alert(`Erro ao reativar líder: ${error instanceof Error ? error.message : error}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Acesso restrito a administradores</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
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
          <div className="p-6">
            <div className="mb-6">
              <Link
                to="/lideres"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para lista</span>
              </Link>
              
              <h1 className="text-2xl font-bold text-gray-900">
                {id ? 'Editar Líder' : 'Convidar Líder'}
              </h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Dados Básicos */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Básicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        {...register('full_name')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.full_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        {...register('email')}
                        disabled={!!id} // Disable email editing for existing leaders
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        {...register('phone')}
                        placeholder="(11) 99999-9999"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        {...register('birth_date')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sexo
                      </label>
                      <select
                        {...register('gender')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meta do líder
                      </label>
                      <input
                        type="number"
                        min="0"
                        {...register('goal', { valueAsNumber: true })}
                        placeholder="Meta de contatos"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.goal && (
                        <p className="text-red-500 text-sm mt-1">{errors.goal.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CEP
                      </label>
                      <div className="flex space-x-2">
                        <input
                          {...register('cep')}
                          placeholder="00000-000"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={handleCepSearch}
                          disabled={searchingCep || !cepValue}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center"
                        >
                          {searchingCep ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rua
                      </label>
                      <input
                        {...register('street')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                      </label>
                      <input
                        {...register('number')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        {...register('complement')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro
                      </label>
                      <input
                        {...register('neighborhood')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade
                      </label>
                      <input
                        {...register('city')}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <input
                        {...register('state')}
                        placeholder="SP"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais sobre o líder..."
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Link
                    to="/lideres"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </Link>
                  {id && leaderData && (
                    <>
                      {leaderData.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={handleDeactivate}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Desativar Líder
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleReactivate}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          Reativar Líder
                        </button>
                      )}
                    </>
                  )}
                  {!id && (
                    <button
                      type="button"
                      onClick={() => {}} // placeholder for new leader actions if needed
                      disabled={saving}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-50"
                      style={{ display: 'none' }} // hide for now
                    >
                      Ação Adicional
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {saving 
                        ? 'Salvando...' 
                        : (id ? 'Salvar Alterações' : 'Enviar Convite')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}