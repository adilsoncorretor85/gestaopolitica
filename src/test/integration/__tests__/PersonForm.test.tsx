import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import PersonForm from '@/components/forms/PersonForm';
import { createMockPerson, createMockUser } from '@/test/utils';

// Mock dos hooks
vi.mock('@/hooks/useAuth', () => ({
  default: () => ({
    profile: createMockUser(),
    isAdmin: false,
    loading: false,
  }),
}));

vi.mock('@/hooks/useTags', () => ({
  useTags: () => ({
    tags: [
      { id: 'tag-1', name: 'Tag 1', color: '#3b82f6' },
      { id: 'tag-2', name: 'Tag 2', color: '#ef4444' },
    ],
    loading: false,
  }),
}));

vi.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(),
    handleAsyncError: vi.fn(),
  }),
}));

// Mock dos serviços
vi.mock('@/services/people', () => ({
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
  checkWhatsAppDuplicate: vi.fn(),
}));

vi.mock('@/services/admin', () => ({
  listLeaders: vi.fn().mockResolvedValue({
    data: [
      { id: 'leader-1', full_name: 'Líder 1', role: 'LEADER' },
      { id: 'leader-2', full_name: 'Líder 2', role: 'LEADER' },
    ],
    error: null,
  }),
}));

describe('PersonForm - Integration Tests', () => {
  const mockOnSuccess = vi.fn();
  const mockCreatePerson = vi.mocked(require('@/services/people').createPerson);
  const mockUpdatePerson = vi.mocked(require('@/services/people').updatePerson);
  const mockCheckWhatsAppDuplicate = vi.mocked(require('@/services/people').checkWhatsAppDuplicate);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock padrão para verificação de WhatsApp
    mockCheckWhatsAppDuplicate.mockResolvedValue({
      isDuplicate: false,
    });
  });

  describe('Criação de Pessoa', () => {
    it('deve criar pessoa com sucesso', async () => {
      const mockPerson = createMockPerson();
      mockCreatePerson.mockResolvedValue({
        data: mockPerson,
        error: null,
      });

      render(<PersonForm onSuccess={mockOnSuccess} />);

      // Preencher campos obrigatórios
      const nameInput = screen.getByLabelText(/nome completo/i);
      const whatsappInput = screen.getByLabelText(/whatsapp/i);
      const submitButton = screen.getByRole('button', { name: /cadastrar pessoa/i });

      fireEvent.change(nameInput, { target: { value: mockPerson.full_name } });
      fireEvent.change(whatsappInput, { target: { value: mockPerson.whatsapp } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreatePerson).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: mockPerson.full_name,
            whatsapp: mockPerson.whatsapp,
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('deve validar campos obrigatórios', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const submitButton = screen.getByRole('button', { name: /cadastrar pessoa/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
      });

      expect(mockCreatePerson).not.toHaveBeenCalled();
    });

    it('deve verificar duplicidade de WhatsApp', async () => {
      const mockPerson = createMockPerson();
      
      mockCheckWhatsAppDuplicate.mockResolvedValue({
        isDuplicate: true,
        message: 'WhatsApp já cadastrado',
      });

      render(<PersonForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText(/nome completo/i);
      const whatsappInput = screen.getByLabelText(/whatsapp/i);
      const submitButton = screen.getByRole('button', { name: /cadastrar pessoa/i });

      fireEvent.change(nameInput, { target: { value: mockPerson.full_name } });
      fireEvent.change(whatsappInput, { target: { value: mockPerson.whatsapp } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/whatsapp já cadastrado/i)).toBeInTheDocument();
      });

      expect(mockCreatePerson).not.toHaveBeenCalled();
    });

    it('deve lidar com erro na criação', async () => {
      const mockPerson = createMockPerson();
      
      mockCreatePerson.mockResolvedValue({
        data: null,
        error: 'Erro ao criar pessoa',
      });

      render(<PersonForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText(/nome completo/i);
      const whatsappInput = screen.getByLabelText(/whatsapp/i);
      const submitButton = screen.getByRole('button', { name: /cadastrar pessoa/i });

      fireEvent.change(nameInput, { target: { value: mockPerson.full_name } });
      fireEvent.change(whatsappInput, { target: { value: mockPerson.whatsapp } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/erro ao criar pessoa/i)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Edição de Pessoa', () => {
    it('deve editar pessoa existente', async () => {
      const mockPerson = createMockPerson();
      const updatedPerson = { ...mockPerson, full_name: 'Nome Atualizado' };
      
      mockUpdatePerson.mockResolvedValue({
        data: updatedPerson,
        error: null,
      });

      render(<PersonForm person={mockPerson} onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText(/nome completo/i);
      const submitButton = screen.getByRole('button', { name: /atualizar pessoa/i });

      fireEvent.change(nameInput, { target: { value: 'Nome Atualizado' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdatePerson).toHaveBeenCalledWith(
          mockPerson.id,
          expect.objectContaining({
            full_name: 'Nome Atualizado',
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('Campos Avançados', () => {
    it('deve mostrar campos avançados quando solicitado', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const showAdvancedButton = screen.getByText(/adicionar mais detalhes/i);
      fireEvent.click(showAdvancedButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument();
      });
    });

    it('deve permitir seleção de tags', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const showAdvancedButton = screen.getByText(/adicionar mais detalhes/i);
      fireEvent.click(showAdvancedButton);

      await waitFor(() => {
        const tagSelector = screen.getByText(/selecionar tags/i);
        expect(tagSelector).toBeInTheDocument();
      });
    });

    it('deve permitir seleção de líder', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const showAdvancedButton = screen.getByText(/adicionar mais detalhes/i);
      fireEvent.click(showAdvancedButton);

      await waitFor(() => {
        const leaderSelector = screen.getByText(/selecionar líder/i);
        expect(leaderSelector).toBeInTheDocument();
      });
    });
  });

  describe('Validação de Formulário', () => {
    it('deve validar formato de email', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const showAdvancedButton = screen.getByText(/adicionar mais detalhes/i);
      fireEvent.click(showAdvancedButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput, { target: { value: 'email-invalido' } });
        fireEvent.blur(emailInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      });
    });

    it('deve validar formato de WhatsApp', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const whatsappInput = screen.getByLabelText(/whatsapp/i);
      fireEvent.change(whatsappInput, { target: { value: '123' } });
      fireEvent.blur(whatsappInput);

      await waitFor(() => {
        expect(screen.getByText(/whatsapp inválido/i)).toBeInTheDocument();
      });
    });

    it('deve validar data de nascimento', async () => {
      render(<PersonForm onSuccess={mockOnSuccess} />);

      const showAdvancedButton = screen.getByText(/adicionar mais detalhes/i);
      fireEvent.click(showAdvancedButton);

      await waitFor(() => {
        const birthDateInput = screen.getByLabelText(/data de nascimento/i);
        fireEvent.change(birthDateInput, { target: { value: '2030-01-01' } });
        fireEvent.blur(birthDateInput);
      });

      await waitFor(() => {
        expect(screen.getByText(/data de nascimento inválida/i)).toBeInTheDocument();
      });
    });
  });

  describe('Estados de Loading', () => {
    it('deve mostrar loading durante salvamento', async () => {
      const mockPerson = createMockPerson();
      
      // Mock que demora para resolver
      mockCreatePerson.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: mockPerson,
          error: null,
        }), 100))
      );

      render(<PersonForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByLabelText(/nome completo/i);
      const whatsappInput = screen.getByLabelText(/whatsapp/i);
      const submitButton = screen.getByRole('button', { name: /cadastrar pessoa/i });

      fireEvent.change(nameInput, { target: { value: mockPerson.full_name } });
      fireEvent.change(whatsappInput, { target: { value: mockPerson.whatsapp } });

      fireEvent.click(submitButton);

      // Verificar se o botão está desabilitado e mostra loading
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/salvando/i)).toBeInTheDocument();
    });
  });
});
