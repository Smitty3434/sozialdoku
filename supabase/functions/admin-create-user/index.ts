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
    return json({ error: "Nur aktive Admins dürfen Benutzer anlegen." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || crypto.randomUUID()).trim();
  const role = roles.has(body.rolle) ? body.rolle : "Fachkraft";
  const einrichtung = String(body.einrichtung || "").trim();
  const aktiv = body.aktiv !== false;

  if (!name || !email || !password) {
    return json({ error: "Name, E-Mail und Passwort sind erforderlich." }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, rolle: role, einrichtung },
  });

  if (createError || !created.user) {
    return json({ error: createError?.message || "Benutzer konnte nicht angelegt werden." }, 400);
  }

  const avatar = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const { data: profile, error: profileError } = await adminClient
    .from("nutzer")
    .upsert({
      id: created.user.id,
      name,
      rolle: role,
      einrichtung,
      aktiv,
      avatar,
    }, { onConflict: "id" })
    .select("*")
    .single();

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json({ error: profileError.message }, 400);
  }

  return json({ user: profile }, 200);
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

