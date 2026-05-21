-- Create stripe_sessions table to track Stripe checkout sessions
create table if not exists stripe_sessions (
  id text primary key,
  user_id text not null,
  stripe_session_id text not null,
  amount numeric not null,
  source text not null,
  category text not null,
  status text not null default 'pending',
  payment_intent_id text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Add indexes for common queries
create index if not exists idx_stripe_sessions_user_id on stripe_sessions(user_id);
create index if not exists idx_stripe_sessions_stripe_session_id on stripe_sessions(stripe_session_id);
create index if not exists idx_stripe_sessions_status on stripe_sessions(status);

-- Add RLS policies
alter table stripe_sessions enable row level security;

-- Users can read their own stripe sessions
create policy "Users can view own stripe sessions"
  on stripe_sessions for select
  using (auth.uid()::text = user_id);

-- Users can insert their own stripe sessions
create policy "Users can insert own stripe sessions"
  on stripe_sessions for insert
  with check (auth.uid()::text = user_id);

-- Service role can update all stripe sessions (for webhooks)
create policy "Service role can update stripe sessions"
  on stripe_sessions for update
  using (true);

-- Service role can insert all stripe sessions (for webhooks)
create policy "Service role can insert stripe sessions"
  on stripe_sessions for insert
  with check (true);
