// Small living details: monitors, string-light glow, dust in light beams, coffee steam, framed prints.
import * as THREE from './three.js';
import { i18n, placeholderCanvas } from './content.js';

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,.92)');      // core wide enough to cover the bulb mesh
  r.addColorStop(0.45, 'rgba(255,255,255,.3)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// ---------------------------------------------------------------- monitors
export class Monitors {
  constructor(root, content, projector) {
    this.content = content;
    this.projector = projector;
    this.screens = [0, 1].map((i) => {
      const mesh = root.getObjectByName(`screen_${i}`);
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 604;
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      mat.color.setScalar(1.4);
      if (mesh) mesh.material = mat;
      return { mesh, canvas, ctx: canvas.getContext('2d'), tex, mat };
    });
    this.acc = 0;
    this.t = 0;
    this.nodes = (content.monitor && content.monitor.nodes) || ['Load', 'Encode', 'KSampler', 'Decode', 'Save'];
  }

  setBrightness(k) { for (const s of this.screens) s.mat.color.setScalar(k); }

  update(dt, info) {
    this.t += dt;
    this.acc += dt;
    if (this.acc < 1 / 12) return;
    this.acc = 0;
    this.drawGraph(this.screens[0], info);
    this.drawAbout(this.screens[1], info);
    for (const s of this.screens) s.tex.needsUpdate = true;
  }

  drawGraph({ ctx: g, canvas }, info) {
    const W = canvas.width, H = canvas.height;
    g.fillStyle = '#1c1d22'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2c33';
    for (let x = 12; x < W; x += 24) for (let y = 40; y < H; y += 24) g.fillRect(x, y, 2, 2);
    g.fillStyle = '#121317'; g.fillRect(0, 0, W, 30);
    g.fillStyle = '#9aa0ad'; g.font = '15px ui-monospace, Menlo, monospace';
    g.fillText((i18n.lang === 'zh' ? '工作流示意 · 放映切换 ' : 'Workflow study · slide changeover ') + `${info.step || 0}/${info.total || 20}`, 12, 20);
    const n = this.nodes.length;
    const cols = Math.ceil(n / 2);
    const pos = this.nodes.map((_, i) => {
      const row = i < cols ? 0 : 1;
      const col = row === 0 ? i : n - 1 - i;
      return [40 + col * ((W - 260) / Math.max(1, cols - 1)) * 0.92, row === 0 ? 70 : 330];
    });
    const nw = 190, nh = 150;
    g.lineWidth = 3;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = pos[i], [x1, y1] = pos[i + 1];
      const ax = x0 + nw, ay = y0 + 60, bx = x1, by = y1 + 60;
      const back = bx < ax;
      const sx = back ? x0 + nw * 0.5 : ax, sy = back ? y0 + nh : ay;
      const ex = back ? x1 + nw * 0.5 : bx, ey = back ? y1 : by;
      g.strokeStyle = ['#e0a65a', '#7fb4e8', '#b58ce8', '#78c79b'][i % 4];
      g.beginPath(); g.moveTo(sx, sy);
      if (back) g.bezierCurveTo(sx, sy + 80, ex, ey - 80, ex, ey);
      else g.bezierCurveTo(sx + 70, sy, ex - 70, ey, ex, ey);
      g.stroke();
      const k = (this.t * 0.6 + i * 0.17) % 1;
      const px = back ? sx + (ex - sx) * k : sx + (ex - sx) * k;
      const py = back ? sy + (ey - sy) * k : sy + (ey - sy) * (k * k * (3 - 2 * k));
      g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 4, 0, 7); g.fill();
    }
    this.nodes.forEach((name, i) => {
      const [x, y] = pos[i];
      g.fillStyle = '#2d2f37'; roundRect(g, x, y, nw, nh, 10); g.fill();
      g.fillStyle = /sampl/i.test(name) ? '#6b4f9a' : '#3b3f4a'; roundRect(g, x, y, nw, 30, 10); g.fill();
      g.fillRect(x, y + 20, nw, 10);
      g.fillStyle = '#e8e8ee'; g.font = '600 16px ui-sans-serif, -apple-system, sans-serif';
      g.fillText(name, x + 12, y + 21);
      g.fillStyle = '#8a8f9c'; g.font = '13px ui-monospace, Menlo, monospace';
      g.fillText(/sampl/i.test(name) ? 'settings in notes' : 'model', x + 12, y + 56);
      g.fillText(/sampl/i.test(name) ? 'LoRA / prompt test' : 'clip', x + 12, y + 76);
      if (/sampl/i.test(name)) {
        const p = info.done ? 1 : (info.step || 0) / (info.total || 30);
        g.fillStyle = '#1a1b20'; roundRect(g, x + 12, y + 104, nw - 24, 14, 7); g.fill();
        g.fillStyle = '#b58ce8'; roundRect(g, x + 12, y + 104, (nw - 24) * Math.max(0.02, p), 14, 7); g.fill();
      }
    });
    // preview node with the current work
    const src = this.projector.current?.source;
    const px = W - 210, py = 60;
    g.fillStyle = '#2d2f37'; roundRect(g, px, py, 190, 150, 10); g.fill();
    g.fillStyle = '#e8e8ee'; g.font = '600 16px ui-sans-serif, -apple-system, sans-serif';
    g.fillText('Preview', px + 12, py + 21);
    if (src) {
      try { g.drawImage(src, px + 10, py + 32, 170, 106); } catch { /* not ready */ }
    }
  }

  drawAbout({ ctx: g, canvas }, info) {
    const W = canvas.width, H = canvas.height;
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#20232b'); grad.addColorStop(1, '#2b2230');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const c = this.content;
    g.fillStyle = '#f1e6d6';
    g.font = '700 54px ui-sans-serif, -apple-system, "PingFang SC", sans-serif';
    g.fillText(i18n.pick(c.site.name), 56, 110);
    g.fillStyle = '#e0a65a';
    g.font = '26px ui-sans-serif, -apple-system, "PingFang SC", sans-serif';
    g.fillText(i18n.pick(c.site.role), 58, 152);
    g.fillStyle = '#c9bcab';
    g.font = '24px ui-sans-serif, -apple-system, "PingFang SC", sans-serif';
    wrap(g, i18n.pick(c.about), 58, 210, W - 116, 34, 6);
    g.fillStyle = '#8f8576';
    g.font = '20px ui-monospace, Menlo, monospace';
    const now = new Date();
    g.fillText(`${now.toTimeString().slice(0, 5)}  ·  ${info.weatherLabel || ''}`, 58, H - 48);
    const blink = Math.floor(this.t * 2) % 2 ? '▍' : ' ';
    g.fillText('> ' + i18n.pick(c.site.tagline).slice(0, 48) + blink, 58, H - 84);
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function wrap(g, text, x, y, maxW, lh, maxLines) {
  const cjk = /[　-鿿]/.test(text);
  const parts = cjk ? [...text] : text.split(' ');
  let line = '', n = 0;
  for (const p of parts) {
    const test = line + (cjk || !line ? '' : ' ') + p;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y); y += lh; line = p;
      if (++n >= maxLines) return;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
}

// ---------------------------------------------------------------- glow sprites for the string lights
export class FairyGlow {
  constructor(scene, bulbs) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(bulbs.flat(), 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(bulbs.map((_, i) => Math.random() * 6.28 + i), 1));
    g.setAttribute('aIndex', new THREE.Float32BufferAttribute(bulbs.map((_, i) => i), 1));
    this.uniforms = { uI: { value: 0 }, uTime: { value: 0 }, uMap: { value: glowTexture() }, uScale: { value: 300 },
      uColor: { value: new THREE.Color(1, 0.68, 0.36) }, uChase: { value: 0 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        attribute float aSeed, aIndex; uniform float uTime, uScale, uChase; varying float vTw; varying vec3 vHue;
        void main() {
          vTw = .95 + .05 * sin(uTime * (.25 + fract(aSeed) * .3) + aSeed) * sin(uTime * .17 + aSeed * 2.3);
          // party mode: a light runs along the strand and each bulb takes its own colour
          float run = pow(.5 + .5 * sin(aIndex * 1.1 - uTime * 7.), 4.);
          vTw = mix(vTw, .25 + 1.5 * run, uChase);
          vHue = clamp(abs(fract(aIndex * .13 + uTime * .08 + vec3(0., .667, .333)) * 6. - 3.) - 1., 0., 1.);
          vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_PointSize = uScale * .1 / -mv.z;             // the glow's core must cover the 28 mm bulb
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uI, uChase; uniform vec3 uColor; varying float vTw; varying vec3 vHue;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).r;
          vec3 c = mix(uColor, mix(vHue, vec3(1.), .25), uChase);
          gl_FragColor = vec4(c * a * uI * vTw, 1.);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  update(dt, level, pixelScale, color, chase = 0) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uChase.value += (chase - this.uniforms.uChase.value) * Math.min(1, dt * 3);
    this.uniforms.uI.value = level * 1.1;
    this.uniforms.uScale.value = pixelScale;
    if (color) this.uniforms.uColor.value.copy(color);
  }
}

// ---------------------------------------------------------------- dust drifting in a beam of light
export class DustBeam {
  // sample(rand) -> THREE.Vector3 inside the beam
  constructor(scene, sample, count, color) {
    const pos = [], seed = [];
    for (let i = 0; i < count; i++) { pos.push(...sample(Math.random).toArray()); seed.push(Math.random() * 100); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    this.uniforms = { uI: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uScale: { value: 300 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        attribute float aSeed; uniform float uTime, uScale; varying float vA;
        void main() {
          vec3 p = position + vec3(sin(uTime * .13 + aSeed) * .06, sin(uTime * .09 + aSeed * 1.7) * .05, cos(uTime * .11 + aSeed) * .06);
          vA = .5 + .5 * sin(uTime * .7 + aSeed * 3.);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp(uScale * (.004 + .003 * fract(aSeed)) / -mv.z, 1., 3.);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform float uI; uniform vec3 uColor; varying float vA;
        void main() { float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .1, d);
          gl_FragColor = vec4(uColor * a * vA * uI, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  update(dt, level, pixelScale) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uI.value = level;
    this.uniforms.uScale.value = pixelScale;
  }
}

export function quadSampler(corners) {
  const [a, b, c, d] = corners;
  return (r) => {
    const u = r(), v = r();
    return a.clone().lerp(b, u).lerp(d.clone().lerp(c, u), v);
  };
}

// ---------------------------------------------------------------- coffee steam
export class Steam {
  constructor(scene, at) {
    const n = 14;
    const pos = [], seed = [];
    for (let i = 0; i < n; i++) { pos.push(...at); seed.push(i / n); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    this.uniforms = { uTime: { value: 0 }, uMap: { value: glowTexture() }, uI: { value: 0.12 }, uScale: { value: 300 },
      uLight: { value: new THREE.Color(0.5, 0.48, 0.45) } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        attribute float aSeed; uniform float uTime, uScale; varying float vA;
        void main() {
          float life = fract(uTime * .22 + aSeed);
          vec3 p = position + vec3(sin(life * 6. + aSeed * 20.) * .015 * life, life * .22, cos(life * 5. + aSeed * 9.) * .012 * life);
          vA = smoothstep(0., .15, life) * (1. - life);
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = uScale * (.035 + life * .09) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uI; uniform vec3 uLight; varying float vA;
        void main() { float a = texture2D(uMap, gl_PointCoord).r; gl_FragColor = vec4(uLight, a * vA * uI); }`,
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  update(dt, level, pixelScale, light) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uI.value = level;
    this.uniforms.uScale.value = pixelScale;
    if (light) this.uniforms.uLight.value.copy(light);
  }
}

// ---------------------------------------------------------------- light shafts through glass
// The glass quad extruded along the light's travel direction, drawn as a faint additive volume.
export class LightShaft {
  constructor(scene, corners, travel, length, color) {
    const far = corners.map((c) => c.clone().addScaledVector(travel, length));
    const pos = [], tt = [], side = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4], c = far[(i + 1) % 4], d = far[i];
      for (const [p, t, e] of [[a, 0, 0], [b, 0, 1], [c, 1, 1], [a, 0, 0], [c, 1, 1], [d, 1, 0]]) {
        pos.push(...p.toArray()); tt.push(t); side.push(e);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
    g.setAttribute('aE', new THREE.Float32BufferAttribute(side, 1));
    this.uniforms = { uI: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } };
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`
        attribute float aT; attribute float aE; varying float vT; varying float vE; varying vec3 vW;
        void main() { vT = aT; vE = aE; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uI, uTime; uniform vec3 uColor; varying float vT; varying float vE; varying vec3 vW;
        float h(vec3 p) { p = fract(p * .3183 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main() {
          float edge = smoothstep(0., .35, vE) * smoothstep(1., .65, vE);         // soft sides
          float body = pow(clamp(1. - vT, 0., 1.), 1.6) * smoothstep(0., .05, vT);
          float haze = .6 + .4 * n3(vW * 2.5 + vec3(uTime * .05, 0., uTime * .03));
          gl_FragColor = vec4(uColor * uI * body * edge * haze, 1.);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(dt, level) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uI.value = level;
    this.mesh.visible = level > 0.001;
  }
}

// ---------------------------------------------------------------- roller blind (screening mode)
export class Blind {
  constructor(mesh) {
    this.mesh = mesh;
    this.level = 0;           // 0 rolled up, 1 down
    this.u = { uBack: { value: new THREE.Color() }, uFront: { value: new THREE.Color() } };
    if (!mesh) return;
    mesh.material = new THREE.ShaderMaterial({
      uniforms: this.u,
      vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: /* glsl */`
        uniform vec3 uBack, uFront; varying vec2 vUv;
        float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
        void main() {
          float weave = .93 + .07 * h12(floor(vUv * vec2(380., 420.)));
          float hem = smoothstep(.0, .012, 1. - vUv.y);             // darker hem bar at the bottom (glTF flips v)
          vec3 c = (uFront + uBack * (.9 + .1 * vUv.y)) * weave * mix(.55, 1., hem);
          gl_FragColor = vec4(c, 1.);
        }`,
      side: THREE.DoubleSide,
    });
    mesh.scale.y = 0.001;
    mesh.visible = false;
  }
  update(level, back, front) {
    if (!this.mesh) return;
    this.level = level;
    this.mesh.scale.y = Math.max(0.001, level);
    this.mesh.visible = level > 0.002;
    this.u.uBack.value.copy(back);
    this.u.uFront.value.copy(front);
  }
}

// ---------------------------------------------------------------- framed prints
const coverFrag = /* glsl */`
  uniform float uImgAspect, uFrameAspect;
  vec3 picture(vec2 uv, vec3 light) {
    vec2 s = uImgAspect > uFrameAspect ? vec2(uFrameAspect / uImgAspect, 1.) : vec2(1., uImgAspect / uFrameAspect);
    vec2 iuv = (uv - .5) * s + .5;
    return texture2D(tMap, iuv).rgb * light;
  }
`;

export async function setupArt(root, mixer, art) {
  const out = [];
  for (let slot = 0; slot < 3; slot++) {
    const mesh = root.getObjectByName(`art_${slot}`);
    if (!mesh) continue;
    mesh.geometry.computeBoundingBox();
    const pos = mesh.geometry.attributes.position;
    const p = (i) => new THREE.Vector3().fromBufferAttribute(pos, i);
    const uvs = mesh.geometry.attributes.uv;
    // frame aspect from the quad's edges in uv order
    let a = 1;
    if (pos.count >= 4) {
      const pts = [0, 1, 2, 3].map(p);
      const byUv = [0, 1, 2, 3].map((i) => [uvs.getX(i), uvs.getY(i), pts[i]]);
      const at = (u, v) => byUv.reduce((best, e) => (Math.hypot(e[0] - u, e[1] - v) < Math.hypot(best[0] - u, best[1] - v) ? e : best))[2];
      a = at(0, 0).distanceTo(at(1, 0)) / Math.max(1e-3, at(0, 0).distanceTo(at(0, 1)));
    }
    const item = art[slot] || {};
    let tex, imgAspect;
    if (item.src) {
      tex = await new THREE.TextureLoader().loadAsync(item.src).catch(() => null);
      if (tex) imgAspect = tex.image.width / tex.image.height;
    }
    if (!tex) {
      const cv = placeholderCanvas(77 + slot * 13, '', 640, Math.round(640 / a));
      tex = new THREE.CanvasTexture(cv);
      imgAspect = a;
    }
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    mesh.material = mixer.pictureMaterial(tex, {
      extraUniforms: { uImgAspect: { value: imgAspect }, uFrameAspect: { value: a } },
      extraFrag: coverFrag,
    });
    out.push({ slot, mesh, title: item.title });
  }
  return out;
}
