-- ============================================================
-- CP Giraneza Health — Admin & CMS upgrade (ONE-SHOT MIGRATION)
-- ============================================================
-- Run this ONCE in the Supabase SQL Editor (Dashboard > SQL Editor).
-- It is fully idempotent and safe to re-run. It does NOT delete data.
--
-- Why it is required (this is the real fix for "Bucket not found"):
--   The live database is missing the storage buckets AND several
--   columns/tables that the application already uses:
--     * storage buckets: course-files, certificates, gallery,
--       career-files, profile-images, homecare-files, admission-files
--     * updates: profiles.avatar_path, courses.material_* / cover_*,
--       certificates.file_*, gallery.image_path, job_applications.resume_*,
--       homecare_requests.attachment_*
--     * public.admission_applications (online applications)
--     * public.write_audit_log() / public.verify_certificate()
--   Without the buckets every upload fails with "Bucket not found".
--
-- Contents:
--   PART 1 — File storage: columns + buckets + storage policies
--   PART 2 — Admissions: admission_applications + look-up function
--   PART 3 — Security: audit-log writer + certificate verification
--   PART 4 — CMS: public read access for site content keys
--   PART 5 — Student archive (soft-delete) support
--   PART 6 — Programme "qualification" field
--   PART 7 — ADMIN WRITE + PUBLIC-SUBMIT RLS POLICIES
--            (the real fix for admin "Save failed" / SQLSTATE 42501)
-- ============================================================

-- ============================================================
-- PART 1 — FILE STORAGE
-- ============================================================

alter table public.profiles add column if not exists avatar_path text;
alter table public.courses add column if not exists material_path text;
alter table public.courses add column if not exists material_name text;
alter table public.courses add column if not exists material_type text;
alter table public.courses add column if not exists material_size bigint;
alter table public.courses add column if not exists cover_path text;
alter table public.certificates add column if not exists file_path text;
alter table public.certificates add column if not exists file_name text;
alter table public.certificates add column if not exists file_type text;
alter table public.certificates add column if not exists file_size bigint;
alter table public.gallery add column if not exists image_path text;
alter table public.job_applications add column if not exists resume_path text;
alter table public.job_applications add column if not exists resume_name text;
alter table public.job_applications add column if not exists resume_type text;
alter table public.job_applications add column if not exists resume_size bigint;
alter table public.homecare_requests add column if not exists attachment_path text;
alter table public.homecare_requests add column if not exists attachment_name text;

-- Buckets. "gallery" is public (used for logos/covers/photos with public URLs);
-- every other bucket is private and served through signed URLs.
insert into storage.buckets (id, name, public) values
  ('course-files', 'course-files', false),
  ('certificates', 'certificates', false),
  ('gallery', 'gallery', true),
  ('career-files', 'career-files', false),
  ('profile-images', 'profile-images', false),
  ('homecare-files', 'homecare-files', false),
  ('admission-files', 'admission-files', false)
on conflict (id) do update set public = excluded.public;

create or replace function public.storage_is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_admin(); $$;

drop policy if exists "admin manage file objects" on storage.objects;
create policy "admin manage file objects" on storage.objects for all to authenticated
using (public.storage_is_admin()) with check (public.storage_is_admin());

drop policy if exists "students manage own profile images" on storage.objects;
create policy "students manage own profile images" on storage.objects for all to authenticated
using (bucket_id = 'profile-images' and (name like auth.uid()::text || '/%'))
with check (bucket_id = 'profile-images' and (name like auth.uid()::text || '/%'));

drop policy if exists "students read own certificates" on storage.objects;
create policy "students read own certificates" on storage.objects for select to authenticated
using (bucket_id = 'certificates' and (name like auth.uid()::text || '/%'));

drop policy if exists "students read enrolled course files" on storage.objects;
create policy "students read enrolled course files" on storage.objects for select to authenticated
using (
  bucket_id = 'course-files' and exists (
    select 1 from public.enrollments e
    where e.student_id = auth.uid()
      and e.status in ('APPROVED','COMPLETED')
      and name like e.course_id::text || '/%'
  )
);

drop policy if exists "public read gallery objects" on storage.objects;
create policy "public read gallery objects" on storage.objects for select to anon, authenticated
using (bucket_id = 'gallery');

drop policy if exists "admin read career files" on storage.objects;
create policy "admin read career files" on storage.objects for select to authenticated
using (bucket_id = 'career-files' and public.storage_is_admin());

drop policy if exists "public upload career files" on storage.objects;
create policy "public upload career files" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'career-files' and name like 'job-applications/%');

drop policy if exists "admin read homecare files" on storage.objects;
create policy "admin read homecare files" on storage.objects for select to authenticated
using (bucket_id = 'homecare-files' and public.storage_is_admin());

-- ============================================================
-- PART 2 — ADMISSIONS
-- ============================================================

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

-- Status look-up (reference + email must both match) for /admissions/status.
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

-- Applicant document uploads (Admissions > Required Documents).
drop policy if exists "public upload admission files" on storage.objects;
create policy "public upload admission files" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'admission-files' and name like 'applications/%');

drop policy if exists "admin read admission files" on storage.objects;
create policy "admin read admission files" on storage.objects for select to authenticated
using (bucket_id = 'admission-files' and public.storage_is_admin());

-- ============================================================
-- PART 3 — SECURITY: audit log + certificate verification
-- ============================================================

