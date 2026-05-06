-- Outlook Phase 1b: OAuth-State und Provider-Metadaten fuer den sicheren Connect-Flow.

alter table public.outlook_connections
  add column if not exists provider text not null default 'microsoft',
  add column if not exists token_type text,
  add column if not exists last_error text;

create table if not exists public.outlook_oauth_states (
  state text primary key,
  user_id uuid not null references public.nutzer(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

alter table public.outlook_oauth_states enable row level security;

-- Keine Client-Policies: OAuth-State wird ausschliesslich durch Edge Functions mit Service Role genutzt.

create index if not exists outlook_oauth_states_user_idx on public.outlook_oauth_states (user_id);
create index if not exists outlook_oauth_states_expires_idx on public.outlook_oauth_states (expires_at);
