// The world outside the window and skylight, drawn entirely in the glass shader:
// sky, sun/moon/stars, clouds, three layers of rooftops and towers, rain and snow,
// and what the weather does to the glass itself (drops, running streaks, snow piles).
import * as THREE from './three.js';

export const outsideUniforms = {
  uTime: { value: 0 },
  // time-of-day and season weights (each set sums to 1), fed from the climate every frame
  uWDawn: { value: 0 }, uWDay: { value: 1 }, uWDusk: { value: 0 }, uWNight: { value: 0 },
  uSpring: { value: 0 }, uSummer: { value: 0 }, uAutumn: { value: 1 }, uWinter: { value: 0 },
  uCloud: { value: 0 }, uRain: { value: 0 }, uSnow: { value: 0 }, uStorm: { value: 0 }, uFog: { value: 0 },
  uFlash: { value: 0 },
  uSunDay: { value: new THREE.Vector3(0.6, 0.75, 0.25).normalize() },
  uSunDusk: { value: new THREE.Vector3(0.3, 0.25, -0.92).normalize() },
  uInterior: { value: new THREE.Color(0, 0, 0) },
  uGain: { value: 1.05 },
  // optional photo/AI plates for the view (content.json "window"); 0 = procedural city
  uPlates: { value: 0 },
  tPlateDay: { value: null }, tPlateDusk: { value: null }, tPlateNight: { value: null },
  // one shooting star at a time, driven by eggs/sky.js. uMeteor: xyz = start direction S (unit),
  // w = brightness (0 = no meteor; the shader skips all of it). uMeteorDir: xyz = unit tangent T at S
  // (the way it travels, perpendicular to S), w = angle the head has covered so far (rad).
  // uMeteorTail: x = tail length (rad), y = core half-width (rad), z = fireball tint 0..1.
  uMeteor: { value: new THREE.Vector4(0, 0, 0, 0) },
  uMeteorDir: { value: new THREE.Vector4(0, 0, 0, 0) },
  uMeteorTail: { value: new THREE.Vector4(0.12, 0.001, 0, 0) },
};

