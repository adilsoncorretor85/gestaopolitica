import React, { useState, useEffect } from 'react';
import { Save, Palette, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { tagsService, CreateTagParams, UpdateTagParams, AdminTag } from '@/services/tags';

interface TagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingTag?: AdminTag | null;
}

const PRESET_COLORS = [
  '#FF6B6B', // Vermelho
  '#4ECDC4', // Turquesa
  '#45B7D1', // Azul
  '#96CEB4', // Verde claro
  '#FECA57', // Amarelo
  '#FF9FF3', // Rosa
  '#A8E6CF', // Verde suave
  '#DDA0DD', // Lilás
  '#87CEEB', // Azul céu
  '#F0E68C', // Khaki
  '#FFA07A', // Salmão
  '#20B2AA', // Verde água
];

export const TagFormModal: React.FC<TagFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingTag
}) => {
  const [formData, setFormData] = useState<CreateTagParams>({
    name: '',
    description: '',
    color: '#808080',
    is_sensitive: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Resetar form quando modal abre/fecha ou tag muda
  useEffect(() => {
    if (isOpen) {
      if (editingTag) {
        setFormData({
          name: editingTag.name,
          description: editingTag.description || '',
          color: editingTag.color || '#808080',
          is_sensitive: editingTag.is_sensitive
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '#808080',
          is_sensitive: false
        });
      }
      setError('');
    }
  }, [isOpen, editingTag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      
      if (editingTag) {
        // Editar tag existente
        const updateParams: UpdateTagParams = {
          id: editingTag.id,
          ...formData
        };
        result = await tagsService.updateTag(updateParams);
      } else {
        // Criar nova tag
        result = await tagsService.createTag(formData);
      }

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao salvar tag:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTag ? 'Editar Tag' : 'Nova Tag'}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <Label htmlFor="name">Nome da Tag *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Empresário, Estudante..."
            required
            disabled={loading}
            className="mt-1"
          />
        </div>

        {/* Descrição */}
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descrição opcional da tag"
            disabled={loading}
            className="mt-1"
          />
        </div>

        {/* Cor */}
        <div>
          <Label className="flex items-center space-x-2 mb-2">
            <Palette className="h-4 w-4" />
            <span>Cor da Tag</span>
          </Label>
          
          {/* Cor atual */}
          <div className="mb-3 flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: formData.color }}
            />
            <Input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              placeholder="#808080"
              disabled={loading}
              className="font-mono text-sm flex-1"
            />
          </div>

          {/* Paleta de cores predefinidas */}
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                disabled={loading}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  formData.color === color
                    ? 'border-gray-900 dark:border-white shadow-lg'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Tag sensível */}
        <div className="flex items-center space-x-2">
          <input
            id="is_sensitive"
            type="checkbox"
            checked={formData.is_sensitive}
            onChange={(e) => setFormData(prev => ({ ...prev, is_sensitive: e.target.checked }))}
            disabled={loading}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <Label htmlFor="is_sensitive" className="text-sm">
            Tag sensível (visível apenas para admins)
          </Label>
        </div>

        {/* Botões */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="submit"
            disabled={loading || !formData.name.trim()}
            className="flex-1 flex items-center justify-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Salvando...' : 'Salvar'}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="px-6"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
