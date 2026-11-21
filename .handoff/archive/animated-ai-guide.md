---
title: Animated AI guide page at /de-faults/ (TH/EN)
status: done
severity: medium
next: user
blocked_on: 
created: 2026-11-21
updated: 2026-11-21
---

# Animated AI guide page at /de-faults/ (TH/EN)

## Goal

Replace the /de-faults/ placeholder with an animated one-page field guide to using AI
(what AI is good for, chat → tools → agentic, the agentic loop, 5 agent patterns,
productivity tips), English + Thai toggle. Done = user reviewed it, committed, pushed, and live page passes the smoke check.

## Context

Built and verified locally, **not committed** (working tree has the changes):
- `public/de-faults/index.html` — all sections, inline SVG ring + pattern diagrams, `data-i18n` keys.
- `public/de-faults/page.css` — main site tokens only (`/tokens.css`), no raw colours.
- `public/de-faults/i18n.js` (new) — `window.DEFAULTS_I18N` en/th; keys match HTML 1:1.
- `public/de-faults/page.js` (new) — lang toggle (shared `yumm-lang` key with main site), typewriter, reveals, pinned levels + loop ring, pattern dot flows, CLAUDE.md typing.
- `public/de-faults/fx.js` (new) — ES module; pixelfx canvases in `[data-fx]` slots (hero fireflies, level-up in demo 3, agent cam in ring centre: "!" on Check fail + confetti on pass, coin after CLAUDE.md typing, quest complete in footer). Listens to `defaults:level|beat|typed` events from page.js. Also pixelates the avatar (32px → pixelated).
- `public/de-faults/vendor/pixelfx.min.js` + `PIXELFX-LICENSE.txt` (new) — esbuild subset of patch-gg/pixelfx @ 5294518c (88 KB, 37.6 KB gz). Rebuild steps in README.
- `.github/workflows/deploy.yml` — smoke check now also compares `page.js`, `i18n.js`, `fx.js`, `vendor/pixelfx.min.js`.
- `README.md` — file table + pixelfx section.

Pixel-art theme (2026-11-21, user asked after the first build; reference: patch-gg/pixelfx):
- Kept `/tokens.css` colours + light/dark. page.css re-points only `--font-display` → Pixelify Sans (Thai falls back per glyph to Chakra Petch) and `--radius-*` → 0, adds `--px: 3px`.
- Notched 3px pixel frames via 4 box-shadows (`--frame` per element), dot-grid body background, stepped GSAP eases (`steps(n)`), ring token hops in 6° steps, square nodes/dots.
- Effects only on night surfaces (dark in both themes). Patch Pixel font from pixelfx is NOT MIT — not used.

Decisions:
- GSAP + ScrollTrigger loaded from main site `/vendor/*.js` (same origin). Missing → page stays static, fully readable.
- Pinning = CSS `position: sticky` + `.is-pinned` class (main site pattern), not GSAP pin. Only at `(min-width: 1024px) and (min-height: 680px)`; smaller (e.g. 861x640) overflowed by 28px. Below that the loop auto-plays when on screen.
- Strict CSP (`script-src 'self'`): no inline script/style/handlers. Styles set via CSSOM only.
- Initial animation states set in JS only, never CSS opacity:0. `prefers-reduced-motion` → no pin, no typing, all static.
- Thai: typewriter splits by grapheme (Intl.Segmenter); `:lang(th)` raises heading line-height to 1.3.
- Push to `main` auto-deploys to production — needs explicit user OK.

"Do it yourself" how-to section (2026-11-21, user asked for content that teaches doing, not just concepts):
- `#howto` between `when` and `tips`: 4 recipes (write AGENTS.md, run an agentic task, create a skill, extend with hooks/MCP/subagents), each = why + steps + example file. **Tool-agnostic** by user choice: tool names/paths only as "e.g." (skills folders `.agents/skills/`, `.claude/skills/`, `.github/skills/`; AGENTS.md read natively by Codex/Cursor/Copilot; hooks in Claude Code/Cursor/Gemini CLI), checked by web search 2026-11-21.
- The CLAUDE.md example moved out of tips into recipe 1 and became AGENTS.md (`#agents-md`); coin fx moved with it. Tips is now a plain 3/2/1-col list.
- Recipe step classes are `.recipe__steps` / `.rstep*`: `.steps` / `.step` already belong to the levels section (its pinned CSS dims `.step`).
- page.js types every `.file code`; translated ones (`rc.2.code`, `rc.4.s.code`) stop typing on a language switch. `defaults:typed` still fires only for `#agents-md`.

