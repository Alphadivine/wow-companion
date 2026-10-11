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
        sub: "Pick a class and spec to read its full talent tree. Builds, tier lists and your own characters arrive in the next phases.",
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
          <section class="panel locked" aria-labelledby="chars-h">
            <div class="panel-ic">${svgIcon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0", "#e6c46a", 26)}</div>
            <div>
              <h2 id="chars-h">My characters</h2>
              <p>Log in with Battle.net to load every character and compare it against the top build. Coming in phase 3.</p>
            </div>
          </section>
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
            <div class="sc-top">${iconFrame(s.icon, s.name[0], col, "lg")}
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
    try { s = await API.spec(id); } catch (err) { main.innerHTML = `<div class="wrap stack">${errorBox(err, () => pageSpec(id))}</div>`; return; }
    const col = colorOf(s.class.id);
    const role = D.ROLES[s.role] || D.ROLES.DAMAGE;
    store.set("lastSpec", { id: s.id, name: s.name, className: s.class.name, classId: s.class.id, icon: s.icon });
    document.title = `${s.name} ${s.class.name} · WoW Companion`;

    const trees = s.trees || [];
    const defaultTree = Math.max(0, trees.findIndex(t => t.kind === "spec"));
    const kindLabel = { class: "Class", hero: "Hero", spec: "Spec" };

    main.innerHTML = `
      <section class="hero spec-hero" style="--tint:${rgba(col, 0.28)};--ic:${col}">
        ${moonArt(col)}
        <div class="wrap hero-in">
          ${iconFrame(s.icon, s.name[0], col, "xl")}
          <div class="hero-text rise">
            <span class="kicker" style="color:${col}">${esc(s.class.name)} · ${esc(s.roleName || role.label)}${s.primaryStat ? ` · ${esc(s.primaryStat)}` : ""}</span>
            <h1>${esc(s.name)} ${esc(s.class.name)}</h1>
            <p class="hero-sub">${esc(s.description)}</p>
          </div>
        </div>
        <div class="wrap">
          <div class="tabs" role="tablist" aria-label="Talent trees">
            ${trees.map((t, i) => `<button type="button" role="tab" id="tab${i}" aria-controls="treePanel" aria-selected="${i === defaultTree}" data-t="${i}">
              <small>${kindLabel[t.kind] || ""}</small>${esc(t.name)}</button>`).join("")}
          </div>
        </div>
      </section>
      <div class="wrap stack">
        ${s.treeMissing || !trees.length ? `<div class="errbox"><p>Blizzard didn't return a talent tree for this spec yet. It usually appears within a day of a patch.</p></div>` : `
        <div class="tree-layout">
          <section class="panel tree-panel" id="treePanel" role="tabpanel" aria-labelledby="tab${defaultTree}">
            <div class="tree-tools">
              <label for="tsearch" class="sr">Find a talent</label>
              <input id="tsearch" type="search" placeholder="Find a talent…" autocomplete="off">
              <span id="tcount" class="muted" aria-live="polite"></span>
            </div>
            <div class="legend" aria-hidden="true">
              <span><i class="lg sq"></i>Active</span><span><i class="lg circ"></i>Passive</span><span><i class="lg oct"></i>Choice</span><span><i class="lg free"></i>Free</span>
            </div>
            <div id="treeHost" class="tree-host"></div>
          </section>
          <aside class="panel tip-panel" aria-labelledby="tip-h">
            <div class="tip-head"><h2 id="tip-h">Talent details</h2><button type="button" class="sheet-close" id="sheetClose" aria-label="Close talent details">✕</button></div>
            <div id="tipBody" aria-live="polite">${T.details(null)}</div>
          </aside>
        </div>`}
        <section class="panel builds-soon">
          <div class="panel-ic">${svgIcon("M12 2l2.6 6.6L21 9.3l-5 4.4 1.5 6.8L12 17l-5.5 3.5L8 13.7 3 9.3l6.4-.7z", col, 26)}</div>
          <div>
            <h2>Top Mythic+, Raid and PvP builds</h2>
            <p>Phase 2 highlights the build top players run on this tree, with a one-click import string, stat priority and best-in-slot gear.</p>
          </div>
        </section>
      </div>`;

    if (!trees.length) return;
    const host = document.getElementById("treeHost");
    const tipBody = document.getElementById("tipBody");
    const search = document.getElementById("tsearch");
    const count = document.getElementById("tcount");
    const tabs = [...main.querySelectorAll('[role="tab"]')];
    const tipPanel = main.querySelector(".tip-panel");
    const narrow = matchMedia("(max-width: 900px)");
    document.getElementById("sheetClose").addEventListener("click", () => tipPanel.classList.remove("sheet-open"));
    let view;
    const show = i => {
      tabs.forEach((b, j) => { b.setAttribute("aria-selected", String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      document.getElementById("treePanel").setAttribute("aria-labelledby", "tab" + i);
      view = T.render(host, trees[i], { color: col, onSelect: (n, picked) => {
        tipBody.innerHTML = T.details(n);
        if (picked && narrow.matches) tipPanel.classList.add("sheet-open");
      } });
      tipBody.innerHTML = T.details(null);
      tipPanel.classList.remove("sheet-open");
      if (search.value) runSearch();
    };
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
    show(defaultTree);
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
