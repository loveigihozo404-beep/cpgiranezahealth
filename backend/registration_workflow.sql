-- Apply after schema.sql/auth_fix.sql in Supabase SQL Editor.
-- Enables the user registration -> admin review -> notification workflow.

-- A signed-in user can update only their own profile details. Administrators
-- retain full profile access through the existing admin policy.
drop policy if exists "students create own profile" on public.profiles;
create policy "students create own profile" on public.profiles
  for insert with check (id = auth.uid() and role = 'STUDENT');

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and (role = 'STUDENT' or public.is_admin()));

-- Administrators can review enrollment requests and create status notifications.
drop policy if exists "admin manage enrollments" on public.enrollments;
create policy "admin manage enrollments" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manage notifications" on public.notifications;
create policy "admin manage notifications" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());
