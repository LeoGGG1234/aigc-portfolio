// moments: the instant camera on the window sill, and a secret afterparty (the Konami code).
//
// Integration notes
// - Hit box `hit_camera` -> actions.camera; tips.camera is the hover label.
// - keys: ArrowUp / ArrowDown / ArrowLeft / ArrowRight / a / A / b / B feed the Konami tracker. With the photo
//   closed they return false, except the final `a` that completes the code (true) and the <- / -> that
//   continue a code already past up up down down (true, so ui.js does not flip works or move the camera to
//   the projector; the party then plays in the view it was typed in). A wrong arrow breaks the code and
//   reaches the room as usual; the cost is that one <- / -> right after up up down down never flips a work.
//   While the photo is open, ArrowLeft / ArrowRight also return true so the work behind it does not change.
//   Escape returns true only when the photo was open and closed. A capture-phase window keydown listener
//   resets the tracker when any other key is pressed, and while the photo is open it stops the room's
//   one-letter shortcuts (t / w / s / l / m) with stopImmediatePropagation; otherwise it prevents nothing.
// - Afterparty writes ctx.fx.lampColor (one THREE.Color, mutated each frame) and ctx.fx.fairyChase, and
//   restores null / 0 when it ends. Lights mode comes from ctx.on('state') (fallback: the lights dial's
//   data-mode). When the lamps are effectively off (mode 'off', or 'auto' while main's auto level would be
//   below 0.9; the estimate mirrors main.js's autoLamps formula from frame weights + ctx.climate.wx) the party
//   calls H.lights('warm') and restores the earlier mode afterwards if the dial is still on 'warm'.
// - Music: ctx.eggs.music.play() and stop() (or pause()); state from its isPlaying() (also `playing` /
//   `paused` / `state.playing`). When that state cannot be read the party leaves music alone. Without a music
//   module (and with no site.music file, so main's record also plays the lo-fi loop) the built-in loop stands in:
//   the party sets ctx.sound.musicOn with it so main's record toggle stays in step, and stops it afterwards only
//   if that same loop (ctx.sound.lofiTimer) is still running.
// - The photo modal (z-index 25) and party chip (z-index 12) are appended to <body>; styles/eggs-moments.css
//   must be linked from index.html. Adds an `i-download` <symbol> to the sprite when it is missing.
// - The print's frame comes from ctx.captureCanvas({ size: 960, square: true }) (fallback: ctx.capture()); the
//   finished print is encoded once (toBlob) and its object URL feeds both the <img> and the download link.
// - api: polaroid() -> Promise<photo|null>, party() -> boolean,
//   lastPhoto() -> { src, blob, filename, takenAt, width, height } | null (src is the blob URL while the photo is
//   open, '' after it closed and the URL was revoked; blob stays usable)
import * as THREE from '../three.js';

const W = 1080, H = 1320;            // instant-film print, ~88 x 107 mm
const PX = 60, PY = 64, PS = 960;    // the square photo inside the frame
const PARTY_SECONDS = 30, PARTY_MAX = 120, FADE_IN = 1.0, FADE_OUT = 1.6;
const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const CODE_KEYS = new Set(CODE);
const ROOM_SHORTCUTS = new Set(['t', 'w', 's', 'l', 'm']);   // ui.js one-letter room keys
const MODIFIERS = new Set(['shift', 'control', 'alt', 'meta', 'capslock', 'os', 'fn', 'altgraph', 'dead', 'process', 'unidentified']);
const FONT = 'system-ui, -apple-system, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif';
const SVGNS = 'http://www.w3.org/2000/svg';
const WARM = [1.0, 0.62, 0.32];      // main's warm lamp colour, the party fades from and back to it
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STRINGS = {
  en: {
    'moments.tip': 'Instant camera · take a photo',
    'moments.dialog': 'Instant photo',
    'moments.kicker': 'Instant camera',
    'moments.title': 'A moment in the studio',
    'moments.developing': 'Developing… give it a few seconds.',
    'moments.shake': 'Shaking it won’t help. It does feel nice, though.',
    'moments.developed': 'Developed. Yours to keep.',
    'moments.download': 'Download',
    'moments.close': 'Close',
    'moments.no': 'No. {n}',
    'moments.studio': '{name}’s studio',
    'moments.studioNone': 'The studio',
    'moments.alt': 'Instant photo of the studio: {line}',
    'moments.fail': 'The camera jammed. Try again?',
    'moments.party': 'Afterparty',
    'moments.encore': 'Encore! Thirty more seconds',
    'moments.partyEnd': 'Party’s over. {cat} can finally get some sleep.',
    'moments.partyEndNoCat': 'Party’s over.',
    'moments.chip': 'Afterparty',
    'moments.end': 'End',
    'moments.endLabel': 'End the afterparty',
  },
  zh: {
    'moments.tip': '拍立得 · 拍一张',
    'moments.dialog': '拍立得照片',
    'moments.kicker': '拍立得',
    'moments.title': '工作室里的一瞬间',
    'moments.developing': '正在显影……稍等几秒。',
    'moments.shake': '摇它其实没用，不过挺解压的。',
    'moments.developed': '显影完成，送给你。',
    'moments.download': '下载',
    'moments.close': '关闭',
    'moments.no': '第 {n} 张',
    'moments.studio': '{name}的工作室',
    'moments.studioNone': '工作室',
    'moments.alt': '工作室的拍立得照片：{line}',
    'moments.fail': '相机卡住了，再试一次？',
    'moments.party': '午夜派对',
    'moments.encore': '安可！再来三十秒',
    'moments.partyEnd': '派对散场，{cat}终于可以睡觉了。',
    'moments.partyEndNoCat': '派对散场了。',
    'moments.chip': '午夜派对',
    'moments.end': '结束',
    'moments.endLabel': '结束派对',
  },
};

