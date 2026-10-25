// Shooting stars over the city.
//
// On clear or cloudy nights a meteor crosses the window every 6–15 s (a rarer one at dawn), drawn in
// the glass shader (src/outside.js, uniforms uMeteor / uMeteorDir / uMeteorTail). Its path is chosen
// inside the part of the sky the current camera actually sees through the window, above the skyline.
// Catch one and make a wish: the count is kept per visitor.
//
// Small extras: about one in nine is a fireball (brighter, longer, faintly green, with a flare); on the
// peak nights of the big annual showers (studio time zone) meteors come more often and all fly away
// from one radiant; a wish leaves a small rising spark where the star was, with a soft chime if sound
// is on. Reduced motion: meteors are rarer and travel less; the spark only fades.
//
// Integration (main.js already does the first two):
//  - window click: `if (ctx.eggs.sky?.meteorVisible()) ui.toast(ctx.eggs.sky.wish())`, else the default
//    window action. wish() counts once per meteor; a second click on the same one returns a gentle
//    "one wish per star" line instead.
//  - tips.window: during a meteor the window's hover label becomes "Window · make a wish"; otherwise it
//    returns null and main's own label shows. api.tip() returns the same.
//  - keyboard: '*' makes the wish while a meteor is visible (shows the toast itself); ignored while
//    typing in a field, with Ctrl/Cmd/Alt, on key repeat, or while another overlay is open.
//  - testing: `?meteors=1` (every 2–4.5 s), `?meteors=shower` (shower night); `ctx.eggs.sky.launch()`
//    fires one now (visible at night/dawn only, the shader dims it by daylight, cloud and fog).
//  - no meteors when the window shows photo plates (content.json "window"), the sky is not drawn then.
//  - emits `ctx.emit('sky:wish', { count })` after each counted wish.
import * as THREE from '../three.js';
import { outsideUniforms } from '../outside.js';
import { studioZone } from '../content.js';

const KEY = 'sky.wishes';
const GRACE = 0.6;                       // a wish still counts this long after the meteor is gone
const SKY_MIN = 0.085;                   // keep paths above most of the skyline (tan of elevation)
const FALLBACK = { x0: -0.3, x1: 0.3, y0: 0.08, y1: 0.22 };

const STR = {
  en: {
    'sky.tip': 'Window · make a wish',
    'sky.wish.first': 'You caught a shooting star. Make a wish.',
    'sky.wish.second': 'Another one. A second wish, kept just as quiet.',
    'sky.wish.third': 'Three wishes now. The sky is generous tonight.',
    'sky.wish.seven': 'Seven wishes, enough for a small constellation.',
    'sky.wish.round': '{n} wishes. Surely one of them is on its way.',
    'sky.wish.n': 'Wish number {n}. The stars are keeping count.',
    'sky.wish.bright': 'That one was a fireball. Make it a big wish.',
    'sky.wish.dawn': 'The last shooting star before morning. Make a wish.',
    'sky.wish.shower': 'The {shower} are falling tonight. Make a wish.',
    'sky.wish.again': 'One wish per star. That one is already on its way.',
    'sky.wish.missed': 'Just missed it. Keep an eye on the window.',
    'sky.shower.quadrantids': 'Quadrantids', 'sky.shower.lyrids': 'Lyrids',
    'sky.shower.etaAquariids': 'Eta Aquariids', 'sky.shower.perseids': 'Perseids',
    'sky.shower.orionids': 'Orionids', 'sky.shower.leonids': 'Leonids', 'sky.shower.geminids': 'Geminids',
  },
  zh: {
    'sky.tip': '窗户 · 许个愿',
    'sky.wish.first': '你看见了流星，许个愿吧。',
    'sky.wish.second': '又一颗。第二个愿望，也悄悄地许。',
    'sky.wish.third': '已经三个愿望了，今晚的天空很大方。',
    'sky.wish.seven': '七个愿望，够拼成一个小星座了。',
    'sky.wish.round': '{n} 个愿望了，总有一个正在路上。',
    'sky.wish.n': '第 {n} 个愿望，星星都替你记着。',
    'sky.wish.bright': '是一颗火流星！许个大一点的愿望。',
    'sky.wish.dawn': '天亮前的最后一颗流星，许个愿吧。',
    'sky.wish.shower': '今晚有{shower}，许个愿吧。',
    'sky.wish.again': '一颗流星只许一个愿，它已经在路上了。',
    'sky.wish.missed': '慢了一步，它已经落下了。继续看着窗外。',
    'sky.shower.quadrantids': '象限仪座流星雨', 'sky.shower.lyrids': '天琴座流星雨',
    'sky.shower.etaAquariids': '宝瓶座η流星雨', 'sky.shower.perseids': '英仙座流星雨',
    'sky.shower.orionids': '猎户座流星雨', 'sky.shower.leonids': '狮子座流星雨', 'sky.shower.geminids': '双子座流星雨',
  },
};

