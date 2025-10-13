import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  listPeople, 
  createPerson, 
  updatePerson, 
  deletePerson, 
  checkWhatsAppDuplicate,
  getPerson 
} from '../people';
import { createMockPerson } from '@/test/utils';

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  })),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase,
  handleSupabaseError: vi.fn((error: any) => 'Erro mockado'),
}));

describe('people service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listPeople', () => {
    it('deve listar pessoas com sucesso', async () => {
      const mockPeople = [createMockPerson(), createMockPerson({ id: 'person-2' })];
      
      mockSupabase.from().single.mockResolvedValue({
        data: mockPeople,
        error: null,
      });

      const result = await listPeople();

      expect(result.data).toEqual(mockPeople);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('people');
    });

    it('deve lidar com erro ao listar pessoas', async () => {
      const mockError = { message: 'Erro de conexão' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await listPeople();

      expect(result.data).toBeNull();
      expect(result.error).toBe('Erro mockado');
    });
  });

  describe('createPerson', () => {
    it('deve criar pessoa com sucesso', async () => {
      const mockPerson = createMockPerson();
      const mockCreatedPerson = { ...mockPerson, id: 'new-person-id' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: mockCreatedPerson,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await createPerson(mockPerson);

      expect(result.data).toEqual({ ...mockCreatedPerson, tags: [] });
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('people');
    });

    it('deve lidar com erro ao criar pessoa', async () => {
      const mockPerson = createMockPerson();
      const mockError = { message: 'Erro de validação' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await createPerson(mockPerson);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Erro mockado');
    });

    it('deve verificar duplicidade de WhatsApp antes de criar', async () => {
      const mockPerson = createMockPerson();
      
      // Mock da verificação de duplicidade
      mockSupabase.from().single.mockResolvedValue({
        data: [mockPerson],
        error: null,
      });

      const result = await createPerson(mockPerson);

      expect(result.data).toBeNull();
      expect(result.error).toContain('WhatsApp já cadastrado');
    });
  });

  describe('updatePerson', () => {
    it('deve atualizar pessoa com sucesso', async () => {
      const mockPerson = createMockPerson();
      const mockUpdatedPerson = { ...mockPerson, full_name: 'Nome Atualizado' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: mockUpdatedPerson,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await updatePerson(mockPerson.id, mockPerson);

      expect(result.data).toEqual({ ...mockUpdatedPerson, tags: [] });
      expect(result.error).toBeNull();
    });

    it('deve lidar com erro ao atualizar pessoa', async () => {
      const mockPerson = createMockPerson();
      const mockError = { message: 'Pessoa não encontrada' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await updatePerson(mockPerson.id, mockPerson);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Erro mockado');
    });
  });

  describe('deletePerson', () => {
    it('deve deletar pessoa com sucesso', async () => {
      const personId = 'test-person-id';
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deletePerson(personId);

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('people');
    });

    it('deve lidar com erro ao deletar pessoa', async () => {
      const personId = 'test-person-id';
      const mockError = { message: 'Erro ao deletar' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await deletePerson(personId);

      expect(result.error).toBe('Erro mockado');
    });
  });

  describe('checkWhatsAppDuplicate', () => {
    it('deve retornar false para WhatsApp único', async () => {
      const whatsapp = '47999999999';
      
      mockSupabase.from().single.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await checkWhatsAppDuplicate(whatsapp);

      expect(result.isDuplicate).toBe(false);
      expect(result.message).toBeUndefined();
    });

    it('deve retornar true para WhatsApp duplicado', async () => {
      const whatsapp = '47999999999';
      const mockPerson = createMockPerson({ whatsapp });
      
      mockSupabase.from().single.mockResolvedValue({
        data: [mockPerson],
        error: null,
      });

      const result = await checkWhatsAppDuplicate(whatsapp);

      expect(result.isDuplicate).toBe(true);
      expect(result.message).toContain('WhatsApp já cadastrado');
    });

    it('deve ignorar a própria pessoa na verificação', async () => {
      const whatsapp = '47999999999';
      const currentPersonId = 'current-person-id';
      const mockPerson = createMockPerson({ whatsapp, id: currentPersonId });
      
      mockSupabase.from().single.mockResolvedValue({
        data: [mockPerson],
        error: null,
      });

      const result = await checkWhatsAppDuplicate(whatsapp, currentPersonId);

      expect(result.isDuplicate).toBe(false);
    });

    it('deve lidar com erro na verificação', async () => {
      const whatsapp = '47999999999';
      const mockError = { message: 'Erro de conexão' };
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await checkWhatsAppDuplicate(whatsapp);

      expect(result.isDuplicate).toBe(false);
      expect(result.message).toBe('Erro mockado');
    });
  });

  describe('getPerson', () => {
    it('deve buscar pessoa por ID com sucesso', async () => {
      const personId = 'test-person-id';
      const mockPerson = createMockPerson({ id: personId });
      
      mockSupabase.from().single.mockResolvedValue({
        data: mockPerson,
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getPerson(personId);

      expect(result.data).toEqual({ ...mockPerson, tags: [] });
      expect(result.error).toBeNull();
    });

    it('deve retornar null para pessoa não encontrada', async () => {
      const personId = 'non-existent-id';
      
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Pessoa não encontrada' },
      });

      const result = await getPerson(personId);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Erro mockado');
    });
  });
});
