// DOM overlay: masthead, nav, atmosphere popover, caption, in-scene labels, panels, mobile sheet, entry.
import { i18n } from './content.js';
import { languageHref, labelLanguageButton } from '../../language.js?v=20261027-solvane-v1';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// links from content.json: only web, mail and phone links become live (no javascript: / data:); '' when unusable
const safeHref = (s) => {
  const raw = String(s ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, location.href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol) ? languageHref(u.href, i18n.lang) : '';
  } catch { return ''; }
};
const panelLinks = (links) => {
  const items = links.map((l) => ({ l, href: safeHref(l?.url) })).filter((x) => x.href);
  if (!items.length) return '';
  return '<ul>' + items.map(({ l, href }) => {
    const download = typeof l.download === 'string' && new URL(href).origin === location.origin;
    const attrs = download ? `download="${esc(l.download)}"` : 'target="_blank" rel="noopener"';
    return `<li><a href="${esc(href)}" ${attrs}><span>${esc(i18n.pick(l.label))}</span><span aria-hidden="true">${download ? '↓' : '↗'}</span></a></li>`;
  }).join('') + '</ul>';
};
const restoreFocus = (el) => {
  if (el?.isConnected && el.checkVisibility?.({ visibilityProperty: true }) !== false) el.focus({ preventScroll: true });
};
const setLink = (a, url) => {
  const href = safeHref(url);
  a.hidden = !href;
  if (href) a.href = href; else a.removeAttribute('href');
};
const ICON = {
  time: { dawn: 'i-dawn', day: 'i-sun', dusk: 'i-dusk', night: 'i-moon' },
  season: { spring: 'i-sprout', summer: 'i-tree', autumn: 'i-leaf', winter: 'i-flake' },
  weather: { clear: 'i-clear', cloudy: 'i-cloud', rain: 'i-rain', storm: 'i-storm', snow: 'i-snow', fog: 'i-fog', live: 'i-live' },
  lights: { auto: 'i-auto', warm: 'i-bulb', cool: 'i-bulb', off: 'i-off', custom: 'i-bulb' },
};

// surface palettes, interpolated by time of day (0 day … 1 night)
// day accent #9a5a18: 5.2:1 under accent-ink and 5.0:1 as text on the day paper. Accent text that always sits
// on the dark scene chrome uses the fixed --on-scene-accent (styles.css) instead.
const DAY = { ink: [36, 29, 23], soft: [92, 80, 70], paper: [248, 244, 236, 0.95], line: [36, 29, 23, 0.12], accent: [154, 90, 24], accentInk: [255, 248, 238] };
const NIGHT = { ink: [241, 230, 214], soft: [180, 166, 147], paper: [20, 17, 14, 0.94], line: [241, 230, 214, 0.14], accent: [224, 166, 90], accentInk: [27, 23, 20] };
const lerpArr = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgba = (c) => (c.length === 4 ? `rgba(${c.slice(0, 3).map(Math.round).join(',')},${c[3].toFixed(3)})` : `rgb(${c.map(Math.round).join(',')})`);

