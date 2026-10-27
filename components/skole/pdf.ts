import {
  addMonths, boligLevel, budgetNumbers, caseById, CATS, dayMonthYear, FREQS, kr, monthly, monthYear, opsLevel, parentTalk, segments, signedKr, steps, totals,
  type Flow, type Post,
} from "@/lib/skole";

// jsPDF comes from a script tag without types.
type JsPdf = new (options?: object) => any;

function script(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });
}

let loading: Promise<JsPdf> | undefined;
function loadJsPdf(): Promise<JsPdf> {
  loading ??= (async () => {
    await script("/budgetr-app/vendor/jspdf.umd.min.js");
    await script("/budgetr-app/vendor/jspdf.plugin.autotable.min.js");
    return (window as any).jspdf.jsPDF as JsPdf;
  })();
  loading.catch(() => (loading = undefined));
  return loading;
}

// jsPDF's built-in Helvetica has æøå but not the minus sign or the curly apostrophe.
const plain = (t: string) => t.replace(/−/g, "-").replace(/’/g, "'");

/** Downloads the pupil's summary: the month in a table, the dream date and the reflection answers. */
export async function summaryPdf(code: string, flow: Flow, refl: Record<number, string>, now = new Date()): Promise<void> {
  const Doc = await loadJsPdf();
  const doc = new Doc({ unit: "mm", format: "a4" });
  const c = caseById(flow.caseId);
  const t = totals(flow);
  const left = 18;
  const width = 174;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(14, 27, 44);
  doc.text(plain(`${c.gen} budget`), left, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 101, 119);
  doc.text(plain(`Elevkode ${code} · ${dayMonthYear(now)} · budgetpro Skole`), left, 29);

  doc.autoTable({
    startY: 36,
    head: [["Pr. måned", "Beløb"]],
    body: [["Indtægt", kr(t.income)], ...segments(t).map((x) => [x.label, kr(x.amt)]), ["Tilbage", kr(t.left)]].map((r) => r.map(plain)),
    theme: "grid",
    headStyles: { fillColor: [14, 27, 44], textColor: [247, 247, 242] },
    columnStyles: { 1: { halign: "right" } },
    margin: { left, right: left },
  });

  let y = doc.lastAutoTable.finalY + 9;
  doc.setTextColor(14, 27, 44);
  doc.setFontSize(11);
  doc.text(plain(`${c.dream} klar i ${monthYear(addMonths(now, flow.months))}`), left, y);
  y += 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Dine svar", left, y);
  y += 8;

  steps(c)
    .slice(1)
    .forEach((st, i) => {
      const q: string[] = doc.splitTextToSize(plain(`${i + 1}. ${st.refl}`), width);
      const a: string[] = doc.splitTextToSize(plain(refl[i + 2]?.trim() || "(intet svar)"), width);
      if (y + (q.length + a.length) * 5 + 6 > 282) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(90, 101, 119);
      doc.text(q, left, y);
      y += q.length * 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(14, 27, 44);
      doc.text(a, left, y);
      y += a.length * 5 + 5;
    });

  doc.save(`budget-${code}.pdf`);
}

/**
 * Downloads "Mit budget": the key figures and every post on page 1, then a talk with the parents about having a budget
 * (open questions with room for notes) and a word to the parents. Each page ends with the budgetpro line.
 */
