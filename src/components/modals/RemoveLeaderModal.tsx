import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Users, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';

interface Leader {
  id: string;
  email: string | null;
}

interface RemoveLeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leader: Leader | null;
  onSuccess: () => void;
}

type RemovalMode = 'delete_contacts' | 'transfer_contacts';

export default function RemoveLeaderModal({ 
  isOpen, 
  onClose, 
  leader, 
  onSuccess 
}: RemoveLeaderModalProps) {
  const [mode, setMode] = useState<RemovalMode>('transfer_contacts');
  const [targetLeaderId, setTargetLeaderId] = useState<string>('');
  const [availableLeaders, setAvailableLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [peopleCount, setPeopleCount] = useState(0);
  const { success, error } = useToast();

  // Carregar líderes disponíveis para transferência
  useEffect(() => {
    if (isOpen && mode === 'transfer_contacts') {
      loadAvailableLeaders();
    }
  }, [isOpen, mode]);

  // Carregar contagem de pessoas do líder
  useEffect(() => {
    if (isOpen && leader) {
      loadPeopleCount();
    }
  }, [isOpen, leader]);

  const loadAvailableLeaders = async () => {
    setLoadingLeaders(true);
    try {
      const { data, error } = await supabase
        .from('leader_profiles')
        .select('id, email')
        .eq('status', 'ACTIVE')
        .neq('id', leader?.id || '');

      if (error) throw error;
      setAvailableLeaders(data || []);
    } catch (error) {
      logger.error('Erro ao carregar líderes:', error);
      error('Erro', 'Falha ao carregar lista de líderes');
    } finally {
      setLoadingLeaders(false);
    }
  };

  const loadPeopleCount = async () => {
    if (!leader) return;
    
    try {
      const { count, error } = await supabase
        .from('people')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', leader.id);

      if (error) throw error;
      setPeopleCount(count || 0);
    } catch (error) {
      logger.error('Erro ao carregar contagem de pessoas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leader) return;
    
    if (confirmText !== 'EXCLUIR') {
      error('Confirmação inválida', 'Digite "EXCLUIR" para confirmar a remoção');
      return;
    }

    if (mode === 'transfer_contacts' && !targetLeaderId) {
      error('Líder de destino obrigatório', 'Selecione um líder para transferir os contatos');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'transfer_contacts') {
        // Usar RPC diretamente para transferir contatos
        const { data, error } = await supabase.rpc('app_delegate_people', {
          from_leader: leader.id,
          to_leader: targetLeaderId,
          opts: {
            deactivate_from: true,
            transfer_tags: true,
            transfer_projects: false
          }
        });

        if (error) throw error;

        if (data?.ok) {
          // Desativar o líder de origem
          const { error: deactivateError } = await supabase
            .from('leader_profiles')
            .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
            .eq('id', leader.id);

          if (deactivateError) {
            logger.warn('Falha ao desativar líder:', deactivateError);
          }

          success('Líder removido com sucesso', `${data.moved_count || 0} contatos foram transferidos`);
          
          // Fechar modal primeiro, depois recarregar
          onClose();
          // Usar setTimeout para garantir que o modal feche antes de recarregar
          setTimeout(() => {
            onSuccess();
          }, 100);
        } else {
          throw new Error('Erro na transferência de contatos');
        }
      } else {
        // Usar RPC diretamente para excluir contatos
        const { data, error } = await supabase.rpc('app_remove_leader', {
          p_leader_id: leader.id,
          p_mode: 'delete_contacts',
          p_target_leader_id: null
        });

        if (error) throw error;

        if (data?.ok) {
          success('Líder removido com sucesso', `Líder e ${data.people_processed || 0} contatos foram removidos`);
          
          // Fechar modal primeiro, depois recarregar
          onClose();
          // Usar setTimeout para garantir que o modal feche antes de recarregar
          setTimeout(() => {
            onSuccess();
          }, 100);
        } else {
          throw new Error('Erro na remoção do líder');
        }
      }
    } catch (error: any) {
      logger.error('Erro ao remover líder:', error);
      error('Erro ao remover líder', error.message || 'Falha na remoção do líder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('transfer_contacts');
    setTargetLeaderId('');
    setConfirmText('');
    setPeopleCount(0);
    onClose();
  };

  if (!isOpen || !leader) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Remover Líder
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações do líder */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Líder a ser removido:
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Nome:</strong> {leader.email || 'N/A'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Email:</strong> {leader.email || 'N/A'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Contatos:</strong> {peopleCount} pessoa(s)
            </p>
          </div>

          {/* Opções de remoção */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              O que fazer com os contatos?
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="transfer_contacts"
                  checked={mode === 'transfer_contacts'}
                  onChange={(e) => setMode(e.target.value as RemovalMode)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Transferir contatos para outro líder
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Os contatos serão transferidos para um líder ativo
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="delete_contacts"
                  checked={mode === 'delete_contacts'}
                  onChange={(e) => setMode(e.target.value as RemovalMode)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Excluir contatos definitivamente
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Todos os contatos serão removidos permanentemente
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Seletor de líder de destino */}
          {mode === 'transfer_contacts' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Transferir para:
              </label>
              {loadingLeaders ? (
                <div className="text-sm text-gray-500">Carregando líderes...</div>
              ) : (
                <select
                  value={targetLeaderId}
                  onChange={(e) => setTargetLeaderId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione um líder</option>
                  {availableLeaders.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Confirmação */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Digite <strong>EXCLUIR</strong> para confirmar:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (mode === 'transfer_contacts' && !targetLeaderId) || confirmText !== 'EXCLUIR'}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Removendo...' : 'Remover Líder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
