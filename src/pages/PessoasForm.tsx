import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapPicker from '@/components/MapPicker';
import AddressAutocomplete, { type AddressParts } from '@/components/AddressAutocomplete';
import useAuth from '@/hooks/useAuth';
import { getPerson, createPerson, updatePerson, type Person } from '@/services/people';
import { listLeaders, type LeaderRow } from '@/services/admin';
import { fetchAddressByCep } from '@/services/viacep';
import { geocodeAddress } from '@/services/geocoding';
import { ArrowLeft, MapPin, Loader2 } from 'lucide-react';

// Função utilitária para obter a data atual no formato YYYY-MM-DD
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Funções utilitárias para CEP
function onlyDigits(s: string) { return (s || '').replace(/\D/g, ''); }
function maskCep(s: string) {
  const d = onlyDigits(s).slice(0,8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

// Schema de validação para pessoa com mensagens de erro específicas
const personSchema = z.object({
  full_name: z.string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .refine((name) => {
      // Verifica se tem pelo menos 2 palavras (nome e sobrenome)
      const words = name.trim().split(/\s+/).filter(word => word.length > 0);
      return words.length >= 2;
    }, 'Informe o nome completo (nome e sobrenome)'),
  whatsapp: z.string()
    .min(1, 'WhatsApp é obrigatório')
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  contacted_at: z.string().optional(),
  vote_status: z.string().optional(),
  owner_id: z.string().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

export default function PessoasFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pessoas');
  const { profile } = useAuth();
  
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errorCep, setErrorCep] = useState<string | null>(null);
  const [openMap, setOpenMap] = useState(false);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const cepRef = useRef<NodeJS.Timeout | null>(null);
  
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
    contacted_at: id ? null : getCurrentDate(), // Preenche automaticamente para novas pessoas
    vote_status: 'INDEFINIDO',
    latitude: null,
    longitude: null
  });

  useEffect(() => {
    if (id) {
      loadPerson();
    } else {
      // Para novas pessoas, sempre definir a data atual e o admin como líder padrão
      setFormData(prev => ({
        ...prev,
        contacted_at: getCurrentDate(),
        owner_id: profile?.role === 'ADMIN' ? profile.id : undefined
      }));
    }
    loadLeaders();
  }, [id, profile]);

  // Limpeza do timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (cepRef.current) {
        clearTimeout(cepRef.current);
      }
    };
  }, []);

  const loadPerson = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await getPerson(id);
      if (error) throw error;
      
      setFormData({
        ...data,
        contacted_at: data?.contacted_at ? data.contacted_at.split('T')[0] : null
      });
      
      // Carregar coordenadas se existirem
      if (data?.latitude && data?.longitude) {
        setCoords({ lat: data.latitude, lng: data.longitude });
      }
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
      let leadersWithAdmin = data || [];
      
      // Se for admin, adicionar o próprio admin na lista se não estiver presente
      if (profile?.role === 'ADMIN' && profile.id && profile.full_name) {
        const adminExists = leadersWithAdmin.some(leader => leader.id === profile.id);
        if (!adminExists) {
          leadersWithAdmin = [
            {
              id: profile.id,
              email: '', // Email não é necessário para exibição
              full_name: profile.full_name,
              status: 'ACTIVE' as const,
              invited_at: null
            },
            ...leadersWithAdmin
          ];
        }
      }
      
      setLeaders(leadersWithAdmin);
    } catch (error) {
      console.error('Erro ao carregar líderes:', error);
    }
  };

  async function tryGeocodeFromForm() {
    const street = formData.street;
    const number = formData.number;
    const neighborhood = formData.neighborhood;
    const city = formData.city;
    const state = formData.state;
    const cep = formData.cep;

    if (!street || !city || !state) return;
    const c = await geocodeAddress({ 
      street: street || undefined, 
      number: number || undefined, 
      neighborhood: neighborhood || undefined, 
      city: city || undefined, 
      state: state || undefined, 
      cep: cep || undefined 
    });
    if (c && c.latitude && c.longitude) {
      setCoords({ lat: c.latitude, lng: c.longitude });
    }
  }

  // Handler para quando um endereço é selecionado no autocomplete
  function handleAddressSelect(parts: AddressParts) {
    setFormData(prev => ({
      ...prev,
      street: parts.street || prev.street,
      number: parts.number || prev.number,
      neighborhood: parts.neighborhood || prev.neighborhood,
      city: parts.city || prev.city,
      state: parts.state || prev.state,
      cep: parts.cep || prev.cep
    }));

    // Se temos coordenadas, atualizar
    if (parts.latitude && parts.longitude) {
      setCoords({ lat: parts.latitude, lng: parts.longitude });
    }
  }

  async function handleCepChange(v: string) {
    // mask visual
    setFormData(prev => ({ ...prev, cep: maskCep(v) }));
    const d = onlyDigits(v);
    setErrorCep(null);

    if (cepRef.current) clearTimeout(cepRef.current);
    cepRef.current = setTimeout(async () => {
      if (d.length !== 8) return;        // só busca com CEP completo
      
      setLoadingCep(true);
      const adr = await fetchAddressByCep(d).catch(() => null);
      setLoadingCep(false);
      
      if (!adr) {
        setErrorCep('CEP não encontrado');
        return;
      }

      // preenche campos (libere edição depois se quiser)
      setFormData(prev => ({
        ...prev,
        street: prev.street || adr.street,
        neighborhood: prev.neighborhood || adr.neighborhood,
        city: prev.city || adr.city,
        state: prev.state || adr.state,
        cep: adr.cep
      }));

      // se já houver número, geocodifique
      if (formData.number) {
        await tryGeocodeFromForm();
      }
    }, 400);
  }

  const handleOpenMap = async () => {
    // Tenta geocodificar a partir do endereço preenchido no form
    const addr = {
      street: formData.street,
      number: formData.number,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      cep: formData.cep
    };
    
    const g = await geocodeAddress({
      street: addr.street || undefined,
      number: addr.number || undefined,
      neighborhood: addr.neighborhood || undefined,
      city: addr.city || undefined,
      state: addr.state || undefined,
      cep: addr.cep || undefined
    });
    
    if (g && g.latitude && g.longitude) {
      setCoords({ lat: g.latitude, lng: g.longitude });
    }
    setOpenMap(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validação: não permitir datas futuras
    if (formData.contacted_at && new Date(formData.contacted_at) > new Date()) {
      alert('A data do contato não pode ser futura');
      return;
    }
    
    try {
      setSaving(true);
      
      // Normalizar WhatsApp para apenas dígitos
      const normalizedData = {
        ...formData,
        whatsapp: formData.whatsapp?.replace(/\D/g, '') || '',
        owner_id: formData.owner_id || profile.id, // Usa o owner_id do form se for admin, senão usa o profile.id
        contacted_at: id ? formData.contacted_at : (formData.contacted_at || getCurrentDate()),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null
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
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar pessoa';
      alert(errorMessage);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
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
          <div className="p-6">
            <div className="mb-6">
              <Link
                to="/pessoas"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar para lista</span>
              </Link>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {id ? 'Editar Pessoa' : 'Cadastrar Pessoa'}
              </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Básicos */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dados Básicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name || ''}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        WhatsApp *
                      </label>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp || ''}
                        onChange={handleChange}
                        required
                        placeholder="(11) 99999-9999"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Facebook
                      </label>
                      <input
                        type="text"
                        name="facebook"
                        value={formData.facebook || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        name="instagram"
                        value={formData.instagram || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Líder Responsável - apenas para ADMIN */}
                    {profile?.role === 'ADMIN' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Líder Responsável
                        </label>
                        <select
                          name="owner_id"
                          value={formData.owner_id || ''}
                          onChange={handleChange}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Selecione um líder</option>
                          {leaders.map(leader => (
                            <option key={leader.id} value={leader.id}>
                              {leader.id === profile?.id 
                                ? `${leader.full_name || 'Sem nome'} (Administrador)`
                                : leader.status === 'PENDING' 
                                  ? `${leader.full_name || 'Sem nome'} (pendente)` 
                                  : (leader.full_name || 'Sem nome')
                              }
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Endereço</h3>
                  
                  {/* Autocomplete de Endereço */}
                  <AddressAutocomplete
                    label="Endereço (autocomplete)"
                    placeholder="Digite o endereço completo..."
                    onSelect={handleAddressSelect}
                    className="mb-6"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={formData.cep || ''}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {loadingCep && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Buscando endereço...
                        </p>
                      )}
                      {errorCep && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorCep}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rua
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        name="number"
                        value={formData.number || ''}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, number: e.target.value }));
                          // se já tem CEP válido (8) e rua/cidade/UF, geocodifica depois de breve debounce
                          if (onlyDigits(formData.cep || '').length === 8) {
                            if (cepRef.current) clearTimeout(cepRef.current);
                            cepRef.current = setTimeout(tryGeocodeFromForm, 300);
                          }
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        name="complement"
                        value={formData.complement || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        name="neighborhood"
                        value={formData.neighborhood || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Estado
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Botão para definir localização no mapa */}
                  <div className="mt-4 flex gap-2 items-center">
                    <button 
                      type="button" 
                      onClick={handleOpenMap} 
                      className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 inline-flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <MapPin className="w-4 h-4" />
                      Definir no mapa
                    </button>
                    {coords && coords.lat && coords.lng && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Marcado: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Informações Políticas */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações Políticas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status do Voto
                      </label>
                      <select
                        name="vote_status"
                        value={formData.vote_status || 'INDEFINIDO'}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="INDEFINIDO">Indefinido</option>
                        <option value="PROVAVEL">Provável</option>
                        <option value="CONFIRMADO">Confirmado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data do Contato
                      </label>
                      <input
                        type="date"
                        name="contacted_at"
                        value={formData.contacted_at || ''}
                        onChange={handleChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {!id && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Preenchido automaticamente com a data atual
                        </p>
                      )}
                    </div>
                  </div>


                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observações
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais..."
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Link
                    to="/pessoas"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
      
      <MapPicker
        open={openMap}
        onClose={() => setOpenMap(false)}
        initialCoords={coords}
        initialAddress={{
          street: formData.street,
          number: formData.number,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          cep: formData.cep
        }}
        onConfirm={(c) => setCoords(c)}
      />
    </div>
  );
}