-- =========================================================================================
-- ClubRM — Multi-tenancy, Public RSVPs, and Member Invites
-- Run this in Supabase SQL Editor AFTER the prior migrations.
-- This migration is idempotent: safe to re-run.
-- =========================================================================================

-- 1. Add `organization_id` to every tenant-scoped table.
--    We use the auth user's id as the implicit org id for single-user clubs.
--    A future "organizations" table can be introduced without changing this column.
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'organization_id') then
    alter table public.profiles add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'members' and column_name = 'organization_id') then
    alter table public.members add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'members' and column_name = 'created_by') then
    alter table public.members add column created_by uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'events' and column_name = 'organization_id') then
    alter table public.events add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'organization_id') then
    alter table public.tasks add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'organization_id') then
    alter table public.expenses add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'reimbursements' and column_name = 'organization_id') then
    alter table public.reimbursements add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'income' and column_name = 'organization_id') then
    alter table public.income add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'budgets' and column_name = 'organization_id') then
    alter table public.budgets add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'sponsors' and column_name = 'organization_id') then
    alter table public.sponsors add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'campaigns' and column_name = 'organization_id') then
    alter table public.campaigns add column organization_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'documents' and column_name = 'organization_id') then
    alter table public.documents add column organization_id uuid;
  end if;
end $$;

-- 2. Indexes for fast tenant filtering.
create index if not exists idx_members_org        on public.members        (organization_id);
create index if not exists idx_events_org         on public.events         (organization_id);
create index if not exists idx_tasks_org          on public.tasks          (organization_id);
create index if not exists idx_expenses_org       on public.expenses       (organization_id);
create index if not exists idx_reimbursements_org on public.reimbursements (organization_id);
create index if not exists idx_income_org         on public.income         (organization_id);
create index if not exists idx_budgets_org        on public.budgets        (organization_id);
create index if not exists idx_sponsors_org       on public.sponsors       (organization_id);
create index if not exists idx_campaigns_org      on public.campaigns      (organization_id);
create index if not exists idx_documents_org      on public.documents      (organization_id);

-- 3. Public event RSVPs (anonymous can write through a narrow policy).
create table if not exists public.event_rsvps (
  id uuid not null default gen_random_uuid() primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_name text not null,
  attendee_email text not null,
  guests integer not null default 0 check (guests >= 0 and guests <= 10),
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','waitlisted')),
  created_at timestamptz not null default now()
);

create index if not exists idx_event_rsvps_event on public.event_rsvps (event_id);
create index if not exists idx_event_rsvps_email on public.event_rsvps (attendee_email);

alter table public.event_rsvps enable row level security;

do $$ begin
  -- Anyone (anon + authenticated) can submit an RSVP for a PUBLIC event.
  if not exists (select 1 from pg_policies where tablename = 'event_rsvps' and policyname = 'Public can submit RSVPs') then
    create policy "Public can submit RSVPs" on public.event_rsvps
      for insert
      with check (
        exists (
          select 1 from public.events e
          where e.id = event_id and coalesce(e.is_public, true) = true
        )
      );
  end if;

  -- Organisers (the org that owns the event) can read every RSVP for it.
  if not exists (select 1 from pg_policies where tablename = 'event_rsvps' and policyname = 'Org members can view RSVPs') then
    create policy "Org members can view RSVPs" on public.event_rsvps
      for select
      using (
        exists (
          select 1 from public.events e
          where e.id = event_id
            and (e.organization_id = auth.uid() or e.created_by = auth.uid()::text)
        )
      );
  end if;

  -- Organisers can manage (cancel / update) RSVPs for their own events.
  if not exists (select 1 from pg_policies where tablename = 'event_rsvps' and policyname = 'Org members can update RSVPs') then
    create policy "Org members can update RSVPs" on public.event_rsvps
      for update
      using (
        exists (
          select 1 from public.events e
          where e.id = event_id
            and (e.organization_id = auth.uid() or e.created_by = auth.uid()::text)
        )
      );
  end if;
end $$;

