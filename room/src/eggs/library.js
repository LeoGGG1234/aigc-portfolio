// Library: the owner's favourite books, as cloth spines on the 3D bookshelf and as a reading panel.
//
// Integration notes (for the integrator):
// - actions.shelf moves the camera with ctx.H.go('shelf') when H exists (so the room's back button
//   and nav state follow), falling back to ctx.rig.go('shelf'). The call is guarded against
//   re-entry, so H.go('shelf') may itself call ctx.eggs.library.openShelf() without looping.
//   api.openShelf() only opens the panel; pass { go: true } to move the camera too.
// - The panel closes itself when: another module emits ctx.emit('overlay', { name }) with a name other
//   than 'library' (it emits { name: 'library' } when it opens); any element outside it gets
//   data-open="true" and is #panel, #atmo, a .dial, a .sheet, a [role=dialog] / [aria-modal=true] or wraps
//   one (diary, details and moments do not emit 'overlay', so this is how they are noticed); focus moves
//   into another dialog; or the camera changes to a view other than 'shelf' (ctx.on('view'), with a
//   per-frame fallback). 'overlay' is not in CONTRACT.md yet: worth adding, with every overlay emitting it.
// - When it opens it closes the room's #panel (ctx.ui.closePanel), and the atmosphere sheet and dial menus
//   by setting their data-open / aria-expanded the way ui.js does (ctx.ui has no closeAtmo / closeDials;
//   a ctx.ui.closeAll() is used instead when the integrator adds one).
// - keys: ArrowLeft / ArrowRight return true while the panel is open (card: previous / next book,
//   shelf list: move focus between spines); Escape returns true only when it closed the panel. None of
//   them are taken with Alt / Cmd / Ctrl held (browser Back / Forward), while typing outside the panel,
//   or while focus is inside another open overlay.
// - Optional book fields beyond the contract: "cover" (a relative image path under site/, shown instead
//   of the generated cover) and "motif" (cover ornament: butterfly, shell, city, star, eye, fish, waves,
//   moon, sprig, sun, diamond). Without "motif" one is picked from the title.
// - Spine quads get ctx.mixer.pictureMaterial with a small extraFrag: a gentle lift while that book is
//   hovered in the list or open as a card, plus one foil glint when its card opens (skipped when
//   ctx.still). The quad's orientation is read from its uv and world axes, so a spine authored upside
//   down or sideways still reads top to bottom.
import * as THREE from '../three.js';

const MAX_SPINES = 8;
const TAU = Math.PI * 2;
const SERIF = 'system-ui, -apple-system, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif';
const SANS = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
const CJK = /[⺀-⿟぀-ヿ㄀-ㄯ㐀-䶿一-鿿豈-﫿＀-￯]/;
// characters that turn 90 degrees when Chinese is set vertically
const TURN = new Set(Array.from('-‐–—―~～()（）[]【】「」『』<>《》〈〉:：…|'));
// set vertically, quotation marks become corner brackets (turned above, so they read as ﹃﹄﹁﹂, GB/T 15834)
const QUOTE = { '“': '『', '”': '』', '‘': '「', '’': '」' };
// and these move from the lower left of their cell to the upper right, as ︐︒︑ do
const CORNER = new Set(Array.from('，。、'));
const NAME_SPLIT = /[·・•．]/;
const FALLBACK = ['#7a3b2e', '#2f4f5f', '#8a6d2f', '#34507a', '#6b2f3a', '#3d5a4a', '#5a3e2b', '#454060'];
const BLANK = ['#4a3f36', '#3b4140', '#5a4a3c', '#3e3a44'];
const SVGNS = 'http://www.w3.org/2000/svg';
// other overlays: the room's panel, atmosphere sheet, dial menus and work sheet, and any module's dialog
const OTHER = '#panel, #atmo, .dial, .sheet, [role="dialog"], [aria-modal="true"]';

const STRINGS = {
  en: {
    'library.kicker': 'Library',
    'library.heading': 'On my shelf',
    'library.lede': 'A few books that never leave the studio.',
    'library.pick': 'Choose a spine to take one down.',
    'library.count': '{n} books',
    'library.count1': '1 book',
    'library.empty': 'The shelf is empty for now.',
    'library.emptyHint': 'No reading notes have been shared yet.',
    'library.back': 'Back to the shelf',
    'library.prev': 'Previous book',
    'library.next': 'Next book',
    'library.close': 'Close',
    'library.from': 'From the shelf',
    'library.note': 'Marginalia',
    'library.quote': 'A line worth keeping',
    'library.link': 'Read the source',
    'library.openCover': 'Open the cover of {title}',
    'library.closeCover': 'Close the cover of {title}',
    'library.exlibris': 'Ex libris',
    'library.no': 'No. {n}',
    'library.marked': 'last opened',
    'library.keys': '← → browse · Esc closes',
    'library.tipShelf': 'Bookshelf · favourite books',
    'library.tipBook': '{title} — {author}',
    'library.dialog': 'Library',
  },
  zh: {
    'library.kicker': '藏书',
    'library.heading': '书架上',
    'library.lede': '几本从不离开工作室的书。',
    'library.pick': '选一本，把它从书架上抽出来。',
    'library.count': '{n} 本书',
    'library.count1': '1 本书',
    'library.empty': '书架暂时是空的。',
    'library.emptyHint': '这里还没有公开的阅读记录。',
    'library.back': '回到书架',
    'library.prev': '上一本',
    'library.next': '下一本',
    'library.close': '关闭',
    'library.from': '书架上的一本',
    'library.note': '批注',
    'library.quote': '值得记下的一句',
    'library.link': '查看出处',
    'library.openCover': '翻开《{title}》的封面',
    'library.closeCover': '合上《{title}》的封面',
    'library.exlibris': '藏书',
    'library.no': '第 {n} 号',
    'library.marked': '上次翻开',
    'library.keys': '← → 翻看 · Esc 关闭',
    'library.tipShelf': '书架 · 喜欢的书',
    'library.tipBook': '《{title}》— {author}',
    'library.dialog': '书架',
  },
};

