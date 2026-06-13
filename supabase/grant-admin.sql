do language plpgsql $$
declare
  admin_email constant text := 'juicecrewmarley@yahoo.co.jp';
  admin_user_id uuid;
  admin_user_email text;
  admin_user_metadata jsonb;
begin
  select id, email, coalesce(raw_user_meta_data, '{}'::jsonb)
  into admin_user_id, admin_user_email, admin_user_metadata
  from auth.users
  where lower(email) = admin_email
  order by created_at desc
  limit 1;

  if admin_user_id is null then
    raise exception 'Supabase Authに % のユーザーが見つかりません。先にAuthenticationでユーザーを作成してください。', admin_email;
  end if;

  update public.profiles
  set role = 'member'
  where lower(email) <> admin_email
    and role::text = 'admin';

  insert into public.profiles (
    id,
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
    admin_user_id,
    coalesce(nullif(admin_user_metadata ->> 'full_name', ''), split_part(admin_user_email, '@', 1), '管理者'),
    coalesce(nullif(admin_user_metadata ->> 'furigana', ''), ''),
    'no_answer',
    nullif(admin_user_metadata ->> 'birth_date', '')::date,
    coalesce(nullif(admin_user_metadata ->> 'phone', ''), ''),
    lower(admin_user_email),
    'other',
    'okinawa',
    nullif(admin_user_metadata ->> 'municipality', ''),
    'admin'
  )
  on conflict (id) do update set
    email = lower(excluded.email),
    role = 'admin',
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    furigana = coalesce(public.profiles.furigana, excluded.furigana),
    phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone),
    municipality = coalesce(public.profiles.municipality, excluded.municipality),
    updated_at = now();

  update public.profiles
  set role = 'admin',
      email = lower(admin_user_email),
      updated_at = now()
  where id = admin_user_id;
end;
$$;

select
  p.email,
  p.role
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'juicecrewmarley@yahoo.co.jp';
