// Content loading, language strings and generated placeholder artwork.

const UI = {
  en: {
    'nav.work': 'Work', 'nav.about': 'About', 'nav.contact': 'Contact', 'nav.list': 'List', 'nav.text': 'Text version',
    'ui.textEntry': 'Read the text version',
    'time.dawn': 'Dawn', 'time.day': 'Day', 'time.dusk': 'Dusk', 'time.night': 'Late night',
    'season.spring': 'Spring', 'season.summer': 'Summer', 'season.autumn': 'Autumn', 'season.winter': 'Winter',
    'dial.season': 'Season', 'dial.weather': 'Weather', 'dial.time': 'Time', 'dial.lights': 'Lights',
    'lights.auto': 'Auto', 'lights.warm': 'Warm', 'lights.cool': 'Cool', 'lights.off': 'Off',
    'ui.surprise': 'Surprise me', 'toast.random': 'Out the window: {mood}',
    'wx.clear': 'Clear', 'wx.cloudy': 'Cloudy', 'wx.rain': 'Rain', 'wx.storm': 'Storm', 'wx.snow': 'Snow',
    'wx.fog': 'Fog', 'wx.live': 'Live',
    'ui.sound': 'Sound', 'ui.open': 'Open', 'ui.back': 'Room',
    'peek.shelf': 'Bookshelf', 'peek.desk': 'Desk',
    'atmo.time': 'Time', 'atmo.weather': 'Weather', 'wx.liveLong': 'Live weather',
    'coach': 'Click the canvas to see the work', 'card.enter': 'Click to enter',
    'card.hint': 'Drag to look around · arrow keys browse the work',
    'ui.hint': 'Click around the room · drag to look · ← → to browse work',
    'ui.enterSound': 'Enter with sound', 'ui.enterQuiet': 'Enter quietly',
    'ui.loading': 'Loading the studio…', 'ui.ready': 'Ready.',
    'ui.nowebgl': 'Your browser could not start the 3D room. Here is the list instead.',
    'panel.about': 'About', 'panel.contact': 'Contact', 'panel.list': 'All work',
    'tip.projector': 'Projector · next work', 'tip.screen': 'The work',
    'tip.monitors': 'Desk · about me', 'tip.desklamp': 'Desk lamp', 'tip.floorlamp': 'Lamps · warm, cool, off',
    'tip.window': 'Window · a different sky', 'tip.skylight': 'Skylight · change the time',
    'tip.cat': 'The cat', 'tip.record': 'Record player', 'tip.mug': 'Coffee', 'tip.pc': 'Render box',
    'tip.fairy': 'String lights', 'tip.art': 'A print',
    'toast.cat': '{cat} is purring.', 'toast.mug': 'Still warm.', 'toast.pc': 'GPU at 71°C. Rendering frame 1,204.',
    'toast.live': 'Live weather in {place}: {wx}', 'toast.liveFail': 'Could not reach the weather service; showing clear skies.',
    'toast.music': 'Now playing: the studio tape.', 'toast.musicOff': 'Record stopped.',
    'step': 'step {n}/{total}', 'done': 'Now showing',
  },
  zh: {
    'nav.work': '作品', 'nav.about': '关于', 'nav.contact': '联系', 'nav.list': '列表', 'nav.text': '文字版',
    'ui.textEntry': '阅读文字版',
    'time.dawn': '黎明', 'time.day': '白天', 'time.dusk': '黄昏', 'time.night': '深夜',
    'season.spring': '春', 'season.summer': '夏', 'season.autumn': '秋', 'season.winter': '冬',
    'dial.season': '季节', 'dial.weather': '天气', 'dial.time': '时间', 'dial.lights': '灯光',
    'lights.auto': '自动', 'lights.warm': '暖光', 'lights.cool': '冷光', 'lights.off': '关灯',
    'ui.surprise': '随机', 'toast.random': '窗外：{mood}',
    'wx.clear': '晴', 'wx.cloudy': '多云', 'wx.rain': '雨', 'wx.storm': '雷雨', 'wx.snow': '雪',
    'wx.fog': '雾', 'wx.live': '实况',
    'ui.sound': '声音', 'ui.open': '打开', 'ui.back': '房间',
    'peek.shelf': '书架', 'peek.desk': '书桌',
    'atmo.time': '时间', 'atmo.weather': '天气', 'wx.liveLong': '实况天气',
    'coach': '点击画布看作品', 'card.enter': '点击进入',
    'card.hint': '拖动环顾 · 方向键切换作品',
    'ui.hint': '点击房间里的东西 · 拖动环顾 · ← → 切换作品',
    'ui.enterSound': '有声进入', 'ui.enterQuiet': '静音进入',
    'ui.loading': '正在布置工作室…', 'ui.ready': '准备好了。',
    'ui.nowebgl': '浏览器无法启动 3D 房间，下面是作品列表。',
    'panel.about': '关于', 'panel.contact': '联系', 'panel.list': '全部作品',
    'tip.projector': '投影机 · 下一件', 'tip.screen': '作品',
    'tip.monitors': '书桌 · 关于我', 'tip.desklamp': '台灯', 'tip.floorlamp': '灯 · 暖光、冷光、关',
    'tip.window': '窗户 · 换一片天', 'tip.skylight': '天窗 · 换时间',
    'tip.cat': '猫', 'tip.record': '唱机', 'tip.mug': '咖啡', 'tip.pc': '渲染主机',
    'tip.fairy': '串灯', 'tip.art': '一幅画',
    'toast.cat': '{cat}在打呼噜。', 'toast.mug': '还是热的。', 'toast.pc': 'GPU 71°C，正在渲染第 1,204 帧。',
    'toast.live': '{place}实况天气：{wx}', 'toast.liveFail': '天气服务连不上，先显示晴天。',
    'toast.music': '正在播放：工作室磁带。', 'toast.musicOff': '唱机停了。',
    'step': '第 {n}/{total} 步', 'done': '正在放映',
  },
};

