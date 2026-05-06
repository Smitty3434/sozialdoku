import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server configuration is incomplete." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Nicht authentifiziert." }, 401);

  const body = await req.json().catch(() => ({}));
  const terminId = body.terminId;
  if (!terminId) return json({ error: "terminId ist erforderlich." }, 400);

  const { data: profile } = await adminClient
    .from("nutzer")
    .select("id, rolle, aktiv")
    .eq("id", callerData.user.id)
    .single();
  if (!profile || profile.aktiv === false) return json({ error: "Nicht berechtigt." }, 403);

  const { data: termin, error: terminError } = await adminClient
    .from("termine")
    .select("*")
    .eq("id", terminId)
    .single();
  if (terminError || !termin) return json({ error: "Termin wurde nicht gefunden." }, 404);

  const authorized = await canEditTermin(adminClient, profile, termin);
  if (!authorized) return json({ error: "Du darfst diesen Termin nicht mit Outlook synchronisieren." }, 403);

  await markTermin(adminClient, termin.id, {
    outlook_sync_requested: true,
    outlook_sync_status: "pending",
    outlook_sync_error: null,
    updated_by: callerData.user.id,
  });

  const { data: connection } = await adminClient
    .from("outlook_connections")
    .select("access_token")
    .eq("user_id", callerData.user.id)
    .single();

  if (!connection?.access_token) {
    const updated = await markTermin(adminClient, termin.id, {
      outlook_sync_status: "failed",
      outlook_sync_error: "Outlook-Konto noch nicht verbunden.",
      updated_by: callerData.user.id,
    });
    return json({
      error: "Outlook-Konto noch nicht verbunden.",
      code: "outlook_not_connected",
      termin: updated,
    }, 409);
  }

  const eventPayload = buildGraphEvent(termin);
  const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${connection.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventPayload),
  });

  if (!graphRes.ok) {
    const details = await graphRes.text();
    const updated = await markTermin(adminClient, termin.id, {
      outlook_sync_status: "failed",
      outlook_sync_error: `Microsoft Graph HTTP ${graphRes.status}: ${details.slice(0, 500)}`,
      updated_by: callerData.user.id,
    });
    return json({ error: "Outlook-Termin konnte nicht erstellt werden.", termin: updated }, 502);
  }

  const event = await graphRes.json();
  const updated = await markTermin(adminClient, termin.id, {
    outlook_sync_status: "synced",
    outlook_event_id: event.id,
    outlook_calendar_id: event.calendar?.id || null,
    outlook_synced_at: new Date().toISOString(),
    outlook_sync_error: null,
    updated_by: callerData.user.id,
  });

  return json({ ok: true, outlookEventId: event.id, termin: updated }, 200);
});

async function canEditTermin(adminClient: ReturnType<typeof createClient>, profile: { id: string; rolle: string }, termin: Record<string, unknown>) {
  if (profile.rolle === "Admin" || profile.rolle === "Leitung") return true;
  if (!termin.klient_id) return String(termin.created_by) === String(profile.id);

  const [{ data: assignment }, { data: grant }] = await Promise.all([
    adminClient
      .from("zustaendigkeit_intern")
      .select("id")
      .eq("klient_id", termin.klient_id)
      .eq("nutzer_id", profile.id)
      .maybeSingle(),
    adminClient
      .from("fallakten_freigaben")
      .select("id")
      .eq("klient_id", termin.klient_id)
      .eq("nutzer_id", profile.id)
      .eq("darf_bearbeiten", true)
      .maybeSingle(),
  ]);

  return Boolean(assignment || grant);
}

async function markTermin(adminClient: ReturnType<typeof createClient>, id: string | number, payload: Record<string, unknown>) {
  const { data } = await adminClient
    .from("termine")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  return data;
}

function buildGraphEvent(termin: Record<string, unknown>) {
  const startDateTime = `${String(termin.datum)}T${normalizeTime(String(termin.uhrzeit || "09:00"))}`;
  const endDateTime = addOneHour(startDateTime);
  return {
    subject: String(termin.titel || "Termin"),
    body: {
      contentType: "Text",
      content: String(termin.notiz || ""),
    },
    start: {
      dateTime: startDateTime,
      timeZone: "Europe/Berlin",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Europe/Berlin",
    },
    location: {
      displayName: String(termin.ort || ""),
    },
  };
}

function normalizeTime(value: string) {
  const parts = value.split(":");
  const hh = parts[0]?.padStart(2, "0") || "09";
  const mm = parts[1]?.padStart(2, "0") || "00";
  const ss = parts[2]?.padStart(2, "0") || "00";
  return `${hh}:${mm}:${ss}`;
}

function addOneHour(dateTime: string) {
  const [datePart, timePart] = dateTime.split("T");
  const [hourRaw, minuteRaw, secondRaw] = timePart.split(":").map(Number);
  const nextHour = (hourRaw + 1) % 24;
  const date = new Date(`${datePart}T00:00:00`);
  if (nextHour === 0) date.setDate(date.getDate() + 1);
  return `${date.toISOString().slice(0, 10)}T${String(nextHour).padStart(2, "0")}:${String(minuteRaw || 0).padStart(2, "0")}:${String(secondRaw || 0).padStart(2, "0")}`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
