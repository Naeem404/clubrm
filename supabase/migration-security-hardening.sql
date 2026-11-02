-- =========================================================================================
-- ClubRM - SECURITY HARDENING (single club, real RBAC)
-- =========================================================================================
--
-- ORDER OF APPLICATION (Supabase Dashboard > SQL Editor, run each file top to bottom):
--   1. migration.sql                  (base schema - CLEAN INSTALL, drops tables!)
--   2. migration-add-tables.sql       (documents / notifications / org_settings, idempotent)
--   3. migration-onboarding-flag.sql  (profiles.onboarding_completed)
--   4. migration-rls-jwt.sql          (legacy - superseded by this file)
--   5. migration-strengthen-rls.sql   (legacy - superseded by this file)
--   6. migration-security-hardening.sql   <-- THIS FILE (must run LAST)
--
-- This file is idempotent: it can be re-run safely at any time. It:
--   * Removes the legacy JWT-claim role sync (roles live ONLY in public.profiles.role).
--   * Drops EVERY existing RLS policy on the app tables (including the half-built
--     organization_id multi-tenancy policies) and recreates a single coherent set.
--     organization_id columns are left in place but are NOT used for authorization.
--   * Adds role helper functions: current_user_role(), has_role(), is_admin(), is_exec(),
--     has_permission() - all SECURITY DEFINER with a pinned search_path.
--   * Locks profiles.role: only President/Administrator (or service role / SQL editor)
--     can change it; every change is validated, guarded against removing the last
--     President/Administrator, and written to public.audit_logs.
--   * Adds RPC public.set_member_role(target_user uuid, new_role text).
--   * Forces new signups to role 'member' (handle_new_user ignores client metadata).
--   * Hardens the "documents" storage bucket.
--
-- Roles: 'President','VP Internal','VP Finance','VP Events','VP External','Marketing',
--        'Executive','Administrator' and 'member' (default for new signups).
--   - "Exec board"  (is_exec)  = President, VP Internal, VP Finance, VP Events,
--                                VP External, Marketing, Administrator
--   - "Admins"      (is_admin) = President, Administrator  (superusers for every table)
--   - 'Executive' (general executive) and 'member' are regular members.
--
-- BOOTSTRAP: if no President/Administrator exists yet, promote one from the SQL editor:
--   update public.profiles set role = 'President' where email = 'you@example.com';
-- (The SQL editor runs without a JWT, which the role guard treats as a service context.)
-- =========================================================================================


-- =========================================================================================
-- 1. REMOVE LEGACY JWT ROLE SYNC (roles are read from public.profiles only)
-- =========================================================================================
drop trigger if exists on_profile_role_change on public.profiles;
drop trigger if exists on_profile_insert_sync_role on public.profiles;
drop function if exists public.sync_profile_role_to_jwt();

-- Strip the stale role key that the legacy trigger copied into auth.users so nothing can
-- accidentally keep trusting it.
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where raw_app_meta_data ? 'role';


-- =========================================================================================
-- 2. AUDIT LOG TABLE
-- =========================================================================================
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,  -- actor
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  changes     jsonb,
  created_at  timestamptz not null default now()
);

-- Tolerate a pre-existing audit_logs table shaped like docs/04_DATABASE_SCHEMA.txt
alter table public.audit_logs add column if not exists user_id uuid;
alter table public.audit_logs add column if not exists entity_id uuid;
alter table public.audit_logs add column if not exists changes jsonb;
alter table public.audit_logs add column if not exists created_at timestamptz not null default now();
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'audit_logs'
               and column_name = 'organization_id' and is_nullable = 'NO') then
    alter table public.audit_logs alter column organization_id drop not null;
  end if;
end $$;

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);


-- =========================================================================================
-- 3. ROLE HELPER FUNCTIONS
-- =========================================================================================

-- All valid values for profiles.role
create or replace function public.allowed_roles()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['President','VP Internal','VP Finance','VP Events','VP External',
               'Marketing','Executive','Administrator','member']::text[]
$$;

-- Caller's role from public.profiles (NULL if not signed in / no profile).
-- SECURITY DEFINER so it can be used inside RLS policies (including on profiles)
-- without recursion.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any (roles), false)
$$;

