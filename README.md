# 🏛️ Sistema de Gestão Política

Sistema completo para gestão de campanhas políticas, desenvolvido com React, TypeScript e Supabase.

## 🚀 Funcionalidades

### 📊 Dashboard
- **Visão geral** com estatísticas em tempo real
- **Contadores** de líderes ativos, pessoas cadastradas e votos confirmados
- **Metas e projeções** por líder e região
- **Contagem regressiva** para eleições
- **Cards de aniversariantes** do dia

### 👥 Gestão de Pessoas
- **Cadastro completo** com validação de nome completo obrigatório
- **Busca avançada** por nome, cidade, bairro, líder responsável
- **Filtros múltiplos** e ordenação personalizada
- **Sistema de tags** para categorização
- **Status de voto** (Confirmado, Provável, Improvável, Não vai votar)
- **Histórico de contatos** e anotações
- **Integração com WhatsApp** e redes sociais
- **Geolocalização** com Google Maps

### 🎯 Gestão de Líderes
- **Sistema de convites** por email
- **Perfis completos** com dados pessoais e de contato
- **Metas individuais** por líder
- **Sistema de lideranças** (quem lidera quem)
- **Status de ativação** (Ativo/Inativo)
- **Auditoria** de ações

### 🗺️ Mapa Interativo
- **Visualização geográfica** de todos os contatos
- **Clusters inteligentes** para melhor performance
- **Filtros por região** e status
- **Integração com Google Maps**
- **Busca por endereço** com autocomplete

### 📈 Projeções e Metas
- **Metas por cidade** e bairro
- **Projeções de votos** baseadas em dados históricos
- **Acompanhamento de progresso** em tempo real
- **Relatórios detalhados** por região

### 🏷️ Sistema de Tags
- **Categorização flexível** de pessoas
- **Filtros por tags** (qualquer/ todas)
- **Gestão centralizada** de tags
- **Aplicação em massa**

### ⚙️ Administração
- **Controle de acesso** por roles (ADMIN/LEADER)
- **Configurações de eleição** (data, tipo, filtros)
- **Auditoria completa** de ações
- **Backup e sincronização** de dados

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **React Hook Form** + **Zod** para validação
- **React Router** para navegação
- **TanStack Query** para gerenciamento de estado
- **Google Maps API** para mapas
- **Lucide React** para ícones

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **Row Level Security (RLS)** para segurança
- **Edge Functions** para lógica de negócio
- **Real-time subscriptions** para atualizações

### Validação e Segurança
- **Zod** para validação de schemas
- **React Hook Form** para formulários
- **Validação em 3 camadas**: Frontend, Backend e Database
- **Autenticação JWT** com Supabase Auth
- **Controle de acesso** baseado em roles

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase
- Chave da API do Google Maps

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/adilsoncorretor85/gestaopolitica.git
cd gestaopolitica
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_GOOGLE_MAPS_API_KEY=sua_chave_do_google_maps
```

4. **Configure o banco de dados**
- Execute o SQL do arquivo `docs/db-setup.md` no Supabase SQL Editor
- Configure as Edge Functions no painel do Supabase

5. **Execute o projeto**
```bash
npm run dev
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── modals/         # Modais do sistema
│   ├── drawers/        # Drawers laterais
│   └── ...
├── contexts/           # Contextos React
├── hooks/              # Hooks customizados
├── lib/                # Utilitários e configurações
├── pages/              # Páginas da aplicação
├── services/           # Serviços de API
├── types/              # Definições TypeScript
└── utils/              # Funções utilitárias
```

## 🔐 Sistema de Autenticação

### Roles
- **ADMIN**: Acesso total ao sistema
- **LEADER**: Acesso limitado aos próprios dados

### Fluxo de Convite
1. ADMIN convida líder via email
2. Líder recebe link de convite
3. Líder define senha e ativa conta
4. Sistema cria perfil automaticamente

## 📊 Validações Implementadas

### Nome Completo (Obrigatório)
- **Mínimo 3 caracteres**
- **Pelo menos 2 palavras** (nome e sobrenome)
- **Validação em 3 camadas**:
  - Frontend: Zod + React Hook Form
  - Backend: Validação nos serviços
  - Database: Constraint no PostgreSQL

### Mensagens de Erro Específicas
- "Nome é obrigatório"
- "Nome deve ter pelo menos 3 caracteres"
- "Informe o nome completo (nome e sobrenome)"

## 🗄️ Banco de Dados

### Tabelas Principais
- **profiles**: Perfis de usuário
- **people**: Contatos cadastrados
- **leader_profiles**: Dados dos líderes
- **invite_tokens**: Tokens de convite
- **audit_logs**: Log de auditoria
- **org_settings**: Configurações gerais
- **leader_targets**: Metas por líder

### Segurança
- **Row Level Security (RLS)** ativado
- **Políticas de acesso** por role
- **Auditoria** de todas as ações

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Verificação de tipos
npm run typecheck

# Linting
npm run lint

# Sincronização com Supabase
npm run sync:data
```

## 📱 Responsividade

O sistema é totalmente responsivo e funciona em:
- 📱 **Mobile** (320px+)
- 📱 **Tablet** (768px+)
- 💻 **Desktop** (1024px+)

## 🔧 Configurações Avançadas

### Google Maps
- Configuração de clusters
- Autocomplete de endereços
- Geolocalização automática
- Integração com ViaCEP

### Supabase
- Edge Functions para lógica complexa
- Real-time subscriptions
- Backup automático
- Migrations versionadas

## 📈 Performance

- **Lazy loading** de componentes
- **Virtualização** de listas grandes
- **Debounce** em buscas
- **Cache** com TanStack Query
- **Otimização** de imagens e assets

## 🛡️ Segurança

- **Autenticação JWT** com Supabase
- **Controle de acesso** granular
- **Validação** em múltiplas camadas
- **Sanitização** de inputs
- **Auditoria** completa de ações

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- 📧 Email: [seu-email@exemplo.com]
- 🐛 Issues: [GitHub Issues](https://github.com/adilsoncorretor85/gestaopolitica/issues)

---

**Desenvolvido com ❤️ para campanhas políticas eficientes**