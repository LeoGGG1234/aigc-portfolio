// Loads the easter-egg modules (src/eggs/<name>.js, see CONTRACT.md) and routes clicks, hover labels,
// keys and frames to them. A module that fails to load or throws is skipped: the room works without it.
export const EGGS = ['music', 'library', 'diary', 'terminal', 'moments', 'details', 'sky'];

export async function loadEggs(ctx) {
  const actions = {}, tips = {}, keys = [], updates = [];
  const loaded = await Promise.all(EGGS.map((name) => import(`./${name}.js`).then(
    (mod) => [name, mod],
    (e) => { console.warn(`[eggs] ${name} did not load`, e); return null; },
  )));
  for (const entry of loaded) {
    if (!entry) continue;
    const [name, mod] = entry;
    let egg;
    try { egg = mod.create(ctx); } catch (e) { console.warn(`[eggs] ${name} failed to start`, e); continue; }
    if (!egg) continue;
    ctx.eggs[name] = egg.api || {};
    const guard = (fn, what) => (...a) => { try { return fn(...a); } catch (e) { console.warn(`[eggs] ${name}.${what}`, e); return undefined; } };
    for (const [k, fn] of Object.entries(egg.actions || {})) actions[k] = guard(fn, `actions.${k}`);
    for (const [k, fn] of Object.entries(egg.tips || {})) tips[k] = guard(fn, `tips.${k}`);
    if (egg.keys) keys.push([name, egg.keys]);
    if (egg.update) updates.push([name, egg.update.bind(egg)]);
  }
  const stopped = new Set();
  return {
    actions,
    tips,
    // true when a module handled the key (the room then ignores it)
    key(e) {
      for (const [name, map] of keys) {
        const fn = map[e.key];
        if (!fn) continue;
        try { if (fn(e)) return true; } catch (err) { console.warn(`[eggs] ${name}.keys[${e.key}]`, err); }
      }
      return false;
    },
    update(dt, frame) {
      for (const [name, fn] of updates) {
        if (stopped.has(name)) continue;
        try { fn(dt, frame); } catch (err) { stopped.add(name); console.warn(`[eggs] ${name}.update stopped`, err); }
      }
    },
  };
}
