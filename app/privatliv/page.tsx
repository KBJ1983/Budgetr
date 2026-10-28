import type { Metadata } from "next";
import legal from "@/components/legal/legal.module.css";
import { LegalShell } from "@/components/legal/LegalShell";
import { MAX_BACKUPS } from "@/lib/budget-file";
import { COMPANY, companyLine, PRIVACY_UPDATED } from "@/lib/company";
import { AGREEMENT_MAX_AGE_S, SESSION_MAX_AGE_S, TEACHER_MAX_AGE_S } from "@/lib/session";

export const metadata: Metadata = {
  title: "Privatlivspolitik og cookies – budgetpro",
  description: "Hvilke oplysninger budgetpro gemmer, hvorfor, hvor længe, hvem der behandler dem, og hvilke cookies vi bruger.",
};

const days = (s: number) => `${Math.round(s / 86400)} dage`;
const mail = <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;

/**
 * Privacy policy and cookie list (also at /skole/privatliv). Keep it in step with what the code actually stores:
 * lib/accounts.ts (deleteAccount), lib/budget-file.ts, lib/session.ts (cookies), lib/owner-store.ts (activity),
 * lib/send-file.ts, lib/skole-store.ts, lib/skole-teachers.ts, lib/erhverv-inbox.ts, lib/traffic-store.ts (page views), the app's localStorage keys and
 * the processors in the env (Vercel, Upstash, Resend, GatewayAPI).
 */
