# 🔧 Troubleshooting

Este guia ajuda a resolver problemas comuns no Sistema de Gestão Política.

## 📋 Índice

- [🚨 Problemas Críticos](#-problemas-críticos)
- [🔐 Autenticação](#-autenticação)
- [🗄️ Banco de Dados](#️-banco-de-dados)
- [🗺️ Mapas](#️-mapas)
- [📱 PWA](#-pwa)
- [🧪 Testes](#-testes)
- [⚡ Performance](#-performance)
- [🔧 Desenvolvimento](#-desenvolvimento)
- [📞 Suporte](#-suporte)

## 🚨 Problemas Críticos

### Sistema Não Carrega
**Sintomas**: Tela branca, erro 500, aplicação não inicia

**Possíveis Causas**:
1. Erro de JavaScript
2. Problema de conexão com Supabase
3. Variáveis de ambiente incorretas

**Soluções**:
```bash
# 1. Verifique o console do navegador
F12 > Console

# 2. Verifique variáveis de ambiente
cat .env

# 3. Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install

# 4. Verifique conexão com Supabase
npm run supabase:status
```

### Erro de Build
**Sintomas**: `npm run build` falha

**Soluções**:
```bash
# 1. Verifique TypeScript
npm run typecheck

# 2. Verifique linting
npm run lint

# 3. Limpe cache do Vite
rm -rf dist .vite
npm run build

# 4. Verifique dependências
npm audit
npm update
```

## 🔐 Autenticação

### Login Não Funciona
**Sintomas**: Erro ao fazer login, usuário não autentica

**Possíveis Causas**:
1. Credenciais incorretas
2. Usuário não existe no banco
3. Problema com Supabase Auth

**Soluções**:
```bash
# 1. Verifique credenciais no Supabase
# Dashboard > Authentication > Users

# 2. Verifique configuração do Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_correta

# 3. Verifique RLS policies
# Dashboard > Authentication > Policies

# 4. Teste com usuário admin
# Use as credenciais do administrador
```

### Sessão Expira Rapidamente
**Sintomas**: Usuário é deslogado frequentemente

**Soluções**:
```typescript
// Verifique configuração de sessão no Supabase
// Dashboard > Authentication > Settings

// Ajuste tempo de expiração
JWT_EXPIRY = 3600 // 1 hora
REFRESH_TOKEN_EXPIRY = 2592000 // 30 dias
```

### Erro de Permissão
**Sintomas**: "Permission denied", "RLS policy violation"

**Soluções**:
```sql
-- Verifique RLS policies
SELECT * FROM pg_policies WHERE tablename = 'people';

-- Verifique se usuário tem role correto
SELECT * FROM auth.users WHERE email = 'usuario@exemplo.com';

-- Verifique policies de exemplo
CREATE POLICY "Users can view own people" ON people
FOR SELECT USING (auth.uid() = owner);
```

## 🗄️ Banco de Dados

### Conexão Falha
**Sintomas**: "Connection failed", "Database unavailable"

**Soluções**:
```bash
# 1. Verifique status do Supabase
npm run supabase:status

# 2. Verifique URL e chave
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# 3. Teste conexão manual
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     $VITE_SUPABASE_URL/rest/v1/

# 4. Verifique se projeto está ativo
# Dashboard > Settings > General
```

### Dados Não Carregam
**Sintomas**: Listas vazias, dados não aparecem

**Soluções**:
```sql
-- 1. Verifique se dados existem
SELECT COUNT(*) FROM people;

-- 2. Verifique RLS
SELECT * FROM people LIMIT 5;

-- 3. Verifique policies
SELECT * FROM pg_policies WHERE tablename = 'people';

-- 4. Teste sem RLS (temporário)
ALTER TABLE people DISABLE ROW LEVEL SECURITY;
-- Teste
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
```

### Erro de Migração
**Sintomas**: "Migration failed", "Schema error"

**Soluções**:
```bash
# 1. Verifique migrações pendentes
npx supabase migration list

# 2. Aplique migrações
npx supabase db reset

# 3. Verifique schema
npx supabase db diff

# 4. Repare migração se necessário
npx supabase migration repair 20240101000000
```

## 🗺️ Mapas

### Google Maps Não Carrega
**Sintomas**: Mapa não aparece, erro de API

**Soluções**:
```bash
# 1. Verifique chave da API
echo $VITE_GOOGLE_MAPS_API_KEY

# 2. Verifique APIs ativadas
# Google Cloud Console > APIs & Services > Enabled APIs
# - Maps JavaScript API
# - Places API
# - Geocoding API

# 3. Verifique restrições
# APIs & Services > Credentials > API Key
# - Application restrictions
# - Website restrictions

# 4. Verifique quotas
# Google Cloud Console > APIs & Services > Quotas
```

### Geocodificação Falha
**Sintomas**: Endereços não são encontrados

**Soluções**:
```typescript
// 1. Verifique formato do endereço
const address = 'Rua das Flores, 123, Joinville, SC, Brasil';

// 2. Teste com endereço mais específico
const specificAddress = 'Rua das Flores, 123, Centro, Joinville, SC, 89200-000, Brasil';

// 3. Verifique logs de erro
console.error('Geocoding error:', error);

// 4. Implemente fallback
try {
  const result = await geocodeAddress(address);
} catch (error) {
  // Fallback para busca manual
  console.warn('Geocoding failed, using fallback');
}
```

### CEP Não Encontrado
**Sintomas**: ViaCEP retorna erro 404

**Soluções**:
```typescript
// 1. Verifique formato do CEP
const cep = '89200-000'; // Com hífen
const cepClean = cep.replace(/\D/g, ''); // Sem hífen

// 2. Implemente validação
const isValidCEP = /^\d{5}-?\d{3}$/.test(cep);

// 3. Implemente fallback
try {
  const result = await searchCEP(cep);
} catch (error) {
  if (error.status === 404) {
    console.warn('CEP não encontrado');
    // Permitir preenchimento manual
  }
}
```

## 📱 PWA

### App Não Instala
**Sintomas**: Botão de instalação não aparece

**Soluções**:
```bash
# 1. Verifique manifest.json
cat public/manifest.json

# 2. Verifique Service Worker
# DevTools > Application > Service Workers

# 3. Verifique HTTPS
# PWA requer HTTPS em produção

# 4. Verifique critérios PWA
# Lighthouse > PWA audit
```

### Service Worker Não Registra
**Sintomas**: "Service Worker registration failed"

**Soluções**:
```typescript
// 1. Verifique se arquivo existe
// public/sw.js deve existir

// 2. Verifique sintaxe do Service Worker
// DevTools > Sources > sw.js

// 3. Limpe cache
// DevTools > Application > Storage > Clear storage

// 4. Verifique HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  console.error('Service Worker requires HTTPS');
}
```

### Notificações Não Funcionam
**Sintomas**: Push notifications não chegam

**Soluções**:
```typescript
// 1. Verifique permissão
const permission = await Notification.requestPermission();
console.log('Permission:', permission);

// 2. Verifique VAPID key
console.log('VAPID key:', process.env.VITE_VAPID_PUBLIC_KEY);

// 3. Verifique Service Worker
navigator.serviceWorker.ready.then(registration => {
  console.log('SW ready:', registration);
});

// 4. Teste subscription
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: vapidPublicKey
});
```

## 🧪 Testes

### Testes Falham
**Sintomas**: `npm run test` retorna erros

**Soluções**:
```bash
# 1. Verifique setup
cat src/test/setup.ts

# 2. Execute testes específicos
npm run test:unit
npm run test:integration

# 3. Verifique mocks
# src/test/setup.ts deve ter todos os mocks necessários

# 4. Limpe cache
rm -rf node_modules/.vite
npm run test
```

### Coverage Baixo
**Sintomas**: Cobertura abaixo de 70%

**Soluções**:
```bash
# 1. Execute com coverage
npm run test:coverage

# 2. Verifique relatório
# coverage/index.html

# 3. Adicione testes para arquivos não cobertos
# Foque em funções críticas primeiro

# 4. Ajuste thresholds se necessário
# vitest.config.ts
```

### Testes Lentos
**Sintomas**: Testes demoram muito para executar

**Soluções**:
```bash
# 1. Execute testes em paralelo
npm run test -- --threads

# 2. Use test.only para focar
describe.only('Component', () => {
  // Apenas estes testes executarão
});

# 3. Mock dependências pesadas
vi.mock('@/services/heavy-service');

# 4. Use fake timers
vi.useFakeTimers();
```

## ⚡ Performance

### Aplicação Lenta
**Sintomas**: Carregamento lento, interface travada

**Soluções**:
```bash
# 1. Analise bundle
npm run build:analyze

# 2. Verifique imports desnecessários
# Use tree shaking

# 3. Implemente lazy loading
const Component = lazy(() => import('./Component'));

# 4. Use React.memo para componentes pesados
const HeavyComponent = memo(({ data }) => {
  // Componente otimizado
});
```

### Memory Leaks
**Sintomas**: Aplicação consome muita memória

**Soluções**:
```typescript
// 1. Limpe event listeners
useEffect(() => {
  const handleResize = () => {};
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);

// 2. Limpe timers
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  
  return () => {
    clearInterval(timer);
  };
}, []);

// 3. Limpe subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('table-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, payload => {
      // Handle change
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## 🔧 Desenvolvimento

### Hot Reload Não Funciona
**Sintomas**: Mudanças não aparecem automaticamente

**Soluções**:
```bash
# 1. Verifique se está em modo dev
npm run dev

# 2. Limpe cache
rm -rf .vite
npm run dev

# 3. Verifique arquivo de configuração
cat vite.config.ts

# 4. Reinicie servidor
Ctrl+C
npm run dev
```

### TypeScript Errors
**Sintomas**: Erros de tipo no editor

**Soluções**:
```bash
# 1. Verifique tipos
npm run typecheck

# 2. Reinicie TypeScript server
# VS Code: Ctrl+Shift+P > "TypeScript: Restart TS Server"

# 3. Verifique tsconfig.json
cat tsconfig.json

# 4. Atualize dependências
npm update @types/*
```

### Linting Errors
**Sintomas**: ESLint retorna erros

**Soluções**:
```bash
# 1. Execute linting
npm run lint

# 2. Corrija automaticamente
npm run lint -- --fix

# 3. Verifique configuração
cat .eslintrc.js

# 4. Ignore regras específicas se necessário
// eslint-disable-next-line @typescript-eslint/no-explicit-any
```

## 📞 Suporte

### Quando Pedir Ajuda

**Peça ajuda quando**:
- Tentou todas as soluções acima
- Erro não está documentado
- Problema é específico do seu ambiente
- Precisa de orientação sobre arquitetura

**Antes de pedir ajuda**:
- [ ] Verificou este guia
- [ ] Verificou issues existentes
- [ ] Coletou logs de erro
- [ ] Descreveu passos para reproduzir

### Como Pedir Ajuda

#### GitHub Issues
```markdown
## 🐛 Descrição
Descrição clara do problema.

## 🔄 Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Veja o erro

## 📱 Ambiente
- OS: Windows 10
- Navegador: Chrome 91
- Versão: 1.0.0

## 📋 Logs
```
Cole logs relevantes aqui
```

## 🔍 O que já tentei
- [ ] Verifiquei este guia
- [ ] Reiniciei o servidor
- [ ] Limpei o cache
```

#### Email de Suporte
```
Para: suporte@wiliantonezi.com.br
Assunto: [BUG/PERGUNTA] Descrição breve

Corpo:
- Descrição detalhada
- Logs de erro
- Screenshots se aplicável
- Passos para reproduzir
```

### Recursos Adicionais

#### Documentação
- [README.md](../README.md) - Visão geral
- [INSTALLATION.md](INSTALLATION.md) - Instalação
- [API.md](API.md) - Documentação da API
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribuição

#### Comunidade
- **GitHub Issues**: [Issues](https://github.com/seu-usuario/gestao-politica/issues)
- **GitHub Discussions**: [Discussions](https://github.com/seu-usuario/gestao-politica/discussions)

#### Contato Direto
- **Email**: suporte@wiliantonezi.com.br
- **WhatsApp**: [Contato](https://wa.me/5547999999999)

---

🔧 **Problema Resolvido!**

Se este guia ajudou a resolver seu problema, considere:
- ⭐ Dar uma estrela no repositório
- 📝 Documentar a solução para outros
- 🤝 Contribuir com melhorias
