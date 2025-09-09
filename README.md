# Plataforma de Gestão Política - Vereador Wilian Tonezi

Sistema de gestão política para organização de lideranças e contatos eleitorais.

## 🚀 Funcionalidades

- **Dashboard** - Visão geral das métricas da campanha
- **Pessoas** - Gestão de contatos e eleitores
- **Líderes** - Sistema de convites e gestão de lideranças (ADMIN)
- **Auditoria** - Log de ações do sistema (ADMIN)

## 🏗️ Tecnologias

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **Hospedagem**: Netlify

## ⚙️ Configuração

### 1. Banco de Dados

Execute as migrações SQL no painel do Supabase:

```sql
-- Execute os arquivos em supabase/migrations/ na ordem
```

### 2. Autenticação e Email

No painel do Supabase, configure:

**Authentication → Email**
- Habilite confirmação por email
- Configure SMTP (Gmail ou domínio próprio):
  - SMTP Host: `smtp.gmail.com`
  - SMTP Port: `587`
  - SMTP User: `seu-email@gmail.com`
  - SMTP Pass: `sua-senha-de-app`

### 3. Edge Functions

**Criar função `invite_leader`:**

1. No painel Supabase → Edge Functions
2. Criar nova função: `invite_leader`
3. Copiar código de `supabase/functions/invite_leader/index.ts`
4. Configurar variáveis de ambiente:
   - `SUPABASE_URL`: URL do seu projeto
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave service_role (Settings → API)
   - `SUPABASE_ANON_KEY`: Chave anon/public

### 4. Variáveis de Ambiente

Criar arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

## 🔐 Permissões

### Roles do Sistema

- **ADMIN**: Acesso total (dashboard, pessoas, líderes, auditoria)
- **LEADER**: Acesso limitado (dashboard, suas próprias pessoas)

### Promover usuário para ADMIN

```sql
UPDATE profiles 
SET role = 'ADMIN' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu-email@gmail.com');
```

## 📧 Fluxo de Convite de Líderes

1. **ADMIN** acessa `/lideres/novo`
2. Preenche dados do líder e envia
3. Sistema cria usuário no Auth
4. Grava dados em `profiles` e `leader_profiles`
5. Gera token de convite em `invite_tokens`
6. Envia email com link `/convite/{token}`
7. Líder acessa link, define senha e faz login

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📊 Estrutura do Banco

### Tabelas Principais

- `profiles` - Perfis de usuário (ADMIN/LEADER)
- `people` - Contatos/eleitores
- `leader_profiles` - Dados estendidos dos líderes
- `invite_tokens` - Tokens de convite
- `audit_logs` - Log de auditoria
- `org_settings` - Configurações gerais

### RLS (Row Level Security)

- **LEADER**: Vê apenas seus próprios dados
- **ADMIN**: Vê todos os dados do sistema

## 🚀 Deploy

O projeto está configurado para deploy automático no Netlify através do arquivo `netlify.toml`.

## 📞 Suporte

**Responsável pelo Sistema:**
- **Nome**: Adilson Martins
- **CPF**: 479.975.834-47

Para dúvidas ou problemas, entre em contato com o administrador do sistema.

## Última Atualização
- Sistema de filtros por eleição corrigido (Municipal/Estadual/Federal)
- Auto-filtro aplicado em Pessoas e Mapa
- Meta Cidade disponível apenas em eleições estaduais