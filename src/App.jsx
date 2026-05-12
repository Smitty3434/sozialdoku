import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addMonths, addYears, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isValid, parseISO, startOfDay, startOfMonth, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import { ErrorBoundary } from "react-error-boundary";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Compass,
  FolderOpen,
  GraduationCap,
  HeartPulse,
  Landmark,
  Network,
  RotateCcw,
  StickyNote,
  Target,
  User,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";

// ── Supabase ──────────────────────────────────────────────────────
const SUPABASE_URL = "https://bketznljcsrhufcvszsj.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZXR6bmxqY3NyaHVmY3ZzenNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTU1MDAsImV4cCI6MjA5MjE5MTUwMH0.PVyg8g4sBOKZCt3VFDwVGXO2X1JNbeavBd5ZMaOMx1E";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Fonts ──────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
  return null;
};

// ── Constants ─────────────────────────────────────────────────────
const EINRICHTUNGEN = ["AWO Zentrum Nord", "Caritas Süd", "DRK Mitte", "Diakonie West"];
const ROLLEN = ["Admin", "Leitung", "Fachkraft"];
const ROLLEN_FARBEN = { Admin: { bg: "#f1f5f9", color: "#334155" }, Leitung: { bg: "#e0f2fe", color: "#075985" }, Fachkraft: { bg: "#ecfdf5", color: "#047857" } };
const VORLAGEN = [
  { id: 1, typ: "Fallverlauf", titel: "Erstgespräch", text: "Erstkontakt mit Klient/in hergestellt. Aktuelle Lebenssituation besprochen. Unterstützungsbedarf ermittelt. Nächste Schritte vereinbart." },
  { id: 2, typ: "Fallverlauf", titel: "Verlaufsgespräch", text: "Regelmäßiges Verlaufsgespräch durchgeführt. Aktuelle Situation besprochen. Fortschritte dokumentiert. Hilfeplan überprüft und ggf. angepasst." },
  { id: 3, typ: "Maßnahme", titel: "Hilfeplan erstellt", text: "Individueller Hilfeplan gemeinsam mit Klient/in erarbeitet. Ziele definiert, Maßnahmen festgelegt. Laufzeit: 6 Monate. Nächste Überprüfung vereinbart." },
  { id: 4, typ: "Maßnahme", titel: "Krisenintervention", text: "Akute Krisensituation festgestellt und interveniert. Sicherheit der betroffenen Person gewährleistet. Sofortmaßnahmen eingeleitet. Weiteres Vorgehen abgestimmt." },
  { id: 5, typ: "Stunden", titel: "Begleitung Behördengang", text: "Klient/in zu Behörde begleitet. Erforderliche Unterlagen vorbereitet und eingereicht. Sachverhalt gemeinsam mit Sachbearbeitung besprochen." },
  { id: 6, typ: "Stunden", titel: "Hausbesuch", text: "Hausbesuch durchgeführt. Wohnsituation begutachtet. Unterstützungsbedarf im Haushalt besprochen. Vereinbarungen für weitere Maßnahmen getroffen." },
];
const NOTIZ_FARBEN = {
  gelb:  { bg: "#fefce8", border: "#ca8a04", label: "Gelb" },
  rot:   { bg: "#fff1f2", border: "#be123c", label: "Rot" },
  gruen: { bg: "#f0fdf4", border: "#15803d", label: "Grün" },
  blau:  { bg: "#eff6ff", border: "#1d4ed8", label: "Blau" },
  lila:  { bg: "#f5f3ff", border: "#6d28d9", label: "Lila" },
};
const AUFGABEN_STATUS = ["offen", "in_bearbeitung", "erledigt"];
const TERMIN_STATUS = ["geplant", "erledigt", "abgesagt"];

const FACHBEREICH_LABELS = {
  soziales: "Soziales",
  gesundheit: "Gesundheit",
  bildungBeruf: "Bildung/Beruf",
  finanzen: "Finanzen",
  behoerden: "Behörden",
  freizeit: "Freizeit",
};
const SECTION_ICONS = {
  klient: User,
  aufgaben: CheckSquare,
  intern: UserCheck,
  extern: Network,
  ziele: Target,
  dateien: FolderOpen,
  dokumentation: ClipboardList,
  soziales: Users,
  gesundheit: HeartPulse,
  bildungBeruf: GraduationCap,
  finanzen: WalletCards,
  behoerden: Landmark,
  freizeit: Compass,
  notizen: StickyNote,
  termine: CalendarDays,
};
const FACHBEREICH_FARBEN = {
  soziales: "#0f766e",
  gesundheit: "#64748b",
  bildungBeruf: "#334155",
  finanzen: "#475569",
  behoerden: "#475569",
  freizeit: "#64748b",
};
const normalizeBereichKey = (key) => key === "bildungBeruf" ? "bildung_beruf" : key;
const denormalizeBereichKey = (key) => key === "bildung_beruf" ? "bildungBeruf" : key;
const fachbereichLabel = (key) => FACHBEREICH_LABELS[denormalizeBereichKey(key)] || key;
const fachbereichFarbe = (key) => FACHBEREICH_FARBEN[denormalizeBereichKey(key)] || "#475569";
const createEmptyFallakte = (client = {}) => ({
  klient: {
    telefon: client.telefon || "",
    email: client.email || "",
    beginnHilfe: client.aufnahmedatum || "",
    adresse: [client.adresse, client.plz, client.ort].filter(Boolean).join(", "),
    hilfeart: client.hilfeart || "",
    bezugspersonen: "",
    besondereHinweise: client.anmerkungen || "",
  },
  aufgaben: [],
  intern: [],
  extern: [],
  ziele: [],
  dateien: [],
  fachbereiche: {
    soziales: [],
    gesundheit: [],
    bildungBeruf: [],
    finanzen: [],
    behoerden: [],
    freizeit: [],
  },
});

// ── Helpers ───────────────────────────────────────────────────────
const parseAppDate = (date) => {
  if (!date) return null;
  const parsed = typeof date === "string" ? parseISO(date) : new Date(date);
  return isValid(parsed) ? parsed : null;
};
const ds = (d) => format(d, "yyyy-MM-dd");
const formatDate = (d) => {
  const parsed = parseAppDate(d);
  return parsed ? format(parsed, "dd.MM.yyyy", { locale: de }) : "–";
};
const normalizeLooseDate = (value = "") => {
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;
  const german = String(value).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!german) return "";
  return `${german[3]}-${german[2].padStart(2, "0")}-${german[1].padStart(2, "0")}`;
};
const inferTerminEndDate = (item) => {
  const text = `${item?.titel || item?.title || ""} ${item?.notiz || item?.note || ""}`.trim();
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:-|–|bis)\s*(\d{4}-\d{2}-\d{2})/i);
  if (isoRange) return isoRange[2];
  const germanRange = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})\s*(?:-|–|bis)\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
  if (germanRange) return normalizeLooseDate(germanRange[2]);
  return "";
};
const getTerminEndDate = (item) => item?.endDatum || item?.end_datum || item?.datum_bis || item?.endDate || item?.end_date || inferTerminEndDate(item);
const formatTerminDateRange = (item) => {
  const start = item?.datum;
  const end = getTerminEndDate(item);
  if (!start || !end || start === end) return formatDate(start);
  return `${formatDate(start)} - ${formatDate(end)}`;
};
const formatDateTime = (d) => {
  const parsed = parseAppDate(d);
  return parsed ? format(parsed, "dd.MM.yyyy HH:mm", { locale: de }) : "–";
};
const typeColor = () => "#475569";
const typBg = () => "#f1f5f9";
const rolleStyle = (r) => ROLLEN_FARBEN[r] || { bg: "#f1f5f9", color: "#475569" };
const normalizeRole = (role) => ROLLEN.includes(role) ? role : "Fachkraft";
const mapTermin = (t) => ({ ...t, klientId: t.klient_id, endDatum: getTerminEndDate(t), erinnerung: Boolean(t.erinnerung), status: t.status || "geplant" });
const terminImportKey = (t) => `${String(t.titel || t.title || "").trim().toLowerCase()}|${t.datum || ""}|${(t.uhrzeit || "").slice(0, 5)}`;
const resolveUserName = (id, users = [], currentUser = null, fallback = "Unbekannt") => {
  if (!id) return fallback;
  if (currentUser?.id && String(currentUser.id) === String(id)) return currentUser.name || fallback;
  return users.find(u => String(u.id) === String(id))?.name || fallback;
};
const dayDiff = (date, from = new Date()) => {
  const parsed = parseAppDate(date);
  if (!parsed) return Number.POSITIVE_INFINITY;
  return differenceInCalendarDays(startOfDay(parsed), startOfDay(from));
};
const unfoldIcsLines = (text) => String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").reduce((lines, line) => {
  if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1);
  else lines.push(line);
  return lines;
}, []);
const unescapeIcsText = (value = "") => String(value)
  .replace(/\\n/gi, "\n")
  .replace(/\\,/g, ",")
  .replace(/\\;/g, ";")
  .replace(/\\\\/g, "\\")
  .trim();