-- President / Administrator: superusers for every table
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['President','Administrator']::text[])
$$;

-- Executive board (excludes general 'Executive' and 'member')
create or replace function public.is_exec()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['President','VP Internal','VP Finance','VP Events',
                               'VP External','Marketing','Administrator']::text[])
$$;

-- TRUE when running as service_role (server key) or from a direct DB session such as
-- the Supabase SQL editor (no JWT, not coming through PostgREST's 'authenticator').
-- JWT claims are signature-verified by PostgREST, so this cannot be spoofed by clients.
create or replace function public.is_service_context()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or (
           nullif(current_setting('request.jwt.claims', true), '') is null
           and nullif(current_setting('request.jwt.claim.role', true), '') is null
           and session_user not in ('authenticator', 'anon', 'authenticated')
         )
$$;

-- Permission matrix from docs/02_ROLES_AND_PERMISSIONS.txt.
-- President & Administrator are granted everything (product-owner decision).
-- Any signed-in user with a profile (incl. 'member') gets the basic read permissions.
create or replace function public.has_permission(perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text := public.current_user_role();
begin
  if r is null then
    return false;
  end if;
  if r in ('President', 'Administrator') then
    return true;
  end if;

  return coalesce(case perm
    -- basics: everyone with a profile
    when 'dashboard.view'         then true
    when 'tasks.read'             then true
    when 'events.read'            then true
    when 'members.read'           then true
    -- tasks
    when 'tasks.write'            then r in ('VP Internal','VP Events','VP External','Marketing','Executive')
    when 'tasks.assign'           then r in ('VP Internal','VP Events','VP External')
    when 'tasks.delete'           then r in ('VP Internal')
    -- events
    when 'events.write'           then r in ('VP Internal','VP Events')
    when 'events.approve'         then r in ('VP Internal')
    when 'events.delete'          then r in ('VP Internal')
    -- members
    when 'members.write'          then r in ('VP Internal')
    when 'members.invite'         then r in ('VP Internal')
    when 'members.remove'         then r in ('VP Internal')
    -- finance
    when 'budget.read'            then r in ('VP Finance','VP Events','VP External')
    when 'budget.write'           then r in ('VP Finance')
    when 'budget.approve'         then r in ('VP Finance')
    when 'reimbursements.read'    then r in ('VP Finance')
    when 'reimbursements.write'   then r in ('VP Finance')
    when 'reimbursements.approve' then r in ('VP Finance')
    -- sponsorship
    when 'sponsors.read'          then r in ('VP Finance','VP External')
    when 'sponsors.write'         then r in ('VP External')
    when 'sponsors.delete'        then r in ('VP External')
    -- marketing
    when 'marketing.read'         then r in ('Marketing')
    when 'marketing.write'        then r in ('Marketing')
    when 'marketing.approve'      then r in ('Marketing')
    -- reports
    when 'reports.read'           then r in ('VP Internal','VP Finance','VP Events','VP External','Marketing')
    when 'reports.export'         then r in ('VP Finance')
    -- system (admins only - handled above)
    when 'settings.manage'        then false
    when 'audit.view'             then false
    else false
  end, false);
end;
$$;

-- Is the caller one of the task assignees? Assignees hold members.id values (matched to
-- the caller through members.email = profiles.email) or, defensively, auth user ids.
create or replace function public.is_assigned_to_me(assignees text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() is not null
    and (
      auth.uid()::text = any (coalesce(assignees, '{}'::text[]))
      or exists (
        select 1
        from public.members m
        join public.profiles p on lower(p.email) = lower(m.email)
        where p.id = auth.uid()
          and m.id::text = any (coalesce(assignees, '{}'::text[]))
      )
    ),
    false)
$$;

alter function public.update_updated_at_column() set search_path = public;


-- =========================================================================================
-- 4. PROFILES: signup trigger, column protection, role RPC
-- =========================================================================================
alter table public.profiles alter column role set default 'member';

-- New auth user -> profile with role 'member'. Client metadata can only supply a name;
-- any 'role' in raw_user_meta_data is ignored. Idempotent (client may also insert).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
             nullif(new.raw_user_meta_data ->> 'name', ''),
             ''),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guards profiles.id / email / role. Applies to EVERY write path (direct PostgREST
-- update, set_member_role RPC, ...). Role changes are validated and audited here.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service     boolean := public.is_service_context();
  v_caller_role text    := public.current_user_role();
  v_auth_email  text;
  v_admin_roles constant text[] := array['President','Administrator']::text[];
begin
  if tg_op = 'INSERT' then
    if not v_service then
      new.role := 'member';           -- never trust a client-supplied role
      -- direct client inserts only (pg_trigger_depth() > 1 => called from handle_new_user)
      if pg_trigger_depth() <= 1 and new.id is distinct from auth.uid() then
        raise exception 'You can only create your own profile' using errcode = '42501';
      end if;
    end if;
    if new.role is null then
      new.role := 'member';
    end if;
    return new;
  end if;

  -- UPDATE --------------------------------------------------------------------
  if new.id is distinct from old.id and not v_service then
    raise exception 'profiles.id cannot be changed' using errcode = '42501';
  end if;

  if new.email is distinct from old.email and not v_service then
    select u.email into v_auth_email from auth.users u where u.id = old.id;
    if new.email is distinct from v_auth_email then
      raise exception 'profiles.email must match the account email' using errcode = '42501';
    end if;
  end if;

  if new.role is distinct from old.role then
    if not v_service and not (coalesce(v_caller_role, '') = any (v_admin_roles)) then
      raise exception 'Only a President or Administrator can change roles'
        using errcode = '42501';
    end if;

    if new.role is null or not (new.role = any (public.allowed_roles())) then
      raise exception 'Invalid role: %', new.role using errcode = '22023';
    end if;

    if old.role = any (v_admin_roles) and not (new.role = any (v_admin_roles)) then
      if not exists (select 1 from public.profiles p
                     where p.role = any (v_admin_roles) and p.id <> old.id) then
        raise exception 'Cannot remove the last President/Administrator'
          using errcode = 'P0001';
      end if;
    end if;

    insert into public.audit_logs (user_id, action, entity_type, entity_id, changes)
    values (
      auth.uid(),
      'role_change',
      'profile',
      old.id,
      jsonb_build_object(
        'old_role', old.role,
        'new_role', new.role,
        'actor_role', v_caller_role,
        'via', case when v_service then 'service' else 'client' end
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_columns();

-- RPC: change a user's role. Only President/Administrator (or service role).
create or replace function public.set_member_role(target_user uuid, new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service     boolean := public.is_service_context();
  v_caller_role text    := public.current_user_role();
  v_admin_roles constant text[] := array['President','Administrator']::text[];
  v_profile     public.profiles;
begin
  if not v_service then
    if auth.uid() is null then
      raise exception 'Not authenticated' using errcode = '42501';
    end if;
    if not (coalesce(v_caller_role, '') = any (v_admin_roles)) then
      raise exception 'Only a President or Administrator can assign roles'
        using errcode = '42501';
    end if;
  end if;

  if new_role is null or not (new_role = any (public.allowed_roles())) then
    raise exception 'Invalid role: %', new_role using errcode = '22023';
  end if;

  -- Serialize concurrent role changes on admin rows (last-admin race protection)
  perform 1 from public.profiles p where p.role = any (v_admin_roles) for update;

  select * into v_profile from public.profiles p where p.id = target_user for update;
  if not found then
    raise exception 'Profile % not found', target_user using errcode = 'P0002';
  end if;

  if v_profile.role = new_role then
    return v_profile;
  end if;

  if v_profile.role = any (v_admin_roles) and not (new_role = any (v_admin_roles))
     and not exists (select 1 from public.profiles p
                     where p.role = any (v_admin_roles) and p.id <> target_user) then
    raise exception 'Cannot remove the last President/Administrator' using errcode = 'P0001';
  end if;

  -- protect_profile_columns() re-validates and writes the audit_logs entry
  update public.profiles p
     set role = new_role
   where p.id = target_user
  returning * into v_profile;

  return v_profile;
end;
$$;


-- =========================================================================================
-- 5. OWNERSHIP COLUMNS + TRIGGERS
--    owner_id = auth.uid() of the creator; set server-side, cannot be spoofed or changed.
-- =========================================================================================
alter table public.expenses       add column if not exists owner_id uuid default auth.uid();
alter table public.reimbursements add column if not exists owner_id uuid default auth.uid();
alter table public.tasks          add column if not exists owner_id uuid default auth.uid();
alter table public.documents      add column if not exists owner_id uuid default auth.uid();

create or replace function public.set_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() then
    if tg_op = 'INSERT' and new.owner_id is null then
      new.owner_id := auth.uid();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
  else
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists a_set_owner_id on public.expenses;
create trigger a_set_owner_id before insert or update on public.expenses
  for each row execute function public.set_owner_id();
drop trigger if exists a_set_owner_id on public.reimbursements;
create trigger a_set_owner_id before insert or update on public.reimbursements
  for each row execute function public.set_owner_id();
drop trigger if exists a_set_owner_id on public.tasks;
create trigger a_set_owner_id before insert or update on public.tasks
  for each row execute function public.set_owner_id();
drop trigger if exists a_set_owner_id on public.documents;
create trigger a_set_owner_id before insert or update on public.documents
  for each row execute function public.set_owner_id();


-- =========================================================================================
-- 6. APPROVAL / ASSIGNMENT GUARDS
-- =========================================================================================

-- Only holders of TG_ARGV[0] (e.g. 'budget.approve') may set or change status,
-- approved_by or paid_date. Everyone else may only create/edit 'pending' rows.
create or replace function public.enforce_approval_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perm text  := tg_argv[0];
  v_new  jsonb := to_jsonb(new);
  v_old  jsonb;
begin
  if public.is_service_context() or public.has_permission(v_perm) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(v_new ->> 'status', 'pending') <> 'pending'
       or v_new ->> 'approved_by' is not null
       or v_new ->> 'paid_date' is not null then
      raise exception 'Only VP Finance, President or Administrator can approve %', tg_table_name
        using errcode = '42501';
    end if;
    return new;
  end if;

  v_old := to_jsonb(old);
  if (v_new -> 'status')      is distinct from (v_old -> 'status')
     or (v_new -> 'approved_by') is distinct from (v_old -> 'approved_by')
     or (v_new -> 'paid_date')   is distinct from (v_old -> 'paid_date') then
    raise exception 'Only VP Finance, President or Administrator can approve %', tg_table_name
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists b_enforce_approval on public.expenses;
create trigger b_enforce_approval before insert or update on public.expenses
  for each row execute function public.enforce_approval_permission('budget.approve');
drop trigger if exists b_enforce_approval on public.reimbursements;
create trigger b_enforce_approval before insert or update on public.reimbursements
  for each row execute function public.enforce_approval_permission('reimbursements.approve');

-- Re-assigning a task requires tasks.assign (or being the task's creator).
create or replace function public.enforce_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.has_permission('tasks.assign') then
    return new;
  end if;
  if new.assignees is distinct from old.assignees
     and old.owner_id is distinct from auth.uid() then
    raise exception 'You do not have permission to reassign this task' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists b_enforce_task_assignment on public.tasks;
create trigger b_enforce_task_assignment before update on public.tasks
  for each row execute function public.enforce_task_assignment();


-- =========================================================================================
-- 7. RESET: enable RLS, revoke anon, drop EVERY existing policy on app tables
-- =========================================================================================
do $$
declare
  t text;
  r record;
  app_tables constant text[] := array[
    'profiles','members','events','tasks','expenses','reimbursements','income','budgets',
    'sponsors','campaigns','documents','org_settings','notifications','member_invites',
    'event_rsvps','sponsor_contacts','socials','stripe_sessions','audit_logs'
  ];
begin
  foreach t in array app_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon', t);
    end if;
  end loop;

  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename = any (app_tables)
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- audit_logs is append-only through SECURITY DEFINER code
revoke insert, update, delete, truncate on public.audit_logs from authenticated;


-- =========================================================================================
-- 8. POLICIES - core tables
--    Pattern: (select fn()) so Postgres evaluates the helper once per statement.
-- =========================================================================================

-- ---------- PROFILES ----------
create policy "profiles: select (authenticated)" on public.profiles
  for select to authenticated using (true);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and role = 'member');
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
-- no DELETE policy: profiles are removed via auth.users cascade only

-- ---------- AUDIT LOGS ----------
create policy "audit_logs: select (audit.view)" on public.audit_logs
  for select to authenticated using ((select public.has_permission('audit.view')));

-- ---------- MEMBERS ----------
create policy "members: select" on public.members
  for select to authenticated using ((select public.has_permission('members.read')));
create policy "members: insert" on public.members
  for insert to authenticated with check ((select public.has_permission('members.write')));
create policy "members: update" on public.members
  for update to authenticated
  using      ((select public.has_permission('members.write')))
  with check ((select public.has_permission('members.write')));
create policy "members: delete" on public.members
  for delete to authenticated using ((select public.has_permission('members.remove')));

-- ---------- EVENTS ----------
create policy "events: select" on public.events
  for select to authenticated using ((select public.has_permission('events.read')));
create policy "events: insert" on public.events
  for insert to authenticated with check ((select public.has_permission('events.write')));
create policy "events: update" on public.events
  for update to authenticated
  using      ((select public.has_permission('events.write')))
  with check ((select public.has_permission('events.write')));
create policy "events: delete" on public.events
  for delete to authenticated using ((select public.has_permission('events.delete')));

-- ---------- TASKS ----------
create policy "tasks: select" on public.tasks
  for select to authenticated using ((select public.has_permission('tasks.read')));
create policy "tasks: insert" on public.tasks
  for insert to authenticated with check ((select public.has_permission('tasks.write')));
create policy "tasks: update (assigners, assignees, creator)" on public.tasks
  for update to authenticated
  using (
    (select public.has_permission('tasks.assign'))
    or public.is_assigned_to_me(assignees)
    or (owner_id = (select auth.uid()) and (select public.has_permission('tasks.write')))
  )
  with check (
    (select public.has_permission('tasks.assign'))
    or public.is_assigned_to_me(assignees)
    or (owner_id = (select auth.uid()) and (select public.has_permission('tasks.write')))
  );
create policy "tasks: delete" on public.tasks
  for delete to authenticated using ((select public.has_permission('tasks.delete')));

-- ---------- EXPENSES ----------
create policy "expenses: select (finance readers or own)" on public.expenses
  for select to authenticated
  using ((select public.has_permission('budget.read')) or owner_id = (select auth.uid()));
create policy "expenses: insert (finance or own pending)" on public.expenses
  for insert to authenticated
  with check (
    (select public.has_permission('budget.write'))
    or ((select public.current_user_role()) is not null and owner_id = (select auth.uid()))
  );
create policy "expenses: update (finance or own pending)" on public.expenses
  for update to authenticated
  using      ((select public.has_permission('budget.write'))
              or (owner_id = (select auth.uid()) and status = 'pending'))
  with check ((select public.has_permission('budget.write'))
              or (owner_id = (select auth.uid()) and status = 'pending'));
create policy "expenses: delete (finance or own pending)" on public.expenses
  for delete to authenticated
  using ((select public.has_permission('budget.write'))
         or (owner_id = (select auth.uid()) and status = 'pending'));

-- ---------- REIMBURSEMENTS ----------
create policy "reimbursements: select (finance or own)" on public.reimbursements
  for select to authenticated
  using ((select public.has_permission('reimbursements.read')) or owner_id = (select auth.uid()));
create policy "reimbursements: insert (finance or own pending)" on public.reimbursements
  for insert to authenticated
  with check (
    (select public.has_permission('reimbursements.write'))
    or ((select public.current_user_role()) is not null and owner_id = (select auth.uid()))
  );
create policy "reimbursements: update (finance or own pending)" on public.reimbursements
  for update to authenticated
  using      ((select public.has_permission('reimbursements.write'))
              or (owner_id = (select auth.uid()) and status = 'pending'))
  with check ((select public.has_permission('reimbursements.write'))
              or (owner_id = (select auth.uid()) and status = 'pending'));
create policy "reimbursements: delete (finance or own pending)" on public.reimbursements
  for delete to authenticated
  using ((select public.has_permission('reimbursements.write'))
         or (owner_id = (select auth.uid()) and status = 'pending'));

-- ---------- INCOME ----------
create policy "income: select" on public.income
  for select to authenticated using ((select public.has_permission('budget.read')));
create policy "income: insert" on public.income
  for insert to authenticated with check ((select public.has_permission('budget.write')));
create policy "income: update" on public.income
  for update to authenticated
  using      ((select public.has_permission('budget.write')))
  with check ((select public.has_permission('budget.write')));
create policy "income: delete" on public.income
  for delete to authenticated using ((select public.has_permission('budget.write')));

-- ---------- BUDGETS ----------
create policy "budgets: select" on public.budgets
  for select to authenticated using ((select public.has_permission('budget.read')));
create policy "budgets: insert" on public.budgets
  for insert to authenticated with check ((select public.has_permission('budget.write')));
create policy "budgets: update" on public.budgets
  for update to authenticated
  using      ((select public.has_permission('budget.write')))
  with check ((select public.has_permission('budget.write')));
create policy "budgets: delete" on public.budgets
  for delete to authenticated using ((select public.has_permission('budget.write')));

-- ---------- SPONSORS ----------
create policy "sponsors: select" on public.sponsors
  for select to authenticated using ((select public.has_permission('sponsors.read')));
create policy "sponsors: insert" on public.sponsors
  for insert to authenticated with check ((select public.has_permission('sponsors.write')));
create policy "sponsors: update" on public.sponsors
  for update to authenticated
  using      ((select public.has_permission('sponsors.write')))
  with check ((select public.has_permission('sponsors.write')));
create policy "sponsors: delete" on public.sponsors
  for delete to authenticated using ((select public.has_permission('sponsors.delete')));

-- ---------- CAMPAIGNS ----------
create policy "campaigns: select" on public.campaigns
  for select to authenticated using ((select public.has_permission('marketing.read')));
create policy "campaigns: insert" on public.campaigns
  for insert to authenticated with check ((select public.has_permission('marketing.write')));
create policy "campaigns: update" on public.campaigns
  for update to authenticated
  using      ((select public.has_permission('marketing.write')))
  with check ((select public.has_permission('marketing.write')));
create policy "campaigns: delete" on public.campaigns
  for delete to authenticated using ((select public.has_permission('marketing.write')));

-- ---------- DOCUMENTS ----------
create policy "documents: select" on public.documents
  for select to authenticated using ((select public.current_user_role()) is not null);
create policy "documents: insert (exec board)" on public.documents
  for insert to authenticated
  with check ((select public.is_exec()) and owner_id = (select auth.uid()));
create policy "documents: update (admin or uploader)" on public.documents
  for update to authenticated
  using      ((select public.is_admin()) or (owner_id = (select auth.uid()) and (select public.is_exec())))
  with check ((select public.is_admin()) or (owner_id = (select auth.uid()) and (select public.is_exec())));
create policy "documents: delete (admin or uploader)" on public.documents
  for delete to authenticated
  using ((select public.is_admin()) or (owner_id = (select auth.uid()) and (select public.is_exec())));

-- ---------- ORG SETTINGS ----------
create policy "org_settings: select" on public.org_settings
  for select to authenticated using ((select public.current_user_role()) is not null);
create policy "org_settings: insert" on public.org_settings
  for insert to authenticated with check ((select public.has_permission('settings.manage')));
create policy "org_settings: update" on public.org_settings
  for update to authenticated
  using      ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));
create policy "org_settings: delete" on public.org_settings
  for delete to authenticated using ((select public.has_permission('settings.manage')));

-- ---------- NOTIFICATIONS ----------
create policy "notifications: select own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: insert (self or exec board)" on public.notifications
  for insert to authenticated
  with check (user_id is not null and (user_id = (select auth.uid()) or (select public.is_exec())));
create policy "notifications: update own" on public.notifications
  for update to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));


