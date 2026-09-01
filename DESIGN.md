---
name: KC Wolff-Ingham
description: An achromatic printed monograph, marked up by its reader in highlighter.
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
  marker-note: "#ffe40c"
  marker-project: "#5cd62a"
  marker-project-ref: "#2e7d28"
  marker-note-night: "#fad23c"
  marker-project-night: "#76e052"
  marker-project-ref-night: "#7fd95e"
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
    fontSize: "clamp(20px, 2.1vw, 23px)"
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
    rounded: "{rounded.sheet}"
    padding: "0.1em 0.34em 0.12em 0.36em"
    backgroundColor: "rgba(255, 228, 12, 0.6)"
  hotspot-project:
    textColor: "{colors.body}"
    backgroundColor: "rgba(92, 214, 42, 0.6)"
  hotspot-hover:
    backgroundColor: "rgba(255, 228, 12, 0.72)"
    textColor: "{colors.body}"
  sheet:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.body}"
    typography: "{typography.body}"
    rounded: "{rounded.sheet-mobile}"
    padding: "18px 20px 24px"
    width: "100%"
  inset-note:
    backgroundColor: "transparent"
    textColor: "{colors.body}"
    typography: "{typography.note}"
    rounded: "{rounded.sheet}"
    padding: "18px 0 20px"
  margin-note:
    textColor: "{colors.body}"
    typography: "{typography.note}"
    width: "220px"
  margin-note-expanded:
    backgroundColor: "transparent"
    textColor: "{colors.body}"
    rounded: "{rounded.sheet}"
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

A printed monograph that someone has read closely and marked up in the margin. The document is the whole design — not a page _about_ a document, but the document itself, set the way a publication sets one. Every reader gets one continuous sheet of ink on stock: a title page, a hairline, and then prose. What makes it more than a résumé is the apparatus running alongside it — highlighter strokes over the terms the reader found worth marking, and the notes themselves standing in the margin where the reader can see the claim and its evidence at the same time.

The system has **two registers, and the surface decides which one applies.**

The résumé is achromatic by doctrine, not by restraint. Hierarchy there is built from size, weight, leading and white space, because a document that has to argue for thirty years of judgment cannot be caught decorating itself. Colour on the sheet belongs to exactly two parties, and neither is the typographer: the photographs, which are the work, and the reader's own highlighters — translucent yellow where marginalia exists, green where a case study runs deeper. The pens are annotation, not decoration; the doctrine survives because every hue on the page still denotes something.

A case study is the opposite: it is **that client's environment**. Delta reads as Delta and Truist reads as Truist. The client's brand colour drives the hero field, the dark bands, the section stock, the labels and the outcome numerals — not a quarantined accent on an otherwise neutral page. This is the register that carries the evidence, and evidence of work done for a brand should look like that brand. The achromatic rule stops at the résumé and does not travel.

Density is a document's density, not an application's. Type is set at a reading size (17px body, never smaller), the measure is held at ~70 characters, and the margins are wide enough to hold a real column rather than a tooltip. Anti-references, confirmed in the work: no tinted washes or gradient sheens pretending to be marker ink (a highlighter is flat, and it is the reader's, never the layout's), no punch-in-the-face accent contrast, no warm browns or ambers outside the reader's pen, no blend modes over media, no font-smoothing overrides, no card-and-shadow chrome on anything that isn't actually floating.

**Key Characteristics:**

- One serif (Newsreader) for everything read; one mono (JetBrains Mono) for everything the publication says about itself.
- True-neutral palette — every interface colour satisfies R = G = B, shadows included.
- Flat by default. Shadow means "this surface is above the document," and on a desktop nothing is: notes continue in the margin or bind into the flow. Only the mobile sheet and the fixed chrome float.
- Semantic annotation as the affordance: a yellow highlighter stroke means marginalia; a green stroke — with a superscript Notes icon outside the ink — adds only the distinct meaning “case study.”
- Two rungs, one ladder — the glance and the dig — and the dig arrives where the tier dictates: continuing in the margin, bound into the flow, or rising as the sheet. The same words never appear twice.

## Colors

An achromatic résumé, and case studies each saturated in the colour of the client they document.

### Primary

