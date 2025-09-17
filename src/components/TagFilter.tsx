import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, Tags as TagsIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tag } from '@/services/tags';

interface TagFilterProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  mode: 'ANY' | 'ALL';
  onModeChange: (mode: 'ANY' | 'ALL') => void;
  loading?: boolean;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags,
  selectedTags,
  onTagsChange,
  mode,
  onModeChange,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar tags disponíveis baseado na busca
  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTags.find(selected => selected.id === tag.id)
  );

  const handleTagSelect = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setSearchTerm('');
  };

  const handleTagRemove = (tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const clearAllTags = () => {
    onTagsChange([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-colors ${
          selectedTags.length > 0
            ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
        } text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50`}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <TagsIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm truncate">
            {selectedTags.length > 0
              ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selecionada${selectedTags.length > 1 ? 's' : ''}`
              : 'Filtrar por tags'
            }
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Tags selecionadas (fora do dropdown) */}
      {selectedTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedTags.map(tag => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center space-x-1 text-xs"
              style={{ backgroundColor: tag.color + '20', borderColor: tag.color }}
            >
              <span>{tag.name}</span>
              <button
                onClick={() => handleTagRemove(tag.id)}
                className="ml-1 hover:text-red-600 dark:hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAllTags}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded transition-colors"
          >
            Limpar todas
          </button>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="space-y-3">
            {/* Cabeçalho com botão fechar */}
            <div className="flex justify-between items-center px-3 pt-3 pb-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Filtro por Tags
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-3 space-y-3">
              {/* Modo ANY/ALL */}
              {selectedTags.length > 1 && (
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Modo de busca:
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onModeChange('ANY')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        mode === 'ANY'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      QUALQUER (OR)
                    </button>
                    <button
                      onClick={() => onModeChange('ALL')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        mode === 'ALL'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      TODAS (AND)
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {mode === 'ANY' 
                      ? 'Mostrar pessoas que têm pelo menos uma das tags selecionadas'
                      : 'Mostrar apenas pessoas que têm todas as tags selecionadas'
                    }
                  </p>
                </div>
              )}

              {/* Campo de busca */}
              <div>
                <input
                  type="text"
                  placeholder="Buscar tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Lista de tags disponíveis */}
            <div className="max-h-40 overflow-y-auto px-3">
              {filteredTags.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
                  {searchTerm ? 'Nenhuma tag encontrada' : 'Todas as tags já foram selecionadas'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagSelect(tag)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center space-x-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#808080' }}
                      />
                      <span>{tag.name}</span>
                      {tag.description && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          - {tag.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé com contador */}
            <div className="px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {availableTags.length} tags disponíveis
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
