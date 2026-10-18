/**
 * Turns a plain-text mail (subject + text) into a simple branded HTML mail ("Midnat og lime", docs/design/MIDNAT.md;
 * with theme "skole" budgetpro Skole's "Midnat og solgul", docs/design/skole-21b.html).
 * The text part is sent unchanged next to it; this only reads it:
 * - blocks separated by blank lines become paragraphs (single line breaks stay),
 * - a line that is only a link to our own site becomes a midnight button (the first one) or an olive link (the rest),
 *   always with the raw address under it so it can be copied; links to other sites are never made clickable,
 * - a line that is only a code ("123 456" or "ABCD-EFGH") becomes a big code box,
 * - lines starting with "- " become a list, an UPPERCASE first line a small heading, and a block of "Label: value"
 *   lines a two-column table.
 * Table layout and inline styles only, so it holds up in old mail clients. No imports: scripts/send-reminders.mjs
 * imports this file directly.
 */

export interface MailHtmlOptions {
  /** The site's address (APP_URL or the request origin): the logo is loaded from it and only its links become buttons. */
  siteUrl?: string;
  /** The button's text (default "Åbn linket", or "Åbn budgetpro" for links into the app). */
  button?: string;
  /** "skole": budgetpro Skole's logo, solgul code box and footer. */
  theme?: "skole";
}

const C = {
  paper: "#F3F5F7",
  card: "#FFFFFF",
  rule: "#DFE4EA",
  ink: "#0E1B2C",
  text: "#3E4A5A",
  muted: "#5A6472",
  olive: "#3F6A0E",
  limeTone: "#EEF6D2",
};
const FONT = "Geist, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
/** Per theme: footer, logo PNG in public/mail/ (made at double size, shown at half), code box and accent text on white. */
const THEMES = {
  budgetpro: { footer: "budgetpro · Dit overblik. Dine drømme.", name: "budgetpro", logo: { path: "/mail/logo.png", width: 150, height: 33 }, codeBg: C.limeTone, accent: C.olive },
  skole: { footer: "budgetpro Skole · Et tema om privatøkonomi til udskolingen", name: "budgetpro Skole", logo: { path: "/mail/logo-skole.png", width: 188, height: 33 }, codeBg: "#FCF1C8", accent: "#7A5300" },
};

