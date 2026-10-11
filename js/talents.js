/* WoW Companion — draws a talent tree from the Worker's normalized nodes. */
window.WOW_TALENTS = (() => {
  const TYPE_LABEL = { ACTIVE: "Active ability", PASSIVE: "Passive", CHOICE: "Choice node" };
  const ROW_H = 74;
  const iconMap = {}; // spell id -> icon URL, filled as icons load

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = name => String(name || "?").replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(w => w && !/^(of|the|and)$/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";

  // Works out where each node sits. Blizzard's raw positions use 600 units per column and row,
  // with some nodes on half-steps, so positions snap to half a cell. Falls back to display row/col.
  function layout(nodes) {
    const raw = nodes.every(n => n.x != null && n.y != null);
    const px = nodes.map(n => (raw ? n.x / 600 : n.col ?? 0));
    const py = nodes.map(n => (raw ? n.y / 600 : n.row ?? 0));
    const minX = Math.min(...px), minY = Math.min(...py);
    // Work in half-cells, and shrink any empty gap wider than one cell down to one cell,
    // so trees Blizzard spaces out widely still look compact.
    const halves = vals => {
      const h = vals.map(v => Math.round(v * 2));
      const distinct = [...new Set(h)].sort((a, b) => a - b);
      const map = new Map();
      let at = 0;
      distinct.forEach((v, i) => { if (i) at += Math.min(v - distinct[i - 1], 2); map.set(v, at); });
      return h.map(v => map.get(v) / 2);
    };
    const cx = halves(px.map(v => v - minX)), cy = halves(py.map(v => v - minY));
    const pos = nodes.map((n, i) => ({ c: cx[i], r: cy[i] }));
    return {
      cols: Math.ceil(Math.max(...pos.map(p => p.c))) + 1,
      rows: Math.ceil(Math.max(...pos.map(p => p.r))) + 1,
      pos
    };
  }

  function nodeShape(type) { return type === "ACTIVE" ? "sq" : type === "CHOICE" ? "oct" : "circ"; }

  function render(container, tree, opts = {}) {
    const nodes = tree.nodes || [];
    if (!nodes.length) { container.innerHTML = `<p class="muted">No talents in this tree.</p>`; return; }
    const { cols, rows, pos } = layout(nodes);
    const byId = new Map(nodes.map((n, i) => [n.id, i]));
    const color = opts.color || "#e6c46a";

    const lines = [];
    nodes.forEach((n, i) => (n.unlocks || []).forEach(t => {
      const j = byId.get(t);
      if (j == null) return;
      lines.push(`<line x1="${(pos[i].c + 0.5) * 100}" y1="${(pos[i].r + 0.5) * 100}" x2="${(pos[j].c + 0.5) * 100}" y2="${(pos[j].r + 0.5) * 100}"/>`);
    }));

    // Build overlay: opts.build maps node id -> { spell, rank, pct, granted }.
    const build = opts.build || null;
    const pickOf = n => (build ? build.get(n.id) || (n.mergedIds || []).map(id => build.get(id)).find(Boolean) || null : null);
    const picks = nodes.map(pickOf);
    const chosenIndex = (n, p) => { if (!p) return -1; const list = n.variants ? n.variants.flat() : n.choices; return Math.max(0, list.indexOf(matchChoice(list, p))); };

    const order = nodes.map((n, i) => i).sort((a, b) => pos[a].r - pos[b].r || pos[a].c - pos[b].c);
    const buttons = order.map(i => {
      const n = nodes[i];
      const first = n.choices[0] || { name: "Talent" };
      const names = (n.variants ? n.variants.map(v => v.map(c => c.name).join(" or ")) : [n.choices.map(c => c.name).join(" or ")]).join(", or for other specs ");
      const p = picks[i];
      const pickedName = p ? ((n.variants ? n.variants.flat() : n.choices)[chosenIndex(n, p)] || first).name : "";
      const label = `${names}. ${TYPE_LABEL[n.type] || "Talent"}${n.maxRank > 1 ? `, ${n.maxRank} ranks` : ""}${n.free ? ", granted free" : ""}${build ? (p ? `. In this build: ${pickedName}${n.maxRank > 1 ? `, rank ${p.rank}` : ""}` : ". Not in this build") : ""}`;
      const state = build ? (p ? " pick" : " skip") : "";
      return `<button type="button" class="tnode ${nodeShape(n.type)}${n.free ? " free" : ""}${n.variants ? " var" : ""}${state}" data-i="${i}"
        style="left:${((pos[i].c + 0.5) / cols) * 100}%;top:${pos[i].r * ROW_H + ROW_H / 2}px" aria-label="${esc(label)}">
        <span class="tn-face"><span class="tn-letters">${esc(n.type === "CHOICE" && n.choices[1] ? initials(first.name)[0] + initials(n.choices[1].name)[0] : initials(first.name))}</span></span>
        ${n.maxRank > 1 ? `<span class="tn-rank">${picks[i] ? `${picks[i].rank}/${n.maxRank}` : n.maxRank}</span>` : ""}
      </button>`;
    }).join("");

    container.innerHTML = `
      <div class="tree" style="--cols:${cols};--tc:${color};height:${rows * ROW_H}px;min-width:${cols * 44}px;max-width:${Math.max(cols * 60, 240)}px">
        <svg class="tree-lines" viewBox="0 0 ${cols * 100} ${rows * 100}" preserveAspectRatio="none" aria-hidden="true">${lines.join("")}</svg>
        ${buttons}
      </div>`;

    const btns = [...container.querySelectorAll(".tnode")];
    let selected = null;
    const select = (i, sticky) => {
      if (sticky) {
        btns.forEach(b => b.classList.toggle("sel", +b.dataset.i === i));
        selected = i;
      }
      opts.onSelect && opts.onSelect(nodes[i], sticky === "click", picks[i]);
    };
    btns.forEach(b => {
      const i = +b.dataset.i;
      b.addEventListener("click", () => select(i, "click"));
      b.addEventListener("focus", () => select(i, true));
      b.addEventListener("mouseenter", () => select(i, false));
      b.addEventListener("mouseleave", () => { if (selected != null) opts.onSelect && opts.onSelect(nodes[selected], false, picks[selected]); });
    });

    // Swap the letters for real spell icons once they arrive (choice nodes show both halves).
    if (opts.icons) {
      // A choice node in a build shows only the chosen option's icon.
      const faceSpells = (n, p) => (p && (n.variants || n.choices.length > 1) ? [(matchChoice(n.variants ? n.variants.flat() : n.choices, p) || {}).spellId || p.spell] : (n.variants ? n.variants[0] : n.choices).slice(0, 2).map(c => c.spellId)).filter(Boolean);
      const all = nodes.flatMap(n => (n.variants ? n.variants.flat() : n.choices).map(c => c.spellId)).filter(Boolean);
      opts.icons(all).then(map => {
        Object.assign(iconMap, map);
        btns.forEach(b => {
          const n = nodes[+b.dataset.i];
          const urls = faceSpells(n, picks[+b.dataset.i]).map(id => map[id]).filter(Boolean);
          if (!urls.length || !b.isConnected) return;
          const face = b.querySelector(".tn-face");
          face.insertAdjacentHTML("beforeend", `<span class="tn-icons">${urls.map(u => `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`).join("")}</span>`);
        });
        if (selected != null && opts.onSelect) opts.onSelect(nodes[selected], false, picks[selected]);
      }).catch(() => {});
    }

    return {
      filter(q) {
        const s = q.trim().toLowerCase();
        let hits = 0;
        btns.forEach(b => {
          const n = nodes[+b.dataset.i];
          const all = n.variants ? n.variants.flat() : n.choices;
          const m = !!s && all.some(c => c.name.toLowerCase().includes(s) || c.desc.toLowerCase().includes(s));
          if (m) hits++;
          b.classList.toggle("match", m);
          b.classList.toggle("dim", !!s && !m);
        });
        return hits;
      },
      selectFirst() { if (order.length) select(order[0], true); },
      pickCount: picks.filter(Boolean).length
    };
  }

  // Logs sometimes name a choice by a different spell id than the tree does; fall back to the name.
  function matchChoice(list, p) {
    if (!p) return null;
    return list.find(c => c.spellId === p.spell) || (p.name ? list.find(c => c.name === p.name) : null) || null;
  }

  function details(n, pick, inBuild) {
    if (!n) return `<p class="muted">Hover over, tap or tab to a talent to read it.</p>`;
    const all = n.variants ? n.variants.flat() : n.choices;
    const chosen = matchChoice(all, pick);
    const buildNote = !inBuild ? "" : pick
      ? `<div class="tip-build in"><strong>In this build${chosen && all.length > 1 ? `: ${esc(chosen.name)}` : ""}${n.maxRank > 1 ? ` (rank ${pick.rank}/${n.maxRank})` : ""}</strong><span>${pick.granted ? "Granted free" : `Taken by ${pick.pct}% of top players`}</span></div>`
      : `<div class="tip-build out"><strong>Not in this build</strong><span>Fewer than half of top players take it</span></div>`;
    const meta = [TYPE_LABEL[n.type] || "Talent", n.maxRank > 1 ? `${n.maxRank} ranks` : "", n.free ? "Granted free" : "", n.variants ? "Varies by spec" : ""].filter(Boolean);
    const opt = (c, i) => `
      <div class="tip-opt">
        ${n.choices.length > 1 ? `<span class="tip-or">${i === 0 ? "Option 1" : "Option 2"}</span>` : ""}
        <h4>${iconMap[c.spellId] ? `<img class="tip-ic" src="${esc(iconMap[c.spellId])}" alt="" onerror="this.remove()">` : ""}${esc(c.name)}</h4>
        <div class="tip-stats">${[c.cast, c.range, c.cooldown, c.cost].filter(Boolean).map(v => `<span>${esc(v)}</span>`).join("")}</div>
        <p>${esc(c.desc) || "<span class='muted'>No description from Blizzard.</span>"}</p>
      </div>`;
    const group = choices => choices.map(opt).join(`<div class="tip-div">or</div>`);
    const body = n.variants
      ? `<p class="tip-var">This slot changes by spec. You'll see one of these:</p>` + n.variants.map(group).join(`<div class="tip-div">other spec</div>`)
      : group(n.choices);
    return `${buildNote}<div class="tip-meta">${meta.map(m => `<span>${esc(m)}</span>`).join("")}</div>${body}`;
  }

  return { render, details, initials };
})();
