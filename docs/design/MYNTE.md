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
| Fejl / koral | `#A8473C` | `#E59A8E` | errors; on the website also the second accent (see below) |
| Mynte-tint | `#DDF0E8` | – | website: hero card and the "Alle funktioner" band |
| App-flade | `#ECF1EF` | page `#0A0D0E`, card `#1A2023`, line `#343D40`, muted `#A3AEAC` | the app's page (light) and dark theme |

## "Komplet" (Nov 2026)

The design "budgetpro – Mynte og is komplet" (Claude Design, unpacked from the user's HTML) updates the website and the
app on the same palette:

- Website: white page with is (`#F0F3F2`) sections; header and hero share one rounded mynte-tint card with calm big
  shapes (a white circle, a mynte card, an outlined card). Big titles are 700 with a second line in 200 ("Ét roligt
  overblik.", "Ro i livet."), the key word with a mynte band under it. Koral `#A8473C` is the second accent: the
  "29 min · 29 kr" badge, the closing call to action band (white text, `#F6E3DF` for secondary text), a koral card shape
  in the Tryghed and Alle funktioner bands, the Erhverv pill. Tryghed sits on slate `#1E2326` with cards `#272D30`.
  "Alle funktioner" is a mosaic of mynte, dyb mynte, blæk, koral and white cards. The product is shown as small drawn
  cards with the demo family's numbers (hero, Rådighed, Hvem betaler hvad); real screenshots stay in the feature tour.
- App: the pages are underline tabs (the open page in blæk with a 2 px koral line), the first key figure tile is dyb
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
desktop (the open page in blæk with a koral line) and a bottom bar on phones.

## Skole: "Is og solgul"

budgetpro Skole keeps its own accent: solgul `#F6CF4A` takes mynte's place (`#7A5300` for accent text on light, warm
page `#F5F5F0`, borders `#E2DFD8`), on the same blæk and the same type.
