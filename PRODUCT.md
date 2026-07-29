# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: executive recruiters and hiring managers**, screening KC against a written role spec for a senior in-house design, product, or innovation leadership position (VP/Head of Design, CDO, Chief Innovation).

Their situation: they open a private link once, usually on a laptop, usually alongside other candidates, with limited time. Their job is to decide two things quickly — does this person clear the bar for the spec, and will the claims survive a reference check.

Secondary audiences, confirmed but not ranked above the primary:

- C-suite (CEO, CIO, CPO) making the final call — evaluating judgment and business outcomes, not craft artifacts.
- Founders and operators considering fractional or advisory help.
- Industry peers using the work as a leadership benchmark.

## Product Purpose

A private, password-gated credential document for Karl-Christian ("KC") Wolff-Ingham, used to advance conversations toward a senior in-house leadership role.

It is not a marketing site. It is unindexed (`robots.txt` disallows all, plus `robots: noindex`) and gated behind `SITE_PASSWORD`, reaching readers only through a link KC sends deliberately. Success is a single outcome: the reader moves KC forward to a conversation.

## Positioning

Two claims a neighbouring candidate could not truthfully copy:

1. **Thirty years of documented, timestamped technology foresight.** A March 1993 dissertation arguing the internet's importance, filed one month before the Mosaic browser shipped; back-propagation built into HyperCard as an undergraduate; mobile AR on pre-iPhone Nokia hardware; wearables before the Apple Watch; strategic foresight a CEO called "instrumental" to a $66B merger. Not one lucky call — a repeated, dated pattern.
2. **A twice-proven transformation playbook.** Nascent design functions taken to 30-plus-person multidisciplinary organizations at two Fortune 500s (Truist, GPC), with impact stated in terms finance validated.

The site's own mechanism is also positioning: **the résumé is the interface.** Evidence is attached to the claim it supports, in the margin beside it, rather than filed in a separate portfolio the reader has to go find.

## Operating Context

- Distribution is a private link, sent to named people. The gate is audience control, not confidentiality — all published content is cleared for sharing.
- Typically read once, in a single sitting, on a laptop.
- The recruiter workflow the design must serve: skim for scope, scale and tenure → probe two or three specific claims → decide.
- The résumé document itself is the artifact under evaluation, so its craft is read as a work sample.

## Capabilities and Constraints

- **Stack:** Astro 7, `output: 'server'`, Vercel adapter.
- **Auth:** site-wide middleware gate on `SITE_PASSWORD`; fail-closed with `503` when the variable is absent; constant-time cookie comparison; full security-header set.
- **Content model:** `resume.json` and `popovers.json` are the résumé database; each case study is a self-contained JSON file indexed by `manifest.json` and rendered through a type-dispatching section component.
- **Annotated terms:** 20, enforced strictly 1:1 against their notes at build time. All use an underline; the nine authored project destinations additionally carry a semantic case-study icon when enabled for the environment.
- **Reading tiers:** margin notes at ≥1420px (derived from sheet + gutter + column, deliberately under a 1440px laptop); a bottom sheet below that. No content is unreachable at any width.
- **Marginalia discovery:** between 600px and the wide tier, an in-flow header above the masthead invites readers to widen the browser and shows their progress toward revealing the margin columns. It collapses after the 1420px threshold is crossed.
- **Feature flag:** `CASE_STUDY_LINKS` controls which case-study links reach the client, filtered server-side, so studies can be published incrementally.
- **Build gate:** `npm run verify` validates schemas, hotspot mapping, and every media path; the build fails on a broken reference. Prettier, ESLint, Astro diagnostics, and 200 unit tests cover formatting, types, interaction engines, content schemas, navigation restoration, password visibility, icons, and the auth gate.

**Resolved — the headline now matches the objective.** The masthead read _"Fractional product & design leadership,"_ which disagreed with the confirmed goal of a senior in-house role and with the primary reader being an executive recruiter. It now reads _"Design leadership at the intersection of product, technology and business."_ Fractional and advisory work remains a secondary audience; it is no longer what the headline offers.

## Brand Commitments

- **Name:** "KC Wolff-Ingham" as the display name; "Karl-Christian Wolff-Ingham" as the formal one.
- **The marginalia concept is binding.** KC has stated explicitly that the ability to dig deeper into the person, in the margin, is the point of the piece. It is not open to replacement.
- **Copy is authored.** Strings in `resume.json` and `popovers.json` are KC's own words. Do not rewrite, embellish, or add claims without asking.

## Evidence on Hand

Real, in the repository:

- **8 case studies** — Truist ($66B merger, C-suite foresight), Sparks Grove/Delta (news.delta.com), Upwave (Turner venture), Two Way TV (interactive television platform), Armchair Manager (live fantasy sports and BAFTA nomination), FusionFall (behavioral design and Self-Determination Theory), CNN Magic Wall (technology strategy and weather), and Felix the Cat (CD-i / CD-ROM).
- **20 annotated notes**, 94 images and 4 videos under `public/`.
- **Awards:** Emmy (Outstanding Creative Achievement in Interactive Media), Royal Television Society Award, BAFTA Interactive Entertainment nomination, Webby nomination, Apple Design Project Award.
- **Patents:** two granted US patents in automatic content recognition.
- **Metrics:** $32.8M attributable revenue and 7% add-to-cart lift (GPC, 2025); 0→1M monthly uniques in 8 months (upwave); the $66B SunTrust–BB&T merger; a 10-person team scaled to ~50.

Not for publication:

- `KC_Wolff-Ingham_Career_Toolkit.md` is an internal job-search reference. Its own header states it is **not** intended to be sent to recruiters or employers. Use it as source material only.

Absences future work must not fabricate: there are no testimonials, no named references, no pricing, and no third-party benchmarks on this site.

## Product Principles

1. **The claim carries its own evidence.** Proof sits beside the sentence it supports, never in a separate destination the reader has to go find.
2. **Built for a skim that becomes a dig.** A recruiter must get scope, scale and tenure without clicking anything; depth is available on demand, never required.
3. **Every number must survive a reference check.** Figures stay attributable and stated as they can be defended. No inflation, no rounding up, no borrowed credit.
4. **The document is the work sample.** Its craft is being read as evidence of the candidate's judgment, so execution quality is a product requirement rather than polish.
5. **Nothing is withheld from a narrow viewport.** Wide screens get the simultaneous view; every reader gets all of the content.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Established requirements: full keyboard operation with focus trapping in the note panel; 44×44px minimum touch targets; `prefers-reduced-motion` honored throughout; and — because the interface palette is achromatic — no information is ever carried by colour alone.
