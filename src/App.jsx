import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const ROLLEN_FARBEN = { Admin: { bg: "#fce7f3", color: "#9d174d" }, Leitung: { bg: "#e0e7ff", color: "#3730a3" }, Fachkraft: { bg: "#dcfce7", color: "#166534" } };
const VORLAGEN = [
  { id: 1, typ: "Fallverlauf", titel: "Erstgespräch", text: "Erstkontakt mit Klient/in hergestellt. Aktuelle Lebenssituation besprochen. Unterstützungsbedarf ermittelt. Nächste Schritte vereinbart." },
  { id: 2, typ: "Fallverlauf", titel: "Verlaufsgespräch", text: "Regelmäßiges Verlaufsgespräch durchgeführt. Aktuelle Situation besprochen. Fortschritte dokumentiert. Hilfeplan überprüft und ggf. angepasst." },
  { id: 3, typ: "Maßnahme", titel: "Hilfeplan erstellt", text: "Individueller Hilfeplan gemeinsam mit Klient/in erarbeitet. Ziele definiert, Maßnahmen festgelegt. Laufzeit: 6 Monate. Nächste Überprüfung vereinbart." },
  { id: 4, typ: "Maßnahme", titel: "Krisenintervention", text: "Akute Krisensituation festgestellt und interveniert. Sicherheit der betroffenen Person gewährleistet. Sofortmaßnahmen eingeleitet. Weiteres Vorgehen abgestimmt." },
  { id: 5, typ: "Stunden", titel: "Begleitung Behördengang", text: "Klient/in zu Behörde begleitet. Erforderliche Unterlagen vorbereitet und eingereicht. Sachverhalt gemeinsam mit Sachbearbeitung besprochen." },
  { id: 6, typ: "Stunden", titel: "Hausbesuch", text: "Hausbesuch durchgeführt. Wohnsituation begutachtet. Unterstützungsbedarf im Haushalt besprochen. Vereinbarungen für weitere Maßnahmen getroffen." },
];
const NOTIZ_FARBEN = {
  gelb:  { bg: "#fef9c3", border: "#f59e0b", label: "Gelb" },
  rot:   { bg: "#fee2e2", border: "#ef4444", label: "Rot" },
  gruen: { bg: "#dcfce7", border: "#22c55e", label: "Grün" },
  blau:  { bg: "#dbeafe", border: "#3b82f6", label: "Blau" },
  lila:  { bg: "#ede9fe", border: "#8b5cf6", label: "Lila" },
};

