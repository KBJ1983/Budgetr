/*
 * Shared runtime for the films in video/. A classic script (not a module), so the pages also open from file://.
 * A film page calls F.film({ duration, frame }) where frame(t) sets every element for second t. That makes every
 * frame deterministic: scripts/video.mjs calls window.seek(t) frame by frame and pipes screenshots to ffmpeg.
 * Opened directly in a browser (no ?render) the film plays on a loop, scaled to the window.
 * Reusable scenes: F.importScene() (statement import into a draft budget) and F.deck() (feature montage).
 */
(function () {
  const $ = (s, root = document) => (typeof s === "string" ? root.querySelector(s) : s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const out = (x) => 1 - Math.pow(1 - x, 3);
  /** 0→1 while t goes from a to b. */
  const p = (t, a, b) => clamp((t - a) / (b - a));
  /** Visible between a and b, fading in and out over f seconds. */
  const vis = (t, a, b, f = 0.5) => Math.min(out(p(t, a, a + f)), 1 - inOut(p(t, b - f, b)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const kr = (n) => Math.round(n).toLocaleString("da-DK");

  function put(el, { o = 1, x = 0, y = 0, s = 1 } = {}) {
    el = $(el);
    el.style.opacity = o;
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    el.style.visibility = o <= 0.001 ? "hidden" : "visible";
  }
  /** Fade and rise in from second a, fade out before b. */
  function rise(el, t, a, b = 1e9, dist = 36) {
    const k = out(p(t, a, a + 0.7));
    put(el, { o: Math.min(k, 1 - inOut(p(t, b - 0.5, b))), y: (1 - k) * dist });
  }
  /** Element visible in [a, b], sliding in from x/y. */
  function slide(el, t, a, b, { x = 0, y = 60 } = {}) {
    const k = out(p(t, a, a + 0.8));
    put(el, { o: Math.min(k, 1 - inOut(p(t, b - 0.5, b))), x: (1 - k) * x, y: (1 - k) * y });
  }

  let stage;
  /** Centre of an element in stage pixels (works while the preview is scaled). */
  function centre(sel, dx = 0, dy = 0) {
    const st = stage.getBoundingClientRect(), r = $(sel).getBoundingClientRect(), k = st.width / 1920;
    return { x: (r.left - st.left + r.width / 2) / k + dx, y: (r.top - st.top + r.height / 2) / k + dy };
  }

  /**
   * The cursor. seqs = [{ keys: [[time, target], …], clicks: [time, …] }]; a target is a selector/element or {x, y}.
   * It travels between the targets (arriving 0.35 s before the key time) and pulses on each click.
   */
  const OFF = { x: 1990, y: 1110 };
  function cursor(t, seqs) {
    let pos = null, seq = null;
    for (const s of seqs) {
      const keys = [[s.keys[0][0] - 1.2, OFF], ...s.keys, [s.keys[s.keys.length - 1][0] + 1.2, OFF]];
      for (let i = 0; i < keys.length - 1; i++) {
        const [ta, a] = keys[i], [tb, b] = keys[i + 1];
        if (t >= ta && t <= tb) {
          const at = (v) => (typeof v === "string" || v instanceof Element ? centre(v, 10, 8) : v);
          const A = at(a), B = at(b), k = inOut(p(t, ta, Math.max(ta, tb - 0.35)));
          pos = { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k) - Math.sin(Math.PI * k) * 40 };
          seq = s;
          break;
        }
      }
      if (pos) break;
    }
    if (!pos) return put("#cursor", { o: 0 });
    const near = (seq.clicks || []).find((c) => t >= c - 0.1 && t < c + 0.45);
    put("#cursor", { o: 1, x: pos.x, y: pos.y, s: near && t < near + 0.12 ? 0.86 : 1 });
    const k = near ? p(t, near, near + 0.45) : 1;
    put("#pulse", { o: near ? 1 - k : 0, s: 0.4 + k * 1.4 });
  }
  /** A button pressed in at second c. */
  const press = (el, t, c) => ($(el).style.transform = t >= c && t < c + 0.18 ? "scale(.96)" : "");

  /** Progress bars along the bottom: one per [from, to] range, the row shown in [show[0], show[1]]. */
  function bars(t, ranges, show) {
    const box = $("#steps");
    if (box.children.length !== ranges.length) box.innerHTML = ranges.map(() => "<span><i></i></span>").join("");
    $$("i", box).forEach((el, i) => (el.style.transform = `scaleX(${p(t, ranges[i][0], ranges[i][1])})`));
    put(box, { o: Math.min(out(p(t, show[0], show[0] + 0.6)), 1 - inOut(p(t, show[1] - 0.5, show[1]))) });
  }

  const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /**
   * Statement import into a draft budget, like the app's "Kladdebudget" dialog: three files are read, then the fixed
   * entries it found are ticked and added. Made-up files and amounts. update(u) takes seconds since the scene began;
   * T says when to click (the film draws the cursor), so: files 0.5–2.0, next 2.7, list 2.85–4.4, add 5.0.
   */
  function importScene(el) {
    const FILES = [
      ["CSV", "#2c6a4d", "Lønkonto.csv", "386 posteringer fra 1. okt. 2025 til 30. sep. 2026", "Lønkonto"],
      ["XLSX", "#1f7a4a", "Budgetkonto.xlsx", "142 posteringer fra 1. okt. 2025 til 30. sep. 2026", "Budgetkonto"],
      ["PDF", "#b03a22", "Fælleskonto.pdf", "214 posteringer fra 1. okt. 2025 til 30. sep. 2026", "Fælleskonto"],
    ];
    const ROWS = [
      ["Løn", "12 gange, senest 30. sep. · Lønkonto", "Månedlig", "+31.800", true, true],
      ["Husleje", "12 gange, senest 1. sep. · Budgetkonto", "Månedlig", "9.850", false, true],
      ["Bilforsikring", "4 gange, senest 1. jul. · Budgetkonto", "Kvartalsvis", "1.836", false, true],
      ["Streaming", "12 gange, senest 12. sep. · Fælleskonto", "Månedlig", "129", false, true],
      ["Overførsel til Budgetkonto", "Mellem egne konti", "Månedlig", "14.500", false, true],
      ["Forbrug i øvrigt, Fælleskonto", "168 enkeltstående betalinger", "Månedlig", "4.200", false, false],
    ];
    el.classList.add("card", "imp");
    el.innerHTML = `
      <div class="imp-head"><b>Ny kladde</b><span>Kontoudskrifter</span></div>
      <div class="imp-a">
        <p class="imp-lead">Læg filer fra netbanken ind for hver konto. Selve filerne bliver ikke gemt – kun de poster, du vælger.</p>
        <div class="drop"><div>Træk filerne herind, eller <b>klik for at vælge</b><small>CSV, Excel eller PDF</small></div></div>
        ${FILES.map((f) => `<div class="file"><span class="ext" style="background:${f[1]}">${f[0]}</span><span class="nm"><b>${f[2]}</b><span data-st="${f[3]}">Læser filen…</span></span><span class="acc">${f[4]}</span></div>`).join("")}
        <div class="imp-foot"><span class="imp-ready">3 filer klar</span><span class="btn imp-next">Find faste poster</span></div>
      </div>
      <div class="imp-b">
        <h3>Fundet i kontoudskrifterne</h3>
        <p class="sub">3 filer · 742 posteringer · 12 overførsler mellem egne konti fundet</p>
        ${ROWS.map((r) => `<div class="rw"><span class="ck"></span><span class="ds">${r[0]}<small>${r[1]}</small></span><span class="fq">${r[2]}</span><span class="am${r[4] ? " in" : ""}">${r[3]} kr</span></div>`).join("")}
        <div class="imp-foot"><span class="imp-count">0 poster valgt</span><span class="btn pine imp-add">Tilføj til kladden</span></div>
        <div class="toast imp-toast">4 poster oprettet, 1 overførsel</div>
      </div>`;
    const files = $$(".file", el), rows = $$(".rw", el), ticks = $$(".ck", el);
    const T = { next: 2.7, add: 5.0 };
    function update(u) {
      const toB = out(p(u, 2.85, 3.25));
      put($(".imp-a", el), { o: 1 - toB, x: -40 * toB });
      put($(".imp-b", el), { o: toB, x: 40 * (1 - toB) });
      files.forEach((f, i) => {
        const k = out(p(u, 0.5 + i * 0.3, 1.0 + i * 0.3));
        put(f, { o: k, y: (1 - k) * -70, s: lerp(0.96, 1, k) });
        const st = $("[data-st]", f), done = u >= 1.5 + i * 0.25;
        st.textContent = done ? st.dataset.st : "Læser filen…";
        st.style.color = done ? "var(--pine)" : "";
      });
      put($(".imp-ready", el), { o: out(p(u, 2.0, 2.3)) });
      press($(".imp-next", el), u, T.next);
      let n = 0;
      rows.forEach((r, i) => {
        const k = out(p(u, 3.0 + i * 0.12, 3.4 + i * 0.12));
        put(r, { o: k, y: (1 - k) * 16 });
        const on = ROWS[i][5] && u >= 3.5 + i * 0.12;
        ticks[i].classList.toggle("on", on);
        ticks[i].innerHTML = on ? CHECK : "";
        if (on) n++;
      });
      $(".imp-count", el).textContent = n ? `${n} poster valgt` : "Intet valgt";
      press($(".imp-add", el), u, T.add);
      const tk = out(p(u, T.add + 0.15, T.add + 0.5));
      put($(".imp-toast", el), { o: tk, y: (1 - tk) * 14 });
    }
    return { update, T, next: $(".imp-next", el), add: $(".imp-add", el) };
  }

  /**
   * Feature montage: screenshot cards that replace each other every `per` seconds, with a list of labels where the
   * current one is marked. items = [{ label, img, url, pos }]. update(u) takes seconds since the montage began.
   */
  function deck(el, listEl, items, per) {
    el.classList.add("dk");
    el.innerHTML = items
      .map((it, i) => `<div class="card shot dk-card" style="z-index:${i}"><div class="bar"><i></i><i></i><i></i><div class="url">${it.url || "budgetpro.dk/app"}</div></div><div class="view"><img src="${it.img}" alt="" style="object-position:${it.pos || "top left"}" /></div></div>`)
      .join("");
    listEl.classList.add("labels");
    listEl.innerHTML = items.map((it) => `<li><i></i>${it.label}</li>`).join("");
    const cards = $$(".dk-card", el), labels = $$("li", listEl);
    function update(u) {
      const cur = clamp(Math.floor(u / per), 0, items.length - 1);
      cards.forEach((c, j) => {
        if (j > cur) return put(c, { o: 0 });
        const kin = j === 0 ? 1 : out(p(u, j * per, j * per + 0.5));
        const e = j < items.length - 1 ? inOut(p(u, (j + 1) * per + 0.1, (j + 1) * per + 0.6)) : 0;
        put(c, { o: Math.min(kin, 1 - e), x: (1 - kin) * 110 - e * 50, s: 1 - e * 0.05 });
      });
      labels.forEach((l, j) => {
        l.classList.toggle("on", j === cur);
        l.style.opacity = j === cur ? 1 : j < cur ? 0.55 : 0.35;
      });
    }
    return { update };
  }

  function film({ duration, frame }) {
    stage = $("#stage");
    const c = document.createElement("div");
    c.id = "cursor";
    c.className = "abs";
    c.innerHTML = '<div class="pulse" id="pulse"></div><svg width="40" height="40" viewBox="0 0 24 24" style="position:absolute;left:-4px;top:-2px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))"><path d="M4 2.5l15 9.2-6.6 1.4L9 19.6z" fill="#15191a" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    stage.appendChild(c);
    window.seek = frame;
    window.DURATION = duration;
    window.ready = Promise.all([
      document.fonts.ready,
      ...[...document.images].map((im) => (im.complete ? 1 : new Promise((r) => (im.onload = im.onerror = r)))),
    ]);
    if (location.search.includes("render")) return frame(0);
    const fit = () => {
      const k = Math.min(innerWidth / 1920, innerHeight / 1080);
      stage.style.transform = `scale(${k})`;
      stage.style.left = (innerWidth - 1920 * k) / 2 + "px";
      stage.style.top = (innerHeight - 1080 * k) / 2 + "px";
    };
    addEventListener("resize", fit);
    fit();
    // ?t=12 starts the preview at second 12
    const from = Number(new URLSearchParams(location.search).get("t")) || 0;
    window.ready.then(() => {
      const t0 = performance.now() - from * 1000;
      const loop = (now) => {
        frame(((now - t0) / 1000) % (duration + 1));
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
  }

  window.F = { $, $$, clamp, inOut, out, p, vis, lerp, kr, put, rise, slide, centre, cursor, press, bars, importScene, deck, film };
})();
