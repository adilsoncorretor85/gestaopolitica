import { Lideranca, Contato } from '../types';

export const liderancas: Lideranca[] = [
  {
    id: '1',
    nome: 'Maria Santos Silva',
    telefone: '(11) 99999-1234',
    email: 'maria.santos@email.com',
    endereco: 'Rua das Flores, 123',
    bairro: 'Centro',
    zona: '001',
    secao: '0001',
    metaContatos: 50,
    contatosAtingidos: 35,
    status: 'ativo',
    observacoes: 'Liderança muito engajada, boa influência no bairro',
    dataCadastro: '2024-01-15'
  },
  {
    id: '2',
    nome: 'João Carlos Pereira',
    telefone: '(11) 98888-5678',
    email: 'joao.carlos@email.com',
    endereco: 'Av. Principal, 456',
    bairro: 'Vila Nova',
    zona: '002',
    secao: '0023',
    metaContatos: 40,
    contatosAtingidos: 40,
    status: 'ativo',
    observacoes: 'Comerciante local, boa rede de contatos',
    dataCadastro: '2024-01-20'
  },
  {
    id: '3',
    nome: 'Ana Paula Costa',
    telefone: '(11) 97777-9012',
    endereco: 'Rua do Comércio, 789',
    bairro: 'Jardim Esperança',
    zona: '003',
    secao: '0045',
    metaContatos: 30,
    contatosAtingidos: 15,
    status: 'ativo',
    observacoes: 'Presidente da associação de moradores',
    dataCadastro: '2024-02-01'
  }
];

export const contatos: Contato[] = [
  {
    id: '1',
    nome: 'Pedro Henrique Oliveira',
    telefone: '(11) 96666-1111',
    email: 'pedro.oliveira@email.com',
    endereco: 'Rua A, 100',
    bairro: 'Centro',
    zona: '001',
    secao: '0001',
    liderancaId: '1',
    liderancaNome: 'Maria Santos Silva',
    compromissoVoto: 'confirmado',
    observacoes: 'Muito satisfeito com os trabalhos do vereador',
    dataCadastro: '2024-01-16'
  },
  {
    id: '2',
    nome: 'Carla Fernandes',
    telefone: '(11) 95555-2222',
    endereco: 'Rua B, 200',
    bairro: 'Centro',
    zona: '001',
    secao: '0001',
    liderancaId: '1',
    liderancaNome: 'Maria Santos Silva',
    compromissoVoto: 'provavel',
    observacoes: 'Interessada nas propostas para educação',
    dataCadastro: '2024-01-18'
  },
  {
    id: '3',
    nome: 'Roberto Silva Junior',
    telefone: '(11) 94444-3333',
    endereco: 'Av. Principal, 500',
    bairro: 'Vila Nova',
    zona: '002',
    secao: '0023',
    liderancaId: '2',
    liderancaNome: 'João Carlos Pereira',
    compromissoVoto: 'confirmado',
    observacoes: 'Empresário local, apoia as propostas econômicas',
    dataCadastro: '2024-01-22'
  }
];