const pad = (n) => String(n).padStart(2, '0');
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowS = () => performance.now() / 1000;

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

function icon(id) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.appendChild(use);
  return svg;
}

function ensureIcons() {
  try {
    const defs = document.querySelector('svg defs');
    if (!defs || document.getElementById('i-download')) return;
    const s = document.createElementNS(SVGNS, 'symbol');
    s.setAttribute('id', 'i-download');
    s.setAttribute('viewBox', '0 0 24 24');
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14');
    s.appendChild(p);
    defs.appendChild(s);
  } catch { /* the button still has its text */ }
}

const loadImage = (src) => new Promise((resolve) => {
  if (!src) { resolve(null); return; }
  const im = new Image();
  im.onload = () => resolve(im);
  im.onerror = () => resolve(null);
  im.src = src;
});

async function fontsReady() {
  try {
    if (!document.fonts?.load) return;
    await Promise.race([
      Promise.all([document.fonts.load('italic 64px "Instrument Serif"'), document.fonts.load('italic 34px "Instrument Serif"')]),
      sleep(1500),
    ]);
  } catch { /* falls back to Georgia */ }
}

// ------------------------------------------------------------------ print composition

function drawPaper(g) {
  g.fillStyle = '#f1ebdf';
  g.fillRect(0, 0, W, H);
  const lg = g.createLinearGradient(0, 0, W * 0.45, H);
  lg.addColorStop(0, 'rgba(255, 253, 247, .55)');
  lg.addColorStop(1, 'rgba(206, 193, 170, .32)');
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {             // paper fibres
    g.fillStyle = `rgba(110, 90, 70, ${(Math.random() * 0.06).toFixed(3)})`;
    const s = 1 + Math.random() * 1.4;
    g.fillRect(Math.random() * W, Math.random() * H, s, s);
  }
  g.strokeStyle = 'rgba(120, 100, 80, .22)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, W - 2, H - 2);
}

// a dark room, if the frame could not be captured
function drawDarkRoom(g) {
  const rg = g.createRadialGradient(PS * 0.58, PS * 0.42, 10, PS * 0.5, PS * 0.5, PS * 0.8);
  rg.addColorStop(0, '#7a5a3e');
  rg.addColorStop(0.35, '#3b2c22');
  rg.addColorStop(1, '#120e0b');
  g.fillStyle = rg;
  g.fillRect(0, 0, PS, PS);
  const lamp = g.createRadialGradient(PS * 0.7, PS * 0.36, 0, PS * 0.7, PS * 0.36, PS * 0.22);
  lamp.addColorStop(0, 'rgba(255, 210, 150, .55)');
  lamp.addColorStop(1, 'rgba(255, 210, 150, 0)');
  g.fillStyle = lamp;
  g.fillRect(0, 0, PS, PS);
}

// warm, faded instant-film grade: lifted blacks, softer whites, cool shadows, warm highlights, vignette, grain
function grade(g) {
  const im = g.getImageData(0, 0, PS, PS);
  const d = im.data;
  const c = PS / 2;
  for (let y = 0; y < PS; y++) {
    const dy = (y - c) / c, dy2 = dy * dy;
    for (let x = 0; x < PS; x++) {
      const i = (y * PS + x) * 4;
      let r = d[i] / 255, gr = d[i + 1] / 255, b = d[i + 2] / 255;
      const l = 0.299 * r + 0.587 * gr + 0.114 * b;
      r = l + (r - l) * 0.82; gr = l + (gr - l) * 0.82; b = l + (b - l) * 0.82;
      const sh = (1 - l) * (1 - l), hi = l * l;
      r = 0.07 + r * 0.87 - 0.012 * sh + 0.05 * hi;
      gr = 0.064 + gr * 0.86 + 0.014 * sh + 0.022 * hi;
      b = 0.058 + b * 0.8 + 0.034 * sh - 0.04 * hi;
      const dx = (x - c) / c, rr = (dx * dx + dy2) * 0.5;
      const v = 1 - 0.3 * rr * Math.sqrt(rr);
      const n = (Math.random() - 0.5) * 0.04;
      d[i] = (r * v + n) * 255;
      d[i + 1] = (gr * v + n) * 255;
      d[i + 2] = (b * v * 0.98 + n) * 255;
    }
  }
  g.putImageData(im, 0, 0);
}

