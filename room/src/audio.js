// All sound is synthesised with WebAudio: no audio files to download.
export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.musicOn = false;
  }

  // must be called from a user gesture
  start(enabled) {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    this.setEnabled(enabled);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    if (on) this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.15);
    if (this.musicEl) this.musicEl.muted = !on;
  }

  noiseBuffer(kind = 'white', seconds = 3) {
    const n = Math.floor(this.ctx.sampleRate * seconds);
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }

  loop(buffer, filters, gain = 0) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    let node = src;
    for (const f of filters) { node.connect(f); node = f; }
    const g = this.ctx.createGain();
    g.gain.value = gain;
    node.connect(g); g.connect(this.bus);
    src.start(0, Math.random() * buffer.duration);
    g.source = src;
    return g;
  }

  filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }

  build() {
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.bus = c.createGain(); this.bus.connect(this.master);
    this.white = this.noiseBuffer('white');
    this.brown = this.noiseBuffer('brown', 4);
    this.rainHi = this.loop(this.white, [this.filter('highpass', 900), this.filter('lowpass', 7000)]);
    this.rainLo = this.loop(this.brown, [this.filter('lowpass', 700)]);
    const windBp = this.filter('bandpass', 420, 0.8);
    this.wind = this.loop(this.brown, [windBp]);
    this.windBp = windBp;
    this.room = this.loop(this.brown, [this.filter('lowpass', 220)], 0.05);
    this.fan = this.loop(this.white, [this.filter('bandpass', 1300, 0.6)]);
    const hum = c.createOscillator(); hum.frequency.value = 100; hum.type = 'sine';
    this.humGain = c.createGain(); this.humGain.gain.value = 0;
    hum.connect(this.humGain); this.humGain.connect(this.bus); hum.start();
    this.nextDrop = 0;
    this.nextBird = 0;
  }

  // per frame
  update(s, dt) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const set = (g, v) => g.gain.setTargetAtTime(v, t, 0.4);
    set(this.rainHi, s.rain * 0.09 + s.storm * 0.05);
    set(this.rainLo, s.rain * 0.22 + s.storm * 0.2);
    set(this.wind, 0.02 + s.storm * 0.22 + s.snow * 0.1 + s.cloud * 0.03 + s.fog * 0.02);
    this.windBp.frequency.setTargetAtTime(380 + Math.sin(t * 0.21) * 160 + Math.sin(t * 0.07) * 90, t, 0.5);
    set(this.fan, s.projector * 0.012);
    set(this.humGain, s.projector * 0.004);
    // individual drops tapping on the skylight
    if (s.rain > 0.05 && t > this.nextDrop) {
      this.tap(0.03 + Math.random() * 0.05 * s.rain, 2500 + Math.random() * 3500);
      this.nextDrop = t + (0.02 + Math.random() * 0.25) / (0.3 + s.rain);
    }
    // birds on clear days
    if (s.day > 0.6 && s.cloud < 0.4 && s.rain < 0.05 && t > this.nextBird) {
      if (this.nextBird) this.chirp();
      this.nextBird = t + 4 + Math.random() * 9;
    }
  }

  env(node, t, a, peak, d) {
    node.gain.setValueAtTime(0, t);
    node.gain.linearRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  burst(buffer, filters, peak, a, d, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    let node = src;
    for (const f of filters) { node.connect(f); node = f; }
    const g = this.ctx.createGain();
    node.connect(g); g.connect(this.bus);
    this.env(g, t, a, peak, d);
    src.start(t, Math.max(0, Math.random() * (buffer.duration - a - d - 0.1)));
    src.stop(t + a + d + 0.05);
  }

  get live() { return !!(this.ctx && this.enabled); }

  tap(peak, freq) { if (!this.live) return; this.burst(this.white, [this.filter('bandpass', freq, 3)], peak, 0.001, 0.04); }
  click() {
    if (!this.live) return;
    this.burst(this.white, [this.filter('bandpass', 2600, 2)], 0.25, 0.001, 0.03);
    this.burst(this.white, [this.filter('bandpass', 1800, 2)], 0.18, 0.001, 0.04, 0.2);     // slide drops into the gate
    this.tone(80, 0.15, 0.001, 0.08, 'sine', 0.2);
  }
  switchClick() { if (!this.live) return; this.burst(this.white, [this.filter('bandpass', 3200, 4)], 0.3, 0.001, 0.025); }
  thunder(delay) {
    if (!this.live) return;
    this.burst(this.brown, [this.filter('lowpass', 160 + Math.random() * 140)], 0.9, 0.08, 3.5 + Math.random() * 2, delay);
    this.burst(this.white, [this.filter('lowpass', 900)], 0.12, 0.005, 0.5, delay);
  }

  tone(freq, peak, a, d, type = 'sine', when = 0, dest = this.bus, glideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + a + d);
    const g = this.ctx.createGain();
    o.connect(g); g.connect(dest);
    this.env(g, t, a, peak, d);
    o.start(t); o.stop(t + a + d + 0.05);
  }

  chirp() {
    if (!this.live) return;
    const base = 2800 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this.tone(base, 0.025, 0.005, 0.07, 'sine', i * 0.13, this.bus, base * 1.45);
  }

  purr() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.brown;
    const lp = this.filter('lowpass', 380);
    const am = this.ctx.createGain(); am.gain.value = 0;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 26;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG); lfoG.connect(am.gain);
    const out = this.ctx.createGain();
    src.connect(lp); lp.connect(am); am.connect(out); out.connect(this.bus);
    this.env(out, t, 0.3, 1.2, 2.6);
    src.start(t); lfo.start(t); src.stop(t + 3.2); lfo.stop(t + 3.2);
  }

  // ------------------------------------------------ the record player: a user track or a generated lo-fi loop
  toggleMusic(url) {
    if (!this.ctx) return false;
    this.musicOn = !this.musicOn;
    if (url) {
      if (!this.musicEl) {
        this.musicEl = new Audio(url);
        this.musicEl.loop = true;
        this.musicEl.crossOrigin = 'anonymous';
      }
      this.musicEl.muted = !this.enabled;
      if (this.musicOn) this.musicEl.play().catch(() => {}); else this.musicEl.pause();
      return this.musicOn;
    }
    if (this.musicOn) this.startLofi(); else this.stopLofi();
    return this.musicOn;
  }

  startLofi() {
    const c = this.ctx;
    this.mBus = c.createGain(); this.mBus.gain.value = 0.0001;
    const lp = this.filter('lowpass', 1800, 0.5);
    this.mBus.connect(lp); lp.connect(this.bus);
    this.mBus.gain.setTargetAtTime(0.5, c.currentTime, 0.6);
    this.crackle = this.loop(this.white, [this.filter('highpass', 3000)], 0.004);
    const bpm = 74, beat = 60 / bpm;
    // Fmaj9 – Em7 – Dm9 – Cmaj7, two bars each
    const chords = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 67], [50, 53, 57, 60, 64], [48, 52, 55, 59, 64]];
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    let next = c.currentTime + 0.1, step = 0;
    const tick = () => {
      while (next < c.currentTime + 0.3) {
        const bar = Math.floor(step / 8), chord = chords[Math.floor(bar / 2) % 4];
        const inBar = step % 8;
        const when = next - c.currentTime + (inBar % 2 ? beat * 0.08 : 0);     // lazy swing
        if (inBar === 0 && bar % 2 === 0) {
          chord.forEach((m, i) => this.tone(hz(m), 0.035, 0.6, beat * 7.5, i ? 'triangle' : 'sine', when, this.mBus));
          this.tone(hz(chord[0] - 12), 0.12, 0.02, beat * 3, 'sine', when, this.mBus);
        }
        if (inBar === 4 && bar % 2 === 1) this.tone(hz(chord[0] - 12), 0.1, 0.02, beat * 3, 'sine', when, this.mBus);
        if (inBar === 0 || inBar === 5) this.tone(110, 0.35, 0.002, 0.25, 'sine', when, this.mBus, 42);
        if (inBar === 2 || inBar === 6) this.burstTo(this.mBus, 0.08, 0.002, 0.12, when, 1800);
        this.burstTo(this.mBus, inBar % 2 ? 0.015 : 0.025, 0.001, 0.04, when, 8000);
        if (Math.random() < 0.18) {
          const m = chord[1 + Math.floor(Math.random() * 4)] + 12;
          this.tone(hz(m), 0.03, 0.01, beat * 1.5, 'sine', when + beat * 0.25, this.mBus);
        }
        next += beat / 2; step++;
      }
    };
    tick();
    this.lofiTimer = setInterval(tick, 60);
  }

  burstTo(dest, peak, a, d, when, hp) {
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource(); src.buffer = this.white;
    const f = this.filter('highpass', hp);
    const g = this.ctx.createGain();
    src.connect(f); f.connect(g); g.connect(dest);
    this.env(g, t, a, peak, d);
    src.start(t, Math.random()); src.stop(t + a + d + 0.05);
  }

  stopLofi() {
    clearInterval(this.lofiTimer);
    if (this.mBus) {
      const g = this.mBus;
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
      setTimeout(() => g.disconnect(), 1500);
    }
    if (this.crackle) {
      const c = this.crackle;
      this.crackle = null;
      c.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(() => { try { c.source.stop(); } catch { /* already stopped */ } c.disconnect(); }, 1500);
    }
  }
}
