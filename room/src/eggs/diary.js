// Diary: the notebook on the desk opens into the owner's diary.
//
// Integration notes
// - Data: `site/diary.json` = { entries: [...] } (schema in CONTRACT.md). A missing or broken file gives an
//   empty notebook, quietly for visitors. Entries are shown newest first; page 0 is the inside cover with a
//   contents list. In write mode a file that exists but cannot be read (bad JSON, wrong shape, HTTP error,
//   network) shows a warning in the header, and Export / Copy JSON ask for a second click, since the export
//   would hold the drafts only.
// - Write mode: `?write` in the URL, or any localhost address. Drafts live in this browser only
//   (ctx.store 'diary.drafts'; unsaved pages are kept per page in 'diary.scratches' = { new | d:<id> | p:<key> },
//   pages left out of the next export in 'diary.removed'). "Export diary.json" downloads the merged published +
//   draft file; replacing site/diary.json with it publishes. Drafts that match a published entry are tidied
//   away automatically. Published pages are keyed by [date, title], plus an occurrence number from the second
//   page with the same date and title on.
// - Keys: the module answers Escape / ArrowLeft / ArrowRight through `keys` while open. The arrows return false
//   inside text fields and during IME composition (so the caret moves), Escape returns false while composing.
//   Key events that start inside the notebook are also handled by its own listener and stopped there, and a
//   capture-phase window listener swallows the room's one-letter shortcuts (t / w / s / l / m) and ` / ~ while
//   the notebook is open, so nothing behind it changes. Each event is handled once.
// - One overlay at a time: open() emits ctx.emit('overlay', 'diary'); another module's 'overlay' closes it.
// - While open, <body> carries the class `diary-open`. Notes are shown inside the notebook, not with ctx.ui.toast
//   (which now sits above overlays at z 27, pointer-events none): the in-book note is a role="status" region inside
//   the aria-modal dialog, so screen readers announce it, and it sits just above the footer controls that caused
//   it, where the site toast would land on the header's title and writing tools. While closed, notes use the toast.
// - "Today" (new pages, on-this-day greeting) uses the studio's time zone via studioZone() from content.js
//   (the visitor's local date when content.studio.timezone is missing or invalid).
// - The stamp on a page is a button: it sets the room to that page's season / weather / time via ctx.H.
// - api (ctx.eggs.diary): open(), openEntry(i) (0 = newest), close(), isOpen(), entries(), ready (Promise).

import { studioZone } from '../content.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const WEATHERS = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
const TIMES = ['dawn', 'day', 'dusk', 'night'];
const WX_ICON = { clear: 'i-clear', cloudy: 'i-cloud', rain: 'i-rain', storm: 'i-storm', snow: 'i-snow', fog: 'i-fog' };
const STAMP_INK = { spring: '#43623a', summer: '#285670', autumn: '#94401f', winter: '#3a4d6c' };
const TURN_MS = 550;
const FADE_MS = 200;
const PHONE_MQ = '(max-width: 720px)';
const DATE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const CJK_G = /[\u3400-\u9fff\uf900-\ufaff]/g;
const DEFAULT_EASE = 'cubic-bezier(.2, .7, .2, 1)';
const GUARDED_KEYS = new Set(['t', 'w', 's', 'l', 'm', '`', '~']);   // ui.js room shortcuts + the terminal toggle

const STRINGS = {
  en: {
    'diary.tip': 'Notebook · diary',
    'diary.kicker': 'Notebook', 'diary.title': 'Diary', 'diary.writeMode': 'Writing mode',
    'diary.close': 'Close the notebook', 'diary.prev': 'Previous page', 'diary.next': 'Next page',
    'diary.ribbon': 'Back to the latest page', 'diary.book': 'Open notebook',
    'diary.count.two': 'Pages {a}–{b} of {n}', 'diary.count.one': 'Page {a} of {n}',
    'diary.count.cover': 'Inside cover', 'diary.count.end': 'Blank pages', 'diary.count.empty': 'No pages yet',
    'diary.cover.kicker': 'This notebook belongs to', 'diary.cover.since': 'Begun {date}',
    'diary.cover.count': '{n} pages written', 'diary.cover.count1': 'One page written',
    'diary.cover.contents': 'Contents', 'diary.cover.empty': 'Nothing written here yet.',
    'diary.cover.return': 'If found, please return it to the attic.',
    'diary.end': 'The rest of the pages are still blank.',
    'diary.untitled': 'Untitled', 'diary.draft': 'Draft', 'diary.mood': 'Mood',
    'diary.stampHint': 'Bring this weather back to the room',
    'diary.relive': 'The room remembers: {label}',
    'diary.onThisDay1': 'One year ago today.', 'diary.onThisDay': '{n} years ago today.',
    'diary.new': 'New page', 'diary.export': 'Export diary.json', 'diary.copy': 'Copy JSON',
    'diary.nextPage': 'Write the next page',
    'diary.hint': 'Drafts stay in this browser. To publish, export and replace site/diary.json with the downloaded file.',
    'diary.exported': 'Exported. Replace site/diary.json with this file to publish.',
    'diary.copied': 'Diary JSON copied.', 'diary.copyFail': 'Could not copy. Use Export instead.',
    'diary.loadWarn': 'site/diary.json could not be read, so its published pages are missing here and an export would leave them out. Fix the file, then reload.',
    'diary.loadArm': 'site/diary.json was not read: this export holds drafts only. Click again to go ahead anyway.',
    'diary.err.shape': 'no "entries" list', 'diary.err.network': 'network error', 'diary.err.bad': 'not valid JSON',
    'diary.edit': 'Edit', 'diary.leaveOut': 'Leave out of export', 'diary.keepIn': 'Keep in export',
    'diary.leftOutNote': 'Left out of the next export.',
    'diary.leftOut': 'This page will be left out of the next export.', 'diary.keptIn': 'This page stays in the export.',
    'diary.ed.new': 'A fresh page', 'diary.ed.edit': 'Editing a draft', 'diary.ed.editPub': 'Editing a published page',
    'diary.ed.editPubNote': 'Saving keeps a draft that replaces this page in the next export.',
    'diary.ed.date': 'Date', 'diary.ed.atmo': 'The room that day', 'diary.ed.season': 'Season',
    'diary.ed.weather': 'Weather', 'diary.ed.time': 'Time of day', 'diary.ed.mood': 'Mood',
    'diary.ed.moodPh': 'quiet, restless, hopeful…', 'diary.ed.version': 'Version',
    'diary.ed.title': 'Title', 'diary.ed.titlePh': 'A title for the page', 'diary.ed.body': 'Diary text',
    'diary.ed.bodyPh': 'Write here. Leave a blank line between paragraphs.',
    'diary.ed.bothHint': 'Fill in both versions if you can: visitors read the one in their language, and the other one when it is missing.',
    'diary.ed.words': '{n} words', 'diary.ed.save': 'Save draft', 'diary.ed.back': 'Back to the notebook',
    'diary.ed.delete': 'Delete draft', 'diary.ed.discard': 'Discard this page', 'diary.ed.confirm': 'Click again to confirm',
    'diary.ed.saved': 'Draft saved in this browser.', 'diary.ed.deleted': 'Draft deleted.',
    'diary.ed.discarded': 'Page discarded.', 'diary.ed.kept': 'Your unsaved page is kept for later.',
    'diary.ed.restored': 'Picked up the page you were writing.', 'diary.ed.needText': 'Write a title or a few words first.',
    'diary.ed.empty': 'empty', 'diary.ed.filled': 'written',
  },
  zh: {
    'diary.tip': '笔记本 · 日记',
    'diary.kicker': '笔记本', 'diary.title': '日记', 'diary.writeMode': '书写模式',
    'diary.close': '合上笔记本', 'diary.prev': '上一页', 'diary.next': '下一页',
    'diary.ribbon': '回到最新一页', 'diary.book': '翻开的笔记本',
    'diary.count.two': '第 {a}–{b} 页 / 共 {n} 页', 'diary.count.one': '第 {a} 页 / 共 {n} 页',
    'diary.count.cover': '扉页', 'diary.count.end': '空白页', 'diary.count.empty': '还没有内容',
    'diary.cover.kicker': '这本笔记本属于', 'diary.cover.since': '始于{date}',
    'diary.cover.count': '已写 {n} 页', 'diary.cover.count1': '已写 1 页',
    'diary.cover.contents': '目录', 'diary.cover.empty': '这里还什么都没写。',
    'diary.cover.return': '如有拾到，请送回阁楼。',
    'diary.end': '后面的纸页还空着。',
    'diary.untitled': '无题', 'diary.draft': '草稿', 'diary.mood': '心情',
    'diary.stampHint': '让房间回到这一页的天气',
    'diary.relive': '房间记起了那天：{label}',
    'diary.onThisDay1': '一年前的今天。', 'diary.onThisDay': '{n} 年前的今天。',
    'diary.new': '新的一页', 'diary.export': '导出 diary.json', 'diary.copy': '复制 JSON',
    'diary.nextPage': '写下一页',
    'diary.hint': '草稿只存在这个浏览器里。要发布：导出，再用下载的文件替换 site/diary.json。',
    'diary.exported': '已导出。用这个文件替换 site/diary.json 即可发布。',
    'diary.copied': '日记 JSON 已复制。', 'diary.copyFail': '没能复制，请改用导出。',
    'diary.loadWarn': '没能读取 site/diary.json，这里看不到已发布的页面，现在导出也会把它们漏掉。请先修好文件再刷新。',
    'diary.loadArm': '没有读到 site/diary.json：这次导出只有草稿。仍要导出，请再点一次。',
    'diary.err.shape': '缺少 "entries" 列表', 'diary.err.network': '网络错误', 'diary.err.bad': '不是有效的 JSON',
    'diary.edit': '修改', 'diary.leaveOut': '导出时略过', 'diary.keepIn': '导出时保留',
    'diary.leftOutNote': '下次导出时会略过这一页。',
    'diary.leftOut': '下次导出时会略过这一页。', 'diary.keptIn': '这一页会保留在导出文件里。',
    'diary.ed.new': '新的一页', 'diary.ed.edit': '修改草稿', 'diary.ed.editPub': '修改已发布的一页',
    'diary.ed.editPubNote': '保存后会生成一份草稿，下次导出时替换原来的这一页。',
    'diary.ed.date': '日期', 'diary.ed.atmo': '那天的房间', 'diary.ed.season': '季节',
    'diary.ed.weather': '天气', 'diary.ed.time': '时间', 'diary.ed.mood': '心情',
    'diary.ed.moodPh': '安静、烦躁、期待……', 'diary.ed.version': '版本',
    'diary.ed.title': '标题', 'diary.ed.titlePh': '这一页的标题', 'diary.ed.body': '日记正文',
    'diary.ed.bodyPh': '写在这里。段落之间空一行。',
    'diary.ed.bothHint': '尽量两个版本都写：访客会看到与其语言一致的版本，缺了就显示另一个。',
    'diary.ed.words': '{n} 字', 'diary.ed.save': '保存草稿', 'diary.ed.back': '回到笔记本',
    'diary.ed.delete': '删除草稿', 'diary.ed.discard': '丢弃这一页', 'diary.ed.confirm': '再点一次确认',
    'diary.ed.saved': '草稿已保存在这个浏览器里。', 'diary.ed.deleted': '草稿已删除。',
    'diary.ed.discarded': '这一页已丢弃。', 'diary.ed.kept': '没保存的这一页先替你留着。',
    'diary.ed.restored': '接着写你刚才那一页。', 'diary.ed.needText': '先写个标题或几句话。',
    'diary.ed.empty': '空', 'diary.ed.filled': '已写',
  },
};

