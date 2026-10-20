"""Makes one PDF per test person from budgetpro.html / budgetpro-skole.html, plus the internal budgetpro-input.pdf.

    python docs/testguide/make.py            # reads docs/testguide/testers.json
    python docs/testguide/make.py --example  # one example of each guide, to check the layout

testers.json (never commit it – it holds names and the site password):
    {
      "kode": "<the site password, SITE_PASSWORD>",
      "kontakt": "Navn, mail eller telefon",
      "testere": [
        {"navn": "Anna", "login": "TEST1"},
        {"navn": "Bo", "login": "LÆRER1"}
      ]
    }
A login starting with LÆRER gets the Skole guide, every other login the budgetpro guide. Output: docs/testguide/ud/.
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "ud"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def pdf(src: Path, dest: Path) -> None:
    dest.parent.mkdir(exist_ok=True)
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--allow-file-access-from-files",
         f"--print-to-pdf={dest}", src.as_uri()],
        check=True, capture_output=True,
    )
    print("  ", dest.relative_to(HERE))


def fill(template: str, values: dict[str, str]) -> str:
    def one(m: re.Match) -> str:
        v = values.get(m.group(1), "")
        return html.escape(v) if v else '<span class="fill" style="min-width:30mm"></span>'
    return re.sub(r"\{\{([A-ZÆØÅ]+)\}\}", one, template)


def guide_for(t: dict, kode: str, kontakt: str) -> None:
    login = t["login"].strip().upper()
    skole = login.startswith("LÆRER") or login.startswith("LAERER")
    if skole:
        login = "LÆRER" + re.sub(r"\D", "", login)
    name = "budgetpro-skole" if skole else "budgetpro"
    values = {"NAVN": t["navn"], "LOGIN": login, "KODE": kode, "KONTAKT": kontakt,
              "LÆRERNAVN": "Testlærer " + re.sub(r"\D", "", login) if skole else ""}
    src = HERE / f".{name}-{t['navn']}.html"
    src.write_text(fill((HERE / f"{name}.html").read_text(encoding="utf-8"), values), encoding="utf-8")
    try:
        slug = re.sub(r"[^\wæøåÆØÅ-]+", "-", t["navn"]).strip("-")
        pdf(src, OUT / f"{'skole' if skole else 'budgetpro'}-{slug}-{login}.pdf")
    finally:
        src.unlink()


def main() -> None:
    if "--example" in sys.argv:
        cfg = {"kode": "", "kontakt": "testlederen",
               "testere": [{"navn": "Eksempel", "login": "TEST1"}, {"navn": "Eksempel", "login": "LÆRER1"}]}
    else:
        cfg = json.loads((HERE / "testers.json").read_text(encoding="utf-8"))
    for t in cfg["testere"]:
        guide_for(t, cfg.get("kode", ""), cfg.get("kontakt", ""))
    pdf(HERE / "budgetpro-input.html", OUT / "budgetpro-input-internt.pdf")


main()
