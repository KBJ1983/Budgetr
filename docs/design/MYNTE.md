# budgetpro – "Mynte og is" (Nov 2026)

The visual expression for the website, the app, mails, guides and films. Replaces "Midnat og lime" (`MIDNAT.md`,
kept for history). Source: the design "budgetpro – Mynte og is udtryk" (status 6C), made in Claude Design.

Website and tool in one expression. Text is Hanken Grotesk, numbers and amounts Geist Mono. Mynte is used for the
positive: key figures, goals, incomes, bars. Warnings are neutral with a black outline; only errors that need action
get a colour.

## Colours

| Name | Light | Dark | Use |
| --- | --- | --- | --- |
| Blæk | `#101415` | page `#101415` | text, primary buttons (pill), dark bands |
| Mynte | `#A9DCCB` | `#A9DCCB` | bars, progress, logo front card, primary button on dark, accent text on dark |
| Dyb mynte | `#2E6E5B` | – | accent text and links on light, positive amounts |
| Is | `#F0F3F2` | – | page background |
| Hvid | `#FFFFFF` | card `#181D1E` | cards |
| Kant | `#DCE3E1` | `#283031` | borders and lines |
| Dæmpet tekst | `#56615F` | `#99A5A3` | secondary text |
| Tekst på mørk | – | `#ECF1F0` | text, logo, selected tab |
| Neutral data | `#C9D2D0` | `#3A4446` | expense bars, dots |
| Spor | `#E4EAE8` | `#283031` | progress tracks |
| Blød flade | `#EEF2F1` | `#20272A` | warnings, chips, status pills |
| Fejl | `#A8473C` | `#E59A8E` | errors only – in the app and on the website, so errors are never mistaken for an accent |
| Smørgul (komplementær) | `#F4DE96` (flade, mærker, markering), tekst `#101415`, dæmpet tekst og ikoner `#4D4320`, kant `rgba(16,20,21,.25)` | `#F4DE96` | the complementary accent on the website, in the app and the films; used with mynte `#A9DCCB` and dyb mynte `#2E6E5B` |
| Mynte-tint | `#DDF0E8` | – | website: the Funktioner band |
| Varm papirhvid | `#F2F0EA` | – | website: the hero card (header + hero); replaced the cool grey `#EEF1F0` (user's wish) |
| App-flade | `#ECF1EF` | page `#0A0D0E`, card `#1A2023`, line `#343D40`, muted `#A3AEAC` | the app's page (light) and dark theme |

## "Komplet" (Nov 2026)

The design "budgetpro – Mynte og is komplet" (Claude Design, unpacked from the user's HTML) updates the website and the
app on the same palette:

- Website: white page with is (`#F0F3F2`) sections; header and hero share one rounded warm paper-white card with calm big
  shapes (a white circle, a mynte card, an outlined card). Big titles are 700 with a second line in 200 ("Ét roligt
  overblik.", "Ro i livet."), the key word with a mynte band under it. Smørgul `#F4DE96` is the complementary accent
  (user's spec, Nov 2026, after koral, umbra and dyb mynte), as a surface with dark text `#101415` (muted `#4D4320`,
  edges `rgba(16,20,21,.25)`): the "29 min · 29 kr" badge, a small circle on the closing Excel band (the band itself is warm paper), the
  quote marks and initials on the blæk quotes band "Det siger dem, der bruger det" (not the band itself – user's wish), the Overførsler card, the Erhverv pill and the
  icon at "Login med engangskode"; on dark it is used as it is (the "Tryghed" overline and the card shape in that band).
  In the films the outlined drifting card on the dark cards is a smørgul card and the circle between scenes is a light
  smørgul (`--comp` in `video/film.css`; Skole keeps its own look). Tryghed sits on slate `#1E2326` with cards `#272D30`.
  Funktioner is one band on the tint: the feature tour (photos), a mosaic of mynte, dyb mynte, blæk and white
  cards, and the full list behind a plus at the bottom. The product is shown as small drawn
  cards with the demo family's numbers (hero, Rådighed, Hvem betaler hvad); real screenshots stay in the feature tour.
- App: the pages are underline tabs (the open page in blæk with a 2 px smørgul line, `--comp`; red only for errors), the first key figure tile is dyb
  mynte and the next one mynte, section heads sit on a thin line instead of a grey band.
- Checkmarks (the check list on the website, the "Tjek" badge on posts) keep their earlier look (user's wish).

Warnings: blød flade + 1 px blæk outline (light) / `#ECF1F0` outline (dark), title in blæk, no yellow.
Errors: white/dark card with a fejl outline and a fejl title.

## Type

- Hanken Grotesk for all text. Headlines 600 with tight tracking (h1 −0.045em, h2 −0.03em); body 400.
- Geist Mono for amounts and key figures (500, −0.03em) and for overlines (400, 12–13 px, +0.08em, uppercase, dyb mynte).
- Logo: "budget" Hanken Grotesk 700 (−0.045em) + "pro" Hanken Grotesk 200 (−0.035em), same colour.

## Logo

A pocket with two upright cards (viewBox `0.5 1.5 63 60`): back card `9,3 34×22 r5`, front card `21,8 34×22 r5`,
pocket `2,19 60×41 r13`, slot `40,35 15×8 r4`. Front card mynte; back card and pocket blæk on light, `#ECF1F0` on
dark; outlines (3) and slot in the background colour. Code: `components/Logo.tsx`; favicon `public/icon.svg`.

## Shapes

Cards 16–18 px radius, tiles 12 px, buttons and status pills fully round. The app's pages are underline tabs on
desktop (the open page in blæk with a smørgul line) and a bottom bar on phones.

## Skole: "Is og solgul"

budgetpro Skole keeps its own accent: solgul `#F6CF4A` takes mynte's place (`#7A5300` for accent text on light, warm
page `#F5F5F0`, borders `#E2DFD8`), on the same blæk and the same type.
