/* WoW Companion — talks to the Cloudflare Worker, with a short-lived local copy for speed. */
window.WOW_API = (() => {
  const base = String((window.WOW_CONFIG || {}).apiBase || "").replace(/\/+$/, "");
  const LOCAL_HOURS = 6;
  const VERSION = "6"; // bump with the Worker's CACHE_VERSION so browsers drop old answers
  const PREFIX = `wowc:v${VERSION}:`;

  function readLocal(key, maxMs = LOCAL_HOURS * 3600000) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const v = JSON.parse(raw);
      return v && v.t && Date.now() - v.t < maxMs ? v.d : null;
    } catch { return null; }
  }
  function writeLocal(key, data) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), d: data })); } catch { /* storage full or blocked */ }
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // opts.maxMs: how long the browser's own copy stays fresh; opts.noStore: never save it.
  async function get(path, opts = {}) {
    if (!base) {
      const e = new Error("not-configured");
      e.setup = true;
      throw e;
    }
    const hit = opts.noStore ? null : readLocal(path, opts.maxMs);
    if (hit) return hit;
    // Blizzard occasionally fails a request even after the Worker's retries, so try once more quietly.
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        res = await fetch(`${base}${path}?v=${VERSION}`, { headers: { Accept: "application/json" } });
      } catch {
        if (attempt < 1) { await sleep(900); continue; }
        throw new Error("Couldn't reach the WoW Companion server. Check your connection, or that the Worker is deployed.");
      }
      let body = null;
      try { body = await res.json(); } catch { /* not JSON */ }
      if (!res.ok) {
        if ((res.status >= 500 || res.status === 429) && attempt < 1 && !opts.noStore) { await sleep(900); continue; }
        const e = new Error((body && body.error) || `The server answered with an error (${res.status}).`);
        e.status = res.status;
        throw e;
      }
      if (!opts.noStore) writeLocal(path, body);
      return body;
    }
  }

  // Spell icons are kept in the browser for 30 days and fetched 30 at a time.
  const ICON_KEY = "wowc:icons";
  const ICON_DAYS = 30;
  let iconMap = null;
  function iconStore() {
    if (iconMap) return iconMap;
    try {
      const v = JSON.parse(localStorage.getItem(ICON_KEY) || "null");
      iconMap = v && Date.now() - v.t < ICON_DAYS * 864e5 ? v.d : {};
    } catch { iconMap = {}; }
    return iconMap;
  }
  async function icons(ids) {
    const map = iconStore();
    const want = [...new Set(ids.filter(Boolean).map(String))].filter(id => !(id in map));
    for (let i = 0; base && i < want.length; i += 30) {
      try {
        const res = await fetch(`${base}/api/icons?ids=${want.slice(i, i + 30).join(",")}`);
        if (res.ok) Object.assign(map, (await res.json()).icons || {});
      } catch { /* icons are optional; letters stay */ }
    }
    try { localStorage.setItem(ICON_KEY, JSON.stringify({ t: Date.now(), d: map })); } catch { /* storage full */ }
    return map;
  }

  // Builds and tier lists are files the daily GitHub Actions job publishes next to the site.
  const siteCache = new Map();
  function siteData(rel) {
    if (!siteCache.has(rel)) {
      siteCache.set(rel, fetch(`data/${rel}`, { cache: "no-cache" })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null));
    }
    return siteCache.get(rel);
  }

  return {
    configured: !!base,
    icons,
    builds: specId => siteData(`builds/${specId}.json`),
    tiers: () => siteData("tiers.json"),
    meta: () => siteData("meta.json"),
    guide: kind => siteData(`guide/${kind}.json`),
    classicTalents: version => siteData(`classic/talents-${version}.json`),
    // Hand-written notes (leveling, dungeon and raid tips) ship with the site in notes/.
    notes: kind => { const k = `../notes/${kind}.json`; if (!siteCache.has(k)) siteCache.set(k, fetch(`notes/${kind}.json`, { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null)); return siteCache.get(k); },
    classes: () => get("/api/classes"),
    cls: id => get(`/api/class/${id}`),
    spec: id => get(`/api/spec/${id}`),
    // A character's gear and talents change often, so the browser keeps them for 10 minutes.
    character: (realmSlug, name, fresh) => get(`/api/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(String(name).toLowerCase())}`, { maxMs: fresh ? 0 : 10 * 60000 }),
    signInUrl: () => `${base}/auth/login?return=${encodeURIComponent(location.origin + location.pathname)}`
  };
})();
