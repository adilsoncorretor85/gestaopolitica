# Agenda e Integração com Google Calendar

## Visão Geral
Integração da Agenda com Google Calendar usando Supabase (Postgres + Edge Functions) e React.

## 📋 Índice
1. [Variáveis de Ambiente](#variáveis-de-ambiente)
2. [Banco de Dados](#banco-de-dados)
3. [Edge Functions](#edge-functions)
4. [Frontend](#frontend)
5. [Observações Importantes](#observações-importantes)
6. [Testes](#testes)

---

## Variáveis de Ambiente

### Configuração em `supabase/config.toml`

```toml
[edge_runtime.secrets]
SITE_URL = "http://localhost:5173"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
GOOGLE_CLIENT_ID = "your-google-client-id"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"
GCAL_REDIRECT_URI = "http://127.0.0.1:54321/functions/v1/gcal_callback"
```

**⚠️ IMPORTANTE:** Após alterar essas variáveis, reinicie o Supabase local:
```bash
npx supabase stop
npx supabase start
```

---

## Banco de Dados

### Arquivo: `supabase/migrations/20251014_gcal.sql`

### 1. Função Helper para verificar ADMIN

```sql
create or replace function public.app_is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = uid and p.role = 'ADMIN'
  );
$$;
```

### 2. Tabela `gcal_accounts` (Singleton - apenas 1 conta)

```sql
create table if not exists public.gcal_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  google_user_id text not null,
  email text not null,
  access_token text not null,
  refresh_token text not null,
  scope text,
  token_type text,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Garante que só exista 1 linha
create unique index if not exists gcal_singleton on public.gcal_accounts ((true));
```

### 3. Tabela `gcal_events` (Cache local de eventos)

```sql
create table if not exists public.gcal_events (
  id uuid primary key default gen_random_uuid(),
  google_event_id text not null,
  title text not null,
  description text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_all_day boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists gcal_events_google_id_idx 
  on public.gcal_events(google_event_id);
```

### 4. Trigger `updated_at`

```sql
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_gcal_accounts_touch 
  before update on public.gcal_accounts 
  for each row execute function public.touch_updated_at();

create trigger trg_gcal_events_touch 
  before update on public.gcal_events 
  for each row execute function public.touch_updated_at();
```

### 5. Row Level Security (RLS)

```sql
alter table public.gcal_accounts enable row level security;
alter table public.gcal_events enable row level security;
```

### 6. Policies

#### Policies para `gcal_accounts` (somente ADMIN):

```sql
-- SELECT
create policy gcal_accounts_select_admin 
  on public.gcal_accounts for select 
  to authenticated 
  using (public.app_is_admin(auth.uid()));

-- INSERT/UPDATE/DELETE
create policy gcal_accounts_admin_write 
  on public.gcal_accounts for all 
  to authenticated 
  using (public.app_is_admin(auth.uid())) 
  with check (public.app_is_admin(auth.uid()));
```

#### Policies para `gcal_events`:

```sql
-- SELECT (ADMIN e LEADER podem ler)
-- ⚠️ IMPORTANTE: Usa app_leaders_list (view que inclui leader_profiles)
create policy gcal_events_read_leader_or_admin 
  on public.gcal_events for select 
  to authenticated 
  using (
    -- ADMIN via profiles.role
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() 
      and p.role = 'ADMIN'
    )
    OR
    -- LEADER via app_leaders_list (view com leader_profiles)
    exists (
      select 1 from public.app_leaders_list l
      where l.id = auth.uid()
      and l.status = 'ACTIVE'
    )
  );

-- INSERT/UPDATE/DELETE (somente ADMIN)
create policy gcal_events_admin_write 
  on public.gcal_events for all 
  to authenticated 
  using (public.app_is_admin(auth.uid())) 
  with check (public.app_is_admin(auth.uid()));
```

---

## Edge Functions

### 1. `gcal_begin` - Iniciar OAuth

**Arquivo:** `supabase/functions/gcal_begin/index.ts`

**Responsabilidade:** Verificar se o usuário é ADMIN e gerar a URL de consentimento do Google.

**Variáveis usadas:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` (para verificar role sem RLS)
- `SITE_URL`
- `GOOGLE_CLIENT_ID`
- `GCAL_REDIRECT_URI`

**Fluxo:**
1. Verifica autenticação do usuário (via ANON_KEY)
2. Verifica se é ADMIN (via SERVICE_ROLE_KEY ignorando RLS)
3. Monta URL do Google OAuth com scopes: `openid`, `email`, `profile`, `calendar`
4. Retorna `{ authUrl: "..." }`

**Principais trechos:**

```typescript
const service = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const redirectUri = Deno.env.get('GCAL_REDIRECT_URI') ?? ''

// Dois clientes Supabase:
const caller = createClient(url, anon, { /* com auth header */ })
const admin = createClient(url, service) // ignora RLS

// Verificar role
const { data: prof } = await admin
  .from('profiles')
  .select('role')
  .eq('id', me.user.id)
  .single()
  
if (prof?.role !== 'ADMIN') {
  return new Response(JSON.stringify({ error: 'Forbidden - Admin required' }), { status: 403 })
}

// Montar URL OAuth
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
authUrl.searchParams.set('client_id', clientId)
authUrl.searchParams.set('redirect_uri', redirectUri)
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', scopes)
authUrl.searchParams.set('access_type', 'offline')
authUrl.searchParams.set('prompt', 'consent')
authUrl.searchParams.set('state', me.user.id) // UUID do usuário
```

---

### 2. `gcal_callback` - Troca código por tokens

**Arquivo:** `supabase/functions/gcal_callback/index.ts`

**Responsabilidade:** Receber o `code` do Google, trocar por tokens e salvar no banco.

**Variáveis usadas:**
- `SERVICE_ROLE_KEY` (para gravar sem RLS)
- `SUPABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SITE_URL`

**Fluxo:**
1. Recebe `?code=...&state=...` (state = user_id)
2. Troca `code` por `access_token` e `refresh_token` com Google
3. Busca informações do usuário Google (`/oauth2/v2/userinfo`)
4. Salva tokens em `gcal_accounts` (usando SERVICE_ROLE_KEY)
5. Redireciona para `SITE_URL/agenda?connected=true`

**Principais trechos:**

```typescript
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  serviceRoleKey!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Trocar code por tokens
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: 'http://127.0.0.1:54321/functions/v1/gcal_callback',
  }),
})

const tokens = await tokenResponse.json()

// Buscar info do usuário Google
const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
  headers: { Authorization: `Bearer ${tokens.access_token}` }
})
const userInfo = await userResponse.json()

