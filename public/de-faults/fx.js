/* de-faults · pixel effects. Live pixel art from pixelfx (vendor/pixelfx.min.js, MIT) drawn into the
 * [data-fx] slots. Slots ship `hidden` and are decorative (aria-hidden), so the page reads the same without
 * this file. page.js reports progress with document events: defaults:level, defaults:beat, defaults:typed.
 * Reduced motion: only the hero gets one still frame; nothing plays. */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FPS = 30;
const STEP = 1 / FPS;

pixelateAvatar();
main().catch(() => { /* effects are decoration: a failed load leaves the page as it is */ });

// The avatar photo, resampled to 32 px and shown back at full size with crisp pixels.
function pixelateAvatar() {
  const img = $(".hero__avatar");
  if (!img) return;
  const SIZE = 32;
  const run = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    try {
      img.src = canvas.toDataURL("image/png");
      img.classList.add("is-pixel");
    } catch { /* a tainted canvas keeps the photo */ }
  };
  if (img.complete && img.naturalWidth) run();
  else img.addEventListener("load", run, { once: true });
}

async function main() {
  if (!("IntersectionObserver" in window)) return;
  const px = await import("/de-faults/vendor/pixelfx.min.js");

  /* ---------- a layer: one effect, played or held ---------- */
  // Effects with an act (level up, exclamation) bring the stock character; before their first frame he just stands.
  function layer(mod, x, y) {
    const acted = !!mod.act;
    const make = () => (acted ? px.createAct : px.createFx)(mod, { x, y });
    const l = {
      acted, inst: make(), playing: !!mod.meta.loop, shown: acted || !!mod.meta.loop,
      play() { l.inst = make(); l.playing = true; l.shown = true; },
      over() { return acted ? l.inst.done() : !mod.meta.loop && l.inst.t >= mod.meta.duration; },
      step(dt) {
        if (!l.playing) return;
        l.inst.update(dt);
        // a finished one-shot clears; a finished act holds its last pose
        if (l.over()) { l.playing = false; l.shown = acted; }
      },
      draw(frame) {
        if (!l.shown) return;
        if (acted) { l.inst.draw(frame); return; }
        l.inst.draw(frame, "back");
        l.inst.draw(frame, "front");
      },
    };
    return l;
  }

  /* ---------- a stage: one canvas, a few layers, ticked by the shared loop ---------- */
  const stages = [];
  function stage(slot, W, H) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("aria-hidden", "true");
    slot.append(canvas);
    slot.hidden = false;
    const s = {
      slot, ctx: canvas.getContext("2d"), frame: px.createFrame(W, H), img: new ImageData(W, H),
      layers: [], acc: 0, visible: false, dirty: true,
      tick(dt) {
        s.acc = Math.min(s.acc + dt, 0.25);
        while (s.acc >= STEP) {
          s.acc -= STEP;
          if (!s.busy()) break;
          s.layers.forEach((l) => l.step(STEP));
          s.dirty = true;
        }
        if (s.dirty) s.render();
      },
      render() {
        const f = px.clearFrame(s.frame);
        s.layers.forEach((l) => l.draw(f));
        px.composite(f, s.img.data, null);
        const acted = s.layers.find((l) => l.acted && l.playing);
        const [sx, sy] = acted ? acted.inst.shake : [0, 0];
        if (sx || sy) s.ctx.clearRect(0, 0, W, H);
        s.ctx.putImageData(s.img, sx, sy);
        s.dirty = false;
      },
      busy() { return s.layers.some((l) => l.playing); },
    };
    stages.push(s);
    return s;
  }

  // An act's stage: the effect's own canvas plus room for the whole performance, feet near the bottom.
  function actStage(slot, mod) {
    const b = px.actBounds(mod);
    const W = b.x1 - b.x0, H = Math.min(b.y1, 22) - b.y0;
    const s = stage(slot, W, H);
    return { s, x: -b.x0, y: Math.max(-b.y0 + 2, H - b.y1 - 2) };
  }

  /* ---------- the slots ---------- */
  const slots = {
    hero: $('[data-fx="fireflies"]'),
    level: $('[data-fx="levelUp"]'),
    cam: $('[data-fx="cam"]'),
    coin: $('[data-fx="coinCollect"]'),
    quest: $('[data-fx="questDone"]'),
  };

  if (slots.hero) {
    const [W, H] = px.fireflies.meta.size, [ox, oy] = px.fireflies.meta.origin;
    const s = stage(slots.hero, W, H);
    const l = layer(px.fireflies, ox, oy);
    s.layers.push(l);
    if (reduceMotion) {
      // one still frame of a busy moment, then nothing moves
      for (let t = 0; t < 4; t += STEP) l.inst.update(STEP);
      s.render();
      return;
    }
  }
  if (reduceMotion) return;

  let level = null;
  if (slots.level) {
    const { s, x, y } = actStage(slots.level, px.levelUp);
    level = layer(px.levelUp, x, y);
    s.layers.push(level);
  }

  // The loop's "agent cam": he stands in the ring, startles when Check fails, gets confetti when it passes.
  let startle = null, party = null;
  if (slots.cam) {
    const s = stage(slots.cam, 120, 120);
    startle = layer(px.exclamation, 60, 106);
    party = layer(px.confetti, 60, 106);
    s.layers.push(party, startle);
    $("#loop")?.classList.add("has-cam");
  }

  let coin = null;
  if (slots.coin) {
    const [W, H] = px.coinCollect.meta.size, [ox, oy] = px.coinCollect.meta.origin;
    const s = stage(slots.coin, W, H);
    coin = layer(px.coinCollect, ox, oy);
    s.layers.push(coin);
  }

  let quest = null;
  if (slots.quest) {
    const [W, H] = px.questDone.meta.size, [ox, oy] = px.questDone.meta.origin;
    const s = stage(slots.quest, W, H);
    quest = layer(px.questDone, ox, oy);
    s.layers.push(quest);
  }

  // slots changed the layout: let ScrollTrigger re-measure its pins
  window.ScrollTrigger?.refresh();

  /* ---------- triggers ---------- */
  const levels = $("#levels");
  document.addEventListener("defaults:level", (e) => {
    if (level && e.detail?.level === 2 && !level.playing) level.play();
  });

  let lastBeat = -1;
  document.addEventListener("defaults:beat", (e) => {
    const { beat, fail, pass } = e.detail || {};
    if (beat === lastBeat) return;
    lastBeat = beat;
    if (fail && startle) startle.play();
    if (pass && party) party.play();
  });

  document.addEventListener("defaults:typed", () => coin?.play());

  /* ---------- visibility: only stages on screen tick ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const s = stages.find((st) => st.slot === entry.target);
      if (!s) return;
      s.visible = entry.isIntersecting;
      // in normal flow (no pin), the level-up plays the first time its demo shows up
      if (s.visible && level && s.layers.includes(level) && !levels?.classList.contains("is-pinned") && !level.playing && entry.intersectionRatio >= 0.6) level.play();
      if (s.visible && quest && s.layers.includes(quest) && !quest.played) { quest.played = true; quest.play(); }
    });
    wake();
  }, { threshold: [0, 0.6] });
  stages.forEach((s) => io.observe(s.slot));

  /* ---------- one shared frame loop, asleep when nothing on screen moves ---------- */
  let raf = 0, last = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    const live = stages.filter((s) => s.visible && s.busy());
    live.forEach((s) => s.tick(dt));
    raf = live.some((s) => s.busy()) && !document.hidden ? requestAnimationFrame(frame) : 0;
  }
  function wake() {
    if (raf || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  ["defaults:level", "defaults:beat", "defaults:typed"].forEach((name) => document.addEventListener(name, wake));
  document.addEventListener("visibilitychange", wake);
  stages.forEach((s) => s.render());
}
