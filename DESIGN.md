---
name: KC Wolff-Ingham
description: An achromatic printed monograph, annotated in the margin.
colors:
  ink: "#000000"
  body: "#1a1a1a"
  light: "#6b6b6b"
  rule: "#d6d6d6"
  stock: "#ffffff"
  ink-night: "#ffffff"
  body-night: "#e0e0e0"
  light-night: "#909090"
  rule-night: "#2e2e2e"
  stock-night: "#0a0a0a"
  accent: "#000000"
  scrim: "#0b1b2b"
typography:
  display:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(40px, 5.2vw, 68px)"
    fontWeight: 200
    lineHeight: 1.02
    letterSpacing: "-0.022em"
    fontVariation: "'opsz' 72"
  headline:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(20px, 2.4vw, 32px)"
    fontWeight: 300
    lineHeight: 1.25
  title:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "0.01em"
    fontVariation: "'opsz' 20"
    fontFeature: "'case' 1"
  lead:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.72
  body:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.68
  note:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.62
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.16em"
    fontFeature: "'tnum' 1"
  year:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0"
    fontFeature: "'tnum' 1"
  stat:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.025em"
    fontVariation: "'opsz' 36"
rounded:
  sheet: "0"
  chrome: "2px"
  panel: "4px"
  sheet-mobile: "14px"
spacing:
  line: "9px"
  block: "22px"
  entry: "34px"
  section: "52px"
  inset: "88px"
icons:
  library: "Tabler Icons"
  package: "@tabler/icons"
  style: "outline"
  grid: "24x24"
  defaultSize: "18px"
  defaultStroke: "1.5"
components:
  hotspot:
    textColor: "{colors.body}"
    typography: "{typography.body}"
    rounded: "{rounded.chrome}"
    padding: "1px 2px"
  hotspot-hover:
    backgroundColor: "rgba(17, 17, 17, 0.05)"
    textColor: "{colors.body}"
  popover:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.body}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "20px 22px 24px"
    width: "clamp(480px, 42vw, 560px)"
  margin-note:
    textColor: "{colors.body}"
    typography: "{typography.note}"
    width: "220px"
  margin-note-expanded:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.body}"
    rounded: "{rounded.panel}"
    padding: "18px 16px 20px"
    width: "220px"
  section-mark:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  chrome-button:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.light}"
    typography: "{typography.label}"
    rounded: "{rounded.chrome}"
    padding: "8px 12px"
  chrome-button-hover:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
  case-study-card:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.body}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "32px"
---

# Design System: KC Wolff-Ingham

## Overview

**Creative North Star: "The Annotated Monograph"**

A printed monograph that someone has read closely and marked up in the margin. The document is the whole design — not a page _about_ a document, but the document itself, set the way a publication sets one. Every reader gets one continuous sheet of ink on stock: a title page, a hairline, and then prose. What makes it more than a résumé is the apparatus running alongside it — quietly underlined references in the text, and the notes themselves standing in the margin where the reader can see the claim and its evidence at the same time.

The system has **two registers, and the surface decides which one applies.**

The résumé is achromatic by doctrine, not by restraint. Hierarchy there is built from size, weight, leading and white space, because a document that has to argue for thirty years of judgment cannot be caught decorating itself. The only colour a reader ever sees on it is inside the photographs, and the photographs are the work.

A case study is the opposite: it is **that client's environment**. Delta reads as Delta and Truist reads as Truist. The client's brand colour drives the hero field, the dark bands, the section stock, the labels and the outcome numerals — not a quarantined accent on an otherwise neutral page. This is the register that carries the evidence, and evidence of work done for a brand should look like that brand. The achromatic rule stops at the résumé and does not travel.

Density is a document's density, not an application's. Type is set at a reading size (17px body, never smaller), the measure is held at ~70 characters, and the margins are wide enough to hold a real column rather than a tooltip. Anti-references, confirmed in the work: no highlighter-style fills on marked terms, no punch-in-the-face accent contrast, no warm browns or ambers, no blend modes over media, no font-smoothing overrides, no card-and-shadow chrome on anything that isn't actually floating.