-- =========================================================================================
-- 9. POLICIES - optional tables (exist in database.types.ts but not in these migrations)
-- =========================================================================================
do $opt$
begin
  -- ---------- MEMBER INVITES (VP Internal / admins; only admins may invite above Executive)
  if to_regclass('public.member_invites') is not null then
    execute $p$create policy "member_invites: select" on public.member_invites
      for select to authenticated using ((select public.has_permission('members.invite')))$p$;
    execute $p$create policy "member_invites: insert" on public.member_invites
      for insert to authenticated with check (
        (select public.has_permission('members.invite'))
        and ((select public.is_admin()) or role in ('member','Executive')))$p$;
    execute $p$create policy "member_invites: update" on public.member_invites
      for update to authenticated
      using ((select public.has_permission('members.invite')))
      with check (
        (select public.has_permission('members.invite'))
        and ((select public.is_admin()) or role in ('member','Executive')))$p$;
    execute $p$create policy "member_invites: delete" on public.member_invites
      for delete to authenticated using ((select public.has_permission('members.invite')))$p$;
  end if;

  -- ---------- EVENT RSVPS (event managers; users may RSVP / cancel for their own email)
  if to_regclass('public.event_rsvps') is not null then
    execute $p$create policy "event_rsvps: select" on public.event_rsvps
      for select to authenticated using ((select public.has_permission('events.read')))$p$;
    execute $p$create policy "event_rsvps: insert" on public.event_rsvps
      for insert to authenticated with check (
        (select public.has_permission('events.write'))
        or ((select public.current_user_role()) is not null
            and lower(email) = lower((select auth.email()))))$p$;
    execute $p$create policy "event_rsvps: update" on public.event_rsvps
      for update to authenticated
      using ((select public.has_permission('events.write')))
      with check ((select public.has_permission('events.write')))$p$;
    execute $p$create policy "event_rsvps: delete" on public.event_rsvps
      for delete to authenticated using (
        (select public.has_permission('events.write'))
        or lower(email) = lower((select auth.email())))$p$;
  end if;

  -- ---------- SPONSOR CONTACTS (mirror sponsors)
  if to_regclass('public.sponsor_contacts') is not null then
    execute $p$create policy "sponsor_contacts: select" on public.sponsor_contacts
      for select to authenticated using ((select public.has_permission('sponsors.read')))$p$;
    execute $p$create policy "sponsor_contacts: insert" on public.sponsor_contacts
      for insert to authenticated with check ((select public.has_permission('sponsors.write')))$p$;
    execute $p$create policy "sponsor_contacts: update" on public.sponsor_contacts
      for update to authenticated
      using ((select public.has_permission('sponsors.write')))
      with check ((select public.has_permission('sponsors.write')))$p$;
    execute $p$create policy "sponsor_contacts: delete" on public.sponsor_contacts
      for delete to authenticated using ((select public.has_permission('sponsors.delete')))$p$;
  end if;

  -- ---------- SOCIALS (per-user public profile: anyone signed in can read; owner writes)
  if to_regclass('public.socials') is not null then
    execute $p$create policy "socials: select" on public.socials
      for select to authenticated using ((select public.current_user_role()) is not null)$p$;
    execute $p$create policy "socials: insert own" on public.socials
      for insert to authenticated with check (
        user_id::text = (select auth.uid())::text or (select public.is_admin()))$p$;
    execute $p$create policy "socials: update own" on public.socials
      for update to authenticated
      using      (user_id::text = (select auth.uid())::text or (select public.is_admin()))
      with check (user_id::text = (select auth.uid())::text or (select public.is_admin()))$p$;
    execute $p$create policy "socials: delete own" on public.socials
      for delete to authenticated using (
        user_id::text = (select auth.uid())::text or (select public.is_admin()))$p$;
  end if;

  -- ---------- STRIPE SESSIONS (read own / finance; writes only via service role)
  if to_regclass('public.stripe_sessions') is not null then
    execute $p$create policy "stripe_sessions: select own or finance" on public.stripe_sessions
      for select to authenticated using (
        user_id::text = (select auth.uid())::text
        or (select public.has_permission('budget.read')))$p$;
  end if;
