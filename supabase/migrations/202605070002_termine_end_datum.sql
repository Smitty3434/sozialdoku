-- Mehrtaegige Kalenderimporte fachlich korrekt darstellen.
-- DTEND aus ICS-Dateien wird als inklusives Enddatum fuer Terminzeiträume gespeichert.

alter table public.termine
  add column if not exists end_datum date;
