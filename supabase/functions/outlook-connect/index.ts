import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const redirectUri = Deno.env.get("MICROSOFT_REDIRECT_URI");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    return json({ error: "Server configuration is incomplete." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Nicht authentifiziert." }, 401);

  if (!clientId || !redirectUri) {
    return json({
      ready: false,
      error: "Microsoft OAuth ist serverseitig noch nicht konfiguriert.",
      requiredEnv: ["MICROSOFT_CLIENT_ID", "MICROSOFT_REDIRECT_URI", "MICROSOFT_CLIENT_SECRET"],
    }, 200);
  }

  const state = crypto.randomUUID();
  const scope = [
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope,
    state,
  });

  return json({
    ready: true,
    authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`,
    state,
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
