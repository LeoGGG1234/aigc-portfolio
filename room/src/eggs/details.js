// details: small things that reward curiosity.
//   - studio clock: hands follow the time in content.studio.timezone (ticking second hand), hover + click
//   - the cat: purrs, stretches, falls asleep; lifetime pets with tiny achievements
//   - the mug: a per-day coffee counter that gets worried
//   - the plant: three quick clicks unfold a note (content.secrets.plant)
//   - the mood board: pictures on pin_0..5 (content.moodboard or generated studies) and a lightbox
//
// Integration notes (for main.js):
//   - tips are provided for clock, plant, moodboard, cat and mug; they should take precedence over
//     main's built-in 'tip.cat' / 'tip.mug' strings, and actions.cat / actions.mug replace main's.
//   - while one of this module's overlays is open, a capture-phase keydown listener on window handles
//     Escape, ArrowLeft, ArrowRight and Tab, then stops propagation so ui.js does not also send the
//     camera home or switch the projected work. It also stops the room's one-letter shortcuts
//     (t / w / s / l / m) and the terminal toggle (` / ~), so nothing changes behind the modal.
//     keys.* do the same work when main routes them first; they call preventDefault() so the capture
//     listener skips an event that was already handled.
//   - content.studio.timezone must be an IANA zone ("Asia/Shanghai"). If it is missing or invalid the
//     clock shows the visitor's local time and does not name site.location.label (a console warning
//     says why), so a typo never labels the visitor's own time with the studio's city.
//   - a soft two-note chime plays at the top of each studio hour, only when sound is on.
import * as THREE from '../three.js';
import { studioZone, fitCanvas } from '../content.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const PINS = 6;
const TICK_MS = 120;           // second-hand settle time
const PIN_TEX = 512;           // long side of a pin texture: the prints are ~100-320 device px on screen
const STUDY_BIG = 960;         // long side of a generated study in the lightbox
const ROOM_KEYS = /^[twslm`~]$/i;   // ui.js one-letter room shortcuts + the terminal toggle
const PH_KINDS = ['fields', 'horizon', 'figure', 'grain', 'blinds', 'moon'];
// Normalised desktop placement, shared by the physical board and its enlarged view.
const PIN_LAYOUT = [
  { x: .0375, y: .0948, w: .4, tilt: -6.8, layer: 1 },
  { x: .4125, y: .031, w: .2, tilt: 4.6, layer: 4 },
  { x: .66875, y: .1207, w: .225, tilt: -7.2, layer: 2 },
  { x: .1875, y: .4224, w: .2625, tilt: 3.2, layer: 5 },
  { x: .49625, y: .4483, w: .1875, tilt: 6.4, layer: 3 },
  { x: .73125, y: .5483, w: .20625, tilt: -4.8, layer: 6 },
];

const STR = {
  en: {
    'details.tip.clock': 'Studio clock · {time} in {city}',
    'details.tip.clockNoCity': 'Studio clock · {time}',
    'details.clock.toast': '{time} in {city}. {status}',
    'details.clock.toastNoCity': '{time} in the studio. {status}',
    'details.st.asleep.0': 'Asleep, hopefully. The render queue is not.',
    'details.st.asleep.1': 'Lights out. Only the GPU fan is awake.',
    'details.st.dawn.0': 'Making coffee and pretending to be a morning person.',
    'details.st.dawn.1': 'Kettle on. Eyes not quite open yet.',
    'details.st.morning.0': 'Deep in renders. Please do not touch the seed.',
    'details.st.morning.1': 'Morning focus: twelve variations of the same frame.',
    'details.st.noon.0': 'Lunch, eaten one-handed beside the keyboard.',
    'details.st.noon.1': 'Out for noodles. Back when the queue finishes.',
    'details.st.afternoon.0': 'Editing. Cutting two frames, then putting them back.',
    'details.st.afternoon.1': 'Timeline open, playhead wandering.',
    'details.st.evening.0': 'Colour grading, chasing the exact orange of a streetlight.',
    'details.st.evening.1': 'Dimming the lamp to judge the shadows.',
    'details.st.late.0': 'Probably still awake. One more version.',
    'details.st.late.1': 'Still up. The cat has stopped waiting.',

    'details.cat.fallback': 'The cat',
    'details.tip.cat': '{cat} · the studio cat',
    'details.tip.catAsleep': '{cat} · asleep',
    'details.cat.warm.0': '{cat} leans into your hand.',
    'details.cat.warm.1': '{cat} is purring like a very small engine.',
    'details.cat.warm.2': '{cat} slow-blinks at you. That means yes.',
    'details.cat.warm.3': '{cat} kneads the blanket, very seriously.',
    'details.cat.warm.4': 'A tail curls around your wrist.',
    'details.cat.warm.5': '{cat} approves of you. Quietly.',
    'details.cat.stretch': '{cat} stretches and rolls over. The belly is a trap.',
    'details.cat.asleep': '{cat} is asleep now, let them be.',
    'details.cat.ach.10': 'Achievement · Ten pets. {cat} now knows your footsteps.',
    'details.cat.ach.50': 'Achievement · Fifty pets. {cat} has officially adopted you.',
    'details.cat.ach.100': 'Achievement · One hundred pets. {cat} saved you a spot on the windowsill.',

    'details.tip.mug': 'Coffee',
    'details.tip.mugN': 'Coffee · {n} today',
    'details.mug.1': 'Cup #1 today. Still warm.',
    'details.mug.2': 'Cup #2 today. Now we can talk.',
    'details.mug.3': 'Cup #3 today. The renders will not wait.',
    'details.mug.4': 'Cup #4 today. The hands are getting quick.',
    'details.mug.5': 'Cup #5 today. Have you considered tea?',
    'details.mug.6': 'Cup #6 today. There is chamomile in the drawer, just saying.',
    'details.mug.7': 'Cup #7 today. {cat} is giving you a look.',
    'details.mug.8': 'Cup #8 today. It has been decaf for a while now.',
    'details.mug.many': 'Cup #{n} today. The mug has asked for a day off.',
    'details.mug.lots': 'Cup #{n} today. Switching you to warm water. Doctor’s orders.',

    'details.tip.plant': 'A plant',
    'details.plant.rustle': 'The leaves rustle.',
    'details.plant.crinkle': 'Something crinkles behind the pot.',
    'details.note.kicker': 'Folded behind the pot',
    'details.note.kickerAgain': 'Still folded behind the pot',
    'details.note.empty': 'Nothing hidden here yet. Just soil, and a little patience.',
    'details.note.close': 'Fold the note away',

    'details.tip.moodboard': 'Mood board · references',
    'details.mb.title': 'Mood board',
    'details.mb.kicker': 'References · six pins',
    'details.mb.ref': 'Reference {n}',
    'details.mb.close': 'Close the mood board',
    'details.mb.all': 'All pins',
    'details.mb.allLabel': 'Back to all pins',
    'details.mb.prev': 'Previous pin',
    'details.mb.next': 'Next pin',
    'details.mb.open': 'Open {caption}',
    'details.mb.study': 'placeholder study · {kind}',
    'details.ph.fields': 'colour fields',
    'details.ph.horizon': 'a horizon',
    'details.ph.figure': 'a figure',
    'details.ph.grain': 'grain',
    'details.ph.blinds': 'light through blinds',
    'details.ph.moon': 'moon over hills',
  },
  zh: {
    'details.tip.clock': '工作室时钟 · {city} {time}',
    'details.tip.clockNoCity': '工作室时钟 · {time}',
    'details.clock.toast': '{city}现在 {time}。{status}',
    'details.clock.toastNoCity': '工作室现在 {time}。{status}',
    'details.st.asleep.0': '应该在睡觉吧。渲染队列可没睡。',
    'details.st.asleep.1': '熄灯了，只有显卡风扇还醒着。',
    'details.st.dawn.0': '在煮咖啡，假装自己是早起的人。',
    'details.st.dawn.1': '水壶响了，眼睛还没完全睁开。',
    'details.st.morning.0': '埋头渲染中。请别碰那个种子。',
    'details.st.morning.1': '上午专注时间：同一帧的十二个版本。',
    'details.st.noon.0': '午饭时间，一只手吃饭，一只手按键盘。',
    'details.st.noon.1': '出去吃面了，队列跑完就回来。',
    'details.st.afternoon.0': '在剪片子。删掉两帧，又加了回去。',
    'details.st.afternoon.1': '时间线开着，播放头到处闲逛。',
    'details.st.evening.0': '在调色，想调准路灯那一抹橙。',
    'details.st.evening.1': '把台灯调暗，好看清阴影。',
    'details.st.late.0': '大概还醒着。再出一版就睡。',
    'details.st.late.1': '还没睡。猫已经不等了。',

    'details.cat.fallback': '猫',
    'details.tip.cat': '{cat} · 工作室的猫',
    'details.tip.catAsleep': '{cat} · 睡着了',
    'details.cat.warm.0': '{cat}把脑袋往你手心里蹭。',
    'details.cat.warm.1': '{cat}像一台很小的发动机，呼噜呼噜。',
    'details.cat.warm.2': '{cat}冲你慢慢眨了眨眼，意思是：可以。',
    'details.cat.warm.3': '{cat}一本正经地踩起了毯子。',
    'details.cat.warm.4': '一条尾巴绕上了你的手腕。',
    'details.cat.warm.5': '{cat}默默认可了你。',
    'details.cat.stretch': '{cat}伸了个懒腰，翻了个身。肚皮是陷阱。',
    'details.cat.asleep': '{cat}睡着了，让它睡吧。',
    'details.cat.ach.10': '成就 · 摸了十次。{cat}记住你的脚步声了。',
    'details.cat.ach.50': '成就 · 摸了五十次。{cat}正式收养了你。',
    'details.cat.ach.100': '成就 · 摸了一百次。{cat}在窗台上给你留了个位置。',

    'details.tip.mug': '咖啡',
    'details.tip.mugN': '咖啡 · 今天 {n} 杯',
    'details.mug.1': '今天第 1 杯。还是热的。',
    'details.mug.2': '今天第 2 杯。现在可以聊了。',
    'details.mug.3': '今天第 3 杯。渲染不等人。',
    'details.mug.4': '今天第 4 杯。手开始有点快了。',
    'details.mug.5': '今天第 5 杯。要不要考虑喝茶？',
    'details.mug.6': '今天第 6 杯。抽屉里有洋甘菊，说一声而已。',
    'details.mug.7': '今天第 7 杯。{cat}在用眼神劝你。',
    'details.mug.8': '今天第 8 杯。其实早就换成低因了。',
    'details.mug.many': '今天第 {n} 杯。杯子申请休假了。',
    'details.mug.lots': '今天第 {n} 杯。给你换成温水了，医嘱。',

    'details.tip.plant': '一盆植物',
    'details.plant.rustle': '叶子沙沙作响。',
    'details.plant.crinkle': '花盆后面好像有纸的声音。',
    'details.note.kicker': '压在花盆后面',
    'details.note.kickerAgain': '还压在花盆后面',
    'details.note.empty': '这里还什么都没藏。只有土，和一点耐心。',
    'details.note.close': '把纸条折回去',

    'details.tip.moodboard': '灵感板 · 参考',
    'details.mb.title': '灵感板',
    'details.mb.kicker': '参考 · 六张图',
    'details.mb.ref': '参考 {n}',
    'details.mb.close': '关闭灵感板',
    'details.mb.all': '全部',
    'details.mb.allLabel': '回到全部图片',
    'details.mb.prev': '上一张',
    'details.mb.next': '下一张',
    'details.mb.open': '打开 {caption}',
    'details.mb.study': '占位习作 · {kind}',
    'details.ph.fields': '色域',
    'details.ph.horizon': '地平线',
    'details.ph.figure': '人影',
    'details.ph.grain': '颗粒',
    'details.ph.blinds': '百叶窗的光',
    'details.ph.moon': '山上的月亮',
  },
};

// cover-fit, same as the framed prints in effects.js
const COVER_FRAG = /* glsl */`
  uniform float uImgAspect, uFrameAspect, uContain;
  vec3 picture(vec2 uv, vec3 light) {
    vec2 s = uImgAspect > uFrameAspect ? vec2(uFrameAspect / uImgAspect, 1.) : vec2(1., uImgAspect / uFrameAspect);
    if (uContain > .5) s /= min(s.x, s.y);
    vec2 iuv = (uv - .5) * s + .5;
    if (uContain > .5 && (any(lessThan(iuv, vec2(0.))) || any(greaterThan(iuv, vec2(1.))))) return vec3(.92, .89, .82) * light;
    return texture2D(tMap, iuv).rgb * light;
  }
`;

const pad = (n) => String(n).padStart(2, '0');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// easeOutBack: reaches the next second, overshoots a hair, settles
const backOut = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
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
function addSymbols() {
  try {
    const defs = document.querySelector('svg defs');
    if (!defs || document.getElementById('i-dtl-grid')) return;
    const sym = document.createElementNS(SVGNS, 'symbol');
    sym.setAttribute('id', 'i-dtl-grid');
    sym.setAttribute('viewBox', '0 0 24 24');
    for (const [x, y] of [[4.5, 4.5], [13.5, 4.5], [4.5, 13.5], [13.5, 13.5]]) {
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 6); r.setAttribute('height', 6); r.setAttribute('rx', 1.2);
      sym.appendChild(r);
    }
    defs.appendChild(sym);
  } catch { /* icons are decorative */ }
}

// ------------------------------------------------------------------ generated studies for empty pins
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// a block of colour with a genuinely soft edge: only the blurred shadow of an off-canvas rect lands
function softRect(g, x, y, w, h, color, feather, alpha = 1) {
  const off = g.canvas.width * 3;
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = feather;
  g.shadowOffsetX = off;
  g.fillRect(x - off, y, w, h);
  g.restore();
}

function glow(g, x, y, r, color, a0 = 0.8) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, color);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalAlpha = a0; g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}

function finish(g, w, h, r, grain = 12) {
  // vignette
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.62);
  v.addColorStop(0, 'rgba(10,8,6,0)');
  v.addColorStop(1, 'rgba(10,8,6,.32)');
  g.fillStyle = v; g.fillRect(0, 0, w, h);
  // grain
  try {
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * grain;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
  } catch { /* tainted or unsupported: skip grain */ }
}

function drawStudy(kind, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  if (!g) return cv;
  const r = rng(4243 + kind * 977);
  if (kind === 0) {
    // colour fields: two soft-edged blocks on umber
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3f2c22'); bg.addColorStop(1, '#2a1d17');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const m = w * 0.1, f = w * 0.032;
    softRect(g, m, h * 0.08, w - 2 * m, h * 0.42, '#9a4127', f);
    softRect(g, m, h * 0.55, w - 2 * m, h * 0.06, '#1d1410', f * 0.6, 0.9);
    softRect(g, m, h * 0.66, w - 2 * m, h * 0.25, '#d0904e', f);
    glow(g, w * 0.5, h * 0.3, w * 0.5, 'rgba(240,170,110,.35)', 0.6);
  } else if (kind === 1) {
    // a horizon at dusk over still water
    const hy = h * 0.6;
    const sky = g.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, '#1d2b36'); sky.addColorStop(0.55, '#5b4a50'); sky.addColorStop(1, '#e2a467');
    g.fillStyle = sky; g.fillRect(0, 0, w, hy);
    const sea = g.createLinearGradient(0, hy, 0, h);
    sea.addColorStop(0, '#3a3236'); sea.addColorStop(1, '#121417');
    g.fillStyle = sea; g.fillRect(0, hy, w, h - hy);
    const sx = w * 0.62, sy = hy - h * 0.05;
    glow(g, sx, sy, w * 0.42, 'rgba(244,190,120,.7)', 0.7);
    g.fillStyle = '#f6dcaa'; g.beginPath(); g.arc(sx, sy, w * 0.055, 0, Math.PI * 2); g.fill();
    g.fillStyle = sea; g.fillRect(0, hy, w, 2);
    for (let i = 0; i < 26; i++) {
      const y = hy + 6 + (i / 26) ** 1.5 * (h - hy - 10);
      const len = w * (0.04 + r() * 0.16) * (1 - i / 40);
      g.globalAlpha = 0.5 * (1 - i / 30);
      g.fillStyle = '#efc38a';
      g.fillRect(sx - len / 2 + (r() - 0.5) * w * 0.08, y, len, 1.5 + r() * 1.5);
    }
    g.globalAlpha = 1;
  } else if (kind === 2) {
    // a figure in a patch of afternoon light, long shadow
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#e9dcc5'); bg.addColorStop(1, '#bba585');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const fy = h * 0.72;
    g.fillStyle = 'rgba(120,96,70,.28)'; g.fillRect(0, fy, w, h - fy);
    g.save(); g.globalAlpha = 0.55; g.fillStyle = '#fbefd8';
    g.beginPath(); g.moveTo(w * 0.52, h * 0.12); g.lineTo(w * 0.86, h * 0.12); g.lineTo(w * 0.95, fy); g.lineTo(w * 0.6, fy); g.closePath(); g.fill();
    g.restore();
    const fx = w * 0.36, fh = h * 0.24;
    g.fillStyle = 'rgba(40,30,22,.32)';
    g.beginPath(); g.moveTo(fx - w * 0.02, fy); g.lineTo(fx + w * 0.02, fy); g.lineTo(fx + w * 0.42, fy + h * 0.1); g.lineTo(fx + w * 0.34, fy + h * 0.12); g.closePath(); g.fill();
    g.fillStyle = '#2a211b';
    g.beginPath(); g.ellipse(fx, fy - fh + fh * 0.09, fh * 0.075, fh * 0.09, 0, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(fx - fh * 0.11, fy);
    g.quadraticCurveTo(fx - fh * 0.15, fy - fh * 0.55, fx - fh * 0.06, fy - fh * 0.8);
    g.lineTo(fx + fh * 0.06, fy - fh * 0.8);
    g.quadraticCurveTo(fx + fh * 0.15, fy - fh * 0.55, fx + fh * 0.11, fy);
    g.closePath(); g.fill();
  } else if (kind === 3) {
    // grain: a pale warm field, a soft disc, dust
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#dcc8a8'); bg.addColorStop(1, '#8e7a64');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    glow(g, w * 0.42, h * 0.4, w * 0.45, 'rgba(250,238,215,.9)', 0.75);
    g.fillStyle = 'rgba(40,30,24,.5)';
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.15 + r() * 0.4; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    g.globalAlpha = 1;
    finish(g, w, h, r, 46);
    return cv;
  } else if (kind === 4) {
    // light through blinds on a dark wall
    g.fillStyle = '#1b1714'; g.fillRect(0, 0, w, h);
    glow(g, w * 0.6, h * 0.45, w * 0.8, 'rgba(120,70,30,.6)', 0.6);
    g.save();
    g.translate(w * 0.5, h * 0.5); g.rotate(-0.32); g.transform(1, 0, -0.35, 1, 0, 0);
    const span = Math.hypot(w, h);
    for (let i = 0; i < 8; i++) {
      const y = -h * 0.42 + i * h * 0.095;
      const band = h * 0.038;
      const lg = g.createLinearGradient(-span / 2, 0, span / 2, 0);
      lg.addColorStop(0, 'rgba(236,168,92,0)'); lg.addColorStop(0.35, 'rgba(240,178,104,.75)'); lg.addColorStop(1, 'rgba(236,168,92,.05)');
      g.fillStyle = lg;
      for (let k = 0; k < 4; k++) { g.globalAlpha = 0.22 + k * 0.14; g.fillRect(-span / 2, y - band / 2 + k * band * 0.1, span, band * (1 - k * 0.2)); }
    }
    g.restore();
  } else {
    // moon over layered hills
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0e161d'); bg.addColorStop(1, '#25363d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f1e6d6';
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2 + r() * 0.5; const s = r() < 0.15 ? 2 : 1; g.fillRect(r() * w, r() * h * 0.5, s, s); }
    g.globalAlpha = 1;
    const mx = w * 0.68, my = h * 0.24;
    glow(g, mx, my, w * 0.32, 'rgba(241,230,214,.45)', 0.7);
    g.fillStyle = '#f3e9d8'; g.beginPath(); g.arc(mx, my, w * 0.07, 0, Math.PI * 2); g.fill();
    const ridges = [['#2e434a', 0.58, 0.05], ['#1f3036', 0.68, 0.07], ['#121c20', 0.8, 0.06]];
    ridges.forEach(([col, base, amp], j) => {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, h);
      const ph = r() * 6;
      for (let x = 0; x <= w; x += w / 48) {
        const y = h * base - Math.sin(x / w * (3 + j) + ph) * h * amp - Math.sin(x / w * 11 + ph * 2) * h * amp * 0.25;
        g.lineTo(x, y);
      }
      g.lineTo(w, h); g.closePath(); g.fill();
    });
  }
  finish(g, w, h, r, 14);
  return cv;
}

function grainTile() {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    const g = cv.getContext('2d');
    const img = g.createImageData(96, 96);
    const r = rng(77);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(r() * 16);
    }
    g.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  } catch { return ''; }
}

// aspect (width / height) of a picture quad, measured along its uv axes like setupArt
function quadAspect(mesh) {
  try {
    const geo = mesh.geometry;
    const pos = geo?.attributes?.position, uvs = geo?.attributes?.uv;
    if (pos && uvs && pos.count >= 4) {
      const n = Math.min(pos.count, 64);
      const sc = mesh.scale ? new THREE.Vector3(Math.abs(mesh.scale.x), Math.abs(mesh.scale.y), Math.abs(mesh.scale.z)) : new THREE.Vector3(1, 1, 1);
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([uvs.getX(i), uvs.getY(i), new THREE.Vector3().fromBufferAttribute(pos, i).multiply(sc)]);
      const at = (u, v) => pts.reduce((b, e) => (Math.hypot(e[0] - u, e[1] - v) < Math.hypot(b[0] - u, b[1] - v) ? e : b))[2];
      const a = at(0, 0).distanceTo(at(1, 0)) / Math.max(1e-4, at(0, 0).distanceTo(at(0, 1)));
      if (Number.isFinite(a) && a > 0.1 && a < 10) return a;
    }
  } catch { /* fall through */ }
  return 0.8;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';      // as THREE.TextureLoader does: keeps the canvas usable by WebGL
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`pin image ${src}`));
    im.src = src;
  });
}

// ================================================================== module
export function create(ctx) {
  const c = ctx?.content || {};
  const i18n = ctx?.i18n || {};
  try { i18n.extend?.(STR); } catch { /* strings fall back to keys */ }
  // shared i18n first; the module's own table if ctx.i18n is missing or the key did not register
  const local = (k, v = {}) => String((STR[i18n.lang === 'zh' ? 'zh' : 'en'] || STR.en)[k] ?? STR.en[k] ?? k)
    .replace(/\{(\w+)\}/g, (_, x) => (x in v ? v[x] : ''));
  const t = (k, v) => {
    try { if (typeof i18n.t === 'function') { const s = i18n.t(k, v); if (s && s !== k) return s; } } catch { /* fall back */ }
    return local(k, v || {});
  };
  const pick = (v) => { try { return (i18n.pick ? i18n.pick(v) : (typeof v === 'string' ? v : v?.en)) || ''; } catch { return ''; } };
  const lang = () => (i18n.lang === 'zh' ? 'zh-CN' : 'en');
  const toast = (s, ms) => { try { if (s) ctx?.ui?.toast?.(s, ms); } catch { /* no toast */ } };
  const store = {
    get(k) { try { return ctx?.store?.get?.(k) ?? null; } catch { return null; } },
    set(k, v) { try { ctx?.store?.set?.(k, String(v)); } catch { /* private mode */ } },
  };
  let still = !!ctx?.still;
  try { still = still || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* old browser */ }
  const catName = () => pick(c.site?.catName) || t('details.cat.fallback');
  const city = () => pick(c.site?.location?.label);

  // ---------------------------------------------------------------- sound bits (all quiet, all optional)
  const S = () => ctx?.sound;
  const live = () => { const s = S(); return !!(s && s.ctx && s.enabled); };
  const safe = (fn) => { try { if (live()) fn(S()); } catch { /* sound is a nicety */ } };
  const noise = (s, freq, q, peak, a, d, when = 0) => {
    if (typeof s.burst === 'function' && s.white && typeof s.filter === 'function') s.burst(s.white, [s.filter('bandpass', freq, q)], peak, a, d, when);
    else s.tone?.(freq, peak * 0.2, a, d, 'triangle', when);
  };
  const rustle = (n) => safe((s) => {
    for (let k = 0; k < 3 + n; k++) noise(s, 3200 + Math.random() * 2600, 0.9, 0.05 + Math.random() * 0.03, 0.01, 0.06 + Math.random() * 0.08, k * 0.045 + Math.random() * 0.02);
  });
  const unfold = () => safe((s) => {
    noise(s, 1800, 0.7, 0.08, 0.02, 0.22, 0);
    noise(s, 2600, 0.8, 0.06, 0.02, 0.18, 0.16);
  });
  const clink = () => safe((s) => {
    s.tone?.(2350, 0.035, 0.002, 0.4, 'sine', 0);
    s.tone?.(3790, 0.014, 0.002, 0.25, 'sine', 0.003);
  });
  const tickTock = () => safe((s) => { noise(s, 3600, 4, 0.12, 0.001, 0.03, 0); noise(s, 2700, 4, 0.1, 0.001, 0.03, 0.42); });
  const chime = () => safe((s) => {
    s.tone?.(659.3, 0.03, 0.01, 2.2, 'sine', 0);
    s.tone?.(1318.5, 0.008, 0.01, 1.4, 'sine', 0);
    s.tone?.(523.3, 0.028, 0.01, 2.6, 'sine', 0.7);
    s.tone?.(1046.5, 0.007, 0.01, 1.6, 'sine', 0.7);
  });
  const purr = () => safe((s) => s.purr?.());
  const mrrp = () => safe((s) => s.tone?.(430, 0.035, 0.03, 0.2, 'triangle', 0, s.bus, 660));
  // a softer purr for a sleeping cat; falls back to the shared one
  const quietPurr = () => safe((s) => {
    const ac = s.ctx;
    if (!s.brown || typeof s.filter !== 'function' || !s.bus || typeof s.env !== 'function') { s.purr?.(); return; }
    const t0 = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = s.brown;
    const lp = s.filter('lowpass', 300);
    const am = ac.createGain(); am.gain.value = 0;
    const lfo = ac.createOscillator(); lfo.frequency.value = 22;
    const lfoG = ac.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG); lfoG.connect(am.gain);
    const out = ac.createGain();
    src.connect(lp); lp.connect(am); am.connect(out); out.connect(s.bus);
    s.env(out, t0, 0.5, 0.45, 2.4);
    src.start(t0); lfo.start(t0); src.stop(t0 + 3.1); lfo.stop(t0 + 3.1);
  });

  // ---------------------------------------------------------------- studio time
  const tz = studioZone(c);
  const fmtOpts = { hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  let fmt = null, zoned = false;
  try { fmt = new Intl.DateTimeFormat('en-US', { ...fmtOpts, timeZone: tz || undefined }); zoned = !!tz; } catch {
    try { fmt = new Intl.DateTimeFormat('en-US', fmtOpts); } catch { fmt = null; }
  }
  // the studio's city only labels the studio's own time, never the visitor's local fallback
  const clockCity = () => (zoned ? city() : '');
  // offset between UTC and studio wall time, refreshed every minute (catches DST changes)
  let shift = 0, shiftMinute = NaN;
  function refreshShift(now) {
    shiftMinute = Math.floor(now / 60000);
    const base = now - (now % 1000);
    try {
      if (fmt) {
        const p = {};
        for (const x of fmt.formatToParts(new Date(base))) p[x.type] = x.value;
        const u = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
        if (Number.isFinite(u)) { shift = u - base; return; }
      }
    } catch { /* fall back to local */ }
    shift = -new Date(base).getTimezoneOffset() * 60000;
  }
  function studioNow() {
    const now = Date.now();
    if (Math.floor(now / 60000) !== shiftMinute) refreshShift(now);
    const d = new Date(now + shift);
    return {
      h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), ms: d.getUTCMilliseconds(),
      date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    };
  }
  const hm = (st) => `${pad(st.h)}:${pad(st.m)}`;
  const phase = (h) => (h >= 2 && h < 6 ? 'asleep' : h < 8 && h >= 6 ? 'dawn' : h >= 8 && h < 12 ? 'morning'
    : h >= 12 && h < 14 ? 'noon' : h >= 14 && h < 18 ? 'afternoon' : h >= 18 && h < 22 ? 'evening' : 'late');

  let hands = null, handsAt = -Infinity;
  function findHands(now) {
    handsAt = now;
    const get = (n) => { try { return ctx?.root?.getObjectByName?.(n) || null; } catch { return null; } };
    hands = { h: get('clock_hour'), m: get('clock_minute'), s: get('clock_second') };
  }
  let lastHour = null;
  let clockClicks = 0;

  // ---------------------------------------------------------------- cat
  let catN = 0, catLast = 0, catLine = 0;
  const catAsleep = () => catN >= 7 && Date.now() - catLast < 20000;

  // ---------------------------------------------------------------- mug
  let mugRec = { d: '', n: 0 };
  try { const v = JSON.parse(store.get('details.mug') || 'null'); if (v && typeof v.d === 'string') mugRec = { d: v.d, n: Math.max(0, v.n | 0) }; } catch { /* fresh */ }
  const mugToday = () => (mugRec.d === studioNow().date ? mugRec.n : 0);

  // ---------------------------------------------------------------- plant
  let plantTaps = [];

  // ---------------------------------------------------------------- overlays: shared focus + keys
  let lb = null, lbCard = null, lbOpen = false, zoomIdx = -1, lbFocus = null, lbHideT = 0;
  let note = null, noteCard = null, noteOpen = false, noteFocus = null, noteHideT = 0, noteAgain = false;
  const refs = {};

  const restore = (elm) => {
    try {
      if (elm && elm.isConnected && elm !== document.body && typeof elm.focus === 'function') elm.focus({ preventScroll: true });
      else document.activeElement?.blur?.();
    } catch { /* focus is best effort */ }
  };
  // what an overlay focuses when it opens: its first control after a keyboard open, else its heading or card
  // (tabindex=-1, no outline), so a click or tap in the room does not ring a button with Chrome's :focus-visible
  const byKeyboard = () => { try { return ctx?.lastInput?.() === 'keyboard'; } catch { return false; } };
  const focusEl = (elm) => { try { elm?.focus?.({ preventScroll: true }); } catch { /* best effort */ } };
  const show = (wrap) => {
    wrap.hidden = false;
    void wrap.offsetWidth;            // let the transition start from the closed state
    wrap.dataset.open = 'true';
  };
  const hide = (wrap, done) => {
    wrap.dataset.open = 'false';
    return setTimeout(() => { if (wrap.dataset.open !== 'true') wrap.hidden = true; done?.(); }, still ? 0 : 260);
  };
  function trapTab(e) {
    const root = noteOpen ? noteCard : lbCard;
    if (!root) return;
    const f = [...root.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((x) => x.getClientRects().length > 0);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    // focus outside the dialog or on the card itself: wrap to an end. From the heading (tabindex=-1) the browser's
    // own order already leads into the dialog, so let it.
    if (!root.contains(a) || a === root) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }

  // ---------------------------------------------------------------- plant note
  function buildNote() {
    if (note) return;
    note = el('div', 'dtl-note-wrap' + (still ? ' dtl-still' : ''), document.body);
    note.hidden = true;
    note.dataset.open = 'false';
    const scrim = el('div', 'dtl-note-scrim', note);
    scrim.addEventListener('click', () => closeNote());
    noteCard = el('article', 'dtl-note', note);
    noteCard.setAttribute('role', 'dialog');
    noteCard.setAttribute('aria-modal', 'true');
    noteCard.setAttribute('aria-labelledby', 'dtl-note-k');
    noteCard.tabIndex = -1;            // a click on the paper keeps focus in the dialog, not on <body>
    const grain = grainTile();
    if (grain) noteCard.style.setProperty('--dtl-grain', `url("${grain}")`);
    refs.noteX = el('button', 'dtl-note-x', noteCard);
    refs.noteX.type = 'button';
    refs.noteX.appendChild(icon('i-close'));
    refs.noteX.addEventListener('click', () => closeNote());
    refs.noteK = el('p', 'dtl-note-k', noteCard);
    refs.noteK.id = 'dtl-note-k';
    refs.noteBody = el('p', 'dtl-note-body', noteCard);
    refs.noteSig = el('p', 'dtl-note-sig', noteCard);
  }
  function renderNote() {
    if (!note) return;
    noteCard.lang = lang();
    refs.noteX.setAttribute('aria-label', t('details.note.close'));
    refs.noteK.textContent = t(noteAgain ? 'details.note.kickerAgain' : 'details.note.kicker');
    refs.noteBody.textContent = pick(c.secrets?.plant) || t('details.note.empty');
    const name = typeof c.site?.name === 'string' ? c.site.name : pick(c.site?.name);
    refs.noteSig.textContent = name ? `— ${name}` : '';
    refs.noteSig.hidden = !name;
  }
  function openNote() {
    try {
      buildNote();
      noteAgain = store.get('details.plantFound') === '1';
      store.set('details.plantFound', '1');
      renderNote();
      if (!noteOpen) noteFocus = document.activeElement;
      noteOpen = true;
      clearTimeout(noteHideT);
      ctx?.ui?.closePanel?.();
      show(note);
      unfold();
      if (byKeyboard()) focusEl(refs.noteX);
      else focusEl(noteCard);          // the note has no heading element; the card is the labelled dialog
    } catch { /* never throw from an action */ }
  }
  function closeNote() {
    if (!noteOpen || !note) return false;
    noteOpen = false;
    noteHideT = hide(note);
    restore(noteFocus);
    return true;
  }

  // ---------------------------------------------------------------- mood board pins
  const pinState = [];       // { aspect, applied }
  const phURL = [];          // generated studies for the lightbox (STUDY_BIG), lazily, as JPEG data URLs
  const phAspect = [];
  const pinItem = (i) => (Array.isArray(c.moodboard) ? c.moodboard[i] : null) || {};
  const pinSrc = (i) => (typeof pinItem(i).src === 'string' ? pinItem(i).src.trim() : '');
  const pinAspect = (i) => pinState[i]?.aspect || 0.8;
  const fullPin = (i) => pinItem(i).fit === 'contain';
  const printAspect = (i) => fullPin(i) ? pinState[i]?.imageAspect || pinAspect(i) : pinAspect(i);
  let wallPins = null;
  function prepareWallPins() {
    if (wallPins) return true;
    const props = ctx?.root?.getObjectByName?.('props');
    const geo = props?.geometry, pos = geo?.attributes?.position, idx = geo?.index;
    if (!pos || !idx) return false;
    // The shipped glTF merged six paper boxes and six tape boxes into props (12 triangles each).
    // Remove just those faces, keeping the cork, frame and every other prop's baked UVs intact.
    const onOldPaper = (v) => pos.getX(v) > -1.69 && pos.getX(v) < -1.07
      && pos.getY(v) > 1.77 && pos.getY(v) < 2.19
      && pos.getZ(v) > -5.9699 && pos.getZ(v) < -5.95;
    const keep = [];
    let removed = 0;
    for (let k = 0; k < idx.count; k += 3) {
      const a = idx.getX(k), b = idx.getX(k + 1), c = idx.getX(k + 2);
      if (onOldPaper(a) && onOldPaper(b) && onOldPaper(c)) removed++;
      else keep.push(a, b, c);
    }
    if (removed !== 144) return false; // A different room export must not lose unrelated geometry.
    const clean = geo.clone();
    clean.setIndex(keep);
    props.geometry = clean;
    wallPins = new THREE.Group();
    wallPins.name = 'moodboard_pinned_collage';
    ctx.root.add(wallPins);
    return true;
  }
  function wallPaperMaterial(rgba) {
    const tex = new THREE.DataTexture(new Uint8Array(rgba), 1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return ctx.mixer.pictureMaterial(tex);
  }
  let paperMat = null, tapeMat = null;
  function placeWallPin(i, mesh, aspect) {
    if (!prepareWallPins()) return pinAspect(i);
    const p = PIN_LAYOUT[i], boardW = .59, boardH = boardW * 580 / 800;
    const w = boardW * p.w, h = w / aspect, angle = -p.tilt * Math.PI / 180;
    const x = -1.38 - boardW / 2 + boardW * p.x + w / 2;
    const y = 1.98 + boardH / 2 - boardH * p.y - h / 2;
    const z = -5.966 + p.layer * .0007;
    const cs = Math.cos(angle), sn = Math.sin(angle);
    const geo = mesh.geometry.clone(), pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let v = 0; v < pos.count; v++) {
      const dx = (uv.getX(v) - .5) * w, dy = (.5 - uv.getY(v)) * h;
      pos.setXYZ(v, x + cs * dx - sn * dy, y + sn * dx + cs * dy, z);
    }
    pos.needsUpdate = true;
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    mesh.geometry = geo;

    paperMat ||= wallPaperMaterial([245, 240, 230, 255]);
    tapeMat ||= wallPaperMaterial([204, 182, 139, 255]);
    // New paper and tape are real meshes. Reuse this print's local baked-light sample so they
    // follow daylight, lamps and rain together with the picture rather than glowing at night.
    const lightUV = geo.attributes.uv1;
    let lu = 0, lv = 0;
    for (let v = 0; v < lightUV.count; v++) { lu += lightUV.getX(v); lv += lightUV.getY(v); }
    lu /= lightUV.count; lv /= lightUV.count;
    const solid = (name, width, height, depth, material, at, rotation) => {
      const box = new THREE.BoxGeometry(width, height, depth);
      const samples = new Float32Array(box.attributes.position.count * 2);
      for (let v = 0; v < samples.length; v += 2) { samples[v] = lu; samples[v + 1] = lv; }
      box.setAttribute('uv1', new THREE.BufferAttribute(samples, 2));
      const part = new THREE.Mesh(box, material);
      part.name = name; part.position.set(...at); part.rotation.z = rotation;
      wallPins.add(part);
    };
    solid(`pinned_collage_paper_${i}`, w + .005, h + .005, .0005, paperMat, [x, y, z - .00045], angle);
    const tapeOffset = (i % 2 ? -.008 : .006);
    solid(`pinned_collage_tape_${i}`, .025, .009, .0003, tapeMat,
      [x + cs * tapeOffset - sn * h / 2, y + sn * tapeOffset + cs * h / 2, z + .0003], angle + .14);
    pinState[i].aspect = aspect;
    return aspect;
  }
  // a generated study at the pin's shape, `long` px on its long side
  function study(i, long) {
    const a = clamp(pinAspect(i), 0.4, 2.5);
    const w = a >= 1 ? long : Math.round(long * a);
    return drawStudy(i % PH_KINDS.length, w, Math.round(w / a));
  }
  function studyURL(i) {
    const a = clamp(pinAspect(i), 0.4, 2.5);
    if (!phURL[i] || Math.abs(phAspect[i] - a) > 0.02) {
      try { phURL[i] = study(i, STUDY_BIG).toDataURL('image/jpeg', 0.88); } catch { phURL[i] = ''; }
      phAspect[i] = a;
    }
    return phURL[i];
  }
  async function applyPin(i, mesh, a) {
    let tex = null, imgAspect = a;
    const src = pinSrc(i);
    if (src) {
      try {
        // the owner's photo, downscaled to PIN_TEX before it reaches the GPU (a 4032 px photo is ~62 MB with mips)
        const im = await loadImage(src);
        const fit = fitCanvas(im, PIN_TEX);
        if (fit) {
          tex = new THREE.Texture(fit);
          imgAspect = (im.naturalWidth || fit.width) / (im.naturalHeight || fit.height);
        }
      } catch { tex = null; }
    }
    if (!tex) {
      const cv = study(i, PIN_TEX);
      tex = new THREE.CanvasTexture(cv);
      imgAspect = cv.width / cv.height;
    }
    pinState[i].imageAspect = imgAspect;
    if (src && fullPin(i)) a = placeWallPin(i, mesh, imgAspect);
    if (refs.tiles) renderLightbox();
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    try {
      mesh.material = ctx.mixer.pictureMaterial(tex, {
        extraUniforms: { uImgAspect: { value: imgAspect }, uFrameAspect: { value: a }, uContain: { value: fullPin(i) ? 1 : 0 } },
        extraFrag: COVER_FRAG,
      });
    } catch {
      try { mesh.material = new THREE.MeshBasicMaterial({ map: tex }); } catch { /* leave the glTF material */ }
    }
  }
  const idle = (f, timeout) => {
    try { if (window.requestIdleCallback) return window.requestIdleCallback(f, { timeout }); } catch { /* fall back */ }
    return setTimeout(f, 60);
  };
  // pins are textured one at a time, each in its own idle slot, so boot never fetches six photos at once
  const pinQueue = [];
  let pinBusy = false;
  function pumpPins() {
    if (pinBusy || !pinQueue.length) return;
    pinBusy = true;
    const [i, mesh, a] = pinQueue.shift();
    const next = () => { pinBusy = false; pumpPins(); };
    idle(() => {
      try { applyPin(i, mesh, a).catch(() => {}).finally(next); } catch { next(); }
    }, 1500);
  }
  let pinTries = 0, pinNext = 0, pinsDone = false;
  function setupPins() {
    pinTries++;
    let missing = 0;
    for (let i = 0; i < PINS; i++) {
      if (pinState[i]?.applied) continue;
      let mesh = null;
      try { mesh = ctx?.root?.getObjectByName?.(`pin_${i}`) || null; } catch { mesh = null; }
      if (!mesh || !mesh.isMesh) { missing++; continue; }
      const a = quadAspect(mesh);
      pinState[i] = { aspect: a, applied: true };
      pinQueue.push([i, mesh, a]);
    }
    pumpPins();
    pinsDone = missing === 0;
    if (refs.tiles) renderLightbox();
  }
  idle(() => { try { setupPins(); } catch { /* retried in update */ } }, 1500);

  // ---------------------------------------------------------------- mood board lightbox
  const caption = (i) => pick(pinItem(i).caption) || t('details.mb.ref', { n: i + 1 });
  const imgFor = (img, i) => {
    const src = pinSrc(i);
    img.onerror = null;
    if (src) {
      img.onerror = () => { img.onerror = null; img.src = studyURL(i); };
      if (img.getAttribute('src') !== src) img.src = src;
    } else {
      const u = studyURL(i);
      if (u && img.getAttribute('src') !== u) img.src = u;
    }
  };
  function buildLightbox() {
    if (lb) return;
    addSymbols();
    lb = el('div', 'dtl-lb' + (still ? ' dtl-still' : ''), document.body);
    lb.hidden = true;
    lb.dataset.open = 'false';
    const scrim = el('div', 'dtl-scrim', lb);
    scrim.addEventListener('click', () => closeLightbox());
    lbCard = el('section', 'dtl-card surface', lb);
    lbCard.setAttribute('role', 'dialog');
    lbCard.setAttribute('aria-modal', 'true');
    lbCard.setAttribute('aria-labelledby', 'dtl-lb-h');
    lbCard.tabIndex = -1;              // a click between the prints keeps focus in the dialog
    refs.x = el('button', 'round dtl-x', lbCard);
    refs.x.type = 'button';
    refs.x.appendChild(icon('i-close'));
    refs.x.addEventListener('click', () => closeLightbox());
    const head = el('header', 'dtl-head', lbCard);
    refs.h = el('h3', 'dtl-h', head);
    refs.h.id = 'dtl-lb-h';
    refs.h.tabIndex = -1;              // focused on a pointer open (see byKeyboard)

    refs.grid = el('div', 'dtl-grid', lbCard);
    refs.tiles = [];
    for (let i = 0; i < PINS; i++) {
      const b = el('button', 'dtl-tile', refs.grid);
      b.type = 'button';
      const placement = PIN_LAYOUT[i];
      b.style.setProperty('--pin-x', `${placement.x * 100}%`);
      b.style.setProperty('--pin-y', `${placement.y * 100}%`);
      b.style.setProperty('--pin-w', `${placement.w * 100}%`);
      b.style.setProperty('--layer', placement.layer);
      b.style.setProperty('--tilt', `${placement.tilt}deg`);
      const inner = el('span', 'dtl-inner', b);
      const stage = el('span', 'dtl-stage', inner);
      const print = el('span', 'dtl-print', stage);
      const thumb = el('span', 'dtl-thumb', print);
      const img = el('img', '', thumb);
      img.alt = '';
      img.decoding = 'async';
      b.addEventListener('click', () => zoom(i));
      refs.tiles.push({ b, thumb, img });
    }

    refs.zoom = el('div', 'dtl-zoom', lbCard);
    refs.zoom.hidden = true;
    refs.fig = el('figure', 'dtl-fig', refs.zoom);
    refs.fig.setAttribute('aria-live', 'polite');
    refs.big = el('img', 'dtl-big', refs.fig);
    refs.big.decoding = 'async';
    const foot = el('div', 'dtl-foot', refs.zoom);
    const nav = el('div', 'dtl-nav', foot);
    refs.all = el('button', 'dtl-all', nav);
    refs.all.type = 'button';
    refs.all.appendChild(icon('i-dtl-grid'));
    refs.allText = el('span', '', refs.all);
    refs.all.addEventListener('click', () => showGrid(true));
    const steps = el('span', 'dtl-steps', nav);
    refs.prev = el('button', 'round', steps);
    refs.prev.type = 'button';
    refs.prev.appendChild(icon('i-left'));
    refs.prev.addEventListener('click', () => step(-1));
    refs.next = el('button', 'round', steps);
    refs.next.type = 'button';
    refs.next.appendChild(icon('i-right'));
    refs.next.addEventListener('click', () => step(1));

    // swipe between pins on touch screens
    let sx = null, sy = 0;
    refs.fig.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    refs.fig.addEventListener('pointerup', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
    });
    refs.fig.addEventListener('pointercancel', () => { sx = null; });
  }
  function renderLightbox() {
    if (!lb) return;
    lbCard.lang = lang();
    refs.x.setAttribute('aria-label', t('details.mb.close'));
    refs.h.textContent = t('details.mb.title');
    refs.allText.textContent = t('details.mb.all');
    refs.all.setAttribute('aria-label', t('details.mb.allLabel'));
    refs.prev.setAttribute('aria-label', t('details.mb.prev'));
    refs.next.setAttribute('aria-label', t('details.mb.next'));
    // Each full-frame print keeps its image's aspect in the loose collage.
    refs.grid.dataset.layout = Array.from({ length: PINS }, (_, i) => fullPin(i)).some(Boolean) ? 'collage' : 'grid';
    const ars = Array.from({ length: PINS }, (_, i) => pinAspect(i)).sort((a, b) => a - b);
    const stageAr = clamp((ars[2] + ars[3]) / 2, 0.7, 1.45);
    refs.grid.style.setProperty('--ar', stageAr.toFixed(3));
    refs.tiles.forEach((tile, i) => {
      const own = clamp(printAspect(i), 0.25, 4);
      tile.b.style.setProperty('--own', own.toFixed(3));
      tile.b.dataset.fit = fullPin(i) ? 'contain' : 'cover';
      tile.b.style.setProperty('--fit', Math.min(1, own / stageAr).toFixed(4));
      const cap = caption(i);
      tile.img.alt = cap;
      tile.b.setAttribute('aria-label', t('details.mb.open', { caption: cap }));
      imgFor(tile.img, i);
    });
    if (zoomIdx >= 0) renderZoom(zoomIdx);
  }
  function renderZoom(i) {
    const cap = caption(i);
    refs.big.alt = cap;
    imgFor(refs.big, i);
  }
  let swapT = 0;
  function zoom(i, focusNav = true) {
    zoomIdx = ((i % PINS) + PINS) % PINS;
    refs.grid.hidden = true;
    refs.zoom.hidden = false;
    clearTimeout(swapT);
    refs.fig.classList.remove('swap');
    renderZoom(zoomIdx);
    if (focusNav) (refs.next || refs.all)?.focus({ preventScroll: true });
  }
  function step(d) {
    if (zoomIdx < 0) return;
    const target = ((zoomIdx + d) % PINS + PINS) % PINS;
    if (still) { zoom(target, false); return; }
    refs.fig.classList.add('swap');
    clearTimeout(swapT);
    swapT = setTimeout(() => { zoom(target, false); }, 140);
    zoomIdx = target;
  }
  function showGrid(focusTile) {
    const back = zoomIdx;
    zoomIdx = -1;
    clearTimeout(swapT);
    refs.fig?.classList.remove('swap');
    if (refs.zoom) refs.zoom.hidden = true;
    if (refs.grid) refs.grid.hidden = false;
    if (focusTile) refs.tiles?.[Math.max(0, back)]?.b.focus({ preventScroll: true });
  }
  function openLightbox(index = -1) {
    try {
      buildLightbox();
      if (!pinsDone && pinTries < 6) setupPins();
      renderLightbox();
      if (!lbOpen) lbFocus = document.activeElement;
      lbOpen = true;
      clearTimeout(lbHideT);
      ctx?.ui?.closePanel?.();
      show(lb);
      const kb = byKeyboard();
      if (index >= 0) zoom(index, kb);
      else showGrid(false);
      if (!kb) focusEl(refs.h);
      else if (index < 0) focusEl(refs.tiles[0]?.b);
    } catch { /* never throw from an action */ }
  }
  function closeLightbox() {
    if (!lbOpen || !lb) return false;
    lbOpen = false;
    lbHideT = hide(lb, () => { if (!lbOpen) showGrid(false); });
    restore(lbFocus);
    return true;
  }

  // ---------------------------------------------------------------- keys
  const keys = {
    Escape: (e) => {
      let done = false;
      if (noteOpen) done = closeNote();
      else if (lbOpen && zoomIdx >= 0) { showGrid(true); done = true; }
      else if (lbOpen) done = closeLightbox();
      if (done) e?.preventDefault?.();
      return done;
    },
    ArrowLeft: (e) => {
      if (!noteOpen && !lbOpen) return false;
      if (!noteOpen && zoomIdx >= 0) step(-1);
      e?.preventDefault?.();
      return true;                       // swallowed (the note too) so the work behind the modal does not change
    },
    ArrowRight: (e) => {
      if (!noteOpen && !lbOpen) return false;
      if (!noteOpen && zoomIdx >= 0) step(1);
      e?.preventDefault?.();
      return true;
    },
  };
  try {
    window.addEventListener('keydown', (e) => {
      if ((!noteOpen && !lbOpen) || e.defaultPrevented) return;
      if (e.key === 'Tab') { trapTab(e); return; }
      const h = keys[e.key];
      if (h && h(e)) { e.stopImmediatePropagation(); return; }
      // both overlays are modal: the room's shortcuts (time, weather, season, lights, sound) and the
      // terminal toggle wait until they close. Registered before main's listener, so this also stops ui.js.
      if (!e.metaKey && !e.ctrlKey && !e.altKey && ROOM_KEYS.test(e.key)) e.stopImmediatePropagation();
    }, true);
  } catch { /* no window */ }

  try {
    ctx?.on?.('lang', () => { try { renderLightbox(); renderNote(); } catch { /* keep going */ } });
  } catch { /* no event bus */ }

  // ---------------------------------------------------------------- actions
  const actions = {
    clock: () => {
      try {
        const st = studioNow();
        const time = hm(st);
        const status = t(`details.st.${phase(st.h)}.${clockClicks++ % 2}`);
        const cty = clockCity();
        tickTock();
        toast(cty ? t('details.clock.toast', { time, city: cty, status }) : t('details.clock.toastNoCity', { time, status }), 3800);
      } catch { /* quiet */ }
    },

    cat: () => {
      try {
        const now = Date.now();
        if (now - catLast > 20000) catN = 0;
        catLast = now;
        catN++;
        const life = (parseInt(store.get('details.catPets'), 10) || 0) + 1;
        store.set('details.catPets', life);
        const cat = catName();
        let msg = '', ms = 2600;
        if (catN >= 8) quietPurr();
        else if (catN === 7) { quietPurr(); msg = t('details.cat.asleep', { cat }); ms = 3400; }
        else if (catN === 5) { mrrp(); purr(); msg = t('details.cat.stretch', { cat }); ms = 3200; }
        else { purr(); msg = t(`details.cat.warm.${catLine++ % 6}`, { cat }); }
        if (life === 10 || life === 50 || life === 100) { msg = t(`details.cat.ach.${life}`, { cat }); ms = 4600; }
        toast(msg, ms);
      } catch { /* quiet */ }
    },

    mug: () => {
      try {
        const st = studioNow();
        const n = mugRec.d === st.date ? mugRec.n + 1 : 1;
        mugRec = { d: st.date, n };
        store.set('details.mug', JSON.stringify(mugRec));
        clink();
        const key = n <= 8 ? `details.mug.${n}` : n < 12 ? 'details.mug.many' : 'details.mug.lots';
        toast(t(key, { n, cat: catName() }), 3000);
      } catch { /* quiet */ }
    },

    plant: () => {
      try {
        const now = Date.now();
        plantTaps = plantTaps.filter((x) => now - x < 4000);
        plantTaps.push(now);
        if (plantTaps.length >= 3) { plantTaps = []; openNote(); return; }
        rustle(plantTaps.length);
        toast(t(plantTaps.length === 1 ? 'details.plant.rustle' : 'details.plant.crinkle'), 1800);
      } catch { /* quiet */ }
    },

    moodboard: () => openLightbox(-1),
  };

  // ---------------------------------------------------------------- tips (called often while hovering: keep cheap)
  const tips = {
    clock: () => {
      try {
        const time = hm(studioNow());
        const cty = clockCity();
        return cty ? t('details.tip.clock', { time, city: cty }) : t('details.tip.clockNoCity', { time });
      } catch { return ''; }
    },
    cat: () => t(catAsleep() ? 'details.tip.catAsleep' : 'details.tip.cat', { cat: catName() }),
    mug: () => { const n = mugToday(); return n > 0 ? t('details.tip.mugN', { n }) : t('details.tip.mug'); },
    plant: () => t('details.tip.plant'),
    moodboard: () => t('details.tip.moodboard'),
  };

  // ---------------------------------------------------------------- per frame
  function update(dt, frame) {
    try {
      const now = Date.now();
      if (!hands || ((!hands.h || !hands.m || !hands.s) && now - handsAt > 2000)) findHands(now);
      const st = studioNow();
      const TAU = Math.PI * 2;
      if (hands.s) {
        let pos = st.s;
        if (!still && st.ms < TICK_MS) pos = st.s - 1 + backOut(st.ms / TICK_MS);
        hands.s.rotation.z = -(pos / 60) * TAU;
      }
      const minutes = st.m + (st.s + st.ms / 1000) / 60;
      if (hands.m) hands.m.rotation.z = -(minutes / 60) * TAU;
      if (hands.h) hands.h.rotation.z = -(((st.h % 12) + minutes / 60) / 12) * TAU;

      // a soft chime at the top of the studio hour (sound on, visitor inside, tab visible)
      if (lastHour === null) lastHour = st.h;
      else if (st.h !== lastHour) {
        lastHour = st.h;
        if (st.m === 0 && frame?.entered && document.visibilityState === 'visible') chime();
      }

      if (!pinsDone && pinTries < 6 && now > pinNext) { pinNext = now + 3000; setupPins(); }
    } catch { /* never throw from update */ }
  }

  return {
    actions,
    tips,
    keys,
    update,
    api: {
      studioTime() {
        try { const st = studioNow(); return { h: st.h, m: st.m, s: st.s, label: hm(st) }; } catch { return { h: 0, m: 0, s: 0, label: '00:00' }; }
      },
      openMoodboard(i = -1) { openLightbox(Number.isInteger(i) ? i : -1); },
      openNote() { openNote(); },
      catPets() { return parseInt(store.get('details.catPets'), 10) || 0; },
    },
  };
}