- **Ink** (`{colors.ink}`): Headings, the masthead name and rule, section marks, statistics, and the underline on a link that has been earned. On the résumé `accent` resolves here, which is how "the accent" disappears into the type.
- **Client Accent** (`{colors.accent}` at rest): A per-page token, not a palette entry. `CaseStudyLayout` injects the client's real brand hex as an inline style on `<body>`. On a case study it is the page's dominant colour: the hero gradient, the dark bands, the tint in the light sections, the eyebrows and the outcome numerals all derive from it. `src/content/case-studies/manifest.json` is the canonical inventory of published accents.
- **The Reader's Pen** (`{colors.marker-note}`, `{colors.marker-project}`): The two highlighter pigments, applied as translucent RGB-triplet inks (`--mark-note-rgb`, `--mark-project-rgb` in `global.css`) at one shared load per state — 0.6 rest, 0.72 hover, 0.84 open. Yellow marks every annotated term; green marks the terms whose note leads to a case study, and `{colors.marker-project-ref}` inks the superscript icon at 3:1+ against stock. These are the résumé's only interface hues, and both denote.

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

`html.theme-dark` reassigns all five to their `-night` counterparts and flips `accent` to `{colors.ink-night}`. Stock is `{colors.stock-night}` — near-black rather than true black, so the photographs have something to sit on. The pens follow: a marker cannot physically mark dark stock, so the night pigments (`{colors.marker-note-night}`, `{colors.marker-project-night}`) run brighter at a far lighter load — 0.26 rest, 0.36 hover, 0.48 open — a luminous tint rather than an inversion. Night ink is pre-composited against the stock (`color-mix`, opaque): translucent bands that deepen pleasingly where they overlap on white paper instead glow as a stripe over near-black, so at night double coverage must be a no-op.

### Named Rules

**The Two Registers Rule.** The surface decides the palette. The résumé's typography and chrome carry no hue at all — its only colours are the photographs and the reader's two marker inks, and all three denote. A case study carries its client's colour, everywhere — hero, bands, stock, labels, numerals. There is no third setting, and neither register borrows from the other: a neutral case study is as wrong as a coloured résumé.

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
- **Headline** (300 italic, `clamp(20px, 2.1vw, 23px)`, 1.25): The positioning line under the rule; the only italic display type in the system. Sized to the sentence: 23px is the largest size at which the full tagline sets on ONE line inside the 704px measure. A broken tagline read as an accident at the top of the title page, so the line's integrity outranks its point size.
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

**The Semantic Marker Rule.** A marked term announces marginalia the way a reader would: a translucent highlighter stroke over the letters — yellow for marginalia, green when a deeper case study also exists. The stroke embraces being a reader's gesture; precisely because it is one, it must behave like a real pen: flat matte ink, straight chisel-cut ends, no shading, no rounded caps, and it covers the words only. The superscript Tabler Notes icon appears solely on green terms, outside the ink, and its hint says “Case study.” More ink is a state the reader caused: the load deepens on hover and deepens again while open or revealed in the margin.

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

**The Nothing Withheld Rule.** Below the wide tier the margins disappear and the note binds into the flow (or, on a phone, rises as the sheet). Every marked term and every note remains reachable. Narrow viewports lose the simultaneous view, never the content.

## Elevation & Depth

The document is flat. The sheet has no border, no lift, and no shadow, because it is not sitting on top of anything — the masthead and the résumé are one continuous stock, and a card edge would invent a separation that isn't there. Depth in this system means one specific thing: _this surface is above the document._ Exactly two things are — the mobile bottom sheet and the fixed chrome buttons. On a desktop, nothing floats at all: an opened note either continues down the margin or binds into the document flow, and both are drawn with hairlines, in the page. Everything else is a hairline too.

### Shadow Vocabulary

- **Sheet** (`0 2px 4px rgba(0,0,0,0.05), 0 12px 28px rgba(0,0,0,0.1), 0 32px 64px rgba(0,0,0,0.09)`): The mobile bottom sheet. Three layers — a contact shadow, a form shadow and an ambient one — so it reads as a physical object over the page rather than a div with a blur under it.
- **Sheet, night** (`0 32px 80px rgba(0,0,0,0.6)`): One layer at higher opacity. Contact shadows are invisible on near-black stock, so they are not shipped.
- **Chrome** (`0 2px 8px rgba(0,0,0,0.05)`): Fixed controls only — the theme toggle and the back link. Just enough to separate a fixed element from whatever scrolls beneath it.

### Named Rules

**The Float Rule.** A shadow is a claim that the surface is above the document. If the element scrolls with the page, it does not get one — it gets a hairline. Cards, sections, images, stat bands and heroes are _in_ the page.

**The Hairline Rule.** Separation is a 1px `{colors.rule}` line. Not a 3px band, not a tinted background, not a gap. A hairline is punctuation, and punctuation is all most separations need to do.

**The Neutral Shadow Rule.** Shadows are cast in true neutral. A shadow tinted `rgba(30, 25, 15, …)` is a brown light source in a room that has no brown in it.

