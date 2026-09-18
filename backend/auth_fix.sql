-- Apply this once in Supabase SQL Editor for an existing CP Giraneza Health project.
-- It preserves all accounts and creates missing application profiles as STUDENT users.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (
    id, full_name, email, phone, sex, role, diploma, age, languages, identification_number, residence, address, country, request_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'sex',
    'STUDENT',
    new.raw_user_meta_data->>'diploma',
    case when nullif(new.raw_user_meta_data->>'age','') is not null then (new.raw_user_meta_data->>'age')::int else null end,
    new.raw_user_meta_data->>'languages',
    new.raw_user_meta_data->>'identification_number',
    new.raw_user_meta_data->>'residence',
    new.raw_user_meta_data->>'address',
    coalesce(new.raw_user_meta_data->>'country', 'Rwanda'),
    coalesce(new.raw_user_meta_data->>'request_status', 'PENDING')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    sex = excluded.sex,
    diploma = excluded.diploma,
    age = excluded.age,
    languages = excluded.languages,
    identification_number = excluded.identification_number,
    residence = excluded.residence,
    address = excluded.address,
    country = excluded.country,
    request_status = excluded.request_status,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (
  id, full_name, email, phone, sex, role, diploma, age, languages, identification_number, residence, address, country, request_status
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  u.raw_user_meta_data->>'phone',
  u.raw_user_meta_data->>'sex',
  'STUDENT',
  u.raw_user_meta_data->>'diploma',
  case when nullif(u.raw_user_meta_data->>'age','') is not null then (u.raw_user_meta_data->>'age')::int else null end,
  u.raw_user_meta_data->>'languages',
  u.raw_user_meta_data->>'identification_number',
  u.raw_user_meta_data->>'residence',
  u.raw_user_meta_data->>'address',
  coalesce(u.raw_user_meta_data->>'country', 'Rwanda'),
  coalesce(u.raw_user_meta_data->>'request_status', 'PENDING')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Promote only the intended administrator after creating that Auth user:
-- update public.profiles set role = 'ADMIN', updated_at = now()
-- where email = 'your-admin-email@example.com';
