// music: the record player plays, and the owner can stock it with their own records.
//
// Adding your own tracks (content.json → "music")
//   1. Put the audio file (mp3 / m4a / ogg) in site/media/music/ and, if you have one, a square cover image.
//   2. Add an entry to music.tracks:
//        { "title": {"en": "…", "zh": "…"}, "artist": "…", "album": {"en": "…", "zh": "…"}, "year": "2026",
//          "src": "media/music/track.mp3", "cover": "media/music/track.jpg",
//          "notes": {"en": "…", "zh": "…"}, "credits": "…", "link": "https://…" }
//      Any text field may be a plain string or {en, zh}. Entries with an empty "src" are skipped.
//      An empty "cover" gets a generated riso-print cover seeded from the title.
//   3. "includeStudioTape": false hides the built-in generated loop (it still plays when no file track exists).
//
// Integration notes
// - Hit boxes: `hit_record` -> actions.record (toggles playback; starting playback opens the record panel),
//   `hit_sleeve` -> actions.sleeve (opens / closes the panel). tips.record / tips.sleeve are the hover labels.
// - Replaces main's own record behaviour: main.js keeps `musicOn` false once this module owns `record`, so its
//   platter line stays idle; this module spins `record_platter` and swings `tonearm` itself (TONEARM_PLAY,
//   TONEARM_SWEEP, TONEARM_LIFT exported below for tuning). A CircleGeometry record (`record_disc`) is added as a child of the
//   platter, and the `sleeve` picture quad gets its own pictureMaterial (cover-fit, cross-fades between covers).
// - Audio: one HTMLAudioElement per file track, routed el -> MediaElementSource -> gain -> analyser ->
//   ctx.sound.bus, so the site mute applies. Turning the site sound off pauses playback. The studio tape uses
//   ctx.sound.startLofi() / stopLofi(). (audio.js note: every startLofi() adds a crackle loop that stopLofi()
//   only silences; this module disconnects ctx.sound.crackle after the fade, but the looping source itself
//   cannot be stopped from here. A `this.crackle` src.stop() in stopLofi() would close it fully.)
// - keys: Escape closes the panel (true only when it closed; false while focus sits in an open dial menu, so ui.js
//   closes that first). ArrowLeft / ArrowRight return true while the panel
//   is open and focus is inside it (outside the seek bar) so the room does not flip works; on the mini card they
//   pass through to the room. ArrowUp / ArrowDown move between track rows.
// - DOM: the record panel (`.mu-panel`, z-index 25) and the now-playing card (`.mu-mini`, z-index 12) are
//   appended to <body>; styles/eggs-music.css. Adds i-mu-play / i-mu-pause / i-mu-prev / i-mu-next symbols.
//   Closes itself when another overlay opens (an element under <body> gets data-open="true" and is a
//   [role=dialog], .panel or .sheet, or wraps a dialog; also .atmo on phones), when the view changes to
//   'work', or on ctx.emit('overlay', name) from another module; it emits ctx.emit('overlay', 'music') on open.
// - api: open(), close(), play(i), pause(), stop(), toggle(), next(), prev(), seek(sec), isPlaying(),
//   current(), tracks(), level() (0..1 loudness, for modules that want to move to the music).
// - ctx.store key 'music.track' remembers the last record a visitor picked.
import * as THREE from '../three.js';
import { fitCanvas } from '../content.js';

export const TONEARM_PLAY = -0.14;     // tonearm rotation.y when the needle first sets down (tuned to room.glb)
// Extra swing toward the spindle as a track plays (the needle walking inward); 0 keeps the arm at TONEARM_PLAY.
// Measured on the current room.glb, needle tip to spindle: 0.164 m at 0 (rest, off the record), ~0.143 m at -0.08
// (lead-in groove), ~0.128 at -0.14, 0.113 at -0.2, 0.058 at -0.42 (run-out; the label edge is at 0.05). The drop
// sits a little into the grooves so the swing reads from the shelf view; PLAY + SWEEP = -0.4 ends near the run-out.
export const TONEARM_SWEEP = -0.26;
// the arm rises off its rest while it swings over and settles onto the record (rotation.x, radians; the arm points
// along +z, so a negative x lifts the headshell). About 1 cm at the headshell; the counterweight dips ~3 mm.
export const TONEARM_LIFT = 0.05;

const SPIN = 3.49;                     // 33⅓ rpm in rad/s
const SPIN_UP = 1.2;                   // seconds to reach speed (and to stop)
const ARM_TIME = 0.9;                  // seconds for the arm to swing over
const LINGER = 10;                     // seconds the mini card stays after a pause
const TAPE_SIDE = 900;                 // the tape's "side" length for the arm sweep, seconds
const TAU = Math.PI * 2;
const SVGNS = 'http://www.w3.org/2000/svg';
const SERIF = 'system-ui, -apple-system, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const PAPER = '#ede3d0';
const INK = '#231c16';
const INKS = ['#e0a65a', '#c4552f', '#1f4d5f', '#2e5c8a', '#b8922a', '#3d6b6b', '#a8392c', '#6a5a9a', '#d4847a'];

const STR = {
  en: {
    'music.player': 'Record player',
    'music.nowPlaying': 'Now playing',
    'music.paused': 'Paused',
    'music.onPlatter': 'On the platter',
    'music.tracks': 'Records',
    'music.live': 'live',
    'music.liveLong': 'Live · generated in your browser',
    'music.play': 'Play',
    'music.pause': 'Pause',
    'music.next': 'Next track',
    'music.prev': 'Previous track',
    'music.close': 'Close',
    'music.seek': 'Position in the track',
    'music.seekText': '{a} of {b}',
    'music.open': 'Open the record player: {what}',
    'music.listen': 'Listen elsewhere',
    'music.unavailable': 'unavailable',
    'music.tip.play': 'Record player · play',
    'music.tip.pause': 'Record player · pause',
    'music.tip.sleeve': 'Sleeve · {what}',
    'music.toast.stopped': 'Record stopped.',
    'music.toast.failed': 'Could not load “{title}”.',
    'music.toast.blocked': 'The browser held the record back. Press play once more.',
    'music.toast.noAudio': 'This browser cannot play sound here.',
    'music.owner': 'Owner: add records in content.json → music.tracks, files in media/music/.',
    'music.tape.title': 'Studio Tape',
    'music.tape.artist': 'The attic',
    'music.tape.album': 'Side A, on a loop',
    'music.tape.notes': 'What the room hums when nobody has picked a record: four soft chords, a lazy beat and a little dust on the needle. It is played live in your browser, so no two listens are quite the same.',
    'music.tape.credits': 'Synthesised with WebAudio · 74 BPM',
  },
  zh: {
    'music.player': '唱机',
    'music.nowPlaying': '正在播放',
    'music.paused': '已暂停',
    'music.onPlatter': '唱盘上',
    'music.tracks': '唱片',
    'music.live': '实时',
    'music.liveLong': '实时 · 在你的浏览器里生成',
    'music.play': '播放',
    'music.pause': '暂停',
    'music.next': '下一首',
    'music.prev': '上一首',
    'music.close': '关闭',
    'music.seek': '播放进度',
    'music.seekText': '{a} / {b}',
    'music.open': '打开唱机：{what}',
    'music.listen': '去别处收听',
    'music.unavailable': '无法播放',
    'music.tip.play': '唱机 · 播放',
    'music.tip.pause': '唱机 · 暂停',
    'music.tip.sleeve': '唱片封套 · {what}',
    'music.toast.stopped': '唱机停了。',
    'music.toast.failed': '“{title}”加载失败。',
    'music.toast.blocked': '浏览器拦下了这张唱片，请再按一次播放。',
    'music.toast.noAudio': '这个浏览器无法在这里播放声音。',
    'music.owner': '站长：在 content.json → music.tracks 里添加唱片，音频放进 media/music/。',
    'music.tape.title': '工作室磁带',
    'music.tape.artist': '阁楼',
    'music.tape.album': 'A 面，循环播放',
    'music.tape.notes': '没人挑唱片的时候，房间自己哼的调子：四个柔和的和弦、慵懒的节拍，唱针上还有一点灰尘。它在你的浏览器里实时演奏，所以每次听都不太一样。',
    'music.tape.credits': 'WebAudio 实时合成 · 74 BPM',
  },
};

const ICONS = [
  ['i-mu-play', '<path d="M8.5 6.2v11.6a.8.8 0 0 0 1.2.7l9.1-5.8a.8.8 0 0 0 0-1.4L9.7 5.5a.8.8 0 0 0-1.2.7z" fill="currentColor"/>'],
  ['i-mu-pause', '<rect x="7" y="5.5" width="3.6" height="13" rx="1.2" fill="currentColor"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.2" fill="currentColor"/>'],
  ['i-mu-next', '<path d="M6.5 7v10a.7.7 0 0 0 1.1.6l7.3-5a.7.7 0 0 0 0-1.2l-7.3-5A.7.7 0 0 0 6.5 7z" fill="currentColor"/><path d="M17.5 6v12"/>'],
  ['i-mu-prev', '<path d="M17.5 7v10a.7.7 0 0 1-1.1.6l-7.3-5a.7.7 0 0 1 0-1.2l7.3-5a.7.7 0 0 1 1.1.6z" fill="currentColor"/><path d="M6.5 6v12"/>'],
];

