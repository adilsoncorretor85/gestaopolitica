import React, { useState, useEffect, useRef } from 'react';
import { listCitiesForFilter } from '../services/projecoes';
import { fetchCitiesByUF } from '../lib/br';

// Função para normalizar texto removendo acentos
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

interface CityOption {
  city: string;
  state: string;
  originalName?: string; // Nome original para exibição
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string, state: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  filterByState?: string; // Filtrar cidades por estado específico
}

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = "Digite o nome da cidade...",
  className = "",
  required = false,
  disabled = false,
  filterByState
}: CityAutocompleteProps) {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar cidades disponíveis
  useEffect(() => {
    const loadCities = async () => {
      try {
        setLoading(true);
        const cityList = await listCitiesForFilter();
        setCities(cityList);
        
        // Se há filtro por estado, carregar cidades do IBGE também
        if (filterByState) {
          try {
            const ibgeCities = await fetchCitiesByUF(filterByState);
            const ibgeCityList = ibgeCities.map(city => ({
              city: normalizeText(city.name),
              state: filterByState.toUpperCase(),
              originalName: city.name
            }));
            
            // Combinar cidades locais com cidades do IBGE
            const combinedCities = [...cityList, ...ibgeCityList];
            const uniqueCities = Array.from(
              new Map(combinedCities.map(city => [`${city.city}-${city.state}`, city])).values()
            );
            
            setCities(uniqueCities);
          } catch (ibgeError) {
            console.error('Erro ao carregar cidades do IBGE:', ibgeError);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar cidades:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCities();
  }, [filterByState]);

  // Filtrar cidades baseado no input e estado
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredCities([]);
      return;
    }

    const normalizedInput = normalizeText(inputValue);
    let filtered = cities.filter(city => 
      normalizeText(city.city).includes(normalizedInput) ||
      normalizeText(city.state).includes(normalizedInput)
    );

    // Se há filtro por estado, aplicar
    if (filterByState) {
      filtered = filtered.filter(city => 
        city.state.toLowerCase() === filterByState.toLowerCase()
      );
    }

    setFilteredCities(filtered);
  }, [inputValue, cities, filterByState]);

  // Sincronizar inputValue com value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleCitySelect = (city: CityOption) => {
    const displayName = city.originalName || city.city;
    setInputValue(displayName);
    setIsOpen(false);
    onChange(displayName, city.state);
  };

  const handleInputFocus = () => {
    if (inputValue.trim()) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay para permitir clique no dropdown
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed ${className}`}
        autoComplete="off"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}

      {isOpen && filteredCities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredCities.map((city, index) => (
            <div
              key={`${city.city}-${city.state}-${index}`}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
              onClick={() => handleCitySelect(city)}
            >
              <div className="font-medium">
                {(city.originalName || city.city).toUpperCase()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{city.state.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {isOpen && !loading && inputValue.trim() && filteredCities.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
            Nenhuma cidade encontrada
          </div>
        </div>
      )}
    </div>
  );
}
