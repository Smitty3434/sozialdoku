-- Aufgabenstatus serverseitig editierbar machen, ohne Fallaktenrechte auszuhebeln.

alter table public.aufgaben
  drop constraint if exists aufgaben_status_check;

alter table public.aufgaben
  add constraint aufgaben_status_check
  check (status in ('offen', 'in_bearbeitung', 'erledigt'));

drop policy if exists aufgaben_update_status_authorized on public.aufgaben;

create policy aufgaben_update_status_authorized
  on public.aufgaben
  for update
  to authenticated
  using (
    public.is_admin()
    or public.is_leitung()
    or exists (
      select 1
        from public.zustaendigkeit_intern zi
       where zi.klient_id = aufgaben.klient_id
         and zi.nutzer_id = auth.uid()
    )
    or exists (
      select 1
        from public.fallakten_freigaben ff
       where ff.klient_id = aufgaben.klient_id
         and ff.nutzer_id = auth.uid()
         and ff.darf_bearbeiten = true
    )
  )
  with check (
    status in ('offen', 'in_bearbeitung', 'erledigt')
    and (
      public.is_admin()
      or public.is_leitung()
      or exists (
        select 1
          from public.zustaendigkeit_intern zi
         where zi.klient_id = aufgaben.klient_id
           and zi.nutzer_id = auth.uid()
      )
      or exists (
        select 1
          from public.fallakten_freigaben ff
         where ff.klient_id = aufgaben.klient_id
           and ff.nutzer_id = auth.uid()
           and ff.darf_bearbeiten = true
      )
    )
  );