export const MAIL_LOGO = THEMES.budgetpro.logo;
export const MAIL_LOGO_SKOLE = THEMES.skole.logo;

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const URL_LINE = /^https?:\/\/\S+$/;
const URL_IN_TEXT = /https?:\/\/[^\s<>"']+/g;
const CODE_LINE = /^(?:\d{3} \d{3}|[A-Z0-9]{4}-[A-Z0-9]{4})$/;
const HEADING = /^(?=.*[A-ZÆØÅ]{2})[A-ZÆØÅ0-9 &.,/-]{3,40}$/;
const KEY_VALUE = /^([^:]{1,40}):[ \t]+(\S.*)$/;
const LIST_ITEM = /^- (.+)$/;

const originOf = (u: string | undefined) => {
  if (!u) return null;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
};

/** The HTML version of a mail. */
export function mailHtml(mail: { subject: string; text: string }, opts: MailHtmlOptions = {}): string {
  const site = originOf(opts.siteUrl);
  const own = (u: string) => site !== null && originOf(u) === site;
  const th = THEMES[opts.theme ?? "budgetpro"];
  let buttonUsed = false;

  // Text with our own links made clickable (trailing punctuation stays text), everything escaped.
  const inline = (s: string) => {
    let out = "";
    let at = 0;
    for (const m of s.matchAll(URL_IN_TEXT)) {
      const url = m[0].replace(/[.,;:!?)]+$/, "");
      const i = m.index ?? 0;
      out += escapeHtml(s.slice(at, i));
      out += own(url) ? link(url) : escapeHtml(url);
      at = i + url.length;
    }
    return out + escapeHtml(s.slice(at));
  };
  const link = (url: string) =>
    `<a href="${escapeHtml(url)}" style="color:${th.accent};text-decoration:underline;word-break:break-all;">${escapeHtml(url)}</a>`;

  const p = (html: string, style = "") =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text};${style}">${html}</p>`;

  const button = (url: string) => {
    const label = opts.button ?? (new URL(url).pathname.startsWith("/app") ? "Åbn budgetpro" : "Åbn linket");
    return (
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px;"><tr>` +
      `<td align="center" bgcolor="${C.ink}" style="background:${C.ink};border-radius:999px;">` +
      `<a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1.2;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>` +
      `</td></tr></table>` +
      p(`Virker knappen ikke, kan du kopiere linket:<br>${link(url)}`, `font-size:13px;line-height:1.5;color:${C.muted};`)
    );
  };

  const codeBox = (code: string) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>` +
    `<td bgcolor="${th.codeBg}" style="background:${th.codeBg};border-radius:14px;padding:14px 26px;font-family:${MONO};font-size:30px;font-weight:700;letter-spacing:0.14em;line-height:1.2;color:${C.ink};white-space:nowrap;">${escapeHtml(code)}</td>` +
    `</tr></table>`;

  const heading = (s: string) =>
    `<p style="margin:8px 0 8px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${th.accent};">${escapeHtml(s)}</p>`;

  const table = (rows: string[][]) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:collapse;">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td valign="top" style="padding:5px 12px 5px 0;border-top:1px solid ${C.rule};font-family:${FONT};font-size:14px;line-height:1.45;color:${C.muted};width:38%;">${escapeHtml(k ?? "")}</td>` +
          `<td valign="top" style="padding:5px 0;border-top:1px solid ${C.rule};font-family:${FONT};font-size:14px;line-height:1.45;color:${C.ink};">${inline(v ?? "")}</td></tr>`,
      )
      .join("") +
    `</table>`;

  const list = (items: string[]) =>
    `<ul style="margin:0 0 16px;padding:0 0 0 22px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text};">` +
    items.map((i) => `<li style="margin:0 0 4px;">${inline(i)}</li>`).join("") +
    `</ul>`;

  // Mixed lines: runs of "- " lines become lists, the rest a paragraph with line breaks.
  const lines = (ls: string[]) => {
    let out = "";
    let para: string[] = [];
    let items: string[] = [];
    const flush = () => {
      if (para.length) out += p(para.map(inline).join("<br>"));
      if (items.length) out += list(items);
      para = [];
      items = [];
    };
    for (const l of ls) {
      const li = LIST_ITEM.exec(l);
      if (li) {
        if (para.length) flush();
        items.push(li[1] ?? "");
      } else {
        if (items.length) flush();
        para.push(l);
      }
    }
    flush();
    return out;
  };

  const block = (raw: string) => {
    const ls = raw.split("\n").map((l) => l.replace(/\s+$/, ""));
    if (ls.length === 1) {
      const l = (ls[0] ?? "").trim();
      if (URL_LINE.test(l) && own(l)) {
        if (!buttonUsed) {
          buttonUsed = true;
          return button(l);
        }
        return p(link(l), "font-size:14px;");
      }
      if (CODE_LINE.test(l)) return codeBox(l);
    }
    let out = "";
    let rest = ls;
    if (ls.length > 1 && HEADING.test((ls[0] ?? "").trim())) {
      out += heading((ls[0] ?? "").trim());
      rest = ls.slice(1);
    }
    const kv = rest.map((l) => (LIST_ITEM.test(l) ? null : KEY_VALUE.exec(l)));
    if (rest.length >= 2 && kv.every(Boolean)) return out + table(kv.map((m) => [m![1]!.trim(), m![2]!.trim()]));
    return out + lines(rest);
  };

  const body = mail.text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((b) => b.replace(/^\n+|\n+$/g, ""))
    .filter((b) => b.trim())
    .map(block)
    .join("");

  const logo = site
    ? `<img src="${escapeHtml(site + th.logo.path)}" width="${th.logo.width}" height="${th.logo.height}" alt="${th.name}" style="display:block;border:0;outline:none;text-decoration:none;height:${th.logo.height}px;width:${th.logo.width}px;color:${C.ink};font-family:${FONT};font-size:22px;font-weight:700;">`
    : `<span style="font-family:${FONT};font-size:22px;line-height:1;color:${C.ink};letter-spacing:-0.04em;"><b style="font-weight:700;">budget</b><span style="font-weight:300;">pro</span>${opts.theme === "skole" ? ` <span style="font-size:13px;font-weight:700;letter-spacing:0;background:#F6CF4A;border-radius:999px;padding:3px 7px;vertical-align:middle;">Skole</span>` : ""}</span>`;

  return (
    `<!doctype html><html lang="da"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">` +
    `<title>${escapeHtml(mail.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper};"><tr>` +
    `<td align="center" style="padding:28px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">` +
    `<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.rule};border-radius:20px;padding:28px 28px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 24px;">${logo}</td></tr></table>` +
    body +
    `</td></tr>` +
    `<tr><td align="center" style="padding:18px 12px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted};">${escapeHtml(th.footer)}</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}
