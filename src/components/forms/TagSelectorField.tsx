import React, { useState, useEffect } from 'react';
import { useTags } from '@/hooks/useTags';
import { Tag } from '@/services/tags';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X, Loader2 } from 'lucide-react';

interface TagSelectorFieldProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  disabled?: boolean;
}

export default function TagSelectorField({ 
  selectedTags, 
  onTagsChange, 
  disabled = false 
}: TagSelectorFieldProps) {
  const { tags: availableTags, loading: tagsLoading } = useTags();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);

  // Filtrar tags disponíveis (excluindo as já selecionadas)
  const filteredTags = availableTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
    const notSelected = !selectedTags.some(selected => selected.id === tag.id);
    return matchesSearch && notSelected;
  });

  const handleTagSelect = (tag: Tag) => {
    if (disabled) return;
    const newSelectedTags = [...selectedTags, tag];
    onTagsChange(newSelectedTags);
  };

  const handleTagRemove = (tagId: string) => {
    if (disabled) return;
    const newSelectedTags = selectedTags.filter(tag => tag.id !== tagId);
    onTagsChange(newSelectedTags);
  };

  return (
    <div className="space-y-4">
      {/* Tags selecionadas */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags Selecionadas ({selectedTags.length})
          </label>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            {selectedTags.map(tag => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
                style={{ 
                  backgroundColor: tag.color + '20', 
                  borderColor: tag.color,
                  border: '1px solid'
                }}
              >
                <span 
                  className="font-medium text-sm"
                  style={{ color: tag.color }}
                >
                  {tag.name}
                </span>
                {!disabled && (
                  <button
                    onClick={() => handleTagRemove(tag.id)}
                    className="ml-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full p-0.5 transition-colors"
                    title="Remover tag"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Busca de tags */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Adicionar Tags
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tags disponíveis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Lista de tags disponíveis */}
      {tagsLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Carregando tags...</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {filteredTags
              .slice(0, showAllTags ? filteredTags.length : 8)
              .map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag)}
                  disabled={disabled}
                  className="group inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    borderColor: tag.color + '40',
                    color: tag.color
                  }}
                  title={`Adicionar tag: ${tag.name}`}
                >
                  <Plus className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{tag.name}</span>
                </button>
              ))}
          </div>
          
          {filteredTags.length > 8 && (
            <button
              onClick={() => setShowAllTags(!showAllTags)}
              disabled={disabled}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showAllTags ? 'Mostrar menos' : `Mostrar mais (${filteredTags.length - 8})`}
            </button>
          )}
          
          {filteredTags.length === 0 && searchTerm && (
            <div className="text-center py-4">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tag encontrada</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Tente outro termo de busca</p>
            </div>
          )}
        </div>
      )}

      {/* Informações adicionais */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        💡 Dica: Use tags para categorizar e organizar seus contatos (ex: "Empresário", "Estudante", "Voluntário")
      </div>
    </div>
  );
}