end $opt$;


-- =========================================================================================
-- 10. STORAGE: private "documents" bucket mirroring public.documents rules
--     Upload path convention (documents-page.tsx): "<auth.uid()>/<uuid>.<ext>"
-- =========================================================================================
do $storage$
declare
  r record;
begin
  insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do update set public = false;

  -- drop any previous policies that target the documents bucket
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%''documents''%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;

  execute $p$create policy "documents bucket: select" on storage.objects
    for select to authenticated
    using (bucket_id = 'documents' and (select public.current_user_role()) is not null)$p$;

  execute $p$create policy "documents bucket: insert (exec board, own folder)" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'documents'
      and (select public.is_exec())
      and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;

  execute $p$create policy "documents bucket: update (admin or uploader)" on storage.objects
    for update to authenticated
    using (
      bucket_id = 'documents'
      and ((select public.is_admin())
           or ((select public.is_exec()) and (storage.foldername(name))[1] = (select auth.uid())::text)))
    with check (
      bucket_id = 'documents'
      and ((select public.is_admin())
           or ((select public.is_exec()) and (storage.foldername(name))[1] = (select auth.uid())::text)))$p$;

  execute $p$create policy "documents bucket: delete (admin or uploader)" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'documents'
      and ((select public.is_admin())
           or ((select public.is_exec()) and (storage.foldername(name))[1] = (select auth.uid())::text)))$p$;
