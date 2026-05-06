-- Schlanker Audit-/Aenderungsverlauf fuer produktionsnahe Nachvollziehbarkeit.
-- Die App zeigt Metadaten dezent an; die eigentliche Protokollierung passiert serverseitig.

alter table public.dokumentationen
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.eintraege
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.aufgaben
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.ziele
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.termine
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.notizen
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.zustaendigkeit_intern
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.zustaendigkeit_extern
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.fallakten_freigaben
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.nutzer
  add column if not exists created_by uuid references public.nutzer(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.nutzer(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  klient_id bigint references public.klienten(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete')),
  changed_by uuid references public.nutzer(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);

alter table public.audit_log enable row level security;

create index if not exists audit_log_klient_changed_idx on public.audit_log (klient_id, changed_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_changed_by_idx on public.audit_log (changed_by);

create or replace function public.audit_set_update_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create or replace function public.audit_write_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := null;
  v_new jsonb := null;
  v_row jsonb;
  v_action text;
  v_klient_id bigint := null;
  v_changed_by uuid := null;
begin
  if TG_OP = 'INSERT' then
    v_action := 'create';
    v_new := to_jsonb(new);
    v_row := v_new;
  elsif TG_OP = 'UPDATE' then
    if to_jsonb(old) = to_jsonb(new) then
      return new;
    end if;
    v_action := 'update';
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;
  elsif TG_OP = 'DELETE' then
    v_action := 'delete';
    v_old := to_jsonb(old);
    v_row := v_old;
  end if;

  if v_row ? 'klient_id' and nullif(v_row->>'klient_id', '') is not null then
    v_klient_id := (v_row->>'klient_id')::bigint;
  end if;

  v_changed_by := auth.uid();
  if v_changed_by is null and v_new ? 'updated_by' and nullif(v_new->>'updated_by', '') is not null then
    v_changed_by := (v_new->>'updated_by')::uuid;
  end if;
  if v_changed_by is null and v_new ? 'created_by' and nullif(v_new->>'created_by', '') is not null then
    v_changed_by := (v_new->>'created_by')::uuid;
  end if;
  if v_changed_by is null and v_old ? 'updated_by' and nullif(v_old->>'updated_by', '') is not null then
    v_changed_by := (v_old->>'updated_by')::uuid;
  end if;
  if v_changed_by is null and v_old ? 'created_by' and nullif(v_old->>'created_by', '') is not null then
    v_changed_by := (v_old->>'created_by')::uuid;
  end if;

  insert into public.audit_log (
    entity_type,
    entity_id,
    klient_id,
    action,
    changed_by,
    old_values,
    new_values
  ) values (
    TG_TABLE_NAME,
    v_row->>'id',
    v_klient_id,
    v_action,
    v_changed_by,
    v_old,
    v_new
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.audit_install_triggers(p_table regclass)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  execute format('drop trigger if exists audit_set_update_fields on %s', p_table);
  execute format('create trigger audit_set_update_fields before update on %s for each row execute function public.audit_set_update_fields()', p_table);

  execute format('drop trigger if exists audit_write_log on %s', p_table);
  execute format('create trigger audit_write_log after insert or update or delete on %s for each row execute function public.audit_write_log()', p_table);
end;
$$;

select public.audit_install_triggers('public.dokumentationen'::regclass);
select public.audit_install_triggers('public.eintraege'::regclass);
select public.audit_install_triggers('public.aufgaben'::regclass);
select public.audit_install_triggers('public.ziele'::regclass);
select public.audit_install_triggers('public.termine'::regclass);
select public.audit_install_triggers('public.notizen'::regclass);
select public.audit_install_triggers('public.zustaendigkeit_intern'::regclass);
select public.audit_install_triggers('public.zustaendigkeit_extern'::regclass);
select public.audit_install_triggers('public.fallakten_freigaben'::regclass);
select public.audit_install_triggers('public.nutzer'::regclass);

drop function public.audit_install_triggers(regclass);

drop policy if exists audit_log_select_authorized on public.audit_log;
create policy audit_log_select_authorized
on public.audit_log
for select
to authenticated
using (
  public.is_admin()
  or public.is_leitung()
  or changed_by = auth.uid()
  or exists (
    select 1
    from public.zustaendigkeit_intern zi
    where zi.klient_id = audit_log.klient_id
      and zi.nutzer_id = auth.uid()
  )
  or exists (
    select 1
    from public.fallakten_freigaben ff
    where ff.klient_id = audit_log.klient_id
      and ff.nutzer_id = auth.uid()
      and (ff.darf_ansehen = true or ff.darf_bearbeiten = true)
  )
);
