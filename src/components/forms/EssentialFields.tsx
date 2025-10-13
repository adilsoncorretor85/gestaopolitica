import React, { useState, useEffect, memo } from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import TreatmentSelector from './TreatmentSelector';
import { checkWhatsAppDuplicate } from '@/services/people';

interface EssentialFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  watch: (name: string) => any;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onAddressSelect: (address: any) => void;
  nameError?: string;
  onNameBlur: () => void;
  watchWhatsApp?: () => string;
  currentPersonId?: string;
}

const EssentialFields = ({
  register,
  errors,
  setValue,
  watch,
  showAdvanced,
  onToggleAdvanced,
  onAddressSelect,
  nameError,
  onNameBlur,
  watchWhatsApp,
  currentPersonId
}: EssentialFieldsProps) => {
  const [whatsappError, setWhatsappError] = useState<string>('');
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Verificar duplicatas quando o WhatsApp mudar
  useEffect(() => {
    if (!watchWhatsApp) return;
    
    let lastWhatsapp = '';
    
    const checkWhatsapp = () => {
      const whatsapp = watchWhatsApp();
      const normalizedWhatsapp = whatsapp?.replace(/\D/g, '') || '';
      
      // Só verificar se o WhatsApp mudou e tem pelo menos 10 dígitos
      if (normalizedWhatsapp !== lastWhatsapp) {
        lastWhatsapp = normalizedWhatsapp;
        
        if (normalizedWhatsapp.length < 10) {
          setWhatsappError('');
          return;
        }

        const timeoutId = setTimeout(async () => {
          // Verificar novamente se o WhatsApp ainda é o mesmo
          if (lastWhatsapp === normalizedWhatsapp) {
            setCheckingDuplicate(true);
            try {
              const result = await checkWhatsAppDuplicate(whatsapp, currentPersonId);
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
          }
        }, 800); // Debounce de 800ms

        return () => clearTimeout(timeoutId);
      }
    };

    // Verificar imediatamente
    checkWhatsapp();
    
    // Configurar um intervalo para verificar mudanças
    const intervalId = setInterval(checkWhatsapp, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [watchWhatsApp, currentPersonId]);
  return (
    <div className="space-y-6">
      {/* Campos Essenciais */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Informações Básicas
        </h3>
        
        {/* Tratamento e Nome Completo - lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tratamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tratamento
            </label>
            <TreatmentSelector
              value={watch('treatment') || ''}
              onChange={(value) => setValue('treatment', value)}
            />
            {errors.treatment && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                {(() => {
                  if (typeof errors.treatment === 'object' && errors.treatment && 'message' in errors.treatment) {
                    return (errors.treatment as any).message;
                  }
                  return String(errors.treatment || '');
                })()}
              </p>
            )}
          </div>

          {/* Nome Completo */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              {...register('full_name')}
              onBlur={onNameBlur}
              autoFocus
              className={`form-control-accessible w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                nameError || errors.full_name
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Digite o nome completo (nome e sobrenome)"
              aria-describedby={errors.full_name || nameError ? 'full_name-error' : undefined}
              aria-invalid={errors.full_name || nameError ? 'true' : 'false'}
              required
            />
            {(nameError || errors.full_name) && (
              <p id="full_name-error" className="text-red-500 text-sm mt-1 flex items-center" role="alert">
                <span className="mr-1" aria-hidden="true">⚠️</span>
                {nameError || (() => {
                  if (typeof errors.full_name === 'object' && errors.full_name && 'message' in errors.full_name) {
                    return (errors.full_name as any).message;
                  }
                  return String(errors.full_name || '');
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Sexo e WhatsApp - lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sexo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sexo
            </label>
            <select
              {...register('gender')}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione o sexo (opcional)</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
            {errors.gender && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                {(() => {
                  if (typeof errors.gender === 'object' && errors.gender && 'message' in errors.gender) {
                    return (errors.gender as any).message;
                  }
                  return String(errors.gender || '');
                })()}
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
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              )}
            </div>
            {(errors.whatsapp || whatsappError) && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <span className="mr-1">⚠️</span>
                {whatsappError || (() => {
                  if (typeof errors.whatsapp === 'object' && errors.whatsapp && 'message' in errors.whatsapp) {
                    return (errors.whatsapp as any).message;
                  }
                  return String(errors.whatsapp || '');
                })()}
              </p>
            )}
          </div>
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
};

export default memo(EssentialFields);
