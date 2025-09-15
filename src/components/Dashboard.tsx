import React from 'react';
import { Users, UserCheck, Target, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { liderancas, contatos } from '../data/mockData';
import { Metrica } from '../types';

const Dashboard: React.FC = () => {
  const metricas: Metrica = {
    totalLiderancas: liderancas.length,
    liderancasAtivas: liderancas.filter(l => l.status === 'ativo').length,
    totalContatos: contatos.length,
    votosConfirmados: contatos.filter(c => c.compromissoVoto === 'confirmado').length,
    votosProvaveis: contatos.filter(c => c.compromissoVoto === 'provavel').length,
    metaTotalContatos: liderancas.reduce((total, l) => total + l.metaContatos, 0),
  };

  const progressoMeta = Math.round((metricas.totalContatos / metricas.metaTotalContatos) * 100);
  
  const estatisticasCards = [
    {
      titulo: 'Total de Lideranças',
      valor: metricas.totalLiderancas,
      icon: Users,
      cor: 'bg-blue-500',
      descricao: `${metricas.liderancasAtivas} ativas`
    },
    {
      titulo: 'Total de Contatos',
      valor: metricas.totalContatos,
      icon: UserCheck,
      cor: 'bg-green-500',
      descricao: `Meta: ${metricas.metaTotalContatos}`
    },
    {
      titulo: 'Votos Confirmados',
      valor: metricas.votosConfirmados,
      icon: Target,
      cor: 'bg-emerald-500',
      descricao: `${metricas.votosProvaveis} prováveis`
    },
    {
      titulo: 'Progresso da Meta',
      valor: `${progressoMeta}%`,
      icon: TrendingUp,
      cor: 'bg-purple-500',
      descricao: `${metricas.totalContatos}/${metricas.metaTotalContatos}`
    }
  ];

  const liderancasTop = liderancas
    .sort((a, b) => b.contatosAtingidos - a.contatosAtingidos)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da campanha política</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>Última atualização: hoje</span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {estatisticasCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.titulo}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.valor}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.descricao}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.cor}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de Progresso */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso da Meta de Contatos</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Contatos Realizados</span>
            <span>{metricas.totalContatos} / {metricas.metaTotalContatos}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(progressoMeta, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span className="font-medium">{progressoMeta}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Top Lideranças */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Lideranças</h3>
        <div className="space-y-4">
          {liderancasTop.map((lideranca, index) => {
            const progresso = Math.round((lideranca.contatosAtingidos / lideranca.metaContatos) * 100);
            return (
              <div key={lideranca.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lideranca.nome}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{lideranca.bairro}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {lideranca.contatosAtingidos}/{lideranca.metaContatos}
                  </p>
                  <p className="text-xs text-gray-500">{progresso}% da meta</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribuição de Votos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Votos</h3>
          <div className="space-y-3">
            {[
              { label: 'Confirmados', valor: metricas.votosConfirmados, cor: 'bg-green-500' },
              { label: 'Prováveis', valor: metricas.votosProvaveis, cor: 'bg-yellow-500' },
              { label: 'Incertos', valor: contatos.filter(c => c.compromissoVoto === 'incerto').length, cor: 'bg-orange-500' },
              { label: 'Contrários', valor: contatos.filter(c => c.compromissoVoto === 'contrario').length, cor: 'bg-red-500' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.cor}`} />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo por Zona</h3>
          <div className="space-y-3">
            {Array.from(new Set(contatos.map(c => c.zona))).map((zona) => {
              const contatosZona = contatos.filter(c => c.zona === zona);
              const confirmadosZona = contatosZona.filter(c => c.compromissoVoto === 'confirmado').length;
              return (
                <div key={zona} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Zona {zona}</p>
                    <p className="text-xs text-gray-500">{contatosZona.length} contatos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{confirmadosZona} confirmados</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;