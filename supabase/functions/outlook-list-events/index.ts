import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const relevantTerms = ["hpg", "hilfeplan", "fall", "jugendamt", "asd", "klient", "klientin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Server configuration is incomplete." }, 500);

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
  const relevantOnly = body.relevantOnly !== false;
  const days = Math.min(Math.max(Number(body.days || 60), 1), 120);

  const { data: connection } = await adminClient
    .from("outlook_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", callerData.user.id)
    .maybeSingle();

  if (!connection?.access_token) {
    return json({ connected: false, events: [], error: "Outlook-Konto noch nicht verbunden." }, 200);
  }

  const accessToken = await getValidAccessToken(adminClient, callerData.user.id, connection);
  if (!accessToken) {
    return json({ connected: true, events: [], error: "Outlook-Verbindung ist abgelaufen. Bitte erneut verbinden." }, 409);
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const params = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    "$select": "id,subject,start,end,location,bodyPreview,isAllDay,webLink",
    "$orderby": "start/dateTime",
    "$top": "50",
  });

  const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="Europe/Berlin"',
    },
  });

  const graphData = await graphRes.json().catch(() => ({}));
  if (!graphRes.ok) {
    await adminClient
      .from("outlook_connections")
      .update({ last_error: graphData.error?.message || `Microsoft Graph HTTP ${graphRes.status}` })
      .eq("user_id", callerData.user.id);
    return json({ connected: true, events: [], error: "Outlook-Termine konnten nicht gelesen werden." }, 502);
  }

  const events = (graphData.value || []).map(mapEvent);
  const filtered = relevantOnly
    ? events.filter((event: Record<string, string>) => relevantTerms.some(term => `${event.title} ${event.note} ${event.location}`.toLowerCase().includes(term)))
    : events;

  return json({
    connected: true,
    relevantOnly,
    events: filtered,
  });
});

async function getValidAccessToken(adminClient: ReturnType<typeof createClient>, userId: string, connection: Record<string, unknown>) {
  const expiresAt = connection.token_expires_at ? new Date(String(connection.token_expires_at)).getTime() : 0;
  if (connection.access_token && expiresAt > Date.now() + 2 * 60 * 1000) return String(connection.access_token);
  if (!connection.refresh_token) return null;

  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: String(connection.refresh_token),
      grant_type: "refresh_token",
      scope: "offline_access User.Read Calendars.ReadWrite",
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    await adminClient
      .from("outlook_connections")
      .update({ last_error: tokenData.error_description || tokenData.error || `Token refresh HTTP ${tokenRes.status}` })
      .eq("user_id", userId);
    return null;
  }

  const expiresInSeconds = Number(tokenData.expires_in || 3600);
  const tokenExpiresAt = new Date(Date.now() + Math.max(60, expiresInSeconds - 60) * 1000).toISOString();
  await adminClient
    .from("outlook_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || connection.refresh_token,
      token_type: tokenData.token_type || "Bearer",
      token_expires_at: tokenExpiresAt,
      scopes: String(tokenData.scope || "").split(/\s+/).filter(Boolean),
      last_error: null,
    })
    .eq("user_id", userId);

  return String(tokenData.access_token);
}

function mapEvent(event: Record<string, Record<string, string> | string | boolean>) {
  const start = event.start as Record<string, string> || {};
  const end = event.end as Record<string, string> || {};
  const location = event.location as Record<string, string> || {};
  const startDate = String(start.dateTime || "");
  const endDate = String(end.dateTime || "");
  return {
    id: String(event.id || ""),
    title: String(event.subject || "Outlook-Termin"),
    datum: startDate.slice(0, 10),
    uhrzeit: startDate.slice(11, 16),
    ende: endDate.slice(11, 16),
    location: String(location.displayName || ""),
    note: String(event.bodyPreview || ""),
    isAllDay: Boolean(event.isAllDay),
    webLink: String(event.webLink || ""),
    source: "outlook",
  };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
