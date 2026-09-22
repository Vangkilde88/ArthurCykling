-- Schema snapshot. The permitted account is configured separately, never in Git.
create schema if not exists private;
revoke all on schema private from public;
create table private.family_accounts (email text primary key);
alter table private.family_accounts enable row level security;
revoke all on private.family_accounts from anon, authenticated;
create function private.family_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from private.family_accounts a
    where a.email = lower(auth.jwt()->>'email')
  );
$$;
revoke all on function private.family_access() from public;
grant usage on schema private to authenticated;
grant execute on function private.family_access() to authenticated;
create table public.family_plans (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  sessions jsonb not null default '[]'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint bounded_sessions check (jsonb_typeof(sessions) = 'array' and jsonb_array_length(sessions) <= 2000 and octet_length(sessions::text) <= 2000000)
);
alter table public.family_plans enable row level security;
revoke all on public.family_plans from anon, authenticated;
grant select, insert, update on public.family_plans to authenticated;
create policy own_plan_read on public.family_plans for select to authenticated
using (owner_id = (select auth.uid()) and (select private.family_access()));
create policy own_plan_create on public.family_plans for insert to authenticated
with check (owner_id = (select auth.uid()) and revision = 0 and (select private.family_access()));
create policy own_plan_edit on public.family_plans for update to authenticated
using (owner_id = (select auth.uid()) and (select private.family_access()))
with check (owner_id = (select auth.uid()) and (select private.family_access()));
create function private.plan_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id or new.revision <> old.revision + 1 then
    raise exception 'Invalid plan revision';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger plan_revision before update on public.family_plans
for each row execute function private.plan_revision();