export async function budgetPdf(code: string, flow: Flow, posts: Post[], now = new Date()): Promise<void> {
  const Doc = await loadJsPdf();
  const doc = new Doc({ unit: "mm", format: "a4" });
  const c = caseById(flow.caseId);
  const n = budgetNumbers(posts, c);
  const talk = parentTalk(c);
  const left = 18;
  const width = 174;
  const ink = [14, 27, 44];
  const grey = [90, 101, 119];
  const band = [238, 236, 230];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...ink);
  doc.text(plain(`${c.gen} budget`), left, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...grey);
  doc.text(plain(`Elevkode ${code} · ${dayMonthYear(now)} · budgetpro Skole`), left, 29);
  doc.text(plain(`${c.name}, ${c.age} år, ${c.job.toLowerCase()}. Et budget for en fremtidsperson.`), left, 34);

  const dream = n.monthsToDream ? `${n.monthsToDream} mdr. (${monthYear(addMonths(now, n.monthsToDream))})` : "Ingen opsparing til drømmen";
  doc.autoTable({
    startY: 40,
    head: [["Nøgletal", "", "Tommelfingerregel"]],
    body: [
      ["Tilbage pr. måned", signedKr(n.left), n.left < 0 ? "Går ikke op" : "Går op"],
      ["Rådighed pr. dag", kr(n.raad / 30), `Rådighedsbeløb ${kr(n.raad)} pr. måned efter bolig og faste udgifter`],
      ["Boligandel", `${n.boligPct} %`, `Højst 30 % af indtægten: ${["fint", "hold øje", "for højt"][boligLevel(n.boligPct)]}`],
      ["Opsparingsrate", `${n.opsPct} %`, `Mindst 10 % af indtægten: ${["fint", "lidt lavt", "for lavt"][opsLevel(n.opsPct)]}`],
      [`${c.dream} (${kr(c.dreamAmt)}) klar om`, dream, ""],
    ].map((r) => r.map(plain)),
    theme: "grid",
    headStyles: { fillColor: ink, textColor: [247, 247, 242] },
    columnStyles: { 0: { cellWidth: 58 }, 1: { halign: "right", cellWidth: 50, fontStyle: "bold" } },
    margin: { left, right: left },
  });

  const body: unknown[] = [];
  for (const cat of CATS) {
    const list = posts.filter((p) => p.cat === cat.key);
    if (!list.length) continue;
    body.push([
      { content: plain(cat.label), colSpan: 3, styles: { fontStyle: "bold", fillColor: band } },
      { content: plain(kr(n.byCat[cat.key])), styles: { fontStyle: "bold", fillColor: band, halign: "right" } },
    ]);
    for (const p of list) body.push([p.name || "(uden navn)", kr(p.amt), FREQS[p.freq].long, kr(monthly(p))].map(plain));
  }
  body.push([
    { content: "Tilbage pr. måned", colSpan: 3, styles: { fontStyle: "bold" } },
    { content: plain(signedKr(n.left)), styles: { fontStyle: "bold", halign: "right" } },
  ]);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Post", "Beløb", "Hvor tit", "Pr. måned"]],
    body,
    theme: "grid",
    headStyles: { fillColor: ink, textColor: [247, 247, 242] },
    columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
    margin: { left, right: left, bottom: 22 },
  });

  // The talk at home, on its own page.
  doc.addPage();
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ink);
  doc.text(plain(talk.title), left, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...grey);
  const intro: string[] = doc.splitTextToSize(plain(talk.intro), width);
  doc.text(intro, left, y);
  y += intro.length * 5 + 5;

  doc.setDrawColor(207, 203, 194);
  talk.questions.forEach((q, i) => {
    const lines: string[] = doc.splitTextToSize(plain(`${i + 1}. ${q}`), width);
    if (y + lines.length * 5 + 16 > 275) {
      doc.addPage();
      y = 22;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text(lines, left, y);
    y += lines.length * 5 + 4;
    for (let l = 0; l < 2; l++) {
      doc.line(left, y, left + width, y);
      y += 6.5;
    }
  });

  const parents: string[] = doc.splitTextToSize(plain(talk.parents), width - 12);
  const boxH = parents.length * 5 + 15;
  if (y + boxH > 280) {
    doc.addPage();
    y = 22;
  }
  doc.setFillColor(252, 241, 200);
  doc.roundedRect(left, y, width, boxH, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(92, 62, 0);
  doc.text(plain(talk.parentsTitle), left + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(parents, left + 6, y + 14);

  const pages: number = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...grey);
    doc.text(plain(talk.footer), left, 287);
    doc.text(`${i}/${pages}`, left + width, 287, { align: "right" });
  }

  doc.save(`mit-budget-${code}.pdf`);
}
