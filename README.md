# 🏛️ Gestão Política - Sistema de Campanha Eleitoral

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> Sistema completo para gestão de campanhas políticas do **Vereador Wilian Tonezi - PL**

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [✨ Funcionalidades](#-funcionalidades)
- [🛠️ Tecnologias](#️-tecnologias)
- [🚀 Instalação](#-instalação)
- [⚙️ Configuração](#️-configuração)
- [📱 PWA](#-pwa)
- [🧪 Testes](#-testes)
- [📚 Documentação](#-documentação)
- [🤝 Contribuição](#-contribuição)
- [📄 Licença](#-licença)

## 🎯 Visão Geral

O **Sistema de Gestão Política** é uma aplicação web moderna e responsiva desenvolvida para gerenciar campanhas eleitorais de forma eficiente e organizada. O sistema oferece funcionalidades completas para:

- 👥 **Gestão de Contatos**: Cadastro e organização de eleitores
- 🗺️ **Mapeamento Geográfico**: Visualização de contatos em mapa
- 📊 **Análise de Dados**: Estatísticas e projeções eleitorais
- 🏷️ **Sistema de Tags**: Categorização e segmentação
- 📱 **PWA**: Funciona offline e pode ser instalado como app

## ✨ Funcionalidades

### 🏠 Dashboard
- **Visão Geral**: Estatísticas em tempo real da campanha
- **Metas**: Acompanhamento de objetivos eleitorais
- **Aniversariantes**: Lista de pessoas com aniversário
- **Contagem Regressiva**: Tempo restante para as eleições

### 👥 Gestão de Pessoas
- **Cadastro Completo**: Dados pessoais, contato e endereço
- **Validação Inteligente**: Verificação de duplicidade de WhatsApp
- **Busca Avançada**: Filtros por localização, tags e status
- **Importação/Exportação**: Dados em CSV

### 🗺️ Mapa Interativo
- **Visualização Geográfica**: Contatos plotados no mapa
- **Clusters Inteligentes**: Agrupamento por proximidade
- **Filtros Dinâmicos**: Por bairro, cidade e tags
- **Geolocalização**: Busca por CEP e coordenadas

### 🏷️ Sistema de Tags
- **Categorização**: Organização por segmentos
- **Cores Personalizadas**: Identificação visual
- **Filtros**: Busca por tags específicas
- **Estatísticas**: Contagem por categoria

### 👑 Gestão de Líderes
- **Hierarquia**: Estrutura organizacional
- **Metas Individuais**: Objetivos por líder
- **Relatórios**: Performance e resultados
- **Convites**: Sistema de convite para novos líderes

### 📊 Projeções Eleitorais
- **Análise de Dados**: Tendências e padrões
- **Relatórios**: Estatísticas detalhadas
- **Exportação**: Dados para análise externa

## 🛠️ Tecnologias

### Frontend
- **React 18** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework CSS
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas
- **React Router** - Roteamento
- **Framer Motion** - Animações

### Backend & Database
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Row Level Security (RLS)** - Segurança de dados
- **Real-time** - Atualizações em tempo real

### APIs & Integrações
- **Google Maps API** - Mapas e geolocalização
- **ViaCEP** - Busca de endereços por CEP
- **WhatsApp API** - Integração de mensagens

### Ferramentas de Desenvolvimento
- **Vitest** - Framework de testes
- **Testing Library** - Testes de componentes
- **ESLint** - Linting de código
- **Prettier** - Formatação de código

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Chave da API do Google Maps

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/gestao-politica.git
cd gestao-politica
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_GOOGLE_MAPS_API_KEY=sua_chave_do_google_maps
VITE_DEBUG=false
```

### 4. Execute o projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## ⚙️ Configuração

### Supabase Setup

1. **Crie um projeto no Supabase**
2. **Execute as migrações**:
   ```bash
   npm run supabase:setup
   ```
3. **Configure RLS policies**
4. **Execute seed data** (opcional)

### Google Maps Setup

1. **Ative a Google Maps API**
2. **Configure domínios permitidos**
3. **Adicione a chave no .env**

### Edge Functions Setup

As Edge Functions agora suportam CORS dinâmico baseado em variáveis de ambiente:

#### Variáveis de Ambiente (Edge Functions)

```bash
# CORS - URLs permitidas (separadas por vírgula)
ALLOWED_ORIGINS=https://app.gabitechnology.cloud,http://localhost:5173,http://127.0.0.1:5173

# URL padrão para fallback
DEFAULT_ORIGIN=https://app.gabitechnology.cloud
```

#### Configuração no Supabase

1. **Acesse o Dashboard do Supabase**
2. **Vá para Edge Functions → Settings**
3. **Adicione as variáveis de ambiente**:
   - `ALLOWED_ORIGINS`: Lista de URLs permitidas
   - `DEFAULT_ORIGIN`: URL padrão para fallback

#### Exemplo de Configuração

```bash
# Para desenvolvimento local
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEFAULT_ORIGIN=http://localhost:5173

# Para produção
ALLOWED_ORIGINS=https://app.gabitechnology.cloud,https://gestaopolitica.com.br
DEFAULT_ORIGIN=https://app.gabitechnology.cloud
```

### Monitoramento e Healthcheck

O sistema inclui endpoints de monitoramento para verificar a saúde das Edge Functions:

#### Endpoints Disponíveis

- **`/functions/v1/ping`** - Ping simples para verificar se a função está respondendo
- **`/functions/v1/health`** - Healthcheck completo com status de serviços
- **`/functions/v1/status`** - Status de todas as Edge Functions

#### Exemplo de Uso

```bash
# Ping simples
curl https://seu-projeto.supabase.co/functions/v1/ping

# Healthcheck completo
curl https://seu-projeto.supabase.co/functions/v1/health

# Status de todas as funções
curl https://seu-projeto.supabase.co/functions/v1/status
```

#### Resposta do Healthcheck

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "up",
    "auth": "up",
    "storage": "up"
  },
  "uptime": 1234567,
  "memory": {
    "used": 45,
    "total": 128,
    "percentage": 35
  },
  "responseTime": 150
}
```

### Rate Limiting

O sistema inclui proteção contra spam e ataques de força bruta através de rate limiting:

#### Configurações de Rate Limiting

- **Geral**: 100 requests por 15 minutos
- **Convites**: 10 requests por hora (por IP)
- **Admin**: 50 requests por 5 minutos (por token + IP)
- **Ban/Unban**: 5 requests por hora (por token + IP)

#### Headers de Rate Limiting

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
Retry-After: 300
```

#### Resposta de Rate Limit Excedido

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 300,
  "resetTime": "2024-01-15T11:00:00.000Z"
}
```

### Sistema de Auditoria

O sistema inclui um sistema de auditoria aprimorado para monitoramento e rastreamento de atividades:

#### Endpoint de Logs de Auditoria

- **`/functions/v1/audit-logs`** - Visualizar logs de auditoria (apenas admin)

#### Exemplo de Uso

```bash
# Obter logs recentes
curl -H "Authorization: Bearer <token>" \
  https://seu-projeto.supabase.co/functions/v1/audit-logs

# Filtrar por severidade
curl -H "Authorization: Bearer <token>" \
  "https://seu-projeto.supabase.co/functions/v1/audit-logs?severity=error"

# Filtrar por função
curl -H "Authorization: Bearer <token>" \
  "https://seu-projeto.supabase.co/functions/v1/audit-logs?function=invite_leader"
```

#### Estrutura dos Logs

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "req_1642248000_abc123",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "function": "invite_leader",
        "action": "invite_leader",
        "userId": "user-uuid",
        "userEmail": "admin@example.com",
        "userRole": "ADMIN",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "requestId": "req_1642248000_abc123",
        "method": "POST",
        "endpoint": "/functions/v1/invite_leader",
        "statusCode": 200,
        "responseTime": 150,
        "metadata": {
          "status": "NEW_USER",
          "targetEmail": "leader@example.com",
          "targetName": "João Silva"
        },
        "severity": "info"
      }
    ],
    "stats": {
      "totalLogs": 1250,
      "bySeverity": {
        "info": 1000,
        "warn": 200,
        "error": 45,
        "critical": 5
      },
      "byFunction": {
        "invite_leader": 500,
        "admin_ban_user": 100,
        "leader_actions": 300
      },
      "averageResponseTime": 120,
      "errorRate": 4
    }
  }
}
```

#### Níveis de Severidade

- **info**: Operações normais e bem-sucedidas
- **warn**: Situações que requerem atenção
- **error**: Erros que não impedem o funcionamento
- **critical**: Erros críticos que afetam o sistema

### Estrutura do Banco

```sql
-- Principais tabelas
people          -- Cadastro de pessoas
leaders         -- Líderes da campanha
tags            -- Sistema de tags
election_settings -- Configurações da eleição
```

## 📱 PWA

O sistema é uma **Progressive Web App** completa:

### ✅ Funcionalidades PWA
- **Instalação**: Pode ser instalado como app nativo
- **Offline**: Funciona sem conexão com cache inteligente
- **Notificações**: Push notifications para engajamento
- **Sincronização**: Dados sincronizados automaticamente
- **Performance**: Carregamento instantâneo

### 📲 Como Instalar
1. Acesse o sistema no navegador
2. Clique no ícone de instalação
3. Confirme a instalação
4. O app aparecerá na tela inicial

## 🧪 Testes

### Executar Testes
```bash
# Todos os testes
npm run test

# Modo watch
npm run test:watch

# Com coverage
npm run test:coverage

# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration
```

### Cobertura de Testes
- **Threshold**: 70% mínimo
- **Tipos**: Unitários, integração e E2E
- **Ferramentas**: Vitest + Testing Library

## 📚 Documentação

### 📖 Guias Disponíveis
- [Guia de Instalação](docs/INSTALLATION.md)
- [Configuração do Supabase](docs/SUPABASE_SETUP.md)
- [API Reference](docs/API.md)
- [Guia de Contribuição](docs/CONTRIBUTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

### 🏗️ Arquitetura
```
src/
├── components/     # Componentes React
├── pages/         # Páginas da aplicação
├── hooks/         # Custom hooks
├── services/      # Serviços e APIs
├── types/         # Definições TypeScript
├── lib/           # Utilitários
├── test/          # Testes
└── styles/        # Estilos CSS
```

### 🔧 Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run typecheck    # Verificação TypeScript
npm run lint         # Linting
npm run test         # Testes
npm run test:coverage # Testes com coverage
```

## 🤝 Contribuição

### Como Contribuir
1. **Fork** o projeto
2. **Crie** uma branch para sua feature
3. **Commit** suas mudanças
4. **Push** para a branch
5. **Abra** um Pull Request

### Padrões de Código
- **TypeScript** para tipagem
- **ESLint** para qualidade
- **Prettier** para formatação
- **Conventional Commits** para mensagens

### Estrutura de Commits
```
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
style: formatação de código
refactor: refatoração
test: adiciona testes
chore: tarefas de manutenção
```

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvido por

**Vereador Wilian Tonezi - PL**
- 📧 Email: tonezivereador@gmail.com
- 🌐 Website: [tonezi.com.br](https://tonezi.com.br)
- 📱 WhatsApp: [Contato](https://wa.me/554797238106)

---

<div align="center">

**⭐ Se este projeto foi útil, considere dar uma estrela! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/seu-usuario/gestao-politica?style=social)](https://github.com/seu-usuario/gestao-politica)

</div>