import React, { useState, useEffect } from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ChevronDown, ChevronUp } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { checkWhatsAppDuplicate } from '@/services/people';

interface EssentialFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onAddressSelect: (address: any) => void;
  nameError?: string;
  onNameBlur: () => void;
  watchWhatsApp?: () => string;
}

export default function EssentialFields({
  register,
  errors,
  showAdvanced,
  onToggleAdvanced,
  onAddressSelect,
  nameError,
  onNameBlur,
  watchWhatsApp
}: EssentialFieldsProps) {
  const [whatsappError, setWhatsappError] = useState<string>('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Verificar duplicatas quando o WhatsApp mudar
  useEffect(() => {
    if (!watchWhatsApp) return;
    
    const whatsapp = watchWhatsApp();
    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
      setWhatsappError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const result = await checkWhatsAppDuplicate(whatsapp);
        if (result.isDuplicate) {
          setWhatsappError(result.message || 'WhatsApp já cadastrado');
        } else {
          setWhatsappError('');
        }
      } catch (error) {
        console.error('Erro ao verificar duplicata:', error);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [watchWhatsApp]);
  return (
    <div className="space-y-6">
      {/* Campos Essenciais */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Informações Básicas
        </h3>
        
        {/* Nome Completo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome Completo *
          </label>
          <input
            type="text"
            {...register('full_name')}
            onBlur={onNameBlur}
            autoFocus
            className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              nameError || errors.full_name
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Digite o nome completo (nome e sobrenome)"
          />
          {(nameError || errors.full_name) && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <span className="mr-1">⚠️</span>
              {nameError || errors.full_name?.message}
            </p>
          )}
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            WhatsApp *
          </label>
          <div className="relative">
            <input
              type="tel"
              {...register('whatsapp')}
              className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.whatsapp || whatsappError
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="(11) 99999-9999"
            />
            {checkingDuplicate && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          {(errors.whatsapp || whatsappError) && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <span className="mr-1">⚠️</span>
              {whatsappError || errors.whatsapp?.message}
            </p>
          )}
        </div>

        {/* Data de Nascimento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data de Nascimento
          </label>
          <input
            type="date"
            {...register('birth_date')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Endereço (Autocomplete) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Endereço
          </label>
          <AddressAutocomplete
            placeholder="Digite o endereço para buscar..."
            onSelect={onAddressSelect}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Digite o endereço para preenchimento automático
          </p>
        </div>
      </div>

      {/* Botão para mostrar mais detalhes */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Ocultar detalhes
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Adicionar mais detalhes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
