import React from 'react';
import { Tag } from '../services/tags';
import { Badge } from './ui/badge';
import { X } from 'lucide-react';

interface TagListProps {
  tags: Tag[];
  onRemoveTag?: (tagId: string) => void;
  showRemoveButton?: boolean;
  disabled?: boolean;
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  onRemoveTag,
  showRemoveButton = false,
  disabled = false
}) => {
  if (tags.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Nenhuma tag aplicada
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="flex items-center gap-1"
          style={{ backgroundColor: tag.color + '20', borderColor: tag.color }}
        >
          <span style={{ color: tag.color }}>{tag.name}</span>
          {showRemoveButton && onRemoveTag && (
            <button
              onClick={() => onRemoveTag(tag.id)}
              className="ml-1 hover:bg-red-100 rounded-full p-0.5"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
};
