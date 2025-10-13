import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Person = Database['public']['Tables']['people']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export type PersonInsert = Database['public']['Tables']['people']['Insert'];
export type PersonUpdate = Database['public']['Tables']['people']['Update'];

export interface PersonWithProfile extends Person {
  owner: Profile;
}

export interface DashboardStats {
  totalPeople: number;
  totalCities: number;
  totalStates: number;
  recentPeople: Person[];
  peopleByDay?: { date: string; count: number }[];
  topLeaders?: { leader: Profile; count: number }[];
}

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PeopleFilters {
  search?: string;
  city?: string;
  state?: string;
  ownerId?: string;
  page?: number;
  pageSize?: number;
}

// Tipos para componentes que usavam mockData
export interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  zona: string;
  secao: string;
  compromissoVoto: 'confirmado' | 'provavel' | 'indefinido' | 'incerto';
  observacoes?: string;
  liderancaId: string;
  liderancaNome: string;
  dataCadastro: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lideranca {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  zona: string;
  secao: string;
  status: 'ativo' | 'inativo';
  metaContatos: number;
  contatosAtuais: number;
  contatosAtingidos: number;
  observacoes?: string;
  dataCadastro: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderWithProfile {
  id: string;
  full_name: string;
  role: string;
  email: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}