const FACHBEREICH_LABELS = {
  soziales: "Soziales",
  gesundheit: "Gesundheit",
  bildungBeruf: "Bildung/Beruf",
  finanzen: "Finanzen",
  behoerden: "Behörden",
  freizeit: "Freizeit",
};
const FACHBEREICH_FARBEN = {
  soziales: "#0f766e",
  gesundheit: "#dc2626",
  bildungBeruf: "#2563eb",
  finanzen: "#7c3aed",
  behoerden: "#475569",
  freizeit: "#ea580c",
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
const ds = (d) => d.toISOString().split("T")[0];
const formatDate = (d) => d ? new Date(d).toLocaleDateString("de-DE") : "–";
const typeColor = (t) => ({ Fallverlauf: "#2563a8", "Maßnahme": "#16825a", Massnahme: "#16825a", Stunden: "#b45309" }[t] || "#555");
const typBg = (t) => ({ Fallverlauf: "#e8f0fb", "Maßnahme": "#e6f7f0", Massnahme: "#e6f7f0", Stunden: "#fef3c7" }[t] || "#f3f4f6");
const rolleStyle = (r) => ROLLEN_FARBEN[r] || { bg: "#f1f5f9", color: "#475569" };

// ── PDF Export ─────────────────────────────────────────────────────
const exportPDF = (client, eintraege) => {
  const rows = eintraege.map(e => `<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:8px;color:#555">${formatDate(e.datum)}</td><td style="padding:8px"><span style="background:${typBg(e.typ)};color:${typeColor(e.typ)};padding:2px 8px;border-radius:4px;font-size:12px">${e.typ}</span></td><td style="padding:8px;font-weight:600">${e.titel}</td><td style="padding:8px;color:#555">${e.text}</td><td style="padding:8px;color:#555">${e.fachkraft}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bericht</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#1a1a2e}h1{color:#1a3a6e}table{width:100%;border-collapse:collapse}th{background:#1a3a6e;color:#fff;padding:10px;text-align:left}</style></head><body><h1>Dokumentation: ${client.name}</h1><p><strong>Aktenzeichen:</strong> ${client.aktenzeichen} | <strong>Einrichtung:</strong> ${client.einrichtung}</p><hr/><table><thead><tr><th>Datum</th><th>Typ</th><th>Titel</th><th>Beschreibung</th><th>Fachkraft</th></tr></thead><tbody>${rows || "<tr><td colspan='5' style='padding:16px;text-align:center'>Keine Einträge</td></tr>"}</tbody></table><p style="margin-top:40px;font-size:11px;color:#aaa">SozialDoku · DSGVO-konform</p></body></html>`;
  const w = window.open("", "_blank"); w.document.write(html); w.document.close(); w.print();
};

// ══════════════════════════════════════════════════════════════════
// MAIN APP — mit Supabase
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [clients, setClients] = useState([]);
  const [eintraege, setEintraege] = useState({});
  const [fallakten, setFallakten] = useState({});
  const [users, setUsers] = useState([]);
  const [termine, setTermine] = useState([]);
  const [notizen, setNotizen] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState("");
  const [newEintrag, setNewEintrag] = useState(null);
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

  // ── Profil laden ────────────────────────────────────────────────
  const loadUserProfile = async (uid) => {
    const { data } = await supabase.from("nutzer").select("*").eq("id", uid).single();
    if (data) setUser(data);
    setLoading(false);
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from("klienten")
      .select("*")
      .order("name");

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
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("nutzer").select("*").order("name");
    if (data) setUsers(data);
  };

  const loadTermine = async () => {
    const { data } = await supabase.from("termine").select("*").order("datum");
    if (data) setTermine(data.map(t => ({ ...t, klientId: t.klient_id })));
  };

  const loadNotizen = async () => {
    const { data } = await supabase.from("notizen").select("*").order("pinned", { ascending: false });
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
    if (!session) return;
    const loadInitialData = async () => {
      await Promise.all([loadClients(), loadUsers(), loadTermine(), loadNotizen()]);
    };
    loadInitialData();
    // Loader are intentionally scoped in this component; adding them as deps would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── CRUD: Klienten ──────────────────────────────────────────────
  const addClient = async (clientData) => {
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
      const newE = { ...data, typ: data.typ === "Massnahme" ? "Maßnahme" : data.typ };
      setEintraege(prev => ({ ...prev, [klientId]: [newE, ...(prev[klientId] || [])] }));
      showToast("Eintrag gespeichert ✓");
    }
    if (error) showToast("Fehler beim Speichern", "#c0392b");
  };

  // ── CRUD: Termine ───────────────────────────────────────────────
  const addTermin = async (termin) => {
    const { data, error } = await supabase.from("termine").insert([{
      titel: termin.titel,
      datum: termin.datum,
      uhrzeit: termin.uhrzeit,
      klient_id: termin.klientId ? parseInt(termin.klientId) : null,
      fachkraft: termin.fachkraft || user?.name || "",
      ort: termin.ort || "",
      notiz: termin.notiz || "",
      erinnerung: termin.erinnerung || false,
      created_by: session.user.id,
    }]).select().single();
    if (data) {
      setTermine(prev => [...prev, { ...data, klientId: data.klient_id }]);
      showToast("Termin gespeichert ✓");
    }
    if (error) showToast("Fehler beim Speichern", "#c0392b");
  };

  const deleteTermin = async (id) => {
    await supabase.from("termine").delete().eq("id", id);
    setTermine(prev => prev.filter(t => t.id !== id));
    showToast("Termin gelöscht", "#64748b");
  };

  // ── CRUD: Notizen ───────────────────────────────────────────────
  const addNotiz = async (notiz) => {
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
      showToast("Notiz gespeichert ✓");
    }
    if (error) showToast("Fehler beim Speichern", "#c0392b");
  };

  const updateNotiz = async (id, updates) => {
    const { error } = await supabase.from("notizen").update(updates).eq("id", id);
    if (!error) setNotizen(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNotiz = async (id) => {
    await supabase.from("notizen").delete().eq("id", id);
    setNotizen(prev => prev.filter(n => n.id !== id));
    showToast("Notiz gelöscht", "#64748b");
  };

  // ── Nutzer verwalten (Admin) ────────────────────────────────────
  const toggleNutzer = async (id, aktiv) => {
    await supabase.from("nutzer").update({ aktiv }).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, aktiv } : u));
    showToast(aktiv ? "Nutzer aktiviert ✓" : "Nutzer deaktiviert", aktiv ? "#16825a" : "#c0392b");
  };

  const upcomingReminders = termine.filter(t => {
    if (!t.erinnerung) return false;
    const diff = (new Date(t.datum) - new Date()) / 86400000;
    return diff >= 0 && diff <= 3;
  });

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

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.aktenzeichen || "").includes(search) ||
    c.einrichtung.toLowerCase().includes(search.toLowerCase())
  );

  const canEdit = user?.rolle === "Admin" || user?.rolle === "Fachkraft";
  const isAdmin = user?.rolle === "Admin";

  return (
    <>
      <FontLoader />
      <style>{globalStyles}</style>
      {toast && <div className="toast" style={{ background: toast.color }}>{toast.msg}</div>}

      <div className="app-layout">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <Sidebar view={view} setView={(v) => { setView(v); setSidebarOpen(false); }} user={user} onLogout={async () => { await supabase.auth.signOut(); }} isOpen={sidebarOpen} notifications={upcomingReminders.length} isAdmin={isAdmin} />

        <div className="main-wrapper">
          <div className="mobile-header">
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#0f2647", padding: 4 }}>☰</button>
            <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20, color: "#0f2647" }}>SozialDoku</span>
            <div style={{ width: 36 }} />
          </div>

          <main className="main-content">
            {view === "dashboard" && <Dashboard clients={clients} eintraege={eintraege} termine={termine} setView={setView} setSelectedClient={setSelectedClient} user={user} />}
            {view === "clients" && <ClientsView clients={filteredClients} search={search} setSearch={setSearch} onSelect={(c) => { setSelectedClient(c); setView("detail"); }} onNew={canEdit ? () => setShowNewClient(true) : null} />}
            {view === "detail" && selectedClient && (
              <DetailView
                client={selectedClient}
                eintraege={eintraege[selectedClient.id] || []}
                onBack={() => setView("clients")}
                canEdit={canEdit}
                onNewEintrag={canEdit ? () => setNewEintrag({ typ: "Fallverlauf", titel: "", text: "", datum: ds(new Date()), fachkraft: user?.name || "", stunden: "" }) : null}
                onExport={() => exportPDF(selectedClient, eintraege[selectedClient.id] || [])}
                onKiBericht={() => setView("kibericht")}
                notizen={notizen}
                deleteNotiz={deleteNotiz}
                user={user}
                users={users}
                showToast={showToast}
                fallakten={fallakten}
                setFallakten={setFallakten}
              />
            )}
            {view === "notizen" && <NotizenView notizen={notizen} onAdd={addNotiz} onUpdate={updateNotiz} onDelete={deleteNotiz} user={user} clients={clients} showToast={showToast} />}
            {view === "kalender" && <KalenderView termine={termine} onAddTermin={addTermin} onDeleteTermin={deleteTermin} clients={clients} user={user} showToast={showToast} />}
            {view === "benachrichtigungen" && <BenachrichtigungenView termine={termine} clients={clients} setView={setView} setSelectedClient={setSelectedClient} />}
            {view === "vorlagen" && <VorlagenView vorlagen={VORLAGEN} />}
            {view === "stunden" && <StundenView clients={clients} eintraege={eintraege} />}
            {view === "kibericht" && <KIBerichtView clients={clients} eintraege={eintraege} user={user} kiSettings={kiSettings} />}
            {view === "nutzer" && isAdmin && <NutzerView users={users} onToggle={toggleNutzer} showToast={showToast} />}
            {view === "einstellungen" && isAdmin && <KIEinstellungenView kiSettings={kiSettings} setKiSettings={setKiSettings} showToast={showToast} />}
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
        <Modal onClose={() => setNewEintrag(null)}>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 4 }}>Neuer Eintrag</h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{selectedClient.name}</p>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>📋 Vorlage verwenden</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {VORLAGEN.map(v => (
                <button key={v.id} onClick={() => setNewEintrag(prev => ({ ...prev, typ: v.typ, titel: v.titel, text: v.text }))}
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
          <FormField label="Beschreibung"><textarea rows={4} value={newEintrag.text} onChange={e => setNewEintrag({ ...newEintrag, text: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} placeholder="Details…" /></FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setNewEintrag(null)} style={btnSecondary}>Abbrechen</button>
            <button onClick={async () => {
              if (!newEintrag.titel || !newEintrag.text) return showToast("Bitte Titel und Beschreibung ausfüllen.", "#c0392b");
              await addEintrag(newEintrag, selectedClient.id);
              setNewEintrag(null);
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
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    setErr("");
    const error = await onLogin(email, pass);
    if (error) setErr(error);
    setLoading(false);
  };

  return (
    <><FontLoader /><style>{globalStyles}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f2647 0%,#1a4480 50%,#0d6b5e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
        <div style={{ background: "rgba(255,255,255,.97)", borderRadius: 20, padding: "48px 44px", width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,#1a4480,#0d6b5e)", borderRadius: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 24 }}>🗂</div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 30, color: "#0f2647", margin: 0 }}>SozialDoku</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>Dokumentationssoftware für soziale Einrichtungen</p>
          </div>
          <FormField label="E-Mail"><input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="name@einrichtung.de" type="email" /></FormField>
          <FormField label="Passwort"><input value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} style={inputStyle} placeholder="••••••••" type="password" /></FormField>
          {err && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button onClick={handle} disabled={loading} style={{ ...btnPrimary, width: "100%", justifyContent: "center", fontSize: 16, padding: "13px 0", opacity: loading ? .7 : 1 }}>
            {loading ? "⏳ Anmelden…" : "Anmelden"}
          </button>
          <div style={{ marginTop: 16, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#0369a1" }}>
            <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>ℹ️ Erster Start?</p>
            <p style={{ margin: 0, fontSize: 12 }}>Lege zunächst einen Nutzer in Supabase unter Authentication → Users an. Danach kannst du dich hier einloggen.</p>
          </div>
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 16 }}>🔒 DSGVO-konform · Serverstandort Frankfurt</p>
        </div>
      </div>
    </>
  );
}

function Sidebar({ view, setView, user, onLogout, isOpen, notifications, isAdmin }) {
  const items = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "clients", icon: "👥", label: "Klienten" },
    { id: "kalender", icon: "📅", label: "Kalender" },
    { id: "benachrichtigungen", icon: "🔔", label: "Erinnerungen", badge: notifications },
    { id: "notizen", icon: "📝", label: "Notizen" },
    { id: "vorlagen", icon: "📋", label: "Vorlagen" },
    { id: "stunden", icon: "⏱", label: "Stunden & Berichte" },
    { id: "kibericht", icon: "🤖", label: "KI-Bericht" },
    ...(isAdmin ? [{ id: "nutzer", icon: "👤", label: "Nutzerverwaltung" }] : []),
    ...(isAdmin ? [{ id: "einstellungen", icon: "⚙️", label: "KI-Einstellungen" }] : []),
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

function Dashboard({ clients, eintraege, termine, setView, setSelectedClient, user }) {
  const total = clients.length;
  const aktiv = clients.filter(c => c.status === "aktiv").length;
  const allEntries = Object.values(eintraege).flat();
  const stunden = allEntries.filter(e => e.typ === "Stunden").reduce((s, e) => s + (e.stunden || 0), 0);
  const recent = [...allEntries].sort((a, b) => new Date(b.datum) - new Date(a.datum)).slice(0, 4);
  const getClientName = (id) => clients.find(c => c.id == id)?.name || "–";
  const getClientId = (entry) => Object.entries(eintraege).find(([, v]) => v.some(e => e.id === entry.id))?.[0];
  const today = ds(new Date());
  const nextTermine = [...termine].sort((a, b) => new Date(a.datum) - new Date(b.datum)).filter(t => t.datum >= today).slice(0, 3);
  return (
    <div>
      <h1 style={pageTitle}>Dashboard</h1>
      <p style={pageSubtitle}>Willkommen zurück, {user?.name.split(" ")[0]}!</p>
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 28 }}>
        {[{ label: "Klienten gesamt", value: total, icon: "👥", color: "#1a4480" }, { label: "Aktive Fälle", value: aktiv, icon: "📋", color: "#16825a" }, { label: "Geleistete Stunden", value: stunden.toFixed(1) + " h", icon: "⏱", color: "#b45309" }].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,.06)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
            <div><p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'DM Serif Display',serif" }}>{s.value}</p><p style={{ margin: 0, fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</p></div>
          </div>
        ))}
      </div>
      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={card}>
          <h2 style={cardTitle}>🕐 Zuletzt dokumentiert</h2>
          {recent.map(e => {
            const cid = getClientId(e);
            return (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ background: typBg(e.typ), color: typeColor(e.typ), borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{e.typ}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titel}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{getClientName(cid)} · {formatDate(e.datum)}</p>
                </div>
                <button onClick={() => { setSelectedClient(clients.find(c => c.id == cid)); setView("detail"); }} style={{ ...btnSecondary, fontSize: 11, padding: "5px 10px" }}>→</button>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <h2 style={cardTitle}>📅 Nächste Termine</h2>
          {nextTermine.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine anstehenden Termine.</p>}
          {nextTermine.map(t => (
            <div key={t.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
              <div style={{ background: "#e8f0fb", borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 44 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a4480" }}>{new Date(t.datum).getDate()}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>{new Date(t.datum).toLocaleDateString("de-DE", { month: "short" })}</p>
              </div>
              <div><p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{t.titel}</p><p style={{ margin: "2px 0", fontSize: 11, color: "#64748b" }}>{t.uhrzeit} · {t.ort}</p>{t.erinnerung && <span style={{ fontSize: 10, color: "#f59e0b" }}>🔔</span>}</div>
            </div>
          ))}
          <button onClick={() => setView("kalender")} style={{ ...btnSecondary, width: "100%", justifyContent: "center", marginTop: 12, fontSize: 13 }}>Alle Termine →</button>
        </div>
      </div>
    </div>
  );
}

function ClientsView({ clients, search, setSearch, onSelect, onNew }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={pageTitle}>Klienten</h1><p style={pageSubtitle}>{clients.length} Einträge</p></div>
        {onNew && <button onClick={onNew} style={btnPrimary}>+ Klient anlegen</button>}
      </div>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, Aktenzeichen oder Einrichtung…" style={{ ...inputStyle, paddingLeft: 40 }} />
      </div>
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


function HeaderButton({ children, onClick, primary = false }) {
  return <button onClick={onClick} style={primary ? { ...btnPrimary, fontSize: 12 } : { ...btnSecondary, fontSize: 12 }}>{children}</button>;
}

function AkteSection({ sectionKey, title, color = "#0f2647", children, rightContent = null, open, onToggle }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 10px rgba(15,38,71,.06)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <button onClick={() => onToggle(sectionKey)} style={{ width: "100%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", textAlign: "left" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "'DM Sans',sans-serif" }}>{title}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rightContent}
          <span style={{ color: "#94a3b8", fontSize: 14 }}>{open ? "▾" : "▸"}</span>
        </span>
      </button>
      {open && <div style={{ padding: "0 18px 18px" }}>{children}</div>}
    </div>
  );
}

function DetailView({ client, eintraege, onBack, onNewEintrag, onExport, onKiBericht, canEdit, notizen, user, users, showToast, fallakten, setFallakten }) {
  const [openMap, setOpenMap] = useState({ klient: true, aufgaben: true, intern: false, extern: false, ziele: true, dateien: false, soziales: true, gesundheit: false, bildungBeruf: false, finanzen: false, behoerden: false, freizeit: false, dokumentation: true, notizen: false });
  const [newDocs, setNewDocs] = useState({ soziales: { titel: "", text: "", datum: ds(new Date()) }, gesundheit: { titel: "", text: "", datum: ds(new Date()) }, bildungBeruf: { titel: "", text: "", datum: ds(new Date()) }, finanzen: { titel: "", text: "", datum: ds(new Date()) }, behoerden: { titel: "", text: "", datum: ds(new Date()) }, freizeit: { titel: "", text: "", datum: ds(new Date()) } });
  const [quickFields, setQuickFields] = useState({ aufgabe: "", aufgabeDatum: ds(new Date()), externName: "", externStelle: "", externTelefon: "", externEmail: "", ziel: "", zielDatum: ds(new Date()), dateiKategorie: "Dokument", dateiDatum: ds(new Date()) });
  const [selectedInternUserId, setSelectedInternUserId] = useState("");
  const fileInputRef = useRef(null);
  const akte = fallakten?.[client.id] || createEmptyFallakte(client);
  const clientNotizen = (notizen || []).filter(n => n.klientId == client.id);
  const interneAuswahl = (users || []).filter(u => u.rolle === "Fachkraft" || u.rolle === "Leitung" || u.rolle === "Admin");

  const patchAkte = (updater) => {
    setFallakten(prev => {
      const current = prev?.[client.id] || createEmptyFallakte(client);
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [client.id]: next };
    });
  };

  const updateKlient = async (key, value) => {
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
      patchAkte(cur => ({ ...cur, aufgaben: [{ id: data.id, titel: data.titel, status: data.status, notiz: data.beschreibung || "", datum: data.datum }, ...(cur.aufgaben || [])] }));
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
      patchAkte(cur => ({ ...cur, ziele: [{ id: data.id, titel: data.titel, status: data.status, notiz: data.beschreibung || "", datum: data.startdatum || data.datum }, ...(cur.ziele || [])] }));
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
      patchAkte(cur => ({ ...cur, extern: [{ id: data.id, name: data.ansprechperson || data.institution, stelle: data.institution, rolle: data.funktion || "", telefon: data.telefon || "", email: data.email || "" }, ...(cur.extern || [])] }));
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
      patchAkte(cur => ({ ...cur, intern: [{ id: data.id, userId: nutzerId, name: payload.name || picked?.name || "", rolle: data.funktion || picked?.rolle || "", telefon: "", email: picked?.email || "" }, ...(cur.intern || [])] }));
    }
  };

  const addFachDoc = async (bereich) => {
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
        [bereich]: [{ id: data.id, titel: data.titel, text: data.inhalt, datum: data.datum, autor: data.erstellt_von_name || user?.name || "" }, ...(cur.fachbereiche?.[bereich] || [])],
      },
    }));
    setNewDocs(prev => ({ ...prev, [bereich]: { titel: "", text: "", datum: ds(new Date()) } }));
    showToast(`${fachbereichLabel(dbBereich)} ergänzt ✓`);
  };

  const handleDateiUpload = async (event) => {
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

  const downloadStoredFile = async (item) => {
    if (!item?.path) return showToast("Für diese Datei liegt kein Speicherpfad vor.", "#c0392b");
    const { data, error } = await supabase.storage.from(item.bucket || "client-files").createSignedUrl(item.path, 60);
    if (error || !data?.signedUrl) return showToast("Download konnte nicht erstellt werden.", "#c0392b");
    window.open(data.signedUrl, "_blank");
  };

  const removeItem = async (section, id) => {
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
  };

  const removeDoc = async (bereich, id) => {
    const { error } = await supabase.from("dokumentationen").delete().eq("id", id);
    if (error) return showToast("Dokumentation konnte nicht gelöscht werden.", "#c0392b");
    patchAkte(cur => ({ ...cur, fachbereiche: { ...cur.fachbereiche, [bereich]: (cur.fachbereiche?.[bereich] || []).filter(x => x.id !== id) } }));
  };

  const toggleSection = (key) => setOpenMap(prev => ({ ...prev, [key]: !prev[key] }));

  const chronoDokumentation = [
    ...Object.entries(akte.fachbereiche || {}).flatMap(([bereich, items]) => (items || []).map(item => ({
      id: `${bereich}-${item.id}`,
      datum: item.datum,
      titel: item.titel,
      text: item.text,
      autor: item.autor,
      quelle: fachbereichLabel(bereich),
      farbe: fachbereichFarbe(bereich),
    }))),
    ...eintraege.map(e => ({ id: `eintrag-${e.id}`, datum: e.datum, titel: e.titel, text: e.text, autor: e.fachkraft, quelle: e.typ, farbe: typeColor(e.typ) })),
  ].sort((a, b) => new Date(b.datum) - new Date(a.datum));

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, fontFamily: "'DM Sans',sans-serif", marginBottom: 16, padding: 0 }}>← Zurück</button>
      <div style={{ background: "linear-gradient(135deg,#eef2ff,#e2e8f0)", borderRadius: 18, padding: "24px 26px", marginBottom: 20, border: "1px solid #dbe3f1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 34, margin: 0, color: "#0f172a" }}>Fallakte {client.name}</h1>
            <p style={{ margin: "8px 0 0", color: "#334155", fontSize: 15 }}>Geburtsdatum: {formatDate(client.dob)} · Telefon: {akte.klient.telefon || "—"}</p>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>Aktenzeichen {client.aktenzeichen} · {client.einrichtung} · Hilfeart: {akte.klient.hilfeart || "—"}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HeaderButton onClick={onExport}>📄 PDF</HeaderButton>
            <HeaderButton onClick={onKiBericht}>🤖 KI-Bericht</HeaderButton>
            {canEdit && <HeaderButton primary onClick={onNewEintrag}>+ Dokumentation</HeaderButton>}
          </div>
        </div>
      </div>

      <div className="akte-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
        <AkteSection sectionKey="klient" title="Klient" open={openMap["klient"]} onToggle={toggleSection}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
            <FormField label="Geburtsdatum"><input value={formatDate(client.dob)} disabled style={{ ...inputStyle, background: "#f8fafc" }} /></FormField>
            <FormField label="Telefon"><input value={akte.klient.telefon} onChange={e => updateKlient("telefon", e.target.value)} style={inputStyle} placeholder="Telefonnummer" /></FormField>
            <FormField label="E-Mail"><input value={akte.klient.email} onChange={e => updateKlient("email", e.target.value)} style={inputStyle} placeholder="E-Mail" /></FormField>
            <FormField label="Beginn Hilfe"><input type="date" value={akte.klient.beginnHilfe} onChange={e => updateKlient("beginnHilfe", e.target.value)} style={inputStyle} /></FormField>
            <div style={{ gridColumn: "1 / -1" }}><FormField label="Adresse"><input value={akte.klient.adresse} onChange={e => updateKlient("adresse", e.target.value)} style={inputStyle} placeholder="Adresse" /></FormField></div>
            <FormField label="Hilfeart"><input value={akte.klient.hilfeart} onChange={e => updateKlient("hilfeart", e.target.value)} style={inputStyle} placeholder="z. B. EB / SPFH" /></FormField>
            <FormField label="Bezugspersonen"><input value={akte.klient.bezugspersonen} onChange={e => updateKlient("bezugspersonen", e.target.value)} style={inputStyle} placeholder="Familie, Schule, Bezugspersonen" /></FormField>
            <div style={{ gridColumn: "1 / -1" }}><FormField label="Besondere Hinweise"><textarea rows={3} value={akte.klient.besondereHinweise} onChange={e => updateKlient("besondereHinweise", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} placeholder="Wichtige allgemeine Hinweise zum Klienten" /></FormField></div>
          </div>
        </AkteSection>

        <AkteSection sectionKey="aufgaben" title="Aufgaben" rightContent={<span style={{ fontSize: 12, color: "#64748b" }}>{akte.aufgaben?.length || 0}</span>} open={openMap["aufgaben"]} onToggle={toggleSection}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 10 }}>
            <input value={quickFields.aufgabe} onChange={e => setQuickFields(p => ({ ...p, aufgabe: e.target.value }))} style={inputStyle} placeholder="Neue Aufgabe / Notiz" />
            <input type="date" value={quickFields.aufgabeDatum} onChange={e => setQuickFields(p => ({ ...p, aufgabeDatum: e.target.value }))} style={inputStyle} />
            <button onClick={() => { if (!quickFields.aufgabe.trim()) return; addSimpleItem("aufgaben", { titel: quickFields.aufgabe, status: "offen", notiz: "", datum: quickFields.aufgabeDatum || ds(new Date()) }); setQuickFields(p => ({ ...p, aufgabe: "", aufgabeDatum: ds(new Date()) })); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Hinzufügen</button>
          </div>
          {(akte.aufgaben || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Aufgaben erfasst.</p>}
          {(akte.aufgaben || []).map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: "1px solid #f1f5f9", padding: "10px 0" }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{item.titel}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{item.status}{item.datum ? ` · ${formatDate(item.datum)}` : ""}{item.notiz ? ` · ${item.notiz}` : ""}</p></div><button onClick={() => removeItem("aufgaben", item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>🗑</button></div>)}
        </AkteSection>

        <AkteSection sectionKey="extern" title="Zuständigkeit extern" open={openMap["extern"]} onToggle={toggleSection}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8, marginBottom: 8 }}>
            <input value={quickFields.externName} onChange={e => setQuickFields(p => ({ ...p, externName: e.target.value }))} style={inputStyle} placeholder="Name, z. B. Frau V." />
            <input value={quickFields.externStelle} onChange={e => setQuickFields(p => ({ ...p, externStelle: e.target.value }))} style={inputStyle} placeholder="Institution / Stelle" />
            <input value={quickFields.externTelefon} onChange={e => setQuickFields(p => ({ ...p, externTelefon: e.target.value }))} style={inputStyle} placeholder="Telefon" />
            <input value={quickFields.externEmail} onChange={e => setQuickFields(p => ({ ...p, externEmail: e.target.value }))} style={inputStyle} placeholder="E-Mail" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button onClick={() => { if (!quickFields.externName.trim()) return; addSimpleItem("extern", { name: quickFields.externName, stelle: quickFields.externStelle, telefon: quickFields.externTelefon, email: quickFields.externEmail }); setQuickFields(p => ({ ...p, externName: "", externStelle: "", externTelefon: "", externEmail: "" })); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Kontakt</button>
          </div>
          {(akte.extern || []).map(item => <div key={item.id} style={{ borderTop: "1px solid #f1f5f9", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{item.name}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{item.stelle || "Externe Stelle"}{item.telefon ? ` · ${item.telefon}` : ""}{item.email ? ` · ${item.email}` : ""}</p></div><button onClick={() => removeItem("extern", item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>🗑</button></div>)}
          {(akte.extern || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Keine externen Zuständigkeiten hinterlegt.</p>}
        </AkteSection>

        <AkteSection sectionKey="intern" title="Zuständigkeit intern" open={openMap["intern"]} onToggle={toggleSection}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
            <select value={selectedInternUserId} onChange={e => setSelectedInternUserId(e.target.value)} style={inputStyle}>
              <option value="">Fachkraft auswählen …</option>
              {interneAuswahl.map(u => <option key={u.id} value={u.id}>{u.name} · {u.rolle}</option>)}
            </select>
            <button onClick={() => { const picked = interneAuswahl.find(u => String(u.id) === String(selectedInternUserId)); if (!picked) return showToast("Bitte eine Fachkraft auswählen.", "#c0392b"); addSimpleItem("intern", { userId: picked.id, name: picked.name, rolle: picked.rolle, telefon: "", email: picked.email }); setSelectedInternUserId(""); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Fachkraft</button>
          </div>
          {(akte.intern || []).map(item => <div key={item.id} style={{ borderTop: "1px solid #f1f5f9", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{item.name}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{item.rolle || "Fachkraft"}{item.telefon ? ` · ${item.telefon}` : ""}{item.email ? ` · ${item.email}` : ""}</p></div><button onClick={() => removeItem("intern", item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>🗑</button></div>)}
          {(akte.intern || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Keine internen Zuständigkeiten hinterlegt.</p>}
        </AkteSection>

        <AkteSection sectionKey="ziele" title="Ziele" open={openMap["ziele"]} onToggle={toggleSection}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 10 }}>
            <input value={quickFields.ziel} onChange={e => setQuickFields(p => ({ ...p, ziel: e.target.value }))} style={inputStyle} placeholder="Neues Ziel" />
            <input type="date" value={quickFields.zielDatum} onChange={e => setQuickFields(p => ({ ...p, zielDatum: e.target.value }))} style={inputStyle} />
            <button onClick={() => { if (!quickFields.ziel.trim()) return; addSimpleItem("ziele", { titel: quickFields.ziel, status: "laufend", notiz: "", datum: quickFields.zielDatum || ds(new Date()) }); setQuickFields(p => ({ ...p, ziel: "", zielDatum: ds(new Date()) })); }} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Ziel</button>
          </div>
          {(akte.ziele || []).map(item => <div key={item.id} style={{ borderTop: "1px solid #f1f5f9", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{item.titel}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{item.status}{item.datum ? ` · ${formatDate(item.datum)}` : ""}{item.notiz ? ` · ${item.notiz}` : ""}</p></div><button onClick={() => removeItem("ziele", item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>🗑</button></div>)}
          {(akte.ziele || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Ziele erfasst.</p>}
        </AkteSection>

        <AkteSection sectionKey="dateien" title="Dateien" open={openMap["dateien"]} onToggle={toggleSection}>
          <input ref={fileInputRef} type="file" onChange={handleDateiUpload} style={{ display: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 10 }}>
            <select value={quickFields.dateiKategorie} onChange={e => setQuickFields(p => ({ ...p, dateiKategorie: e.target.value }))} style={inputStyle}>
              <option>Dokument</option><option>Bewerbung</option><option>Verfügung/Jugendamt</option><option>Schule</option><option>Medizin</option>
            </select>
            <input type="date" value={quickFields.dateiDatum} onChange={e => setQuickFields(p => ({ ...p, dateiDatum: e.target.value }))} style={inputStyle} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>+ Datei hochladen</button>
          </div>
          {(akte.dateien || []).map(item => <div key={item.id} style={{ borderTop: "1px solid #f1f5f9", padding: "10px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{item.name}</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{item.kategorie || "Dokument"} · {formatDate(item.datum)}{item.size ? ` · ${(item.size/1024).toFixed(1)} KB` : ""}</p></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => downloadStoredFile(item)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 10px" }}>⬇ Herunterladen</button><button onClick={() => removeItem("dateien", item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>🗑</button></div></div>)}
          {(akte.dateien || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Dateien hinterlegt.</p>}
        </AkteSection>

        {Object.entries(FACHBEREICH_LABELS).map(([key, label]) => (
          <AkteSection key={key} sectionKey={key} title={label} color={fachbereichFarbe(key)} rightContent={<span style={{ fontSize: 12, color: fachbereichFarbe(key) }}>{(akte.fachbereiche?.[key] || []).length}</span>} open={openMap[key]} onToggle={toggleSection}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <input value={newDocs[key].titel} onChange={e => setNewDocs(prev => ({ ...prev, [key]: { ...prev[key], titel: e.target.value } }))} style={inputStyle} placeholder={`Titel für ${label}`} />
                <input type="date" value={newDocs[key].datum} onChange={e => setNewDocs(prev => ({ ...prev, [key]: { ...prev[key], datum: e.target.value } }))} style={inputStyle} />
                <textarea rows={3} value={newDocs[key].text} onChange={e => setNewDocs(prev => ({ ...prev, [key]: { ...prev[key], text: e.target.value } }))} style={{ ...inputStyle, resize: "vertical" }} placeholder={`Dokumentation für ${label}`} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => addFachDoc(key)} style={{ ...btnPrimary, fontSize: 12 }}>+ Eintrag speichern</button>
              </div>
            </div>
            {(akte.fachbereiche?.[key] || []).length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Einträge in diesem Bereich.</p>}
            {(akte.fachbereiche?.[key] || []).map(item => <div key={item.id} style={{ borderTop: "1px solid #f1f5f9", padding: "12px 0", display: "flex", justifyContent: "space-between", gap: 10 }}><div><p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{item.titel}</p><p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.55 }}>{item.text}</p><p style={{ margin: "5px 0 0", fontSize: 11, color: "#94a3b8" }}>{formatDate(item.datum)} · {item.autor}</p></div><button onClick={() => removeDoc(key, item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>🗑</button></div>)}
          </AkteSection>
        ))}

        <div style={{ gridColumn: "1 / -1" }}>
          <AkteSection sectionKey="dokumentation" title="Dokumentation" rightContent={<span style={{ fontSize: 12, color: "#64748b" }}>{chronoDokumentation.length}</span>} open={openMap["dokumentation"]} onToggle={toggleSection}>
            {chronoDokumentation.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Noch keine Dokumentation vorhanden.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {chronoDokumentation.map(item => <div key={item.id} style={{ borderLeft: `4px solid ${item.farbe}`, background: "#f8fafc", borderRadius: 12, padding: "12px 14px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ background: item.farbe + '22', color: item.farbe, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{item.quelle}</span><strong style={{ fontSize: 13, color: "#0f172a" }}>{item.titel}</strong></div><span style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(item.datum)} · {item.autor}</span></div><p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{item.text}</p></div>)}
            </div>
          </AkteSection>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <AkteSection sectionKey="notizen" title="Notizen zum Klienten" rightContent={<span style={{ fontSize: 12, color: "#64748b" }}>{clientNotizen.length}</span>} open={openMap["notizen"]} onToggle={toggleSection}>
            {clientNotizen.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13 }}>Keine verknüpften Notizen vorhanden.</p> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{clientNotizen.map(n => { const fc = NOTIZ_FARBEN[n.farbe] || NOTIZ_FARBEN.gelb; return <div key={n.id} style={{ background: fc.bg, borderRadius: 10, padding: "12px 14px", borderLeft: `4px solid ${fc.border}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong style={{ fontSize: 13 }}>{n.titel}</strong><span style={{ fontSize: 11, color: "#64748b" }}>{n.autor} · {formatDate(n.datum)}</span></div>{n.text && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{n.text}</p>}</div>; })}</div>}
          </AkteSection>
        </div>
      </div>
    </div>
  );
}

function KalenderView({ termine, onAddTermin, onDeleteTermin, clients, user, showToast }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ titel: "", datum: ds(new Date()), uhrzeit: "09:00", klientId: "", fachkraft: user?.name || "", ort: "", notiz: "", erinnerung: false });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const today = ds(new Date());
  const sorted = [...termine].sort((a, b) => new Date(a.datum + "T" + a.uhrzeit) - new Date(b.datum + "T" + b.uhrzeit));
  const future = sorted.filter(t => t.datum >= today);
  const past = sorted.filter(t => t.datum < today);
  const getKlient = (id) => clients.find(c => c.id == id);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div><h1 style={pageTitle}>Kalender & Termine</h1><p style={pageSubtitle}>{future.length} anstehende Termine</p></div>
        <button onClick={() => setShowNew(true)} style={btnPrimary}>+ Neuer Termin</button>
      </div>
      <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={card}>
          <h2 style={cardTitle}>📅 Anstehende Termine</h2>
          {future.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine Termine geplant.</p>}
          {future.map(t => {
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
                      {isToday && <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>Heute</span>}
                    </div>
                    <p style={{ margin: "3px 0", fontSize: 12, color: "#64748b" }}>🕐 {t.uhrzeit} · 📍 {t.ort}</p>
                    {k && <p style={{ margin: "2px 0", fontSize: 12, color: "#64748b" }}>👤 {k.name}</p>}
                    {t.erinnerung && <span style={{ fontSize: 11, color: "#f59e0b" }}>🔔 Erinnerung aktiv</span>}
                  </div>
                  <button onClick={() => onDeleteTermin(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18, padding: 4 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <h2 style={cardTitle}>✅ Vergangene Termine</h2>
          {past.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>Keine vergangenen Termine.</p>}
          {[...past].reverse().slice(0, 6).map(t => {
            const k = getKlient(t.klientId);
            return <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", opacity: .7 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{t.titel}</p>
              <p style={{ margin: "2px 0", fontSize: 11, color: "#94a3b8" }}>{formatDate(t.datum)} {t.uhrzeit} {k ? `· ${k.name}` : ""}</p>
            </div>;
          })}
        </div>
      </div>
      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 22, marginBottom: 20 }}>Neuen Termin anlegen</h2>
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
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNew(false)} style={btnSecondary}>Abbrechen</button>
            <button onClick={() => {
              if (!form.titel || !form.datum) return showToast("Bitte Titel und Datum angeben.", "#c0392b");
              onAddTermin(form);
              setShowNew(false);
            }} style={btnPrimary}>Speichern</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BenachrichtigungenView({ termine, clients, setView, setSelectedClient }) {
  const today = new Date();
  const getKlient = (id) => clients.find(c => c.id == id);
  const withDiff = termine.map(t => ({ ...t, diff: Math.ceil((new Date(t.datum) - today) / 86400000) })).sort((a, b) => a.diff - b.diff);
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
            <div><p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{t.titel}</p><p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{formatDate(t.datum)} · {t.uhrzeit}</p></div>
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
                <p style={{ margin: "3px 0", fontSize: 12, color: "#64748b" }}>{formatDate(t.datum)} · {t.uhrzeit} · {t.ort}</p>
                {k && <button onClick={() => { setSelectedClient(k); setView("detail"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1a4480", padding: 0, fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>👤 {k.name} →</button>}
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
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{formatDate(t.datum)} · {t.uhrzeit} · {t.ort} {k ? `· ${k.name}` : ""}</p>
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

function NutzerView({ users, onToggle, showToast }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "demo123", rolle: "Fachkraft", einrichtung: EINRICHTUNGEN[0], aktiv: true });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const createUserHint = () => {
    if (!form.name || !form.email) return showToast("Name und E-Mail erforderlich.", "#c0392b");
    showToast("Nutzeranlage braucht die Supabase Auth/Admin API.", "#b45309");
    setShowNew(false);
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
              <button onClick={() => onToggle(u.id, !u.aktiv)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 14px" }}>{u.aktiv ? "Deaktivieren" : "Aktivieren"}</button>
            </div>
          </div>
        ))}
      </div>
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
            <strong>Rollen:</strong> 🔴 <strong>Admin</strong> – alle Rechte · 🟣 <strong>Leitung</strong> – alle Klienten lesen · 🟢 <strong>Fachkraft</strong> – Klienten verwalten
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNew(false)} style={btnSecondary}>Abbrechen</button>
            <button onClick={createUserHint} style={btnPrimary}>Anlegen</button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "40px 20px", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "32px 36px", width: "100%", maxWidth, boxShadow: "0 24px 80px rgba(0,0,0,.25)", animation: "slideUp .25s ease" }} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
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

const inputStyle = { width: "100%", padding: "10px 14px", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: "#1e293b", background: "#f8fafc", boxSizing: "border-box", outline: "none", transition: "border-color .2s" };
const btnPrimary = { background: "linear-gradient(135deg,#1a4480,#1d6fa4)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 8, transition: "opacity .2s", whiteSpace: "nowrap" };
const btnSecondary = { background: "#f1f5f9", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .2s" };
const card = { background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,.06)", marginBottom: 20 };
const cardTitle = { fontFamily: "'DM Serif Display',serif", fontSize: 18, margin: "0 0 16px", color: "#0f2647" };
const pageTitle = { fontFamily: "'DM Serif Display',serif", fontSize: 32, color: "#0f2647", margin: "0 0 6px" };
const pageSubtitle = { color: "#64748b", fontSize: 15, margin: "0 0 28px" };

const globalStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  #root { width: 100%; max-width: none; min-height: 100vh; border: 0; text-align: left; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
  @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
  @keyframes spin { to { transform: rotate(360deg) } }
  input:focus, select:focus, textarea:focus { border-color: #1a4480 !important; outline: none; }
  button:hover { opacity: .87; }
  ::-webkit-scrollbar { width: 6px } ::-webkit-scrollbar-track { background:#f1f5f9 } ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px }

  .app-layout { display: flex; min-height: 100vh; background: #f0f3f8; font-family: 'DM Sans', sans-serif; }
  .main-wrapper { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .sidebar { width: 230px; background: linear-gradient(180deg,#0f2647 0%,#12325a 100%); display: flex; flex-direction: column; padding: 24px 0 0; color: #fff; flex-shrink: 0; overflow: hidden; }
  .main-content { flex: 1; padding: 36px 40px; overflow-y: auto; }
  .mobile-header { display: none; }
  .sidebar-overlay { display: none; }
  .toast { position: fixed; bottom: 28px; right: 28px; color: #fff; padding: 12px 22px; border-radius: 10px; font-family: 'DM Sans',sans-serif; font-weight: 600; font-size: 14px; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,.18); animation: fadeIn .3s; }

  .notizen-layout { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: start; }
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
    h1 { line-height: 1.12; }
    input, select, textarea, button { max-width: 100%; }
    .main-content { padding: 18px 12px 88px; }
  }
  @media (max-width: 560px) {
    .mobile-header { padding: 12px 14px; }
    .main-content { padding-inline: 10px; }
    table { font-size: 13px; }
  }
`;
