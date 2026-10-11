/**
 * WoW Companion — daily data builder (runs in GitHub Actions, Node 20+, no dependencies).
 *
 * Builds the files the site reads for builds and tier lists:
 *   data/meta.json            when it ran, season, raid bosses sampled, per-spec status
 *   data/tiers.json           Mythic+ tier list (Raider.IO) and Raid tier list (Warcraft Logs)
 *   data/builds/{specId}.json Mythic+ and Raid builds: talents, import string, stats, best in slot
 *
 * Sources: Raider.IO (top Mythic+ runs and player loadouts), Warcraft Logs (top raid rankings),
 * Blizzard (spec list, character stats and equipment).
 *
 * It starts from the data already on the live site, so a spec that fails to refresh keeps its
 * last good copy. Set REFRESH=false (as on an ordinary push) to only copy the live data.
 *
 * Env: BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET, WCL_CLIENT_ID, WCL_CLIENT_SECRET,
 *      SITE_URL (live site, for the previous data), REFRESH ("true"/"false"), OUT_DIR (default "data").
 * Test overrides: RIO_BASE, WCL_BASE, BNET_OAUTH, BNET_API (with {region}).
 */
import fs from "node:fs/promises";
import path from "node:path";

const env = process.env;
const OUT = env.OUT_DIR || "data";
const SITE_URL = (env.SITE_URL || "").replace(/\/?$/, "/");
const RIO = env.RIO_BASE || "https://raider.io";
const WCL = env.WCL_BASE || "https://www.warcraftlogs.com";
const BNET_OAUTH = env.BNET_OAUTH || "https://oauth.battle.net/token";
const BNET_API = env.BNET_API || "https://{region}.api.blizzard.com";

const RUN_PAGES = 25;              // 20 runs a page -> top 500 Mythic+ runs
const MPLUS_PROFILES = 10;         // player loadouts read per spec for Mythic+
const RAID_TOP = 50;               // top players per boss used for raid builds
const RAID_PROFILES = 8;           // top raid players whose loadouts are checked for an import string
const STAT_PROFILES = 5;           // players whose Blizzard stats and gear are read per build
const RAID_BOSSES_PER_DAY = 3;
const NEAR_MATCH = 2;              // import string shown only if within this many talents of the build
const PROFILE_REGIONS = new Set(["us", "eu", "kr", "tw"]);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => String(s || "").toLowerCase().replace(/['’]/g, "").replace(/\s+/g, "-");
// Wowhead's icon CDN has art for new items sooner than Blizzard's render CDN.
const iconUrl = icon => (icon ? `https://wow.zamimg.com/images/wow/icons/large/${String(icon).replace(/\.jpg$/, "")}.jpg` : "");

async function getJson(url, opts = {}, tries = 3) {
  for (let i = 0; ; i++) {
    let res;
    try { res = await fetch(url, opts); } catch (e) { if (i >= tries - 1) throw e; await sleep(800 * (i + 1)); continue; }
    if ((res.status === 429 || res.status >= 500) && i < tries - 1) { await sleep((Number(res.headers.get("retry-after")) || 1 + i) * 1000); continue; }
    if (!res.ok) { const e = new Error(`${res.status} ${url.split("?")[0]}`); e.status = res.status; throw e; }
    return res.json();
  }
}

// Runs fn over items, a few at a time.
async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i).catch(e => ({ __error: e.message })); }
  }));
  return out;
}

/* ------------------------------------------ tokens ------------------------------------------ */

async function oauthToken(url, id, secret) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  if (!res.ok) throw new Error(`token ${res.status} from ${url}`);
  return (await res.json()).access_token;
}

