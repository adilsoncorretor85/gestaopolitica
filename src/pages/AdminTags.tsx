import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DatabaseStatus from '@/components/DatabaseStatus';
import { TagFormModal } from '@/components/modals/TagFormModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useAuth from '@/hooks/useAuth';
import { tagsService, AdminTag } from '@/services/tags';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  AlertTriangle,
  Tags as TagsIcon,
  Palette,
  Shield
} from 'lucide-react';

export default function AdminTagsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tags');
  const { profile, isAdmin } = useAuth();
  
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null);
  
  // Filtro de busca
  const [searchFilter, setSearchFilter] = useState('');

  // Carregar tags
  const loadTags = async () => {
    setLoading(true);
    try {
      setError('');
      const data = await tagsService.getAllTagsAdmin();
      setTags(data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadTags();
    }
  }, [isAdmin]);

  // Redirecionamento se não for admin
  if (!isAdmin) {
    return <DatabaseStatus error="Acesso negado. Apenas administradores podem acessar esta página." />;
  }

  // Se houver erro de tabela não existir, mostrar tela de configuração
  if (error && error.includes('does not exist')) {
    return <DatabaseStatus error={error} />;
  }

  // Filtrar tags baseado na busca (apenas tags ativas)
  const filteredTags = tags.filter(tag => {
    // Mostrar apenas tags ativas
    if (!tag.is_active) return false;
    
    // Filtro de busca por nome
    if (searchFilter && !tag.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Criar nova tag
  const handleCreateTag = () => {
    setEditingTag(null);
    setModalOpen(true);
  };

  // Editar tag
  const handleEditTag = (tag: AdminTag) => {
    setEditingTag(tag);
    setModalOpen(true);
  };

  // Excluir tag
  const handleDeleteTag = async (tag: AdminTag) => {
    if (!confirm(`Tem certeza que deseja excluir a tag "${tag.name}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    setActionLoading(tag.id);
    
    try {
      const result = await tagsService.deleteTag(tag.id);
      
      if (result.success) {
        await loadTags(); // Recarregar lista
      } else {
        alert(result.error || 'Erro ao excluir tag');
      }
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      alert('Erro ao excluir tag');
    } finally {
      setActionLoading(null);
    }
  };

  // Sucesso do modal
  const handleModalSuccess = () => {
    loadTags();
  };

  const getStatusBadge = (tag: AdminTag) => {
    if (!tag.is_active) {
      return <Badge variant="outline" className="text-red-600 border-red-300">Inativa</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-300">Ativa</Badge>;
  };

  const getSensitiveBadge = (tag: AdminTag) => {
    if (tag.is_sensitive) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300 flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Sensível</span>
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        profile={profile as any}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6 space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <TagsIcon className="h-6 w-6" />
                  <span>Gerenciar Tags</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Criar, editar e gerenciar tags do sistema
                </p>
              </div>
              <Button
                onClick={handleCreateTag}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Tag</span>
              </Button>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar tags por nome..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                      <TagsIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredTags.length} de {tags.filter(t => t.is_active).length} tags ativas
                </div>
              </div>
            </div>

            {/* Lista de Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="text-center py-12">
                  <TagsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Nenhuma tag encontrada
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {tags.length === 0 ? 'Comece criando sua primeira tag' : 'Ajuste os filtros para ver mais tags'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Tag
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Uso
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Criada em
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTags.map((tag) => (
                          <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                                  style={{ backgroundColor: tag.color }}
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {tag.name}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {getSensitiveBadge(tag)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {tag.description || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(tag)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {tag.usage_count}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {new Date(tag.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditTag(tag)}
                                  className="flex items-center space-x-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  <span>Editar</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteTag(tag)}
                                  disabled={actionLoading === tag.id}
                                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>{actionLoading === tag.id ? 'Excluindo...' : 'Excluir'}</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4 p-4">
                    {filteredTags.map((tag) => (
                      <div 
                        key={tag.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                      >
                        <div className="space-y-3">
                          {/* Nome e cor */}
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: tag.color }}
                            />
                            <div className="flex-1">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                {tag.name}
                              </h3>
                              {tag.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{tag.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Status e badges */}
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(tag)}
                            {getSensitiveBadge(tag)}
                          </div>

                          {/* Uso e data */}
                          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{tag.usage_count} usos</span>
                            </div>
                            <span>{new Date(tag.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>

                          {/* Ações */}
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTag(tag)}
                              className="flex-1 flex items-center justify-center space-x-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Editar</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteTag(tag)}
                              disabled={actionLoading === tag.id}
                              className="flex-1 flex items-center justify-center space-x-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>{actionLoading === tag.id ? 'Excluindo...' : 'Excluir'}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de criação/edição */}
      <TagFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        editingTag={editingTag}
      />
    </div>
  );
}
