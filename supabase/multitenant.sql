-- Multi-tenant: every row belongs to the account that created it, and only
-- that account can see or change it. Applied after supabase/schema.sql.

-- 1. Ownership -------------------------------------------------------------

alter table public.entries
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid();
alter table public.tasks
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid();
alter table public.push_subscriptions
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid();

create index if not exists idx_entries_user on public.entries (user_id);
create index if not exists idx_tasks_user on public.tasks (user_id);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

-- Rows created before there were accounts have no owner. The first account to
-- sign up takes them; after that no ownerless rows exist, so this does nothing.
create or replace function public.claim_ownerless_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.entries set user_id = new.id where user_id is null;
  update public.tasks set user_id = new.id where user_id is null;
  update public.push_subscriptions set user_id = new.id where user_id is null;
  return new;
end;
$$;

revoke execute on function public.claim_ownerless_rows() from public, anon, authenticated;

drop trigger if exists claim_ownerless_rows on auth.users;
create trigger claim_ownerless_rows
  after insert on auth.users
  for each row execute function public.claim_ownerless_rows();

-- 2. Access: signed-in users, own rows only ---------------------------------

drop policy if exists "entries_open_access" on public.entries;
drop policy if exists "entries_owner" on public.entries;
create policy "entries_owner" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.entries from anon;

drop policy if exists "tasks_open_access" on public.tasks;
drop policy if exists "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.tasks from anon;

drop policy if exists "push_subscriptions_open_access" on public.push_subscriptions;
drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon;

-- Only the cron functions below touch the delivery log.
drop policy if exists "push_sent_open_access" on public.push_sent;
revoke all on public.push_sent from anon, authenticated;

-- Uploads need an account; files stay readable through their public URL.
drop policy if exists "agenda_files_upload" on storage.objects;
create policy "agenda_files_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('images', 'audio'));

-- 3. Push registration -----------------------------------------------------

-- A device belongs to whoever is signed in on it now, so this takes the
-- subscription over even when another account registered it before.
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.push_subscriptions (endpoint, p256dh, auth, user_id)
  values (p_endpoint, p_p256dh, p_auth, auth.uid())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id;
end;
$$;

revoke execute on function public.register_push_subscription(text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text) to authenticated;

-- 4. Reminder cron ----------------------------------------------------------

-- The app's /api/push/send has to read every account's items. It has no
-- privileged key, so these functions do it and only answer to a shared secret
-- (PUSH_CRON_SECRET in the app). The secret lives outside the exposed schema:
--   insert into private.app_secrets (name, value) values ('push_cron', '<secret>');
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null
);

create or replace function private.check_push_cron_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or p_secret is distinct from
     (select value from private.app_secrets where name = 'push_cron') then
    raise exception 'forbidden';
  end if;
end;
$$;

create or replace function public.push_cron_data(
  p_secret text,
  p_from timestamptz,
  p_to timestamptz,
  p_date_from date,
  p_date_to date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_push_cron_secret(p_secret);
  return jsonb_build_object(
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'user_id', e.user_id, 'title', e.title,
        'content', e.content, 'reminder_date', e.reminder_date))
      from public.entries e
      where e.is_reminder and e.completed_at is null and e.user_id is not null
        and e.reminder_date > p_from and e.reminder_date <= p_to
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'user_id', t.user_id, 'title', t.title,
        'due_date', t.due_date, 'due_time', t.due_time))
      from public.tasks t
      where t.completed_at is null and t.user_id is not null
        and t.due_date between p_date_from and p_date_to
    ), '[]'::jsonb),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'endpoint', s.endpoint, 'p256dh', s.p256dh,
        'auth', s.auth, 'user_id', s.user_id))
      from public.push_subscriptions s
      where s.user_id is not null
    ), '[]'::jsonb)
  );
end;
$$;

-- True when this reminder had not been recorded yet (so it should be sent).
create or replace function public.push_cron_mark_sent(
  p_secret text,
  p_item_type text,
  p_item_id uuid,
  p_kind text,
  p_target_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  perform private.check_push_cron_secret(p_secret);
  insert into public.push_sent (item_type, item_id, kind, target_at)
  values (p_item_type, p_item_id, p_kind, p_target_at)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted > 0;
end;
$$;

create or replace function public.push_cron_remove_subscription(
  p_secret text,
  p_endpoint text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_push_cron_secret(p_secret);
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.push_cron_data(text, timestamptz, timestamptz, date, date) from public;
revoke execute on function public.push_cron_mark_sent(text, text, uuid, text, timestamptz) from public;
revoke execute on function public.push_cron_remove_subscription(text, text) from public;
grant execute on function public.push_cron_data(text, timestamptz, timestamptz, date, date) to anon, authenticated;
grant execute on function public.push_cron_mark_sent(text, text, uuid, text, timestamptz) to anon, authenticated;
grant execute on function public.push_cron_remove_subscription(text, text) to anon, authenticated;
