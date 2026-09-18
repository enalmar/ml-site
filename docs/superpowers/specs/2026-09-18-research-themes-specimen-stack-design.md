# Research themes as a specimen cross-section

**Date:** 2026-09-18
**Status:** Approved, ready to build
**Replaces:** the four-card grid in `#research` (`index.html`, `.cards` / `.card`)

## Problem

The four research themes sit in a generic 4-up card grid. Every other device on the
page is bespoke — the strain-rate ruler, the citation chart, the flip cards — so the
grid reads as filler on a site that is otherwise hand-built.

The section's own argument is that *interfaces decide whether a structure survives an
impact*. The replacement should make that argument rather than sit next to it.

## Constraint that shapes the solution

The strain-rate ruler sits directly above, in the same section. It is horizontal,
hover-driven, and built from pills on stems. The new component must differ in axis and
in interaction grammar, or the section reads as two versions of one trick.

## The component

A hand-drawn SVG cross-section of a real bonded joint, seen edge-on, beside a reading
panel. Top to bottom:

| Band | Theme | Contents |
|---|---|---|
| Titanium adherend | *(context, not selectable)* | machining marks |
| Adhesive bondline | Adhesive interfaces | scattered irregular voids |
| CFRP laminate | Aerospace composites | ~6 undulating plies, ply cracks, one delamination sliver |
| Printed lattice | Additive manufacturing | open cells, porosity at strut junctions |

### The fourth theme

"Defects and data" is not a layer — it is a property of all of them. It gets no band.
Selecting it rings every void and crack in all three layers at once and separates the
whole stack, where the other three isolate a single band. The one selection that lights
up everything, because that is what it is.

Forcing it into a band would be the same dishonesty that ruled out the
traction–separation concept: a mapping a specialist reader would see through.

## Interaction

- At rest the joint is assembled and quiet; one theme is preselected so the panel is
  never empty.
- Selecting a band opens a gap at its interfaces: bands above translate up, bands below
  translate down, the selected band holds still. This is literally delamination.
- Non-selected bands drop to `opacity: .55`. In the defects state all bands stay lit and
  spread symmetrically.
- Hover over a band and selection follows the pointer; leaving keeps the last selection,
  so there is no flicker and no empty state. One `setActive(key)` serves click, keyboard
  and hover.

## Structure and accessibility

A standard tab pattern:

- `role="tablist"` of four real `<button>`s, absolutely positioned over the figure at
  `--y` fractions matching their band centres. The buttons *are* the band labels, so
  nothing is duplicated.
- Four `role="tabpanel"` regions; only the active one is shown.
- Roving tabindex, `ArrowUp`/`ArrowDown`, `Home`/`End`.
- The SVG is `aria-hidden` decoration driven by `data-active` on the container, with
  transparent hit rects giving pointer users the diagram directly — the same dual
  approach `.cites` already uses.

## Visual rules

- Tokens only. No new hue: voids render as negative space in the page ground with a dark
  rim, which is what a void physically is. Interface hairlines use `--accent-deep` and
  brighten when the adhesive band is selected.
- The organic quality comes from hand-placed bezier control points, not a repeating
  sine. Plies undulate by differing amounts; voids are irregular ellipses at scattered
  positions.
- Bands assemble on first scroll-in via `IntersectionObserver`, matching `.cites.is-in`.
- `prefers-reduced-motion`: no assemble, no travel — selection becomes a contrast change
  only.

## Responsive

Below 800px the overlay is abandoned. The SVG becomes a short full-width strip that
stays live as a legend, and the four themes become a plain accordion beneath it. An
exploded diagram is unusable on a phone.

## Cost and placement

One markup block replacing `.cards` (`index.html:184–236`); ~120 lines appended to
`style.css`; ~50 lines of vanilla JS in the existing inline block. The now-dead
`.cards` / `.card` rules (`style.css:277–287`) are removed. No dependencies, no build
step — consistent with the rest of the site.

## Out of scope

Theme copy is unchanged; it was revised in the same session under the site change spec.
