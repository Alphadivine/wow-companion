/* WoW Companion — talks to the Cloudflare Worker, with a short-lived local copy for speed. */
window.WOW_API = (() => {
  const base = String((window.WOW_CONFIG || {}).apiBase || "").replace(/\/+$/, "");
  const LOCAL_HOURS = 6;
  const VERSION = "5"; // bump with the Worker's CACHE_VERSION so browsers drop old answers
  const PREFIX = `wowc:v${VERSION}:`;

  function readLocal(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const v = JSON.parse(raw);
      return v && v.t && Date.now() - v.t < LOCAL_HOURS * 3600000 ? v.d : null;
    } catch { return null; }
  }
  function writeLocal(key, data) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), d: data })); } catch { /* storage full or blocked */ }
  }

  async function get(path) {
    if (!base) {
      const e = new Error("not-configured");
      e.setup = true;
      throw e;
    }
    const hit = readLocal(path);
    if (hit) return hit;
    let res;
    try {
      res = await fetch(`${base}${path}?v=${VERSION}`, { headers: { Accept: "application/json" } });
    } catch {
      throw new Error("Couldn't reach the WoW Companion server. Check your connection, or that the Worker is deployed.");
    }
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) throw new Error((body && body.error) || `The server answered with an error (${res.status}).`);
    writeLocal(path, body);
    return body;
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

  return {
    configured: !!base,
    icons,
    classes: () => get("/api/classes"),
    cls: id => get(`/api/class/${id}`),
    spec: id => get(`/api/spec/${id}`)
  };
})();
