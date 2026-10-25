// Season, time of day and weather. Every change runs on one clock with a smootherstep curve, so sky,
// sun, lamps, exposure and interface move together. Time and season live on cycles
// (dawn → day → dusk → night → dawn, spring → … → winter) and tween the short way round.

export const PRESETS = {
  clear: { cloud: 0.05, rain: 0, snow: 0, storm: 0, fog: 0 },
  cloudy: { cloud: 0.62, rain: 0, snow: 0, storm: 0, fog: 0.1 },
  rain: { cloud: 0.86, rain: 0.85, snow: 0, storm: 0, fog: 0.2 },
  storm: { cloud: 1.0, rain: 1.0, snow: 0, storm: 1, fog: 0.25 },
  snow: { cloud: 0.78, rain: 0, snow: 1, storm: 0, fog: 0.25 },
  fog: { cloud: 0.55, rain: 0, snow: 0, storm: 0, fog: 1 },
};
export const TIMES = ['dawn', 'day', 'dusk', 'night'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const smoother = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));

class Tween {
  constructor(v) { this.v = v; this.from = v; this.to = v; this.t = 1; this.dur = 1; }
  go(to, dur) { this.from = this.v; this.to = to; this.t = 0; this.dur = dur; }
  set(v) { this.v = this.from = this.to = v; this.t = 1; }
  step(dt) {
    if (this.t >= 1) return this.v;
    this.t = Math.min(1, this.t + dt / this.dur);
    this.v = this.from + (this.to - this.from) * smoother(this.t);
    return this.v;
  }
}

// position on a 4-step cycle; tweens take the shorter direction (forward on a tie)
class Cycle {
  constructor(keys, idx, perStep, base) {
    this.keys = keys; this.perStep = perStep; this.base = base;
    this.t = new Tween(idx);
  }
  go(name, instant) {
    const target = this.keys.indexOf(name);
    if (target < 0) return;
    const n = this.keys.length;
    const cur = ((this.t.v % n) + n) % n;
    let d = target - cur;
    if (d > n / 2) d -= n;
    if (d <= -n / 2) d += n;
    if (instant) this.t.set(target);
    else { this.t.set(cur); this.t.go(cur + d, this.base + this.perStep * Math.abs(d)); }
  }
  step(dt) { this.t.step(dt); }
  // blend weights for each key, summing to 1
  get weights() {
    const n = this.keys.length;
    const p = ((this.t.v % n) + n) % n;
    const i = Math.floor(p), f = p - i;
    const w = Object.fromEntries(this.keys.map((k) => [k, 0]));
    w[this.keys[i % n]] += 1 - f;
    w[this.keys[(i + 1) % n]] += f;
    return w;
  }
}

export class Climate {
  constructor() {
    this.time = 'day';
    this.season = 'autumn';
    this.weather = 'clear';
    this.live = false;
    this.clock = 0;
    this.timeC = new Cycle(TIMES, 1, 0.6, 1.2);       // one step 1.8 s, two steps 2.4 s
    this.seasonC = new Cycle(SEASONS, 2, 0.4, 1.4);
    this.wxT = Object.fromEntries(Object.keys(PRESETS.clear).map((k) => [k, new Tween(PRESETS.clear[k])]));
    this.wx = { ...PRESETS.clear };
    this.flash = 0;
    this.nextStrike = 5;
    this.strike = null;
    this.onThunder = null;
    this.update(0);
  }

  setTime(name, { instant = false } = {}) {
    if (!TIMES.includes(name)) return;
    this.time = name;
    this.timeC.go(name, instant);
  }

  setSeason(name, { instant = false } = {}) {
    if (!SEASONS.includes(name)) return;
    this.season = name;
    this.seasonC.go(name, instant);
  }

  setWeather(name, { instant = false } = {}) {
    if (!(name in PRESETS)) return;
    this.weather = name;
    for (const [k, t] of Object.entries(this.wxT)) {
      if (instant) t.set(PRESETS[name][k]); else t.go(PRESETS[name][k], 2.0);
    }
  }