export const i18n = {
  lang: 'en',
  t(key, vars = {}) {
    const s = (UI[this.lang] && UI[this.lang][key]) || UI.en[key] || key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : ''));
  },
  // Content fields may be a plain string or {en, zh}.
  pick(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[this.lang] || v.en || Object.values(v)[0] || '';
  },
  // modules register their own strings: extend({ en: {...}, zh: {...} })
  extend(dict) {
    for (const [lang, strings] of Object.entries(dict || {})) UI[lang] = { ...(UI[lang] || {}), ...strings };
  },
  apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = this.t(el.dataset.i18n); });
    document.documentElement.lang = this.lang === 'zh' ? 'zh-CN' : 'en';
  },
};

export async function loadContent() {
  const res = await fetch('content.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('content.json missing');
  const c = await res.json();
  c.works = (c.works || []).map((w, i) => ({ ...w, index: i, seed: 1000 + ((i * 7919) % 9000) }));
  c.art = c.art || [];
  return c;
}

// --- placeholder artwork: generated so the room looks finished before real work is added
const PALETTES = [
  ['#1d2b53', '#7e2553', '#ff004d', '#ffa300', '#fff1e8'],
  ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#e8f1f2'],
  ['#2d1e2f', '#5c3c55', '#c06c84', '#f67280', '#f8b195'],
  ['#132a13', '#31572c', '#4f772d', '#90a955', '#ecf39e'],
  ['#231942', '#5e548e', '#9f86c0', '#be95c4', '#e0b1cb'],
  ['#3d2c2e', '#8c5e58', '#d4a373', '#e9c46a', '#faedcd'],
];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function placeholderCanvas(seed, label = '', w = 1024, h = 640) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const r = rng(seed);
  const pal = PALETTES[seed % PALETTES.length];
  const grad = g.createLinearGradient(0, 0, w * r(), h);
  grad.addColorStop(0, pal[0]); grad.addColorStop(1, pal[1]);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  // soft orbs
  for (let i = 0; i < 7; i++) {
    const x = r() * w, y = r() * h, rad = (0.15 + r() * 0.45) * h;
    const rg = g.createRadialGradient(x, y, 0, x, y, rad);
    const c = pal[2 + Math.floor(r() * 3)];
    rg.addColorStop(0, c + 'cc'); rg.addColorStop(1, c + '00');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
  // a horizon line and a figure-ish silhouette
  g.fillStyle = pal[0] + 'dd';
  const hy = h * (0.62 + r() * 0.15);
  g.beginPath(); g.moveTo(0, hy);
  for (let x = 0; x <= w; x += w / 24) g.lineTo(x, hy - Math.sin(x * 0.01 + seed) * 12 - r() * 18);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();
  const fx = w * (0.3 + r() * 0.4);
  g.beginPath(); g.ellipse(fx, hy - 70, 16, 18, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(fx - 22, hy); g.quadraticCurveTo(fx, hy - 120, fx + 22, hy); g.fill();
  // grain
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 22;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  if (label) {
    g.font = `600 ${Math.round(h * 0.05)}px ui-sans-serif, -apple-system, sans-serif`;
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(label, w * 0.05, h * 0.9);
    g.font = `${Math.round(h * 0.028)}px ui-monospace, Menlo, monospace`;
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.fillText('placeholder · replace in content.json', w * 0.05, h * 0.95);
  }
  return cv;
}

// ---------------------------------------------------------------- shared helpers for the easter eggs
// content.studio.timezone when it is a real IANA zone, else '' (callers then use the visitor's local time
// and name no city). Warns once per bad value.
const warnedZones = new Set();
export function studioZone(c) {
  const raw = c?.studio?.timezone;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    try { new Intl.DateTimeFormat('en', { timeZone: raw }); return raw; } catch { /* not a zone */ }
  }
  const key = JSON.stringify(raw);
  if (!warnedZones.has(key)) {
    warnedZones.add(key);
    console.warn(`[studio] content.json studio.timezone ${key} is not an IANA time zone (e.g. "Asia/Shanghai"); clocks show the visitor's local time`);
  }
  return '';
}

// a decoded image no larger than `max` px on its long side, for use as a texture source. Halves in steps first
// so a 4000 px photo does not alias on the way down. Returns the image itself when it is already small enough.
export function fitCanvas(img, max = 512) {
  const w0 = img?.naturalWidth || img?.videoWidth || img?.width || 0, h0 = img?.naturalHeight || img?.videoHeight || img?.height || 0;
  if (!w0 || !h0) return null;
  const k = Math.min(1, max / Math.max(w0, h0));
  if (k === 1) return img;
  const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
  const draw = (src, dw, dh) => {
    const cv = document.createElement('canvas');
    cv.width = dw; cv.height = dh;
    const g = cv.getContext('2d');
    if (!g) return null;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, dw, dh);
    return cv;
  };
  let src = img, sw = w0, sh = h0;
  while (sw > w * 2 && sh > h * 2) {
    const next = draw(src, Math.round(sw / 2), Math.round(sh / 2));
    if (!next) return null;
    src = next; sw = next.width; sh = next.height;
  }
  return draw(src, w, h);
}