// ⚠️ IMPORTANTE: Nomes das colunas devem bater com o schema
// Salvar no banco (upsert na linha única - singleton)
await supabaseClient.from('gcal_accounts').upsert({
  owner_profile_id: state,              // UUID do usuário (state)
  google_user_id: userInfo.sub ?? '',   // ID do usuário no Google
  email: userInfo.email,
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  scope: tokens.scope ?? null,
  token_type: tokens.token_type ?? null,
  expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
})
```

---

### 3. `gcal_sync` - Sincronizar eventos

**Arquivo:** `supabase/functions/gcal_sync/index.ts`

**Responsabilidade:** Buscar eventos do Google Calendar e popular `gcal_events`.

**Fluxo:**
1. Verifica se usuário é ADMIN
2. Busca conta Google em `gcal_accounts`
3. Se token expirado, usa `refresh_token` para renovar
4. Faz GET em `https://www.googleapis.com/calendar/v3/calendars/primary/events`
5. Limpa `gcal_events` e insere novos eventos
6. Retorna `{ ok: true, count: X }`

---

### 4. `gcal_revoke` - Revogar e limpar

**Arquivo:** `supabase/functions/gcal_revoke/index.ts`

**Responsabilidade:** Desconectar conta Google e limpar dados locais.

**Fluxo:**
1. Verifica se usuário é ADMIN
2. Revoga token no Google (`https://oauth2.googleapis.com/revoke`)
3. Deleta registro de `gcal_accounts`
4. Deleta todos registros de `gcal_events`
5. Retorna `{ ok: true }`

---

## Frontend

