import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { MapPin, Navigation } from 'lucide-react';

interface AddressDetailsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  showAddressDetails: boolean;
  onOpenMap: () => void;
  onGetCurrentLocation: () => void;
  loadingCep: boolean;
  errorCep: string | null;
}

export default function AddressDetails({
  register,
  errors,
  showAddressDetails,
  onOpenMap,
  onGetCurrentLocation,
  loadingCep,
  errorCep
}: AddressDetailsProps) {
  if (!showAddressDetails) return null;

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-medium text-gray-900 dark:text-white">
          Endereço Completo
        </h4>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onGetCurrentLocation}
            className="flex items-center px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <Navigation className="w-3 h-3 mr-1" />
            Meu local
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            className="flex items-center px-3 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Definir no mapa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CEP */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CEP
          </label>
          <input
            type="text"
            {...register('cep')}
            className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.cep
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="00000-000"
          />
          {errors.cep && (
            <p className="text-red-500 text-sm mt-1">
              {errors.cep.message}
            </p>
          )}
        </div>

        {/* Rua */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rua
          </label>
          <input
            type="text"
            {...register('street')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome da rua"
          />
        </div>

        {/* Número */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Número
          </label>
          <input
            type="text"
            {...register('number')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123"
          />
        </div>

        {/* Complemento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Complemento
          </label>
          <input
            type="text"
            {...register('complement')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Apto, casa, etc."
          />
        </div>

        {/* Bairro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bairro
          </label>
          <input
            type="text"
            {...register('neighborhood')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome do bairro"
          />
        </div>

        {/* Cidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cidade
          </label>
          <input
            type="text"
            {...register('city')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome da cidade"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estado
          </label>
          <select
            {...register('state')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione o estado</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
        </div>
      </div>

      {loadingCep && (
        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Buscando endereço...
        </div>
      )}

      {errorCep && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {errorCep}
        </div>
      )}
    </div>
  );
}