## Next steps

- [x] Build page, i18n, animations; verify locally (Playwright, all pass).
- [x] Pixel-art reskin + pixelfx effects; verify locally (Playwright 46/46).
- [x] How-to recipes section; `./dev check` ok, Playwright 12/12 (typing, coin, reveals, TH incl. mid-typing switch, no overflow 320–1440 EN/TH, reduced motion, GSAP blocked, pin at 1024x680).
- [x] Theme toggle in the top bar (light/dark existed via /theme.js but this page had no switch; main.js owns it on the main site). Same `yumm-theme` key + logic as yummlab.site main.js, hidden without JS. Playwright 10/10 + howto suite 13/13. Note: Playwright `waitForFunction` polling evals strings and the page CSP blocks it; poll with `evaluate` instead.
- [ ] User reviews page in browser (run Verify step 1) and asks for copy/design changes if any.
- [ ] Commit on a branch or main per user's call (message e.g. `feat: animated AI guide page for de-faults`). Include `.handoff/` too.
- [ ] Push only with user OK (main = production deploy), then confirm the Deploy workflow smoke check passes.

## Verify

0. `./dev check` (i18n keys, refs, CSP-safe markup, JS syntax; CI runs it too).
1. `./dev worker` (needs `../yummlab.site`) → open https://127.0.0.1:8787/de-faults/ (self-signed). Plain http redirects to https.
2. Playwright check script was in the session scratchpad (gone after reboot). It checked: no console/CSP errors; levels demo 0→1→2 and loop beats 1→9 on scroll; TH toggle sets `html[lang]`; no horizontal overflow at 320/375/414/768; reduced-motion + GSAP-blocked render all text at opacity 1; pinned content fits 1024x680 to 1920x1080 in both languages. Pixel pass added: each fx canvas gets painted pixels (getImageData alpha count) after its trigger; fx.js makes no rAF calls while its slots are off screen or idle (ScrollTrigger's own ticker keeps running, pre-existing); fx bundle blocked → page unchanged. Local Chromium needs `libnss3 libnspr4 libasound2t64`: `apt-get download` them, `dpkg -x` into a dir, then set `LD_LIBRARY_PATH`.
3. After deploy: GitHub Actions "Deploy" run green (`./dev live` diffs every live file vs `public/de-faults/`). As of 2026-11-21 every /de-faults/ path on production returns 404, placeholder included: check the main site's `DE_FAULTS` binding / this Worker's deploy.

## Log

- 2026-11-21 claude-bc9b895f: created
- 2026-11-21 claude-bc9b895f: open — Page built + verified locally, uncommitted. Next: user review, then commit; push to main only with OK (auto-deploys prod).
- 2026-11-21 claude-14598724: open — Pixel-art reskin + pixelfx effects built, Playwright 46/46 locally, uncommitted. Next: user review, then commit; push to main only with OK (auto-deploys prod).
- 2026-11-21 claude: open — Agent tooling added (uncommitted): `./dev` (init/worker/map/check/live/deploy/pixelfx), `scripts/`, AGENTS.md + CLAUDE.md, README trimmed, CI runs check + `./dev live`. Page code untouched.
- 2026-11-21 claude-4709affc: open — How-to recipes section added (uncommitted), check ok, Playwright 12/12. Next: user review, then commit; push to main only with OK.
- 2026-11-21 claude-4709affc: blocked [blocked on: Live /de-faults/* = 404: yummlab-site live version 779b4f6f has no DE_FAULTS binding; binding + routing are in 2 unpushed yummlab.site commits (5abcb0a, b2966c4). Also GitHub production env of de-faults has no CLOUDFLARE_API_TOKEN/ACCOUNT_ID, so CI deploy fails; worker deployed manually via ./dev deploy (version 414c674c).]
- 2026-11-21 claude-4709affc: done [evidence: Live https://yummlab.site/de-faults/ 200; ./dev live all files ok vs df8cf64 (worker 414c674c via ./dev deploy; main site binding shipped in yummlab.site 4619ed7, Deploy run 44921049824 green). Playwright vs production: all feature checks pass; only console error is the Cloudflare Web Analytics beacon blocked by CSP, same on the main site. Open: de-faults GitHub production env lacks CLOUDFLARE_API_TOKEN/ACCOUNT_ID, so CI deploy fails.]
