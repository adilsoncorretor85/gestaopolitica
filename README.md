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
- 📧 Email: contato@wiliantonezi.com.br
- 🌐 Website: [wiliantonezi.com.br](https://wiliantonezi.com.br)
- 📱 WhatsApp: [Contato](https://wa.me/5547999999999)

---

<div align="center">

**⭐ Se este projeto foi útil, considere dar uma estrela! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/seu-usuario/gestao-politica?style=social)](https://github.com/seu-usuario/gestao-politica)

</div>