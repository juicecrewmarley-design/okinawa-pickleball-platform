create sequence if not exists public.member_id_sequence start 1500;

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
  email text not null,
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

alter table public.legacy_members add column if not exists residence_scope public.residence_scope not null default 'okinawa';
alter table public.legacy_members add column if not exists municipality text;
alter table public.legacy_members add column if not exists claimed_by uuid references auth.users(id) on delete set null;
alter table public.legacy_members add column if not exists claimed_at timestamptz;

create or replace function public.next_member_id()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'OKP-' || lpad(nextval('public.member_id_sequence')::text, 4, '0');

    exit when not exists (
      select 1
      from public.profiles
      where member_id = candidate
    )
    and not exists (
      select 1
      from public.legacy_members
      where member_id = candidate
    );
  end loop;

  return candidate;
end;
$$;

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
  membership_type public.membership_type not null default 'general',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists member_id text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists furigana text;
alter table public.profiles add column if not exists gender public.gender_type not null default 'no_answer';
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists area public.member_area not null default 'other';
alter table public.profiles add column if not exists residence_scope public.residence_scope not null default 'okinawa';
alter table public.profiles add column if not exists municipality text;
alter table public.profiles add column if not exists role public.member_role not null default 'member';
alter table public.profiles add column if not exists membership_type public.membership_type not null default 'general';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles alter column member_id set default public.next_member_id();

update public.profiles
set member_id = public.next_member_id()
where member_id is null or member_id = '';

update public.profiles
set email = coalesce(nullif(email, ''), id::text || '@missing.local')
where email is null or email = '';

update public.profiles
set full_name = coalesce(nullif(full_name, ''), nullif(split_part(email, '@', 1), ''), 'Member')
where full_name is null or full_name = '';

update public.profiles
set furigana = ''
where furigana is null;

alter table public.profiles alter column member_id set not null;
alter table public.profiles alter column full_name set not null;
alter table public.profiles alter column furigana set not null;
alter table public.profiles alter column email set not null;

do $$
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
$$ language plpgsql;

create or replace function public.peek_next_member_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  max_member_number bigint;
  sequence_last_value bigint;
  sequence_is_called boolean;
  candidate_number bigint;
  candidate text;
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

  select last_value, is_called
  into sequence_last_value, sequence_is_called
  from public.member_id_sequence;

  candidate_number := greatest(
    1500,
    max_member_number + 1,
    case
      when coalesce(sequence_is_called, true) then coalesce(sequence_last_value, 1499) + 1
      else coalesce(sequence_last_value, 1500)
    end
  );

  loop
    candidate := 'OKP-' || lpad(candidate_number::text, 4, '0');

    exit when not exists (
      select 1
      from public.profiles
      where member_id = candidate
    )
    and not exists (
      select 1
      from public.legacy_members
      where member_id = candidate
    );

    candidate_number := candidate_number + 1;
  end loop;

  return candidate;
end;
$$;

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

  perform setval('public.member_id_sequence', greatest(max_member_number, 1499), true);
  return max_member_number;
end;
$$;

select public.sync_member_id_sequence();

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
  requested_legacy_birth_date text;
  requested_legacy_phone_last4 text;
  legacy_birth_date date;
  existing_profile public.profiles%rowtype;
  legacy_match public.legacy_members%rowtype;
  final_email text;
  final_member_id text;
  final_full_name text;
  final_furigana text;
  final_gender public.gender_type;
  final_birth_date date;
  final_phone text;
  final_area public.member_area;
  final_residence_scope public.residence_scope;
  final_municipality text;
  final_membership_type public.membership_type;
  final_member_number bigint;
  metadata_gender text;
  metadata_area text;
  metadata_residence_scope text;