### 1. Página Agenda

**Arquivo:** `src/pages/Agenda.tsx`

**Permissões:**
- **ADMIN**: pode Conectar, Sincronizar e Desconectar
- **LEADER**: pode apenas visualizar eventos
- **USER**: sem acesso

**Ações disponíveis:**
- `handleConnect()`: chama `gcalBegin()` e redireciona para Google
- `handleSync()`: chama `gcalSync()` e recarrega eventos
- `handleRevoke()`: chama `gcalRevoke()` e limpa estado local

---

### 2. Serviço de Agenda

**Arquivo:** `src/services/gcal.ts`

```typescript
export async function gcalBegin(): Promise<{ authUrl: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('gcal_begin', { method: 'GET' });
  if (error) throw error;
  return data;
}

export async function gcalSync(): Promise<{ ok: boolean; count?: number }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('gcal_sync', { method: 'POST' });
  if (error) throw error;
  return data;
}

export async function gcalRevoke(): Promise<{ ok: boolean }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('gcal_revoke', { method: 'POST' });
  if (error) throw error;
  return data;
}

export async function listCachedEvents(): Promise<GcalEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('gcal_events')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data as GcalEvent[];
}

export async function getGcalAccountStatus(): Promise<{ connected: boolean; email?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('gcal_accounts')
    .select('email')
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  return { connected: !!data, email: data?.email };
}
```

---

### 3. Regras de Role

**Arquivo:** `src/lib/role.ts`

```typescript
export type UserRole = 'ADMIN' | 'LEADER' | 'USER';

export const canViewCalendar = (role?: UserRole) =>
  role === 'ADMIN' || role === 'LEADER';

export const canEditCalendar = (role?: UserRole) =>
  role === 'ADMIN';

export const canConnectCalendar = (role?: UserRole) =>
  role === 'ADMIN';
```

---

## Observações Importantes

### ✅ Configuração Google Cloud Console

