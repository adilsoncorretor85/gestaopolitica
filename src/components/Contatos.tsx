import React, { useState } from 'react';
import { Vote, Plus, Search, Filter, Phone, Mail, MapPin, User, Edit2, Users } from 'lucide-react';
import { Contato, Lideranca } from '../types';

// Dados temporários para desenvolvimento
const initialContatos: Contato[] = [];
const liderancas: Lideranca[] = [];
import Modal from './Modal';
import FormContato from './FormContato';

const Contatos: React.FC = () => {
  const [contatos, setContatos] = useState<Contato[]>(initialContatos);
  const [searchTerm, setSearchTerm] = useState('');
  const [compromissoFilter, setCompromissoFilter] = useState<string>('all');
  const [liderancaFilter, setLiderancaFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContato, setEditingContato] = useState<Contato | null>(null);

  const filteredContatos = contatos.filter(contato => {
    const matchesSearch = contato.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contato.bairro.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contato.liderancaNome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompromisso = compromissoFilter === 'all' || contato.compromissoVoto === compromissoFilter;
    const matchesLideranca = liderancaFilter === 'all' || contato.liderancaId === liderancaFilter;
    return matchesSearch && matchesCompromisso && matchesLideranca;
  });

  const handleSaveContato = (contatoData: Omit<Contato, 'id' | 'dataCadastro' | 'liderancaNome'>) => {
    const lideranca = liderancas.find(l => l.id === contatoData.liderancaId);
    const contatoCompleto = {
      ...contatoData,
      liderancaNome: lideranca?.nome || '',
    };

    if (editingContato) {
      setContatos(contatos.map(c => 
        c.id === editingContato.id 
          ? { ...contatoCompleto, id: editingContato.id, dataCadastro: editingContato.dataCadastro }
          : c
      ));
    } else {
      const newContato: Contato = {
        ...contatoCompleto,
        id: Date.now().toString(),
        dataCadastro: new Date().toISOString().split('T')[0],
      };
      setContatos([...contatos, newContato]);
    }
    setModalOpen(false);
    setEditingContato(null);
  };

  const handleEdit = (contato: Contato) => {
    setEditingContato(contato);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingContato(null);
  };

  const getCompromissoColor = (compromisso: string) => {
    switch (compromisso) {
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'provavel': return 'bg-yellow-100 text-yellow-800';
      case 'incerto': return 'bg-orange-100 text-orange-800';
      case 'contrario': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompromissoLabel = (compromisso: string) => {
    switch (compromisso) {
      case 'confirmado': return 'Confirmado';
      case 'provavel': return 'Provável';
      case 'incerto': return 'Incerto';
      case 'contrario': return 'Contrário';
      default: return 'N/A';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
          <p className="text-gray-600">Gerencie os contatos das suas lideranças</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Contato</span>
        </button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', valor: contatos.length, cor: 'bg-blue-500' },
          { label: 'Confirmados', valor: contatos.filter(c => c.compromissoVoto === 'confirmado').length, cor: 'bg-green-500' },
          { label: 'Prováveis', valor: contatos.filter(c => c.compromissoVoto === 'provavel').length, cor: 'bg-yellow-500' },
          { label: 'Incertos', valor: contatos.filter(c => c.compromissoVoto === 'incerto').length, cor: 'bg-orange-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${stat.cor}`}>
                <Vote className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-lg font-semibold text-gray-900">{stat.valor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por nome, bairro ou liderança..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={compromissoFilter}
              onChange={(e) => setCompromissoFilter(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os Compromissos</option>
              <option value="confirmado">Confirmados</option>
              <option value="provavel">Prováveis</option>
              <option value="incerto">Incertos</option>
              <option value="contrario">Contrários</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <select
              value={liderancaFilter}
              onChange={(e) => setLiderancaFilter(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Lideranças</option>
              {liderancas.map(lideranca => (
                <option key={lideranca.id} value={lideranca.id}>{lideranca.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Contatos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liderança
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Localização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Compromisso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContatos.map((contato) => (
                <tr key={contato.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contato.nome}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{contato.telefone}</span>
                            </div>
                            {contato.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">{contato.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{contato.liderancaNome}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-500">{contato.bairro}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Zona {contato.zona} - Seção {contato.secao}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCompromissoColor(contato.compromissoVoto)}`}>
                      {getCompromissoLabel(contato.compromissoVoto)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(contato)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContatos.length === 0 && (
          <div className="text-center py-12">
            <Vote className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum contato encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || compromissoFilter !== 'all' || liderancaFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando um novo contato'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal para adicionar/editar contato */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingContato ? 'Editar Contato' : 'Novo Contato'}
      >
        <FormContato
          contato={editingContato}
          liderancas={liderancas}
          onSave={handleSaveContato}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Contatos;