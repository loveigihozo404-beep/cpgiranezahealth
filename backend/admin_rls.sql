-- ============================================================
-- CP Giraneza Health — Admin RLS Policies & Provisioning
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Enable RLS on all tables ──────────────────────────────────────────────
alter table public.gallery enable row level security;
alter table public.careers enable row level security;
alter table public.job_applications enable row level security;
alter table public.homecare_services enable row level security;
alter table public.homecare_requests enable row level security;
alter table public.contact_messages enable row level security;
alter table public.partnership_requests enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.course_categories enable row level security;

-- ── is_admin() helper (idempotent) ────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- ── profiles ──────────────────────────────────────────────────────────────
drop policy if exists "admin full access profiles" on public.profiles;
create policy "admin full access profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin insert profiles" on public.profiles;
create policy "admin insert profiles" on public.profiles
  for insert with check (public.is_admin());

-- ── courses ───────────────────────────────────────────────────────────────
drop policy if exists "admin manage courses" on public.courses;
create policy "admin manage courses" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- ── course_schedules ──────────────────────────────────────────────────────
drop policy if exists "admin manage schedules" on public.course_schedules;
create policy "admin manage schedules" on public.course_schedules
  for all using (public.is_admin()) with check (public.is_admin());

-- ── enrollments ───────────────────────────────────────────────────────────
drop policy if exists "admin manage enrollments" on public.enrollments;
create policy "admin manage enrollments" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

-- ── certificates ──────────────────────────────────────────────────────────
drop policy if exists "admin manage certificates" on public.certificates;
create policy "admin manage certificates" on public.certificates
  for all using (public.is_admin()) with check (public.is_admin());

-- Public certificate verification (by code, VALID only)
drop policy if exists "public verify certificate" on public.certificates;
create policy "public verify certificate" on public.certificates
  for select using (status = 'VALID');

-- ── news ──────────────────────────────────────────────────────────────────
drop policy if exists "admin manage news" on public.news;
create policy "admin manage news" on public.news
  for all using (public.is_admin()) with check (public.is_admin());

-- ── gallery ───────────────────────────────────────────────────────────────
drop policy if exists "gallery public read" on public.gallery;
create policy "gallery public read" on public.gallery
  for select using (true);

drop policy if exists "admin manage gallery" on public.gallery;
create policy "admin manage gallery" on public.gallery
  for all using (public.is_admin());

-- ── careers ───────────────────────────────────────────────────────────────
drop policy if exists "careers public read" on public.careers;
create policy "careers public read" on public.careers
  for select using (is_published = true or public.is_admin());

drop policy if exists "admin manage careers" on public.careers;
create policy "admin manage careers" on public.careers
  for all using (public.is_admin());

-- ── job_applications ──────────────────────────────────────────────────────
drop policy if exists "public insert job application" on public.job_applications;
create policy "public insert job application" on public.job_applications
  for insert with check (true);

drop policy if exists "admin manage job applications" on public.job_applications;
create policy "admin manage job applications" on public.job_applications
  for all using (public.is_admin());

-- ── homecare_services ─────────────────────────────────────────────────────
drop policy if exists "homecare services public read" on public.homecare_services;
create policy "homecare services public read" on public.homecare_services
  for select using (is_active = true or public.is_admin());

drop policy if exists "admin manage homecare services" on public.homecare_services;
create policy "admin manage homecare services" on public.homecare_services
  for all using (public.is_admin());

-- ── homecare_requests ─────────────────────────────────────────────────────
drop policy if exists "public insert homecare request" on public.homecare_requests;
create policy "public insert homecare request" on public.homecare_requests
  for insert with check (true);

drop policy if exists "admin manage homecare requests" on public.homecare_requests;
create policy "admin manage homecare requests" on public.homecare_requests
  for all using (public.is_admin());

-- ── contact_messages ──────────────────────────────────────────────────────
drop policy if exists "public insert contact message" on public.contact_messages;
create policy "public insert contact message" on public.contact_messages
  for insert with check (true);

drop policy if exists "admin manage contact messages" on public.contact_messages;
create policy "admin manage contact messages" on public.contact_messages
  for all using (public.is_admin());

-- ── partnership_requests ──────────────────────────────────────────────────
drop policy if exists "public insert partnership request" on public.partnership_requests;
create policy "public insert partnership request" on public.partnership_requests
  for insert with check (true);

drop policy if exists "admin manage partnership requests" on public.partnership_requests;
create policy "admin manage partnership requests" on public.partnership_requests
  for all using (public.is_admin());

-- ── notifications ─────────────────────────────────────────────────────────
drop policy if exists "admin manage notifications" on public.notifications;
create policy "admin manage notifications" on public.notifications
  for all using (public.is_admin());

-- ── site_settings ─────────────────────────────────────────────────────────
drop policy if exists "admin manage site settings" on public.site_settings;
create policy "admin manage site settings" on public.site_settings
  for all using (public.is_admin());

-- ── audit_logs ────────────────────────────────────────────────────────────
drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs" on public.audit_logs
  for select using (public.is_admin());

drop policy if exists "authenticated insert audit log" on public.audit_logs;
create policy "authenticated insert audit log" on public.audit_logs
  for insert with check (auth.uid() is not null);

-- ── course_categories ─────────────────────────────────────────────────────
drop policy if exists "categories public read" on public.course_categories;
create policy "categories public read" on public.course_categories
  for select using (true);

drop policy if exists "admin manage categories" on public.course_categories;
create policy "admin manage categories" on public.course_categories
  for all using (public.is_admin());

-- ============================================================
-- ADMIN ACCOUNT PROVISIONING
-- ============================================================
-- Step 1: Create the admin user in Supabase Auth Dashboard
--   Authentication > Users > Invite User
--   Email: use your real admin email (e.g. admin@cpgiranezahealth.rw)
--   OR use the Supabase Auth API / CLI:
--
--   Create the user in the Supabase dashboard or CLI with a strong password
--   stored outside source control, and confirm their email.
--
-- Step 2: After the user is created, run this to set the ADMIN role.
--   Replace the email below with the actual admin email you used.
--
-- UPDATE public.profiles
-- SET role = 'ADMIN', full_name = 'giranezahealth', updated_at = now()
-- WHERE email = 'admin@cpgiranezahealth.rw';
--
-- Step 3: The admin can then log in at /login using their Supabase credentials.
--
-- NEVER store the plaintext password in source code or commit it to git.
-- ============================================================

-- ── Auto-create profile on signup ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, sex, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'sex',
    'STUDENT'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