-- Audit records must be written through a trusted function: the browser
-- cannot choose actor_id, and only administrators may write audit records.
drop policy if exists "authenticated insert audit log" on public.audit_logs;
revoke insert on public.audit_logs from anon, authenticated;

create or replace function public.write_audit_log(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only administrators can write audit logs';
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'));
end;
$$;

revoke all on function public.write_audit_log(text, text, uuid, jsonb) from public;
grant execute on function public.write_audit_log(text, text, uuid, jsonb) to authenticated;

-- Public verification returns only confirmation data, never raw rows.
drop policy if exists "public verify certificate" on public.certificates;
revoke select on public.certificates from anon;
grant select on public.certificates to authenticated;

create or replace function public.verify_certificate(p_code text)
returns table (
  certificate_number text,
  holder_name text,
  course_title text,
  issue_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select c.certificate_number, p.full_name, co.title, c.issue_date
  from public.certificates c
  join public.profiles p on p.id = c.student_id
  join public.courses co on co.id = c.course_id
  where c.status = 'VALID'
    and (c.certificate_number = p_code or c.verification_code = p_code)
  limit 1;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ============================================================
-- PART 4 — CMS: public read access for site content
-- ============================================================
-- Admin-managed page content lives in public.site_settings under the
-- "content.*" and "brand.*" keys. The public website must be able to
-- read those keys; every other setting stays admin-only.

drop policy if exists "public read site content" on public.site_settings;
create policy "public read site content" on public.site_settings
  for select to anon, authenticated
  using (key like 'content.%' or key like 'brand.%');

-- ============================================================
-- PART 5 — Student archive (soft-delete) support
-- ============================================================
-- Deleting a student is destructive; administrators archive instead.
-- Permanent deletion stays possible but is explicit and admin-only.

alter table public.profiles add column if not exists is_archived boolean not null default false;
create index if not exists profiles_archived_idx on public.profiles (is_archived);

-- ============================================================
-- PART 6 — Programme qualification field
-- ============================================================

alter table public.courses add column if not exists qualification text;

-- ============================================================
-- PART 7 — ADMIN WRITE + PUBLIC-SUBMIT RLS POLICIES
-- ============================================================
-- ROOT CAUSE of "Save failed": on the live project these tables have
-- Row-Level-Security ENABLED but NO admin write policy, so INSERT/UPDATE/
-- DELETE is rejected with SQLSTATE 42501 "new row violates row-level
-- security policy" even though is_admin() is true. The application code is
-- correct; these database policies were simply never applied. This section
-- (re)applies them idempotently. Policy names match admin_rls.sql so the
-- two files never conflict.

-- Robust helper. upper(role::text) is safe for text OR enum roles and
-- guards against any casing drift between the app and the database.
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and upper(role::text) = 'ADMIN'
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ── Admin full control over every content / management table ──────────────
alter table public.site_settings         enable row level security;
alter table public.news                  enable row level security;
alter table public.gallery               enable row level security;
alter table public.careers               enable row level security;
alter table public.homecare_services     enable row level security;
alter table public.course_categories     enable row level security;
alter table public.job_applications      enable row level security;
alter table public.homecare_requests     enable row level security;
alter table public.contact_messages      enable row level security;
alter table public.partnership_requests  enable row level security;
alter table public.audit_logs            enable row level security;

drop policy if exists "admin manage site settings" on public.site_settings;
create policy "admin manage site settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage news" on public.news;
create policy "admin manage news" on public.news
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage gallery" on public.gallery;
create policy "admin manage gallery" on public.gallery
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage careers" on public.careers;
create policy "admin manage careers" on public.careers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage homecare services" on public.homecare_services;
create policy "admin manage homecare services" on public.homecare_services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage categories" on public.course_categories;
create policy "admin manage categories" on public.course_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage job applications" on public.job_applications;
create policy "admin manage job applications" on public.job_applications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage homecare requests" on public.homecare_requests;
create policy "admin manage homecare requests" on public.homecare_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage contact messages" on public.contact_messages;
create policy "admin manage contact messages" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage partnership requests" on public.partnership_requests;
create policy "admin manage partnership requests" on public.partnership_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Audit feed is readable by admins; writes still go through write_audit_log().
drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ── Public "submit a form" inserts the site's Contact / Careers / Home Care ─
--    / Partnership pages rely on. These were also missing on the live project.
drop policy if exists "public insert job application" on public.job_applications;
create policy "public insert job application" on public.job_applications
  for insert to anon, authenticated with check (true);

drop policy if exists "public insert homecare request" on public.homecare_requests;
create policy "public insert homecare request" on public.homecare_requests
  for insert to anon, authenticated with check (true);

drop policy if exists "public insert contact message" on public.contact_messages;
create policy "public insert contact message" on public.contact_messages
  for insert to anon, authenticated with check (true);

drop policy if exists "public insert partnership request" on public.partnership_requests;
create policy "public insert partnership request" on public.partnership_requests
  for insert to anon, authenticated with check (true);

-- Make PostgREST reload its schema cache so the new tables, columns and
-- policies above are recognised by the API immediately (fixes stale
-- "PGRST205 could not find the table" for admission_applications too).
notify pgrst, 'reload schema';

-- ============================================================
-- Done. After running this:
--   1. Refresh the app (Ctrl+F5).
--   2. Test an upload in Admissions > Application > Required Documents.
--   3. Uploads are stored in the private "admission-files" bucket and
--      reviewed by admins in Admin Portal > Documents.
-- ============================================================
