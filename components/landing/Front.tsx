import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Film } from "@/components/Film";
import f from "./front.module.css";
import {
  BellIcon,
  BranchIcon,
  CalendarIcon,
  DownloadIcon,
  LoanIcon,
  LockIcon,
  NoBankIcon,
  PeopleIcon,
  ShieldIcon,
  UploadIcon,
} from "./icons";
import { PricePlans } from "./PricePlans";
import { SignupForm } from "./SignupForm";

/*
 * The private front page, design "A6" (Nov 2026, user's choice; prototype public/forslag/mix.html): a short centred
 * hero, the explainer film, a bento grid of the app's parts with the demo family's numbers, the dark "Sådan bliver
 * tallet til" band, Funktioner (a scenario card + the groups folded), the dialog "Det, I plejer at spørge hinanden om",
 * Tryghed, price + FAQ and the closing signup. Every number is the demo family's (lib/demo-customer.ts, Sofie and
 * Mikkel) as the app shows it – keep them in step when the demo changes. Rosa only in small details, never in lists.
 * Blocks marked data-reveal / data-reveal-group come in as they scroll into view (ScrollReveal, once per session).
 */

/* ---------------- Hero + film ---------------- */

export function FrontHero() {
  return (
    <section id="top" className={f.hero} aria-labelledby="hero-title">
      <span className={f.chip}>
        Til husstande, der deler økonomi <b>29 kr/md.</b>
      </span>
      <h1 id="hero-title" className={f.h1}>
        Hele din økonomi. <span>Ét roligt overblik.</span>
      </h1>
      <p className={f.lead}>
        Saml løn, faste udgifter, lån og opsparing ét sted. Se hvad du har til rådighed, og hvad der sker, hvis du
        flytter, skifter job eller låner.
      </p>
      <div className={f.acts}>
        <Link href="/opret" className={f.btn}>
          Prøv gratis i 30 dage
        </Link>
        <Link href="/demobruger" className={f.btnGhost}>
          Prøv demoen
        </Link>
      </div>
      <p className={f.note}>Intet betalingskort, før de 30 dage er gået. Demoen viser en opdigtet familie.</p>
    </section>
  );
}

export function FrontFilm() {
  return (
    <section id="film" className={f.film} aria-label="Film om budgetpro">
      <Film name="privat" label="Film: hvad du får med budgetpro" />
    </section>
  );
}

/* ---------------- Bento grid ---------------- */

const ROWS = [
  { label: "Indtægter", value: "64.050", w: 100 },
  { label: "Regninger", value: "35.493", w: 55 },
  { label: "Husholdning", value: "12.633", w: 20 },
  { label: "Opsparing", value: "12.818", w: 20 },
] as const;