function lightLeak(g) {
  const corners = [[0, 0], [PS, 0], [0, PS], [PS, PS]];
  const [x, y] = corners[Math.floor(Math.random() * corners.length)];
  const rg = g.createRadialGradient(x, y, 0, x, y, PS * 0.72);
  rg.addColorStop(0, 'rgba(255, 150, 70, .2)');
  rg.addColorStop(0.5, 'rgba(255, 120, 60, .06)');
  rg.addColorStop(1, 'rgba(255, 120, 60, 0)');
  g.globalCompositeOperation = 'screen';
  g.fillStyle = rg;
  g.fillRect(0, 0, PS, PS);
  g.globalCompositeOperation = 'source-over';
}

// the room at the shutter: ctx.captureCanvas hands over a PS x PS canvas (no JPEG encode / decode); hosts
// without it only have capture()'s full-frame data URL, decoded here. null when neither works.
async function grabFrame(ctx) {
  try {
    const c = ctx?.captureCanvas?.({ size: PS, square: true });
    if (c && c.width > 0 && c.height > 0) return c;
  } catch { /* try capture() */ }
  try {
    let src = ctx?.capture?.() ?? null;
    if (src && typeof src.then === 'function') src = await src;
    return typeof src === 'string' ? await loadImage(src) : null;
  } catch { return null; }
}

// the graded square photo; a captured PS x PS canvas is graded in place, anything else is centre-cropped into one
function photoCanvas(frame) {
  let c = null, g = null;
  if (typeof HTMLCanvasElement !== 'undefined' && frame instanceof HTMLCanvasElement && frame.width === PS && frame.height === PS) {
    try { g = frame.getContext('2d'); } catch { g = null; }
    if (g) c = frame;
  }
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = PS;
    g = c.getContext('2d', { willReadFrequently: true });
    const iw = frame?.naturalWidth || frame?.width || 0, ih = frame?.naturalHeight || frame?.height || 0;
    if (iw && ih) {
      const s = Math.min(iw, ih);
      g.drawImage(frame, (iw - s) / 2, (ih - s) / 2, s, s, 0, 0, PS, PS);
    } else drawDarkRoom(g);
  }
  try { grade(g); } catch { /* tainted or out of memory: keep it ungraded */ }
  lightLeak(g);
  return c;
}

// one JPEG encode (off the main thread where the browser can) -> Blob, or null
const toJpeg = (cv, q) => new Promise((resolve) => {
  try { cv.toBlob((b) => resolve(b || null), 'image/jpeg', q); } catch { resolve(null); }
});

// handwriting: per-glyph wobble in baseline, angle and ink
function hand(g, text, cx, y, size, color, rot, maxW = PS - 40) {
  if (!text) return;
  const chars = Array.from(text);
  let s = size, widths = [], total = 0;
  const measure = () => {
    g.font = `300 ${s}px ${FONT}`;
    widths = chars.map((ch) => g.measureText(ch).width);
    total = widths.reduce((a, b) => a + b, 0);
  };
  measure();
  while (total > maxW && s > 16) { s -= 2; measure(); }
  g.save();
  g.fillStyle = color;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.translate(cx, y);
  g.rotate(rot);
  let x = -total / 2;
  chars.forEach((ch, i) => {
    const w = widths[i];
    g.save();
    g.globalAlpha = 0.84 + Math.random() * 0.16;
    g.translate(x + w / 2, (Math.random() - 0.5) * s * 0.06);
    g.rotate((Math.random() - 0.5) * 0.06);
    g.fillText(ch, -w / 2, 0);
    g.restore();
    x += w;
  });
  g.restore();
}

// ------------------------------------------------------------------ module

