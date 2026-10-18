import { describe, expect, it } from "vitest";
import { inviteMail, authMail } from "./auth-mail";
import { mailHtml, escapeHtml } from "./mail-html";

const SITE = "https://budgetpro.dk";

describe("mailHtml", () => {
  it("escapes the text and the subject", () => {
    const h = mailHtml({ subject: "A <b> & \"c\"", text: "Hej <script>alert('x')</script> & co" }, { siteUrl: SITE });
    expect(h).toContain("<title>A &lt;b&gt; &amp; &quot;c&quot;</title>");
    expect(h).toContain("Hej &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; co");
    expect(h).not.toContain("<script>");
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });

  it("shows a 6-digit code and a seat code in a code box", () => {
    const h = mailHtml({ subject: "s", text: "Skriv koden:\n\n123 456\n\nEller:\n\nABCD-EFGH" }, { siteUrl: SITE });
    expect(h).toMatch(/background:#EEF6D2[^>]*>123 456<\/td>/);
    expect(h).toMatch(/background:#EEF6D2[^>]*>ABCD-EFGH<\/td>/);
  });

  it("makes the first own link a button, later ones plain links, and always shows the raw address", () => {
    const a = `${SITE}/login/bekraeft?t=a&ny=1`;
    const b = `${SITE}/login`;
    const h = mailHtml({ subject: "s", text: `Åbn linket:\n\n${a}\n\nEller her:\n\n${b}` }, { siteUrl: SITE });
    expect(h.match(/>Åbn linket<\/a>/g)).toHaveLength(1);
    expect(h).toContain(`href="${SITE}/login/bekraeft?t=a&amp;ny=1"`);
    expect(h).toContain(`>${SITE}/login/bekraeft?t=a&amp;ny=1</a>`);
    expect(h).toContain(`href="${b}"`);
    expect(h).toContain(`<img src="${SITE}/mail/logo.png"`);
    expect(h).toContain('alt="budgetpro"');
  });

  it("never makes links to other sites clickable", () => {
    const h = mailHtml({ subject: "s", text: "Se her:\n\nhttps://example.com/x\n\nog https://example.com/y." }, { siteUrl: SITE });
    expect(h).not.toContain('href="https://example.com');
    expect(h).toContain("https://example.com/x");
    expect(h).not.toContain("Åbn linket");
  });

  it("links own addresses inside a sentence without the full stop", () => {
    const h = mailHtml({ subject: "s", text: `Log ind på ${SITE}/login med denne e-mail. Se ${SITE}/admin#h.` }, { siteUrl: SITE });
    expect(h).toContain(`href="${SITE}/login"`);
    expect(h).toContain(`href="${SITE}/admin#h"`);
  });

  it("turns '- ' lines into a list and 'Label: value' blocks under a heading into a table", () => {
    const h = mailHtml({ subject: "s", text: "Du har 2 opgaver:\n- Tjek el\n- Ring til banken\n\nKONTAKT\nNavn:   Anna Test\nE-mail: anna@example.com" });
    expect(h).toContain("<li");
    expect(h).toContain(">Ring til banken</li>");
    expect(h).toMatch(/text-transform:uppercase[^>]*>KONTAKT</);
    expect(h).toMatch(/>Navn<\/td>.*>Anna Test<\/td>/);
  });

  it("falls back to a text wordmark without a site address", () => {
    const h = mailHtml({ subject: "s", text: "Hej" });
    expect(h).not.toContain("<img");
    expect(h).toContain(">budget</b>");
  });

  it("works on the real mails and leaves their text as it is", () => {
    const m = authMail("login", "Anna", `${SITE}/login/bekraeft?t=x`, "123456");
    const before = m.text;
    const h = mailHtml(m, { siteUrl: SITE });
    expect(m.text).toBe(before);
    expect(h).toContain(">123 456</td>");
    expect(h).toContain(">Åbn linket</a>");
    expect(h).toContain("Venlig hilsen<br>budgetpro");
    const inv = mailHtml(inviteMail("Anna", "Bo Test", `${SITE}/login/bekraeft?t=y&inv=1`, `${SITE}/login`), { siteUrl: SITE });
    expect(inv.match(/>Åbn linket<\/a>/g)).toHaveLength(1);
    expect(inv).toContain(`href="${SITE}/login"`);
  });

  it("gives budgetpro Skole's mails their own logo, solgul code box and footer", () => {
    const h = mailHtml({ subject: "s", text: "Skriv koden:\n\n123 456" }, { siteUrl: SITE, theme: "skole" });
    expect(h).toContain(`<img src="${SITE}/mail/logo-skole.png"`);
    expect(h).toContain('alt="budgetpro Skole"');
    expect(h).toMatch(/background:#FCF1C8[^>]*>123 456<\/td>/);
    expect(h).toContain("budgetpro Skole · ");
    expect(h).not.toContain("#EEF6D2");
    expect(mailHtml({ subject: "s", text: "x" }, { theme: "skole" })).toContain(">Skole</span>");
  });
});