begin
  auth_raw_user_meta_data := coalesce(auth_raw_user_meta_data, '{}'::jsonb);
  final_email := lower(coalesce(nullif(auth_email, ''), auth_user_id::text || '@missing.local'));
  metadata_gender := nullif(auth_raw_user_meta_data ->> 'gender', '');
  metadata_area := nullif(auth_raw_user_meta_data ->> 'area', '');
  metadata_residence_scope := nullif(auth_raw_user_meta_data ->> 'residence_scope', '');

  select *
  into existing_profile
  from public.profiles
  where id = auth_user_id
  limit 1
  for update;

  requested_legacy_member_id := nullif(upper(regexp_replace(trim(coalesce(auth_raw_user_meta_data ->> 'legacy_member_id', '')), '\s+', '', 'g')), '');
  if requested_legacy_member_id ~ '^(OKP-?)?[0-9]+$' then
    requested_legacy_member_id := 'OKP-' || lpad(substring(requested_legacy_member_id from '([0-9]+)$'), 4, '0');
  end if;

  requested_legacy_birth_date := nullif(trim(coalesce(auth_raw_user_meta_data ->> 'legacy_birth_date', '')), '');
  if requested_legacy_birth_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    legacy_birth_date := requested_legacy_birth_date::date;
  end if;
  requested_legacy_phone_last4 := right(regexp_replace(coalesce(auth_raw_user_meta_data ->> 'legacy_phone_last4', ''), '\D', '', 'g'), 4);

  if requested_legacy_member_id is not null then
    select *
    into legacy_match
    from public.legacy_members
    where member_id = requested_legacy_member_id
    limit 1
    for update;

    if strict_legacy_match and legacy_match.member_id is null then
      raise exception 'Legacy member ID or verification information does not match.';
    end if;

    if strict_legacy_match and legacy_match.claimed_by is not null and legacy_match.claimed_by <> auth_user_id then
      raise exception 'This legacy member ID has already been claimed.';
    end if;

    if strict_legacy_match and exists (
      select 1
      from public.profiles p
      where p.member_id = requested_legacy_member_id
        and p.id <> auth_user_id
    ) then
      raise exception 'This legacy member ID has already been registered.';
    end if;

    if strict_legacy_match and not (
      (legacy_birth_date is not null and legacy_match.birth_date = legacy_birth_date)
      or (
        length(requested_legacy_phone_last4) = 4
        and right(regexp_replace(coalesce(legacy_match.phone, ''), '\D', '', 'g'), 4) = requested_legacy_phone_last4
      )
    ) then
      raise exception 'Legacy member ID or verification information does not match.';
    end if;
  end if;

  final_member_id := coalesce(existing_profile.member_id, legacy_match.member_id, public.next_member_id());
  final_full_name := coalesce(legacy_match.full_name, nullif(auth_raw_user_meta_data ->> 'full_name', ''), split_part(final_email, '@', 1), 'Member');
  final_furigana := coalesce(legacy_match.furigana, nullif(auth_raw_user_meta_data ->> 'furigana', ''), '');
  final_gender := coalesce(
    legacy_match.gender,
    case
      when metadata_gender in ('male', 'female', 'other', 'no_answer') then metadata_gender::public.gender_type
      else 'no_answer'::public.gender_type
    end
  );
  final_birth_date := coalesce(
    legacy_match.birth_date,
    case
      when nullif(auth_raw_user_meta_data ->> 'birth_date', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then nullif(auth_raw_user_meta_data ->> 'birth_date', '')::date
      else null
    end
  );
  final_phone := coalesce(legacy_match.phone, nullif(auth_raw_user_meta_data ->> 'phone', ''), '');
  final_area := coalesce(
    legacy_match.area,
    case
      when metadata_area in ('south', 'naha', 'central', 'miyako', 'other') then metadata_area::public.member_area
      else 'other'::public.member_area
    end
  );
  final_residence_scope := coalesce(
    legacy_match.residence_scope,
    case
      when metadata_residence_scope in ('okinawa', 'outside') then metadata_residence_scope::public.residence_scope
      else 'okinawa'::public.residence_scope
    end
  );
  final_municipality := coalesce(legacy_match.municipality, nullif(auth_raw_user_meta_data ->> 'municipality', ''));
  final_member_number := nullif(substring(final_member_id from '^OKP-([0-9]+)$'), '')::bigint;
  final_membership_type := case
    when final_member_number between 1 and 209 then 'premium'::public.membership_type
    when legacy_match.member_id is not null then 'premium'::public.membership_type
    when auth_raw_user_meta_data ->> 'membership_type' = 'premium' then 'premium'::public.membership_type
    else 'general'::public.membership_type
  end;

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
    role,
    membership_type
  )
  values (
    auth_user_id,
    final_member_id,
    final_full_name,
    final_furigana,
    final_gender,
    final_birth_date,
    final_phone,
    final_email,
    final_area,
    final_residence_scope,
    final_municipality,
    public.initial_profile_role(final_email),
    final_membership_type
  )
  on conflict (id) do update set
    member_id = coalesce(public.profiles.member_id, excluded.member_id),
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    furigana = coalesce(nullif(public.profiles.furigana, ''), excluded.furigana),
    gender = coalesce(public.profiles.gender, excluded.gender),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone),
    area = coalesce(public.profiles.area, excluded.area),
    residence_scope = coalesce(public.profiles.residence_scope, excluded.residence_scope),
    municipality = coalesce(public.profiles.municipality, excluded.municipality),
    membership_type = case
      when public.profiles.member_id ~ '^OKP-[0-9]+$'
        and substring(public.profiles.member_id from '^OKP-([0-9]+)$')::bigint between 1 and 209
      then 'premium'::public.membership_type
      else coalesce(public.profiles.membership_type, excluded.membership_type)
    end,
    updated_at = now();

  if legacy_match.member_id is not null then
    update public.legacy_members
    set claimed_by = auth_user_id,
        claimed_at = coalesce(claimed_at, now())
    where member_id = legacy_match.member_id
      and (claimed_by is null or claimed_by = auth_user_id);
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
exception
  when others then
    raise warning 'handle_new_user profile upsert failed for auth user %: %', new.id, sqlerrm;
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
set membership_type = 'premium'
where member_id ~ '^OKP-[0-9]+$'
  and substring(member_id from '^OKP-([0-9]+)$')::bigint between 1 and 209;

select
  last_value as current_sequence_value,
  public.peek_next_member_id() as next_sequence_candidate
from public.member_id_sequence;