// ------------------------------------------------------------------ small helpers
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const pad2 = (n) => String(n).padStart(2, '0');
function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// ------------------------------------------------------------------ colour
let probe = null;
function parseColor(v) {
  const s = String(v ?? '').trim();
  let m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = Array.from(h).map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [m[1], m[2], m[3]].map((x) => clamp(Math.round(Number(x)), 0, 255));
  return null;
}
// accepts any CSS colour the browser knows (named colours too)
function resolveColor(v) {
  if (v == null || v === '') return null;
  const direct = parseColor(v);
  if (direct) return direct;
  try {
    probe = probe || canvas(1, 1).getContext('2d');
    probe.fillStyle = '#010203';
    probe.fillStyle = String(v);
    const out = String(probe.fillStyle);
    return out === '#010203' ? null : parseColor(out);
  } catch { return null; }
}
const css = (c, a = 1) => (a >= 1 ? `rgb(${c.map(Math.round).join(',')})` : `rgba(${c.map(Math.round).join(',')},${a})`);
const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function luminance(c) {
  const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function hueSat([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return [-1, 0];
  let h;
  if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / mx];
}
const FOILS = {
  gold: { base: [212, 176, 104], hi: [242, 224, 170], lo: [146, 108, 50] },
  silver: { base: [214, 211, 202], hi: [246, 244, 238], lo: [140, 138, 132] },
  ink: { base: [30, 24, 20], hi: [62, 52, 44], lo: [12, 9, 7], flat: true },
};
// strengths of the CSS spine's white sheen (eggs-library.css .lib-spine, var(--sheen) at 36%), strongest first
const SHEEN = [0.12, 0.1, 0.08, 0.06, 0.04, 0.02, 0];
// foil stamping chosen for contrast: gold (silver on cool cloth), dark ink on pale cloth
function foilFor(rgb) {
  const [h, s] = hueSat(rgb);
  const cool = h >= 165 && h <= 265 && s > 0.15;
  const order = cool ? ['silver', 'gold', 'ink'] : ['gold', 'silver', 'ink'];
  let name = order.find((n) => contrast(FOILS[n].base, rgb) >= 3.4);
  if (!name) name = order.reduce((b, n) => (contrast(FOILS[n].base, rgb) > contrast(FOILS[b].base, rgb) ? n : b));
  const f = FOILS[name];
  // the colour for the small CSS titles (.lib-spine): the variant that clears 4.5:1 on the flat cloth and on
  // the white sheen the CSS lays across the title column. When none does, that spine's sheen is dimmed
  // (--sheen) until one does; if even no sheen is enough, the variant with the most contrast wins.
  const options = f.flat ? [f.base, f.lo] : [f.base, f.hi];
  const worst = (c, a) => Math.min(contrast(c, rgb), contrast(c, rgb.map((v) => v * (1 - a) + 255 * a)));
  for (const sheen of SHEEN) {
    const text = options.find((c) => worst(c, sheen) >= 4.5);
    if (text) return { ...f, name, text, sheen };
  }
  const text = options.reduce((b, c) => (contrast(c, rgb) > contrast(b, rgb) ? c : b));
  return { ...f, name, text, sheen: f.flat ? SHEEN[0] : 0 };
}
function bookColor(book, i) {
  return resolveColor(book?.color) || parseColor(FALLBACK[i % FALLBACK.length]);
}

// ------------------------------------------------------------------ canvas craft
// book cloth: a fine weave, uneven threads and grain over the base colour
function cloth(g, w, h, rgb, rand, grain = 1) {
  g.fillStyle = css(rgb);
  g.fillRect(0, 0, w, h);
  let img;
  try { img = g.getImageData(0, 0, w, h); } catch { return; }
  const d = img.data;
  const col = new Float32Array(w), sx = new Float32Array(w);
  for (let x = 0; x < w; x++) { col[x] = (rand() - 0.5) * 0.07; sx[x] = Math.sin(x * 2.2); }
  for (let y = 0; y < h; y++) {
    const row = (rand() - 0.5) * 0.07, sy = Math.sin(y * 2.2);
    for (let x = 0; x < w; x++) {
      const k = 1 + row + col[x] + 0.035 * sx[x] * sy + (rand() - 0.5) * 0.09 * grain;
      const add = (rand() - 0.5) * 5 * grain;
      const i = (y * w + x) * 4;
      d[i] = d[i] * k + add; d[i + 1] = d[i + 1] * k + add; d[i + 2] = d[i + 2] * k + add;
    }
  }
  g.putImageData(img, 0, 0);
}
function gradient(gr, stops) { for (const [t, c] of stops) gr.addColorStop(t, c); return gr; }
function foilPaint(f, foil, x0, y0, x1, y1) {
  if (foil.flat) return css(foil.base, 0.92);
  return gradient(f.createLinearGradient(x0, y0, x1, y1), [
    [0, css(foil.lo)], [0.2, css(foil.base)], [0.42, css(foil.hi)], [0.6, css(foil.base)], [0.82, css(foil.lo)], [1, css(foil.base)],
  ]);
}
// worn foil: tiny flecks rubbed off
function wear(f, w, h, rand, density = 1) {
  f.save();
  f.globalCompositeOperation = 'destination-out';
  const n = Math.round((w * h) / 70 * density);
  for (let k = 0; k < n; k++) {
    f.globalAlpha = 0.25 + rand() * 0.6;
    f.fillRect(rand() * w, rand() * h, rand() < 0.15 ? 2 : 1, 1);
  }
  f.restore();
}
// press the foil layer into the cloth (a hairline shadow for foil, a faint lip for ink)
function stamp(g, layer, foil) {
  g.save();
  if (foil.flat) { g.shadowColor = 'rgba(255,255,255,.16)'; g.shadowOffsetY = 1; g.shadowBlur = 0.5; }
  else { g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowOffsetY = 1; g.shadowBlur = 1.2; }
  g.drawImage(layer, 0, 0);
  g.restore();
}
const font = (size, { italic = false, weight = 400, family = SERIF } = {}) => `${weight} ${Math.max(1, Math.round(size))}px ${family}`;
function spacing(g, px) { try { g.letterSpacing = `${Math.round(px * 10) / 10}px`; } catch { /* older canvas */ } }
function fitSize(g, text, maxW, max, min, apply) {
  for (let s = Math.floor(max); s >= Math.ceil(min); s--) {
    apply(s);
    if (g.measureText(text).width <= maxW) return s;
  }
  return 0;
}
function splitTwo(g, text) {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best = null, bestW = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const w = Math.max(g.measureText(a).width, g.measureText(b).width);
    if (w < bestW) { bestW = w; best = [a, b]; }
  }
  return best;
}
function wrapWords(g, text, maxW) {
  const lines = [];
  let line = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w;
    if (!line || g.measureText(next).width <= maxW) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
function wrapChars(g, text, maxW) {
  const lines = [];
  let line = '';
  for (const ch of Array.from(String(text).replace(/\s+/g, ' ').trim())) {
    const next = line + ch;
    if (!line || g.measureText(next).width <= maxW) line = next;
    else { lines.push(line.trim()); line = ch.trim(); }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
// the largest size at which text fits a box, then re-balanced so lines come out even
function fitBlock(g, text, maxW, maxH, max, min, cjk, maxLines, lh, apply) {
  const wrap = cjk ? wrapChars : wrapWords;
  let size = min, lines = null;
  for (let s = max; s >= min; s--) {
    apply(s);
    const ls = wrap(g, text, maxW);
    if (ls.length <= maxLines && ls.length * s * lh <= maxH && ls.every((l) => g.measureText(l).width <= maxW)) { size = s; lines = ls; break; }
  }
  apply(size);
  if (!lines) return { size, lines: wrap(g, text, maxW).slice(0, maxLines) };
  if (lines.length > 1) {
    let lo = maxW * 0.45, hi = maxW;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (wrap(g, text, mid).length <= lines.length) hi = mid; else lo = mid;
    }
    const even = wrap(g, text, hi);
    if (even.length === lines.length) lines = even;
  }
  return { size, lines };
}
// Chinese on a spine: characters stacked top to bottom, brackets and dashes turned
function stackChars(f, text, w, top, bottom, maxFrac) {
  const chars = Array.from(String(text).replace(/\s+/g, ''));
  if (!chars.length) return 0;
  const len = bottom - top;
  const size = Math.min(w * maxFrac, len / (chars.length * 1.05));
  f.font = font(size);
  spacing(f, 0);
  f.textAlign = 'center';
  f.textBaseline = 'middle';
  const step = size * 1.05, y0 = top + (len - step * chars.length) / 2;
  chars.forEach((c, k) => {
    const cy = y0 + step * (k + 0.5), ch = QUOTE[c] || c;
    if (TURN.has(ch)) { f.save(); f.translate(w / 2, cy); f.rotate(Math.PI / 2); f.fillText(ch, 0, 0); f.restore(); }
    else if (CORNER.has(ch)) {
      // the horizontal glyph, its ink centred where the font's own vertical forms put it; works without
      // vertical-form glyphs and with fonts that centre the mark (traditional Chinese)
      const m = f.measureText(ch), ok = Number.isFinite(m.actualBoundingBoxLeft) && Number.isFinite(m.actualBoundingBoxAscent);
      const ix = ok ? (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2 : -size * 0.26;
      const iy = ok ? (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2 : size * 0.3;
      f.fillText(ch, w / 2 + size * 0.23 - ix, cy - size * 0.26 - iy);
    } else f.fillText(ch, w / 2, cy);
  });
  return size;
}
// English on a spine: turned 90 degrees, reading top to bottom; one line, or two when that is larger
function spineTitle(f, text, w, top, bottom) {
  if (!text) return;
  if (CJK.test(text)) { stackChars(f, text, w, top, bottom, 0.5); return; }
  const len = bottom - top;
  const apply = (s) => { f.font = font(s); spacing(f, s * 0.01); };
  const one = fitSize(f, text, len, w * 0.42, w * 0.15, apply);
  let lines = [text], size = one || Math.round(w * 0.15);
  if (one < w * 0.3) {
    apply(w * 0.3);
    const two = splitTwo(f, text);
    if (two) {
      const s2 = Math.min(fitSize(f, two[0], len, w * 0.3, w * 0.14, apply) || w * 0.14, fitSize(f, two[1], len, w * 0.3, w * 0.14, apply) || w * 0.14);
      if (s2 > (one || 0) * 1.12) { lines = two; size = s2; }
    }
  }
  apply(size);
  f.save();
  f.translate(w / 2, top);
  f.rotate(Math.PI / 2);
  f.textAlign = 'center';
  f.textBaseline = 'middle';
  const lh = size * 0.98;
  lines.forEach((ln, k) => f.fillText(ln, len / 2, (k - (lines.length - 1) / 2) * lh + size * 0.04, len));
  f.restore();
  spacing(f, 0);
}
function spineAuthor(f, text, w, top, bottom) {
  if (!text) return;
  const len = bottom - top;
  if (CJK.test(text)) {
    let name = text.replace(/\s+/g, '');
    if (len / (Array.from(name).length * 1.06) < w * 0.17) {
      const parts = name.split(NAME_SPLIT).filter(Boolean);
      if (parts.length > 1) name = parts[parts.length - 1];
    }
    stackChars(f, name, w, top, bottom, 0.3);
    return;
  }
  const apply = (s) => { f.font = font(s); spacing(f, s * 0.1); };
  let name = text.toUpperCase();
  let s = fitSize(f, name, len, w * 0.2, w * 0.15, apply);
  if (!s) {
    name = name.split(/\s+/).filter(Boolean).pop() || name;            // surname only, as spines do
    s = fitSize(f, name, len, w * 0.2, w * 0.11, apply) || Math.round(w * 0.11);
  }
  apply(s);
  f.save();
  f.translate(w / 2, top);
  f.rotate(Math.PI / 2);
  f.textAlign = 'center';
  f.textBaseline = 'middle';
  f.fillText(name, len / 2, s * 0.04, len);
  f.restore();
  spacing(f, 0);
}
function lozenge(f, x, y, r) {
  f.beginPath(); f.moveTo(x, y - r * 1.35); f.lineTo(x + r, y); f.lineTo(x, y + r * 1.35); f.lineTo(x - r, y); f.closePath(); f.fill();
}
function sparkle(f, x, y, r) {
  f.beginPath(); f.moveTo(x, y - r);
  f.quadraticCurveTo(x, y, x + r * 0.7, y); f.quadraticCurveTo(x, y, x, y + r);
  f.quadraticCurveTo(x, y, x - r * 0.7, y); f.quadraticCurveTo(x, y, x, y - r);
  f.fill();
}

// drawn in the logical frame: x across the spine, y from its top to its bottom
function drawSpine(L, book, i, pick) {
  const w = L.width, h = L.height, g = L.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  const rgb = bookColor(book, i), foil = foilFor(rgb);
  const rand = rng(hash(`spine${i}|${book?.color ?? ''}`));
  cloth(g, w, h, rgb, rand);
  // a rounded back: dark edges, a soft highlight left of centre, worn ends
  g.fillStyle = gradient(g.createLinearGradient(0, 0, w, 0), [
    [0, 'rgba(0,0,0,.42)'], [0.1, 'rgba(0,0,0,.14)'], [0.34, 'rgba(255,255,255,.09)'], [0.55, 'rgba(255,255,255,0)'], [0.86, 'rgba(0,0,0,.16)'], [1, 'rgba(0,0,0,.45)'],
  ]);
  g.fillRect(0, 0, w, h);
  g.fillStyle = gradient(g.createLinearGradient(0, 0, 0, h), [[0, 'rgba(0,0,0,.3)'], [0.03, 'rgba(0,0,0,0)'], [0.96, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.36)']]);
  g.fillRect(0, 0, w, h);

  const F = canvas(w, h), f = F.getContext('2d');
  const paint = foilPaint(f, foil, 0, 0, w, 0);
  f.fillStyle = paint; f.strokeStyle = paint;
  const thick = Math.max(2, Math.round(w * 0.028)), thin = Math.max(1, Math.round(w * 0.012)), gap = Math.round(h * 0.011);
  const y1 = Math.round(h * 0.05), y2 = Math.round(h * 0.94);
  f.fillRect(0, y1, w, thick); f.fillRect(0, y1 + thick + gap, w, thin);
  f.fillRect(0, y2 - thick, w, thick); f.fillRect(0, y2 - thick - gap - thin, w, thin);
  const title = book ? pick(book.title) : '';
  const author = book ? pick(book.author) : '';
  spineTitle(f, title, w, h * 0.1, h * 0.655);
  if (title || author) lozenge(f, w / 2, h * 0.688, Math.max(3, w * 0.04));
  spineAuthor(f, author, w, h * 0.72, h * 0.905);
  wear(f, w, h, rand, 1);
  stamp(g, F, foil);
}

// cover ornaments, stamped in foil; (x, y) centre, s half-size
const ORN = {
  diamond(f, x, y, s) {
    for (const k of [1, 0.6]) {
      f.beginPath(); f.moveTo(x, y - s * 0.8 * k); f.lineTo(x + s * 0.55 * k, y); f.lineTo(x, y + s * 0.8 * k); f.lineTo(x - s * 0.55 * k, y); f.closePath(); f.stroke();
    }
    lozenge(f, x, y, s * 0.08);
  },
  sun(f, x, y, s) {
    f.beginPath(); f.arc(x, y, s * 0.3, 0, TAU); f.stroke();
    f.beginPath(); f.arc(x, y, s * 0.1, 0, TAU); f.fill();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, r0 = s * 0.42, r1 = s * (k % 2 ? 0.6 : 0.8);
      f.beginPath(); f.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); f.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); f.stroke();
    }
  },
  star(f, x, y, s) {
    f.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? s * 0.28 : s * 0.7;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (k) f.lineTo(px, py); else f.moveTo(px, py);
    }
    f.closePath(); f.stroke();
    sparkle(f, x + s * 0.78, y - s * 0.55, s * 0.12);
    sparkle(f, x - s * 0.82, y + s * 0.35, s * 0.09);
    f.beginPath(); f.arc(x - s * 0.6, y - s * 0.62, Math.max(1.4, s * 0.03), 0, TAU); f.fill();
  },
  moon(f, x, y, s) {
    f.save();
    f.beginPath(); f.arc(x, y, s * 0.55, 0, TAU); f.clip();
    f.beginPath(); f.rect(x - s, y - s, s * 2, s * 2);
    f.moveTo(x + s * 0.26 + s * 0.47, y - s * 0.12); f.arc(x + s * 0.26, y - s * 0.12, s * 0.47, 0, TAU, true);
    f.fill('evenodd');
    f.restore();
    sparkle(f, x + s * 0.55, y + s * 0.42, s * 0.12);
    sparkle(f, x + s * 0.72, y - s * 0.5, s * 0.08);
  },
  waves(f, x, y, s) {
    for (let r = -1; r <= 1; r++) {
      f.beginPath();
      for (let k = 0; k <= 40; k++) {
        const px = x - s * 0.8 + (k / 40) * s * 1.6, py = y + r * s * 0.32 + Math.sin((k / 40) * TAU * 2 + r) * s * 0.09;
        if (k) f.lineTo(px, py); else f.moveTo(px, py);
      }
      f.stroke();
    }
  },
  shell(f, x, y, s) {
    const b = 0.2, tMax = 4 * Math.PI, a = (s * 0.72) / Math.exp(b * tMax), cx = x - s * 0.15;
    const P = (t) => [cx + Math.cos(t) * a * Math.exp(b * t), y + Math.sin(t) * a * Math.exp(b * t)];
    f.beginPath();
    for (let k = 0; k <= 160; k++) { const [px, py] = P((k / 160) * tMax); if (k) f.lineTo(px, py); else f.moveTo(px, py); }
    f.stroke();
    for (let t = 2.4 * Math.PI; t <= tMax; t += Math.PI / 4) {
      const [x1, y1] = P(t), [x0, y0] = P(t - TAU);
      f.beginPath(); f.moveTo(x0, y0); f.lineTo(x1, y1); f.stroke();
    }
  },
  butterfly(f, x, y, s) {
    for (const d of [-1, 1]) {
      f.beginPath(); f.moveTo(x + d * s * 0.04, y - s * 0.08);
      f.bezierCurveTo(x + d * s * 0.35, y - s * 0.75, x + d * s * 0.95, y - s * 0.55, x + d * s * 0.7, y - s * 0.05);
      f.quadraticCurveTo(x + d * s * 0.4, y + s * 0.05, x + d * s * 0.04, y - s * 0.02);
      f.stroke();
      f.beginPath(); f.moveTo(x + d * s * 0.04, y + s * 0.02);
      f.bezierCurveTo(x + d * s * 0.5, y + s * 0.02, x + d * s * 0.62, y + s * 0.5, x + d * s * 0.3, y + s * 0.52);
      f.quadraticCurveTo(x + d * s * 0.12, y + s * 0.5, x + d * s * 0.04, y + s * 0.12);
      f.stroke();
      f.beginPath(); f.arc(x + d * s * 0.5, y - s * 0.3, s * 0.07, 0, TAU); f.fill();
      f.beginPath(); f.moveTo(x + d * s * 0.02, y - s * 0.3); f.quadraticCurveTo(x + d * s * 0.08, y - s * 0.6, x + d * s * 0.22, y - s * 0.68); f.stroke();
    }
    f.beginPath(); f.ellipse(x, y + s * 0.05, s * 0.045, s * 0.32, 0, 0, TAU); f.fill();
  },
  eye(f, x, y, s) {
    f.beginPath(); f.moveTo(x - s * 0.8, y);
    f.quadraticCurveTo(x, y - s * 0.62, x + s * 0.8, y); f.quadraticCurveTo(x, y + s * 0.62, x - s * 0.8, y);
    f.closePath(); f.stroke();
    f.beginPath(); f.arc(x, y, s * 0.24, 0, TAU); f.stroke();
    f.beginPath(); f.arc(x, y, s * 0.1, 0, TAU); f.fill();
    for (let k = -2; k <= 2; k++) {
      const a = -Math.PI / 2 + k * 0.38;
      f.beginPath(); f.moveTo(x + Math.cos(a) * s * 0.36, y + Math.sin(a) * s * 0.36); f.lineTo(x + Math.cos(a) * s * 0.52, y + Math.sin(a) * s * 0.52); f.stroke();
    }
  },
  city(f, x, y, s) {
    const base = y + s * 0.42;
    const xs = [-0.8, -0.56, -0.34, -0.1, 0.16, 0.38, 0.6, 0.8];
    const hs = [0.42, 0.74, 0.52, 0.96, 0.6, 0.82, 0.46];
    f.beginPath(); f.moveTo(x + xs[0] * s, base);
    hs.forEach((hh, k) => { const top = base - hh * s; f.lineTo(x + xs[k] * s, top); f.lineTo(x + xs[k + 1] * s, top); });
    f.lineTo(x + xs[xs.length - 1] * s, base); f.stroke();
    f.beginPath(); f.moveTo(x - s * 0.92, base); f.lineTo(x + s * 0.92, base); f.stroke();
    const dc = x + ((xs[3] + xs[4]) / 2) * s, dr = ((xs[4] - xs[3]) / 2) * s;
    f.beginPath(); f.arc(dc, base - hs[3] * s, dr * 0.8, Math.PI, 0); f.stroke();
    const sc = x + ((xs[1] + xs[2]) / 2) * s, st = base - hs[1] * s;
    f.beginPath(); f.moveTo(sc - s * 0.06, st); f.lineTo(sc, st - s * 0.22); f.lineTo(sc + s * 0.06, st); f.stroke();
    const win = Math.max(2, s * 0.05);
    for (let k = 0; k < hs.length; k++) {
      for (let r = 1; r < hs[k] * 5 - 0.5; r++) if ((k + r) % 2 === 0) f.fillRect(x + ((xs[k] + xs[k + 1]) / 2) * s - win / 2, base - r * s * 0.18, win, win);
    }
  },
  fish(f, x, y, s) {
    f.beginPath(); f.moveTo(x - s * 0.72, y);
    f.quadraticCurveTo(x - s * 0.15, y - s * 0.52, x + s * 0.38, y); f.quadraticCurveTo(x - s * 0.15, y + s * 0.52, x - s * 0.72, y);
    f.closePath(); f.stroke();
    f.beginPath(); f.moveTo(x + s * 0.36, y); f.lineTo(x + s * 0.74, y - s * 0.3); f.lineTo(x + s * 0.66, y); f.lineTo(x + s * 0.74, y + s * 0.3); f.closePath(); f.stroke();
    f.beginPath(); f.arc(x - s * 0.44, y - s * 0.06, s * 0.05, 0, TAU); f.fill();
    f.beginPath(); f.moveTo(x - s * 0.22, y - s * 0.2); f.quadraticCurveTo(x - s * 0.12, y, x - s * 0.22, y + s * 0.2); f.stroke();
    f.beginPath();
    for (let k = 0; k <= 30; k++) {
      const px = x - s * 0.8 + (k / 30) * s * 1.6, py = y + s * 0.62 + Math.sin((k / 30) * TAU * 2) * s * 0.05;
      if (k) f.lineTo(px, py); else f.moveTo(px, py);
    }
    f.stroke();
  },
  sprig(f, x, y, s) {
    f.beginPath(); f.moveTo(x, y + s * 0.75); f.quadraticCurveTo(x + s * 0.12, y, x, y - s * 0.75); f.stroke();
    for (let k = 0; k < 5; k++) {
      const ty = y + s * 0.5 - k * s * 0.28, len = s * (0.3 - k * 0.035);
      for (const d of [-1, 1]) {
        f.beginPath(); f.ellipse(x + d * len * 0.75 + s * 0.04, ty - len * 0.25, len * 0.75, len * 0.28, d * -0.55, 0, TAU); f.stroke();
      }
    }
  },
};
const MOTIFS = [
  [/solitude|孤独|macondo/, 'butterfly'], [/leagues|两万里|nautilus/, 'shell'], [/\bcit(y|ies)\b|城/, 'city'],
  [/prince|王子|\bstars?\b|星/, 'star'], [/seeing|观看|\beyes?\b|眼/, 'eye'], [/old man|老人|\bfish|鱼/, 'fish'],
  [/shore|海边|\bmoon|月|\bnight|夜/, 'moon'], [/\bsea\b|ocean|海|river|河|water|水/, 'waves'],
  [/\blive\b|活着|garden|\btrees?\b|树|leaf|叶/, 'sprig'], [/\bsun\b|日|summer|夏/, 'sun'],
];
function motifFor(book, i) {
  if (book?.motif && ORN[book.motif]) return book.motif;
  const t = book?.title;
  const s = (typeof t === 'string' ? t : Object.values(t || {}).join(' ')).toLowerCase();
  for (const [re, m] of MOTIFS) if (re.test(s)) return m;
  return ['diamond', 'sun', 'sprig', 'star', 'moon', 'waves', 'eye', 'shell'][i % 8];
}

function drawCover(book, i, pick) {
  const W = 360, H = 540;
  const cv = canvas(W, H), g = cv.getContext('2d', { willReadFrequently: true });
  const rgb = bookColor(book, i), foil = foilFor(rgb);
  const rand = rng(hash(`cover${i}|${book?.color ?? ''}`));
  cloth(g, W, H, rgb, rand, 0.8);
  g.fillStyle = gradient(g.createRadialGradient(W * 0.32, H * 0.18, 10, W * 0.5, H * 0.5, H * 0.85), [[0, 'rgba(255,255,255,.09)'], [1, 'rgba(0,0,0,.24)']]);
  g.fillRect(0, 0, W, H);
  // the hinge of a hardback, and a lit fore-edge
  g.fillStyle = gradient(g.createLinearGradient(0, 0, W * 0.12, 0), [[0, 'rgba(0,0,0,.45)'], [0.5, 'rgba(0,0,0,.14)'], [0.78, 'rgba(255,255,255,.07)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, W * 0.12, H);
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(W * 0.118, 0, 2, H);
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(W * 0.118 + 2, 0, 1, H);
  g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(W - 1.5, 0, 1.5, H);

  const F = canvas(W, H), f = F.getContext('2d');
  const paint = foilPaint(f, foil, 0, 0, W * 0.7, H);
  f.fillStyle = paint; f.strokeStyle = paint;
  f.lineCap = 'round'; f.lineJoin = 'round';
  const x0 = W * 0.18, x1 = W * 0.92, y0 = H * 0.06, y1 = H * 0.94, cx = (x0 + x1) / 2;
  f.lineWidth = 2.4; f.strokeRect(x0, y0, x1 - x0, y1 - y0);
  f.lineWidth = 1; f.strokeRect(x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16);
  for (const [x, y] of [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x0 + 8, y1 - 8], [x1 - 8, y1 - 8]]) lozenge(f, x, y, 4);
  const maxW = x1 - x0 - 44;
  const title = pick(book?.title) || '';
  if (title) {
    const cj = CJK.test(title);
    const apply = (s) => { f.font = font(s); spacing(f, cj ? s * 0.08 : 0); };
    const lhK = cj ? 1.28 : 1.04;
    const blk = fitBlock(f, title, maxW, H * 0.3, cj ? 46 : 52, cj ? 20 : 22, cj, cj ? 3 : 4, lhK, apply);
    apply(blk.size);
    f.textAlign = 'center'; f.textBaseline = 'middle';
    const lh = blk.size * lhK, ty = H * 0.3 - (lh * (blk.lines.length - 1)) / 2;
    blk.lines.forEach((ln, k) => f.fillText(ln, cx, ty + k * lh, maxW));
    spacing(f, 0);
  }
  f.lineWidth = 2;
  (ORN[motifFor(book, i)] || ORN.diamond)(f, cx, H * 0.585, W * 0.15);
  f.fillRect(cx - 18, H * 0.745, 36, 1.5);
  const author = pick(book?.author) || '';
  if (author) {
    const cj = CJK.test(author);
    const txt = cj ? author : author.toUpperCase();
    const apply = (s) => { f.font = cj ? font(s) : font(s, { weight: 500, family: SANS }); spacing(f, s * (cj ? 0.12 : 0.2)); };
    const s = fitSize(f, txt, maxW, cj ? 22 : 15, cj ? 12 : 9, apply) || (cj ? 12 : 9);
    apply(s);
    f.textAlign = 'center'; f.textBaseline = 'middle';
    f.fillText(txt, cx, H * 0.815, maxW);
    spacing(f, 0);
  }
  wear(f, W, H, rand, 0.7);
  stamp(g, F, foil);
  return cv;
}

// ------------------------------------------------------------------ spine quads in the room
// Which way is "up the spine" on this quad? Reads uv against world axes and the visible side.
function quadFrame(mesh) {
  const geo = mesh?.geometry;
  const pos = geo?.attributes?.position, uv = geo?.attributes?.uv;
  if (!pos || !uv || pos.count < 3) return null;
  mesh.updateWorldMatrix?.(true, false);
  const pts = [];
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let k = 0; k < pos.count; k++) {
    const u = uv.getX(k), v = uv.getY(k);
    pts.push({ p: new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld), u, v });
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const at = (u, v) => pts.reduce((b, e) => (Math.hypot(e.u - u, e.v - v) < Math.hypot(b.u - u, b.v - v) ? e : b)).p;
  const o = at(u0, v0);
  const U = at(u1, v0).clone().sub(o), V = at(u0, v1).clone().sub(o);
  const lu = U.length(), lv = V.length();
  if (lu < 1e-6 || lv < 1e-6) return null;
  const idx = geo.index;
  const ia = idx ? idx.getX(0) : 0, ib = idx ? idx.getX(1) : 1, ic = idx ? idx.getX(2) : 2;
  const pa = pts[ia]?.p, pb = pts[ib]?.p, pc = pts[ic]?.p;
  const n = pa && pb && pc ? pb.clone().sub(pa).cross(pc.clone().sub(pa)).normalize() : new THREE.Vector3(0, 0, 1);
  if (mesh.matrixWorld.determinant() < 0) n.negate();
  const right = new THREE.Vector3(0, 1, 0).cross(n);               // the viewer's right, seen from the front
  const hasRight = right.lengthSq() > 1e-6;
  U.divideScalar(lu); V.divideScalar(lv);
  const du = -U.y, dv = -V.y;                                       // how much each uv axis points down
  if (Math.abs(dv) >= Math.abs(du)) {
    return { vertical: 'v', width: lu, height: lv, flipV: dv < 0, flipU: hasRight ? U.dot(right) < 0 : false };
  }
  return { vertical: 'u', width: lv, height: lu, flipU: du < 0, flipV: hasRight ? V.dot(right) < 0 : false };
}
// copy the upright logical spine into texture space (canvas x = u, canvas y = v)
function orient(L, T, fr) {
  const g = T.getContext('2d'), lw = L.width, lh = L.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, T.width, T.height);
  if (fr.vertical === 'v') g.setTransform(fr.flipU ? -1 : 1, 0, 0, fr.flipV ? -1 : 1, fr.flipU ? lw : 0, fr.flipV ? lh : 0);
  else g.setTransform(0, fr.flipV ? -1 : 1, fr.flipU ? -1 : 1, 0, fr.flipU ? lh : 0, fr.flipV ? lw : 0);
  g.drawImage(L, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
const SPINE_FRAG = /* glsl */`
  uniform float uLift, uSweep, uAxisU, uFlipS;
  vec3 picture(vec2 uv, vec3 light) {
    vec3 c = texture2D(tMap, uv).rgb;
    float s = mix(uv.y, uv.x, uAxisU);
    s = mix(s, 1.0 - s, uFlipS);
    float gd = (s - uSweep) * 7.0;                 // pow() of a negative base is undefined in GLSL ES
    float glint = exp(-gd * gd);
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    return c * light * (1.0 + 0.22 * uLift) + light * glint * (0.08 + 0.3 * lum) * uLift;
  }
`;

// ------------------------------------------------------------------ DOM helpers
function el(tag, cls, attrs) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
function icon(id) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', 'ic');
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', `#${id}`);
  s.appendChild(u);
  return s;
}
// Parse the way the browser will (it drops tabs, newlines and leading control characters, and reads
// backslashes as slashes), then judge the result rather than the raw string.
function parseUrl(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  try { return new URL(s, document.baseURI || location.href); } catch { return null; }
}
const sameSite = (u) => u.protocol === location.protocol && u.origin === location.origin;
// links: http(s), mailto, or a page of this site; { href, external } or null
function safeLink(v) {
  const u = parseUrl(v);
  if (!u) return null;
  if (u.protocol === 'mailto:') return { href: u.href, external: false };
  if (sameSite(u)) return { href: u.href, external: false };
  if (u.protocol === 'http:' || u.protocol === 'https:') return { href: u.href, external: true };
  return null;
}
// images only from this site (no other hosts, no script or data URLs)
function safeSrc(v) {
  const u = parseUrl(v);
  if (!u || !['http:', 'https:', 'file:'].includes(u.protocol) || !sameSite(u)) return '';
  return u.href;
}

// ------------------------------------------------------------------ the module
export function create(ctx) {
  try {
    return build(ctx);
  } catch (e) {
    console.warn('[library] disabled:', e);
    return { actions: {}, tips: {}, keys: {}, api: { openShelf() {}, open() {}, close() { return false; }, books: () => [] } };
  }
}

function build(ctx) {
  const warn = (e) => console.warn('[library]', e);
  const safe = (fn) => (...a) => { try { return fn(...a); } catch (e) { warn(e); return false; } };
  const still = !!ctx.still;
  try { ctx.i18n?.extend?.(STRINGS); } catch (e) { warn(e); }
  const lang = () => (ctx.i18n?.lang === 'zh' ? 'zh' : 'en');
  const t = (k, vars = {}) => {
    let s = null;
    try { s = ctx.i18n?.t?.(k, vars); } catch { s = null; }
    if (!s || s === k) s = String(STRINGS[lang()][k] ?? STRINGS.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => (n in vars ? vars[n] : ''));
    return s;
  };
  const pick = (v) => {
    try { if (ctx.i18n?.pick) return String(ctx.i18n.pick(v) ?? '').trim(); } catch { /* fall through */ }
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
    return String(v[lang()] || v.en || Object.values(v)[0] || '').trim();
  };
  const yearOf = (b) => (b?.year == null || b.year === '' ? '' : typeof b.year === 'object' ? pick(b.year) : String(b.year));
  const books = (Array.isArray(ctx.content?.books) ? ctx.content.books : []).filter((b) => b && typeof b === 'object');

  // ------------------------------------------------ 3D spines
  const spines = [];
  let spinesRetried = false;
  const L = canvas(128, 640);                                       // shared scratch for the upright spine
  function paintSpine(sp) {
    if (L.width !== sp.lw || L.height !== sp.lh) { L.width = sp.lw; L.height = sp.lh; }
    const b = books[sp.slot];
    drawSpine(L, b || { color: BLANK[sp.slot % BLANK.length] }, sp.slot, pick);
    orient(L, sp.T, sp.frame);
    sp.tex.needsUpdate = true;
  }
  function paintSpines() { for (const sp of spines) { try { paintSpine(sp); } catch (e) { warn(e); } } }
  function setupSpines() {
    const root = ctx.root;
    if (!root?.traverse) return;
    const found = [];
    root.traverse((o) => { if (o.isMesh && (o.userData?.group === 'spine' || /^spine_\d+$/.test(o.name || ''))) found.push(o); });
    let aniso = 4;
    try { aniso = Math.min(8, ctx.renderer?.capabilities?.getMaxAnisotropy?.() || 4); } catch { /* default */ }
    for (const mesh of found) {
      try {
        const fromName = /^spine_(\d+)/.exec(mesh.name || '');
        const slot = Number.isInteger(mesh.userData?.slot) ? mesh.userData.slot : fromName ? Number(fromName[1]) : -1;
        if (slot < 0 || slot >= MAX_SPINES || spines.some((s) => s.slot === slot)) continue;
        if (!mesh.geometry?.attributes?.uv) continue;
        const frame = quadFrame(mesh) || { vertical: 'v', width: 0.045, height: 0.22, flipU: false, flipV: false };
        const aspect = clamp(frame.width / Math.max(1e-6, frame.height), 0.05, 1);
        const lw = 128, lh = clamp(Math.round(lw / aspect), 128, 1024);
        const T = frame.vertical === 'v' ? canvas(lw, lh) : canvas(lh, lw);
        const tex = new THREE.CanvasTexture(T);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = aniso;
        const uniforms = {
          uLift: { value: 0 }, uSweep: { value: -1 },
          uAxisU: { value: frame.vertical === 'u' ? 1 : 0 },
          uFlipS: { value: (frame.vertical === 'u' ? frame.flipU : frame.flipV) ? 1 : 0 },
        };
        let mat = null;
        if (mesh.geometry.attributes.uv1 && typeof ctx.mixer?.pictureMaterial === 'function') {
          try { mat = ctx.mixer.pictureMaterial(tex, { extraUniforms: uniforms, extraFrag: SPINE_FRAG }); } catch (e) { warn(e); }
        }
        if (!mat) mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
        mesh.material = mat;
        const sp = { slot, mesh, T, tex, frame, lw, lh, uniforms, lift: 0, sweepT: 1 };
        spines.push(sp);
        paintSpine(sp);
      } catch (e) { warn(e); }
    }
  }
  try { setupSpines(); } catch (e) { warn(e); }

  // ------------------------------------------------ covers
  const covers = new Map();
  function coverFor(i) {
    const key = `${i}|${lang()}`;
    if (covers.has(key)) return covers.get(key);
    const b = books[i];
    const generated = () => { const c = drawCover(b, i, pick); c.setAttribute('aria-hidden', 'true'); return c; };
    let node;
    const src = safeSrc(b?.cover);
    if (src) {
      node = new Image();
      node.alt = '';
      node.decoding = 'async';
      node.addEventListener('error', () => {
        try { const c = generated(); covers.set(key, c); node.replaceWith(c); } catch (e) { warn(e); }
      }, { once: true });
      node.src = src;
    } else node = generated();
    covers.set(key, node);
    return node;
  }

  // ------------------------------------------------ panel
  const R = {};
  let isOpen = false, cur = -1, hoverIdx = -1, returnFocus = null, swapTimer = 0, lastRustle = 0;
  let rivalObs = null, lastView;
  const mode = () => R.root?.dataset.mode || 'list';
  const lastOpened = () => {
    let raw = null;
    try { raw = ctx.store?.get?.('library.last'); } catch { raw = null; }
    if (raw == null || raw === '') return -1;
    const v = Number(raw);
    return Number.isInteger(v) && books[v] ? v : -1;
  };

  function buildPanel() {
    R.root = el('section', 'lib surface', { id: 'egg-library', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'egg-library-h', 'data-open': 'false', 'data-mode': 'list', 'aria-hidden': 'true' });
    R.root.inert = true;
    R.close = el('button', 'close round lib-close', { type: 'button' });
    R.close.append(icon('i-close'));

    R.list = el('div', 'lib-view lib-list');
    R.kicker = el('p', 'lib-kicker');
    R.h = el('h3', 'lib-h', { id: 'egg-library-h', tabindex: '-1' });
    R.lede = el('p', 'lib-lede');
    R.shelf = el('div', 'lib-shelf');
    R.row = el('div', 'lib-row');
    R.shelf.append(R.row);
    R.peek = el('div', 'lib-peek', { 'aria-hidden': 'true' });
    R.peekT = el('p', 'lib-peek-t');
    R.peekM = el('p', 'lib-peek-m');
    R.peek.append(R.peekT, R.peekM);
    R.foot = el('p', 'lib-foot');
    R.footCount = el('span');
    R.footKeys = el('span', 'lib-keys');
    R.foot.append(R.footCount, R.footKeys);
    R.list.append(R.kicker, R.h, R.lede, R.shelf, R.peek, R.foot);

    R.card = el('div', 'lib-view lib-card');
    const top = el('div', 'lib-top');
    R.back = el('button', 'lib-back', { type: 'button' });
    R.backT = el('span');
    R.back.append(icon('i-left'), R.backT);
    top.append(R.back);
    R.swap = el('div', 'lib-swap');
    const head = el('div', 'lib-head');
    R.book = el('div', 'lib-book', { 'data-open': 'false' });
    R.page = el('div', 'lib-page', { 'aria-hidden': 'true' });
    const plate = el('div', 'lib-plate');
    R.plateK = el('span', 'lib-plate-k');
    R.plateN = el('strong', 'lib-plate-n');
    R.plateNo = el('small', 'lib-plate-no');
    plate.append(R.plateK, R.plateN, R.plateNo);
    R.page.append(plate);
    R.cover = el('button', 'lib-cover', { type: 'button', 'aria-pressed': 'false' });
    R.face = el('span', 'lib-face');
    R.cover.append(R.face, el('span', 'lib-endpaper', { 'aria-hidden': 'true' }));
    R.book.append(R.page, R.cover);
    const meta = el('div', 'lib-meta');
    R.ck = el('p', 'lib-kicker');
    R.ct = el('h3', 'lib-title', { id: 'egg-library-title', tabindex: '-1' });
    R.ca = el('p', 'lib-author');
    R.cy = el('p', 'lib-year');
    meta.append(R.ck, R.ct, R.ca, R.cy);
    head.append(R.book, meta);
    const body = el('div', 'lib-body');
    R.nl = el('p', 'lib-label');
    R.note = el('p', 'lib-note');
    R.quote = el('blockquote', 'lib-quote');
    R.qp = el('p');
    R.quote.append(R.qp);
    R.link = el('a', 'lib-link');
    body.append(R.nl, R.note, R.quote, R.link);
    R.swap.append(head, body);
    const nav = el('div', 'lib-nav');
    R.idx = el('span', 'lib-idx');
    const btns = el('div', 'lib-btns');
    R.prev = el('button', 'round', { type: 'button' });
    R.prev.append(icon('i-left'));
    R.next = el('button', 'round', { type: 'button' });
    R.next.append(icon('i-right'));
    btns.append(R.prev, R.next);
    nav.append(R.idx, btns);
    R.card.append(top, R.swap, nav);
    R.root.append(R.close, R.list, R.card);
    document.body.append(R.root);

    R.close.addEventListener('click', safe(() => close()));
    R.back.addEventListener('click', safe(() => backToShelf()));
    R.prev.addEventListener('click', safe(() => step(-1)));
    R.next.addEventListener('click', safe(() => step(1)));
    R.cover.addEventListener('click', safe(() => {
      const on = R.book.dataset.open !== 'true';
      setCover(on);
      if (on) rustle(true);
    }));
    // keep the room's chrome awake while the visitor reads
    R.root.addEventListener('pointerdown', () => { try { ctx.ui?.poke?.(); } catch { /* optional */ } }, { passive: true });
    // phones: swipe the card sideways to change book
    let sx = null, sy = 0;
    R.card.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    R.card.addEventListener('pointerup', safe((e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }));
    R.card.addEventListener('pointercancel', () => { sx = null; });
    const fade = () => {
      const s = R.shelf;
      s.classList.toggle('more', s.scrollWidth - s.clientWidth - s.scrollLeft > 4);
    };
    R.fade = fade;
    R.shelf.addEventListener('scroll', fade, { passive: true });
    addEventListener('resize', () => { if (isOpen) fade(); }, { passive: true });
  }

  function spineLabel(b, i) {
    const title = pick(b.title), author = pick(b.author), year = yearOf(b);
    let s = author ? t('library.tipBook', { title, author }) : title;
    if (year) s += `, ${year}`;
    if (i === lastOpened()) s += ` · ${t('library.marked')}`;
    return s;
  }

  function peekAt(i) {
    hoverIdx = i;
    const b = books[i];
    if (!b) {
      R.peekT.textContent = books.length ? t('library.pick') : t('library.emptyHint');
      R.peekT.classList.add('soft');
      R.peekM.textContent = '';
      return;
    }
    R.peekT.classList.remove('soft');
    R.peekT.textContent = pick(b.title);
    R.peekM.textContent = [pick(b.author), yearOf(b)].filter(Boolean).join(' · ');
  }

  function renderList() {
    R.root.setAttribute('aria-label', t('library.dialog'));
    R.close.setAttribute('aria-label', t('library.close'));
    R.kicker.textContent = t('library.kicker');
    R.h.textContent = t('library.heading');
    R.lede.textContent = books.length ? t('library.lede') : t('library.empty');
    R.row.replaceChildren();
    const last = lastOpened();
    books.forEach((b, i) => {
      const rgb = bookColor(b, i), foil = foilFor(rgb), r = rng(hash(`h${i}|${b.color ?? ''}`));
      const btn = el('button', 'lib-spine', { type: 'button', 'data-i': String(i) });
      btn.style.setProperty('--c', css(rgb));
      btn.style.setProperty('--foil', css(foil.text));
      btn.style.setProperty('--sheen', String(foil.sheen));
      btn.style.setProperty('--emb', foil.flat ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.38)');
      btn.style.setProperty('--h', `${Math.round(178 + r() * 30)}px`);
      btn.style.setProperty('--w', `${Math.round(38 + r() * 6)}px`);
      const title = pick(b.title);
      const n = Array.from(title).length, cj = CJK.test(title);
      const tw = el('span', 'lib-spine-t');
      const ts = el('span');
      ts.textContent = title;
      ts.style.fontSize = `${cj ? (n <= 9 ? 14 : n <= 16 ? 13 : 12) : (n <= 18 ? 15 : n <= 30 ? 13.5 : 12.5)}px`;
      tw.append(ts);
      btn.append(tw);
      if (i === last) { btn.dataset.last = 'true'; btn.append(el('i', 'lib-rib', { 'aria-hidden': 'true' })); }
      btn.setAttribute('aria-label', spineLabel(b, i));
      btn.addEventListener('click', safe(() => open(i)));
      btn.addEventListener('pointerenter', () => peekAt(i));
      btn.addEventListener('focus', () => peekAt(i));
      btn.addEventListener('pointerleave', () => { if (hoverIdx === i) peekAt(-1); });
      btn.addEventListener('blur', () => { if (hoverIdx === i) peekAt(-1); });
      R.row.append(btn);
    });
    if (books.length) R.row.append(el('span', 'lib-bookend', { 'aria-hidden': 'true' }));
    R.shelf.hidden = !books.length;
    peekAt(-1);
    const years = books.map((b) => parseInt(yearOf(b), 10)).filter(Number.isFinite);
    const lo = Math.min(...years), hi = Math.max(...years);
    const count = books.length === 1 ? t('library.count1') : t('library.count', { n: books.length });
    R.footCount.textContent = [books.length ? count : '', years.length ? (lo === hi ? String(lo) : `${lo}–${hi}`) : ''].filter(Boolean).join(' · ');
    R.footKeys.textContent = books.length > 1 ? t('library.keys') : '';
    R.foot.hidden = !books.length;
  }

  function setCover(on) {
    const title = pick(books[cur]?.title);
    R.book.dataset.open = String(on);
    R.cover.setAttribute('aria-pressed', String(on));
    R.cover.setAttribute('aria-label', t(on ? 'library.closeCover' : 'library.openCover', { title }));
    R.page.setAttribute('aria-hidden', String(!on));
  }

  function fillCard(i) {
    const b = books[i];
    if (!b) return;
    cur = i;
    const title = pick(b.title), author = pick(b.author), year = yearOf(b);
    const rgb = bookColor(b, i);
    R.backT.textContent = t('library.back');
    R.close.setAttribute('aria-label', t('library.close'));
    R.ck.textContent = t('library.from');
    R.ct.textContent = title || '—';
    R.ca.textContent = author;
    R.ca.hidden = !author;
    R.cy.textContent = year;
    R.cy.hidden = !year;
    const note = pick(b.note);
    R.nl.textContent = t('library.note');
    R.note.textContent = note;
    R.nl.hidden = R.note.hidden = !note;
    const quote = pick(b.quote);
    R.qp.textContent = quote;
    R.quote.hidden = !quote;
    R.quote.setAttribute('aria-label', t('library.quote'));
    const link = safeLink(b.link);
    R.link.hidden = !link;
    if (link) {
      R.link.href = link.href;
      if (link.external) { R.link.target = '_blank'; R.link.rel = 'noopener'; } else { R.link.removeAttribute('target'); R.link.removeAttribute('rel'); }
    } else R.link.removeAttribute('href');
    R.link.textContent = `${t('library.link')} ↗`;
    R.idx.textContent = `${pad2(i + 1)} / ${pad2(books.length)}`;
    R.prev.setAttribute('aria-label', t('library.prev'));
    R.next.setAttribute('aria-label', t('library.next'));
    R.prev.disabled = R.next.disabled = books.length < 2;
    R.cover.style.setProperty('--c', css(rgb));
    R.cover.style.setProperty('--c2', css(mixRgb(rgb, [255, 255, 255], 0.24)));
    try { R.face.replaceChildren(coverFor(i)); } catch (e) { warn(e); R.face.replaceChildren(); }
    R.plateK.textContent = t('library.exlibris');
    const owner = pick(ctx.content?.site?.name);
    R.plateN.textContent = owner;
    R.plateN.hidden = !owner;
    R.plateNo.textContent = t('library.no', { n: pad2(i + 1) });
    setCover(false);
  }

  function swapTo(i, dir) {
    clearTimeout(swapTimer);
    const box = R.swap;
    if (still || !dir) { box.classList.remove('out'); fillCard(i); return; }
    cur = i;                                        // so a quick second press steps from here
    box.style.setProperty('--dx', `${dir * -14}px`);
    box.classList.add('out');
    swapTimer = setTimeout(() => {
      try {
        fillCard(i);
        box.style.transition = 'none';
        box.style.setProperty('--dx', `${dir * 14}px`);
        void box.offsetWidth;
        box.style.transition = '';
        box.classList.remove('out');
      } catch (e) { warn(e); box.classList.remove('out'); }
    }, 150);
  }

  // the room's own popovers (main panel, atmosphere sheet, dial menus) give way when the library opens
  function quietRoom() {
    try { ctx.ui?.closePanel?.(); } catch (e) { warn(e); }
    try {
      if (typeof ctx.ui?.closeAll === 'function') { ctx.ui.closeAll(); return; }
      const atmo = document.getElementById('atmo');
      if (atmo?.dataset.open === 'true') atmo.dataset.open = 'false';
      document.querySelectorAll('.dial[data-open="true"]').forEach((d) => {
        d.dataset.open = 'false';
        d.querySelector('.dial-btn')?.setAttribute('aria-expanded', 'false');
      });
    } catch (e) { warn(e); }
  }

  function show(m) {
    if (!isOpen) {
      const a = document.activeElement;
      let back = a && a !== document.body && !R.root.contains(a) ? a : null;
      try { const dial = back?.closest?.('.dial'); if (dial) back = dial.querySelector('.dial-btn') || back; } catch { /* keep */ }
      returnFocus = back;
      quietRoom();
      try { ctx.emit?.('overlay', { name: 'library' }); } catch (e) { warn(e); }
      try { rivalObs?.takeRecords(); } catch { /* ignore */ }   // what opened before us is not a rival
    }
    isOpen = true;
    R.root.dataset.mode = m;
    R.root.setAttribute('aria-labelledby', m === 'card' ? 'egg-library-title' : 'egg-library-h');
    R.root.inert = false;
    R.root.removeAttribute('aria-hidden');
    R.root.dataset.open = 'true';
    try { ctx.ui?.poke?.(); } catch { /* optional */ }
  }

  const focus = (node) => { try { node?.focus?.({ preventScroll: true }); } catch { /* ignore */ } };
  function focusSpine(i) {
    const btn = R.row.querySelector(`.lib-spine[data-i="${i}"]`) || R.row.querySelector('.lib-spine');
    if (!btn) { focus(R.h); return; }
    focus(btn);
    try { btn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* ignore */ }
  }

  function goShelf() {
    if (goShelf.busy) return;
    goShelf.busy = true;
    try {
      if (ctx.rig?.view !== 'shelf') {
        if (typeof ctx.H?.go === 'function') ctx.H.go('shelf');
        else ctx.rig?.go?.('shelf');
      }
    } catch (e) { warn(e); } finally { goShelf.busy = false; }
  }

  function openShelf(opts = {}) {
    if (opts?.go) goShelf();
    clearTimeout(swapTimer);
    R.swap.classList.remove('out');
    renderList();
    show('list');
    focus(R.h);
    requestAnimationFrame(() => { try { R.fade(); } catch { /* ignore */ } });
  }

  function backToShelf() {
    const i = cur;
    renderList();
    show('list');
    focusSpine(i);
    requestAnimationFrame(() => { try { R.fade(); } catch { /* ignore */ } });
  }

  function open(i, dir = 0) {
    const n = Number(i);
    if (!Number.isInteger(n) || !books[n]) { openShelf(); return; }
    const switching = isOpen && mode() === 'card' && dir !== 0;
    if (switching) swapTo(n, dir);
    else { clearTimeout(swapTimer); R.swap.classList.remove('out'); fillCard(n); }
    show('card');
    try { ctx.store?.set?.('library.last', String(n)); } catch { /* optional */ }
    const sp = spines.find((s) => s.slot === n);
    if (sp && !still) sp.sweepT = 0;
    rustle(false);
    if (!switching) focus(R.ct);
  }

  function step(d) {
    if (books.length < 2) return;
    const base = cur >= 0 ? cur : 0;
    open((base + d + books.length) % books.length, d);
  }

  function close(opts = {}) {
    if (!isOpen) return false;
    isOpen = false;
    clearTimeout(swapTimer);
    R.swap.classList.remove('out');
    const hadFocus = R.root.contains(document.activeElement);
    R.root.dataset.open = 'false';
    R.root.inert = true;
    R.root.setAttribute('aria-hidden', 'true');
    setCover(false);
    hoverIdx = -1;
    if (opts.restore !== false && hadFocus && returnFocus?.isConnected) focus(returnFocus);
    returnFocus = null;
    return true;
  }

  // a soft page turn, through the room's sound bus
  function rustle(soft) {
    try {
      const s = ctx.sound;
      const on = typeof ctx.soundOn === 'function' ? ctx.soundOn() : s?.enabled;
      if (!s?.ctx || !on) return;
      const now = performance.now();
      if (now - lastRustle < 90) return;
      lastRustle = now;
      if (typeof s.burst === 'function' && s.white && typeof s.filter === 'function') {
        s.burst(s.white, [s.filter('highpass', 1200), s.filter('lowpass', 5200)], soft ? 0.035 : 0.06, 0.03, 0.16);
        s.burst(s.white, [s.filter('bandpass', 3400, 1.4)], soft ? 0.02 : 0.035, 0.005, 0.07, 0.11);
      } else s.tone?.(1800, 0.01, 0.002, 0.05, 'triangle');
    } catch { /* sound is optional */ }
  }

  const typing = (e) => {
    const tg = e?.target;
    return !!(tg?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]') && !R.root?.contains(tg));
  };
  // keys that belong to someone else: browser shortcuts (Alt/Cmd/Ctrl + arrow is Back / Forward), or
  // focus inside another overlay (the room's panel, sheets and dials, another module's dialog)
  const chord = (e) => !!(e?.altKey || e?.metaKey || e?.ctrlKey);
  const elsewhere = (e) => {
    for (const n of [e?.target, document.activeElement]) {
      if (!(n instanceof Element) || n === document.body || R.root.contains(n)) continue;
      const o = n.closest(OTHER);
      // a closed one (a dial button with its menu shut) does not count
      if (o && o.closest('[data-open]')?.dataset.open !== 'false') return true;
    }
    return false;
  };
  const mine = (e) => isOpen && !chord(e) && !typing(e) && !elsewhere(e);
  function arrow(e, d) {
    if (!mine(e)) return false;
    if (mode() === 'card') { step(d); return true; }
    const els = Array.from(R.row.querySelectorAll('.lib-spine'));
    if (!els.length) return true;
    const at = els.indexOf(document.activeElement);
    const n = at < 0 ? (d > 0 ? 0 : els.length - 1) : clamp(at + d, 0, els.length - 1);
    focus(els[n]);
    try { els[n].scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* ignore */ }
    return true;
  }

  buildPanel();
  renderList();

  // ------------------------------------------------ listeners: language, other overlays, fonts
  try {
    ctx.on?.('lang', safe(() => {
      covers.clear();
      paintSpines();
      renderList();
      if (isOpen && mode() === 'card' && books[cur]) fillCard(cur);
    }));
    ctx.on?.('overlay', safe((d) => {
      const name = typeof d === 'string' ? d : d?.name;
      if (name && name !== 'library') close({ restore: false });
    }));
  } catch (e) { warn(e); }
  // anything else that opens takes over: the room's panel, atmosphere sheet or a dial menu, or another
  // module's dialog (diary, details and moments mark theirs with data-open but do not emit 'overlay')
  try {
    if (typeof MutationObserver === 'function') {
      const rival = (n) => {
        if (!n || n.nodeType !== 1 || R.root.contains(n) || n.dataset?.open !== 'true') return false;
        if (n.matches(OTHER)) return true;
        try { return !!n.querySelector(':scope > [role="dialog"], :scope > [aria-modal="true"]'); } catch { return false; }
      };
      rivalObs = new MutationObserver((list) => {
        try { if (isOpen && list.some((m) => rival(m.target))) close({ restore: false }); } catch (e) { warn(e); }
      });
      rivalObs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-open'] });
    }
  } catch (e) { warn(e); }
  // focus moving into another dialog (one that shows itself without data-open, like the terminal)
  try {
    document.addEventListener('focusin', (e) => {
      try {
        const n = e.target;
        if (isOpen && n instanceof Element && !R.root.contains(n) && n.closest('[role="dialog"], [aria-modal="true"]')) close({ restore: false });
      } catch (err) { warn(err); }
    });
  } catch (e) { warn(e); }
  // a camera move away from the shelf closes the panel at once (update() keeps a per-frame fallback)
  try {
    ctx.on?.('view', safe((v) => {
      lastView = v;
      if (isOpen && v && v !== 'shelf') close({ restore: false });
    }));
  } catch (e) { warn(e); }
  try {
    const fs = document.fonts;
    if (fs?.load && !fs.check?.('48px "Instrument Serif"')) {
      Promise.all([fs.load('400 48px "Instrument Serif"'), fs.load('italic 400 48px "Instrument Serif"')])
        .then(safe(() => {
          covers.clear();
          paintSpines();
          if (isOpen && mode() === 'card' && books[cur]) R.face.replaceChildren(coverFor(cur));
        }))
        .catch(() => {});
    }
  } catch { /* fonts API missing: canvases keep the fallback serif */ }

  // ------------------------------------------------ module surface
  const tips = { shelf: () => t('library.tipShelf') };
  const actions = { shelf: safe(() => { goShelf(); openShelf(); }) };
  for (let i = 0; i < MAX_SPINES; i++) {
    tips[`book_${i}`] = () => {
      try {
        const b = books[i];
        if (!b) return t('library.tipShelf');
        const title = pick(b.title), author = pick(b.author);
        if (author) return t('library.tipBook', { title, author });
        return lang() === 'zh' ? `《${title}》` : title;
      } catch { return ''; }
    };
    actions[`book_${i}`] = safe(() => { if (books[i]) open(i); else { goShelf(); openShelf(); } });
  }

  return {
    actions,
    tips,
    keys: {
      Escape: (e) => { try { return mine(e) ? close() : false; } catch (err) { warn(err); return false; } },
      ArrowLeft: (e) => { try { return arrow(e, -1); } catch (err) { warn(err); return false; } },
      ArrowRight: (e) => { try { return arrow(e, 1); } catch (err) { warn(err); return false; } },
    },
    update(dt, frame) {
      try {
        if (!spinesRetried && !spines.length) { spinesRetried = true; setupSpines(); }   // props may arrive late
        const v = frame?.view ?? ctx.rig?.view;
        if (v !== lastView) {
          if (isOpen && lastView !== undefined && v && v !== 'shelf') close({ restore: false });
          lastView = v;
        }
        const d = Number.isFinite(dt) ? dt : 0.016;
        const k = Math.min(1, d * 6);
        for (const sp of spines) {
          const target = isOpen && mode() === 'card' && cur === sp.slot ? 1 : isOpen && hoverIdx === sp.slot ? 0.55 : 0;
          sp.lift += (target - sp.lift) * k;
          if (Math.abs(sp.lift) < 1e-4) sp.lift = 0;
          sp.uniforms.uLift.value = sp.lift;
          if (sp.sweepT < 1) {
            sp.sweepT = Math.min(1, sp.sweepT + d / 1.1);
            const e = 1 - (1 - sp.sweepT) ** 3;
            sp.uniforms.uSweep.value = -0.25 + 1.5 * e;
          } else sp.uniforms.uSweep.value = -1;
        }
      } catch (e) { warn(e); }
    },
    api: {
      openShelf: safe((opts) => openShelf(opts)),
      open: safe((i) => open(i)),
      close: safe(() => close()),
      books: () => books.slice(),
    },
  };
}