export function FrontBento() {
  return (
    <section className={f.bento} aria-label="Det får du i budgetpro" data-reveal-group>
      <div className={`${f.tile} ${f.tMain}`}>
        <span className={f.k}>Sofie og Mikkel · demofamilien</span>
        <h2 className={f.tTitle}>Til rådighed pr. måned</h2>
        <p className={f.big}>
          3.105<small>kr</small>
        </p>
        <div className={f.rows}>
          {ROWS.map((r) => (
            <div key={r.label}>
              <span>{r.label}</span>
              <i style={{ "--w": `${r.w}%` } as React.CSSProperties} />
              <b>{r.value}</b>
            </div>
          ))}
          <div className={f.rowOn}>
            <span>Til rådighed</span>
            <i style={{ "--w": "5%" } as React.CSSProperties} />
            <b>3.105</b>
          </div>
        </div>
      </div>

      <div className={`${f.tile} ${f.tBank}`}>
        <h3 className={f.tTitle}>Sådan ser banken det</h3>
        <span className={f.k}>Rådighedsbeløbet, som banken regner det</span>
        <dl className={f.calc}>
          <div>
            <dt>Rådighedsbeløb</dt>
            <dd>28.557</dd>
          </div>
          <div>
            <dt>Vejledende krav</dt>
            <dd>18.000</dd>
          </div>
          <div className={f.calcTot}>
            <dt>Over kravet</dt>
            <dd className={f.pos}>10.557</dd>
          </div>
        </dl>
      </div>

      <div className={`${f.tile} ${f.tWho}`}>
        <h3 className={f.tTitle}>Hvem betaler hvad</h3>
        <span className={f.k}>Efter indkomst</span>
        <svg className={f.donut} viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--f-light)" strokeWidth="6" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--v-btn)" strokeWidth="6" strokeDasharray="48.4 88" transform="rotate(-90 18 18)" />
        </svg>
        <p className={f.leg}>
          <span>Sofie 55 %</span>
          <span>Mikkel 45 %</span>
        </p>
      </div>

      <div className={`${f.tile} ${f.tScen}`}>
        <h3 className={f.tTitle}>Hvad nu hvis?</h3>
        <span className={f.k}>Et scenarie ved siden af budgettet – uden at røre det</span>
        <div className={f.cmp}>
          <div>
            <span className={f.k}>Nuværende budget</span>
            <b>3.105</b>
          </div>
          <div>
            <span className={f.k}>Nyt hus fra juli 2027</span>
            <b>−432</b>
          </div>
          <span className={f.neg}>−3.537 kr</span>
        </div>
      </div>

      <div className={`${f.tile} ${f.tPhoto}`}>
        <Image
          src="/landing/foto-sofa.jpg"
          alt="Et par i sofaen, der kigger på budgettet sammen"
          fill
          sizes="(max-width: 760px) 100vw, 560px"
          className={f.cover}
          style={{ objectPosition: "50% 40%" }}
        />
      </div>

      <div className={`${f.tile} ${f.tLoan}`}>
        <h3 className={f.tTitle}>Billånet</h3>
        <span className={f.k}>Betalt ud i juli 2027</span>
        <div className={f.progress} aria-hidden="true">
          <i style={{ width: "85%" }} />
        </div>
        <p className={f.v}>
          +3.300<small> kr/md.</small>
        </p>
        <span className={f.k}>frigives, når lånet er betalt</span>
      </div>

      <div className={`${f.tile} ${f.tCheck}`}>
        <span className={f.bell}>
          <BellIcon size={20} />
        </span>
        <h3 className={f.tTitle}>Månedstjek</h3>
        <p className={f.msg}>
          Løn Mikkel 26.900 → 27.800 kr
          <br />
          El 1.250 → 1.550 kr
        </p>
      </div>

      <div className={`${f.tile} ${f.tImport}`}>
        <h3 className={f.tTitle}>Hent tallene ind</h3>
        <span className={f.k}>Fra netbanken eller dit gamle Excel-budget</span>
        <p className={f.files}>
          <span>lønkonto.csv</span>
          <span>budgetkonto.pdf</span>
          <span>budget-2026.xlsx</span>
        </p>
        <p className={f.res}>Du vælger selv, hvad der kommer med. Posteringerne gemmes ikke.</p>
      </div>
    </section>
  );
}

/* ---------------- The story band ---------------- */

const CHAPTERS = [
  { no: "01", title: "Det kommer ind", sub: "Løn og børnefamilieydelse", value: "64.050" },
  { no: "02", title: "Det går fast", sub: "Regninger og husholdning, pr. måned", value: "−48.127" },
  { no: "03", title: "Det lægges til side", sub: "Opsparingsmål og fast opsparing", value: "−12.818" },
] as const;

export function FrontStory() {
  return (
    <section id="saadan" className={f.story} aria-labelledby="story-title" data-reveal>
      <div>
        <p className={f.ovDark}>Sådan bliver tallet til</p>
        <h2 id="story-title" className={f.giant}>
          3.105<small>kr</small>
        </h2>
        <p className={f.storyText}>
          Det har Sofie og Mikkel til rådighed hver måned, når regninger, husholdning og opsparing er betalt. Ét tal, de
          begge kan stole på, fordi det bygger på deres egne poster.
        </p>
      </div>
      <ol className={f.chapters} data-reveal-group>
        {CHAPTERS.map((c) => (
          <li key={c.no}>
            <span className={f.no}>{c.no}</span>
            <span>
              <b>{c.title}</b>
              <small>{c.sub}</small>
            </span>
            <span className={f.n}>{c.value}</span>
          </li>
        ))}
        <li className={f.last}>
          <span className={f.no}>04</span>
          <span>
            <b>Det er tilbage</b>
            <small>Til rådighed</small>
          </span>
          <span className={f.n}>3.105</span>
        </li>
      </ol>
    </section>
  );
}

