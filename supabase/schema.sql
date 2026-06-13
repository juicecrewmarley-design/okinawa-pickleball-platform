create extension if not exists "pgcrypto";

create type public.member_role as enum ('member', 'admin', 'sponsor');
create type public.member_area as enum ('south', 'naha', 'central', 'miyako', 'other');
create type public.residence_scope as enum ('okinawa', 'outside');
create type public.gender_type as enum ('male', 'female', 'other', 'no_answer');
create type public.tournament_status as enum ('draft', 'open', 'closed', 'finished');
create type public.entry_status as enum ('pending', 'confirmed', 'cancelled');
create type public.tournament_entry_type as enum ('doubles', 'team');
create type public.entry_linking_status as enum ('waiting', 'linked');
create type public.entry_applicant_type as enum ('member', 'guest');
create type public.notice_type as enum ('event', 'tournament', 'practice', 'association');
create type public.sponsor_rank as enum ('platinum', 'gold', 'silver', 'bronze', 'supporter');
create type public.opr_category as enum ('mens', 'womens', 'mixed', 'overall');

create sequence if not exists public.member_id_sequence start 1;

create or replace function public.next_member_id()
returns text
language sql
as $$
  select 'OKP-' || lpad(nextval('public.member_id_sequence')::text, 4, '0');
$$;

create or replace function public.admin_email()
returns text
language sql
stable
as $$
  select 'juicecrewmarley@yahoo.co.jp'::text;
$$;

create or replace function public.initial_profile_role(profile_email text)
returns public.member_role
language sql
stable
as $$
  select case
    when lower(coalesce(profile_email, '')) = public.admin_email() then 'admin'::public.member_role
    else 'member'::public.member_role
  end;
$$;

