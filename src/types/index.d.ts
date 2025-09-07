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
    peopleByDay?: {
        date: string;
        count: number;
    }[];
    topLeaders?: {
        leader: Profile;
        count: number;
    }[];
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
export interface Contato {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    nome: string;
    telefone: string;
    endereco: string;
    bairro: string;
    zona: string;
    secao: string;
    liderancaId: string;
    liderancaNome: string;
    compromissoVoto: 'confirmado' | 'provavel' | 'incerto' | 'contrario';
    observacoes?: string;
    dataCadastro: string;
}
export interface Lideranca {
    id: string;
    name: string;
    role: string;
    organization: string;
    nome: string;
    telefone: string;
    email?: string;
    endereco: string;
    bairro: string;
    zona: string;
    secao: string;
    metaContatos: number;
    contatosAtingidos: number;
    status: 'ativo' | 'inativo';
    observacoes?: string;
    dataCadastro: string;
}
export interface Metrica {
    title: string;
    value: number;
    change: number;
    changeType: 'increase' | 'decrease';
    totalLiderancas: number;
    liderancasAtivas: number;
    totalContatos: number;
    votosConfirmados: number;
    votosProvaveis: number;
    metaTotalContatos: number;
}
