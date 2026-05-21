-- ============================================
-- ClubRM — ADD NEW TABLES (documents, notifications, org_settings)
-- Run this in Supabase SQL Editor AFTER the initial migration
-- This is safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- DOCUMENTS
create table if not exists public.documents (
  id uuid not null default uuid_generate_v4() primary key,
  name text not null,
  category text not null default 'other',
  type text not null default 'pdf',
  size text not null default '0 KB',
  uploaded_by text not null,
  uploaded_date date not null default current_date,
  last_modified date not null default current_date,
  description text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can view documents') then
    create policy "Authenticated users can view documents" on public.documents for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can insert documents') then
    create policy "Authenticated users can insert documents" on public.documents for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can update documents') then
    create policy "Authenticated users can update documents" on public.documents for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'documents' and policyname = 'Authenticated users can delete documents') then
    create policy "Authenticated users can delete documents" on public.documents for delete using (auth.role() = 'authenticated');
  end if;
end $$;

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid not null default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can view own notifications') then
    create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Authenticated users can insert notifications') then
    create policy "Authenticated users can insert notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can update own notifications') then
    create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id or user_id is null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'Users can delete own notifications') then
    create policy "Users can delete own notifications" on public.notifications for delete using (auth.uid() = user_id or user_id is null);
  end if;
end $$;

-- ORG SETTINGS
create table if not exists public.org_settings (
  id uuid not null default uuid_generate_v4() primary key,
  name text not null default 'ClubRM',
  slug text not null default 'clubrm',
  description text not null default '',
  email text not null default '',
  website text not null default '',
  university text not null default 'York University',
  term text not null default 'Fall 2026',
  timezone text not null default 'America/Toronto',
  notification_prefs jsonb not null default '{}',
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.org_settings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'org_settings' and policyname = 'Authenticated users can view org settings') then
    create policy "Authenticated users can view org settings" on public.org_settings for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'org_settings' and policyname = 'Authenticated users can insert org settings') then
    create policy "Authenticated users can insert org settings" on public.org_settings for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'org_settings' and policyname = 'Authenticated users can update org settings') then
    create policy "Authenticated users can update org settings" on public.org_settings for update using (auth.role() = 'authenticated');
  end if;
end $$;

-- updated_at triggers
drop trigger if exists update_documents_updated_at on public.documents;
create trigger update_documents_updated_at before update on public.documents for each row execute function public.update_updated_at_column();

drop trigger if exists update_org_settings_updated_at on public.org_settings;
create trigger update_org_settings_updated_at before update on public.org_settings for each row execute function public.update_updated_at_column();

-- Seed org settings if empty
insert into public.org_settings (name, slug, description, email, website, university, term, timezone)
select 'ClubRM', 'clubrm', 'A student club relationship management platform at York University.', 'clubrm@yorku.ca', 'https://clubrm.yorku.ca', 'York University', 'Fall 2026', 'America/Toronto'
where not exists (select 1 from public.org_settings limit 1);
