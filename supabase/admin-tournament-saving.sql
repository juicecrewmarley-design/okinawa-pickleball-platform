create extension if not exists "pgcrypto";

do language plpgsql $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'tournament_status') then
    create type public.tournament_status as enum ('draft', 'open', 'closed', 'finished');
  end if;
end;
$$;

create or replace function public.admin_email()
returns text
language sql
stable
as $$
  select 'juicecrewmarley@yahoo.co.jp'::text;
$$;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  venue text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  entry_deadline timestamptz,
  fee_yen integer not null default 0,
  member_fee_yen integer not null default 0,
  guest_fee_yen integer not null default 0,
  capacity integer,
  category_capacities jsonb not null default '{}'::jsonb,
  categories text[] not null default array[]::text[],
  category_config jsonb not null default '{}'::jsonb,
  status public.tournament_status not null default 'draft',
  image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments add column if not exists end_at timestamptz;
alter table public.tournaments add column if not exists entry_deadline timestamptz;
alter table public.tournaments add column if not exists fee_yen integer not null default 0;
alter table public.tournaments add column if not exists member_fee_yen integer not null default 0;
alter table public.tournaments add column if not exists guest_fee_yen integer not null default 0;
alter table public.tournaments add column if not exists capacity integer;
alter table public.tournaments add column if not exists category_capacities jsonb not null default '{}'::jsonb;
alter table public.tournaments add column if not exists categories text[] not null default array[]::text[];
alter table public.tournaments add column if not exists category_config jsonb not null default '{}'::jsonb;
alter table public.tournaments add column if not exists status public.tournament_status not null default 'draft';
alter table public.tournaments add column if not exists image_url text;
alter table public.tournaments add column if not exists created_by uuid references public.profiles(id);
alter table public.tournaments add column if not exists created_at timestamptz not null default now();
alter table public.tournaments add column if not exists updated_at timestamptz not null default now();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and p.role::text = 'admin'
      and lower(u.email) = public.admin_email()
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tournaments_updated_at on public.tournaments;
create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

update public.profiles
set role = 'member'
where lower(email) <> public.admin_email()
  and role::text = 'admin';

update public.profiles
set role = 'admin'
where lower(email) = public.admin_email();

alter table public.tournaments enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.tournaments to anon, authenticated;
grant insert, update, delete on public.tournaments to authenticated;

drop policy if exists "tournaments public select" on public.tournaments;
drop policy if exists "tournaments admin write" on public.tournaments;
drop policy if exists "tournaments admin insert" on public.tournaments;
drop policy if exists "tournaments admin update" on public.tournaments;
drop policy if exists "tournaments admin delete" on public.tournaments;

create policy "tournaments public select"
on public.tournaments for select
to anon, authenticated
using (status in ('open', 'closed', 'finished') or public.is_admin());

create policy "tournaments admin insert"
on public.tournaments for insert
to authenticated
with check (public.is_admin());

create policy "tournaments admin update"
on public.tournaments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "tournaments admin delete"
on public.tournaments for delete
to authenticated
using (public.is_admin());
