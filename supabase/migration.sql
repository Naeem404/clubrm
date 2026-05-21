-- ============================================
-- ClubRM Database Schema — CLEAN INSTALL
-- Run this in Supabase SQL Editor
-- Drops and recreates ALL app tables
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- DROP existing tables (clean slate)
-- ============================================
drop table if exists public.campaigns cascade;
drop table if exists public.sponsors cascade;
drop table if exists public.budgets cascade;
drop table if exists public.income cascade;
drop table if exists public.reimbursements cascade;
drop table if exists public.expenses cascade;
drop table if exists public.tasks cascade;
drop table if exists public.events cascade;
drop table if exists public.members cascade;
drop table if exists public.profiles cascade;

-- ============================================
-- PROFILES (linked to auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'Executive',
  onboarding_completed boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- MEMBERS
-- ============================================
create table public.members (
  id uuid not null default uuid_generate_v4() primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  role text not null default 'Executive',
  status text not null default 'active',
  join_date date not null default current_date,
  avatar text,
  department text not null default 'Computer Science',
  year text not null default '1st Year',
  tasks_completed integer not null default 0,
  events_attended integer not null default 0,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members enable row level security;
create policy "Authenticated users can view members" on public.members for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert members" on public.members for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update members" on public.members for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete members" on public.members for delete using (auth.role() = 'authenticated');

-- ============================================
-- EVENTS
-- ============================================
create table public.events (
  id uuid not null default uuid_generate_v4() primary key,
  title text not null,
  description text not null default '',
  start_date timestamptz not null,
  end_date timestamptz not null,
  all_day boolean not null default false,
  location text not null default '',
  color_id text not null default 'blue',
  tags text[] not null default '{}',
  collaborators text[] not null default '{}',
  created_by text not null default '',
  capacity integer,
  registered integer,
  is_public boolean not null default true,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "Authenticated users can view events" on public.events for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert events" on public.events for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update events" on public.events for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete events" on public.events for delete using (auth.role() = 'authenticated');

-- ============================================
-- TASKS
-- ============================================
create table public.tasks (
  id uuid not null default uuid_generate_v4() primary key,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  assignees text[] not null default '{}',
  tags text[] not null default '{}',
  due_date timestamptz,
  start_date timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  dependencies text[] not null default '{}',
  subtasks jsonb not null default '[]',
  section text,
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "Authenticated users can view tasks" on public.tasks for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert tasks" on public.tasks for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update tasks" on public.tasks for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete tasks" on public.tasks for delete using (auth.role() = 'authenticated');

-- ============================================
-- EXPENSES
-- ============================================
create table public.expenses (
  id uuid not null default uuid_generate_v4() primary key,
  description text not null,
  amount numeric(10,2) not null,
  category text not null,
  date date not null,
  status text not null default 'pending',
  submitted_by text not null,
  approved_by text,
  receipt_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
create policy "Authenticated users can view expenses" on public.expenses for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert expenses" on public.expenses for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update expenses" on public.expenses for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete expenses" on public.expenses for delete using (auth.role() = 'authenticated');

-- ============================================
-- REIMBURSEMENTS
-- ============================================
create table public.reimbursements (
  id uuid not null default uuid_generate_v4() primary key,
  submitted_by text not null,
  amount numeric(10,2) not null,
  description text not null,
  category text not null,
  date date not null,
  status text not null default 'pending',
  receipt_url text,
  approved_by text,
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reimbursements enable row level security;
create policy "Authenticated users can view reimbursements" on public.reimbursements for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert reimbursements" on public.reimbursements for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update reimbursements" on public.reimbursements for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete reimbursements" on public.reimbursements for delete using (auth.role() = 'authenticated');

-- ============================================
-- INCOME
-- ============================================
create table public.income (
  id uuid not null default uuid_generate_v4() primary key,
  source text not null,
  amount numeric(10,2) not null,
  type text not null,
  date date not null,
  notes text,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.income enable row level security;
create policy "Authenticated users can view income" on public.income for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert income" on public.income for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update income" on public.income for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete income" on public.income for delete using (auth.role() = 'authenticated');

-- ============================================
-- BUDGETS
-- ============================================
create table public.budgets (
  id uuid not null default uuid_generate_v4() primary key,
  total_budget numeric(10,2) not null default 0,
  term_label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.budgets enable row level security;
create policy "Authenticated users can view budgets" on public.budgets for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert budgets" on public.budgets for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update budgets" on public.budgets for update using (auth.role() = 'authenticated');

-- ============================================
-- SPONSORS
-- ============================================
create table public.sponsors (
  id uuid not null default uuid_generate_v4() primary key,
  company text not null,
  logo text,
  tier text not null default 'prospect',
  status text not null default 'prospect',
  amount numeric(10,2) not null default 0,
  start_date date not null,
  end_date date,
  contacts jsonb not null default '[]',
  interactions jsonb not null default '[]',
  notes text,
  industry text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sponsors enable row level security;
create policy "Authenticated users can view sponsors" on public.sponsors for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert sponsors" on public.sponsors for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update sponsors" on public.sponsors for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete sponsors" on public.sponsors for delete using (auth.role() = 'authenticated');

-- ============================================
-- CAMPAIGNS
-- ============================================
create table public.campaigns (
  id uuid not null default uuid_generate_v4() primary key,
  name text not null,
  description text not null default '',
  status text not null default 'draft',
  start_date date not null,
  end_date date not null,
  posts jsonb not null default '[]',
  budget numeric(10,2) not null default 0,
  spent numeric(10,2) not null default 0,
  reach integer not null default 0,
  engagement integer not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;
create policy "Authenticated users can view campaigns" on public.campaigns for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert campaigns" on public.campaigns for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update campaigns" on public.campaigns for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete campaigns" on public.campaigns for delete using (auth.role() = 'authenticated');

-- ============================================
-- updated_at trigger function
-- ============================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_members_updated_at before update on public.members for each row execute function public.update_updated_at_column();
create trigger update_events_updated_at before update on public.events for each row execute function public.update_updated_at_column();
create trigger update_tasks_updated_at before update on public.tasks for each row execute function public.update_updated_at_column();
create trigger update_expenses_updated_at before update on public.expenses for each row execute function public.update_updated_at_column();
create trigger update_reimbursements_updated_at before update on public.reimbursements for each row execute function public.update_updated_at_column();
create trigger update_income_updated_at before update on public.income for each row execute function public.update_updated_at_column();
create trigger update_budgets_updated_at before update on public.budgets for each row execute function public.update_updated_at_column();
create trigger update_sponsors_updated_at before update on public.sponsors for each row execute function public.update_updated_at_column();
create trigger update_campaigns_updated_at before update on public.campaigns for each row execute function public.update_updated_at_column();

-- ============================================
-- DOCUMENTS
-- ============================================
drop table if exists public.documents cascade;
create table public.documents (
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
create policy "Authenticated users can view documents" on public.documents for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert documents" on public.documents for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update documents" on public.documents for update using (auth.role() = 'authenticated');
create policy "Authenticated users can delete documents" on public.documents for delete using (auth.role() = 'authenticated');

-- ============================================
-- NOTIFICATIONS
-- ============================================
drop table if exists public.notifications cascade;
create table public.notifications (
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
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id or user_id is null);
create policy "Authenticated users can insert notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id or user_id is null);
create policy "Users can delete own notifications" on public.notifications for delete using (auth.uid() = user_id or user_id is null);

-- ============================================
-- ORG SETTINGS
-- ============================================
drop table if exists public.org_settings cascade;
create table public.org_settings (
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
create policy "Authenticated users can view org settings" on public.org_settings for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert org settings" on public.org_settings for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update org settings" on public.org_settings for update using (auth.role() = 'authenticated');

create trigger update_documents_updated_at before update on public.documents for each row execute function public.update_updated_at_column();
create trigger update_org_settings_updated_at before update on public.org_settings for each row execute function public.update_updated_at_column();

-- ============================================
-- Seed budget
-- ============================================
insert into public.budgets (total_budget, term_label) values (18000, 'Fall 2026');

-- Seed org settings
insert into public.org_settings (name, slug, description, email, website, university, term, timezone)
values ('ClubRM', 'clubrm', 'A student club relationship management platform at York University.', 'clubrm@yorku.ca', 'https://clubrm.yorku.ca', 'York University', 'Fall 2026', 'America/Toronto');
