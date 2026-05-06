create table if not exists public.fallakten_freigaben (
  id uuid primary key default gen_random_uuid(),
  klient_id bigint not null references public.klienten(id) on delete cascade,
  nutzer_id uuid not null references public.nutzer(id) on delete cascade,
  darf_ansehen boolean not null default true,
  darf_bearbeiten boolean not null default false,
  created_by uuid references public.nutzer(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (klient_id, nutzer_id)
);

alter table public.fallakten_freigaben enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.nutzer n
    where n.id = auth.uid()
      and n.rolle = 'Admin'
      and coalesce(n.aktiv, true) = true
  );
$$;

create or replace function public.is_leitung()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.nutzer n
    where n.id = auth.uid()
      and n.rolle = 'Leitung'
      and coalesce(n.aktiv, true) = true
  );
$$;

drop policy if exists fallakten_freigaben_select on public.fallakten_freigaben;
create policy fallakten_freigaben_select
on public.fallakten_freigaben
for select
using (
  public.is_admin()
  or public.is_leitung()
  or nutzer_id = auth.uid()
);

drop policy if exists fallakten_freigaben_insert_admin on public.fallakten_freigaben;
create policy fallakten_freigaben_insert_admin
on public.fallakten_freigaben
for insert
with check (public.is_admin());

drop policy if exists fallakten_freigaben_update_admin on public.fallakten_freigaben;
create policy fallakten_freigaben_update_admin
on public.fallakten_freigaben
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists fallakten_freigaben_delete_admin on public.fallakten_freigaben;
create policy fallakten_freigaben_delete_admin
on public.fallakten_freigaben
for delete
using (public.is_admin());

