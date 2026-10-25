// Mixes the baked light layers. Every visible surface is albedo × Σ weight_i · light_i,
// so time of day, weather and lamp switches are only changes to seven RGB weights.
import * as THREE from './three.js';

export const LAYERS = ['sunHigh', 'sunLow', 'sky', 'lamps', 'desk', 'screen', 'projector'];

// Light that comes in through glass (layers 0–2) carries moving rain shadows when it rains:
// each point is traced back to the window plane and picks up a rivulet pattern there.
const lightGLSL = /* glsl */`
  uniform sampler2D tL0, tL1, tL2, tL3, tL4, tL5, tL6;
  uniform vec3 uW[7];
  uniform float uRainLight, uLTime;
  vec3 L(sampler2D t, vec2 uv) { vec3 s = texture2D(t, uv).rgb; return s * s * s; }
  float rivulets(vec3 wp) {
    float t = max(0., wp.z + 6.16);
    vec2 q = vec2(wp.x, wp.y + .32 * t) * vec2(4.2, .9) / (1. + t * .16);
    float col = floor(q.x);
    float h = fract(sin(col * 91.7) * 4375.85);
    float wob = sin(q.y * 2.3 + col * 1.7 + uLTime * .55) * .2;
    float line = smoothstep(.34, 0., abs(fract(q.x) - .5 - wob));
    float flow = .5 + .5 * sin(q.y * 3.1 - uLTime * (1.4 + h * 1.8) + h * 20.);
    return line * flow * step(.28, h);
  }
  vec3 sumLight(vec2 uv, vec3 wp) {
    vec3 outside = L(tL0, uv) * uW[0] + L(tL1, uv) * uW[1] + L(tL2, uv) * uW[2];
    if (uRainLight > .001) {
      float r = rivulets(wp);
      outside *= 1. - uRainLight * (.5 * r - .18 * r * r * r);
    }
    return outside + L(tL3, uv) * uW[3] + L(tL4, uv) * uW[4] + L(tL5, uv) * uW[5] + L(tL6, uv) * uW[6];
  }
`;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const C = (r, g, b) => new THREE.Color(r, g, b);

const TINT = {
  sunHigh: C(1.0, 0.94, 0.85), sunLow: C(1.0, 0.58, 0.28),
  skyDay: C(0.78, 0.87, 1.0), skyDusk: C(1.0, 0.68, 0.55), skyNight: C(0.42, 0.52, 1.0), skyGrey: C(0.86, 0.88, 0.92),
  lamps: C(1.0, 0.62, 0.32), desk: C(1.0, 0.8, 0.56), screen: C(0.72, 0.8, 1.0), bolt: C(0.78, 0.86, 1.0),
  skyDawn: C(0.78, 0.72, 0.95), dawnSun: C(1.0, 0.66, 0.62),
};
// How strong each layer is at weight 1, relative to its own average brightness. Tuned by eye.
const GAIN = { sunHigh: 1.7, sunLow: 2.2, sky: 1.0, lamps: 0.3, desk: 0.24, screen: 0.1, projector: 0.3 };

