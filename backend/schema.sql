create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('ADMIN','STUDENT'); exception when duplicate_object then null; end $$;
do $$ begin create type public.enrollment_status as enum ('PENDING','APPROVED','REJECTED','WAITLISTED','COMPLETED','CANCELLED'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  sex text check (sex in ('FEMALE','MALE','OTHER')),
  role public.app_role not null default 'STUDENT',
  avatar_url text,
  diploma text,
  age integer,
  languages text,
  identification_number text,
  residence text,
  address text,
  country text,
  request_status text not null default 'PENDING' check (request_status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.course_categories (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique);
create table if not exists public.courses (id uuid primary key default gen_random_uuid(), category_id uuid references public.course_categories(id), title text not null, slug text not null unique, description text not null, objectives jsonb not null default '[]', requirements jsonb not null default '[]', duration text not null, price numeric(12,2) not null default 0, image_url text, is_published boolean not null default false, is_featured boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.course_schedules (id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade, starts_at timestamptz not null, ends_at timestamptz not null, location text not null, trainer text, max_seats integer not null check (max_seats > 0), available_seats integer not null check (available_seats >= 0), status text not null default 'OPEN', created_at timestamptz not null default now());
create table if not exists public.enrollments (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade, course_id uuid not null references public.courses(id), schedule_id uuid references public.course_schedules(id), status public.enrollment_status not null default 'PENDING', application_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(student_id, schedule_id));
create table if not exists public.certificates (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id), course_id uuid not null references public.courses(id), certificate_number text not null unique, verification_code text not null unique, issue_date date not null default current_date, status text not null default 'VALID');
create table if not exists public.news (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, category text not null, excerpt text not null, content text not null, image_url text, author_id uuid references public.profiles(id), published_at timestamptz, is_published boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.gallery (id uuid primary key default gen_random_uuid(), category text not null, caption text, image_url text not null, created_at timestamptz not null default now());
create table if not exists public.careers (id uuid primary key default gen_random_uuid(), slug text not null unique, job_title text not null, department text not null, location text not null, employment_type text not null, description text not null, requirements jsonb not null default '[]', deadline date, is_published boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.job_applications (id uuid primary key default gen_random_uuid(), career_id uuid references public.careers(id), full_name text not null, email text not null, phone text, cover_message text not null, resume_url text, status text not null default 'NEW', created_at timestamptz not null default now());
create table if not exists public.homecare_services (id uuid primary key default gen_random_uuid(), name text not null unique, description text not null, is_active boolean not null default true);
create table if not exists public.homecare_requests (id uuid primary key default gen_random_uuid(), name text not null, phone text not null, email text, service_id uuid references public.homecare_services(id), preferred_date date, location text not null, message text, status text not null default 'NEW', created_at timestamptz not null default now());
create table if not exists public.contact_messages (id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text, subject text not null, message text not null, status text not null default 'NEW', created_at timestamptz not null default now());
create table if not exists public.partnership_requests (id uuid primary key default gen_random_uuid(), organization_name text not null, contact_person text not null, email text not null, phone text, partnership_type text not null, message text not null, status text not null default 'NEW', created_at timestamptz not null default now());
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, title text not null, message text not null, type text not null default 'SYSTEM', read_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.site_settings (key text primary key, value jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null, entity text not null, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now());

create index if not exists courses_published_idx on public.courses(is_published, is_featured);
create index if not exists schedules_course_idx on public.course_schedules(course_id, starts_at);
create index if not exists enrollments_student_idx on public.enrollments(student_id, status);
create index if not exists notifications_user_idx on public.notifications(user_id, read_at);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'); $$;

-- Every Supabase Auth signup needs a corresponding application profile.  The
-- trigger runs in the database, so it works for browser, dashboard and API signups.
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

-- Repair profiles for any Auth users created before the trigger was installed.
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
alter table public.profiles enable row level security; alter table public.courses enable row level security; alter table public.course_schedules enable row level security; alter table public.enrollments enable row level security; alter table public.certificates enable row level security; alter table public.news enable row level security; alter table public.notifications enable row level security;
create policy "published courses are public" on public.courses for select using (is_published = true or public.is_admin());
create policy "published news are public" on public.news for select using (is_published = true or public.is_admin());
create policy "users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles for update using (id = auth.uid());
drop policy if exists "students create own profile" on public.profiles;
create policy "students create own profile" on public.profiles for insert with check (id = auth.uid() and role = 'STUDENT');
drop policy if exists "admin full access profiles" on public.profiles;
create policy "admin full access profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage courses" on public.courses;
create policy "admin manage courses" on public.courses for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manage schedules" on public.course_schedules;
create policy "admin manage schedules" on public.course_schedules for all using (public.is_admin()) with check (public.is_admin());
create policy "students read own enrollments" on public.enrollments for select using (student_id = auth.uid() or public.is_admin());
create policy "students create own enrollments" on public.enrollments for insert with check (student_id = auth.uid());
drop policy if exists "admin manage enrollments" on public.enrollments;
create policy "admin manage enrollments" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());
create policy "students read own certificates" on public.certificates for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage certificates" on public.certificates;
create policy "admin manage certificates" on public.certificates for all using (public.is_admin()) with check (public.is_admin());
create policy "students read own notifications" on public.notifications for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin manage notifications" on public.notifications;
create policy "admin manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy "schedules are public" on public.course_schedules for select using (true);

create table if not exists public.health (id uuid primary key default gen_random_uuid(), name text not null, status text not null default 'ACTIVE', notes text, created_at timestamptz not null default now());
alter table public.health enable row level security;
create policy "health records are public" on public.health for select using (true);
