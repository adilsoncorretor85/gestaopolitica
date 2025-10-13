import React, { memo } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window';
import { PersonWithTags } from '@/services/people';

interface VirtualizedListProps {
  items: PersonWithTags[];
  height: number;
  itemHeight?: number;
  onItemClick?: (item: PersonWithTags) => void;
  renderItem?: (item: PersonWithTags, index: number) => React.ReactNode;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: PersonWithTags[];
    onItemClick?: (item: PersonWithTags) => void;
    renderItem?: (item: PersonWithTags, index: number) => React.ReactNode;
  };
}

const ListItem = memo(({ index, style, data }: ListItemProps) => {
  const { items, onItemClick, renderItem } = data;
  const item = items[index];

  if (!item) return null;

  const handleClick = () => {
    onItemClick?.(item);
  };

  return (
    <div style={style} className="px-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        {renderItem ? (
          renderItem(item, index)
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                {item.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {item.full_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {item.whatsapp}
              </p>
              {item.city && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {item.city}, {item.state}
                </p>
              )}
            </div>
            {item.vote_status && (
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.vote_status === 'CONFIRMADO' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : item.vote_status === 'PROVAVEL'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {item.vote_status}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ListItem.displayName = 'ListItem';

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  height,
  itemHeight = 80,
  onItemClick,
  renderItem,
}) => {
  const itemData = {
    items,
    onItemClick,
    renderItem,
  };

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={itemData}
      overscanCount={5} // Renderizar 5 itens extras para scroll suave
    >
      {ListItem}
    </List>
  );
};

export default memo(VirtualizedList);