**Key Characteristics:**

- One serif (Newsreader) for everything read; one mono (JetBrains Mono) for everything the publication says about itself.
- True-neutral palette — every interface colour satisfies R = G = B, shadows included.
- Flat by default. Shadow means "this surface is above the document," and only four things are.
- Semantic annotation as the affordance: an underline means marginalia; a superscript Notes icon adds only the distinct meaning “case study.”
- Two rungs, one ladder — the margin is the glance, the panel is the dig, and the same words never appear twice.

## Colors

An achromatic résumé, and case studies each saturated in the colour of the client they document.

### Primary

- **Ink** (`{colors.ink}`): Headings, the masthead name and rule, section marks, statistics, and the underline on a link that has been earned. On the résumé `accent` resolves here, which is how "the accent" disappears into the type.
- **Client Accent** (`{colors.accent}` at rest): A per-page token, not a palette entry. `CaseStudyLayout` injects the client's real brand hex as an inline style on `<body>`. On a case study it is the page's dominant colour: the hero gradient, the dark bands, the tint in the light sections, the eyebrows and the outcome numerals all derive from it. `src/content/case-studies/manifest.json` is the canonical inventory of published accents.

### Field colours (case studies)

A brand is not one hex. The accent names the client while each page's _fields_ are art-directed per section in content via `bg` and `darkBg`. Those values belong in the case-study JSON that consumes them, not in a duplicate palette list here.

- **Scrim** (`{colors.scrim}` at 60%): the neutral wash over archival hero photographs. It is shared rather than derived; deriving it from a bright accent can tint documentary imagery instead of improving headline legibility.
- The neutral section palettes (`.section-light` / `.section-dark`, `#f1f3f5`…`#111219`) sit _under_ those fields without competing. They are cool on purpose.

### Derived accent tokens

A brand hex is chosen for logos and fields, not for 11px type or as a backdrop for white headlines. Three values are derived from it at build time in `src/utils/color.ts` so the brand can be used everywhere without going under AA:

- **`--accent-ink`**: the brand darkened only as far as readability requires — until it clears 4.9:1 on white. Used for labels and stat numerals on light stock, and as the base the hero gradient is built from.
- **`--accent-contrast`**: the mirror, for a dark brand on dark stock.
- **A light tint** (`color-mix(--accent 35%, #fff)`): labels and numerals on dark bands, where the brand itself would disappear. Still unmistakably that client's hue, lifted enough to read (8.88–11.97:1).

### Neutral

- **Body** (`{colors.body}`): All running prose, bullets, note text. Set one step off pure ink so paragraphs sit slightly back from headings without going grey.
- **Light** (`{colors.light}`): Dates, credentials, job titles, captions, margin labels, the footer, and every separator glyph. 5.33:1 on stock — the floor for anything that carries a word.
- **Rule** (`{colors.rule}`): Hairlines, borders, dividers, carousel dots at rest. Structure only; never sets text.
- **Stock** (`{colors.stock}`): The page and the sheet are the same surface and the same value. They stay separate tokens because case-study sections redefine both.

### Night Edition

`html.theme-dark` reassigns all five to their `-night` counterparts and flips `accent` to `{colors.ink-night}`. Stock is `{colors.stock-night}` — near-black rather than true black, so the photographs have something to sit on.

### Named Rules

**The Two Registers Rule.** The surface decides the palette. The résumé carries no hue at all. A case study carries its client's, everywhere — hero, bands, stock, labels, numerals. There is no third setting, and neither register borrows from the other: a neutral case study is as wrong as a coloured résumé.

**The Accent Identifies, It Does Not Fill.** On a case study the accent drives the things that _name_ the client — hero field, eyebrows, outcome numerals, hover borders. It does not drive the page's fields. Those are art-directed per section in content, because most brands are more than one colour and deriving everything from a single hex collapses them: it turned Delta's navy page red.