  update(dt) {
    this.clock += dt;
    this.timeC.step(dt);
    this.seasonC.step(dt);
    this.times = this.timeC.weights;
    this.seasons = this.seasonC.weights;
    for (const [k, t] of Object.entries(this.wxT)) this.wx[k] = t.step(dt);

    // lightning: two or three flickers, 10 ms attack, 60–120 ms each; thunder follows by "distance"
    this.nextStrike -= dt;
    if (this.wx.storm > 0.5 && this.nextStrike <= 0) {
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      let at = 0;
      const pulses = [];
      for (let i = 0; i < n; i++) {
        const len = 0.06 + Math.random() * 0.06;
        pulses.push([at, len, i === 0 ? 1 : 0.45 + Math.random() * 0.5]);
        at += len + 0.03 + Math.random() * 0.07;
      }
      this.strike = { t0: this.clock, pulses };
      this.nextStrike = 6 + Math.random() * 9;
      this.onThunder?.(0.5 + Math.random() * 2.2);
    }
    let f = 0;
    if (this.strike) {
      const d = this.clock - this.strike.t0;
      for (const [at, len, a] of this.strike.pulses) {
        const x = d - at;
        if (x >= 0 && x < len) f = Math.max(f, a * Math.min(1, x / 0.01) * (1 - x / len) ** 0.6);
      }
      if (d > 1) this.strike = null;
    }
    this.flash = f;
  }

  label(i18n) {
    return [i18n.t(`season.${this.season}`), i18n.t(`wx.${this.weather}`), i18n.t(`time.${this.time}`)].join(' · ');
  }
}

// Weather odds per season, for the window's "surprise me".
const ODDS = {
  spring: { clear: 30, cloudy: 22, rain: 25, storm: 8, fog: 15, snow: 0 },
  summer: { clear: 38, cloudy: 22, rain: 12, storm: 22, fog: 6, snow: 0 },
  autumn: { clear: 26, cloudy: 26, rain: 20, storm: 6, fog: 22, snow: 0 },
  winter: { clear: 22, cloudy: 22, rain: 6, storm: 2, fog: 14, snow: 34 },
};
const pick = (weights) => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [k, w] of Object.entries(weights)) if ((r -= w) <= 0) return k;
  return Object.keys(weights)[0];
};

export function randomAtmosphere(current) {
  for (let i = 0; i < 20; i++) {
    const season = SEASONS[Math.floor(Math.random() * 4)];
    const time = TIMES[Math.floor(Math.random() * 4)];
    const weather = pick(ODDS[season]);
    const same = [season === current.season, time === current.time, weather === current.weather].filter(Boolean).length;
    if (same <= 1) return { season, time, weather };
  }
  return { season: 'winter', time: 'night', weather: 'snow' };
}

// WMO weather codes -> our presets
function fromCode(code) {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain';
}

export function seasonFor(date, lat) {
  const m = date.getMonth();                         // 0 = January
  const north = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][m];
  if (lat >= 0) return north;
  return { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[north];
}

// Fetch the real weather at the site owner's location (no visitor data leaves the browser).
export async function fetchLive(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}`
    + '&current=weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1';
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(res.status);
    const j = await res.json();
    const now = new Date(j.current.time).getTime();
    const near = (s) => Math.abs(new Date(s).getTime() - now) < 50 * 60 * 1000;
    let time = j.current.is_day ? 'day' : 'night';
    if (near(j.daily.sunrise[0])) time = 'dawn';
    else if (near(j.daily.sunset[0])) time = 'dusk';
    return { weather: fromCode(j.current.weather_code), time, season: seasonFor(new Date(j.current.time), loc.lat) };
  } finally {
    clearTimeout(timer);
  }
}

export function localTime() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h >= 5 && h < 7.2) return 'dawn';
  if (h >= 17.5 && h < 19) return 'dusk';
  return h >= 7.2 && h < 17.5 ? 'day' : 'night';
}
