// Post-processing: the room renders into an HDR target, then one chain adds bloom, exposure,
// tone mapping, a per-mood colour grade, vignette and film grain.
import * as THREE from './three.js';

const quadVS = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// dual-filter blur (Marius Bjørge, "Bandwidth-efficient rendering"): cheap and wide
const downFS = /* glsl */`
  uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uPrefilter;
  varying vec2 vUv;
  vec3 pre(vec3 c) {
    float l = max(c.r, max(c.g, c.b));
    float soft = clamp(l - uThreshold + .5, 0., 1.);
    soft = soft * soft * .5;
    float k = max(soft, l - uThreshold) / max(l, 1e-4);
    return c * k;
  }
  void main() {
    vec2 o = uTexel * .5;
    vec3 c = texture2D(tSrc, vUv).rgb * 4.
      + texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb
      + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb;
    c /= 8.;
    if (any(isnan(c)) || any(isinf(c))) c = vec3(0.);           // one bad pixel must not bloom into a blot
    c = min(c, vec3(64.));
    gl_FragColor = vec4(uPrefilter > .5 ? pre(c) : c, 1.);
  }`;

const upFS = /* glsl */`
  uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec2 o = uTexel * .5;
    vec3 c = texture2D(tSrc, vUv + vec2(-o.x * 2., 0.)).rgb + texture2D(tSrc, vUv + vec2(o.x * 2., 0.)).rgb
      + texture2D(tSrc, vUv + vec2(0., -o.y * 2.)).rgb + texture2D(tSrc, vUv + vec2(0., o.y * 2.)).rgb
      + (texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb
      + texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb) * 2.;
    gl_FragColor = vec4(c / 12. + texture2D(tAdd, vUv).rgb, 1.);
  }`;

const compositeFS = /* glsl */`
  uniform sampler2D tScene, tBloom;
  uniform float uBloom, uVignette, uGrain, uTime, uGrade, uSat, uContrast, uAspect;
  uniform vec3 uWB, uShadowTint, uHighTint;
  varying vec2 vUv;
  float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    if (any(isnan(c))) c = vec3(0.);
    c += texture2D(tBloom, vUv).rgb * uBloom;
    c *= mix(vec3(1.), uWB, uGrade);
    c = toneMapping(c);                                   // exposure + Neutral tone curve
    float l = dot(c, vec3(.2126, .7152, .0722));
    c *= mix(vec3(1.), mix(uShadowTint, uHighTint, smoothstep(.08, .6, l)), uGrade);
    c = .18 * pow(max(c, 0.) / .18, vec3(mix(1., uContrast, uGrade)));   // contrast around mid-grey
    l = dot(c, vec3(.2126, .7152, .0722));
    c = mix(vec3(l), c, mix(1., uSat, uGrade));
    vec2 d = vUv - .5; d.x *= uAspect;
    c *= 1. - uVignette * smoothstep(.3, 1.0, length(d) * 1.25);
    gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (h12(gl_FragCoord.xy + fract(uTime * 7.13) * 911.) - .5) * uGrain;
  }`;

export class Post {
  constructor(renderer, { samples = 4 } = {}) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, depthBuffer: false };
    this.scene = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.down = [0, 1, 2, 3, 4].map(() => new THREE.WebGLRenderTarget(1, 1, opts));
    this.up = [0, 1, 2, 3].map(() => new THREE.WebGLRenderTarget(1, 1, opts));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene();
    this.qscene.add(this.quad);
    const raw = { depthTest: false, depthWrite: false, toneMapped: false };
    this.downMat = new THREE.ShaderMaterial({
      ...raw, vertexShader: quadVS, fragmentShader: downFS,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1 }, uPrefilter: { value: 0 } },
    });
    this.upMat = new THREE.ShaderMaterial({
      ...raw, vertexShader: quadVS, fragmentShader: upFS,
      uniforms: { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } },
    });
    this.u = {
      tScene: { value: this.scene.texture }, tBloom: { value: null },
      uBloom: { value: 0.18 }, uVignette: { value: 0.18 }, uGrain: { value: 0.022 }, uTime: { value: 0 },
      uGrade: { value: 1 }, uSat: { value: 1 }, uContrast: { value: 1.05 }, uAspect: { value: 1 },
      uWB: { value: new THREE.Vector3(1, 1, 1) },
      uShadowTint: { value: new THREE.Vector3(1, 1, 1) }, uHighTint: { value: new THREE.Vector3(1, 1, 1) },
    };
    this.composite = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, vertexShader: quadVS, fragmentShader: compositeFS, uniforms: this.u,
    });
    this.threshold = 1.0;
  }

  setSize(w, h) {
    this.scene.setSize(w, h);
    let cw = Math.max(1, w >> 1), ch = Math.max(1, h >> 1);
    for (let i = 0; i < this.down.length; i++) {
      this.down[i].setSize(cw, ch);
      if (i < this.up.length) this.up[i].setSize(cw, ch);
      cw = Math.max(1, cw >> 1); ch = Math.max(1, ch >> 1);
    }
    this.u.uAspect.value = w / Math.max(1, h);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.qscene, this.cam);
  }

  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.scene);
    r.render(scene, camera);
    // bloom: prefiltered downsample chain, then additive upsample back to half resolution
    const dm = this.downMat.uniforms;
    let src = this.scene.texture;
    for (let i = 0; i < this.down.length; i++) {
      const t = this.down[i];
      dm.tSrc.value = src;
      dm.uTexel.value.set(1 / (i === 0 ? this.scene.width : this.down[i - 1].width), 1 / (i === 0 ? this.scene.height : this.down[i - 1].height));
      dm.uPrefilter.value = i === 0 ? 1 : 0;
      dm.uThreshold.value = this.threshold;
      this.pass(this.downMat, t);
      src = t.texture;
    }
    const um = this.upMat.uniforms;
    let low = this.down[this.down.length - 1];
    for (let i = this.up.length - 1; i >= 0; i--) {
      um.tSrc.value = low.texture;
      um.tAdd.value = this.down[i].texture;
      um.uTexel.value.set(1 / low.width, 1 / low.height);
      this.pass(this.upMat, this.up[i]);
      low = this.up[i];
    }
    this.u.tBloom.value = this.up[0].texture;
    this.pass(this.composite, null);
  }
}