export function create(ctx) {
  const i18n = ctx?.i18n;
  try { i18n?.extend?.(STRINGS); } catch { /* fallback strings below */ }
  const lang = () => (i18n?.lang === 'zh' ? 'zh' : 'en');
  const t = (k, vars = {}) => {
    try {
      const s = i18n?.t?.(k, vars);
      if (s && s !== k) return s;
    } catch { /* fall through */ }
    const raw = STRINGS[lang()]?.[k] ?? STRINGS.en[k] ?? k;
    return raw.replace(/\{(\w+)\}/g, (_, v) => (v in vars ? vars[v] : ''));
  };
  const pick = (v) => {
    try { if (i18n?.pick) return i18n.pick(v) || ''; } catch { /* below */ }
    if (v == null) return '';
    return typeof v === 'string' ? v : (v[lang()] || v.en || '');
  };
  const toast = (text, ms) => { try { ctx.ui?.toast?.(text, ms); } catch { /* no toast */ } };
  const soundIsOn = () => {
    try { if (typeof ctx.soundOn === 'function') return !!ctx.soundOn(); } catch { /* below */ }
    return !!ctx.sound?.enabled;
  };
  const climateLabel = () => { try { return ctx.climate?.label?.(i18n) || ''; } catch { return ''; } };
  const climateSnap = () => {
    const c = ctx.climate;
    return c && typeof c.season === 'string' ? { season: c.season, weather: c.weather, time: c.time } : null;
  };
  // the label for a captured climate, in the current language (label() only reads season / weather / time)
  const climateLabelOf = (snap, fallback = '') => {
    try {
      const s = snap && ctx.climate?.label?.call(snap, i18n);
      if (typeof s === 'string' && s && !/undefined/.test(s)) return s;
    } catch { /* below */ }
    return fallback;
  };

  const dateText = (d) => (lang() === 'zh'
    ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  const timeText = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fileName = (d) => `studio-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.jpg`;
  const studioLine = () => {
    const name = String(pick(ctx.content?.site?.name) || '').trim();
    return name ? t('moments.studio', { name }) : t('moments.studioNone');
  };

  let entered = true;
  let lastFrame = null;
  let lightsState = null;
  try { ctx.on?.('state', (s) => { if (s && typeof s.lights === 'string') lightsState = s.lights; }); } catch { /* DOM fallback */ }
  const lightsMode = () => {
    if (lightsState) return lightsState;
    try {
      return document.querySelector('.dial[data-kind="lights"]')?.dataset.mode
        || document.querySelector('[data-lights].on')?.dataset.lights || null;
    } catch { return null; }
  };
  // roughly how bright main's 'auto' lamps are right now (mirrors autoLamps in main.js)
  const autoLampLevel = () => {
    try {
      const f = lastFrame, wx = ctx.climate?.wx || {};
      const num = (v) => (Number.isFinite(v) ? v : 0);
      if (f && [f.dawn, f.day, f.dusk, f.night].every(Number.isFinite)) {
        const x = f.night + f.dusk * 0.55 + f.dawn * 0.45;
        return clamp01(THREE.MathUtils.smoothstep(x, 0.3, 0.9)
          + num(wx.cloud) * 0.45 * f.day + num(wx.storm) * 0.3 + num(wx.snow) * 0.2 * f.day);
      }
      return ctx.climate?.time === 'night' ? 1 : 0;
    } catch { return 0; }
  };

  // ---------------------------------------------------------------- shutter sound
  let noise = null;
  function noiseBuffer(ac) {
    if (ctx.sound?.white && ctx.sound.white.sampleRate === ac.sampleRate) return ctx.sound.white;
    if (noise && noise.sampleRate === ac.sampleRate) return noise;
    const n = Math.floor(ac.sampleRate * 1.5);
    noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }
  function burst(ac, buf, dest, t, a, dcy, peak, type, freq, q) {
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * Math.max(0, buf.duration - 0.2));
    src.stop(t + a + dcy + 0.05);
  }
  function shutter() {
    const S = ctx.sound, ac = S?.ctx;
    if (!ac || !soundIsOn()) return;
    try {
      const dest = S.bus || ac.destination;
      const buf = noiseBuffer(ac);
      const t0 = ac.currentTime + 0.005;
      // the shutter: a sharp blade tick, then the mirror landing
      burst(ac, buf, dest, t0, 0.001, 0.028, 0.32, 'bandpass', 3200, 1.6);
      burst(ac, buf, dest, t0 + 0.045, 0.001, 0.045, 0.22, 'bandpass', 1700, 1.2);
      S.tone?.(1900, 0.04, 0.001, 0.02, 'square', 0.005);
      S.tone?.(140, 0.12, 0.002, 0.07, 'sine', 0.045);
      // the motor pushing the print out: a geared sawtooth buzz plus a little friction noise
      const w0 = t0 + 0.22, dur = 0.95;
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, w0);
      osc.frequency.linearRampToValueAtTime(96, w0 + 0.12);
      osc.frequency.linearRampToValueAtTime(88, w0 + dur);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 760; lp.Q.value = 0.8;
      const am = ac.createGain();
      am.gain.value = 0.6;
      const lfo = ac.createOscillator();
      lfo.frequency.value = 34;
      const lfoG = ac.createGain();
      lfoG.gain.value = 0.4;
      lfo.connect(lfoG); lfoG.connect(am.gain);
      const ns = ac.createBufferSource();
      ns.buffer = buf; ns.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
      const ng = ac.createGain();
      ng.gain.value = 0.35;
      const out = ac.createGain();
      out.gain.setValueAtTime(0.0001, w0);
      out.gain.linearRampToValueAtTime(0.07, w0 + 0.05);
      out.gain.setValueAtTime(0.065, w0 + dur - 0.12);
      out.gain.exponentialRampToValueAtTime(0.0001, w0 + dur);
      osc.connect(lp); lp.connect(am);
      ns.connect(bp); bp.connect(ng); ng.connect(am);
      am.connect(out); out.connect(dest);
      for (const s of [osc, lfo, ns]) { s.start(w0); s.stop(w0 + dur + 0.05); }
      // the print clears the rollers
      burst(ac, buf, dest, w0 + dur - 0.02, 0.002, 0.05, 0.08, 'bandpass', 2400, 1.4);
    } catch { /* sound is a nicety */ }
  }

  function flash() {
    if (ctx.still) return;
    try {
      const f = el('div', 'mo-flash', document.body);
      f.setAttribute('aria-hidden', 'true');
      setTimeout(() => f.remove(), 240);
    } catch { /* no flash */ }
  }

  // ---------------------------------------------------------------- the photo modal
  let M = null;
  let prevFocus = null;
  let last = null;
  let blobUrl = '';
  let shooting = false;

  function modal() {
    if (M) return M;
    ensureIcons();
    const root = el('div', 'mo-modal');
    root.dataset.open = 'false';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'mo-title');
    root.tabIndex = -1;            // clicks inside keep focus (and Esc / Tab) within the dialog
    const backdrop = el('div', 'mo-backdrop', root);
    const stage = el('div', 'mo-stage', root);
    const print = el('figure', 'mo-print', stage);
    const paper = el('div', 'mo-paper', print);
    const img = el('img', 'mo-img', paper);
    img.decoding = 'async';
    const desat = el('i', 'mo-desat', paper);
    const milk = el('i', 'mo-milk', paper);
    desat.setAttribute('aria-hidden', 'true');
    milk.setAttribute('aria-hidden', 'true');
    const side = el('section', 'mo-side surface', stage);
    const kicker = el('p', 'mo-kicker', side);
    const title = el('h3', 'mo-title', side);
    title.id = 'mo-title';
    title.tabIndex = -1;           // focus lands here when the camera was clicked (see openPhoto)
    const meta = el('p', 'mo-meta', side);
    const status = el('p', 'mo-status', side);
    status.setAttribute('aria-live', 'polite');
    const row = el('div', 'mo-actions', side);
    const dl = el('a', 'mo-dl', row);
    dl.appendChild(icon('i-download'));
    const dlText = el('span', '', dl);
    const close = el('button', 'mo-close', row);
    close.type = 'button';
    document.body.appendChild(root);

    M = { root, print, paper, img, desat, milk, kicker, title, meta, status, dl, dlText, close, state: 'idle', devTimer: 0, shaken: false };
    backdrop.addEventListener('click', () => closePhoto());
    close.addEventListener('click', () => closePhoto());
    print.addEventListener('click', shake);
    milk.addEventListener('animationend', () => developed());
    root.addEventListener('keydown', onModalKey);
    renderModal();
    return M;
  }

  function renderModal() {
    if (!M) return;
    M.root.setAttribute('aria-label', t('moments.dialog'));
    M.kicker.textContent = t('moments.kicker');
    M.title.textContent = t('moments.title');
    M.dlText.textContent = t('moments.download');
    M.close.textContent = t('moments.close');
    if (last) {
      M.meta.textContent = [dateText(last.when), timeText(last.when), t('moments.no', { n: last.n })].join(' · ');
      const clim = climateLabelOf(last.clim, last.lang === lang() ? last.climText : '');
      M.img.alt = t('moments.alt', { line: [studioLine(), clim, dateText(last.when)].filter(Boolean).join(' · ') });
    }
    const key = { developing: 'moments.developing', shaken: 'moments.shake', developed: 'moments.developed' }[M.state];
    M.status.textContent = key ? t(key) : '';
    M.status.classList.toggle('is-pending', M.state === 'developing' || M.state === 'shaken');
  }

  function developed() {
    if (!M || M.state === 'developed') return;
    clearTimeout(M.devTimer);
    M.state = 'developed';
    renderModal();
  }

  function shake() {
    if (!M || ctx.still) return;
    try {
      M.paper.classList.remove('is-shaking');
      void M.paper.offsetWidth;
      M.paper.classList.add('is-shaking');
      if (M.state === 'developing' || M.state === 'shaken') {
        // it does not really help a real print; here it hurries the chemistry along a little
        for (const e of [M.milk, M.desat]) e.getAnimations?.().forEach((a) => { a.playbackRate = Math.min(4, (a.playbackRate || 1) * 1.5); });
        if (M.state !== 'shaken') { M.state = 'shaken'; renderModal(); }
      }
    } catch { /* decorative */ }
  }

  function onModalKey(e) {
    if (!M || M.root.dataset.open !== 'true') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();          // the room should not also jump back home
      closePhoto();
    } else if (e.key === 'Tab') {
      const items = [M.dl, M.close];
      const i = items.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === -1 || i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
    }
  }

  function setDownload(photo) {
    if (!M) return;
    M.dl.href = photo.src;
    M.dl.download = photo.filename;
  }

  // the print on screen owns one object URL: released when the dialog closes or the next print replaces it
  function releaseUrl() {
    const u = blobUrl;
    blobUrl = '';
    // a moment's grace, so a download clicked just before closing still reads the blob
    if (u) setTimeout(() => { try { URL.revokeObjectURL(u); } catch { /* already gone */ } }, 1000);
  }

  function openPhoto(photo) {
    const m = modal();
    if (blobUrl !== photo.src) { releaseUrl(); blobUrl = photo.src; }
    m.img.src = photo.src;
    setDownload(photo);
    m.print.style.setProperty('--mo-tilt', `${photo.tilt.toFixed(2)}deg`);
    clearTimeout(m.devTimer);
    m.print.classList.remove('is-developing', 'is-in');
    for (const e of [m.milk, m.desat]) e.getAnimations?.().forEach((a) => { a.playbackRate = 1; });
    void m.print.offsetWidth;
    if (ctx.still) m.state = 'developed';
    else {
      m.state = 'developing';
      m.print.classList.add('is-developing', 'is-in');
      m.devTimer = setTimeout(developed, 4400);   // in case animationend never arrives
    }
    renderModal();
    if (m.root.dataset.open !== 'true') {
      const a = document.activeElement;
      prevFocus = a && !m.root.contains(a) ? a : null;
      void m.root.offsetWidth;
      m.root.dataset.open = 'true';
    }
    // keyboard opens land on the first control; a click or tap lands on the heading, so no ring shows on a button
    const target = ctx.lastInput?.() === 'keyboard' ? m.close : m.title;
    try { target.focus({ preventScroll: true }); } catch { /* ok */ }
  }

  function closePhoto() {
    if (!M || M.root.dataset.open !== 'true') return false;
    M.root.dataset.open = 'false';
    clearTimeout(M.devTimer);
    releaseUrl();
    const f = prevFocus;
    prevFocus = null;
    try {
      const a = document.activeElement;
      if (f && f.isConnected && f !== document.body) f.focus({ preventScroll: true });
      else if (a && M.root.contains(a)) a.blur();
    } catch { /* ok */ }
    return true;
  }

  async function compose(frame, info) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    drawPaper(g);
    const photo = photoCanvas(frame);
    g.drawImage(photo, PX, PY);
    // the photo sits a hair below the frame
    const sh = g.createLinearGradient(0, PY, 0, PY + 16);
    sh.addColorStop(0, 'rgba(30, 20, 10, .26)');
    sh.addColorStop(1, 'rgba(30, 20, 10, 0)');
    g.fillStyle = sh;
    g.fillRect(PX, PY, PS, 16);
    g.strokeStyle = 'rgba(70, 55, 40, .26)';
    g.lineWidth = 1.5;
    g.strokeRect(PX + 0.75, PY + 0.75, PS - 1.5, PS - 1.5);
    await fontsReady();
    const base = PY + PS, room = H - base;
    hand(g, info.line1, W / 2, base + room * 0.44, 64, 'rgba(36, 40, 58, .92)', -0.012);
    hand(g, info.line2, W / 2, base + room * 0.44 + 70, 34, 'rgba(56, 58, 72, .74)', -0.008);
    g.save();
    g.font = `300 26px ${FONT}`;
    g.fillStyle = 'rgba(80, 72, 64, .42)';
    g.textAlign = 'right';
    g.fillText(t('moments.no', { n: info.n }), W - PX, H - 30);
    g.restore();
    return cv;
  }

  function bumpCount() {
    let n = 0;
    try { n = parseInt(ctx.store?.get?.('moments.count'), 10) || 0; } catch { n = 0; }
    n += 1;
    try { ctx.store?.set?.('moments.count', n); } catch { /* per-visitor only */ }
    return n;
  }

  async function polaroid() {
    if (shooting) return null;
    shooting = true;
    const started = performance.now();
    try {
      shutter();
      flash();
      const frame = await grabFrame(ctx);
      const when = new Date();
      const n = bumpCount();
      const line1 = studioLine();
      const clim = climateSnap();
      const climText = climateLabel();
      const line2 = [climText, dateText(when)].filter(Boolean).join(' · ');
      const cv = await compose(frame, { line1, line2, n });
      // the print is encoded once; its blob URL serves both the <img> and the download link
      const blob = await toJpeg(cv, 0.92);
      if (!blob) throw new Error('encode');
      const src = URL.createObjectURL(blob);
      const tilt = ctx.still ? -1.2 : (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.6);
      const photo = { src, blob, filename: fileName(when), takenAt: when.toISOString(), width: W, height: H, when, n, line1, line2, tilt, clim, climText, lang: lang() };
      last = photo;
      if (!ctx.still) {
        const wait = 280 - (performance.now() - started);    // let the flash fade first
        if (wait > 0) await sleep(wait);
      }
      openPhoto(photo);
      return lastPhoto();
    } catch {
      toast(t('moments.fail'));
      return null;
    } finally {
      shooting = false;
    }
  }

  // src is the print's blob URL while it is on screen ('' once the dialog closed); blob stays usable
  function lastPhoto() {
    if (!last) return null;
    return { src: last.src === blobUrl ? blobUrl : '', blob: last.blob, filename: last.filename, takenAt: last.takenAt, width: last.width, height: last.height };
  }

  // ---------------------------------------------------------------- the afterparty
  const P = {
    active: false, start: 0, until: 0, lastTick: 0, hue0: 0, watchdog: 0,
    startedMusic: null, lofiTimer: null, lightsWere: null, soundWasOff: false, lastSec: -1, dotAt: 0,
    hue: new THREE.Color(), out: new THREE.Color(),
  };
  let C = null;

  function chip() {
    if (C) return C;
    const root = el('div', 'mo-chip surface');
    root.dataset.open = 'false';
    const dot = el('i', 'mo-dot', root);
    dot.setAttribute('aria-hidden', 'true');
    const label = el('span', 'mo-chip-k', root);
    const time = el('span', 'mo-chip-t', root);
    time.setAttribute('aria-hidden', 'true');
    const end = el('button', 'mo-chip-end', root);
    end.type = 'button';
    end.addEventListener('click', (e) => { e.stopPropagation(); stopParty(); });
    document.body.appendChild(root);
    C = { root, dot, label, time, end };
    renderChip();
    return C;
  }

  function renderChip() {
    if (!C) return;
    C.label.textContent = t('moments.chip');
    C.end.textContent = t('moments.end');
    C.end.setAttribute('aria-label', t('moments.endLabel'));
  }

  // which music, if any, is playing: true / false / null (cannot tell)
  function eggMusicState() {
    const m = ctx.eggs?.music;
    if (!m) return null;
    try {
      for (const k of ['isPlaying', 'playing']) {
        const v = m[k];
        if (typeof v === 'function') return !!v.call(m);
        if (typeof v === 'boolean') return v;
      }
      if (typeof m.paused === 'boolean') return !m.paused;
      if (m.state && typeof m.state === 'object' && 'playing' in m.state) return !!m.state.playing;
    } catch { /* unknown */ }
    return null;
  }
  const eggPlayer = () => {
    const m = ctx.eggs?.music;
    return m && typeof m.play === 'function' ? m : null;
  };
  // is music playing: true / false / null (cannot tell: then the party leaves music alone)
  const musicPlaying = () => (eggPlayer() ? eggMusicState() : !!ctx.sound?.musicOn);

  function startMusic() {
    const m = eggPlayer();
    if (m) {
      try {
        const r = m.play();
        r?.catch?.(() => {});
        return 'egg';
      } catch { return null; }
    }
    // no music module: the built-in loop, only when main's record would play that same loop (no site.music file)
    const S = ctx.sound;
    if (S?.ctx && typeof S.startLofi === 'function' && !S.musicOn && !ctx.content?.site?.music) {
      try {
        S.startLofi();
        S.musicOn = true;               // keeps Sound's flag (and main's record toggle) in step
        P.lofiTimer = S.lofiTimer ?? null;
        return 'lofi';
      } catch { return null; }
    }
    return null;
  }

  function stopMusic(kind) {
    try {
      if (kind === 'egg') {
        const m = eggPlayer();
        if (!m || eggMusicState() !== true) return;
        const fn = typeof m.stop === 'function' ? m.stop : (typeof m.pause === 'function' ? m.pause : null);
        const r = fn?.call(m);
        r?.catch?.(() => {});
      } else if (kind === 'lofi') {
        const S = ctx.sound;
        // only the party's own loop: if the visitor toggled the record since, it is theirs now
        if (S?.musicOn && S.lofiTimer === P.lofiTimer) {
          S.stopLofi?.();
          S.musicOn = false;
        }
      }
    } catch { /* leave it playing */ } finally { P.lofiTimer = null; }
  }

  function party() {
    try {
      const n = nowS();
      if (P.active) {
        P.until = Math.min(Math.max(P.until, n + FADE_OUT) + PARTY_SECONDS, n + PARTY_MAX);
        toast(t('moments.encore'), 2600);
        return true;
      }
      P.active = true;
      P.start = n;
      P.until = n + PARTY_SECONDS;
      P.hue0 = Math.random();
      P.lastSec = -1;
      P.soundWasOff = !soundIsOn();
      if (P.soundWasOff) {
        try {
          if (typeof ctx.setSound === 'function') ctx.setSound(true);
          else ctx.sound?.start?.(true);
        } catch { /* stays quiet */ }
      }
      P.lightsWere = null;
      const mode = lightsMode();
      if (mode === 'off' || (mode === 'auto' && autoLampLevel() < 0.9)) {
        try {
          if (typeof ctx.H?.lights === 'function') { ctx.H.lights('warm'); P.lightsWere = mode; }
        } catch { /* stays as it was */ }
      }
      P.startedMusic = musicPlaying() === false ? startMusic() : null;
      toast(t('moments.party'), 3200);
      chip().root.dataset.open = 'true';
      clearInterval(P.watchdog);
      // if frames stop arriving (hidden tab), the party still ends on time
      P.watchdog = setInterval(() => { try { if (nowS() - P.lastTick > 0.75) tick(); } catch { /* next time */ } }, 500);
      tick();
      return true;
    } catch {
      return false;
    }
  }

  function stopParty() {
    if (P.active) P.until = Math.min(P.until, nowS() + FADE_OUT);
  }

  function tick() {
    if (!P.active) return;
    const n = nowS();
    P.lastTick = n;
    const left = P.until - n;
    if (left <= 0) { endParty(); return; }
    const k = Math.min(clamp01((n - P.start) / FADE_IN), clamp01(left / FADE_OUT));
    const e = k * k * (3 - 2 * k);
    const period = ctx.still ? 24 : 9;
    const h = (((n - P.start) / period + P.hue0) % 1 + 1) % 1;
    P.hue.setHSL(h, 0.85, 0.55, THREE.SRGBColorSpace);
    const mx = Math.max(P.hue.r, P.hue.g, P.hue.b, 1e-3);
    P.hue.multiplyScalar(1 / mx);                     // same lamp brightness for every hue
    P.out.setRGB(WARM[0], WARM[1], WARM[2]).lerp(P.hue, e);
    if (ctx.fx) {
      ctx.fx.lampColor = P.out;
      ctx.fx.fairyChase = e * (ctx.still ? 0.5 : 1);
    }
    if (C) {
      const sec = Math.max(0, Math.ceil(left));
      if (sec !== P.lastSec) {
        P.lastSec = sec;
        C.time.textContent = `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
      }
      if (n - P.dotAt > 0.08) {
        P.dotAt = n;
        C.dot.style.color = `#${P.hue.getHexString()}`;
      }
    }
  }

  function endParty() {
    if (!P.active) return;
    P.active = false;
    clearInterval(P.watchdog);
    P.watchdog = 0;
    if (ctx.fx) { ctx.fx.lampColor = null; ctx.fx.fairyChase = 0; }
    const started = P.startedMusic;
    P.startedMusic = null;
    if (started) stopMusic(started);
    const were = P.lightsWere;
    P.lightsWere = null;
    if (were && lightsMode() === 'warm') { try { ctx.H?.lights?.(were); } catch { /* leave them on */ } }
    // the visitor had sound off and the party brought the music: hand the silence back
    if (P.soundWasOff && started && soundIsOn()) { try { ctx.setSound?.(false); } catch { /* leave it on */ } }
    P.soundWasOff = false;
    if (C) { C.root.dataset.open = 'false'; C.dot.style.color = ''; }
    const cat = String(pick(ctx.content?.site?.catName) || '').trim();
    toast(cat ? t('moments.partyEnd', { cat }) : t('moments.partyEndNoCat'), 3000);
  }

  // ---------------------------------------------------------------- Konami tracker
  let hist = [];
  let fed = false;   // the last key event was pushed onto hist
  // length of the longest tail of hist that is a start of CODE (hist is a sliding window, so a tail, not a head)
  const matched = () => {
    for (let n = Math.min(hist.length, CODE.length); n > 0; n--) if (hist.slice(-n).every((v, i) => v === CODE[i])) return n;
    return 0;
  };
  const typing = (e) => {
    const tg = e?.target;
    return !!(tg && typeof tg.closest === 'function' && tg.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
  };
  function konami(e) {
    fed = false;
    try {
      if (!e || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e) || !entered) return false;
      const k = String(e.key || '').toLowerCase();
      if (!CODE_KEYS.has(k)) { hist = []; return false; }
      hist.push(k);
      fed = true;
      if (hist.length > CODE.length) hist.shift();
      if (hist.length === CODE.length && hist.every((v, i) => v === CODE[i])) {
        hist = [];
        party();
        return true;
      }
    } catch { /* never swallow on error */ }
    return false;
  }
  const photoOpen = () => !!M && M.root.dataset.open === 'true';
  // the <- / -> code keys: while the photo is open the arrows that flip works stay with the dialog, and once
  // up up down down is in, the arrows that continue the code stay here so the camera does not leave the room
  function codeKey(e) {
    if (konami(e)) return true;
    try {
      if (e?.key !== 'ArrowLeft' && e?.key !== 'ArrowRight') return false;
      if (photoOpen() || (fed && matched() >= 5)) {
        e.preventDefault?.();
        return true;
      }
    } catch { /* fall through */ }
    return false;
  }
  try {
    addEventListener('keydown', (e) => {
      try {
        const k = String(e.key || '').toLowerCase();
        if (!CODE_KEYS.has(k) && !MODIFIERS.has(k)) hist = [];
        // the photo is modal: the room's one-letter shortcuts wait until it closes
        if (photoOpen() && ROOM_SHORTCUTS.has(k) && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e)) {
          e.stopImmediatePropagation();
        }
      } catch { /* ignore */ }
    }, true);
  } catch { /* the keys handlers still work */ }

  try {
    ctx.on?.('lang', () => { try { renderModal(); renderChip(); } catch { /* next switch */ } });
  } catch { /* stays in the first language */ }

  return {
    actions: {
      camera: () => { void polaroid(); },
    },
    tips: {
      camera: () => t('moments.tip'),
    },
    keys: {
      ArrowUp: konami, ArrowDown: konami, ArrowLeft: codeKey, ArrowRight: codeKey,
      a: konami, A: konami, b: konami, B: konami,
      Escape: () => { try { return closePhoto(); } catch { return false; } },
    },
    update(dt, frame) {
      try {
        if (frame && typeof frame.entered === 'boolean') entered = frame.entered;
        if (frame) lastFrame = frame;
        if (P.active) tick();
      } catch { /* one bad frame */ }
    },
    api: {
      polaroid: () => polaroid(),
      party: () => party(),
      lastPhoto,
    },
  };
}
