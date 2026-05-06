-- Einfacher Kalenderdatei-Import: Herkunft und externe UID fuer Duplikaterkennung merken.

alter table public.termine
  add column if not exists import_source text,
  add column if not exists external_uid text;

create index if not exists termine_external_uid_idx on public.termine (external_uid);
create index if not exists termine_import_source_idx on public.termine (import_source);