// the sleeve on the shelf: cover-fit, a cross-fade when the record changes, and a little ring wear
const SLEEVE_FRAG = /* glsl */`
  uniform sampler2D tPrev;
  uniform float uImgAspect, uPrevAspect, uFrameAspect, uMix;
  vec2 muFit(vec2 uv, float a) {
    vec2 s = a > uFrameAspect ? vec2(uFrameAspect / a, 1.) : vec2(1., a / uFrameAspect);
    return (uv - .5) * s + .5;
  }
  vec3 picture(vec2 uv, vec3 light) {
    vec3 a = texture2D(tPrev, muFit(uv, uPrevAspect)).rgb;
    vec3 b = texture2D(tMap, muFit(uv, uImgAspect)).rgb;
    vec3 c = mix(a, b, uMix);
    vec2 q = (uv - .5) * vec2(uFrameAspect, 1.) / max(uFrameAspect, 1.);
    float ring = smoothstep(.016, .0, abs(length(q) - .44));
    float edge = 1. - smoothstep(.0, .025, min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y)));
    c = mix(c, vec3(.93, .9, .85), ring * .07 + edge * .12);
    return c * light;
  }
`;

// ---------------------------------------------------------------- small helpers
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function hash(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pad = (n) => String(n).padStart(2, '0');
function fmt(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${pad(m)}` : String(m)) + ':' + pad(x);
}
function baseName(src) {
  try {
    const last = decodeURIComponent(String(src).split(/[?#]/)[0].split('/').pop() || '');
    return last.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled';
  } catch { return 'Untitled'; }
}
function safeLink(s) {
  if (!s) return '';
  try {
    const u = new URL(s, location.href);
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}
function absURL(s) {
  try { return new URL(s, location.href).href; } catch { return s; }
}
function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
function spacing(g, px) { try { g.letterSpacing = `${px}px`; } catch { /* older canvas */ } }
function fit(g, text, maxW) {
  let s = String(text || '');
  if (g.measureText(s).width <= maxW) return s;
  const chars = [...s];
  while (chars.length > 1 && g.measureText(chars.join('') + '…').width > maxW) chars.pop();
  return chars.join('').trimEnd() + '…';
}
function drawCover(g, src, x, y, w, h) {
  const sw = src?.naturalWidth || src?.width, sh = src?.naturalHeight || src?.height;
  if (!sw || !sh) return;
  const k = Math.max(w / sw, h / sh);
  const dw = sw * k, dh = sh * k;
  try { g.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); } catch { /* not decodable */ }
}
// text set around a circle, starting at angle a0 (clockwise), stopping before it would overlap itself
function arcText(g, text, cx, cy, rad, a0, font, color, gap = 0) {
  g.save();
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  let a = a0;
  for (const ch of text) {
    const da = (g.measureText(ch).width + gap) / rad;
    if (a + da > a0 + TAU - 0.02) break;
    a += da / 2;
    g.save();
    g.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
    a += da / 2;
  }
  g.restore();
}
function grain(g, S, r, amount = 18) {
  let img;
  try { img = g.getImageData(0, 0, S, S); } catch { return; }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.globalCompositeOperation = 'multiply';
  for (let k = 0; k < 160; k++) {                       // paper fibres
    g.fillStyle = `rgba(70,52,34,${(0.05 + r() * 0.09).toFixed(3)})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 2.5, 1);
  }
  g.globalCompositeOperation = 'source-over';
}
// riso halftone: dot radius follows fn(u, v) in 0..1 over the box
function halftone(g, color, x0, y0, w, h, step, maxR, fn) {
  g.fillStyle = color;
  let row = 0;
  for (let y = y0; y < y0 + h; y += step, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x0 + w; x += step) {
      const rad = maxR * Math.max(0, Math.min(1, fn((x - x0) / w, (y - y0) / h)));
      if (rad < 0.4) continue;
      circle(g, x, y, rad); g.fill();
    }
  }
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- generated covers
// a riso print for a file track without a cover: two inks on paper, misregistered, a label strip
function drawGenerated(seed, title, artist, S = 512) {
  const cv = canvas(S);
  const g = cv.getContext('2d');
  if (!g) return cv;
  const r = rng(seed);
  const paper = ['#efe5d3', '#ebdfc9', '#f2eadb'][Math.floor(r() * 3)];
  g.fillStyle = paper; g.fillRect(0, 0, S, S);
  const ai = Math.floor(r() * INKS.length);
  let bi = Math.floor(r() * (INKS.length - 1)); if (bi >= ai) bi++;
  const A = INKS[ai], B = INKS[bi];
  const mis = () => (r() - 0.5) * S * 0.014;
  const art = S * 0.79;
  g.save();
  g.beginPath(); g.rect(0, 0, S, art); g.clip();
  g.globalCompositeOperation = 'multiply';
  const kind = Math.floor(r() * 4);
  if (kind === 0) {                                          // sun over water
    const cx = S * (0.32 + r() * 0.36), cy = art * (0.36 + r() * 0.14), rad = S * (0.19 + r() * 0.1);
    g.fillStyle = A; circle(g, cx, cy, rad); g.fill();
    g.fillStyle = B;
    const dx = mis(), dy = mis();
    for (let y = cy + rad * 0.2, k = 0; y < art; y += S * 0.036, k++) g.fillRect(dx, y + dy, S, S * (0.008 + k * 0.004));
  } else if (kind === 1) {                                   // grooves from a corner
    const left = r() < 0.5;
    const cx = S * (left ? 0.2 : 0.8), cy = art * (0.28 + r() * 0.3);
    g.strokeStyle = A; g.lineWidth = S * 0.016;
    for (let rad = S * 0.07; rad < S * 1.15; rad += S * 0.043) { circle(g, cx, cy, rad); g.stroke(); }
    g.fillStyle = B; circle(g, cx + (left ? 1 : -1) * S * 0.2 + mis(), cy + S * 0.13 + mis(), S * 0.17); g.fill();
  } else if (kind === 2) {                                   // stacked blocks
    for (let k = 0; k < 5; k++) {
      g.save();
      g.translate(S * (0.24 + r() * 0.52), art * (0.24 + r() * 0.52));
      g.rotate((r() - 0.5) * 0.5);
      g.fillStyle = k % 2 ? A : B;
      const w = S * (0.22 + r() * 0.36), h = S * (0.12 + r() * 0.3);
      g.fillRect(-w / 2, -h / 2, w, h);
      g.restore();
    }
  } else {                                                   // bands of waves
    const bands = 6 + Math.floor(r() * 4), amp = S * (0.018 + r() * 0.03), f = 1.5 + r() * 2.5, ph = r() * TAU;
    for (let k = 0; k < bands; k++) {
      const y0 = art * (k / bands), y1 = art * ((k + 1) / bands) + S * 0.02;
      g.fillStyle = k % 2 ? A : B;
      g.globalAlpha = 0.55 + 0.45 * (k / bands);
      g.beginPath(); g.moveTo(0, y1);
      for (let x = 0; x <= S + 1; x += S / 64) g.lineTo(x, y0 + Math.sin((x / S) * TAU * f + ph + k * 0.6) * amp);
      g.lineTo(S, y1); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
  }
  const dir = r() * TAU, cs = Math.cos(dir), sn = Math.sin(dir);
  halftone(g, B, 0, 0, S, art, S * 0.022, S * 0.0085, (u, v) => smooth(0.5, 1.05, (u - 0.5) * cs + (v - 0.5) * sn + 0.5));
  g.restore();
  // label strip
  const sy = S * 0.79;
  g.fillStyle = paper; g.fillRect(0, sy, S, S - sy);
  g.fillStyle = INK; g.fillRect(S * 0.07, sy, S * 0.86, Math.max(1, S * 0.003));
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = `${Math.round(S * 0.024)}px ${MONO}`; spacing(g, S * 0.004);
  g.fillText(fit(g, String(artist || '').toUpperCase(), S * 0.6), S * 0.07, sy + S * 0.055);
  g.textAlign = 'right'; g.fillStyle = 'rgba(35,28,22,.62)';
  g.fillText(`ATTIC ${String(seed % 1000).padStart(3, '0')}`, S * 0.93, sy + S * 0.055);
  g.textAlign = 'left'; g.fillStyle = INK; spacing(g, 0);
  g.font = `400 ${Math.round(S * 0.078)}px ${SERIF}`;
  g.fillText(fit(g, title, S * 0.86), S * 0.07, sy + S * 0.152);
  grain(g, S, r);
  return cv;
}

// the studio tape: a cassette label printed in two inks. The chords on it are the loop's real ones.
function drawTape(S = 512) {
  const cv = canvas(S);
  const g = cv.getContext('2d');
  if (!g) return cv;
  const r = rng(74);
  const ORANGE = '#ec8f4e', TEAL = '#2b6a70', BROWN = '#6b4632', PAPER_T = '#ede2cc';
  g.fillStyle = PAPER_T; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = ORANGE; circle(g, S * 0.8, S * 0.16, S * 0.27); g.fill();
  // the dots fade out just below the shell (v 0.58–0.66 is y 0.79–0.83 S) so the credit line sits on clean paper
  halftone(g, TEAL, 0, S * 0.5, S, S * 0.5, S * 0.021, S * 0.0078, (u, v) => smooth(0.15, 1, v) * (1 - u * 0.55) * (1 - smooth(0.58, 0.66, v)));
  // shell
  const x = S * 0.1, y = S * 0.36, w = S * 0.8, h = S * 0.43, m = S * 0.006;
  g.strokeStyle = TEAL; g.lineWidth = S * 0.012;
  rr(g, x + m, y - m, w, h, S * 0.03); g.stroke();
  // label block with ruled lines
  const lx = x + S * 0.05, ly = y + S * 0.035, lw = w - S * 0.1, lh = h * 0.6;
  g.fillStyle = ORANGE; g.globalAlpha = 0.88; rr(g, lx, ly, lw, lh, S * 0.012); g.fill(); g.globalAlpha = 1;
  g.fillStyle = TEAL;
  for (let k = 0; k < 2; k++) g.fillRect(lx + S * 0.03 + m, ly + S * (0.06 + k * 0.035) - m, lw - S * 0.06, Math.max(1, S * 0.0025));
  // window, knocked out of the label
  const wx = S * 0.3, wy = ly + lh - S * 0.15, ww = S * 0.4, wh = S * 0.12;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = PAPER_T; rr(g, wx, wy, ww, wh, S * 0.02); g.fill();
  g.globalCompositeOperation = 'multiply';
  g.save(); rr(g, wx, wy, ww, wh, S * 0.02); g.clip();
  g.fillStyle = BROWN; g.globalAlpha = 0.75;
  circle(g, wx + ww * 0.22, wy + wh / 2, S * 0.072); g.fill();     // more tape on the left: side A just started
  circle(g, wx + ww * 0.78, wy + wh / 2, S * 0.05); g.fill();
  g.globalAlpha = 1;
  g.restore();
  for (const cx of [wx + ww * 0.22, wx + ww * 0.78]) {
    const cy = wy + wh / 2;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = PAPER_T; circle(g, cx + m, cy - m, S * 0.026); g.fill();
    g.globalCompositeOperation = 'multiply';
    g.strokeStyle = TEAL; g.lineWidth = S * 0.007; circle(g, cx + m, cy - m, S * 0.026); g.stroke();
    g.fillStyle = TEAL;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + 0.3;
      g.save(); g.translate(cx + m + Math.cos(a) * S * 0.017, cy - m + Math.sin(a) * S * 0.017); g.rotate(a);
      g.fillRect(-S * 0.006, -S * 0.003, S * 0.012, S * 0.006); g.restore();
    }
  }
  g.strokeStyle = TEAL; g.lineWidth = S * 0.008; rr(g, wx + m, wy - m, ww, wh, S * 0.02); g.stroke();
  // head opening and screws
  g.lineWidth = S * 0.009;
  g.beginPath();
  g.moveTo(x + w * 0.22 + m, y + h - m); g.lineTo(x + w * 0.27 + m, y + h - S * 0.085 - m);
  g.lineTo(x + w * 0.73 + m, y + h - S * 0.085 - m); g.lineTo(x + w * 0.78 + m, y + h - m); g.stroke();
  g.fillStyle = TEAL;
  for (const [sx, sy] of [[x + S * 0.03, y + S * 0.03], [x + w - S * 0.03, y + S * 0.03], [x + S * 0.03, y + h - S * 0.03], [x + w - S * 0.03, y + h - S * 0.03], [x + w / 2, y + h - S * 0.045]]) {
    circle(g, sx + m, sy - m, S * 0.009); g.fill();
  }
  // type
  g.globalCompositeOperation = 'multiply';
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = '#1f4d5f'; g.font = `400 ${Math.round(S * 0.118)}px ${SERIF}`;
  g.fillText('Studio Tape', S * 0.1, S * 0.215);
  g.fillStyle = INK; g.font = `400 ${Math.round(S * 0.044)}px ${SERIF}`;
  g.fillText('工作室磁带', S * 0.1, S * 0.29);
  g.font = `400 ${Math.round(S * 0.045)}px ${SERIF}`; g.fillStyle = TEAL;
  g.fillText('the attic, late', lx + S * 0.035, ly + S * 0.052);
  g.font = `400 ${Math.round(S * 0.085)}px ${SERIF}`; g.fillStyle = INK;
  g.fillText('A', lx + S * 0.035, wy + wh * 0.85);
  g.font = `${Math.round(S * 0.024)}px ${MONO}`; spacing(g, S * 0.003);
  g.textAlign = 'right'; g.fillText('C-∞', lx + lw - S * 0.03, wy + wh * 0.42);
  g.fillText('74', lx + lw - S * 0.03, wy + wh * 0.85);
  // one line of credits, big enough to read on the panel's ~240 px cover (about 9 px there)
  g.textAlign = 'left'; g.fillStyle = INK;
  g.font = `${Math.round(S * 0.04)}px ${MONO}`; spacing(g, 0);
  g.fillText(fit(g, 'FMAJ9 · EM7 · DM9 · CMAJ7', S * 0.64), S * 0.1, S * 0.9);
  g.fillStyle = 'rgba(35,28,22,.66)';
  g.textAlign = 'right'; g.fillText('NO. ∞', S * 0.9, S * 0.9);
  spacing(g, 0); g.textAlign = 'left';
  g.globalCompositeOperation = 'source-over';
  grain(g, S, r, 16);
  return cv;
}