**The Derived, Never Guessed Rule.** Brand colour that carries text goes through `color.ts`, never straight from the hex. Use `--accent-ink` for light stock and the 35% white tint for dark stock, so adjustment is computed per brand rather than eyeballed once and assumed.

**The True Neutral Rule (résumé only).** Every value in the résumé's interface satisfies R = G = B, including shadow tints. A warm or cool grey there is a hue that identifies nothing. On a case study the neutrals are deliberately _not_ neutral — they are mixed toward the accent, which is the point.

**The Photograph Exception.** The work is the only colour on the résumé, and it renders as itself. No blend mode, no duotone, no filter, no opacity wash over media — ever.

**The No-Hue-For-State Rule.** Errors, warnings and success are set in ink and carried by their words and position, not by red or green. The copy is the signal; hue would be redundant on a page this quiet, and loud out of proportion to the event.

## Typography

**Display Font:** Newsreader (with Georgia, Times New Roman, serif)
**Body Font:** Newsreader — the same face, on its optical-size axis
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular)
**UI Font:** the system UI stack. No third webfont is loaded; a sans that renders no text is a request for nothing.

**Character:** One serif carries a 68px title and a 17px paragraph, which is what makes the page read as a single publication rather than an assembly of parts — Newsreader's variable `opsz` axis is set explicitly at each level so the letterforms are drawn for their size rather than scaled to it. Against it, the mono is deliberately mechanical: it is the _apparatus_, the labelling a publication applies to itself, and it never gets to sound like the author.

### Hierarchy

- **Display** (200, `clamp(40px, 5.2vw, 68px)`, 1.02, -0.022em, `opsz 72`): The masthead name, once. Roughly 4× the body — a classical title ratio, not a cover ratio. Sets on one line at every width so the hyphenated surname never breaks.
- **Headline** (300 italic, `clamp(20px, 2.4vw, 32px)`, 1.25): The positioning line under the rule. The only italic display type in the system.
- **Title** (600, 22px, `opsz 20`, `case` on): Company names. Source strings are already uppercase; the feature normalises the optical weight of all-caps rather than changing content.
- **Lead** (400, 19px, 1.72): The opening summary paragraphs. The only prose allowed to behave like an opening; its first line takes ink instead of body.
- **Body** (400, 17px, 1.68): Everything else a reader reads — bullets, descriptions, panel text. Held at ~70 characters (704px).
- **Note** (400, 14px, 1.62): Margin-note prose only. Smaller because a 220px column takes fewer characters per line, not because it matters less.
- **Label** (500, 11px, 0.16em, uppercase, `tnum`): The entire apparatus — section marks, margin labels, panel labels, contact, and chrome. `0.22em` for the wider variant (masthead role, credentials, section marks).
- **Year** (500, 12px, `0` tracking, `tnum`): The time-axis rail only. One step above the label because these numerals are the argument rather than the furniture, and tracked at zero because a rail only reads as a column if the digits stack — the 0.16em every other label carries would break the alignment the rail exists to create.
- **Stat** (400, 34px in the panel / 26px in the margin, `opsz 36`/`28`, -0.025em): The one number a note leads with. In ink, never in accent — it is already the largest thing in the panel, and colouring it too says the same thing twice. The margin takes the smaller step: at 34px in a 220px column an aside was louder than the 22px company headings running beside it.

### Named Rules

**The One Voice Rule.** Newsreader sets everything a person reads. JetBrains Mono sets everything the publication says about itself. There is no third voice, and the mono never sets prose — if a sentence is in the mono, it is in the wrong typeface.

**The Reading Floor Rule.** Body copy is 17px at every viewport including 375px. The scale reduces the display, the headline and the titles on small screens and deliberately does not touch the body. Reading size is not a responsive variable.

**The Semantic Marker Rule.** A marked term announces marginalia with a hairline underline, never with a fill. A superscript Tabler Notes icon appears only when a deeper case study also exists, and its hint says “Case study.” A filled term is a highlighter mark — a reader's gesture, not a typographer's. The wash is reserved for states the reader caused: hover, and open.

