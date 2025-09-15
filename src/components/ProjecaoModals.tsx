import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Trash2 } from 'lucide-react';
import { 
  upsertCityGoalWithUpsert,
  saveNeighborhoodGoal,
  listCityGoals,
  deleteCityGoal,
  deleteNeighborhoodGoal
} from '@/services/projecoes';
import type { CityGoal, NeighborhoodGoal } from '@/types/projecoes';
import CityAutocomplete from './CityAutocomplete';
import { useElection } from '@/contexts/ElectionContext';

// Lista de UFs brasileiras
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface CityGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: CityGoal | null;
  defaultDeadline?: string;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function CityGoalModal({ isOpen, onClose, onSuccess, editData, defaultDeadline, onToast }: CityGoalModalProps) {
  const { election } = useElection();
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    goal: '',
    deadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editData) {
      setFormData({
        city: editData.city,
        state: editData.state,
        goal: editData.goal.toString(),
        deadline: editData.deadline || ''
      });
    } else {
      // Pré-selecionar estado da eleição se disponível
      const electionState = election?.scope_state || '';
      setFormData({
        city: '',
        state: electionState,
        goal: '',
        deadline: defaultDeadline || ''
      });
    }
  }, [editData, isOpen, defaultDeadline, election]);

  // Forçar o deadline quando o modal abrir
  useEffect(() => {
    if (isOpen && defaultDeadline && !formData.deadline) {
      setFormData(prev => ({ ...prev, deadline: defaultDeadline }));
    }
  }, [isOpen, defaultDeadline, formData.deadline]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação manual dos campos obrigatórios
    if (!formData.city.trim()) {
      setError('Cidade é obrigatória');
      setLoading(false);
      return;
    }
    
    if (!formData.state.trim()) {
      setError('Estado é obrigatório');
      setLoading(false);
      return;
    }
    
    if (!formData.goal || parseInt(formData.goal) <= 0) {
      setError('Meta total deve ser maior que zero');
      setLoading(false);
      return;
    }

    try {
      await upsertCityGoalWithUpsert({
        city: formData.city,
        state: formData.state,
        goal: parseInt(formData.goal),
        deadline: formData.deadline || null
      });
      
      onToast('Meta da cidade salva com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar meta da cidade:', err);
      let errorMessage = err.message || 'Erro ao salvar meta da cidade';
      
      // Tratar erro de autenticação especificamente
      if (errorMessage.includes('não autenticado') || errorMessage.includes('authentication')) {
        errorMessage = 'Sua sessão expirou. Por favor, recarregue a página e faça login novamente.';
      }
      
      onToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editData) return;
    
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a meta da cidade ${editData.city} - ${editData.state}?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      await deleteCityGoal(editData.city, editData.state);
      onToast('Meta da cidade excluída com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao excluir meta da cidade:', err);
      const errorMessage = err.message || 'Erro ao excluir meta da cidade';
      onToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editData ? 'Editar Meta da Cidade' : 'Nova Meta da Cidade'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cidade *
            </label>
            <CityAutocomplete
              value={formData.city}
              onChange={(city, state) => setFormData({ ...formData, city, state })}
              placeholder="Digite o nome da cidade..."
              filterByState={formData.state}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado (UF) *
            </label>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione o estado</option>
              {UFS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meta Total *
            </label>
            <input
              type="number"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prazo
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-between pt-4">
            {editData && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir</span>
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{loading ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NeighborhoodGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: NeighborhoodGoal | null;
  defaultDeadline?: string;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function NeighborhoodGoalModal({ isOpen, onClose, onSuccess, editData, onToast }: NeighborhoodGoalModalProps) {
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    neighborhood: '',
    goal: ''
  });
  const [cities, setCities] = useState<CityGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCities();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editData) {
      setFormData({
        city: editData.city,
        state: editData.state,
        neighborhood: editData.neighborhood,
        goal: editData.goal.toString()
      });
    } else {
      setFormData({
        city: '',
        state: '',
        neighborhood: '',
        goal: ''
      });
    }
  }, [editData, isOpen]);

  const loadCities = async () => {
    try {
      const data = await listCityGoals();
      setCities(data || []);
    } catch (err) {
      console.error('Erro ao carregar cidades:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await saveNeighborhoodGoal({
        id: editData?.id,                            // <- ESSENCIAL para UPDATE
        city: formData.city,
        state: formData.state,
        neighborhood: formData.neighborhood,
        goal: parseInt(formData.goal)
      });
      
      onToast('Meta do bairro salva com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao salvar meta do bairro:', err);
      const errorMessage = err.message || 'Erro ao salvar meta do bairro';
      onToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editData?.id) return;
    
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a meta do bairro ${editData.neighborhood} - ${editData.city}?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      await deleteNeighborhoodGoal(editData.id);
      onToast('Meta do bairro excluída com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('❌ Erro ao excluir meta do bairro:', err);
      const errorMessage = err.message || 'Erro ao excluir meta do bairro';
      onToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editData ? 'Editar Meta do Bairro' : 'Nova Meta do Bairro'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cidade *
            </label>
            <select
              value={formData.city}
              onChange={(e) => {
                const selectedCity = cities.find(c => c.city === e.target.value);
                setFormData({ 
                  ...formData, 
                  city: e.target.value,
                  state: selectedCity?.state || ''
                });
              }}
              disabled={!!editData}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              required
            >
              <option value="">Selecione uma cidade</option>
              {cities.map((city, index) => (
                <option key={`${city.city}-${city.state}-${index}`} value={city.city}>
                  {city.city.toUpperCase()} - {city.state.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado (UF) *
            </label>
            <select
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              disabled={!!editData}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              required
            >
              <option value="">Selecione o estado</option>
              {UFS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bairro *
            </label>
            <input
              type="text"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meta Total *
            </label>
            <input
              type="number"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              required
            />
          </div>

          <div className="flex justify-between pt-4">
            {editData && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir</span>
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{loading ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}