const parseIcsDateValue = (value = "") => {
  const raw = String(value).trim();
  const dateMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateMatch) return { datum: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`, uhrzeit: "", allDay: true };
  const dateTimeMatch = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!dateTimeMatch) return { datum: "", uhrzeit: "", allDay: false };
  const [, y, m, d, hh, mm, ss = "00", z] = dateTimeMatch;
  const parsed = z
    ? new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)))
    : new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  return isValid(parsed) ? { datum: ds(parsed), uhrzeit: format(parsed, "HH:mm"), allDay: false } : { datum: "", uhrzeit: "", allDay: false };
};
const parseIcsEndDateValue = (value = "", allDay = false) => {
  const parsed = parseIcsDateValue(value);
  if (!parsed.datum) return "";
  if (allDay && parsed.uhrzeit === "") {
    const inclusiveEnd = new Date(`${parsed.datum}T00:00:00`);
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
    return ds(inclusiveEnd);
  }
  return parsed.datum;
};
const finalizeIcsEvent = (event) => {
  if (!event?.titel || !event?.datum) return null;
  const fallbackEnd = inferTerminEndDate(event);
  const parsedDtEnd = event.dtendRaw ? parseIcsEndDateValue(event.dtendRaw, event.allDay) : "";
  const end_datum = parsedDtEnd || event.end_datum || fallbackEnd || "";
  return {
    ...event,
    end_datum: end_datum && end_datum !== event.datum ? end_datum : null,
  };
};
const parseIcsCalendar = (text) => {
  const lines = unfoldIcsLines(text);
  const events = [];
  let current = null;
  lines.forEach(line => {
    const separator = line.indexOf(":");
    if (separator < 0) return;
    const left = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const prop = left.split(";")[0].toUpperCase();
    if (prop === "BEGIN" && value.toUpperCase() === "VEVENT") {
      current = {};
      return;
    }
    if (prop === "END" && value.toUpperCase() === "VEVENT") {
      const event = finalizeIcsEvent(current);
      if (event) events.push({ ...event, importId: event.external_uid || `${event.titel}-${event.datum}-${event.uhrzeit || ""}-${events.length}` });
      current = null;
      return;
    }
    if (!current) return;
    if (prop === "UID") current.external_uid = unescapeIcsText(value);
    if (prop === "SUMMARY") current.titel = unescapeIcsText(value) || "Importierter Termin";
    if (prop === "LOCATION") current.ort = unescapeIcsText(value);
    if (prop === "DESCRIPTION") current.notiz = unescapeIcsText(value);
    if (prop === "DTSTART") Object.assign(current, parseIcsDateValue(value));
    if (prop === "DTEND") {
      current.dtendRaw = value;
      current.end_datum = parseIcsEndDateValue(value, current.allDay);
    }
  });
  return events;
};

// ── Print / PDF Export ─────────────────────────────────────────────
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char]));
const printValue = (value) => escapeHtml(value || "–");
const printList = (items, render, empty = "Keine Einträge.") => (items || []).length
  ? items.map(render).join("")
  : `<p class="empty">${escapeHtml(empty)}</p>`;

const printFallakte = ({ client, akte, dokumentation, notizen, termine, user }) => {
  const section = (title, body) => `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
  const simpleTable = (rows) => `<table>${rows}</table>`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fallakte ${escapeHtml(client.name)}</title><style>
    @page{margin:18mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;margin:0;padding:32px;font-size:12px;line-height:1.55}
    header{border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:20px}
    h1{font-size:25px;margin:0 0 8px;color:#0f172a}
    h2{font-size:15px;margin:0 0 10px;color:#111827;border-bottom:1px solid #d1d5db;padding-bottom:6px}
    h3{font-size:13px;margin:0 0 4px;color:#1f2937}
    p{margin:0 0 6px}
    .meta{color:#4b5563;font-size:11px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 18px}
    section{break-inside:avoid;page-break-inside:avoid;margin:0 0 18px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    td,th{border-bottom:1px solid #e5e7eb;padding:7px 6px;text-align:left;vertical-align:top}
    th{font-size:10px;text-transform:uppercase;color:#6b7280;background:#f9fafb}
    .record{border:1px solid #e5e7eb;border-radius:6px;padding:9px 10px;margin:8px 0;break-inside:avoid;page-break-inside:avoid}
    .status{display:inline-block;border:1px solid #cbd5e1;border-radius:999px;padding:1px 7px;font-size:10px;color:#334155;background:#f8fafc;margin-left:6px}
    .empty{color:#6b7280;font-style:italic}
    .footer{border-top:1px solid #e5e7eb;margin-top:24px;padding-top:10px;color:#6b7280;font-size:10px}
    @media print{body{padding:0}.no-print{display:none!important}a{color:inherit;text-decoration:none}}
  </style></head><body>
    <header>
      <h1>Fallakte ${escapeHtml(client.name)}</h1>
      <p class="meta">Aktenzeichen ${printValue(client.aktenzeichen)} · ${printValue(client.einrichtung)} · Ausdruck vom ${formatDate(new Date())}${user?.name ? ` · erstellt von ${escapeHtml(user.name)}` : ""}</p>
    </header>
    ${section("Kopfbereich", `<div class="grid">
      <p><strong>Name:</strong> ${printValue(client.name)}</p>
      <p><strong>Geburtsdatum:</strong> ${formatDate(client.dob)}</p>
      <p><strong>Status:</strong> ${printValue(client.status)}</p>
      <p><strong>Einrichtung:</strong> ${printValue(client.einrichtung)}</p>
    </div>`)}
    ${section("Klient", simpleTable(`
      <tr><th>Feld</th><th>Angabe</th></tr>
      <tr><td>Telefon</td><td>${printValue(akte.klient?.telefon)}</td></tr>
      <tr><td>E-Mail</td><td>${printValue(akte.klient?.email)}</td></tr>
      <tr><td>Adresse</td><td>${printValue(akte.klient?.adresse)}</td></tr>
      <tr><td>Beginn Hilfe</td><td>${formatDate(akte.klient?.beginnHilfe)}</td></tr>
      <tr><td>Hilfeart</td><td>${printValue(akte.klient?.hilfeart)}</td></tr>
      <tr><td>Bezugspersonen</td><td>${printValue(akte.klient?.bezugspersonen)}</td></tr>
      <tr><td>Besondere Hinweise</td><td>${printValue(akte.klient?.besondereHinweise)}</td></tr>
    `))}
    ${section("Ziele", printList(akte.ziele, item => `<div class="record"><h3>${escapeHtml(item.titel)} <span class="status">${printValue(item.status)}</span></h3><p class="meta">${formatDate(item.datum)}</p>${item.notiz ? `<p>${escapeHtml(item.notiz)}</p>` : ""}</div>`, "Keine Ziele erfasst."))}
    ${section("Aufgaben", printList(akte.aufgaben, item => `<div class="record"><h3>${escapeHtml(item.titel)} <span class="status">${printValue(item.status)}</span></h3><p class="meta">${formatDate(item.datum)}</p>${item.notiz ? `<p>${escapeHtml(item.notiz)}</p>` : ""}</div>`, "Keine Aufgaben erfasst."))}
    ${section("Zuständigkeit intern", printList(akte.intern, item => `<div class="record"><h3>${escapeHtml(item.name)}</h3><p class="meta">${printValue(item.rolle)}${item.email ? ` · ${escapeHtml(item.email)}` : ""}${item.telefon ? ` · ${escapeHtml(item.telefon)}` : ""}</p></div>`, "Keine internen Zuständigkeiten hinterlegt."))}
    ${section("Zuständigkeit extern", printList(akte.extern, item => `<div class="record"><h3>${escapeHtml(item.name || item.stelle)}</h3><p class="meta">${printValue(item.stelle)}${item.rolle ? ` · ${escapeHtml(item.rolle)}` : ""}${item.email ? ` · ${escapeHtml(item.email)}` : ""}${item.telefon ? ` · ${escapeHtml(item.telefon)}` : ""}</p></div>`, "Keine externen Zuständigkeiten hinterlegt."))}
    ${section("Dokumentation / Fallverlauf", printList(dokumentation, item => `<div class="record"><h3>${escapeHtml(item.titel)}</h3><p class="meta">${formatDate(item.datum)} · ${printValue(item.quelle)} · ${printValue(item.kontaktart)}${item.autor ? ` · ${escapeHtml(item.autor)}` : ""}</p><p>${escapeHtml(item.text)}</p></div>`, "Keine Dokumentation vorhanden."))}
    ${section("Termine", printList(termine, item => `<div class="record"><h3>${escapeHtml(item.titel)} <span class="status">${printValue(item.status)}</span></h3><p class="meta">${formatTerminDateRange(item)} ${escapeHtml(item.uhrzeit || "")}${item.ort ? ` · ${escapeHtml(item.ort)}` : ""}</p>${item.notiz ? `<p>${escapeHtml(item.notiz)}</p>` : ""}</div>`, "Keine Termine vorhanden."))}
    ${section("Notizen zum Klienten", printList(notizen, item => `<div class="record"><h3>${escapeHtml(item.titel)}</h3><p class="meta">${printValue(item.autor)}${item.created_at ? ` · ${formatDate(item.created_at)}` : ""}</p>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`, "Keine Notizen zum Klienten vorhanden."))}
    ${section("Dateien", printList(akte.dateien, item => `<div class="record"><h3>${escapeHtml(item.name)}</h3><p class="meta">${printValue(item.kategorie)} · ${formatDate(item.datum)}${item.size ? ` · ${(item.size / 1024).toFixed(1)} KB` : ""}</p></div>`, "Keine Dateien hinterlegt."))}
    <p class="footer">SozialDoku · Druckansicht enthält nur Inhalte, die in der aktuellen Sitzung sichtbar sind.</p>
    <script>window.onload=function(){window.focus();window.print();}</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
};

// ══════════════════════════════════════════════════════════════════
// MAIN APP — mit Supabase
// ══════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppErrorFallback({ error, resetErrorBoundary }) {
  return (
    <><FontLoader /><style>{globalStyles}</style>
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ ...card, maxWidth: 520, margin: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <SectionIcon name={AlertTriangle} active />
            <h1 style={{ ...cardTitle, margin: 0 }}>Die App konnte nicht vollständig geladen werden</h1>
          </div>
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>Bitte lade die Ansicht neu. Falls der Fehler erneut auftritt, kann die Meldung für die technische Prüfung genutzt werden.</p>
          <pre style={{ maxHeight: 140, overflow: "auto", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, color: "#334155", fontSize: 12 }}>{error?.message || "Unbekannter Fehler"}</pre>
          <button onClick={resetErrorBoundary} style={{ ...btnPrimary, marginTop: 16 }}><RotateCcw size={16} />Erneut versuchen</button>
        </div>
      </div>
    </>
  );
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [detailReturnView, setDetailReturnView] = useState("clients");
  const [clients, setClients] = useState([]);
  const [eintraege, setEintraege] = useState({});
  const [fallakten, setFallakten] = useState({});
  const [fallaktenFreigaben, setFallaktenFreigaben] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [termine, setTermine] = useState([]);
  const [outlookConnection, setOutlookConnection] = useState({ connected: false });
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [outlookRelevantOnly, setOutlookRelevantOnly] = useState(true);
  const [outlookEventsLoading, setOutlookEventsLoading] = useState(false);
  const [outlookEventsError, setOutlookEventsError] = useState("");
  const [notizen, setNotizen] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("alle");
  const [clientEinrichtungFilter, setClientEinrichtungFilter] = useState("alle");
  const [clientInternFilter, setClientInternFilter] = useState("alle");
  const [newEintrag, setNewEintrag] = useState(null);
  const speechRecognitionRef = useRef(null);
  const dictationManuallyStoppedRef = useRef(false);
  const [dictating, setDictating] = useState(false);
  const [dictationStatus, setDictationStatus] = useState("gestoppt");
  const [dictationNotice, setDictationNotice] = useState("");
  const [dictationInterim, setDictationInterim] = useState("");
  const [kiCorrecting, setKiCorrecting] = useState(false);
  const [kiCorrection, setKiCorrection] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notizPanel, setNotizPanel] = useState(false);
  const [kiSettings, setKiSettings] = useState({
    provider: "anthropic",
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "llama3",
    anonymisierung: true,
  });

  const showToast = (msg, color = "#16825a") => { setToast({ msg, color }); setTimeout(() => setToast(null), 2800); };
  const role = normalizeRole(user?.rolle);
  const isAdmin = role === "Admin";
  const isLeitung = role === "Leitung";
  const isFachkraft = role === "Fachkraft";
  const assignedClientIds = new Set(Object.entries(fallakten || {})
    .filter(([, akte]) => (akte.intern || []).some(i => String(i.userId) === String(user?.id)))
    .map(([id]) => String(id)));
  const grantedViewClientIds = new Set(fallaktenFreigaben
    .filter(f => String(f.nutzer_id) === String(user?.id) && (f.darf_ansehen || f.darf_bearbeiten))
    .map(f => String(f.klient_id)));
  const grantedEditClientIds = new Set(fallaktenFreigaben
    .filter(f => String(f.nutzer_id) === String(user?.id) && f.darf_bearbeiten)
    .map(f => String(f.klient_id)));
  const canViewClient = (clientId) => isAdmin || isLeitung || assignedClientIds.has(String(clientId)) || grantedViewClientIds.has(String(clientId));
  const canEditClientContent = (clientId) => isAdmin || isLeitung || (isFachkraft && (assignedClientIds.has(String(clientId)) || grantedEditClientIds.has(String(clientId))));
  const visibleClients = clients.filter(c => canViewClient(c.id));
  const visibleClientIds = new Set(visibleClients.map(c => String(c.id)));
  const visibleTermine = termine.filter(t => !t.klientId || visibleClientIds.has(String(t.klientId)));
  const visibleNotizen = notizen.filter(n => !n.klientId || visibleClientIds.has(String(n.klientId)));
  const canEditTermin = (termin) => termin?.klientId
    ? canEditClientContent(termin.klientId)
    : isAdmin || String(termin?.created_by) === String(user?.id);
  const permissions = {
    role,
    canViewAllCases: isAdmin || isLeitung,
    canManageUsers: isAdmin,
    canUseAdminSettings: isAdmin,
    canCreateClient: isAdmin,
    canManageAssignments: isAdmin || isLeitung,
    canDeleteRecords: isAdmin,
    canDeleteFiles: isAdmin,
  };
  const deny = (message = "Dafür fehlen deiner Rolle die erforderlichen Rechte.") => {
    showToast(message, "#c0392b");
    return false;
  };
  const openClientDetail = (client, returnView = view) => {
    if (!client) return;
    setSelectedClient(client);
    setDetailReturnView(returnView || "clients");
    setView("detail");
  };

  // ── Profil laden ────────────────────────────────────────────────
  const loadUserProfile = async (uid) => {
    const { data } = await supabase.from("nutzer").select("*").eq("id", uid).single();
    if (data) setUser(data);
    setLoading(false);
  };

  const loadAssignedClientIds = async () => {
    if (role !== "Fachkraft") return null;
    const [assignmentsRes, grantsRes] = await Promise.all([
      supabase.from("zustaendigkeit_intern").select("klient_id").eq("nutzer_id", user?.id),
      supabase.from("fallakten_freigaben").select("klient_id,darf_ansehen,darf_bearbeiten").eq("nutzer_id", user?.id),
    ]);
    if (assignmentsRes.error) {
      showToast("Zuständigkeiten konnten nicht geladen werden.", "#c0392b");
      return [];
    }
    const assigned = (assignmentsRes.data || []).map(a => a.klient_id).filter(Boolean);
    const granted = grantsRes.error ? [] : (grantsRes.data || [])
      .filter(f => f.darf_ansehen || f.darf_bearbeiten)
      .map(f => f.klient_id)
      .filter(Boolean);
    return [...new Set([...assigned, ...granted])];
  };

  const loadAuditLogs = async (ids = []) => {
    const cleanIds = ids.filter(Boolean);
    if (!cleanIds.length) {
      setAuditLogs([]);
      return;
    }
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .in("klient_id", cleanIds)
      .order("changed_at", { ascending: false })
      .limit(400);
    if (!error) setAuditLogs(data || []);
  };

  const loadClients = async () => {
    let clientQuery = supabase.from("klienten").select("*").order("name");
    if (role === "Fachkraft") {
      const allowedIds = await loadAssignedClientIds();
      if (!allowedIds.length) {
        setClients([]);
        setEintraege({});
        setFallakten({});
        setAuditLogs([]);
        return;
      }
      clientQuery = clientQuery.in("id", allowedIds);
    }

    const { data, error } = await clientQuery;

    if (error) {
      showToast("Klienten konnten nicht geladen werden.", "#c0392b");
      return;
    }

    const mappedClients = (data || []).map(c => ({
      ...c,
      dob: c.geburtsdatum || c.dob || null,
    }));
    setClients(mappedClients);

    const ids = mappedClients.map(c => c.id);
    if (!ids.length) {
      setEintraege({});
      setFallakten({});
      setAuditLogs([]);
      return;
    }

    const [
      docsRes,
      tasksRes,
      goalsRes,
      internRes,
      externRes,
      filesRes,
    ] = await Promise.all([
      supabase.from("dokumentationen").select("*").in("klient_id", ids).order("datum", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("aufgaben").select("*").in("klient_id", ids).order("datum", { ascending: false }),
      supabase.from("ziele").select("*").in("klient_id", ids).order("datum", { ascending: false }),
      supabase.from("zustaendigkeit_intern").select("*, nutzer:nutzer_id(id,name,rolle)").in("klient_id", ids).order("created_at", { ascending: false }),
      supabase.from("zustaendigkeit_extern").select("*").in("klient_id", ids).order("created_at", { ascending: false }),
      supabase.from("dateien").select("*").in("klient_id", ids).order("datum", { ascending: false }).order("created_at", { ascending: false }),
    ]);

    const byClient = {};
    mappedClients.forEach(c => {
      byClient[c.id] = createEmptyFallakte(c);
    });

    const groupedEntries = {};

    (docsRes.data || []).forEach(d => {
      if (!groupedEntries[d.klient_id]) groupedEntries[d.klient_id] = [];
      groupedEntries[d.klient_id].push({
        id: d.id,
        datum: d.datum,
        typ: d.bereich === "allgemein" ? "Fallverlauf" : fachbereichLabel(d.bereich),
        titel: d.titel,
        text: d.inhalt,
        fachkraft: d.erstellt_von_name || "",
        stunden: null,
        sourceTable: "dokumentationen",
        bereich: d.bereich || "allgemein",
        kontaktart: d.kontaktart || "",
        hashtags: d.hashtags || [],
        nachgetragen: Boolean(d.nachgetragen),
        created_by: d.created_by,
        created_at: d.created_at,
        updated_by: d.updated_by,
        updated_at: d.updated_at,
      });

      if (d.bereich !== "allgemein" && byClient[d.klient_id]) {
        const key = denormalizeBereichKey(d.bereich);
        if (!byClient[d.klient_id].fachbereiche[key]) return;
        byClient[d.klient_id].fachbereiche[key] = [
          {
            id: d.id,
            titel: d.titel,
            text: d.inhalt,
            datum: d.datum,
            autor: d.erstellt_von_name || "",
            bereich: d.bereich || "allgemein",
            kontaktart: d.kontaktart || "",
            hashtags: d.hashtags || [],
            nachgetragen: Boolean(d.nachgetragen),
            created_by: d.created_by,
            created_at: d.created_at,
            updated_by: d.updated_by,
            updated_at: d.updated_at,
          },
          ...(byClient[d.klient_id].fachbereiche[key] || []),
        ];
      }
    });

    (tasksRes.data || []).forEach(t => {
      if (!byClient[t.klient_id]) return;
      byClient[t.klient_id].aufgaben.push({
        id: t.id,
        titel: t.titel,
        status: t.status,
        notiz: t.beschreibung || "",
        datum: t.datum,
        created_by: t.created_by,
        created_at: t.created_at,
        updated_by: t.updated_by,
        updated_at: t.updated_at,
      });
    });

    (goalsRes.data || []).forEach(z => {
      if (!byClient[z.klient_id]) return;
      byClient[z.klient_id].ziele.push({
        id: z.id,
        titel: z.titel,
        status: z.status,
        notiz: z.beschreibung || "",
        datum: z.startdatum || z.datum,
        created_by: z.created_by,
        created_at: z.created_at,
        updated_by: z.updated_by,
        updated_at: z.updated_at,
      });
    });

    (internRes.data || []).forEach(i => {
      if (!byClient[i.klient_id]) return;
      byClient[i.klient_id].intern.push({
        id: i.id,
        userId: i.nutzer_id,
        name: i.nutzer?.name || "",
        rolle: i.funktion || i.nutzer?.rolle || "",
        telefon: "",
        email: "",
        created_by: i.created_by,
        created_at: i.created_at,
        updated_by: i.updated_by,
        updated_at: i.updated_at,
      });
    });

    (externRes.data || []).forEach(e => {
      if (!byClient[e.klient_id]) return;
      byClient[e.klient_id].extern.push({
        id: e.id,
        name: e.ansprechperson || e.institution,
        stelle: e.institution,
        rolle: e.funktion || "",
        telefon: e.telefon || "",
        email: e.email || "",
        created_by: e.created_by,
        created_at: e.created_at,
        updated_by: e.updated_by,
        updated_at: e.updated_at,
      });
    });

    (filesRes.data || []).forEach(f => {
      if (!byClient[f.klient_id]) return;
      byClient[f.klient_id].dateien.push({
        id: f.id,
        name: f.original_dateiname || f.dateiname,
        kategorie: f.kategorie || "allgemein",
        datum: f.datum,
        size: f.dateigroesse,
        mimeType: f.mime_type,
        bucket: f.bucket,
        path: f.speicherpfad,
      });
    });

    setEintraege(groupedEntries);
    setFallakten(byClient);
    await loadAuditLogs(ids);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("nutzer").select("*").order("name");
    if (data) setUsers(data);
  };

  const loadFreigaben = async () => {
    const { data, error } = await supabase.from("fallakten_freigaben").select("*");
    if (!error) setFallaktenFreigaben(data || []);
  };

  const loadTermine = async () => {
    let query = supabase.from("termine").select("*").order("datum", { ascending: true }).order("uhrzeit", { ascending: true });
    if (role === "Fachkraft") {
      const allowedIds = await loadAssignedClientIds();
      query = allowedIds.length
        ? query.or(`klient_id.is.null,klient_id.in.(${allowedIds.join(",")})`)
        : query.is("klient_id", null);
    }
    const { data, error } = await query;
    if (error) {
      showToast("Termine konnten nicht geladen werden.", "#c0392b");
      return;
    }
    setTermine((data || []).map(mapTermin));
  };

  const loadOutlookStatus = async () => {
    const { data, error } = await supabase.functions.invoke("outlook-status", { body: {} });
    if (!error && data) setOutlookConnection(data);
  };

  const loadOutlookEvents = async (relevantOnly = outlookRelevantOnly, silent = true) => {
    setOutlookEventsLoading(true);
    setOutlookEventsError("");
    const { data, error } = await supabase.functions.invoke("outlook-list-events", {
      body: { relevantOnly, days: 365 },
    });
    setOutlookEventsLoading(false);
    if (error || data?.error) {
      const message = data?.error || error?.message || "Outlook-Termine konnten nicht geladen werden.";
      setOutlookEventsError(message);
      setOutlookEvents([]);
      if (!silent) showToast(message, "#c0392b");
      return false;
    }
    setOutlookEvents(data?.events || []);
    setOutlookEventsError("");
    return true;
  };

  const loadNotizen = async () => {
    let query = supabase.from("notizen").select("*").order("pinned", { ascending: false });
    if (role === "Fachkraft") {
      const allowedIds = await loadAssignedClientIds();
      query = allowedIds.length
        ? query.or(`klient_id.is.null,klient_id.in.(${allowedIds.join(",")})`)
        : query.is("klient_id", null);
    }
    const { data } = await query;
    if (data) setNotizen(data.map(n => ({ ...n, klientId: n.klient_id })));
  };

  // ── Auth: Session überwachen ────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserProfile(session.user.id);
      else { setUser(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Daten laden nach Login ──────────────────────────────────────
  useEffect(() => {
    if (!session || !user) return;
    const loadInitialData = async () => {
      await Promise.all([
        loadClients(),
        (isAdmin || isLeitung) ? loadUsers() : Promise.resolve(setUsers([])),
        loadFreigaben(),
        loadTermine(),
        loadNotizen(),
        loadOutlookStatus(),
        loadOutlookEvents(outlookRelevantOnly)
      ]);
    };
    loadInitialData();
    // Loader are intentionally scoped in this component; adding them as deps would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user]);

  useEffect(() => () => {
    dictationManuallyStoppedRef.current = true;
    if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
  }, []);

  // ── CRUD: Klienten ──────────────────────────────────────────────
  const addClient = async (clientData) => {
    if (!permissions.canCreateClient) return deny("Nur Admins dürfen neue Fallakten anlegen.");
    const { data, error } = await supabase.from("klienten").insert([{
      name: clientData.name,
      dob: clientData.dob || null,
      einrichtung: clientData.einrichtung,
      status: "aktiv",
      aktenzeichen: clientData.aktenzeichen || "",
      created_by: session.user.id,
    }]).select().single();
    if (data) {
      setClients(prev => [...prev, data]);
      setEintraege(prev => ({ ...prev, [data.id]: [] }));
      showToast("Klient angelegt ✓");
    }
    if (error) showToast("Fehler beim Anlegen", "#c0392b");
  };

  // ── CRUD: Einträge ──────────────────────────────────────────────
  const addEintrag = async (eintrag, klientId) => {
    if (!canEditClientContent(klientId)) return deny("Du darfst in dieser Fallakte keine Dokumentation anlegen.");
    const { data, error } = await supabase.from("eintraege").insert([{
      klient_id: klientId,
      datum: eintrag.datum,
      typ: eintrag.typ === "Maßnahme" ? "Massnahme" : eintrag.typ,
      titel: eintrag.titel,
      text: eintrag.text,
      fachkraft: eintrag.fachkraft || user?.name || "",
      stunden: eintrag.stunden ? parseFloat(eintrag.stunden) : null,
      created_by: session.user.id,
    }]).select().single();
    if (data) {
      const newE = { ...data, typ: data.typ === "Massnahme" ? "Maßnahme" : data.typ, sourceTable: "eintraege", bereich: "allgemein", kontaktart: data.typ };
      setEintraege(prev => ({ ...prev, [klientId]: [newE, ...(prev[klientId] || [])] }));
      await loadAuditLogs(visibleClients.map(c => c.id));
      showToast("Eintrag gespeichert ✓");
    }
    if (error) showToast("Fehler beim Speichern", "#c0392b");
  };

  const appendDictationText = (text) => {
    const cleanText = (text || "").trim();
    if (!cleanText) return;
    setKiCorrection(null);
    setNewEintrag(prev => {
      if (!prev) return prev;
      const current = prev.text || "";
      const separator = current.trim() ? " " : "";
      return { ...prev, text: `${current}${separator}${cleanText}` };
    });
  };

  const startDictation = (resume = false) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setDictationStatus("nicht_unterstuetzt");
      setDictationNotice("Spracheingabe wird von diesem Browser nicht unterstützt.");
      setDictationInterim("");
      return;
    }

    if (dictating) return;
    if (speechRecognitionRef.current) {
      dictationManuallyStoppedRef.current = true;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    dictationManuallyStoppedRef.current = false;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${transcript.trim()} `;
        else interimText += transcript;
      }
      if (finalText.trim()) appendDictationText(finalText.trim());
      setDictationInterim(interimText.trim());
      setDictationNotice(interimText.trim()
        ? `Zwischenergebnis: ${interimText.trim()}`
        : "Diktat läuft. Erkannter Text wird fortlaufend angehängt.");
    };

    recognition.onerror = (event) => {
      setDictating(false);
      speechRecognitionRef.current = null;
      setDictationInterim("");
      if (event.error === "no-speech" || event.error === "aborted") {
        setDictationStatus("pausiert");
        setDictationNotice("Diktat pausiert. Der bisherige Text bleibt erhalten; du kannst weiter diktieren.");
        return;
      }
      setDictationStatus(event.error === "not-allowed" ? "gestoppt" : "pausiert");
      setDictationNotice(`Spracheingabe konnte nicht fortgesetzt werden: ${event.error || "unbekannter Fehler"}. Der bisherige Text bleibt erhalten.`);
    };
    recognition.onend = () => {
      setDictating(false);
      speechRecognitionRef.current = null;
      setDictationInterim("");
      if (dictationManuallyStoppedRef.current) {
        setDictationStatus("gestoppt");
        setDictationNotice("Diktat gestoppt. Der bisherige Text bleibt erhalten.");
      } else {
        setDictationStatus("pausiert");
        setDictationNotice("Diktat pausiert. Der bisherige Text bleibt erhalten; du kannst weiter diktieren.");
      }
    };

    speechRecognitionRef.current = recognition;
    setDictating(true);
    setDictationStatus("laeuft");
    setDictationInterim("");
    setDictationNotice(resume ? "Diktat läuft weiter. Neuer Text wird angehängt." : "Diktat läuft. Neuer Text wird an den vorhandenen Text angehängt.");
    try {
      recognition.start();
    } catch (error) {
      setDictating(false);
      setDictationStatus("gestoppt");
      setDictationNotice(error.message || "Diktat konnte nicht gestartet werden. Der bisherige Text bleibt erhalten.");
    }
  };

  const stopDictation = () => {
    dictationManuallyStoppedRef.current = true;
    if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
    setDictating(false);
    speechRecognitionRef.current = null;
    setDictationStatus("gestoppt");
    setDictationInterim("");
    setDictationNotice("Diktat gestoppt. Der bisherige Text bleibt erhalten.");
  };

  const clearDictationText = () => {
    setNewEintrag(prev => prev ? { ...prev, text: "" } : prev);
    setKiCorrection(null);
    setDictationInterim("");
    setDictationStatus(dictating ? "laeuft" : "gestoppt");
    setDictationNotice("Dokumentationstext geleert.");
  };

  const runDocumentationCorrection = async () => {
    if (!newEintrag?.text?.trim()) {
      showToast("Bitte zuerst Dokumentationstext eingeben.", "#c0392b");
      return;
    }
    if (kiSettings.provider !== "ollama") {
      showToast("KI-Korrektur ist aktuell über die lokale Ollama-KI angebunden.", "#c0392b");
      return;
    }

    const prompt = [
      "Du korrigierst eine sozialpädagogische Dokumentation ausschließlich sprachlich.",
      "Korrigiere Rechtschreibung, Grammatik und leichte sprachliche Unklarheiten.",
      "Keine neuen Informationen hinzufügen. Keine Inhalte umdeuten. Keine fachlichen Ergänzungen.",
      "Sachlicher, professioneller Dokumentationsstil. Gib ausschließlich den korrigierten Text zurück.",
      "",
      `Text:\n${newEintrag.text}`,
    ].join("\n");

    setKiCorrecting(true);
    setKiCorrection(null);
    try {
      const res = await fetch(`${kiSettings.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: kiSettings.ollamaModel, prompt, stream: false })
      });
      if (!res.ok) throw new Error(`Ollama antwortet mit HTTP ${res.status}.`);
      const data = await res.json();
      const corrected = (data.response || "").trim();
      if (!corrected) throw new Error("Keine KI-Antwort erhalten.");
      setKiCorrection({ corrected });
    } catch (error) {
      showToast(error.message || "KI-Korrektur fehlgeschlagen.", "#c0392b");
    } finally {
      setKiCorrecting(false);
    }
  };

  // ── CRUD: Termine ───────────────────────────────────────────────
  const addTermin = async (termin) => {
    if (termin.klientId && !canEditClientContent(termin.klientId)) return deny("Du darfst für diese Fallakte keinen Termin anlegen.");
    const wantsOutlookSync = Boolean(termin.outlookSync);
    const { data, error } = await supabase.from("termine").insert([{
      titel: termin.titel,
      datum: termin.datum,
      uhrzeit: termin.uhrzeit,
      klient_id: termin.klientId || null,
      fachkraft: termin.fachkraft || user?.name || "",
      ort: termin.ort || "",
      notiz: termin.notiz || "",
      erinnerung: Boolean(termin.erinnerung),
      status: "geplant",
      import_source: termin.import_source || null,
      external_uid: termin.external_uid || null,
      outlook_sync_requested: wantsOutlookSync,
      outlook_sync_status: wantsOutlookSync ? "pending" : "none",
      created_by: session.user.id,
    }]).select().single();
    if (data) {
      setTermine(prev => [...prev, mapTermin(data)]);
      await loadAuditLogs(visibleClients.map(c => c.id));
      showToast("Termin gespeichert ✓");
      if (wantsOutlookSync) await syncOutlookTermin(data.id);
      return true;
    }
    if (error) showToast(`Termin konnte nicht gespeichert werden: ${error.message}`, "#c0392b");
    return false;
  };

  const importTermine = async (items) => {
    const existingUidSet = new Set(termine.map(t => t.external_uid).filter(Boolean));
    const existingKeySet = new Set(termine.map(terminImportKey));
    const rows = (items || [])
      .filter(item => item?.titel && item?.datum)
      .filter(item => !(item.external_uid && existingUidSet.has(item.external_uid)) && !existingKeySet.has(terminImportKey(item)))
      .map(item => ({
        titel: item.titel,
        datum: item.datum,
        end_datum: getTerminEndDate(item) || null,
        uhrzeit: item.uhrzeit || null,
        klient_id: null,
        fachkraft: user?.name || "",
        ort: item.ort || "",
        notiz: item.notiz || "",
        erinnerung: false,
        status: "geplant",
        import_source: item.import_source || "ics",
        external_uid: item.external_uid || null,
        created_by: session.user.id,
      }));
    const skipped = Math.max(0, (items || []).length - rows.length);
    if (!rows.length) return { imported: 0, skipped };
    const { data, error } = await supabase.from("termine").insert(rows).select("*");
    if (error) {
      showToast(`Import fehlgeschlagen: ${error.message}`, "#c0392b");
      return { imported: 0, skipped: (items || []).length };
    }
    setTermine(prev => [...prev, ...(data || []).map(mapTermin)]);
    await loadAuditLogs(visibleClients.map(c => c.id));
    showToast(`${data?.length || 0} Termine importiert ✓${skipped ? ` · ${skipped} Duplikate übersprungen` : ""}`);
    return { imported: data?.length || 0, skipped };
  };

  const syncOutlookTermin = async (terminId) => {
    const { data, error } = await supabase.functions.invoke("outlook-sync-event", {
      body: { terminId },
    });
    if (data?.termin) {
      setTermine(prev => prev.map(t => String(t.id) === String(terminId) ? mapTermin(data.termin) : t));
    }
    if (error || data?.error) {
      showToast(data?.error || error?.message || "Outlook-Synchronisation fehlgeschlagen.", "#c0392b");
      return false;
    }
    showToast("Termin in Outlook angelegt ✓");
    return true;
  };

  const startOutlookConnect = async () => {
    const { data, error } = await supabase.functions.invoke("outlook-connect", { body: {} });
    if (error || data?.error) {
      showToast(data?.error || error?.message || "Outlook-Verbindung ist noch nicht konfiguriert.", "#c0392b");
      return;
    }
    if (data?.authUrl) {
      window.open(data.authUrl, "_blank", "noopener,noreferrer");
      showToast("Outlook-Verbindung im neuen Fenster geöffnet ✓");
      return;
    }
    showToast("Outlook-Verbindung ist serverseitig vorbereitet, aber noch nicht konfiguriert.", "#64748b");
  };

  const refreshOutlookStatus = async () => {
    await loadOutlookStatus();
    await loadOutlookEvents(outlookRelevantOnly, true);
    showToast("Outlook-Status aktualisiert ✓", "#64748b");
  };

  const updateTerminStatus = async (id, status) => {
    if (!TERMIN_STATUS.includes(status)) return showToast("Ungültiger Terminstatus.", "#c0392b");
    const existing = termine.find(t => String(t.id) === String(id));
    if (!existing) return showToast("Termin wurde nicht gefunden.", "#c0392b");
    if (!canEditTermin(existing)) return deny("Du darfst diesen Termin nicht bearbeiten.");
    const { data, error } = await supabase.from("termine").update({ status, updated_by: session.user.id }).eq("id", id).select().single();
    if (error) return showToast(`Terminstatus konnte nicht gespeichert werden: ${error.message}`, "#c0392b");
    setTermine(prev => prev.map(t => String(t.id) === String(id) ? mapTermin(data) : t));
    await loadAuditLogs(visibleClients.map(c => c.id));
    showToast("Terminstatus aktualisiert ✓");
  };

  const deleteTermin = async (id) => {
    const existing = termine.find(t => String(t.id) === String(id));
    if (existing?.klientId && !canEditClientContent(existing.klientId)) return deny("Du darfst diesen Termin nicht löschen.");
    if (!existing?.klientId && !isAdmin && existing?.created_by !== user?.id) return deny("Du darfst nur eigene allgemeine Termine löschen.");
    const { error } = await supabase.from("termine").delete().eq("id", id);
    if (error) return showToast("Termin konnte nicht gelöscht werden.", "#c0392b");
    setTermine(prev => prev.filter(t => t.id !== id));
    await loadAuditLogs(visibleClients.map(c => c.id));
    showToast("Termin gelöscht", "#64748b");
  };

  // ── CRUD: Notizen ───────────────────────────────────────────────
  const addNotiz = async (notiz) => {
    if (notiz.klientId && !canEditClientContent(notiz.klientId)) return deny("Du darfst für diese Fallakte keine Notiz anlegen.");
    const { data, error } = await supabase.from("notizen").insert([{
      titel: notiz.titel,
      text: notiz.text || "",
      farbe: notiz.farbe || "gelb",
      typ: notiz.typ || "persoenlich",
      klient_id: notiz.klientId ? parseInt(notiz.klientId) : null,
      tags: notiz.tags || [],
      pinned: notiz.pinned || false,
      autor: user?.name || "",
      created_by: session.user.id,
    }]).select().single();
    if (data) {
      setNotizen(prev => [{ ...data, klientId: data.klient_id }, ...prev]);
      await loadAuditLogs(visibleClients.map(c => c.id));
      showToast("Notiz gespeichert ✓");
    }
    if (error) showToast("Fehler beim Speichern", "#c0392b");
  };

  const updateNotiz = async (id, updates) => {
    const existing = notizen.find(n => String(n.id) === String(id));
    if (!existing) return deny("Notiz wurde nicht gefunden.");
    const isOwner = existing.created_by === user?.id || existing.autor === user?.name;
    if (!isAdmin && !isOwner) return deny("Du darfst nur eigene Notizen bearbeiten.");
    if ((updates.klient_id || updates.klientId || existing.klientId) && !canEditClientContent(updates.klient_id || updates.klientId || existing.klientId)) return deny("Du darfst diese Notiz nicht dieser Fallakte zuordnen.");
    const dbUpdates = {
      ...updates,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    };
    delete dbUpdates.klientId;
    const { data, error } = await supabase.from("notizen").update(dbUpdates).eq("id", id).select().single();
    if (!error && data) {
      setNotizen(prev => prev.map(n => n.id === id ? { ...n, ...data, klientId: data.klient_id } : n));
      await loadAuditLogs(visibleClients.map(c => c.id));
    }
  };

  const deleteNotiz = async (id) => {
    const existing = notizen.find(n => String(n.id) === String(id));
    const isOwner = existing?.created_by === user?.id || existing?.autor === user?.name;
    if (!isAdmin && !isOwner) return deny("Du darfst nur eigene Notizen löschen.");
    await supabase.from("notizen").delete().eq("id", id);
    setNotizen(prev => prev.filter(n => n.id !== id));
    await loadAuditLogs(visibleClients.map(c => c.id));
    showToast("Notiz gelöscht", "#64748b");
  };

  // ── Nutzer verwalten (Admin) ────────────────────────────────────
  const updateSecureUser = async (id, updates) => {
    if (!permissions.canManageUsers) return deny("Nur Admins dürfen Benutzer bearbeiten.");
    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: { userId: id, ...updates },
    });
    if (error || data?.error) {
      showToast(data?.error || error?.message || "Benutzer konnte nicht aktualisiert werden.", "#c0392b");
      return false;
    }
    if (data?.user) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data.user } : u).sort((a, b) => String(a.name).localeCompare(String(b.name))));
      if (String(id) === String(user?.id)) setUser(prev => ({ ...prev, ...data.user }));
    }
    showToast("Benutzer aktualisiert ✓");
    return true;
  };

  const toggleNutzer = async (id, aktiv) => {
    await updateSecureUser(id, { aktiv });
  };

  const createSecureUser = async (form) => {
    if (!permissions.canManageUsers) return deny("Nur Admins dürfen Benutzer anlegen.");
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        name: form.name,
        email: form.email,
        password: form.password,
        rolle: form.rolle,
        einrichtung: form.einrichtung,
        aktiv: form.aktiv,
      },
    });
    if (error || data?.error) {
      showToast(data?.error || error?.message || "Benutzer konnte nicht angelegt werden.", "#c0392b");
      return false;
    }
    if (data?.user) setUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user].sort((a, b) => String(a.name).localeCompare(String(b.name))));
    showToast("Benutzer sicher angelegt ✓");
    return true;
  };

  const saveFallaktenFreigaben = async (nutzerId, grants) => {
    if (!permissions.canManageUsers) return deny("Nur Admins dürfen Fallaktenrechte verwalten.");
    const rows = grants
      .filter(g => g.darf_ansehen || g.darf_bearbeiten)
      .map(g => ({
        klient_id: g.klient_id,
        nutzer_id: nutzerId,
        darf_ansehen: Boolean(g.darf_ansehen || g.darf_bearbeiten),
        darf_bearbeiten: Boolean(g.darf_bearbeiten),
        created_by: user?.id || null,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }));

    const { error: deleteError } = await supabase.from("fallakten_freigaben").delete().eq("nutzer_id", nutzerId);
    if (deleteError) {
      showToast(`Freigaben konnten nicht gespeichert werden: ${deleteError.message}`, "#c0392b");
      return false;
    }
    if (rows.length) {
      const { error: insertError } = await supabase.from("fallakten_freigaben").insert(rows);
      if (insertError) {
        showToast(`Freigaben konnten nicht gespeichert werden: ${insertError.message}`, "#c0392b");
        await loadFreigaben();
        return false;
      }
    }
    await loadFreigaben();
    await loadAuditLogs(visibleClients.map(c => c.id));
    showToast("Fallaktenrechte gespeichert ✓");
    return true;
  };

  const openNewEintrag = () => {
    dictationManuallyStoppedRef.current = true;
    setDictationStatus("gestoppt");
    setDictationNotice("");
    setDictationInterim("");
    setKiCorrection(null);
    setNewEintrag({ typ: "Fallverlauf", titel: "", text: "", datum: ds(new Date()), fachkraft: user?.name || "", stunden: "" });
  };

  const closeNewEintrag = () => {
    dictationManuallyStoppedRef.current = true;
    if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
    setDictating(false);
    speechRecognitionRef.current = null;
    setDictationStatus("gestoppt");
    setDictationNotice("");
    setDictationInterim("");
    setKiCorrection(null);
    setNewEintrag(null);
  };

  const upcomingReminders = visibleTermine.filter(t => {
    if (!t.erinnerung) return false;
    if (t.status === "erledigt") return false;
    const diff = dayDiff(t.datum);
    return diff >= 0 && diff <= 3;
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 180);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Loading Screen ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f2647,#1a4480)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#1a80d9,#0d9e80)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🗂</div>
      <div style={{ width: 40, height: 40, border: "4px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "rgba(255,255,255,.7)", fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>SozialDoku wird geladen…</p>
    </div>
  );

  if (!session) return <LoginScreen onLogin={async (email, pass) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return "Ungültige Zugangsdaten.";
    return null;
  }} />;

  const visibleEinrichtungen = [...new Set(visibleClients.map(c => c.einrichtung).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
  const visibleInternOptions = [...new Map(visibleClients.flatMap(c => (fallakten?.[c.id]?.intern || [])
    .filter(i => i.userId || i.name)
    .map(i => [String(i.userId || i.name), i.name || i.email || "Zuständige Person"]))).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  const filteredClients = visibleClients.filter(c => {
    const q = debouncedSearch;
    const matchesSearch = !q ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.aktenzeichen || "").toLowerCase().includes(q);
    const matchesStatus = clientStatusFilter === "alle" || c.status === clientStatusFilter || (clientStatusFilter === "abgeschlossen" && c.status === "behandelt");
    const matchesEinrichtung = clientEinrichtungFilter === "alle" || c.einrichtung === clientEinrichtungFilter;
    const internAssignments = fallakten?.[c.id]?.intern || [];
    const matchesIntern = clientInternFilter === "alle" || internAssignments.some(i => String(i.userId || i.name) === clientInternFilter);
    return matchesSearch && matchesStatus && matchesEinrichtung && matchesIntern;
  });

  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const selectedClientCanEdit = selectedClient ? canEditClientContent(selectedClient.id) : false;
  const dictationStatusMeta = !speechSupported
    ? { label: "Browser unterstützt Spracheingabe nicht", bg: "#f8fafc", color: "#475569", border: "#cbd5e1" }
    : dictating
      ? { label: "Diktat läuft", bg: "#eef6ff", color: "#1e3a5f", border: "#bfdbfe" }
      : dictationStatus === "pausiert"
        ? { label: "pausiert", bg: "#f8fafc", color: "#334155", border: "#cbd5e1" }
        : { label: "gestoppt", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

  return (
    <>
      <FontLoader />
      <style>{globalStyles}</style>
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}

      <div className="app-layout">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <Sidebar view={view} setView={(v) => { setView(v); setSidebarOpen(false); }} user={user} onLogout={async () => { await supabase.auth.signOut(); }} isOpen={sidebarOpen} notifications={upcomingReminders.length} permissions={permissions} />

        <div className="main-wrapper">
          <div className="mobile-header">
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#0f2647", padding: 4 }}>☰</button>
            <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#0f2647" }}>SozialDoku</span>
            <div style={{ width: 36 }} />
          </div>

          <main className="main-content">
            {view === "dashboard" && <Dashboard clients={visibleClients} fallakten={fallakten} eintraege={eintraege} termine={visibleTermine} setView={setView} onOpenClient={(c) => openClientDetail(c, "dashboard")} user={user} permissions={permissions} />}
            {view === "clients" && <ClientsView clients={filteredClients} allClients={visibleClients} search={search} setSearch={setSearch} statusFilter={clientStatusFilter} setStatusFilter={setClientStatusFilter} einrichtungFilter={clientEinrichtungFilter} setEinrichtungFilter={setClientEinrichtungFilter} internFilter={clientInternFilter} setInternFilter={setClientInternFilter} einrichtungen={visibleEinrichtungen} internOptions={visibleInternOptions} permissions={permissions} onSelect={(c) => openClientDetail(c, "clients")} onNew={permissions.canCreateClient ? () => setShowNewClient(true) : null} />}
            {view === "detail" && selectedClient && canViewClient(selectedClient.id) && (
              <DetailView
                client={selectedClient}
                eintraege={eintraege[selectedClient.id] || []}
                onBack={() => setView(detailReturnView || "clients")}
                canEdit={selectedClientCanEdit}
                permissions={permissions}
                onNewEintrag={selectedClientCanEdit ? openNewEintrag : null}
                onKiBericht={() => setView("kibericht")}
                notizen={visibleNotizen}
                termine={visibleTermine}
                auditLogs={auditLogs}
                refreshAuditLogs={() => loadAuditLogs(visibleClients.map(c => c.id))}
                deleteNotiz={deleteNotiz}
                user={user}
                users={users}
                showToast={showToast}
                fallakten={fallakten}
                setFallakten={setFallakten}
                setEintraege={setEintraege}
              />
            )}
            {view === "detail" && selectedClient && !canViewClient(selectedClient.id) && <AccessDeniedView setView={setView} />}
            {view === "notizen" && <NotizenView notizen={visibleNotizen} onAdd={addNotiz} onUpdate={updateNotiz} onDelete={deleteNotiz} user={user} clients={visibleClients} showToast={showToast} />}
            {view === "kalender" && <KalenderView termine={visibleTermine} outlookConnection={outlookConnection} outlookEvents={outlookEvents} outlookEventsLoading={outlookEventsLoading} outlookEventsError={outlookEventsError} outlookRelevantOnly={outlookRelevantOnly} setOutlookRelevantOnly={setOutlookRelevantOnly} onLoadOutlookEvents={(relevantOnly = outlookRelevantOnly) => loadOutlookEvents(relevantOnly, false)} onImportTermine={importTermine} onAddTermin={addTermin} onDeleteTermin={deleteTermin} onUpdateTerminStatus={updateTerminStatus} onConnectOutlook={startOutlookConnect} onRefreshOutlook={refreshOutlookStatus} onSyncOutlookTermin={syncOutlookTermin} canEditTermin={canEditTermin} clients={visibleClients} user={user} showToast={showToast} />}
            {view === "benachrichtigungen" && <BenachrichtigungenView termine={visibleTermine} clients={visibleClients} onOpenClient={(c) => openClientDetail(c, "benachrichtigungen")} />}
            {view === "vorlagen" && <VorlagenView vorlagen={VORLAGEN} />}
            {view === "stunden" && <StundenView clients={visibleClients} eintraege={eintraege} />}
            {view === "kibericht" && <KIBerichtView clients={visibleClients} eintraege={eintraege} user={user} kiSettings={kiSettings} />}
            {view === "nutzer" && permissions.canManageUsers && <NutzerView users={users} clients={clients} fallaktenFreigaben={fallaktenFreigaben} onToggle={toggleNutzer} onCreateUser={createSecureUser} onUpdateUser={updateSecureUser} onSaveFreigaben={saveFallaktenFreigaben} showToast={showToast} />}
            {view === "einstellungen" && permissions.canUseAdminSettings && <KIEinstellungenView kiSettings={kiSettings} setKiSettings={setKiSettings} showToast={showToast} />}
            {view === "dsgvo" && <DsgvoView />}
          </main>
        </div>
      </div>

      {/* Schwebendes Notiz-Panel */}
      {notizPanel && (
        <div style={{ position: "fixed", bottom: 90, right: 24, width: 340, background: "#fff", borderRadius: 18, boxShadow: "0 8px 40px rgba(0,0,0,.22)", zIndex: 500, animation: "slideUp .2s ease", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16, color: "#fff", fontWeight: 700 }}>📝 Schnellnotiz</span>
            <button onClick={() => setNotizPanel(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
          </div>
          <div style={{ padding: "14px 16px", maxHeight: 320, overflowY: "auto" }}>
            {notizen.slice(0, 4).map(n => (
              <div key={n.id} style={{ padding: "10px 12px", borderRadius: 10, marginBottom: 8, background: (NOTIZ_FARBEN[n.farbe] || NOTIZ_FARBEN.gelb).bg, borderLeft: `3px solid ${(NOTIZ_FARBEN[n.farbe] || NOTIZ_FARBEN.gelb).border}` }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{n.titel}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{(n.text || "").length > 80 ? n.text.slice(0, 80) + "…" : n.text}</p>
              </div>
            ))}
            <button onClick={() => { setView("notizen"); setNotizPanel(false); setSidebarOpen(false); }} style={{ ...btnSecondary, width: "100%", justifyContent: "center", fontSize: 13, marginTop: 4 }}>Alle Notizen öffnen →</button>
          </div>
        </div>
      )}
      <button onClick={() => setNotizPanel(p => !p)} style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", cursor: "pointer", fontSize: 22, boxShadow: "0 4px 20px rgba(245,158,11,.5)", zIndex: 499, display: "flex", alignItems: "center", justifyContent: "center" }}>📝</button>

      {/* Neuer Eintrag Modal */}
      {newEintrag && selectedClient && (
        <Modal onClose={closeNewEintrag}>
          <h2 style={modalTitleStyle}><SectionIcon name={SECTION_ICONS.dokumentation} />Neuer Eintrag</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{selectedClient.name}</p>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>📋 Vorlage verwenden</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {VORLAGEN.map(v => (
                <button key={v.id} onClick={() => { setKiCorrection(null); setNewEintrag(prev => ({ ...prev, typ: v.typ, titel: v.titel, text: v.text })); }}
                  style={{ background: typBg(v.typ), color: typeColor(v.typ), border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  {v.titel}
                </button>
              ))}
            </div>
          </div>
          <FormField label="Datum"><input type="date" value={newEintrag.datum} onChange={e => setNewEintrag({ ...newEintrag, datum: e.target.value })} style={inputStyle} /></FormField>
          <FormField label="Typ"><select value={newEintrag.typ} onChange={e => setNewEintrag({ ...newEintrag, typ: e.target.value })} style={inputStyle}><option>Fallverlauf</option><option>Maßnahme</option><option>Stunden</option></select></FormField>
          <FormField label="Titel"><input value={newEintrag.titel} onChange={e => setNewEintrag({ ...newEintrag, titel: e.target.value })} style={inputStyle} placeholder="Kurztitel…" /></FormField>
          {newEintrag.typ === "Stunden" && <FormField label="Stunden"><input type="number" step="0.5" value={newEintrag.stunden} onChange={e => setNewEintrag({ ...newEintrag, stunden: e.target.value })} style={inputStyle} /></FormField>}
          <FormField label="Beschreibung">
            <textarea rows={5} value={newEintrag.text} onChange={e => { setKiCorrection(null); setNewEintrag({ ...newEintrag, text: e.target.value }); }} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} placeholder="Details…" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {speechSupported && dictating && (
                <button type="button" onClick={stopDictation} style={{ ...btnPrimary, background: "#475569", borderColor: "#475569" }}>Diktieren stoppen</button>
              )}
              {speechSupported && !dictating && dictationStatus === "pausiert" && (
                <button type="button" onClick={() => startDictation(true)} style={btnPrimary}>Weiter diktieren</button>
              )}
              {speechSupported && !dictating && dictationStatus !== "pausiert" && (
                <button type="button" onClick={() => startDictation(false)} style={btnSecondary}>Diktieren starten</button>
              )}
              {newEintrag.text?.trim() && (
                <button type="button" onClick={clearDictationText} style={btnSecondary}>Text leeren</button>
              )}
              <button type="button" onClick={runDocumentationCorrection} disabled={kiCorrecting} style={{ ...btnSecondary, opacity: kiCorrecting ? .65 : 1, cursor: kiCorrecting ? "wait" : "pointer" }}>
                {kiCorrecting ? "KI prüft…" : "Rechtschreibung & Grammatik prüfen"}
              </button>
            </div>
            <div style={{ marginTop: 10, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: ".4px" }}>Spracheingabe</span>
                <span style={{ background: dictationStatusMeta.bg, color: dictationStatusMeta.color, border: `1px solid ${dictationStatusMeta.border}`, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>{dictationStatusMeta.label}</span>
              </div>
              <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>
                {!speechSupported
                  ? "Spracheingabe wird von diesem Browser nicht unterstützt. Der Text kann weiterhin manuell erfasst werden."
                  : dictationNotice || "Neuer diktierter Text wird an den vorhandenen Dokumentationstext angehängt."}
              </p>
              {dictationInterim && (
                <p style={{ margin: "5px 0 0", color: "#334155", fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>{dictationInterim}</p>
              )}
            </div>
            {kiCorrection && (
              <div style={{ marginTop: 12, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", padding: "12px 14px" }}>
                <p style={{ margin: "0 0 8px", color: "#334155", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>KI-Vorschlag, Original bleibt oben bearbeitbar</p>
                <p style={{ margin: 0, color: "#1f2937", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{kiCorrection.corrected}</p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={() => setKiCorrection(null)} style={btnSecondary}>Verwerfen</button>
                  <button type="button" onClick={() => { setNewEintrag(prev => ({ ...prev, text: kiCorrection.corrected })); setKiCorrection(null); }} style={btnPrimary}>Vorschlag übernehmen</button>
                </div>
              </div>
            )}
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={closeNewEintrag} style={btnSecondary}>Abbrechen</button>
            <button onClick={async () => {
              if (!newEintrag.titel || !newEintrag.text) return showToast("Bitte Titel und Beschreibung ausfüllen.", "#c0392b");
              await addEintrag(newEintrag, selectedClient.id);
              closeNewEintrag();
            }} style={btnPrimary}>Speichern</button>
          </div>
        </Modal>
      )}

      {showNewClient && (
        <NewClientModal einrichtungen={EINRICHTUNGEN} onClose={() => setShowNewClient(false)} onSave={async (c) => { await addClient(c); setShowNewClient(false); }} />
      )}
    </>
  );
}

// ── Login Screen (Supabase Auth) ───────────────────────────────────
const DEMO_LOGIN = { email: "test@deinprojekt.de", password: "passwort" };
const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(1, "Bitte Passwort eingeben."),
});

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(DEMO_LOGIN.email);
  const [pass, setPass] = useState(DEMO_LOGIN.password);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: DEMO_LOGIN });

  const emailField = register("email");
  const passwordField = register("password");

  const submitLogin = async (values) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message || "Bitte Zugangsdaten prüfen.");
      return;
    }
    setLoading(true);
    setErr("");
    const error = await onLogin(parsed.data.email, parsed.data.password);
    if (error) setErr(error);
    setLoading(false);
  };
  const handle = handleSubmit(submitLogin);

  return (
    <><FontLoader /><style>{globalStyles}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f2647 0%,#1a4480 50%,#0d6b5e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
        <div style={{ background: "rgba(255,255,255,.97)", borderRadius: 20, padding: "48px 44px", width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#1a4480,#0d6b5e)", borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 24 }}>🗂</div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, color: "#0f2647", margin: 0 }}>SozialDoku</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Dokumentationssoftware für soziale Einrichtungen</p>
          </div>
          <FormField label="E-Mail"><input {...emailField} defaultValue={email} onChange={e => { setEmail(e.target.value); emailField.onChange(e); }} style={inputStyle} placeholder="name@einrichtung.de" type="email" /></FormField>
          <FormField label="Passwort"><input {...passwordField} defaultValue={pass} onChange={e => { setPass(e.target.value); passwordField.onChange(e); }} onKeyDown={e => e.key === "Enter" && handle()} style={inputStyle} placeholder="••••••••" type="password" /></FormField>
          {err && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button onClick={handle} disabled={loading} style={{ ...btnPrimary, width: "100%", justifyContent: "center", fontSize: 16, padding: "13px 0", opacity: loading ? .7 : 1 }}>
            {loading ? "⏳ Anmelden…" : "Anmelden"}
          </button>
          <div style={{ marginTop: 16, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#0369a1" }}>
            <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>Demo-Fachkraft</p>
            <p style={{ margin: 0, fontSize: 12 }}>E-Mail: {DEMO_LOGIN.email}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12 }}>Passwort: {DEMO_LOGIN.password}</p>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 16 }}>🔒 DSGVO-konform · Serverstandort Frankfurt</p>
        </div>
      </div>
    </>
  );
}

function Sidebar({ view, setView, user, onLogout, isOpen, notifications, permissions }) {
  const items = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "clients", icon: "🗂", label: "Fallakten" },
    { id: "kalender", icon: "📅", label: "Kalender" },
    { id: "benachrichtigungen", icon: "🔔", label: "Erinnerungen", badge: notifications },
    { id: "notizen", icon: "📝", label: "Notizen" },
    { id: "vorlagen", icon: "📋", label: "Vorlagen" },
    { id: "stunden", icon: "⏱", label: "Stunden & Berichte" },
    { id: "kibericht", icon: "🤖", label: "KI-Bericht" },
    ...(permissions.canManageUsers ? [{ id: "nutzer", icon: "👤", label: "Nutzerverwaltung" }] : []),
    ...(permissions.canUseAdminSettings ? [{ id: "einstellungen", icon: "⚙️", label: "KI-Einstellungen" }] : []),
    { id: "dsgvo", icon: "🔒", label: "Datenschutz" },
  ];
  return (
    <nav className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div style={{ padding: "0 22px 24px", borderBottom: "1px solid rgba(255,255,255,.1)", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#1a80d9,#0d9e80)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🗂</div>
          <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#fff" }}>SozialDoku</span>
        </div>
      </div>
      <div style={{ flex: 1, padding: "8px 12px", overflowY: "auto", minHeight: 0 }}>
        {items.map(item => (
          <button key={item.id} onClick={() => setView(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 2, background: view === item.id ? "rgba(255,255,255,.15)" : "transparent", color: view === item.id ? "#fff" : "rgba(255,255,255,.65)", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: view === item.id ? 600 : 400, transition: "all .2s" }}>
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
            {item.badge > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "2px 7px" }}>{item.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 22px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#1a80d9,#0d9e80)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{user?.avatar}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</p>
            <span style={{ fontSize: 11, ...rolleStyle(user?.rolle), padding: "1px 8px", borderRadius: 10, fontWeight: 700 }}>{user?.rolle}</span>
          </div>
        </div>
        <button onClick={onLogout} style={{ fontSize: 12, color: "rgba(255,255,255,.5)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Sans',sans-serif" }}>← Abmelden</button>
      </div>
    </nav>
  );
}

function DashboardSection({ id, title, summary, count, open, onToggle, children }) {
  return (
    <section style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 14 }}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        style={{
          width: "100%",
          border: "none",
          background: open ? "#f8fafc" : "#fff",
          padding: "17px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "'DM Sans',sans-serif",
        }}
        aria-expanded={open}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{title}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{summary}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ minWidth: 34, textAlign: "center", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800 }}>{count}</span>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>{open ? "Schließen" : "Öffnen"}</span>
        </div>
      </button>
      {open && <div style={{ padding: "4px 20px 18px", borderTop: "1px solid #eef2f6" }}>{children}</div>}
    </section>
  );
}

function Dashboard({ clients, fallakten, eintraege, termine, setView, onOpenClient, user, permissions }) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientQuickFilter, setClientQuickFilter] = useState("alle");
  const [openDashboardSection, setOpenDashboardSection] = useState("");
  const myClients = clients.filter(c => (fallakten?.[c.id]?.intern || []).some(i => String(i.userId) === String(user?.id)));
  const dashboardClients = permissions.canViewAllCases ? clients : myClients;
  const dashboardClientIds = new Set(dashboardClients.map(c => String(c.id)));
  const total = dashboardClients.length;
  const offeneAufgaben = dashboardClients.flatMap(c => (fallakten?.[c.id]?.aufgaben || []).map(a => ({ ...a, klientId: c.id, klientName: c.name }))).filter(a => a.status !== "erledigt");
  const allEntries = Object.entries(eintraege)
    .filter(([clientId]) => dashboardClientIds.has(String(clientId)))
    .flatMap(([clientId, items]) => (items || []).map(item => ({ ...item, klientId: clientId })));
  const hoursEntries = allEntries.filter(e => e.typ === "Stunden").sort((a, b) => new Date(b.datum) - new Date(a.datum));
  const stunden = hoursEntries.reduce((s, e) => s + (e.stunden || 0), 0);
  const recent = [...allEntries].sort((a, b) => new Date(b.datum) - new Date(a.datum)).slice(0, 4);
  const getClientName = (id) => clients.find(c => c.id == id)?.name || "–";
  const getClientId = (entry) => entry.klientId || Object.entries(eintraege).find(([, v]) => v.some(e => e.id === entry.id))?.[0];
  const today = ds(new Date());
  const nextTermine = [...termine]
    .sort((a, b) => new Date(`${a.datum}T${a.uhrzeit || "00:00"}`) - new Date(`${b.datum}T${b.uhrzeit || "00:00"}`))
    .filter(t => t.status !== "erledigt" && (getTerminEndDate(t) || t.datum) >= today && (!t.klientId || dashboardClientIds.has(String(t.klientId))))
    .slice(0, 4);
  const lastEntryByClient = Object.fromEntries(Object.entries(eintraege)
    .filter(([clientId]) => dashboardClientIds.has(String(clientId)))
    .map(([clientId, items]) => [clientId, [...(items || [])].sort((a, b) => new Date(b.datum) - new Date(a.datum))[0]?.datum || ""]));
  const dashboardSearch = clientSearch.trim().toLowerCase();
  const visibleDashboardClients = dashboardClients
    .filter(c => {
      const hasOpenTasks = (fallakten?.[c.id]?.aufgaben || []).some(a => a.status !== "erledigt");
      const matchesSearch = !dashboardSearch || (c.name || "").toLowerCase().includes(dashboardSearch) || (c.aktenzeichen || "").toLowerCase().includes(dashboardSearch);
      const matchesQuickFilter =
        clientQuickFilter === "alle" ||
        (clientQuickFilter === "aktiv" && c.status === "aktiv") ||
        (clientQuickFilter === "offene" && hasOpenTasks) ||
        clientQuickFilter === "zuletzt";
      return matchesSearch && matchesQuickFilter;
    })
    .sort((a, b) => clientQuickFilter === "zuletzt" ? new Date(lastEntryByClient[b.id] || 0) - new Date(lastEntryByClient[a.id] || 0) : 0);
  const openClientById = (id) => {
    const client = clients.find(c => String(c.id) === String(id));
    if (client) onOpenClient(client);
  };
  const toggleSection = (section) => setOpenDashboardSection(prev => prev === section ? "" : section);
  return (
    <div>
      <h1 style={pageTitle}>Dashboard</h1>
      <p style={pageSubtitle}>{permissions.canViewAllCases ? `Rollenübersicht (${permissions.role})` : "Persönliche Arbeitsübersicht"} für {user?.name.split(" ")[0]}</p>
      <div style={{ marginBottom: 22 }}>
        <DashboardSection
          id="clients"
          title={permissions.canViewAllCases ? "Sichtbare Fallakten" : "Meine Klienten"}
          summary={permissions.canViewAllCases ? "Gesamtbestand entsprechend deiner Rolle durchsuchen." : "Zugeordnete und freigegebene Klienten direkt öffnen."}
          count={`${visibleDashboardClients.length}/${total}`}
          open={openDashboardSection === "clients"}
          onToggle={toggleSection}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Name oder Aktenzeichen suchen…" style={{ ...inputStyle, fontSize: 14, padding: "11px 13px" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { id: "alle", label: "Alle" },
                { id: "aktiv", label: "Aktive" },
                { id: "offene", label: "Offene Aufgaben" },
                { id: "zuletzt", label: "Zuletzt bearbeitet" },
              ].map(filter => (
                <button key={filter.id} type="button" onClick={() => setClientQuickFilter(filter.id)} style={{ border: clientQuickFilter === filter.id ? "1px solid #64748b" : "1px solid #e2e8f0", background: clientQuickFilter === filter.id ? "#f1f5f9" : "#fff", color: clientQuickFilter === filter.id ? "#1e293b" : "#64748b", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{filter.label}</button>
              ))}
            </div>
          </div>
          {dashboardClients.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine interne Zuständigkeit hinterlegt.</p>}
          {dashboardClients.length > 0 && visibleDashboardClients.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine passenden Klienten gefunden.</p>}
          {visibleDashboardClients.map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ minWidth: 0 }}>
                <button type="button" onClick={() => onOpenClient(c)} style={{ background: "none", border: "none", padding: 0, margin: 0, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 800, fontSize: 14, color: "#1a4480", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{c.name}</button>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{c.aktenzeichen || "ohne Aktenzeichen"} · {c.status || "ohne Status"}{lastEntryByClient[c.id] ? ` · zuletzt ${formatDate(lastEntryByClient[c.id])}` : ""}</p>
              </div>
            </div>
          ))}
          <button onClick={() => setView("clients")} style={{ ...btnSecondary, width: "100%", justifyContent: "center", marginTop: 12, fontSize: 13 }}>Alle Fallakten →</button>
        </DashboardSection>
        <DashboardSection id="tasks" title="Offene Aufgaben" summary="Aktuelle Aufgaben aus den sichtbaren Fallakten." count={offeneAufgaben.length} open={openDashboardSection === "tasks"} onToggle={toggleSection}>
          {offeneAufgaben.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine offenen Aufgaben in deinen Akten.</p>}
          {offeneAufgaben.slice(0, 5).map(a => (
            <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{a.titel}</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
                <button type="button" onClick={() => openClientById(a.klientId)} style={{ background: "none", border: "none", padding: 0, color: "#1a4480", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700 }}>{a.klientName}</button>
                {" · "}{a.status}{a.datum ? ` · ${formatDate(a.datum)}` : ""}
              </p>
            </div>
          ))}
        </DashboardSection>
        <DashboardSection id="hours" title="Geleistete Stunden" summary="Dokumentierte Stunden aus den sichtbaren Akten." count={`${stunden.toFixed(1)} h`} open={openDashboardSection === "hours"} onToggle={toggleSection}>
          {hoursEntries.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Noch keine Stunden dokumentiert.</p>}
          {hoursEntries.slice(0, 6).map(e => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titel || "Dokumentierte Stunde"}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{getClientName(e.klientId)} · {formatDate(e.datum)}</p>
              </div>
              <span style={{ color: "#334155", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>{Number(e.stunden || 0).toFixed(1)} h</span>
            </div>
          ))}
        </DashboardSection>
      </div>
      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={card}>
          <h2 style={cardTitle}>🕐 Zuletzt dokumentiert</h2>
          {recent.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Noch keine Dokumentationen in deinen Akten.</p>}
          {recent.map(e => {
            const cid = getClientId(e);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ background: typBg(e.typ), color: typeColor(e.typ), borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{e.typ}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titel}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{getClientName(cid)} · {formatDate(e.datum)}</p>
                </div>
                <button onClick={() => openClientById(cid)} style={{ ...btnSecondary, fontSize: 11, padding: "5px 10px" }}>→</button>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <h2 style={cardTitle}>📅 Nächste Termine</h2>
          {nextTermine.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine anstehenden Termine.</p>}
          {nextTermine.map(t => (
            <div key={t.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
              <div style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 44 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a4480" }}>{new Date(t.datum).getDate()}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>{new Date(t.datum).toLocaleDateString("de-DE", { month: "short" })}</p>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{t.titel}</p>
                <p style={{ margin: "2px 0", fontSize: 11, color: "#64748b" }}>{formatTerminDateRange(t)} · {t.uhrzeit || "ganztägig"}{t.ort ? ` · ${t.ort}` : ""}{t.klientId ? ` · ${getClientName(t.klientId)}` : ""}</p>
                {t.erinnerung && <span style={{ display: "inline-block", marginTop: 3, fontSize: 10, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "2px 7px", fontWeight: 700 }}>Erinnerung</span>}
              </div>
            </div>
          ))}
          <button onClick={() => setView("kalender")} style={{ ...btnSecondary, width: "100%", justifyContent: "center", marginTop: 12, fontSize: 13 }}>Alle Termine →</button>
        </div>
      </div>
    </div>
  );
}

function ClientsView({ clients, allClients, search, setSearch, statusFilter, setStatusFilter, einrichtungFilter, setEinrichtungFilter, internFilter, setInternFilter, einrichtungen, internOptions, permissions, onSelect, onNew }) {
  const tabs = [
    { id: "alle", label: "Alle", count: allClients.length },
    { id: "aktiv", label: "Aktiv", count: allClients.filter(c => c.status === "aktiv").length },
    { id: "abgeschlossen", label: "Abgeschlossen", count: allClients.filter(c => c.status === "abgeschlossen" || c.status === "behandelt").length },
    { id: "archiviert", label: "Archiviert", count: allClients.filter(c => c.status === "archiviert").length },
  ];
  const hasAdvancedFilters = einrichtungen.length > 1 || internOptions.length > 1;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={pageTitle}>Fallakten</h1><p style={pageSubtitle}>{permissions.canViewAllCases ? "Gesamtbestand" : "Zugeordnete Fallakten"} mit {allClients.length} Akten</p></div>
        {onNew && <button onClick={onNew} style={btnPrimary}>+ Klient anlegen</button>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setStatusFilter(tab.id)} style={{ border: statusFilter === tab.id ? "1px solid #475569" : "1px solid #e2e8f0", background: statusFilter === tab.id ? "#f1f5f9" : "#fff", color: statusFilter === tab.id ? "#1e293b" : "#64748b", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {tab.label} <span style={{ color: "#94a3b8", marginLeft: 4 }}>{tab.count}</span>
          </button>
        ))}
      </div>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name oder Aktenzeichen suchen…" style={{ ...inputStyle, paddingLeft: 40 }} />
      </div>
      {hasAdvancedFilters && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(180px,1fr))", gap: 10, marginBottom: 20 }}>
          {einrichtungen.length > 1 && (
            <select value={einrichtungFilter} onChange={e => setEinrichtungFilter(e.target.value)} style={inputStyle}>
              <option value="alle">Alle Einrichtungen</option>
              {einrichtungen.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          {internOptions.length > 1 && (
            <select value={internFilter} onChange={e => setInternFilter(e.target.value)} style={inputStyle}>
              <option value="alle">Alle Zuständigen</option>
              {internOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          )}
        </div>
      )}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
              {["Name", "Geb.-datum", "Einrichtung", "Aktenzeichen", "Status", ""].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "13px 16px", fontWeight: 600, color: "#1e293b" }}>{c.name}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{formatDate(c.dob)}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{c.einrichtung}</td>
                  <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{c.aktenzeichen}</td>
                  <td style={{ padding: "13px 16px" }}><span style={{ background: c.status === "aktiv" ? "#dcfce7" : "#f1f5f9", color: c.status === "aktiv" ? "#16a34a" : "#64748b", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{c.status}</span></td>
                  <td style={{ padding: "13px 16px" }}><button onClick={() => onSelect(c)} style={{ ...btnPrimary, fontSize: 12, padding: "7px 16px" }}>Akte öffnen</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clients.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Keine Klienten gefunden.</p>}
      </div>
    </div>
  );
}

function AccessDeniedView({ setView }) {
  return (
    <div style={card}>
      <h1 style={cardTitle}>Kein Zugriff auf diese Fallakte</h1>
      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14 }}>Diese Fallakte ist deiner Rolle oder Zuständigkeit nicht zugeordnet.</p>
      <button onClick={() => setView("clients")} style={btnSecondary}>Zur Fallaktenübersicht</button>
    </div>
  );
}


function HeaderButton({ children, onClick, primary = false }) {
  return <button onClick={onClick} style={primary ? { ...btnPrimary, fontSize: 12 } : { ...btnSecondary, fontSize: 12 }}>{children}</button>;
}

function IconHeading({ icon, children, level = "h2", style = cardTitle }) {
  const Tag = level;
  return (
    <Tag style={{ ...style, display: "flex", alignItems: "center", gap: 10 }}>
      <SectionIcon name={SECTION_ICONS[icon] || icon} />
      <span>{children}</span>
    </Tag>
  );
}

function AkteSection({ sectionKey, title, color = "#0f2647", children, rightContent = null, open, onToggle }) {
  return (
    <div style={{ background: "#ffffff", borderRadius: 8, boxShadow: open ? "0 10px 26px rgba(15,23,42,.06)" : "none", overflow: "hidden", border: open ? "1px solid #94a3b8" : "1px solid #dbe3ea" }}>
      <button onClick={() => onToggle(sectionKey)} style={{ width: "100%", background: open ? "#f8fafc" : "#fff", border: "none", borderLeft: open ? `3px solid ${color}` : "3px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", textAlign: "left" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <SectionIcon name={SECTION_ICONS[sectionKey]} active={open} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "'DM Sans',sans-serif", letterSpacing: 0 }}>{title}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rightContent}
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 600 }}>{open ? "Schließen" : "Öffnen"}</span>
        </span>
      </button>
      {open && <div style={{ padding: "20px", borderTop: "1px solid #eef2f6", background: "#fff" }}>{children}</div>}
    </div>
  );
}

function SectionIcon({ name, active }) {
  if (!name) return null;
  const Icon = name;
  return (
    <span style={{ ...sectionIconWrapStyle, ...(active ? sectionIconActiveStyle : null) }}>
      <Icon size={19} strokeWidth={1.9} color={active ? "#1e3a5f" : "#475569"} aria-hidden="true" />
    </span>
  );
}

function EmptyState({ children }) {
  return <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>{children}</p>;
}

function CountBadge({ children }) {
  return <span style={{ minWidth: 24, textAlign: "center", fontSize: 12, color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>{children}</span>;
}

function DeleteButton({ onClick, label = "Entfernen" }) {
  return <button onClick={onClick} style={{ background: "transparent", border: "1px solid transparent", cursor: "pointer", color: "#64748b", fontSize: 12, fontWeight: 600, padding: "5px 8px", borderRadius: 6 }}>{label}</button>;
}

function StatusChip({ value, type = "neutral" }) {
  if (!value) return null;
  const normalized = String(value).replace(/_/g, " ");
  const tone = {
    done: { bg: "#ecfdf5", border: "#bbf7d0", color: "#166534" },
    active: { bg: "#f1f5f9", border: "#cbd5e1", color: "#334155" },
    waiting: { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b" },
    paused: { bg: "#fefce8", border: "#fde68a", color: "#854d0e" },
    neutral: { bg: "#f8fafc", border: "#e2e8f0", color: "#475569" },
  }[statusTone(value, type)] || { bg: "#f8fafc", border: "#e2e8f0", color: "#475569" };
  return <span style={{ ...statusChipStyle, background: tone.bg, borderColor: tone.border, color: tone.color }}>{normalized}</span>;
}

function statusTone(value, type) {
  const v = String(value || "").toLowerCase();
  if (v === "erledigt" || v === "abgeschlossen") return "done";
  if (v === "in_bearbeitung" || v === "laufend" || v === "aktiv") return "active";
  if (v === "pausiert") return "paused";
  if (v === "offen" || v === "inaktiv") return "waiting";
  return type === "status" ? "active" : "neutral";
}

function CompactRecord({ title, meta, text, audit, onDelete, status, statusType, statusOptions = null, onStatusChange = null, statusDisabled = false }) {
  return (
    <div style={compactRecordStyle}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <p style={recordTitleStyle}>{title}</p>
          {statusOptions ? (
            <select value={status || statusOptions[0]} disabled={statusDisabled} onChange={e => onStatusChange?.(e.target.value)} style={{ ...statusSelectStyle, opacity: statusDisabled ? .55 : 1, cursor: statusDisabled ? "not-allowed" : "pointer" }}>
              {statusOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : (
            <StatusChip value={status} type={statusType} />
          )}
        </div>
        {meta && <p style={recordMetaStyle}>{meta}</p>}
        {text && <p style={recordTextStyle}>{text}</p>}
        {audit && <AuditMeta audit={audit} />}
      </div>
      {onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  );
}

function AuditMeta({ audit }) {
  if (!audit?.createdAt && !audit?.updatedAt) return null;
  const created = audit.createdAt
    ? `Erstellt ${formatDateTime(audit.createdAt)}${audit.createdBy ? ` von ${audit.createdBy}` : ""}`
    : "";
  const updated = audit.updatedAt
    ? `Zuletzt geändert ${formatDateTime(audit.updatedAt)}${audit.updatedBy ? ` von ${audit.updatedBy}` : ""}`
    : "";
  return (
    <p style={{ ...recordMetaStyle, marginTop: 6 }}>
      {[created, updated].filter(Boolean).join(" · ")}
    </p>
  );
}

const auditActionLabel = (action) => ({ create: "erstellt", update: "geändert", delete: "gelöscht" }[action] || action);
const auditEntityLabel = (entity) => ({
  dokumentationen: "Dokumentation",
  eintraege: "Eintrag",
  aufgaben: "Aufgabe",
  ziele: "Ziel",
  termine: "Termin",
  notizen: "Notiz",
  zustaendigkeit_intern: "Interne Zuständigkeit",
  zustaendigkeit_extern: "Externe Zuständigkeit",
  fallakten_freigaben: "Fallaktenfreigabe",
  nutzer: "Benutzer",
}[entity] || entity);

function OutlookSyncBadge({ termin }) {
  const status = termin.outlook_sync_status || "none";
  if (status === "none" && !termin.outlook_sync_requested) {
    return <span style={{ ...statusChipStyle, background: "#f8fafc", borderColor: "#e2e8f0", color: "#64748b" }}>Nicht mit Outlook synchronisiert</span>;
  }
  const tone = {
    pending: { bg: "#f8fafc", border: "#cbd5e1", color: "#475569", label: "Outlook ausstehend" },
    synced: { bg: "#ecfdf5", border: "#bbf7d0", color: "#166534", label: "Mit Outlook synchronisiert" },
    failed: { bg: "#fff1f2", border: "#fecdd3", color: "#991b1b", label: "Outlook fehlgeschlagen" },
  }[status] || { bg: "#f8fafc", border: "#e2e8f0", color: "#64748b", label: "Outlook nicht synchronisiert" };
  return <span title={termin.outlook_sync_error || ""} style={{ ...statusChipStyle, background: tone.bg, borderColor: tone.border, color: tone.color }}>{tone.label}</span>;
}

function AuditLogList({ logs, users, user }) {
  const visibleLogs = (logs || []).slice(0, 8);
  if (!visibleLogs.length) return <EmptyState>Noch kein Änderungsverlauf für diese Fallakte vorhanden.</EmptyState>;
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
      <p style={{ margin: "0 0 10px", color: "#334155", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>Änderungsverlauf</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleLogs.map(log => (
          <div key={log.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, padding: "9px 0", borderTop: "1px solid #f1f5f9" }}>
            <span style={{ ...recordMetaStyle, margin: 0 }}>{formatDateTime(log.changed_at)}</span>
            <p style={{ margin: 0, color: "#475569", fontSize: 12, lineHeight: 1.5 }}>
              <strong style={{ color: "#1f2937" }}>{auditEntityLabel(log.entity_type)}</strong> {auditActionLabel(log.action)}
              {log.changed_by ? ` von ${resolveUserName(log.changed_by, users, user)}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChronoRecord({ item, onEdit, onDelete, canEdit, audit }) {
  return (
    <div style={chronoRecordStyle}>
      <div className="chrono-grid" style={chronoHeaderGridStyle}>
        <div>
          <span style={chronoLabelStyle}>Datum</span>
          <p style={chronoMetaValueStyle}>{formatDate(item.datum)}</p>
        </div>
        <div>
          <span style={chronoLabelStyle}>Bereich</span>
          <p style={chronoMetaValueStyle}>{item.quelle}</p>
        </div>
        <div>
          <span style={chronoLabelStyle}>Kontaktart</span>
          <StatusChip value={item.kontaktart || item.quelle} />
        </div>
        <div style={{ minWidth: 0 }}>
          <span style={chronoLabelStyle}>Titel</span>
          <p style={recordTitleStyle}>{item.titel}</p>
          {item.autor && <p style={recordMetaStyle}>{item.autor}</p>}
        </div>
      </div>
      <p style={{ ...recordTextStyle, marginTop: 10 }}>{item.text}</p>
      {audit && <AuditMeta audit={audit} />}
      {(item.nachgetragen || item.hashtags?.length > 0) && (
        <p style={{ ...recordMetaStyle, marginTop: 8 }}>
          {item.nachgetragen ? "Nachgetragen" : ""}
          {item.nachgetragen && item.hashtags?.length > 0 ? " · " : ""}
          {item.hashtags?.map(tag => `#${tag}`).join(" ")}
        </p>
      )}
      {canEdit && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={onEdit} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px" }}>Bearbeiten</button>
          {onDelete && <button type="button" onClick={onDelete} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px", color: "#991b1b" }}>Löschen</button>}
        </div>
      )}
    </div>
  );
}

function NoteRecord({ note, users, user }) {
  const noteDate = note.datum || note.created_at;
  return (
    <div style={noteRecordStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13, color: "#111827" }}>{note.titel}</strong>
        <span style={recordMetaStyle}>{note.autor}{noteDate ? ` · ${formatDate(noteDate)}` : ""}</span>
      </div>
      {note.text && <p style={{ ...recordTextStyle, marginTop: 8 }}>{note.text}</p>}
      <AuditMeta audit={{
        createdAt: note.created_at,
        createdBy: note.created_by ? resolveUserName(note.created_by, users, user, note.autor || "Unbekannt") : note.autor,
        updatedAt: note.updated_at,
        updatedBy: note.updated_by ? resolveUserName(note.updated_by, users, user) : "",
      }} />
    </div>
  );
}

function DetailView({ client, eintraege, onBack, onNewEintrag, onKiBericht, canEdit, permissions, notizen, termine, auditLogs, refreshAuditLogs, user, users, showToast, fallakten, setFallakten, setEintraege }) {
  const [openMap, setOpenMap] = useState({ klient: false, aufgaben: false, intern: false, extern: false, ziele: false, dateien: false, soziales: false, gesundheit: false, bildungBeruf: false, finanzen: false, behoerden: false, freizeit: false, dokumentation: false, notizen: false });
  const [newDocs, setNewDocs] = useState({ soziales: { titel: "", text: "", datum: ds(new Date()) }, gesundheit: { titel: "", text: "", datum: ds(new Date()) }, bildungBeruf: { titel: "", text: "", datum: ds(new Date()) }, finanzen: { titel: "", text: "", datum: ds(new Date()) }, behoerden: { titel: "", text: "", datum: ds(new Date()) }, freizeit: { titel: "", text: "", datum: ds(new Date()) } });
  const [quickFields, setQuickFields] = useState({ aufgabe: "", aufgabeDatum: ds(new Date()), externName: "", externStelle: "", externTelefon: "", externEmail: "", ziel: "", zielDatum: ds(new Date()), dateiKategorie: "Dokument", dateiDatum: ds(new Date()) });
  const [selectedInternUserId, setSelectedInternUserId] = useState("");
  const [pdfPreview, setPdfPreview] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState("alle");
  const [taskSearch, setTaskSearch] = useState("");
  const fileInputRef = useRef(null);
  const akte = fallakten?.[client.id] || createEmptyFallakte(client);
  const clientNotizen = (notizen || []).filter(n => n.klientId == client.id);
  const clientTermine = (termine || []).filter(t => String(t.klientId) === String(client.id));
  const clientAuditLogs = (auditLogs || []).filter(log => String(log.klient_id) === String(client.id));
  const interneAuswahl = (users || []).filter(u => u.rolle === "Fachkraft" || u.rolle === "Leitung" || u.rolle === "Admin");
  const canDeleteRecords = permissions?.canDeleteRecords;
  const canDeleteFiles = permissions?.canDeleteFiles;
  const canManageAssignments = permissions?.canManageAssignments;
  const blockEdit = () => showToast("Du darfst diese Fallakte nicht bearbeiten.", "#c0392b");
  const taskQuery = taskSearch.trim().toLowerCase();
  const filteredAufgaben = (akte.aufgaben || []).filter(item => {
    const matchesStatus = taskStatusFilter === "alle" || item.status === taskStatusFilter;
    const matchesSearch = !taskQuery || (item.titel || "").toLowerCase().includes(taskQuery) || (item.notiz || "").toLowerCase().includes(taskQuery);
    return matchesStatus && matchesSearch;
  });
  const auditMeta = (record, fallbackAuthor = "") => ({
    createdAt: record?.created_at,
    createdBy: record?.created_by ? resolveUserName(record.created_by, users, user, fallbackAuthor || "Unbekannt") : fallbackAuthor,
    updatedAt: record?.updated_at,
    updatedBy: record?.updated_by ? resolveUserName(record.updated_by, users, user, fallbackAuthor || "Unbekannt") : "",
  });
  const refreshClientAudit = () => refreshAuditLogs?.();

  const patchAkte = (updater) => {
    setFallakten(prev => {
      const current = prev?.[client.id] || createEmptyFallakte(client);
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [client.id]: next };
    });
  };

  const updateKlient = async (key, value) => {
    if (!canEdit) return blockEdit();
    patchAkte(cur => ({ ...cur, klient: { ...cur.klient, [key]: value } }));
    const dbPayload = {};
    if (key === "telefon") dbPayload.telefon = value;
    if (key === "email") dbPayload.email = value;
    if (key === "beginnHilfe") dbPayload.aufnahmedatum = value || null;
    if (key === "hilfeart") dbPayload.hilfeart = value;
    if (key === "adresse") dbPayload.adresse = value;
    if (key === "besondereHinweise") dbPayload.anmerkungen = value;
    if (Object.keys(dbPayload).length) {
      await supabase.from("klienten").update(dbPayload).eq("id", client.id);
    }
  };

  const addSimpleItem = async (section, payload) => {
    if (!canEdit) return blockEdit();
    if (section === "aufgaben") {
      const { data, error } = await supabase.from("aufgaben").insert([{
        klient_id: client.id,
        titel: payload.titel,
        beschreibung: payload.notiz || "",
        status: payload.status || "offen",
        datum: payload.datum || ds(new Date()),
        created_by: user?.id || null,
      }]).select().single();
      if (error) return showToast("Aufgabe konnte nicht gespeichert werden.", "#c0392b");
      patchAkte(cur => ({ ...cur, aufgaben: [{ id: data.id, titel: data.titel, status: data.status, notiz: data.beschreibung || "", datum: data.datum, created_by: data.created_by, created_at: data.created_at, updated_by: data.updated_by, updated_at: data.updated_at }, ...(cur.aufgaben || [])] }));
      refreshClientAudit();
      return;
    }
    if (section === "ziele") {
      const { data, error } = await supabase.from("ziele").insert([{
        klient_id: client.id,
        titel: payload.titel,
        beschreibung: payload.notiz || "",
        status: payload.status || "laufend",
        startdatum: payload.datum || ds(new Date()),
        datum: payload.datum || ds(new Date()),
        created_by: user?.id || null,
      }]).select().single();
      if (error) return showToast("Ziel konnte nicht gespeichert werden.", "#c0392b");
      patchAkte(cur => ({ ...cur, ziele: [{ id: data.id, titel: data.titel, status: data.status, notiz: data.beschreibung || "", datum: data.startdatum || data.datum, created_by: data.created_by, created_at: data.created_at, updated_by: data.updated_by, updated_at: data.updated_at }, ...(cur.ziele || [])] }));
      refreshClientAudit();
      return;
    }
    if (section === "extern") {
      const { data, error } = await supabase.from("zustaendigkeit_extern").insert([{
        klient_id: client.id,
        institution: payload.stelle || payload.name || "",
        ansprechperson: payload.name || "",
        funktion: payload.rolle || "",
        telefon: payload.telefon || "",
        email: payload.email || "",
        created_by: user?.id || null,
      }]).select().single();
      if (error) return showToast("Externe Zuständigkeit konnte nicht gespeichert werden.", "#c0392b");
      patchAkte(cur => ({ ...cur, extern: [{ id: data.id, name: data.ansprechperson || data.institution, stelle: data.institution, rolle: data.funktion || "", telefon: data.telefon || "", email: data.email || "", created_by: data.created_by, created_at: data.created_at, updated_by: data.updated_by, updated_at: data.updated_at }, ...(cur.extern || [])] }));
      refreshClientAudit();
      return;
    }
    if (section === "intern") {
      const picked = interneAuswahl.find(u => String(u.id) === String(payload.userId || payload.id || payload.nutzer_id));
      const nutzerId = payload.userId || payload.id || payload.nutzer_id;
      const { data, error } = await supabase.from("zustaendigkeit_intern").insert([{
        klient_id: client.id,
        nutzer_id: nutzerId,
        funktion: payload.rolle || picked?.rolle || "Fachkraft",
        created_by: user?.id || null,
      }]).select().single();
      if (error) return showToast("Interne Zuständigkeit konnte nicht gespeichert werden.", "#c0392b");
      patchAkte(cur => ({ ...cur, intern: [{ id: data.id, userId: nutzerId, name: payload.name || picked?.name || "", rolle: data.funktion || picked?.rolle || "", telefon: "", email: picked?.email || "", created_by: data.created_by, created_at: data.created_at, updated_by: data.updated_by, updated_at: data.updated_at }, ...(cur.intern || [])] }));
      refreshClientAudit();
    }
  };

  const updateAufgabeStatus = async (id, status) => {
    if (!canEdit) return blockEdit();
    if (!AUFGABEN_STATUS.includes(status)) return showToast("Ungültiger Aufgabenstatus.", "#c0392b");
    const { data, error } = await supabase.from("aufgaben").update({ status, updated_by: user?.id || null }).eq("id", id).select().single();
    if (error) return showToast(`Aufgabenstatus konnte nicht gespeichert werden: ${error.message}`, "#c0392b");
    patchAkte(cur => ({
      ...cur,
      aufgaben: (cur.aufgaben || []).map(item => String(item.id) === String(id) ? { ...item, status: data?.status || status, updated_by: data?.updated_by, updated_at: data?.updated_at } : item),
    }));
    refreshClientAudit();
    showToast("Aufgabenstatus aktualisiert ✓");
  };

  const addFachDoc = async (bereich) => {
    if (!canEdit) return blockEdit();
    const form = newDocs[bereich];
    if (!form.titel.trim() || !form.text.trim()) return showToast("Bitte Titel und Inhalt eingeben.", "#c0392b");
    const dbBereich = normalizeBereichKey(bereich);
    const { data, error } = await supabase.from("dokumentationen").insert([{
      klient_id: client.id,
      bereich: dbBereich,
      datum: form.datum || ds(new Date()),
      titel: form.titel,
      inhalt: form.text,
      erstellt_von_name: user?.name || "",
      created_by: user?.id || null,
    }]).select().single();
    if (error) return showToast("Dokumentation konnte nicht gespeichert werden.", "#c0392b");
    patchAkte(cur => ({
      ...cur,
      fachbereiche: {
        ...cur.fachbereiche,
        [bereich]: [{ id: data.id, titel: data.titel, text: data.inhalt, datum: data.datum, autor: data.erstellt_von_name || user?.name || "", created_by: data.created_by, created_at: data.created_at, updated_by: data.updated_by, updated_at: data.updated_at }, ...(cur.fachbereiche?.[bereich] || [])],
      },
    }));
    setNewDocs(prev => ({ ...prev, [bereich]: { titel: "", text: "", datum: ds(new Date()) } }));
    refreshClientAudit();
    showToast(`${fachbereichLabel(dbBereich)} ergänzt ✓`);
  };

  const handleDateiUpload = async (event) => {
    if (!canEdit) return blockEdit();
    const file = event.target.files?.[0];
    if (!file) return;
    const safeName = `${client.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bucket = "client-files";
    const { error: uploadError } = await supabase.storage.from(bucket).upload(safeName, file, { upsert: false });
    if (uploadError) {
      showToast("Datei konnte nicht hochgeladen werden.", "#c0392b");
      event.target.value = "";
      return;
    }
    const categoryMap = {
      "Dokument": "allgemein",
      "Bewerbung": "bewerbung",
      "Verfügung/Jugendamt": "jugendamt",
      "Schule": "schule",
      "Medizin": "medizin",
    };
    const dbCategory = categoryMap[quickFields.dateiKategorie] || "allgemein";
    const { data, error } = await supabase.from("dateien").insert([{
      klient_id: client.id,
      dateiname: file.name,
      original_dateiname: file.name,
      speicherpfad: safeName,
      bucket,
      kategorie: dbCategory,
      datum: quickFields.dateiDatum || ds(new Date()),
      dateigroesse: file.size,
      mime_type: file.type || "",
      created_by: user?.id || null,
    }]).select().single();
    if (error) return showToast("Datei-Metadaten konnten nicht gespeichert werden.", "#c0392b");
    patchAkte(cur => ({
      ...cur,
      dateien: [{
        id: data.id,
        name: data.original_dateiname || data.dateiname,
        kategorie: data.kategorie,
        datum: data.datum,
        size: data.dateigroesse,
        mimeType: data.mime_type,
        bucket: data.bucket,
        path: data.speicherpfad,
      }, ...(cur.dateien || [])]
    }));
    setQuickFields(p => ({ ...p, dateiKategorie: "Dokument", dateiDatum: ds(new Date()) }));
    event.target.value = "";
    showToast("Datei hinzugefügt ✓");
  };

  const isPdfFile = (item) => item?.mimeType === "application/pdf" || /\.pdf$/i.test(item?.name || "");

  const getSignedFileUrl = async (item) => {
    if (!item?.path) return showToast("Für diese Datei liegt kein Speicherpfad vor.", "#c0392b");
    const { data, error } = await supabase.storage.from(item.bucket || "client-files").createSignedUrl(item.path, 60);
    if (error || !data?.signedUrl) return showToast("Download konnte nicht erstellt werden.", "#c0392b");
    return data.signedUrl;
  };

  const downloadStoredFile = async (item) => {
    const signedUrl = await getSignedFileUrl(item);
    if (signedUrl) window.open(signedUrl, "_blank");
  };

  const openStoredFile = async (item) => {
    const signedUrl = await getSignedFileUrl(item);
    if (!signedUrl) return;
    if (!isPdfFile(item)) {
      window.open(signedUrl, "_blank");
      return;
    }
    setPdfPreview({ ...item, url: signedUrl });
  };

  const removeItem = async (section, id) => {
    if (!canDeleteRecords && section !== "dateien") return showToast("Nur Admins dürfen Einträge löschen.", "#c0392b");
    if (section === "dateien" && !canDeleteFiles) return showToast("Nur Admins dürfen Dateien löschen.", "#c0392b");
    const tableMap = { aufgaben: "aufgaben", ziele: "ziele", extern: "zustaendigkeit_extern", intern: "zustaendigkeit_intern", dateien: "dateien" };
    const table = tableMap[section];
    if (!table) return;
    if (section === "dateien") {
      const file = (akte.dateien || []).find(x => x.id === id);
      if (file?.path) await supabase.storage.from(file.bucket || "client-files").remove([file.path]);
    }
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return showToast("Eintrag konnte nicht gelöscht werden.", "#c0392b");
    patchAkte(cur => ({ ...cur, [section]: (cur[section] || []).filter(x => x.id !== id) }));
    refreshClientAudit();
  };

  const removeDoc = async (bereich, id) => {
    if (!canDeleteRecords) return showToast("Nur Admins dürfen Dokumentationen löschen.", "#c0392b");
    const { error } = await supabase.from("dokumentationen").delete().eq("id", id);
    if (error) return showToast("Dokumentation konnte nicht gelöscht werden.", "#c0392b");
    patchAkte(cur => ({ ...cur, fachbereiche: { ...cur.fachbereiche, [bereich]: (cur.fachbereiche?.[bereich] || []).filter(x => x.id !== id) } }));
    refreshClientAudit();
  };

  const docFormFromItem = (item) => ({
    id: item.docId || item.rawId || item.id,
    sourceTable: item.sourceTable || "dokumentationen",
    bereich: item.bereich || "allgemein",
    kontaktart: item.kontaktart || "",
    datum: item.datum || ds(new Date()),
    titel: item.titel || "",
    text: item.text || "",
    hashtags: Array.isArray(item.hashtags) ? item.hashtags.join(", ") : (item.hashtags || ""),
    nachgetragen: Boolean(item.nachgetragen),
  });

  const applyDocumentationUpdate = (data) => {
    const dbBereich = data.bereich || "allgemein";
    const fachKey = denormalizeBereichKey(dbBereich);
    const updatedEntry = {
      id: data.id,
      datum: data.datum,
      typ: dbBereich === "allgemein" ? (data.kontaktart || "Fallverlauf") : fachbereichLabel(dbBereich),
      titel: data.titel,
      text: data.inhalt,
      fachkraft: data.erstellt_von_name || user?.name || "",
      stunden: null,
      sourceTable: "dokumentationen",
      bereich: dbBereich,
      kontaktart: data.kontaktart || "",
      hashtags: data.hashtags || [],
      nachgetragen: Boolean(data.nachgetragen),
      created_by: data.created_by,
      created_at: data.created_at,
      updated_by: data.updated_by,
      updated_at: data.updated_at,
    };
    setEintraege(prev => ({
      ...prev,
      [client.id]: (prev[client.id] || []).map(e => String(e.id) === String(data.id) ? updatedEntry : e),
    }));
    patchAkte(cur => {
      const fachbereiche = Object.fromEntries(Object.entries(cur.fachbereiche || {}).map(([key, items]) => [
        key,
        (items || []).filter(item => String(item.id) !== String(data.id)),
      ]));
      if (dbBereich !== "allgemein") {
        fachbereiche[fachKey] = [{
          id: data.id,
          titel: data.titel,
          text: data.inhalt,
          datum: data.datum,
          autor: data.erstellt_von_name || user?.name || "",
          bereich: dbBereich,
          kontaktart: data.kontaktart || "",
          hashtags: data.hashtags || [],
          nachgetragen: Boolean(data.nachgetragen),
          created_by: data.created_by,
          created_at: data.created_at,
          updated_by: data.updated_by,
          updated_at: data.updated_at,
        }, ...(fachbereiche[fachKey] || [])];
      }
      return { ...cur, fachbereiche };
    });
  };

  const updateDocumentation = async () => {
    if (!canEdit) return blockEdit();
    if (!editingDoc?.titel.trim() || !editingDoc?.text.trim()) return showToast("Bitte Titel und Inhalt eingeben.", "#c0392b");
    if (editingDoc.sourceTable === "eintraege") {
      const { data, error } = await supabase.from("eintraege").update({
        datum: editingDoc.datum || ds(new Date()),
        typ: editingDoc.kontaktart === "Maßnahme" ? "Massnahme" : (editingDoc.kontaktart || "Fallverlauf"),
        titel: editingDoc.titel,
        text: editingDoc.text,
        updated_by: user?.id || null,
      }).eq("id", editingDoc.id).select().single();
      if (error) return showToast(`Eintrag konnte nicht aktualisiert werden: ${error.message}`, "#c0392b");
      const mapped = { ...data, typ: data.typ === "Massnahme" ? "Maßnahme" : data.typ, sourceTable: "eintraege", bereich: "allgemein", kontaktart: data.typ };
      setEintraege(prev => ({
        ...prev,
        [client.id]: (prev[client.id] || []).map(e => String(e.id) === String(data.id) ? mapped : e),
      }));
      setEditingDoc(null);
      refreshClientAudit();
      showToast("Dokumentation aktualisiert ✓");
      return;
    }
    const tags = editingDoc.hashtags.split(",").map(tag => tag.trim()).filter(Boolean);
    const payload = {
      bereich: editingDoc.bereich,
      kontaktart: editingDoc.kontaktart,
      datum: editingDoc.datum || ds(new Date()),
      titel: editingDoc.titel,
      inhalt: editingDoc.text,
      hashtags: tags,
      nachgetragen: editingDoc.nachgetragen,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("dokumentationen").update(payload).eq("id", editingDoc.id).select().single();
    if (error) return showToast(`Dokumentation konnte nicht aktualisiert werden: ${error.message}`, "#c0392b");
    applyDocumentationUpdate(data);
    setEditingDoc(null);
    refreshClientAudit();
    showToast("Dokumentation aktualisiert ✓");
  };

  const deleteDocumentation = async (item) => {
    if (!canDeleteRecords) return showToast("Nur Admins dürfen Dokumentationen löschen.", "#c0392b");
    const docId = item.docId || item.rawId;
    const table = item.sourceTable === "eintraege" ? "eintraege" : "dokumentationen";
    const { error } = await supabase.from(table).delete().eq("id", docId);
    if (error) return showToast("Dokumentation konnte nicht gelöscht werden.", "#c0392b");
    setEintraege(prev => ({ ...prev, [client.id]: (prev[client.id] || []).filter(e => String(e.id) !== String(docId)) }));
    patchAkte(cur => ({
      ...cur,
      fachbereiche: Object.fromEntries(Object.entries(cur.fachbereiche || {}).map(([key, items]) => [
        key,
        (items || []).filter(doc => String(doc.id) !== String(docId)),
      ])),
    }));
    refreshClientAudit();
    showToast("Dokumentation gelöscht", "#64748b");
  };

  const toggleSection = (key) => setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));

  const chronoDokumentation = [
    ...Object.entries(akte.fachbereiche || {}).flatMap(([bereich, items]) => (items || []).map(item => ({
      id: `${bereich}-${item.id}`,
      docId: item.id,
      sourceTable: "dokumentationen",
      bereich: item.bereich || normalizeBereichKey(bereich),
      datum: item.datum,
      titel: item.titel,
      text: item.text,
      autor: item.autor,
      quelle: fachbereichLabel(bereich),
      kontaktart: item.kontaktart || "Fachbereich",
      hashtags: item.hashtags || [],
      nachgetragen: Boolean(item.nachgetragen),
      created_by: item.created_by,
      created_at: item.created_at,
      updated_by: item.updated_by,
      updated_at: item.updated_at,
      farbe: fachbereichFarbe(bereich),
    }))),
    ...eintraege.map(e => ({
      id: `eintrag-${e.id}`,
      docId: e.id,
      sourceTable: e.sourceTable || "dokumentationen",
      bereich: e.bereich || "allgemein",
      datum: e.datum,
      titel: e.titel,
      text: e.text,
      autor: e.fachkraft,
      quelle: e.bereich && e.bereich !== "allgemein" ? fachbereichLabel(e.bereich) : "Dokumentation",
      kontaktart: e.kontaktart || e.typ,
      hashtags: e.hashtags || [],
      nachgetragen: Boolean(e.nachgetragen),
      created_by: e.created_by,
      created_at: e.created_at,
      updated_by: e.updated_by,
      updated_at: e.updated_at,
      farbe: typeColor(e.typ),
    })),
  ].sort((a, b) => new Date(b.datum) - new Date(a.datum));
  const printCurrentFallakte = () => printFallakte({ client, akte, dokumentation: chronoDokumentation, notizen: clientNotizen, termine: clientTermine, user });

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, fontFamily: "'DM Sans',sans-serif", marginBottom: 16, padding: 0 }}>← Zurück</button>
      <div style={{ background: "#fff", borderRadius: 12, padding: "24px 26px", marginBottom: 20, border: "1px solid #dbe3f1", boxShadow: "0 1px 6px rgba(15,23,42,.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 34, margin: 0, color: "#0f172a" }}>Fallakte {client.name}</h1>
            <p style={{ margin: "8px 0 0", color: "#334155", fontSize: 15 }}>Geburtsdatum: {formatDate(client.dob)} · Telefon: {akte.klient.telefon || "—"}</p>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>Aktenzeichen {client.aktenzeichen} · {client.einrichtung} · Hilfeart: {akte.klient.hilfeart || "—"}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HeaderButton onClick={printCurrentFallakte}>Drucken</HeaderButton>
            <HeaderButton onClick={printCurrentFallakte}>PDF-Ansicht</HeaderButton>
            <HeaderButton onClick={onKiBericht}>🤖 KI-Bericht</HeaderButton>
            {canEdit && <HeaderButton primary onClick={onNewEintrag}>+ Dokumentation</HeaderButton>}
          </div>
        </div>
      </div>

      <div className="akte-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
        <AkteSection sectionKey="klient" title="Klient" open={openMap["klient"]} onToggle={toggleSection}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            <FormField label="Geburtsdatum"><input value={formatDate(client.dob)} disabled style={{ ...inputStyle, background: "#f8fafc" }} /></FormField>
            <FormField label="Telefon"><input value={akte.klient.telefon} disabled={!canEdit} onChange={e => updateKlient("telefon", e.target.value)} style={{ ...inputStyle, background: canEdit ? "#fff" : "#f8fafc" }} placeholder="Telefonnummer" /></FormField>
            <FormField label="E-Mail"><input value={akte.klient.email} disabled={!canEdit} onChange={e => updateKlient("email", e.target.value)} style={{ ...inputStyle, background: canEdit ? "#fff" : "#f8fafc" }} placeholder="E-Mail" /></FormField>
            <FormField label="Beginn Hilfe"><input type="date" value={akte.klient.beginnHilfe} disabled={!canEdit} onChange={e => updateKlient("beginnHilfe", e.target.value)} style={{ ...inputStyle, background: canEdit ? "#fff" : "#f8fafc" }} /></FormField>
            <div style={{ gridColumn: "1 / -1" }}><FormField label="Adresse"><input value={akte.klient.adresse} disabled={!canEdit} onChange={e => updateKlient("adresse", e.target.value)} style={{ ...inputStyle, background: canEdit ? "#fff" : "#f8fafc" }} placeholder="Adresse" /></FormField></div>
            <FormField label="Hilfeart"><input value={akte.klient.hilfeart} disabled={!canEdit} onChange={e => updateKlient("hilfeart", e.target.value)} style={{ ...inputStyle, background: canEdit ? "#fff" : "#f8fafc" }} placeholder="z. B. EB / SPFH" /></FormField>
            <FormField label="Bezugspersonen"><input value={akte.klient.bezugspersonen} disabled={!canEdit} onChange={e => updateKlient("bezugspersonen", e.target.value)} style={{ ...inputStyle, background: canEdit ? "#fff" : "#f8fafc" }} placeholder="Familie, Schule, Bezugspersonen" /></FormField>
            <div style={{ gridColumn: "1 / -1" }}><FormField label="Besondere Hinweise"><textarea rows={3} value={akte.klient.besondereHinweise} disabled={!canEdit} onChange={e => updateKlient("besondereHinweise", e.target.value)} style={{ ...inputStyle, resize: "vertical", background: canEdit ? "#fff" : "#f8fafc" }} placeholder="Wichtige allgemeine Hinweise zum Klienten" /></FormField></div>
          </div>
        </AkteSection>

        <AkteSection sectionKey="aufgaben" title="Aufgaben" rightContent={<CountBadge>{akte.aufgaben?.length || 0}</CountBadge>} open={openMap["aufgaben"]} onToggle={toggleSection}>
          {canEdit && <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 10 }}>
            <input value={quickFields.aufgabe} onChange={e => setQuickFields(p => ({ ...p, aufgabe: e.target.value }))} style={inputStyle} placeholder="Neue Aufgabe / Notiz" />
            <input type="date" value={quickFields.aufgabeDatum} onChange={e => setQuickFields(p => ({ ...p, aufgabeDatum: e.target.value }))} style={inputStyle} />
            <button onClick={() => { if (!quickFields.aufgabe.trim()) return; addSimpleItem("aufgaben", { titel: quickFields.aufgabe, status: "offen", notiz: "", datum: quickFields.aufgabeDatum || ds(new Date()) }); setQuickFields(p => ({ ...p, aufgabe: "", aufgabeDatum: ds(new Date()) })); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Hinzufügen</button>
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 9, marginBottom: 12, padding: "12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <p style={{ margin: 0, color: "#334155", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px" }}>Aufgaben filtern</p>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{filteredAufgaben.length} von {(akte.aufgaben || []).length}</span>
            </div>
            <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} style={{ ...inputStyle, fontSize: 13, padding: "9px 11px", background: "#fff" }} placeholder="Titel oder Beschreibung suchen…" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { id: "alle", label: "Alle" },
                { id: "offen", label: "offen" },
                { id: "in_bearbeitung", label: "in_bearbeitung" },
                { id: "erledigt", label: "erledigt" },
              ].map(filter => (
                <button key={filter.id} onClick={() => setTaskStatusFilter(filter.id)} style={{ border: taskStatusFilter === filter.id ? "1px solid #64748b" : "1px solid #e2e8f0", background: taskStatusFilter === filter.id ? "#e2e8f0" : "#fff", color: taskStatusFilter === filter.id ? "#1e293b" : "#64748b", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{filter.label}</button>
              ))}
            </div>
          </div>
          {(akte.aufgaben || []).length === 0 && <EmptyState>Noch keine Aufgaben erfasst.</EmptyState>}
          {(akte.aufgaben || []).length > 0 && filteredAufgaben.length === 0 && <EmptyState>Keine passenden Aufgaben gefunden.</EmptyState>}
          {filteredAufgaben.map(item => <CompactRecord key={item.id} title={item.titel} status={item.status} statusType="status" statusOptions={AUFGABEN_STATUS} statusDisabled={!canEdit} onStatusChange={(status) => updateAufgabeStatus(item.id, status)} meta={item.datum ? formatDate(item.datum) : ""} text={item.notiz} audit={auditMeta(item)} onDelete={canDeleteRecords ? () => removeItem("aufgaben", item.id) : null} />)}
        </AkteSection>

        <AkteSection sectionKey="extern" title="Zuständigkeit extern" open={openMap["extern"]} onToggle={toggleSection}>
          {canEdit && <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, marginBottom: 8 }}>
            <input value={quickFields.externName} onChange={e => setQuickFields(p => ({ ...p, externName: e.target.value }))} style={inputStyle} placeholder="Name, z. B. Frau V." />
            <input value={quickFields.externStelle} onChange={e => setQuickFields(p => ({ ...p, externStelle: e.target.value }))} style={inputStyle} placeholder="Institution / Stelle" />
            <input value={quickFields.externTelefon} onChange={e => setQuickFields(p => ({ ...p, externTelefon: e.target.value }))} style={inputStyle} placeholder="Telefon" />
            <input value={quickFields.externEmail} onChange={e => setQuickFields(p => ({ ...p, externEmail: e.target.value }))} style={inputStyle} placeholder="E-Mail" />
          </div>}
          {canEdit && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button onClick={() => { if (!quickFields.externName.trim()) return; addSimpleItem("extern", { name: quickFields.externName, stelle: quickFields.externStelle, telefon: quickFields.externTelefon, email: quickFields.externEmail }); setQuickFields(p => ({ ...p, externName: "", externStelle: "", externTelefon: "", externEmail: "" })); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Kontakt</button>
          </div>}
          {(akte.extern || []).map(item => <CompactRecord key={item.id} title={item.name} status={item.status || "aktiv"} statusType="status" meta={`${item.stelle || "Externe Stelle"}${item.telefon ? ` · ${item.telefon}` : ""}${item.email ? ` · ${item.email}` : ""}`} audit={auditMeta(item)} onDelete={canDeleteRecords ? () => removeItem("extern", item.id) : null} />)}
          {(akte.extern || []).length === 0 && <EmptyState>Keine externen Zuständigkeiten hinterlegt.</EmptyState>}
        </AkteSection>

        <AkteSection sectionKey="intern" title="Zuständigkeit intern" open={openMap["intern"]} onToggle={toggleSection}>
          {canManageAssignments && <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
            <select value={selectedInternUserId} onChange={e => setSelectedInternUserId(e.target.value)} style={inputStyle}>
              <option value="">Fachkraft auswählen …</option>
              {interneAuswahl.map(u => <option key={u.id} value={u.id}>{u.name} · {u.rolle}</option>)}
            </select>
            <button onClick={() => { const picked = interneAuswahl.find(u => String(u.id) === String(selectedInternUserId)); if (!picked) return showToast("Bitte eine Fachkraft auswählen.", "#c0392b"); addSimpleItem("intern", { userId: picked.id, name: picked.name, rolle: picked.rolle, telefon: "", email: picked.email }); setSelectedInternUserId(""); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Fachkraft</button>
          </div>}
          {(akte.intern || []).map(item => <CompactRecord key={item.id} title={item.name} status={item.status || "aktiv"} statusType="status" meta={`${item.rolle || "Fachkraft"}${item.telefon ? ` · ${item.telefon}` : ""}${item.email ? ` · ${item.email}` : ""}`} audit={auditMeta(item)} onDelete={canDeleteRecords ? () => removeItem("intern", item.id) : null} />)}
          {(akte.intern || []).length === 0 && <EmptyState>Keine internen Zuständigkeiten hinterlegt.</EmptyState>}
        </AkteSection>

        <AkteSection sectionKey="ziele" title="Ziele" open={openMap["ziele"]} onToggle={toggleSection}>
          {canEdit && <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 10 }}>
            <input value={quickFields.ziel} onChange={e => setQuickFields(p => ({ ...p, ziel: e.target.value }))} style={inputStyle} placeholder="Neues Ziel" />
            <input type="date" value={quickFields.zielDatum} onChange={e => setQuickFields(p => ({ ...p, zielDatum: e.target.value }))} style={inputStyle} />
            <button onClick={() => { if (!quickFields.ziel.trim()) return; addSimpleItem("ziele", { titel: quickFields.ziel, status: "laufend", notiz: "", datum: quickFields.zielDatum || ds(new Date()) }); setQuickFields(p => ({ ...p, ziel: "", zielDatum: ds(new Date()) })); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Ziel</button>
          </div>}
          {(akte.ziele || []).map(item => <CompactRecord key={item.id} title={item.titel} status={item.status} statusType="status" meta={item.datum ? formatDate(item.datum) : ""} text={item.notiz} audit={auditMeta(item)} onDelete={canDeleteRecords ? () => removeItem("ziele", item.id) : null} />)}
          {(akte.ziele || []).length === 0 && <EmptyState>Noch keine Ziele erfasst.</EmptyState>}
        </AkteSection>

        <AkteSection sectionKey="dateien" title="Dateien" open={openMap["dateien"]} onToggle={toggleSection}>
          <input ref={fileInputRef} type="file" onChange={handleDateiUpload} style={{ display: "none" }} />
          {canEdit && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 10 }}>
            <select value={quickFields.dateiKategorie} onChange={e => setQuickFields(p => ({ ...p, dateiKategorie: e.target.value }))} style={inputStyle}>
              <option>Dokument</option><option>Bewerbung</option><option>Verfügung/Jugendamt</option><option>Schule</option><option>Medizin</option>
            </select>
            <input type="date" value={quickFields.dateiDatum} onChange={e => setQuickFields(p => ({ ...p, dateiDatum: e.target.value }))} style={inputStyle} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Datei hochladen</button>
          </div>}
          {(akte.dateien || []).map(item => <div key={item.id} style={{ borderTop: "1px solid #f1f5f9", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><button onClick={() => openStoredFile(item)} style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#0f172a", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>{item.name}</button><p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{item.kategorie || "Dokument"} · {formatDate(item.datum)}{item.size ? ` · ${(item.size/1024).toFixed(1)} KB` : ""}</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => openStoredFile(item)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px" }}>{isPdfFile(item) ? "Ansehen" : "Öffnen"}</button><button onClick={() => downloadStoredFile(item)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px" }}>Herunterladen</button>{canDeleteFiles && <button onClick={() => removeItem("dateien", item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>Entfernen</button>}</div></div>)}
          {(akte.dateien || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Dateien hinterlegt.</p>}
        </AkteSection>

        {Object.entries(FACHBEREICH_LABELS).map(([key, label]) => (
          <AkteSection key={key} sectionKey={key} title={label} color="#475569" rightContent={<CountBadge>{(akte.fachbereiche?.[key] || []).length}</CountBadge>} open={openMap[key]} onToggle={toggleSection}>
            {canEdit && <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <input value={newDocs[key].titel} onChange={e => setNewDocs(prev => ({ ...prev, [key]: { ...prev[key], titel: e.target.value } }))} style={inputStyle} placeholder={`Titel für ${label}`} />
                <input type="date" value={newDocs[key].datum} onChange={e => setNewDocs(prev => ({ ...prev, [key]: { ...prev[key], datum: e.target.value } }))} style={inputStyle} />
                <textarea rows={3} value={newDocs[key].text} onChange={e => setNewDocs(prev => ({ ...prev, [key]: { ...prev[key], text: e.target.value } }))} style={{ ...inputStyle, resize: "vertical" }} placeholder={`Dokumentation für ${label}`} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => addFachDoc(key)} style={{ ...btnPrimary, fontSize: 12 }}>+ Eintrag speichern</button>
              </div>
            </div>}
            {(akte.fachbereiche?.[key] || []).length === 0 && <EmptyState>Noch keine Einträge in diesem Bereich.</EmptyState>}
            {(akte.fachbereiche?.[key] || []).map(item => <CompactRecord key={item.id} title={item.titel} meta={`${formatDate(item.datum)}${item.autor ? ` · ${item.autor}` : ""}`} text={item.text} audit={auditMeta(item, item.autor)} onDelete={canDeleteRecords ? () => removeDoc(key, item.id) : null} />)}
          </AkteSection>
        ))}

        <div style={{ gridColumn: "1 / -1" }}>
          <AkteSection sectionKey="dokumentation" title="Dokumentation" color="#475569" rightContent={<CountBadge>{chronoDokumentation.length}</CountBadge>} open={openMap["dokumentation"]} onToggle={toggleSection}>
            {chronoDokumentation.length === 0 && <EmptyState>Noch keine Dokumentation vorhanden.</EmptyState>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {chronoDokumentation.map(item => (
                <ChronoRecord
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  audit={auditMeta(item, item.autor || item.fachkraft)}
                  onEdit={() => setEditingDoc(docFormFromItem(item))}
                  onDelete={canDeleteRecords ? () => deleteDocumentation(item) : null}
                />
              ))}
            </div>
            <AuditLogList logs={clientAuditLogs} users={users} user={user} />
          </AkteSection>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <AkteSection sectionKey="notizen" title="Notizen zum Klienten" color="#475569" rightContent={<CountBadge>{clientNotizen.length}</CountBadge>} open={openMap["notizen"]} onToggle={toggleSection}>
            {clientNotizen.length === 0 ? <EmptyState>Keine verknüpften Notizen vorhanden.</EmptyState> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{clientNotizen.map(n => <NoteRecord key={n.id} note={n} users={users} user={user} />)}</div>}
          </AkteSection>
        </div>
      </div>
      {editingDoc && (
        <Modal onClose={() => setEditingDoc(null)} maxWidth={720}>
          <h2 style={modalTitleStyle}><SectionIcon name={SECTION_ICONS.dokumentation} />Dokumentation bearbeiten</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{client.name}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            <FormField label="Bereich">
              <select value={editingDoc.bereich} onChange={e => setEditingDoc(prev => ({ ...prev, bereich: e.target.value }))} style={inputStyle}>
                <option value="allgemein">Allgemein / Fallverlauf</option>
                {Object.entries(FACHBEREICH_LABELS).map(([key, label]) => <option key={key} value={normalizeBereichKey(key)}>{label}</option>)}
              </select>
            </FormField>
            <FormField label="Kontaktart">
              <input value={editingDoc.kontaktart} onChange={e => setEditingDoc(prev => ({ ...prev, kontaktart: e.target.value }))} style={inputStyle} placeholder="z. B. Gespräch, Telefonat, Fallverlauf" />
            </FormField>
            <FormField label="Datum">
              <input type="date" value={editingDoc.datum} onChange={e => setEditingDoc(prev => ({ ...prev, datum: e.target.value }))} style={inputStyle} />
            </FormField>
            <FormField label="Nachgetragen">
              <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40, fontSize: 13, color: "#334155" }}>
                <input type="checkbox" checked={editingDoc.nachgetragen} onChange={e => setEditingDoc(prev => ({ ...prev, nachgetragen: e.target.checked }))} />
                Eintrag wurde nachgetragen
              </label>
            </FormField>
          </div>
          <FormField label="Titel">
            <input value={editingDoc.titel} onChange={e => setEditingDoc(prev => ({ ...prev, titel: e.target.value }))} style={inputStyle} placeholder="Kurztitel" />
          </FormField>
          <FormField label="Text / Inhalt">
            <textarea rows={6} value={editingDoc.text} onChange={e => setEditingDoc(prev => ({ ...prev, text: e.target.value }))} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} placeholder="Dokumentationsinhalt" />
          </FormField>
          <FormField label="Hashtags">
            <input value={editingDoc.hashtags} onChange={e => setEditingDoc(prev => ({ ...prev, hashtags: e.target.value }))} style={inputStyle} placeholder="schule, hilfeplan, termin" />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, flexWrap: "wrap" }}>
            <button onClick={() => setEditingDoc(null)} style={btnSecondary}>Abbrechen</button>
            <button onClick={updateDocumentation} style={btnPrimary}>Änderungen speichern</button>
          </div>
        </Modal>
      )}
      {pdfPreview && <PdfPreviewModal file={pdfPreview} onClose={() => setPdfPreview(null)} />}
    </div>
  );
}

function KalenderView({ termine, outlookConnection, outlookEvents, outlookEventsLoading, outlookEventsError, outlookRelevantOnly, setOutlookRelevantOnly, onLoadOutlookEvents, onImportTermine, onAddTermin, onDeleteTermin, onUpdateTerminStatus, onConnectOutlook, onRefreshOutlook, onSyncOutlookTermin, canEditTermin, clients, user, showToast }) {
  const [showNew, setShowNew] = useState(false);
  const initialTerminForm = { titel: "", datum: ds(new Date()), uhrzeit: "09:00", klientId: "", fachkraft: user?.name || "", ort: "", notiz: "", erinnerung: false, outlookSync: false };
  const [form, setForm] = useState(initialTerminForm);
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAllTermine, setShowAllTermine] = useState(false);
  const [calendarMode, setCalendarMode] = useState("liste");
  const [monthCursor, setMonthCursor] = useState(startOfMonth(new Date()));
  const [selectedMonthDate, setSelectedMonthDate] = useState(ds(new Date()));
  const importFileRef = useRef(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const today = ds(new Date());
  const calendarEnd = ds(addYears(new Date(), 1));
  const isInCalendarRange = (item) => {
    if (!item?.datum) return false;
    const end = getTerminEndDate(item) || item.datum;
    return end >= today && item.datum <= calendarEnd;
  };
  const isQuietCalendarItem = (item) => {
    const haystack = `${item?.titel || item?.title || ""} ${item?.notiz || item?.note || ""} ${item?.import_source || ""} ${item?.source || ""}`.toLowerCase();
    return haystack.includes("ferien") || haystack.includes("feiertag") || haystack.includes("holiday");
  };
  const visibleCalendarTermine = termine.filter(isInCalendarRange);
  const visibleOutlookEvents = (outlookEvents || []).filter(isInCalendarRange);
  const sorted = [...visibleCalendarTermine].sort((a, b) => new Date(`${a.datum}T${a.uhrzeit || "00:00"}`) - new Date(`${b.datum}T${b.uhrzeit || "00:00"}`));
  const allVisibleTermineSorted = [...termine].sort((a, b) => new Date(`${a.datum}T${a.uhrzeit || "00:00"}`) - new Date(`${b.datum}T${b.uhrzeit || "00:00"}`));
  const upcomingTermine = sorted.filter(t => (getTerminEndDate(t) || t.datum) >= today && t.status !== "erledigt" && t.status !== "abgesagt");
  const archivedTermine = sorted.filter(t => (getTerminEndDate(t) || t.datum) < today || t.status === "erledigt" || t.status === "abgesagt");
  const getKlient = (id) => clients.find(c => c.id == id);
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const minMonthStart = startOfMonth(new Date());
  const maxMonthStart = startOfMonth(addYears(new Date(), 1));
  const isAtMinMonth = monthStart <= minMonthStart;
  const isAtMaxMonth = monthStart >= maxMonthStart;
  const monthLeadingDays = (monthStart.getDay() + 6) % 7;
  const monthGridStart = new Date(monthStart);
  monthGridStart.setDate(monthGridStart.getDate() - monthLeadingDays);
  const monthGridEnd = new Date(monthEnd);
  monthGridEnd.setDate(monthGridEnd.getDate() + ((7 - ((monthLeadingDays + monthEnd.getDate()) % 7)) % 7));
  const monthDays = eachDayOfInterval({ start: monthGridStart, end: monthGridEnd });
  const baseMonthEvents = [
    ...visibleCalendarTermine.map(t => ({ id: `app-${t.id}`, source: "app", quiet: isQuietCalendarItem(t), datum: t.datum, endDatum: getTerminEndDate(t), uhrzeit: t.uhrzeit || "", titel: t.titel, ort: t.ort, status: t.status || "geplant", klientId: t.klientId, raw: t })),
    ...visibleOutlookEvents.map(event => ({ id: `outlook-${event.id}`, source: "outlook", quiet: isQuietCalendarItem(event), datum: event.datum, endDatum: getTerminEndDate(event), uhrzeit: event.uhrzeit || "", titel: event.title, ort: event.location, status: "outlook", raw: event })),
  ].filter(event => event.datum);
  const expandCalendarEvent = (event) => {
    const start = parseAppDate(event.datum);
    const end = parseAppDate(getTerminEndDate(event));
    if (!start || !end || end <= start) return [{ ...event, calendarDate: event.datum }];
    return eachDayOfInterval({ start, end }).map(day => {
      const key = ds(day);
      return { ...event, id: `${event.id}-${key}`, calendarDate: key };
    });
  };
  const monthEvents = baseMonthEvents.flatMap(expandCalendarEvent);
  const monthEventsByDate = monthEvents.reduce((acc, event) => {
    const key = event.calendarDate || event.datum;
    acc[key] = [...(acc[key] || []), event];
    return acc;
  }, {});
  const isAllDayCalendarEvent = (event) => Boolean(event.raw?.allDay || event.raw?.isAllDay || !event.uhrzeit || getTerminEndDate(event));
  const calendarEventSegment = (event) => {
    const key = event.calendarDate || event.datum;
    const end = getTerminEndDate(event) || event.datum;
    return {
      starts: key === event.datum,
      ends: key === end,
      multiDay: Boolean(end && end !== event.datum),
    };
  };
  const sortCalendarEvents = (items) => [...items].sort((a, b) => {
    const allDayDiff = Number(isAllDayCalendarEvent(b)) - Number(isAllDayCalendarEvent(a));
    if (allDayDiff) return allDayDiff;
    if (a.quiet !== b.quiet) return a.quiet ? 1 : -1;
    return (a.uhrzeit || "00:00").localeCompare(b.uhrzeit || "00:00");
  });
  const selectedDayEvents = sortCalendarEvents(monthEventsByDate[selectedMonthDate] || []);
  const viewButtonStyle = (active) => ({
    border: "none",
    background: active ? "#1e3a5f" : "transparent",
    color: active ? "#fff" : "#475569",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "'DM Sans',sans-serif",
  });
  const existingUidSet = new Set(termine.map(t => t.external_uid).filter(Boolean));
  const existingKeySet = new Set(termine.map(terminImportKey));
  const markDuplicates = (items) => items.map(item => ({
    ...item,
    duplicate: Boolean((item.external_uid && existingUidSet.has(item.external_uid)) || existingKeySet.has(terminImportKey(item))),
  }));
  const handleIcsFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError("");
    try {
      const text = await file.text();
      const parsedAll = parseIcsCalendar(text);
      const parsed = markDuplicates(parsedAll.filter(isInCalendarRange));
      setImportPreview(parsed);
      setSelectedImportIds(parsed.filter(item => !item.duplicate).map(item => item.importId));
      if (!parsed.length) setImportError("In der ICS-Datei wurden keine importierbaren Termine gefunden.");
      if (parsed.length < parsedAll.length) setImportError(`${parsedAll.length - parsed.length} Termine außerhalb des Kalenderzeitraums (${formatDate(today)} bis ${formatDate(calendarEnd)}) wurden ausgeblendet.`);
    } catch (error) {
      setImportPreview([]);
      setSelectedImportIds([]);
      setImportError(error.message || "ICS-Datei konnte nicht gelesen werden.");
    } finally {
      event.target.value = "";
    }
  };
  const confirmImport = async () => {
    const selected = importPreview.filter(item => selectedImportIds.includes(item.importId) && !item.duplicate);
    if (!selected.length) return showToast("Bitte mindestens einen nicht vorhandenen Termin auswählen.", "#c0392b");
    setImporting(true);
    const result = await onImportTermine(selected.map(item => ({ ...item, import_source: `ics:${importFileName || "kalender"}` })));
    setImporting(false);
    if (result?.imported) {
      setImportPreview([]);
      setSelectedImportIds([]);
      setImportFileName("");
    }
  };
  const outlookStatusLine = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <span style={{ ...statusChipStyle, background: outlookConnection?.connected ? "#ecfdf5" : "#f8fafc", borderColor: outlookConnection?.connected ? "#bbf7d0" : "#e2e8f0", color: outlookConnection?.connected ? "#166534" : "#64748b" }}>
        {outlookConnection?.connected ? `Outlook verbunden${outlookConnection.email ? `: ${outlookConnection.email}` : ""}` : "Outlook nicht verbunden"}
      </span>
      <button type="button" onClick={onRefreshOutlook} style={{ ...btnSecondary, fontSize: 12, padding: "5px 9px" }}>Status aktualisieren</button>
    </div>
  );
  const StatusControl = ({ termin }) => (
    <select value={termin.status || "geplant"} disabled={!canEditTermin?.(termin)} onChange={e => onUpdateTerminStatus?.(termin.id, e.target.value)} style={{ ...statusSelectStyle, opacity: canEditTermin?.(termin) ? 1 : .55, cursor: canEditTermin?.(termin) ? "pointer" : "not-allowed" }}>
      {TERMIN_STATUS.map(status => <option key={status} value={status}>{status}</option>)}
    </select>
  );
  const TerminAuditLine = ({ termin }) => {
    if (!termin.created_at && !termin.updated_at) return null;
    return (
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
        {`${termin.created_at ? `Erstellt ${formatDateTime(termin.created_at)}` : ""}${termin.updated_at ? ` · Geändert ${formatDateTime(termin.updated_at)}` : ""}`}
      </p>
    );
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div><IconHeading icon="termine" level="h1" style={pageTitle}>Kalender & Termine</IconHeading><p style={pageSubtitle}>{upcomingTermine.length} anstehende Termine · Zeitraum {formatDate(today)} bis {formatDate(calendarEnd)}</p>{outlookStatusLine}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", overflow: "hidden", border: "1px solid #dbe3ea", borderRadius: 999, background: "#fff" }}>
            <button type="button" onClick={() => setCalendarMode("liste")} style={viewButtonStyle(calendarMode === "liste")}>Liste</button>
            <button type="button" onClick={() => setCalendarMode("monat")} style={viewButtonStyle(calendarMode === "monat")}>Monat</button>
          </div>
          <input ref={importFileRef} type="file" accept=".ics,text/calendar" onChange={handleIcsFile} style={{ display: "none" }} />
          <button onClick={() => importFileRef.current?.click()} style={btnSecondary}>Kalender importieren</button>
          <button onClick={onConnectOutlook} style={btnSecondary}>Outlook verbinden</button>
          {calendarMode === "liste" && <button onClick={() => setShowCompleted(p => !p)} style={btnSecondary}>{showCompleted ? "Vergangene / erledigte ausblenden" : "Vergangene / erledigte Termine anzeigen"}</button>}
          <button onClick={() => setShowNew(true)} style={btnPrimary}>+ Neuer Termin</button>
        </div>
      </div>
      {calendarMode === "liste" && <div style={card}>
        <IconHeading icon="termine">Anstehende Termine</IconHeading>
        {upcomingTermine.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine anstehenden Termine geplant.</p>}
        {upcomingTermine.map(t => {
          const k = getKlient(t.klientId); const isToday = t.datum === today;
          return (
            <div key={t.id} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ background: isToday ? "#dbeafe" : "#f0f3f8", borderRadius: 10, padding: "6px 10px", textAlign: "center", minWidth: 48 }}>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: isToday ? "#1d4ed8" : "#1e293b" }}>{new Date(t.datum).getDate()}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>{new Date(t.datum).toLocaleDateString("de-DE", { month: "short" })}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{t.titel}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <StatusControl termin={t} />
                      {isToday && <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>Heute</span>}
                    </div>
                  </div>
                  <p style={{ margin: "3px 0", fontSize: 12, color: "#64748b" }}>{formatTerminDateRange(t)} · {t.uhrzeit || "ganztägig"}{t.ort ? ` · ${t.ort}` : ""}</p>
                  {k && <p style={{ margin: "2px 0", fontSize: 12, color: "#64748b" }}>👤 {k.name}</p>}
                  {t.erinnerung && <span style={{ fontSize: 11, color: "#f59e0b" }}>🔔 Erinnerung aktiv</span>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    <OutlookSyncBadge termin={t} />
                    {canEditTermin?.(t) && t.outlook_sync_status !== "synced" && <button type="button" onClick={() => onSyncOutlookTermin?.(t.id)} style={{ ...btnSecondary, fontSize: 11, padding: "3px 8px" }}>Outlook synchronisieren</button>}
                  </div>
                  <TerminAuditLine termin={t} />
                </div>
                <button onClick={() => onDeleteTermin(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: 4 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>}
      {(importPreview.length > 0 || importError) && (
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <IconHeading icon="termine">Import-Vorschau</IconHeading>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{importFileName || "ICS-Datei"} · {importPreview.length} gefundene Termine</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => { setImportPreview([]); setSelectedImportIds([]); setImportError(""); setImportFileName(""); }} style={btnSecondary}>Verwerfen</button>
              {importPreview.length > 0 && <button type="button" disabled={importing} onClick={confirmImport} style={{ ...btnPrimary, opacity: importing ? .7 : 1 }}>{importing ? "Importiert…" : "Ausgewählte übernehmen"}</button>}
            </div>
          </div>
          {importError && <p style={{ margin: 0, color: "#991b1b", fontSize: 13 }}>{importError}</p>}
          {importPreview.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {importPreview.map(item => (
                <label key={item.importId} style={{ display: "grid", gridTemplateColumns: "auto 110px 1fr", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid #f1f5f9", opacity: item.duplicate ? .6 : 1 }}>
                  <input type="checkbox" checked={selectedImportIds.includes(item.importId)} disabled={item.duplicate} onChange={e => setSelectedImportIds(prev => e.target.checked ? [...prev, item.importId] : prev.filter(id => id !== item.importId))} style={{ marginTop: 3 }} />
                  <div>
                    <p style={{ margin: 0, color: "#1f2937", fontSize: 13, fontWeight: 800 }}>{formatTerminDateRange(item)}</p>
                    <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>{item.allDay ? "ganztägig" : item.uhrzeit || "–"}</p>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ ...recordTitleStyle, margin: 0 }}>{item.titel}</p>
                      {item.duplicate && <span style={{ ...statusChipStyle, background: "#f8fafc", borderColor: "#cbd5e1", color: "#64748b" }}>Duplikat</span>}
                    </div>
                    {item.ort && <p style={{ ...recordMetaStyle, marginTop: 4 }}>{item.ort}</p>}
                    {item.notiz && <p style={{ ...recordTextStyle, marginTop: 6 }}>{item.notiz.length > 160 ? `${item.notiz.slice(0, 160)}…` : item.notiz}</p>}
                    {item.external_uid && <p style={{ ...recordMetaStyle, marginTop: 5 }}>UID: {item.external_uid}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      {calendarMode === "monat" && (
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <IconHeading icon="termine">Monatsansicht</IconHeading>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{baseMonthEvents.filter(event => event.datum <= ds(monthEnd) && (getTerminEndDate(event) || event.datum) >= ds(monthStart)).length} sichtbare Termine in diesem Monat</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={isAtMinMonth} onClick={() => setMonthCursor(prev => subMonths(prev, 1))} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px", opacity: isAtMinMonth ? .45 : 1, cursor: isAtMinMonth ? "not-allowed" : "pointer" }}>Zurück</button>
              <span style={{ minWidth: 132, textAlign: "center", color: "#1f2937", fontWeight: 800, fontSize: 14 }}>{format(monthCursor, "MMMM yyyy", { locale: de })}</span>
              <button type="button" disabled={isAtMaxMonth} onClick={() => setMonthCursor(prev => addMonths(prev, 1))} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px", opacity: isAtMaxMonth ? .45 : 1, cursor: isAtMaxMonth ? "not-allowed" : "pointer" }}>Weiter</button>
              <button type="button" onClick={() => { setMonthCursor(startOfMonth(new Date())); setSelectedMonthDate(today); }} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px" }}>Heute</button>
            </div>
          </div>
          <div className="calendar-month-grid calendar-weekdays" style={{ marginBottom: 8, padding: "0 2px" }}>
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(day => (
              <div key={day} style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", padding: "0 8px" }}>{day}</div>
            ))}
          </div>
          <div className="calendar-month-grid" style={{ background: "#dbe3ea", border: "1px solid #dbe3ea", borderRadius: 14, padding: 1, gap: 1, overflow: "hidden" }}>
            {monthDays.map(day => {
              const key = ds(day);
              const dayEvents = sortCalendarEvents(monthEventsByDate[key] || []);
              const inCurrentMonth = day >= monthStart && day <= monthEnd;
              const isToday = key === today;
              const isSelected = key === selectedMonthDate;
              const realEventCount = dayEvents.filter(event => !event.quiet).length;
              const dayBackground = realEventCount >= 4 ? "#eef2f7" : realEventCount >= 2 ? "#f5f7fa" : "#fff";
              const visibleDayEvents = dayEvents.slice(0, 4);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMonthDate(key)}
                  className="calendar-day-cell"
                  style={{
                    minHeight: 152,
                    border: isSelected ? "1px solid #1e3a5f" : "1px solid transparent",
                    borderRadius: 10,
                    background: isSelected ? "#f8fafc" : dayBackground,
                    opacity: inCurrentMonth ? 1 : .42,
                    padding: "9px 10px 10px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    boxShadow: isSelected ? "inset 0 0 0 1px rgba(30,58,95,.18)" : "none",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 8, minHeight: 28 }}>
                    <span className="calendar-day-title" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 999, background: isToday ? "#1e3a5f" : "transparent", color: isToday ? "#fff" : "#334155", fontSize: 13, fontWeight: isToday ? 900 : 800, lineHeight: 1 }}>{format(day, "d")}</span>
                    {dayEvents.length > 0 && <span style={{ background: isToday ? "#e0f2fe" : "#f1f5f9", border: "1px solid #dbe3ea", borderRadius: 999, color: isToday ? "#075985" : "#475569", fontSize: 10, fontWeight: 900, padding: "1px 6px" }}>{dayEvents.length}</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 90 }}>
                    {visibleDayEvents.map(event => {
                      const segment = calendarEventSegment(event);
                      const allDay = isAllDayCalendarEvent(event);
                      const accent = event.quiet ? "#cbd5e1" : event.source === "outlook" ? "#3b82f6" : "#64748b";
                      const barBg = event.quiet ? "#f1f5f9" : event.source === "outlook" ? "#dbeafe" : "#e2e8f0";
                      return (
                        <div
                          key={event.id}
                          className="calendar-day-event"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            borderLeft: allDay ? "none" : `3px solid ${accent}`,
                            background: allDay ? barBg : "rgba(255,255,255,.82)",
                            borderTop: allDay ? `1px solid ${event.quiet ? "#e2e8f0" : "#cbd5e1"}` : "none",
                            borderBottom: allDay ? `1px solid ${event.quiet ? "#e2e8f0" : "#cbd5e1"}` : "none",
                            borderRadius: allDay && segment.multiDay ? `${segment.starts ? 999 : 0}px ${segment.ends ? 999 : 0}px ${segment.ends ? 999 : 0}px ${segment.starts ? 999 : 0}px` : 7,
                            marginLeft: allDay && segment.multiDay && !segment.starts ? -10 : 0,
                            marginRight: allDay && segment.multiDay && !segment.ends ? -10 : 0,
                            padding: allDay ? "3px 8px" : "3px 6px",
                            color: event.quiet ? "#64748b" : "#334155",
                            fontSize: 11,
                            fontWeight: allDay ? 850 : 750,
                            minHeight: 22,
                            boxShadow: allDay && segment.multiDay ? "inset 0 0 0 1px rgba(100,116,139,.08)" : "none",
                          }}
                        >
                          {!allDay && event.uhrzeit && <span style={{ color: "#64748b", fontWeight: 900 }}>{event.uhrzeit} </span>}
                          {allDay && segment.multiDay && !segment.starts ? "" : event.titel}
                        </div>
                      );
                    })}
                    {dayEvents.length > visibleDayEvents.length && <div className="calendar-day-event" style={{ color: "#64748b", fontSize: 11, fontWeight: 800, paddingLeft: 2 }}>+{dayEvents.length - visibleDayEvents.length} weitere</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 18, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <p style={{ margin: 0, color: "#1f2937", fontSize: 14, fontWeight: 900 }}>Termine am {formatDate(selectedMonthDate)}</p>
              <span style={{ ...statusChipStyle, background: "#f8fafc", borderColor: "#dbe3ea", color: "#475569" }}>{selectedDayEvents.length} Termine</span>
            </div>
            {selectedDayEvents.length === 0 && <EmptyState>Für diesen Tag sind keine sichtbaren Termine vorhanden.</EmptyState>}
            {selectedDayEvents.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDayEvents.map(event => {
                  const k = event.klientId ? getKlient(event.klientId) : null;
                  return (
                    <div key={event.id} style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: 12, padding: "10px 0", borderTop: "1px solid #f1f5f9" }}>
                      <p style={{ margin: 0, color: "#475569", fontSize: 13, fontWeight: 900 }}>{event.uhrzeit || "ganztägig"}</p>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p style={{ ...recordTitleStyle, margin: 0 }}>{event.titel}</p>
                          <span style={{ ...statusChipStyle, background: event.quiet ? "#f8fafc" : event.source === "outlook" ? "#eff6ff" : "#f8fafc", borderColor: event.quiet ? "#e2e8f0" : event.source === "outlook" ? "#bfdbfe" : "#cbd5e1", color: event.quiet ? "#94a3b8" : event.source === "outlook" ? "#1e3a8a" : "#475569" }}>{event.quiet ? "Ferien / Feiertag" : event.source === "outlook" ? "Outlook" : event.status}</span>
                        </div>
                        <p style={{ ...recordMetaStyle, marginTop: 4 }}>{[formatTerminDateRange(event), event.ort, k?.name].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {calendarMode === "liste" && showCompleted && (
        <div style={{ ...card, marginTop: 20 }}>
          <IconHeading icon="termine">Vergangene / erledigte Termine</IconHeading>
          {archivedTermine.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine vergangenen oder erledigten Termine vorhanden.</p>}
          {[...archivedTermine].reverse().map(t => {
            const k = getKlient(t.klientId);
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{t.titel}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{formatTerminDateRange(t)} {t.uhrzeit || ""}{k ? ` · ${k.name}` : ""}{t.ort ? ` · ${t.ort}` : ""}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    <OutlookSyncBadge termin={t} />
                    {canEditTermin?.(t) && t.outlook_sync_status !== "synced" && <button type="button" onClick={() => onSyncOutlookTermin?.(t.id)} style={{ ...btnSecondary, fontSize: 11, padding: "3px 8px" }}>Outlook synchronisieren</button>}
                  </div>
                  <TerminAuditLine termin={t} />
                </div>
                <StatusControl termin={t} />
              </div>
            );
          })}
        </div>
      )}
      {calendarMode === "liste" && <div style={{ ...card, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <IconHeading icon="termine">Outlook-Termine</IconHeading>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Lesend aus deinem verbundenen Outlook-Standardkalender, nicht lokal importiert.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#475569", fontSize: 12, fontWeight: 700, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 10px", cursor: "pointer" }}>
              <input type="checkbox" checked={outlookRelevantOnly} onChange={e => { const checked = e.target.checked; setOutlookRelevantOnly(checked); onLoadOutlookEvents(checked); }} />
              Nur relevante Begriffe
            </label>
            <button type="button" onClick={() => onLoadOutlookEvents(outlookRelevantOnly)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px" }}>{outlookEventsLoading ? "Lädt…" : "Outlook-Termine laden"}</button>
          </div>
        </div>
        {!outlookConnection?.connected && <EmptyState>Verbinde zuerst dein Outlook-Konto, um Outlook-Termine hier zu sehen.</EmptyState>}
        {outlookConnection?.connected && outlookEventsError && <p style={{ color: "#991b1b", fontSize: 13, margin: 0 }}>{outlookEventsError}</p>}
        {outlookConnection?.connected && !outlookEventsError && outlookEventsLoading && <EmptyState>Outlook-Termine werden geladen…</EmptyState>}
        {outlookConnection?.connected && !outlookEventsError && !outlookEventsLoading && visibleOutlookEvents.length === 0 && (
          <EmptyState>{outlookRelevantOnly ? "Keine fachlich relevanten Outlook-Termine im Kalenderzeitraum gefunden." : "Keine Outlook-Termine im Kalenderzeitraum gefunden."}</EmptyState>
        )}
        {outlookConnection?.connected && !outlookEventsError && visibleOutlookEvents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {visibleOutlookEvents.map(event => (
              <div key={event.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ margin: 0, color: "#1f2937", fontSize: 13, fontWeight: 800 }}>{formatTerminDateRange(event)}</p>
                  <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>{event.isAllDay ? "ganztägig" : `${event.uhrzeit || "–"}${event.ende ? `-${event.ende}` : ""}`}</p>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <p style={{ ...recordTitleStyle, margin: 0 }}>{event.title}</p>
                    <span style={{ ...statusChipStyle, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e3a8a" }}>Outlook-Termin</span>
                  </div>
                  {event.location && <p style={{ ...recordMetaStyle, marginTop: 4 }}>{event.location}</p>}
                  {event.note && <p style={{ ...recordTextStyle, marginTop: 6 }}>{event.note.length > 180 ? `${event.note.slice(0, 180)}…` : event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button type="button" onClick={() => setShowAllTermine(true)} style={{ ...btnSecondary, padding: "9px 14px" }}>Alle Termine</button>
      </div>
      {showAllTermine && (
        <Modal onClose={() => setShowAllTermine(false)} maxWidth={860}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <h2 style={{ ...modalTitleStyle, marginBottom: 4 }}><SectionIcon name={SECTION_ICONS.termine} />Alle Termine</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Vollansicht aller für dich sichtbaren Termine inklusive vergangen, erledigt und abgesagt.</p>
            </div>
            <button type="button" onClick={() => setShowAllTermine(false)} style={btnPrimary}>Schließen</button>
          </div>
          {allVisibleTermineSorted.length === 0 && <EmptyState>Keine sichtbaren Termine vorhanden.</EmptyState>}
          {allVisibleTermineSorted.length > 0 && (
            <div style={{ maxHeight: "68vh", overflowY: "auto", borderTop: "1px solid #e2e8f0" }}>
              {allVisibleTermineSorted.map(t => {
                const k = getKlient(t.klientId);
                return (
                  <div key={t.id} className="all-termine-row" style={{ display: "grid", gridTemplateColumns: "150px 1fr auto", gap: 14, alignItems: "start", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <p style={{ margin: 0, color: "#1f2937", fontSize: 13, fontWeight: 900 }}>{formatTerminDateRange(t)}</p>
                      <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>{t.uhrzeit || "ganztägig"}</p>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...recordTitleStyle, margin: 0 }}>{t.titel}</p>
                      <p style={{ ...recordMetaStyle, marginTop: 4 }}>{[t.ort, k?.name].filter(Boolean).join(" · ") || "Allgemeiner Termin"}</p>
                      {t.notiz && <p style={{ ...recordTextStyle, marginTop: 5 }}>{t.notiz.length > 180 ? `${t.notiz.slice(0, 180)}…` : t.notiz}</p>}
                    </div>
                    <StatusControl termin={t} />
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <h2 style={modalTitleStyle}><SectionIcon name={SECTION_ICONS.termine} />Neuen Termin anlegen</h2>
          <FormField label="Titel"><input value={form.titel} onChange={e => set("titel", e.target.value)} style={inputStyle} placeholder="z.B. Hilfeplan-Gespräch" /></FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Datum"><input type="date" value={form.datum} onChange={e => set("datum", e.target.value)} style={inputStyle} /></FormField>
            <FormField label="Uhrzeit"><input type="time" value={form.uhrzeit} onChange={e => set("uhrzeit", e.target.value)} style={inputStyle} /></FormField>
          </div>
          <FormField label="Klient (optional)"><select value={form.klientId} onChange={e => set("klientId", e.target.value)} style={inputStyle}><option value="">– Kein Klientenbezug –</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></FormField>
          <FormField label="Ort"><input value={form.ort} onChange={e => set("ort", e.target.value)} style={inputStyle} placeholder="z.B. Büro 3" /></FormField>
          <FormField label="Notiz"><textarea rows={2} value={form.notiz} onChange={e => set("notiz", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} /></FormField>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20, fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#475569" }}>
            <input type="checkbox" checked={form.erinnerung} onChange={e => set("erinnerung", e.target.checked)} style={{ width: 16, height: 16 }} />
            🔔 Erinnerung aktivieren (3 Tage vorher)
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20, fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "11px 12px" }}>
            <input type="checkbox" checked={form.outlookSync} onChange={e => set("outlookSync", e.target.checked)} style={{ width: 16, height: 16, marginTop: 2 }} />
            <span>
              <strong style={{ display: "block", color: "#1f2937", marginBottom: 2 }}>Auch in Outlook speichern</strong>
              <span style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>Phase 1: Der Termin wird zuerst in der App gespeichert und danach serverseitig an Outlook übergeben, sobald dein Outlook-Konto verbunden ist.</span>
            </span>
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNew(false)} style={btnSecondary}>Abbrechen</button>
            <button disabled={saving} onClick={async () => {
              if (!form.titel || !form.datum) return showToast("Bitte Titel und Datum angeben.", "#c0392b");
              setSaving(true);
              const saved = await onAddTermin(form);
              setSaving(false);
              if (!saved) return;
              setShowNew(false);
              setForm({ ...initialTerminForm, fachkraft: user?.name || "" });
            }} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>{saving ? "Speichert…" : "Speichern"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BenachrichtigungenView({ termine, clients, onOpenClient }) {
  const getKlient = (id) => clients.find(c => c.id == id);
  const withDiff = termine.filter(t => t.status !== "erledigt").map(t => ({ ...t, diff: dayDiff(t.datum) })).sort((a, b) => a.diff - b.diff);
  const upcoming = withDiff.filter(t => t.diff >= 0 && t.diff <= 7 && t.erinnerung);
  const overdue = withDiff.filter(t => t.diff < 0 && t.erinnerung);
  const all = withDiff.filter(t => t.diff >= 0).slice(0, 10);
  const DiffBadge = ({ diff }) => {
    if (diff === 0) return <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Heute</span>;
    if (diff === 1) return <span style={{ background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Morgen</span>;
    if (diff <= 3) return <span style={{ background: "#fef3c7", color: "#d97706", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>In {diff} Tagen</span>;
    return <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>In {diff} Tagen</span>;
  };
  return (
    <div>
      <h1 style={pageTitle}>Erinnerungen</h1>
      <p style={pageSubtitle}>Übersicht aller aktiven Benachrichtigungen</p>
      {overdue.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#dc2626", fontSize: 15 }}>⚠️ {overdue.length} überfällige Termine</p>
          {overdue.map(t => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #fecaca" }}>
            <div><p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{t.titel}</p><p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{formatTerminDateRange(t)} · {t.uhrzeit || "ganztägig"}</p></div>
            <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, alignSelf: "flex-start" }}>Überfällig</span>
          </div>)}
        </div>
      )}
      {upcoming.length > 0 && (
        <div style={{ ...card, border: "1px solid #fef3c7" }}>
          <h2 style={cardTitle}>🔔 Aktive Erinnerungen (nächste 7 Tage)</h2>
          {upcoming.map(t => {
            const k = getKlient(t.klientId);
            return <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{t.titel}</p>
                <p style={{ margin: "3px 0", fontSize: 12, color: "#64748b" }}>{formatTerminDateRange(t)} · {t.uhrzeit || "ganztägig"} · {t.ort}</p>
                {k && <button onClick={() => onOpenClient(k)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1a4480", padding: 0, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>👤 {k.name} →</button>}
              </div>
              <DiffBadge diff={t.diff} />
            </div>;
          })}
        </div>
      )}
      <div style={card}>
        <h2 style={cardTitle}>📅 Alle anstehenden Termine</h2>
        {all.length === 0 && <p style={{ color: "#94a3b8" }}>Keine Termine vorhanden.</p>}
        {all.map(t => {
          const k = getKlient(t.klientId);
          return <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{t.titel}</p>
                {t.erinnerung && <span style={{ fontSize: 12 }}>🔔</span>}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{formatTerminDateRange(t)} · {t.uhrzeit || "ganztägig"} · {t.ort} {k ? `· ${k.name}` : ""}</p>
            </div>
            <DiffBadge diff={t.diff} />
          </div>;
        })}
      </div>
    </div>
  );
}

function VorlagenView({ vorlagen }) {
  const [copied, setCopied] = useState(null);
  const copy = (v) => { navigator.clipboard.writeText(v.text); setCopied(v.id); setTimeout(() => setCopied(null), 2000); };
  return (
    <div>
      <h1 style={pageTitle}>Vorlagen</h1>
      <p style={pageSubtitle}>Schnelleinstieg für häufige Dokumentationseinträge</p>
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#0369a1" }}>
        💡 <strong>Tipp:</strong> Beim Erstellen eines neuen Eintrags stehen alle Vorlagen als Schnellauswahl direkt im Formular zur Verfügung.
      </div>
      {["Fallverlauf", "Maßnahme", "Stunden"].map(typ => {
        const items = vorlagen.filter(v => v.typ === typ);
        return (
          <div key={typ} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ background: typBg(typ), color: typeColor(typ), padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>{typ}</span>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{items.length} Vorlagen</span>
            </div>
            <div className="vorlagen-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {items.map(v => (
                <div key={v.id} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,.05)", borderLeft: `4px solid ${typeColor(v.typ)}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{v.titel}</h3>
                    <button onClick={() => copy(v)} style={{ ...btnSecondary, fontSize: 11, padding: "5px 12px", background: copied === v.id ? "#dcfce7" : undefined, color: copied === v.id ? "#16a34a" : undefined }}>
                      {copied === v.id ? "✓ Kopiert" : "📋 Kopieren"}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NutzerView({ users, clients, fallaktenFreigaben, onToggle, onCreateUser, onUpdateUser, onSaveFreigaben, showToast }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "demo123", rolle: "Fachkraft", einrichtung: EINRICHTUNGEN[0], aktiv: true });
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", rolle: "Fachkraft", einrichtung: EINRICHTUNGEN[0], aktiv: true });
  const [freigabeUser, setFreigabeUser] = useState(null);
  const [grantDraft, setGrantDraft] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setEdit = (k, v) => setEditForm(p => ({ ...p, [k]: v }));
  const openEdit = (u) => {
    setEditForm({
      name: u.name || "",
      rolle: ROLLEN.includes(u.rolle) ? u.rolle : "Fachkraft",
      einrichtung: u.einrichtung || EINRICHTUNGEN[0],
      aktiv: u.aktiv !== false,
    });
    setEditUser(u);
  };
  const openFreigaben = (u) => {
    const existing = Object.fromEntries((fallaktenFreigaben || [])
      .filter(f => String(f.nutzer_id) === String(u.id))
      .map(f => [String(f.klient_id), { darf_ansehen: Boolean(f.darf_ansehen), darf_bearbeiten: Boolean(f.darf_bearbeiten) }]));
    setGrantDraft(existing);
    setFreigabeUser(u);
  };
  const setGrant = (clientId, field, value) => {
    setGrantDraft(prev => {
      const current = prev[String(clientId)] || { darf_ansehen: false, darf_bearbeiten: false };
      const next = { ...current, [field]: value };
      if (field === "darf_bearbeiten" && value) next.darf_ansehen = true;
      if (field === "darf_ansehen" && !value) next.darf_bearbeiten = false;
      return { ...prev, [String(clientId)]: next };
    });
  };
  const saveFreigaben = async () => {
    const rows = clients.map(c => ({
      klient_id: c.id,
      darf_ansehen: Boolean(grantDraft[String(c.id)]?.darf_ansehen),
      darf_bearbeiten: Boolean(grantDraft[String(c.id)]?.darf_bearbeiten),
    }));
    const saved = await onSaveFreigaben(freigabeUser.id, rows);
    if (saved) setFreigabeUser(null);
  };
  const createUser = async () => {
    if (!form.name || !form.email) return showToast("Name und E-Mail erforderlich.", "#c0392b");
    const created = await onCreateUser(form);
    if (!created) return;
    setShowNew(false);
    setForm({ name: "", email: "", password: "demo123", rolle: "Fachkraft", einrichtung: EINRICHTUNGEN[0], aktiv: true });
  };
  const saveEditUser = async () => {
    if (!editForm.name.trim()) return showToast("Name ist erforderlich.", "#c0392b");
    const saved = await onUpdateUser(editUser.id, {
      name: editForm.name,
      rolle: editForm.rolle,
      einrichtung: editForm.einrichtung,
      aktiv: editForm.aktiv,
    });
    if (saved) setEditUser(null);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={pageTitle}>Nutzerverwaltung</h1><p style={pageSubtitle}>{users.length} Nutzer · nur für Admins sichtbar</p></div>
        <button onClick={() => setShowNew(true)} style={btnPrimary}>+ Nutzer anlegen</button>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", boxShadow: "0 2px 8px rgba(0,0,0,.05)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.aktiv ? "linear-gradient(135deg,#1a4480,#0d9e80)" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: u.aktiv ? "#fff" : "#94a3b8", flexShrink: 0 }}>{u.avatar}</div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{u.name}</p>
              <p style={{ margin: "2px 0", fontSize: 13, color: "#64748b" }}>{u.email} · {u.einrichtung}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ ...rolleStyle(u.rolle), padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{u.rolle}</span>
              <span style={{ background: u.aktiv ? "#dcfce7" : "#fee2e2", color: u.aktiv ? "#16a34a" : "#dc2626", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{u.aktiv ? "Aktiv" : "Deaktiviert"}</span>
              <button onClick={() => openEdit(u)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 14px" }}>Bearbeiten</button>
              <button onClick={() => openFreigaben(u)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 14px" }}>Fallaktenrechte</button>
              <button onClick={() => onToggle(u.id, !u.aktiv)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 14px" }}>{u.aktiv ? "Deaktivieren" : "Aktivieren"}</button>
            </div>
          </div>
        ))}
      </div>
      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <h2 style={modalTitleStyle}><SectionIcon name={UserCheck} />Benutzer bearbeiten</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>{editUser.email || "E-Mail aus Auth-Profil"} · Änderungen gelten für Profil und Rechteverhalten.</p>
          <FormField label="Vollständiger Name"><input value={editForm.name} onChange={e => setEdit("name", e.target.value)} style={inputStyle} placeholder="Vor- und Nachname" /></FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Rolle"><select value={editForm.rolle} onChange={e => setEdit("rolle", e.target.value)} style={inputStyle}>{ROLLEN.map(r => <option key={r}>{r}</option>)}</select></FormField>
            <FormField label="Einrichtung"><select value={editForm.einrichtung} onChange={e => setEdit("einrichtung", e.target.value)} style={inputStyle}>{EINRICHTUNGEN.map(e => <option key={e}>{e}</option>)}</select></FormField>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", margin: "4px 0 16px", color: "#334155", fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={editForm.aktiv} onChange={e => setEdit("aktiv", e.target.checked)} />
            Benutzer ist aktiv
          </label>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setEditUser(null)} style={btnSecondary}>Abbrechen</button>
            <button onClick={saveEditUser} style={btnPrimary}>Änderungen speichern</button>
          </div>
        </Modal>
      )}
      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 20 }}>Neuen Nutzer anlegen</h2>
          <FormField label="Vollständiger Name"><input value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} placeholder="Vor- und Nachname" /></FormField>
          <FormField label="E-Mail-Adresse"><input type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inputStyle} placeholder="name@einrichtung.de" /></FormField>
          <FormField label="Temporäres Passwort"><input value={form.password} onChange={e => set("password", e.target.value)} style={inputStyle} /></FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Rolle"><select value={form.rolle} onChange={e => set("rolle", e.target.value)} style={inputStyle}>{ROLLEN.map(r => <option key={r}>{r}</option>)}</select></FormField>
            <FormField label="Einrichtung"><select value={form.einrichtung} onChange={e => set("einrichtung", e.target.value)} style={inputStyle}>{EINRICHTUNGEN.map(e => <option key={e}>{e}</option>)}</select></FormField>
          </div>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#0369a1" }}>
            <strong>Sichere Anlage:</strong> Der Auth-User wird über die Supabase Edge Function <code>admin-create-user</code> erstellt. Der Service Role Key liegt dabei nicht im Frontend.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNew(false)} style={btnSecondary}>Abbrechen</button>
            <button onClick={createUser} style={btnPrimary}>Anlegen</button>
          </div>
        </Modal>
      )}
      {freigabeUser && (
        <Modal onClose={() => setFreigabeUser(null)} maxWidth={860}>
          <h2 style={modalTitleStyle}><SectionIcon name={SECTION_ICONS.klient} />Fallaktenrechte</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{freigabeUser.name} · {freigabeUser.rolle}</p>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", maxHeight: "58vh", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px", gap: 0, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>
              <div style={{ padding: "10px 12px" }}>Fallakte</div>
              <div style={{ padding: "10px 12px", textAlign: "center" }}>Ansehen</div>
              <div style={{ padding: "10px 12px", textAlign: "center" }}>Bearbeiten</div>
            </div>
            {clients.map(c => {
              const grant = grantDraft[String(c.id)] || { darf_ansehen: false, darf_bearbeiten: false };
              return (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px", alignItems: "center", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ padding: "12px" }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{c.name}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{c.aktenzeichen || "ohne Aktenzeichen"} · {c.einrichtung}</p>
                  </div>
                  <label style={{ display: "flex", justifyContent: "center", padding: 12 }}>
                    <input type="checkbox" checked={grant.darf_ansehen} onChange={e => setGrant(c.id, "darf_ansehen", e.target.checked)} />
                  </label>
                  <label style={{ display: "flex", justifyContent: "center", padding: 12 }}>
                    <input type="checkbox" checked={grant.darf_bearbeiten} onChange={e => setGrant(c.id, "darf_bearbeiten", e.target.checked)} />
                  </label>
                </div>
              );
            })}
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#475569", marginTop: 14 }}>
            Rollenrechte bleiben erhalten: Admins und Leitung sehen weiterhin alle Fallakten. Diese Freigaben erweitern vor allem Fachkraft-Zugriffe gezielt pro Fallakte.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={() => setFreigabeUser(null)} style={btnSecondary}>Abbrechen</button>
            <button onClick={saveFreigaben} style={btnPrimary}>Rechte speichern</button>
          </div>
        </Modal>
      )}
    </div>
  );
}


