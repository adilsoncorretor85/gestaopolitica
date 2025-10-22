-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Helper: função para saber se é ADMIN (idempotente)
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

-- Tabela singleton da conta conectada do Google Calendar (sempre 1)
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

-- Tabela cache local de eventos
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

-- Trigger para updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_gcal_accounts_touch on public.gcal_accounts;
create trigger trg_gcal_accounts_touch
before update on public.gcal_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists trg_gcal_events_touch on public.gcal_events;
create trigger trg_gcal_events_touch
before update on public.gcal_events
for each row execute function public.touch_updated_at();

-- Ativa RLS
alter table public.gcal_accounts enable row level security;
alter table public.gcal_events   enable row level security;

-- RLS: gcal_accounts (somente ADMIN lê/escreve)
drop policy if exists gcal_accounts_select_admin on public.gcal_accounts;
create policy gcal_accounts_select_admin
on public.gcal_accounts for select
to authenticated
using (public.app_is_admin(auth.uid()));

drop policy if exists gcal_accounts_admin_write on public.gcal_accounts;
create policy gcal_accounts_admin_write
on public.gcal_accounts for all
to authenticated
using (public.app_is_admin(auth.uid()))
with check (public.app_is_admin(auth.uid()));

-- RLS: gcal_events (LÍDER & ADMIN leem; apenas ADMIN escreve)
drop policy if exists gcal_events_read_leader_or_admin on public.gcal_events;
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

drop policy if exists gcal_events_admin_write on public.gcal_events;
create policy gcal_events_admin_write
on public.gcal_events for all
to authenticated
using (public.app_is_admin(auth.uid()))
with check (public.app_is_admin(auth.uid()));
