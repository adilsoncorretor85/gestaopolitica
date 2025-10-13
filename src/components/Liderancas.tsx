import React, { useState } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, MapPin, Edit2 } from 'lucide-react';
// Dados temporários para desenvolvimento
const initialLiderancas: Lideranca[] = [];
import { Lideranca } from '../types';
import Modal from './Modal';
import FormLideranca from './FormLideranca';

const Liderancas: React.FC = () => {
  const [liderancas, setLiderancas] = useState<Lideranca[]>(initialLiderancas);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLideranca, setEditingLideranca] = useState<Lideranca | null>(null);

  const filteredLiderancas = liderancas.filter(lideranca => {
    const matchesSearch = lideranca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lideranca.bairro.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lideranca.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveLideranca = (liderancaData: Omit<Lideranca, 'id' | 'dataCadastro'>) => {
    if (editingLideranca) {
      setLiderancas(liderancas.map(l => 
        l.id === editingLideranca.id 
          ? { ...liderancaData, id: editingLideranca.id, dataCadastro: editingLideranca.dataCadastro }
          : l
      ));
    } else {
      const newLideranca: Lideranca = {
        ...liderancaData,
        id: Date.now().toString(),
        dataCadastro: new Date().toISOString().split('T')[0],
      };
      setLiderancas([...liderancas, newLideranca]);
    }
    setModalOpen(false);
    setEditingLideranca(null);
  };

  const handleEdit = (lideranca: Lideranca) => {
    setEditingLideranca(lideranca);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingLideranca(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lideranças</h1>
          <p className="text-gray-600">Gerencie suas lideranças políticas</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Liderança</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ativo' | 'inativo')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Lideranças */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLiderancas.map((lideranca) => {
          const progresso = Math.round((lideranca.contatosAtingidos / lideranca.metaContatos) * 100);
          return (
            <div key={lideranca.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{lideranca.nome}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      lideranca.status === 'ativo' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {lideranca.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(lideranca)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{lideranca.telefone}</span>
                </div>
                {lideranca.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{lideranca.email}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{lideranca.bairro} - Zona {lideranca.zona}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progresso da Meta</span>
                  <span>{lideranca.contatosAtingidos}/{lideranca.metaContatos} ({progresso}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progresso, 100)}%` }}
                  />
                </div>
              </div>

              {lideranca.observacoes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{lideranca.observacoes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredLiderancas.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma liderança encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando uma nova liderança'
            }
          </p>
        </div>
      )}

      {/* Modal para adicionar/editar liderança */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingLideranca ? 'Editar Liderança' : 'Nova Liderança'}
      >
        <FormLideranca
          lideranca={editingLideranca}
          onSave={handleSaveLideranca}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Liderancas;