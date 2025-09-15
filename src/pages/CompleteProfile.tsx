import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MapPicker from '@/components/MapPicker';
import AddressAutocomplete, { type AddressParts } from '@/components/AddressAutocomplete';
import useAuth from '@/hooks/useAuth';
import { updateLeaderProfile, getLeaderDetail, type LeaderDetail } from '@/services/leader';
import { fetchAddressByCep } from '@/services/viacep';
import { geocodeAddress } from '@/services/geocoding';
import { ArrowLeft, Loader2, MapPin, CheckCircle } from 'lucide-react';

// Funções utilitárias para CEP
function onlyDigits(s: string) { return (s || '').replace(/\D/g, ''); }
function maskCep(s: string) {
  const d = onlyDigits(s).slice(0,8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

// Schema para completar perfil
const completeProfileSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.enum(['M', 'F', 'O'], { required_error: 'Sexo é obrigatório' }),
  cep: z.string().min(1, 'CEP é obrigatório'),
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  notes: z.string().optional(),
});

type CompleteProfileData = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('lideres');
  const { profile, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errorCep, setErrorCep] = useState<string | null>(null);
  const [openMap, setOpenMap] = useState(false);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const [leaderData, setLeaderData] = useState<LeaderDetail | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CompleteProfileData>({
    resolver: zodResolver(completeProfileSchema)
  });

  useEffect(() => {
    if (profile?.id) {
      loadLeader();
    }
  }, [profile?.id]);

  const loadLeader = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      const data = await getLeaderDetail(profile.id);
      setLeaderData(data);
      
      // Preencher formulário com dados existentes
      setValue('full_name', data.full_name || '');
      setValue('phone', data.phone || '');
      setValue('birth_date', data.birth_date || '');
      setValue('gender', data.gender as 'M' | 'F' | 'O' || '');
      setValue('cep', data.cep || '');
      setValue('street', data.street || '');
      setValue('number', data.number || '');
      setValue('complement', data.complement || '');
      setValue('neighborhood', data.neighborhood || '');
      setValue('city', data.city || '');
      setValue('state', data.state || '');
      setValue('notes', data.notes || '');
      
      // Carregar coordenadas se existirem
      if (data.latitude && data.longitude) {
        setCoords({ lat: data.latitude, lng: data.longitude });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      alert('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  async function tryGeocodeFromForm() {
    const rua = watch('street');
    const numero = watch('number');
    const bairro = watch('neighborhood');
    const cidade = watch('city');
    const estado = watch('state');
    const cep = watch('cep');

    if (!rua || !cidade || !estado) return;
    const c = await geocodeAddress({ street: rua, number: numero, neighborhood: bairro, city: cidade, state: estado, cep });
    if (c) setCoords(c);
  }

  // Handler para quando um endereço é selecionado no autocomplete
  function handleAddressSelect(parts: AddressParts) {
    if (parts.street) setValue('street', parts.street);
    if (parts.number) setValue('number', parts.number);
    if (parts.neighborhood) setValue('neighborhood', parts.neighborhood);
    if (parts.city) setValue('city', parts.city);
    if (parts.state) setValue('state', parts.state);
    if (parts.cep) setValue('cep', parts.cep);

    // Se temos coordenadas, atualizar
    if (parts.latitude && parts.longitude) {
      setCoords({ lat: parts.latitude, lng: parts.longitude });
    }
  }

  async function handleCepChange(v: string) {
    setErrorCep(null);
    setValue('cep', maskCep(v));
    const d = onlyDigits(v);
    
    if (d.length === 8) {
      setLoadingCep(true);
      const adr = await fetchAddressByCep(d).catch(() => null);
      setLoadingCep(false);

      if (!adr) { setErrorCep('CEP não encontrado'); return; }

      if (!watch('street')) setValue('street', adr.street);
      if (!watch('neighborhood')) setValue('neighborhood', adr.neighborhood);
      if (!watch('city')) setValue('city', adr.city);
      if (!watch('state')) setValue('state', adr.state);

      // Se já houver número, geocodifica de imediato
      if (watch('number')) {
        await tryGeocodeFromForm();
      }
    }
  }

  const onSubmit = async (data: CompleteProfileData) => {
    if (!profile?.id) return;
    
    try {
      setSaving(true);
      
      const payload = {
        ...data,
        cep: onlyDigits(data.cep),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };
      
      await updateLeaderProfile(profile.id, payload);
      setProfileCompleted(true);
      
      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert(`Erro ao salvar perfil: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (profileCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Perfil Completo!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Seu perfil foi atualizado com sucesso. Você será redirecionado para o dashboard.
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Carregando perfil...</p>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Complete seu Perfil
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Para começar a usar o sistema, precisamos de algumas informações adicionais.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Dados Pessoais */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        {...register('full_name')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.full_name && (
                        <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Telefone *
                      </label>
                      <input
                        type="tel"
                        {...register('phone')}
                        placeholder="(11) 99999-9999"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data de Nascimento *
                      </label>
                      <input
                        type="date"
                        {...register('birth_date')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.birth_date && (
                        <p className="text-red-500 text-sm mt-1">{errors.birth_date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sexo *
                      </label>
                      <select
                        {...register('gender')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outro</option>
                      </select>
                      {errors.gender && (
                        <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                      )}
                    </div>
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
                        CEP *
                      </label>
                      <input
                        value={watch('cep') || ''}
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
                      {errors.cep && (
                        <p className="text-red-500 text-sm mt-1">{errors.cep.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rua *
                      </label>
                      <input
                        {...register('street')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.street && (
                        <p className="text-red-500 text-sm mt-1">{errors.street.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número *
                      </label>
                      <input
                        {...register('number')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.number && (
                        <p className="text-red-500 text-sm mt-1">{errors.number.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Complemento
                      </label>
                      <input
                        {...register('complement')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bairro *
                      </label>
                      <input
                        {...register('neighborhood')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.neighborhood && (
                        <p className="text-red-500 text-sm mt-1">{errors.neighborhood.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cidade *
                      </label>
                      <input
                        {...register('city')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Estado *
                      </label>
                      <input
                        {...register('state')}
                        placeholder="SP"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.state && (
                        <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Botão para abrir mapa */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setOpenMap(true)}
                      className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Definir localização no mapa</span>
                    </button>
                    {coords && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Localização: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Observações</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Observações
                    </label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Informações adicionais..."
                    />
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Pular por enquanto
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{saving ? 'Salvando...' : 'Completar Perfil'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* Modal do Mapa */}
      {openMap && (
        <MapPicker
          isOpen={openMap}
          onClose={() => setOpenMap(false)}
          onSelect={(lat, lng) => {
            setCoords({ lat, lng });
            setOpenMap(false);
          }}
          initialCoords={coords}
        />
      )}
    </div>
  );
}