/* ---------------- Funktioner ---------------- */

type Group = { icon: ReactNode; title: string; items: readonly string[] };

const GROUPS: readonly Group[] = [
  {
    icon: <CalendarIcon size={20} />,
    title: "Overblik",
    items: ["Tilbage pr. måned efter faste udgifter og opsparing", "Rådighedsbeløbet, som banken regner det", "Saldo på hver konto måned for måned"],
  },
  {
    icon: <UploadIcon size={20} />,
    title: "Poster og konti",
    items: [
      "Ubegrænset antal poster, konti og lån",
      "Beløb omregnet til pr. måned",
      "Import af kontoudskrifter som CSV, Excel eller PDF",
      "Stigninger markeres, og det gamle beløb gemmes",
    ],
  },
  {
    icon: <PeopleIcon size={20} />,
    title: "Sammen",
    items: [
      "Del budgettet med op til to andre",
      "Fordeling efter indkomst, ligeligt eller med en fast procent",
      "Overførslerne til budgetkontoen regnes ud",
      "Egne udgifter og egen opsparing holdes for sig",
    ],
  },
  {
    icon: <LoanIcon size={20} />,
    title: "Lån og opsparing",
    items: [
      "Restgæld, rente og slutdato for hvert lån",
      "Fremskriv restgælden til en dato, du vælger",
      "Opsparingsmål med dato eller fast beløb",
      "Feriepenge og bonus som ekstra indbetalinger",
    ],
  },
  {
    icon: <BranchIcon size={20} />,
    title: "Scenarier og planlægning",
    items: [
      "Scenarier for flytning, barsel, nyt job eller et nyt lån",
      "Hvert scenarie holdes op mod det nuværende budget",
      "Kladder med nye budgetter ved siden af det, du har",
      "Guide i 9 trin til et nyt budget",
    ],
  },
  {
    icon: <BellIcon size={20} />,
    title: "Beskeder",
    items: ["Besked ved 10, 25, 50, 75 og 100 % af et mål", "Påmindelse om at se budgettet igennem", "Opgaver på poster og konti", "På mail eller sms, hvis du vil"],
  },
  {
    icon: <DownloadIcon size={20} />,
    title: "Dine data",
    items: ["Eksport til PDF og Excel", "Sikkerhedskopi, du kan gendanne", "Lyst og mørkt tema"],
  },
];

const IDEAS = ["Nyt hus", "Barsel", "Ny bil", "Renten stiger 1 %", "Færre timer"] as const;

