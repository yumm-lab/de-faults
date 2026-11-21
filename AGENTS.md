# de-faults

de-faults' page at https://yummlab.site/de-faults/: an animated, pixel-art field guide to using AI, EN + TH. Static, no build step.

## Commands

`./dev` lists them. Fresh clone: `./dev init`. Before every commit: `./dev check` (CI runs it too and blocks deploy on failure).

## Map

Start every edit with `./dev map`: each file's sections with start lines (~350 tokens, generated from the section comments, always current). Read just that section's line range. Sections are `/* ---------- name ---------- */` in CSS/JS and `<!-- ============ name ============ -->` in HTML; give new code a section comment in the same format.

- `public/de-faults/` is the page, served as is: `index.html` markup, `i18n.js` copy (`window.DEFAULTS_I18N`), `page.css`, `page.js` (lang toggle, typewriter, reveals, pinned levels + loop ring), `fx.js` (pixel effects, ES module).
- `public/de-faults/vendor/pixelfx.min.js` is a pinned build of patch-gg/pixelfx; `./dev pixelfx <clone>` rebuilds it (effect list lives in `scripts/pixelfx.sh`).
- `public/_headers` sets CSP and cache headers for this Worker; the main site's `_headers` does not apply here.
- `src/worker.js` renders `/de-faults/th/`: index.html with the `th` copy from `i18n.js` filled in (own title, canonical, OG), links to `/` pointed at `/th/`. Everything else is served as is. The main site's `public/sitemap.xml` lists both URLs.
- `index.html` head carries hreflang (en/th), OG tags and a JSON-LD block (TechArticle + BreadcrumbList); add `dateModified` to it when the guide meaningfully changes.
- `scripts/check.mjs` and `scripts/map.mjs` are what `./dev check` / `./dev map` run.

## Serving

This Worker (`yummlab-de-faults`) has no routes. The `yummlab-site` Worker (repo yumm-lab/yummlab.site, expected at `../yummlab.site`) owns the domain and forwards `/de-faults/*` here via service binding `DE_FAULTS`, URL unchanged. So the page loads main-site files by absolute path on the same origin: `/tokens.css`, `/theme.js`, `/favicon.svg`, `/vendor/gsap.min.js`, `/vendor/ScrollTrigger.min.js`. `./dev worker` runs both Workers together.

## Rules

- **Copy**: every visible string is a `data-i18n="key"` (or `data-i18n-aria`) in `index.html` with the same key in both `en` and `th`. `page.js` applies it with `textContent`, and the Worker applies `th` server-side for `/de-faults/th/`, so copy is plain text. The language switch keeps the URL in step (`/de-faults/` or `/de-faults/th/`).
- **CSP**: scripts and styles load from this origin as files; fonts only from Google Fonts. The one inline `<script>` is `type="application/ld+json"`: data, never executed, so CSP allows it; keep it data-only. Only outside script: the Cloudflare Web Analytics beacon Cloudflare injects (`static.cloudflareinsights.com`, reports to `cloudflareinsights.com`); keep it in step with the main site. Style dynamic values through the CSSOM (`el.style.x = ...`).
- **Look**: colours, spacing and motion come from `/tokens.css` (light + dark); `page.css` only re-points font (Pixelify Sans, Thai falls back to Chakra Petch) and radius (0) tokens. Pixel frames use the `--frame` box-shadow; motion eases are `steps(n)`. pixelfx's Patch Pixel font is not MIT: keep it out.
- **Progressive enhancement**: all copy is readable with no JS, no GSAP and no `fx.js`. Set initial animation states in JS, so the CSS default is the visible, final state. `prefers-reduced-motion` gets a static page.
- **Pinning**: CSS `position: sticky` + `.is-pinned`, only at `PIN_OK` in `page.js` (`min-width: 1024px` and `min-height: 680px`); smaller screens overflow, so the loop auto-plays in normal flow there.
- **fx.js** is decorative and listens for `defaults:level`, `defaults:beat`, `defaults:typed` events from `page.js`; its stages tick only while on screen.
- **Thai**: split typed text by grapheme (`Intl.Segmenter`); `:lang(th)` headings need line-height 1.3.
- **Secrets**: the page needs none. Deploy credentials live in the GitHub `production` environment. The pre-commit hook (enabled by `./dev init`) rejects credential-looking diffs.

## Deploy

Push to `main` = production: CI runs check, deploys, then `./dev live` compares every live file with `public/de-faults/`. Push only with the user's OK. `./dev deploy` is the manual path. The main site binds to this Worker by name: remove that binding before renaming or deleting `yummlab-de-faults`.
