import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return html("Method not allowed", false, 405);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (oauthError) return html(`Microsoft-Anmeldung fehlgeschlagen: ${oauthError}`, false, 400);
  if (!code || !state) return html("Microsoft-Callback ist unvollständig.", false, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET");
  const redirectUri = Deno.env.get("MICROSOFT_REDIRECT_URI");
  if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !redirectUri) {
    return html("Serverseitige Microsoft-Konfiguration ist unvollständig.", false, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: stateRow, error: stateError } = await adminClient
    .from("outlook_oauth_states")
    .select("*")
    .eq("state", state)
    .single();

  if (stateError || !stateRow) return html("Outlook-Verbindungsanfrage wurde nicht gefunden oder ist abgelaufen.", false, 400);
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    await adminClient.from("outlook_oauth_states").delete().eq("state", state);
    return html("Outlook-Verbindungsanfrage ist abgelaufen. Bitte in der App erneut starten.", false, 400);
  }

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.access_token) {
    return html(`Token-Tausch fehlgeschlagen: ${tokenData.error_description || tokenData.error || tokenRes.status}`, false, 502);
  }

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName,displayName", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const me = meRes.ok ? await meRes.json() : {};

  const expiresInSeconds = Number(tokenData.expires_in || 3600);
  const tokenExpiresAt = new Date(Date.now() + Math.max(60, expiresInSeconds - 60) * 1000).toISOString();
  const scopes = String(tokenData.scope || "").split(/\s+/).filter(Boolean);

  const { error: upsertError } = await adminClient
    .from("outlook_connections")
    .upsert({
      user_id: stateRow.user_id,
      provider: "microsoft",
      microsoft_user_id: me.id || null,
      email: me.mail || me.userPrincipalName || null,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_type: tokenData.token_type || "Bearer",
      token_expires_at: tokenExpiresAt,
      scopes,
      connected_at: new Date().toISOString(),
      last_error: null,
    }, { onConflict: "user_id" });

  await adminClient.from("outlook_oauth_states").delete().eq("state", state);

  if (upsertError) return html(`Outlook-Verbindung konnte nicht gespeichert werden: ${upsertError.message}`, false, 500);

  return html("Outlook wurde erfolgreich verbunden. Du kannst dieses Fenster schließen und in der App den Status aktualisieren.", true);
});

function html(message: string, ok: boolean, status = 200) {
  const color = ok ? "#166534" : "#991b1b";
  const title = ok ? "Outlook verbunden" : "Outlook-Verbindung fehlgeschlagen";
  return new Response(`<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#111827;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px">
  <main style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;box-shadow:0 16px 40px rgba(15,23,42,.12)">
    <h1 style="margin:0 0 12px;color:${color};font-size:22px">${title}</h1>
    <p style="margin:0;color:#475569;line-height:1.6">${escapeHtml(message)}</p>
  </main>
</body>
</html>`, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char] || char));
}
