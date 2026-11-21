/* de-faults · behaviour: theme toggle, i18n, prompt typewriter, scroll reveals, pinned levels, agentic loop ring,
 * pattern flows, example-file typing. The page is complete without this file or without GSAP: every
 * animated start state is set here, never in CSS. Patterns follow yummlab.site/public/main.js.
 * Pixel look: motion moves in steps. Progress is announced as document events for fx.js. */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const animate = hasGsap && !reduceMotion;
  const MOTION_OK = "(prefers-reduced-motion: no-preference)";
  // Pinned set-pieces need room: below this the sections stay in normal flow.
  const PIN_OK = "(min-width: 1024px) and (min-height: 680px)";

  // Storage can throw (private mode, blocked site data): never let it break the page.
  const safeStore = (area) => ({
    get(key) { try { return window[area].getItem(key); } catch { return null; } },
    set(key, value) { try { window[area].setItem(key, value); } catch { /* ignore */ } },
  });
  const local = safeStore("localStorage");

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // fx.js listens for these; nothing breaks if it never loads
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
  // pixel motion: jump between a few positions instead of gliding
  const PIXEL_EASE = "steps(5)";

  /* ---------- theme ---------- */
  // /theme.js (main site) sets data-theme before paint; this owns the toggle. Same key and logic as
  // yummlab.site/public/main.js, so a pick on either site carries over.
  const THEME_KEY = "yumm-theme";
  const THEME_COLOR = { light: "#f3f4f6", dark: "#090b0e" }; // browser chrome = --color-paper
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const savedTheme = () => { const v = local.get(THEME_KEY); return v === "light" || v === "dark" ? v : null; };

  function applyTheme(theme) {
    root.dataset.theme = theme;
    $('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
    $$(".theme__btn").forEach((btn) => btn.setAttribute("aria-pressed", String(theme === "dark")));
  }

  applyTheme(savedTheme() || (systemDark.matches ? "dark" : "light"));
  $$(".theme__btn").forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      local.set(THEME_KEY, next); // an explicit pick stops following the system
      applyTheme(next);
    });
  });
  systemDark.addEventListener("change", (e) => { if (!savedTheme()) applyTheme(e.matches ? "dark" : "light"); });

  /* ---------- i18n ---------- */
  // Same storage key as the main site, so a language picked there carries over here.
  const LANG_KEY = "yumm-lang";
  const DICT = window.DEFAULTS_I18N || { en: {} };
  const t = (lang, key) => (DICT[lang] && DICT[lang][key]) ?? DICT.en[key];
  const langListeners = [];
  let lang = "en";

  function initialLang() {
    const saved = local.get(LANG_KEY);
    if (saved === "en" || saved === "th") return saved;
    return (navigator.language || "").toLowerCase().startsWith("th") ? "th" : "en";
  }

  function applyLang(next) {
    lang = next;
    root.lang = next;
    const title = t(next, "meta.title");
    if (title) document.title = title;
    const desc = t(next, "meta.desc");
    if (desc) $('meta[name="description"]')?.setAttribute("content", desc);
    $$("[data-i18n]").forEach((el) => {
      const value = t(next, el.dataset.i18n);
      if (value != null) el.textContent = value;
    });
    $$("[data-i18n-aria]").forEach((el) => {
      const value = t(next, el.dataset.i18nAria);
      if (value != null) el.setAttribute("aria-label", value);
    });
    $$(".lang__btn").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.lang === next)));
    langListeners.forEach((fn) => fn(next));
  }

  $$(".lang__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.lang;
      if (next === lang || !DICT[next]) return;
      local.set(LANG_KEY, next);
      applyLang(next);
    });
  });

  applyLang(initialLang());

  /* ---------- hero prompt typewriter ---------- */
  // Starts from the full first prompt (already in the DOM): hold, delete, type the next one.
  const typer = $("#typer");
  const PROMPTS = ["hero.p1", "hero.p2", "hero.p3", "hero.p4"];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Thai vowels and tone marks are separate code points: split by grapheme so we never type half a syllable.
  const graphemes = (text) =>
    typeof Intl.Segmenter === "function"
      ? Array.from(new Intl.Segmenter(lang, { granularity: "grapheme" }).segment(text), (g) => g.segment)
      : Array.from(text);
  let typerRun = 0;

  async function runTyper() {
    const run = ++typerRun;
    const alive = () => run === typerRun;
    let index = 0;
    while (alive()) {
      await wait(2400);
      if (!alive()) return;
      const current = graphemes(typer.textContent);
      for (let n = current.length - 1; n >= 0; n--) {
        if (!alive()) return;
        typer.textContent = current.slice(0, n).join("");
        await wait(18);
      }
      index = (index + 1) % PROMPTS.length;
      const next = graphemes(t(lang, PROMPTS[index]) || "");
      await wait(320);
      for (let n = 1; n <= next.length; n++) {
        if (!alive()) return;
        typer.textContent = next.slice(0, n).join("");
        await wait(44);
      }
    }
  }

  if (typer && !reduceMotion) {
    runTyper();
    // applyLang has just reset the text to the first prompt in the new language: restart from there
    langListeners.push(() => runTyper());
  }

  /* ---------- example files type themselves out (no GSAP needed) ---------- */
  // Each file types once, the first time it scrolls into view. Translated files (data-i18n) stop
  // typing on a language switch: applyLang has already put the new text in, so leave it whole.
  if (!reduceMotion && "IntersectionObserver" in window) {
    $$(".file code").forEach((code) => {
      const figure = code.closest(".file");
      const pre = code.parentElement;
      let typing = false;
      const finish = () => {
        typing = false;
        figure.classList.remove("is-typing");
        pre.style.minHeight = "";
      };
      if (code.dataset.i18n) langListeners.push(() => { if (typing) finish(); });
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        const full = code.textContent;
        pre.style.minHeight = `${pre.offsetHeight}px`; // keep layout still while the text grows
        figure.classList.add("is-typing");
        code.textContent = "";
        typing = true;
        let shown = 0;
        const step = () => {
          if (!typing) return;
          shown = Math.min(full.length, shown + 3);
          code.textContent = full.slice(0, shown);
          if (shown < full.length) { requestAnimationFrame(step); return; }
          finish();
          if (code.id === "agents-md") emit("defaults:typed"); // fx.js plays the coin
        };
        requestAnimationFrame(step);
      }, { threshold: 0.35 });
      io.observe(code);
    });
  }

  if (!hasGsap) return;

  /* ---------- reveals ---------- */
  if (animate) {
    gsap.from(".hero > *", { y: 24, opacity: 0, duration: 0.6, ease: PIXEL_EASE, stagger: 0.08, delay: 0.1 });
    const reveal = (targets, trigger, vars = {}) =>
      gsap.from(targets, {
        y: 28, opacity: 0, duration: 0.5, ease: PIXEL_EASE, stagger: 0.07, ...vars,
        scrollTrigger: { trigger, start: "top 85%", once: true },
      });
    $$(".head").forEach((head) => reveal(head.children, head));
    $$(".title--sm, #when-title").forEach((title) => reveal(title, title));
    reveal($$(".use"), ".uses");
    reveal($$(".part"), ".parts");
    reveal($$(".pattern"), ".patterns");
    reveal($$(".when__col"), ".when", { y: 40 });
    $$(".recipe").forEach((recipe) => {
      const steps = $(".recipe__steps", recipe);
      // the steps list has its own staggered reveal below
      reveal(Array.from($(".recipe__main", recipe).children).filter((el) => el !== steps), recipe);
      if (steps) reveal($$(".rstep", steps), steps, { stagger: 0.05 });
    });
    reveal($$(".ext"), ".exts");
    $$(".file:not(.file--sm)").forEach((file) => reveal(file, file, { y: 40 }));
    reveal($$(".tip"), ".tips__list", { stagger: 0.05 });
  }

  const mm = gsap.matchMedia();

  /* ---------- levels: chat → tools → agentic ---------- */
  const levels = $("#levels");
  const steps = $$(".step", levels);
  const demos = $$(".demo", levels);
  const demoBits = $$(".bubble, .chip", levels);
  let level = -1;

  function setLevel(next) {
    if (next === level) return;
    level = next;
    steps.forEach((step, i) => step.classList.toggle("is-active", i === next));
    demos.forEach((demo, i) => demo.classList.toggle("is-active", i === next));
    const bits = demos[next] ? demos[next].querySelectorAll(".bubble, .chip") : [];
    gsap.fromTo(bits, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "steps(3)", stagger: 0.12, overwrite: true });
    emit("defaults:level", { level: next });
  }

  mm.add({ pin: PIN_OK, motion: MOTION_OK }, (ctx) => {
    const { pin, motion } = ctx.conditions;
    if (!motion) return undefined;
    if (!pin) {
      // in normal flow: each demo plays its conversation once as it scrolls in
      demos.forEach((demo) => gsap.from(demo.querySelectorAll(".bubble, .chip"), {
        opacity: 0, y: 10, duration: 0.3, ease: "steps(3)", stagger: 0.14,
        scrollTrigger: { trigger: demo, start: "top 80%", once: true },
      }));
      return undefined;
    }
    levels.classList.add("is-pinned");
    level = -1;
    setLevel(0);
    const st = ScrollTrigger.create({
      trigger: levels, start: "top top", end: "bottom bottom",
      onUpdate: (self) => setLevel(Math.min(demos.length - 1, Math.floor(self.progress * demos.length))),
    });
    return () => {
      st.kill();
      levels.classList.remove("is-pinned");
      steps.concat(demos).forEach((el) => el.classList.remove("is-active"));
      gsap.killTweensOf(demoBits);
      gsap.set(demoBits, { clearProps: "opacity,transform" });
      level = -1;
    };
  });

  /* ---------- agentic loop ring ---------- */
  // Nine beats: lap 1 is goal → plan → act → observe → check (fails), lap 2 skips the goal and passes.
  const loop = $("#loop");
  const orbit = $("#loop-orbit");
  const token = $(".ring__token", orbit);
  const trail = $(".ring__trail", loop);
  const stateLabel = $("#loop-state");
  const nodes = $$(".node", loop);
  const labels = $$(".ring__label", loop);
  const logItems = $$(".log__list li", loop);
  const ANGLES = [0, 72, 144, 216, 288, 432, 504, 576, 648]; // token angle per beat, clockwise from the top
  const NODE_AT = [0, 1, 2, 3, 4, 1, 2, 3, 4];               // which node each beat lands on
  const LAST = ANGLES.length - 1;
  const CHECK = 4;
  const ORBIT_STEP = 6;
  const easeInOut = (f) => (f < 0.5 ? 2 * f * f : 1 - 2 * (1 - f) * (1 - f)); // token dwells on each node
  let beat = -1;

  function setBeat(next) {
    beat = next;
    const active = NODE_AT[next];
    nodes.forEach((node, i) => node.classList.toggle("is-active", i === active));
    labels.forEach((label, i) => label.classList.toggle("is-active", i === active));
    nodes[CHECK].classList.toggle("is-fail", next >= CHECK && next < LAST);
    nodes[CHECK].classList.toggle("is-pass", next === LAST);
    logItems.forEach((item, i) => {
      item.classList.toggle("is-shown", i <= next);
      item.classList.toggle("is-current", i === next);
    });
    stateLabel.textContent = t(lang, next === LAST ? "loop.done" : next > CHECK ? "loop.lap2" : "loop.lap1");
    emit("defaults:beat", { beat: next, fail: next === CHECK, pass: next === LAST });
  }

  function renderLoop(progress) {
    const i = Math.min(LAST - 1, Math.floor(progress));
    const f = Math.min(1, progress - i);
    // the token hops in 6° steps, like a sprite on a grid
    const angle = Math.round((ANGLES[i] + (ANGLES[i + 1] - ANGLES[i]) * easeInOut(f)) / ORBIT_STEP) * ORBIT_STEP;
    orbit.setAttribute("transform", `rotate(${angle.toFixed(2)} 240 240)`);
    // the square token stays upright while the group carries it round
    token.setAttribute("transform", `rotate(${(-angle).toFixed(2)} 240 90)`);
    const lapAngle = angle >= 360 ? angle - 360 : angle;
    trail.style.strokeDashoffset = String(1 - lapAngle / 360);
    const next = Math.min(LAST, Math.floor(progress + 0.3));
    if (next !== beat) setBeat(next);
  }

  function resetLoop() {
    loop.classList.remove("is-live", "is-pinned");
    nodes.forEach((node) => node.classList.remove("is-active", "is-fail", "is-pass"));
    labels.forEach((label) => label.classList.remove("is-active"));
    logItems.forEach((item) => item.classList.remove("is-shown", "is-current"));
    orbit.removeAttribute("transform");
    token.removeAttribute("transform");
    trail.style.strokeDashoffset = "";
    stateLabel.textContent = t(lang, "loop.center");
    beat = -1;
  }

  mm.add({ pin: PIN_OK, motion: MOTION_OK }, (ctx) => {
    const { pin, motion } = ctx.conditions;
    if (!motion) return undefined;
    loop.classList.add("is-live");
    const proxy = { p: 0 };
    if (pin) {
      // large screens: scroll drives the token round the ring
      loop.classList.add("is-pinned");
      gsap.to(proxy, {
        p: LAST, ease: "none", onUpdate: () => renderLoop(proxy.p),
        scrollTrigger: { trigger: loop, start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
    } else {
      // small screens: the loop plays by itself while it is on screen
      const play = gsap.to(proxy, { p: LAST, duration: 11, ease: "none", repeat: -1, repeatDelay: 1.6, paused: true, onUpdate: () => renderLoop(proxy.p) });
      ScrollTrigger.create({ trigger: loop, start: "top 80%", end: "bottom 20%", onToggle: (self) => (self.isActive ? play.play() : play.pause()) });
    }
    renderLoop(0);
    return resetLoop;
  });

  // re-label the ring centre in the new language
  langListeners.push(() => { if (beat >= 0) setBeat(beat); });

  /* ---------- pattern diagrams: square dots hop along the edges while on screen ---------- */
  const patterns = $(".patterns");
  mm.add(MOTION_OK, () => {
    patterns.classList.add("is-live");
    $$(".pattern svg", patterns).forEach((svg) => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
      $$(".flow", svg).forEach((dot) => {
        // data-path holds centres; the rect is placed by its corner
        const half = Number(dot.getAttribute("width")) / 2;
        const points = dot.dataset.path.trim().split(/\s+/).map((pair) => pair.split(",").map((n) => Number(n) - half));
        const run = gsap.timeline();
        run.set(dot, { attr: { x: points[0][0], y: points[0][1] }, opacity: 0 }).to(dot, { opacity: 1, duration: 0.2, ease: "steps(2)" });
        points.slice(1).forEach(([x, y]) => run.to(dot, { attr: { x, y }, duration: 0.8, ease: "steps(8)" }));
        run.to(dot, { opacity: 0, duration: 0.25, ease: "steps(2)" });
        tl.add(run, Number(dot.dataset.delay || 0));
      });
      ScrollTrigger.create({ trigger: svg, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? tl.play() : tl.pause()) });
    });
    return () => patterns.classList.remove("is-live");
  });

  // copy height changes with web fonts and with the language: re-measure every trigger
  langListeners.push(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
})();