create table if not exists public.legacy_members (
  member_id text primary key,
  email text not null unique,
  full_name text not null,
  furigana text,
  gender public.gender_type not null default 'no_answer',
  birth_date date,
  phone text,
  area public.member_area not null default 'other',
  residence_scope public.residence_scope not null default 'okinawa',
  municipality text,
  prefecture text,
  region_text text,
  pickleball_experience text,
  form_timestamp timestamptz,
  source text not null default 'google_form',
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id text unique not null default public.next_member_id(),
  full_name text not null,
  furigana text not null,
  gender public.gender_type not null default 'no_answer',
  birth_date date,
  phone text,
  email text not null unique,
  area public.member_area not null default 'other',
  residence_scope public.residence_scope not null default 'okinawa',
  municipality text,
  role public.member_role not null default 'member',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  category text not null,
  pair_or_team_name text,
  team_name text,
  applicant_type public.entry_applicant_type not null default 'member',
  applicant_member_id text,
  applicant_name text not null default '',
  applicant_email text,
  applicant_phone text,
  entry_fee_yen integer not null default 0,
  entry_type public.tournament_entry_type not null default 'doubles',
  division text,
  class_or_age_category text,
  partner_member_id text,
  partner_name text,
  team_members jsonb not null default '[]'::jsonb,
  linking_status public.entry_linking_status not null default 'waiting',
  status public.entry_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, user_id, category)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  category text not null,
  round_name text,
  winner_entry_id uuid references public.tournament_entries(id),
  loser_entry_id uuid references public.tournament_entries(id),
  score text,
  placement integer,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.opr_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  season_year integer not null default extract(year from now())::integer,
  category public.opr_category not null,
  division text,
  class_or_age_category text,
  overall_gender public.gender_type,
  participation_points integer not null default 0,
  win_points integer not null default 0,
  placement_points integer not null default 0,
  total_points integer generated always as (participation_points + win_points + placement_points) stored,
  memo text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type public.notice_type not null default 'association',
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  logo_url text,
  description text not null,
  website_url text,
  rank public.sponsor_rank not null default 'supporter',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsor_contacts (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  contact_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_single_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_email text;
begin
  select lower(email)
  into auth_email
  from auth.users
  where id = new.id;

  if auth_email is not null then
    new.email = auth_email;
  else
    new.email = lower(new.email);
  end if;

  if lower(new.email) = public.admin_email() then
    new.role = 'admin';
  elsif new.role = 'admin' then
    raise exception '管理者に設定できるメールアドレスは % のみです。', public.admin_email();
  end if;

  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists enforce_single_admin_profile on public.profiles;
create trigger enforce_single_admin_profile
before insert or update on public.profiles
for each row execute function public.enforce_single_admin_profile();

create trigger set_legacy_members_updated_at
before update on public.legacy_members
for each row execute function public.set_updated_at();

create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger set_entries_updated_at
before update on public.tournament_entries
for each row execute function public.set_updated_at();

create trigger set_sponsors_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

alter table public.profiles add column if not exists residence_scope public.residence_scope not null default 'okinawa';
alter table public.profiles add column if not exists municipality text;
alter table public.profiles add column if not exists member_id text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists furigana text;
alter table public.profiles add column if not exists gender public.gender_type not null default 'no_answer';
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists area public.member_area not null default 'other';
alter table public.profiles add column if not exists role public.member_role not null default 'member';
alter table public.profiles alter column member_id set default public.next_member_id();
update public.profiles set member_id = public.next_member_id() where member_id is null;
update public.profiles set email = coalesce(email, id::text || '@missing.local') where email is null or email = '';
update public.profiles set full_name = coalesce(nullif(split_part(email, '@', 1), ''), '会員') where full_name is null or full_name = '';
update public.profiles set furigana = '' where furigana is null;
alter table public.profiles alter column member_id set not null;
alter table public.profiles alter column full_name set not null;
alter table public.profiles alter column furigana set not null;
alter table public.profiles alter column email set not null;

do language plpgsql $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_member_id_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_member_id_key unique (member_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_email_key unique (email);
  end if;
end;
$$;
alter table public.legacy_members add column if not exists residence_scope public.residence_scope not null default 'okinawa';
alter table public.tournaments add column if not exists member_fee_yen integer not null default 0;
alter table public.tournaments add column if not exists guest_fee_yen integer not null default 0;
alter table public.tournaments add column if not exists category_capacities jsonb not null default '{}'::jsonb;
alter table public.tournaments add column if not exists category_config jsonb not null default '{}'::jsonb;
alter table public.tournament_entries alter column user_id drop not null;
alter table public.tournament_entries alter column pair_or_team_name drop not null;
alter table public.tournament_entries add column if not exists team_name text;
alter table public.tournament_entries add column if not exists applicant_type public.entry_applicant_type not null default 'member';
alter table public.tournament_entries add column if not exists applicant_member_id text;
alter table public.tournament_entries add column if not exists applicant_name text not null default '';
alter table public.tournament_entries add column if not exists applicant_email text;
alter table public.tournament_entries add column if not exists applicant_phone text;
alter table public.tournament_entries add column if not exists entry_fee_yen integer not null default 0;
alter table public.tournament_entries add column if not exists entry_type public.tournament_entry_type not null default 'doubles';
alter table public.tournament_entries add column if not exists division text;
alter table public.tournament_entries add column if not exists class_or_age_category text;
alter table public.tournament_entries add column if not exists partner_member_id text;
alter table public.tournament_entries add column if not exists partner_name text;
alter table public.tournament_entries add column if not exists team_members jsonb not null default '[]'::jsonb;
alter table public.tournament_entries add column if not exists linking_status public.entry_linking_status not null default 'waiting';
alter table public.opr_points add column if not exists division text;
alter table public.opr_points add column if not exists class_or_age_category text;
alter table public.opr_points add column if not exists overall_gender public.gender_type;

create or replace function public.sync_member_id_sequence()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  max_member_number bigint;
begin
  select coalesce(max(member_number), 0)
  into max_member_number
  from (
    select substring(member_id from '^OKP-([0-9]+)$')::bigint as member_number
    from public.profiles
    where member_id ~ '^OKP-[0-9]+$'
    union all
    select substring(member_id from '^OKP-([0-9]+)$')::bigint as member_number
    from public.legacy_members
    where member_id ~ '^OKP-[0-9]+$'
  ) used_member_ids
  where member_number is not null;

  perform setval('public.member_id_sequence', greatest(max_member_number, 1), true);
  return max_member_number;
end;
$$;

create or replace function public.upsert_profile_from_auth_user(
  auth_user_id uuid,
  auth_email text,
  auth_raw_user_meta_data jsonb,
  strict_legacy_match boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_legacy_member_id text;
  legacy_match public.legacy_members%rowtype;
  final_member_id text;
  final_full_name text;
  final_furigana text;
  final_gender public.gender_type;
  final_birth_date date;
  final_phone text;
  final_area public.member_area;
  final_residence_scope public.residence_scope;
  final_municipality text;
begin
  requested_legacy_member_id := nullif(upper(regexp_replace(trim(auth_raw_user_meta_data ->> 'legacy_member_id'), '\s+', '', 'g')), '');
  if requested_legacy_member_id ~ '^(OKP-?)?[0-9]+$' then
    requested_legacy_member_id := 'OKP-' || lpad(substring(requested_legacy_member_id from '([0-9]+)$'), 4, '0');
  end if;

  select *
  into legacy_match
  from public.legacy_members
  where lower(email) = lower(auth_email)
    and (requested_legacy_member_id is null or member_id = requested_legacy_member_id)
  order by member_id
  limit 1;

  if strict_legacy_match and requested_legacy_member_id is not null and legacy_match.member_id is null then
    raise exception '入力された会員IDは、このメールアドレスのGoogleフォーム登録と一致しません。';
  end if;

  final_member_id := coalesce(legacy_match.member_id, public.next_member_id());
  final_full_name := coalesce(legacy_match.full_name, nullif(auth_raw_user_meta_data ->> 'full_name', ''), split_part(auth_email, '@', 1), '会員');
  final_furigana := coalesce(legacy_match.furigana, nullif(auth_raw_user_meta_data ->> 'furigana', ''), '');
  final_gender := coalesce(legacy_match.gender, coalesce(nullif(auth_raw_user_meta_data ->> 'gender', ''), 'no_answer')::public.gender_type);
  final_birth_date := coalesce(legacy_match.birth_date, nullif(auth_raw_user_meta_data ->> 'birth_date', '')::date);
  final_phone := coalesce(legacy_match.phone, nullif(auth_raw_user_meta_data ->> 'phone', ''), '');
  final_area := coalesce(legacy_match.area, coalesce(nullif(auth_raw_user_meta_data ->> 'area', ''), 'other')::public.member_area);
  final_residence_scope := coalesce(legacy_match.residence_scope, coalesce(nullif(auth_raw_user_meta_data ->> 'residence_scope', ''), 'okinawa')::public.residence_scope);
  final_municipality := coalesce(legacy_match.municipality, nullif(auth_raw_user_meta_data ->> 'municipality', ''));

  insert into public.profiles (
    id,
    member_id,
    full_name,
    furigana,
    gender,
    birth_date,
    phone,
    email,
    area,
    residence_scope,
    municipality,
    role
  )
  values (
    auth_user_id,
    final_member_id,
    final_full_name,
    final_furigana,
    final_gender,
    final_birth_date,
    final_phone,
    auth_email,
    final_area,
    final_residence_scope,
    final_municipality,
    public.initial_profile_role(auth_email)
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    furigana = coalesce(nullif(public.profiles.furigana, ''), excluded.furigana),
    gender = coalesce(public.profiles.gender, excluded.gender),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone),
    area = coalesce(public.profiles.area, excluded.area),
    residence_scope = coalesce(public.profiles.residence_scope, excluded.residence_scope),
    municipality = coalesce(public.profiles.municipality, excluded.municipality),
    updated_at = now();

  if legacy_match.member_id is not null then
    update public.legacy_members
    set claimed_by = auth_user_id,
        claimed_at = coalesce(claimed_at, now())
    where member_id = legacy_match.member_id;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_profile_from_auth_user(new.id, new.email, new.raw_user_meta_data, true);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

select public.upsert_profile_from_auth_user(u.id, u.email, u.raw_user_meta_data, false)
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);

select public.sync_member_id_sequence();

update public.profiles
set role = 'member'
where lower(email) <> public.admin_email()
  and role = 'admin';

update public.profiles
set role = 'admin'
where lower(email) = public.admin_email();

create unique index if not exists profiles_single_admin_idx
on public.profiles (role)
where role = 'admin'::public.member_role;

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
      and p.role = 'admin'
      and lower(u.email) = public.admin_email()
  );
$$;

create or replace view public.annual_rankings as
select
  p.id as user_id,
  p.member_id,
  p.full_name,
  p.area,
  op.season_year,
  op.category,
  op.division,
  op.class_or_age_category,
  op.overall_gender,
  sum(op.total_points)::integer as total_points,
  rank() over (
    partition by op.season_year, op.category, op.division, op.class_or_age_category, op.overall_gender
    order by sum(op.total_points) desc, p.full_name asc
  ) as rank
from public.opr_points op
join public.profiles p on p.id = op.user_id
group by p.id, p.member_id, p.full_name, p.area, op.season_year, op.category, op.division, op.class_or_age_category, op.overall_gender;

alter table public.profiles enable row level security;
alter table public.legacy_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.match_results enable row level security;
alter table public.opr_points enable row level security;
alter table public.notices enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_contacts enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own or admin" on public.profiles;

create policy "profiles select own or admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles insert own"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles update own or admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "legacy members admin select"
on public.legacy_members for select
using (public.is_admin());

create policy "legacy members admin write"
on public.legacy_members for all
using (public.is_admin())
with check (public.is_admin());

create policy "tournaments public select"
on public.tournaments for select
using (status in ('open', 'closed', 'finished') or public.is_admin());

create policy "tournaments admin write"
on public.tournaments for all
using (public.is_admin())
with check (public.is_admin());

create policy "entries select own or admin"
on public.tournament_entries for select
using (user_id = auth.uid() or public.is_admin());

create policy "entries insert own"
on public.tournament_entries for insert
with check (user_id = auth.uid() or user_id is null);

create policy "entries update own pending or admin"
on public.tournament_entries for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "match results public select"
on public.match_results for select
using (true);

create policy "match results admin write"
on public.match_results for all
using (public.is_admin())
with check (public.is_admin());

create policy "opr points public select"
on public.opr_points for select
using (true);

create policy "opr points admin write"
on public.opr_points for all
using (public.is_admin())
with check (public.is_admin());

create policy "notices public select"
on public.notices for select
using (is_published = true or public.is_admin());

create policy "notices admin write"
on public.notices for all
using (public.is_admin())
with check (public.is_admin());

create policy "sponsors public select"
on public.sponsors for select
using (is_active = true or public.is_admin());

create policy "sponsors admin write"
on public.sponsors for all
using (public.is_admin())
with check (public.is_admin());

create policy "sponsor contacts admin only"
on public.sponsor_contacts for all
using (public.is_admin())
with check (public.is_admin());
