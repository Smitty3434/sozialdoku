import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const roles = new Set(["Admin", "Leitung", "Fachkraft"]);

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

  const { data: callerProfile } = await adminClient
    .from("nutzer")
    .select("rolle, aktiv")
    .eq("id", callerData.user.id)
    .single();

  if (callerProfile?.rolle !== "Admin" || callerProfile?.aktiv === false) {
    return json({ error: "Nur aktive Admins dürfen Benutzer bearbeiten." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  const name = body.name === undefined ? undefined : String(body.name || "").trim();
  const rolle = body.rolle === undefined ? undefined : String(body.rolle || "").trim();
  const einrichtung = body.einrichtung === undefined ? undefined : String(body.einrichtung || "").trim();
  const aktiv = body.aktiv === undefined ? undefined : Boolean(body.aktiv);

  if (!userId) return json({ error: "Benutzer-ID ist erforderlich." }, 400);
  if (name !== undefined && !name) return json({ error: "Name ist erforderlich." }, 400);
  if (rolle !== undefined && !roles.has(rolle)) return json({ error: "Ungültige Rolle." }, 400);

  const updates: Record<string, unknown> = {
    updated_by: callerData.user.id,
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) {
    updates.name = name;
    updates.avatar = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }
  if (rolle !== undefined) updates.rolle = rolle;
  if (einrichtung !== undefined) updates.einrichtung = einrichtung;
  if (aktiv !== undefined) updates.aktiv = aktiv;

  const { data: existingProfile, error: existingError } = await adminClient
    .from("nutzer")
    .select("name, rolle, einrichtung, aktiv")
    .eq("id", userId)
    .single();

  if (existingError || !existingProfile) {
    return json({ error: "Benutzer wurde nicht gefunden." }, 404);
  }

  const authMetadata = {
    name: name ?? existingProfile.name,
    rolle: rolle ?? existingProfile.rolle,
    einrichtung: einrichtung ?? existingProfile.einrichtung,
  };
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: authMetadata,
    ban_duration: aktiv === false ? "876000h" : "none",
  });

  if (authError) return json({ error: authError.message }, 400);

  const { data: profile, error: profileError } = await adminClient
    .from("nutzer")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (profileError) return json({ error: profileError.message }, 400);

  return json({ user: profile }, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
