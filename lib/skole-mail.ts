/**
 * budgetpro Skole's mail to teachers: the login (or sign-up) mail with a 6-digit code and a link. Plain text, sent
 * through Resend by lib/auth-mail.ts's sendMail. No server imports, so it is easy to test.
 */

/** "123456" → "123 456", easier to read and type. */
const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

export function teacherMail(purpose: "signup" | "login", name: string, code: string, link: string) {
  const c = spaced(code);
  const first = name.split(/\s+/)[0] || name;
  return {
    subject: purpose === "signup" ? `${c} er din kode til budgetpro Skole` : `${c} er din kode til at logge ind på budgetpro Skole`,
    text: [
      `Hej ${first}`,
      "",
      purpose === "signup"
        ? "Tak fordi du har oprettet en bruger på budgetpro Skole. Skriv koden herunder på siden, hvor du oprettede brugeren:"
        : "Skriv koden herunder på siden, hvor du bad om at logge ind:",
      "",
      c,
      "",
      "Eller åbn linket for at logge ind på denne enhed:",
      "",
      link,
      "",
      "Koden og linket virker i 20 minutter og kan bruges én gang. Har du ikke bedt om det, kan du se bort fra denne mail.",
      "",
      "Venlig hilsen",
      "budgetpro Skole",
    ].join("\n"),
  };
}
