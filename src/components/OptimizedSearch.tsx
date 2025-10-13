import React, { useState, useMemo, useCallback, memo } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface OptimizedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onClear?: () => void;
  className?: string;
  debounceMs?: number;
  minLength?: number;
}

const OptimizedSearch = memo<OptimizedSearchProps>(({
  placeholder = 'Buscar...',
  onSearch,
  onClear,
  className = '',
  debounceMs = 300,
  minLength = 2,
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  // Executar busca quando o query debounced mudar
  React.useEffect(() => {
    if (debouncedQuery.length >= minLength) {
      onSearch(debouncedQuery);
    } else if (debouncedQuery.length === 0) {
      onClear?.();
    }
  }, [debouncedQuery, onSearch, onClear, minLength]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear?.();
  }, [onClear]);

  const showClearButton = useMemo(() => query.length > 0, [query]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      {showClearButton && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

OptimizedSearch.displayName = 'OptimizedSearch';

export default OptimizedSearch;


