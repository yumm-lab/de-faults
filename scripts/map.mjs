#!/usr/bin/env node
// Prints a line-numbered table of contents for the hand-written files, built from the
// section comments already in them, so an agent can read one section (offset/limit)
// instead of a whole file. Generated each run, so it never goes stale.
// Sections: `/* ---------- name ---------- */` in CSS/JS, `<!-- ============ name ============ -->` in HTML.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "public/de-faults/index.html",
  "public/de-faults/page.css",
  "public/de-faults/page.js",
  "public/de-faults/fx.js",
  "public/de-faults/i18n.js",
  "src/worker.js",
];

const CSS_JS_SECTION = /^\s*\/\*\s*-{3,}\s*(.+?)\s*-{3,}\s*\*\/\s*$/;
const HTML_SECTION = /^\s*<!--\s*={3,}\s*(.+?)\s*={3,}\s*-->\s*$/;
const HTML_LANDMARK = /^\s*<(header|footer)\b/;
const I18N_LANG = /^\s{2}(\w+): \{/;
const I18N_KEY = /^\s+"([^".]+)[."]/;

for (const file of FILES) {
  const text = readFileSync(join(ROOT, file), "utf8");
  const lines = text.split("\n");
  const sections = [];

  if (file.endsWith("i18n.js")) {
    // one entry per key prefix ("hero", "loop", ...) inside each language block
    let lang = null, prefix = null;
    lines.forEach((line, i) => {
      const l = line.match(I18N_LANG);
      if (l) { lang = l[1]; prefix = null; sections.push(`${i + 1} [${lang}]`); return; }
      const k = lang && line.match(I18N_KEY);
      if (k && k[1] !== prefix) { prefix = k[1]; sections.push(`${i + 1} ${prefix}`); }
    });
  } else if (file.endsWith(".html")) {
    lines.forEach((line, i) => {
      const m = line.match(HTML_SECTION) ?? line.match(HTML_LANDMARK);
      if (m) sections.push(`${i + 1} ${m[1].split("(")[0].trim()}`);
    });
  } else {
    lines.forEach((line, i) => {
      const m = line.match(CSS_JS_SECTION);
      if (m) sections.push(`${i + 1} ${m[1].split(/[.:](?:\s|$)/)[0].trim()}`);
    });
  }

  const lineCount = lines.length - (text.endsWith("\n") ? 1 : 0);
  const tokens = Math.round(Buffer.byteLength(text) / 400) / 10; // ~4 bytes per token
  console.log(`${file}  ${lineCount}L ~${tokens}k tok`);
  if (sections.length) console.log(`  ${sections.join(" · ")}`);
}
