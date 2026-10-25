// Slide projector: carousel, beam, and the canvas where each work resolves out of latent noise.
import * as THREE from './three.js';
import { i18n, placeholderCanvas } from './content.js';

// Changeover, like a slide projector between frames: the old frame dims and slips in the gate,
// a swell of bare lamp light, then as the light fades the new frame develops: a sepia negative that
// turns positive, colour arriving last, focus pulling in. Fast flicking and reduced motion get a plain
// cross-fade (never a strobe).
const T_CLOSE = 0.2;
const T_FLASH = 0.18;
const T_OPEN = 0.75;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const T_X = 0.18;
const SLOTS = 40;

const pictureFrag = /* glsl */`
  uniform sampler2D tPrev, tWeave;
  uniform float uX, uShowPrev, uOn, uIntensity, uLodMax, uLodPrev, uQuadAspect, uImgAspect, uPrevAspect,
    uBright, uWhite, uLod, uWarm, uInvert, uSat;
  uniform vec2 uOffset;
  uniform vec3 uCloth;
  vec2 fitUv(vec2 uv, float ia) {
    vec2 s = ia > uQuadAspect ? vec2(1., uQuadAspect / ia) : vec2(ia / uQuadAspect, 1.);
    return (uv - .5) / s + .5;
  }
  float inside(vec2 u) {
    vec2 e = smoothstep(vec2(0.), vec2(.004), u) * smoothstep(vec2(0.), vec2(.004), 1. - u);
    return e.x * e.y;
  }
  vec3 frame(sampler2D t, vec2 u, float lod) { return textureLod(t, clamp(u, 0., 1.), lod).rgb * inside(u); }
  vec3 picture(vec2 uv, vec3 light) {
    vec2 g = uv + uOffset;                                // gate weave
    vec2 iu = fitUv(g, uImgAspect), pu = fitUv(g, uPrevAspect);
    vec3 col;
    if (uX < 1.) col = mix(frame(tPrev, pu, 0.), frame(tMap, iu, 0.), uX);
    else if (uShowPrev > .5) col = frame(tPrev, pu, min(uLod, uLodPrev));
    else col = frame(tMap, iu, min(uLod, uLodMax));
    // developing: grey first, a sepia negative that flips to positive, colour last
    float l = dot(col, vec3(.2126, .7152, .0722));
    col = mix(vec3(l), col, uSat);
    vec3 neg = (vec3(1.) - clamp(col, 0., 1.)) * vec3(.86, .74, .58);   // amber like a film negative
    col = mix(col, neg, uInvert);
    // the bare lamp with no slide in the gate lights the whole frame, letterbox included
    vec3 lamp = vec3(1.0, .93, .82) * 1.6;
    col = mix(col * uBright, lamp, uWhite);
    col *= mix(vec3(1.), vec3(1.1, .97, .82), uWarm);
    vec2 c = (uv - .5) * vec2(uQuadAspect, 1.);
    float hot = mix(.7, 1.06, 1. - smoothstep(.12, .95, length(c)));
    float weave = .975 + .05 * texture2D(tWeave, uv * vec2(46. * uQuadAspect, 46.)).r;
    vec3 proj = col * uOn * uIntensity * hot * weave;
    return uCloth * light * weave * (1. - .8 * uOn) + proj;
  }
`;

function weaveTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const img = g.createImageData(32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const over = ((x >> 1) + (y >> 1)) % 2;
      const thread = over ? 0.5 + 0.5 * Math.cos((y % 2) * Math.PI) : 0.5 + 0.5 * Math.cos((x % 2) * Math.PI);
      const v = Math.round(255 * (0.35 + 0.45 * thread + 0.2 * Math.random()));
      const i = (y * 32 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

export class Projector {
  constructor({ scene, mixer, works, manifest, root, onChange, still = false }) {
    this.works = works;
    this.index = 0;
    this.on = true;
    this.onChange = onChange;
    this.still = still;
    this.tint = new THREE.Color(0.8, 0.8, 0.8);
    this.textures = new Map();
    this.time = 0;
    this.lastShow = -10;
    this.phase = 'idle';
    this.pt = 0;

    const quadMesh = root.getObjectByName('projection');
    const q = manifest.projection_quad.map((p) => new THREE.Vector3(...p));
    const qw = q[0].distanceTo(q[1]);
    const qh = q[0].distanceTo(q[3]);
    this.uniforms = {
      tPrev: { value: null }, tWeave: { value: weaveTexture() },
      uX: { value: 1 }, uShowPrev: { value: 0 },
      uOn: { value: 1 }, uIntensity: { value: 1.2 }, uLodMax: { value: 7 }, uLodPrev: { value: 7 },
      uQuadAspect: { value: qw / qh }, uImgAspect: { value: 1.6 }, uPrevAspect: { value: 1.6 },
      uBright: { value: 1 }, uWhite: { value: 0 }, uLod: { value: 0 }, uWarm: { value: 0 }, uInvert: { value: 0 }, uSat: { value: 1 },
      uOffset: { value: new THREE.Vector2() },
      uCloth: { value: new THREE.Color(0.86, 0.86, 0.85) },
    };
    this.boost = 1;
    this.material = mixer.pictureMaterial(null, { extraUniforms: this.uniforms, extraFrag: pictureFrag });
    quadMesh.material = this.material;

    // beam: four faces from the lens to the corners of the picture
    const lens = new THREE.Vector3(...manifest.projector_lens);
    const pos = [];
    const tt = [];
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      pos.push(...lens.toArray(), ...a.toArray(), ...b.toArray());
      tt.push(0, 1, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
    this.beamUniforms = { uStrength: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color() } };
    this.beam = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: this.beamUniforms,
      vertexShader: /* glsl */`
        attribute float aT; varying float vT; varying vec3 vW;
        void main() { vT = aT; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uStrength, uTime; uniform vec3 uColor; varying float vT; varying vec3 vW;
        float h(vec3 p) { p = fract(p * .3183 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main() {
          float dust = .55 + .45 * n3(vW * 7. + vec3(0., uTime * .12, uTime * .04));
          float a = uStrength * dust * (1. - vT * .6) * smoothstep(0., .06, vT);
          gl_FragColor = vec4(uColor * a, 1.);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    }));
    this.beam.frustumCulled = false;
    scene.add(this.beam);

    this.carousel = root.getObjectByName('carousel');
    this.carouselAngle = 0;
    this.carouselTarget = 0;

    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = this.sampleCanvas.height = 8;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
  }

  prepare(tex, aspect, source, video = false) {
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (!video) {
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
    }
    return { tex, aspect, source, video };
  }

  textureFor(i) {
    if (this.textures.has(i)) return Promise.resolve(this.textures.get(i));
    const w = this.works[i];
    const keep = (e) => { this.textures.set(i, e); return e; };
    // Browsing a work is a still preview. Video is opened separately by the work link.
    const previewSrc = w.type === 'video' ? w.poster : w.src;
    if (!previewSrc) {
      const cv = placeholderCanvas(w.seed, i18n.pick(w.title), 1024, 640);
      return Promise.resolve(keep(this.prepare(new THREE.CanvasTexture(cv), 1.6, cv)));
    }
    return new THREE.TextureLoader().loadAsync(previewSrc).then((tex) =>
      keep(this.prepare(tex, tex.image.width / tex.image.height, tex.image)));
  }

  // a title card shown before entering (no reveal)
  setCard(canvas) {
    const e = this.prepare(new THREE.CanvasTexture(canvas), canvas.width / canvas.height, canvas);
    this.current = e;
    this.cardShowing = true;
    const u = this.uniforms;
    this.material.uniforms.tMap.value = e.tex;
    u.uImgAspect.value = e.aspect;
    u.uLodMax.value = 7;
    this.settle();
    this.sampleTint();
  }

  settle() {
    const u = this.uniforms;
    this.phase = 'idle';
    u.uShowPrev.value = 0; u.uX.value = 1; u.uBright.value = 1; u.uWhite.value = 0; u.uLod.value = 0; u.uWarm.value = 0;
    u.uInvert.value = 0; u.uSat.value = 1;
    u.uOffset.value.set(0, 0);
    this.boost = 1;
  }

  async show(i, { instant = false } = {}) {
    const n = this.works.length;
    if (!n) return;
    const prevIndex = this.index;
    this.index = ((i % n) + n) % n;
    let dir = this.cardShowing ? 1 : this.index - prevIndex;
    if (Math.abs(dir) > n / 2) dir -= Math.sign(dir) * n;
    this.carouselTarget += dir * (Math.PI * 2 / SLOTS);
    const quick = this.still || this.time - this.lastShow < 0.6;
    this.lastShow = this.time;
    const entry = await this.textureFor(this.index).catch(() => null);
    if (!entry) return;
    const u = this.uniforms;
    const prev = this.current;
    this.current = entry;
    this.cardShowing = false;
    this.material.uniforms.tMap.value = entry.tex;
    u.uImgAspect.value = entry.aspect;
    u.uLodMax.value = entry.video ? 0 : 7;
    if (prev) {
      u.tPrev.value = prev.tex;
      u.uPrevAspect.value = prev.aspect;
      u.uLodPrev.value = prev.video ? 0 : 7;
    }
    this.settle();
    if (instant || !prev) return this.finish();
    this.pt = 0;
    if (quick) { this.phase = 'cross'; u.uX.value = 0; }
    else { this.phase = 'close'; u.uShowPrev.value = 1; }
    this.finish();
  }

  finish() {
    this.sampleTint();
    this.onChange?.(this.index);
  }

  next() { return this.show(this.index + 1); }
  prev() { return this.show(this.index - 1); }
  toggle() { this.on = !this.on; return this.on; }

  sampleTint() {
    const src = this.current?.source;
    if (!src) return;
    try {
      this.sampleCtx.drawImage(src, 0, 0, 8, 8);
      const d = this.sampleCtx.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2]; }
      const c = new THREE.Color(r / 64 / 255, g / 64 / 255, b / 64 / 255).convertSRGBToLinear();
      const m = Math.max(c.r, c.g, c.b, 1e-3);
      this.targetTint = c.multiplyScalar(0.85 / m).lerp(new THREE.Color(1, 1, 1), 0.35);
    } catch { /* cross-origin media without CORS: keep the last tint */ }
  }

  // overall progress of a changeover, 0..1 (the left monitor's progress bar follows it)
  stepInfo() {
    const total = T_CLOSE + T_FLASH + T_OPEN;
    const before = { close: 0, flash: T_CLOSE, open: T_CLOSE + T_FLASH }[this.phase];
    const p = before === undefined ? 1 : Math.min(1, (before + this.pt) / total);
    return { step: Math.round(p * 20), total: 20, seed: this.works[this.index]?.seed, done: p >= 1 };
  }

  update(dt, { ambient, exposure = 1, screening = 0 }) {
    this.time += dt;
    const u = this.uniforms;
    if (this.phase === 'close') {
      // the old frame dims, slips down in the gate and softens
      this.pt += dt;
      const e = ss(0, 1, this.pt / T_CLOSE);
      u.uBright.value = 1 - 0.88 * e;
      u.uOffset.value.set(0, 0.012 * e);
      u.uLod.value = 1.2 * e;
      this.boost = 1 - 0.5 * e;
      if (this.pt >= T_CLOSE) {
        this.phase = 'flash'; this.pt = 0;
        u.uShowPrev.value = 0; u.uInvert.value = 1; u.uSat.value = 0; u.uOffset.value.set(0, 0);
      }
    } else if (this.phase === 'flash') {
      // the empty gate: bare lamp light swells over the canvas and into the room
      this.pt += dt;
      const w = ss(0, 0.45, this.pt / T_FLASH);
      u.uWhite.value = w; u.uBright.value = 1; u.uLod.value = 2.5; u.uWarm.value = 1;
      this.boost = 0.5 + 1.7 * w;
      if (this.pt >= T_FLASH) { this.phase = 'open'; this.pt = 0; }
    } else if (this.phase === 'open') {
      // the light fades and the frame develops; flicker and weave die away
      this.pt += dt;
      const k = Math.min(1, this.pt / T_OPEN);
      const fade = (1 - k) * (1 - k);
      u.uWhite.value = 1 - ss(0, 0.3, k);          // the lamp clears quickly…
      u.uInvert.value = 1 - ss(0.3, 0.62, k);      // …so the negative is seen, then flips positive
      u.uSat.value = ss(0.55, 0.98, k);            // colour arrives last
      // a short overexposed bloom right after the flip, settling to normal
      u.uBright.value = (1 + 0.5 * ss(0.36, 0.56, k) * (1 - ss(0.56, 0.98, k))) * (1 + 0.04 * Math.sin(this.time * Math.PI * 2 * 16) * fade);
      u.uLod.value = 2.5 * (1 - ss(0.05, 0.7, k));
      u.uWarm.value = 1 - ss(0, 0.85, k);
      u.uOffset.value.set((Math.random() - 0.5) * 0.003 * fade, (Math.random() - 0.5) * 0.004 * fade);
      this.boost = 1 + 1.2 * (1 - ss(0, 0.5, k));
      if (k >= 1) this.settle();
    } else if (this.phase === 'cross') {
      this.pt += dt;
      u.uX.value = Math.min(1, this.pt / T_X);
      if (u.uX.value >= 1) this.settle();
    }
    if (this.current?.video && Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) this.sampleTint();
    if (this.targetTint) this.tint.lerp(this.targetTint, Math.min(1, dt * 3));
    this.carouselAngle += (this.carouselTarget - this.carouselAngle) * Math.min(1, dt * 8);
    if (this.carousel) this.carousel.rotation.y = -this.carouselAngle;

    u.uOn.value += ((this.on ? 1 : 0) - u.uOn.value) * Math.min(1, dt * 6);
    // the projection is shown at its own brightness, independent of the room exposure
    u.uIntensity.value = 1.0 / exposure;
    this.beamUniforms.uStrength.value = u.uOn.value * (0.06 + 0.08 * screening) * Math.max(0, 1.15 - ambient * 0.9);
    this.beamUniforms.uColor.value.copy(this.tint).lerp(new THREE.Color(1, 0.97, 0.9), 0.4);
    this.beamUniforms.uTime.value = this.time;
  }

  // brightness the room gets from the projector (feeds the "projector" light layer)
  get lightLevel() {
    return this.tint.clone().multiplyScalar(this.uniforms.uOn.value * this.boost);
  }
}