function KIBerichtView({ clients, eintraege, user, kiSettings }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [berichtstyp, setBerichtstyp] = useState("Verlaufsbericht");
  const [zeitraum, setZeitraum] = useState("6 Monate");
  const [empfaenger, setEmpfaenger] = useState("");
  const [zusatzhinweis, setZusatzhinweis] = useState("");
  const [stil, setStil] = useState("sachlich");
  const [loading, setLoading] = useState(false);
  const [bericht, setBericht] = useState("");
  const [error, setError] = useState(null);
  const berichtRef = useRef(null);

  const selectedClient = clients.find(c => c.id == selectedClientId);
  const clientEintraege = selectedClientId ? (eintraege[selectedClientId] || []) : [];

  const templates = {
    Verlaufsbericht: "Struktur: 1. Anlass und Rahmen, 2. Verlauf im Berichtszeitraum, 3. Aktuelle Situation, 4. Fachliche Einschätzung, 5. Empfehlungen / nächste Schritte.",
    Abschlussbericht: "Struktur: 1. Anlass, 2. Verlauf der Hilfe, 3. Erreichte Ziele, 4. Offene Themen, 5. Abschlussbewertung und Empfehlungen.",
    Zwischenbericht: "Struktur: 1. Anlass, 2. Bisheriger Verlauf, 3. Aktueller Stand, 4. Risiken / Ressourcen, 5. Weiteres Vorgehen.",
    Hilfeplanbericht: "Struktur: 1. Anlass des Hilfeplans, 2. Zielerreichung, 3. Zusammenarbeit, 4. Aktuelle Bedarfe, 5. Empfohlene Maßnahmen.",
    Stellungnahme: "Struktur: 1. Anlass, 2. Sachverhalt, 3. Fachliche Einschätzung, 4. Empfehlung."
  };

  const stilText = {
    sachlich: "Schreibe sachlich, präzise, neutral und dokumentationsgerecht.",
    fachlich: "Schreibe fachlich, professionell und im Stil einer sozialpädagogischen Stellungnahme.",
    kurz: "Schreibe kompakt, klar und auf das Wesentliche reduziert.",
  };

  const anonymize = (client, entries) => {
    if (!kiSettings.anonymisierung || kiSettings.provider === "ollama") return { client, entries, mapBack: [] };
    const replacements = [
      [client.name, "Klient/in A"],
      [client.aktenzeichen, "AZ-XXXX"],
      [client.dob, client.dob ? client.dob.substring(0, 4) + "-XX-XX" : "unbekannt"],
    ];
    const safeClient = { ...client, name: "Klient/in A", aktenzeichen: "AZ-XXXX", dob: client.dob ? client.dob.substring(0, 4) + "-XX-XX" : "unbekannt" };
    const safeEntries = entries.map(e => ({
      ...e,
      fachkraft: "Fachkraft",
      text: replacements.reduce((acc, [real, fake]) => real ? acc.split(real).join(fake) : acc, e.text || "")
    }));
    return { client: safeClient, entries: safeEntries, mapBack: replacements };
  };

  const callKI = async (prompt) => {
    if (kiSettings.provider === "ollama") {
      const res = await fetch(`${kiSettings.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: kiSettings.ollamaModel, prompt, stream: false })
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const data = await res.json();
      if (!data.response) throw new Error("Ollama: Keine Antwort");
      return data.response;
    }

    return `Hinweis: In dieser lokalen Demo ist Anthropic nicht vollständig mit einem echten API-Schlüssel verbunden.\n\nBitte nutze für echte Tests den Provider "Ollama".\n\nBeispielentwurf für ${berichtstyp}:\n\nIm Berichtszeitraum fanden ${clientEintraege.length} dokumentierte Kontakte bzw. Einträge statt. Die Zusammenarbeit mit ${selectedClient?.name || "der Klientin / dem Klienten"} verlief überwiegend geordnet. Die aktuelle Situation wurde anhand der vorliegenden Falldokumentation eingeschätzt. Weitere fachliche Bewertung und Empfehlungen sind vor Versand durch die zuständige Fachkraft zu prüfen und bei Bedarf zu ergänzen.`;
  };

  const generateBericht = async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError(null);
    setBericht("");
    try {
      const { client: anonClient, entries: anonEntries, mapBack } = anonymize(selectedClient, clientEintraege);
      const eintragText = anonEntries.length
        ? anonEntries.map((e, i) => `${i + 1}. [${e.datum}] ${e.typ.toUpperCase()} – ${e.titel}\n${e.text}${e.stunden ? `\nStunden: ${e.stunden}` : ""}\nFachkraft: ${e.fachkraft}`).join("\n\n")
        : "Keine Einträge vorhanden.";

      const prompt = `Du bist eine erfahrene sozialpädagogische Fachkraft. Erstelle einen ${berichtstyp} für einen externen Fachdienst bzw. das Jugendamt.\n\n${stilText[stil]}\n${templates[berichtstyp]}\n\nVerwende klare, nachvollziehbare Formulierungen. Keine Umgangssprache. Keine wertenden oder spekulativen Aussagen. Benenne Beobachtungen und Einschätzungen nachvollziehbar. Kein Markdown.\n\nFalldaten:\nName: ${anonClient.name}\nGeburtsdatum: ${anonClient.dob}\nAktenzeichen: ${anonClient.aktenzeichen}\nEinrichtung: ${anonClient.einrichtung}\nBerichtszeitraum: ${zeitraum}\nVerfassende Fachkraft: ${user?.name || "unbekannt"}${empfaenger ? `\nEmpfänger: ${empfaenger}` : ""}${zusatzhinweis ? `\nZusatzhinweise: ${zusatzhinweis}` : ""}\n\nDokumentierte Einträge:\n${eintragText}\n\nErstelle einen flüssigen, professionellen Bericht in zusammenhängendem Text. Abschluss mit Datum und Platzhalter für Unterschrift.`;

      let text = await callKI(prompt);
      mapBack.forEach(([real, fake]) => {
        if (real) text = text.split(fake).join(real);
      });
      setBericht(text.trim());
      setTimeout(() => berichtRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch {
      setError(kiSettings.provider === "ollama"
        ? `Ollama nicht erreichbar oder Modell nicht geladen. Prüfe URL (${kiSettings.ollamaUrl}) und Modell (${kiSettings.ollamaModel}).`
        : "Die KI-Antwort konnte nicht erzeugt werden.");
    } finally {
      setLoading(false);
    }
  };

  const exportBerichtPDF = () => {
    if (!bericht || !selectedClient) return;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${berichtstyp}</title><style>body{font-family:'Times New Roman',serif;padding:54px;color:#1e293b;line-height:1.75;font-size:12pt}h1{font-size:16pt;color:#0f2647;border-bottom:2px solid #0f2647;padding-bottom:8px}pre{white-space:pre-wrap;font-family:'Times New Roman',serif} .meta{background:#f8fafc;border-left:4px solid #1a4480;padding:12px 16px;margin:20px 0;font-size:10pt} .footer{margin-top:42px;font-size:10pt;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px}</style></head><body><h1>${berichtstyp}</h1><div class="meta"><strong>Klient/in:</strong> ${selectedClient.name} | <strong>Aktenzeichen:</strong> ${selectedClient.aktenzeichen} | <strong>Einrichtung:</strong> ${selectedClient.einrichtung}<br/><strong>Erstellt am:</strong> ${new Date().toLocaleDateString("de-DE")} | <strong>Fachkraft:</strong> ${user?.name || "–"}${empfaenger ? ` | <strong>Empfänger:</strong> ${empfaenger}` : ""}</div><pre>${bericht}</pre><div class="footer">SozialDoku · ${kiSettings.provider === "ollama" ? `Lokal generiert mit ${kiSettings.ollamaModel}` : "KI-Entwurf"} · Vor Versand fachlich prüfen</div></body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const providerInfo = kiSettings.provider === "ollama"
    ? { color: "#166534", bg: "#dcfce7", icon: "🏠", label: `Lokale KI · ${kiSettings.ollamaModel}`, sub: `Server: ${kiSettings.ollamaUrl}` }
    : { color: "#1d4ed8", bg: "#dbeafe", icon: "☁️", label: "Anthropic / Cloud-Demo", sub: kiSettings.anonymisierung ? "Anonymisierung aktiv" : "Anonymisierung deaktiviert" };

  return (
    <div>
      <h1 style={pageTitle}>KI-Berichtsgenerator</h1>
      <p style={pageSubtitle}>Berichte aus vorhandenen Falldaten erzeugen und vor Versand fachlich nachbearbeiten.</p>

      <div style={{ background: providerInfo.bg, border: `1px solid ${providerInfo.color}33`, borderRadius: 12, padding: "14px 18px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26 }}>{providerInfo.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: providerInfo.color }}>{providerInfo.label}</p>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: providerInfo.color }}>{providerInfo.sub}</p>
        </div>
      </div>

      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={card}>
          <h2 style={cardTitle}>⚙️ Berichtseinstellungen</h2>

          <FormField label="Klient auswählen">
            <select value={selectedClientId} onChange={e => { setSelectedClientId(e.target.value); setBericht(""); setError(null); }} style={inputStyle}>
              <option value="">– Klient wählen –</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.aktenzeichen})</option>)}
            </select>
          </FormField>

          {selectedClient && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
              <strong>{selectedClient.name}</strong><br />
              {clientEintraege.length} Einträge vorhanden · Einrichtung: {selectedClient.einrichtung}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Berichtsart">
              <select value={berichtstyp} onChange={e => setBerichtstyp(e.target.value)} style={inputStyle}>
                {["Verlaufsbericht", "Abschlussbericht", "Zwischenbericht", "Hilfeplanbericht", "Stellungnahme"].map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Stil">
              <select value={stil} onChange={e => setStil(e.target.value)} style={inputStyle}>
                <option value="sachlich">Sachlich</option>
                <option value="fachlich">Fachlich</option>
                <option value="kurz">Kürzer</option>
              </select>
            </FormField>
          </div>

          <FormField label="Zeitraum">
            <select value={zeitraum} onChange={e => setZeitraum(e.target.value)} style={inputStyle}>
              {["3 Monate", "6 Monate", "12 Monate", "gesamter Verlauf"].map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>

          <FormField label="Empfänger (optional)">
            <input value={empfaenger} onChange={e => setEmpfaenger(e.target.value)} style={inputStyle} placeholder="z. B. Jugendamt Hamburg" />
          </FormField>

          <FormField label="Zusatzhinweise (optional)">
            <textarea rows={4} value={zusatzhinweis} onChange={e => setZusatzhinweis(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} placeholder="z. B. Schwerpunkt auf Wohnsituation, Schulbesuch oder Zusammenarbeit legen" />
          </FormField>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={() => setStil("sachlich")} style={{ ...btnSecondary, padding: "8px 12px", fontSize: 12 }}>Sachlicher</button>
            <button onClick={() => setStil("kurz")} style={{ ...btnSecondary, padding: "8px 12px", fontSize: 12 }}>Kürzer</button>
            <button onClick={() => setBerichtstyp("Hilfeplanbericht")} style={{ ...btnSecondary, padding: "8px 12px", fontSize: 12 }}>HPG-Vorlage</button>
          </div>

          <button onClick={generateBericht} disabled={!selectedClientId || loading} style={{ ...btnPrimary, width: "100%", justifyContent: "center", fontSize: 15, padding: "13px 0", background: !selectedClientId ? "#94a3b8" : kiSettings.provider === "ollama" ? "linear-gradient(135deg,#166534,#15803d)" : "linear-gradient(135deg,#6d28d9,#4c1d95)", cursor: !selectedClientId ? "not-allowed" : "pointer" }}>
            {loading ? "⏳ Bericht wird erstellt…" : kiSettings.provider === "ollama" ? "🏠 Lokal generieren" : "☁️ Entwurf generieren"}
          </button>
        </div>

        <div ref={berichtRef}>
          {!bericht && !loading && !error && (
            <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 360, textAlign: "center" }}>
              <span style={{ fontSize: 48, marginBottom: 14 }}>📝</span>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#64748b" }}>Noch kein Bericht erstellt</p>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Klient auswählen, Stil festlegen und Bericht generieren.</p>
            </div>
          )}

          {loading && (
            <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 360 }}>
              <div style={{ width: 44, height: 44, border: "4px solid #e2e8f0", borderTopColor: kiSettings.provider === "ollama" ? "#166534" : "#6d28d9", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 18 }} />
              <p style={{ color: kiSettings.provider === "ollama" ? "#166534" : "#6d28d9", fontWeight: 600 }}>Die KI verarbeitet die Falldaten…</p>
              <p style={{ color: "#94a3b8", fontSize: 13 }}>Das kann je nach Modell einen Moment dauern.</p>
            </div>
          )}

          {error && (
            <div style={{ ...card, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p style={{ color: "#dc2626", fontWeight: 700, margin: "0 0 8px" }}>❌ {error}</p>
              {kiSettings.provider === "ollama" && (
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                  <div><strong>Prüfen:</strong> Läuft <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>ollama serve</code>?</div>
                  <div>Ist das Modell geladen? <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>ollama pull {kiSettings.ollamaModel}</code></div>
                </div>
              )}
            </div>
          )}

          {bericht && (
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ ...cardTitle, margin: 0 }}>✅ Bericht erstellt</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => navigator.clipboard.writeText(bericht)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>📋 Kopieren</button>
                  <button onClick={() => setStil("kurz")} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>↘ Kürzer neu erzeugen</button>
                  <button onClick={exportBerichtPDF} style={{ ...btnPrimary, fontSize: 12, padding: "6px 12px" }}>🖨️ PDF</button>
                </div>
              </div>

              <div style={{ background: kiSettings.provider === "ollama" ? "#f0fdf4" : "#faf9ff", border: `1px solid ${kiSettings.provider === "ollama" ? "#bbf7d0" : "#e9d5ff"}`, borderRadius: 10, padding: "18px 20px" }}>
                <p style={{ margin: "0 0 10px", fontSize: 11, color: kiSettings.provider === "ollama" ? "#166534" : "#7c3aed", fontWeight: 700, textTransform: "uppercase" }}>{berichtstyp} · {selectedClient?.name} · {stil}</p>
                <pre style={{ margin: 0, fontFamily: "'DM Sans',sans-serif", fontSize: 13, lineHeight: 1.8, color: "#1e293b", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{bericht}</pre>
              </div>

              <div style={{ marginTop: 12, padding: "10px 14px", background: kiSettings.provider === "ollama" ? "#f0fdf4" : "#fef3c7", borderRadius: 8, fontSize: 12, color: kiSettings.provider === "ollama" ? "#166534" : "#92400e", display: "flex", gap: 8 }}>
                <span>{kiSettings.provider === "ollama" ? "✅" : "⚠️"}</span>
                <span>{kiSettings.provider === "ollama" ? "Lokal erstellt – keine Falldaten haben den Rechner verlassen." : "KI-Entwurf – vor Versand fachlich prüfen und ggf. überarbeiten."}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotizenView({ notizen, onAdd, onUpdate, onDelete, user, clients, showToast }) {
  const [filterTyp, setFilterTyp] = useState("alle");
  const [filterTag, setFilterTag] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({ titel: "", text: "", farbe: "gelb", typ: "persoenlich", klientId: "", pinned: false, tags: [] });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const allTags = [...new Set(notizen.flatMap(n => n.tags || []))].sort();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchTag = normalizedSearch.startsWith("#") ? normalizedSearch.slice(1) : null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => set("tags", form.tags.filter(x => x !== t));
  const getKlient = (id) => clients.find(c => c.id == id);
  const teamCount = notizen.filter(n => n.typ === "team").length;
  const myCount = notizen.filter(n => n.typ === "persoenlich" && n.autor === user.name).length;

  const TAG_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4", "#a855f7"];
  const tagColor = (t) => TAG_COLORS[Math.abs(t.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];

  const shown = notizen
    .filter(n => filterTyp === "alle" ? true : filterTyp === "persoenlich" ? (n.typ === "persoenlich" && n.autor === user.name) : n.typ === "team")
    .filter(n => filterTag ? (n.tags || []).includes(filterTag) : true)
    .filter(n => {
      if (!normalizedSearch) return true;
      const hay = `${n.titel} ${n.text} ${(n.tags || []).join(" ")} ${getKlient(n.klientId)?.name || ""}`.toLowerCase();
      if (searchTag) return (n.tags || []).some(t => t.toLowerCase().includes(searchTag));
      return hay.includes(normalizedSearch);
    })
    .sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return new Date(b.datum) - new Date(a.datum);
    });

  const openNew = () => {
    setForm({ titel: "", text: "", farbe: "gelb", typ: "persoenlich", klientId: "", pinned: false, tags: [] });
    setTagInput("");
    setEditId(null);
    setShowNew(true);
  };

  const openEdit = (n) => {
    setForm({ titel: n.titel, text: n.text, farbe: n.farbe, typ: n.typ, klientId: n.klientId || "", pinned: n.pinned, tags: n.tags || [] });
    setTagInput("");
    setEditId(n.id);
    setShowNew(true);
  };

  const save = async () => {
    if (!form.titel.trim()) return showToast("Bitte einen Titel eingeben.", "#c0392b");
    if (!form.text.trim()) return showToast("Bitte einen Notiztext eingeben.", "#c0392b");
    if (editId) {
      await onUpdate(editId, {
        titel: form.titel,
        text: form.text,
        farbe: form.farbe,
        typ: form.typ,
        klient_id: form.klientId ? parseInt(form.klientId) : null,
        klientId: form.klientId ? parseInt(form.klientId) : null,
        pinned: form.pinned,
        tags: form.tags,
      });
      showToast("Notiz aktualisiert ✓");
    } else {
      await onAdd({
        titel: form.titel,
        text: form.text,
        farbe: form.farbe,
        typ: form.typ,
        klientId: form.klientId ? parseInt(form.klientId) : null,
        pinned: form.pinned,
        tags: form.tags,
      });
      showToast("Notiz gespeichert ✓");
    }
    setShowNew(false);
  };

  const del = async (id) => { await onDelete(id); };
  const pin = async (id) => {
    const found = notizen.find(n => n.id === id);
    if (!found) return;
    await onUpdate(id, { pinned: !found.pinned });
  };

  const TagBadge = ({ tag, active, onClick, removable, onRemove }) => (
    <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: active ? tagColor(tag) : tagColor(tag) + "22", color: active ? "#fff" : tagColor(tag), border: `1px solid ${tagColor(tag)}44`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600, cursor: onClick ? "pointer" : "default", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
      #{tag}
      {removable && <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ cursor: "pointer", opacity: .7, marginLeft: 2, fontSize: 13 }}>×</span>}
    </span>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={pageTitle}>Notizen</h1>
          <p style={pageSubtitle}>{myCount} persönliche · {teamCount} Team-Notizen</p>
        </div>
        <button onClick={openNew} style={btnPrimary}>+ Neue Notiz</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }} className="notizen-layout">
        <div>
          <div style={{ ...card, padding: "18px 16px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px" }}>Sichtbarkeit</p>
            {[ ["alle", "Alle", notizen.length], ["persoenlich", "👤 Persönlich", myCount], ["team", "👥 Team", teamCount] ].map(([id, label, count]) => (
              <button key={id} onClick={() => setFilterTyp(id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 4, background: filterTyp === id ? "#f59e0b" : "transparent", color: filterTyp === id ? "#fff" : "#475569", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: filterTyp === id ? 700 : 400 }}>
                <span>{label}</span>
                <span style={{ background: filterTyp === id ? "rgba(255,255,255,.3)" : "#f1f5f9", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{count}</span>
              </button>
            ))}
          </div>

          <div style={{ ...card, padding: "18px 16px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px" }}>Suche</p>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={inputStyle} placeholder="Titel, Text oder #hashtag suchen" />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{ ...btnSecondary, width: "100%", marginTop: 8, padding: "8px 12px", fontSize: 12 }}>Suche leeren</button>
            )}
          </div>

          {allTags.length > 0 ? (
            <div style={{ ...card, padding: "18px 16px" }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px" }}>Tags</p>
              {filterTag && <button onClick={() => setFilterTag(null)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 8, background: "#f1f5f9", color: "#64748b", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600 }}>✕ Filter aufheben</button>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {allTags.map(tag => {
                  const count = notizen.filter(n => (n.tags || []).includes(tag)).length;
                  return (
                    <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${filterTag === tag ? tagColor(tag) : "transparent"}`, cursor: "pointer", background: filterTag === tag ? tagColor(tag) + "15" : "transparent", color: "#1e293b", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                      <span style={{ color: tagColor(tag), fontWeight: 600 }}>#{tag}</span>
                      <span style={{ background: "#f1f5f9", borderRadius: 10, padding: "1px 8px", fontSize: 11, color: "#64748b", fontWeight: 700 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ ...card, padding: "16px", textAlign: "center", color: "#94a3b8" }}>
              <p style={{ fontSize: 24, marginBottom: 6 }}>🏷️</p>
              <p style={{ fontSize: 12 }}>Noch keine Tags vorhanden.</p>
            </div>
          )}
        </div>

        <div>
          {(filterTag || searchTerm) && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#475569" }}>
                {filterTag ? <>Tag-Filter: <strong>#{filterTag}</strong></> : null}
                {filterTag && searchTerm ? " · " : null}
                {searchTerm ? <>Suche: <strong>{searchTerm}</strong></> : null}
                {` · ${shown.length} Treffer`}
              </span>
              <button onClick={() => { setFilterTag(null); setSearchTerm(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13, fontWeight: 700 }}>Alles zurücksetzen</button>
            </div>
          )}

          {shown.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: 48 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📝</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#64748b" }}>Keine Notizen gefunden</p>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>Prüfe die Suche oder lege eine neue Notiz an.</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {shown.map(n => {
              const fc = NOTIZ_FARBEN[n.farbe] || NOTIZ_FARBEN.gelb;
              const klient = getKlient(n.klientId);
              const tags = n.tags || [];
              return (
                <div key={n.id} style={{ background: fc.bg, borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 10px rgba(0,0,0,.06)", borderTop: `4px solid ${fc.border}`, position: "relative" }}>
                  {n.pinned && <span style={{ position: "absolute", top: 12, right: 12, fontSize: 15 }}>📌</span>}
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#1e293b", lineHeight: 1.35, paddingRight: n.pinned ? 24 : 0 }}>{n.titel}</h3>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.text.length > 180 ? n.text.slice(0, 180) + "…" : n.text}</p>
                  {tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                      {tags.map(t => <TagBadge key={t} tag={t} active={filterTag === t || searchTag === t} onClick={() => setFilterTag(filterTag === t ? null : t)} />)}
                    </div>
                  )}
                  {klient && <div style={{ background: "rgba(255,255,255,.6)", borderRadius: 8, padding: "3px 10px", marginBottom: 8, fontSize: 12, color: "#1a4480", display: "inline-block", fontWeight: 600 }}>👤 {klient.name}</div>}
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
                    {`Erstellt ${formatDateTime(n.created_at || n.datum)}${n.updated_at ? ` · Geändert ${formatDateTime(n.updated_at)}` : ""}`}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(0,0,0,.08)" }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{n.typ === "team" ? "👥" : "👤"} {n.autor} · {formatDate(n.datum)}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button onClick={() => pin(n.id)} title={n.pinned ? "Lösen" : "Anpinnen"} style={{ background: "rgba(255,255,255,.7)", border: "none", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 12 }}>{n.pinned ? "📌" : "📍"}</button>
                      <button onClick={() => openEdit(n)} style={{ background: "rgba(255,255,255,.7)", border: "none", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                      <button onClick={() => del(n.id)} style={{ background: "rgba(255,255,255,.7)", border: "none", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontSize: 12 }}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showNew && (
        <Modal onClose={() => setShowNew(false)} maxWidth={900}>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 24, marginBottom: 20 }}>{editId ? "Notiz bearbeiten" : "Neue Notiz"}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="dash-grid">
            <div>
              <FormField label="Titel">
                <input value={form.titel} onChange={e => set("titel", e.target.value)} style={inputStyle} placeholder="Kurzer Titel…" />
              </FormField>
              <FormField label="Notiz">
                <textarea rows={14} value={form.text} onChange={e => set("text", e.target.value)} style={{ ...inputStyle, resize: "vertical", minHeight: 320 }} placeholder="Notizinhalt…" />
              </FormField>
            </div>
            <div>
              <FormField label="Tags">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {form.tags.map(t => <TagBadge key={t} tag={t} active removable onRemove={() => removeTag(t)} />)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} style={{ ...inputStyle, flex: 1 }} placeholder="Tag + Enter (z. B. dringend, schule)" />
                  <button onClick={addTag} style={{ ...btnSecondary, whiteSpace: "nowrap", padding: "10px 16px" }}>+ Hinzufügen</button>
                </div>
                {allTags.filter(t => !form.tags.includes(t)).length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Vorhandene Tags:</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {allTags.filter(t => !form.tags.includes(t)).map(t => <span key={t} onClick={() => set("tags", [...form.tags, t])} style={{ background: tagColor(t) + "18", color: tagColor(t), border: `1px solid ${tagColor(t)}44`, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>#{t}</span>)}
                    </div>
                  </div>
                )}
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Sichtbarkeit">
                  <select value={form.typ} onChange={e => set("typ", e.target.value)} style={inputStyle}>
                    <option value="persoenlich">👤 Nur ich</option>
                    <option value="team">👥 Team</option>
                  </select>
                </FormField>
                <FormField label="Klient (optional)">
                  <select value={form.klientId} onChange={e => set("klientId", e.target.value)} style={inputStyle}>
                    <option value="">– Kein Bezug –</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Farbe">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(NOTIZ_FARBEN).map(([key, val]) => <button key={key} onClick={() => set("farbe", key)} style={{ width: 36, height: 36, borderRadius: "50%", background: val.bg, border: `3px solid ${form.farbe === key ? val.border : "transparent"}`, cursor: "pointer", boxShadow: form.farbe === key ? `0 0 0 2px ${val.border}` : "none" }} title={val.label} />)}
                </div>
              </FormField>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20, fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#475569" }}>
                <input type="checkbox" checked={form.pinned} onChange={e => set("pinned", e.target.checked)} style={{ width: 16, height: 16 }} />
                📌 Notiz anpinnen
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNew(false)} style={btnSecondary}>Abbrechen</button>
            <button onClick={save} style={{ ...btnPrimary, background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>{editId ? "Speichern" : "Notiz erstellen"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KIEinstellungenView({ kiSettings, setKiSettings, showToast }) {
  const [form, setForm] = useState({ ...kiSettings });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const testOllama = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`${form.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      const models = data.models?.map(m => m.name) || [];
      setTestResult({ ok: true, msg: `✅ Verbindung erfolgreich! ${models.length} Modell(e) gefunden: ${models.join(", ") || "keine"}` });
    } catch {
      setTestResult({ ok: false, msg: "❌ Verbindung fehlgeschlagen. Läuft Ollama? Prüfe die URL." });
    } finally { setTesting(false); }
  };

  const save = () => { setKiSettings(form); showToast("KI-Einstellungen gespeichert ✓"); };

  return (
    <div>
      <h1 style={pageTitle}>KI-Einstellungen</h1>
      <p style={pageSubtitle}>Konfiguriere welche KI für die Berichtserstellung verwendet wird.</p>

      {/* Provider-Auswahl */}
      <div style={card}>
        <h2 style={cardTitle}>🤖 KI-Anbieter</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }} className="dash-grid">

          {/* Anthropic */}
          <div onClick={() => set("provider", "anthropic")} style={{ border: `2px solid ${form.provider === "anthropic" ? "#6d28d9" : "#e2e8f0"}`, borderRadius: 14, padding: "20px 22px", cursor: "pointer", background: form.provider === "anthropic" ? "#faf9ff" : "#fff", transition: "all .2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>☁️</span>
              {form.provider === "anthropic" && <span style={{ background: "#6d28d9", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Aktiv</span>}
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f2647" }}>Anthropic Claude API</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>Hochwertige KI über das Internet. Beste Textqualität für Berichte.</p>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#d97706" }}>⚠️ Daten verlassen den Server</span>
              <span style={{ fontSize: 12, color: "#16a34a" }}>✅ Mit Anonymisierung DSGVO-konform</span>
              <span style={{ fontSize: 12, color: "#16a34a" }}>✅ Kein Setup nötig</span>
            </div>
          </div>

          {/* Ollama */}
          <div onClick={() => set("provider", "ollama")} style={{ border: `2px solid ${form.provider === "ollama" ? "#166534" : "#e2e8f0"}`, borderRadius: 14, padding: "20px 22px", cursor: "pointer", background: form.provider === "ollama" ? "#f0fdf4" : "#fff", transition: "all .2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>🏠</span>
              {form.provider === "ollama" && <span style={{ background: "#166534", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Aktiv</span>}
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f2647" }}>Ollama (Lokal)</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>KI läuft auf eurem eigenen PC oder Server. Keine Daten verlassen das Haus.</p>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#16a34a" }}>✅ 100% offline & DSGVO-konform</span>
              <span style={{ fontSize: 12, color: "#16a34a" }}>✅ Keine laufenden Kosten</span>
              <span style={{ fontSize: 12, color: "#d97706" }}>⚙️ Setup auf PC/Server nötig</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ollama Einstellungen */}
      <div style={card}>
          <h2 style={cardTitle}>🏠 Ollama-Konfiguration</h2>
          <p style={{ margin: "-6px 0 16px", fontSize: 13, color: "#64748b" }}>URL und Modell sind jetzt immer sichtbar, damit die lokale Einrichtung einfacher ist.</p>

          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "#0369a1", lineHeight: 1.7 }}>
            <strong>So richtest du Ollama ein:</strong><br/>
            1. Ollama herunterladen: <strong>ollama.com</strong><br/>
            2. Im Terminal: <code style={{ background: "#e0f2fe", padding: "1px 6px", borderRadius: 4 }}>ollama pull llama3</code><br/>
            3. Starten: <code style={{ background: "#e0f2fe", padding: "1px 6px", borderRadius: 4 }}>ollama serve</code><br/>
            4. URL hier eintragen und Verbindung testen ✓
          </div>

          <FormField label="Ollama Server-URL">
            <input value={form.ollamaUrl} onChange={e => set("ollamaUrl", e.target.value)} style={inputStyle} placeholder="http://localhost:11434" />
          </FormField>
          <FormField label="Modell">
            <select value={form.ollamaModel} onChange={e => set("ollamaModel", e.target.value)} style={inputStyle}>
              <option value="llama3">Llama 3 (empfohlen)</option>
              <option value="llama3:8b">Llama 3 8B (schneller)</option>
              <option value="mistral">Mistral 7B</option>
              <option value="mixtral">Mixtral 8x7B (besser, braucht mehr RAM)</option>
              <option value="phi3">Phi-3 (sehr schnell)</option>
              <option value="custom">Eigenes Modell…</option>
            </select>
          </FormField>
          {form.ollamaModel === "custom" && (
            <FormField label="Modellname"><input style={inputStyle} placeholder="z.B. mein-modell:latest" /></FormField>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={testOllama} disabled={testing} style={{ ...btnSecondary, fontSize: 13 }}>
              {testing ? "⏳ Teste…" : "🔌 Verbindung testen"}
            </button>
            {testResult && (
              <span style={{ fontSize: 13, color: testResult.ok ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{testResult.msg}</span>
            )}
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
            <strong>Empfohlene Hardware für Heim-PC:</strong><br/>
            🟢 Llama 3 8B → 8 GB RAM reicht (CPU-only möglich)<br/>
            🟡 Llama 3 70B → 32 GB RAM + NVIDIA GPU empfohlen<br/>
            🟢 Mistral 7B → sehr schnell, gute Qualität für Berichte<br/>
            <br/>
            <strong>Für späteren Server:</strong> NVIDIA GPU mit 8+ GB VRAM ideal
          </div>
        </div>

      {/* Datenschutz-Einstellungen */}
      <div style={card}>
        <h2 style={cardTitle}>🔒 Datenschutz-Einstellungen</h2>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 0", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ flex: 1, paddingRight: 20 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>Datenanonymisierung</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>Name, Geburtsdatum und Aktenzeichen werden vor dem Senden an eine externe KI durch Platzhalter ersetzt. Im fertigen Bericht werden sie wieder eingesetzt. <strong>Empfohlen bei Anthropic.</strong></p>
            {form.provider === "ollama" && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#16a34a" }}>✅ Bei lokaler KI nicht nötig — Daten verlassen den Server nicht.</p>}
          </div>
          <div onClick={() => set("anonymisierung", !form.anonymisierung)} style={{ width: 48, height: 26, borderRadius: 13, background: form.anonymisierung ? "#16a34a" : "#e2e8f0", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: form.anonymisierung ? 25 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .2s" }} />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "14px 16px", background: form.provider === "ollama" ? "#f0fdf4" : form.anonymisierung ? "#f0fdf4" : "#fef2f2", borderRadius: 10, fontSize: 13, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{form.provider === "ollama" ? "✅" : form.anonymisierung ? "✅" : "⚠️"}</span>
          <div style={{ color: form.provider === "ollama" ? "#166534" : form.anonymisierung ? "#166534" : "#dc2626" }}>
            {form.provider === "ollama"
              ? <><strong>Vollständig DSGVO-konform:</strong> Lokale KI, keine Daten verlassen den Server.</>
              : form.anonymisierung
              ? <><strong>DSGVO-konform:</strong> Anonymisierung aktiv. Echte Personendaten werden nicht an Anthropic gesendet.</>
              : <><strong>Achtung:</strong> Anonymisierung deaktiviert. Echte Klientendaten werden an Anthropic Server in den USA gesendet. Nur mit AVV empfohlen.</>
            }
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={save} style={{ ...btnPrimary, fontSize: 15, padding: "12px 32px" }}>💾 Einstellungen speichern</button>
      </div>
    </div>
  );
}

function StundenView({ clients, eintraege }) {
  const rows = clients.map(c => { const entries = eintraege[c.id] || []; const h = entries.filter(e => e.typ === "Stunden").reduce((s, e) => s + (e.stunden || 0), 0); return { ...c, stunden: h, eintraegeCount: entries.length }; }).filter(r => r.stunden > 0);
  const total = rows.reduce((s, r) => s + r.stunden, 0);
  return (
    <div>
      <h1 style={pageTitle}>Stunden & Berichte</h1>
      <p style={pageSubtitle}>Übersicht aller erfassten Leistungsstunden</p>
      <div style={{ background: "linear-gradient(135deg,#0f2647,#16825a)", borderRadius: 14, padding: "24px 30px", marginBottom: 24, color: "#fff" }}>
        <p style={{ margin: 0, fontSize: 13, opacity: .7 }}>Gesamt geleistete Stunden</p>
        <p style={{ margin: "4px 0 0", fontSize: 40, fontFamily: "'DM Serif Display',serif" }}>{total.toFixed(1)} h</p>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}><div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
          <thead><tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>{["Klient","Einrichtung","Einträge","Stunden"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}><td style={{ padding: "13px 16px", fontWeight: 600, color: "#1e293b" }}>{r.name}</td><td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{r.einrichtung}</td><td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13 }}>{r.eintraegeCount}</td><td style={{ padding: "13px 16px" }}><span style={{ background: "#fef3c7", color: "#b45309", fontWeight: 700, padding: "4px 12px", borderRadius: 8 }}>{r.stunden.toFixed(1)} h</span></td></tr>)}
            {rows.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Keine Stunden erfasst.</td></tr>}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}

function DsgvoView() {
  const items = [
    { icon: "🔐", title: "Verschlüsselte Datenspeicherung", text: "Alle personenbezogenen Daten werden AES-256-verschlüsselt gespeichert und übertragen (TLS 1.3)." },
    { icon: "🏢", title: "Serverstandort Deutschland", text: "Ausschließlich ISO-27001-zertifizierte Rechenzentren in Deutschland (DSGVO Art. 44 ff.)." },
    { icon: "👁", title: "Zugriffsprotokollierung", text: "Jeder Datenzugriff wird revisionssicher protokolliert. Vollständige Audit-Trails verfügbar." },
    { icon: "🗑", title: "Recht auf Löschung", text: "Klientendaten können auf Anfrage vollständig und nachweislich gelöscht werden (DSGVO Art. 17)." },
    { icon: "📜", title: "Auftragsverarbeitung", text: "Vollständiger AVV-Vertrag inklusive. Kein Weiterverkauf von Daten." },
    { icon: "🔑", title: "Rollenbasierter Zugriff", text: "Admin, Leitung und Fachkraft mit differenzierten Rechten. Nutzerverwaltung nur für Admins." },
  ];
  return (
    <div>
      <h1 style={pageTitle}>Datenschutz & DSGVO</h1>
      <p style={pageSubtitle}>SozialDoku wurde von Grund auf DSGVO-konform entwickelt.</p>
      <div className="dsgvo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {items.map(i => <div key={i.title} style={{ background: "#fff", borderRadius: 14, padding: "22px 24px", boxShadow: "0 2px 10px rgba(0,0,0,.06)" }}><div style={{ fontSize: 26, marginBottom: 10 }}>{i.icon}</div><h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f2647" }}>{i.title}</h3><p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{i.text}</p></div>)}
      </div>
    </div>
  );
}

function NewClientModal({ einrichtungen, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", dob: "", einrichtung: einrichtungen[0], aktenzeichen: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 20 }}>Neuen Klienten anlegen</h2>
      <FormField label="Vollständiger Name"><input value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} placeholder="Vor- und Nachname" /></FormField>
      <FormField label="Geburtsdatum"><input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} style={inputStyle} /></FormField>
      <FormField label="Einrichtung"><select value={form.einrichtung} onChange={e => set("einrichtung", e.target.value)} style={inputStyle}>{einrichtungen.map(e => <option key={e}>{e}</option>)}</select></FormField>
      <FormField label="Aktenzeichen"><input value={form.aktenzeichen} onChange={e => set("aktenzeichen", e.target.value)} style={inputStyle} placeholder="z.B. 2025-0001" /></FormField>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} style={btnSecondary}>Abbrechen</button>
        <button onClick={() => { if (form.name && form.dob) onSave(form); }} style={btnPrimary}>Anlegen</button>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose, maxWidth = 540 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 20px", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "32px 36px", width: "100%", maxWidth, boxShadow: "0 24px 80px rgba(15,23,42,.24)", animation: "slideUp .25s ease" }} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PdfPreviewModal({ file, onClose }) {
  const printPdf = () => {
    const w = window.open(file.url, "_blank");
    if (w) w.addEventListener("load", () => w.print(), { once: true });
  };
  return (
    <Modal onClose={onClose} maxWidth={1100}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ ...cardTitle, margin: 0 }}>PDF-Vorschau</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{file.name}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => window.open(file.url, "_blank")} style={btnSecondary}>Herunterladen</button>
          <button onClick={printPdf} style={btnSecondary}>Drucken</button>
          <button onClick={onClose} style={btnPrimary}>Schließen</button>
        </div>
      </div>
      <div style={{ height: "72vh", minHeight: 420, border: "1px solid #cbd5e1", borderRadius: 10, overflow: "hidden", background: "#f8fafc" }}>
        <iframe src={file.url} title={file.name || "PDF-Vorschau"} style={{ width: "100%", height: "100%", border: "none", display: "block" }} />
      </div>
    </Modal>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: "#1f2937", background: "#fff", boxSizing: "border-box", outline: "none", transition: "border-color .2s, box-shadow .2s" };
const btnPrimary = { background: "#1e3a5f", color: "#fff", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 8, transition: "opacity .2s, background .2s", whiteSpace: "nowrap" };
const btnSecondary = { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .2s" };
const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 6px rgba(15,23,42,.06)", border: "1px solid #e2e8f0", marginBottom: 20 };
const cardTitle = { fontFamily: "'DM Sans',sans-serif", fontSize: 17, fontWeight: 700, margin: "0 0 16px", color: "#1f2937" };
const pageTitle = { fontFamily: "'DM Sans',sans-serif", fontSize: 32, fontWeight: 700, color: "#1f2937", margin: "0 0 6px" };
const pageSubtitle = { color: "#64748b", fontSize: 15, margin: "0 0 28px" };
const modalTitleStyle = { fontFamily: "'DM Serif Display',serif", fontSize: 22, margin: "0 0 4px", color: "#111827", display: "flex", alignItems: "center", gap: 10 };
const sectionIconWrapStyle = { width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#ffffff,#f8fafc)", border: "1px solid #dbe3ea", boxShadow: "inset 0 1px 0 rgba(255,255,255,.85), 0 1px 2px rgba(15,23,42,.04)", flexShrink: 0 };
const sectionIconActiveStyle = { background: "#eef4f8", border: "1px solid #b8c6d3", boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 3px 8px rgba(15,23,42,.06)" };
const compactRecordStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 15px", background: "#fff", marginTop: 10 };
const chronoRecordStyle = { border: "1px solid #e2e8f0", borderLeft: "3px solid #475569", borderRadius: 8, padding: "15px 16px", background: "#fff", boxShadow: "0 1px 2px rgba(15,23,42,.04)" };
const noteRecordStyle = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "13px 15px", background: "#fff" };
const recordTitleStyle = { margin: 0, fontWeight: 700, fontSize: 14, color: "#111827", lineHeight: 1.35 };
const recordMetaStyle = { margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 };
const recordTextStyle = { margin: "7px 0 0", fontSize: 13, color: "#374151", lineHeight: 1.7 };
const statusChipStyle = { display: "inline-flex", alignItems: "center", minHeight: 22, border: "1px solid", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" };
const statusSelectStyle = { minHeight: 28, border: "1px solid #cbd5e1", borderRadius: 999, background: "#fff", color: "#334155", padding: "3px 28px 3px 10px", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" };
const chronoHeaderGridStyle = { display: "grid", gridTemplateColumns: "88px minmax(110px,.8fr) minmax(110px,.8fr) minmax(160px,1.6fr)", gap: 14, alignItems: "start" };
const chronoLabelStyle = { display: "block", marginBottom: 3, fontSize: 10, color: "#94a3b8", textTransform: "uppercase", fontWeight: 800, letterSpacing: ".04em" };
const chronoMetaValueStyle = { margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.4, fontWeight: 700 };

const globalStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  #root { width: 100%; max-width: none; min-height: 100vh; border: 0; text-align: left; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
  @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
  @keyframes spin { to { transform: rotate(360deg) } }
  input:focus, select:focus, textarea:focus { border-color: #1e3a5f !important; box-shadow: 0 0 0 3px rgba(30,58,95,.10); outline: none; }
  button:hover { opacity: .87; }
  ::-webkit-scrollbar { width: 6px } ::-webkit-scrollbar-track { background:#f1f5f9 } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }

  .app-layout { display: flex; min-height: 100vh; background: #f6f8fb; font-family: 'DM Sans', sans-serif; color: #1f2937; }
  .main-wrapper { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .sidebar { width: 230px; background: #172033; display: flex; flex-direction: column; padding: 24px 0 0; color: #fff; flex-shrink: 0; overflow: hidden; }
  .main-content { flex: 1; padding: 36px 40px; overflow-y: auto; }
  .mobile-header { display: none; }
  .sidebar-overlay { display: none; }
  .toast { position: fixed; bottom: 28px; right: 28px; color: #fff; padding: 12px 22px; border-radius: 10px; font-family: 'DM Sans',sans-serif; font-weight: 600; font-size: 14px; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,.18); animation: fadeIn .3s; }

  .notizen-layout { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: start; }
  .calendar-month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
  @media (max-width: 920px) {
    .sidebar { position: fixed; left: 0; top: 0; bottom: 0; z-index: 200; transform: translateX(-100%); width: 260px; padding-top: 20px; transition: transform .28s ease; }
    .sidebar-open { transform: translateX(0) !important; }
    .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 199; }
    .mobile-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .main-content { padding: 20px 16px; }
    .stats-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
    .dash-grid { grid-template-columns: 1fr !important; }
    .vorlagen-grid { grid-template-columns: 1fr !important; }
    .dsgvo-grid { grid-template-columns: 1fr !important; }
    .toast { bottom: 16px; right: 16px; left: 16px; text-align: center; }
  }
  @media (max-width: 768px) {
    .notizen-layout { grid-template-columns: 1fr !important; }
    .akte-grid { grid-template-columns: 1fr !important; }
    .akte-grid > * { grid-column: auto !important; }
    .chrono-grid { grid-template-columns: 1fr 1fr !important; }
    .calendar-month-grid { gap: 4px !important; }
    .calendar-day-cell { min-height: 86px !important; padding: 7px !important; }
    .calendar-day-event { display: none !important; }
    .all-termine-row { grid-template-columns: 1fr !important; gap: 6px !important; }
    h1 { line-height: 1.12; }
    input, select, textarea, button { max-width: 100%; }
    .main-content { padding: 18px 12px 88px; }
  }
  @media (max-width: 560px) {
    .mobile-header { padding: 12px 14px; }
    .main-content { padding-inline: 10px; }
    .chrono-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
    table { font-size: 13px; }
  }
`;
