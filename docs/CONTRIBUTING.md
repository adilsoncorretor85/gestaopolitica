# 🤝 Guia de Contribuição

Obrigado por considerar contribuir com o Sistema de Gestão Política! Este guia fornece informações sobre como contribuir de forma eficaz.

## 📋 Índice

- [🎯 Como Contribuir](#-como-contribuir)
- [🛠️ Configuração do Ambiente](#️-configuração-do-ambiente)
- [📝 Padrões de Código](#-padrões-de-código)
- [🧪 Testes](#-testes)
- [📚 Documentação](#-documentação)
- [🔄 Processo de Pull Request](#-processo-de-pull-request)
- [🐛 Reportar Bugs](#-reportar-bugs)
- [💡 Sugerir Funcionalidades](#-sugerir-funcionalidades)
- [❓ Dúvidas](#-dúvidas)

## 🎯 Como Contribuir

### Tipos de Contribuição

#### 🐛 Correção de Bugs
- Identifique e corrija problemas existentes
- Adicione testes para evitar regressões
- Documente a correção

#### ✨ Novas Funcionalidades
- Implemente funcionalidades solicitadas
- Mantenha compatibilidade com versões anteriores
- Adicione testes e documentação

#### 📚 Melhoria de Documentação
- Corrija erros na documentação
- Adicione exemplos e guias
- Traduza para outros idiomas

#### 🧪 Testes
- Aumente a cobertura de testes
- Adicione testes de integração
- Melhore a qualidade dos testes

#### 🎨 Melhorias de UI/UX
- Melhore a interface do usuário
- Otimize a experiência do usuário
- Adicione acessibilidade

## 🛠️ Configuração do Ambiente

### 1. Fork e Clone
```bash
# Fork o repositório no GitHub
# Clone seu fork
git clone https://github.com/SEU-USUARIO/gestao-politica.git
cd gestao-politica

# Adicione o repositório original como upstream
git remote add upstream https://github.com/ORIGINAL/gestao-politica.git
```

### 2. Instalação
```bash
# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Configuração do Supabase
```bash
# Execute o setup
npm run supabase:setup

# Verifique o status
npm run supabase:status
```

### 4. Verificação
```bash
# Execute os testes
npm run test

# Verifique TypeScript
npm run typecheck

# Verifique linting
npm run lint
```

## 📝 Padrões de Código

### TypeScript
- **Tipagem forte**: Use tipos explícitos
- **Interfaces**: Defina interfaces claras
- **Generics**: Use quando apropriado
- **Enums**: Para valores constantes

```typescript
// ✅ Bom
interface UserProps {
  id: string;
  name: string;
  email: string;
}

const User: React.FC<UserProps> = ({ id, name, email }) => {
  // ...
};

// ❌ Evitar
const User = ({ id, name, email }) => {
  // ...
};
```

### React
- **Functional Components**: Use sempre
- **Hooks**: Custom hooks para lógica reutilizável
- **Props**: Interface bem definida
- **Memo**: Para otimização quando necessário

```typescript
// ✅ Bom
const UserCard = memo(({ user }: UserCardProps) => {
  const handleClick = useCallback(() => {
    // ...
  }, []);

  return (
    <div onClick={handleClick}>
      {user.name}
    </div>
  );
});

// ❌ Evitar
const UserCard = ({ user }) => {
  return (
    <div onClick={() => {}}>
      {user.name}
    </div>
  );
};
```

### Nomenclatura
- **Componentes**: PascalCase (`UserCard`)
- **Funções**: camelCase (`getUserData`)
- **Constantes**: UPPER_SNAKE_CASE (`API_URL`)
- **Arquivos**: kebab-case (`user-card.tsx`)

### Estrutura de Arquivos
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes de UI básicos
│   ├── forms/          # Componentes de formulário
│   └── modals/         # Modais
├── pages/              # Páginas da aplicação
├── hooks/              # Custom hooks
├── services/           # Serviços e APIs
├── types/              # Definições TypeScript
├── lib/                # Utilitários
├── test/               # Testes
└── styles/             # Estilos CSS
```

## 🧪 Testes

### Estrutura de Testes
```typescript
// ✅ Bom
describe('UserCard', () => {
  it('deve renderizar o nome do usuário', () => {
    const user = createMockUser({ name: 'João' });
    render(<UserCard user={user} />);
    
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', () => {
    const handleClick = vi.fn();
    const user = createMockUser();
    
    render(<UserCard user={user} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledWith(user);
  });
});
```

### Cobertura de Testes
- **Mínimo**: 70% de cobertura
- **Componentes**: Teste renderização e interações
- **Hooks**: Teste estados e efeitos
- **Serviços**: Teste sucesso e erro
- **Integração**: Teste fluxos completos

### Executar Testes
```bash
# Todos os testes
npm run test

# Modo watch
npm run test:watch

# Com coverage
npm run test:coverage

# Testes específicos
npm run test:unit
npm run test:integration
```

## 📚 Documentação

### Comentários no Código
```typescript
/**
 * Calcula a idade baseada na data de nascimento
 * @param birthDate - Data de nascimento no formato ISO
 * @returns Idade em anos
 */
const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  
  // Ajusta se ainda não fez aniversário este ano
  if (today.getMonth() < birth.getMonth() || 
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};
```

### README de Componentes
```typescript
/**
 * UserCard - Componente para exibir informações do usuário
 * 
 * @example
 * ```tsx
 * <UserCard 
 *   user={user} 
 *   onClick={handleClick}
 *   showEmail={true}
 * />
 * ```
 */
```

### Documentação de APIs
```typescript
/**
 * Cria uma nova pessoa no sistema
 * 
 * @param person - Dados da pessoa
 * @returns Promise com resultado da operação
 * 
 * @example
 * ```typescript
 * const { data, error } = await createPerson({
 *   full_name: 'João Silva',
 *   whatsapp: '47999999999'
 * });
 * ```
 */
```

## 🔄 Processo de Pull Request

### 1. Criar Branch
```bash
# Crie uma branch para sua feature
git checkout -b feature/nova-funcionalidade

# Ou para correção de bug
git checkout -b fix/corrigir-bug
```

### 2. Desenvolver
```bash
# Faça suas alterações
# Adicione testes
# Atualize documentação

# Commit com mensagem clara
git add .
git commit -m "feat: adiciona nova funcionalidade de busca"
```

### 3. Testar
```bash
# Execute todos os testes
npm run test

# Verifique TypeScript
npm run typecheck

# Verifique linting
npm run lint

# Teste manualmente
npm run dev
```

### 4. Sincronizar
```bash
# Sincronize com upstream
git fetch upstream
git rebase upstream/main

# Resolva conflitos se houver
```

### 5. Push e PR
```bash
# Push para seu fork
git push origin feature/nova-funcionalidade

# Crie Pull Request no GitHub
```

### Template de Pull Request
```markdown
## 📝 Descrição
Breve descrição das alterações realizadas.

## 🔗 Issue Relacionada
Closes #123

## 🧪 Testes
- [ ] Testes unitários adicionados/atualizados
- [ ] Testes de integração adicionados/atualizados
- [ ] Testes manuais realizados

## 📚 Documentação
- [ ] README atualizado
- [ ] Comentários no código adicionados
- [ ] Documentação da API atualizada

## 🎨 UI/UX
- [ ] Interface responsiva
- [ ] Acessibilidade verificada
- [ ] Dark mode suportado

## 🔍 Checklist
- [ ] Código segue os padrões do projeto
- [ ] TypeScript sem erros
- [ ] Linting passou
- [ ] Testes passaram
- [ ] Build funcionando
```

## 🐛 Reportar Bugs

### Template de Bug Report
```markdown
## 🐛 Descrição do Bug
Descrição clara e concisa do bug.

## 🔄 Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Role até '...'
4. Veja o erro

## ✅ Comportamento Esperado
O que deveria acontecer.

## ❌ Comportamento Atual
O que está acontecendo.

## 📱 Ambiente
- OS: [ex: Windows 10]
- Navegador: [ex: Chrome 91]
- Versão: [ex: 1.0.0]

## 📸 Screenshots
Se aplicável, adicione screenshots.

## 📋 Logs
```
Cole logs relevantes aqui
```
```

### Severidade de Bugs
- **🔴 Crítico**: Sistema inutilizável
- **🟠 Alto**: Funcionalidade principal quebrada
- **🟡 Médio**: Funcionalidade secundária quebrada
- **🟢 Baixo**: Problema cosmético

## 💡 Sugerir Funcionalidades

### Template de Feature Request
```markdown
## 💡 Funcionalidade
Descrição clara da funcionalidade desejada.

## 🎯 Problema
Qual problema esta funcionalidade resolve?

## 💭 Solução Proposta
Como você imagina que deveria funcionar?

## 🔄 Alternativas
Outras soluções consideradas.

## 📋 Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## 📱 Mockups/Wireframes
Se aplicável, adicione mockups.
```

### Priorização
- **🔴 Alta**: Funcionalidade essencial
- **🟠 Média**: Melhoria importante
- **🟡 Baixa**: Nice to have

## ❓ Dúvidas

### Onde Perguntar
- **GitHub Discussions**: Para discussões gerais
- **GitHub Issues**: Para bugs e features
- **Email**: suporte@wiliantonezi.com.br

### Tipos de Pergunta
- **Como fazer**: GitHub Discussions
- **Bug encontrado**: GitHub Issues
- **Feature request**: GitHub Issues
- **Dúvida técnica**: GitHub Discussions

## 🏆 Reconhecimento

### Contribuidores
Todos os contribuidores são reconhecidos no README e releases.

### Tipos de Contribuição
- **🐛 Bug fixes**
- **✨ Features**
- **📚 Documentation**
- **🧪 Tests**
- **🎨 Design**
- **🔧 Maintenance**

## 📋 Checklist para Contribuidores

### Antes de Começar
- [ ] Li o README
- [ ] Li este guia de contribuição
- [ ] Verifiquei issues existentes
- [ ] Configurei o ambiente de desenvolvimento

### Durante o Desenvolvimento
- [ ] Sigo os padrões de código
- [ ] Escrevo testes
- [ ] Atualizo documentação
- [ ] Testo manualmente

### Antes do PR
- [ ] Todos os testes passam
- [ ] TypeScript sem erros
- [ ] Linting passou
- [ ] Build funcionando
- [ ] PR template preenchido

## 🚀 Primeiros Passos

### Issues Boas para Iniciantes
Procure por labels:
- `good first issue`
- `help wanted`
- `documentation`

### Como Escolher uma Issue
1. Leia a descrição completa
2. Verifique se está disponível
3. Pergunte se tiver dúvidas
4. Assigne a issue para você

---

🤝 **Obrigado por contribuir!**

Sua contribuição é muito importante para o projeto. Se tiver dúvidas, não hesite em perguntar!