let bnetToken = "", wclToken = "";
const bnet = (region, pathAndQuery) => getJson(BNET_API.replace("{region}", region) + pathAndQuery, { headers: { Authorization: `Bearer ${bnetToken}` } });
async function wcl(query, variables = {}) {
  const body = await getJson(`${WCL}/api/v2/client`, {
    method: "POST",
    headers: { Authorization: `Bearer ${wclToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (body.errors?.length) throw new Error("WCL: " + body.errors.map(e => e.message).join("; "));
  return body.data;
}

/* --------------------------------------- previous data --------------------------------------- */

async function copyLiveData() {
  if (!SITE_URL || SITE_URL === "/") return {};
  try {
    const meta = await getJson(`${SITE_URL}data/meta.json`, {}, 2);
    for (const f of meta.files || []) {
      try {
        const body = await getJson(`${SITE_URL}data/${f}`, {}, 2);
        await writeJson(f, body);
      } catch { /* missing on the live site; will be rebuilt */ }
    }
    log(`copied ${meta.files?.length || 0} files from the live site`);
    return meta;
  } catch {
    log("no previous data on the live site");
    return {};
  }
}

async function writeJson(rel, data) {
  const file = path.join(OUT, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data));
}

async function listFiles(dir = OUT, base = "") {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await listFiles(path.join(dir, e.name), rel));
    else if (rel !== "meta.json") out.push(rel);
  }
  return out.sort();
}

/* ------------------------------------------- specs ------------------------------------------- */

async function loadSpecs() {
  const ns = "namespace=static-us&locale=en_US";
  const idx = await bnet("us", `/data/wow/playable-class/index?${ns}`);
  const classes = await pool(idx.classes, 4, c => bnet("us", `/data/wow/playable-class/${c.id}?${ns}`));
  const specs = [];
  for (const c of classes) {
    if (c.__error) throw new Error("Blizzard class list failed: " + c.__error);
    for (const s of c.specializations || []) specs.push({ id: s.id, name: s.name.en_US || s.name, classId: c.id, className: c.name.en_US || c.name });
  }
  const details = await pool(specs, 6, s => bnet("us", `/data/wow/playable-specialization/${s.id}?${ns}`));
  details.forEach((d, i) => { specs[i].role = d?.role?.type || "DAMAGE"; });
  return specs;
}

/* ----------------------------------- talent loadout helpers ----------------------------------- */

// A Raider.IO loadout as a map nodeId -> { entry, spell, rank, granted, subTree }
function loadoutPicks(loadout) {
  const picks = new Map();
  for (const p of loadout?.loadout || []) {
    const node = p.node || {};
    const entry = (node.entries || [])[p.entryIndex ?? 0] || (node.entries || [])[0];
    if (!node.id || !entry) continue;
    picks.set(node.id, { node: node.id, entry: entry.id, spell: entry.spell?.id || null, name: entry.spell?.name || "", rank: p.rank || 1, granted: !!p.grantedNode, subTree: node.subTreeId || 0 });
  }
  return picks;
}

// Entry id -> { node, spell } from every node's full entry list, so WCL entry ids can be placed on the tree.
function addEntryMap(map, loadout) {
  for (const p of loadout?.loadout || []) for (const e of p.node?.entries || []) {
    if (e.id && !map.has(e.id)) map.set(e.id, { node: p.node.id, spell: e.spell?.id || null, name: e.spell?.name || "", subTree: p.node.subTreeId || 0 });
  }
}

// How many talents (non-free nodes) differ between a player's picks and the build.
function distance(picks, build) {
  let d = 0;
  const keys = new Set([...picks.keys(), ...build.keys()]);
  for (const k of keys) {
    const a = picks.get(k), b = build.get(k);
    if (a?.granted || b?.granted) continue;
    if (!a || !b || a.entry !== b.entry || a.rank !== b.rank) d++;
  }
  return d;
}

// The most common pick for each node, kept when at least half the sample took that node.
function majorityBuild(pickSets) {
  const byNode = new Map();
  for (const picks of pickSets) for (const p of picks.values()) {
    if (!byNode.has(p.node)) byNode.set(p.node, new Map());
    const k = `${p.entry}:${p.rank}`;
    const m = byNode.get(p.node);
    m.set(k, { ...p, n: (m.get(k)?.n || 0) + 1 });
  }
  const build = new Map();
  const n = pickSets.length;
  for (const [node, opts] of byNode) {
    const total = [...opts.values()].reduce((a, o) => a + o.n, 0);
    if (total / n < 0.5) continue;
    const best = [...opts.values()].sort((a, b) => b.n - a.n)[0];
    build.set(node, { ...best, pct: Math.round((best.n / n) * 100), nodePct: Math.round((total / n) * 100) });
  }
  // Only one hero tree can be active: keep the most common one.
  const heroCounts = {};
  for (const p of build.values()) if (p.subTree) heroCounts[p.subTree] = (heroCounts[p.subTree] || 0) + 1;
  const hero = Object.entries(heroCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const [k, p] of build) if (p.subTree && String(p.subTree) !== hero) build.delete(k);
  return build;
}

function pickList(build) {
  return [...build.values()].map(p => ({ node: p.node, spell: p.spell, name: p.name, rank: p.rank, pct: p.pct ?? 100, granted: p.granted || false, subTree: p.subTree || 0 }));
}

/* ------------------------------------ stats and equipment ------------------------------------ */

const SLOT_NAMES = { HEAD: "Head", NECK: "Neck", SHOULDER: "Shoulders", BACK: "Back", CHEST: "Chest", WRIST: "Wrists", HANDS: "Hands", WAIST: "Waist", LEGS: "Legs", FEET: "Feet", FINGER: "Rings", TRINKET: "Trinkets", MAIN_HAND: "Main hand", OFF_HAND: "Off hand" };
const SLOT_ORDER = Object.values(SLOT_NAMES);

function statShares(stats) {
  // Blizzard now sends rated stats as { rating_normalized, rating_bonus, value }; older data used { rating }.
  const r = v => (typeof v === "number" ? v : v?.rating_normalized || v?.rating || 0);
  const crit = r(stats.melee_crit) || r(stats.spell_crit) || r(stats.ranged_crit);
  const haste = r(stats.melee_haste) || r(stats.spell_haste) || r(stats.ranged_haste);
  const mastery = r(stats.mastery);
  const vers = r(stats.versatility);
  const total = crit + haste + mastery + vers;
  if (!total) return null;
  return { "Critical Strike": crit / total, Haste: haste / total, Mastery: mastery / total, Versatility: vers / total };
}

function averageStats(list) {
  const ok = list.filter(Boolean);
  if (!ok.length) return null;
  const sum = {};
  for (const s of ok) for (const [k, v] of Object.entries(s)) sum[k] = (sum[k] || 0) + v;
  return Object.entries(sum).map(([stat, v]) => ({ stat, pct: Math.round((v / ok.length) * 100) })).sort((a, b) => b.pct - a.pct);
}

// Reads Blizzard stats and equipment for a few players; also learns enchant and gem names.
async function readCharacters(players, names) {
  const results = await pool(players.slice(0, STAT_PROFILES), 3, async p => {
    const base = `/profile/wow/character/${encodeURIComponent(p.realmSlug)}/${encodeURIComponent(p.name.toLowerCase())}`;
    const q = `?namespace=profile-${p.region}&locale=en_US`;
    const [stats, equip] = await Promise.all([bnet(p.region, base + "/statistics" + q).catch(() => null), bnet(p.region, base + "/equipment" + q).catch(() => null)]);
    for (const it of equip?.equipped_items || []) {
      for (const en of it.enchantments || []) if (en.enchantment_id && en.display_string) names.enchants.set(String(en.enchantment_id), en.display_string.replace(/^Enchanted:\s*/i, "").replace(/\|A.*?\|a/g, "").trim());
      for (const so of it.sockets || []) if (so.item?.id && so.item?.name) names.gems.set(String(so.item.id), so.item.name);
    }
    return { stats: stats ? statShares(stats) : null, equip };
  });
  return results.filter(r => r && !r.__error);
}

// Most common items per slot from a list of { slot, id, name, icon, quality, ilvl, enchant, gems }.
function bestInSlot(items, names, sampleSize) {
  const bySlot = new Map();
  for (const it of items) {
    if (!it.slot || !it.id) continue;
    if (!bySlot.has(it.slot)) bySlot.set(it.slot, new Map());
    const m = bySlot.get(it.slot);
    const cur = m.get(it.id) || { ...it, n: 0, ilvls: [], enchants: {}, gems: {} };
    cur.n++;
    if (it.ilvl) cur.ilvls.push(Number(it.ilvl));
    if (it.enchant) cur.enchants[it.enchant] = (cur.enchants[it.enchant] || 0) + 1;
    for (const g of it.gems || []) cur.gems[g] = (cur.gems[g] || 0) + 1;
    m.set(it.id, cur);
  }
  const top = obj => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0];
  return SLOT_ORDER.filter(s => bySlot.has(s)).map(slot => {
    const keep = slot === "Rings" || slot === "Trinkets" ? 3 : 2;
    const list = [...bySlot.get(slot).values()].sort((a, b) => b.n - a.n).slice(0, keep).map(it => {
      const ench = top(it.enchants);
      const gemIds = Object.entries(it.gems).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
      const ilvls = it.ilvls.sort((a, b) => a - b);
      return {
        id: it.id, name: it.name, icon: iconUrl(it.icon), quality: it.quality || "epic",
        ilvl: ilvls.length ? ilvls[Math.floor(ilvls.length / 2)] : null,
        pct: Math.min(100, Math.round((it.n / sampleSize) * 100)), // share of players using it
        enchant: ench ? names.enchants.get(String(ench)) || null : null,
        gems: gemIds.map(g => names.gems.get(String(g))).filter(Boolean)
      };
    });
    return { slot, items: list };
  });
}

const RIO_SLOTS = { head: "Head", neck: "Neck", shoulder: "Shoulders", back: "Back", chest: "Chest", wrist: "Wrists", hands: "Hands", waist: "Waist", legs: "Legs", feet: "Feet", finger1: "Rings", finger2: "Rings", trinket1: "Trinkets", trinket2: "Trinkets", mainhand: "Main hand", offhand: "Off hand" };
const WCL_SLOTS = ["Head", "Neck", "Shoulders", null, "Chest", "Waist", "Legs", "Feet", "Wrists", "Hands", "Rings", "Rings", "Trinkets", "Trinkets", "Back", "Main hand", "Off hand", null];
const QUALITY = { 1: "common", 2: "uncommon", 3: "rare", 4: "epic", 5: "legendary", 6: "artifact" };

/* ------------------------------------------ Mythic+ ------------------------------------------ */

async function mythicPlus(specs) {
  const stat = await getJson(`${RIO}/api/v1/mythic-plus/static-data?expansion_id=${env.RIO_EXPANSION || 11}`);
  const now = Date.now();
  const seasons = (stat.seasons || []).filter(s => !/break the meta|ptr/i.test(s.name) && Date.parse(s.starts?.us || 0) <= now);
  const season = seasons.sort((a, b) => Date.parse(b.starts.us) - Date.parse(a.starts.us))[0];
  if (!season) throw new Error("no current Mythic+ season on Raider.IO");
  log("Mythic+ season:", season.slug);

  const pages = await pool(Array.from({ length: RUN_PAGES }, (_, i) => i), 4,
    page => getJson(`${RIO}/api/v1/mythic-plus/runs?season=${season.slug}&region=world&dungeon=all&page=${page}`));
  const runs = pages.flatMap(p => p?.rankings || []).map(r => r.run).filter(Boolean);
  log("Mythic+ runs read:", runs.length);

  const specById = new Map(specs.map(s => [s.id, s]));
  const counts = new Map();
  const candidates = new Map();
  for (const run of runs) for (const m of run.roster || []) {
    const c = m.character || {};
    const sid = c.spec?.id;
    if (!specById.has(sid)) continue;
    counts.set(sid, (counts.get(sid) || 0) + 1);
    const region = c.region?.slug;
    if (!PROFILE_REGIONS.has(region)) continue;
    const key = `${region}/${c.realm?.slug}/${c.name}`;
    if (!candidates.has(sid)) candidates.set(sid, new Map());
    const list = candidates.get(sid);
    if (!list.has(key)) list.set(key, { name: c.name, realm: c.realm?.name, realmSlug: c.realm?.slug, region, level: run.mythic_level });
  }

  const tiers = tierFromShares(specs, counts, runs.length);
  return { season: { slug: season.slug, name: season.name }, runs: runs.length, tiers, candidates, dungeons: [...new Set(runs.map(r => r.dungeon?.name).filter(Boolean))] };
}

function tierFromShares(specs, counts, runCount) {
  const slots = { TANK: 1, HEALER: 1, DAMAGE: 3 };
  const roles = {};
  for (const role of Object.keys(slots)) {
    const list = specs.filter(s => s.role === role).map(s => ({ spec: s.id, name: s.name, className: s.className, classId: s.classId, count: counts.get(s.id) || 0, share: runCount ? (counts.get(s.id) || 0) / (runCount * slots[role]) : 0 }));
    const top = Math.max(...list.map(x => x.share), 0.0001);
    roles[role] = list.map(x => ({ ...x, share: Math.round(x.share * 1000) / 10, tier: x.share / top >= 0.6 ? "S" : x.share / top >= 0.3 ? "A" : x.share / top >= 0.12 ? "B" : "C" })).sort((a, b) => b.share - a.share);
  }
  return roles;
}

async function rioProfile(p) {
  const url = `${RIO}/api/v1/characters/profile?region=${p.region}&realm=${encodeURIComponent(p.realmSlug || p.realm)}&name=${encodeURIComponent(p.name)}&fields=talents,gear`;
  return getJson(url, {}, 2);
}

async function mythicPlusBuild(spec, candidates, names, override) {
  const players = override || [...(candidates.get(spec.id)?.values() || [])].slice(0, MPLUS_PROFILES * 2);
  const profiles = (await pool(players, 4, async p => ({ p, prof: await rioProfile(p) })))
    .filter(x => x && !x.__error && x.prof?.talentLoadout?.loadout_spec_id === spec.id)
    .slice(0, MPLUS_PROFILES);
  if (profiles.length < 3) return null;

  const pickSets = profiles.map(x => loadoutPicks(x.prof.talentLoadout));
  const build = majorityBuild(pickSets);
  const ranked = profiles.map((x, i) => ({ ...x, picks: pickSets[i], d: distance(pickSets[i], build) })).sort((a, b) => a.d - b.d);
  const rep = ranked[0];

  const items = [];
  for (const x of profiles) for (const [k, it] of Object.entries(x.prof.gear?.items || {})) {
    if (!RIO_SLOTS[k]) continue;
    items.push({ slot: RIO_SLOTS[k], id: it.item_id, name: it.name, icon: it.icon, quality: QUALITY[it.item_quality] || "epic", ilvl: it.item_level, enchant: it.enchant ? String(it.enchant) : null, gems: (it.gems || []).map(g => String(g?.id ?? g)) });
  }
  const chars = await readCharacters(ranked.map(x => x.p), names);
  return {
    sample: profiles.length,
    topKey: Math.max(...profiles.map(x => x.p.level || 0)),
    hero: heroOf(rep.picks),
    picks: pickList(build),
    player: { name: rep.p.name, realm: rep.p.realm, region: rep.p.region, differs: rep.d },
    importString: rep.d <= NEAR_MATCH ? rep.prof.talentLoadout.loadout_text : null,
    stats: averageStats(chars.map(c => c.stats)),
    gear: () => bestInSlot(items, names, profiles.length) // resolved after enchant/gem names are known
  };
}

function heroOf(picks) {
  const counts = {};
  for (const p of picks.values()) if (p.subTree) counts[p.subTree] = (counts[p.subTree] || 0) + 1;
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]) || null;
}

/* ------------------------------- Mythic+ fallback (Warcraft Logs) ------------------------------- */

// For specs too rare in the top Raider.IO runs, take top players from Warcraft Logs' Mythic+ rankings.
async function mplusZone() {
  const data = await wcl(`{ worldData { expansions { id zones { id name frozen encounters { id name } } } } }`);
  for (const exp of (data.worldData.expansions || []).sort((a, b) => b.id - a.id)) {
    const z = (exp.zones || []).find(z => !z.frozen && /^mythic\+ season/i.test(z.name) && !/ptr|beta/i.test(z.name));
    if (z) return z;
  }
  return null;
}

async function wclPoints() {
  const d = await wcl(`{ rateLimitData { limitPerHour pointsSpentThisHour } }`);
  return d.rateLimitData.limitPerHour - d.rateLimitData.pointsSpentThisHour;
}

async function mplusFallbackPlayers(spec, zone) {
  const day = Math.floor(Date.now() / 864e5);
  const enc = zone.encounters[(day + spec.id) % zone.encounters.length];
  const q = `query($e:Int!,$c:String,$s:String,$m:CharacterRankingMetricType){ worldData { encounter(id:$e) { characterRankings(className:$c, specName:$s, metric:$m) } } }`;
  const data = await wcl(q, { e: enc.id, c: wclName(spec.className), s: wclName(spec.name), m: spec.role === "HEALER" ? "hps" : "dps" });
  const list = data?.worldData?.encounter?.characterRankings?.rankings || [];
  const seen = new Set();
  return list.map(r => ({ name: r.name, realm: r.server?.name, realmSlug: slug(r.server?.name), region: String(r.server?.region || "").toLowerCase(), level: r.hardModeLevel || r.bracketData || null }))
    .filter(p => PROFILE_REGIONS.has(p.region) && !seen.has(`${p.region}/${p.realmSlug}/${p.name}`) && seen.add(`${p.region}/${p.realmSlug}/${p.name}`))
    .slice(0, MPLUS_PROFILES * 2);
}

/* -------------------------------------------- Raid -------------------------------------------- */

async function raidZone() {
  const data = await wcl(`{ worldData { expansions { id zones { id name frozen difficulties { id } encounters { id name } } } } }`);
  const exps = (data.worldData.expansions || []).sort((a, b) => b.id - a.id);
  for (const exp of exps) {
    const zone = (exp.zones || []).filter(z => !z.frozen && z.encounters.length >= 4 && !/mythic\+|ptr|beta|complete|dummy|delve/i.test(z.name) && z.difficulties.some(d => d.id === 5))
      .sort((a, b) => b.encounters.length - a.encounters.length)[0];
    if (zone) return zone;
  }
  throw new Error("no current raid zone on Warcraft Logs");
}

function todaysBosses(zone) {
  const day = Math.floor(Date.now() / 864e5);
  const n = zone.encounters.length;
  const start = (day * RAID_BOSSES_PER_DAY) % n;
  return Array.from({ length: Math.min(RAID_BOSSES_PER_DAY, n) }, (_, i) => zone.encounters[(start + i) % n]);
}

const wclName = s => s.replace(/\s+/g, "");

async function raidRankings(spec, boss) {
  const q = `query($e:Int!,$c:String,$s:String,$d:Int,$m:CharacterRankingMetricType){ worldData { encounter(id:$e) { characterRankings(className:$c, specName:$s, difficulty:$d, metric:$m, includeCombatantInfo:true) } } }`;
  const metric = spec.role === "HEALER" ? "hps" : "dps";
  for (const difficulty of [5, 4]) {
    const data = await wcl(q, { e: boss.id, c: wclName(spec.className), s: wclName(spec.name), d: difficulty, m: metric });
    const list = data?.worldData?.encounter?.characterRankings?.rankings || [];
    if (list.length >= 10 || difficulty === 4) return { difficulty, list: list.slice(0, RAID_TOP) };
  }
  return { difficulty: 4, list: [] };
}

async function raidBuild(spec, bosses, entryMap, names) {
  const perBoss = [];
  for (const boss of bosses) {
    try { perBoss.push({ boss, ...(await raidRankings(spec, boss)) }); }
    catch (e) { log(`  raid ${spec.name} ${spec.className} / ${boss.name}: ${e.message}`); }
  }
  const players = perBoss.flatMap(b => b.list.map(r => ({ ...r, boss: b.boss.id })));
  if (players.length < 10) return { build: null, perBoss };

  // Majority talents by WCL entry id.
  const entryCount = new Map();
  for (const p of players) for (const t of p.talents || []) {
    const k = `${t.talentID}:${t.points}`;
    entryCount.set(k, (entryCount.get(k) || 0) + 1);
  }

  // Check the top players' current loadouts (also teaches entry -> node mapping).
  const top = [...new Map(players.sort((a, b) => b.amount - a.amount).map(p => [`${p.server?.region}/${p.server?.name}/${p.name}`, p])).values()]
    .filter(p => PROFILE_REGIONS.has(String(p.server?.region || "").toLowerCase())).slice(0, RAID_PROFILES)
    .map(p => ({ name: p.name, realm: p.server.name, realmSlug: slug(p.server.name), region: p.server.region.toLowerCase(), wcl: p }));
  const profiles = (await pool(top, 4, async p => ({ p, prof: await rioProfile(p) }))).filter(x => x && !x.__error && x.prof?.talentLoadout?.loadout_spec_id === spec.id);
  for (const x of profiles) addEntryMap(entryMap, x.prof.talentLoadout);

  const n = players.length;
  const byNode = new Map();
  for (const [k, c] of entryCount) {
    const [entry, rank] = k.split(":").map(Number);
    const m = entryMap.get(entry);
    if (!m) continue;
    const cur = byNode.get(m.node);
    if (!cur || c > cur.n) byNode.set(m.node, { node: m.node, entry, spell: m.spell, name: m.name, rank, subTree: m.subTree, n: c, granted: false });
  }
  const build = new Map();
  for (const [node, p] of byNode) if (p.n / n >= 0.5) build.set(node, { ...p, pct: Math.round((p.n / n) * 100) });
  const heroCounts = {};
  for (const p of build.values()) if (p.subTree) heroCounts[p.subTree] = (heroCounts[p.subTree] || 0) + 1;
  const hero = Number(Object.entries(heroCounts).sort((a, b) => b[1] - a[1])[0]?.[0]) || null;
  for (const [k, p] of build) if (p.subTree && p.subTree !== hero) build.delete(k);

  const ranked = profiles.map(x => {
    const picks = loadoutPicks(x.prof.talentLoadout);
    return { ...x, picks, d: distance(picks, build) };
  }).sort((a, b) => a.d - b.d);
  const rep = ranked[0];

  const items = [];
  for (const p of players) (p.gear || []).forEach((g, i) => {
    if (!WCL_SLOTS[i] || !g?.id) return;
    items.push({ slot: WCL_SLOTS[i], id: g.id, name: g.name, icon: g.icon, quality: g.quality || "epic", ilvl: g.itemLevel, enchant: g.permanentEnchant || null, gems: (g.gems || []).map(x => String(x.id)) });
  });
  const chars = await readCharacters((ranked.length ? ranked : profiles).map(x => x.p), names);

  return {
    perBoss,
    build: {
      sample: n,
      bosses: perBoss.map(b => ({ name: b.boss.name, difficulty: b.difficulty === 5 ? "Mythic" : "Heroic", players: b.list.length })),
      hero,
      picks: pickList(build),
      player: rep ? { name: rep.p.name, realm: rep.p.realm, region: rep.p.region, differs: rep.d } : null,
      importString: rep && rep.d <= NEAR_MATCH ? rep.prof.talentLoadout.loadout_text : null,
      stats: averageStats(chars.map(c => c.stats)),
      gear: () => bestInSlot(items, names, players.length)
    }
  };
}

function raidTiers(specs, results) {
  const roles = {};
  for (const role of ["TANK", "HEALER", "DAMAGE"]) {
    const inRole = specs.filter(s => s.role === role);
    const bossIds = [...new Set(inRole.flatMap(s => (results.get(s.id) || []).map(b => b.boss.id)))];
    const scores = new Map(inRole.map(s => [s.id, []]));
    for (const bossId of bossIds) {
      const medians = inRole.map(s => {
        const b = (results.get(s.id) || []).find(x => x.boss.id === bossId);
        const amounts = (b?.list || []).map(r => r.amount).sort((a, c) => a - c);
        return { s, m: amounts.length >= 10 ? amounts[Math.floor(amounts.length / 2)] : null };
      });
      const best = Math.max(...medians.map(x => x.m || 0));
      if (!best) continue;
      for (const x of medians) if (x.m) scores.get(x.s.id).push(x.m / best);
    }
    // Average across bosses, then rescale so the role's best spec overall is 100%.
    const avg = new Map(inRole.map(s => { const l = scores.get(s.id); return [s.id, l.length ? l.reduce((a, b) => a + b, 0) / l.length : null]; }));
    const topAvg = Math.max(...[...avg.values()].map(v => v || 0)) || 1;
    roles[role] = inRole.map(s => {
      const score = avg.get(s.id) == null ? null : avg.get(s.id) / topAvg;
      return { spec: s.id, name: s.name, className: s.className, classId: s.classId, score: score == null ? null : Math.round(score * 1000) / 10, tier: score == null ? "?" : score >= 0.96 ? "S" : score >= 0.91 ? "A" : score >= 0.85 ? "B" : "C" };
    }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }
  return roles;
}

/* ------------------------------------ data-job building blocks ------------------------------------ */

/* -------------------------------------- Adventure Guide -------------------------------------- */
// Blizzard's in-game Adventure Guide (the "journal") for the current raid and this season's Mythic+
// dungeons: every boss ability, plus Blizzard's own Tanks / Healers / Damage Dealers overview bullets.

const GUIDE_VERSION = 3; // bump when the guide format changes, so the next upload rebuilds it
const normName = s => String(s || "").toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");

// Strips the Adventure Guide's formatting codes and turns its bullet markers into plain bullets.
function journalText(t) {
  return String(t || "")
    .replace(/\|c[0-9a-fA-F]{8}/g, "").replace(/\|r/g, "").replace(/\|T[^|]*\|t/g, "").replace(/\|H[^|]*\|h(.*?)\|h/g, "$1")
    .replace(/\$bullet;?\s*/gi, "• ").replace(/\$\[[^\]]*\]/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function journalSections(list, depth = 0) {
  const seen = new Set();
  return (list || []).filter(x => x && (x.title || x.body_text)).map(x => {
    const out = { title: name(x.title), text: journalText(name(x.body_text)) };
    if (x.spell?.id) out.spell = x.spell.id;
    const kids = depth < 6 ? journalSections(x.sections, depth + 1) : [];
    if (kids.length) out.sections = kids;
    return out;
  }).filter(x => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; }); // Blizzard repeats some groups
}

// Abilities in the Adventure Guide are links to spells, and the in-game guide shows the spell's own text.
// Blizzard's web API has no text or icons for most boss spells, so both come from Wowhead's public
// tooltip service (the one fan sites use for ability popups). The site credits Wowhead next to them.
const WOWHEAD_TOOLTIP = env.WOWHEAD_TOOLTIP || "https://nether.wowhead.com/tooltip/spell/{id}?dataEnv=1&locale=0";
const spellCache = new Map();
function tooltipText(html, title) {
  let t = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(tr|table|div|p)>/gi, "\n").replace(/<div[^>]*>/gi, "\n").replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (t[0] && title && t[0].toLowerCase().startsWith(title.toLowerCase())) t[0] = t[0].slice(title.length).trim();
  t = t.filter(Boolean);
  // Lines like "1 sec cast", "40 yd range", "Instant", "2 min cooldown" become a short meta line.
  const meta = [], body = [];
  for (const l of t) (/^(instant|channeled|\d[\d.]* (sec|min) (cast|cooldown|recharge)|\d+ yd range|melee range|unlimited range|passive|\d+[\d,]* (mana|energy|rage))\b/i.test(l) && l.length < 40 ? meta : body).push(l);
  return { meta: meta.join(" · "), text: body.join("\n") };
}
async function wowheadSpell(id) {
  if (spellCache.has(id)) return spellCache.get(id);
  const p = getJson(WOWHEAD_TOOLTIP.replace("{id}", id), { headers: { "User-Agent": "WoW Companion personal guide (GitHub Actions)" } }, 2)
    .then(j => ({ icon: j.icon ? `https://wow.zamimg.com/images/wow/icons/large/${j.icon}.jpg` : "", ...tooltipText(j.tooltip, j.name) }))
    .catch(() => null);
  spellCache.set(id, p);
  return p;
}
async function fillSpellText(sections) {
  const spells = [];
  const walk = list => { for (const x of list || []) { if (x.spell) spells.push(x); walk(x.sections); } };
  walk(sections);
  let filled = 0;
  await pool(spells, 6, async x => {
    const w = await wowheadSpell(x.spell);
    if (!w) return;
    if (w.icon) x.icon = w.icon;
    if (!x.text && w.text) { x.text = w.text; x.textSource = "wowhead"; filled++; }
    if (w.meta) x.meta = w.meta;
  });
  return { asked: spells.length, filled };
}

// Pulls the Tanks / Healers / Damage Dealers bullets out of an encounter's Overview section.
function journalRoles(sections) {
  const roles = {};
  const walk = list => { for (const x of list || []) {
    const t = x.title.toLowerCase();
    const key = /tank/.test(t) ? "tank" : /heal/.test(t) ? "healer" : /damage|dps/.test(t) ? "dps" : null;
    if (key && !roles[key]) roles[key] = [x.text, ...(x.sections || []).map(k => `${k.title}${k.text ? ": " + k.text : ""}`)].filter(Boolean).join("\n");
    walk(x.sections);
  } };
  const overview = sections.find(x => /overview/i.test(x.title));
  walk(overview ? overview.sections : sections);
  return roles;
}

function name(v) { return v == null ? "" : typeof v === "string" ? v : v.en_US || Object.values(v)[0] || ""; }

const spellStats = { asked: 0, filled: 0 };
async function journalInstance(id) {
  const ns = "namespace=static-us&locale=en_US";
  const [inst, media] = await Promise.all([
    bnet("us", `/data/wow/journal-instance/${id}?${ns}`),
    bnet("us", `/data/wow/media/journal-instance/${id}?${ns}`).catch(() => null)
  ]);
  const encounters = await pool(inst.encounters || [], 4, async e => {
    const enc = await bnet("us", `/data/wow/journal-encounter/${e.id}?${ns}`);
    const sections = journalSections(enc.sections);
    const fill = await fillSpellText(sections);
    spellStats.asked += fill.asked; spellStats.filled += fill.filled;
    return {
      id: enc.id, name: name(enc.name), description: journalText(name(enc.description)),
      creatures: (enc.creatures || []).map(c => name(c.name)).filter(Boolean),
      roles: journalRoles(sections),
      sections: sections.filter(x => !/overview/i.test(x.title))
    };
  });
  return {
    version: GUIDE_VERSION, id: inst.id, name: name(inst.name), type: inst.category?.type || "", description: journalText(name(inst.description)),
    image: (media?.assets || []).find(a => a.key === "tile")?.value || (media?.assets || [])[0]?.value || "",
    modes: (inst.modes || []).map(m => name(m.mode?.name)).filter(Boolean),
    encounters: encounters.filter(e => { if (e?.__error) log(`  guide: ${name(inst.name)} encounter failed: ${e.__error}`); return e && !e.__error; })
  };
}

async function buildGuide(tiers) {
  const ns = "namespace=static-us&locale=en_US";
  const index = await bnet("us", `/data/wow/journal-instance/index?${ns}`);
  const all = (index.instances || []).map(i => ({ id: i.id, name: name(i.name) }));
  const find = wanted => all.find(i => normName(i.name) === normName(wanted)) || all.find(i => normName(i.name).includes(normName(wanted)) || normName(wanted).includes(normName(i.name)));
  const out = { missing: [] };
  if (tiers.raid?.zone) {
    const hit = find(tiers.raid.zone);
    if (hit) out.raid = { updated: new Date().toISOString(), ...(await journalInstance(hit.id)) };
    else out.missing.push(tiers.raid.zone);
  }
  const dungeons = [];
  for (const d of tiers.mplus?.dungeons || []) {
    const hit = find(d);
    if (!hit) { out.missing.push(d); continue; }
    try { dungeons.push({ seasonName: d, ...(await journalInstance(hit.id)) }); }
    catch (e) { log(`  guide: ${d} failed: ${e.message}`); out.missing.push(d); }
  }
  out.dungeons = { version: GUIDE_VERSION, updated: new Date().toISOString(), season: tiers.mplus?.season?.name || "", instances: dungeons };
  return out;
}

async function writeGuide(tiers) {
  try {
    const g = await buildGuide(tiers);
    if (g.raid) await writeJson("guide/raid.json", g.raid);
    if (g.dungeons.instances.length) await writeJson("guide/dungeons.json", g.dungeons);
    log(`guide: raid ${g.raid ? g.raid.encounters.length + " bosses" : "missing"}, ${g.dungeons.instances.length} dungeons${g.missing.length ? `; not found in the Adventure Guide: ${g.missing.join(", ")}` : ""}; ability text filled for ${spellStats.filled}/${spellStats.asked} spells`);
  } catch (e) { log("guide failed:", e.message); }
}

/* --------------------------------- Classic Era and TBC talents --------------------------------- */
// The Classic section's tree layouts ship with the site (notes/trees-era.json and trees-tbc.json, from the
// wowsims projects). Talent names, icons and descriptions come from Wowhead's Classic and TBC tooltips.
// They never change, so they're only rebuilt when CLASSIC_VERSION changes.
const CLASSIC_VERSION = 2; // 2: descriptions after a "Requires …" line were being dropped
const CLASSIC_TOOLTIP = {
  era: env.CLASSIC_TOOLTIP_ERA || "https://nether.wowhead.com/classic/tooltip/spell/{id}?dataEnv=4&locale=0",
  tbc: env.CLASSIC_TOOLTIP_TBC || "https://nether.wowhead.com/tbc/tooltip/spell/{id}?dataEnv=5&locale=0"
};
async function classicTalents(version) {
  const trees = JSON.parse(await fs.readFile(path.join(env.NOTES_DIR || "notes", `trees-${version}.json`), "utf8"));
  const talents = Object.values(trees).flat().flatMap(t => t.talents);
  const out = {};
  let ok = 0;
  await pool(talents, 6, async t => {
    const get = id => getJson(CLASSIC_TOOLTIP[version].replace("{id}", id), { headers: { "User-Agent": "WoW Companion personal guide (GitHub Actions)" } }, 2).catch(() => null);
    const first = await get(t.ids[0]);
    const last = t.ids.length > 1 ? await get(t.ids[t.ids.length - 1]) : first;
    if (!first) return;
    const clean = j => tooltipText(j?.tooltip, j?.name).text.split("\n").filter(l => !/^(talent|requires .+|rank \d+|next rank:?.*)$/i.test(l)).join("\n");
    out[t.ids[0]] = { name: first.name, icon: first.icon ? `https://wow.zamimg.com/images/wow/icons/large/${first.icon}.jpg` : "", text: clean(last) || clean(first) };
    ok++;
  });
  log(`classic ${version}: talent tooltips for ${ok}/${talents.length}`);
  // If too many lookups failed, leave the version unset so the next run tries again.
  return { version: ok >= talents.length * 0.95 ? CLASSIC_VERSION : 0, updated: new Date().toISOString(), talents: out };
}
async function writeClassic() {
  for (const v of ["era", "tbc"]) {
    const have = await fs.readFile(path.join(OUT, `classic/talents-${v}.json`), "utf8").then(JSON.parse).catch(() => null);
    if (have?.version === CLASSIC_VERSION && Object.keys(have.talents || {}).length) continue;
    try { await writeJson(`classic/talents-${v}.json`, await classicTalents(v)); }
    catch (e) { log(`classic ${v} failed: ${e.message}`); }
  }
}

/* -------------------------------------------- main -------------------------------------------- */
async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const prevMeta = await copyLiveData();
  const refresh = String(env.REFRESH ?? "true") !== "false" || !prevMeta.updated;
  if (!refresh) {
    // An upload keeps the live data, but (re)builds the Adventure Guide files if they're missing or older.
    const liveGuide = await fs.readFile(path.join(OUT, "guide/raid.json"), "utf8").then(JSON.parse).catch(() => null);
    if ((!liveGuide || liveGuide.version !== GUIDE_VERSION) && env.BLIZZARD_CLIENT_ID) {
      bnetToken = await oauthToken(BNET_OAUTH, env.BLIZZARD_CLIENT_ID, env.BLIZZARD_CLIENT_SECRET);
      const liveTiers = await fs.readFile(path.join(OUT, "tiers.json"), "utf8").then(JSON.parse).catch(() => ({}));
      await writeGuide(liveTiers);
    }
    await writeClassic();
    await writeJson("meta.json", { ...prevMeta, files: await listFiles() });
    log("REFRESH=false: kept the live data");
    return;
  }

  bnetToken = await oauthToken(BNET_OAUTH, env.BLIZZARD_CLIENT_ID, env.BLIZZARD_CLIENT_SECRET);
  const specs = await loadSpecs();
  log("specs:", specs.length);
  const names = { enchants: new Map(), gems: new Map() };
  const status = {};
  const prevTiers = await fs.readFile(path.join(OUT, "tiers.json"), "utf8").then(JSON.parse).catch(() => ({}));
  const tiers = { ...prevTiers };
  const builds = new Map(specs.map(s => [s.id, {}]));
  for (const s of specs) {
    const prev = await fs.readFile(path.join(OUT, `builds/${s.id}.json`), "utf8").then(JSON.parse).catch(() => null);
    if (prev) builds.set(s.id, prev);
  }

  // Mythic+
  let mp = null;
  try { mp = await mythicPlus(specs); tiers.mplus = { updated: new Date().toISOString(), season: mp.season, runs: mp.runs, dungeons: mp.dungeons, roles: mp.tiers }; }
  catch (e) { log("Mythic+ failed:", e.message); }
  const pendingGear = [];
  if (mp) {
    await pool(specs, 2, async s => {
      try {
        const b = await mythicPlusBuild(s, mp.candidates, names);
        if (b) { builds.get(s.id).mplus = { ...b, source: "Raider.IO", updated: new Date().toISOString(), season: mp.season.name }; pendingGear.push(builds.get(s.id).mplus); }
        status[s.id] = { ...(status[s.id] || {}), mplus: b ? "ok" : "too few players" };
      } catch (e) { status[s.id] = { ...(status[s.id] || {}), mplus: "failed: " + e.message }; }
    });
    log("Mythic+ builds done");
  }

  // Raid
  try {
    wclToken = await oauthToken(`${WCL}/oauth/token`, env.WCL_CLIENT_ID, env.WCL_CLIENT_SECRET);
    const zone = await raidZone();
    const bosses = todaysBosses(zone);
    log("raid:", zone.name, "bosses today:", bosses.map(b => b.name).join(", "));
    const entryMap = new Map();
    const results = new Map();
    for (const s of specs) {
      try {
        const { build, perBoss } = await raidBuild(s, bosses, entryMap, names);
        results.set(s.id, perBoss);
        if (build) { builds.get(s.id).raid = { ...build, updated: new Date().toISOString(), zone: zone.name }; pendingGear.push(builds.get(s.id).raid); }
        status[s.id] = { ...(status[s.id] || {}), raid: build ? "ok" : "too few logs" };
      } catch (e) { status[s.id] = { ...(status[s.id] || {}), raid: "failed: " + e.message }; }
    }
    tiers.raid = { updated: new Date().toISOString(), zone: zone.name, bosses: bosses.map(b => b.name), roles: raidTiers(specs, results) };
    log("raid builds done");
  } catch (e) { log("raid failed:", e.message); }

  // Mythic+ fallback for specs that were too rare in the top Raider.IO runs.
  const missing = specs.filter(s => status[s.id]?.mplus === "too few players" || (!mp && !builds.get(s.id).mplus));
  if (missing.length && wclToken) {
    try {
      const zone = await mplusZone();
      if (zone) {
        let left = await wclPoints();
        log(`Mythic+ fallback for ${missing.length} specs via Warcraft Logs (${Math.floor(left)} points left this hour)`);
        for (const s of missing) {
          if (left < 15) { status[s.id].mplus += " (fallback skipped: Warcraft Logs allowance used up)"; continue; }
          try {
            const players = await mplusFallbackPlayers(s, zone);
            left -= 3;
            const b = players.length ? await mythicPlusBuild(s, null, names, players) : null;
            if (b) { builds.get(s.id).mplus = { ...b, topKey: null, source: "Warcraft Logs", updated: new Date().toISOString(), season: mp?.season?.name || zone.name }; pendingGear.push(builds.get(s.id).mplus); status[s.id].mplus = "ok (Warcraft Logs)"; }
          } catch (e) { status[s.id].mplus += ` (fallback failed: ${e.message})`; }
        }
      }
    } catch (e) { log("Mythic+ fallback failed:", e.message); }
  }

  // Gear lists are made last so every enchant and gem name learned along the way can be used.
  for (const b of pendingGear) if (typeof b.gear === "function") b.gear = b.gear();

  await writeGuide(tiers);
  await writeClassic();

  for (const s of specs) await writeJson(`builds/${s.id}.json`, { spec: s.id, name: s.name, className: s.className, role: s.role, ...builds.get(s.id) });
  await writeJson("tiers.json", tiers);
  await writeJson("meta.json", { updated: new Date().toISOString(), status, files: await listFiles() });
  const ok = Object.values(status);
  log(`done: Mythic+ ok for ${ok.filter(x => String(x.mplus).startsWith("ok")).length}/${specs.length} specs, raid ok for ${ok.filter(x => x.raid === "ok").length}/${specs.length}`);
}

main().catch(e => { console.error("BUILD FAILED:", e); process.exit(1); });