## Shapes

The form language is nearly cornerless, and the radii that exist are keyed to what a thing _is_ rather than how big it is.

- **Sheet** (`{rounded.sheet}` — 0): The document, the marker strokes, and both desktop note surfaces — the continued margin note and the bound-in note are part of the page, so they share the page's absence of corners.
- **Chrome** (`{rounded.chrome}` — 2px): Controls. Cut from the same stock as the document, not applied on top of it.
- **Panel** (`{rounded.panel}` — 4px): Any card on a case-study page. The single radius for anything that behaves like a piece of paper laid over the page.
- **Sheet, mobile** (`{rounded.sheet-mobile}` — 14px, top corners only): The bottom sheet. A platform convention worth honouring; the one place a larger radius is correct.

Circles are reserved for things that are genuinely round and genuinely small: carousel dots (5px), the play button (46px), carousel chevrons (26–30px). A circle here means "control," never "container."

**The Cut-From-Stock Rule.** Four radii, and no fifth. A 12px card, a 32px image, or a 100px pill in this system is a component that was designed somewhere else and pasted in.

## Components

Motion across every component is a state change, never an entrance for its own sake: `0.2s ease` for colour and border, `0.22–0.55s cubic-bezier(0.22, 1, 0.36, 1)` for anything that moves, and `0.3s cubic-bezier(0.32, 0.72, 0, 1)` for the mobile sheet only. Under `prefers-reduced-motion: reduce`, transforms and transitions are removed while opacity and colour states are _preserved_ — the interface stops moving, it does not stop responding.

The one ceremonial exception is the **theme wash** (`1.15s`, two movements): switching editions prints the next edition over the page as an ink drop blooming out of the toggle — the reader's own gesture is the origin. The drop lands softly and dwells by the button long enough to watch its edge wobble (SMIL inside the mask SVG morphs the hand-drawn blob while a half-opacity bleed halo soaks ahead of the front), then accelerates away, ending at full speed past the farthest corner. The outgoing edition neither fades nor moves; it is simply washed over. Reduced motion swaps the wash for the View Transition API's quiet crossfade, and browsers without the API keep the instant switch.

### Annotated Term (signature)

The system's defining component: a highlighter stroke laid by the document's reader. The interactive `<span class="hotspot">` carries the aria and focus ring; an inner `.hs-stroke` span holds only the letters and wears the paint, so the ink covers the words and never the superscript icon. The stroke is two slightly staggered hard-stop gradient bands — flat translucent ink, end cuts a few degrees off vertical (the chisel tip), band overlap the only density variation, `{rounded.sheet}` corners with a 0.04em gradient fade doing the anti-aliasing. Overshoot padding pulled back by negative margins runs the ink past the glyphs into the word gaps. Six hand-tuned band geometries exist; `render.ts` hashes the popover key to assign one, so neighbouring marks never repeat and no mark redraws itself between visits. `box-decoration-break: clone` gives each wrapped line its own complete stroke, exactly as a human re-strokes the second line.

- **Rest:** pigment at 0.6 — `{colors.marker-note}` for marginalia, `{colors.marker-project}` for project-backed terms, whose Tabler Notes icon sits outside the ink in `{colors.marker-project-ref}`.
- **Hover:** load to 0.72 — the pen pressing.
- **Open / revealed in margin:** load to 0.84 — a deliberate second pass.
- **Focus:** 2px ink outline at 3px offset; the stroke keeps its shape.
- Night edition: night pigments at 0.26 / 0.36 / 0.48, pre-composited to opaque ink so the band overlap cannot glow against dark stock.
- Exempt from the 44px target minimum under WCAG 2.5.8's inline exception — the target is bound by the line-height of the prose it sits in, and enlarging it would break the paragraph.

### Year Rail

- **Position:** hangs in `--sheet-inset`, negative-margined so prose keeps its left edge.
- **Type:** `{typography.year}`, right-aligned, `tabular-nums`, ink.
- **Alignment:** grid `align-items: baseline`, so a 12px numeral sits on the baseline of the 17px serif beside it instead of centring in its own row.
- **Responsive:** full span → start year at 1320px → stacked flush-left at 600px.

### The Author's Portrait (masthead)

A hand-drawn line engraving of the author sits opposite the name, straddling the masthead rule — head above the hairline, shoulders below. The head is a two-column grid and the rule spans only the text column, so the figure is what curtails the line, the way a rule yields to a plate in print; there is no measured offset to drift out of tune. The drawing is `currentColor` line work on the shared stock — no frame, no fill, no tint — so each edition inks it itself.

