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

  const { data: callerProfile } = await adminClient
    .from("nutzer")
    .select("rolle, aktiv")
    .eq("id", callerData.user.id)
    .single();

  if (callerProfile?.rolle !== "Admin" || callerProfile?.aktiv === false) {
    return json({ error: "Nur aktive Admins dürfen Zugänge neu setzen." }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();
  if (!userId) return json({ error: "Benutzer-ID ist erforderlich." }, 400);

  const { data: profile, error: profileError } = await adminClient
    .from("nutzer")
    .select("id, name, aktiv")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return json({ error: "Benutzer wurde nicht gefunden." }, 404);
  }

  const tempPassword = createTemporaryPassword();
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });

  if (authError) return json({ error: authError.message }, 400);

  await adminClient
    .from("nutzer")
    .update({
      updated_by: callerData.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return json({
    userId,
    name: profile.name,
    tempPassword,
  }, 200);
});

function createTemporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  return `Sd-${token}9!`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