1. Acessar [Google Cloud Console](https://console.cloud.google.com/)
2. Criar/selecionar projeto
3. Habilitar **Google Calendar API**
4. Criar credenciais OAuth 2.0
5. **URI de redirecionamento autorizado:**
   ```
   http://127.0.0.1:54321/functions/v1/gcal_callback
   ```
6. Copiar Client ID e Client Secret
7. Adicionar em `supabase/config.toml` na seção `[edge_runtime.secrets]`

### 🔄 Reiniciar Supabase após mudanças

Sempre que alterar as variáveis em `config.toml`:

```bash
cd "E:\Programas em desevolvimento\gestaopolitica"
npx supabase stop
npx supabase start
```

### 🔐 Segurança

- **Singleton**: `gcal_accounts` tem constraint único - apenas 1 conta conectada
- **RLS**: Somente ADMIN acessa `gcal_accounts`; LEADER pode ler `gcal_events`
- **SERVICE_ROLE_KEY**: Usado nas Edge Functions para ignorar RLS quando necessário

### 🐛 Problemas Comuns

#### Erro: "Missing authorization header"
**Causa:** `SERVICE_ROLE_KEY` não está sendo lida corretamente.
**Solução:** Verificar `supabase/config.toml` e reiniciar Supabase.

#### Erro: "redirect_uri_mismatch"
**Causa:** URI de callback não corresponde ao configurado no Google.
**Solução:** Garantir que no Google Cloud Console está: `http://127.0.0.1:54321/functions/v1/gcal_callback`

---

## Testes

### 1. Teste de Conexão (ADMIN)

1. Fazer login como ADMIN (`admin@teste.com` ou `gestor@teste.com`)
2. Navegar para `/agenda`
3. Clicar em **"Conectar Google Calendar"**
4. Completar fluxo OAuth no Google
5. Verificar redirecionamento para `/agenda?connected=true`
6. Verificar mensagem: "Agenda conectada com: [email]"

### 2. Teste de Sincronização (ADMIN)

1. Com conta conectada, clicar em **"Sincronizar"**
2. Aguardar mensagem de sucesso
3. Verificar que eventos aparecem na lista

### 3. Teste de Visualização (LEADER)

1. Fazer login como LEADER
2. Navegar para `/agenda`
3. Verificar que **não** aparece botão "Conectar"
4. Verificar que eventos sincronizados aparecem

### 4. Teste de Desconexão (ADMIN)

1. Fazer login como ADMIN
2. Clicar em **"Desconectar"**
3. Verificar que eventos somem
4. Verificar que botão "Conectar" reaparece

---

## Resumo da Arquitetura

```
┌─────────────┐
│   FRONTEND  │
│  (React)    │
└──────┬──────┘
       │ invoke Edge Functions
       ↓
┌────────────────────────────┐
│   SUPABASE EDGE FUNCTIONS  │
│  - gcal_begin              │
│  - gcal_callback           │
│  - gcal_sync               │
│  - gcal_revoke             │
└──────┬─────────────────────┘
       │ usa SERVICE_ROLE_KEY
       ↓
┌────────────────────────────┐
│   POSTGRES + RLS           │
│  - gcal_accounts (1 row)   │
│  - gcal_events (cache)     │
└────────────────────────────┘
       │
       ↓
┌────────────────────────────┐
│   GOOGLE CALENDAR API      │
│  - OAuth 2.0               │
│  - Calendar Events         │
└────────────────────────────┘
```

---

## 🔍 Esclarecimentos sobre o Controle de Acesso

### Como o projeto gerencia ADMIN e LEADER?

O projeto usa **`profiles.role`** como controle principal:

1. **Tabela `profiles`:**
   - Campo `role` pode ser: `'ADMIN'` ou `'LEADER'`
   - Criada automaticamente ao criar usuário

2. **Função `app_is_admin(uid)`:**
   - JÁ EXISTE no projeto
   - Verifica: `profiles.role = 'ADMIN'`
   - Usada em todas as policies e Edge Functions

3. **View `app_leaders_list`:**
   - JOIN de `profiles` + `leader_profiles`
   - Retorna apenas usuários com `role='LEADER'` ou que têm registro em `leader_profiles`
   - Inclui `status` (PENDING, ACTIVE, INACTIVE)

4. **Tabela `app_admins`:**
   - Existe mas **NÃO é usada** para controle de acesso
   - Apenas para referência/notas

### Por que a policy de `gcal_events` foi ajustada?

**Antes (incorreto):**
```sql
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('LEADER','ADMIN')))
```

**Depois (correto):**
```sql
using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  OR
  exists (select 1 from app_leaders_list l where l.id = auth.uid() and l.status = 'ACTIVE')
)
```

**Motivo:** A view `app_leaders_list` é mais precisa pois:
- Verifica `leader_profiles.status = 'ACTIVE'`
- Garante que líder não foi revogado
- Alinha com outras partes do sistema que usam `app_leaders_list`

### Singleton em `gcal_accounts` - É realmente necessário?

**Sim!** O índice `create unique index gcal_singleton on gcal_accounts ((true))` garante que:

- **Apenas 1 conta Google** pode estar conectada no sistema inteiro
- Ideal para sistemas onde há 1 agenda oficial (do político/candidato)
- O `upsert` sempre atualiza a mesma linha única

Se precisar de **1 conta por admin**, remova esse índice e crie:
```sql
create unique index gcal_one_per_admin on gcal_accounts (owner_profile_id);
```

---

## ⚠️ Correções Aplicadas ao Código Real

As Edge Functions **JÁ POSSUEM** as correções de nomes de colunas no código.  
O documento reflete o estado **correto** após ajustes.

### Arquivo `gcal_callback/index.ts` - Estado atual:

```typescript
await supabaseClient.from('gcal_accounts').upsert({
  user_id: state,                    // ⚠️ PRECISA CORRIGIR para owner_profile_id
  email: userInfo.email,
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  token_expires_at: new Date(...),   // ⚠️ PRECISA CORRIGIR para expires_at
})
```

**Correção necessária:**
- `user_id` → `owner_profile_id`
- `token_expires_at` → `expires_at`
- Adicionar: `google_user_id`, `scope`, `token_type`

---

**Documento gerado em:** 21/10/2024  
**Versão:** 1.1 (com correções do ChatGPT)


