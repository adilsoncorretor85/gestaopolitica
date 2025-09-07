# Configuração do Banco de Dados

## Instruções para configurar o schema no Supabase

1. **Acesse o Supabase SQL Editor** do seu projeto
2. **Cole e execute o SQL abaixo** para criar todas as tabelas e políticas:

```sql
-- PERFIS
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'LEADER' check (role in ('ADMIN','LEADER')),
  full_name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- LEADER PROFILES
create table if not exists public.leader_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  phone text,
  birth_date date,
  gender text check (gender in ('M','F','O')),
  cep text, street text, number text, complement text,
  neighborhood text, city text, state text,
  notes text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.leader_profiles enable row level security;

-- INVITE TOKENS
create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  phone text,
  role text not null default 'LEADER',
  token text unique not null,
  expires_at timestamptz not null,
  created_by uuid references public.profiles(id),
  accepted_at timestamptz,
  leader_profile_id uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.invite_tokens enable row level security;
-- PEOPLE
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  whatsapp text not null,
  email text, facebook text, instagram text,
  cep text, street text, number text, complement text,
  neighborhood text, city text, state text,
  notes text,
  contacted_at timestamptz,
  vote_status text check (vote_status in ('CONFIRMADO','PROVAVEL','INDEFINIDO')) default 'INDEFINIDO',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.people enable row level security;

create index if not exists people_owner_idx on public.people(owner_id);
create index if not exists people_name_idx on public.people using gin (to_tsvector('simple', full_name));

-- AUDITORIA
create table if not exists public.audit_logs (
  id bigserial primary key,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('CREATE','UPDATE','DELETE')),
  actor_id uuid references public.profiles(id) on delete set null,
  details jsonb,
  created_at timestamptz default now()
);
alter table public.audit_logs enable row level security;

-- ORG SETTINGS + METAS
create table if not exists public.org_settings (
  id int primary key,
  default_goal int not null default 120,
  updated_at timestamptz default now()
);
alter table public.org_settings enable row level security;

create table if not exists public.leader_targets (
  leader_id uuid primary key references public.profiles(id) on delete cascade,
  goal int not null,
  updated_at timestamptz default now()
);
alter table public.leader_targets enable row level security;

-- TRIGGERS
create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_people_updated_at on public.people;
create trigger trg_people_updated_at
before update on public.people
for each row execute function public.set_updated_at();

drop trigger if exists trg_leader_profiles_updated_at on public.leader_profiles;
create trigger trg_leader_profiles_updated_at
before update on public.leader_profiles
for each row execute function public.set_updated_at();
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'LEADER', coalesce(new.email,'')) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- POLÍTICAS (DROP + CREATE)
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles for select
using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles for update
using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

-- LEADER PROFILES POLICIES
drop policy if exists leader_profiles_select_self_or_admin on public.leader_profiles;
create policy leader_profiles_select_self_or_admin
on public.leader_profiles for select
using (id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists leader_profiles_update_self_or_admin on public.leader_profiles;
create policy leader_profiles_update_self_or_admin
on public.leader_profiles for update
using (id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists leader_profiles_insert_admin on public.leader_profiles;
create policy leader_profiles_insert_admin
on public.leader_profiles for insert
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists leader_profiles_delete_admin on public.leader_profiles;
create policy leader_profiles_delete_admin
on public.leader_profiles for delete
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

-- INVITE TOKENS POLICIES
drop policy if exists invite_tokens_admin_only on public.invite_tokens;
create policy invite_tokens_admin_only
on public.invite_tokens for all
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists invite_tokens_public_select on public.invite_tokens;
create policy invite_tokens_public_select
on public.invite_tokens for select
to public using (true);

drop policy if exists invite_tokens_public_update on public.invite_tokens;
create policy invite_tokens_public_update
on public.invite_tokens for update
to public using (true);
drop policy if exists people_select_self_or_admin on public.people;
create policy people_select_self_or_admin
on public.people for select
using (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists people_insert_self_or_admin on public.people;
create policy people_insert_self_or_admin
on public.people for insert
with check (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists people_update_self_or_admin on public.people;
create policy people_update_self_or_admin
on public.people for update
using (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists people_delete_self_or_admin on public.people;
create policy people_delete_self_or_admin
on public.people for delete
using (owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists audit_select_admin_or_owner on public.audit_logs;
create policy audit_select_admin_or_owner
on public.audit_logs for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN')
   or (details ? 'owner_id' and (details->>'owner_id')::uuid = auth.uid()));

drop policy if exists org_settings_read_all on public.org_settings;
create policy org_settings_read_all
on public.org_settings for select
to authenticated using (true);

drop policy if exists org_settings_update_admin on public.org_settings;
create policy org_settings_update_admin
on public.org_settings for update
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists lt_select_admin_or_self on public.leader_targets;
create policy lt_select_admin_or_self
on public.leader_targets for select
using (leader_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists lt_insert_admin_or_self on public.leader_targets;
create policy lt_insert_admin_or_self
on public.leader_targets for insert
with check (leader_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

drop policy if exists lt_update_admin_or_self on public.leader_targets;
create policy lt_update_admin_or_self
on public.leader_targets for update
using (leader_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='ADMIN'));

-- SEEDS
insert into public.org_settings (id, default_goal) values (1,120)
on conflict (id) do nothing;

insert into public.leader_targets (leader_id, goal)
select u.id, 120 from auth.users u
on conflict (leader_id) do nothing;
```

## Pós-configuração

3. **Promova seu usuário para ADMIN:**
```sql
update public.profiles p
set role = 'ADMIN'
where p.id = (select id from auth.users where email = 'SEU_EMAIL@gmail.com');
```

4. **Configure a Edge Function invite-leader:**
   - Acesse o painel do Supabase → Edge Functions
   - Crie uma nova função chamada `invite-leader`
   - Cole o código do arquivo `supabase/functions/invite-leader/index.ts`
   - Configure a variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` no painel

5. **Fluxo de convite:**
   - ADMIN acessa `/lideres/novo` e preenche dados do líder
   - Sistema chama Edge Function que cria token e envia email
   - Líder recebe email com link `/convite/:token`
   - Líder define senha e conta é criada automaticamente

4. **Teste com dados de exemplo (opcional):**
```sql
insert into public.people (owner_id, full_name, whatsapp, city, state, vote_status)
select u.id, 'Contato de Teste', '47999999999', 'Joinville', 'SC', 'PROVAVEL'
from auth.users u where u.email = 'SEU_EMAIL@gmail.com';
```

## Estrutura das Tabelas

- **profiles**: Perfis de usuário (ADMIN/LEADER)
- **people**: Contatos cadastrados pelos líderes
- **audit_logs**: Log de auditoria das ações
- **org_settings**: Configurações gerais (meta padrão)
- **leader_targets**: Metas individuais por líder

## Permissões (RLS)

- **LEADER**: Acessa apenas seus próprios dados
- **ADMIN**: Acessa todos os dados do sistema