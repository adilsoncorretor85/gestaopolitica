import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import Header from '../Header';
import { createMockUser } from '@/test/utils';

// Mock do hook usePWA
vi.mock('@/hooks/usePWA', () => ({
  usePWA: () => ({
    isOnline: true,
    isInstalled: false,
    isUpdateAvailable: false,
    isInstallable: false,
    installPrompt: null,
    swRegistration: null,
    installPWA: vi.fn(),
    updatePWA: vi.fn(),
    registerServiceWorker: vi.fn(),
  }),
}));

// Mock do hook useAccessibility
vi.mock('@/hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    announceToScreenReader: vi.fn(),
    focusElement: vi.fn(),
    skipToMainContent: vi.fn(),
  }),
}));

describe('Header', () => {
  const mockProfile = createMockUser();
  const mockSetSidebarOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o header com informações básicas', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    expect(screen.getByText('Gestão Política')).toBeInTheDocument();
    expect(screen.getByText('Vereador Wilian Tonezi - PL')).toBeInTheDocument();
    expect(screen.getByText('Usuário Teste')).toBeInTheDocument();
  });

  it('deve renderizar o botão de menu para mobile', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    const menuButton = screen.getByLabelText('Abrir menu lateral');
    expect(menuButton).toBeInTheDocument();
  });

  it('deve alternar o sidebar quando o botão de menu for clicado', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    const menuButton = screen.getByLabelText('Abrir menu lateral');
    fireEvent.click(menuButton);

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('deve mostrar o ícone de fechar quando o sidebar estiver aberto', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={true}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    const closeButton = screen.getByLabelText('Fechar menu lateral');
    expect(closeButton).toBeInTheDocument();
  });

  it('deve renderizar o UserMenu', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    // UserMenu deve estar presente (mesmo que mockado)
    expect(screen.getByText('Usuário Teste')).toBeInTheDocument();
  });

  it('deve ter atributos de acessibilidade corretos', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const menuButton = screen.getByLabelText('Abrir menu lateral');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'sidebar');
  });

  it('deve mostrar indicador offline quando não estiver online', () => {
    // Mock do usePWA para retornar offline
    const mockUsePWA = vi.mocked(require('@/hooks/usePWA').usePWA);
    mockUsePWA.mockReturnValue({
      isOnline: false,
      isInstalled: false,
      isUpdateAvailable: false,
      isInstallable: false,
      installPrompt: null,
      swRegistration: null,
      installPWA: vi.fn(),
      updatePWA: vi.fn(),
      registerServiceWorker: vi.fn(),
    });

    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('deve renderizar sem profile', () => {
    render(
      <Header
        profile={undefined}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    expect(screen.getByText('Usuário')).toBeInTheDocument();
  });

  it('deve ter link para dashboard no título', () => {
    render(
      <Header
        profile={mockProfile}
        sidebarOpen={false}
        setSidebarOpen={mockSetSidebarOpen}
      />
    );

    const titleLink = screen.getByRole('link', { name: /gestão política/i });
    expect(titleLink).toHaveAttribute('href', '/dashboard');
  });
});