**The Less-Is-More Rule.** Marginalia-only terms receive no icon, and section headings receive no ornamental numbering. An extra mark must add information or it is noise.

## Icons

**Library:** Tabler Icons, consumed through `src/components/Icon.astro`. Tabler is the only icon source for product UI; hand-drawn SVG and CSS glyphs are not part of the design system.

- **Style:** outline icons on Tabler's 24×24 grid.
- **Default:** 18px, 1.5px stroke, `currentColor`.
- **Small chrome:** 12px where an icon sits inside an 11px mono label.
- **Controls:** the clickable target remains at least 44×44px even when the glyph is smaller.
- **Accessibility:** icons are decorative by default because the control carries the accessible name. Give the icon a `label` only when the icon itself communicates information.
- **State:** use separate canonical icons rather than modifying one. For password visibility, `eye-off` means the password is hidden and the action is “Show password”; `eye` means it is visible and the action is “Hide password.”

Add icons to the registry in `Icon.astro`; do not import library components directly at individual call sites. Existing legacy inline SVG strings should migrate through the registry when their owning component is next changed.

## Layout

**One spine.** The masthead and the sheet share the same `880px` maximum and the same `clamp(24px, 6vw, 88px)` inset, so the name, the tagline, the contact line and every paragraph of the résumé sit on one left edge. Measured at 1512px: masthead inner and sheet both begin at x=316 and run 880px; the text block inside begins at x=404 and runs 704px.

**The sheet is wider than the measure.** 880px of sheet holds a 704px text block with 88px of margin on each side (`--sheet-inset`, a `clamp(24px, 6vw, 88px)`). That difference is the whole reason it reads as a page rather than a column — at 720px the sheet _was_ the measure and read as a strip down the middle of the viewport. The inset is a named token because three things must agree on it: the sheet's padding, the masthead's padding, and the year rail, which hangs in exactly that band.

**The time axis.** Experience sets its years in a mono rail that hangs in the sheet inset, right-aligned against the text edge, baseline-aligned with the first line of the entry it dates. The rail costs the measure nothing: it is negative-margined by `--sheet-inset` so the prose stays on the single left edge everything else uses. Below 1320px a date span steps down to its start year, because that is all nine characters' worth of rail the inset can hold; below 600px the rail collapses and the year sets flush above its entry.

**The margins are real columns.** At ≥1420px, notes render in a 220px column with a 42px gutter, alternating sides down the page (verified: both `side-left` and `side-right` at exactly 42px). Both margins set flush left — a shared left edge on both sides reads as one apparatus running down the page, where right-ragged text in the left margin reads as a mistake.

**Rhythm.** `{spacing.line}` between bullets, `{spacing.block}` between paragraphs, `{spacing.entry}` between experience entries and across horizontal rules, `{spacing.section}` above a section mark. Vertical padding is fluid (`clamp`) so the document breathes on tall viewports; horizontal structure is fixed, because a measure that moves is not a measure.

### Named Rules

**The One Left Edge Rule.** Every element on the résumé aligns to a single left edge — masthead, summary, section marks, record entries, experience bodies, all at the same x. Nothing is centred, nothing is right-aligned, and no second grid is introduced. Anything that wants a column of its own hangs into the sheet inset rather than pushing the prose right; a rail that indents the text has created a second left edge, which reads as a mistake even when the reader cannot say why.

**The Time Axis Rule.** Dates are structure, not metadata. A chronological section puts its years in the rail, never back in a company-left/dates-right row — that row is the single most generic pattern the résumé form has, and it renders thirty-four years as eleven unrelated line items.

**The Derived Threshold Rule.** The marginalia breakpoint is arithmetic, not taste: `880 + 2 × (42 + 220) = 1404`, rounded to **1420**. It must stay below the 1440px logical width of a 13" laptop, or the feature the entire reading experience is built around is unreachable on the most common machine it will be read on. Change any of the three inputs and recompute; `BREAKPOINT_WIDE` in `src/scripts/constants.ts` does not read them.