// peak nights of the major annual showers: month, day, +- days
const SHOWERS = [
  { id: 'quadrantids', m: 1, d: 3, span: 1 },
  { id: 'lyrids', m: 4, d: 22, span: 1 },
  { id: 'etaAquariids', m: 5, d: 6, span: 1 },
  { id: 'perseids', m: 8, d: 12, span: 2 },
  { id: 'orionids', m: 10, d: 21, span: 2 },
  { id: 'leonids', m: 11, d: 17, span: 1 },
  { id: 'geminids', m: 12, d: 14, span: 1 },
];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const STUB = {
  actions: {}, tips: {}, keys: {},
  update() {},
  api: {
    meteorVisible: () => false, wishes: () => 0, wish: () => STR.en['sky.wish.missed'], tip: () => null,
    launch: () => false, shower: () => null, active: () => false,
  },
};

export function create(ctx) {
  try {
    return build(ctx || {});
  } catch (e) {
    console.warn('[sky] disabled:', e);
    return STUB;
  }
}

function build(ctx) {
  const U = outsideUniforms;
  const ok = !!(U && U.uMeteor && U.uMeteorDir && U.uMeteorTail);
  try { ctx.i18n?.extend?.(STR); } catch { /* strings fall back to English below */ }

  const t = (key, vars = {}) => {
    let s = '';
    try { s = ctx.i18n?.t ? ctx.i18n.t(key, vars) : ''; } catch { s = ''; }
    if (!s || s === key) s = (STR.en[key] || '').replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
    return s;
  };

  // ------------------------------------------------------------ shower nights
  const param = String(ctx.params?.get?.('meteors') || '').toLowerCase();
  const often = ['1', 'true', 'on', 'often', 'shower'].includes(param);
  const zone = studioZone(ctx.content);                              // '' = the visitor's local day
  const shower = findShower(zone) || (param === 'shower' ? nextShower(zone) : null);
  const radiant = { x: rand(-0.45, 0.45), y: rand(0.55, 0.8) };     // shower meteors all fly away from here
  let showerTold = false;

  // ------------------------------------------------------------ state
  let m = null;              // the meteor in flight
  let last = null;           // the most recent one (for wishes in the grace period)
  let since = Infinity;      // seconds since the last one ended
  let wait = null;           // countdown to the next one (null: not scheduled)
  let launched = 0;
  let wishedId = -1;
  let glassBox = null;
  const head = new THREE.Vector3(0, 0.1, -1).normalize();
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector2();

  const store = {
    get() { try { return Math.max(0, parseInt(ctx.store?.get?.(KEY), 10) || 0); } catch { return 0; } },
    set(n) { try { ctx.store?.set?.(KEY, n); } catch { /* private mode */ } },
  };

  // where the sky is seen through the window from the current camera, as (x, y) on the plane z = -1
  function viewCone() {
    try {
      const cam = ctx.camera;
      if (!cam) return FALLBACK;
      if (!glassBox) {
        const g = ctx.root?.getObjectByName?.('glass_window');
        if (!g) return FALLBACK;
        g.updateWorldMatrix?.(true, false);
        const b = new THREE.Box3().setFromObject(g);
        if (b.isEmpty() || b.max.z - b.min.z > 0.08) return FALLBACK;   // expect a pane facing -z
        glassBox = b;
      }
      const c = cam.getWorldPosition ? cam.getWorldPosition(tmpV) : cam.position;
      const dz = c.z - glassBox.max.z;
      if (!(dz > 0.3)) return FALLBACK;
      let x0 = (glassBox.min.x - c.x) / dz, x1 = (glassBox.max.x - c.x) / dz;
      let y0 = (glassBox.min.y - c.y) / dz, y1 = (glassBox.max.y - c.y) / dz;
      const ix = (x1 - x0) * 0.1, iy = (y1 - y0) * 0.1;           // keep clear of the frame
      x0 += ix; x1 -= ix;
      y0 = Math.max(y0 + iy, SKY_MIN); y1 = Math.min(y1 - iy, 0.6);
      if (x1 - x0 < 0.08 || y1 - y0 < 0.05) return FALLBACK;
      return { x0, x1, y0, y1 };
    } catch {
      return FALLBACK;
    }
  }

  // angular size of one drawing-buffer pixel, so the trail stays about a pixel and a half wide
  function pixelAngle() {
    try {
      const cam = ctx.camera;
      const fov = ((cam?.getEffectiveFOV ? cam.getEffectiveFOV() : cam?.fov) || 50) * Math.PI / 180;
      const h = ctx.renderer?.getDrawingBufferSize ? ctx.renderer.getDrawingBufferSize(tmpV2).y : 0;
      return fov / Math.max(200, h || (globalThis.innerHeight || 800) * (globalThis.devicePixelRatio || 1));
    } catch {
      return 0.001;
    }
  }

  function pickPath(cone, bright) {
    const { x0, x1, y0, y1 } = cone;
    const want = rand(0.13, 0.22) * (ctx.still ? 0.65 : 1) * (bright ? 1.15 : 1);
    let best = null;
    for (let i = 0; i < 12; i++) {
      const sx = rand(x0, x1), sy = y0 + (y1 - y0) * rand(0.4, 1);
      let dx, dy;
      if (shower) {
        dx = sx - radiant.x; dy = sy - radiant.y;
        const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
        if (dy > -0.15) continue;                                   // only the ones falling
      } else {
        const side = Math.random() < 0.5 ? -1 : 1, phi = rand(0.22, 0.8);   // downward and sideways
        dx = side * Math.cos(phi); dy = -Math.sin(phi);
      }
      const tx = dx > 0 ? (x1 - sx) / dx : dx < 0 ? (x0 - sx) / dx : Infinity;
      const ty = dy > 0 ? (y1 - sy) / dy : dy < 0 ? (y0 - sy) / dy : Infinity;
      const L = Math.min(want, Math.min(tx, ty) * 0.94);
      if (!best || L > best.L) best = { sx, sy, dx, dy, L };
      if (L >= want * 0.85) break;
    }
    if (!best || !(best.L > 0.05)) {
      const phi = rand(0.25, 0.6), side = Math.random() < 0.5 ? -1 : 1;
      best = { sx: (x0 + x1) / 2 - side * want * 0.4, sy: y1, dx: side * Math.cos(phi), dy: -Math.sin(phi), L: want };
    }
    const S = new THREE.Vector3(best.sx, best.sy, -1).normalize();
    const E = new THREE.Vector3(best.sx + best.dx * best.L, best.sy + best.dy * best.L, -1).normalize();
    const ang = S.angleTo(E);
    const T = E.clone().addScaledVector(S, -S.dot(E));
    if (T.lengthSq() < 1e-10) return null;
    T.normalize();
    return { S, T, ang };
  }

  function launch(opts = {}) {
    try {
      if (!ok) return false;
      const bright = opts.bright ?? Math.random() < 1 / 9;
      const path = pickPath(viewCone(), bright);
      if (!path) return false;
      m = {
        ...path,
        id: ++launched,
        kind: opts.kind || 'night',
        bright,
        age: 0,
        dur: bright ? rand(0.95, 1.1) : rand(0.7, 1.05),
        peak: (bright ? 1.45 : rand(0.8, 1.05)) * (opts.kind === 'dawn' ? 1.15 : 1),
        tail: rand(0.1, 0.15) * (bright ? 1.3 : 1),
        width: Math.max(0.0006, pixelAngle() * 0.85) * (bright ? 1.45 : 1),
        tint: bright ? 0.7 : 0,
      };
      last = m;
      since = 0;
      step(0);
      return true;
    } catch (e) {
      console.warn('[sky] launch failed:', e);
      m = null;
      return false;
    }
  }

  function step(dt) {
    m.age += dt;
    const k = clamp01(m.age / m.dur);
    const p = k * (1.15 - 0.15 * k);                                 // nearly constant speed, settles at the end
    const h = m.ang * p;
    let env = smooth(0, 0.2, k) * (1 - smooth(0.62, 1, k));          // ease in, ease out
    if (m.bright) env *= 1 + 0.7 * Math.exp(-(((k - 0.7) / 0.07) ** 2));   // the fireball flares once
    const { S, T } = m;
    U.uMeteor.value.set(S.x, S.y, S.z, env * m.peak);
    U.uMeteorDir.value.set(T.x, T.y, T.z, h);
    U.uMeteorTail.value.set(m.tail, m.width, m.tint, 0);
    head.copy(S).multiplyScalar(Math.cos(h)).addScaledVector(T, Math.sin(h));
    if (k >= 1) end();
  }

  function end() {
    m = null;
    since = 0;
    if (ok) U.uMeteor.value.w = 0;
  }

  // night or dawn sky with clear or broken cloud, and nothing in the way of the procedural sky
  function skyOpen(frame) {
    if (!frame || frame.entered === false) return null;
    if ((U.uPlates?.value || 0) > 0.5) return null;
    const wx = ctx.climate?.weather;
    if (wx && wx !== 'clear' && wx !== 'cloudy') return null;
    if ((+frame.night || 0) > 0.6) return 'night';
    if ((+frame.dawn || 0) > 0.6) return 'dawn';
    return null;
  }

  function interval(kind) {
    let lo = 6, hi = 15;
    if (kind === 'dawn') { lo = 16; hi = 32; }
    else if (shower) { lo = 3; hi = 7; }
    if (often) { lo = Math.min(lo, 2); hi = Math.min(hi, 4.5); }
    if (ctx.still) { lo *= 1.8; hi *= 1.8; }
    return rand(lo, hi);
  }

  const visible = () => !!m || since < GRACE;

  // ------------------------------------------------------------ the wish
  function sparkle() {
    try {
      if (typeof document === 'undefined' || !ctx.camera || !document.body) return;
      const cam = ctx.camera;
      const c = cam.getWorldPosition ? cam.getWorldPosition(new THREE.Vector3()) : cam.position.clone();
      const p = c.addScaledVector(head, 30).project(cam);
      if (!(p.z < 1) || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) return;
      const r = ctx.renderer?.domElement?.getBoundingClientRect?.() || { left: 0, top: 0, width: innerWidth, height: innerHeight };
      const el = document.createElement('div');
      el.className = 'sky-wish' + (ctx.still ? ' still' : '');
      el.setAttribute('aria-hidden', 'true');
      el.style.left = `${Math.round(r.left + (p.x + 1) / 2 * r.width)}px`;
      el.style.top = `${Math.round(r.top + (1 - p.y) / 2 * r.height)}px`;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const star = document.createElementNS(NS, 'path');
      star.setAttribute('d', 'M12 2.5l1.6 7.9 7.9 1.6-7.9 1.6L12 21.5l-1.6-7.9L2.5 12l7.9-1.6z');
      star.setAttribute('class', 'sky-wish-star');
      svg.appendChild(star);
      for (const [cx, cy, rr, cls] of [[4.5, 5.5, 0.9, 'a'], [19.5, 18, 0.7, 'b']]) {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', rr);
        dot.setAttribute('class', `sky-wish-dot ${cls}`);
        svg.appendChild(dot);
      }
      el.appendChild(svg);
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('go'));
      setTimeout(() => el.remove(), 2200);
    } catch { /* decoration only */ }
  }

  function chime(bright) {
    try {
      const s = ctx.sound;
      const on = typeof ctx.soundOn === 'function' ? ctx.soundOn() : s?.enabled;
      if (!s?.ctx || !on || typeof s.tone !== 'function') return;
      const notes = bright ? [1318.5, 1975.5, 2637] : [1568, 2349.3];
      notes.forEach((f, i) => {
        s.tone(f, 0.026, 0.004, 1.5, 'sine', i * 0.12);
        s.tone(f * 2.01, 0.006, 0.004, 0.6, 'sine', i * 0.12);
      });
    } catch { /* silence is fine */ }
  }

  // another module's overlay (diary, terminal, library, photo, the info panel...) covers the window
  function overlayOpen() {
    try {
      const E = ctx.eggs || {};
      for (const k of Object.keys(E)) {
        if (k === 'sky') continue;
        try { if (E[k]?.isOpen?.()) return true; } catch { /* ignore a broken api */ }
      }
      return !!document.querySelector('#panel[data-open="true"], [role="dialog"][data-open="true"], [aria-modal="true"][data-open="true"]');
    } catch { return false; }
  }

  function wish() {
    try {
      if (!visible()) return t('sky.wish.missed');
      const info = m || last || {};
      const id = info.id ?? 0;
      if (id === wishedId) return t('sky.wish.again');
      wishedId = id;
      const n = store.get() + 1;
      store.set(n);
      sparkle();
      chime(!!info.bright);
      try { ctx.emit?.('sky:wish', { count: n }); } catch { /* no listeners */ }
      if (n === 1) return t('sky.wish.first');
      if (info.bright) return t('sky.wish.bright');
      if (info.kind === 'dawn') return t('sky.wish.dawn');
      if (shower && !showerTold) { showerTold = true; return t('sky.wish.shower', { shower: t(`sky.shower.${shower.id}`) }); }
      if (n === 2) return t('sky.wish.second');
      if (n === 3) return t('sky.wish.third');
      if (n === 7) return t('sky.wish.seven');
      if (n % 10 === 0) return t('sky.wish.round', { n });
      return t('sky.wish.n', { n });
    } catch {
      return STR.en['sky.wish.first'];
    }
  }

  return {
    actions: {},
    tips: {
      window: () => (visible() ? t('sky.tip') : null),
    },
    keys: {
      '*': (e) => {
        try {
          if (!visible()) return false;
          // a '*' typed into a field, a shortcut chord or a held key is not a wish; nor is one made
          // while an overlay hides the window
          if (e?.ctrlKey || e?.metaKey || e?.altKey || e?.isComposing || e?.repeat) return false;
          if (isTextField(e?.target) || isTextField(document.activeElement)) return false;
          if (overlayOpen()) return false;
          ctx.ui?.toast?.(wish(), 4200);
          return true;
        } catch { return false; }
      },
    },
    update(dt, frame) {
      try {
        if (!ok) return;
        dt = Math.min(Math.max(+dt || 0, 0), 0.1);
        if (m) { step(dt); return; }
        since += dt;
        const kind = skyOpen(frame);
        if (!kind) { wait = null; return; }
        if (wait == null) wait = launched ? interval(kind) : Math.min(interval(kind), rand(3, 7));
        wait -= dt;
        if (wait <= 0) { wait = null; launch({ kind }); }
      } catch (e) {
        console.warn('[sky] update:', e);
        m = null;
        if (ok) U.uMeteor.value.w = 0;
      }
    },
    api: {
      meteorVisible: () => visible(),
      wishes: () => store.get(),
      wish,
      tip: () => (visible() ? t('sky.tip') : null),
      launch: (opts) => launch(opts || {}),
      shower: () => (shower ? { id: shower.id, name: t(`sky.shower.${shower.id}`) } : null),
      active: () => !!m,
    },
  };
}

// focus is somewhere the visitor types (inputs, textareas, selects, editable regions)
function isTextField(n) {
  try {
    return !!n?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
  } catch { return false; }
}

// month and day "now" in the studio's time zone; tz comes from studioZone(): a valid IANA zone, or ''
// for the visitor's local day (studioZone has already warned about a bad value)
function studioDay(tz) {
  const now = new Date();
  if (!tz) return { m: now.getMonth() + 1, d: now.getDate() };
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'numeric', day: 'numeric' }).formatToParts(now);
  const get = (type) => +(parts.find((p) => p.type === type)?.value || 0);
  return { m: get('month'), d: get('day') };
}

function findShower(tz) {
  const { m, d } = studioDay(tz);
  return SHOWERS.find((s) => s.m === m && Math.abs(s.d - d) <= s.span) || null;
}

function nextShower(tz) {
  const { m, d } = studioDay(tz);
  const key = m * 40 + d;
  return SHOWERS.find((s) => s.m * 40 + s.d >= key) || SHOWERS[0];
}
