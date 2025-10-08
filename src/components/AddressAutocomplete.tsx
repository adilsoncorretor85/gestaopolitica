import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';
import { useGeolocation } from '@/hooks/useGeolocation';
import { reverseGeocode } from '@/services/geocoding';
import { MapPin, Loader2 } from 'lucide-react';

export type AddressParts = {
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
};

type Props = {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  onSelect: (parts: AddressParts) => void;
  className?: string;
};

// Mapeamento de estados brasileiros
const ESTADOS_MAP: { [key: string]: string } = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
};

// Função para parsear os componentes de endereço do Google
function parseAddressComponents(components: google.maps.GeocoderAddressComponent[]): AddressParts {
  const parts: AddressParts = {
    street: null,
    number: null,
    neighborhood: null,
    city: null,
    state: null,
    cep: null,
    latitude: null,
    longitude: null,
    formatted: ''
  };

  components.forEach(component => {
    const types = component.types;
    
    if (types.includes('route')) {
      parts.street = component.long_name;
    } else if (types.includes('street_number')) {
      parts.number = component.long_name;
    } else if (types.includes('sublocality_level_1') || types.includes('neighborhood')) {
      parts.neighborhood = component.long_name;
    } else if (types.includes('locality')) {
      parts.city = component.long_name;
    } else if (types.includes('administrative_area_level_2') && !parts.city) {
      parts.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      // Tentar usar short_name primeiro, se não funcionar, mapear pelo nome
      const stateShort = component.short_name;
      const stateLong = component.long_name;
      
      if (stateShort && stateShort.length === 2) {
        parts.state = stateShort.toUpperCase();
      } else if (ESTADOS_MAP[stateLong]) {
        parts.state = ESTADOS_MAP[stateLong];
      } else {
        parts.state = stateLong;
      }
    } else if (types.includes('postal_code')) {
      parts.cep = component.long_name;
    }
  });

  return parts;
}

export default function AddressAutocomplete({ 
  label = 'Endereço', 
  placeholder = 'Digite o endereço...', 
  defaultValue = '',
  onSelect,
  className = ''
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const { getCurrentPosition, clearError } = useGeolocation();

  // Função para usar a localização atual
  const handleUseCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      setLocationError(null);
      clearError();

      // Obter coordenadas atuais
      const { latitude, longitude } = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutos
      });

      // Converter coordenadas em endereço
      const addressParts = await reverseGeocode(latitude, longitude);
      
      if (addressParts) {
        // Atualizar o input com o endereço encontrado
        setValue(addressParts.formatted);
        
        // Chamar callback com os dados
        onSelect(addressParts);
      } else {
        setLocationError('Não foi possível encontrar o endereço para esta localização.');
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      setLocationError(error instanceof Error ? error.message : 'Erro ao obter localização');
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    const initializeAutocomplete = async () => {
      try {
        setIsLoading(true);
        
        // Carregar Google Maps com Places API
        await loadGoogleMaps();
        
        if (!inputRef.current) return;

        // Criar instância do Autocomplete
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'br' },
          fields: ['address_components', 'geometry', 'formatted_address'],
          types: ['address']
        });

        // Listener para quando um endereço é selecionado
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (!place || !place.address_components || !place.geometry) {
            return;
          }

          // Parsear componentes do endereço
          const addressParts = parseAddressComponents(place.address_components);
          
          // Adicionar coordenadas e endereço formatado
          addressParts.latitude = place.geometry.location?.lat() || null;
          addressParts.longitude = place.geometry.location?.lng() || null;
          addressParts.formatted = place.formatted_address || '';

          // Atualizar valor do input
          setValue(addressParts.formatted);

          // Chamar callback com os dados parseados
          onSelect(addressParts);
        });

        // Não focar automaticamente para evitar interferir com outros campos

      } catch (error) {
        console.error('Erro ao inicializar autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []); // Remover onSelect das dependências para evitar reinicializações

  // Handler para tecla ESC
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue('');
      onSelect({
        street: null,
        number: null,
        neighborhood: null,
        city: null,
        state: null,
        cep: null,
        latitude: null,
        longitude: null,
        formatted: ''
      });
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || isGettingLocation}
          className="w-full px-3 py-2 pr-32 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {/* Botão de localização atual */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLoading || isGettingLocation}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-md shadow-md hover:shadow-lg flex items-center gap-1.5 text-sm font-medium"
          title="Puxar minha localização atual"
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Meu local</span>
        </button>
        
        {isLoading && !isGettingLocation && (
          <div className="absolute right-36 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      
      {/* Mensagem de erro da localização */}
      {locationError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {locationError}
        </p>
      )}
      
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Digite o endereço e selecione da lista, ou clique no botão verde "Meu local" para puxar sua localização atual automaticamente. Pressione ESC para limpar.
      </p>
    </div>
  );
}

