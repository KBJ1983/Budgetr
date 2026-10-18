# budgetpro "Midnat og lime" (Oct 2026)

Source: `midnat-designmanual.html` (mini designmanual v1) and `midnat-forside.html` (front page with the light hero;
its `{{ }}` values and copy are only a sketch – the live page keeps its own copy). Replaces the "Skov" design everywhere
except budgetpro Skole, which keeps Skov until it is redesigned.

## Logo

- Symbol: a pocket with two cards sticking up. Front card always lime; back card + pocket in the name's colour
  (midnight on light, white on dark). On lime backgrounds the front card is white. Outlines and the slot in the pocket
  take the background colour. SVG (viewBox `0 -2 64 64`) in `components/Logo.tsx` (`Logo`, `LogoMark`, `AppIcon`).
- Name: "budget" Hanken Grotesk 700 (letter-spacing -.045em) + "pro" Hanken Grotesk 200 (-.035em), same colour.
  Never give "pro" another colour. Hanken Grotesk is only for the logo.
- Symbol height = 1.05 × font size, gap = 0.24 × font size. Smallest: 14 px text, below that the symbol alone.
- App icon / favicon: the symbol in white and lime on a midnight rounded square (`public/icon.svg`).

## Colours (60 % light, 30 % midnight, 10 % lime)

| Token | Hex | Use |
|---|---|---|
| Midnat | `#0E1B2C` | text, dark surfaces, logo, primary button on light |
| Midnat 2 | `#1A2B42` | cards on dark |
| Midnat card | `#15243A` | small cards / rows on dark (front page mock-ups), border `#1F3350` |
| Lime | `#D4F26B` | primary button on dark, badges, the thing to notice; text only on dark |
| Lime mørk | `#9BC43A` | bars and charts on light |
| Oliven | `#3F6A0E` | accent text and links on light (hover `#2F500A`) |
| Lys grå | `#F3F5F7` | page background |
| Lime-tone | `#EEF6D2` | icon backgrounds, light highlight fields |
| Dis | `#B6C0CC` | muted text on dark |
| Text 2 / 3 | `#3E4A5A` / `#5A6472` | body and secondary text on light |
| Rule | `#DFE4EA` | borders on light (stronger: `#C9D2DC`, field border `#9AA6B5`) |
| Grå-dis | `#E7EBEF` / `#EDF0F3` | stone bands, tracks |
| Decor circle | `#16294A` | big circles on dark bands |
| Error | `#A8382A` (light) / `#F08A78` (dark) | |

## Type and parts

- Geist for everything else (700 headings, letter-spacing -.035 to -.04em; 600 subheads; 400 body), Geist Mono for amounts in KPIs.
- Small overline: 600 12–13px, letter-spacing .1em, uppercase, olive on light / lime on dark.
- Buttons are pill-shaped (radius 999px). Light background: midnight button with white text. Dark background: lime button
  with midnight text. Secondary: 1.5px midnight outline.
- Badges: lime with midnight text ("Spar 15 %"), lime-tone with olive text ("Fælles"), light grey with border ("kvartal").
- Check marks: 18–22px circle, lime (on dark/hero) or lime-tone with olive tick (on light).

## App themes

Light: paper `#F3F5F7`, cards white, ink `#0E1B2C`, accent olive, buttons midnight.
Dark: paper `#0E1B2C`, cards `#1A2B42`, ink `#F3F5F7`, muted `#B6C0CC`, accent and primary button lime with midnight text.
