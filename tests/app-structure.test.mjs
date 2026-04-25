import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

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

const labelKeys = objectKeys("FACHBEREICH_LABELS");
const emptyFallakteKeys = createEmptyFallakteFachbereichKeys();
const newDocKeys = stateKeys("newDocs");

assert.deepEqual(new Set(labelKeys).size, labelKeys.length, "Fachbereich labels must not contain duplicate semantic keys");
assert.deepEqual(newDocKeys.sort(), labelKeys.sort(), "Every rendered Fachbereich needs matching newDocs state");
assert.deepEqual(emptyFallakteKeys.sort(), labelKeys.sort(), "Every rendered Fachbereich needs matching fallakte state");

assert.match(source, /@media \(max-width: 920px\) \{[\s\S]*\.sidebar \{[\s\S]*\.main-content \{[\s\S]*\}/, "Mobile sidebar/layout styles must live inside the mobile media query");