export class LightMixer {
  constructor(manifest, tex) {
    this.manifest = manifest;
    this.tex = tex;
    this.norm = {};
    for (const l of LAYERS) {
      const ms = Object.values(manifest.atlases).map((a) => a.light[l].mean).filter((m) => m > 0);
      const mean = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 1;
      this.norm[l] = 1 / Math.max(mean, 1e-6);
    }
    this.shared = { uRainLight: { value: 0 }, uLTime: { value: 0 } };
    this.uniforms = {};
    for (const name of Object.keys(manifest.atlases)) {
      const u = { uW: { value: LAYERS.map(() => new THREE.Vector3()) }, ...this.shared };
      LAYERS.forEach((l, i) => { u[`tL${i}`] = { value: tex[name].light[l] }; });
      this.uniforms[name] = u;
    }
    this.glow = { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] };
    this.weights = Object.fromEntries(LAYERS.map((l) => [l, new THREE.Color(0, 0, 0)]));
    this.exposure = 1;
    this.ambient = 1;
  }

  atlasMaterial(name) {
    const hasMask = !!this.tex[name].mask;
    return new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms[name],
        tAlbedo: { value: this.tex[name].albedo },
        tMask: { value: this.tex[name].mask || null },
        uGlow: this.glow,
      },
      defines: hasMask ? { HAS_MASK: 1 } : {},
      vertexShader: /* glsl */`
        varying vec2 vUv; varying vec3 vW;
        void main() {
          vUv = uv;
          vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        ${lightGLSL}
        uniform sampler2D tAlbedo;
        uniform sampler2D tMask;
        uniform vec3 uGlow[3];
        varying vec2 vUv; varying vec3 vW;
        void main() {
          vec3 col = texture2D(tAlbedo, vUv).rgb * sumLight(vUv, vW);
          #ifdef HAS_MASK
            vec3 m = texture2D(tMask, vUv).rgb;
            col += m.r * uGlow[0] + m.g * uGlow[1] + m.b * uGlow[2];
          #endif
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
  }

  // Picture surfaces (frames, the canvas): an image on uv, lit by the props atlas on uv1.
  pictureMaterial(map, { extraUniforms = {}, extraFrag = '' } = {}) {
    return new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms.props, tMap: { value: map }, ...extraUniforms },
      vertexShader: /* glsl */`
        #ifndef USE_UV1
          attribute vec2 uv1;
        #endif
        varying vec2 vUv; varying vec2 vUv1; varying vec3 vW;
        void main() {
          vUv = uv; vUv1 = uv1;
          vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        ${lightGLSL}
        uniform sampler2D tMap;
        varying vec2 vUv; varying vec2 vUv1; varying vec3 vW;
        ${extraFrag}
        void main() {
          vec3 light = sumLight(vUv1, vW);
          #ifdef CUSTOM_PICTURE
            vec3 col = picture(vUv, light);
          #else
            vec3 col = texture2D(tMap, vUv).rgb * light;
          #endif
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      defines: extraFrag ? { CUSTOM_PICTURE: 1 } : {},
    });
  }

  // s: { times: {dawn, day, dusk, night}, seasons: {spring, summer, autumn, winter}, wx: {cloud, rain, snow, storm, fog},
  //      lamps, desk, slideTint, flash, screening (0..1), time }
  update(s) {
    const { dawn, day, dusk, night } = s.times;
    const se = s.seasons;
    const cloud = s.wx.cloud;
    const sunVis = Math.pow(1 - cloud, 1.6);
    const shut = 1 - 0.82 * s.screening;               // the blind is down for a screening
    const w = this.weights;
    const seasonal = (spring, summer, autumn, winter) => spring * se.spring + summer * se.summer + autumn * se.autumn + winter * se.winter;
    const sunTint = new THREE.Color(seasonal(1, 1, 1, 0.92), seasonal(0.99, 0.97, 0.88, 0.95), seasonal(0.96, 0.9, 0.7, 1.0));
    const sunK = seasonal(1.0, 1.15, 0.95, 0.72);

    // midday sun through the skylight; at dawn only a faint pink wash comes in that way
    w.sunHigh.copy(TINT.sunHigh).multiply(sunTint).multiplyScalar(day * sunVis * shut * sunK)
      .add(TINT.dawnSun.clone().multiplyScalar(dawn * sunVis * shut * 0.18));
    w.sunLow.copy(TINT.sunLow).multiply(sunTint).multiplyScalar(dusk * sunVis * shut * (0.6 + 0.4 * sunK));

    const sky = new THREE.Color().copy(TINT.skyDay).multiplyScalar(day)
      .add(TINT.skyDusk.clone().multiplyScalar(dusk * 0.5))
      .add(TINT.skyDawn.clone().multiplyScalar(dawn * 0.42))
      .add(TINT.skyNight.clone().multiplyScalar(night * 0.022));
    sky.multiply(new THREE.Color(seasonal(0.98, 1, 1, 0.94), seasonal(1, 1, 0.97, 0.97), seasonal(0.98, 1, 0.9, 1.05)));
    sky.lerp(TINT.skyGrey.clone().multiplyScalar(sky.r * 0.3 + sky.g * 0.6 + sky.b * 0.1), cloud * 0.8);
    const skyI = (1 - 0.45 * cloud - 0.2 * s.wx.rain) * (1 + s.wx.snow * 0.35) * (1 - s.wx.storm * 0.4) * shut;
    w.sky.copy(sky).multiplyScalar(skyI);

    // lightning: a hard, cold light through the skylight (that layer has crisp shadows), plus the sky
    if (s.flash > 0) {
      w.sunHigh.add(TINT.bolt.clone().multiplyScalar(s.flash * 3.2));
      w.sky.add(TINT.bolt.clone().multiplyScalar(s.flash * 1.4));
    }

    const dim = 1 - 0.7 * s.screening;
    w.lamps.copy(s.lampTint || TINT.lamps).multiplyScalar(s.lamps * dim);
    w.desk.copy(s.deskTint || TINT.desk).multiplyScalar(s.desk * (1 - 0.5 * s.screening));
    w.screen.copy(TINT.screen);
    w.projector.copy(s.slideTint);

    for (const [name, u] of Object.entries(this.uniforms)) {
      const scales = this.manifest.atlases[name].light;
      LAYERS.forEach((l, i) => {
        const k = GAIN[l] * this.norm[l] * scales[l].scale;
        u.uW.value[i].set(w[l].r * k, w[l].g * k, w[l].b * k);
      });
    }
    this.shared.uRainLight.value = clamp01(s.wx.rain * 1.1) * (day + dusk * 0.7 + dawn * 0.5 + night * 0.2) * shut;
    this.shared.uLTime.value = s.time;
    // shades and bulbs glow in the lamp colour; normalised so warm and cool read equally bright
    const glowOf = (c) => { const m = Math.max(c.r, c.g, c.b, 1e-3); return [c.r / m, c.g / m, c.b / m]; };
    this.glow.value[0].set(...glowOf(s.lampTint || TINT.lamps)).multiplyScalar(2.6 * s.lamps * dim);
    this.glow.value[1].set(...glowOf(s.deskTint || TINT.desk)).multiplyScalar(3.2 * s.desk);
    this.glow.value[2].set(0.55, 0.35, 1.0).multiplyScalar(1.4);

    // exposure: bright rooms pulled down, dark rooms opened up, but night stays darker than day
    const lum = (c) => c.r * 0.25 + c.g * 0.6 + c.b * 0.15;
    const mean = GAIN.sunHigh * lum(w.sunHigh) * 0.5 + GAIN.sunLow * lum(w.sunLow) * 0.5 + GAIN.sky * lum(w.sky)
      + GAIN.lamps * lum(w.lamps) + GAIN.desk * lum(w.desk) + GAIN.projector * lum(w.projector) + GAIN.screen;
    this.ambient = mean;
    const target = Math.min(2.2, Math.max(0.6, 0.9 / Math.pow(Math.max(mean, 0.02), 0.42)));
    this.exposure = target * (1 - 0.32 * night - 0.1 * dawn) * (1 - 0.1 * s.screening);
  }
}
