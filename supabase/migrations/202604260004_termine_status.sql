-- Terminstatus fuer Kalenderansicht und direkte Bearbeitung.

alter table public.termine
  add column if not exists status text not null default 'geplant';

update public.termine
   set status = 'geplant'
 where status is null
    or status not in ('geplant', 'erledigt', 'abgesagt');

alter table public.termine
  alter column status set default 'geplant',
  alter column status set not null;

alter table public.termine
  drop constraint if exists termine_status_check;

alter table public.termine
  add constraint termine_status_check
  check (status in ('geplant', 'erledigt', 'abgesagt'));

drop policy if exists termine_update_authenticated on public.termine;

create policy termine_update_authenticated
  on public.termine
  for update
  to authenticated
  using (
    exists (
      select 1
        from public.nutzer n
       where n.id = auth.uid()
         and n.rolle in ('Admin', 'Leitung')
    )
    or (
      klient_id is null
      and created_by = auth.uid()
    )
    or (
      klient_id is not null
      and (
        exists (
          select 1
            from public.zustaendigkeit_intern zi
           where zi.klient_id = termine.klient_id
             and zi.nutzer_id = auth.uid()
        )
        or exists (
          select 1
            from public.fallakten_freigaben ff
           where ff.klient_id = termine.klient_id
             and ff.nutzer_id = auth.uid()
             and ff.darf_bearbeiten = true
        )
      )
    )
  )
  with check (
    status in ('geplant', 'erledigt', 'abgesagt')
    and (
      exists (
        select 1
          from public.nutzer n
         where n.id = auth.uid()
           and n.rolle in ('Admin', 'Leitung')
      )
      or (
        klient_id is null
        and created_by = auth.uid()
      )
      or (
        klient_id is not null
        and (
          exists (
            select 1
              from public.zustaendigkeit_intern zi
             where zi.klient_id = termine.klient_id
               and zi.nutzer_id = auth.uid()
          )
          or exists (
            select 1
              from public.fallakten_freigaben ff
             where ff.klient_id = termine.klient_id
               and ff.nutzer_id = auth.uid()
               and ff.darf_bearbeiten = true
          )
        )
      )
    )
  );
