import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rewritePrompts: Record<string, string> = {
  spelling_grammar: "Korrigiere nur Rechtschreibung, Grammatik und Zeichensetzung. Erhalte Inhalt, Aussage, Reihenfolge und Umfang.",
  documentation_smoothing: "Glätte den Text sachlich und dokumentationsgerecht. Keine neuen Informationen, keine Deutung, keine fachliche Ergänzung.",
  dictation_cleanup: "Bereinige Diktat-typische Fehler, Satzzeichen und Grammatik. Erhalte alle Inhalte unverändert und füge nichts hinzu.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!supabaseUrl || !anonKey || !deepseekKey) {
    return json({ error: "Server configuration is incomplete." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Nicht authentifiziert." }, 401);

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  const rewriteMode = rewritePrompts[body.rewriteMode] ? body.rewriteMode : "spelling_grammar";

  if (!text) return json({ error: "Text ist erforderlich." }, 400);
  if (text.length > 12000) return json({ error: "Text ist zu lang für die KI-Korrektur." }, 400);

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deepseekKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: [
            "Du bearbeitest sozialpädagogische Dokumentation.",
            "Gib ausschließlich den überarbeiteten Text zurück.",
            "Füge keine Informationen hinzu. Entferne keine sachlichen Informationen. Erfinde nichts.",
            "Wenn der Text fachlich unklar ist, formuliere nur sprachlich vorsichtiger.",
            rewritePrompts[rewriteMode],
          ].join(" "),
        },
        { role: "user", content: text },
      ],
      thinking: { type: "disabled" },
      temperature: 0.2,
      stream: false,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : `DeepSeek HTTP ${response.status}`;
    return json({ error: message }, response.status >= 500 ? 502 : response.status);
  }

  const rewritten = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!rewritten) return json({ error: "Keine KI-Antwort erhalten." }, 502);

  return json({ corrected: rewritten, rewriteMode });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