// ---------- small pure helpers ----------
const pad2 = (n) => String(n).padStart(2, '0');

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function svgIcon(id) {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', 'ic');
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', `#${id}`);
  s.appendChild(u);
  return s;
}

function parseDate(s) {
  const m = DATE_RE.exec(String(s ?? '').trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dt.getTime()) || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const isoOf = (dt) => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
const sortKey = (s) => { const d = parseDate(s); return d ? isoOf(d) : ''; };

// a content text field: plain string or { en, zh }
function normText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (typeof x === 'string') o[k] = x;
    return o;
  }
  return String(v);
}
const sigText = (v) => (typeof v === 'string' ? v.trim() : [v?.en || '', v?.zh || ''].map((s) => s.trim()).join('\u241e'));

function normEntry(e) {
  if (!e || typeof e !== 'object') return null;
  return {
    date: typeof e.date === 'string' ? e.date.trim() : '',
    title: normText(e.title),
    body: normText(e.body),
    weather: WEATHERS.includes(e.weather) ? e.weather : '',
    season: SEASONS.includes(e.season) ? e.season : '',
    time: TIMES.includes(e.time) ? e.time : '',
    mood: normText(e.mood),
  };
}
// a published page's key: [date, title]; the 2nd, 3rd… page with the same date and title (two untitled pages on
// one day, say) gets its occurrence number too, so editing or leaving out one never touches the other. File
// order is not used on its own: it shifts every time a newer page is published at the top of diary.json.
const keyOf = (e, n = 1) => JSON.stringify(n > 1 ? [sortKey(e.date) || e.date, sigText(e.title), n] : [sortKey(e.date) || e.date, sigText(e.title)]);
const sigOf = (e) => JSON.stringify([sortKey(e.date) || e.date, sigText(e.title), sigText(e.body), e.weather, e.season, e.time, sigText(e.mood)]);

function paragraphs(s) {
  return String(s || '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map((p) => p.replace(/^\s+|\s+$/g, '')).filter(Boolean);
}

function tiltOf(s) {
  let h = 7;
  for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) | 0;
  return ((Math.abs(h) % 70) / 10 - 4.5).toFixed(1);       // -4.5° … 2.5°
}

