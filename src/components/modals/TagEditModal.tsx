import React, { useState, useEffect } from 'react';
import { tagsService, Tag } from '../../services/tags';
import { Badge } from '../ui/badge';
import Modal from '../Modal';
import { X, Plus } from 'lucide-react';

interface TagEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
}

export const TagEditModal: React.FC<TagEditModalProps> = ({
  isOpen,
  onClose,
  personId,
  personName
}) => {
  const [personTags, setPersonTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && personId) {
      loadTags();
    }
  }, [isOpen, personId]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const [personTagsData, availableTagsData] = await Promise.all([
        tagsService.getPersonTags(personId),
        tagsService.getAvailableTags()
      ]);
      setPersonTags(personTagsData);
      setAvailableTags(availableTagsData);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTag = async (tag: Tag) => {
    try {
      const result = await tagsService.applyTagToPerson(personId, tag.id);
      if (result.success) {
        setPersonTags(prev => [...prev, tag]);
      } else {
        alert('Erro ao aplicar tag: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao aplicar tag:', error);
      alert('Erro ao aplicar tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const result = await tagsService.removeTagFromPerson(personId, tagId);
      if (result.success) {
        setPersonTags(prev => prev.filter(tag => tag.id !== tagId));
      } else {
        alert('Erro ao remover tag: ' + result.error);
      }
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      alert('Erro ao remover tag');
    }
  };

  const filteredAvailableTags = availableTags.filter(tag => 
    !personTags.some(personTag => personTag.id === tag.id) &&
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Gerenciar Tags - ${personName}`}>
      <div className="space-y-8">
        {/* Tags atuais */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tags Aplicadas</h4>
          </div>
          
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              Carregando tags...
            </div>
          ) : personTags.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-2xl">🏷️</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Nenhuma tag aplicada ainda</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Adicione tags para organizar melhor este contato</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {personTags.map(tag => (
                <div
                  key={tag.id}
                  className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 shadow-sm"
                  style={{ 
                    backgroundColor: tag.color + '15', 
                    borderColor: tag.color + '40',
                    border: '2px solid'
                  }}
                >
                  <span 
                    className="font-medium"
                    style={{ color: tag.color }}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="opacity-60 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full p-1 transition-all duration-200 hover:scale-110"
                    title="Remover tag"
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adicionar tags */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Adicionar Tags</h4>
          </div>
          
          {/* Busca melhorada */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="🔍 Buscar tags disponíveis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-0 transition-colors"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
          </div>
          
          {/* Tags disponíveis */}
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Clique nas tags para adicionar:
            </p>
            <div className="flex flex-wrap gap-3 max-h-48 overflow-y-auto custom-scrollbar">
              {filteredAvailableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleApplyTag(tag)}
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md border-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
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
              
              {filteredAvailableTags.length === 0 && searchTerm && (
                <div className="w-full text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xl">🔍</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma tag encontrada</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Tente outro termo de busca</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
