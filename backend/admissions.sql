-- ============================================================
-- CP Giraneza Health — Admissions backend (optional)
-- Run this in the Supabase SQL Editor after schema.sql and
-- admin_rls.sql. It is fully idempotent and safe to re-run.
--
-- What it enables:
--   1. public.admission_applications  — online applications submitted
--      through /admissions/apply.
--   2. storage bucket "admission-files" — applicant document uploads.
--   3. public.lookup_admission_application() — secure status look-up
--      used by /admissions/status (reference + email must both match).
--
-- Until this migration is applied, the Admissions section keeps working:
-- applications are stored on the applicant's device and a clear notice
-- explains that online tracking is not yet connected.
-- ============================================================

-- ── Applications table ────────────────────────────────────────────────────
create table if not exists public.admission_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  sex text,
  nationality text,
  residence text,
  address text,
  education_level text,
  institution text,
  graduation_year text,
  languages text,
  personal_statement text,
  first_choice_id uuid references public.courses(id) on delete set null,
  first_choice_title text,
  second_choice_id uuid references public.courses(id) on delete set null,
  second_choice_title text,
  documents jsonb not null default '[]',
  status text not null default 'SUBMITTED'
    check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFO_REQUIRED','ACCEPTED','REJECTED')),
  status_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admission_applications_email_idx on public.admission_applications (lower(email));
create index if not exists admission_applications_status_idx on public.admission_applications (status);

-- Keep updated_at accurate whenever the admissions team changes a status.
create or replace function public.touch_admission_application()
returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admission_applications_touch on public.admission_applications;
create trigger admission_applications_touch
  before update on public.admission_applications
  for each row execute procedure public.touch_admission_application();

-- ── Row level security ────────────────────────────────────────────────────
alter table public.admission_applications enable row level security;

drop policy if exists "public insert admission application" on public.admission_applications;
create policy "public insert admission application" on public.admission_applications
  for insert to anon, authenticated with check (true);

drop policy if exists "applicants read own admissions" on public.admission_applications;
create policy "applicants read own admissions" on public.admission_applications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin manage admission applications" on public.admission_applications;
create policy "admin manage admission applications" on public.admission_applications
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Status look-up function (reference + email must both match) ───────────
create or replace function public.lookup_admission_application(p_reference text, p_email text)
returns table (
  reference text,
  full_name text,
  status text,
  status_note text,
  first_choice_title text,
  second_choice_title text,
  submitted_at timestamptz,
  updated_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select a.reference,
         a.full_name,
         a.status,
         a.status_note,
         a.first_choice_title,
         a.second_choice_title,
         a.submitted_at,
         a.updated_at
  from public.admission_applications a
  where upper(a.reference) = upper(trim(p_reference))
    and lower(a.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.lookup_admission_application(text, text) from public;
grant execute on function public.lookup_admission_application(text, text) to anon, authenticated;

-- ── Storage: applicant document uploads ───────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('admission-files', 'admission-files', false)
on conflict (id) do update set public = excluded.public;

create or replace function public.storage_is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_admin(); $$;

drop policy if exists "public upload admission files" on storage.objects;
create policy "public upload admission files" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'admission-files' and name like 'applications/%');

drop policy if exists "admin read admission files" on storage.objects;
create policy "admin read admission files" on storage.objects for select to authenticated
using (bucket_id = 'admission-files' and public.storage_is_admin());

-- ============================================================
-- Managing applications (for the admissions team)
-- ============================================================
-- Review a submission:
--   select reference, full_name, email, status, submitted_at
--   from public.admission_applications order by submitted_at desc;
--
-- Move it through the workflow (the applicant sees this instantly on /admissions/status):
--   update public.admission_applications
--   set status = 'UNDER_REVIEW'
--   where reference = 'CPGH-ADM-2026-XXXXXX';
--
-- Ask for more information (adds a note shown to the applicant):
--   update public.admission_applications
--   set status = 'ADDITIONAL_INFO_REQUIRED',
--       status_note = 'Please send a scanned copy of your A2 certificate.'
--   where reference = 'CPGH-ADM-2026-XXXXXX';
-- ============================================================
