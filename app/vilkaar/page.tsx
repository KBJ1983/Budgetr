import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import { COMPANY, TERMS_UPDATED } from "@/lib/company";
import { MAX_LOGINS } from "@/lib/accounts";
import { PRICES, TRIAL_DAYS } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Vilkår – budgetpro",
  description: "Vilkårene for at bruge budgetpro: prøveperiode, abonnement, fortrydelsesret, opsigelse, dine data og ansvar.",
};

const mail = <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;

/**
 * Terms of use (also at /skole/vilkaar). A draft until a lawyer has read it – see the note in the plan. Prices and the
 * trial come from lib/owner.ts (PRICES, TRIAL_DAYS, in step with components/landing/PricePlans.tsx), logins from
 * lib/accounts.ts. Payment is not live yet: when a payment provider is added, check "Betaling" and "Opsigelse" again.
 */
export default function TermsPage() {
  return (
    <LegalShell
      title="Vilkår"
      updated={TERMS_UPDATED}
      lead="Her står, hvad du kan forvente af budgetpro, og hvad vi forventer af dig. Vi har skrevet det så kort og klart, som vi kan."
    >
      <h2 id="parter">Hvem aftalen er med</h2>
      <p>
        Aftalen er mellem dig og {COMPANY.name}, CVR {COMPANY.cvr}, {COMPANY.address}. Du kan altid skrive til os på {mail}.
      </p>

      <h2 id="tjenesten">Hvad budgetpro er</h2>
      <p>
        budgetpro er et værktøj til at lægge og følge et budget. Tallene i budgettet er dem, du selv skriver eller læser ind,
        og beregningerne er vejledende. budgetpro giver ikke økonomisk, juridisk eller skattemæssig rådgivning. Står du over
        for en større beslutning, så tal med din bank eller en rådgiver.
      </p>

      <h2 id="bruger">Din bruger</h2>
      <ul>
        <li>Du skal være fyldt 18 år for at oprette en bruger. Elever i budgetpro Skole bruger en kode fra deres lærer.</li>
        <li>Du logger ind med en kode, vi sender til din e-mail. Pas på din e-mail, for den er nøglen til dit budget.</li>
        <li>
          Du kan dele et budget med op til {MAX_LOGINS - 1} andre, så I er {MAX_LOGINS} i alt. Du står selv for, hvem du
          giver adgang, og du kan altid fjerne dem igen.
        </li>
        <li>Du må ikke bruge budgetpro til noget ulovligt eller prøve at få adgang til andres budgetter.</li>
      </ul>

      <h2 id="pris">Prøveperiode og pris</h2>
      <p>
        De første {TRIAL_DAYS} dage er gratis og uden binding. Derefter koster budgetpro {PRICES.monthly.base} kr om måneden
        eller {PRICES.yearly.base} kr om året. En ekstra bruger på samme budget koster {PRICES.monthly.extra} kr om måneden
        eller {PRICES.yearly.extra} kr om året. Alle priser er i danske kroner, og vi viser altid den samlede pris, før du
        betaler. Prøveperioden går ikke automatisk over i et betalt abonnement: du vælger selv, om du vil fortsætte.
      </p>

      <h2 id="fortrydelse">Fortrydelsesret</h2>
      <p>
        Når du køber et abonnement, har du 14 dages fortrydelsesret fra den dag, du køber. Fortryder du, så skriv til {mail}{" "}
        inden fristen, så får du pengene tilbage. Har du bedt os om at åbne for abonnementet med det samme og bekræftet, at
        fortrydelsesretten så bortfalder, gælder den ikke for den del, du allerede har brugt.
      </p>

      <h2 id="opsigelse">Opsigelse</h2>
      <p>
        Et månedsabonnement kan opsiges til udgangen af den måned, du har betalt for. Et årsabonnement kører året ud. Du
        beholder adgangen, til perioden er slut. Du kan også slette din bruger når som helst under{" "}
        <strong>Indstillinger &gt; Din bruger</strong> i appen. Allerede betalte perioder bliver ikke refunderet, medmindre du
        bruger fortrydelsesretten.
      </p>

      <h2 id="aftaler">Adgang gennem en virksomhed eller skole</h2>
      <p>
        Har du fået en kode fra din bank, din ejendomsmægler eller en anden virksomhed med en aftale, gælder adgangen i det
        antal måneder, der står i mailen, regnet fra den dag, du tager koden i brug. Virksomheden betaler, og den kan ikke se
        dit budget. Når perioden er slut, kan du selv vælge at fortsætte med et abonnement. For lærere og skoler gælder de
        samme regler, og elevernes besvarelser slettes automatisk, når klassens tid er gået.
      </p>

      <h2 id="data">Dine data</h2>
      <p>
        Dit budget er dit. Du kan altid hente det som PDF, Excel eller sikkerhedskopi og slette det hele. Læs mere om, hvad vi
        gemmer, i vores <Link href="/privatliv">privatlivspolitik</Link>.
      </p>

      <h2 id="drift">Drift og ændringer</h2>
      <p>
        Vi gør vores bedste for, at budgetpro altid virker, og vi tager sikkerhedskopier af dit budget. Der kan dog være
        korte afbrydelser, fx når vi opdaterer. Vi udvikler budgetpro løbende. Ændrer vi vilkårene eller prisen til din
        ulempe, skriver vi til dig mindst 30 dage før, og du kan opsige inden.
      </p>

      <h2 id="ansvar">Ansvar</h2>
      <p>
        Vi er ansvarlige efter dansk rets almindelige regler. Vi er ikke ansvarlige for beslutninger, du træffer ud fra
        budgettet, eller for tab, der skyldes, at du har skrevet forkerte tal. Det begrænser ikke de rettigheder, du har som
        forbruger efter loven.
      </p>

      <h2 id="klage">Klager og lovvalg</h2>
      <p>
        Er du utilfreds, så skriv til {mail}, så finder vi en løsning sammen. Lykkes det ikke, kan du som forbruger klage til{" "}
        <a href="https://www.forbrug.dk" rel="noopener">
          Center for Klageløsning
        </a>{" "}
        i Nævnenes Hus. Aftalen følger dansk ret.
      </p>
    </LegalShell>
  );
}