const frag = /* glsl */`
uniform float uTime, uCloud, uRain, uSnow, uStorm, uFog, uFlash, uGain, uKind, uPlates;
uniform float uWDawn, uWDay, uWDusk, uWNight, uSpring, uSummer, uAutumn, uWinter;
uniform sampler2D tPlateDay, tPlateDusk, tPlateNight;
uniform vec3 uSunDay, uSunDusk, uInterior, uTanU, uTanV;
uniform vec2 uSize, uLites;
uniform vec4 uMeteor, uMeteorDir, uMeteorTail;
varying vec3 vWorld;
varying vec2 vUv;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= .5; } return s; }

float kDawn() { return uWDawn; }
float kDay() { return uWDay; }
float kDusk() { return uWDusk; }
float kNight() { return uWNight; }

vec3 horizonCol() {
  vec3 h = vec3(.66, .78, .92) * kDay() + vec3(1.0, .56, .34) * kDusk() + vec3(.014, .017, .036) * kNight()
         + vec3(.92, .66, .62) * kDawn();
  vec3 grey = vec3(.6, .63, .68) * kDay() + vec3(.5, .43, .43) * kDusk() + vec3(.025, .028, .036) * kNight()
         + vec3(.55, .5, .56) * kDawn();
  h = mix(h, grey * (1. - uRain * .38 - uStorm * .3), clamp(uCloud * .85 + uFog * .6, 0., 1.));
  return h + vec3(.7, .8, 1.) * uFlash;
}

// a shooting star: the head runs along the great circle P(h) = S cos h + T sin h; a thin trail
// follows it, tapering and cooling from blue-white to amber. Values reach ~4 so the bloom catches it.
vec3 meteor(vec3 rd) {
  vec3 S = uMeteor.xyz, T = uMeteorDir.xyz;
  float fs = dot(rd, S);
  if (fs < .93) return vec3(0.);                      // farther than ~21 deg from the start: nothing
  float along = atan(dot(rd, T), fs);                  // angle along the path
  float across = dot(rd, cross(S, T));                 // angular distance from it
  float head = uMeteorDir.w, w = uMeteorTail.y;
  float tail = max(min(uMeteorTail.x, head), 1e-4);    // the trail never reaches back past S
  float u = head - along;                              // > 0 behind the head
  float k = clamp(u / tail, 0., 1.);
  float wu = w * (1. - .6 * k);                        // thinner towards the end of the trail
  float core = exp(-across * across / (wu * wu));
  float trail = core * smoothstep(-w * 2., w * .5, u) * step(u, tail) * (1. - k) * (1. - k);
  float r2 = u * u + across * across;
  float nose = exp(-r2 / (w * w * 7.));
  float halo = exp(-r2 / (w * w * 60.)) * .25;
  vec3 hot = mix(vec3(.9, .95, 1.), vec3(.72, 1., .82), uMeteorTail.z);   // fireballs burn a little green
  vec3 trailC = mix(vec3(.82, .9, 1.), vec3(1., .74, .5), k);
  return (trailC * trail * 1.5 + hot * (nose * 2.6 + halo)) * uMeteor.w;
}

vec3 sky(vec3 rd) {
  float d = kDay(), k = kDusk(), n = kNight(), a = kDawn();
  vec3 zen = vec3(.2, .4, .8) * d + vec3(.2, .22, .44) * k + vec3(.005, .008, .024) * n + vec3(.2, .26, .5) * a;
  vec3 col = mix(horizonCol(), zen, pow(clamp(rd.y, 0., 1.), .5));
  col += vec3(.09, .045, .02) * n * exp(-max(rd.y, 0.) * 7.) * (1. - uFog * .5);    // city glow
  vec3 sd = normalize(uSunDay * (d + .001) + uSunDusk * k);     // the window faces west: no sun at dawn
  float sunAmt = (d + k) * (1. - uCloud * .92);
  float mu = max(dot(rd, sd), 0.);
  col += vec3(1., .78, .5) * pow(mu, 6.) * .45 * sunAmt * (k + .25);
  col += vec3(1., .92, .78) * smoothstep(.9993, .9997, mu) * 8. * sunAmt;
  vec3 md = normalize(vec3(-.32, .38, -.87));
  float mm = dot(rd, md);
  float clearNight = (n + a * .35) * (1. - uCloud) * (1. - uFog);
  col += vec3(.9, .93, 1.) * smoothstep(.99935, .9996, mm) * 2.2 * clearNight;
  col += vec3(.25, .3, .45) * pow(max(mm, 0.), 40.) * .35 * clearNight;
  if (rd.y > 0.) {
    vec2 sp = rd.xz / (rd.y + .05) * 70.;
    vec2 cell = floor(sp); float hs = hash12(cell);
    float star = step(.988, hs) * smoothstep(.09, .0, length(fract(sp) - .5 - (hash22(cell) - .5) * .6));
    col += vec3(.9, .92, 1.) * star * clearNight * (.55 + .45 * sin(uTime * 2.3 + hs * 50.)) * smoothstep(0., .25, rd.y);
    if (uMeteor.w > 0.) {                              // behind the clouds, dimmed by haze and daylight
      float mVis = clamp((n + a * .6) * (1. - uCloud * .5) * (1. - uFog * .9), 0., 1.) * smoothstep(0., .05, rd.y);
      col += meteor(rd) * mVis;
    }
    vec2 cp = rd.xz / (rd.y + .1) * 1.1 + vec2(uTime * .01, uTime * .0035);
    float c = fbm(cp * 1.4);
    float thr = mix(.66, .08, clamp(uCloud, 0., 1.));
    float cl = smoothstep(thr, thr + .28, c) * smoothstep(0., .12, rd.y);
    vec3 cc = vec3(1.) * d + vec3(1., .66, .5) * k + vec3(.06, .045, .045) * n + vec3(1., .74, .78) * a * .8;
    cc = mix(cc, cc * vec3(.6, .62, .66), uCloud * .8) * (1. - uStorm * .55 - uRain * .3) + vec3(.8, .85, 1.) * uFlash * 2.;
    col = mix(col, cc, cl * .95);
  }
  return mix(col, horizonCol(), uFog * .85);
}

// three depth layers seen through the window; ro/rd in world space, glass plane at z = -6.16
float roofH(float x) {           // near pitched roofs, ~7 m houses
  float s = x / 7.3; float id = floor(s), f = fract(s);
  float base = -4.4 + hash12(vec2(id, 1.)) * 1.8;
  float ridge = base + 1.6 + hash12(vec2(id, 2.)) * 1.6;
  float h = mix(base, ridge, 1. - abs(f * 2. - 1.));
  float ch = step(.55, hash12(vec2(id, 3.))) * (1. - step(.06, abs(f - .28 - .3 * hash12(vec2(id, 4.)))));
  return max(h, mix(-99., ridge + .7, ch));
}
float blockH(float x) {          // mid-rise blocks
  float s = x / 15.; float id = floor(s), f = fract(s);
  float h = -5. + hash12(vec2(id, 5.)) * 11. + step(.85, hash12(vec2(id, 6.))) * 9.;
  return mix(h, -99., step(.94, f));
}
float towerH(float x) {          // far skyline
  float s = x / 34.; float id = floor(s), f = fract(s);
  float h = 14. + pow(hash12(vec2(id, 7.)), 2.2) * 150.;
  float slim = .25 + .6 * hash12(vec2(id, 8.));
  float body = step(abs(f - .5), slim * .5);
  float spire = step(.85, hash12(vec2(id, 9.))) * step(abs(f - .5), .02) * 30.;
  return body > .5 ? h + spire : 6. + hash12(vec2(id, 10.)) * 12.;
}

vec3 windows(vec2 p, vec2 cellSz, float seed, float lit) {
  cellSz *= vec2(.8 + .5 * hash12(vec2(seed, 1.)), .9 + .2 * hash12(vec2(seed, 2.)));
  lit *= .5 + hash12(vec2(seed, 3.));
  vec2 c = floor(p / cellSz); vec2 f = fract(p / cellSz);
  float inside = step(.22, f.x) * step(f.x, .78) * step(.3, f.y) * step(f.y, .82);
  float on = step(1. - lit, hash12(c + seed));
  float k = .35 + .9 * hash12(c + seed + 7.);
  vec3 warm = mix(vec3(1., .66, .34), vec3(.72, .82, 1.), step(.8, hash12(c + seed + 3.)));
  return inside * on * warm * k;
}

// a row of trees between the near roofs and the blocks; the canopy follows the season
vec4 trees(vec3 ro, vec3 rd, vec3 lit, float haze) {
  float t = (-30. - ro.z) / rd.z;
  vec3 p = ro + rd * t;
  float cell = floor(p.x / 5.);
  for (int j = -1; j <= 1; j++) {
    float id = cell + float(j);
    if (hash12(vec2(id, 31.)) < .22) continue;                 // gaps in the row
    float xc = (id + .3 + .4 * hash12(vec2(id, 32.))) * 5.;
    float r = 2.2 + 1.4 * hash12(vec2(id, 33.));
    float top = -1.4 + 3.4 * hash12(vec2(id, 34.));
    float cy = top - r * .85;
    vec2 q = vec2((p.x - xc) / r, (p.y - cy) / (r * .92));
    float v = fbm(p.xy * 2.3 + id * 7.);
    bool trunk = abs(p.x - xc) < .16 + .03 * (cy - p.y) && p.y < cy && p.y > cy - 9.;
    bool crown = length(q) < 1. + (v - .5) * .5;
    if (!crown && !trunk) continue;
    // winter canopies are bare: only a sparse tangle of twigs, the city shows between them
    if (crown && !trunk && v < mix(-1., .6, uWinter)) continue;
    vec3 spring = mix(vec3(.3, .5, .2), vec3(.95, .74, .82), step(.6, v));
    vec3 summer = mix(vec3(.08, .22, .07), vec3(.16, .34, .11), v);
    vec3 autumn = mix(mix(vec3(.62, .22, .06), vec3(.86, .56, .12), v), vec3(.48, .13, .05), step(.72, hash12(vec2(id, 35.))));
    vec3 winter = vec3(.1, .085, .075);
    vec3 c = trunk ? vec3(.11, .085, .07)
                   : (spring * uSpring + summer * uSummer + autumn * uAutumn + winter * uWinter) * (.72 + .4 * v);
    c = mix(c, vec3(.92, .94, 1.), uSnow * smoothstep(.1, .7, q.y) * .85 * float(!trunk));
    c *= lit;
    return vec4(mix(c, horizonCol(), 1. - exp(-t * haze)), 1.);
  }
  return vec4(0.);
}

// a plate is a picture hung 55 m outside the window: 90 m wide, its bottom 8 m below the floor
vec3 plate(vec3 ro, vec3 rd) {
  float t = (-61. - ro.z) / min(rd.z, -1e-3);
  vec3 p = ro + rd * t;
  vec2 uv = vec2((p.x + 45.) / 90., (p.y + 8.) / 45.);
  uv = clamp(uv, vec2(0.), vec2(1.));           // TextureLoader flips Y, so v = 0 is the image's bottom
  vec3 c = texture2D(tPlateDay, uv).rgb * (kDay() + kDawn() * .5) + texture2D(tPlateDusk, uv).rgb * (kDusk() + kDawn() * .5)
          + texture2D(tPlateNight, uv).rgb * kNight();
  c *= 1. - uStorm * .45 - uRain * .25;
  c = mix(c, horizonCol(), clamp(uFog * .7 + uSnow * .25 + uCloud * .15, 0., .9));
  return c + vec3(.8, .85, 1.) * uFlash * .6;
}

vec3 world(vec3 ro, vec3 rd) {
  if (uPlates > .5 && rd.z < -.02) return plate(ro, rd);
  vec3 col = sky(rd);
  if (rd.z > -0.02) return col;
  float d = kDay(), k = kDusk(), n = kNight(), a = kDawn();
  vec3 lit = vec3(1.) * d + vec3(1., .72, .52) * k * .8 + vec3(.015, .017, .024) * n + vec3(.62, .58, .7) * a * .6;
  lit *= vec3(1., .98, .94) * uSummer + vec3(1., .97, .92) * uAutumn + vec3(.93, .96, 1.02) * uWinter + vec3(1.) * uSpring;
  lit *= mix(1., .55, uCloud) * (1. - uStorm * .4);
  float haze = .004 + uFog * .07 + uRain * .012 + uSnow * .02;
  float zs[3]; zs[0] = -16.; zs[1] = -70.; zs[2] = -420.;
  for (int i = 0; i < 3; i++) {
    if (i == 1) {
      vec4 tr = trees(ro, rd, lit, haze);
      if (tr.a > .5) return tr.rgb;
    }
    float t = (zs[i] - ro.z) / rd.z;
    vec3 p = ro + rd * t;
    float h = i == 0 ? roofH(p.x) : (i == 1 ? blockH(p.x) : towerH(p.x));
    if (p.y < h) {
      vec3 base;
      if (i == 0) {
        float tile = .85 + .15 * step(.5, fract(p.y * 5.)) ;
        base = vec3(.22, .11, .075) * tile * (.8 + .4 * hash12(vec2(floor(p.x / 7.3), 11.)));
        base += vec3(.9, .9, .95) * uSnow * smoothstep(-.4, .4, p.y - h + .35) * .9;   // snow on ridges
        base *= lit;
        base += windows(vec2(p.x, p.y + 8.), vec2(2.6, 3.), 3., .22) * (n + k * .4 + a * .5) * .9 * step(p.y, h - .8);
      } else if (i == 1) {
        float id = floor(p.x / 15.);
        base = mix(vec3(.5, .48, .45), vec3(.62, .6, .56), hash12(vec2(id, 12.))) * lit;
        vec3 w = windows(vec2(p.x, p.y), vec2(1.7, 3.1), 7. + id, mix(.45, .24, n));
        base = mix(base, base * .55, (1. - n) * length(w) * .4);
        base += w * (n * 1.1 + k * .5 + a * .45);
      } else {
        base = vec3(.42, .46, .52) * lit;
        base += windows(vec2(p.x, p.y), vec2(1.2, 2.2), 21. + floor(p.x / 34.), .32) * (n + a * .5) * .7;
        float blink = step(.5, fract(uTime * .5 + hash12(vec2(floor(p.x / 34.), 2.)))) * step(h - 1.2, p.y) * step(60., h);
        base += vec3(1., .1, .05) * blink * n * 2.;
      }
      float fogK = 1. - exp(-t * haze);
      return mix(base, horizonCol(), fogK);
    }
  }
  return col;
}

// falling weather in direction space (outside the glass)
float rainLayer(vec2 uv, float s, float speed, float seed) {
  uv *= s; uv.x += uv.y * .1; uv.y += uTime * speed;
  vec2 id = floor(uv); vec2 f = fract(uv);
  float x = abs(f.x - hash12(id + seed));
  return smoothstep(.035, 0., x) * smoothstep(0., .45, f.y) * smoothstep(1., .55, f.y) * step(.5, hash12(id + seed + 3.));
}
float snowLayer(vec2 uv, float s, float speed, float seed) {
  uv *= s; uv.y += uTime * speed; uv.x += sin(uv.y * .8 + seed) * .35 + uTime * .06;
  vec2 id = floor(uv); vec2 f = fract(uv) - .5; vec2 o = (hash22(id + seed) - .5) * .6;
  float r = .07 + .09 * hash12(id + seed + 5.);
  return smoothstep(r, r * .35, length(f - o)) * step(.4, hash12(id + seed + 9.));
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorld - cameraPosition);
  vec2 uv = vec2(vUv.x, 1. - vUv.y);          // (0,0) bottom-left, seen from inside
  vec2 p = uv * uSize;                        // metres on the glass

  // ---- drops on the glass: static beads + a few running drops with trails
  float wet = clamp(uRain + uStorm * .5, 0., 1.);
  vec2 off = vec2(0.);
  float rim = 0., spec = 0.;
  if (wet > .01) {
    vec2 g = p * 48.;
    vec2 id = floor(g); vec2 f = fract(g) - .5;
    vec2 o = (hash22(id) - .5) * .55;
    float r = .1 + .22 * hash12(id + 7.);
    float present = step(1. - wet * .7, hash12(id + 3.));
    vec2 dd = f - o; float dl = length(dd);
    float m = smoothstep(r, r * .65, dl) * present;
    off += dd * m * 2.5; rim += smoothstep(r * .7, r, dl) * m * .6;
    spec += smoothstep(r * .35, 0., length(dd + vec2(r * .35, -r * .35))) * m;
    vec2 q = vec2(p.x * 9., p.y);
    float cid = floor(q.x); float cx = fract(q.x) - .5;
    float sp = .08 + .18 * hash12(vec2(cid, 1.));
    float run = step(1. - wet * .8, hash12(vec2(cid, 4.)));
    float lane = .45;
    float v = fract(q.y / lane + hash12(vec2(cid, 2.)));
    float head = 1. - fract(uTime * sp * (1. + uStorm) + hash12(vec2(cid, 3.)));
    float wob = sin(q.y * 9. + cid) * .08;
    vec2 hd = vec2((cx - wob) * 1.2, (v - head) * lane * 9. / .9);
    float drop = smoothstep(.22, .12, length(hd * vec2(1., .8))) * run;
    float trail = smoothstep(.06, .0, abs(cx - wob)) * smoothstep(0., .02, v - head) * smoothstep(.35, .0, v - head) * run;
    off += hd * drop * .5 + vec2(0., .2) * trail;
    rim += drop * .35;
    spec += drop * smoothstep(.12, .0, length(hd + vec2(.06, -.08))) + trail * .15;
  }
  vec3 rdr = normalize(rd + (uTanU * off.x + uTanV * off.y) * .09);

  vec3 col = world(ro, rdr);

  // ---- weather falling outside
  vec2 du = vec2(atan(rd.x, -rd.z), rd.y);
  if (uRain > .01) {
    float r = rainLayer(du * vec2(1., .32), 26., 3.2, 1.) * .5 + rainLayer(du * vec2(1., .32), 48., 4.1, 7.) * .35
            + rainLayer(du * vec2(1., .32), 85., 5.,  13.) * .25;
    vec3 streak = vec3(dot(horizonCol(), vec3(.33)) * 1.7 + .05);
    col = mix(col, streak, clamp(r * uRain, 0., 1.) * .6 * (1. - uKind * .7));   // looking up, streaks read wrong
  }
  float petals = uSpring * (1. - uRain) * (1. - uSnow) * (1. - kNight() * .7);
  float leaves = uAutumn * (1. - uRain * .7) * (1. - uSnow);
  if (petals + leaves > .02) {
    float f = snowLayer(du * vec2(1., .8), 6., .16, 21.) * .7 + snowLayer(du * vec2(1., .8), 11., .12, 27.) * .5;
    vec3 tint = (vec3(.98, .8, .86) * petals + vec3(.8, .4, .12) * leaves) / max(petals + leaves, 1e-3);
    float b = .2 + kDay() * .8 + kDusk() * .5 + kDawn() * .5;
    col = mix(col, tint * b, clamp(f, 0., 1.) * min(1., petals + leaves) * .45 * (1. - uKind * .6));
  }
  if (uSnow > .01) {
    float s = snowLayer(du, 9., .35, 1.) + snowLayer(du, 16., .28, 5.) * .8 + snowLayer(du, 30., .22, 9.) * .6;
    float bright = .25 + kDay() * .75 + kDusk() * .4 + kDawn() * .45;
    col = mix(col, vec3(.92, .94, 1.) * bright, clamp(s * uSnow, 0., 1.) * .9 * (1. - uKind * .5));
  }

  // ---- the glass itself
  col *= 1. - rim * .3;
  col += (horizonCol() * .9 + uInterior * 2.) * spec * .8;
  col += uInterior * (.02 + .1 * kNight()) * (.6 + .4 * rim);    // the room faintly reflected
  if (uSnow > .01) {
    if (uKind < .5) {
      vec2 lite = uv * uLites; vec2 lf = fract(lite);
      float pile = uSnow * (.1 + .07 * vnoise(vec2(lite.x * 9., floor(lite.y)))) + .06 * pow(abs(lf.x - .5) * 2., 4.) * uSnow;
      float sn = smoothstep(pile, pile - .02, lf.y);
      float frost = smoothstep(.55, .9, fbm(p * 14.) + (1. - min(min(lf.x, 1. - lf.x), min(lf.y, 1. - lf.y)) * 5.) * .12 - .5) * uSnow;
      vec3 snowCol = vec3(.9, .93, 1.) * (.18 + kDay() * .8 + kDusk() * .4 + kDawn() * .4) + uInterior * .2;
      col = mix(col, snowCol, clamp(sn + frost * .5, 0., 1.));
    } else {
      float cover = smoothstep(1. - uSnow * 1.05, 1.15 - uSnow * 1.05, fbm(p * 2.2) * .6 + .45);
      vec3 snowCol = vec3(.88, .92, 1.) * (.12 + kDay() * .7 + kDusk() * .35 + kDawn() * .35) + uInterior * .25;
      col = mix(col, snowCol, cover);
    }
  }
  col *= uGain;
  col = col / (1. + col * .12);            // soft shoulder so bright skies keep some detail
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function glassMaterial(kind, size, tanU, tanV) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...outsideUniforms,
      uKind: { value: kind === 'skylight' ? 1 : 0 },
      uSize: { value: new THREE.Vector2(size[0], size[1]) },
      uLites: { value: kind === 'skylight' ? new THREE.Vector2(1, 1) : new THREE.Vector2(3, 4) },
      uTanU: { value: new THREE.Vector3(...tanU) },
      uTanV: { value: new THREE.Vector3(...tanV) },
    },
    vertexShader: /* glsl */`
      varying vec3 vWorld; varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: frag,
  });
}