-- 4. Member invites (single-use signup links).
create table if not exists public.member_invites (
  id uuid not null default gen_random_uuid() primary key,
  token text not null unique,
  organization_id uuid not null,
  organization_name text,
  role text not null default 'General Executive',
  email text,
  invited_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_member_invites_token on public.member_invites (token);
create index if not exists idx_member_invites_org   on public.member_invites (organization_id);

alter table public.member_invites enable row level security;

do $$ begin
  -- Anyone with the token can resolve the invite (public landing page needs this).
  if not exists (select 1 from pg_policies where tablename = 'member_invites' and policyname = 'Public can read by token') then
    create policy "Public can read by token" on public.member_invites
      for select using (true);
  end if;

  -- Authenticated users can create invites for the org they belong to.
  if not exists (select 1 from pg_policies where tablename = 'member_invites' and policyname = 'Org members can create invites') then
    create policy "Org members can create invites" on public.member_invites
      for insert with check (auth.uid() = invited_by);
  end if;

  -- Anyone can mark their own invite as used (the invite-accept page does this).
  if not exists (select 1 from pg_policies where tablename = 'member_invites' and policyname = 'Anyone can consume by token') then
    create policy "Anyone can consume by token" on public.member_invites
      for update using (true);
  end if;
end $$;

-- 5. Tighten existing RLS on tenant tables.
--    The previous policies were `auth.role() = 'authenticated'` which let any
--    signed-in user read every other club's data. We now require the row's
--    organization_id to match the caller's auth.uid() (the implicit org id).
do $$ begin
  -- MEMBERS
  if exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Authenticated users can view members') then
    drop policy "Authenticated users can view members" on public.members;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Org members can view members') then
    create policy "Org members can view members" on public.members for select
      using (organization_id = auth.uid() or created_by = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Authenticated users can insert members') then
    drop policy "Authenticated users can insert members" on public.members;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Org members can write members') then
    create policy "Org members can write members" on public.members for insert
      with check (organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Authenticated users can update members') then
    drop policy "Authenticated users can update members" on public.members;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Org members can update members') then
    create policy "Org members can update members" on public.members for update
      using (organization_id = auth.uid() or created_by = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Authenticated users can delete members') then
    drop policy "Authenticated users can delete members" on public.members;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'members' and policyname = 'Org members can delete members') then
    create policy "Org members can delete members" on public.members for delete
      using (organization_id = auth.uid() or created_by = auth.uid());
  end if;

  -- EVENTS — public events stay readable, private events tighten down.
  if exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Authenticated users can view events') then
    drop policy "Authenticated users can view events" on public.events;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Public events readable') then
    create policy "Public events readable" on public.events for select
      using (coalesce(is_public, true) = true or organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Authenticated users can insert events') then
    drop policy "Authenticated users can insert events" on public.events;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Org members can write events') then
    create policy "Org members can write events" on public.events for insert
      with check (organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Authenticated users can update events') then
    drop policy "Authenticated users can update events" on public.events;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Org members can update events') then
    create policy "Org members can update events" on public.events for update
      using (organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Authenticated users can delete events') then
    drop policy "Authenticated users can delete events" on public.events;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Org members can delete events') then
    create policy "Org members can delete events" on public.events for delete
      using (organization_id = auth.uid());
  end if;

  -- TASKS
  if exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Authenticated users can view tasks') then
    drop policy "Authenticated users can view tasks" on public.tasks;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Org members can view tasks') then
    create policy "Org members can view tasks" on public.tasks for select
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Authenticated users can insert tasks') then
    drop policy "Authenticated users can insert tasks" on public.tasks;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Org members can write tasks') then
    create policy "Org members can write tasks" on public.tasks for insert
      with check (organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Authenticated users can update tasks') then
    drop policy "Authenticated users can update tasks" on public.tasks;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Org members can update tasks') then
    create policy "Org members can update tasks" on public.tasks for update
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Authenticated users can delete tasks') then
    drop policy "Authenticated users can delete tasks" on public.tasks;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Org members can delete tasks') then
    create policy "Org members can delete tasks" on public.tasks for delete
      using (organization_id = auth.uid() or organization_id is null);
  end if;

  -- SPONSORS
  if exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Authenticated users can view sponsors') then
    drop policy "Authenticated users can view sponsors" on public.sponsors;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Org members can view sponsors') then
    create policy "Org members can view sponsors" on public.sponsors for select
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Authenticated users can insert sponsors') then
    drop policy "Authenticated users can insert sponsors" on public.sponsors;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Org members can write sponsors') then
    create policy "Org members can write sponsors" on public.sponsors for insert
      with check (organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Authenticated users can update sponsors') then
    drop policy "Authenticated users can update sponsors" on public.sponsors;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Org members can update sponsors') then
    create policy "Org members can update sponsors" on public.sponsors for update
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Authenticated users can delete sponsors') then
    drop policy "Authenticated users can delete sponsors" on public.sponsors;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'sponsors' and policyname = 'Org members can delete sponsors') then
    create policy "Org members can delete sponsors" on public.sponsors for delete
      using (organization_id = auth.uid() or organization_id is null);
  end if;

  -- CAMPAIGNS
  if exists (select 1 from pg_policies where tablename = 'campaigns' and policyname = 'Authenticated users can view campaigns') then
    drop policy "Authenticated users can view campaigns" on public.campaigns;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'campaigns' and policyname = 'Org members can view campaigns') then
    create policy "Org members can view campaigns" on public.campaigns for select
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'campaigns' and policyname = 'Authenticated users can insert campaigns') then
    drop policy "Authenticated users can insert campaigns" on public.campaigns;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'campaigns' and policyname = 'Org members can write campaigns') then
    create policy "Org members can write campaigns" on public.campaigns for insert
      with check (organization_id = auth.uid());
  end if;
end $$;

-- 6. Documents are also tenant-scoped. Anyone in the org can view; only the
--    uploader and President can delete. Older "Authenticated users can ..."
--    policies are dropped so they don't shadow these.
do $$ begin
  if exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can view documents') then
    drop policy "Authenticated users can view documents" on public.documents;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Org members can view documents') then
    create policy "Org members can view documents" on public.documents for select
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can insert documents') then
    drop policy "Authenticated users can insert documents" on public.documents;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Org members can write documents') then
    create policy "Org members can write documents" on public.documents for insert
      with check (organization_id = auth.uid());
  end if;
  if exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can update documents') then
    drop policy "Authenticated users can update documents" on public.documents;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Org members can update documents') then
    create policy "Org members can update documents" on public.documents for update
      using (organization_id = auth.uid() or organization_id is null);
  end if;
  if exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can delete documents') then
    drop policy "Authenticated users can delete documents" on public.documents;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Org members can delete documents') then
    create policy "Org members can delete documents" on public.documents for delete
      using (organization_id = auth.uid() or organization_id is null);
  end if;
end $$;

-- =========================================================================================
-- End multi-tenancy migration
-- =========================================================================================