function Ticks({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={[f.ticks, className].filter(Boolean).join(" ")}>
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export function FrontFeatures() {
  return (
    <section id="funktioner" className={f.feats} aria-labelledby="feats-title">
      <div className={f.featsLeft}>
        <div data-reveal>
          <p className={f.ov}>Funktioner</p>
          <h2 id="feats-title" className={f.h2}>
            Alt det, budgettet holder styr på.
          </h2>
          <p className={f.headBody}>Opsparing, lån, påmindelser og det, der ellers kræver et regneark. Alle funktioner er med i prisen.</p>
        </div>
        <div className={f.scen} data-reveal="tilt">
          <span className={f.scenIcon}>
            <BranchIcon size={20} />
          </span>
          <p className={f.ovDark}>Scenarier og kladder</p>
          <h3 className={f.scenTitle}>Prøv det, før I beslutter det.</h3>
          <p className={f.scenLede}>Lav et scenarie for det, I overvejer, og se det ved siden af det nuværende budget. Budgettet selv ændres ikke.</p>
          <p className={f.ideas}>
            {IDEAS.map((i) => (
              <span key={i} data-on={i === "Nyt hus" ? "" : undefined}>
                {i}
              </span>
            ))}
          </p>
          <div className={f.vs}>
            <div>
              <span>Nuværende budget</span>
              <b>3.105 kr</b>
            </div>
            <div>
              <span>Nyt hus fra juli 2027</span>
              <b>−432 kr</b>
            </div>
            <div className={f.vsDiff}>
              <span>Forskel pr. måned</span>
              <b>−3.537 kr</b>
            </div>
          </div>
          <Ticks
            className={f.ticksDark}
            items={[
              "Hvert scenarie holdes op mod det nuværende budget – bedre i grønt, dårligere i rødt",
              "Kladder: hele nye budgetter ved siden af, fx når to økonomier skal lægges sammen",
              "Guide i 9 trin til et nyt budget",
            ]}
          />
        </div>
      </div>
      <div className={f.fold} data-reveal-group>
        {GROUPS.map((g) => (
          <details key={g.title} className={f.fx}>
            <summary>
              <span className={f.fi}>{g.icon}</span>
              <span className={f.fxTitle}>
                <b>{g.title}</b>
                <small>{g.items.length} funktioner</small>
              </span>
              <i className={f.plus} aria-hidden="true" />
            </summary>
            <Ticks items={g.items} />
          </details>
        ))}
        <p className={f.foldNote}>Alle funktioner er med i prisen. Der er ingen tilkøb.</p>
      </div>
    </section>
  );
}

/* ---------------- The dialog ---------------- */

const TALK = [
  {
    who: "S",
    q: "Hvor meget skal jeg overføre til budgetkontoen?",
    lab: "budgetpro",
    a: "26.200 kr om måneden",
    more: "Din del af de fælles udgifter, 55 % efter jeres indkomst. Ændrer budgettet sig, siger budgetpro til.",
  },
  {
    who: "M",
    q: "Har vi råd til et nyt hus fra juli?",
    lab: "budgetpro · scenarie",
    a: "−432 kr til rådighed",
    more: "3.537 kr mindre om måneden end i dag. Budgettet selv er ikke ændret.",
  },
  {
    who: "S",
    q: "Hvornår er billånet betalt ud?",
    lab: "budgetpro · lån",
    a: "Juli 2027",
    more: "Derefter frigives 3.300 kr om måneden.",
  },
] as const;

export function FrontTalk() {
  return (
    <section id="sammen" className={f.talk} aria-labelledby="talk-title">
      <div className={f.talkPhoto} data-reveal="tilt">
        <Image
          src="/landing/foto-flytning.jpg"
          alt="Et par, der flytter sammen, med flyttekasser"
          fill
          sizes="(max-width: 760px) 100vw, 440px"
          className={f.cover}
          style={{ objectPosition: "50% 40%" }}
        />
      </div>
      <div data-reveal>
        <p className={f.ov}>Spørg budgettet</p>
        <h2 id="talk-title" className={f.h2}>
          Det, I plejer at spørge hinanden om.
        </h2>
        <p className={f.headBody}>budgetpro har svaret, fordi det kender jeres poster, konti og lån.</p>
        <div className={f.chat} data-reveal-group>
          {TALK.map((t) => (
            <div key={t.q} className={f.pair}>
              <div className={f.q}>
                <span className={t.who === "S" ? f.avS : f.avM} aria-hidden="true">
                  {t.who}
                </span>
                <p>{t.q}</p>
              </div>
              <div className={f.a}>
                <span className={f.lab}>{t.lab}</span>
                <b>{t.a}</b>
                <p>{t.more}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Tryghed ---------------- */

const SAFE = [
  { icon: <NoBankIcon size={20} />, title: "Ingen adgang til netbanken", body: "budgetpro er ikke forbundet til din bank. Du henter selv en kontoudskrift og uploader den." },
  { icon: <UploadIcon size={20} />, title: "Posteringerne gemmes ikke", body: "Kontoudskriften bruges til at finde de faste poster. Kun dem, du vælger, kommer med." },
  { icon: <LockIcon size={20} />, title: "Ingen adgangskode", body: "Du logger ind med en engangskode på mail. Der er ikke noget kodeord, der kan gættes eller lække." },
  { icon: <PeopleIcon size={20} />, title: "Hver sin adgang", body: "Deler I budgettet, har hver sit login. Fjerner du en, mister de adgangen med det samme." },
  { icon: <ShieldIcon size={20} />, title: "Ingen sporing", body: "Ingen reklamer og ingen sporingscookies. Skrifttyperne hentes ikke hos Google." },
  { icon: <DownloadIcon size={20} />, title: "Du kan altid gå", body: "Tag dine tal med som PDF, Excel eller sikkerhedskopi – eller slet din bruger og alt, der hører til." },
] as const;

export function FrontSafety() {
  return (
    <section id="tryghed" className={f.safe} aria-labelledby="safe-title">
      <div className={f.safeHead} data-reveal>
        <p className={f.ov}>Tryghed</p>
        <h2 id="safe-title" className={f.h2}>
          Dine tal er dine. Det er hele ideen.
        </h2>
        <p className={f.headBody}>
          Et budget fortæller meget om et hjem. Derfor gemmer budgetpro så lidt som muligt, og du bestemmer selv, hvad der
          kommer ind.
        </p>
      </div>
      <ul className={f.points} data-reveal-group>
        {SAFE.map((p) => (
          <li key={p.title}>
            <span className={f.fi}>{p.icon}</span>
            <b>{p.title}</b>
            <p>{p.body}</p>
          </li>
        ))}
      </ul>
      <div className={f.ledger} data-reveal>
        <div>
          <h3>Det gemmer vi</h3>
          <Ticks
            className={f.ticksDark}
            items={["Dit budget: poster, konti, lån og mål", "Navn og e-mail – og mobilnummer, hvis du vil have sms", "Sikkerhedskopier af budgettet"]}
          />
        </div>
        <div>
          <h3>Det gemmer vi ikke</h3>
          <ul className={f.nots}>
            <li>Posteringerne fra kontoudskriften</li>
            <li>Adgang til din netbank</li>
            <li>Adgangskoder</li>
            <li>Betalingskort, før de 30 dage er gået</li>
          </ul>
        </div>
        <Link href="/privatliv" className={f.more}>
          Læs mere i privatlivspolitikken
        </Link>
      </div>
    </section>
  );
}

/* ---------------- Pris + FAQ ---------------- */

const FAQ = [
  { q: "Skal budgetpro have adgang til min netbank?", a: "Nej. Du henter selv en kontoudskrift i netbanken og uploader den. budgetpro finder de faste poster og gemmer ikke posteringerne." },
  { q: "Kan vi bruge det sammen?", a: "Ja. Du kan give op til to andre adgang til samme budget med deres egen e-mail. En ekstra bruger koster 9 kr pr. måned." },
  { q: "Hvad sker der efter de 30 dage?", a: "Du vælger, om du vil betale pr. måned eller pr. år. Der er ingen binding." },
  { q: "Kan jeg få mine data med?", a: "Ja, som PDF, Excel eller en sikkerhedskopi. Du kan også slette din bruger og alt, der hører til, under Indstillinger." },
] as const;

export function FrontPricing() {
  return (
    <section id="pris" className={f.pricing} aria-labelledby="pris-title">
      <div data-reveal>
        <p className={f.ov}>Pris</p>
        <h2 id="pris-title" className={f.h2}>
          Én pris. Alle funktioner.
        </h2>
        <p className={f.headBody}>30 dage gratis, og ingen binding bagefter. Alle priser er inkl. moms.</p>
        <div className={f.faq}>
          {FAQ.map((x, i) => (
            <details key={x.q} open={i === 0}>
              <summary>{x.q}</summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>
      </div>
      <div className={f.priceCard} data-reveal="tilt">
        <PricePlans />
        <Link href="/opret" className={f.btnBlock}>
          Prøv gratis i 30 dage
        </Link>
      </div>
    </section>
  );
}

/* ---------------- Closing signup ---------------- */

export function FrontFinal() {
  return (
    <section className={f.final} aria-labelledby="final-title">
      <div className={f.finalText} data-reveal>
        <h2 id="final-title" className={f.h2}>
          Slip for de mange versioner af Excel-budgettet.
        </h2>
        <p className={f.headBody}>Ét budget, der altid er det nyeste – for dig og dem, du deler økonomi med.</p>
        <SignupForm idPrefix="cta" />
      </div>
      <div className={f.finalPhoto} data-reveal="tilt">
        <Image
          src="/landing/foto-noegler.jpg"
          alt="En familie, der får nøglerne til et nyt hjem"
          fill
          sizes="(max-width: 760px) 100vw, 460px"
          className={f.cover}
          style={{ objectPosition: "50% 45%" }}
        />
      </div>
    </section>
  );
}
