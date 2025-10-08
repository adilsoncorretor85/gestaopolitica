import React, { useState, useEffect } from 'react';
import { CANONICAL_TREATMENTS, normalizeTreatment } from '@/lib/treatmentUtils';

interface TreatmentSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TreatmentSelector({ value, onChange, disabled = false }: TreatmentSelectorProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredTreatments, setFilteredTreatments] = useState(CANONICAL_TREATMENTS);

  // Atualizar inputValue quando value prop mudar
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filtrar tratamentos baseado na entrada
  useEffect(() => {
    if (!inputValue) {
      setFilteredTreatments(CANONICAL_TREATMENTS);
    } else {
      const filtered = CANONICAL_TREATMENTS.filter(treatment =>
        treatment.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredTreatments(filtered);
    }
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowDropdown(true);
  };

  const handleSelectTreatment = (treatment: string) => {
    setInputValue(treatment);
    onChange(treatment);
    setShowDropdown(false);
  };

  const handleBlur = () => {
    // Aguardar um pouco antes de fechar para permitir clique no dropdown
    setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  const handleFocus = () => {
    setShowDropdown(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Normalizar o que foi digitado
      const normalized = normalizeTreatment(inputValue);
      if (normalized) {
        setInputValue(normalized);
        onChange(normalized);
      } else {
        // Se não conseguir normalizar, limpar
        setInputValue('');
        onChange('');
      }
      setShowDropdown(false);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Sem tratamento (opcional)"
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        title="Opcional. Ex.: Dr., Prof., Sr."
      />
      
      {showDropdown && filteredTreatments.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredTreatments.map((treatment) => (
            <button
              key={treatment}
              type="button"
              onClick={() => handleSelectTreatment(treatment)}
              className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
            >
              {treatment}
            </button>
          ))}
        </div>
      )}
      
      {/* Dica sobre normalização */}
      {inputValue && !CANONICAL_TREATMENTS.includes(inputValue as any) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          💡 Digite "doutor" para "Dr.", "professor" para "Prof.", etc.
        </p>
      )}
    </div>
  );
}
