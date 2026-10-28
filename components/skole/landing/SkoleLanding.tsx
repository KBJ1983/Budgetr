import Image from "next/image";
import { Film } from "@/components/Film";
import { BRAND, SkoleLogo } from "@/components/Logo";
import { SiteSwitch } from "@/components/SiteSwitch";
import { COMPANY } from "@/lib/company";
import l from "./skoleLanding.module.css";

/**
 * budgetpro Skole's front page (skole.<domain>/; layout from design "Skole forside", Oct 2026, brand "Midnat og solgul"
 * from docs/design/skole-21b.html). A server component: `base` is the
 * school pages' prefix as the visitor sees it ("" on the subdomain, "/skole" on the main site), `mainSite` the main
 * site's address. The laptop and phone show real screenshots (`pnpm shots:skole`); the hero card is a drawn miniature.
 * Under the hero sits a short explainer film (components/Film, made from video/skole.html).
 */
export function SkoleLanding({ base, mainSite }: { base: string; mainSite: string }) {
  return (
    <div className={l.page}>
      <div className={l.heroWrap}>
        <SiteSwitch current="skole" />
        <div className={`${l.dark} ${l.band}`}>
          <header className={l.top}>
            <a href={`${base}/`} className={l.brand} aria-label="budgetpro Skole">
              {/* Two sizes so "Log ind" and "Elevkode" fit next to the logo at 390 px (its sizes are inline). */}
              <span className={l.logoLg}>
                <SkoleLogo fontSize={22} dark bg={BRAND.midnight} />
              </span>
              <span className={l.logoSm}>
                <SkoleLogo fontSize={18} dark bg={BRAND.midnight} />
              </span>
            </a>
            <nav className={l.nav} aria-label="Sider">
              <a href="#forloeb">Forløbet</a>
              <a href="#funktioner">Funktioner</a>
              <a href="#laerer">For læreren</a>
              <a href="#pris">Pris</a>
            </nav>
            <div className={l.topRight}>
              <a href={`${base}/laerer`} className={l.topLink}>
                Log ind
              </a>
              <a href={`${base}/elev`} className={l.topLink}>
                Elevkode
              </a>
              <a href="#start" className={l.topCta}>
                Prøv med din klasse
              </a>
            </div>
          </header>

          <div className={`${l.inner} ${l.hero}`}>
            <div className={l.heroText}>
              <div className={l.eyebrowPill}>Privatøkonomi i 7.–9. klasse</div>
              <h1 className={l.h1}>
                Hvad koster det at være voksen? <span className={l.sun}>Eleverne regner det selv ud.</span>
              </h1>
              <p className={l.heroLead}>
                Et færdigt tema om privatøkonomi, hvor hver elev lægger et månedsbudget for en fremtidsperson: løn og skat, bolig, faste udgifter,
                opsparing, og hvad der sker, når livet ændrer sig.
              </p>
              <div className={l.heroCtas}>
                <a href="#start" className={l.btnSun}>
                  Prøv gratis med én klasse <Arrow />
                </a>
                <a href="#forloeb" className={l.underline}>
                  Se forløbet
                </a>
              </div>
              <ul className={l.checks}>
                {CHECKS.map((c) => (
                  <li key={c}>
                    <span className={l.checkDot}>
                      <Check size={10} color={BRAND.midnight} />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <HeroMock />
          </div>
        </div>
      </div>

      <section className={l.white} aria-labelledby="film-h">
        <div className={`${l.inner} ${l.section}`}>
          <div className={l.headSplit}>
            <div className={l.col}>
              <span className={l.kicker}>Se forløbet</span>
              <h2 id="film-h" className={l.h2}>
                budgetpro Skole på under et minut.
              </h2>
            </div>
            <p className={l.body}>Se, hvad eleverne laver i forløbet, og hvad du som lærer kan følge med i undervejs.</p>
          </div>
          <Film name="skole" label="Film: budgetpro Skole for elever og lærere" />
        </div>
      </section>

      <section className={l.sand} aria-labelledby="udstyr-h">
        <div className={`${l.inner} ${l.devicesSec}`}>
          <div className={`${l.col} ${l.center}`}>
            <span className={l.kicker}>Chromebook, iPad og mobil</span>
            <h2 id="udstyr-h" className={`${l.h2} ${l.h2s}`}>
              Virker på det udstyr, eleverne allerede har.
            </h2>
          </div>
          <div className={l.devices}>
            <div className={l.laptop}>
              <div className={l.laptopLid}>
                <div className={l.laptopScreen}>
                  <Image src="/skole/mit-budget.jpg" alt="Mit budget i budgetpro Skole på en bærbar" fill sizes="(max-width: 960px) 90vw, 860px" style={{ objectFit: "cover", objectPosition: "top" }} />
                </div>
              </div>
              <div className={l.laptopBase}>
                <span />
              </div>
            </div>
            <div className={l.phone}>
              <div className={l.phoneScreen}>
                <Image src="/skole/trin3-mobil.jpg" alt="Trin 3, Bolig, på en mobil" fill sizes="(max-width: 960px) 30vw, 230px" style={{ objectFit: "cover", objectPosition: "top" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="forloeb" className={l.white} aria-labelledby="forloeb-h">
        <div className={`${l.inner} ${l.section}`}>
          <div className={l.headSplit}>
            <div className={l.col}>
              <span className={l.kicker}>Et færdigt tema</span>
              <h2 id="forloeb-h" className={l.h2}>
                Privatøkonomi på fire lektioner.
              </h2>
            </div>
            <p className={l.body}>
              Eleverne arbejder i deres eget tempo, og I samler op i klassen. Brug det hele som et tema, eller tag de enkelte trin, når de passer ind
              i undervisningen.
            </p>
          </div>
          <div className={l.lessons}>
            {LESSONS.map((x) => (
              <article key={x.n} className={l.lesson} style={TONES[x.tone]}>
                <div className={l.lessonHead}>
                  <span className={l.lessonNo}>Lektion {x.n}</span>
                  <span>{x.steps}</span>
                </div>
                <h3 className={l.lessonT}>{x.t}</h3>
                <p className={l.lessonB}>{x.b}</p>
                <div className={l.tags}>
                  {x.tags.map((t) => (
                    <span key={t} className={l.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="materiale" className={l.sand} aria-labelledby="materiale-h">
        <div className={`${l.inner} ${l.section} ${l.matSplit}`}>
          <div className={l.col}>
            <span className={l.kicker}>Undervisningsmateriale</span>
            <h2 id="materiale-h" className={`${l.h2} ${l.h2s}`}>
              Papir og skærm, der hænger sammen.
            </h2>
            <p className={l.body}>
              Til hver lektion er der et elevark, som følger trinene på skærmen. Eleven læser lønsedlen på trin 2 og skriver tallene ind i opgave 3,
              regner skatten i procent og tager arket med til opsamlingen.
            </p>
            <ul className={l.matList}>
              {MATERIAL.map((x) => (
                <li key={x.t}>
                  <b>{x.t}</b>
                  <span>{x.b}</span>
                </li>
              ))}
            </ul>
            <div>
              <a href={`${base}/materiale`} className={l.btnDark}>
                Se og print materialet
              </a>
            </div>
          </div>
          <div className={l.matStage}>
            <div className={`${l.matSheet} ${l.matSheetBack}`}>
              <Image src="/skole/materiale-vejledning.jpg" alt="Lærervejledning til lektion 1 med lektionen trin for trin og tal til tavlen" fill sizes="(max-width: 900px) 60vw, 380px" />
            </div>
            <div className={l.matSheet}>
              <Image src="/skole/materiale-elevark.jpg" alt="Elevark til lektion 1 med elevkoden BLÅ-ORM-47 og opgaver om lønsedlen" fill sizes="(max-width: 900px) 70vw, 420px" />
            </div>
            <div className={`${l.phone} ${l.matPhone}`}>
              <div className={l.phoneScreen}>
                <Image src="/skole/trin2-mobil.jpg" alt="Trin 2, lønsedlen, på en mobil med samme elevkode" fill sizes="(max-width: 900px) 34vw, 200px" style={{ objectFit: "cover", objectPosition: "top" }} />
              </div>
            </div>
            <span className={l.matChip}>Trin 2 på skærmen · opgave 3 på arket</span>
          </div>
        </div>
      </section>

      <section id="funktioner" className={l.sand} aria-labelledby="funktioner-h">
        <div className={`${l.inner} ${l.section}`}>
          <div className={`${l.col} ${l.narrow}`}>
            <span className={l.kicker}>Funktioner</span>
            <h2 id="funktioner-h" className={l.h2}>
              Bygget til undervisning, med de samme beregninger som i budgetpro.
            </h2>
          </div>
          <div className={l.features}>
            {FEATURES.map((f, i) => (
              <div key={f.t} className={l.feature}>
                <span className={l.featureIcon} style={{ background: i % 2 ? BRAND.sunTone : "#E6EAF0" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={i % 2 ? BRAND.sunInk : BRAND.midnight} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={f.icon} />
                  </svg>
                </span>
                <h3 className={l.featureT}>{f.t}</h3>
                <p className={l.featureB}>{f.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={l.sand} aria-labelledby="klasse-h">
        <div className={`${l.inner} ${l.split} ${l.photoSplit} ${l.photoSplitEnd}`}>
          <div className={l.photo}>
            <Image
              src="/skole/klasse.jpg"
              alt="Elever og lærer ved bærbare computere i klasselokalet"
              fill
              sizes="(max-width: 960px) 100vw, 580px"
              style={{ objectFit: "cover", objectPosition: "center 40%" }}
            />
            <div className={l.chip}>
              <span className={l.chipNo}>?</span>
              <span className={l.chipQ}>”Hvorfor er skatten så høj?”</span>
            </div>
          </div>
          <div className={l.col}>
            <span className={l.kicker}>I klasselokalet</span>
            <h2 id="klasse-h" className={`${l.h2} ${l.h2s}`}>
              Når tallene er deres egne, begynder snakken.
            </h2>
            <p className={l.body}>
              Eleverne træffer valgene selv og ser med det samme, hvad de betyder. Derfor opstår spørgsmålene af sig selv: Hvorfor er der så lidt
              tilbage? Hvad hvis man flytter sammen? Kan man nå kørekortet til sommer?
            </p>
            <p className={l.body}>Arbejd alene, i par eller i grupper, og brug refleksionsspørgsmålene til opsamling i klassen.</p>
          </div>
        </div>
      </section>

      <section id="laerer" className={l.sandPad} aria-labelledby="laerer-h">
        <div className={`${l.dark} ${l.band}`}>
          <div className={`${l.inner} ${l.split} ${l.teacher}`}>
            <div className={l.col} style={{ gap: 24 }}>
              <span className={`${l.kicker} ${l.sun}`}>For læreren</span>
              <h2 id="laerer-h" className={`${l.h2} ${l.h2s}`}>
                Klassen er i gang på to minutter.
              </h2>
              <ol className={l.tSteps}>
                {T_STEPS.map((x, i) => (
                  <li key={x.t}>
                    <span className={l.tNo}>{i + 1}</span>
                    <div className={l.tText}>
                      <span className={l.tT}>{x.t}</span>
                      <span className={l.tB}>{x.b}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <ClassMock />
          </div>
        </div>
      </section>

      <section id="pris" className={l.sand} aria-labelledby="pris-h">
        <div className={`${l.inner} ${l.split} ${l.price}`}>
          <div className={l.col}>
            <span className={l.kicker}>Pris</span>
            <h2 id="pris-h" className={l.h2}>
              Én pris for hele skolen.
            </h2>
            <p className={l.body}>Start gratis med én klasse. Når I er klar, får hele skolen adgang for et fast beløb pr. skoleår.</p>
          </div>
          <div className={l.priceCard}>
            <div className={l.priceRow}>
              <span className={l.priceAmt}>1.500 kr.</span>
              <span className={l.priceUnit}>pr. skoleår inkl. moms</span>
            </div>
            <ul className={l.priceList}>
              {PRICE_LIST.map((p) => (
                <li key={p}>
                  <span className={l.priceCheck}>
                    <Check size={11} color={BRAND.sunInk} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <a href="#start" className={l.btnDark}>
              Prøv gratis med én klasse
            </a>
          </div>
        </div>
      </section>

      <section id="start" className={l.sandPadEnd} aria-labelledby="start-h">
        <div className={`${l.band} ${l.yellow}`}>
          <div className={`${l.inner} ${l.closing}`}>
            <h2 id="start-h" className={`${l.h2} ${l.closingH}`}>
              Giv eleverne et realistisk billede af, hvad det koster at være voksen.
            </h2>
            <p className={l.closingP}>Opret en klasse og del elevkoderne. Det kræver ikke, at eleverne har en bruger.</p>
            <div className={l.closingCtas}>
              <a href={`${base}/laerer?ny=1`} className={l.btnDark}>
                Opret en klasse
              </a>
            </div>
            <p className={l.closingLogin}>
              Har du allerede en lærerbruger? <a href={`${base}/laerer`}>Log ind</a>
            </p>
          </div>
        </div>
      </section>

      <footer className={`${l.inner} ${l.footer}`}>
        <span className={l.brand}>
          <SkoleLogo fontSize={20} bg={BRAND.warm} />
        </span>
        <span className={l.slogan}>Dit overblik. Dine drømme.</span>
        <a href={`${base}/privatliv`}>Privatlivspolitik</a>
        <a href={`${base}/vilkaar`}>Vilkår</a>
        <a href={`mailto:${COMPANY.email}`}>Kontakt</a>
        <a href={mainSite}>budgetpro.dk</a>
        <span>
          {COMPANY.name} · CVR {COMPANY.cvr}
        </span>
      </footer>
    </div>
  );
}

/** Step 3 of the pupil flow as a miniature, with the budget meter (Sara in a shared flat). */
function HeroMock() {
  return (
    <div className={l.mockWrap} aria-hidden="true">
      <div className={l.dots} />
      <div className={l.mock}>
        <div className={l.mockTop}>
          <SkoleLogo fontSize={13} bg="#FFFFFF" />
          <span className={l.mockCode}>BLÅ-ORM-47</span>
        </div>
        <div className={l.mockSteps}>
          {Array.from({ length: 8 }, (_, i) => {
            const n = i + 1;
            const state = n < 3 ? l.stepDone : n === 3 ? l.stepCur : "";
            return (
              <div key={n} className={l.mockStep}>
                {n > 1 && <span className={`${l.mockLine} ${n <= 3 ? l.mockLineOn : ""}`} />}
                <span className={`${l.mockDot} ${state}`}>{n < 3 ? "✓" : n}</span>
              </div>
            );
          })}
        </div>
        <div className={l.mockBody}>
          <div className={l.mockQ}>
            <span className={l.mockKicker}>Trin 3 · Bolig</span>
            <span className={l.mockTitle}>Hvor skal Sara bo?</span>
            {MOCK_BOLIG.map(([label, amt, on]) => (
              <div key={label} className={`${l.mockOpt} ${on ? l.mockOptOn : ""}`}>
                <span>{label}</span>
                <b>{amt}</b>
                {on && <span className={l.mockTick} />}
              </div>
            ))}
            <div className={l.mockWhy}>
              <b>Hvorfor?</b> Boligen er som regel den største faste udgift.
            </div>
          </div>
          <div className={l.mockMeter}>
            <div className={l.donut}>
              <svg viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke={BRAND.midnight2} strokeWidth="26" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#F7F7F2" strokeWidth="26" strokeDasharray="159 503" transform="rotate(-90 100 100)" />
                <circle cx="100" cy="100" r="80" fill="none" stroke={BRAND.haze} strokeWidth="26" strokeDasharray="54 503" strokeDashoffset="-159" transform="rotate(-90 100 100)" />
                <circle cx="100" cy="100" r="80" fill="none" stroke={BRAND.sun} strokeWidth="26" strokeDasharray="142 503" strokeDashoffset="-213" transform="rotate(-90 100 100)" />
              </svg>
              <div className={l.donutText}>
                <span>Tilbage</span>
                <b>4.473 kr.</b>
              </div>
            </div>
            <div className={l.legend}>
              {MOCK_LEGEND.map(([label, amt, color]) => (
                <div key={label}>
                  <span className={l.swatch} style={{ background: color }} />
                  <span className={l.legendL}>{label}</span>
                  <b>{amt}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={l.badge}>
        <span className={l.chipNo}>8</span>
        <span className={l.badgeText}>
          <b>8 trin fra løn til budget</b>
          <span>Budgetmåleren følger med</span>
        </span>
      </div>
    </div>
  );
}

/** The teacher's class page as a miniature (made-up class). */
function ClassMock() {
  return (
    <div className={l.classMock} aria-hidden="true">
      <div className={l.classHead}>
        <span className={l.classTitle}>Klasseoverblik</span>
        <span className={l.classSub}>8.b · 24 elever</span>
      </div>
      <div className={l.stats}>
        {STATS.map((x) => (
          <div key={x.l} className={l.stat} style={{ background: x.bg, color: x.fg }}>
            <span className={l.statV}>{x.v}</span>
            <span className={l.statL}>{x.l}</span>
          </div>
        ))}
      </div>
      <div className={l.table}>
        <div className={`${l.tRow} ${l.tHead}`}>
          <span>Elevkode</span>
          <span>Trin</span>
          <span>Går op</span>
        </div>
        {ROWS.map(([code, step, ok]) => (
          <div key={code} className={l.tRow}>
            <span className={l.tCode}>{code}</span>
            <span>{step}</span>
            <span className={l.tOk} style={{ color: ok == null ? "#5A6577" : ok ? BRAND.midnight : "#B4412C" }}>
              {ok == null ? "–" : ok ? "✓" : "✗"}
            </span>
          </div>
        ))}
      </div>
      <span className={l.classNote}>Ingen navne. Kun elevkoder, som du selv fordeler.</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Check({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

const CHECKS = ["Ingen elevnavne gemmes", "Virker på Chromebook og mobil", "Klassen er klar på 2 minutter"];

const MOCK_BOLIG: [string, string, boolean][] = [
  ["Værelse", "3.500 kr.", false],
  ["Delelejlighed", "4.800 kr.", true],
  ["1-værelses", "6.900 kr.", false],
];

const MOCK_LEGEND: [string, string, string][] = [
  ["Bolig", "4.800 kr.", "#F7F7F2"],
  ["Faste", "1.627 kr.", BRAND.haze],
  ["Hverdag", "4.300 kr.", BRAND.sun],
];

/** Lesson card colours ("Midnat og solgul"), as CSS variables read by .lesson. */
const TONES = {
  light: { "--bg": BRAND.warm, "--fg": BRAND.midnight, "--kc": BRAND.sunInk, "--bc": "#4A5363", "--tb": "#E2DFD8" },
  yellow: { "--bg": BRAND.sunTone, "--fg": BRAND.midnight, "--kc": BRAND.sunInk, "--bc": "#4A3A12", "--tb": "#EBD68C" },
  dark: { "--bg": BRAND.midnight, "--fg": "#F7F7F2", "--kc": BRAND.sun, "--bc": BRAND.haze, "--tb": "#2E405A" },
} as Record<string, React.CSSProperties>;

const LESSONS = [
  { n: 1, steps: "Trin 1–2", t: "Mød din fremtidsperson", b: "Eleven vælger en case og ser, hvordan løn før skat bliver til det beløb, der faktisk lander på kontoen.", tags: ["Løn og skat", "AM-bidrag"], tone: "light" },
  { n: 2, steps: "Trin 3–5", t: "Bolig, faste udgifter og hverdag", b: "Valg med konsekvenser. Budgetmåleren viser med det samme, hvad der er tilbage.", tags: ["Rådighedsbeløb", "Behov og ønsker"], tone: "yellow" },
  { n: 3, steps: "Trin 6–7", t: "Opsparing og drømme", b: "Buffer og et opsparingsmål med en dato. Går budgettet ikke op, skal eleven gå tilbage og prioritere.", tags: ["Buffer", "Mål med dato"], tone: "light" },
  { n: 4, steps: "Trin 8 + Mit budget", t: "Hvad nu hvis …?", b: "Huslejen stiger, jobbet forsvinder, man flytter sammen. Til sidst bygger eleven sit eget budget med poster og nøgletal.", tags: ["Scenarier", "Nøgletal"], tone: "dark" },
];

const MATERIAL = [
  { t: "Elevark med elevens kode", b: "Ét ark pr. lektion. Print det med hver elevs kode på, så arket også er elevens login." },
  { t: "Lærervejledning", b: "Mål, lektionen minut for minut, spørgsmål til samtalen og tal til tavlen." },
  { t: "Forløbsbeskrivelse", b: "Formål, læringsmål og de fire lektioner på to sider, til årsplanen eller kollegerne." },
];

const FEATURES = [
  { t: "Tre fremtidspersoner", b: "Sara er tømrerlærling, Jonas er SOSU-assistent, og Mira er studerende på SU. Realistiske tal, som eleverne kan genkende.", icon: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 20c0-3 3-6 6-6s6 3 6 6 M16 11h6 M16 15h6 M16 7h6" },
  { t: "Budgetmåler i realtid", b: "Hvert valg ændrer donutten med det samme. Eleverne ser konsekvensen, før de går videre.", icon: "M12 3a9 9 0 1 0 9 9h-9z M14 3.3A9 9 0 0 1 20.7 10H14z" },
  { t: "”Hvorfor?” på hvert trin", b: "En kort forklaring og et refleksionsspørgsmål på hvert trin, som kan bruges i klassen bagefter.", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4 M12 17h.01" },
  { t: "Eget budget med nøgletal", b: "Eleven tilføjer og sletter budgetposter og ser rådighed pr. dag, boligandel, opsparingsrate og dato for drømmen.", icon: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01" },
  { t: "Elevkoder, ingen navne", b: "Eleverne logger ind med en kode som BLÅ-ORM-47. Vi gemmer ingen navne eller personoplysninger.", icon: "M15 7a4 4 0 1 1-3.5 6L4 20.5 M7 17l2 2 M15 7h.01" },
  { t: "Opsummering til afleveringen", b: "Til sidst får eleven en side med budget, mål og svar på refleksionsspørgsmålene, som kan gemmes som PDF.", icon: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" },
];

const T_STEPS = [
  { t: "Opret en klasse", b: "Vælg klassetrin og antal elever." },
  { t: "Del elevkoderne", b: "Print eller kopiér listen, og skriv selv, hvem der har hvilken kode." },
  { t: "Følg klassen", b: "Se, hvor langt eleverne er nået, og hvor mange der får budgettet til at gå op. Brug tallene i opsamlingen." },
];

const STATS = [
  { v: "60 %", l: "valgte delelejlighed", bg: BRAND.midnight, fg: "#F7F7F2" },
  { v: "6 af 8", l: "fik budgettet til at gå op", bg: "#FFFFFF", fg: BRAND.midnight },
  { v: "Sara", l: "mest valgte case", bg: BRAND.sun, fg: BRAND.midnight },
];

const ROWS: [string, string, boolean | null][] = [
  ["BLÅ-ORM-47", "Færdig", true],
  ["GUL-RÆV-12", "Færdig", true],
  ["RØD-UGLE-33", "Trin 7", false],
  ["GRØN-ULV-58", "Trin 5", null],
];

const PRICE_LIST = ["150 elever og 10 lærere", "Alle tre cases og ”Mit budget”", "Klasseoverblik og elevkoder", "Gratis prøve med én klasse"];
