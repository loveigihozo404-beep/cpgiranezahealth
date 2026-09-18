-- CP Giraneza Health account/data repair migration.
-- Supabase section: run in the Supabase SQL Editor.
-- MySQL section: run in XAMPP MySQL if local storage is also required.

-- SUPABASE: guarantee every Auth account has an admin-visible profile.
alter table public.profiles add column if not exists sex text;
alter table public.profiles drop constraint if exists profiles_sex_check;
alter table public.profiles add constraint profiles_sex_check check (sex in ('FEMALE','MALE','OTHER'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, email, phone, sex, role, diploma, age, languages,
    identification_number, residence, address, country, request_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'sex',
    'STUDENT',
    new.raw_user_meta_data->>'diploma',
    case when nullif(new.raw_user_meta_data->>'age', '') is null then null
      else (new.raw_user_meta_data->>'age')::integer end,
    new.raw_user_meta_data->>'languages',
    new.raw_user_meta_data->>'identification_number',
    new.raw_user_meta_data->>'residence',
    new.raw_user_meta_data->>'address',
    coalesce(new.raw_user_meta_data->>'country', 'Rwanda'),
    coalesce(new.raw_user_meta_data->>'request_status', 'PENDING')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.profiles.phone),
    sex = coalesce(excluded.sex, public.profiles.sex),
    diploma = coalesce(excluded.diploma, public.profiles.diploma),
    age = coalesce(excluded.age, public.profiles.age),
    languages = coalesce(excluded.languages, public.profiles.languages),
    identification_number = coalesce(excluded.identification_number, public.profiles.identification_number),
    residence = coalesce(excluded.residence, public.profiles.residence),
    address = coalesce(excluded.address, public.profiles.address),
    country = coalesce(excluded.country, public.profiles.country),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Repair accounts created before the trigger existed.
insert into public.profiles (id, full_name, email, role, country, request_status)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       u.email,
       'STUDENT',
       coalesce(u.raw_user_meta_data->>'country', 'Rwanda'),
       'PENDING'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Ensure admin reads are allowed after RLS is enabled.
drop policy if exists "admin full access profiles" on public.profiles;
create policy "admin full access profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

-- MYSQL/XAMPP: requested local database/table.
create database if not exists health character set utf8mb4 collate utf8mb4_unicode_ci;
use health;
create table if not exists giraneza (
  id bigint unsigned not null auto_increment,
  auth_id varchar(64) null unique,
  full_name varchar(160) not null,
  email varchar(255) not null unique,
  phone varchar(32) null,
  address varchar(255) null,
  country varchar(100) not null default 'Rwanda',
  role enum('ADMIN','STUDENT') not null default 'STUDENT',
  request_status enum('PENDING','APPROVED','REJECTED') not null default 'PENDING',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  primary key (id)
);
