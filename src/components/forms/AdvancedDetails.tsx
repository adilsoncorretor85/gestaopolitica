import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { User, Users } from 'lucide-react';

interface AdvancedDetailsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  showAdvanced: boolean;
  leaders: Array<{ id: string; full_name: string; role: string }>;
  currentUser: { id: string; full_name: string; role: string } | null;
  showLeaderSelector: boolean;
  onToggleLeaderSelector: () => void;
}

export default function AdvancedDetails({
  register,
  errors,
  showAdvanced,
  leaders,
  currentUser,
  showLeaderSelector,
  onToggleLeaderSelector
}: AdvancedDetailsProps) {
  if (!showAdvanced) return null;

  return (
    <div className="space-y-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-md font-medium text-gray-900 dark:text-white flex items-center">
        <Users className="w-4 h-4 mr-2" />
        Mais Detalhes
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Instagram
          </label>
          <input
            type="text"
            {...register('instagram')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="@usuario"
          />
        </div>

        {/* Facebook */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Facebook
          </label>
          <input
            type="text"
            {...register('facebook')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="facebook.com/usuario"
          />
        </div>

        {/* E-mail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            E-mail
          </label>
          <input
            type="email"
            {...register('email')}
            className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.email
                ? 'border-red-500 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="email@exemplo.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Status do Voto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status do Voto
          </label>
          <select
            {...register('vote_status')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="INDEFINIDO">Indefinido</option>
            <option value="FAVORAVEL">Favorável</option>
            <option value="CONTRARIO">Contrário</option>
            <option value="NEUTRO">Neutro</option>
          </select>
        </div>

        {/* Data do Contato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data do Contato
          </label>
          <input
            type="date"
            {...register('contacted_at')}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Líder Responsável */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Líder Responsável
            </label>
            <button
              type="button"
              onClick={onToggleLeaderSelector}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {showLeaderSelector ? 'Usar padrão' : 'Trocar líder'}
            </button>
          </div>
          
          {showLeaderSelector ? (
            <select
              {...register('owner_id')}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {leaders.map((leader) => (
                <option key={leader.id} value={leader.id}>
                  {leader.full_name} ({leader.role === 'ADMIN' ? 'Admin' : 'Líder'})
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">
              <User className="w-4 h-4 mr-2" />
              {currentUser?.full_name} ({currentUser?.role === 'ADMIN' ? 'Admin' : 'Líder'})
            </div>
          )}
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observações
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Adicione observações sobre esta pessoa..."
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Informações adicionais sobre o contato
        </p>
      </div>
    </div>
  );
}
