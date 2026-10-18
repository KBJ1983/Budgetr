/*
 * Shared runtime for the films in video/. A classic script (not a module), so the pages also open from file://.
 * A film page calls F.film({ duration, frame }) where frame(t) sets every element for second t. That makes every
 * frame deterministic: scripts/video.mjs calls window.seek(t) frame by frame and pipes screenshots to ffmpeg.
 * Opened directly in a browser (no ?render) the film plays on a loop, scaled to the window.
 * Reusable scenes: F.importScene() (statement import into a draft budget) and F.deck() (feature montage).
 * Motion graphics ("Midnat og lime"; the accent comes from film.css, so a theme such as skole's solgul swaps it): the logo builds itself (F.buildLogo – the two cards drop into the pocket), headlines
 * come in word by word (F.split + F.words), key phrases get a lime underline (F.hl), the dark intro lifts like a curtain
 * with a lime band behind it and the end card drops the same way (F.curtain), floating cards drift on the dark cards
 * (F.darkBg), a lime orb travels between the light scenes (F.orb) and screenshots enter in 3D (F.enter).
 */
(function () {
  const $ = (s, root = document) => (typeof s === "string" ? root.querySelector(s) : s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const out = (x) => 1 - Math.pow(1 - x, 3);
  /** Ease out with a small overshoot. */
  const back = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
  /** 0→1 while t goes from a to b. */
  const p = (t, a, b) => clamp((t - a) / (b - a));
  /** Visible between a and b, fading in and out over f seconds. */
  const vis = (t, a, b, f = 0.5) => Math.min(out(p(t, a, a + f)), 1 - inOut(p(t, b - f, b)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const kr = (n) => Math.round(n).toLocaleString("da-DK");

  function put(el, { o = 1, x = 0, y = 0, s = 1, r = 0, ry = 0 } = {}) {
    el = $(el);
    el.style.opacity = o;
    el.style.transform = `${ry ? "perspective(1800px) " : ""}translate(${x}px, ${y}px)${ry ? ` rotateY(${ry}deg)` : ""}${r ? ` rotate(${r}deg)` : ""} scale(${s})`;
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

  /** A visual (screenshot, card, phone) coming in from the right in 3D, then slowly pushing in until second b. */
  function enter(el, t, a, b = a + 6, { x = 140, ry = -16 } = {}) {
    const k = out(p(t, a, a + 0.95));
    put(el, { o: out(p(t, a, a + 0.5)), x: (1 - k) * x, y: (1 - k) * 30, ry: (1 - k) * ry, s: lerp(0.94, 1, k) + 0.025 * p(t, a + 0.95, b) });
  }
  /** A light scene: visible in [a, b], drifting up as it leaves. */
  function scene(el, t, a, b) {
    put(el, { o: vis(t, a, b), y: -46 * inOut(p(t, b - 0.55, b)) });
  }

  /** Wraps every word of el in a mask (child elements such as <span class="nw"> count as one word; .hl is split inside). */
  function split(el) {
    el = $(el);
    if (el.dataset.split) return el;
    el.dataset.split = 1;
    const wrap = (inner) => {
      const w = document.createElement("span");
      w.className = "w";
      const i = document.createElement("span");
      i.append(inner);
      w.append(i);
      return w;
    };
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          frag.append(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(document.createTextNode(part)));
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.classList.contains("hl")) {
        split(n);
      } else if (n.nodeType === 1) {
        n.replaceWith(wrap(n.cloneNode(true)));
      }
    });
    return el;
  }
  /** Words of a split element rising out of their masks from second a, `step` seconds apart. */
  function words(el, t, a, step = 0.07) {
    $$(".w > span", split(el)).forEach((w, i) => {
      const k = out(p(t, a + i * step, a + i * step + 0.6));
      w.style.transform = `translateY(${(1 - k) * 130}%) rotate(${(1 - k) * 4}deg)`;
    });
  }
  /** The lime underline under a .hl phrase, drawn from second a. */
  const hl = (el, t, a, d = 0.6) => $(el).style.setProperty("--k", inOut(p(t, a, a + d)).toFixed(3));
  /** A caption (.cap) from second a: overline, headline word by word with its .hl underline, then the text. */
  function caption(el, t, a) {
    el = $(el);
    const tag = $(".tag, .step", el);
    if (tag) rise(tag, t, a, 1e9, 20);
    const h = $("h2", el);
    if (h) {
      words(h, t, a + 0.15);
      const n = $$(".w", h).length;
      $$(".hl", h).forEach((x) => hl(x, t, a + 0.45 + n * 0.07));
    }
    $$(":scope > p, :scope > ul", el).forEach((x, i) => rise(x, t, a + 0.6 + i * 0.15, 1e9, 24));
  }
  /** A number counting up from 0 to `to` between a and b. */
  const count = (el, t, a, b, to, fmt = kr) => ($(el).textContent = fmt(to * out(p(t, a, b))));

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

  const TONES = {
    light: { ink: "#0E1B2C", front: "#D4F26B", bg: "#FFFFFF" },
    dark: { ink: "#FFFFFF", front: "#D4F26B", bg: "#0E1B2C" },
    lime: { ink: "#0E1B2C", front: "#FFFFFF", bg: "#D4F26B" },
  };
  /** Takes the logo's accent (--lime) and its ink on dark (--logo-dark) from film.css, so a theme can swap them. */
  function themeTones() {
    const css = getComputedStyle(document.documentElement), v = (n) => css.getPropertyValue(n).trim();
    const accent = v("--lime"), inkDark = v("--logo-dark");
    if (accent) TONES.light.front = TONES.dark.front = TONES.lime.bg = accent;
    if (inkDark) TONES.dark.ink = inkDark;
  }
  /** The pocket symbol (components/Logo.tsx LogoMark), with groups for the back card, the front card and the pocket. */
  function markSvg(tone = "light", bg) {
    const c = TONES[tone], cut = bg || c.bg;
    return `<svg viewBox="0 -2 64 64" aria-hidden="true"><g class="lg-b"><g transform="rotate(-8 22 14)"><rect x="6" y="0" width="32" height="22" rx="4.5" fill="${c.ink}" stroke="${cut}" stroke-width="3"/></g></g><g class="lg-f"><g transform="rotate(6 42 14)"><rect x="25" y="2" width="32" height="22" rx="4.5" fill="${c.front}" stroke="${cut}" stroke-width="3"/></g></g><g class="lg-p"><rect x="2" y="20" width="60" height="40" rx="13" fill="${c.ink}" stroke="${cut}" stroke-width="3"/><rect x="40" y="35" width="15" height="8" rx="4" fill="${cut}"/></g></svg>`;
  }
  /**
   * Fills <span data-logo="light|dark" data-bg="#…" data-sticker="Skole"> with the logo (data-sticker adds the pill
   * after "pro", like SkoleLogo) and <span data-icon="64"> with the app icon.
   */
  function brand() {
    themeTones();
    $$("[data-logo]").forEach((el) => {
      const tone = el.dataset.logo || "light";
      el.classList.add("lg");
      if (tone === "dark") el.classList.add("dark");
      const st = el.dataset.sticker ? `<span class="lg-st">${el.dataset.sticker}</span>` : "";
      el.innerHTML = `${markSvg(tone, el.dataset.bg)}<span class="lg-name"><b>budget</b><i>pro</i></span>${st}`;
    });
    $$("[data-icon]").forEach((el) => {
      const n = Number(el.dataset.icon) || 64;
      el.style.cssText += `;display:inline-grid;place-items:center;flex:none;width:${n}px;height:${n}px;border-radius:${n * 0.25}px;background:#0E1B2C`;
      el.innerHTML = markSvg("dark").replace("<svg ", `<svg width="${n * 0.66}" height="${n * 0.66}" style="overflow:visible" `);
    });
  }
  /** The logo builds itself from second a: the pocket rises, the two cards drop in, the name slides out, a sticker pops. */
  function buildLogo(el, t, a) {
    el = $(el);
    const pk = back(p(t, a, a + 0.55)), bk = back(p(t, a + 0.25, a + 0.85)), fk = back(p(t, a + 0.42, a + 1.02));
    const g = (s) => $(s, el);
    g(".lg-p").style.cssText = `opacity:${clamp(pk * 2)};transform:translateY(${(1 - pk) * 22}px) scale(${lerp(0.7, 1, pk)});transform-origin:32px 40px`;
    g(".lg-b").style.cssText = `opacity:${clamp(bk * 3)};transform:translateY(${(1 - bk) * -54}px) rotate(${(1 - bk) * -18}deg);transform-origin:22px 14px`;
    g(".lg-f").style.cssText = `opacity:${clamp(fk * 3)};transform:translateY(${(1 - fk) * -60}px) rotate(${(1 - fk) * 20}deg);transform-origin:42px 14px`;
    const nk = out(p(t, a + 0.75, a + 1.45));
    const nm = g(".lg-name");
    nm.style.clipPath = `inset(-10% ${(1 - nk) * 100}% -20% 0)`;
    nm.style.transform = `translateX(${(1 - nk) * -30}px)`;
    const st = g(".lg-st");
    if (st) {
      const sk = back(p(t, a + 1.25, a + 1.75));
      st.style.opacity = out(p(t, a + 1.25, a + 1.45));
      st.style.transform = `scale(${lerp(0.4, 1, sk)}) rotate(${(1 - sk) * -8}deg)`;
    }
  }

  /**
   * Motion on a dark card: the big decor circles and rings grow in from second a and breathe, and the floating cards
   * (.fcard, base rotation in data-r, drift strength in data-d) rise in one after another and drift.
   */
  function darkBg(root, t, a) {
    root = $(root);
    $$(".decor, .ring", root).forEach((el, i) => {
      const k = out(p(t, a + i * 0.12, a + i * 0.12 + 1.4));
      put(el, { o: k, s: lerp(0.7, 1, k) + 0.02 * Math.sin(t * 0.8 + i) });
    });
    $$(".fcard", root).forEach((el, i) => {
      const k = back(p(t, a + 0.3 + i * 0.14, a + 1.2 + i * 0.14));
      const r = Number(el.dataset.r || 0), d = Number(el.dataset.d || 1);
      put(el, {
        o: clamp(k * 1.5),
        x: Math.cos(t * 0.5 * d + i * 1.7) * 14 * d,
        y: (1 - k) * 220 + Math.sin(t * 0.6 * d + i * 2.1) * 22 * d,
        r: r + Math.sin(t * 0.45 + i) * 3 + (1 - k) * 14,
      });
    });
  }

  /**
   * Curtains between the dark cards and the light film: at up[1] the dark layer up[0] lifts away with a lime band
   * right behind it; at down[1] a lime band drops in and the dark end layer down[0] follows it.
   */
  function curtain(t, up, down) {
    const H = 1180;
    let ly = null;
    if (up) {
      const [el, a] = up, k = inOut(p(t, a, a + 0.85)), kl = inOut(p(t, a + 0.14, a + 1.0));
      const L = $(el), r = 140 * Math.min(1, k * 4);
      L.style.zIndex = 30;
      put(L, { o: k >= 1 ? 0 : 1, y: -H * k });
      $(".darkcard", L).style.borderRadius = `0 0 ${r}px ${r}px`;
      if (t >= a && kl < 1) ly = -H * kl;
    }
    if (down) {
      const [el, b] = down, kl = inOut(p(t, b, b + 0.8)), k = inOut(p(t, b + 0.16, b + 0.98));
      const L = $(el), r = 140 * (1 - k);
      L.style.zIndex = 30;
      put(L, { o: t >= b + 0.16 ? 1 : 0, y: -H * (1 - k) });
      $(".darkcard", L).style.borderRadius = `0 0 ${r}px ${r}px`;
      if (t >= b && k < 1) ly = -H * (1 - kl);
    }
    put("#curtainLime", { o: ly === null ? 0 : 1, y: ly || 0 });
  }

  /** The lime orb behind the light scenes, travelling between keys [[time, {x, y, d}], …] (centre and diameter). */
  function orb(t, keys) {
    let A = keys[0], B = keys[0];
    for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) (A = keys[i]), (B = keys[i + 1] || keys[i]);
    const k = B === A ? 0 : inOut(p(t, B[0] - Math.min(1.2, B[0] - A[0]), B[0]));
    const at = (f) => lerp(A[1][f], B[1][f], k);
    const x = at("x"), y = at("y") + Math.sin(t * 0.7) * 16, d = at("d");
    $("#orb").style.transform = `translate(${x - 50}px, ${y - 50}px) scale(${d / 100})`;
    const d2 = d * 1.22;
    $("#orb2").style.transform = `translate(${x - 50 + Math.cos(t * 0.6) * 24}px, ${y - 50 + Math.sin(t * 0.5) * 20}px) scale(${d2 / 100})`;
    $("#orb2").style.borderWidth = `${200 / d2}px`;
  }

  const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /**
   * Statement import into a draft budget, like the app's "Kladdebudget" dialog: three files are read, then the fixed
   * entries it found are ticked and added. Made-up files and amounts. update(u) takes seconds since the scene began;
   * T says when to click (the film draws the cursor), so: files 0.5–2.0, next 2.7, list 2.85–4.4, add 5.0.
   */
  function importScene(el) {
    const FILES = [
      ["CSV", "background:var(--midnight);color:var(--lime)", "Lønkonto.csv", "386 posteringer fra 1. okt. 2025 til 30. sep. 2026", "Lønkonto"],
      ["XLSX", "background:var(--lime);color:var(--midnight)", "Budgetkonto.xlsx", "142 posteringer fra 1. okt. 2025 til 30. sep. 2026", "Budgetkonto"],
      ["PDF", "background:var(--lime-tone);color:var(--olive)", "Fælleskonto.pdf", "214 posteringer fra 1. okt. 2025 til 30. sep. 2026", "Fælleskonto"],
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
        ${FILES.map((f) => `<div class="file"><span class="ext" style="${f[1]}">${f[0]}</span><span class="nm"><b>${f[2]}</b><span data-st="${f[3]}">Læser filen…</span></span><span class="acc">${f[4]}</span></div>`).join("")}
        <div class="imp-foot"><span class="imp-ready">3 filer klar</span><span class="btn imp-next">Find faste poster</span></div>
      </div>
      <div class="imp-b">
        <h3>Fundet i kontoudskrifterne</h3>
        <p class="sub">3 filer · 742 posteringer · 12 overførsler mellem egne konti fundet</p>
        ${ROWS.map((r) => `<div class="rw"><span class="ck"></span><span class="ds">${r[0]}<small>${r[1]}</small></span><span class="fq">${r[2]}</span><span class="am${r[4] ? " in" : ""}">${r[3]} kr</span></div>`).join("")}
        <div class="imp-foot"><span class="imp-count">0 poster valgt</span><span class="btn imp-add">Tilføj til kladden</span></div>
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
        const kb = back(p(u, 0.5 + i * 0.3, 1.1 + i * 0.3));
        put(f, { o: k, y: (1 - kb) * -80, s: lerp(0.94, 1, kb), r: (1 - k) * (i % 2 ? 3 : -3) });
        const st = $("[data-st]", f), done = u >= 1.5 + i * 0.25;
        st.textContent = done ? st.dataset.st : "Læser filen…";
        st.style.color = done ? "var(--olive)" : "";
      });
      put($(".imp-ready", el), { o: out(p(u, 2.0, 2.3)) });
      press($(".imp-next", el), u, T.next);
      let n = 0;
      rows.forEach((r, i) => {
        const k = out(p(u, 3.0 + i * 0.12, 3.4 + i * 0.12));
        put(r, { o: k, x: (1 - k) * 40 });
        const on = ROWS[i][5] && u >= 3.5 + i * 0.12;
        ticks[i].classList.toggle("on", on);
        ticks[i].innerHTML = on ? CHECK : "";
        if (on) n++;
      });
      $(".imp-count", el).textContent = n ? `${n} poster valgt` : "Intet valgt";
      press($(".imp-add", el), u, T.add);
      const tk = out(p(u, T.add + 0.15, T.add + 0.5));
      put($(".imp-toast", el), { o: tk, y: (1 - back(p(u, T.add + 0.15, T.add + 0.6))) * 24 });
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
        // The next card lands on top (opaque almost at once); the one below steps back and only then fades.
        const last = j === items.length - 1, nx = (j + 1) * per;
        const kin = j === 0 ? 1 : out(p(u, j * per, j * per + 0.6)), oin = j === 0 ? 1 : out(p(u, j * per, j * per + 0.18));
        const e = last ? 0 : inOut(p(u, nx, nx + 0.6)), oe = last ? 0 : p(u, nx + 0.4, nx + 0.65);
        put(c, { o: Math.min(oin, 1 - oe), x: (1 - kin) * 180 - e * 60, ry: (1 - kin) * -22 + e * 10, s: 1 - e * 0.06 });
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
    brand();
    stage.insertAdjacentHTML("afterbegin", '<div id="orb2"></div><div id="orb"></div>');
    stage.insertAdjacentHTML("beforeend", '<div class="curtain lime" id="curtainLime" style="z-index:29;opacity:0"></div>');
    const c = document.createElement("div");
    c.id = "cursor";
    c.className = "abs";
    c.innerHTML = '<div class="pulse" id="pulse"></div><svg width="40" height="40" viewBox="0 0 24 24" style="position:absolute;left:-4px;top:-2px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.28))"><path d="M4 2.5l15 9.2-6.6 1.4L9 19.6z" fill="#0E1B2C" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
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

  window.F = {
    $, $$, clamp, inOut, out, back, p, vis, lerp, kr, put, rise, slide, enter, scene, split, words, hl, caption, count, centre,
    cursor, press, bars, buildLogo, darkBg, curtain, orb, importScene, deck, film,
  };
})();
