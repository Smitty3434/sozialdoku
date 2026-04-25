-- Cleanup fuer SozialDoku Demo-Fallakten
-- Entfernt nur Datensaetze der eindeutig markierten Demo-Aktenzeichen.

begin;

delete from notizen
 where klient_id in (select id from klienten where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM'));

delete from zustaendigkeit_extern
 where klient_id in (select id from klienten where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM'));

delete from zustaendigkeit_intern
 where klient_id in (select id from klienten where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM'));

delete from aufgaben
 where klient_id in (select id from klienten where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM'));

delete from ziele
 where klient_id in (select id from klienten where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM'));

delete from dokumentationen
 where klient_id in (select id from klienten where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM'));

delete from klienten
 where aktenzeichen in ('DEMO-2026-MK', 'DEMO-2026-LW', 'DEMO-2026-EM');

commit;
