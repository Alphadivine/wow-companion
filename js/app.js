/* WoW Companion — page routing and rendering. */
(() => {
  const D = window.WOW_DATA, API = window.WOW_API, T = window.WOW_TALENTS;
  const main = document.getElementById("main");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const colorOf = classId => D.CLASS_COLORS[classId] || "#e6c46a";
  const rgba = (hex, a) => { const n = parseInt(String(hex).slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem("wowc:" + k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("wowc:" + k, JSON.stringify(v)); } catch { /* blocked */ } }
  };
  const svgIcon = (path, color, size = 22, sw = 1.8) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;

  // Icon frame with a letter fallback if Blizzard's image can't load.
  const iconFrame = (src, letter, color, cls = "") =>
    `<span class="iframe ${cls}" style="--ic:${color}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="iframe-l">${esc(letter)}</span></span>`;

  /* ------------------------------ header ------------------------------ */
  const versionNav = document.getElementById("versionNav");
  const sectionNav = document.getElementById("sectionNav");
  const menuBtn = document.getElementById("menuBtn");
  menuBtn.addEventListener("click", () => {
    const open = sectionNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  function renderHeader(version, section) {
    versionNav.innerHTML = D.VERSIONS.map(v =>
      `<a href="${v.href}" class="${v.id === version ? "on" : ""}" ${v.id === version ? 'aria-current="page"' : ""}>${v.label}</a>`).join("");
    sectionNav.innerHTML = version === "retail"
      ? D.SECTIONS.map(s => `<a href="${s.href}" class="${s.id === section ? "on" : ""}${s.ready ? "" : " later"}" ${s.id === section ? 'aria-current="page"' : ""}>${s.ready ? "" : `<svg class="lock" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"/></svg>`}${s.label}${s.ready ? "" : `<span class="sr"> (coming soon)</span>`}</a>`).join("")
      : `<a href="#/">Back to Retail</a>`;
    sectionNav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }

  const banner = document.getElementById("setupBanner");
  if (!API.configured) {
    banner.hidden = false;
    banner.innerHTML = `<strong>Almost there:</strong> add your Worker address to <code>config.js</code> to load live game data. See <em>Docs/Setup guide.md</em>, step 4.`;
  }

  /* ------------------------------ helpers ------------------------------ */
  const loading = (text = "Loading from Blizzard…") => `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${esc(text)}</div>`;
  function errorBox(err, retry) {
    const msg = err && err.setup
      ? "Live data isn't connected yet. Add your Worker address to config.js (setup guide, step 4)."
      : (err && err.message) || "Something went wrong.";
    const id = "retry" + Math.random().toString(36).slice(2, 7);
    setTimeout(() => { const b = document.getElementById(id); if (b) b.addEventListener("click", retry); });
    return `<div class="errbox" role="alert"><p>${esc(msg)}</p>${err && err.setup ? "" : `<button class="btn" id="${id}" type="button">Try again</button>`}</div>`;
  }
  function pageHero({ kicker, title, sub = "", tint = "rgba(230,196,106,0.18)", art = "", extra = "" }) {
    return `<section class="hero" style="--tint:${tint}">
      ${art}
      <div class="wrap hero-in">
        <div class="hero-text rise">
          <span class="kicker">${kicker}</span>
          <h1>${title}</h1>
          ${sub ? `<p class="hero-sub">${sub}</p>` : ""}
        </div>
        ${extra}
      </div>
    </section>`;
  }
  const moonArt = color => `<svg class="hero-art" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx="1130" cy="110" r="62" fill="#f3e3b5" opacity=".9"/><circle cx="1154" cy="96" r="56" fill="#121520"/>
      <circle cx="1130" cy="110" r="104" fill="none" stroke="${color}" stroke-opacity=".3" stroke-width="2"/>
      <g fill="#f3e3b5"><circle class="twinkle" cx="960" cy="60" r="2"/><circle class="twinkle d1" cx="1290" cy="170" r="1.6"/><circle class="twinkle d2" cx="860" cy="130" r="1.4"/><circle class="twinkle d3" cx="1350" cy="50" r="2"/></g>
      <path d="M0 300V230l120-60 90 40 140-90 120 70 110-50 160 100 130-60 150 80 120-70 140 60 160-90v200z" fill="#161a26"/>
      <path d="M0 300v-40l160-30 140 25 180-50 150 40 170-35 160 40 140-25 170 35 170-25v65z" fill="#0c0e13"/>
    </svg>`;
  const daysUntil = iso => Math.max(0, Math.ceil((Date.parse(iso + "T00:00:00-06:00") - Date.now()) / 864e5));

  /* ------------------------------ pages ------------------------------ */
  async function pageHome() {
    const last = store.get("lastSpec");
    main.innerHTML = `
      ${pageHero({
        kicker: "Retail · Midnight",
        title: "Everything for your next session",
        sub: "Pick a class and spec to see the build top players run, with an import string, stat priority and best in slot, or open your own characters to see what to upgrade.",
        art: moonArt("#FF7C0A"),
        extra: last ? `<a class="jump rise2" href="#/spec/${last.id}" style="--ic:${colorOf(last.classId)}">
            ${iconFrame(last.icon, last.name[0], colorOf(last.classId), "sm")}
            <span><small>Jump back to</small><strong>${esc(last.name)} ${esc(last.className)}</strong></span></a>` : ""
      })}
      <div class="wrap stack">
        <section aria-labelledby="pick-h" class="rise2">
          <div class="sec-head"><h2 id="pick-h">Pick a class</h2><a href="#/specs">All classes and specs →</a></div>
          <div id="homeClasses">${loading()}</div>
        </section>
        <div class="split rise3">
          <a class="panel locked lift home-chars" href="#/characters" aria-labelledby="chars-h">
            <div class="panel-ic">${svgIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", "#e6c46a", 26)}</div>
            <div>
              <h2 id="chars-h">My characters</h2>
              <p>${(() => { const sv = store.get("characters"); return sv?.list?.length ? `${sv.list.length} characters loaded. Open one to compare its gear, talents and stats with the top build.` : "Sign in with Battle.net once to load your characters and compare each one with the top build."; })()}</p>
              <span class="sc-go">${store.get("characters")?.list?.length ? "Open My Characters →" : "Sign in →"}</span>
            </div>
          </a>
          <section class="panel" aria-labelledby="road-h">
            <h2 id="road-h">Build progress</h2>
            <ol class="road">${D.ROADMAP.map(r => `<li class="${r.done ? "done" : ""}"><span class="road-n">${r.done ? "✓" : r.phase}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.text)}</small></span></li>`).join("")}</ol>
          </section>
        </div>
        <a class="forever-strip lift rise3" href="#/forever">
          <span><small>Coming November 4 · ${daysUntil(D.FOREVER.launch)} days</small><strong>World of Warcraft: Forever</strong><em>See what's new in the third version of WoW.</em></span>
          <span class="btn gold">Explore Forever</span>
        </a>
      </div>`;
    loadClassGrid(document.getElementById("homeClasses"), id => `#/specs/${id}`);
  }

  async function loadClassGrid(el, hrefFor, activeId) {
    try {
      const { classes } = await API.classes();
      el.innerHTML = `<div class="class-grid">${classes.map(c => {
        const col = colorOf(c.id);
        return `<a class="class-tile lift ${String(c.id) === String(activeId) ? "on" : ""}" href="${hrefFor(c.id)}" style="--ic:${col}" ${String(c.id) === String(activeId) ? 'aria-current="true"' : ""}>
          ${iconFrame(c.icon, c.name[0], col)}
          <span class="ct-name">${esc(c.name)}</span>
          <span class="ct-specs">${c.specs.map(s => esc(s.name)).join(" · ")}</span>
        </a>`;
      }).join("")}</div>`;
    } catch (err) {
      el.innerHTML = errorBox(err, () => { el.innerHTML = loading(); loadClassGrid(el, hrefFor, activeId); });
    }
  }

  async function pageSpecs(classId) {
    main.innerHTML = `
      ${pageHero({ kicker: "Retail · Talents from the Battle.net API", title: "Classes &amp; specs", sub: "Choose a class, then a spec to see its class, hero and spec talent trees.", tint: "rgba(194,124,245,0.16)" })}
      <div class="wrap stack">
        <div id="classGrid">${loading()}</div>
        <div id="specList"></div>
      </div>`;
    loadClassGrid(document.getElementById("classGrid"), id => `#/specs/${id}`, classId);
    if (classId) loadSpecList(classId);
  }

  async function loadSpecList(classId) {
    const el = document.getElementById("specList");
    el.innerHTML = loading();
    try {
      const c = await API.cls(classId);
      const col = colorOf(c.id);
      el.innerHTML = `<section class="spec-section fade" aria-labelledby="spec-h" style="--ic:${col}">
        <div class="sec-head"><h2 id="spec-h"><span style="color:${col}">${esc(c.name)}</span> specializations</h2></div>
        <div class="spec-grid">${c.specs.map(s => {
          const role = D.ROLES[s.role] || D.ROLES.DAMAGE;
          return `<a class="spec-card lift" href="#/spec/${s.id}" style="--ic:${col}">
            <div class="sc-top">${iconFrame(s.icon, s.name[0], col, "avatar")}
              <div><h3>${esc(s.name)}</h3><span class="role" style="--rc:${role.color}">${svgIcon(role.icon, role.color, 16, 2)}${esc(s.roleName || role.label)}</span></div></div>
            <p>${esc(s.description)}</p>
            <span class="sc-go">View talent tree →</span>
          </a>`;
        }).join("")}</div>
      </section>`;
      el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    } catch (err) {
      el.innerHTML = errorBox(err, () => loadSpecList(classId));
    }
  }

  async function pageSpec(id) {
    main.innerHTML = `<div class="wrap">${loading("Loading talent trees…")}</div>`;
    let s;
    const extras = Promise.all([API.builds(id), API.tiers()]);
    try { s = await API.spec(id); } catch (err) { main.innerHTML = `<div class="wrap stack">${errorBox(err, () => pageSpec(id))}</div>`; return; }
    const [buildFile, tiers] = await extras;
    const col = colorOf(s.class.id);
    const role = D.ROLES[s.role] || D.ROLES.DAMAGE;
    store.set("lastSpec", { id: s.id, name: s.name, className: s.class.name, classId: s.class.id, icon: s.icon });
    document.title = `${s.name} ${s.class.name} · WoW Companion`;

    const trees = s.trees || [];
    const kindLabel = { class: "Class", hero: "Hero", spec: "Spec" };
    const modes = [
      buildFile?.mplus?.picks?.length ? { id: "mplus", label: "Mythic+", b: buildFile.mplus } : null,
      buildFile?.raid?.picks?.length ? { id: "raid", label: "Raid", b: buildFile.raid } : null
    ].filter(Boolean);
    const saved = store.get("buildMode");
    let mode = modes.find(m => m.id === saved) || modes[0] || null;
    const tierBadge = (key, label) => {
      const row = tiers?.[key]?.roles?.[s.role]?.find(r => r.spec === s.id);
      return row && row.tier !== "?" ? `<a class="tier-badge t-${row.tier}" href="#/tiers/${key}">${label} tier <strong>${row.tier}</strong></a>` : "";
    };

    main.innerHTML = `
      <section class="hero spec-hero" style="--tint:${rgba(col, 0.28)};--ic:${col}">
        ${moonArt(col)}
        <div class="wrap hero-in">
          ${iconFrame(s.icon, s.name[0], col, "xl")}
          <div class="hero-text rise">
            <span class="kicker" style="color:${col}">${esc(s.class.name)} · ${esc(s.roleName || role.label)}${s.primaryStat ? ` · ${esc(s.primaryStat)}` : ""}</span>
            <h1>${esc(s.name)} ${esc(s.class.name)}</h1>
            <p class="hero-sub">${esc(s.description)}</p>
            <div class="badges">${tierBadge("mplus", "Mythic+")}${tierBadge("raid", "Raid")}</div>
          </div>
        </div>
        <div class="wrap">
          <div class="tabs" role="tablist" aria-label="Talent trees">
            ${trees.map((t, i) => `<button type="button" role="tab" id="tab${i}" aria-controls="treePanel" aria-selected="false" data-t="${i}">
              <small>${kindLabel[t.kind] || ""}<span class="in-build" hidden> · in build</span></small>${esc(t.name)}</button>`).join("")}
          </div>
        </div>
      </section>
      <div class="wrap stack">
        <section class="panel build-bar" aria-labelledby="build-h">
          <div class="build-top">
            <h2 id="build-h">Top build</h2>
            <div class="seg" role="group" aria-label="Build to show">
              ${modes.map(m => `<button type="button" data-mode="${m.id}">${m.label}</button>`).join("")}
              <button type="button" data-mode="none">Tree only</button>
              <span class="seg-soon" title="Coming in phase 7">PvP soon</span>
            </div>
          </div>
          <div id="buildInfo"></div>
        </section>
        ${s.treeMissing || !trees.length ? `<div class="errbox"><p>Blizzard didn't return a talent tree for this spec yet. It usually appears within a day of a patch.</p></div>` : `
        <div class="tree-layout">
          <section class="panel tree-panel" id="treePanel" role="tabpanel" aria-labelledby="tab0">
            <div class="tree-tools">
              <label for="tsearch" class="sr">Find a talent</label>
              <input id="tsearch" type="search" placeholder="Find a talent…" autocomplete="off">
              <span id="tcount" class="muted" aria-live="polite"></span>
            </div>
            <div class="legend" aria-hidden="true">
              <span class="lg-build"><i class="lg pick"></i>In build</span><span><i class="lg sq"></i>Active</span><span><i class="lg circ"></i>Passive</span><span><i class="lg oct"></i>Choice</span><span><i class="lg free"></i>Free</span><span><i class="lg var"></i>Varies by spec</span>
            </div>
            <div id="treeHost" class="tree-host"></div>
          </section>
          <aside class="panel tip-panel" aria-labelledby="tip-h">
            <div class="tip-head"><h2 id="tip-h">Talent details</h2><button type="button" class="sheet-close" id="sheetClose" aria-label="Close talent details">✕</button></div>
            <div id="tipBody" aria-live="polite">${T.details(null)}</div>
          </aside>
        </div>`}
        <div id="buildExtras"></div>
      </div>`;

    const buildInfo = document.getElementById("buildInfo");
    const extrasEl = document.getElementById("buildExtras");
    const segBtns = [...main.querySelectorAll(".seg button")];
    const tabs = [...main.querySelectorAll('[role="tab"]')];
    let current = 0, view, buildMap = null;

    const renderBuildInfo = () => {
      segBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === (mode ? mode.id : "none"))));
      if (!modes.length) {
        buildInfo.innerHTML = `<p class="muted">Build data for this spec hasn't been collected yet. It refreshes every morning from top Mythic+ runs and raid logs.</p>`;
        extrasEl.innerHTML = "";
        return;
      }
      if (!mode) { buildInfo.innerHTML = `<p class="muted">Showing the plain talent tree. Pick Mythic+ or Raid to highlight what top players take.</p>`; extrasEl.innerHTML = ""; return; }
      const b = mode.b;
      const src = mode.id === "mplus"
        ? `${b.sample} top Mythic+ players this season${b.topKey ? `, keys up to +${b.topKey}` : ""}${b.source === "Warcraft Logs" ? " (from Warcraft Logs, since few top Raider.IO runs had this spec)" : ""}`
        : `${b.sample} top raid parses on ${(b.bosses || []).map(x => `${esc(x.name)} (${x.difficulty})`).join(", ")}`;
      const importBlock = b.importString
        ? `<div class="import">
            <label for="importStr">Import string</label>
            <input id="importStr" readonly value="${esc(b.importString)}">
            <button type="button" class="btn gold" id="copyBtn">Copy build</button>
          </div>
          <p class="muted small">From ${esc(b.player.name)} (${esc(b.player.realm)}, ${esc(String(b.player.region).toUpperCase())})${b.player.differs ? `, whose loadout differs from the common build by ${b.player.differs} talent${b.player.differs === 1 ? "" : "s"}` : ", an exact match"}. In game: Talents → Import.</p>`
        : `<p class="muted small">No top player's saved loadout matches this build closely enough to share an import string today, so the build is shown on the tree only.</p>`;
      buildInfo.innerHTML = `<p class="build-src">Based on ${src}. Updated ${new Date(b.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</p>${importBlock}`;
      const copy = document.getElementById("copyBtn");
      if (copy) copy.addEventListener("click", async () => {
        const inp = document.getElementById("importStr");
        try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand && document.execCommand("copy"); }
        copy.textContent = "Copied ✓"; setTimeout(() => { copy.textContent = "Copy build"; }, 2000);
      });
      extrasEl.innerHTML = buildExtras(b, col);
    };

    const show = i => {
      current = i;
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      const panel = document.getElementById("treePanel");
      if (!panel) return;
      panel.setAttribute("aria-labelledby", "tab" + i);
      panel.classList.toggle("has-build", !!buildMap);
      view = T.render(host, trees[i], { color: col, icons: API.icons, build: buildMap, onSelect: (n, picked, pick) => {
        tipBody.innerHTML = T.details(n, pick, !!buildMap);
        if (picked && narrow.matches) tipPanel.classList.add("sheet-open");
      } });
      tipBody.innerHTML = T.details(null);
      tipPanel.classList.remove("sheet-open");
      if (search.value) runSearch();
    };

    const applyMode = () => {
      buildMap = mode ? new Map(mode.b.picks.map(p => [p.node, p])) : null;
      // Mark which tabs hold build talents, and open the spec tree (or the build's hero tree from a hero tab).
      tabs.forEach((t, i) => {
        const has = buildMap ? trees[i].nodes.some(n => buildMap.has(n.id) || (n.mergedIds || []).some(x => buildMap.has(x))) : false;
        t.querySelector(".in-build").hidden = !(has && trees[i].kind === "hero");
        t.classList.toggle("dim-tab", !!buildMap && trees[i].kind === "hero" && !has);
      });
      renderBuildInfo();
      if (trees.length) show(current);
    };

    segBtns.forEach(b => b.addEventListener("click", () => {
      mode = modes.find(m => m.id === b.dataset.mode) || null;
      store.set("buildMode", mode ? mode.id : "none");
      applyMode();
    }));

    if (!trees.length) { renderBuildInfo(); return; }
    const host = document.getElementById("treeHost");
    const tipBody = document.getElementById("tipBody");
    const search = document.getElementById("tsearch");
    const count = document.getElementById("tcount");
    const tipPanel = main.querySelector(".tip-panel");
    const narrow = matchMedia("(max-width: 900px)");
    document.getElementById("sheetClose").addEventListener("click", () => tipPanel.classList.remove("sheet-open"));
    const runSearch = () => {
      const hits = view ? view.filter(search.value) : 0;
      count.textContent = search.value.trim() ? `${hits} match${hits === 1 ? "" : "es"}` : "";
    };
    tabs.forEach((b, i) => {
      b.addEventListener("click", () => show(i));
      b.addEventListener("keydown", e => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = (i + d + tabs.length) % tabs.length;
        tabs[n].focus(); show(n);
      });
    });
    search.addEventListener("input", runSearch);
    current = Math.max(0, trees.findIndex(t => t.kind === "spec"));
    applyMode();
  }

  // Stat priority and best-in-slot panels for a build.
  function buildExtras(b, col) {
    const stats = b.stats?.length ? `
      <section class="panel" aria-labelledby="stat-h">
        <h2 id="stat-h">Stat priority</h2>
        <p class="muted small">Share of secondary stats on top players' characters.</p>
        <ol class="stat-list">${b.stats.map((x, i) => `
          <li><span class="stat-rank">${i + 1}</span><span class="stat-body"><span class="stat-row"><strong>${esc(x.stat)}</strong><span>${x.pct}%</span></span>
          <span class="stat-bar"><span style="width:${Math.min(100, x.pct * 2)}%;background:${col}"></span></span></span></li>`).join("")}</ol>
      </section>` : "";
    const gear = b.gear?.length ? `
      <section class="panel gear-panel" aria-labelledby="gear-h">
        <h2 id="gear-h">Best in slot</h2>
        <p class="muted small">The most-used items in each slot among the same top players.</p>
        <div class="gear-grid">${b.gear.map(slot => `
          <div class="gear-slot"><h3>${esc(slot.slot)}</h3>${slot.items.map((it, i) => `
            <div class="gear-item${i ? " alt" : ""}">
              <span class="gear-ic q-${esc(it.quality)}">${it.icon ? `<img src="${esc(it.icon)}" alt="" loading="lazy" onerror="WOW_gearIconFallback(this)">` : ""}</span>
              <span class="gear-txt"><a class="q-${esc(it.quality)}" href="https://www.wowhead.com/item=${it.id}" target="_blank" rel="noopener">${esc(it.name)}</a>
                <small>${it.ilvl ? `ilvl ${it.ilvl} · ` : ""}${it.pct}% use it${it.enchant ? ` · ${esc(it.enchant)}` : ""}${it.gems?.length ? ` · ${it.gems.map(esc).join(", ")}` : ""}</small></span>
            </div>`).join("")}</div>`).join("")}</div>
      </section>` : "";
    return stats || gear ? `<div class="split extras">${stats}${gear}</div>` : "";
  }

  async function pageTiers(which) {
    which = which === "raid" ? "raid" : "mplus";
    main.innerHTML = `
      ${pageHero({ kicker: "Retail · Updated every morning", title: "Tier lists", sub: "Which specs top players bring right now: Mythic+ from Raider.IO's top runs, raid from Warcraft Logs' top parses." })}
      <div class="wrap stack"><div id="tierBody">${loading("Loading tier lists…")}</div></div>`;
    const [tiers, cls] = await Promise.all([API.tiers(), API.classes().catch(() => API.classes()).catch(() => null)]);
    const body = document.getElementById("tierBody");
    if (!body) return;
    if (!tiers || !tiers[which]) { body.innerHTML = `<section class="panel"><p>Tier lists haven't been built yet. They're created by the daily data job; check back after it runs.</p></section>`; return; }
    const specInfo = new Map();
    for (const c of cls?.classes || []) for (const sp of c.specs) specInfo.set(sp.id, { name: sp.name, className: c.name, classId: c.id });
    const t = tiers[which];
    const note = which === "mplus"
      ? `Share of slots in the top ${t.runs} ${esc(t.season?.name || "")} runs. A tank or healer share is out of every run; a DPS share is out of the three DPS slots.`
      : `Median ${"performance"} of the top 50 players per spec on ${(t.bosses || []).map(esc).join(", ")}, compared with the best spec in the same role. Bosses rotate daily.`;
    const roleBlock = roleKey => {
      const rows = t.roles?.[roleKey] || [];
      const role = D.ROLES[roleKey];
      const groups = ["S", "A", "B", "C"].map(tier => ({ tier, specs: rows.filter(r => r.tier === tier) })).filter(g => g.specs.length);
      return `<section class="panel tier-role">
        <h2>${svgIcon(role.icon, role.color, 20, 2)} ${roleKey === "DAMAGE" ? "DPS" : role.label + "s"}</h2>
        ${groups.map(g => `<div class="tier-row"><span class="tier-letter t-${g.tier}">${g.tier}</span><div class="tier-specs">${g.specs.map(r => {
          const info = specInfo.get(r.spec) || (r.name ? { name: r.name, className: r.className || "", classId: r.classId || 0 } : { name: `Spec ${r.spec}`, className: "", classId: 0 });
          const value = which === "mplus" ? `${r.share}%` : `${r.score}%`;
          return `<a class="tier-spec" href="#/spec/${r.spec}" style="--ic:${colorOf(info.classId)}"><span class="ts-name">${esc(info.name)} <span>${esc(info.className)}</span></span><span class="ts-val">${value}</span></a>`;
        }).join("")}</div></div>`).join("")}
      </section>`;
    };
    body.innerHTML = `
      <div class="seg tier-seg" role="group" aria-label="Content">
        <a href="#/tiers/mplus" aria-pressed="${which === "mplus"}">Mythic+</a>
        <a href="#/tiers/raid" aria-pressed="${which === "raid"}">Raid</a>
      </div>
      <p class="muted small">${note} Updated ${new Date(t.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</p>
      <div class="tier-grid">${["TANK", "HEALER", "DAMAGE"].map(roleBlock).join("")}</div>`;
  }

  /* ------------------------------ My Characters ------------------------------ */
  const ago = iso => {
    const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} days ago`;
  };
  const charHref = c => `#/character/${encodeURIComponent(c.realmSlug)}/${encodeURIComponent(c.name.toLowerCase())}`;
  const signInButton = (label = "Sign in with Battle.net") => `<a class="btn gold" href="${esc(API.signInUrl())}">${esc(label)}</a>`;
  const SIGNIN_FAIL = {
    cancelled: "Sign-in was cancelled on Battle.net, so nothing was loaded.",
    token: "Battle.net didn't accept the sign-in. If this keeps happening, check that the Worker's callback address is listed in your Blizzard API client (setup guide, step 7).",
    profile: "Signed in, but Blizzard couldn't load the character list just now. Try again in a minute.",
    battlenet: "Battle.net didn't finish the sign-in. Try again.",
    network: "The Worker couldn't reach Battle.net. Try again in a minute."
  };
  const raidSummary = (c, zoneName) => {
    const inst = c.raids?.find(r => zoneName && r.name === zoneName) || c.raids?.[c.raids.length - 1];
    if (!inst) return null;
    const order = ["MYTHIC", "HEROIC", "NORMAL", "LFR"];
    const best = order.map(t => inst.modes.find(m => m.type === t)).find(m => m && m.done > 0);
    return best ? { raid: inst.name, text: `${best.difficulty} ${best.done}/${best.total}` } : { raid: inst.name, text: "Not started" };
  };

  async function pageCharacters(sub, arg) {
    document.title = "My Characters · WoW Companion";
    if (sub === "signin" && arg) {
      // The Worker sends the character list back in the address after the #, which never leaves the browser.
      try {
        const b64 = arg.replace(/-/g, "+").replace(/_/g, "/");
        const v = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))));
        const list = (v.list || []).map(c => ({ name: c.n, realm: c.r, realmSlug: c.s, level: c.l, classId: c.c, className: c.k, race: c.a, faction: c.f }));
        store.set("characters", { list, at: v.at || new Date().toISOString() });
        location.replace("#/characters"); // also takes the list back out of the address bar and history
      } catch {
        main.innerHTML = `<div class="wrap stack"><section class="panel locked-big"><h2>Sign-in didn't finish</h2><p>The character list from Battle.net couldn't be read. Press Sign in again.</p>${signInButton("Sign in again")}</section></div>`;
      }
      return;
    }
    const saved = store.get("characters");
    const failNote = sub === "signin-failed" ? `<div class="errbox" role="alert"><p>${esc(SIGNIN_FAIL[decodeURIComponent(arg || "")] || SIGNIN_FAIL.battlenet)}</p></div>` : "";

    if (!saved || !Array.isArray(saved.list)) {
      main.innerHTML = `
        ${pageHero({ kicker: "Retail · Battle.net", title: "My characters", sub: "Sign in once to load your characters, then see how each one's gear, talents and stats compare with the top build." })}
        <div class="wrap stack">${failNote}
          <section class="panel locked-big signin">
            <div class="panel-ic big">${svgIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", "#e6c46a", 34, 1.6)}</div>
            <h2>Sign in with Battle.net</h2>
            <p>WoW Companion only asks Battle.net for your World of Warcraft character list. It never sees your password, and the sign-in is used once and thrown away. The list is saved on this device, so you only sign in again to pick up new characters.</p>
            ${signInButton()}
          </section>
        </div>`;
      return;
    }

    const list = saved.list;
    const maxLevel = Math.max(0, ...list.map(c => c.level));
    const top = list.filter(c => c.level === maxLevel);
    const rest = list.filter(c => c.level !== maxLevel);
    const card = (c, live) => `
      <a class="char-card${live ? " live" : ""}" href="${charHref(c)}" style="--ic:${colorOf(c.classId)}" data-key="${esc(c.realmSlug + "/" + c.name)}">
        ${iconFrame("", c.name[0], colorOf(c.classId), "avatar")}
        <span class="cc-body">
          <strong class="cc-name">${esc(c.name)}</strong>
          <span class="cc-line"><span class="cc-spec">${esc(c.className)}</span> · Level ${c.level}</span>
          <span class="cc-line muted">${esc(c.realm)}</span>
          ${live ? `<span class="cc-stats"><span class="cc-chip">ilvl …</span></span>` : ""}
        </span>
      </a>`;
    main.innerHTML = `
      ${pageHero({ kicker: "Retail · Battle.net", title: "My characters", sub: `${list.length} character${list.length === 1 ? "" : "s"} on your account. List saved ${ago(saved.at)}.`,
        extra: `<div class="hero-actions rise2">${signInButton("Update list")}<button type="button" class="btn" id="forgetBtn">Forget list</button></div>` })}
      <div class="wrap stack">${failNote}
        ${list.length ? `
        <section aria-labelledby="max-h">
          <div class="sec-head"><h2 id="max-h">Level ${maxLevel}</h2><span class="muted small">Pick a character to compare it with the top build</span></div>
          <div class="char-grid">${top.map(c => card(c, true)).join("")}</div>
        </section>
        ${rest.length ? `<details class="more-chars"${store.get("showAllChars") ? " open" : ""}>
          <summary>Show ${rest.length} character${rest.length === 1 ? "" : "s"} still leveling</summary>
          <div class="char-grid">${rest.map(c => card(c, false)).join("")}</div>
        </details>` : ""}` : `<section class="panel locked-big"><h2>No characters found</h2><p>Battle.net didn't return any World of Warcraft characters for this account in the US region.</p></section>`}
      </div>`;

    document.getElementById("forgetBtn").addEventListener("click", () => {
      try { localStorage.removeItem("wowc:characters"); } catch { /* blocked */ }
      pageCharacters();
    });
    const det = main.querySelector(".more-chars");
    if (det) det.addEventListener("toggle", () => store.set("showAllChars", det.open));

    // Fill in spec, item level, M+ score and portraits for max-level characters, three at a time.
    const tiers = await API.tiers();
    const zone = tiers?.raid?.zone?.name || tiers?.raid?.zone || "";
    const queue = top.slice();
    const work = async () => {
      for (let c; (c = queue.shift());) {
        const el = main.querySelector(`.char-card[data-key="${CSS.escape(c.realmSlug + "/" + c.name)}"]`);
        if (!el) continue;
        try {
          const d = await API.character(c.realmSlug, c.name);
          if (!el.isConnected) return;
          if (d.avatar) el.querySelector(".iframe").insertAdjacentHTML("afterbegin", `<img src="${esc(d.avatar)}" alt="" loading="lazy" onerror="this.remove()">`);
          if (d.specName) el.querySelector(".cc-spec").textContent = `${d.specName} ${d.className}`;
          const raid = raidSummary(d, zone);
          el.querySelector(".cc-stats").innerHTML = `<span class="cc-chip">ilvl <strong>${d.ilvl}</strong></span>${d.mplus ? `<span class="cc-chip">M+ <strong style="color:${esc(d.mplus.color || "inherit")}">${d.mplus.rating}</strong></span>` : ""}${raid ? `<span class="cc-chip">${esc(raid.text)}</span>` : ""}`;
        } catch (err) {
          if (el.isConnected) el.querySelector(".cc-stats").innerHTML = `<span class="cc-chip warn">${err.status === 404 ? "Hidden or inactive" : "Couldn't load"}</span>`;
        }
      }
    };
    await Promise.all([work(), work(), work()]);
  }

  const TOP_SLOT = { "Ring 1": "Rings", "Ring 2": "Rings", "Trinket 1": "Trinkets", "Trinket 2": "Trinkets" };
  const okIcon = svgIcon("M5 12l5 5 9-10", "#9fe3ad", 18, 2.4);
  const warnIcon = svgIcon("M12 4l9 16H3zM12 10v4M12 17v.5", "#f0b24a", 18, 2);
  const infoIcon = svgIcon("M12 8v.5M12 11v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "#8fb6ff", 18, 2);

  async function pageCharacter(realmSlug, who, fresh) {
    main.innerHTML = `<div class="wrap">${loading("Loading your character from Blizzard…")}</div>`;
    let c;
    try { c = await API.character(realmSlug, who, fresh); }
    catch (err) {
      main.innerHTML = `<div class="wrap stack"><p><a href="#/characters">← All characters</a></p>${errorBox(err, () => pageCharacter(realmSlug, who, true))}</div>`;
      return;
    }
    const col = colorOf(c.classId);
    document.title = `${c.name} · WoW Companion`;
    if (!c.specId) { main.innerHTML = `<div class="wrap stack"><div class="errbox"><p>Blizzard didn't say which spec ${esc(c.name)} is using. Log in to the character once and try again.</p></div></div>`; return; }
    let spec, buildFile, tiers;
    try { [spec, buildFile, tiers] = await Promise.all([API.spec(c.specId), API.builds(c.specId), API.tiers()]); }
    catch (err) { main.innerHTML = `<div class="wrap stack">${errorBox(err, () => pageCharacter(realmSlug, who))}</div>`; return; }
    const zone = tiers?.raid?.zone?.name || tiers?.raid?.zone || "";
    const raid = raidSummary(c, zone);
    const trees = spec.trees || [];
    const { map: mine, unmatched } = T.resolveTalents(trees, c.talents?.list);
    const modes = [
      buildFile?.mplus?.picks?.length ? { id: "mplus", label: "Mythic+", b: buildFile.mplus } : null,
      buildFile?.raid?.picks?.length ? { id: "raid", label: "Raid", b: buildFile.raid } : null
    ].filter(Boolean);
    let mode = modes.find(m => m.id === store.get("buildMode")) || modes[0] || null;

    main.innerHTML = `
      <section class="hero spec-hero char-hero" style="--tint:${rgba(col, 0.28)};--ic:${col}">
        ${moonArt(col)}
        <div class="wrap hero-in">
          ${iconFrame(c.avatar || spec.icon, c.name[0], col, "xl")}
          <div class="hero-text rise">
            <a class="back" href="#/characters">← All characters</a>
            <span class="kicker" style="color:${col}">Level ${c.level} ${esc(c.race)} · ${esc(c.realm)}${c.guild ? ` · ${esc(c.guild)}` : ""}</span>
            <h1>${esc(c.name)}</h1>
            <p class="hero-sub">${esc(c.specName || spec.name)} ${esc(c.className)}</p>
            <div class="badges">
              <span class="tier-badge">Item level <strong>${c.ilvl}</strong></span>
              ${c.mplus ? `<span class="tier-badge">Mythic+ <strong style="color:${esc(c.mplus.color || "inherit")}">${c.mplus.rating}</strong></span>` : ""}
              ${raid ? `<span class="tier-badge">${esc(raid.raid)} <strong>${esc(raid.text)}</strong></span>` : ""}
            </div>
          </div>
        </div>
      </section>
      <div class="wrap stack">
        <section class="panel build-bar" aria-labelledby="cmp-h">
          <div class="build-top">
            <h2 id="cmp-h">Compare with</h2>
            <div class="seg" role="group" aria-label="Top build to compare with">${modes.map(m => `<button type="button" data-mode="${m.id}">${m.label}</button>`).join("")}</div>
          </div>
          <p class="muted small">Gear and talents from Blizzard, loaded ${ago(c.fetched)}. Blizzard updates a character after you log out. <button type="button" class="linkbtn" id="refreshChar">Refresh now</button></p>
        </section>
        <div id="cmpBody"></div>
      </div>`;

    document.getElementById("refreshChar").addEventListener("click", () => pageCharacter(realmSlug, who, true));
    const segBtns = [...main.querySelectorAll(".seg button")];
    const body = document.getElementById("cmpBody");

    const draw = () => {
      segBtns.forEach(b => b.setAttribute("aria-pressed", String(mode && b.dataset.mode === mode.id)));
      if (!mode) { body.innerHTML = `<div class="errbox"><p>There's no top build for ${esc(spec.name)} ${esc(c.className)} yet. Builds refresh every morning.</p></div>`; return; }
      const b = mode.b;
      const top = new Map(b.picks.map(p => [p.node, p]));
      // Which hero tree each side uses.
      const heroOf = map => trees.find(t => t.kind === "hero" && t.nodes.some(n => [n.id, ...(n.mergedIds || [])].some(id => map.get(id) && !map.get(id).granted)));
      const myHero = heroOf(mine), topHero = heroOf(top);
      const heroDiffers = myHero && topHero && myHero !== topHero;
      const diffs = T.diffBuild(trees, mine, top).filter(d => !(heroDiffers && d.tree.kind === "hero"));

      // Gear.
      const rows = c.items.map(it => {
        const slot = b.gear?.find(g => g.slot === (TOP_SLOT[it.slot] || it.slot));
        const isTop = !!slot?.items.some(t => t.id === it.id);
        const wantsEnchant = !!slot?.items[0]?.enchant;
        return { it, slot, isTop, noEnchant: wantsEnchant && !it.enchant, emptySockets: (it.sockets || []).filter(s => !s).length };
      });
      const noEnchant = rows.filter(r => r.noEnchant), sockets = rows.filter(r => r.emptySockets);
      const low = c.items.filter(i => i.ilvl && i.ilvl <= c.ilvl - 6).sort((a, z) => a.ilvl - z.ilvl).slice(0, 3);
      const statGap = (b.stats || []).map(t => ({ stat: t.stat, top: t.pct, mine: c.stats?.find(s => s.stat === t.stat)?.pct ?? 0 })).map(x => ({ ...x, gap: x.top - x.mine })).sort((a, z) => z.gap - a.gap)[0];

      const checks = [];
      if (noEnchant.length) checks.push({ icon: warnIcon, text: `<strong>Enchant ${noEnchant.length} slot${noEnchant.length === 1 ? "" : "s"}:</strong> ${noEnchant.map(r => `${esc(r.it.slot)} (top players use ${esc(r.slot.items[0].enchant)})`).join("; ")}` });
      if (sockets.length) checks.push({ icon: warnIcon, text: `<strong>Fill ${sockets.reduce((a, r) => a + r.emptySockets, 0)} empty gem socket${sockets.reduce((a, r) => a + r.emptySockets, 0) === 1 ? "" : "s"}:</strong> ${sockets.map(r => esc(r.it.slot)).join(", ")}` });
      if (heroDiffers) checks.push({ icon: warnIcon, text: `<strong>Hero talents:</strong> top players use ${esc(topHero.name)}; you use ${esc(myHero.name)}.` });
      if (diffs.length) checks.push({ icon: warnIcon, text: `<strong>Change ${diffs.length} talent${diffs.length === 1 ? "" : "s"}</strong> to match the top build${b.importString ? " (or copy its import string below)" : ""}.` });
      if (low.length) checks.push({ icon: infoIcon, text: `<strong>Lowest item levels:</strong> ${low.map(i => `${esc(i.slot)} ${i.ilvl}`).join(", ")} (you're ${c.ilvl} overall).` });
      if (statGap && statGap.gap >= 6) checks.push({ icon: infoIcon, text: `<strong>Stats:</strong> top players have more ${esc(statGap.stat)}, ${statGap.top}% of their secondary stats vs your ${statGap.mine}%.` });
      const nonTop = rows.filter(r => r.slot && !r.isTop).length;
      if (nonTop) checks.push({ icon: infoIcon, text: `<strong>${nonTop} slot${nonTop === 1 ? "" : "s"}</strong> use something other than the top players' picks. See Gear below.` });

      const diffGroups = [["miss", "Add"], ["extra", "Remove"], ["swap", "Switch"], ["rank", "Add ranks"]].map(([k, label]) => {
        const ds = diffs.filter(d => d.kind === k);
        return ds.length ? `<div class="diff-row"><span class="diff-k diff-${k}">${label}</span><span>${ds.map(d => k === "swap" ? `${esc(d.mineName)} → <strong>${esc(d.topName)}</strong>` : k === "extra" ? esc(d.mineName) : `<strong>${esc(d.topName)}</strong>${k === "rank" ? ` (${d.mine.rank} → ${d.top.rank})` : ""}`).join(", ")}</span></div>` : "";
      }).join("");

      body.innerHTML = `
        <div class="stack tight">
          <section class="panel checklist" aria-labelledby="todo-h">
            <h2 id="todo-h">Upgrade checklist</h2>
            ${checks.length ? `<ul class="todo">${checks.map(x => `<li>${x.icon}<span>${x.text}</span></li>`).join("")}</ul>` : `<p class="all-good">${okIcon} Gear, enchants and talents all match the top ${esc(mode.label)} build.</p>`}
          </section>

          <section class="panel" aria-labelledby="tal-h">
            <h2 id="tal-h">Talents</h2>
            ${diffs.length || heroDiffers ? `<div class="diff-list">${diffGroups}</div>` : `<p class="all-good">${okIcon} Your talents match the top build.</p>`}
            ${unmatched ? `<p class="muted small">${unmatched} of your talents couldn't be placed on the current tree (usually right after a patch).</p>` : ""}
            ${b.importString ? `<div class="import"><label for="importStr">Top build</label><input id="importStr" readonly value="${esc(b.importString)}"><button type="button" class="btn gold" id="copyBtn">Copy build</button></div>` : ""}
            <div class="tabs char-tabs" role="tablist" aria-label="Talent trees">${trees.map((t, i) => `<button type="button" role="tab" id="ctab${i}" aria-controls="ctreePanel" aria-selected="false" data-t="${i}"><small>${{ class: "Class", hero: "Hero", spec: "Spec" }[t.kind] || ""}${diffs.some(d => d.tree === t) ? ` · ${diffs.filter(d => d.tree === t).length} to change` : ""}</small>${esc(t.name)}</button>`).join("")}</div>
            <div class="tree-layout">
              <div class="tree-panel has-build" id="ctreePanel" role="tabpanel">
                <div class="legend" aria-hidden="true"><span><i class="lg pick"></i>You have it</span><span><b class="lgd diff-miss">+</b>Top build adds</span><span><b class="lgd diff-extra">−</b>Top build skips</span><span><b class="lgd diff-swap">⇄</b>Other choice</span><span><b class="lgd diff-rank">↑</b>More ranks</span></div>
                <div id="ctreeHost" class="tree-host"></div>
              </div>
              <aside class="tip-panel inset-tip" aria-labelledby="ctip-h"><div class="tip-head"><h3 id="ctip-h">Talent details</h3><button type="button" class="sheet-close" id="csheetClose" aria-label="Close talent details">✕</button></div><div id="ctipBody" aria-live="polite">${T.details(null)}</div></aside>
            </div>
          </section>

          <section class="panel" aria-labelledby="cg-h">
            <h2 id="cg-h">Gear</h2>
            <p class="muted small">Your equipped items next to what top ${esc(mode.label)} players use most in the same slot.</p>
            <div class="cgear">${rows.map(r => `
              <div class="cg-row${r.isTop ? " is-top" : ""}">
                <span class="cg-slot">${esc(r.it.slot)}</span>
                <span class="gear-item">
                  <span class="gear-ic q-${esc(r.it.quality)}">${r.it.icon ? `<img src="${esc(r.it.icon)}" alt="" loading="lazy" onerror="WOW_gearIconFallback(this)">` : ""}</span>
                  <span class="gear-txt"><a class="q-${esc(r.it.quality)}" href="https://www.wowhead.com/item=${r.it.id}" target="_blank" rel="noopener">${esc(r.it.name)}</a>
                    <small>ilvl ${r.it.ilvl}${r.it.enchant ? ` · ${esc(r.it.enchant)}` : ""}${(r.it.sockets || []).filter(Boolean).length ? ` · ${r.it.sockets.filter(Boolean).map(esc).join(", ")}` : ""}</small>
                    ${r.noEnchant ? `<small class="warn-t">No enchant</small>` : ""}${r.emptySockets ? `<small class="warn-t">${r.emptySockets} empty socket${r.emptySockets === 1 ? "" : "s"}</small>` : ""}
                  </span>
                </span>
                <span class="cg-top">${!r.slot ? `<span class="muted small">No top-player data</span>` : r.isTop ? `<span class="ok-t">${okIcon} Top pick</span>` : `<small class="muted">Top players use</small><a class="q-${esc(r.slot.items[0].quality)}" href="https://www.wowhead.com/item=${r.slot.items[0].id}" target="_blank" rel="noopener">${esc(r.slot.items[0].name)}</a><small class="muted">${r.slot.items[0].pct}% of them</small>`}</span>
              </div>`).join("")}</div>
          </section>

          ${c.stats?.length && b.stats?.length ? `
          <section class="panel" aria-labelledby="cs-h">
            <h2 id="cs-h">Secondary stats</h2>
            <p class="muted small">Your share of each secondary stat next to top players'. Ordered by the top players' priority.</p>
            <ol class="stat-list cmp">${b.stats.map((t, i) => { const m = c.stats.find(s => s.stat === t.stat)?.pct ?? 0; return `
              <li><span class="stat-rank">${i + 1}</span><span class="stat-body"><span class="stat-row"><strong>${esc(t.stat)}</strong><span>You ${m}% · Top ${t.pct}%</span></span>
                <span class="stat-bar"><span style="width:${Math.min(100, m * 2)}%;background:${col}"></span></span>
                <span class="stat-bar top"><span style="width:${Math.min(100, t.pct * 2)}%"></span></span></span></li>`; }).join("")}</ol>
          </section>` : ""}
        </div>`;

      const copy = document.getElementById("copyBtn");
      if (copy) copy.addEventListener("click", async () => {
        const inp = document.getElementById("importStr");
        try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand && document.execCommand("copy"); }
        copy.textContent = "Copied ✓"; setTimeout(() => { copy.textContent = "Copy build"; }, 2000);
      });

      // Talent tree with the comparison overlay.
      const host = document.getElementById("ctreeHost"), tipBody = document.getElementById("ctipBody");
      const tipPanel = body.querySelector(".tip-panel"), narrow = matchMedia("(max-width: 900px)");
      document.getElementById("csheetClose").addEventListener("click", () => tipPanel.classList.remove("sheet-open"));
      const tabs = [...body.querySelectorAll('[role="tab"]')];
      const show = i => {
        tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(j === i)); t.tabIndex = j === i ? 0 : -1; });
        document.getElementById("ctreePanel").setAttribute("aria-labelledby", "ctab" + i);
        T.render(host, trees[i], { color: col, icons: API.icons, build: mine, compare: top, onSelect: (n, clicked, p, q) => {
          tipBody.innerHTML = T.details(n, p, true, q || null);
          if (clicked && narrow.matches) tipPanel.classList.add("sheet-open");
        } });
        tipBody.innerHTML = T.details(null);
        tipPanel.classList.remove("sheet-open");
      };
      tabs.forEach((t, i) => {
        t.classList.toggle("dim-tab", trees[i].kind === "hero" && trees[i] !== myHero && trees[i] !== topHero);
        t.addEventListener("click", () => show(i));
        t.addEventListener("keydown", e => {
          const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          const n = (i + d + tabs.length) % tabs.length; tabs[n].focus(); show(n);
        });
      });
      // Open the tree with the most changes (the spec tree if there are none).
      const counts = trees.map(t => diffs.filter(d => d.tree === t).length);
      const most = Math.max(...counts);
      if (trees.length) show(most > 0 ? counts.indexOf(most) : Math.max(0, trees.findIndex(t => t.kind === "spec")));
    };

    segBtns.forEach(btn => btn.addEventListener("click", () => {
      mode = modes.find(m => m.id === btn.dataset.mode) || mode;
      store.set("buildMode", mode.id);
      draw();
    }));
    draw();
  }

  function pageComing(sec) {
    main.innerHTML = `
      ${pageHero({ kicker: `Retail · Coming in phase ${sec.phase}`, title: esc(sec.label), sub: esc(sec.blurb) })}
      <div class="wrap stack">
        <section class="panel locked-big">
          <div class="panel-ic big">${svgIcon("M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4", "#e6c46a", 34, 1.6)}</div>
          <h2>Not built yet</h2>
          <ul class="bullets">${sec.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
          <a class="btn gold" href="#/specs">Browse talent trees instead</a>
        </section>
      </div>`;
  }

  function pageClassic() {
    main.innerHTML = `
      ${pageHero({ kicker: "Classic Era · Level 1–60 · Coming in phase 6", title: "Classic Era", sub: "Talent point splits, pre-raid best in slot, raid tier lists from Warcraft Logs Classic, and a Hardcore mode that flags the elites and quests that end runs.", tint: "rgba(230,196,106,0.2)" })}
      <div class="wrap stack">
        <div class="split">
          <section class="panel"><h2>What's planned</h2><ul class="bullets">
            <li>Leveling tips per class, with Era and Hardcore versions</li><li>Talent trees with the point split top players use</li>
            <li>Pre-raid best in slot by slot</li><li>Raid tier lists for Molten Core through Naxxramas</li></ul></section>
          <section class="panel hc"><h2>Hardcore: stay alive</h2><p>A red-alert panel of dangerous elites, patrols and quests by zone, so one bad pull doesn't end a character.</p></section>
        </div>
      </div>`;
  }

  function pageForever() {
    const F = D.FOREVER;
    main.innerHTML = `
      <section class="hero forever-hero" style="--tint:rgba(230,196,106,0.3)">
        ${moonArt("#e6c46a")}
        <div class="wrap hero-in">
          <div class="hero-text rise">
            <span class="kicker">The third World of Warcraft · Level cap 60</span>
            <h1>World of Warcraft: Forever</h1>
            <p class="hero-sub">A reimagined vanilla Azeroth with new zones, dungeons, raids, class and race combos, and the new Skyborne race.</p>
          </div>
          <div class="countdown rise2"><small>Launches Nov 4</small><strong>${daysUntil(F.launch)}</strong><small>days to go</small></div>
        </div>
      </section>
      <div class="wrap stack">
        <section aria-labelledby="z-h"><div class="sec-head"><h2 id="z-h">New zones</h2><span class="muted">Level ranges fill in after launch</span></div>
          <div class="zone-grid">${F.zones.map(z => `<div class="zone lift" style="--ic:${z.color}"><div class="zone-art">${svgIcon(z.icon, z.color, 64, 1.2)}</div><div class="zone-txt"><strong>${esc(z.name)}</strong><span>${esc(z.note)}</span></div></div>`).join("")}</div>
        </section>
        <div class="split">
          <section class="panel"><h2>New class and race combos</h2>${F.combos.map(c => `<div class="combo">${iconFrame("", c.name[0], c.color, "sm")}<span>${esc(c.name)}</span></div>`).join("")}</section>
          <section class="panel"><h2>At a glance</h2><ul class="bullets">${F.facts.map(f => `<li>${esc(f)}</li>`).join("")}</ul></section>
        </div>
        <section class="panel locked-big">
          <div class="panel-ic big">${svgIcon("M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4", "#e6c46a", 34, 1.6)}</div>
          <h2>Builds, gear and tier lists unlock after launch</h2>
          <p>Forever has new skills and talents, so Classic Era data doesn't carry over. These fill in once players log raids and the API adds Forever data (phase 5).</p>
        </section>
      </div>`;
  }

  function pageNotFound() {
    main.innerHTML = `<div class="wrap stack"><section class="panel locked-big"><h2>Page not found</h2><a class="btn gold" href="#/">Go home</a></section></div>`;
  }

  /* ------------------------------ router ------------------------------ */
  function route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "").split("/").filter(Boolean);
    const [a, b] = parts;
    document.body.style.removeProperty("--cc");
    document.title = "WoW Companion";
    let version = "retail", section = "home";
    if (!a) pageHome();
    else if (a === "specs") { section = "specs"; pageSpecs(/^\d+$/.test(b || "") ? b : null); }
    else if (a === "spec" && /^\d+$/.test(b || "")) { section = "specs"; pageSpec(b); }
    else if (a === "tiers") { section = "tiers"; pageTiers(b); }
    else if (a === "characters") { section = "characters"; pageCharacters(b, parts[2]); }
    else if (a === "character" && b && parts[2]) { section = "characters"; pageCharacter(decodeURIComponent(b), decodeURIComponent(parts[2])); }
    else if (a === "classic") { version = "classic"; section = ""; pageClassic(); }
    else if (a === "forever") { version = "forever"; section = ""; pageForever(); }
    else {
      const sec = D.SECTIONS.find(s => s.id === a && !s.ready);
      if (sec) { section = sec.id; pageComing(sec); } else { section = ""; pageNotFound(); }
    }
    renderHeader(version, section);
    if (!(a === "specs" && b)) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", route);
  route();
})();

// Blizzard's icon CDN is missing art for some new items; try Wowhead's copy, then give up quietly.
window.WOW_gearIconFallback = img => {
  const name = (img.getAttribute("src") || "").split("/").pop();
  if (img.dataset.fb || !name) return img.remove();
  img.dataset.fb = "1";
  img.src = "https://wow.zamimg.com/images/wow/icons/large/" + name;
};
