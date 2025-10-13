import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ElectionProvider } from '@/contexts/ElectionContext';
import { supabase } from '@/lib/supabaseClient';
import { vi, expect } from 'vitest';

// Mock do ElectionProvider para testes
const MockElectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mockElection = {
    id: 'test-election',
    name: 'Eleição Teste',
    election_level: 'MUNICIPAL' as const,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_active: true,
  };

  const mockDefaultFilters = {
    city: 'Joinville',
    state: 'SC',
    neighborhood: '',
  };

  return (
    <ElectionProvider supabase={supabase}>
      {children}
    </ElectionProvider>
  );
};

// Wrapper customizado para testes
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <MockElectionProvider>
          {children}
        </MockElectionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Função de render customizada
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-exportar tudo
export * from '@testing-library/react';
export { customRender as render };

// Utilitários para testes
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'LEADER',
  full_name: 'Usuário Teste',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockPerson = (overrides = {}) => ({
  id: 'test-person-id',
  full_name: 'Pessoa Teste',
  whatsapp: '47999999999',
  email: 'pessoa@example.com',
  birth_date: '1990-01-01',
  gender: 'M' as const,
  treatment: 'Sr.',
  cep: '89200-000',
  city: 'Joinville',
  state: 'SC',
  neighborhood: 'Centro',
  street: 'Rua Teste',
  number: '123',
  complement: '',
  latitude: -26.3044,
  longitude: -48.8461,
  owner: 'test-user-id',
  owner_id: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  tags: [],
  contacted_at: null,
  facebook: null,
  full_name_fts: null,
  instagram: null,
  notes: null,
  vote_status: null,
  ...overrides,
});

export const createMockTag = (overrides = {}) => ({
  id: 'test-tag-id',
  name: 'Tag Teste',
  color: '#3b82f6',
  description: 'Tag de teste',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockLeader = (overrides = {}) => ({
  id: 'test-leader-id',
  email: 'leader@example.com',
  role: 'LEADER',
  full_name: 'Líder Teste',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  profiles: {
    id: 'test-leader-id',
    role: 'LEADER',
    full_name: 'Líder Teste',
    email: 'leader@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  ...overrides,
});

// Mock de dados para testes
export const mockData = {
  users: [
    createMockUser(),
    createMockUser({ id: 'user-2', email: 'user2@example.com', full_name: 'Usuário 2' }),
  ],
  people: [
    createMockPerson(),
    createMockPerson({ id: 'person-2', full_name: 'Pessoa 2', whatsapp: '47988888888' }),
  ],
  tags: [
    createMockTag(),
    createMockTag({ id: 'tag-2', name: 'Tag 2', color: '#ef4444' }),
  ],
  leaders: [
    createMockLeader(),
    createMockLeader({ id: 'leader-2', email: 'leader2@example.com', full_name: 'Líder 2' }),
  ],
};

// Utilitários para simular eventos
export const fireEvent = {
  ...require('@testing-library/react').fireEvent,
  
  // Simular mudança de input
  changeInput: (element: HTMLElement, value: string) => {
    require('@testing-library/react').fireEvent.change(element, { target: { value } });
  },
  
  // Simular submit de formulário
  submitForm: (element: HTMLElement) => {
    require('@testing-library/react').fireEvent.submit(element);
  },
  
  // Simular clique com teclado
  clickWithKeyboard: (element: HTMLElement) => {
    require('@testing-library/react').fireEvent.keyDown(element, { key: 'Enter', code: 'Enter' });
  },
};

// Utilitários para aguardar elementos
export const waitFor = {
  ...require('@testing-library/react').waitFor,
  
  // Aguardar elemento aparecer
  elementToAppear: async (selector: string, timeout = 1000) => {
    const { getByTestId, getByRole, getByText, getByLabelText } = require('@testing-library/react');
    
    try {
      return await waitFor(() => {
        try {
          return getByTestId(selector);
        } catch {
          try {
            return getByRole(selector as any);
          } catch {
            try {
              return getByText(selector);
            } catch {
              return getByLabelText(selector);
            }
          }
        }
      }, { timeout });
    } catch (error) {
      throw new Error(`Elemento "${selector}" não encontrado dentro de ${timeout}ms`);
    }
  },
};

// Mock de funções comuns
export const mockFunctions = {
  navigate: vi.fn(),
  setValue: vi.fn(),
  watch: vi.fn(),
  reset: vi.fn(),
  handleSubmit: vi.fn((fn) => fn),
  register: vi.fn(),
  getValues: vi.fn(),
};

// Utilitários para testes de acessibilidade
export const a11yUtils = {
  // Verificar se elemento tem role correto
  hasRole: (element: HTMLElement, role: string) => {
    return element.getAttribute('role') === role;
  },
  
  // Verificar se elemento tem aria-label
  hasAriaLabel: (element: HTMLElement, label: string) => {
    return element.getAttribute('aria-label') === label;
  },
  
  // Verificar se elemento é acessível via teclado
  isKeyboardAccessible: (element: HTMLElement) => {
    const tabIndex = element.getAttribute('tabindex');
    const role = element.getAttribute('role');
    const isButton = element.tagName === 'BUTTON' || role === 'button';
    const isLink = element.tagName === 'A' || role === 'link';
    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT';
    
    return isButton || isLink || isInput || tabIndex !== null;
  },
};

// Utilitários para testes de performance
export const performanceUtils = {
  // Medir tempo de renderização
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    return end - start;
  },
  
  // Verificar se componente renderiza dentro do tempo limite
  rendersWithinTime: async (renderFn: () => void, maxTime = 100) => {
    const renderTime = await performanceUtils.measureRenderTime(renderFn);
    return renderTime <= maxTime;
  },
};

// Utilitários para testes de integração
export const integrationUtils = {
  // Simular fluxo completo de login
  simulateLogin: async (email = 'test@example.com', password = 'password123') => {
    const { fireEvent, waitFor } = require('@testing-library/react');
    
    // Simular preenchimento do formulário
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (emailInput) fireEvent.change(emailInput, { target: { value: email } });
    if (passwordInput) fireEvent.change(passwordInput, { target: { value: password } });
    if (submitButton) fireEvent.click(submitButton);
    
    // Aguardar redirecionamento
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  },
  
  // Simular criação de pessoa
  simulateCreatePerson: async (personData = createMockPerson()) => {
    const { fireEvent, waitFor } = require('@testing-library/react');
    
    // Preencher campos do formulário
    const nameInput = document.querySelector('input[name="full_name"]') as HTMLInputElement;
    const whatsappInput = document.querySelector('input[name="whatsapp"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (nameInput) fireEvent.change(nameInput, { target: { value: personData.full_name } });
    if (whatsappInput) fireEvent.change(whatsappInput, { target: { value: personData.whatsapp } });
    if (emailInput) fireEvent.change(emailInput, { target: { value: personData.email } });
    if (submitButton) fireEvent.click(submitButton);
    
    // Aguardar sucesso
    await waitFor(() => {
      expect(document.querySelector('[data-testid="success-message"]')).toBeInTheDocument();
    });
  },
};
