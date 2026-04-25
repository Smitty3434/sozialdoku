-- Demo-Fallakten fuer SozialDoku
-- Ausfuehren im Supabase SQL Editor.
-- Voraussetzung: In auth.users und public.nutzer existiert die Demo-Fachkraft test@deinprojekt.de.
-- Das Skript ist idempotent: vorhandene Demo-Akten mit DEMO-2026-* werden vorher entfernt.

begin;

do $$
declare
  v_user_id uuid;
  v_user_name text;
  v_mateo_id bigint;
  v_li_id bigint;
  v_ethan_id bigint;
begin
  select n.id, n.name
    into v_user_id, v_user_name
    from public.nutzer n
    join auth.users au on au.id = n.id
   where au.email = 'test@deinprojekt.de'
   limit 1;

  if v_user_id is null then
    raise exception 'Demo-Fachkraft test@deinprojekt.de wurde nicht ueber auth.users/public.nutzer gefunden. Bitte zuerst den Demo-Nutzer anlegen bzw. einmal einloggen.';
  end if;

  -- Cleanup nur fuer eindeutig markierte Demo-Akten.
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

  insert into klienten
    (name, dob, einrichtung, status, aktenzeichen, created_by)
  values
    ('Mateo Kovačić', '2012-09-14', 'AWO Zentrum Nord', 'aktiv', 'DEMO-2026-MK', v_user_id)
  returning id into v_mateo_id;

  insert into klienten
    (name, dob, einrichtung, status, aktenzeichen, created_by)
  values
    ('Li Wei', '2007-04-22', 'Caritas Sued', 'aktiv', 'DEMO-2026-LW', v_user_id)
  returning id into v_li_id;

  insert into klienten
    (name, dob, einrichtung, status, aktenzeichen, created_by)
  values
    ('Ethan Miller', '2010-11-03', 'Diakonie West', 'aktiv', 'DEMO-2026-EM', v_user_id)
  returning id into v_ethan_id;

  insert into zustaendigkeit_intern (klient_id, nutzer_id, funktion, created_by) values
    (v_mateo_id, v_user_id, 'Fallfuehrende Fachkraft', v_user_id),
    (v_li_id, v_user_id, 'Fallfuehrende Fachkraft', v_user_id),
    (v_ethan_id, v_user_id, 'Fallfuehrende Fachkraft', v_user_id);

  insert into zustaendigkeit_extern
    (klient_id, institution, ansprechperson, funktion, telefon, email, created_by)
  values
    (v_mateo_id, 'ASD Mitte', 'Frau Schneider', 'Zustaendige Sozialarbeiterin ASD', '+49 30 5550201', 'asd-mitte-demo@example.invalid', v_user_id),
    (v_mateo_id, 'Gemeinschaftsschule Nord', 'Herr Albrecht', 'Klassenleitung', '+49 30 5550202', 'schule-nord-demo@example.invalid', v_user_id),
    (v_li_id, 'Jugendberufsagentur Berlin', 'Frau Berger', 'Berufsberatung', '+49 30 5550211', 'jba-demo@example.invalid', v_user_id),
    (v_li_id, 'Bildungstraeger Perspektive GmbH', 'Herr Yilmaz', 'Bewerbungscoaching', '+49 30 5550212', 'coaching-demo@example.invalid', v_user_id),
    (v_ethan_id, 'Kinder- und Jugendgesundheitsdienst', 'Frau Dr. Weber', 'Medizinische Beratung', '+49 30 5550221', 'kjgd-demo@example.invalid', v_user_id),
    (v_ethan_id, 'Familienzentrum West', 'Herr Neumann', 'Gruppenangebot / Freizeit', '+49 30 5550222', 'familienzentrum-demo@example.invalid', v_user_id);

  insert into ziele
    (klient_id, titel, beschreibung, status, startdatum, datum, created_by)
  values
    (v_mateo_id, 'Schulbesuch stabilisieren',
     'Mateo nimmt an mindestens vier von fuenf Schultagen puenktlich am Unterricht teil. Fehlzeiten werden mit Familie, Schule und ASD zeitnah besprochen.',
     'laufend', '2026-02-10', '2026-02-10', v_user_id),
    (v_li_id, 'Bewerbungsprozess verbindlich umsetzen',
     'Li erstellt vollstaendige Bewerbungsunterlagen und bewirbt sich bis Ende Mai auf mindestens drei passende Praktikums- oder Ausbildungsstellen.',
     'laufend', '2026-02-01', '2026-02-01', v_user_id),
    (v_ethan_id, 'Verlaessliche Wochenstruktur aufbauen',
     'Ethan nutzt einen Wochenplan fuer Schule, Termine, Haushalt und Freizeit. Termine werden mindestens einen Tag vorher gemeinsam vorbereitet.',
     'laufend', '2026-03-08', '2026-03-08', v_user_id);

  insert into aufgaben
    (klient_id, titel, beschreibung, status, datum, created_by)
  values
    (v_mateo_id, 'Rueckmeldung Schule einholen', 'Kurzer Austausch mit Klassenleitung zu Anwesenheit, Material und Pausensituation.', 'offen', '2026-04-29', v_user_id),
    (v_mateo_id, 'ASD-Hilfeplangespraech vorbereiten', 'Aktuelle Beobachtungen, Fehlzeitenuebersicht und Zielstand fuer das Gespraech strukturieren.', 'offen', '2026-05-03', v_user_id),
    (v_li_id, 'Lebenslauf finalisieren', 'Lebenslauf mit Li pruefen, Luecken besprechen und PDF-Version ablegen.', 'offen', '2026-04-28', v_user_id),
    (v_li_id, 'Praktikumsbetriebe recherchieren', 'Drei Betriebe im Bereich Lager/Logistik und Einzelhandel vormerken und Kontaktwege klaeren.', 'in_bearbeitung', '2026-05-02', v_user_id),
    (v_ethan_id, 'Wochenplan aktualisieren', 'Plan fuer Schule, Sport, Lernzeit und freie Zeit gemeinsam mit Ethan und Mutter ueberarbeiten.', 'offen', '2026-04-30', v_user_id),
    (v_ethan_id, 'Termin beim KJGD bestaetigen', 'Rueckruf der Mutter abwarten und Termin im Kalender ergaenzen.', 'offen', '2026-05-06', v_user_id);

  insert into dokumentationen
    (klient_id, bereich, datum, titel, inhalt, erstellt_von_name, created_by)
  values
    (v_mateo_id, 'allgemein', '2026-03-12', 'Erstgespraech mit Familie',
     'Im Erstgespraech wurden Schulfehlzeiten, morgendliche Konflikte und die Belastung der Mutter erhoben. Mateo beschreibt Schwierigkeiten beim Aufstehen und Unsicherheit in Pausensituationen. Vereinbart wurde ein niedrigschwelliger Wochenplan mit klaren Morgenroutinen.',
     v_user_name, v_user_id),
    (v_mateo_id, 'bildung_beruf', '2026-03-25', 'Abstimmung mit Schule',
     'Die Klassenleitung berichtet ueber wechselnde Anwesenheit und fehlendes Arbeitsmaterial. Positiv hervorgehoben wurde Mateos Beteiligung in Kleingruppen, wenn Aufgaben klar strukturiert sind. Schule wuenscht regelmaessigen Informationsfluss.',
     v_user_name, v_user_id),
    (v_mateo_id, 'behoerden', '2026-04-09', 'Ruecksprache ASD',
     'Mit dem ASD wurde abgestimmt, dass die Zielsetzung Schulstruktur und familiaere Entlastung in den kommenden sechs Wochen priorisiert wird. Ein Hilfeplangespraech wird fuer Anfang Mai vorbereitet.',
     v_user_name, v_user_id),
    (v_li_id, 'allgemein', '2026-02-06', 'Standortklaerung',
     'Li wirkt motiviert, benoetigt jedoch Unterstuetzung bei der Eingrenzung realistischer Berufswege. Besprochen wurden bisherige Schulerfahrungen, Interessen und Unsicherheiten im Kontakt mit Betrieben.',
     v_user_name, v_user_id),
    (v_li_id, 'bildung_beruf', '2026-03-01', 'Bewerbungsunterlagen begonnen',
     'Lebenslauf und Anschreiben wurden gemeinsam begonnen. Li konnte Staerken in Zuverlaessigkeit, Mehrsprachigkeit und praktischem Arbeiten benennen. Weitere Ueberarbeitung mit konkretem Stellenbezug vereinbart.',
     v_user_name, v_user_id),
    (v_li_id, 'soziales', '2026-04-11', 'Perspektivgespraech',
     'Li beschreibt den Wunsch nach einer Ausbildung mit klaren Arbeitsablaeufen und praktischer Taetigkeit. Die naechsten Schritte werden kleinteilig geplant, um Ueberforderung im Bewerbungsprozess zu vermeiden.',
     v_user_name, v_user_id),
    (v_ethan_id, 'allgemein', '2026-03-11', 'Hausbesuch und Auftragsklaerung',
     'Beim Hausbesuch zeigte sich eine grundsaetzlich kooperative Familiensituation. Hauptthemen sind unregelmaessige Tagesablaeufe, kurzfristige Terminabsagen und fehlende Vorbereitung auf schulische Anforderungen.',
     v_user_name, v_user_id),
    (v_ethan_id, 'soziales', '2026-03-28', 'Alltagsstruktur erarbeitet',
     'Mit Ethan wurde ein uebersichtlicher Wochenplan erstellt. Er reagierte positiv auf visuelle Strukturierung und kurze, erreichbare Tagesziele. Mutter wurde in die Nutzung des Plans einbezogen.',
     v_user_name, v_user_id),
    (v_ethan_id, 'gesundheit', '2026-04-16', 'Terminvorbereitung KJGD',
     'Der anstehende Termin beim KJGD wurde mit Mutter und Ethan vorbereitet. Offene Fragen zu Schlafrhythmus, Konzentration und Belastbarkeit wurden gesammelt und fuer das Gespraech notiert.',
     v_user_name, v_user_id);

  insert into notizen
    (titel, text, farbe, typ, klient_id, tags, pinned, autor, created_by)
  values
    ('Mateo: Morgenroutine beobachten', 'Beim naechsten Kontakt gezielt nach Ablauf vor Schulbeginn fragen. Mutter moechte kurze Checkliste am Kuehlschrank testen.', 'blau', 'team', v_mateo_id, array['schule','struktur','asd'], true, v_user_name, v_user_id),
    ('Li: Bewerbungsmappe', 'PDF-Version erst nach finaler Rechtschreibpruefung versenden. Li moechte eine schlichte Vorlage ohne Foto nutzen.', 'gruen', 'team', v_li_id, array['bewerbung','bildung-beruf'], true, v_user_name, v_user_id),
    ('Ethan: Terminverbindlichkeit', 'Positive Rueckmeldung geben, wenn Ethan Termine selbst in den Wochenplan eintraegt. Reminder am Vortag hat gut funktioniert.', 'gelb', 'team', v_ethan_id, array['alltag','termine'], false, v_user_name, v_user_id);
end $$;

commit;