// Per-mood grade, blended by the same weights as the light.
const G = {
  dawn: { wb: [0.99, 0.97, 1.04], sh: [0.95, 0.96, 1.07], hi: [1.04, 0.98, 1.0], sat: 0.96, con: 1.04, vig: 0.2 },
  day: { wb: [1.0, 1.0, 1.015], sh: [0.99, 1.0, 1.02], hi: [1.02, 1.0, 0.98], sat: 1.04, con: 1.06, vig: 0.14 },
  dusk: { wb: [1.03, 0.995, 0.95], sh: [0.95, 0.97, 1.05], hi: [1.04, 0.99, 0.93], sat: 1.06, con: 1.08, vig: 0.2 },
  night: { wb: [1.0, 0.98, 1.0], sh: [0.9, 0.98, 1.1], hi: [1.06, 0.99, 0.9], sat: 0.95, con: 1.12, vig: 0.28 },
  wet: { wb: [0.95, 0.99, 1.06], sh: [0.94, 0.99, 1.06], hi: [0.99, 1.0, 1.02], sat: 0.84, con: 1.02, vig: 0.2 },
  snow: { wb: [0.97, 1.0, 1.04], sh: [0.95, 1.0, 1.05], hi: [1.0, 1.0, 1.0], sat: 0.9, con: 1.0, vig: 0.16 },
  fog: { wb: [1.0, 1.0, 1.0], sh: [1.0, 1.0, 1.0], hi: [1.0, 1.0, 1.0], sat: 0.86, con: 0.92, vig: 0.12 },
};
// seasons nudge the result rather than replace it
const S = {
  spring: { wb: [0.995, 1.01, 0.99], sat: 1.04 },
  summer: { wb: [1.02, 1.0, 0.97], sat: 1.05 },
  autumn: { wb: [1.035, 1.0, 0.93], sat: 1.06 },
  winter: { wb: [0.96, 0.99, 1.05], sat: 0.88 },
};

export function gradeFor({ times, seasons, wx, screening }) {
  const keys = ['wb', 'sh', 'hi', 'sat', 'con', 'vig'];
  const out = {};
  for (const k of keys) {
    if (Array.isArray(G.day[k])) out[k] = [0, 1, 2].map((i) => Object.entries(times).reduce((a, [t, w]) => a + G[t][k][i] * w, 0));
    else out[k] = Object.entries(times).reduce((a, [t, w]) => a + G[t][k] * w, 0);
  }
  const blend = (g, k) => {
    for (const key of keys) {
      if (Array.isArray(out[key])) out[key] = out[key].map((v, i) => v + (g[key][i] - v) * k);
      else out[key] += (g[key] - out[key]) * k;
    }
  };
  blend(G.wet, Math.min(1, wx.rain * 0.8 + wx.storm * 0.4));
  blend(G.snow, wx.snow * 0.7);
  blend(G.fog, wx.fog * 0.7);
  const sw = [0, 1, 2].map((i) => Object.entries(seasons).reduce((a, [n, w]) => a + S[n].wb[i] * w, 0));
  out.wb = out.wb.map((v, i) => v * sw[i]);
  out.sat *= Object.entries(seasons).reduce((a, [n, w]) => a + S[n].sat * w, 0);
  out.amount = 1 - 0.85 * screening;        // the work is shown as it is, not graded
  return out;
}
