# 📦 Guia de Instalação

Este guia fornece instruções detalhadas para instalar e configurar o Sistema de Gestão Política.

## 📋 Pré-requisitos

### Sistema Operacional
- **Windows 10/11** (recomendado)
- **macOS 10.15+**
- **Linux Ubuntu 18.04+**

### Software Necessário
- **Node.js 18.0+** - [Download](https://nodejs.org/)
- **npm 8.0+** ou **yarn 1.22+**
- **Git** - [Download](https://git-scm.com/)

### Contas e Serviços
- **Conta no Supabase** - [Criar conta](https://supabase.com/)
- **Google Cloud Platform** - [Ativar APIs](https://console.cloud.google.com/)
- **Conta no GitHub** (opcional, para contribuições)

## 🚀 Instalação Passo a Passo

### 1. Clone do Repositório

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/gestao-politica.git

# Entre no diretório
cd gestao-politica

# Verifique se está na branch correta
git branch
```

### 2. Instalação de Dependências

```bash
# Instale as dependências
npm install

# Ou usando yarn
yarn install
```

**Dependências principais instaladas:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Supabase Client
- React Hook Form + Zod
- Framer Motion
- Vitest (testes)

### 3. Configuração do Ambiente

#### 3.1 Arquivo de Variáveis
```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

#### 3.2 Configure as Variáveis
Edite o arquivo `.env` com suas credenciais:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=sua_chave_do_google_maps

# Environment
VITE_DEBUG=false
VITE_VAPID_PUBLIC_KEY=sua_chave_vapid_para_pwa

# Development
DEV=true
PROD=false
```

### 4. Configuração do Supabase

#### 4.1 Criar Projeto
1. Acesse [Supabase Dashboard](https://app.supabase.com/)
2. Clique em "New Project"
3. Escolha organização e nome do projeto
4. Defina senha do banco de dados
5. Escolha região (recomendado: São Paulo)

#### 4.2 Configurar Banco de Dados
```bash
# Execute o script de setup
npm run supabase:setup
```

Este script irá:
- Criar as tabelas necessárias
- Configurar RLS policies
- Inserir dados iniciais
- Configurar triggers e funções

#### 4.3 Verificar Configuração
```bash
# Verifique o status
npm run supabase:status
```

### 5. Configuração do Google Maps

#### 5.1 Ativar APIs
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative as seguintes APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**

#### 5.2 Criar Chave de API
1. Vá para "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "API Key"
3. Configure restrições:
   - **Application restrictions**: HTTP referrers
   - **Website restrictions**: Adicione seu domínio
4. Copie a chave para o arquivo `.env`

### 6. Executar o Projeto

```bash
# Modo desenvolvimento
npm run dev

# O projeto estará disponível em:
# http://localhost:5173
```

### 7. Verificação da Instalação

#### 7.1 Testes Básicos
```bash
# Execute os testes
npm run test

# Verifique TypeScript
npm run typecheck

# Verifique linting
npm run lint
```

#### 7.2 Teste de Funcionalidades
1. **Login**: Acesse `/login` e teste autenticação
2. **Dashboard**: Verifique se carrega estatísticas
3. **Pessoas**: Teste cadastro de nova pessoa
4. **Mapa**: Verifique se carrega o mapa
5. **PWA**: Teste instalação do app

## 🔧 Configurações Avançadas

### Desenvolvimento Local com Supabase

```bash
# Instalar Supabase CLI
npm run supabase:install

# Iniciar Supabase local
npx supabase start

# Aplicar migrações
npx supabase db reset

# Parar Supabase local
npx supabase stop
```

### Configuração de Proxy (Opcional)

Se precisar de proxy para desenvolvimento:

```bash
# Instalar proxy
npm install -g http-proxy-middleware

# Configurar proxy no vite.config.ts
```

### Configuração de SSL (Produção)

```bash
# Gerar certificado SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configurar HTTPS no vite.config.ts
```

## 🐛 Troubleshooting

### Problemas Comuns

#### Erro: "Cannot find module"
```bash
# Limpe o cache e reinstale
rm -rf node_modules package-lock.json
npm install
```

#### Erro: "Supabase connection failed"
1. Verifique as credenciais no `.env`
2. Confirme se o projeto está ativo
3. Verifique se as APIs estão habilitadas

#### Erro: "Google Maps not loading"
1. Verifique a chave da API
2. Confirme se as APIs estão ativadas
3. Verifique restrições de domínio

#### Erro: "TypeScript errors"
```bash
# Verifique tipos
npm run typecheck

# Atualize dependências
npm update
```

### Logs de Debug

```bash
# Ativar logs detalhados
VITE_DEBUG=true npm run dev

# Ver logs do Supabase
npx supabase logs
```

### Limpeza Completa

```bash
# Remover tudo e reinstalar
rm -rf node_modules package-lock.json .env
npm install
cp .env.example .env
# Reconfigure o .env
```

## 📱 Configuração PWA

### Service Worker
O Service Worker é configurado automaticamente. Para testar:

1. Abra DevTools > Application > Service Workers
2. Verifique se está registrado
3. Teste funcionalidade offline

### Manifest
O arquivo `manifest.json` está configurado. Para personalizar:

1. Edite `public/manifest.json`
2. Adicione seus ícones
3. Configure shortcuts e screenshots

## 🔒 Segurança

### Variáveis de Ambiente
- **NUNCA** commite o arquivo `.env`
- Use `.env.example` como template
- Rotacione chaves regularmente

### Supabase RLS
- Todas as tabelas têm RLS ativado
- Policies configuradas por usuário
- Dados isolados por organização

### Google Maps
- Configure restrições de domínio
- Monitore uso da API
- Configure quotas adequadas

## 📊 Monitoramento

### Performance
```bash
# Analisar bundle
npm run build:analyze

# Verificar tamanho
npm run build && ls -la dist/
```

### Logs
```bash
# Logs de desenvolvimento
npm run dev 2>&1 | tee dev.log

# Logs de produção
npm run build && npm run preview
```

## 🆘 Suporte

### Documentação
- [README.md](../README.md) - Visão geral
- [API.md](API.md) - Documentação da API
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solução de problemas

### Comunidade
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/gestao-politica/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seu-usuario/gestao-politica/discussions)

### Contato
- **Email**: suporte@wiliantonezi.com.br
- **WhatsApp**: [Contato](https://wa.me/5547999999999)

---

✅ **Instalação Concluída!** 

Agora você pode começar a usar o Sistema de Gestão Política. Consulte a [documentação da API](API.md) para entender como usar as funcionalidades.
