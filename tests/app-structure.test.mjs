import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const deepseekFunctionSource = fs.existsSync(new URL("../supabase/functions/deepseek-rewrite/index.ts", import.meta.url))
  ? fs.readFileSync(new URL("../supabase/functions/deepseek-rewrite/index.ts", import.meta.url), "utf8")
  : "";

function objectKeys(constName) {
  const match = source.match(new RegExp(`const ${constName} = \\{([\\s\\S]*?)\\n\\};`));
  assert.ok(match, `${constName} was not found`);
  return [...match[1].matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((m) => m[1]);
}

function createEmptyFallakteFachbereichKeys() {
  const match = source.match(/fachbereiche:\s*\{([\s\S]*?)\n\s*\},\n\}\);/);
  assert.ok(match, "createEmptyFallakte fachbereiche was not found");
  return [...match[1].matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((m) => m[1]);
}

function stateKeys(stateName) {
  const match = source.match(new RegExp(`const \\[${stateName}[^\\n]*`));
  assert.ok(match, `${stateName} state was not found`);
  return [...match[0].matchAll(/([A-Za-z0-9_]+):\s*\{/g)].map((m) => m[1]);
}

function openMapEntries() {
  const match = source.match(/const \[openMap,\s*setOpenMap\]\s*=\s*useState\(\{([\s\S]*?)\}\);/);
  assert.ok(match, "openMap state was not found");
  return [...match[1].matchAll(/\b([A-Za-z0-9_]+):\s*(true|false)/g)].map((m) => [m[1], m[2] === "true"]);
}

const labelKeys = objectKeys("FACHBEREICH_LABELS");
const emptyFallakteKeys = createEmptyFallakteFachbereichKeys();
const newDocKeys = stateKeys("newDocs");
const fallakteSectionKeys = [
  "klient",
  "aufgaben",
  "intern",
  "extern",
  "ziele",
  "dateien",
  "soziales",
  "gesundheit",
  "bildungBeruf",
  "finanzen",
  "behoerden",
  "freizeit",
  "dokumentation",
  "notizen",
];
const openMap = Object.fromEntries(openMapEntries());

assert.deepEqual(new Set(labelKeys).size, labelKeys.length, "Fachbereich labels must not contain duplicate semantic keys");
assert.deepEqual(newDocKeys.sort(), labelKeys.sort(), "Every rendered Fachbereich needs matching newDocs state");
assert.deepEqual(emptyFallakteKeys.sort(), labelKeys.sort(), "Every rendered Fachbereich needs matching fallakte state");
assert.deepEqual(Object.keys(openMap).sort(), fallakteSectionKeys.sort(), "openMap must cover every fallakte section");
assert.deepEqual(openMapEntries().filter(([, isOpen]) => isOpen).map(([key]) => key), [], "Every fallakte section must be initially closed");

const mappedSectionKeys = labelKeys;
const explicitSectionKeys = fallakteSectionKeys.filter((key) => !mappedSectionKeys.includes(key));

assert.match(source, /Object\.entries\(FACHBEREICH_LABELS\)\.map\(\(\[key, label\]\) => \([\s\S]*sectionKey=\{key\}/, "Fachbereich sections must render from FACHBEREICH_LABELS with matching section keys");

for (const key of explicitSectionKeys) {
  assert.match(source, new RegExp(`sectionKey="${key}"`), `Fallakte section ${key} must be rendered`);
}

assert.match(source, /@media \(max-width: 920px\) \{[\s\S]*\.sidebar \{[\s\S]*\.main-content \{[\s\S]*\}/, "Mobile sidebar/layout styles must live inside the mobile media query");

assert.match(source, /const \[pdfPreview,\s*setPdfPreview\]\s*=\s*useState\(null\)/, "DetailView must keep PDF preview state");
assert.match(source, /function PdfPreviewModal/, "A PDF preview modal component must exist");
assert.match(source, /<iframe[\s\S]*src=\{file\.url\}/, "PDF preview must embed the signed URL in an iframe");
assert.match(source, />Herunterladen</, "PDF preview must provide a download action");
assert.match(source, />Drucken</, "PDF preview must provide a print action");
assert.match(source, />Schließen</, "PDF preview must provide a close action");

assert.match(source, /const DEMO_LOGIN = \{ email: "test@deinprojekt\.de", password: "passwort" \}/, "Demo login credentials must be defined");
assert.match(source, /const \[email,\s*setEmail\]\s*=\s*useState\(DEMO_LOGIN\.email\)/, "Login email field must be prefilled with demo email");
assert.match(source, /const \[pass,\s*setPass\]\s*=\s*useState\(DEMO_LOGIN\.password\)/, "Login password field must be prefilled with demo password");
assert.match(source, />Demo-Fachkraft</, "Login screen must show demo user hint");

assert.doesNotMatch(source, /history\.back|window\.history|navigate\(-1\)/, "Back navigation must not use browser history");
assert.match(source, /const DETAIL_RETURN_FALLBACK = "clients"/, "Detail navigation must define an internal fallback view");
assert.match(source, /const DETAIL_RETURN_VIEWS = new Set\(/, "Detail navigation must validate allowed in-app return views");
assert.match(source, /const DETAIL_RETURN_ALIASES = \{[\s\S]*reminders:\s*"benachrichtigungen"[\s\S]*calendar:\s*"kalender"/, "Detail navigation must map user-facing origins to internal views");
assert.match(source, /const normalizeDetailReturnView = \(returnView\) =>/, "Detail navigation must normalize the stored origin");
assert.match(source, /const lastNonDetailViewRef = useRef\("dashboard"\)/, "Navigation must remember the last non-detail in-app view");
assert.match(source, /const navigateToView = \(nextView\) => \{[\s\S]*lastNonDetailViewRef\.current = normalizedView[\s\S]*setSelectedClient\(null\)[\s\S]*setView\(normalizedView\)/, "Non-detail navigation must clear stale detail state and remember the current app view");
assert.match(source, /const handleDetailBack = \(\) => \{[\s\S]*const targetView = normalizeDetailReturnView\(detailReturnView \|\| lastNonDetailViewRef\.current\)[\s\S]*setView\(targetView\)/, "Detail back button must use normalized in-app navigation");
assert.doesNotMatch(source, /onBack=\{\(\) => setView\(detailReturnView \|\| "clients"\)\}/, "Detail back button must not directly jump to unvalidated state");
assert.equal([...source.matchAll(/setView\("detail"\)/g)].length, 1, "Only the central openClientDetail wrapper may switch into detail view");
assert.match(source, /<Sidebar[\s\S]*setView=\{\(v\) => \{ navigateToView\(v\); setSidebarOpen\(false\); \}\}/, "Sidebar navigation must go through central in-app navigation");
assert.match(source, /<Dashboard[\s\S]*setView=\{navigateToView\}/, "Dashboard list links must go through central in-app navigation");
assert.match(source, /<AccessDeniedView setView=\{navigateToView\}/, "Access denied fallback must stay inside central in-app navigation");
assert.match(source, /view === "dashboard"[\s\S]*onOpenClient=\{\(c\) => openClientDetail\(c, "dashboard"\)\}/, "Dashboard must open details with dashboard origin");
assert.match(source, /view === "clients"[\s\S]*onSelect=\{\(c\) => openClientDetail\(c, "clients"\)\}/, "Fallakten list must open details with clients origin");
assert.match(source, /view === "kalender"[\s\S]*onOpenClient=\{\(c\) => openClientDetail\(c, "calendar"\)\}/, "Calendar must open details with calendar origin");
assert.match(source, /view === "benachrichtigungen"[\s\S]*onOpenClient=\{\(c\) => openClientDetail\(c, "reminders"\)\}/, "Reminders must open details with reminders origin");
assert.match(source, /function KalenderView\(\{[\s\S]*onOpenClient[\s\S]*\}\)/, "Calendar view must receive the central client opener");
assert.match(source, /onClick=\{\(\) => onOpenClient\(k\)\}[\s\S]*👤 \{k\.name\}/, "Calendar client links must use the central client opener");

assert.match(source, /provider:\s*"ollama"/, "KI settings must default to the local Ollama provider");
assert.match(source, /provider",\s*"deepseek"/, "KI provider settings must allow selecting DeepSeek API");
assert.match(source, /supabase\.functions\.invoke\("deepseek-rewrite"/, "DeepSeek rewriting must be called through a Supabase Edge Function");
assert.doesNotMatch(source, /DEEPSEEK_API_KEY|api\.deepseek\.com|Authorization":\s*`Bearer/, "Frontend must not contain DeepSeek secrets or direct DeepSeek API calls");

assert.match(deepseekFunctionSource, /Deno\.env\.get\("DEEPSEEK_API_KEY"\)/, "DeepSeek Edge Function must read DEEPSEEK_API_KEY from Supabase Secrets");
assert.match(deepseekFunctionSource, /https:\/\/api\.deepseek\.com\/chat\/completions/, "DeepSeek Edge Function must call the DeepSeek API server-side");
assert.match(deepseekFunctionSource, /auth\.getUser\(\)/, "DeepSeek Edge Function must require an authenticated Supabase user");
assert.match(deepseekFunctionSource, /rewriteMode/, "DeepSeek Edge Function must accept a rewrite mode");
