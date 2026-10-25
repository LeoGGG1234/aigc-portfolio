// Camera: named views, flights that start on the first frame (ease-out, slerped orientation,
// a small arc), a little parallax on the home view, and drag-to-look that stays where you leave it.
import * as THREE from './three.js';

const easeOut = (t) => 1 - Math.pow(1 - t, 5);
const UP = new THREE.Vector3(0, 1, 0);

function lookQuat(pos, target) {
  const m = new THREE.Matrix4().lookAt(pos, target, UP);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export class CameraRig {
  constructor(camera, dom, views) {
    this.camera = camera;
    this.dom = dom;
    this.views = Object.fromEntries(Object.entries(views).map(([k, v]) => [k, {
      pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.target), base: new THREE.Vector3(...v.pos),
    }]));
    this.portrait = false;
    this.view = 'home';
    const v = this.resolve('home');
    this.pos = v.pos.clone();
    this.quat = lookQuat(v.pos, v.target);
    this.flight = 1;
    this.dur = 0.95;
    this.yaw = 0; this.pitch = 0;          // drag offsets (radians), kept until the view changes
    this.pYaw = 0; this.pPitch = 0;        // pointer parallax
    this.mouse = new THREE.Vector2();
    this.dragging = false;
    this.moved = 0;
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.listeners();
  }

  resolve(name) {
    if (name === 'home' && this.portrait && this.views.home_portrait) return this.views.home_portrait;
    return this.views[name] || this.views.home;
  }

  listeners() {
    const el = this.dom;
    let last = null;
    el.addEventListener('pointerdown', (e) => {
      this.dragging = true; this.moved = 0; last = [e.clientX, e.clientY];
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      this.mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      if (!this.dragging || !last) return;
      const dx = e.clientX - last[0], dy = e.clientY - last[1];
      this.moved += Math.abs(dx) + Math.abs(dy);
      last = [e.clientX, e.clientY];
      const k = 1.8 / Math.max(innerHeight, 400);
      this.yaw = Math.max(-0.8, Math.min(0.8, this.yaw + dx * k));
      this.pitch = Math.max(-0.45, Math.min(0.4, this.pitch + dy * k));
    });
    const up = () => { this.dragging = false; last = null; };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  get wasDrag() { return this.moved > 6; }

  // On narrow screens, close-up views step back so their subject still fits across the width.
  fit(hfov, portrait) {
    this.portrait = portrait;
    const k = THREE.MathUtils.clamp(Math.tan(THREE.MathUtils.degToRad(28)) / Math.tan(hfov / 2), 1, 1.8);
    for (const [name, v] of Object.entries(this.views)) {
      if (name === 'home' || name === 'home_portrait') continue;
      v.pos.copy(v.target).addScaledVector(v.base.clone().sub(v.target), k);
    }
  }

  go(name, { duration } = {}) {
    if (!this.views[name] && name !== 'home') return;
    this.from = { pos: this.pos.clone(), quat: this.quat.clone() };
    this.view = name;
    this.flight = 0;
    const d = this.from.pos.distanceTo(this.resolve(name).pos);
    this.dur = this.still ? 0.25 : duration ?? THREE.MathUtils.clamp(0.7 + d * 0.12, 0.8, 1.2);
    this.yaw = 0; this.pitch = 0;
  }

  update(dt) {
    const v = this.resolve(this.view);
    const goalQ = lookQuat(v.pos, v.target);
    if (this.flight < 1) {
      this.flight = Math.min(1, this.flight + dt / this.dur);
      const k = easeOut(this.flight);
      this.pos.lerpVectors(this.from.pos, v.pos, k);
      // a shallow arc, like a person stepping rather than a camera on rails
      this.pos.y += Math.sin(Math.PI * k) * Math.min(0.14, this.from.pos.distanceTo(v.pos) * 0.05);
      this.quat.slerpQuaternions(this.from.quat, goalQ, k);
    } else {
      this.pos.copy(v.pos);
      this.quat.copy(goalQ);
    }
    const par = this.still || this.view !== 'home' ? 0 : 1;
    this.pYaw += (-this.mouse.x * 0.03 * par - this.pYaw) * Math.min(1, dt * 2);
    this.pPitch += (this.mouse.y * 0.02 * par - this.pPitch) * Math.min(1, dt * 2);
    const t = performance.now() / 1000;
    const drift = par ? new THREE.Vector3(Math.sin(t * 0.21) * 0.006, Math.sin(t * 0.33) * 0.004, 0) : new THREE.Vector3();

    const q = this.quat.clone();
    const yawQ = new THREE.Quaternion().setFromAxisAngle(UP, -(this.yaw + this.pYaw));
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(right, -(this.pitch + this.pPitch));
    q.premultiply(pitchQ).premultiply(yawQ);
    this.camera.position.copy(this.pos).add(drift);
    this.camera.quaternion.copy(q);
  }
}

export class Picker {
  constructor(camera, dom, hits) {
    this.camera = camera;
    this.dom = dom;
    this.hits = hits;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
  }
  pick(clientX, clientY) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    return hit ? hit.object.name.replace(/^hit_/, '') : null;
  }
}
