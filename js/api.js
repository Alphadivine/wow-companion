/* WoW Companion — talks to the Cloudflare Worker, with a short-lived local copy for speed. */
window.WOW_API = (() => {
  const base = String((window.WOW_CONFIG || {}).apiBase || "").replace(/\/+$/, "");
  const LOCAL_HOURS = 6;
  const VERSION = "4"; // bump with the Worker's CACHE_VERSION so browsers drop old answers
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

  return {
    configured: !!base,
    classes: () => get("/api/classes"),
    cls: id => get(`/api/class/${id}`),
    spec: id => get(`/api/spec/${id}`)
  };
})();