function wordCount(s) {
  const str = String(s || '');
  const cjk = (str.match(CJK_G) || []).length;
  const words = (str.replace(CJK_G, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
  return cjk + words;
}

function toLangs(v) {
  if (v && typeof v === 'object') return { en: typeof v.en === 'string' ? v.en : '', zh: typeof v.zh === 'string' ? v.zh : '' };
  const s = typeof v === 'string' ? v : '';
  return CJK.test(s) ? { en: '', zh: s } : { en: s, zh: '' };
}

// keep only languages that were written, so `pick` falls back to the other one
function compact(v, trimAll = true) {
  const o = {};
  for (const l of ['en', 'zh']) {
    const s = String(v?.[l] || '');
    const out = trimAll ? s.trim() : s.replace(/\s+$/, '').replace(/^\s*\n/, '');
    if (out.trim()) o[l] = out;
  }
  return Object.keys(o).length ? o : '';
}

export function create(ctx) {
  const t = (k, vars) => {
    try { return ctx?.i18n?.t ? ctx.i18n.t(k, vars) : (STRINGS.en[k] || k); } catch { return k; }
  };
  const lang = () => (ctx?.i18n?.lang === 'zh' ? 'zh' : 'en');
  const pick = (v) => {
    try { if (ctx?.i18n?.pick) return ctx.i18n.pick(v) || ''; } catch { /* fall through */ }
    if (v == null) return '';
    if (typeof v === 'string') return v;
    return v[lang()] || v.en || v.zh || '';
  };
  const reduced = () => {
    if (typeof ctx?.still === 'boolean') return ctx.still;
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  };
  try { ctx?.i18n?.extend?.(STRINGS); } catch { /* strings fall back to keys */ }

  const writeMode = (() => {
    try {
      return !!ctx?.params?.has?.('write') || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
    } catch { return false; }
  })();
  const mq = (() => { try { return matchMedia(PHONE_MQ); } catch { return null; } })();
  const phone = () => !!mq?.matches;

  const S = {
    published: [], rawTop: null, loadOk: false, loaded: false, loadErr: null,
    drafts: [], removed: new Set(),
    entries: [], seq: [], pos: 0,
    open: false, mounted: false, editing: null, dirty: false, anim: null,
    lastFocus: null, returnPos: 0, pendingEntry: null, greeted: false,
    noteT: 0, hideT: 0, scratchT: 0, peekT: 0,
  };
  const handled = new WeakMap();                     // key event -> what handleKey answered the first time
  let E = {};
  let noise = null;

  // ---------- storage (ctx.store holds strings; tolerate objects too) ----------
  const readJSON = (k, fb) => {
    try {
      const v = ctx?.store?.get?.(k);
      if (v == null || v === '') return fb;
      const o = typeof v === 'string' ? JSON.parse(v) : v;
      return o ?? fb;
    } catch { return fb; }
  };
  const writeJSON = (k, v) => { try { ctx?.store?.set?.(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

  function loadLocal() {
    const d = readJSON('diary.drafts', []);
    S.drafts = Array.isArray(d)
      ? d.filter((x) => x && typeof x === 'object').map((x, i) => ({ ...x, id: typeof x.id === 'string' && x.id ? x.id : `d${i}${Date.now().toString(36)}` }))
      : [];
    const r = readJSON('diary.removed', []);
    S.removed = new Set(Array.isArray(r) ? r.filter((k) => typeof k === 'string') : []);
  }
  loadLocal();

  // drafts that were exported and are now published are tidied away; stale "left out" marks too
  function tidy() {
    if (!S.loadOk) return;
    const sigs = new Set(S.published.map((p) => p.sig));
    const before = S.drafts.length;
    S.drafts = S.drafts.filter((d) => { const e = normEntry(d); return !e || !sigs.has(sigOf(e)); });
    if (S.drafts.length !== before) writeJSON('diary.drafts', S.drafts);
    const keys = new Set(S.published.map((p) => p.key));
    const kept = [...S.removed].filter((k) => keys.has(k));
    if (kept.length !== S.removed.size) { S.removed = new Set(kept); writeJSON('diary.removed', kept); }
  }

  // why diary.json did not load: 'missing' (404 or an empty file: nothing published, nothing to lose) is quiet;
  // 'http' / 'network' / 'parse' / 'shape' mean the file may hold pages this notebook cannot see
  async function loadPublished() {
    let res;
    try { res = await fetch('diary.json', { cache: 'no-cache' }); } catch {
      return { kind: 'network', dkey: 'diary.err.network' };
    }
    if (res.status === 404) return { kind: 'missing' };
    if (!res.ok) return { kind: 'http', detail: `HTTP ${res.status}` };
    let text = '';
    try { text = await res.text(); } catch { return { kind: 'network', dkey: 'diary.err.network' }; }
    if (!text.trim()) return { kind: 'missing' };
    let j;
    try { j = JSON.parse(text); } catch (err) {
      const m = String(err?.message || '').replace(/\s+/g, ' ').trim();
      return m ? { kind: 'parse', detail: m.slice(0, 160) } : { kind: 'parse', dkey: 'diary.err.bad' };
    }
    const list = Array.isArray(j?.entries) ? j.entries : Array.isArray(j) ? j : null;
    const emptyObj = j && typeof j === 'object' && !Array.isArray(j) && !Object.keys(j).length;
    if (!list && !emptyObj) return { kind: 'shape', dkey: 'diary.err.shape' };
    S.rawTop = j && typeof j === 'object' && !Array.isArray(j) ? j : null;
    const seen = new Map();
    S.published = (list || []).map((raw, i) => {
      const e = normEntry(raw);
      if (!e) return null;
      const base = keyOf(e);
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      return { raw, e, key: keyOf(e, n), sig: sigOf(e), order: i };
    }).filter(Boolean);
    S.loadOk = true;
    return null;
  }
  // a writer would lose the published pages by exporting now
  const exportRisk = () => writeMode && !S.loadOk && !!S.loadErr && S.loadErr.kind !== 'missing';

  const ready = (async () => {
    try { S.loadErr = await loadPublished(); } catch { S.loadErr = { kind: 'parse', dkey: 'diary.err.bad' }; }
    if (!S.loadOk) { S.published = []; S.rawTop = null; }
    try { tidy(); } catch { /* ignore */ }
    S.loaded = true;
    try { updateWarn(); } catch { /* ignore */ }
    try {
      if (S.open && !S.editing) {
        const p = S.pendingEntry;
        S.pendingEntry = null;
        buildSeq();
        S.pos = p != null ? posFor(p) : greet() ?? initialPos();
        renderSpread();
        updateChrome();
      }
    } catch { /* ignore */ }
  })();

  // ---------- model ----------
  // same-day drafts: the most recently started first (editing does not reorder)
  const draftOrder = (d, i) => -(Number(d.created) || Number(d.updated) || 0) || i;

  function viewEntries() {
    const list = [];
    const replaced = writeMode ? new Set(S.drafts.map((d) => d.replaces).filter(Boolean)) : new Set();
    for (const p of S.published) {
      if (replaced.has(p.key)) continue;
      list.push({ ...p.e, kind: 'pub', key: p.key, rank: 1, order: p.order, removed: writeMode && S.removed.has(p.key) });
    }
    if (writeMode) {
      S.drafts.forEach((d, i) => {
        const e = normEntry(d);
        if (e) list.push({ ...e, kind: 'draft', id: d.id, replaces: d.replaces || null, rank: 0, order: draftOrder(d, i) });
      });
    }
    list.sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)) || a.rank - b.rank || a.order - b.order);
    return list;
  }

  function buildSeq() {
    S.entries = viewEntries();
    const seq = [{ kind: 'cover' }];
    S.entries.forEach((e, i) => seq.push({ kind: 'entry', e, no: i + 1 }));
    seq.push({ kind: 'end' });
    if (!phone() && seq.length % 2) seq.push({ kind: 'blank' });
    S.seq = seq;
  }

  const step = () => (phone() ? 1 : 2);
  const maxPos = () => Math.max(0, S.seq.length - step());
  const clampPos = (p) => {
    let q = Math.max(0, Math.min(maxPos(), p | 0));
    if (!phone()) q -= q % 2;
    return q;
  };
  const posFor = (i) => clampPos(Math.max(0, Math.min(S.entries.length - 1, i | 0)) + 1);
  const initialPos = () => (phone() && S.entries.length ? 1 : 0);
  const pagesAt = (pos) => (phone() ? [[S.seq[pos], 'single']] : [[S.seq[pos], 'left'], [S.seq[pos + 1], 'right']]);

  // the studio's date (content.studio.timezone); studioZone() returns '' for a missing or invalid zone and warns
  // once, and then the visitor's local date is used
  function today() {
    const now = new Date();
    let tz = '';
    try { tz = studioZone(ctx?.content); } catch { tz = ''; }
    if (tz) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
        const g = (ty) => parts.find((p) => p.type === ty)?.value;
        const s = `${g('year')}-${g('month')}-${g('day')}`;
        if (parseDate(s)) return s;
      } catch { /* local date below */ }
    }
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }

  function fmtDate(s, style = 'long') {
    const d = parseDate(s);
    if (!d) return String(s ?? '');
    const o = style === 'short' ? { year: 'numeric', month: 'short', day: 'numeric' }
      : style === 'month' ? { year: 'numeric', month: 'long' }
        : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    try { return new Intl.DateTimeFormat(lang() === 'zh' ? 'zh-CN' : 'en-GB', { ...o, timeZone: 'UTC' }).format(d); } catch { return isoOf(d); }
  }

  const atmoLabel = (e) => [e.season && t(`season.${e.season}`), e.weather && t(`wx.${e.weather}`), e.time && t(`time.${e.time}`)].filter(Boolean).join(' · ');

  // an entry written on this day in an earlier year: open there once per visit
  function greet() {
    if (S.greeted || !S.entries.length) return null;
    const td = today();
    const md = td.slice(5), y = +td.slice(0, 4);
    const i = S.entries.findIndex((e) => { const k = sortKey(e.date); return k && k.slice(5) === md && +k.slice(0, 4) < y; });
    if (i < 0) return null;
    S.greeted = true;
    const n = y - +sortKey(S.entries[i].date).slice(0, 4);
    setTimeout(() => note(n === 1 ? t('diary.onThisDay1') : t('diary.onThisDay', { n })), 450);
    return posFor(i);
  }

  // ---------- sound (synthesised; silent when the site sound is off) ----------
  function audio() {
    const s = ctx?.sound;
    if (!s?.ctx) return null;
    let on = false;
    try { on = typeof ctx.soundOn === 'function' ? !!ctx.soundOn() : !!s.enabled; } catch { on = false; }
    return on ? s : null;
  }
  function rustle(strength = 1) {
    const s = audio();
    if (!s) return;
    try {
      const ac = s.ctx;
      const dest = s.bus || ac.destination;
      if (!noise) {
        const n = Math.floor(ac.sampleRate * 0.6);
        noise = ac.createBuffer(1, n, ac.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.random());
      }
      const t0 = ac.currentTime + 0.01;
      const src = ac.createBufferSource();
      src.buffer = noise;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(1200, t0);
      bp.frequency.exponentialRampToValueAtTime(4200, t0 + 0.2);
      bp.frequency.exponentialRampToValueAtTime(1800, t0 + 0.5);
      const g = ac.createGain();
      const peak = 0.05 * strength;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.04);
      g.gain.exponentialRampToValueAtTime(peak * 0.45, t0 + 0.22);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.52);
      src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(dest);
      src.start(t0); src.stop(t0 + 0.56);
    } catch { /* audio is optional */ }
  }
  function thump(freq = 150) {
    const s = audio();
    if (!s) return;
    try { s.tone?.(freq, 0.07, 0.004, 0.16, 'sine', 0, s.bus, freq * 0.48); } catch { /* optional */ }
  }

  // ---------- DOM ----------
  function addIcons() {
    const ICONS = {
      'i-dpen': '<path d="M4.5 19.5l1-4.1L15.7 5.2a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L8.6 18.5l-4.1 1zM13.9 7l3.1 3.1"/>',
      'i-ddown': '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
      'i-dcopy': '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    };
    let defs = document.querySelector('svg defs');
    if (!defs) {
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.position = 'absolute';
      defs = document.createElementNS(SVGNS, 'defs');
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }
    for (const [id, markup] of Object.entries(ICONS)) {
      if (document.getElementById(id)) continue;
      const s = document.createElementNS(SVGNS, 'symbol');
      s.setAttribute('id', id);
      s.setAttribute('viewBox', '0 0 24 24');
      s.innerHTML = markup;            // static icon markup, no content data
      defs.appendChild(s);
    }
  }

  function textures() {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const g = c.getContext('2d');
      const img = g.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random();
        img.data[i] = 96; img.data[i + 1] = 70; img.data[i + 2] = 40;
        img.data[i + 3] = v < 0.55 ? 0 : (v - 0.55) * 40;
      }
      g.putImageData(img, 0, 0);
      E.root.style.setProperty('--diary-grain', `url("${c.toDataURL('image/png')}")`);

      // mottled masks so the rubber stamp looks inked by hand: a strong one for its frame, a light one for the
      // lettering (alpha stays >= ~.86, which keeps every stamp ink at 4.5:1 or more on the paper)
      const mottle = (floor, specks, lo, hi) => {
        const m = document.createElement('canvas');
        m.width = m.height = 128;
        const mg = m.getContext('2d');
        const mi = mg.createImageData(128, 128);
        for (let i = 0; i < mi.data.length; i += 4) mi.data[i + 3] = 255 * (floor + Math.random() * (1 - floor));
        mg.putImageData(mi, 0, 0);
        mg.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < specks; i++) {
          mg.fillStyle = `rgba(0,0,0,${lo + Math.random() * (hi - lo)})`;
          mg.beginPath();
          mg.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 4.5, 0, Math.PI * 2);
          mg.fill();
        }
        return `url("${m.toDataURL('image/png')}")`;
      };
      E.root.style.setProperty('--diary-mottle', mottle(0.78, 46, 0.12, 0.46));
      E.root.style.setProperty('--diary-mottle-soft', mottle(0.94, 16, 0.015, 0.05));
    } catch { /* plain paper is fine */ }
  }

  function roundBtn(icon) {
    const b = el('button', 'round');
    b.type = 'button';
    b.appendChild(svgIcon(icon));
    return b;
  }
  function pill(icon, cls = '') {
    const b = el('button', `diary-pill ${cls}`.trim());
    b.type = 'button';
    if (icon) b.appendChild(svgIcon(icon));
    b.appendChild(el('span'));
    return b;
  }
  const setPill = (b, text) => { if (b) b.querySelector('span').textContent = text; };
  function textBtn(label, fn, cls = '') {
    const b = el('button', `diary-tbtn ${cls}`.trim(), label);
    b.type = 'button';
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(b); });
    return b;
  }

  function mount() {
    if (S.mounted) return;
    S.mounted = true;
    addIcons();
    const root = el('div', 'diary');
    root.hidden = true;
    root.tabIndex = -1;          // a click on the header, footer or backdrop keeps focus (and keys) in the dialog
    root.dataset.open = 'false';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'diary-h');
    if (writeMode) root.classList.add('is-writer');

    const backdrop = el('div', 'diary-backdrop');
    const top = el('header', 'diary-top');
    const heading = el('div', 'diary-heading');
    const kicker = el('p', 'diary-kicker');
    const h2 = el('h2', 'diary-h');
    h2.id = 'diary-h';
    heading.append(kicker, h2);
    const tools = el('div', 'diary-tools');
    let bNew = null, bExport = null, bCopy = null, hint = null, warn = null;
    if (writeMode) {
      bNew = pill('i-dpen', 'primary');
      bExport = pill('i-ddown');
      bCopy = pill('i-dcopy');
      warn = el('p', 'diary-warn');
      warn.hidden = true;
      hint = el('p', 'diary-hint');
      tools.append(bNew, bExport, bCopy, warn, hint);
    }
    const bClose = roundBtn('i-close');
    bClose.classList.add('diary-close');
    top.append(heading, tools, bClose);

    const stage = el('div', 'diary-stage');
    const book = el('div', 'diary-book');
    book.tabIndex = -1;
    book.setAttribute('role', 'region');
    const board = el('div', 'diary-board');
    board.setAttribute('aria-hidden', 'true');
    const spread = el('div', 'diary-spread');
    const ribbon = el('div', 'diary-ribbon');
    const ribbonBtn = el('button', 'diary-ribbon-tail');
    ribbonBtn.type = 'button';
    ribbon.append(ribbonBtn, el('i', 'diary-ribbon-band'));
    spread.append(ribbon);
    book.append(board, spread);
    stage.append(book);

    const foot = el('footer', 'diary-foot');
    const nav = el('div', 'diary-nav');
    const bPrev = roundBtn('i-left');
    const bNext = roundBtn('i-right');
    const count = el('p', 'diary-count');
    count.setAttribute('aria-live', 'polite');
    nav.append(bPrev, count, bNext);
    const edbar = el('div', 'diary-edbar');
    edbar.hidden = true;
    const bBack = el('button', 'diary-quiet');
    bBack.type = 'button';
    const bSave = pill(null, 'primary');
    edbar.append(bBack, bSave);
    foot.append(nav, edbar);

    const noteEl = el('p', 'diary-note');
    noteEl.hidden = true;
    noteEl.setAttribute('role', 'status');

    root.append(backdrop, top, stage, foot, noteEl);
    document.body.appendChild(root);
    E = { root, backdrop, kicker, h2, tools, bNew, bExport, bCopy, hint, warn, bClose, stage, book, spread, ribbon, ribbonBtn, nav, bPrev, bNext, count, edbar, bBack, bSave, note: noteEl };
    wire();
    textures();
    renderStatic();
  }

  function wire() {
    E.bClose.addEventListener('click', () => close());
    E.bPrev.addEventListener('click', () => turn(-1));
    E.bNext.addEventListener('click', () => turn(1));
    E.backdrop.addEventListener('click', () => { if (!S.editing) close(); });
    E.stage.addEventListener('click', (e) => { if (e.target === E.stage && !S.editing) close(); });
    E.ribbonBtn.addEventListener('click', () => { goTo(initialPos()); sway(); });
    E.bNew?.addEventListener('click', () => startEditor());
    E.bExport?.addEventListener('click', exportFile);
    E.bCopy?.addEventListener('click', copyJSON);
    E.bBack.addEventListener('click', () => leaveEditor());
    E.bSave.addEventListener('click', () => saveDraft());
    E.root.addEventListener('keydown', onRootKey);

    // swipe between pages on touch screens
    let sw = null;
    E.stage.addEventListener('pointerdown', (e) => {
      sw = phone() && !S.editing && e.pointerType !== 'mouse' && e.isPrimary ? { x: e.clientX, y: e.clientY } : null;
    }, { passive: true });
    E.stage.addEventListener('pointerup', (e) => {
      if (!sw) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      sw = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) turn(dx < 0 ? 1 : -1);
    });
    E.stage.addEventListener('pointercancel', () => { sw = null; });

    const onLayout = () => { try { relayout(); } catch { /* ignore */ } };
    if (mq?.addEventListener) mq.addEventListener('change', onLayout);
    else mq?.addListener?.(onLayout);

    // focus that leaves the open notebook comes back; checked after the current script, so an overlay that
    // focuses itself and then announces 'overlay' (which closes the notebook) keeps its focus
    const later = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn);
    document.addEventListener('focusin', (e) => {
      if (!S.open || !E.root || E.root.contains(e.target)) return;
      later(() => { try { if (S.open && !E.root.contains(document.activeElement)) E.book.focus({ preventScroll: true }); } catch { /* ignore */ } });
    });
  }
  function renderStatic() {
    if (!S.mounted) return;
    E.h2.textContent = t('diary.title');
    E.book.setAttribute('aria-label', t('diary.book'));
    E.bClose.setAttribute('aria-label', t('diary.close'));
    E.bPrev.setAttribute('aria-label', t('diary.prev'));
    E.bNext.setAttribute('aria-label', t('diary.next'));
    E.ribbonBtn.setAttribute('aria-label', t('diary.ribbon'));
    E.ribbonBtn.title = t('diary.ribbon');
    E.bBack.textContent = t('diary.ed.back');
    setPill(E.bSave, t('diary.ed.save'));
    setPill(E.bNew, t('diary.new'));
    for (const b of [E.bExport, E.bCopy]) if (b) { clearTimeout(b._diaryArm); b.dataset.armed = ''; }
    setPill(E.bExport, t('diary.export'));
    setPill(E.bCopy, t('diary.copy'));
    if (E.hint) E.hint.textContent = t('diary.hint');
    updateKicker();
    updateWarn();
  }

  // write mode: diary.json exists but could not be read, so an export would drop its published pages
  function updateWarn() {
    if (!S.mounted || !E.warn) return;
    const risk = exportRisk();
    E.warn.hidden = !risk || !!S.editing;
    if (!risk) { E.warn.replaceChildren(); return; }
    const err = S.loadErr || {};
    const detail = err.dkey ? t(err.dkey) : String(err.detail || '');
    E.warn.replaceChildren(el('span', null, t('diary.loadWarn')));
    if (detail) E.warn.append(el('span', 'diary-warn-detail', detail));
  }

  function updateKicker() {
    if (!S.mounted) return;
    E.kicker.textContent = writeMode ? `${t('diary.kicker')} · ${t('diary.writeMode')}` : t('diary.kicker');
  }

  // ---------- pages ----------
  function pageEl(item, side, live) {
    const page = el('article', 'diary-page');
    page.dataset.side = side;
    page.dataset.kind = item?.kind || 'blank';
    const sheet = el('div', 'diary-sheet');
    page.appendChild(sheet);
    if (!live) page.setAttribute('aria-hidden', 'true');
    try {
      if (!item || item.kind === 'blank') sheet.appendChild(el('div', 'diary-body'));
      else if (item.kind === 'cover') coverContent(sheet, live);
      else if (item.kind === 'end') endContent(sheet, live);
      else entryContent(page, sheet, item, live);
    } catch { /* a broken entry leaves a blank page */ }
    if (item?.kind === 'entry') page.appendChild(el('span', 'diary-no', String(item.no)));
    if (live) {
      if (side !== 'left' && S.pos < maxPos()) page.appendChild(curl('next'));
      if (side !== 'right' && S.pos > 0) page.appendChild(curl('prev'));
    }
    return page;
  }

  function curl(dir) {
    const b = el('button', 'diary-curl');
    b.type = 'button';
    b.dataset.dir = dir;
    b.tabIndex = -1;                                   // the footer buttons are the keyboard path
    b.setAttribute('aria-hidden', 'true');
    b.addEventListener('click', (e) => { e.stopPropagation(); turn(dir === 'next' ? 1 : -1); });
    return b;
  }

  function stampEl(e, live) {
    const label = atmoLabel(e);
    if (!label) return null;
    const btn = live && ctx?.H;
    // the outer element tilts and carries the focus ring; the masked ink sits inside it (a mask would clip
    // an outline drawn on the same element)
    const s = el(btn ? 'button' : 'span', 'diary-stamp');
    s.style.setProperty('--stamp', STAMP_INK[e.season] || '#8f3d22');
    s.style.setProperty('--tilt', `${tiltOf(e.date + sigText(e.title))}deg`);
    const ink = el('span', 'diary-stamp-ink');
    if (e.weather && WX_ICON[e.weather]) ink.appendChild(svgIcon(WX_ICON[e.weather]));
    ink.appendChild(el('span', 'diary-stamp-label', label));
    s.appendChild(ink);
    if (btn) {
      s.type = 'button';
      s.title = t('diary.stampHint');
      s.setAttribute('aria-label', `${label}. ${t('diary.stampHint')}`);
      s.addEventListener('click', (ev) => { ev.stopPropagation(); relive(e, s); });
    }
    return s;
  }

  function relive(e, stamp) {
    try { if (e.season) ctx.H?.season?.(e.season); } catch { /* ignore */ }
    try { if (e.weather) ctx.H?.weather?.(e.weather); } catch { /* ignore */ }
    try { if (e.time) ctx.H?.time?.(e.time); } catch { /* ignore */ }
    note(t('diary.relive', { label: atmoLabel(e) }), 3200);
    thump(220);
    stamp.classList.remove('is-pressed');
    void stamp.offsetWidth;
    stamp.classList.add('is-pressed');
    // lower the notebook for a moment so the change in the room shows
    E.root.classList.add('is-peek');
    clearTimeout(S.peekT);
    S.peekT = setTimeout(() => E.root?.classList.remove('is-peek'), 2600);
  }

  function entryContent(page, sheet, item, live) {
    const e = item.e;
    if (e.kind === 'draft') page.appendChild(el('span', 'diary-tab', t('diary.draft')));
    if (e.removed) page.classList.add('is-removed');
    const head = el('header', 'diary-head');
    head.appendChild(el('p', 'diary-date', fmtDate(e.date, 'long')));
    const stamp = stampEl(e, live);
    if (stamp) head.appendChild(stamp);
    sheet.appendChild(head);
    sheet.appendChild(el('h3', 'diary-ptitle', pick(e.title) || t('diary.untitled')));
    const body = el('div', 'diary-body');
    if (e.removed) body.appendChild(el('p', 'diary-leftout', t('diary.leftOutNote')));
    for (const p of paragraphs(pick(e.body))) body.appendChild(el('p', null, p));
    const mood = pick(e.mood).trim();
    if (mood) body.appendChild(el('p', 'diary-mood', `${t('diary.mood')} — ${mood}`));
    sheet.appendChild(body);
    if (writeMode && live) {
      const tools = el('div', 'diary-ptools');
      if (e.kind === 'draft') {
        tools.append(textBtn(t('diary.edit'), () => startEditor({ draft: S.drafts.find((d) => d.id === e.id) })));
      } else {
        tools.append(
          textBtn(t('diary.edit'), () => startEditor({ pub: e })),
          textBtn(e.removed ? t('diary.keepIn') : t('diary.leaveOut'), () => toggleRemoved(e.key)),
        );
      }
      sheet.appendChild(tools);
    }
  }

  function coverContent(sheet, live) {
    sheet.classList.add('diary-cover');
    const n = S.entries.length;
    const plate = el('div', 'diary-plate');
    plate.append(el('p', 'diary-cap', t('diary.cover.kicker')));
    plate.append(el('p', 'diary-owner', pick(ctx?.content?.site?.name) || '—'));
    const oldest = S.entries.map((e) => sortKey(e.date)).filter(Boolean).sort()[0];
    if (oldest) plate.append(el('p', 'diary-since', t('diary.cover.since', { date: fmtDate(oldest, 'month') })));
    if (n) plate.append(el('p', 'diary-since', n === 1 ? t('diary.cover.count1') : t('diary.cover.count', { n })));
    sheet.append(plate);
    if (n) {
      sheet.append(el('p', 'diary-cap', t('diary.cover.contents')));
      const ol = el('ol', 'diary-toc');
      S.entries.forEach((e, i) => {
        const li = el('li');
        const row = el(live ? 'button' : 'div', 'diary-toc-row');
        if (live) {
          row.type = 'button';
          row.addEventListener('click', (ev) => { ev.stopPropagation(); goTo(posFor(i)); });
        }
        row.append(el('span', 'diary-toc-date', fmtDate(e.date, 'short')), el('span', 'diary-toc-title', pick(e.title) || t('diary.untitled')));
        if (e.kind === 'draft') row.append(el('span', 'diary-toc-tag', t('diary.draft')));
        row.append(el('span', 'diary-toc-dots'), el('span', 'diary-toc-no', String(i + 1)));
        li.append(row);
        ol.append(li);
      });
      sheet.append(ol);
    } else {
      sheet.append(el('p', 'diary-quietline', t('diary.cover.empty')));
      if (writeMode && live) sheet.append(textBtn(t('diary.nextPage'), () => startEditor(), 'diary-centerbtn'));
    }
    sheet.append(el('p', 'diary-return', t('diary.cover.return')));
  }

  function endContent(sheet, live) {
    const body = el('div', 'diary-body diary-endbody');
    body.append(el('p', 'diary-endline', t('diary.end')));
    if (writeMode && live) body.append(textBtn(t('diary.nextPage'), () => startEditor(), 'diary-centerbtn'));
    sheet.append(body);
  }

  function keepFocus() {
    if (S.open && E.root && !E.root.contains(document.activeElement)) E.book.focus({ preventScroll: true });
  }

  // the ribbon lives inside the spread so a turning leaf passes over it
  function setSpread(...nodes) {
    E.spread.replaceChildren(...nodes);
    if (E.ribbon) E.spread.appendChild(E.ribbon);
  }

  function renderSpread() {
    if (!S.mounted) return;
    E.spread.classList.remove('is-editing');
    E.book.classList.remove('is-editing');
    setSpread(...pagesAt(S.pos).map(([item, side]) => pageEl(item, side, true)));
    keepFocus();
  }

  function countText() {
    const n = S.entries.length;
    if (!n) return t('diary.count.empty');
    const nums = pagesAt(S.pos).map(([p]) => (p && p.kind === 'entry' ? p.no : 0)).filter(Boolean);
    if (nums.length === 2) return t('diary.count.two', { a: nums[0], b: nums[1], n });
    if (nums.length === 1) return t('diary.count.one', { a: nums[0], n });
    return S.seq[S.pos]?.kind === 'cover' ? t('diary.count.cover') : t('diary.count.end');
  }

  function updateChrome() {
    if (!S.mounted) return;
    const editing = !!S.editing;
    E.nav.hidden = editing;
    E.edbar.hidden = !editing;
    E.ribbon.hidden = editing;
    for (const b of [E.bNew, E.bExport, E.bCopy, E.hint]) if (b) b.hidden = editing;   // the editor page carries the hint
    updateWarn();
    E.bPrev.disabled = S.pos <= 0;
    E.bNext.disabled = S.pos >= maxPos();
    E.count.textContent = editing ? '' : countText();
    updateKicker();
    keepFocus();
  }

  // ---------- turning pages ----------
  const easeOf = () => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--ease').trim();
      return v || DEFAULT_EASE;
    } catch { return DEFAULT_EASE; }
  };

  function turn(dir) {
    if (!S.open || S.editing) return;
    goTo(S.pos + dir * step(), dir);
  }

  function goTo(target, dirHint) {
    if (!S.open || S.editing) return;
    if (S.anim) S.anim.finish();
    let to = target | 0;
    if (!phone()) to = Math.floor(to / 2) * 2;
    if (to < 0 || to > maxPos()) { bump(dirHint || (to < 0 ? -1 : 1)); return; }
    if (to === S.pos) return;
    const from = S.pos;
    const dir = to > from ? 1 : -1;
    S.pos = to;
    rustle(Math.abs(to - from) > step() ? 1.3 : 1);
    const canAnimate = typeof E.spread.animate === 'function';
    try {
      if (!canAnimate) renderSpread();
      else if (reduced()) crossfade();
      else if (phone()) turnSingle(from, to, dir);
      else turnSpread(from, to, dir);
    } catch { renderSpread(); }
    updateChrome();
    sway();
  }

  function shade(page) {
    const s = el('i', 'diary-shade');
    page.appendChild(s);
    return s;
  }

  function makeLeaf(side, front, back) {
    const leaf = el('div', 'diary-leaf');
    leaf.dataset.side = side;
    leaf.setAttribute('aria-hidden', 'true');
    leaf.inert = true;
    const f = el('div', 'diary-face diary-front');
    f.dataset.side = front.dataset.side;
    const fLight = el('i', 'diary-light');
    f.append(front, fLight);
    leaf.append(f);
    let bLight = null;
    if (back) {
      const b = el('div', 'diary-face diary-back');
      b.dataset.side = back.dataset.side;
      bLight = el('i', 'diary-light');
      b.append(back, bLight);
      leaf.append(b);
    }
    return { leaf, fLight, bLight };
  }

  function settle(anims) {
    let done = false;
    const handle = {};
    const finish = () => {
      if (done) return;
      done = true;
      for (const a of anims) { try { a.onfinish = null; a.cancel(); } catch { /* ignore */ } }
      if (S.anim === handle) S.anim = null;
      if (S.open && !S.editing) renderSpread();
    };
    handle.finish = finish;
    S.anim = handle;
    if (anims[0]) anims[0].onfinish = finish;
    setTimeout(finish, TURN_MS + 450);              // never leave a half-turned page behind
  }

  // desktop: the right page lifts and lands on the left (or back again), with moving shadows
  function turnSpread(from, to, dir) {
    const seq = S.seq;
    let sl, sr, front, back, side;
    if (dir > 0) {
      sl = pageEl(seq[from], 'left', false); sr = pageEl(seq[to + 1], 'right', false);
      front = pageEl(seq[from + 1], 'right', false); back = pageEl(seq[to], 'left', false); side = 'right';
    } else {
      sl = pageEl(seq[to], 'left', false); sr = pageEl(seq[from + 1], 'right', false);
      front = pageEl(seq[from], 'left', false); back = pageEl(seq[to + 1], 'right', false); side = 'left';
    }
    const reveal = shade(dir > 0 ? sr : sl);
    const cover = shade(dir > 0 ? sl : sr);
    const { leaf, fLight, bLight } = makeLeaf(side, front, back);
    setSpread(sl, sr, leaf);
    keepFocus();
    const o = { duration: TURN_MS, easing: easeOf(), fill: 'both' };
    settle([
      leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${dir > 0 ? -180 : 180}deg)` }], o),
      fLight.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0.55 }], o),
      bLight.animate([{ opacity: 0.55 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0 }], o),
      reveal.animate([{ opacity: 0.9 }, { opacity: 0 }], o),
      cover.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.82 }, { opacity: 0.25 }], o),
    ]);
  }

  // phones: one page swings away around the spine (or swings back in)
  function turnSingle(from, to, dir) {
    const seq = S.seq;
    const o = { duration: TURN_MS, easing: easeOf(), fill: 'both' };
    const under = pageEl(seq[dir > 0 ? to : from], 'single', false);
    const sh = shade(under);
    const { leaf, fLight } = makeLeaf('single', pageEl(seq[dir > 0 ? from : to], 'single', false), null);
    setSpread(under, leaf);
    keepFocus();
    if (dir > 0) {
      settle([
        leaf.animate([
          { transform: 'rotateY(0deg)', opacity: 1 },
          { transform: 'rotateY(-62deg)', opacity: 1, offset: 0.55 },
          { transform: 'rotateY(-100deg)', opacity: 0 },
        ], o),
        fLight.animate([{ opacity: 0 }, { opacity: 0.55 }], o),
        sh.animate([{ opacity: 0.85 }, { opacity: 0 }], o),
      ]);
    } else {
      settle([
        leaf.animate([
          { transform: 'rotateY(-100deg)', opacity: 0 },
          { transform: 'rotateY(-62deg)', opacity: 1, offset: 0.45 },
          { transform: 'rotateY(0deg)', opacity: 1 },
        ], o),
        fLight.animate([{ opacity: 0.55 }, { opacity: 0 }], o),
        sh.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.8 }, { opacity: 0.2 }], o),
      ]);
    }
  }

  // reduced motion: the new pages fade in under the old ones
  function crossfade() {
    const old = el('div', 'diary-xfade');
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    old.append(...[...E.spread.children].filter((c) => c.classList.contains('diary-page')));
    renderSpread();
    E.spread.appendChild(old);
    settle([old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease', fill: 'both' })]);
  }

  function bump(dir) {
    if (reduced() || typeof E.book?.animate !== 'function') return;
    E.book.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dir * -7}px)` }, { transform: 'translateX(0)' }],
      { duration: 280, easing: 'ease-out' });
  }

  function sway() {
    if (reduced() || E.ribbon?.hidden || typeof E.ribbon?.animate !== 'function') return;
    E.ribbon.animate([
      { transform: 'rotate(0deg)' }, { transform: 'rotate(1.4deg)' }, { transform: 'rotate(-0.7deg)' }, { transform: 'rotate(0deg)' },
    ], { duration: 900, easing: 'ease-out' });
  }

  function unfold() {
    if (reduced() || phone()) return;
    const left = E.spread.querySelector('.diary-page[data-side="left"]');
    if (typeof left?.animate !== 'function') return;
    left.animate([
      { transform: 'rotateY(52deg)', opacity: 0 },
      { opacity: 1, offset: 0.35 },
      { transform: 'rotateY(0deg)', opacity: 1 },
    ], { duration: 680, easing: easeOf() });
  }

  function relayout() {
    if (!S.open) return;
    if (S.anim) S.anim.finish();
    const anchor = S.pos;
    buildSeq();
    if (phone()) S.pos = anchor === 0 && S.entries.length ? 1 : clampPos(anchor);
    else S.pos = clampPos(anchor);
    if (S.editing) renderEditor(); else renderSpread();
    updateChrome();
  }

  // ---------- keys & focus ----------
  const isField = (n) => !!n?.closest?.('input, textarea, select, [contenteditable="true"]');

  const composing = (e) => !!(e?.isComposing || e?.keyCode === 229);

  // true = handled here (main then cancels the default and stops the event). In a text field, or while an IME
  // is composing, the arrows return false so the caret (or the candidate list) moves; the notebook's own
  // listener still stops the event before ui.js could change the work behind it.
  function handleKey(e) {
    if (!S.open) return false;
    const ev = e && typeof e === 'object' ? e : null;
    if (ev && handled.has(ev)) return handled.get(ev);
    let r = false;
    const k = e?.key;
    if (k === 'Escape') {
      if (composing(e)) r = false;                   // Esc cancels the IME candidate, not the page
      else if (S.editing) { leaveEditor(); r = true; }
      else r = close();
    } else if (k === 'ArrowLeft' || k === 'ArrowRight') {
      if (composing(e) || isField(e?.target)) r = false;
      else {
        if (!S.editing) turn(k === 'ArrowRight' ? 1 : -1);
        r = true;                                    // swallowed while open, so the room does not change work
      }
    }
    if (ev) handled.set(ev, r);
    return r;
  }

  function onRootKey(e) {
    try {
      if (e.key === 'Tab') trap(e);
      else if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
        if (S.editing) { e.preventDefault(); saveDraft(); }
      } else if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (handleKey(e)) e.preventDefault();
      }
    } catch { /* never break typing */ }
    e.stopPropagation();
  }

  // the room's one-letter shortcuts (and the terminal's `) would act behind the open notebook when focus has
  // slipped to <body>; window capture runs before ui.js, the terminal and main
  function onWindowKey(e) {
    try {
      if (!S.open || e.metaKey || e.ctrlKey || e.altKey || composing(e) || isField(e.target)) return;
      if (!GUARDED_KEYS.has(String(e.key || '').toLowerCase())) return;
      e.stopImmediatePropagation();
      if (!E.root?.contains?.(e.target)) keepFocus();
    } catch { /* ignore */ }
  }
  try { addEventListener('keydown', onWindowKey, true); } catch { /* the root listener still covers focus inside */ }

  function trap(e) {
    const list = [...E.root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((n) => !n.disabled && n.tabIndex >= 0 && !n.closest('.diary-leaf, .diary-xfade, [hidden]') && n.getClientRects().length);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    const a = document.activeElement;
    if (e.shiftKey && (a === first || a === E.book || a === E.root || !E.root.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !E.root.contains(a))) { e.preventDefault(); first.focus(); }
  }

  // ---------- open / close ----------
  function open(at) {
    try {
      mount();
      if (S.open) {
        if (at != null && !S.editing) { buildSeq(); goTo(posFor(at)); }
        return;
      }
      clearTimeout(S.hideT);
      // one overlay at a time: the terminal, music and library close (and hand focus back) first
      try { ctx?.emit?.('overlay', 'diary'); } catch { /* no bus */ }
      S.lastFocus = document.activeElement;
      buildSeq();
      const greeted = at == null && S.loaded ? greet() : null;
      S.pos = at != null ? posFor(at) : greeted ?? initialPos();
      if (!S.loaded && at != null) S.pendingEntry = at;
      S.open = true;
      renderStatic();
      renderSpread();
      updateChrome();
      E.root.hidden = false;
      void E.root.offsetWidth;
      E.root.dataset.open = 'true';
      document.body.classList.add('diary-open');
      unfold();
      thump(140);
      rustle(0.7);
      requestAnimationFrame(() => { if (S.open) E.book.focus({ preventScroll: true }); });
    } catch (err) {
      try { console.warn('[diary]', err); } catch { /* ignore */ }
    }
  }

  // restore: false when another overlay is taking over (it moves focus itself)
  function close({ restore = true } = {}) {
    if (!S.open) return false;
    try {
      if (S.editing) { flushScratch(); S.editing = null; S.dirty = false; }
      if (S.anim) S.anim.finish();
      S.open = false;
      E.root.dataset.open = 'false';
      E.root.classList.remove('is-peek');
      clearTimeout(S.noteT);
      E.note.hidden = true;
      document.body.classList.remove('diary-open');
      clearTimeout(S.hideT);
      S.hideT = setTimeout(() => { if (!S.open && E.root) E.root.hidden = true; }, reduced() ? 0 : 280);
      thump(120);
      const f = S.lastFocus;
      S.lastFocus = null;
      if (restore && f && f !== document.body && f.isConnected && typeof f.focus === 'function') f.focus({ preventScroll: true });
      else if (E.root.contains(document.activeElement)) document.activeElement.blur?.();
    } catch { /* ignore */ }
    return true;
  }

  function note(text, ms = 2800) {
    if (!S.open || !S.mounted) { try { ctx?.ui?.toast?.(text, ms); } catch { /* ignore */ } return; }
    E.note.textContent = text;
    E.note.hidden = false;
    E.note.classList.remove('is-in');
    void E.note.offsetWidth;
    E.note.classList.add('is-in');
    clearTimeout(S.noteT);
    S.noteT = setTimeout(() => { if (E.note) E.note.hidden = true; }, ms);
  }

  // ---------- write mode ----------
  function blankEd() {
    const c = ctx?.climate || {};
    return {
      id: null, replaces: null, date: today(),
      season: SEASONS.includes(c.season) ? c.season : 'autumn',
      weather: WEATHERS.includes(c.weather) ? c.weather : 'clear',
      time: TIMES.includes(c.time) ? c.time : 'night',
      mood: '', title: { en: '', zh: '' }, body: { en: '', zh: '' }, lang: lang(),
    };
  }
  function edFrom(e, extra) {
    const b = blankEd();
    return {
      ...b,
      date: parseDate(e.date) ? sortKey(e.date) : b.date,
      season: SEASONS.includes(e.season) ? e.season : b.season,
      weather: WEATHERS.includes(e.weather) ? e.weather : b.weather,
      time: TIMES.includes(e.time) ? e.time : b.time,
      mood: typeof e.mood === 'string' ? e.mood : pick(e.mood),
      title: toLangs(e.title), body: toLangs(e.body),
      ...extra,
    };
  }
  function sanitizeEd(s, base) {
    const str = (v, fb) => (typeof v === 'string' ? v : fb);
    const langs = (v, fb) => ({ en: str(v?.en, fb.en), zh: str(v?.zh, fb.zh) });
    return {
      ...base,
      date: str(s.date, base.date),
      season: SEASONS.includes(s.season) ? s.season : base.season,
      weather: WEATHERS.includes(s.weather) ? s.weather : base.weather,
      time: TIMES.includes(s.time) ? s.time : base.time,
      mood: str(s.mood, base.mood),
      title: langs(s.title, base.title), body: langs(s.body, base.body),
      lang: s.lang === 'zh' || s.lang === 'en' ? s.lang : base.lang,
    };
  }
  const scratchOf = (ed) => ({
    id: ed.id, replaces: ed.replaces, date: ed.date, season: ed.season, weather: ed.weather, time: ed.time,
    mood: ed.mood, title: ed.title, body: ed.body, lang: ed.lang,
  });
  function scheduleScratch() {
    if (!S.editing) return;
    S.dirty = true;
    clearTimeout(S.scratchT);
    S.scratchT = setTimeout(flushScratch, 400);
  }
  // unsaved pages, one per page being written: 'new', 'd:<draft id>' or 'p:<published key>'
  const slotOf = (ed) => (ed?.id ? `d:${ed.id}` : ed?.replaces ? `p:${ed.replaces}` : 'new');
  function readScratches() {
    const all = readJSON('diary.scratches', {});
    const map = all && typeof all === 'object' && !Array.isArray(all) ? { ...all } : {};
    // the single slot of earlier versions moves into the map once
    const old = readJSON('diary.scratch', null);
    if (old && typeof old === 'object' && !Array.isArray(old)) {
      const slot = slotOf({ id: old.id || null, replaces: old.replaces || null });
      if (!map[slot]) map[slot] = old;
      writeJSON('diary.scratches', map);
      writeJSON('diary.scratch', null);
    }
    return map;
  }
  function writeScratch(slot, value) {
    const map = readScratches();
    if (value) map[slot] = value; else delete map[slot];
    writeJSON('diary.scratches', map);
  }
  function flushScratch() {
    clearTimeout(S.scratchT);
    if (S.editing && S.dirty) writeScratch(slotOf(S.editing), scratchOf(S.editing));
  }

  function startEditor({ draft, pub } = {}) {
    if (!writeMode || !S.open) return;
    try {
      if (S.anim) S.anim.finish();
      let ed;
      if (draft) ed = edFrom(draft, { id: draft.id, replaces: draft.replaces || null });
      else if (pub) ed = edFrom(pub, { replaces: pub.key || null });
      else ed = blankEd();
      // leaving another page that was being written keeps it in its own slot
      if (S.editing) flushScratch();
      let restored = false;
      const sc = readScratches()[slotOf(ed)];
      if (sc && typeof sc === 'object' && (sc.id || null) === ed.id && (sc.replaces || null) === ed.replaces) {
        ed = sanitizeEd(sc, ed);
        restored = true;
      }
      const wasEditing = !!S.editing;
      S.editing = ed;
      S.dirty = restored;
      if (!wasEditing) S.returnPos = S.pos;
      renderEditor();
      updateChrome();
      rustle(0.8);
      if (restored) note(t('diary.ed.restored'));
    } catch { S.editing = null; renderSpread(); updateChrome(); }
  }

  function field(label, control) {
    const f = el('label', 'diary-field');
    f.append(el('span', null, label), control);
    return f;
  }
  function selectEl(list, labelOf, value, onChange) {
    const s = el('select', 'diary-select');
    for (const v of list) {
      const o = el('option', null, labelOf(v));
      o.value = v;
      s.append(o);
    }
    s.value = list.includes(value) ? value : list[0];
    s.addEventListener('change', () => { onChange(s.value); scheduleScratch(); });
    return s;
  }
  function inputEl(type, value, onInput, placeholder) {
    const i = el('input', 'diary-input');
    i.type = type;
    i.value = value || '';
    if (placeholder) i.placeholder = placeholder;
    i.addEventListener('input', () => { onInput(i.value); scheduleScratch(); });
    return i;
  }

  function renderEditor() {
    const ed = S.editing;
    if (!ed || !S.mounted) return;
    const one = phone();
    const meta = el('article', 'diary-page diary-edmeta');
    meta.dataset.side = one ? 'single' : 'left';
    meta.dataset.kind = 'editor';
    const ms = el('div', 'diary-sheet');
    meta.append(ms);
    const write = el('article', 'diary-page diary-edwrite');
    write.dataset.side = one ? 'single' : 'right';
    write.dataset.kind = 'editor';
    const ws = el('div', 'diary-sheet');
    write.append(ws);

    // left: when and how the room was
    const day = el('p', 'diary-edday', fmtDate(ed.date, 'long') || ed.date);
    ms.append(el('p', 'diary-cap', ed.id ? t('diary.ed.edit') : ed.replaces ? t('diary.ed.editPub') : t('diary.ed.new')), day);
    const date = inputEl('date', ed.date, (v) => { ed.date = v; day.textContent = fmtDate(v, 'long') || v; });
    ms.append(field(t('diary.ed.date'), date));
    ms.append(el('p', 'diary-cap diary-cap-gap', t('diary.ed.atmo')));
    const atmo = el('div', 'diary-atmo');
    atmo.append(
      field(t('diary.ed.season'), selectEl(SEASONS, (v) => t(`season.${v}`), ed.season, (v) => { ed.season = v; })),
      field(t('diary.ed.weather'), selectEl(WEATHERS, (v) => t(`wx.${v}`), ed.weather, (v) => { ed.weather = v; })),
      field(t('diary.ed.time'), selectEl(TIMES, (v) => t(`time.${v}`), ed.time, (v) => { ed.time = v; })),
    );
    ms.append(atmo);
    ms.append(field(t('diary.ed.mood'), inputEl('text', ed.mood, (v) => { ed.mood = v; }, t('diary.ed.moodPh'))));
    if (ed.replaces) ms.append(el('p', 'diary-ednote', t('diary.ed.editPubNote')));
    const delLabel = ed.id ? t('diary.ed.delete') : t('diary.ed.discard');
    const del = textBtn(delLabel, (b) => {
      if (b.dataset.armed === '1') { deleteDraft(); return; }
      b.dataset.armed = '1';
      b.textContent = t('diary.ed.confirm');
      setTimeout(() => { if (b.isConnected && b.dataset.armed === '1') { b.dataset.armed = ''; b.textContent = delLabel; } }, 3200);
    }, 'diary-danger');
    const actions = el('div', 'diary-ptools');
    actions.append(del);
    ms.append(actions, el('p', 'diary-ednote', t('diary.hint')));

    // right: a fresh ruled page
    const head = el('div', 'diary-edhead');
    const langs = el('div', 'diary-langs');
    langs.setAttribute('role', 'group');
    langs.setAttribute('aria-label', t('diary.ed.version'));
    const lb = {};
    const words = el('span', 'diary-words');
    const title = el('input', 'diary-edtitle');
    title.type = 'text';
    title.maxLength = 200;
    title.placeholder = t('diary.ed.titlePh');
    title.setAttribute('aria-label', t('diary.ed.title'));
    const body = el('textarea', 'diary-edbody');
    body.placeholder = t('diary.ed.bodyPh');
    body.setAttribute('aria-label', t('diary.ed.body'));
    const filled = (l) => !!((ed.title[l] || '').trim() || (ed.body[l] || '').trim());
    const marks = () => {
      for (const l of ['en', 'zh']) {
        const has = filled(l);
        lb[l].classList.toggle('has', has);
        lb[l].setAttribute('aria-pressed', String(ed.lang === l));
        lb[l].title = has ? t('diary.ed.filled') : t('diary.ed.empty');
      }
      words.textContent = t('diary.ed.words', { n: wordCount(`${ed.title[ed.lang] || ''} ${ed.body[ed.lang] || ''}`) });
    };
    const fill = () => {
      title.value = ed.title[ed.lang] || '';
      body.value = ed.body[ed.lang] || '';
      title.lang = body.lang = ed.lang === 'zh' ? 'zh-CN' : 'en';
      marks();
    };
    for (const l of ['en', 'zh']) {
      const b = el('button');
      b.type = 'button';
      b.append(el('i'), el('span', null, l === 'en' ? 'EN' : '中文'));
      b.addEventListener('click', () => { ed.lang = l; fill(); scheduleScratch(); (title.value ? body : title).focus({ preventScroll: true }); });
      lb[l] = b;
      langs.append(b);
    }
    title.addEventListener('input', () => { ed.title[ed.lang] = title.value; marks(); scheduleScratch(); });
    body.addEventListener('input', () => { ed.body[ed.lang] = body.value; marks(); scheduleScratch(); });
    head.append(el('span', 'diary-cap', t('diary.ed.version')), langs, words);
    ws.append(head, title, body, el('p', 'diary-ednote diary-edboth', t('diary.ed.bothHint')));
    fill();

    E.spread.classList.add('is-editing');
    E.book.classList.add('is-editing');
    setSpread(meta, write);
    requestAnimationFrame(() => {
      if (S.editing === ed) (title.value ? body : title).focus({ preventScroll: true });
    });
  }

  function saveDraft() {
    const ed = S.editing;
    if (!ed) return;
    const has = ['en', 'zh'].some((l) => (ed.title[l] || '').trim() || (ed.body[l] || '').trim());
    if (!has) {
      note(t('diary.ed.needText'));
      E.spread.querySelector('.diary-edtitle')?.focus();
      return;
    }
    const id = ed.id || `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const prev = S.drafts.find((d) => d.id === id);
    const rec = {
      id, created: Number(prev?.created) || Date.now(), updated: Date.now(),
      ...(ed.replaces ? { replaces: ed.replaces } : {}),
      date: parseDate(ed.date) ? sortKey(ed.date) : today(),
      title: compact(ed.title), body: compact(ed.body, false),
      weather: ed.weather, season: ed.season, time: ed.time,
      mood: String(ed.mood || '').trim(),
    };
    S.drafts = S.drafts.filter((d) => d.id !== id).concat(rec);
    writeJSON('diary.drafts', S.drafts);
    writeScratch(slotOf(ed), null);
    clearTimeout(S.scratchT);
    S.editing = null;
    S.dirty = false;
    buildSeq();
    const i = S.entries.findIndex((e) => e.kind === 'draft' && e.id === id);
    S.pos = i >= 0 ? posFor(i) : clampPos(S.returnPos);
    renderSpread();
    updateChrome();
    E.book.focus({ preventScroll: true });
    note(t('diary.ed.saved'));
    rustle(0.8);
  }

  function deleteDraft() {
    const ed = S.editing;
    if (!ed) return;
    if (ed.id) {
      S.drafts = S.drafts.filter((d) => d.id !== ed.id);
      writeJSON('diary.drafts', S.drafts);
    }
    writeScratch(slotOf(ed), null);
    clearTimeout(S.scratchT);
    S.editing = null;
    S.dirty = false;
    buildSeq();
    S.pos = clampPos(S.returnPos);
    renderSpread();
    updateChrome();
    E.book.focus({ preventScroll: true });
    note(ed.id ? t('diary.ed.deleted') : t('diary.ed.discarded'));
  }

  function leaveEditor() {
    if (!S.editing) return;
    const dirty = S.dirty;
    flushScratch();
    S.editing = null;
    S.dirty = false;
    buildSeq();
    S.pos = clampPos(S.returnPos);
    renderSpread();
    updateChrome();
    E.book.focus({ preventScroll: true });
    if (dirty) note(t('diary.ed.kept'));
  }

  function toggleRemoved(key) {
    if (!key) return;
    const out = !S.removed.has(key);
    if (out) S.removed.add(key); else S.removed.delete(key);
    writeJSON('diary.removed', [...S.removed]);
    buildSeq();
    S.pos = clampPos(S.pos);
    renderSpread();
    updateChrome();
    note(out ? t('diary.leftOut') : t('diary.keptIn'));
  }

  function exportText() {
    const replaced = new Set(S.drafts.map((d) => d.replaces).filter(Boolean));
    const rows = [];
    for (const p of S.published) {
      if (replaced.has(p.key) || S.removed.has(p.key)) continue;
      rows.push({ k: sortKey(p.e.date), rank: 1, order: p.order, out: p.raw });
    }
    S.drafts.forEach((d, i) => {
      const e = normEntry(d);
      if (!e) return;
      rows.push({
        k: sortKey(e.date), rank: 0, order: draftOrder(d, i),
        out: { date: e.date, title: e.title, body: e.body, weather: e.weather, season: e.season, time: e.time, mood: typeof e.mood === 'string' ? e.mood : e.mood || '' },
      });
    });
    rows.sort((a, b) => b.k.localeCompare(a.k) || a.rank - b.rank || a.order - b.order);
    const top = S.rawTop ? { ...S.rawTop } : {};
    top.entries = rows.map((r) => r.out);
    return `${JSON.stringify(top, null, 2)}\n`;
  }

  // while diary.json is unread, an export needs a second click on the same button
  function mayExport(btn, labelKey) {
    if (!exportRisk()) return true;
    const reset = () => { clearTimeout(btn?._diaryArm); if (btn) { btn.dataset.armed = ''; setPill(btn, t(labelKey)); } };
    if (btn?.dataset.armed === '1') { reset(); return true; }
    if (btn) {
      btn.dataset.armed = '1';
      setPill(btn, t('diary.ed.confirm'));
      clearTimeout(btn._diaryArm);
      btn._diaryArm = setTimeout(reset, 4800);
    }
    note(t('diary.loadArm'), 4800);
    return false;
  }

  async function exportFile() {
    if (!S.loaded) { try { await ready; } catch { /* loaded or not, decide below */ } }
    if (!mayExport(E.bExport, 'diary.export')) return;
    try {
      const blob = new Blob([exportText()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a');
      a.href = url;
      a.download = 'diary.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      note(t('diary.exported'), 5200);
    } catch { note(t('diary.copyFail')); }
  }

  async function copyJSON() {
    if (!S.loaded) { try { await ready; } catch { /* loaded or not, decide below */ } }
    if (!mayExport(E.bCopy, 'diary.copy')) return;
    const text = exportText();
    try {
      await navigator.clipboard.writeText(text);
      note(t('diary.copied'));
      return;
    } catch { /* fall back below */ }
    const back = document.activeElement;
    try {
      const ta = el('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      E.root.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      note(ok ? t('diary.copied') : t('diary.copyFail'));
    } catch { note(t('diary.copyFail')); }
    if (back?.isConnected && E.root.contains(back)) back.focus({ preventScroll: true }); else keepFocus();
  }

  // ---------- language ----------
  try {
    ctx?.on?.('lang', () => {
      try {
        if (!S.mounted) return;
        renderStatic();
        if (S.open) {
          if (S.editing) renderEditor(); else { buildSeq(); renderSpread(); }
          updateChrome();
        }
      } catch { /* ignore */ }
    });
  } catch { /* no event bus */ }
  // another module's overlay opening closes the notebook (it keeps the unsaved page, see close)
  try {
    ctx?.on?.('overlay', (d) => {
      try {
        const name = typeof d === 'string' ? d : d?.name;
        if (name && name !== 'diary' && S.open) close({ restore: false });
      } catch { /* ignore */ }
    });
  } catch { /* no event bus */ }

  const safe = (fn) => (...a) => { try { return fn(...a); } catch { return false; } };

  return {
    actions: {
      notebook: safe(() => open()),
    },
    tips: {
      notebook: () => t('diary.tip'),
    },
    keys: {
      Escape: safe((e) => handleKey(e || { key: 'Escape' })),
      ArrowLeft: safe((e) => handleKey(e || { key: 'ArrowLeft' })),
      ArrowRight: safe((e) => handleKey(e || { key: 'ArrowRight' })),
    },
    api: {
      ready,
      open: safe(() => open()),
      openEntry: safe((i) => {
        const n = Number(i);
        if (!S.loaded) S.pendingEntry = Number.isFinite(n) ? n : 0;
        open(Number.isFinite(n) ? n : 0);
      }),
      close: safe(() => close()),
      isOpen: () => S.open,
      entries: safe(() => viewEntries().map((e) => ({
        date: e.date, title: e.title, body: e.body, weather: e.weather, season: e.season, time: e.time, mood: e.mood, draft: e.kind === 'draft',
      }))),
    },
  };
}
