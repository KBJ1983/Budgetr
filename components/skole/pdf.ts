import { addMonths, caseById, dayMonthYear, kr, monthYear, segments, steps, totals, type Flow } from "@/lib/skole";

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
  doc.setTextColor(22, 32, 29);
  doc.text(plain(`${c.gen} budget`), left, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70, 83, 78);
  doc.text(plain(`Elevkode ${code} · ${dayMonthYear(now)} · budgetpro Skole`), left, 29);

  doc.autoTable({
    startY: 36,
    head: [["Pr. måned", "Beløb"]],
    body: [["Indtægt", kr(t.income)], ...segments(t).map((x) => [x.label, kr(x.amt)]), ["Tilbage", kr(t.left)]].map((r) => r.map(plain)),
    theme: "grid",
    headStyles: { fillColor: [31, 92, 74] },
    columnStyles: { 1: { halign: "right" } },
    margin: { left, right: left },
  });

  let y = doc.lastAutoTable.finalY + 9;
  doc.setTextColor(22, 32, 29);
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
      doc.setTextColor(70, 83, 78);
      doc.text(q, left, y);
      y += q.length * 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(22, 32, 29);
      doc.text(a, left, y);
      y += a.length * 5 + 5;
    });

  doc.save(`budget-${code}.pdf`);
}
