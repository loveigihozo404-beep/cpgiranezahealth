-- CP Giraneza Health security hardening.
-- Run after schema.sql and admin_rls.sql in the Supabase SQL editor.

-- Audit records must be written through a trusted function. The browser cannot
-- choose actor_id, and only administrators may create admin audit records.
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

-- Public verification returns only the information needed to confirm a
-- certificate. It does not expose internal ids, foreign keys, or raw rows.
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