**The Measure Rule.** Running text never exceeds 704px anywhere in the system, including on case-study pages. Media may go full-bleed; sentences may not.

**The Nothing Withheld Rule.** Below the wide tier the margins disappear and the panel takes over. Every underlined term and every note remains reachable. Narrow viewports lose the simultaneous view, never the content.

## Elevation & Depth

The document is flat. The sheet has no border, no lift, and no shadow, because it is not sitting on top of anything — the masthead and the résumé are one continuous stock, and a card edge would invent a separation that isn't there. Depth in this system means one specific thing: _this surface is above the document._ Exactly four things are — the popover, the expanded margin note, the mobile bottom sheet, and the fixed chrome buttons. Everything else is drawn with a hairline.

### Shadow Vocabulary

- **Panel** (`0 2px 4px rgba(0,0,0,0.05), 0 12px 28px rgba(0,0,0,0.1), 0 32px 64px rgba(0,0,0,0.09)`): The popover. Three layers — a contact shadow, a form shadow and an ambient one — so the panel reads as a physical object over the page rather than a div with a blur under it.
- **Panel, night** (`0 32px 80px rgba(0,0,0,0.6)`): One layer at higher opacity. Contact shadows are invisible on near-black stock, so they are not shipped.
- **Note** (`0 2px 6px rgba(0,0,0,0.06), 0 14px 34px rgba(0,0,0,0.12)`): The expanded margin note. Lighter than the panel because it displaces less.
- **Chrome** (`0 2px 8px rgba(0,0,0,0.05)`): Fixed controls only — the theme toggle and the back link. Just enough to separate a fixed element from whatever scrolls beneath it.

### Named Rules

**The Float Rule.** A shadow is a claim that the surface is above the document. If the element scrolls with the page, it does not get one — it gets a hairline. Cards, sections, images, stat bands and heroes are _in_ the page.

**The Hairline Rule.** Separation is a 1px `{colors.rule}` line. Not a 3px band, not a tinted background, not a gap. A hairline is punctuation, and punctuation is all most separations need to do.

**The Neutral Shadow Rule.** Shadows are cast in true neutral. A shadow tinted `rgba(30, 25, 15, …)` is a brown light source in a room that has no brown in it.

## Shapes

The form language is nearly cornerless, and the radii that exist are keyed to what a thing _is_ rather than how big it is.

- **Sheet** (`{rounded.sheet}` — 0): The document. A page has no rounded corners.
- **Chrome** (`{rounded.chrome}` — 2px): Controls, and the wash behind a marked term. Cut from the same stock as the document, not applied on top of it.
- **Panel** (`{rounded.panel}` — 4px): Surfaces that float — the popover, the expanded margin note, and any card. The single radius for anything that behaves like a piece of paper laid over the page.
- **Sheet, mobile** (`{rounded.sheet-mobile}` — 14px, top corners only): The bottom sheet. A platform convention worth honouring; the one place a larger radius is correct.

Circles are reserved for things that are genuinely round and genuinely small: carousel dots (5px), the play button (46px), carousel chevrons (26–30px). A circle here means "control," never "container."

**The Cut-From-Stock Rule.** Four radii, and no fifth. A 12px card, a 32px image, or a 100px pill in this system is a component that was designed somewhere else and pasted in.

## Components

Motion across every component is a state change, never an entrance for its own sake: `0.2s ease` for colour and border, `0.22–0.55s cubic-bezier(0.22, 1, 0.36, 1)` for anything that moves, and `0.3s cubic-bezier(0.32, 0.72, 0, 1)` for the mobile sheet only. Under `prefers-reduced-motion: reduce`, transforms and transitions are removed while opacity and colour states are _preserved_ — the interface stops moving, it does not stop responding.

### Annotated Term (signature)

