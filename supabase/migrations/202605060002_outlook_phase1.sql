-- Outlook-Kalender Phase 1: App -> Outlook vorbereiten.
-- Keine Zwei-Wege-Synchronisation, keine Webhooks.

alter table public.termine
  add column if not exists outlook_sync_requested boolean not null default false,
  add column if not exists outlook_sync_status text not null default 'none',
  add column if not exists outlook_event_id text,
  add column if not exists outlook_calendar_id text,
  add column if not exists outlook_synced_at timestamptz,
  add column if not exists outlook_sync_error text;

alter table public.termine
  drop constraint if exists termine_outlook_sync_status_check;

alter table public.termine
  add constraint termine_outlook_sync_status_check
  check (outlook_sync_status in ('none', 'pending', 'synced', 'failed'));

create table if not exists public.outlook_connections (
  user_id uuid primary key references public.nutzer(id) on delete cascade,
  microsoft_user_id text,
  email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outlook_connections enable row level security;

-- Bewusst keine Frontend-Select-Policy: Tokens duerfen nicht ueber den anon Client lesbar sein.
-- Edge Functions greifen mit Service Role zu und koennen spaeter sichere Metadaten-Endpunkte anbieten.

create or replace function public.outlook_connections_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists outlook_connections_set_updated_at on public.outlook_connections;
create trigger outlook_connections_set_updated_at
before update on public.outlook_connections
for each row execute function public.outlook_connections_set_updated_at();