- **The greeting:** the first pointer-over (or tap, where hover never happens) plays a 1.2s staged crossfade through three expression plates, settling on a closed-mouth smile that stays for the visit. Once — warmth is a moment, not a loop — and leaving does not take it back.
- **Sizing:** as large as the head allows. The single-line name owns ~477px of the 704px head and never wraps for a figure; the shoulders hang below the hairline but clear the tagline's right end — the figure straddles its own rule and never crosses another line of ink. Below the wide head the width floor tracks the name's own 40px floor, holding the figure near 2.8× the name's height: the proportion, not the pixel, is the constant.
- **Phone (≤600px):** absent. The name needs the full measure (the surname must not break at its hyphen), so the figure cannot share its row, and parked beside the rule it floats in the colophon's air anchored to nothing. A plate with no room is clutter — the phone masthead is a tight colophon and stays one.
- **Reduced motion:** the settled smile from the start. The warmest state is the static one.

### Margin Note (signature)

The glance. A 220px column entry: label, a 26×1px hairline, an optional figure or swipeable media carousel, an optional stat, and **one sentence** of prose. It reveals on scroll via IntersectionObserver, alternates sides, and dissolves when its sheet opens across a resize edge so the same words are never on screen twice.

- **Media:** every authored image and video remains available in the default note. Expansion changes narrative depth, not the available media.
- **Open** (≥1420px): the note _continues_. The remaining narrative and the quote — rendered at build time inside a collapsed `.sa-more` wrapper — unfold in place; the note never becomes a surface: no stock, no border, no shadow, no radius, no height cap, no inner scrollbar, no repositioning. Three quiet marks say which note is open, all in the system's own language: the continuation itself; the hairline stretching across the full column at 2px in the term's own highlighter ink (yellow for marginalia, green for a project note) with the label stepping to full ink; and every other note receding to 35% (returning under the pointer). Notes below glide frame-by-frame as the margin re-typesets, and the page drifts just far enough that the unfolded note ends with real air above the fold — never so far that the clicked term leaves the screen.
- **Case-study link:** notes that lead to a project include the framed black-and-white gateway in the collapsed state too, so reaching a case study never requires expanding anything first.
- **Hover:** the rule grows 26px → 34px. One invitation, not two.
- **Close:** the term, Escape, a click anywhere else — or simply scrolling away, which folds the note behind the departing reader (a note taller than the viewport is read by scrolling and folds only once the reader passes its extent). Clicks inside an open note never collapse it — it is a reading surface.

### Case-Study Control

The named way into a project page, rendered only where a deeper route exists.

- **Every surface:** inserted directly after media, or after the heading/stat when no media exists — in natural flow everywhere except the mobile sheet, whose inner scroll region keeps the control pinned at its top. Its document-white field, black boundary, and black action square remove the dirty gray middle tone; hover/focus invert the entire control rather than changing only the arrow.
- **Press:** on `:active` the control depresses into the paper by exactly one pixel — the same click feel on every surface it appears, including the introductions' demonstration copy. Removed under reduced motion; the colour states remain.
- The label is a nested `-link-label` span so its typography remains independent from the action square.
- The arrow is a pseudo-element, never part of the link text. It was inside the content string (`"View Truist project →"`), which put a design decision in the database and produced two arrows on one note.

### Media Carousel

Two or more figures share one swipeable, scroll-snapping strip on every surface; a single figure is simply a figure — no chevrons, no dots. Every slide centres its ink between the chevrons, on every surface — margin, bound-in, and sheet — because the strip's controls are symmetric and the picture between them must be too. A lone figure keeps its surface's flush edge; only sequences centre. Navigation is circular: past the last slide "next" carries round to the first, so neither chevron ever disables, fades, or strands the pointer at a dead control on the far side of the gallery. For the same reason the chevrons are resident, never hover-gated — the inset and the sheet are touch-first, where a hover reveal never fires. The dots re-sync after a native swipe via a scroll spy.

### Stat

Two kinds of value share this slot, so it scales to what it holds. A figure — `$32.8M`, `2000` — takes display scale (34px in the panel, 26px in the margin). Anything over ten characters is a sentence, not a figure, and steps down to prose (`{typography.lead}` in the panel, `{typography.body}` in the margin) via a `--phrase` modifier the builder applies by length.

### Bound-In Note (middle tier)