// vinyl seen from above: grooves, quiet bands between tracks, dead wax with an etched matrix number
function drawGrooves(N, bands) {
  const cv = canvas(N);
  const g = cv.getContext('2d');
  if (!g) return cv;
  const c = N / 2, R = N / 2, r = rng(1977);
  g.fillStyle = '#0a0909'; g.fillRect(0, 0, N, N);
  const inner = R * 0.36, outer = R * 0.972;
  g.lineWidth = 0.9;
  for (let rad = inner; rad < outer; rad += 1.5) {
    const a = 0.022 + r() * 0.03 + 0.018 * (0.5 + 0.5 * Math.sin(rad * 0.045));
    g.strokeStyle = `rgba(232,222,206,${a.toFixed(3)})`;
    circle(g, c, c, rad); g.stroke();
  }
  const n = Math.max(3, Math.min(8, bands));
  for (let k = 1; k < n; k++) {
    const rad = outer - (outer - inner) * (k / n) + (r() - 0.5) * 8;
    g.lineWidth = 6; g.strokeStyle = 'rgba(4,3,3,.85)'; circle(g, c, c, rad); g.stroke();
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,246,232,.07)'; circle(g, c, c, rad + 3.5); g.stroke();
  }
  g.lineWidth = R * 0.024; g.strokeStyle = '#1b1917'; circle(g, c, c, R * 0.986); g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,246,232,.12)'; circle(g, c, c, R * 0.997); g.stroke();
  g.fillStyle = '#0e0c0b'; circle(g, c, c, inner); g.fill();
  arcText(g, 'ATTIC-001-A  ·  CUT AT 33⅓  ·  ', c, c, R * 0.35, -Math.PI / 2, `${Math.round(R * 0.02)}px ${MONO}`, 'rgba(240,232,220,.18)', 1.5);
  return cv;
}

function fallbackI18n() {
  const dict = { en: {}, zh: {} };
  return {
    lang: 'en',
    t(k, v = {}) { const s = dict[this.lang]?.[k] || dict.en[k] || k; return s.replace(/\{(\w+)\}/g, (_, x) => (x in v ? v[x] : '')); },
    pick(v) { if (v == null) return ''; if (typeof v !== 'object') return String(v); return v[this.lang] || v.en || Object.values(v)[0] || ''; },
    extend(d) { for (const [l, s] of Object.entries(d || {})) dict[l] = { ...(dict[l] || {}), ...s }; },
  };
}

// ---------------------------------------------------------------- the module
export function create(ctx) {
  try {
    return build(ctx || {});
  } catch (e) {
    console.warn('[music] could not start', e);
    return { actions: {}, tips: {}, keys: {}, api: {} };
  }
}

