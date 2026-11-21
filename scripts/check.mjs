#!/usr/bin/env node
// Consistency checks for the page. No dependencies; run with `./dev check` (CI runs it before deploy).
// Parses with regexes on purpose: the files are small, hand-written and have a known shape.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = "public/de-faults";
const SITE = resolve(ROOT, process.env.SITE ?? "../yummlab.site"); // main site checkout, optional
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const errors = [];
const warnings = [];

const html = read(`${PAGE}/index.html`);
const js = { "page.js": read(`${PAGE}/page.js`), "fx.js": read(`${PAGE}/fx.js`) };
const allJs = Object.values(js).join("\n");

// --- syntax: every hand-written script must parse ---
for (const f of [`${PAGE}/page.js`, `${PAGE}/i18n.js`, `${PAGE}/fx.js`, "src/worker.js"]) {
  try {
    execFileSync(process.execPath, ["--check", join(ROOT, f)], { stdio: "pipe" });
  } catch (e) {
    const detail = e.stderr.toString().split("\n").filter((l) => l.trim() && !/^\s+at |^Node\.js /.test(l));
    errors.push(`syntax: ${f}\n${detail.join("\n")}`);
  }
}

// --- i18n: keys used in index.html / JS exist in both languages, and en/th agree ---
const sandbox = { window: {} };
vm.runInNewContext(read(`${PAGE}/i18n.js`), sandbox);
const dict = sandbox.window.DEFAULTS_I18N ?? {};
const langs = ["en", "th"];
for (const lang of langs) if (!dict[lang]) errors.push(`i18n: missing language "${lang}" in ${PAGE}/i18n.js`);
const en = dict.en ?? {};
const prefixes = new Set(Object.keys(en).map((k) => k.split(".")[0]));

const htmlKeys = new Set([...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]));
// JS reads some keys directly, e.g. t(lang, "meta.title"); count quoted strings shaped like a known key
const jsKeys = new Set(
  [...allJs.matchAll(/"([a-z]\w*(?:\.\w+)+)"/g)].map((m) => m[1]).filter((k) => prefixes.has(k.split(".")[0])),
);
for (const [where, keys] of [["index.html", htmlKeys], ["page.js/fx.js", jsKeys]]) {
  for (const key of keys) {
    for (const lang of langs) {
      if (dict[lang] && !(key in dict[lang])) errors.push(`i18n: "${key}" used in ${where}, missing in ${lang}`);
    }
  }
}
if (dict.en && dict.th) {
  for (const key of Object.keys(dict.en)) if (!(key in dict.th)) errors.push(`i18n: "${key}" in en, missing in th`);
  for (const key of Object.keys(dict.th)) if (!(key in dict.en)) errors.push(`i18n: "${key}" in th, missing in en`);
  for (const key of Object.keys(dict.en)) {
    if (!htmlKeys.has(key) && !jsKeys.has(key)) warnings.push(`i18n: "${key}" is never used`);
  }
}

// --- CSP (public/_headers: script-src 'self', style-src 'self' + Google Fonts): nothing inline ---
for (const [, attrs] of html.matchAll(/<script\b([^>]*)>/g)) {
  if (!/\bsrc=/.test(attrs)) errors.push("csp: inline <script> in index.html (CSP blocks it): move it to a file");
}
if (/<style\b/.test(html)) errors.push("csp: <style> in index.html: move it to page.css");
if (/\sstyle="/.test(html)) errors.push('csp: style="" attribute in index.html: use a class or set it via the CSSOM');
for (const [m] of html.matchAll(/\son[a-z]+="/g)) errors.push(`csp: inline handler${m.trimEnd()} in index.html: use addEventListener`);
for (const [f, src] of Object.entries(js)) {
  if (/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|\beval\(|new Function\(/.test(src)) {
    errors.push(`safety: ${f} writes HTML or evals: use textContent / DOM APIs`);
  }
}

// --- refs: /de-faults/* must exist here; other root paths come from the main site ---
const refs = new Set([
  ...[...html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)].map((m) => m[1]),
  ...[...allJs.matchAll(/["'](\/de-faults\/[^"'#?]+)["']/g)].map((m) => m[1]),
]);
const hasSite = existsSync(join(SITE, "public"));
const siteRefs = [];
for (const ref of refs) {
  const file = ref.endsWith("/") ? `${ref}index.html` : ref;
  if (ref.startsWith("/de-faults/")) {
    if (!existsSync(join(ROOT, "public", file))) errors.push(`refs: ${ref}, no file public${file}`);
  } else if (hasSite) {
    if (!existsSync(join(SITE, "public", file))) errors.push(`refs: ${ref} (main site), no file ${SITE}/public${file}`);
  } else {
    siteRefs.push(ref);
  }
}
if (siteRefs.length) warnings.push(`refs: no main site at ${SITE}, unchecked: ${siteRefs.join(" ")}`);

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`FAIL  ${e}`);
if (errors.length) {
  console.log(`\ncheck: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`check: ok (${htmlKeys.size + jsKeys.size} i18n keys, ${refs.size} refs${warnings.length ? `, ${warnings.length} warning(s)` : ""})`);