exception when others then
  raise warning 'Storage hardening skipped (%). Create the "documents" bucket policies manually in Dashboard > Storage > Policies using the same rules.', sqlerrm;
end $storage$;

-- Optional: enforce size / mime limits at the bucket level (columns exist on newer Supabase)
do $$
begin
  update storage.buckets
     set file_size_limit = 10485760,
         allowed_mime_types = array[
           'application/pdf',
           'application/msword',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
           'application/vnd.ms-excel',
           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'application/vnd.ms-powerpoint',
           'application/vnd.openxmlformats-officedocument.presentationml.presentation',
           'image/jpeg','image/png','image/gif','text/plain'
         ]
   where id = 'documents';
exception when others then
  raise notice 'Bucket limits not applied: %', sqlerrm;
end $$;


-- =========================================================================================
-- 11. FUNCTION PRIVILEGES
-- =========================================================================================
revoke all on function public.allowed_roles()              from public, anon;
revoke all on function public.current_user_role()          from public, anon;
revoke all on function public.has_role(text[])             from public, anon;
revoke all on function public.is_admin()                   from public, anon;
revoke all on function public.is_exec()                    from public, anon;
revoke all on function public.is_service_context()         from public, anon;
revoke all on function public.has_permission(text)         from public, anon;
revoke all on function public.is_assigned_to_me(text[])    from public, anon;
revoke all on function public.set_member_role(uuid, text)  from public, anon;

grant execute on function public.allowed_roles()             to authenticated, service_role;
grant execute on function public.current_user_role()         to authenticated, service_role;
grant execute on function public.has_role(text[])            to authenticated, service_role;
grant execute on function public.is_admin()                  to authenticated, service_role;
grant execute on function public.is_exec()                   to authenticated, service_role;
grant execute on function public.is_service_context()        to authenticated, service_role;
grant execute on function public.has_permission(text)        to authenticated, service_role;
grant execute on function public.is_assigned_to_me(text[])   to authenticated, service_role;
grant execute on function public.set_member_role(uuid, text) to authenticated, service_role;

-- Refresh PostgREST schema cache so the new RPCs are callable immediately
notify pgrst, 'reload schema';


-- =========================================================================================
-- VERIFICATION (run manually)
-- =========================================================================================
-- select tablename, policyname, cmd, roles from pg_policies
--   where schemaname in ('public','storage') order by tablename, cmd;
-- select * from public.profiles where role in ('President','Administrator');  -- must be >= 1
-- select * from public.audit_logs order by created_at desc limit 20;
-- As a signed-in client:  supabase.rpc('current_user_role')
--                         supabase.rpc('set_member_role', { target_user, new_role })
-- =========================================================================================
