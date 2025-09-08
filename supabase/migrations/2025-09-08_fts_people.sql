-- Full-Text Search em public.people (PT-BR) com rank
-- Idempotente e compatível com RLS

-- Extensões
create extension if not exists unaccent;

-- Coluna FTS (armazenada, mantida por trigger)
alter table public.people
  add column if not exists full_name_fts tsvector;

-- Trigger function: atualiza TSVECTOR com dicionário 'portuguese' sem acentos
create or replace function public.people_set_full_name_fts()
returns trigger language plpgsql as $$
begin
  new.full_name_fts :=
    to_tsvector('portuguese', unaccent(coalesce(new.full_name,'')));
  return new;
end$$;

-- Trigger BEFORE INSERT/UPDATE
drop trigger if exists trg_people_set_full_name_fts on public.people;
create trigger trg_people_set_full_name_fts
  before insert or update on public.people
  for each row execute procedure public.people_set_full_name_fts();

-- Backfill em dados existentes (1x)
update public.people
set full_name_fts = to_tsvector('portuguese', unaccent(coalesce(full_name,'')))
where full_name is not null and (full_name_fts is null);

-- Índice GIN na coluna FTS
create index if not exists people_full_name_fts
  on public.people using gin (full_name_fts);

-- RPC com rank e paginação; SECURITY INVOKER (respeita RLS)
create or replace function public.search_people(
  q text,
  p_limit  int default 50,
  p_offset int default 0
)
returns table(
  id uuid,
  full_name text,
  city text,
  state text,
  rank real
)
language sql
stable
as $$
  with query as (
    select
      p.id, p.full_name, p.city, p.state,
      ts_rank(p.full_name_fts, websearch_to_tsquery('portuguese', unaccent(q))) as rank
    from public.people p
    where p.full_name_fts @@ websearch_to_tsquery('portuguese', unaccent(q))
  )
  select id, full_name, city, state, rank
  from query
  order by rank desc, full_name asc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0)
$$;

