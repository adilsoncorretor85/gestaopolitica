import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import useAuth from '@/hooks/useAuth';
import { getPerson, createPerson, updatePerson, type Person } from '@/services/people';
import { listLeaders, type LeaderRow } from '@/services/admin';
import { fetchCep } from '@/lib/viacep';
import { ArrowLeft, Search } from 'lucide-react';

export default function PessoasFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pessoas');
  const { profile } = useAuth();
  
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Person>>({
    full_name: '',
    whatsapp: '',
    email: '',
    facebook: '',
    instagram: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
    consent: false,
    contacted_at: null,
    vote_status: 'INDEFINIDO'
  });

  useEffect(() => {
    if (id) {
      loadPerson();
    }
    loadLeaders();
  }, [id]);

  const loadPerson = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await getPerson(id);
      if (error) throw error;
      
      setFormData({
        ...data,
        contacted_at: data.contacted_at ? data.contacted_at.split('T')[0] : null
      });
    } catch (error) {
      console.error('Erro ao carregar pessoa:', error);
      alert('Erro ao carregar pessoa');
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

  const handleCepSearch = async () => {
    if (!formData.cep) return;
    
    try {
      setSearchingCep(true);
      const result = await fetchCep(formData.cep);
      if (result) {
        setFormData(prev => ({
          ...prev,
          street: result.street,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.state,
          cep: result.cep
        }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    try {
      setSaving(true);
      
      // Normalizar WhatsApp para apenas dígitos
      const normalizedData = {
        ...formData,
        whatsapp: formData.whatsapp?.replace(/\D/g, '') || '',
        owner_id: profile.id,
        contacted_at: formData.contacted_at || null
      };

      if (id) {
        const { error } = await updatePerson(id, normalizedData);
        if (error) throw error;
      } else {
        const { error } = await createPerson(normalizedData as Person);
        if (error) throw error;
      }
      
      navigate('/pessoas');
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error);
      alert('Erro ao salvar pessoa');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

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
                to="/pessoas"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para lista</span>
              </Link>
              
              <h1 className="text-2xl font-bold text-gray-900">
                {id ? 'Editar Pessoa' : 'Cadastrar Pessoa'}
              </h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Básicos */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Básicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name || ''}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp *
                      </label>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp || ''}
                        onChange={handleChange}
                        required
                        placeholder="(11) 99999-9999"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Facebook
                      </label>
                      <input
                        type="text"
                        name="facebook"
                        value={formData.facebook || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        name="instagram"
                        value={formData.instagram || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Líder Responsável - apenas para ADMIN */}
                    {profile?.role === 'ADMIN' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Líder Responsável
                        </label>
                        <select
                          name="owner_id"
                          value={formData.owner_id || ''}
                          onChange={handleChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione um líder</option>
                          {leaders.map(leader => (
                            <option key={leader.id} value={leader.id}>
                              {leader.status === 'INVITED' ? `${leader.full_name || 'Sem nome'} (pendente)` : (leader.full_name || 'Sem nome')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
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
                          type="text"
                          name="cep"
                          value={formData.cep || ''}
                          onChange={handleChange}
                          placeholder="00000-000"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={handleCepSearch}
                          disabled={searchingCep || !formData.cep}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Search className="h-4 w-4" />
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
                        type="text"
                        name="street"
                        value={formData.street || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        name="number"
                        value={formData.number || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        name="complement"
                        value={formData.complement || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        name="neighborhood"
                        value={formData.neighborhood || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações Políticas */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Políticas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status do Voto
                      </label>
                      <select
                        name="vote_status"
                        value={formData.vote_status || 'INDEFINIDO'}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="INDEFINIDO">Indefinido</option>
                        <option value="PROVAVEL">Provável</option>
                        <option value="CONFIRMADO">Confirmado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data do Contato
                      </label>
                      <input
                        type="date"
                        name="contacted_at"
                        value={formData.contacted_at || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="consent"
                        checked={formData.consent || false}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Consentimento para uso dos dados
                      </span>
                    </label>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais..."
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Link
                    to="/pessoas"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Salvando...' : (id ? 'Salvar Alterações' : 'Cadastrar Pessoa')}
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