The system's defining component. An inline `<span>` carrying a 1px `{colors.rule}`-weight underline at 32% ink, with `box-decoration-break: clone` so the underline stays correct across a line break. Project-backed terms append the canonical Tabler Notes icon as a superscript semantic marker.

- **Rest:** transparent background and underline at `rgba(17,17,17,0.32)`; a project icon appears only when it adds the case-study distinction.
- **Hover:** 5% ink wash, underline to full ink.
- **Open / revealed in margin:** 9% ink wash, underline to full ink.
- **Focus:** 2px ink outline at 3px offset.
- Exempt from the 44px target minimum under WCAG 2.5.8's inline exception — the target is bound by the line-height of the prose it sits in, and enlarging it would break the paragraph.

### Year Rail

- **Position:** hangs in `--sheet-inset`, negative-margined so prose keeps its left edge.
- **Type:** `{typography.year}`, right-aligned, `tabular-nums`, ink.
- **Alignment:** grid `align-items: baseline`, so a 12px numeral sits on the baseline of the 17px serif beside it instead of centring in its own row.
- **Responsive:** full span → start year at 1320px → stacked flush-left at 600px.

### Margin Note (signature)

The glance. A 220px column entry: label, a 26×1px hairline, an optional figure or swipeable media carousel, an optional stat, and **one sentence** of prose. It reveals on scroll via IntersectionObserver, alternates sides, and dissolves when its own panel opens so the same words are never on screen twice.

- **Media:** every authored image and video remains available in the default note. Expansion changes narrative depth, not the available media.
- **Expanded** (≥1420px): becomes a real surface — stock background, hairline border, `{rounded.panel}`, note shadow, capped at 72vh with internal scroll. At this width the margin _is_ the detail view; the panel never opens over the document.
- **Case-study link:** notes that lead to a project close on a real, underlined link — in the collapsed state too, so reaching a case study never requires expanding anything first.
- **Hover:** the rule grows 26px → 34px. One invitation, not two.

### Case-Study Control

The named way into a project page, rendered only where a deeper route exists.

- **Marginalia:** normal flow after the note content.
- **Popover and mobile sheet:** inserted directly after media, or after the heading/stat when no media exists, then sticky at the top of `.popover-scroll`. Its document-white field, black boundary, and black action square remove the dirty gray middle tone; hover/focus invert the entire control rather than changing only the arrow.
- The label is a nested `-link-label` span so the underline belongs to the words and does not drag the arrow into it.
- The arrow is a pseudo-element, never part of the link text. It was inside the content string (`"View Truist project →"`), which put a design decision in the database and produced two arrows on one note.

### Stat

Two kinds of value share this slot, so it scales to what it holds. A figure — `$32.8M`, `2000` — takes display scale (34px in the panel, 26px in the margin). Anything over ten characters is a sentence, not a figure, and steps down to prose (`{typography.lead}` in the panel, `{typography.body}` in the margin) via a `--phrase` modifier the builder applies by length.

### Panel / Popover

The dig. A fluid 480–560px reading surface, capped at 78vh, opened by a term below the wide tier. Carries the full narrative, the full media carousel, and a case-study control when that destination exists. The quiet top chrome uses a visible grip bar without a dividing rule and a Tabler close icon. Draggable by its handle; on mobile it becomes a bottom sheet with swipe-to-dismiss and a 44×44 close target.

### Section Mark

A tracked mono label with a hairline running to the end of the measure. It is intentionally unnumbered: an ordinal that encodes nothing beyond document order adds noise rather than hierarchy.

### Chrome Buttons

The theme toggle and the back link. Stock fill, hairline border, `{rounded.chrome}`, mono label in `{colors.light}`.

- **Hover:** border shifts to accent, text to ink, and a 1px lift (or 4px left-slide for the back link).
- **Focus:** 2px accent outline at 2px offset.

### Widen Prompt

