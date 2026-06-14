do $$
begin
  create type public.membership_type as enum ('general', 'premium');
exception
  when duplicate_object then null;
end;
$$;

alter table public.profiles
add column if not exists membership_type public.membership_type not null default 'general';

alter table public.tournament_entries
add column if not exists applicant_membership_type public.membership_type not null default 'general';

alter sequence public.member_id_sequence restart with 1500;

select setval(
  'public.member_id_sequence',
  greatest(
    coalesce((
      select max(member_number)
      from (
        select substring(member_id from '^OKP-([0-9]+)$')::bigint as member_number
        from public.profiles
        where member_id ~ '^OKP-[0-9]+$'
        union all
        select substring(member_id from '^OKP-([0-9]+)$')::bigint as member_number
        from public.legacy_members
        where member_id ~ '^OKP-[0-9]+$'
      ) used_member_ids
    ), 0),
    1499
  ),
  true
);

update public.profiles
set membership_type = 'premium'
where member_id ~ '^OKP-[0-9]+$'
  and substring(member_id from '^OKP-([0-9]+)$')::bigint between 1 and 209;

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
  final_membership_type public.membership_type;
  final_member_number bigint;
begin
  requested_legacy_member_id := nullif(upper(regexp_replace(trim(auth_raw_user_meta_data ->> 'legacy_member_id'), '\s+', '', 'g')), '');
  if requested_legacy_member_id ~ '^(OKP-?)?[0-9]+$' then
    requested_legacy_member_id := 'OKP-' || lpad(substring(requested_legacy_member_id from '([0-9]+)$'), 4, '0');
  end if;

  requested_legacy_birth_date := nullif(trim(auth_raw_user_meta_data ->> 'legacy_birth_date'), '');
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
      raise exception '会員番号または本人確認情報が一致しません。';
    end if;

    if strict_legacy_match and legacy_match.claimed_by is not null and legacy_match.claimed_by <> auth_user_id then
      raise exception 'この会員番号は既にアプリ登録済みです。';
    end if;

    if strict_legacy_match and exists (
      select 1
      from public.profiles p
      where p.member_id = requested_legacy_member_id
        and p.id <> auth_user_id
    ) then
      raise exception 'この会員番号は既にアプリ登録済みです。';
    end if;

    if strict_legacy_match and not (
      (legacy_birth_date is not null and legacy_match.birth_date = legacy_birth_date)
      or (
        length(requested_legacy_phone_last4) = 4
        and right(regexp_replace(coalesce(legacy_match.phone, ''), '\D', '', 'g'), 4) = requested_legacy_phone_last4
      )
    ) then
      raise exception '会員番号または本人確認情報が一致しません。';
    end if;
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
    auth_email,
    final_area,
    final_residence_scope,
    final_municipality,
    public.initial_profile_role(auth_email),
    final_membership_type
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

select member_id, email, membership_type
from public.profiles
where member_id ~ '^OKP-[0-9]+$'
order by member_id
limit 20;
