import React, { useState } from 'react';
import { useTags } from '../hooks/useTags';
import { Tag } from '../services/tags';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, Plus, X } from 'lucide-react';

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  onApplyTags: (tagIds: string[]) => void;
  onRemoveTag: (tagId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  onApplyTags,
  onRemoveTag,
  loading = false,
  disabled = false
}) => {
  const { tags, loading: tagsLoading } = useTags();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTags.some(selected => selected.id === tag.id)
  );

  const handleTagSelect = (tag: Tag) => {
    const newSelectedTags = [...selectedTags, tag];
    onTagsChange(newSelectedTags);
  };

  const handleTagRemove = (tagId: string) => {
    const newSelectedTags = selectedTags.filter(tag => tag.id !== tagId);
    onTagsChange(newSelectedTags);
    onRemoveTag(tagId);
  };

  const handleApplyAll = () => {
    const tagIds = selectedTags.map(tag => tag.id);
    onApplyTags(tagIds);
  };

  return (
    <div className="space-y-4">
      {/* Tags selecionadas */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Tags Selecionadas:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="flex items-center gap-1"
                style={{ backgroundColor: tag.color + '20', borderColor: tag.color }}
              >
                <span style={{ color: tag.color }}>{tag.name}</span>
                <button
                  onClick={() => handleTagRemove(tag.id)}
                  className="ml-1 hover:bg-red-100 rounded-full p-0.5"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Button
            onClick={handleApplyAll}
            disabled={disabled || loading}
            className="w-full"
          >
            {loading ? 'Aplicando...' : `Aplicar ${selectedTags.length} Tag(s)`}
          </Button>
        </div>
      )}

      {/* Busca de tags */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Adicionar Tags:</h4>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Lista de tags disponíveis */}
      {tagsLoading ? (
        <div className="text-center py-4">Carregando tags...</div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {filteredTags.slice(0, showAllTags ? filteredTags.length : 10).map(tag => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                onClick={() => handleTagSelect(tag)}
                style={{ borderColor: tag.color }}
              >
                <Plus className="h-3 w-3" />
                <span style={{ color: tag.color }}>{tag.name}</span>
              </Badge>
            ))}
          </div>
          
          {filteredTags.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTags(!showAllTags)}
              className="w-full"
            >
              {showAllTags ? 'Mostrar menos' : `Mostrar mais (${filteredTags.length - 10})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
