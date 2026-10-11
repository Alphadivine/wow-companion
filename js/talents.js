/* WoW Companion — draws a talent tree from the Worker's normalized nodes. */
window.WOW_TALENTS = (() => {
  const TYPE_LABEL = { ACTIVE: "Active ability", PASSIVE: "Passive", CHOICE: "Choice node" };
  const ROW_H = 74;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = name => String(name || "?").replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(w => w && !/^(of|the|and)$/i.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";

  // Works out where each node sits. Blizzard's raw positions use 600 units per column and row,
  // with some nodes on half-steps, so positions snap to half a cell. Falls back to display row/col.
  function layout(nodes) {
    const raw = nodes.every(n => n.x != null && n.y != null);
    const px = nodes.map(n => (raw ? n.x / 600 : n.col ?? 0));
    const py = nodes.map(n => (raw ? n.y / 600 : n.row ?? 0));
    const minX = Math.min(...px), minY = Math.min(...py);
    const snap = v => Math.round(v * 2) / 2;
    const pos = nodes.map((n, i) => ({ c: snap(px[i] - minX), r: snap(py[i] - minY) }));
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

    const order = nodes.map((n, i) => i).sort((a, b) => pos[a].r - pos[b].r || pos[a].c - pos[b].c);
    const buttons = order.map(i => {
      const n = nodes[i];
      const first = n.choices[0] || { name: "Talent" };
      const names = (n.variants ? n.variants.map(v => v.map(c => c.name).join(" or ")) : [n.choices.map(c => c.name).join(" or ")]).join(", or for other specs ");
      const label = `${names}. ${TYPE_LABEL[n.type] || "Talent"}${n.maxRank > 1 ? `, ${n.maxRank} ranks` : ""}${n.free ? ", granted free" : ""}`;
      return `<button type="button" class="tnode ${nodeShape(n.type)}${n.free ? " free" : ""}${n.variants ? " var" : ""}" data-i="${i}"
        style="left:${((pos[i].c + 0.5) / cols) * 100}%;top:${pos[i].r * ROW_H + ROW_H / 2}px" aria-label="${esc(label)}">
        <span class="tn-face">${esc(n.type === "CHOICE" && n.choices[1] ? initials(first.name)[0] + initials(n.choices[1].name)[0] : initials(first.name))}</span>
        ${n.maxRank > 1 ? `<span class="tn-rank">${n.maxRank}</span>` : ""}
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
      opts.onSelect && opts.onSelect(nodes[i], sticky === "click");
    };
    btns.forEach(b => {
      const i = +b.dataset.i;
      b.addEventListener("click", () => select(i, "click"));
      b.addEventListener("focus", () => select(i, true));
      b.addEventListener("mouseenter", () => select(i, false));
      b.addEventListener("mouseleave", () => { if (selected != null) opts.onSelect && opts.onSelect(nodes[selected]); });
    });

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
      selectFirst() { if (order.length) select(order[0], true); }
    };
  }

  function details(n) {
    if (!n) return `<p class="muted">Hover over, tap or tab to a talent to read it.</p>`;
    const meta = [TYPE_LABEL[n.type] || "Talent", n.maxRank > 1 ? `${n.maxRank} ranks` : "", n.free ? "Granted free" : "", n.variants ? "Varies by spec" : ""].filter(Boolean);
    const opt = (c, i) => `
      <div class="tip-opt">
        ${n.choices.length > 1 ? `<span class="tip-or">${i === 0 ? "Option 1" : "Option 2"}</span>` : ""}
        <h4>${esc(c.name)}</h4>
        <div class="tip-stats">${[c.cast, c.range, c.cooldown, c.cost].filter(Boolean).map(v => `<span>${esc(v)}</span>`).join("")}</div>
        <p>${esc(c.desc) || "<span class='muted'>No description from Blizzard.</span>"}</p>
      </div>`;
    const group = choices => choices.map(opt).join(`<div class="tip-div">or</div>`);
    const body = n.variants
      ? `<p class="tip-var">This slot changes by spec. You'll see one of these:</p>` + n.variants.map(group).join(`<div class="tip-div">other spec</div>`)
      : group(n.choices);
    return `<div class="tip-meta">${meta.map(m => `<span>${esc(m)}</span>`).join("")}</div>${body}`;
  }

  return { render, details, initials };
})();
