import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import EssentialFields from './EssentialFields';
import AddressDetails from './AddressDetails';
import AdvancedDetails from './AdvancedDetails';
import TagSelectorField from './TagSelectorField';
import TreatmentSelector from './TreatmentSelector';
import MapPicker from '@/components/MapPicker';
import AddressAutocomplete, { type AddressParts } from '@/components/AddressAutocomplete';
import { useToast } from '@/components/ui/toast';
import { createPerson, updatePerson, type PersonWithTags, type PersonInsertWithTags, type PersonUpdateWithTags } from '@/services/people';
import { listLeaders, type LeaderRow } from '@/services/admin';
import { fetchAddressByCep } from '@/services/viacep';
import { geocodeAddress, reverseGeocode } from '@/services/geocoding';
import { Tag } from '@/services/tags';
import { normalizeTreatment } from '@/lib/treatmentUtils';
import useAuth from '@/hooks/useAuth';

// Função utilitária para obter a data atual no formato YYYY-MM-DD
const getCurrentDate = () => new Date().toISOString().split('T')[0];

// Schema de validação mínimo
const personSchema = z.object({
  full_name: z.string()
    .min(1, 'Nome é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .refine((name) => {
      const words = name.trim().split(/\s+/).filter(word => word.length > 0);
      return words.length >= 2;
    }, 'Informe o nome completo (nome e sobrenome)'),
  whatsapp: z.string()
    .min(1, 'WhatsApp é obrigatório')
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos'),
  treatment: z.string().optional(),
  gender: z.enum(['M', 'F', 'O']).optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  birth_date: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  contacted_at: z.string().optional(),
  vote_status: z.string().optional(),
  owner_id: z.string().optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

interface PersonFormProps {
  person?: PersonWithTags;
  onSuccess?: () => void;
}

export default function PersonForm({ person, onSuccess }: PersonFormProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { success, error, ToastContainer } = useToast();
  
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [errorCep, setErrorCep] = useState<string | null>(null);
  const [openMap, setOpenMap] = useState(false);
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(null);
  const cepRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para divulgação progressiva
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  const [showLeaderSelector, setShowLeaderSelector] = useState(false);
  const [nameError, setNameError] = useState<string>('');

  // Mostrar detalhes de endereço quando mostrar detalhes avançados
  useEffect(() => {
    if (showAdvanced) {
      setShowAddressDetails(true);
    }
  }, [showAdvanced]);

  
  // Estado para tags
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // Carregar tags da pessoa quando estiver editando
  useEffect(() => {
    if (person?.tags) {
      setSelectedTags(person.tags);
    }
  }, [person]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
    reset
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
         defaultValues: {
           full_name: person?.full_name || '',
           whatsapp: person?.whatsapp || '',
           treatment: person?.treatment || '',
           gender: person?.gender || undefined,
           email: person?.email || '',
           facebook: person?.facebook || '',
           instagram: person?.instagram || '',
           birth_date: person?.birth_date || '',
           cep: person?.cep || '',
           street: person?.street || '',
           number: person?.number || '',
           complement: person?.complement || '',
           neighborhood: person?.neighborhood || '',
           city: person?.city || '',
           state: person?.state || '',
           notes: person?.notes || '',
           contacted_at: person?.contacted_at || getCurrentDate(),
           vote_status: person?.vote_status || 'INDEFINIDO',
           owner_id: person?.owner_id || profile?.id || '',
         }
  });

  // Monitorar mudanças no CEP e buscar endereço automaticamente
  useEffect(() => {
    let lastCep = '';
    
    const subscription = watch((value, { name }) => {
      if (name === 'cep' && value.cep) {
        const cep = value.cep.replace(/\D/g, '');
        
        // Só buscar se o CEP mudou e tem 8 dígitos
        if (cep.length === 8 && cep !== lastCep) {
          lastCep = cep;
          
          // Limpar timeout anterior se existir
          if (cepRef.current) {
            clearTimeout(cepRef.current);
          }
          
          // Aguardar 800ms antes de buscar para evitar muitas requisições
          cepRef.current = setTimeout(async () => {
            // Verificar novamente se o CEP ainda é o mesmo
            if (lastCep === cep) {
              setLoadingCep(true);
              setErrorCep(null);
              
              try {
                const address = await fetchAddressByCep(cep);
                if (address) {
                  setValue('street', address.street);
                  setValue('neighborhood', address.neighborhood);
                  setValue('city', address.city);
                  setValue('state', address.state);
                  setValue('cep', address.cep);
                  setShowAddressDetails(true);
                  
                  // Fazer geocoding para obter coordenadas
                  try {
                    const coords = await geocodeAddress({
                      street: address.street,
                      neighborhood: address.neighborhood,
                      city: address.city,
                      state: address.state,
                      cep: address.cep
                    });
                    
                    if (coords) {
                      setValue('latitude', coords.latitude);
                      setValue('longitude', coords.longitude);
                      setCoords({ lat: coords.latitude, lng: coords.longitude });
                    }
                  } catch (geoError) {
                    console.warn('Erro ao obter coordenadas do CEP:', geoError);
                    // Não falha o processo se não conseguir as coordenadas
                  }
                } else {
                  setErrorCep('CEP não encontrado');
                }
              } catch (error) {
                setErrorCep('Erro ao buscar CEP');
              } finally {
                setLoadingCep(false);
              }
            }
          }, 800);
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
      if (cepRef.current) {
        clearTimeout(cepRef.current);
      }
    };
  }, [watch, setValue]);

  // Função para validar nome completo
  const validateFullName = (name: string) => {
    if (!name || name.trim().length === 0) {
      return 'Nome é obrigatório';
    }
    if (name.trim().length < 3) {
      return 'Nome deve ter pelo menos 3 caracteres';
    }
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    if (words.length < 2) {
      return 'Informe o nome completo (nome e sobrenome)';
    }
    return '';
  };

  const handleNameBlur = () => {
    const error = validateFullName(watch('full_name') || '');
    setNameError(error);
  };

  useEffect(() => {
    loadLeaders();
    
    // Se é edição, mostrar campos avançados
    if (person) {
      setShowAdvanced(true);
      // Se tem endereço, mostrar detalhes de endereço
      if (person.cep || person.street || person.city) {
        setShowAddressDetails(true);
      }
    }
  }, [person]);

  const loadLeaders = async () => {
    try {
      setLoading(true);
      const { data, error } = await listLeaders();
      if (error) throw error;
      setLeaders(data || []);
    } catch (error) {
      console.error('Erro ao carregar líderes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (address: AddressParts) => {
    setValue('cep', address.cep || '');
    setValue('street', address.street || '');
    setValue('number', address.number || '');
    setValue('neighborhood', address.neighborhood || '');
    setValue('city', address.city || '');
    setValue('state', address.state || '');
    setValue('latitude', address.latitude || null);
    setValue('longitude', address.longitude || null);
    
    // Atualizar coordenadas no estado
    if (address.latitude && address.longitude) {
      setCoords({ lat: address.latitude, lng: address.longitude });
    }
    
    // Forçar atualização dos campos
    trigger(['cep', 'street', 'number', 'neighborhood', 'city', 'state']);
    
    setShowAddressDetails(true);
  };


  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      error('Erro', 'Geolocalização não suportada pelo navegador');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });
      
      // Geocodificar para obter endereço
      const address = await reverseGeocode(latitude, longitude);
      if (address) {
        setValue('latitude', latitude);
        setValue('longitude', longitude);
        setValue('street', address.street || '');
        setValue('neighborhood', address.neighborhood || '');
        setValue('city', address.city || '');
        setValue('state', address.state || '');
        setValue('cep', address.cep || '');
        setShowAddressDetails(true);
      }
    } catch (err) {
      error('Erro', 'Não foi possível obter sua localização');
    }
  };

  const onSubmit = async (data: PersonFormData) => {
    try {
      setSaving(true);
      
      // Normalizar tratamento
      const normalizedTreatment = normalizeTreatment(data.treatment);
      
      // Preparar payload mínimo
      const basePayload = {
        full_name: data.full_name,
        whatsapp: data.whatsapp,
        owner_id: data.owner_id || profile?.id,
        contacted_at: data.contacted_at || getCurrentDate(),
        ...(normalizedTreatment && { treatment: normalizedTreatment }),
        ...(data.gender && { gender: data.gender }),
        ...(data.email && { email: data.email }),
        ...(data.facebook && { facebook: data.facebook }),
        ...(data.instagram && { instagram: data.instagram }),
        ...(data.birth_date && { birth_date: data.birth_date }),
        ...(data.cep && { cep: data.cep }),
        ...(data.street && { street: data.street }),
        ...(data.number && { number: data.number }),
        ...(data.complement && { complement: data.complement }),
        ...(data.neighborhood && { neighborhood: data.neighborhood }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.notes && { notes: data.notes }),
        vote_status: data.vote_status || 'INDEFINIDO',
        ...(data.latitude && { latitude: data.latitude }),
        ...(data.longitude && { longitude: data.longitude }),
      };

      // Adicionar tags ao payload
      const payload = {
        ...basePayload,
        tagIds: selectedTags.map(tag => tag.id)
      };

      if (person) {
        // Edição
        const { error } = await updatePerson(person.id, payload as PersonUpdateWithTags);
        if (error) throw new Error(error);
        success('Sucesso', 'Pessoa atualizada com sucesso!');
      } else {
        // Criação
        const { error } = await createPerson(payload as PersonInsertWithTags);
        if (error) throw new Error(error);
        success('Sucesso', 'Pessoa cadastrada com sucesso!');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/pessoas');
      }
    } catch (err) {
      error('Erro', err instanceof Error ? err.message : 'Erro ao salvar pessoa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Campos Essenciais */}
        <EssentialFields
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          onAddressSelect={handleAddressSelect}
          nameError={nameError}
          onNameBlur={handleNameBlur}
          watchWhatsApp={() => watch('whatsapp')}
          currentPersonId={person?.id}
        />

        {/* Detalhes de Endereço */}
        <AddressDetails
          register={register}
          errors={errors}
          showAddressDetails={showAddressDetails}
          onOpenMap={() => setOpenMap(true)}
          onGetCurrentLocation={handleGetCurrentLocation}
          loadingCep={loadingCep}
          errorCep={errorCep}
        />

        {/* Detalhes Avançados */}
        <AdvancedDetails
          register={register}
          errors={errors}
          showAdvanced={showAdvanced}
          leaders={leaders}
          currentUser={profile}
          showLeaderSelector={showLeaderSelector}
          onToggleLeaderSelector={() => setShowLeaderSelector(!showLeaderSelector)}
        />

        {/* Seleção de Tags */}
        {showAdvanced && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tags</h3>
            <TagSelectorField
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              disabled={saving}
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/pessoas')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              person ? 'Atualizar Pessoa' : 'Cadastrar Pessoa'
            )}
          </button>
        </div>
      </form>

      {/* Map Picker Modal */}
      {openMap && (
        <MapPicker
          open={openMap}
          onClose={() => setOpenMap(false)}
          onConfirm={(coords) => {
            setCoords(coords);
            setValue('latitude', coords.lat);
            setValue('longitude', coords.lng);
            setShowAddressDetails(true);
            setOpenMap(false);
          }}
          initialCoords={coords}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />
    </>
  );
}