export class UI {
  constructor(content, handlers) {
    this.c = content;
    this.h = handlers;
    this.toastTimer = 0;
    this.idleTimer = 0;
    this.themeMix = -1;
    this.view = 'home';
    // Capture source labels once; never translate an already-translated label.
    this.labelEntries = [...document.querySelectorAll('[aria-label], [title]')].flatMap(element =>
      ['aria-label', 'title'].filter(name => element.hasAttribute(name)).map(name => ({element, name, en: element.getAttribute(name)})));

    // a keyboard pick (Enter / Space: detail 0) returns focus to the dial button, since the menu hides
    const pickAnd = (fn) => (e) => { e.stopPropagation(); fn(); this.closeDials(e.detail === 0); };
    document.querySelectorAll('[data-season]').forEach((b) => b.addEventListener('click', pickAnd(() => handlers.season(b.dataset.season))));
    document.querySelectorAll('[data-time]').forEach((b) => b.addEventListener('click', pickAnd(() => handlers.time(b.dataset.time))));
    document.querySelectorAll('[data-weather]').forEach((b) => b.addEventListener('click', pickAnd(() => handlers.weather(b.dataset.weather))));
    document.querySelectorAll('[data-lights]').forEach((b) => b.addEventListener('click', pickAnd(() => handlers.lights(b.dataset.lights))));
    document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers[b.dataset.action]?.();
    }));
    document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.dataset.go === 'atmo') { this.atmoOpener = b; this.toggleAtmo(); } else handlers.go(b.dataset.go);
    }));
    // each dial opens its own menu; opening one closes the others
    document.querySelectorAll('.dial').forEach((d) => d.querySelector('.dial-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const open = d.dataset.open !== 'true';
      this.closeDials();
      d.dataset.open = String(open);
      d.querySelector('.dial-btn').setAttribute('aria-expanded', String(open));
      if (open) { this.closePanel(); (d.querySelector('.menu .on') || d.querySelector('.menu button'))?.focus({ preventScroll: true }); }
    }));
    $('atmo').addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => { this.toggleAtmo(false); this.closeDials(); });
    $('prev').addEventListener('click', () => handlers.prev());
    $('next').addEventListener('click', () => handlers.next());
    $('sheet-prev').addEventListener('click', () => handlers.prev());
    $('sheet-next').addEventListener('click', () => handlers.next());
    $('sheet-close').addEventListener('click', () => handlers.go('home'));
    $('back').addEventListener('click', () => handlers.go('home'));
    $('panel-close').addEventListener('click', () => this.closePanel(true));
    this.swipe($('sheet'));
    addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight') handlers.next();
      else if (e.key === 'ArrowLeft') handlers.prev();
      else if (e.key === 'Escape') {
        if (document.querySelector('.dial[data-open="true"]')) this.closeDials(true);
        else if ($('atmo').dataset.open === 'true') this.toggleAtmo(false, true);
        else if ($('panel').dataset.open === 'true') this.closePanel(true);
        else handlers.go('home');
      } else if (e.key === 't' || e.key === 'T') handlers.cycleTime();
      else if (e.key === 'w' || e.key === 'W') handlers.cycleWeather();
      else if (e.key === 's' || e.key === 'S') handlers.cycleSeason();
      else if (e.key === 'l' || e.key === 'L') handlers.cycleLights();
      else if (e.key === 'm' || e.key === 'M') handlers.sound();
      this.poke();
    });
    for (const ev of ['pointermove', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, () => this.poke(), { passive: true });
    this.renderStatic();
  }

  renderStatic() {
    const s = this.c.site;
    const name = i18n.pick(s.name);         // like every text field, the name may be {en, zh}
    $('name').textContent = name;
    $('role').textContent = i18n.pick(s.role);
    const ln = $('loader-name');            // the loader is removed after entering
    if (ln) ln.textContent = name;
    document.title = `${name} · ${i18n.pick(s.role)}`;
    i18n.apply();
    document.querySelector('meta[name="description"]').content = i18n.lang === 'zh'
      ? 'P. ÆVRYX 的个人工作室：AIGC 图像与视频、ComfyUI 与 LoRA 工作流、AI 短剧、程序化影像及 AI 辅助创作。'
      : 'The studio of P. ÆVRYX: AI images and video, ComfyUI and LoRA workflows, short films, procedural visuals and AI-assisted production.';
    const labels = {'Interactive 3D studio':'可交互的 3D 工作室','Sections':'页面导航','Sound':'声音','Sound (M)':'声音（M）','Language':'语言','Atmosphere':'氛围设置','Previous work':'上一个作品','Next work':'下一个作品','Close':'关闭','Work':'作品'};
    for (const entry of this.labelEntries) entry.element.setAttribute(entry.name, i18n.lang === 'zh' ? (labels[entry.en] || entry.en) : entry.en);

    // the plain text version: content.json site.textVersionUrl if set, else the generated text.html
    const textHref = new URL(safeHref(s.textVersionUrl) || 'text.html', location.href);
    if (textHref.origin === location.origin) textHref.searchParams.set('lang', i18n.lang);
    document.querySelectorAll('.text-link').forEach((a) => { a.href = textHref.href; });
    document.querySelectorAll('.portfolio-link').forEach((a) => { a.href = safeHref(a.href); });
    document.querySelectorAll('.lang-btn').forEach((b) => { b.textContent = i18n.lang === 'en' ? '中' : 'EN'; labelLanguageButton(b, i18n.lang); });
    if (this.state) this.setState(this.state);
    if ($('panel').dataset.open === 'true' && this.panelKind) this.openPanel(this.panelKind, this.panelThumbs, true);
  }

  // chrome fades away after 3 s without input on the home view; any input brings it back
  poke() {
    document.body.classList.remove('idle');
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.view === 'home' && $('atmo').dataset.open !== 'true' && $('panel').dataset.open !== 'true' && !this.entering
        && !document.querySelector('.dial[data-open="true"]')) {
        document.body.classList.add('idle');
      }
    }, 3000);
  }

  // closed layers turn visibility: hidden (styles.css), so focus left inside one would drop to <body>;
  // with `refocus` (Esc, keyboard picks, the close button) it goes back to the control that opened the layer
  toggleAtmo(force, refocus = false) {
    const el = $('atmo');
    const open = force ?? el.dataset.open !== 'true';
    const had = !open && el.dataset.open === 'true' && el.contains(document.activeElement);
    el.dataset.open = String(open);
    if (open) this.closePanel();
    else if (refocus && had) restoreFocus(this.atmoOpener);
  }

  closeDials(refocus = false) {
    document.querySelectorAll('.dial').forEach((d) => {
      const btn = d.querySelector('.dial-btn');
      const had = d.dataset.open === 'true' && d.querySelector('.menu')?.contains(document.activeElement);
      d.dataset.open = 'false';
      btn.setAttribute('aria-expanded', 'false');
      if (refocus && had) restoreFocus(btn);
    });
  }

  setState(state) {
    const { season, time, weather, live, lights, sound, view } = state;
    this.state = state;
    this.view = view;
    document.querySelectorAll('[data-season]').forEach((b) => b.classList.toggle('on', b.dataset.season === season));
    document.querySelectorAll('[data-time]').forEach((b) => b.classList.toggle('on', b.dataset.time === time));
    document.querySelectorAll('[data-lights]').forEach((b) => b.classList.toggle('on', b.dataset.lights === lights));
    document.querySelectorAll('[data-weather]').forEach((b) => {
      b.classList.toggle('on', live ? b.dataset.weather === 'live' : b.dataset.weather === weather);
    });
    document.querySelectorAll('[data-action="sound"]').forEach((b) => b.classList.toggle('on', !!sound));
    document.querySelectorAll('.sound-use').forEach((u) => u.setAttribute('href', sound ? '#i-sound' : '#i-mute'));
    const dial = (kind, key, label) => {
      const d = document.querySelector(`.dial[data-kind="${kind}"]`);
      if (!d) return;
      d.querySelector('.dial-icon').setAttribute('href', `#${ICON[kind][key]}`);
      const v = d.querySelector('.dial-v');
      if (v.textContent !== label) {
        v.textContent = label;
        v.classList.remove('flip'); void v.offsetWidth; v.classList.add('flip');
      }
    };
    dial('season', season, i18n.t(`season.${season}`));
    dial('weather', live ? 'live' : weather, (live ? i18n.t('wx.live') + ' · ' : '') + i18n.t(`wx.${weather}`));
    dial('time', time, i18n.t(`time.${time}`));
    dial('lights', lights, i18n.t(`lights.${lights}`));
    const ld = document.querySelector('.dial[data-kind="lights"]');
    if (ld) ld.dataset.mode = lights;
    $('back').hidden = view === 'home';
    for (const id of ['peek-shelf', 'peek-desk']) { const p = $(id); if (p) p.hidden = view !== 'home'; }
    document.body.classList.toggle('view-work', view === 'work');
    $('caption').hidden = false;
    $('caption').classList.toggle('show', view === 'work');
    document.querySelectorAll('.topnav [data-go]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === view)));
  }

  // 0 = day surfaces, 1 = night surfaces, set every frame while the light changes
  setTheme(mix) {
    if (Math.abs(mix - this.themeMix) < 0.004) return;
    this.themeMix = mix;
    const r = document.documentElement.style;
    const k = mix * mix * (3 - 2 * mix);
    const dark = mix >= 0.5;
    r.setProperty('--s-ink', rgba(dark ? NIGHT.ink : DAY.ink));
    r.setProperty('--s-ink-soft', rgba(dark ? NIGHT.soft : DAY.soft));
    r.setProperty('--s-paper', rgba(lerpArr(DAY.paper, NIGHT.paper, dark ? Math.max(k, 0.82) : Math.min(k, 0.18))));
    r.setProperty('--s-line', rgba(dark ? NIGHT.line : DAY.line));
    r.setProperty('--accent', rgba(lerpArr(DAY.accent, NIGHT.accent, k)));
    r.setProperty('--accent-ink', rgba(dark ? NIGHT.accentInk : DAY.accentInk));
    document.body.dataset.theme = mix > 0.5 ? 'night' : 'day';
  }

  caption(work, index, total) {
    if (!work) return;
    const body = $('cap-body');
    const fill = () => {
      $('cap-index').textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}${work.year ? ' · ' + work.year : ''}`;
      $('cap-title').textContent = i18n.pick(work.title);
      $('cap-desc').textContent = i18n.pick(work.description);
      $('cap-tools').textContent = (work.tools || []).join(' · ');
      setLink($('cap-link'), work.link);
    };
    if (!this.captionSet) { fill(); this.captionSet = true; return; }
    body.classList.add('swap');
    setTimeout(() => { fill(); body.classList.remove('swap'); }, 160);
  }

  step(info) {
    $('cap-step').textContent = info.done ? i18n.t('done', { seed: info.seed }) : '';
  }

  // anchored label for the object under the pointer, kept 12 px inside the window
  // (it is centred on x, so near an edge it slides inward instead of running off)
  tag(text, x, y) {
    const t = $('tag');
    if (!text) { t.hidden = true; this.tagKey = null; return; }
    const key = `${text}|${innerWidth}`;
    if (key !== this.tagKey) {              // measure only when the text or the window changes, not every frame
      t.textContent = text;
      t.hidden = false;
      this.tagKey = key;
      this.tagW = t.offsetWidth;
    }
    const m = 12, half = this.tagW / 2;
    x = Math.min(Math.max(x, m + half), innerWidth - m - half);
    t.style.left = `${x}px`; t.style.top = `${y}px`;
    t.hidden = false;
  }

  // first-visit hints: pulsing pins on a few objects and a coach mark on the projector
  hints(pins, coach) {
    const box = $('tags');
    if (!pins) { box.replaceChildren(); $('coach').hidden = true; return; }
    while (box.children.length < pins.length) box.appendChild(Object.assign(document.createElement('i'), { className: 'pin' }));
    while (box.children.length > pins.length) box.lastChild.remove();
    pins.forEach((p, i) => { const el = box.children[i]; el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; el.style.display = p.visible ? '' : 'none'; });
    const c = $('coach');
    if (coach && coach.visible) {
      c.textContent = i18n.t('coach');
      c.style.left = `${coach.x}px`; c.style.top = `${coach.y - 14}px`;
      c.hidden = false;
    } else c.hidden = true;
  }

  toast(text, ms = 2600) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  openPanel(kind, thumbs = [], refresh = false) {
    this.panelKind = kind;
    this.panelThumbs = thumbs;
    const body = $('panel-body');
    const focusedIndex = [...body.querySelectorAll('a, button')].indexOf(document.activeElement);
    const scrollTop = body.scrollTop, panelScrollTop = $('panel').scrollTop;
    const c = this.c;
    const name = i18n.pick(c.site.name);
    let html = '';
    if (kind === 'about') {
      html = `<p class="kicker">${esc(i18n.pick(c.site.role))}</p><h3>${esc(name)}</h3><p>${esc(i18n.pick(c.about))}</p>`
        + panelLinks((c.links || []).filter((l) => l.download));
    } else if (kind === 'contact') {
      html = `<p class="kicker">${esc(name)}</p><h3>${esc(i18n.t('panel.contact'))}</h3>`
        + panelLinks(c.links || []);
    } else if (kind === 'list') {
      const textHref = safeHref(c.site.textVersionUrl);
      html = `<p class="kicker">${esc(name)}</p><h3>${esc(i18n.t('panel.list'))}</h3><div class="works">`
        + c.works.map((w, i) => `<button class="work" data-work="${i}"><img alt="" src="${esc(thumbs[i] || '')}">`
          + `<span>${esc(i18n.pick(w.title))}</span><small>${esc(w.year || '')} · ${esc((w.tools || []).join(', '))}</small></button>`).join('')
        + '</div>'
        + (textHref ? `<ul style="margin-top:14px"><li><a href="${esc(textHref)}" target="_blank" rel="noopener"><span>${esc(i18n.t('nav.list'))} · HTML</span><span>↗</span></a></li></ul>` : '');
    }
    const active = document.activeElement;   // remembered so Esc / Close can hand focus back
    if (!refresh && !$('panel').contains(active)) this.panelOpener = active && active !== document.body ? active : null;
    $('panel-body').innerHTML = html;
    $('panel').dataset.open = 'true';
    if (!refresh) this.toggleAtmo(false);
    $('panel-body').querySelectorAll('[data-work]').forEach((b) => b.addEventListener('click', () => {
      this.closePanel();
      this.h.showWork(Number(b.dataset.work));
    }));
    if (refresh) {
      if (focusedIndex >= 0) body.querySelectorAll('a, button')[focusedIndex]?.focus({preventScroll:true});
      body.scrollTop = scrollTop;
      $('panel').scrollTop = panelScrollTop;
    }
  }

  closePanel(refocus = false) {
    const p = $('panel');
    const had = p.dataset.open === 'true' && p.contains(document.activeElement);
    p.dataset.open = 'false';
    if (refocus && had) restoreFocus(this.panelOpener);
  }

  // Relocalise an open mobile sheet without replacing its media/player.
  updateSheetText(work) {
    $('sheet-title').textContent = i18n.pick(work.title);
    $('sheet-desc').textContent = i18n.pick(work.description);
    setLink($('sheet-link'), work.link);
  }

  // phones: the work opens flat and full-screen over the dimmed room
  openSheet(work, index, total, media) {
    $('sheet-index').textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}${work.year ? ' · ' + work.year : ''}`;
    $('sheet-title').textContent = i18n.pick(work.title);
    $('sheet-desc').textContent = i18n.pick(work.description);
    $('sheet-tools').textContent = (work.tools || []).join(' · ');
    setLink($('sheet-link'), work.link);
    const box = $('sheet-media');
    box.replaceChildren();
    if (media) box.appendChild(media);
    $('sheet').dataset.open = 'true';
  }
  closeSheet() { $('sheet').dataset.open = 'false'; }
  get sheetOpen() { return $('sheet').dataset.open === 'true'; }

  swipe(el) {
    let x0 = null;
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    el.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) (dx < 0 ? this.h.next : this.h.prev)();
    });
  }

  progress(k, text) {
    $('bar').style.width = `${Math.round(k * 100)}%`;
    if (text) $('loader-status').textContent = text;
  }

  // the loader lifts to reveal the dark room; entry buttons sit under the projected title card
  ready(onEnter) {
    $('loader').classList.add('gone');
    setTimeout(() => $('loader').remove(), 1500);
    $('entry').hidden = false;
    this.entering = true;
    const go = (sound) => () => {
      if (!this.entering) return;
      this.entering = false;
      $('entry').hidden = true;
      document.body.classList.remove('booting');
      onEnter(sound);
      this.poke();
    };
    $('enter-sound').addEventListener('click', go(true), { once: true });
    $('enter-quiet').addEventListener('click', go(false), { once: true });
    this.enterFallback = go(false);
  }

  fail(thumbs) {
    $('loader').classList.add('gone');
    document.body.classList.remove('booting');
    this.openPanel('list', thumbs);
    this.toast(i18n.t('ui.nowebgl'), 8000);
  }
}
