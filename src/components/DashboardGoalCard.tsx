import { useLeaderGoal } from '@/hooks/useLeaderGoal';
import { Target, Loader2, AlertCircle } from 'lucide-react';

interface DashboardGoalCardProps {
  className?: string;
}

export default function DashboardGoalCard({ className = '' }: DashboardGoalCardProps) {
  const { data, isLoading, error } = useLeaderGoal();
  const debug = import.meta.env.VITE_DEBUG_GOAL === '1';

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Loader2 className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Minha Meta
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Carregando...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Minha Meta
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">
              Não foi possível carregar sua meta
            </p>
            {debug && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Erro: {error instanceof Error ? error.message : 'Erro desconhecido'}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const goal = data!.goal;
  const source = data!.source;

  // Mapear fonte para texto amigável
  const sourceText = {
    LEADER: 'Meta personalizada',
    ORG: 'Meta padrão da organização',
    FALLBACK: 'Meta padrão (fallback)'
  }[source];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Minha Meta
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sourceText}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {goal.toLocaleString()}
          </div>
          {debug && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Fonte: {source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
