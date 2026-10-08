/**
 * budgetpro Skole's mails to the teacher: the class link when a class is made, and new links when the teacher has
 * lost them. Plain text, sent through Resend by lib/auth-mail.ts's sendMail. No server imports, so it is easy to test.
 */
import { dayMonthYear } from "./skole";

export interface MailedClass {
  trin: number;
  link: string;
  expires: Date;
}

const sign = ["Venlig hilsen", "budgetpro Skole"];

/** Sent when a class is made: the overview link, the expiry date and the pupil codes. */
export function classMail(c: MailedClass & { codes: string[]; pupilAddress: string; lostUrl: string }) {
  return {
    subject: `Din ${c.trin}. klasse på budgetpro Skole`,
    text: [
      "Hej",
      "",
      `Her er linket til klasseoverblikket for din ${c.trin}. klasse. Gem mailen – linket er vejen tilbage til klassen, og der kan du se elevernes valg og svar:`,
      "",
      c.link,
      "",
      `Elevkoderne udløber den ${dayMonthYear(c.expires)}. Så slettes klassen, koderne og elevernes svar.`,
      "",
      `Eleverne går ind på ${c.pupilAddress} og skriver deres kode:`,
      "",
      ...c.codes.map((code, i) => `${i + 1}. ${code}`),
      "",
      `Har du mistet mailen, kan du få et nyt link på ${c.lostUrl}.`,
      "",
      ...sign,
    ].join("\n"),
  };
}

/** Sent on "Har du mistet linket?": a new link to each of the teacher's classes. */
export function linksMail(classes: MailedClass[]) {
  return {
    subject: classes.length === 1 ? "Nyt link til din klasse på budgetpro Skole" : "Nye links til dine klasser på budgetpro Skole",
    text: [
      "Hej",
      "",
      classes.length === 1 ? "Her er et nyt link til din klasse:" : "Her er nye links til dine klasser:",
      "",
      ...classes.flatMap((c) => [`${c.trin}. klasse – elevkoderne udløber den ${dayMonthYear(c.expires)}:`, c.link, ""]),
      "De links, du har fået før, virker ikke længere. Har du ikke bedt om nye links, kan du se bort fra denne mail.",
      "",
      ...sign,
    ].join("\n"),
  };
}
