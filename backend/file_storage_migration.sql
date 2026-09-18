-- CP Giraneza Health file storage migration
-- Run after schema.sql with the Supabase SQL editor.

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

insert into storage.buckets (id, name, public) values
  ('course-files', 'course-files', false),
  ('certificates', 'certificates', false),
  ('gallery', 'gallery', true),
  ('career-files', 'career-files', false),
  ('profile-images', 'profile-images', false),
  ('homecare-files', 'homecare-files', false)
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
