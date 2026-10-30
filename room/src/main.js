import { readLanguage, rememberLanguage, updateLanguageUrl, onLanguageChange } from '../../language.js?v=20261030-lap-video-v1';
import * as THREE from './three.js';
import { GLTFLoader } from './three.js';
import { i18n, loadContent, placeholderCanvas } from './content.js';
import { LightMixer } from './lightmix.js';
import { glassMaterial, outsideUniforms } from './outside.js';
import { Projector } from './projector.js';
import { Monitors, FairyGlow, DustBeam, Steam, LightShaft, Blind, quadSampler, setupArt } from './effects.js';
import { Sound } from './audio.js';
import { CameraRig, Picker } from './controls.js';
import { Climate, PRESETS, TIMES, SEASONS, fetchLive, localTime, seasonFor, randomAtmosphere, smoother } from './weather.js';
import { Post, gradeFor } from './post.js';
import { UI } from './ui.js?v=20261022-language-fix-v1';
import { loadEggs } from './eggs/host.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('scene');
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

function thumbnails(content) {
  return content.works.map((w) => {
    if (w.type === 'image' && w.src) return w.src;
    if (w.poster) return w.poster;
    return placeholderCanvas(w.seed, '', 320, 200).toDataURL('image/jpeg', 0.8);
  });
}

// corners of a glTF quad as bottom-left, bottom-right, top-right, top-left (as Blender authored them)
function quadCorners(mesh) {
  const pos = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv;
  const pts = [];
  for (let i = 0; i < pos.count; i++) {
    pts.push({ p: new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld), u: uv.getX(i), v: 1 - uv.getY(i) });
  }
  const at = (u, v) => pts.reduce((b, e) => (Math.hypot(e.u - u, e.v - v) < Math.hypot(b.u - u, b.v - v) ? e : b)).p;
  return [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
}

// the title card projected on the canvas before entering
async function titleCard(content) {
  const c = document.createElement('canvas');
  c.width = 1600; c.height = 1000;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(800, 470, 60, 800, 500, 900);
  grad.addColorStop(0, '#2a2420'); grad.addColorStop(1, '#0d0b0a');
  g.fillStyle = grad; g.fillRect(0, 0, 1600, 1000);
  g.textAlign = 'center';
  // the same system sans as the page text: light for the name, small tracked caps for the role, upright "enter"
  // (Chinese has no italic; a slanted Songti looked broken)
  const SANS = 'system-ui, -apple-system, "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif';
  const zh = i18n.lang === 'zh';
  g.fillStyle = '#f3ead9';
  g.font = `200 128px ${SANS}`;
  g.letterSpacing = '-2px';
  g.fillText(i18n.pick(content.site.name), 800, 478);
  g.fillStyle = 'rgba(243,234,217,.6)';
  g.font = `500 26px ${SANS}`;
  g.letterSpacing = zh ? '6px' : '9px';
  g.fillText(i18n.pick(content.site.role).toUpperCase(), 800, 566);
  g.fillStyle = 'rgba(224,166,90,.9)';
  g.fillRect(756, 636, 88, 2);
  g.fillStyle = 'rgba(243,234,217,.78)';
  g.font = `300 30px ${SANS}`;
  g.letterSpacing = zh ? '6px' : '3px';
  g.fillText(i18n.t('card.enter'), 800, 712);
  g.letterSpacing = '0px';
  return c;
}