The dig, set into the page. Between 600px and the wide tier, a clicked term opens its full note in the document's own flow, directly after the term's paragraph or bullet — the prose below makes room via a soft grid-rows unfold, and the page drifts just far enough that the unfolded note ends with real air above the fold, never carrying the clicked term off-screen. A hairline above and below, the mono label row carrying a quiet hairline-square fold control, the media plate at the full measure, and the narrative in two ~330px columns at `{typography.note}` size (one column under 760px). No overlay, no dim, no scroll lock, no inner scrollbox, no shadow: a disclosure in the page, not a dialog over it. Closed by the term, the fold control, Escape, a click elsewhere — or simply scrolling away, which folds the note behind the departing reader (folded off-screen, the close is instant and scroll-compensated so nothing visible moves; a note taller than the viewport is read by scrolling and folds only once the reader passes its extent).

### Sheet (mobile)

The dig on a phone. A bottom sheet with `{rounded.sheet-mobile}` top corners, swipe-to-dismiss with velocity detection, a visible pill handle, a 44×44 close target, and a scrim over the document — the one surface in the system that floats, and the one that is genuinely modal.

### Section Mark

A tracked mono label with a hairline running to the end of the measure. It is intentionally unnumbered: an ordinal that encodes nothing beyond document order adds noise rather than hierarchy.

### Chrome Buttons

The theme toggle and the case-study back link. Stock fill, hairline border, `{rounded.chrome}`, in `{colors.light}`.

- **Theme toggle:** a 34px square chip across all viewports with an outline icon (sun for light edition, moon for dark). The aria-label announces the destination action for assistive tech.
- **Back link:** mono label with left-pointing arrow icon, padding 8px 12px.
- **Hover:** border shifts to accent, text/icon to ink, and a 1px lift (or 4px left-slide for the back link).
- **Focus:** 2px accent outline at 2px offset.

### The Editor's Note (introduction below the wide tier)

The introduction for every tier without margins, and the retirement of two pieces of chrome: the black widen-to-reveal bar and the bordered best-on-desktop badge — both were announcements pinned above a printed sheet. The editor's note is instead a piece of the sheet: bound into its top like a printed "how to read this edition" note — a resting hairline, the mono INTERACTIVE label, and one note-size sentence wearing a genuine yellow specimen stroke. Like the wide tier's cold-start margin note, it is a working scale model of the system: the yellow specimen unfolds the two-pens sentence (with a live green specimen carrying the real superscript marker), the green specimen unfolds an example project gateway in the real control's classes, and the gateway pays off with the apparatus line "You got it!" The note's rule narrates each stage in the pen on stage — yellow, then green, then back to the resting hairline as the apparatus stands down. The widen invitation survives as one quiet clause, shown only above 600px where widening is possible. Specimens are spans, never controls: the staged extras are pointer theater, and the genuinely accessible marked terms do the teaching for keyboard and screen-reader readers. Hidden at ≥1420px, where the margin performs the introduction.

**The payoff conversation.** Clicking the demonstration gateway again is answered — the payoff line retypes at constant speed, sub-second, in the author's wry voice, and what it says responds to how it is being clicked: a rapid burst is one utterance answered once (trailing debounce), drumming earns the rapid track ("Drumroll..."), a contemplative single click after a long pause earns the patient one. The conversation is capped at five replies; at "Okay, time to go!" the introduction leaves with its exit choreography — content settles down to the rule, the rule retracts to its middle, one small ink-square blip (the gateway's action square, not a circle — circles here mean controls), gone. An easter egg with an ending. The same conversation runs in the wide tier's margin intro.

### Cards (case studies)

- **Shape:** `{rounded.panel}`, hairline `{colors.rule}` border, stock fill, **no shadow at rest and no lift on hover**.
- **Hover:** border shifts to the client accent, matching the chrome buttons and carousel chevrons. The accent is doing identification work — it is the client's card.
- **Internal padding:** 32px.

### Inputs (login)

A centred stack with a left-aligned underline field — no box, no fill, transparent background with a 1px bottom border matching the masthead hairline's measure. The password label sits snug with the field, not with the title.

- **Header:** `<header>` containing `<h1 class="logo-name">` and subtitle.
- **Divider:** 1px `{colors.ink}` hairline matching the width of the display name.
- **Field:** left-aligned underline, no box, no fill, transparent background with a 1px bottom border, with 8px baseline clearance under the input text.
- **Focus:** bottom border to accent. No glow, no ring.
- **Notice:** quiet situational Caps Lock notice (`Caps Lock is on`) sitting flush-left below the line without displacing layout.
- **Submit:** filled accent button, mono label (`Continue`), 44px minimum.
- **Error:** one calm sentence in the system UI face (`That didn’t match. Please try again.`), directly beneath the field with matching margins. Carried by copy and position, per The No-Hue-For-State Rule.

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
