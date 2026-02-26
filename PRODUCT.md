# Product Specification

KC Wolff-Ingham's portfolio is a high-impact, interactive digital presence for a senior design leader. It is designed to demonstrate both strategic depth and technical fluency.

## Core Features

### 1. Interactive Resume (Home Page)
The primary landing experience is a "living" resume document.
- **Editorial Hero Section:** A clean, high-contrast introduction with smooth fade-in animations.
- **Popovers (Hotspots):** Inline links (e.g., `<hotspot key="x">`) that trigger detailed context overlays with images, stats, and quotes.
- **Scroll Annotations:** On wide screens (≥1400px), key hotspots automatically reveal themselves as margin annotations as the user scrolls, providing a rich, "magazine-style" experience.
- **Marginalia Preview (Widen Hint):** On standard desktop screens (1024px-1399px), an elegant "Expand for Marginalia" hint appears. It provides a subtle "nudge" animation as the user scrolls past hotspots, signaling that more content is available in a wider view.
- **JSON-Driven Content:** The entire resume content is managed via `src/content/resume.json` and `src/content/popovers.json`.

### 2. Case Studies
Deep dives into major projects, each with a custom thematic style while sharing a common layout.
- **Truist:** Digital banking platform transformation.
- **Sparks Grove:** Design leadership and agency work.
- **Upwave:** Digital health venture.

### 3. Responsive Experience
- **Desktop:** Full "magazine" layout with margin annotations.
- **Tablet:** Clean document view.
- **Mobile:** Optimized "bottom-sheet" popovers for high-fidelity mobile interaction.

## Target Audience
- Executive recruiters and hiring managers.
- C-Suite leadership in Product, Tech, and Design.
- Industry peers looking for design leadership benchmarks.
