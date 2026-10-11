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

  async function pageSpec(id, findTalent) {
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
      buildFile?.raid?.picks?.length ? { id: "raid", label: "Raid", b: buildFile.raid } : null,
      buildFile?.pvp?.picks?.length ? { id: "pvp", label: "PvP", b: buildFile.pvp } : null
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
        : mode.id === "pvp"
        ? `${b.sample} top ${esc(b.bracket)} players on the US leaderboard${b.topRating ? `, rated up to ${b.topRating}` : ""}`
        : `${b.sample} top raid parses on ${(b.bosses || []).map(x => `${esc(x.name)} (${x.difficulty})`).join(", ")}`;
      const importBlock = b.importString
        ? `<div class="import">
            <label for="importStr">Import string</label>
            <input id="importStr" readonly value="${esc(b.importString)}">
            <button type="button" class="btn gold" id="copyBtn">Copy build</button>
          </div>
          <p class="muted small">From ${esc(b.player.name)} (${esc(b.player.realm)}, ${esc(String(b.player.region).toUpperCase())}${b.player.rating ? `, ${b.player.rating} rating` : ""})${b.player.differs ? `, whose loadout differs from the common build by ${b.player.differs} talent${b.player.differs === 1 ? "" : "s"}` : ", an exact match"}. In game: Talents → Import.</p>`
        : `<p class="muted small">No top player's saved loadout matches this build closely enough to share an import string today, so the build is shown on the tree only.</p>`;
      buildInfo.innerHTML = `<p class="build-src">Based on ${src}. Updated ${new Date(b.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</p>${importBlock}`;
      const copy = document.getElementById("copyBtn");
      if (copy) copy.addEventListener("click", async () => {
        const inp = document.getElementById("importStr");
        try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand && document.execCommand("copy"); }
        copy.textContent = "Copied ✓"; setTimeout(() => { copy.textContent = "Copy build"; }, 2000);
      });
      extrasEl.innerHTML = buildExtras(b, col);
      fillSpellIcons(extrasEl);
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
    // Opened from search: show the tree that has the talent and highlight it.
    const want = String(findTalent || "").toLowerCase();
    const hit = want ? trees.findIndex(t => t.nodes.some(n => (n.variants ? n.variants.flat() : n.choices).some(c => c.name.toLowerCase() === want))) : -1;
    if (hit >= 0) current = hit;
    applyMode();
    if (hit >= 0) {
      search.value = findTalent;
      runSearch();
      const el = host.querySelector(".tnode.match");
      if (el) { el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }
    }
  }

  // Stat priority and best-in-slot panels for a build.
  function buildExtras(b, col) {
    const pvpT = b.pvpTalents?.length ? `
      <section class="panel" aria-labelledby="pvpt-h">
        <h2 id="pvpt-h">PvP talents</h2>
        <p class="muted small">How many of the same top players run each PvP talent. You pick three in game.</p>
        <ol class="stat-list pvp-talents">${b.pvpTalents.map((x, i) => `
          <li><span class="stat-rank${i < 3 ? "" : " dim"}">${i + 1}</span><span class="stat-body"><span class="stat-row"><strong><span class="pvp-ic" data-spell="${x.spell || ""}"></span>${esc(x.name)}</strong><span>${x.pct}%</span></span>
          <span class="stat-bar"><span style="width:${Math.min(100, x.pct)}%;background:${col}"></span></span></span></li>`).join("")}</ol>
      </section>` : "";
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
    return pvpT || stats || gear ? `<div class="split extras">${pvpT}${stats}${gear}</div>` : "";
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
    const inst = c.raids?.find(r => zoneName && r.name === zoneName);
    // No kills in the current raid yet: say so rather than showing an older raid.
    if (!inst) return zoneName ? { raid: zoneName, text: "Not started" } : null;
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
      if (noEnchant.length) checks.push({ icon: warnIcon, text: `<strong>Enchant ${noEnchant.length} slot${noEnchant.length === 1 ? "" : "s"}:</strong> ${noEnchant.map(r => esc(r.it.slot)).join(", ")}. Each slot's usual enchant is listed under Gear.` });
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
                    ${r.noEnchant ? `<small class="warn-t">No enchant · top players use ${esc(r.slot.items[0].enchant)}</small>` : ""}${r.emptySockets ? `<small class="warn-t">${r.emptySockets} empty socket${r.emptySockets === 1 ? "" : "s"}</small>` : ""}
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

  /* ------------------------------ Leveling ------------------------------ */
  const slugOf = s => String(s || "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const normOf = s => String(s || "").toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]/g, "");
  // Blizzard writes ability names in [brackets]; show them in bold instead.
  const rich = t => esc(t).replace(/\[([^\]]{1,60})\]/g, '<strong class="sp">$1</strong>');
  const bullets = list => (list || []).length ? `<ul class="notes">${list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const sourceList = (urls, checked) => (urls || []).length ? `<details class="sources"><summary>Sources${checked ? ` · checked ${esc(new Date(checked + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }))}` : ""}</summary><ul>${urls.map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a></li>`).join("")}</ul></details>` : "";
  const copyButtons = root => root.querySelectorAll("[data-copy]").forEach(btn => btn.addEventListener("click", async () => {
    const inp = document.getElementById(btn.dataset.copy);
    try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand && document.execCommand("copy"); }
    const was = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(() => { btn.textContent = was; }, 2000);
  }));

  async function pageLeveling(classId) {
    document.title = "Leveling · WoW Companion";
    main.innerHTML = `<div class="wrap">${loading("Loading leveling tips…")}</div>`;
    const [notes, cls] = await Promise.all([API.notes("leveling"), API.classes().catch(() => null)]);
    if (!notes) { main.innerHTML = `<div class="wrap stack"><div class="errbox"><p>Leveling tips didn't load. Try again in a moment.</p></div></div>`; return; }
    const classes = cls?.classes || [];
    const tipFor = c => notes.classes.find(x => normOf(x.class) === normOf(c.name));
    if (classId) return pageLevelingClass(notes, classes.find(c => String(c.id) === String(classId)), tipFor);

    main.innerHTML = `
      ${pageHero({ kicker: "Retail · Midnight", title: "Leveling", sub: `The fastest way to level ${notes.levelCap ? `to ${notes.levelCap}` : ""}, and the spec, buttons and talents to use for each class.` })}
      <div class="wrap stack">
        <section class="panel" aria-labelledby="route-h">
          <h2 id="route-h">Route to ${notes.levelCap || "max level"}</h2>
          <ol class="route">${(notes.route || []).map(r => `<li>${esc(r)}</li>`).join("")}</ol>
          ${sourceList(notes.routeSources, notes.checked)}
        </section>
        <section aria-labelledby="lv-classes">
          <div class="sec-head"><h2 id="lv-classes">Pick a class</h2></div>
          <div class="class-grid">${classes.map(c => { const t = tipFor(c); return `
            <a class="class-tile lift" href="#/leveling/${c.id}" style="--ic:${colorOf(c.id)}">
              <span class="sc-top">${iconFrame(c.icon, c.name[0], colorOf(c.id), "sm")}<span class="ct-name">${esc(c.name)}</span></span>
              <span class="ct-specs">${t ? `Level as <strong>${esc(t.bestSpec?.name || "")}</strong>` : "Tips coming"}</span>
            </a>`; }).join("")}</div>
        </section>
      </div>`;
  }

  async function pageLevelingClass(notes, c, tipFor) {
    if (!c) { pageNotFound(); return; }
    const t = tipFor(c);
    const col = colorOf(c.id);
    document.title = `${c.name} leveling · WoW Companion`;
    let detail = null;
    try { detail = await API.cls(c.id); } catch { /* icons are optional */ }
    const specByName = n => detail?.specs?.find(s => normOf(s.name) === normOf(n));
    const best = t && specByName(t.bestSpec?.name), alt = t && specByName(t.alternative?.name);
    const talentSpec = t?.talents?.spec ? specByName(t.talents.spec.replace(/\s*\(.*\)$/, "")) : best;
    main.innerHTML = `
      <section class="hero spec-hero" style="--tint:${rgba(col, 0.28)};--ic:${col}">
        ${moonArt(col)}
        <div class="wrap hero-in">
          ${iconFrame(c.icon, c.name[0], col, "xl")}
          <div class="hero-text rise">
            <a class="back" href="#/leveling">← All classes</a>
            <span class="kicker" style="color:${col}">Leveling · Retail</span>
            <h1>${esc(c.name)}</h1>
            ${t ? `<p class="hero-sub">${esc(t.tip)}</p>` : ""}
          </div>
        </div>
      </section>
      <div class="wrap stack">
        ${!t ? `<div class="errbox"><p>No leveling tips for ${esc(c.name)} yet.</p></div>` : `
        <div class="split">
          <section class="panel" aria-labelledby="best-h">
            <h2 id="best-h">Best spec to level</h2>
            <div class="lv-spec">${iconFrame(best?.icon, (t.bestSpec.name || "?")[0], col, "avatar")}<div><h3>${esc(t.bestSpec.name)}</h3><p>${esc(t.bestSpec.why)}</p>${best ? `<a href="#/spec/${best.id}">Talent tree and top build →</a>` : ""}</div></div>
            ${t.alternative?.name ? `<div class="lv-spec alt">${iconFrame(alt?.icon, t.alternative.name[0], col, "sm")}<div><h3>Or ${esc(t.alternative.name)}</h3><p>${esc(t.alternative.why)}</p></div></div>` : ""}
          </section>
          <section class="panel" aria-labelledby="keys-h">
            <h2 id="keys-h">Key abilities</h2>
            <ul class="lv-abilities">${(t.keyAbilities || []).map((k, i) => `<li><span class="lv-ic" data-ability="${esc(k.name)}" id="lvic${i}">${esc(T.initials(k.name))}</span><span><strong>${esc(k.name)}</strong><small>${esc(k.why)}</small></span></li>`).join("")}</ul>
          </section>
        </div>
        <section class="panel" aria-labelledby="lvt-h">
          <h2 id="lvt-h">Leveling talents${t.talents?.spec ? ` · ${esc(t.talents.spec)}` : ""}</h2>
          ${t.talents?.importString ? `
            <div class="import"><label for="lvImport">Import string</label><input id="lvImport" readonly value="${esc(t.talents.importString)}"><button type="button" class="btn gold" data-copy="lvImport">Copy build</button></div>
            <p class="muted small">In game: Talents → Import. ${t.talents.notes ? esc(t.talents.notes) : ""} ${t.talents.source ? `From <a href="${esc(t.talents.source)}" target="_blank" rel="noopener">this leveling guide</a>.` : ""}</p>`
          : `<p>No current leveling import string was found for ${esc(t.talents?.spec || t.bestSpec.name)}. ${talentSpec ? `The <a href="#/spec/${talentSpec.id}">top ${esc(talentSpec.name)} build</a> works well once you have most talents.` : ""}</p>${t.talents?.notes ? `<p class="muted small">${esc(t.talents.notes)}</p>` : ""}`}
        </section>
        <section class="panel" aria-labelledby="lvr-h">
          <h2 id="lvr-h">Route to ${notes.levelCap || "max level"}</h2>
          <ol class="route">${(notes.route || []).map(r => `<li>${esc(r)}</li>`).join("")}</ol>
        </section>
        ${sourceList([...(t.sources || []), ...(notes.routeSources || [])].filter((u, i, a) => a.indexOf(u) === i), notes.checked)}`}
      </div>`;
    copyButtons(main);
    // Ability icons: find each ability's spell in the class's talent trees.
    if (t && detail?.specs?.length) {
      const specs = await Promise.all(detail.specs.map(s => API.spec(s.id).catch(() => null)));
      const bySpell = new Map();
      for (const s of specs) for (const tr of s?.trees || []) for (const n of tr.nodes) for (const ch of n.variants ? n.variants.flat() : n.choices) if (ch.spellId && !bySpell.has(normOf(ch.name))) bySpell.set(normOf(ch.name), ch.spellId);
      const want = [...main.querySelectorAll("[data-ability]")].map(el => ({ el, id: bySpell.get(normOf(el.dataset.ability)) })).filter(x => x.id);
      const icons = await API.icons(want.map(x => x.id));
      for (const { el, id } of want) if (icons[id] && el.isConnected) el.innerHTML = `<img src="${esc(icons[id])}" alt="" onerror="this.remove()">`;
    }
  }

  /* ------------------------------ M+ & Raid ------------------------------ */
  const ROLE_KEYS = [["all", "All"], ["tank", "Tank"], ["healer", "Healer"], ["dps", "DPS"]];
  const roleSeg = current => `<div class="seg role-seg" role="group" aria-label="Show notes for">${ROLE_KEYS.map(([k, l]) => `<button type="button" data-role="${k}" aria-pressed="${k === current}">${l}</button>`).join("")}</div>`;
  const wireRoleSeg = (root, redraw) => root.querySelectorAll(".role-seg button").forEach(b => b.addEventListener("click", () => { store.set("guideRole", b.dataset.role); redraw(); }));

  // One boss: researched role notes, Blizzard's own role overview, then the full Adventure Guide breakdown.
  function bossBlock(note, journal, role, opts = {}) {
    const show = k => role === "all" || role === k;
    const roleCols = [["tank", "Tank"], ["healer", "Healer"], ["dps", "DPS"]].filter(([k]) => show(k));
    const noteCols = note ? [...roleCols, ["everyone", "Everyone"]].filter(([k]) => (note[k] || []).length).map(([k, l]) => `<div class="role-col r-${k}"><h4>${l}</h4>${bullets(note[k])}</div>`).join("") : "";
    const blizzRoles = journal?.roles ? roleCols.filter(([k]) => journal.roles[k]).map(([k, l]) => `<div class="role-col r-${k}"><h4>${l}</h4><p class="pre">${rich(journal.roles[k])}</p></div>`).join("") : "";
    const sec = (list, d = 0) => (list || []).map(x => `
      <details class="ab"${d === 0 ? " open" : ""}><summary>${x.icon ? `<span class="ab-ic"><img src="${esc(x.icon)}" alt="" loading="lazy" onerror="this.remove()"></span>` : x.spell ? `<span class="ab-ic" data-spell="${x.spell}"></span>` : ""}<span>${esc(x.title)}</span>${x.meta ? `<small class="ab-meta">${esc(x.meta)}</small>` : ""}</summary>
        ${x.text ? `<p class="pre">${rich(x.text)}</p>` : ""}${x.sections ? `<div class="ab-kids">${sec(x.sections, d + 1)}</div>` : ""}
      </details>`).join("");
    return `
      ${note?.summary || journal?.description ? `<p class="boss-sum">${esc(note?.summary || journal.description)}</p>` : ""}
      ${note?.keyAbilities?.length ? `<div class="chips">${note.keyAbilities.map(a => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : ""}
      ${noteCols ? `<div class="role-grid">${noteCols}</div>` : ""}
      ${opts.raid && note && (note.heroic?.length || note.mythic?.length) ? `<div class="role-grid diff-grid">${note.heroic?.length ? `<div class="role-col"><h4>Heroic changes</h4>${bullets(note.heroic)}</div>` : ""}${note.mythic?.length ? `<div class="role-col"><h4>Mythic changes</h4>${bullets(note.mythic)}</div>` : ""}</div>` : ""}
      ${opts.raid && note?.phases?.length ? `<div class="phases"><h4>Phases</h4><ol>${note.phases.map(p => `<li><strong>${esc(p.name)}</strong> ${esc(p.note)}</li>`).join("")}</ol></div>` : ""}
      ${journal ? `<details class="journal"${opts.openJournal ? " open" : ""}><summary>Full ability breakdown <span class="muted small">from Blizzard's Adventure Guide</span></summary>
        ${blizzRoles ? `<h4 class="j-h">Blizzard's role notes</h4><div class="role-grid">${blizzRoles}</div>` : ""}
        <div class="abilities">${sec(journal.sections)}</div>
        ${JSON.stringify(journal.sections).includes('"textSource":"wowhead"') ? `<p class="muted small">Ability text and icons from <a href="https://www.wowhead.com" target="_blank" rel="noopener">Wowhead</a>; structure and role notes from Blizzard's Adventure Guide.</p>` : ""}
      </details>` : `<p class="muted small">Blizzard's Adventure Guide for this boss hasn't been loaded yet; it arrives with the next daily data refresh.</p>`}`;
  }
  async function fillSpellIcons(root) {
    const els = [...root.querySelectorAll("[data-spell]")];
    if (!els.length) return;
    const icons = await API.icons([...new Set(els.map(e => e.dataset.spell))]);
    for (const e of els) if (icons[e.dataset.spell] && e.isConnected) e.innerHTML = `<img src="${esc(icons[e.dataset.spell])}" alt="" loading="lazy" onerror="this.remove()">`;
  }

  async function pageGuides(kind, which) {
    document.title = "M+ & Raid · WoW Companion";
    main.innerHTML = `<div class="wrap">${loading("Loading dungeons and raid…")}</div>`;
    const [dNotes, rNotes, dJ, rJ] = await Promise.all([API.notes("dungeons"), API.notes("raid"), API.guide("dungeons"), API.guide("raid")]);
    const dungeons = (dNotes?.dungeons || []).map(n => ({ note: n, journal: dJ?.instances?.find(i => normOf(i.seasonName) === normOf(n.name) || normOf(i.name) === normOf(n.name)) }));
    const raidName = rNotes?.raid || rJ?.name || "Raid";
    // Blizzard's Adventure Guide order when it's loaded, otherwise the notes' order.
    const bossOrder = (rJ?.encounters || []).map(e => ({ note: (rNotes?.bosses || []).find(b => normOf(b.name) === normOf(e.name)) || null, journal: e }));
    for (const b of rNotes?.bosses || []) if (!bossOrder.some(x => x.note === b)) bossOrder.push({ note: b, journal: null });

    if (kind === "d" && which) return pageDungeon(dungeons.find(d => slugOf(d.note.name) === which), dNotes);
    if (kind === "raid" && which) return pageBoss(bossOrder, which, raidName, rNotes, rJ);

    const tab = kind === "raid" ? "raid" : "mplus";
    main.innerHTML = `
      ${pageHero({ kicker: `Retail · ${esc(dNotes?.season || "This season")}`, title: "M+ & Raid", sub: "Every dungeon in this season's Mythic+ rotation and every boss in the current raid: role notes, must-kick casts and the full ability breakdown." })}
      <div class="wrap stack">
        <div class="seg" role="group" aria-label="Content"><a href="#/dungeons" aria-pressed="${tab === "mplus"}">Mythic+ dungeons</a><a href="#/dungeons/raid" aria-pressed="${tab === "raid"}">${esc(raidName)}</a></div>
        ${tab === "mplus" ? `
          <div class="guide-grid">${dungeons.map(d => `
            <a class="guide-card lift" href="#/dungeons/d/${slugOf(d.note.name)}">
              ${d.journal?.image ? `<img class="gc-img" src="${esc(d.journal.image)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="gc-img ph"></span>`}
              <span class="gc-body"><strong>${esc(d.note.name)}</strong><small>${d.note.bosses.length} bosses · ${d.note.mustKick?.length || 0} must-kick casts</small><span class="gc-sum">${esc(d.note.summary)}</span></span>
            </a>`).join("")}</div>
          ${sourceList(null)}<p class="muted small">Notes checked ${esc(dNotes?.checked || "")} from Method, Icy Veins and Raider.IO; ability details come from Blizzard's Adventure Guide and update with each patch.</p>`
        : `
          <section class="panel raid-head">
            ${rJ?.image ? `<img class="raid-img" src="${esc(rJ.image)}" alt="" onerror="this.remove()">` : ""}
            <div><h2>${esc(raidName)}</h2>${rJ?.description ? `<p>${esc(rJ.description)}</p>` : ""}
            <p class="muted small">Bosses are listed in the Adventure Guide's order. The raid opens up after the first boss, so your kill order can differ.</p></div>
          </section>
          <ol class="boss-list">${bossOrder.map((b, i) => { const nm = b.note?.name || b.journal?.name; return `
            <li><a class="boss-row lift" href="#/dungeons/raid/${slugOf(nm)}"><span class="boss-n">${i + 1}</span><span><strong>${esc(nm)}</strong><small>${esc(b.note?.summary || b.journal?.description || "")}</small></span></a></li>`; }).join("")}</ol>
          <p class="muted small">Notes checked ${esc(rNotes?.checked || "")}; ability details come from Blizzard's Adventure Guide.</p>`}
      </div>`;
  }

  function pageDungeon(d, dNotes) {
    if (!d) { pageNotFound(); return; }
    const n = d.note, j = d.journal;
    document.title = `${n.name} · WoW Companion`;
    const draw = () => {
      const role = store.get("guideRole") || "all";
      main.innerHTML = `
        ${pageHero({ kicker: `Mythic+ · ${esc(dNotes?.season || "")}`, title: esc(n.name), sub: esc(n.summary), extra: j?.image ? `<img class="hero-tile rise2" src="${esc(j.image)}" alt="" onerror="this.remove()">` : "" })}
        <div class="wrap stack">
          <div class="guide-bar"><a class="back" href="#/dungeons">← All dungeons</a>${roleSeg(role)}</div>
          <div class="split">
            ${n.mustKick?.length ? `<section class="panel" aria-labelledby="kick-h"><h2 id="kick-h">Must-kick casts</h2>
              <table class="kick"><thead><tr><th>Mob</th><th>Cast</th><th>Why</th></tr></thead><tbody>${n.mustKick.map(k => `<tr><td>${esc(k.mob)}</td><td><strong>${esc(k.cast)}</strong></td><td>${esc(k.why)}</td></tr>`).join("")}</tbody></table></section>` : ""}
            ${n.dangerousPacks?.length ? `<section class="panel" aria-labelledby="pack-h"><h2 id="pack-h">Dangerous trash</h2>${bullets(n.dangerousPacks)}${n.affixNotes?.length ? `<h3 class="sub-h">Affixes</h3>${bullets(n.affixNotes)}` : ""}</section>` : ""}
          </div>
          ${n.bosses.map((b, i) => { const jb = j?.encounters?.find(e => normOf(e.name) === normOf(b.name) || normOf(e.name).includes(normOf(b.name)) || normOf(b.name).includes(normOf(e.name))) || (j?.encounters?.length === n.bosses.length ? j.encounters[i] : null); return `
            <section class="panel boss" aria-labelledby="b${i}"><h2 id="b${i}"><span class="boss-n">${i + 1}</span>${esc(b.name)}</h2>${bossBlock(b, jb, role)}</section>`; }).join("")}
          ${sourceList(n.sources, dNotes?.checked)}
        </div>`;
      wireRoleSeg(main, draw);
      fillSpellIcons(main);
    };
    draw();
  }

  function pageBoss(order, which, raidName, rNotes, rJ) {
    const i = order.findIndex(b => slugOf(b.note?.name || b.journal?.name) === which);
    if (i < 0) { pageNotFound(); return; }
    const b = order[i], nm = b.note?.name || b.journal?.name;
    document.title = `${nm} · WoW Companion`;
    const prev = order[i - 1], next = order[i + 1];
    const link = (x, label) => x ? `<a href="#/dungeons/raid/${slugOf(x.note?.name || x.journal?.name)}">${label}</a>` : "<span></span>";
    const draw = () => {
      const role = store.get("guideRole") || "all";
      main.innerHTML = `
        ${pageHero({ kicker: `${esc(raidName)} · Boss ${i + 1} of ${order.length}`, title: esc(nm), sub: esc(b.note?.summary || b.journal?.description || "") })}
        <div class="wrap stack">
          <div class="guide-bar"><a class="back" href="#/dungeons/raid">← All bosses</a>${roleSeg(role)}</div>
          <section class="panel boss">${bossBlock(b.note, b.journal, role, { raid: true, openJournal: !b.note })}</section>
          <nav class="boss-nav" aria-label="Other bosses">${link(prev, `← ${esc(prev?.note?.name || prev?.journal?.name || "")}`)}${link(next, `${esc(next?.note?.name || next?.journal?.name || "")} →`)}</nav>
          ${sourceList(b.note?.sources, rNotes?.checked)}
        </div>`;
      wireRoleSeg(main, draw);
      fillSpellIcons(main);
    };
    draw();
  }

  /* ------------------------------ PvP ------------------------------ */
  const PVP_BRACKETS = [["shuffle", "Solo Shuffle"], ["3v3", "3v3 Arena"], ["2v2", "2v2 Arena"], ["blitz", "Blitz"]];
  async function pagePvp(which) {
    document.title = "PvP · WoW Companion";
    main.innerHTML = `
      ${pageHero({ kicker: "Retail · US leaderboards", title: "PvP", sub: "Which specs are winning in rated PvP right now, from Blizzard's own leaderboards. Open a spec for its PvP talents and build." })}
      <div class="wrap stack"><div id="pvpBody">${loading("Loading PvP tier lists…")}</div></div>`;
    const tiers = await API.tiers();
    const body = document.getElementById("pvpBody");
    const pv = tiers?.pvp;
    if (!pv || !Object.keys(pv.brackets || {}).length) { body.innerHTML = `<section class="panel"><p>PvP tier lists haven't been built yet. They're created by the daily data job; check back after it runs.</p></section>`; return; }
    const avail = PVP_BRACKETS.filter(([k]) => pv.brackets[k]);
    const key = avail.find(([k]) => k === which)?.[0] || avail[0][0];
    const br = pv.brackets[key];
    const note = key === "shuffle" || key === "blitz"
      ? `Players of each spec rated ${br.cutoff} or higher, the rating of the ${br.players.toLocaleString()}th best player across every spec's ${esc(br.label)} ladder.`
      : `Current specs of the top ${br.players} players on the ${esc(br.label)} ladder (rated ${br.cutoff}+). Their spec today may not be the one they climbed with.`;
    // A role with almost no players in this bracket (tanks in arena and Shuffle) would just be noise.
    const thin = ["TANK", "HEALER", "DAMAGE"].filter(r => (br.roles?.[r] || []).length && Math.max(...br.roles[r].map(x => x.count)) < 5);
    const roleBlock = roleKey => {
      const rows = br.roles?.[roleKey] || [];
      if (!rows.length || thin.includes(roleKey)) return "";
      const role = D.ROLES[roleKey];
      const groups = ["S", "A", "B", "C"].map(tier => ({ tier, specs: rows.filter(r => r.tier === tier) })).filter(g => g.specs.length);
      return `<section class="panel tier-role">
        <h2>${svgIcon(role.icon, role.color, 20, 2)} ${roleKey === "DAMAGE" ? "DPS" : role.label + "s"}</h2>
        ${groups.map(g => `<div class="tier-row"><span class="tier-letter t-${g.tier}">${g.tier}</span><div class="tier-specs">${g.specs.map(r => `
          <a class="tier-spec" href="#/spec/${r.spec}/pvp" style="--ic:${colorOf(r.classId)}"><span class="ts-name">${esc(r.name)} <span>${esc(r.className)}</span></span><span class="ts-val">${r.count}</span></a>`).join("")}</div></div>`).join("")}
      </section>`;
    };
    body.innerHTML = `
      <div class="seg tier-seg" role="group" aria-label="Bracket">${avail.map(([k, l]) => `<a href="#/pvp/${k}" aria-pressed="${k === key}">${l}</a>`).join("")}</div>
      <p class="muted small">${note} Season ${pv.season}, updated ${new Date(pv.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" })}. Numbers are players, not win rates.</p>
      ${thin.length ? `<p class="muted small">${thin.map(r => (r === "DAMAGE" ? "DPS" : D.ROLES[r].label + "s")).join(" and ")} aren't shown for ${esc(br.label)}: fewer than 5 of any spec made the cut.${key !== "blitz" && pv.brackets.blitz ? ` See <a href="#/pvp/blitz">Blitz</a> for tanks.` : ""}</p>` : ""}
      <div class="tier-grid">${["TANK", "HEALER", "DAMAGE"].map(roleBlock).join("")}</div>`;
  }

  /* ------------------------------ Search ------------------------------ */
  const SEARCH_KIND = { spec: "Spec", class: "Class", talent: "Talent", classic: "Classic talent", dungeon: "Dungeon", raid: "Raid", boss: "Boss", ability: "Ability", character: "Character", page: "Page" };
  const searchUi = (() => {
    const overlay = document.getElementById("searchOverlay"), input = document.getElementById("searchInput"), list = document.getElementById("searchResults");
    let items = null, results = [], sel = 0, lastFocus = null;
    const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "");
    async function load() {
      if (items) return items;
      const pages = D.SECTIONS.filter(x => x.ready).map(x => ({ t: "page", n: x.label, sub: "Section", h: x.href }))
        .concat([{ t: "page", n: "Classic Era", sub: "Classic", h: "#/classic/era" }, { t: "page", n: "TBC Anniversary", sub: "Classic", h: "#/classic/tbc" }, { t: "page", n: "WoW Forever", sub: "Forever", h: "#/forever" }]);
      const chars = (store.get("characters")?.list || []).map(c => ({ t: "character", n: c.name, sub: `Level ${c.level} ${c.className} · ${c.realm}`, h: charHref(c) }));
      const idx = await API.search();
      items = [...pages, ...chars, ...(idx?.items || [])].map(x => ({ ...x, k: norm(x.n), ks: norm(x.sub) }));
      return items;
    }
    const rank = { page: 0, character: 1, spec: 2, class: 2, dungeon: 3, raid: 3, boss: 4, talent: 5, ability: 6, classic: 7 };
    function find(q) {
      const words = norm(q).split(/\s+/).filter(Boolean);
      if (!words.length) return [];
      const out = [];
      for (const x of items) {
        if (!words.every(w => x.k.includes(w) || x.ks.includes(w))) continue;
        const score = (x.k === words.join(" ") ? 0 : x.k.startsWith(words[0]) ? 1 : 2) * 10 + (rank[x.t] ?? 9);
        out.push({ x, score });
      }
      return out.sort((a, b) => a.score - b.score || a.x.n.localeCompare(b.x.n)).slice(0, 40).map(o => o.x);
    }
    function draw() {
      list.innerHTML = results.length ? results.map((r, i) => `<li role="option" id="sr${i}" aria-selected="${i === sel}" data-i="${i}"><a href="${esc(r.h)}"><span class="sr-kind k-${r.t}">${SEARCH_KIND[r.t] || r.t}</span><span class="sr-txt"><strong>${esc(r.n)}</strong><small>${esc(r.sub || "")}</small></span></a></li>`).join("")
        : input.value.trim() ? `<li class="sr-empty">No matches for “${esc(input.value.trim())}”.</li>` : `<li class="sr-empty">Try “Balance”, “Starfall”, “Nalorakk” or one of your characters.</li>`;
      input.setAttribute("aria-activedescendant", results.length ? `sr${sel}` : "");
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }
    async function open() {
      lastFocus = document.activeElement;
      overlay.hidden = false; document.body.classList.add("no-scroll");
      input.value = ""; results = []; sel = 0;
      list.innerHTML = `<li class="sr-empty">Loading…</li>`;
      input.focus();
      await load();
      results = find(input.value); sel = 0; // anything typed while the index was loading
      draw();
    }
    function close() { overlay.hidden = true; document.body.classList.remove("no-scroll"); lastFocus?.focus?.(); }
    function go(i) { const r = results[i]; if (!r) return; close(); if (location.hash === r.h) route(); else location.hash = r.h; }
    input.addEventListener("input", () => { if (!items) return; results = find(input.value); sel = 0; draw(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); go(sel); }
      else if (e.key === "Escape") close();
    });
    list.addEventListener("click", e => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); go(+li.dataset.i); } });
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.getElementById("searchClose").addEventListener("click", close);
    document.getElementById("searchBtn").addEventListener("click", open);
    document.addEventListener("keydown", e => {
      if (e.key === "/" && overlay.hidden && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); open(); }
      else if (e.key === "Escape" && !overlay.hidden) close();
    });
    return { open, close };
  })();

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

  /* ------------------------------ Classic Era and TBC Anniversary ------------------------------ */
  const CLASSIC_IDS = { warrior: 1, paladin: 2, hunter: 3, rogue: 4, priest: 5, shaman: 7, mage: 8, warlock: 9, druid: 11 };
  const CL_VERSIONS = { era: { label: "Classic Era", cap: 60, wh: "classic" }, tbc: { label: "TBC Anniversary", cap: 70, wh: "tbc" } };
  const B36 = "0123456789abcdefghijklmnopqrstuvwxyz";
  const cleanBuildName = n => String(n || "").replace(/\s+\d+\/\d+\/\d+$/, "");

  // Turns a saved build (a Wowhead talent string, or a Warcraft Tavern spend-order string) into points per talent.
  function decodeBuild(trees, b) {
    if (!b) return null;
    const pts = trees.map(t => t.talents.map(() => 0));
    const order = [];
    if (b.kind === "wowhead") {
      b.code.split("-").slice(0, 3).forEach((part, ti) => [...part].forEach((ch, i) => { if (pts[ti] && i < pts[ti].length) pts[ti][i] = +ch; }));
    } else {
      let tree = null;
      for (const ch of b.code) {
        if ("ABC".includes(ch)) { tree = "ABC".indexOf(ch); continue; }
        const g = B36.indexOf(ch), r = Math.floor(g / 4), c = g % 4;
        const i = trees[tree]?.talents.findIndex(t => t.r === r && t.c === c);
        if (i == null || i < 0) continue;
        pts[tree][i]++; order.push([tree, i]);
      }
    }
    return { pts, order };
  }

  // Draws a Classic talent tree: a 4-column grid with points on each talent.
  function classicTree(tree, pts, info, ti, col) {
    const rows = Math.max(...tree.talents.map(t => t.r)) + 1;
    const spent = pts ? pts.reduce((a, b) => a + b, 0) : 0;
    const cells = tree.talents.map((t, i) => {
      const p = pts ? pts[i] : 0, d = info?.[t.ids[0]];
      const name = d?.name || t.guess;
      return `<button type="button" class="ct-node${p ? " on" : ""}${p && p === t.max ? " full" : ""}${pts && !p ? " off" : ""}" style="grid-row:${t.r + 1};grid-column:${t.c + 1}" data-t="${ti}:${i}" aria-label="${esc(`${name}, ${p} of ${t.max} points`)}">
        ${d?.icon ? `<img src="${esc(d.icon)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="ct-l">${esc(T.initials(name))}</span>`}
        <span class="ct-pts">${p}/${t.max}</span>${t.pre ? `<span class="ct-pre" aria-hidden="true"></span>` : ""}
      </button>`;
    }).join("");
    return `<div class="ct-tree" style="--ic:${col}">
      <div class="ct-head"${tree.bg ? ` style="background-image:linear-gradient(rgba(10,12,18,.65),rgba(10,12,18,.92)),url('${esc(tree.bg)}')"` : ""}><strong>${esc(tree.name)}</strong><span>${spent}</span></div>
      <div class="ct-grid" style="grid-template-rows:repeat(${rows}, 52px)">${cells}</div>
    </div>`;
  }
  function wireClassicTrees(root, trees, getPts, info, tipEl, level0) {
    root.querySelectorAll(".ct-node").forEach(btn => {
      const show = () => {
        const [ti, i] = btn.dataset.t.split(":").map(Number);
        const t = trees[ti].talents[i], d = info?.[t.ids[0]], p = getPts()?.[ti]?.[i] || 0;
        root.querySelectorAll(".ct-node.sel").forEach(x => x.classList.remove("sel")); btn.classList.add("sel");
        tipEl.innerHTML = `<h4>${d?.icon ? `<img class="tip-ic" src="${esc(d.icon)}" alt="">` : ""}${esc(d?.name || t.guess)}</h4>
          <div class="tip-meta"><span>${esc(trees[ti].name)}</span><span>Rank ${p}/${t.max}</span>${t.r ? `<span>Needs ${t.r * 5} points in ${esc(trees[ti].name)}</span>` : ""}${t.pre ? `<span>Needs the talent above it maxed</span>` : ""}</div>
          ${d?.text ? `<p class="pre">${esc(d.text)}</p>` : `<p class="muted small">Talent details arrive with the next data refresh.</p>`}`;
      };
      btn.addEventListener("click", show); btn.addEventListener("focus", show); btn.addEventListener("mouseenter", show);
    });
  }
  function buildPanel(id, title, trees, build, info, col, extra = "") {
    const dec = decodeBuild(trees, build);
    return `<div class="ct-trees" id="${id}">${trees.map((t, ti) => classicTree(t, dec?.pts[ti], info, ti, col)).join("")}</div>
      <div class="ct-tip" id="${id}Tip" aria-live="polite"><p class="muted small">Hover over or tap a talent to read it.</p></div>${extra}`;
  }
  const orderList = (trees, build, info, startLevel) => {
    const dec = decodeBuild(trees, build);
    if (!dec?.order.length) return "";
    // Group consecutive points in the same talent: "10–12 Improved Heroic Strike (3)".
    const runs = [];
    dec.order.forEach(([ti, i], n) => { const last = runs[runs.length - 1]; if (last && last.ti === ti && last.i === i) last.to = n; else runs.push({ ti, i, from: n, to: n }); });
    return `<details class="ct-order"><summary>Point order, level by level</summary><ol>${runs.map(r => { const t = trees[r.ti].talents[r.i]; const nm = info?.[t.ids[0]]?.name || t.guess; const a = startLevel + r.from, z = startLevel + r.to; return `<li><span class="lv">${a === z ? a : `${a}–${z}`}</span> ${esc(nm)} <span class="muted">(${r.to - r.from + 1})</span> <span class="tr-tag">${esc(trees[r.ti].name)}</span></li>`; }).join("")}</ol></details>`;
  };

  async function pageClassic(v, clsKey) {
    v = v === "tbc" ? "tbc" : "era";
    const V = CL_VERSIONS[v];
    document.title = `${V.label} · WoW Companion`;
    main.innerHTML = `<div class="wrap">${loading("Loading Classic guides…")}</div>`;
    const [notes, trees, cls] = await Promise.all([API.notes(`classic-${v}`), API.notes(`trees-${v}`), API.classes().catch(() => null)]);
    const talentInfo = (await API.classicTalents(v))?.talents || null;
    if (!notes || !trees) { main.innerHTML = `<div class="wrap stack"><div class="errbox"><p>The Classic guides didn't load. Try again in a moment.</p></div></div>`; return; }
    const iconOf = key => cls?.classes?.find(c => c.id === CLASSIC_IDS[key])?.icon || "";
    const seg = `<div class="seg" role="group" aria-label="Classic version">${Object.entries(CL_VERSIONS).map(([k, x]) => `<a href="#/classic/${k}${clsKey ? "/" + clsKey : ""}" aria-pressed="${k === v}">${x.label} <small>· ${x.cap}</small></a>`).join("")}</div>`;
    if (clsKey) return pageClassicClass(v, V, notes, trees, talentInfo, clsKey, iconOf, seg);

    main.innerHTML = `
      ${pageHero({ kicker: `${V.label} · Level ${V.cap}`, title: esc(V.label), sub: v === "tbc" ? esc(notes.phase || "The Burning Crusade on the Anniversary realms.") : "The permanent 1.15 realms with every phase open: leveling builds, raid talent builds and pre-raid best in slot for all nine classes.", tint: "rgba(230,196,106,0.2)" })}
      <div class="wrap stack">
        ${seg}
        <section aria-labelledby="cl-h"><div class="sec-head"><h2 id="cl-h">Pick a class</h2></div>
          <div class="class-grid">${notes.classes.map(c => { const k = c.class.toLowerCase(); return `
            <a class="class-tile lift" href="#/classic/${v}/${k}" style="--ic:${colorOf(CLASSIC_IDS[k])}">
              <span class="sc-top">${iconFrame(iconOf(k), c.class[0], colorOf(CLASSIC_IDS[k]), "sm")}<span class="ct-name">${esc(c.class)}</span></span>
              <span class="ct-specs">Level as <strong>${esc(c.leveling.spec || "")}</strong> · ${c.endgame.length} endgame build${c.endgame.length === 1 ? "" : "s"}</span>
            </a>`; }).join("")}</div>
        </section>
        ${notes.route?.length ? `<section class="panel" aria-labelledby="clr-h"><h2 id="clr-h">Leveling route${v === "tbc" ? " to 70" : " to 60"}</h2><ol class="route">${notes.route.map(r => `<li>${esc(r)}</li>`).join("")}</ol>${sourceList(notes.routeSources, notes.checked)}</section>` : ""}
        ${(notes.notes || []).map(n => `<p class="muted small">${esc(n)}</p>`).join("")}
      </div>`;
  }

  function pageClassicClass(v, V, notes, allTrees, info, key, iconOf, seg) {
    const c = notes.classes.find(x => x.class.toLowerCase() === key);
    const trees = allTrees[key];
    if (!c || !trees) { pageNotFound(); return; }
    const col = colorOf(CLASSIC_IDS[key]);
    document.title = `${c.class} · ${V.label} · WoW Companion`;
    let pick = Math.max(0, c.endgame.findIndex(e => e.build));
    const L = c.leveling;
    const startLevel = 10;
    main.innerHTML = `
      <section class="hero spec-hero" style="--tint:${rgba(col, 0.28)};--ic:${col}">
        ${moonArt(col)}
        <div class="wrap hero-in">
          ${iconFrame(iconOf(key), c.class[0], col, "xl")}
          <div class="hero-text rise">
            <a class="back" href="#/classic/${v}">← All ${esc(V.label)} classes</a>
            <span class="kicker" style="color:${col}">${esc(V.label)} · Level ${V.cap}</span>
            <h1>${esc(c.class)}</h1>
            ${L.tip ? `<p class="hero-sub">${esc(L.tip)}</p>` : ""}
          </div>
        </div>
      </section>
      <div class="wrap stack">
        ${seg}
        <section class="panel" aria-labelledby="cle-h">
          <div class="build-top"><h2 id="cle-h">Endgame builds</h2>
            <div class="seg" role="group" aria-label="Build">${c.endgame.map((e, i) => `<button type="button" data-b="${i}" aria-pressed="${i === pick}">${esc(cleanBuildName(e.name))}</button>`).join("")}</div></div>
          <div id="egBody"></div>
        </section>
        <section class="panel" aria-labelledby="cll-h">
          <h2 id="cll-h">Leveling as ${esc(L.spec || "")}</h2>
          ${L.keyAbilities?.length ? `<ul class="lv-abilities cols">${L.keyAbilities.map(k => `<li><span class="lv-ic">${esc(T.initials(k.name))}</span><span><strong>${esc(k.name)}</strong><small>${esc(k.why)}</small></span></li>`).join("")}</ul>` : ""}
          ${L.order?.length ? `<h3 class="sub-h">Talent order</h3>${bullets(L.order)}` : ""}
          ${L.build ? `<h3 class="sub-h">Leveling build at ${L.build.points >= (v === "tbc" ? 61 : 51) ? V.cap : `${L.build.points + 9}`} (${esc(L.build.split)})</h3>${buildPanel("lvTrees", "Leveling", trees, L.build, info, col, orderList(trees, L.build, info, startLevel))}
            <p class="muted small"><a href="${esc(L.build.link)}" target="_blank" rel="noopener">Open this build in ${L.build.kind === "wowhead" ? "Wowhead" : "Warcraft Tavern"}</a></p>` : `<p class="muted small">No leveling calculator link was found for this class, so the talent order above is the guide.</p>`}
        </section>
        ${c.gear?.length ? `<section class="panel" aria-labelledby="clg-h">
          <h2 id="clg-h">${v === "tbc" ? "Pre-raid and catch-up gear" : "Pre-raid best in slot"}</h2>
          ${c.gear.length > 1 ? `<div class="seg gear-seg" role="group" aria-label="Spec">${c.gear.map((g, i) => `<button type="button" data-g="${i}" aria-pressed="${i === 0}">${esc(g.spec)}</button>`).join("")}</div>` : `<p class="muted small">${esc(c.gear[0].spec)}</p>`}
          <div id="gearBody"></div>
        </section>` : ""}
        ${sourceList(c.sources, notes.checked)}
      </div>`;

    const egBody = document.getElementById("egBody");
    const drawEndgame = () => {
      const e = c.endgame[pick];
      main.querySelectorAll("[data-b]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.b === pick)));
      egBody.innerHTML = `
        <p class="build-src"><span class="role-pill r-${esc(e.role)}">${esc({ tank: "Tank", healer: "Healer", dps: "DPS" }[e.role] || e.role)}</span>${e.split ? ` <strong>${esc(e.split)}</strong>` : ""} ${esc(e.notes || "")}</p>
        ${e.build ? buildPanel("egTrees", e.name, trees, e.build, info, col) + `<p class="muted small"><a href="${esc(e.build.link)}" target="_blank" rel="noopener">Open in ${e.build.kind === "wowhead" ? "Wowhead's talent calculator" : "Warcraft Tavern's talent calculator"}</a>${e.build.page && e.build.page.includes("wowsims") ? " · build from the wowsims simulator" : ""}</p>`
          : `<p class="muted small">No calculator link was found for this build, so only the point split and notes are shown.</p>`}`;
      if (e.build) { const dec = decodeBuild(trees, e.build); wireClassicTrees(egBody, trees, () => dec.pts, info, document.getElementById("egTreesTip")); }
    };
    main.querySelectorAll("[data-b]").forEach(b => b.addEventListener("click", () => { pick = +b.dataset.b; drawEndgame(); }));
    drawEndgame();
    if (L.build) { const dec = decodeBuild(trees, L.build); wireClassicTrees(document.getElementById("lvTrees").parentElement, trees, () => dec.pts, info, document.getElementById("lvTreesTip")); }

    const gearBody = document.getElementById("gearBody");
    if (gearBody) {
      const drawGear = gi => {
        main.querySelectorAll("[data-g]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.g === gi)));
        const g = c.gear[gi];
        gearBody.innerHTML = `${g.phase ? `<p class="muted small">${esc(g.phase)}</p>` : ""}<table class="kick cl-gear"><thead><tr><th>Slot</th><th>Item</th><th>Where</th></tr></thead><tbody>${g.items.map(it => `<tr><td>${esc(it.slot)}</td><td><a href="https://www.wowhead.com/${V.wh}/item=${encodeURIComponent(it.itemId)}" target="_blank" rel="noopener"><strong>${esc(it.name)}</strong></a></td><td>${esc(it.source || "")}</td></tr>`).join("")}</tbody></table>`;
      };
      main.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => drawGear(+b.dataset.g)));
      drawGear(0);
    }
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
    else if (a === "spec" && /^\d+$/.test(b || "")) {
      section = "specs";
      if (parts[2] === "pvp") store.set("buildMode", "pvp");
      pageSpec(b, parts[2] === "t" && parts[3] ? decodeURIComponent(parts[3]) : null);
    }
    else if (a === "pvp") { section = "pvp"; pagePvp(b); }
    else if (a === "tiers") { section = "tiers"; pageTiers(b); }
    else if (a === "leveling") { section = "leveling"; pageLeveling(/^\d+$/.test(b || "") ? b : null); }
    else if (a === "dungeons") { section = "dungeons"; pageGuides(b, parts[2]); }
    else if (a === "characters") { section = "characters"; pageCharacters(b, parts[2]); }
    else if (a === "character" && b && parts[2]) { section = "characters"; pageCharacter(decodeURIComponent(b), decodeURIComponent(parts[2])); }
    else if (a === "classic") { version = "classic"; section = ""; pageClassic(b, parts[2]); }
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