An in-flow publication header that makes the wide marginalia mode discoverable. From 600–1419px it occupies its own centred row above the masthead, pushing the name down instead of floating over it. The invitation is the state that needs attention, so it uses an ink field with stock text, mono meta type, `{rounded.chrome}`, and the canonical Tabler horizontal-arrows icon; because it is part of the page flow, it has no shadow. A one-pixel hairline fills as the viewport approaches the derived 1420px threshold. Crossing the threshold returns the surface to stock with ink text for the quieter “Marginalia revealed” confirmation, then collapses the row. It is not a pill, does not use blur or an invented hue, and never claims that narrow readers are missing access to the notes.

### Cards (case studies)

- **Shape:** `{rounded.panel}`, hairline `{colors.rule}` border, stock fill, **no shadow at rest and no lift on hover**.
- **Hover:** border shifts to the client accent, matching the chrome buttons and carousel chevrons. The accent is doing identification work — it is the client's card.
- **Internal padding:** 32px.

### Inputs (login)

A centred underline field — no box, no fill, transparent background with a 1px bottom border.

- **Focus:** bottom border to accent. No glow, no ring.
- **Placeholder:** italic, `{colors.light}`.
- **Error:** one calm sentence in the system UI face, directly beneath the field with a 1px rule. It is interface feedback, not editorial prose or publication apparatus. Carried by copy and position, per The No-Hue-For-State Rule.

## Do's and Don'ts

### Do:

- **Do** decide the register before the value: résumé means no hue, case study means the client's hue everywhere.
- **Do** derive every coloured value on a case study from `var(--accent)`, and route anything that carries text through `--accent-ink` or the dark-stock tint.
- **Do** keep the résumé's neutrals at R = G = B, including shadow tints.
- **Do** declare anything derived from `--accent` on `<body>` or below. The brand hex is injected inline on `<body>`, so a mapping on `:root` resolves against the ink and silently loses the brand.
- **Do** set anything a person reads in Newsreader and anything the publication says about itself in JetBrains Mono.
- **Do** hold running text to 704px and align everything to the single left edge, on every page type.
- **Do** reach for a 1px `{colors.rule}` hairline before reaching for a border, a fill, or a gap.
- **Do** recompute the 1420px threshold from `880 + 2 × (42 + 220)` whenever the sheet, gutter or column changes, and update `BREAKPOINT_WIDE` by hand.
- **Do** reserve shadow for the four surfaces that genuinely float, and give everything else a hairline.
- **Do** preserve opacity and colour states under `prefers-reduced-motion` — remove the movement, not the feedback.

### Don't:

- **Don't** introduce a hue that belongs to nobody — no leftover brand amber, no warm cream, and no slate-grey ramp. On a case study, colour comes from that client or from the documented neutral scrim, or not at all.
- **Don't** neutralise a case study. Flattening a hero to a solid field, greying a brand-derived band, or stripping the accent out of the section stock takes the brand out of the one place it belongs.
- **Don't** apply `mix-blend-mode`, filters, duotones or opacity washes to photographs. The work renders as itself.
- **Don't** use `-webkit-font-smoothing: antialiased` or `text-rendering: optimizeLegibility`. The first thins every glyph, which is how black type starts reading as grey on a page set at weight 200–400.
- **Don't** dim text with `opacity`. Dim it with a colour value, so the contrast ratio is the one you declared.
- **Don't** add a fifth corner radius. 12px cards, 32px images and 100px pills belong to a different system.
- **Don't** lift a card on hover or shadow anything that scrolls with the page.
- **Don't** let the mono set a sentence, or the display serif set a label.
- **Don't** put a bare arrow next to content as a "there's more" cue. It reads as a link, and inside a surface that is itself clickable it competes with the real control. Name the destination or show nothing.
- **Don't** put glyphs, arrows or punctuation-as-affordance inside content strings. If it is an affordance it belongs in CSS, where it can be changed once.
- **Don't** reduce body copy below 17px at any viewport.
- **Don't** reuse the `theme-*` prefix for anything but the `<html>` edition flag — section wrappers are `section-light` / `section-dark`, and the collision has already cost this codebase once.