function build(ctx) {
  const i18n = ctx.i18n && typeof ctx.i18n.t === 'function' ? ctx.i18n : fallbackI18n();
  try { i18n.extend?.(STR); } catch { /* strings fall back to keys */ }
  const t = (k, v) => { try { return String(i18n.t(k, v)); } catch { return k; } };
  const pick = (v) => { try { const s = i18n.pick(v); return s == null ? '' : String(s); } catch { return typeof v === 'string' ? v : ''; } };
  const still = !!ctx.still;
  const owner = !!(ctx.params && typeof ctx.params.has === 'function' && (ctx.params.has('write') || ctx.params.has('owner')));
  let warned = false;
  const warn = (e) => { if (!warned) { warned = true; console.warn('[music]', e); } };
  let lastToast = { text: '', at: 0 };
  const toast = (text) => {
    const now = performance.now();
    if (text === lastToast.text && now - lastToast.at < 1500) return;
    lastToast = { text, at: now };
    try { ctx.ui?.toast?.(text); } catch { /* no toast */ }
  };
  const soundOn = () => {
    try { return typeof ctx.soundOn === 'function' ? !!ctx.soundOn() : !!ctx.sound?.enabled; } catch { return false; }
  };
  const langKey = () => (i18n.lang === 'zh' ? 'zh' : 'en');

  // ---------------------------------------------------------------- the playlist
  const tracks = [];
  {
    const music = (ctx.content && typeof ctx.content.music === 'object' && ctx.content.music) || {};
    const list = Array.isArray(music.tracks) ? music.tracks : [];
    const seen = new Set();
    const add = (d, src) => {
      const cover = typeof d.cover === 'string' ? d.cover.trim() : '';
      const tt = d.title;
      const titleSeed = typeof tt === 'string' ? tt : (tt && typeof tt === 'object' ? (tt.en || Object.values(tt)[0] || '') : '');
      tracks.push({
        kind: 'file', key: src, data: d, src, cover, fallbackTitle: baseName(src),
        seed: hash(titleSeed || baseName(src)), duration: NaN, el: null, node: null, failed: false,
        coverCanvas: null, coverReady: false, coverFailed: !cover, coverLoading: false, gen: {}, tex: {},
      });
    };
    for (const d of list) {
      if (!d || typeof d !== 'object') continue;
      const src = typeof d.src === 'string' ? d.src.trim() : '';
      if (!src || seen.has(src)) continue;
      seen.add(src);
      add(d, src);
    }
    const legacy = typeof ctx.content?.site?.music === 'string' ? ctx.content.site.music.trim() : '';
    if (legacy && !seen.has(legacy)) add({}, legacy);
    if (music.includeStudioTape !== false || !tracks.length) {
      tracks.push({ kind: 'tape', key: 'tape', data: {}, src: '', cover: '', seed: 74, duration: Infinity, failed: false, gen: {}, tex: {} });
    }
  }
  const S = { i: 0, playing: false, open: false, everPlayed: false, pausedAt: -1e9, token: 0, dragging: false, tapeT0: 0 };
  try {
    const saved = ctx.store?.get?.('music.track');
    const k = tracks.findIndex((x) => x.key === saved);
    if (k >= 0) S.i = k;
  } catch { /* first visit */ }
  const cur = () => tracks[S.i];
  let clock = 0, tapeOn = false, pauseTimer = 0, graph = null, lastFrame = null, seenLang = i18n.lang;

  function field(tr, k) {
    if (!tr) return '';
    if (tr.kind === 'tape') return (k === 'year' || k === 'link') ? '' : t(`music.tape.${k}`);
    const v = tr.data?.[k];
    if (k === 'year') return v == null ? '' : String(v).trim();
    const s = pick(v).trim();
    return k === 'title' ? (s || tr.fallbackTitle) : s;
  }

  // ---------------------------------------------------------------- covers
  function genKey(tr) { return tr.kind === 'tape' ? 'tape' : langKey(); }
  function genEntry(tr) {
    const key = genKey(tr);
    if (!tr.gen[key]) {
      let cv;
      try { cv = tr.kind === 'tape' ? drawTape(512) : drawGenerated(tr.seed, field(tr, 'title'), field(tr, 'artist'), 512); } catch (e) { warn(e); cv = canvas(8); }
      tr.gen[key] = { canvas: cv, url: '' };
    }
    return tr.gen[key];
  }
  function genURL(tr) {
    const e = genEntry(tr);
    if (!e.url) { try { e.url = e.canvas.toDataURL('image/jpeg', 0.88); } catch { e.url = ''; } }
    return e.url;
  }
  // the owner's cover once it has loaded, nothing while it loads, a generated one when there is none or it failed
  // (the DOM <img>s and the media session use the file's own URL; the 3D sleeve and the record label use coverCanvas)
  function coverURL(tr) {
    if (!tr) return '';
    if (tr.kind === 'file' && tr.cover && !tr.coverFailed) return tr.coverReady ? tr.cover : '';
    return genURL(tr);
  }
  function drawable(tr) { return tr.coverCanvas || genEntry(tr).canvas; }
  // album art is usually 1500–3000 px: keep a copy no larger than the sleeve ever shows (aspect kept, so the
  // sleeve's cover-fit crops as before) and let the full-size decoded image go. fitCanvas (content.js) halves in
  // steps for a clean downscale and hands back the image itself when it is already small enough.
  const COVER_MAX = 512;
  function shrink(img) {
    try { return fitCanvas(img, COVER_MAX) || img; } catch { return img; }
  }
  function loadCover(tr) {
    if (!tr || tr.kind !== 'file' || !tr.cover || tr.coverReady || tr.coverLoading || tr.coverFailed) return;
    tr.coverLoading = true;
    try {
      const img = new Image();
      img.decoding = 'async';
      try { if (new URL(tr.cover, location.href).origin !== location.origin) img.crossOrigin = 'anonymous'; } catch { /* relative */ }
      img.onload = () => {
        tr.coverLoading = false;
        if (img.naturalWidth) { tr.coverCanvas = shrink(img); tr.coverReady = true; } else tr.coverFailed = true;
        img.onload = img.onerror = null;
        if (tr === cur()) apply3D();
        render();
      };
      img.onerror = () => { tr.coverLoading = false; tr.coverFailed = true; if (tr === cur()) apply3D(); render(); };
      img.src = tr.cover;
    } catch { tr.coverLoading = false; tr.coverFailed = true; }
  }
  const prep = (tx) => { tx.flipY = false; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; };
  function texFor(tr) {
    const cv = tr.coverCanvas;
    if (cv) {
      if (!tr.tex.img) tr.tex.img = prep(new THREE.CanvasTexture(cv));
      const w = cv.naturalWidth || cv.width, h = cv.naturalHeight || cv.height;
      return { tex: tr.tex.img, aspect: (w / h) || 1 };
    }
    const key = genKey(tr);
    if (!tr.tex[key]) tr.tex[key] = prep(new THREE.CanvasTexture(genEntry(tr).canvas));
    return { tex: tr.tex[key], aspect: 1 };
  }
  // a sleeve texture nobody shows any more: off the GPU, and out of its record's cache (texFor rebuilds it from the
  // kept canvas if that record comes back)
  function releaseTex(tx) {
    if (!tx) return;
    const u = sleeve.mat?.uniforms;
    if (u?.tMap?.value === tx || sleeve.mat?.map === tx) return;
    for (const tr of tracks) for (const [k, v] of Object.entries(tr.tex)) if (v === tx) delete tr.tex[k];
    try { tx.dispose(); } catch { /* gone */ }
  }
  // generated covers are redrawn once the serif has loaded
  function invalidateGenerated() {
    const inUse = new Set([sleeve.mat?.uniforms?.tMap?.value, sleeve.mat?.uniforms?.tPrev?.value, sleeve.mat?.map]);
    for (const tr of tracks) {
      tr.gen = {};
      for (const [k, tx] of Object.entries(tr.tex)) {
        if (k === 'img') continue;
        if (!inUse.has(tx)) { try { tx.dispose(); } catch { /* gone */ } }
        delete tr.tex[k];
      }
    }
  }
  try {
    const f = document.fonts;
    if (f && !(f.check('400 40px "Instrument Serif"') && f.check('italic 400 40px "Instrument Serif"'))) {
      Promise.all([f.load('400 40px "Instrument Serif"'), f.load('italic 400 40px "Instrument Serif"')])
        .then(() => { invalidateGenerated(); apply3D(); render(); session(); })
        .catch(() => {});
    }
  } catch { /* no font loading API */ }

  // ---------------------------------------------------------------- 3D: platter, record, tonearm, sleeve
  const root = ctx.root;
  const find = (name) => { try { return root?.getObjectByName?.(name) || null; } catch { return null; } };
  const platter = find('record_platter');
  const arm = find('tonearm');
  const armBase = arm ? arm.rotation.y : 0;
  const armBaseX = arm ? arm.rotation.x : 0;
  let spinV = 0, armP = 0, sweep = 0;
  let disc = null;
  const sleeve = { mesh: null, mat: null };

  try {
    if (platter) {
      let y = 0.0062, rad = 0.15 * 0.985;
      try {
        const geo = platter.geometry;
        if (geo) {
          if (!geo.boundingBox) geo.computeBoundingBox();
          const b = geo.boundingBox;
          if (b) {
            const rr2 = Math.min(b.max.x - b.min.x, b.max.z - b.min.z) / 2;
            if (rr2 > 0.05 && rr2 < 0.3) rad = rr2 * 0.985;
            if (b.max.y > 0 && b.max.y < 0.02) y = b.max.y + 0.0002;
          }
        }
      } catch { /* defaults */ }
      const N = 1024;
      const cv = canvas(N);
      const g = cv.getContext('2d');
      if (g) {
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const geo = new THREE.CircleGeometry(rad, 96);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0 }));
        mesh.name = 'record_disc';
        mesh.position.y = y;
        mesh.userData.group = 'egg';
        platter.add(mesh);
        disc = { N, cv, g, tex, mesh, grooves: drawGrooves(N, tracks.length) };
      }
    }
  } catch (e) { warn(e); disc = null; }

  try {
    let m = find('sleeve');
    if (!m || !m.isMesh) {
      m = null;
      root?.traverse?.((o) => { if (!m && o.isMesh && o.userData?.group === 'sleeve') m = o; });
    }
    if (m && m.isMesh && m.geometry) {
      sleeve.mesh = m;
      const { tex, aspect } = texFor(cur());
      const frame = quadAspect(m);
      const geo = m.geometry;
      if (ctx.mixer?.pictureMaterial && geo.attributes?.uv && geo.attributes?.uv1) {
        sleeve.mat = ctx.mixer.pictureMaterial(tex, {
          extraUniforms: {
            tPrev: { value: tex }, uImgAspect: { value: aspect }, uPrevAspect: { value: aspect },
            uFrameAspect: { value: frame }, uMix: { value: 1 },
          },
          extraFrag: SLEEVE_FRAG,
        });
      } else {
        sleeve.mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
      }
      m.material = sleeve.mat;
    }
  } catch (e) { warn(e); sleeve.mat = null; }

  function quadAspect(mesh) {
    try {
      const geo = mesh.geometry, pos = geo.attributes.position, uvs = geo.attributes.uv;
      if (!pos || !uvs || pos.count < 4) return 1;
      mesh.updateWorldMatrix?.(true, false);
      const pts = [];
      for (let i = 0; i < pos.count; i++) pts.push([uvs.getX(i), uvs.getY(i), new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)]);
      const at = (u, v) => pts.reduce((b, e) => (Math.hypot(e[0] - u, e[1] - v) < Math.hypot(b[0] - u, b[1] - v) ? e : b))[2];
      const a = at(0, 0).distanceTo(at(1, 0)) / Math.max(1e-4, at(0, 0).distanceTo(at(0, 1)));
      return Number.isFinite(a) && a > 0.05 && a < 20 ? a : 1;
    } catch { return 1; }
  }

  function drawDisc(tr) {
    if (!disc) return;
    const { g, N } = disc;
    const c = N / 2, R = N / 2, LR = R * 0.335;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(disc.grooves, 0, 0);
    g.save();
    circle(g, c, c, LR); g.clip();
    g.fillStyle = PAPER; g.fillRect(c - LR, c - LR, LR * 2, LR * 2);
    drawCover(g, drawable(tr), c - LR, c - LR, LR * 2, LR * 2);
    g.lineWidth = LR * 0.17; g.strokeStyle = 'rgba(14,11,9,.42)'; circle(g, c, c, LR * 0.915); g.stroke();
    const words = `${field(tr, 'title')}  ·  SIDE A  ·  33⅓ RPM  ·  `;
    arcText(g, tr.kind === 'tape' ? words : words.toUpperCase(), c, c, LR * 0.905, -Math.PI / 2,
      `${Math.round(LR * 0.085)}px ${MONO}`, 'rgba(250,244,232,.86)', LR * 0.012);
    g.restore();
    g.fillStyle = '#d2cabd'; circle(g, c, c, R * 0.02); g.fill();
    g.fillStyle = '#5f584f'; circle(g, c, c, R * 0.008); g.fill();
    disc.tex.needsUpdate = true;
  }
  function setSleeve(tr) {
    if (!sleeve.mat) return;
    const { tex, aspect } = texFor(tr);
    const u = sleeve.mat.uniforms;
    if (u && u.tMap && u.tPrev) {
      if (u.tMap.value === tex) return;
      // a change during a cross-fade drops the cover it was fading from
      const drop = u.tPrev.value !== u.tMap.value && u.tPrev.value !== tex ? u.tPrev.value : null;
      u.tPrev.value = u.tMap.value;
      u.uPrevAspect.value = u.uImgAspect.value;
      u.tMap.value = tex;
      u.uImgAspect.value = aspect;
      u.uMix.value = still ? 1 : 0;
      releaseTex(drop);
    } else if (sleeve.mat.map !== tex) {
      const old = sleeve.mat.map;
      sleeve.mat.map = tex;
      sleeve.mat.needsUpdate = true;
      releaseTex(old);
    }
  }
  function apply3D() {
    const tr = cur();
    if (!tr) return;
    try { drawDisc(tr); } catch (e) { warn(e); }
    try { setSleeve(tr); } catch (e) { warn(e); }
  }

  // ---------------------------------------------------------------- audio
  function route(tr) {
    const snd = ctx.sound, ac = snd?.ctx;
    if (!ac || !snd.bus || !tr.el) return false;
    try {
      if (!graph) {
        const gain = ac.createGain();
        gain.gain.value = 0;
        const an = ac.createAnalyser();
        an.fftSize = 512;
        gain.connect(an); an.connect(snd.bus);
        graph = { ac, gain, an, buf: null };
      }
      if (graph.ac !== ac) return false;
      if (!tr.node) { tr.node = ac.createMediaElementSource(tr.el); tr.node.connect(graph.gain); }
      return true;
    } catch (e) { warn(e); return !!tr.node; }
  }
  function ramp(to, tc, from) {
    if (!graph) return;
    try {
      const p = graph.gain.gain, now = graph.ac.currentTime;
      p.cancelScheduledValues(now);
      p.setValueAtTime(from ?? p.value, now);
      p.setTargetAtTime(to, now + 0.005, tc);
    } catch { /* automation unsupported */ }
  }
  function ensureEl(tr) {
    if (!tr || tr.kind !== 'file' || tr.el || tr.failed) return tr?.el || null;
    try {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'metadata';
      const meta = () => {
        if (Number.isFinite(el.duration) && el.duration > 0 && el.duration !== tr.duration) {
          tr.duration = el.duration;
          render();
        }
      };
      el.addEventListener('loadedmetadata', meta);
      el.addEventListener('durationchange', meta);
      el.addEventListener('ended', () => { if (tr === cur() && S.playing) advance(); });
      el.addEventListener('error', () => onError(tr));
      el.addEventListener('pause', () => {
        // paused from outside (headphones unplugged, another app took the audio)
        if (tr === cur() && S.playing && !el.ended) { S.playing = false; S.pausedAt = clock; render(); session(); }
      });
      el.addEventListener('play', () => {
        if (tr === cur() && !S.playing) { S.playing = true; S.everPlayed = true; render(); session(); }
      });
      el.src = tr.src;
      tr.el = el;
    } catch (e) { warn(e); tr.failed = true; }
    return tr.el;
  }
  // No audio is fetched at boot: the record on the platter gets its element when it is picked, played or the panel
  // opens. The durations in the track list come from a throwaway metadata probe, one record at a time, once the
  // panel first opens; each probe lets go of its connection as soon as the length is known.
  let probing = false;
  function probeDurations() {
    if (probing) return;
    probing = true;
    const queue = tracks.filter((tr) => tr.kind === 'file');
    const nextProbe = () => {
      const tr = queue.shift();
      if (!tr) return;
      if (tr.el || tr.failed || Number.isFinite(tr.duration)) { nextProbe(); return; }
      let done = false, timer = 0;
      const a = new Audio();
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        a.removeEventListener('loadedmetadata', onMeta);
        a.removeEventListener('error', onErr);
        if (ok && Number.isFinite(a.duration) && a.duration > 0 && !Number.isFinite(tr.duration)) { tr.duration = a.duration; render(); }
        try { a.removeAttribute('src'); a.load(); } catch { /* already idle */ }
        setTimeout(nextProbe, 60);
      };
      const onMeta = () => finish(true);
      const onErr = () => { finish(false); onError(tr); };
      a.addEventListener('loadedmetadata', onMeta);
      a.addEventListener('error', onErr);
      timer = setTimeout(() => finish(false), 8000);
      try { a.crossOrigin = 'anonymous'; a.preload = 'metadata'; a.src = tr.src; } catch { finish(false); }
    };
    nextProbe();
  }

  function onError(tr) {
    if (tr.failed) return;
    tr.failed = true;
    if (tr === cur() && S.playing) {
      S.playing = false; S.pausedAt = clock;
      toast(t('music.toast.failed', { title: field(tr, 'title') }));
      if (tracks.some((x) => !x.failed)) next({ auto: true });
    }
    render(); session();
  }
  const clickSound = () => { try { ctx.sound?.switchClick?.(); } catch { /* quiet */ } };
  function stopOutput(tr) {
    if (!tr) return;
    if (tr.kind === 'tape') {
      if (tapeOn) {
        // stopLofi() only silences this tape's crackle loop: unplug it once it has faded so loops do not pile up
        const crackle = ctx.sound?.crackle;
        try { ctx.sound?.stopLofi?.(); } catch { /* already quiet */ }
        if (crackle) setTimeout(() => { try { crackle.disconnect(); } catch { /* gone */ } }, 1500);
        tapeOn = false;
      }
    } else if (tr.el) {
      try { tr.el.pause(); } catch { /* not started */ }
    }
  }
  function select(i) {
    if (!tracks.length) return false;
    const idx = ((Math.trunc(i) % tracks.length) + tracks.length) % tracks.length;
    if (idx === S.i) return false;
    S.token++;
    clearTimeout(pauseTimer);
    stopOutput(cur());
    S.i = idx;
    const tr = cur();
    if (tr.kind === 'file') { ensureEl(tr); try { if (tr.el) tr.el.currentTime = 0; } catch { /* not seekable yet */ } }
    loadCover(tr);
    try { ctx.store?.set?.('music.track', tr.key); } catch { /* private mode */ }
    apply3D(); render(); session();
    return true;
  }

  function play(i, { user = true } = {}) {
    try {
      if (!tracks.length) return;
      let switched = Number.isFinite(i) ? select(i) : false;
      if (!Number.isFinite(i) && cur().failed) {             // the record on the platter is broken: take the next one
        const k = step(1);
        if (k !== S.i && !tracks[k].failed) switched = select(k);
      }
      const tr = cur();
      if (tr.failed) {
        toast(t('music.toast.failed', { title: field(tr, 'title') }));
        S.playing = false; render(); return;
      }
      if (!soundOn()) {
        try { if (typeof ctx.setSound === 'function') ctx.setSound(true); else ctx.sound?.start?.(true); } catch { /* stays quiet */ }
      }
      // sound may be on while the context sleeps (iOS after a lock or app switch, Chrome after a long idle):
      // wake it from this gesture, or the record plays to nobody
      try {
        const ac = ctx.sound?.ctx;
        if (ac && ac.state !== 'running') ac.resume?.()?.catch?.(() => {});
      } catch { /* stays quiet */ }
      clearTimeout(pauseTimer);
      S.token++;
      const tok = S.token;
      if (tr.kind === 'tape') {
        const snd = ctx.sound;
        if (!snd?.ctx || typeof snd.startLofi !== 'function') { toast(t('music.toast.noAudio')); S.playing = false; render(); return; }
        if (!tapeOn) { snd.startLofi(); tapeOn = true; }
        if (!S.playing || switched) S.tapeT0 = clock;
      } else {
        const el = ensureEl(tr);
        if (!el) return;
        if (route(tr)) ramp(1, 0.09, switched ? 0 : undefined);
        else el.muted = false;
        const p = el.play();
        p?.catch?.((err) => {
          if (tok !== S.token || err?.name === 'AbortError' || tr.failed) return;
          S.playing = false; S.pausedAt = clock;
          toast(t(err?.name === 'NotAllowedError' ? 'music.toast.blocked' : 'music.toast.failed', { title: field(tr, 'title') }));
          render(); session();
        });
        if (user && !S.playing) { try { ctx.sound?.tone?.(62, 0.05, 0.003, 0.16, 'sine', 0.02); } catch { /* quiet */ } }
      }
      if (user && !S.playing) clickSound();
      S.playing = true;
      S.everPlayed = true;
      sessionHandlers();
      render(); session();
    } catch (e) { warn(e); }
  }

  function pause({ user = true } = {}) {
    try {
      if (!S.playing) return;
      S.playing = false;
      S.pausedAt = clock;
      S.token++;
      const tok = S.token, tr = cur();
      if (tr.kind === 'tape') stopOutput(tr);
      else if (tr.el) {
        if (graph && tr.node) {
          ramp(0, 0.04);
          clearTimeout(pauseTimer);
          pauseTimer = setTimeout(() => { if (tok === S.token) { try { tr.el.pause(); } catch { /* gone */ } } }, 180);
        } else tr.el.pause();
      }
      if (user) clickSound();
      render(); session();
    } catch (e) { warn(e); }
  }
  const toggle = () => (S.playing ? pause() : play());

  function step(dir) {
    const n = tracks.length;
    let idx = S.i;
    for (let k = 0; k < n; k++) { idx = (idx + dir + n) % n; if (!tracks[idx].failed) break; }
    return idx;
  }
  function next({ auto = false } = {}) {
    try {
      if (tracks.length < 2) { if (cur()?.kind === 'file') { seek(0); if (auto) play(undefined, { user: false }); } return; }
      const idx = step(1);
      if (idx === S.i) return;
      if (S.playing || auto) play(idx, { user: false }); else select(idx);
    } catch (e) { warn(e); }
  }
  function prev() {
    try {
      const tr = cur();
      if (tr?.kind === 'file' && tr.el && tr.el.currentTime > 3) { seek(0); return; }
      if (tracks.length < 2) { if (tr?.kind === 'file') seek(0); return; }
      const idx = step(-1);
      if (idx === S.i) return;
      if (S.playing) play(idx, { user: false }); else select(idx);
    } catch (e) { warn(e); }
  }
  function advance() {
    if (tracks.length < 2) {
      const tr = cur();
      try { tr.el.currentTime = 0; } catch { /* restart below anyway */ }
      S.playing = false;
      play(undefined, { user: false });
      return;
    }
    next({ auto: true });
  }
  function seek(sec) {
    const tr = cur();
    if (!tr || tr.kind !== 'file' || !tr.el) return;
    const d = tr.duration;
    const v = Math.max(0, Number(sec) || 0);
    try { tr.el.currentTime = Number.isFinite(d) ? Math.min(v, Math.max(0, d - 0.05)) : v; } catch { /* not seekable yet */ }
    progress(true);
    position();
  }
  const seekBy = (d) => { const tr = cur(); if (tr?.el) seek((tr.el.currentTime || 0) + d); };

  function level() {
    if (!S.playing) return 0;
    const tr = cur();
    if (tr.kind === 'tape') {
      const ph = (((clock - S.tapeT0) / (60 / 74)) % 1 + 1) % 1;
      return 0.3 + 0.5 * Math.exp(-ph * 5);
    }
    if (!graph?.an) return 0.5;
    try {
      const buf = graph.buf || (graph.buf = new Uint8Array(graph.an.fftSize));
      graph.an.getByteTimeDomainData(buf);
      let s = 0;
      for (let k = 0; k < buf.length; k++) { const x = (buf[k] - 128) / 128; s += x * x; }
      return Math.min(1, Math.sqrt(s / buf.length) * 3);
    } catch { return 0.5; }
  }

  // ---------------------------------------------------------------- media session (lock screen, media keys)
  let msReady = false;
  function sessionHandlers() {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
    if (!ms || msReady) return;
    msReady = true;
    const set = (a, f) => { try { ms.setActionHandler(a, f); } catch { /* action not supported */ } };
    set('play', () => play());
    set('pause', () => pause());
    set('stop', () => pause());
    set('previoustrack', () => prev());
    set('nexttrack', () => next());
    set('seekto', (d) => seek(d?.seekTime));
    set('seekbackward', (d) => seekBy(-(d?.seekOffset || 10)));
    set('seekforward', (d) => seekBy(d?.seekOffset || 10));
  }
  function session() {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
    if (!ms || !S.everPlayed) return;
    try {
      const tr = cur();
      if (typeof MediaMetadata === 'function') {
        const src = absURL(coverURL(tr));
        const art = tr.kind === 'file' && tr.cover && !tr.coverFailed ? [{ src }] : [{ src, sizes: '512x512', type: 'image/jpeg' }];
        ms.metadata = new MediaMetadata({ title: field(tr, 'title'), artist: field(tr, 'artist'), album: field(tr, 'album'), artwork: src ? art : [] });
      }
      ms.playbackState = S.playing ? 'playing' : 'paused';
    } catch { /* metadata unsupported */ }
    position();
  }
  function position() {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null;
    const tr = cur();
    if (!ms?.setPositionState || !tr?.el || !S.everPlayed) return;
    try {
      const d = tr.duration;
      if (Number.isFinite(d) && d > 0) ms.setPositionState({ duration: d, playbackRate: 1, position: Math.min(d, tr.el.currentTime || 0) });
    } catch { /* invalid state */ }
  }

  // ---------------------------------------------------------------- DOM
  const D = buildDom();
  let miniShown = false, lastFocus = null, lastSec = -1;

  function mk(tag, cls, attrs) {
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
  const setIcon = (svg, id) => { try { svg.firstChild.setAttribute('href', `#${id}`); } catch { /* no icon */ } };
  const setImg = (img, url) => {
    if (!url) { if (img.hasAttribute('src')) img.removeAttribute('src'); return; }
    if (img.getAttribute('src') !== url) img.src = url;
  };
  function addIcons() {
    try {
      let defs = document.querySelector('svg defs');
      if (!defs) {
        const svg = document.createElementNS(SVGNS, 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
        svg.style.position = 'absolute';
        defs = document.createElementNS(SVGNS, 'defs');
        svg.appendChild(defs);
        document.body.prepend(svg);
      }
      for (const [id, markup] of ICONS) {
        if (document.getElementById(id)) continue;
        const holder = document.createElementNS(SVGNS, 'svg');
        holder.innerHTML = `<symbol id="${id}" viewBox="0 0 24 24">${markup}</symbol>`;      // constant markup only
        if (holder.firstChild) defs.appendChild(holder.firstChild);
      }
    } catch { /* icons fall back to nothing */ }
  }

  function buildDom() {
    if (typeof document === 'undefined' || !document.body) return null;
    addIcons();
    const d = {};
    // ---- the record panel
    const p = d.panel = mk('section', 'mu-panel surface' + (still ? ' mu-still' : ''), { role: 'dialog', 'data-open': 'false', tabindex: '-1' });      // named by aria-label in render(); focusable for pointer opens
    p.inert = true;
    d.close = mk('button', 'round mu-close', { type: 'button' });
    d.close.appendChild(icon('i-close'));
    const hero = mk('div', 'mu-hero');
    const art = mk('div', 'mu-art');
    d.vinyl = mk('div', 'mu-vinyl', { 'aria-hidden': 'true' });
    const spin = mk('div', 'mu-spin');
    d.label = mk('img', 'mu-label', { alt: '', draggable: 'false' });
    spin.appendChild(d.label);
    d.vinyl.appendChild(spin);
    d.cover = mk('img', 'mu-cover', { alt: '', draggable: 'false' });
    art.append(d.vinyl, d.cover);
    const head = mk('div', 'mu-head', { 'aria-live': 'polite' });
    const kick = mk('p', 'mu-kicker');
    d.state = mk('span', 'mu-state');
    d.num = mk('span', 'mu-num');
    kick.append(d.state, d.num);
    d.title = mk('h3', 'mu-title', { id: 'mu-title' });
    d.artist = mk('p', 'mu-artist');
    d.meta = mk('p', 'mu-meta');
    head.append(kick, d.title, d.artist, d.meta);
    hero.append(art, head);
    d.time = mk('div', 'mu-time');
    d.t0 = mk('span', 'mu-t0', { 'aria-hidden': 'true' });
    d.range = mk('input', 'mu-range', { type: 'range', min: '0', max: '0', step: 'any', value: '0' });
    d.t1 = mk('span', 'mu-t1', { 'aria-hidden': 'true' });
    d.live = mk('span', 'mu-live');
    const dot = mk('i', '', { 'aria-hidden': 'true' });
    d.liveText = mk('span');
    d.live.append(dot, d.liveText);
    d.time.append(d.t0, d.range, d.t1, d.live);
    const tp = mk('div', 'mu-transport');
    d.prev = mk('button', 'round mu-prev', { type: 'button' }); d.prev.appendChild(icon('i-mu-prev'));
    d.play = mk('button', 'round mu-play', { type: 'button' }); d.playIc = icon('i-mu-play'); d.play.appendChild(d.playIc);
    d.next = mk('button', 'round mu-next', { type: 'button' }); d.next.appendChild(icon('i-mu-next'));
    tp.append(d.prev, d.play, d.next);
    const notes = mk('div', 'mu-notes');
    d.note = mk('p', 'mu-note');
    d.credits = mk('p', 'mu-credits');
    d.link = mk('a', 'mu-link', { target: '_blank', rel: 'noopener noreferrer' });
    d.linkText = mk('span');
    d.link.append(d.linkText, document.createTextNode(' ↗'));
    notes.append(d.note, d.credits, d.link);
    d.listK = mk('p', 'mu-kicker mu-list-k');
    d.list = mk('ol', 'mu-list');
    d.rows = tracks.map((tr, i) => {
      const li = mk('li');
      const b = mk('button', 'mu-row', { type: 'button' });
      const n = mk('span', 'mu-n', { 'aria-hidden': 'true' });
      const num = mk('span', 'mu-num-t');
      num.textContent = pad(i + 1);
      const eq = mk('span', 'mu-eq');
      eq.append(mk('i'), mk('i'), mk('i'));
      n.append(num, eq);
      const rt = mk('span', 'mu-rt');
      const rtitle = mk('span', 'mu-rtitle');
      const rartist = mk('span', 'mu-rartist');
      rt.append(rtitle, rartist);
      const rd = mk('span', 'mu-rd');
      b.append(n, rt, rd);
      li.appendChild(b);
      d.list.appendChild(li);
      b.addEventListener('click', () => { if (i === S.i && S.playing) pause(); else play(i); });
      return { b, eq, rtitle, rartist, rd };
    });
    d.owner = mk('p', 'mu-owner');
    d.owner.hidden = !owner;
    p.append(d.close, hero, d.time, tp, notes, d.listK, d.list, d.owner);
    document.body.appendChild(p);

    d.close.addEventListener('click', () => close());
    d.play.addEventListener('click', () => toggle());
    d.prev.addEventListener('click', () => prev());
    d.next.addEventListener('click', () => next());
    d.vinyl.addEventListener('click', () => toggle());
    const endDrag = () => { S.dragging = false; };
    d.range.addEventListener('pointerdown', () => { S.dragging = true; });
    d.range.addEventListener('pointerup', endDrag);
    d.range.addEventListener('pointercancel', endDrag);
    d.range.addEventListener('change', () => { endDrag(); seek(Number(d.range.value)); });
    d.range.addEventListener('input', () => seek(Number(d.range.value)));
    d.range.addEventListener('keydown', (e) => {
      const jump = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 30, PageDown: -30 }[e.key];
      const tr = cur();
      if (!tr?.el) return;
      if (jump != null) seekBy(jump);
      else if (e.key === 'Home') seek(0);
      else if (e.key === 'End') seek(tr.duration);
      else return;
      e.preventDefault();
      e.stopPropagation();
    });
    // keep Esc and the arrows inside the panel when main does not route them to keys.* first
    p.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') { if (close()) { e.preventDefault(); e.stopPropagation(); } }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.target?.closest?.('input')) e.stopPropagation();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { if (rowNav(e.key === 'ArrowDown' ? 1 : -1)) { e.preventDefault(); e.stopPropagation(); } }
    });

    // ---- now-playing mini card
    const m = d.mini = mk('div', 'mu-mini surface', { role: 'group', 'data-show': 'false' });
    m.inert = true;
    d.miniOpen = mk('button', 'mu-mini-open', { type: 'button' });
    const mart = mk('span', 'mu-mini-art', { 'aria-hidden': 'true' });
    d.miniDisc = mk('span', 'mu-mini-disc');
    d.miniCover = mk('img', 'mu-mini-cover', { alt: '', draggable: 'false' });
    mart.append(d.miniDisc, d.miniCover);
    const mt = mk('span', 'mu-mini-text');
    d.miniTitle = mk('span', 'mu-mini-title');
    d.miniArtist = mk('span', 'mu-mini-artist');
    mt.append(d.miniTitle, d.miniArtist);
    d.miniOpen.append(mart, mt);
    d.miniPlay = mk('button', 'mu-mini-btn', { type: 'button' });
    d.miniPlayIc = icon('i-mu-pause');
    d.miniPlay.appendChild(d.miniPlayIc);
    d.miniNext = mk('button', 'mu-mini-btn', { type: 'button' });
    d.miniNext.appendChild(icon('i-mu-next'));
    d.miniBar = mk('i', 'mu-mini-bar', { 'aria-hidden': 'true' });
    m.append(d.miniOpen, d.miniPlay, d.miniNext, d.miniBar);
    document.body.appendChild(m);
    d.miniOpen.addEventListener('click', () => open());
    d.miniPlay.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    d.miniNext.addEventListener('click', (e) => { e.stopPropagation(); next(); });
    return d;
  }

  function rowNav(dir) {
    if (!D) return false;
    const rows = D.rows.map((r) => r.b);
    const k = rows.indexOf(document.activeElement);
    if (k < 0) return false;
    const to = rows[Math.max(0, Math.min(rows.length - 1, k + dir))];
    try { to.focus({ preventScroll: false }); } catch { /* best effort */ }
    return true;
  }
  const inside = (node) => !!(D && node && (D.panel.contains(node) || D.mini.contains(node)));
  const inPanel = (node) => !!(S.open && D && node && D.panel.contains(node));

  function render() {
    if (!D) return;
    try {
      const tr = cur();
      if (!tr) return;
      const n = tracks.length;
      const title = field(tr, 'title'), artist = field(tr, 'artist'), album = field(tr, 'album'), year = field(tr, 'year');
      const url = coverURL(tr);
      // panel
      D.panel.classList.toggle('is-playing', S.playing);
      D.panel.setAttribute('aria-label', t('music.player'));
      D.close.setAttribute('aria-label', t('music.close'));
      setImg(D.cover, url);
      setImg(D.label, url);
      D.state.textContent = S.playing ? t('music.nowPlaying') : (S.everPlayed ? t('music.paused') : t('music.onPlatter'));
      D.num.textContent = n > 1 ? `${pad(S.i + 1)} / ${pad(n)}` : '';
      D.title.textContent = title;
      D.artist.textContent = artist;
      D.artist.hidden = !artist;
      const meta = [album, year].filter(Boolean).join(' · ');
      D.meta.textContent = meta;
      D.meta.hidden = !meta;
      const live = tr.kind === 'tape';
      D.time.classList.toggle('is-live', live);
      D.liveText.textContent = t('music.liveLong');
      const d = tr.duration;
      const known = Number.isFinite(d) && d > 0;
      D.range.max = known ? String(d) : '0';
      D.range.disabled = live || !known || !!tr.failed;
      D.range.setAttribute('aria-label', t('music.seek'));
      D.t1.textContent = known ? fmt(d) : '–:––';
      lastSec = -1;
      progress(true);
      setIcon(D.playIc, S.playing ? 'i-mu-pause' : 'i-mu-play');
      D.play.setAttribute('aria-label', t(S.playing ? 'music.pause' : 'music.play'));
      D.prev.setAttribute('aria-label', t('music.prev'));
      D.next.setAttribute('aria-label', t('music.next'));
      D.next.disabled = n < 2;
      D.prev.disabled = n < 2 && live;
      const note = field(tr, 'notes'), credits = field(tr, 'credits'), link = safeLink(field(tr, 'link'));
      D.note.textContent = note; D.note.hidden = !note;
      D.credits.textContent = credits; D.credits.hidden = !credits;
      D.link.hidden = !link;
      if (link) D.link.href = link; else D.link.removeAttribute('href');
      D.linkText.textContent = t('music.listen');
      D.listK.textContent = `${t('music.tracks')} · ${n}`;
      D.listK.hidden = n < 2;
      D.list.hidden = n < 2;
      tracks.forEach((x, k) => {
        const r = D.rows[k];
        if (!r) return;
        const on = k === S.i;
        if (on) r.b.setAttribute('aria-current', 'true'); else r.b.removeAttribute('aria-current');
        r.b.classList.toggle('is-current', on);
        r.b.classList.toggle('is-failed', !!x.failed);
        r.eq.classList.toggle('on', on && S.playing);
        r.rtitle.textContent = field(x, 'title');
        r.rartist.textContent = field(x, 'artist');
        r.rartist.hidden = !r.rartist.textContent;
        r.rd.textContent = x.kind === 'tape' ? t('music.live')
          : x.failed ? t('music.unavailable')
            : (Number.isFinite(x.duration) ? fmt(x.duration) : '');
      });
      D.owner.textContent = t('music.owner');
      // mini card
      setImg(D.miniCover, url);
      D.mini.classList.toggle('is-playing', S.playing);
      D.mini.classList.toggle('is-live', live);
      D.mini.setAttribute('aria-label', t('music.player'));
      D.miniTitle.textContent = title;
      D.miniArtist.textContent = artist || album;
      D.miniOpen.setAttribute('aria-label', t('music.open', { what: [title, artist].filter(Boolean).join(' · ') }));
      setIcon(D.miniPlayIc, S.playing ? 'i-mu-pause' : 'i-mu-play');
      D.miniPlay.setAttribute('aria-label', t(S.playing ? 'music.pause' : 'music.play'));
      D.miniNext.setAttribute('aria-label', t('music.next'));
      D.miniNext.hidden = n < 2;
    } catch (e) { warn(e); }
  }

  // seek bar, clock and the mini card's progress line. It runs every frame while either is visible, so it only
  // touches the DOM when something would visibly move: the bars step at P_STEP (about half a pixel), the clock once
  // a second, and the mini card's line is set on the bar itself so only that leaf restyles.
  const P_STEP = 0.0015;
  let rangeK = -1, miniK = -1;
  function setMiniP(k) {
    if (k === miniK) return;
    miniK = k;
    D.miniBar.style.setProperty('--p', k.toFixed(4));
  }
  function progress(force = false) {
    if (!D) return;
    const tr = cur();
    if (!tr || tr.kind !== 'file' || !tr.el) { setMiniP(0); return; }
    const d = tr.duration, ct = tr.el.currentTime || 0;
    const k = Number.isFinite(d) && d > 0 ? Math.min(1, ct / d) : 0;
    if ((S.open || force) && !S.dragging) {
      if (force || Math.abs(k - rangeK) >= P_STEP || (k === 0) !== (rangeK === 0)) {
        rangeK = k;
        D.range.value = String(ct);
        D.range.style.setProperty('--p', `${(k * 100).toFixed(2)}%`);
      }
      const sec = Math.floor(ct);
      if (sec !== lastSec) {
        lastSec = sec;
        D.t0.textContent = fmt(ct);
        D.range.setAttribute('aria-valuetext', t('music.seekText', { a: fmt(ct), b: Number.isFinite(d) ? fmt(d) : '–:––' }));
      }
    }
    if ((miniShown || force) && (force || Math.abs(k - miniK) >= P_STEP || k === 1 || (k === 0) !== (miniK === 0))) setMiniP(k);
  }

  function wantMini() {
    if (!D || S.open || lastFrame?.entered === false) return false;
    if (S.playing) return true;
    if (D.mini.contains(document.activeElement) && S.everPlayed) return true;
    return S.everPlayed && clock - S.pausedAt < LINGER;
  }
  function setMini(on) {
    if (!D || on === miniShown) return;
    miniShown = on;
    D.mini.dataset.show = on ? 'true' : 'false';
    D.mini.inert = !on;
    if (on) progress(true);
  }

  function open() {
    try {
      if (!D || S.open) return;
      S.open = true;
      try { ctx.ui?.closePanel?.(); } catch { /* no main panel */ }
      try { ctx.emit?.('overlay', 'music'); } catch { /* no bus */ }
      lastFocus = document.activeElement;
      loadCover(cur());
      ensureEl(cur());           // the record on the platter: its length for the seek bar, ready to play
      probeDurations();          // and the other records' lengths for the list, one at a time
      render();
      D.panel.inert = false;
      D.panel.dataset.open = 'true';
      setMini(false);
      D.panel.scrollTop = 0;
      // a keyboard open lands on the play button; a click or tap focuses the panel itself (tabindex -1, no outline),
      // since Chrome would ring a programmatically focused button as :focus-visible even for a mouse user
      const kbd = ctx.lastInput?.() === 'keyboard';
      requestAnimationFrame(() => { try { if (S.open) (kbd ? D.play : D.panel).focus({ preventScroll: true }); if (kbd) D.play.scrollIntoView?.({ block: 'nearest' }); } catch { /* best effort */ } });
    } catch (e) { warn(e); }
  }
  function close(restore = true) {
    if (!D || !S.open) return false;
    S.open = false;
    const had = D.panel.contains(document.activeElement);
    D.panel.dataset.open = 'false';
    D.panel.inert = true;
    setMini(wantMini());
    if (had) {
      const f = lastFocus;
      try {
        if (restore && f && f.isConnected && f !== document.body && typeof f.focus === 'function' && !f.closest?.('[inert]')) f.focus({ preventScroll: true });
        else document.activeElement?.blur?.();
      } catch { /* focus is best effort */ }
    }
    lastFocus = null;
    return true;
  }

  // ---------------------------------------------------------------- the room talks back
  try {
    ctx.on?.('lang', () => { seenLang = i18n.lang; apply3D(); render(); session(); });
    ctx.on?.('view', (v) => { if (v === 'work') close(false); });
    ctx.on?.('overlay', (who) => { if (who !== 'music') close(false); });
    ctx.on?.('state', (s) => { if (s && s.sound === false && S.playing) pause({ user: false }); });
  } catch { /* no bus */ }
  // another overlay opening (main's panel, the work sheet, another module's dialog) takes the right side
  try {
    if (D && typeof MutationObserver === 'function') {
      const phone = typeof matchMedia === 'function' ? matchMedia('(max-width: 720px)') : null;
      const rival = (n) => {
        if (!n || n.nodeType !== 1 || inside(n) || n === D.panel || n === D.mini || n.dataset?.open !== 'true') return false;
        if (n.matches('[role="dialog"], .panel, .sheet')) return true;
        if (phone?.matches && n.matches('.atmo')) return true;
        try { return !!n.querySelector(':scope > [role="dialog"]'); } catch { return false; }
      };
      new MutationObserver((list) => {
        if (S.open && list.some((m) => rival(m.target))) close(false);
      }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-open'] });
    }
  } catch { /* fine without */ }

  loadCover(cur());
  apply3D();
  render();
  setTimeout(() => { for (const tr of tracks) loadCover(tr); }, 2500);      // the rest of the sleeves, after the room has loaded

  // ---------------------------------------------------------------- per frame
  function update(dt, frame) {
    try {
      lastFrame = frame || lastFrame;
      // the 'lang' event can be missed (main throws before emitting it when the loader is gone): watch the language too
      if (i18n.lang !== seenLang) { seenLang = i18n.lang; apply3D(); render(); session(); }
      const d = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
      clock += d;
      if (S.playing && !soundOn()) pause({ user: false });
      const want = S.playing ? 1 : 0;
      // reduced motion: the record stays put (like the panel's vinyl) and the arm sets down in one step
      if (still) { spinV = 0; armP = want; }
      else {
        const acc = (SPIN / SPIN_UP) * d;
        spinV += Math.max(-acc, Math.min(acc, want * SPIN - spinV));
        const a = d / ARM_TIME;
        armP += Math.max(-a, Math.min(a, want - armP));
      }
      if (platter && spinV > 1e-4) {
        platter.rotation.y -= spinV * d;                         // clockwise seen from above
        if (platter.rotation.y < -TAU * 64) platter.rotation.y %= TAU;
      }
      if (arm) {
        const tr = cur();
        let target = 0;
        if (tr?.kind === 'file' && tr.el && Number.isFinite(tr.duration) && tr.duration > 0) target = Math.min(1, (tr.el.currentTime || 0) / tr.duration);
        else if (tr?.kind === 'tape' && S.playing) target = Math.min(1, (clock - S.tapeT0) / TAPE_SIDE);
        if (!S.playing && armP <= 0.001) target = 0;
        sweep = still ? target : sweep + (target - sweep) * Math.min(1, d * 2);
        const e = armP * armP * (3 - 2 * armP);
        arm.rotation.y = armBase + (TONEARM_PLAY + TONEARM_SWEEP * sweep) * e;
        // lift, swing, settle: up off the rest, over, and down onto the record (and the same way back)
        arm.rotation.x = armBaseX - TONEARM_LIFT * Math.sin(Math.PI * armP);
      }
      const u = sleeve.mat?.uniforms;
      if (u?.uMix && u.uMix.value < 1) u.uMix.value = Math.min(1, u.uMix.value + d / 0.6);
      // the cross-fade is done: let go of the cover it faded from (one texture per record would stay on the GPU)
      if (u?.uMix && u.uMix.value >= 1 && u.tPrev && u.tPrev.value !== u.tMap.value) {
        releaseTex(u.tPrev.value);
        u.tPrev.value = u.tMap.value;
        u.uPrevAspect.value = u.uImgAspect.value;
      }
      setMini(wantMini());
      if (S.open || miniShown) progress();
    } catch (e) { warn(e); }
  }

  // ---------------------------------------------------------------- what the host sees
  const info = (tr, i) => ({
    index: i, kind: tr.kind, live: tr.kind === 'tape',
    title: field(tr, 'title'), artist: field(tr, 'artist'), album: field(tr, 'album'), year: field(tr, 'year'),
    notes: field(tr, 'notes'), credits: field(tr, 'credits'), link: safeLink(field(tr, 'link')),
    cover: coverURL(tr), src: tr.src || '', duration: Number.isFinite(tr.duration) ? tr.duration : null,
    failed: !!tr.failed,
  });
  const safe = (fn) => (...a) => { try { return fn(...a); } catch (e) { warn(e); return undefined; } };

  return {
    actions: {
      record: safe(() => {
        if (S.playing) {
          pause();
          if (!S.open) toast(t('music.toast.stopped'));
        } else {
          play();
          open();
        }
      }),
      sleeve: safe(() => { if (S.open) close(); else open(); }),
    },
    tips: {
      record: safe(() => t(S.playing ? 'music.tip.pause' : 'music.tip.play')),
      sleeve: safe(() => {
        const tr = cur();
        const album = field(tr, 'album'), title = field(tr, 'title');
        return t('music.tip.sleeve', { what: album && album !== title ? `${album} · ${title}` : title });
      }),
    },
    keys: {
      // an open dial menu (or the atmosphere sheet) holding focus closes first: let Esc through to ui.js
      Escape: (e) => (e?.target?.closest?.('.dial[data-open="true"], #atmo[data-open="true"]') ? false : close()),
      // only the open panel keeps the arrows; on the mini card they still browse the room's work
      ArrowLeft: (e) => inPanel(e?.target) && !e.target.closest?.('input'),
      ArrowRight: (e) => inPanel(e?.target) && !e.target.closest?.('input'),
      ArrowUp: (e) => (inPanel(e?.target) && !e.target.closest?.('input') ? rowNav(-1) : false),
      ArrowDown: (e) => (inPanel(e?.target) && !e.target.closest?.('input') ? rowNav(1) : false),
    },
    update,
    api: {
      open: safe(open),
      close: safe(() => close()),
      play: safe((i) => play(Number.isFinite(i) ? i : undefined)),
      pause: safe(() => pause()),
      stop: safe(() => pause()),
      toggle: safe(toggle),
      next: safe(() => next()),
      prev: safe(() => prev()),
      seek: safe((sec) => seek(sec)),
      isPlaying: () => S.playing,
      current: safe(() => ({ ...info(cur(), S.i), playing: S.playing, time: cur()?.el?.currentTime || 0 })),
      tracks: safe(() => tracks.map(info)),
      level: safe(level),
    },
  };
}
