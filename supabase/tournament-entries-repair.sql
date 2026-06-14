-- Repair public.tournament_entries for tournament entry saving.
-- Run this in Supabase SQL Editor when entry saving reports missing columns.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.entry_status as enum ('pending', 'confirmed', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tournament_entry_type as enum ('doubles', 'team');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.entry_linking_status as enum ('waiting', 'linked');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.entry_applicant_type as enum ('member', 'guest');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid()
);

alter table public.tournament_entries add column if not exists id uuid default gen_random_uuid();
update public.tournament_entries set id = gen_random_uuid() where id is null;
alter table public.tournament_entries alter column id set default gen_random_uuid();
alter table public.tournament_entries alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournament_entries_pkey'
      and conrelid = 'public.tournament_entries'::regclass
  ) then
    alter table public.tournament_entries add constraint tournament_entries_pkey primary key (id);
  end if;
end
$$;

alter table public.tournament_entries add column if not exists tournament_id uuid;
alter table public.tournament_entries add column if not exists user_id uuid;
alter table public.tournament_entries add column if not exists category text;
alter table public.tournament_entries add column if not exists pair_or_team_name text;
alter table public.tournament_entries add column if not exists team_name text;
alter table public.tournament_entries add column if not exists applicant_type public.entry_applicant_type default 'member';
alter table public.tournament_entries add column if not exists applicant_member_id text;
alter table public.tournament_entries add column if not exists applicant_name text default '';
alter table public.tournament_entries add column if not exists applicant_email text;
alter table public.tournament_entries add column if not exists applicant_phone text;
alter table public.tournament_entries add column if not exists entry_fee_yen integer default 0;
alter table public.tournament_entries add column if not exists entry_type public.tournament_entry_type default 'doubles';
alter table public.tournament_entries add column if not exists division text;
alter table public.tournament_entries add column if not exists class_or_age_category text;
alter table public.tournament_entries add column if not exists partner_member_id text;
alter table public.tournament_entries add column if not exists partner_name text;
alter table public.tournament_entries add column if not exists team_members jsonb default '[]'::jsonb;
alter table public.tournament_entries add column if not exists linking_status public.entry_linking_status default 'waiting';
alter table public.tournament_entries add column if not exists status public.entry_status default 'pending';
alter table public.tournament_entries add column if not exists note text;
alter table public.tournament_entries add column if not exists created_at timestamptz default now();
alter table public.tournament_entries add column if not exists updated_at timestamptz default now();

update public.tournament_entries set category = '' where category is null;
update public.tournament_entries set applicant_type = 'member' where applicant_type is null;
update public.tournament_entries set applicant_name = '' where applicant_name is null;
update public.tournament_entries set entry_fee_yen = 0 where entry_fee_yen is null;
update public.tournament_entries set entry_type = 'doubles' where entry_type is null;
update public.tournament_entries set team_members = '[]'::jsonb where team_members is null;
update public.tournament_entries set linking_status = 'waiting' where linking_status is null;
update public.tournament_entries set status = 'pending' where status is null;
update public.tournament_entries set created_at = now() where created_at is null;
update public.tournament_entries set updated_at = now() where updated_at is null;

alter table public.tournament_entries alter column category set default '';
alter table public.tournament_entries alter column category set not null;
alter table public.tournament_entries alter column applicant_type set default 'member';
alter table public.tournament_entries alter column applicant_type set not null;
alter table public.tournament_entries alter column applicant_name set default '';
alter table public.tournament_entries alter column applicant_name set not null;
alter table public.tournament_entries alter column entry_fee_yen set default 0;
alter table public.tournament_entries alter column entry_fee_yen set not null;
alter table public.tournament_entries alter column entry_type set default 'doubles';
alter table public.tournament_entries alter column entry_type set not null;
alter table public.tournament_entries alter column team_members set default '[]'::jsonb;
alter table public.tournament_entries alter column team_members set not null;
alter table public.tournament_entries alter column linking_status set default 'waiting';
alter table public.tournament_entries alter column linking_status set not null;
alter table public.tournament_entries alter column status set default 'pending';
alter table public.tournament_entries alter column status set not null;
alter table public.tournament_entries alter column created_at set default now();
alter table public.tournament_entries alter column created_at set not null;
alter table public.tournament_entries alter column updated_at set default now();
alter table public.tournament_entries alter column updated_at set not null;
alter table public.tournament_entries alter column user_id drop not null;
alter table public.tournament_entries alter column pair_or_team_name drop not null;

do $$
begin
  if not exists (
    select 1
    from public.tournament_entries
    where tournament_id is null
  ) then
    alter table public.tournament_entries alter column tournament_id set not null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournament_entries_tournament_id_fkey'
      and conrelid = 'public.tournament_entries'::regclass
  ) then
    begin
      alter table public.tournament_entries
        add constraint tournament_entries_tournament_id_fkey
        foreign key (tournament_id) references public.tournaments(id) on delete cascade;
    exception
      when others then
        raise notice 'Skipped tournament_entries_tournament_id_fkey: %', sqlerrm;
    end;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.profiles') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'tournament_entries_user_id_fkey'
        and conrelid = 'public.tournament_entries'::regclass
    )
  then
    begin
      alter table public.tournament_entries
        add constraint tournament_entries_user_id_fkey
        foreign key (user_id) references public.profiles(id) on delete set null;
    exception
      when others then
        raise notice 'Skipped tournament_entries_user_id_fkey: %', sqlerrm;
    end;
  end if;
end
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

drop trigger if exists set_entries_updated_at on public.tournament_entries;
create trigger set_entries_updated_at
before update on public.tournament_entries
for each row execute function public.set_updated_at();

alter table public.tournament_entries enable row level security;

notify pgrst, 'reload schema';

select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tournament_entries'
order by ordinal_position;