export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privatlivspolitik"
      updated={PRIVACY_UPDATED}
      lead="Et budget indeholder løn, lån og kontonumre. Derfor gemmer vi kun det, der skal til for at budgetpro virker. Vi sælger ingen oplysninger, viser ingen reklamer og bruger ingen sporing."
    >
      <h2 id="ansvarlig">Hvem er ansvarlig</h2>
      <p>
        {companyLine}, er dataansvarlig for de oplysninger, du giver budgetpro. Har du
        spørgsmål, eller vil du bruge dine rettigheder, så skriv til {mail}.
      </p>

      <h2 id="data">Hvad vi gemmer, og hvorfor</h2>
      <div className={legal.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Oplysninger</th>
              <th>Hvorfor</th>
              <th>Grundlag</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Fornavn, efternavn, e-mail og mobilnummer, hvis du opgiver det</td>
              <td>Så du kan logge ind med en kode på mail og få de påmindelser på mail eller sms, du selv slår til</td>
              <td>Aftalen med dig (GDPR art. 6, stk. 1, b)</td>
            </tr>
            <tr>
              <td>Dit budget: poster, konti, lån, mål, scenarier, kladder, opgaver og historik</td>
              <td>Det er selve tjenesten. Budgettet gemmes, så det er der næste gang, også på en anden enhed</td>
              <td>Aftalen med dig</td>
            </tr>
            <tr>
              <td>Navn og e-mail på dem, du deler budgettet med</td>
              <td>Så de kan logge ind på det samme budget</td>
              <td>Aftalen med dig</td>
            </tr>
            <tr>
              <td>Hvornår der sidst er logget ind (højst én gang i timen)</td>
              <td>For at drive tjenesten og vide, hvor mange der bruger den</td>
              <td>Vores legitime interesse (art. 6, stk. 1, f)</td>
            </tr>
            <tr>
              <td>
                Besøg på hjemmesiden: hvilke sider der ses, hvilken side du kom fra, om det er mobil eller computer, og den
                omtrentlige by, som vores hostingleverandør udleder af IP-adressen
              </td>
              <td>
                For at vide, hvor mange der besøger siden, og hvor de finder os. Vi gemmer kun tal pr. dag, ingen IP-adresse og
                ingen cookie. Opretter du en bruger eller sender en forespørgsel, gemmer vi, hvor besøget kom fra (fx
                &quot;Google&quot;)
              </td>
              <td>Vores legitime interesse</td>
            </tr>
            <tr>
              <td>Antal filer sendt på mail pr. dag og modtagerens e-mail</td>
              <td>For at sende filen og forhindre misbrug af funktionen</td>
              <td>Aftalen med dig og vores legitime interesse</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Kontoudskrifter</h3>
      <p>
        Når du læser en kontoudskrift ind (CSV, Excel eller PDF), læses filen i din egen browser. Selve filen og dens
        posteringer sendes ikke til os. Vi gemmer kun de poster, du selv vælger at tage med i budgettet. Vi beder aldrig om
        adgang til din netbank.
      </p>

      <h3>Erhverv og aftaler</h3>
      <p>
        Sender du en prisforespørgsel fra Erhverv-siden, gemmer vi navn, firma, e-mail, telefon og det, du skriver, så vi kan
        svare dig. Kundeadministratorer hos virksomheder med en aftale gemmes med e-mail, så de kan logge ind og sende
        adgange. Den, der får en adgang, får koden på mail. Når du bruger koden, noterer vi, at din konto har adgang fra
        virksomheden, og hvornår adgangen slutter. Virksomheden kan se, at adgangen er taget i brug, men ikke dit budget.
        Vi er selv dataansvarlige for
        dit budget, også når du har fået adgang gennem en aftale.
      </p>

      <h3>budgetpro Skole</h3>
      <p>
        Lærere gemmes med navn, skole og e-mail. Elever logger ind med en kode uden navn, og vi gemmer elevens valg og svar,
        så læreren kan følge klassen. Eleverne bliver bedt om ikke at skrive navne. En klasse og alt om den slettes
        automatisk, når de 30, 60 eller 90 dage, læreren har valgt, er gået. For elevernes oplysninger behandler vi data på
        skolens vegne, og skolen kan få en databehandleraftale med os.
      </p>

      <h2 id="leverandoerer">Hvem vi deler oplysninger med</h2>
      <p>Vi deler ikke dine oplysninger med andre end de leverandører, der driver tjenesten for os:</p>
      <ul>
        <li>
          <strong>Vercel</strong> – hosting af hjemmesiden og appen
        </li>
        <li>
          <strong>Upstash</strong> – databasen, hvor budgetter og konti gemmes, på servere i EU
        </li>
        <li>
          <strong>Resend</strong> – afsendelse af mails med login-koder, invitationer, påmindelser og filer
        </li>
        <li>
          <strong>GatewayAPI</strong> – afsendelse af sms-påmindelser, hvis du slår dem til
        </li>
      </ul>
      <p>
        Vi har databehandleraftaler med dem. Hvis en leverandør behandler oplysninger uden for EU, sker det på grundlag af
        EU-Kommissionens standardkontraktbestemmelser eller EU-US Data Privacy Framework.
      </p>

      <h2 id="opbevaring">Hvor længe vi gemmer</h2>
      <ul>
        <li>Din bruger og dit budget gemmes, indtil du sletter din bruger.</li>
        <li>
          Vi gemmer tidligere versioner af budgettet, så det kan genskabes ved en fejl. Vi beholder de nyeste {MAX_BACKUPS}, og
          de slettes sammen med din bruger.
        </li>
        <li>Engangskoder og login-links holder i 20 minutter, en bekræftelse i 48 timer og en invitation i 7 dage.</li>
        <li>Skoleklasser slettes, når deres dage er gået. En lærerbruger slettes, når læreren beder os om det.</li>
        <li>
          Tal for besøg gemmes pr. dag og by uden oplysninger om, hvem der besøgte siden. Oversigten over, hvem der er på siden
          lige nu (by og side), slettes efter 10 minutter.
        </li>
        <li>Henvendelser fra Erhverv-siden gemmes, så længe vi har brug for dem for at svare og eventuelt lave en aftale.</li>
        <li>Betalinger og aftaler gemmes i 5 år, som bogføringsloven kræver.</li>
      </ul>

      <h2 id="rettigheder">Dine rettigheder</h2>
      <p>Du har ret til at</p>
      <ul>
        <li>få indsigt i de oplysninger, vi har om dig</li>
        <li>få rettet forkerte oplysninger</li>
        <li>
          få dine oplysninger slettet. Du kan selv slette din bruger og hele budgettet under{" "}
          <strong>Indstillinger &gt; Din bruger</strong> i appen
        </li>
        <li>
          få dine data udleveret. Du kan selv hente budgettet som PDF, Excel eller sikkerhedskopi under{" "}
          <strong>Import og eksport</strong>
        </li>
        <li>gøre indsigelse mod behandling, der bygger på vores legitime interesse, og få den begrænset</li>
      </ul>
      <p>
        Skriv til {mail}, så svarer vi inden for en måned. Er du utilfreds med, hvordan vi behandler dine oplysninger, kan du
        klage til{" "}
        <a href="https://www.datatilsynet.dk" rel="noopener">
          Datatilsynet
        </a>
        .
      </p>

      <h2 id="sikkerhed">Sikkerhed</h2>
      <p>
        Al trafik er krypteret. Der er ingen adgangskoder, der kan gættes eller lække: du logger ind med en kode på mail, og
        vi gemmer kun en uigenkendelig udgave (hash) af koder og links. Du kan kun se dit eget budget, og dem du deler med,
        mister adgangen, så snart de fjernes. Skulle der alligevel ske et brud på sikkerheden, der rammer dine oplysninger,
        anmelder vi det til Datatilsynet og giver dig besked, som loven kræver.
      </p>

      <h2 id="cookies">Cookies og lagring i browseren</h2>
      <p>
        budgetpro bruger kun cookies og lagring, der er nødvendige, for at siden virker. Vi bruger ingen cookies til
        statistik, reklame eller sporing, og derfor beder vi dig ikke om samtykke. Besøg tælles uden cookies og uden at gemme
        noget i din browser: en besøgende genkendes kun samme dag ud fra en uigenkendelig udgave af IP-adresse og browser, og
        den slettes efter to dage. Har din browser slået &quot;Global Privacy Control&quot; eller &quot;Do Not Track&quot; til, tæller
        vi dig ikke. Skrifttyperne hentes fra vores eget domæne,
        så din browser kontakter ikke andre for at vise siden.
      </p>
      <div className={legal.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>Formål</th>
              <th>Varighed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>budgetr_session</code>
              </td>
              <td>Cookie, der holder dig logget ind på dit budget</td>
              <td>{days(SESSION_MAX_AGE_S)}, eller til du logger ud</td>
            </tr>
            <tr>
              <td>
                <code>budgetr_skole</code>
              </td>
              <td>Cookie, der holder en lærer logget ind på budgetpro Skole</td>
              <td>{days(TEACHER_MAX_AGE_S)}, eller til læreren logger ud</td>
            </tr>
            <tr>
              <td>
                <code>budgetr_aftale</code>
              </td>
              <td>Cookie, der holder en kundeadministrator logget ind på aftalesiden</td>
              <td>{days(AGREEMENT_MAX_AGE_S)}, eller til vedkommende logger ud</td>
            </tr>
            <tr>
              <td>
                <code>budgetr:session</code>, <code>budgetr:session-name</code>
              </td>
              <td>Lokal lagring i browseren: hvem der er logget ind, og dit navn</td>
              <td>Til du logger ud</td>
            </tr>
            <tr>
              <td>
                <code>budgetr-app:…</code>
              </td>
              <td>
                Lokal lagring i browseren: en kopi af budgettet, så appen åbner hurtigt og ikke mister en ændring, hvis
                forbindelsen falder ud. Bruger du en computer, som andre også bruger, kan du fjerne kopien ved at rydde
                browserens data for budgetpro
              </td>
              <td>Til du sletter din bruger eller rydder browserens data</td>
            </tr>
            <tr>
              <td>
                <code>hb-theme</code>, <code>hb-view</code>, <code>hb-film</code> m.fl.
              </td>
              <td>Lokal lagring i browseren: dine valg af tema og visning i appen, og om du har set filmen om at komme i gang</td>
              <td>Til du rydder browserens data</td>
            </tr>
            <tr>
              <td>
                <code>bp:intro</code>
              </td>
              <td>Husker, at du har set logo-introen på forsiden</td>
              <td>Til du lukker fanen</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="aendringer">Ændringer</h2>
      <p>
        Ændrer vi noget væsentligt i, hvordan vi behandler dine oplysninger, opdaterer vi denne side og skriver det til dig på
        mail.
      </p>
    </LegalShell>
  );
}
