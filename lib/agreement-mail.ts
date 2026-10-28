/**
 * Mails around agreements (aftaler): the kundeadmin's login code, the note that someone was made kundeadmin, and the
 * seat itself – the only place a seat's code is ever shown. Plain text, sent through lib/auth-mail.ts's sendMail (which adds
 * the HTML version, lib/mail-html.ts).
 * No server imports, so it is easy to test.
 */
import type { OrgCategory } from "./owner";

const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;
const danishDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
};
const months = (n: number) => `${n} ${n === 1 ? "måned" : "måneder"}`;
const signOff = ["", "Venlig hilsen", "budgetpro"];

export function adminLoginMail(code: string, link: string) {
  const c = spaced(code);
  return {
    subject: `${c} er din kode til aftalen på budgetpro`,
    text: [
      "Hej",
      "",
      "Skriv koden herunder på siden, hvor du bad om at logge ind:",
      "",
      c,
      "",
      "Eller åbn linket for at logge ind på denne enhed:",
      "",
      link,
      "",
      "Koden og linket virker i 20 minutter og kan bruges én gang. Har du ikke bedt om det, kan du se bort fra denne mail.",
      ...signOff,
    ].join("\n"),
  };
}

/** To a new kundeadmin, from the owner or a colleague. No code: they log in with their e-mail when they need to. */
export function adminInviteMail(orgName: string, loginUrl: string, by?: string) {
  return {
    subject: `Du kan nu give adgang til budgetpro for ${orgName}`,
    text: [
      "Hej",
      "",
      `${by ? `${by} har` : "Vi har"} gjort dig til administrator af ${orgName}s aftale med budgetpro. Du giver adgang ved at skrive en e-mail – så sender vi personen en kode. Du kan også se, hvor mange pladser der er brugt.`,
      "",
      "Åbn linket og tryk Send kode. Så sender vi dig en kode til at logge ind med:",
      "",
      loginUrl,
      "",
      "Vi beder dig aldrig om en adgangskode. Kender du ikke til aftalen, kan du se bort fra denne mail.",
      ...signOff,
    ].join("\n"),
  };
}

/** The seat: a link and the code, sent to the e-mail a kundeadmin typed. `code` is formatted (ABCD-EFGH). */
export function grantMail(o: { orgName: string; category: OrgCategory; months: number; sendBy: string; code: string; link: string }) {
  const school = o.category === "skole";
  return {
    subject: school ? `${o.orgName} har givet dig adgang til budgetpro Skole` : `${o.orgName} har givet dig adgang til budgetpro`,
    text: [
      "Hej",
      "",
      school
        ? `${o.orgName} har givet dig en lærerplads på budgetpro Skole i ${months(o.months)}. Med den kan du oprette klasser, hvor eleverne laver et budget, og følge med i deres valg.`
        : `${o.orgName} har givet dig budgetpro i ${months(o.months)} uden betaling. budgetpro giver dig et roligt overblik over din økonomi – du bestemmer selv over dine tal.`,
      "",
      "Åbn linket for at komme i gang:",
      "",
      o.link,
      "",
      `Eller skriv koden, når du ${school ? "logger ind på budgetpro Skole" : "opretter dig på budgetpro"}:`,
      "",
      o.code,
      "",
      `De ${months(o.months)} tæller fra den dag, du bruger koden. Koden kan bruges én gang og senest den ${danishDate(o.sendBy)}.`,
      school ? "" : `${o.orgName} kan ikke se dit budget. Vi beder dig aldrig om en adgangskode eller om login til din bank.`,
      ...signOff,
    ]
      .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
      .join("\n"),
  };
}

/**
 * To a bank or estate-agent customer a week before the seat ends. `lastDay` is the last day with the seat (YYYY-MM-DD),
 * `monthly` the private price a month incl. moms (PRICES in lib/owner.ts), `appUrl` where the budget is.
 */
export function seatEndingMail(o: { firstName: string; orgName: string; lastDay: string; monthly: number; appUrl: string }) {
  return {
    subject: `Din adgang til budgetpro fra ${o.orgName} slutter den ${danishDate(o.lastDay)}`,
    text: [
      `Hej ${o.firstName}`,
      "",
      `Den adgang til budgetpro, du har fået fra ${o.orgName}, gælder til og med den ${danishDate(o.lastDay)}.`,
      "",
      `Dit budget bliver liggende, som det er. Vil du fortsætte bagefter, koster budgetpro ${o.monthly} kr om måneden inkl. moms. Vil du ikke det, kan du hente en sikkerhedskopi af budgettet under Indstillinger > Din bruger.`,
      "",
      "Dit budget:",
      "",
      o.appUrl,
      "",
      `${o.orgName} kan ikke se dit budget og får ikke besked om, hvad du vælger.`,
      ...signOff,
    ].join("\n"),
  };
}

/** To a school's kundeadmins when a teacher asks for a seat. The link opens /aftale with the teacher's e-mail filled in. */
export function seatRequestMail(o: { teacherName: string; teacherEmail: string; orgName: string; link: string }) {
  return {
    subject: `${o.teacherName} beder om en lærerplads på budgetpro Skole`,
    text: [
      "Hej",
      "",
      `${o.teacherName} (${o.teacherEmail}) har oprettet sig på budgetpro Skole og beder om en plads fra ${o.orgName}s aftale, så de kan oprette klasser.`,
      "",
      "Åbn linket for at give adgang. E-mailen står allerede udfyldt:",
      "",
      o.link,
      "",
      "Kender du ikke læreren, kan du se bort fra denne mail. Der sker ikke noget, før du selv giver adgang.",
      ...signOff,
    ].join("\n"),
  };
}