async function boot() {
  const content = await loadContent();
  i18n.lang = readLanguage(content.site.defaultLanguage || 'en');

  const H = {};
  const ui = new UI(content, H);
  ui.progress(0.04, i18n.t('ui.loading'));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    ui.fail(thumbnails(content));
    return;
  }
  const mobile = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const post = new Post(renderer, { samples: mobile ? 2 : 4 });

  // ---------------------------------------------------------- assets
  const manifest = await fetch('assets/manifest.json').then((r) => r.json());
  const jobs = [];
  const texLoader = new THREE.TextureLoader();
  let done = 0;
  const bump = () => ui.progress(0.05 + 0.9 * (++done / jobs.length));
  const loadTex = (path, srgb) => {
    const p = texLoader.loadAsync(`assets/${path}`).then((t) => {
      t.flipY = false;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = srgb ? 8 : 2;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      bump();
      return t;
    });
    jobs.push(p);
    return p;
  };
  const texP = {};
  for (const [name, a] of Object.entries(manifest.atlases)) {
    texP[name] = {
      albedo: loadTex(a.albedo, true),
      mask: a.mask ? loadTex(a.mask, false) : null,
      light: Object.fromEntries(Object.entries(a.light).map(([l, e]) => [l, loadTex(e.file, false)])),
    };
  }
  const gltfP = new GLTFLoader().loadAsync('assets/room.glb').then((g) => { bump(); return g; });
  jobs.push(gltfP);
  const cardP = titleCard(content);
  const gltf = await gltfP;
  const tex = {};
  for (const [name, t] of Object.entries(texP)) {
    tex[name] = { albedo: await t.albedo, mask: t.mask ? await t.mask : null, light: {} };
    for (const [l, p] of Object.entries(t.light)) tex[name].light[l] = await p;
  }

  // ---------------------------------------------------------- scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 2000);
  const root = gltf.scene;
  scene.add(root);
  root.updateMatrixWorld(true);

  const mixer = new LightMixer(manifest, tex);
  const blankPicture = new THREE.DataTexture(new Uint8Array([214, 204, 188, 255]), 1, 1);
  blankPicture.colorSpace = THREE.SRGBColorSpace;
  blankPicture.needsUpdate = true;
  const hits = [];
  const placeholders = [];                 // blank picture materials until a module paints the quad (disposed then)
  const dynamic = {};
  const hemi = new THREE.HemisphereLight(0xfff0dc, 0x3b2a1e, 1);
  scene.add(hemi);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.userData.group;
    if (o.name === 'shell' || g === 'shell') o.material = mixer.atlasMaterial('shell');
    else if (o.name === 'props' || g === 'props') o.material = mixer.atlasMaterial('props');
    else if (g === 'glass') {
      const [bl, br, , tl] = quadCorners(o);
      const U = br.clone().sub(bl), V = tl.clone().sub(bl);
      o.material = glassMaterial(o.userData.kind, [U.length(), V.length()], U.normalize().toArray(), V.normalize().toArray());
    } else if (g === 'dynamic') {
      if (o.userData.kind === 'blind') { dynamic.blind = o; return; }
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.userData.color || '#333'), roughness: 0.55 });
      dynamic[o.name] = o;
    } else if (g === 'hit') {
      o.visible = false;
      hits.push(o);
    } else if (g === 'spine' || g === 'pin' || g === 'sleeve') {
      o.material = mixer.pictureMaterial(blankPicture);       // src/eggs/* replace it with their own picture
      placeholders.push({ mesh: o, mat: o.material });
    }
  });
  const anchors = Object.fromEntries(hits.map((h) => {
    h.geometry.computeBoundingBox();
    const b = h.geometry.boundingBox.clone().applyMatrix4(h.matrixWorld);
    const c = b.getCenter(new THREE.Vector3());
    return [h.name.replace(/^hit_/, ''), { center: c, top: new THREE.Vector3(c.x, b.max.y, c.z), box: b }];
  }));
  // optional plates for the window view
  const plates = content.window || {};
  if (plates.day || plates.dusk || plates.night) {
    const load = (src) => (src ? texLoader.loadAsync(src).catch(() => null) : Promise.resolve(null));
    const [d, k, n] = await Promise.all([load(plates.day), load(plates.dusk || plates.day), load(plates.night || plates.dusk || plates.day)]);
    for (const t of [d, k, n]) if (t) t.colorSpace = THREE.SRGBColorSpace;
    const any = d || k || n;
    if (any) {
      outsideUniforms.tPlateDay.value = d || any;
      outsideUniforms.tPlateDusk.value = k || any;
      outsideUniforms.tPlateNight.value = n || any;
      outsideUniforms.uPlates.value = 1;
    }
  }
  const sunDir = (k) => new THREE.Vector3(...manifest.sun_dirs[k]).normalize();
  outsideUniforms.uSunDay.value.copy(sunDir('sunHigh'));
  outsideUniforms.uSunDusk.value.copy(sunDir('sunLow'));

  const projector = new Projector({
    scene, mixer, works: content.works, manifest, root, still,
    onChange: (i) => { ui.caption(content.works[i], i, content.works.length); if (ui.sheetOpen) openSheet(); },
  });
  const monitors = new Monitors(root, content, projector);
  const fairy = new FairyGlow(scene, manifest.fairy_bulbs);
  const art = await setupArt(root, mixer, content.art);
  const blind = new Blind(dynamic.blind);
  const skyQuad = quadCorners(root.getObjectByName('glass_skylight'));
  const winQuad = quadCorners(root.getObjectByName('glass_window'));
  const along = (quad, travel) => {
    const s = quadSampler(quad);
    return (r) => {
      const p = s(r);
      const t = (p.y - 0.02) / Math.max(0.05, -travel.y);
      return p.addScaledVector(travel, t * r());
    };
  };
  const beams = [
    { k: 'sunHigh', d: new DustBeam(scene, along(skyQuad, sunDir('sunHigh').negate()), 160, 0xfff2dc) },
    { k: 'sunLow', d: new DustBeam(scene, along(winQuad, sunDir('sunLow').negate()), 180, 0xffc58a) },
  ];
  const lens = new THREE.Vector3(...manifest.projector_lens);
  const pqs = quadSampler(manifest.projection_quad.map((p) => new THREE.Vector3(...p)));
  beams.push({ k: 'projector', d: new DustBeam(scene, (r) => lens.clone().lerp(pqs(r), 0.05 + 0.9 * r()), 80, 0xffffff) });
  const shafts = [
    { k: 'sunLow', s: new LightShaft(scene, winQuad, sunDir('sunLow').negate(), 5.5, 0xffb070) },
    { k: 'sunHigh', s: new LightShaft(scene, skyQuad, sunDir('sunHigh').negate(), 3.4, 0xfff0d8) },
  ];
  const steam = new Steam(scene, manifest.mug_top);

  projector.setCard(await cardP);

  // ---------------------------------------------------------- state
  const climate = new Climate();
  const sound = new Sound();
  const rig = new CameraRig(camera, canvas, manifest.views);
  const picker = new Picker(camera, canvas, hits);
  const lamp = { level: 0 };
  const desk = { mode: 'auto', override: null, level: 0 };
  // room lighting: auto follows the time of day (warm); warm / cool / off are fixed choices
  const LIGHT = {
    warm: { lamps: new THREE.Color(1.0, 0.62, 0.32), desk: new THREE.Color(1.0, 0.8, 0.56), glow: new THREE.Color(1, 0.68, 0.36) },
    cool: { lamps: new THREE.Color(0.78, 0.87, 1.0), desk: new THREE.Color(0.86, 0.92, 1.0), glow: new THREE.Color(0.74, 0.86, 1.0) },
  };
  const lights = { mode: 'auto', lamps: LIGHT.warm.lamps.clone(), desk: LIGHT.warm.desk.clone(), glow: LIGHT.warm.glow.clone() };
  const scr = { v: 1, from: 1, to: 1, t: 1 };              // screening mode (blind down, room dimmed)
  const setScreening = (on) => { scr.from = scr.v; scr.to = on ? 1 : 0; scr.t = 0; };
  let entered = false;
  let soundOn = false;
  let musicOn = false;
  let narrow = false;
  let seen = store.get('studio.seen') === '1';
  let hintsUntil = 0;
  let clock = 0;
  // easter eggs talk to the room through a small event bus and a few effect requests (src/eggs/CONTRACT.md)
  const bus = new Map();
  const on = (ev, fn) => { if (!bus.has(ev)) bus.set(ev, []); bus.get(ev).push(fn); };
  const emit = (ev, data) => {
    for (const fn of bus.get(ev) || []) { try { fn(data); } catch (e) { console.warn(`[eggs] '${ev}' listener`, e); } }
  };
  const fx = { lampColor: null, fairyChase: 0 };

  const refresh = () => {
    const roomMode = desk.override !== null || desk.mode !== lights.mode ? 'custom' : lights.mode;
    ui.setState({ season: climate.season, time: climate.time, weather: climate.weather, live: climate.live, lights: roomMode, sound: soundOn, view: rig.view });
    emit('state', { season: climate.season, time: climate.time, weather: climate.weather, lights: lights.mode, sound: soundOn, live: climate.live });
  };
  climate.onThunder = (delay) => sound.thunder(delay);

  async function goLive(manual) {
    climate.live = true;
    refresh();
    const loc = content.site.location;
    try {
      const r = await fetchLive(loc);
      if (!climate.live) return;
      climate.setSeason(r.season, { instant: !entered });
      climate.setTime(r.time, { instant: !entered });
      climate.setWeather(r.weather, { instant: !entered });
      if (manual) ui.toast(i18n.t('toast.live', { place: i18n.pick(loc.label), wx: i18n.t(`wx.${r.weather}`) }));
    } catch {
      climate.setSeason(seasonFor(new Date(), loc.lat), { instant: !entered });
      climate.setTime(localTime(), { instant: !entered });
      climate.setWeather('clear', { instant: !entered });
      if (manual) ui.toast(i18n.t('toast.liveFail'));
    }
    refresh();
  }

  function sheetMedia() {
    const e = projector.current;
    if (!e) return null;
    if (e.source instanceof HTMLCanvasElement) {
      const c = document.createElement('canvas');
      c.width = e.source.width; c.height = e.source.height;
      c.getContext('2d').drawImage(e.source, 0, 0);
      return c;
    }
    const img = new Image();
    img.src = e.source.currentSrc || e.source.src;
    img.alt = i18n.pick(content.works[projector.index].title);
    return img;
  }
  function openSheet() {
    const i = projector.index;
    ui.openSheet(content.works[i], i, content.works.length, sheetMedia());
  }

  const wxOrder = Object.keys(PRESETS);
  const nextOf = (list, cur) => list[(list.indexOf(cur) + 1) % list.length];
  function go(view) {
    rig.go(view);
    emit('view', view);
    setScreening(view === 'work');
    if (view === 'work' && narrow) setTimeout(openSheet, still ? 0 : 450);
    if (view !== 'work') ui.closeSheet();
    refresh();
  }
  const dismissHints = () => { if (!seen) { seen = true; store.set('studio.seen', '1'); } hintsUntil = 0; ui.hints(null); };
  Object.assign(H, {
    season: (v) => { climate.live = false; climate.setSeason(v); refresh(); },
    time: (t) => { climate.live = false; climate.setTime(t); refresh(); },
    // The atmosphere menu is a room-wide preset; object clicks keep their own state.
    lights: (m) => { lights.mode = m; desk.mode = m; desk.override = null; sound.switchClick(); refresh(); },
    cycleLights: () => H.lights(nextOf(['auto', 'warm', 'cool', 'off'], lights.mode)),
    weather: (w) => { if (w === 'live') goLive(true); else { climate.live = false; climate.setWeather(w); refresh(); } },
    cycleSeason: () => H.season(nextOf(SEASONS, climate.season)),
    cycleTime: () => H.time(nextOf(TIMES, climate.time)),
    cycleWeather: () => H.weather(nextOf(wxOrder, climate.weather)),
    // the window rolls a plausible season + weather + time
    surprise: () => {
      const r = randomAtmosphere(climate);
      climate.live = false;
      climate.setSeason(r.season); climate.setWeather(r.weather); climate.setTime(r.time);
      sound.switchClick();
      ui.toast(i18n.t('toast.random', { mood: climate.label(i18n) }));
      refresh();
    },
    go: (where) => {
      if (!entered) return;
      dismissHints();
      if (where === 'about') { ui.openPanel('about'); go('desk'); }
      else if (where === 'contact') ui.openPanel('contact');
      else if (where === 'list') ui.openPanel('list', thumbnails(content));
      else go(where);
    },
    next: () => { if (!entered) return; dismissHints(); if (rig.view !== 'work') go('work'); projector.next(); sound.click(); },
    prev: () => { if (!entered) return; dismissHints(); if (rig.view !== 'work') go('work'); projector.prev(); sound.click(); },
    showWork: (i) => { go('work'); projector.show(i); sound.click(); },
    sound: () => { soundOn = !soundOn; sound.start(soundOn); refresh(); },
    lang: () => applyLanguage(i18n.lang === 'en' ? 'zh' : 'en', true),
  });

  function applyLanguage(lang, persist = false) {
    i18n.lang = lang;
    if (persist) rememberLanguage(lang); else updateLanguageUrl(lang);
    ui.renderStatic();
    ui.caption(content.works[projector.index], projector.index, content.works.length);
    if (ui.sheetOpen) ui.updateSheetText(content.works[projector.index]);
    refresh();
    emit('lang', lang);
  }
  onLanguageChange(lang => { if (lang !== i18n.lang) applyLanguage(lang); });

  const toggle = (obj, current) => { obj.override = current > 0.5 ? 0 : 1; sound.switchClick(); refresh(); };
  const cycleLamps = () => {
    lights.mode = { auto: 'cool', warm: 'cool', cool: 'off', off: 'warm' }[lights.mode];
    sound.switchClick();
    refresh();
  };
  const actions = {
    projector: () => { if (rig.view === 'work') H.next(); else H.go('work'); },
    screen: () => H.go('work'),
    monitors: () => H.go('about'),
    desklamp: () => toggle(desk, desk.level),
    // The baked ambient-lamp group cycles without resetting the independent desk lamp.
    floorlamp: cycleLamps,
    fairy: cycleLamps,
    window: () => {
      const sky = ctx.eggs.sky;
      if (sky?.meteorVisible?.()) ui.toast(sky.wish(), 4200);
      else H.surprise();
    },
    skylight: () => H.cycleTime(),
    cat: () => { sound.purr(); ui.toast(i18n.t('toast.cat', { cat: i18n.pick(content.site.catName) })); },
    record: () => {
      if (!soundOn) { soundOn = true; sound.start(true); }
      musicOn = sound.toggleMusic(content.site.music);
      ui.toast(i18n.t(musicOn ? 'toast.music' : 'toast.musicOff'));
      refresh();
    },
    mug: () => ui.toast(i18n.t('toast.mug')),
    pc: () => ui.toast(i18n.t('toast.pc')),
  };

  // ---------------------------------------------------------- easter eggs (src/eggs/*.js)
  const eggStore = {                       // JSON values; plain strings read back as they were written
    get(k) { const v = store.get(k); if (v == null) return null; try { return JSON.parse(v); } catch { return v; } },
    set(k, v) { store.set(k, JSON.stringify(v)); },
  };
  // how the visitor last interacted: overlays opened by a click focus their heading, keyboard opens their first control
  let lastInput = 'pointer';
  addEventListener('pointerdown', () => { lastInput = 'pointer'; }, true);
  addEventListener('keydown', () => { lastInput = 'keyboard'; }, true);
  const ctx = {
    content, i18n, on, emit, fx, climate, H, root, scene, camera, renderer, mixer, sound, params, still,
    lastInput: () => lastInput,
    store: eggStore,
    eggs: {},
    ui: {
      toast: (text, ms) => ui.toast(text, ms),
      openPanel: (kind) => (kind === 'list' ? ui.openPanel('list', thumbnails(content)) : ui.openPanel(kind)),
      closePanel: () => ui.closePanel(),
      poke: () => ui.poke(),
    },
    soundOn: () => soundOn,
    setSound: (want) => { if (!!want !== soundOn) H.sound(); },
    rig: { get view() { return rig.view; }, go: (v) => H.go(v) },
    // the current frame as a JPEG (the canvas is cleared after compositing, so render right before reading)
    capture: (quality = 0.92) => { post.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', quality); },
    // the current frame drawn straight into a 2D canvas (no JPEG encode / decode): a centred square crop, or the
    // whole frame with `square: false`; the long side is `size` px. Render and copy happen in one task.
    captureCanvas: ({ size = 960, square = true } = {}) => {
      post.render(scene, camera);
      const src = renderer.domElement;
      const side = Math.min(src.width, src.height);
      const sw = square ? side : src.width, sh = square ? side : src.height;
      const k = size / Math.max(sw, sh);
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(sw * k)); out.height = Math.max(1, Math.round(sh * k));
      out.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, out.width, out.height);
      return out;
    },
  };
  const eggs = await loadEggs(ctx);
  for (const [k, fn] of Object.entries(eggs.actions)) actions[k] = () => { ui.closePanel(); fn(); };
  // modules see keys first (capture phase) so an open overlay can keep Esc and the arrows to itself
  addEventListener('keydown', (e) => {
    if (!entered) return;
    // typing in a field belongs to that field (the terminal prompt, the diary editor); only Esc is routed
    if (e.key !== 'Escape' && e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (eggs.key(e)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  const eggFrame = { clock: 0, dt: 0, dawn: 0, day: 0, dusk: 0, night: 0, ambient: 1, exposure: 1, view: 'enter', entered: false };
  // touch tolerance: a fingertip is wider than the camera, the notebook or a book spine. On a touch tap, a small
  // target (under 44 px on screen) within 12 px of the tap wins over a miss or a big target behind it (window, shelf).
  const coarse = matchMedia('(pointer: coarse)');
  const RING = [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12], [12, 12], [-12, 12], [12, -12], [-12, -12]];
  const corner = new THREE.Vector3();
  const screenSize = (name) => {           // smaller side of the hit box's on-screen rectangle, in CSS px
    const b = anchors[name]?.box;
    if (!b) return Infinity;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera);
      if (corner.z > 1) return Infinity;
      const x = (corner.x * 0.5 + 0.5) * innerWidth, y = (-corner.y * 0.5 + 0.5) * innerHeight;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return Math.min(x1 - x0, y1 - y0);
  };
  const pickTap = (x, y, touch) => {
    if (!touch) return picker.pick(x, y);
    let exact = null, near = null;
    for (const [dx, dy] of RING) {
      const n = picker.pick(x + dx, y + dy);
      if (!n) continue;
      if (screenSize(n) < 44) return n;  // the first small target, nearest sample first (the exact point is first)
      if (!dx && !dy) exact = n; else near ??= n;
    }
    return exact ?? near;
  };
  canvas.addEventListener('click', (e) => {
    if (!entered) { ui.enterFallback?.(); return; }
    if (rig.wasDrag) return;
    // a click that closes an open dial menu or the atmosphere sheet only closes it (ui.js does that on document)
    if (document.querySelector('.dial[data-open="true"], #atmo[data-open="true"]')) return;
    const name = pickTap(e.clientX, e.clientY, coarse.matches || e.pointerType === 'touch' || e.pointerType === 'pen');
    if (!name) return;
    dismissHints();
    if (name.startsWith('art_')) {
      const a = art.find((x) => `art_${x.slot}` === name);
      ui.toast(i18n.pick(a?.title) || i18n.t('tip.art'));
      return;
    }
    actions[name]?.();
  });
  let hover = null;
  canvas.addEventListener('pointermove', (e) => {
    if (!entered || rig.dragging) { hover = null; return; }
    hover = picker.pick(e.clientX, e.clientY);
    canvas.style.cursor = hover ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerleave', () => { hover = null; });

  // ---------------------------------------------------------- sizing
  let pixelScale = 300;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    post.setSize(size.x, size.y);
    camera.aspect = w / h;
    narrow = w <= 720;
    const portrait = camera.aspect < 0.9;
    // a ~56° film-still frame on landscape; phones get their own portrait framing
    const hfov = THREE.MathUtils.degToRad(56);
    let vfov = 2 * Math.atan(Math.tan(hfov / 2) / camera.aspect);
    vfov = THREE.MathUtils.clamp(vfov, THREE.MathUtils.degToRad(30), THREE.MathUtils.degToRad(76));
    camera.fov = THREE.MathUtils.radToDeg(vfov);
    camera.updateProjectionMatrix();
    pixelScale = size.y / (2 * Math.tan(vfov / 2));
    rig.fit(2 * Math.atan(Math.tan(vfov / 2) * camera.aspect), portrait);
  }
  addEventListener('resize', resize);
  resize();

  // ---------------------------------------------------------- start: dark room, title card on the canvas
  const startTime = params.get('time');
  const startWx = params.get('weather');
  const startSeason = params.get('season');
  climate.setSeason(startSeason || seasonFor(new Date(), content.site.location?.lat ?? 31), { instant: true });
  if (startTime || startWx || startSeason) {
    climate.setTime(startTime || 'night', { instant: true });
    climate.setWeather(startWx || 'clear', { instant: true });
  } else {
    climate.setTime(localTime(), { instant: true });
    goLive(false);
  }
  rig.go('enter', { duration: 0.01 });
  refresh();

  function enter(withSound) {
    entered = true;
    if (withSound) { soundOn = true; sound.start(true); }
    projector.show(0);
    setScreening(false);
    setTimeout(() => {
      const v = params.get('view');
      if (v && v !== 'home') go(v);
      else { rig.go('home', { duration: still ? 0.25 : 1.8 }); refresh(); }
      if (!seen) hintsUntil = clock + 10;
    }, still ? 0 : 900);
    refresh();
  }

  const proj = new THREE.Vector3();
  const toScreen = (v) => {
    proj.copy(v).project(camera);
    return { x: (proj.x * 0.5 + 0.5) * innerWidth, y: (-proj.y * 0.5 + 0.5) * innerHeight, visible: proj.z < 1 && Math.abs(proj.x) < 0.95 && Math.abs(proj.y) < 0.9 };
  };

  let exposure = 1;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);          // first, so one bad frame can't stop the room
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    clock += dt;
    climate.update(dt);
    scr.t = Math.min(1, scr.t + dt / 0.9);
    scr.v = scr.from + (scr.to - scr.from) * smoother(scr.t);
    const screening = scr.v;
    const wx = climate.wx, times = climate.times, seasons = climate.seasons;
    const { dawn, day, dusk, night } = times;
    // lamps come on through the back half of a sunset, the way a person would switch them on;
    // at dawn the desk lamp is already on (someone is up early)
    const autoLamps = clamp01(THREE.MathUtils.smoothstep(night + dusk * 0.55 + dawn * 0.45, 0.3, 0.9)
      + wx.cloud * 0.45 * day + wx.storm * 0.3 + wx.snow * 0.2 * day);
    const autoDesk = clamp01(THREE.MathUtils.smoothstep(night + dawn * 0.9 + dusk * 0.3, 0.3, 0.9) + wx.cloud * 0.3 * day);
    const lampsOn = entered ? 1 : 0;                     // the entry starts with the lamps off
    const wantLamps = { auto: autoLamps, warm: 1, cool: 1, off: 0 }[lights.mode];
    lamp.level += ((wantLamps * lampsOn) - lamp.level) * Math.min(1, dt * (entered ? 2.2 : 8));
    const L = LIGHT[lights.mode === 'cool' ? 'cool' : 'warm'];
    const deskL = LIGHT[desk.mode === 'cool' ? 'cool' : 'warm'];
    const kc = Math.min(1, dt * 3);
    lights.lamps.lerp(fx.lampColor || L.lamps, kc); lights.desk.lerp(deskL.desk, kc); lights.glow.lerp(fx.lampColor || L.glow, kc);
    const wantDesk = desk.override ?? { auto: autoDesk, warm: 1, cool: 1, off: 0 }[desk.mode];
    desk.level += ((wantDesk * lampsOn) - desk.level) * Math.min(1, dt * (entered ? 2.2 : 8));

    mixer.update({ times, seasons, wx, lamps: lamp.level, desk: desk.level, lampTint: lights.lamps, deskTint: lights.desk,
      slideTint: projector.lightLevel, flash: climate.flash, screening, time: clock });
    if (climate.flash < 0.01) exposure += (mixer.exposure - exposure) * Math.min(1, dt * 5);    // frozen during a flash
    renderer.toneMappingExposure = exposure;
    hemi.intensity = 0.25 + mixer.ambient * 0.6;

    outsideUniforms.uTime.value += dt;
    outsideUniforms.uWDawn.value = dawn; outsideUniforms.uWDay.value = day;
    outsideUniforms.uWDusk.value = dusk; outsideUniforms.uWNight.value = night;
    outsideUniforms.uSpring.value = seasons.spring; outsideUniforms.uSummer.value = seasons.summer;
    outsideUniforms.uAutumn.value = seasons.autumn; outsideUniforms.uWinter.value = seasons.winter;
    outsideUniforms.uCloud.value = wx.cloud; outsideUniforms.uRain.value = wx.rain; outsideUniforms.uSnow.value = wx.snow;
    outsideUniforms.uStorm.value = wx.storm; outsideUniforms.uFog.value = wx.fog; outsideUniforms.uFlash.value = climate.flash;
    outsideUniforms.uInterior.value.copy(lights.glow).multiplyScalar(0.05 * lamp.level + 0.02 * desk.level);

    // blind: lit from behind by the sky, from the front by the room
    const sky = mixer.weights.sky;
    const back = new THREE.Color(sky.r, sky.g, sky.b).multiplyScalar(0.55).add(mixer.weights.sunLow.clone().multiplyScalar(0.4));
    const front = new THREE.Color(0.93, 0.89, 0.82).multiplyScalar(0.08 + 0.18 * Math.min(1.5, mixer.ambient));
    blind.update(screening, back, front);

    projector.update(dt, { ambient: mixer.ambient, exposure, screening });
    monitors.setBrightness(1.1 / exposure);
    const info = { ...projector.stepInfo(), weatherLabel: climate.label(i18n) };
    monitors.update(dt, info);
    if (rig.view === 'work') ui.step(info);
    fairy.update(dt, lamp.level * (1 - 0.6 * day), pixelScale, lights.glow, fx.fairyChase);
    for (const b of beams) {
      const level = b.k === 'projector'
        ? projector.uniforms.uOn.value * (0.2 + 0.25 * screening) * Math.max(0, 1.1 - mixer.ambient)
        : mixer.weights[b.k].g * 0.3 * (1 - screening);
      b.d.update(dt, level, pixelScale);
    }
    for (const s of shafts) {
      const w = mixer.weights[s.k];
      s.s.update(dt, (s.k === 'sunLow' ? 0.05 : 0.025) * (w.r + w.g) * 0.5 * (1 - screening) * (1 - wx.fog * 0.6));
    }
    const lit = new THREE.Color(0.5, 0.48, 0.45).multiplyScalar(0.3 + 0.5 * Math.min(1.5, mixer.ambient));
    steam.update(dt, 0.1 + 0.06 * night, pixelScale, lit);
    if (dynamic.record_platter && musicOn) dynamic.record_platter.rotation.y -= dt * 3.49;
    // a module swapped in its own picture material: release the blank one (and its shader program)
    for (let i = placeholders.length - 1; i >= 0; i--) {
      const p = placeholders[i];
      if (p.mesh.material !== p.mat) { p.mat.dispose(); placeholders.splice(i, 1); }
    }

    const g = gradeFor({ times, seasons, wx, screening });
    const u = post.u;
    u.uWB.value.set(...g.wb); u.uShadowTint.value.set(...g.sh); u.uHighTint.value.set(...g.hi);
    u.uSat.value = g.sat; u.uContrast.value = g.con; u.uVignette.value = g.vig; u.uGrade.value = g.amount;
    u.uTime.value = clock;
    u.uBloom.value = 0.16 + 0.1 * night + 0.25 * climate.flash;
    post.threshold = 1.25 / Math.max(0.2, exposure);

    const birds = (day + dawn * 1.3) * (seasons.spring + seasons.summer + 0.4 * seasons.autumn);
    sound.update({ rain: wx.rain, storm: wx.storm, snow: wx.snow, cloud: wx.cloud, fog: wx.fog, day: birds, projector: projector.on ? 1 : 0 }, dt);
    ui.setTheme(clamp01((night + dusk * 0.85 + dawn * 0.7 - 0.2) / 0.6));   // dawn and dusk already use dark surfaces
    rig.update(dt);
    camera.updateMatrixWorld();
    Object.assign(eggFrame, { clock, dt, dawn, day, dusk, night, ambient: mixer.ambient, exposure, view: rig.view, entered });
    eggs.update(dt, eggFrame);

    // labels anchored to objects, and first-visit hints
    if (hover && anchors[hover]) {
      const p = toScreen(anchors[hover].top);
      const key = hover.startsWith('art_') ? 'tip.art' : `tip.${hover}`;
      const text = eggs.tips[hover]?.() || (i18n.t(key) !== key ? i18n.t(key) : null);
      ui.tag(text, p.x, p.y);
    } else ui.tag(null);
    if (hintsUntil > clock && rig.view === 'home') {
      const pins = ['window', 'floorlamp', 'cat'].filter((k) => anchors[k]).map((k) => toScreen(anchors[k].center));
      const c = anchors.screen ? toScreen(anchors.screen.top) : null;
      ui.hints(pins, c);
    } else if (hintsUntil) { hintsUntil = 0; ui.hints(null); }

    post.render(scene, camera);
  }

  ui.progress(1);
  // warm the shader variants real frames use: every frame renders into post's HDR target (linear output, the
  // tone curve is applied by post), so compiling against the canvas would build programs no frame ever binds
  renderer.setRenderTarget(post.scene);
  renderer.compile(scene, camera);
  renderer.setRenderTarget(null);
  requestAnimationFrame(frame);
  setTimeout(() => {
    ui.ready(enter);
    if (params.has('auto')) document.getElementById('enter-quiet').click();
  }, 120);
  window.__studio = { climate, projector, mixer, rig, renderer, H, actions, sound, post, ui, ctx, eggs };
}

boot().catch((e) => {
  console.error(e);
  const s = document.getElementById('loader-status');
  if (s) s.textContent = 'Something went wrong: ' + e.message;
});
