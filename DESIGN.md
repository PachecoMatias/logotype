---
name: Logotype
description: A living release sheet that registers project intent into working software.
colors:
  bone-ground: "#eee9dc"
  paper-field: "#f8f4e8"
  structural-ink: "#171713"
  muted-ink: "#625f55"
  structural-line: "rgba(23, 23, 19, 0.24)"
  signal-vermilion: "#f04424"
  live-chartreuse: "#c8ff31"
  subdued-on-dark: "#d7d2c6"
  future-step: "#8f8c84"
  error-ink: "#a82410"
  error-field: "#fff0ec"
typography:
  display:
    fontFamily: '"Franklin Gothic Medium", "Arial Narrow", sans-serif'
    fontSize: "clamp(3.1rem, 7vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Franklin Gothic Medium", "Arial Narrow", sans-serif'
    fontSize: "clamp(2.7rem, 6vw, 5.5rem)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Franklin Gothic Medium", "Arial Narrow", sans-serif'
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif'
    fontSize: "1rem"
    lineHeight: 1.55
  label:
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 800
    letterSpacing: "0.04em"
rounded:
  structural: "0"
  registration-circle: "50%"
spacing:
  hairline-gap: "10px"
  control-inline: "16px"
  component: "24px"
  section-compact: "32px"
  field: "48px"
components:
  button-public-primary:
    backgroundColor: "{colors.live-chartreuse}"
    textColor: "{colors.structural-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "11px 16px"
    height: "46px"
  button-configurator-primary:
    backgroundColor: "{colors.signal-vermilion}"
    textColor: "{colors.paper-field}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "12px 18px"
    height: "50px"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.structural-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "11px 16px"
    height: "46px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.structural-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.structural}"
    padding: "13px 14px"
    height: "52px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.structural-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.structural}"
    padding: "9px 14px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.live-chartreuse}"
    textColor: "{colors.structural-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.structural}"
    padding: "9px 14px"
    height: "44px"
  progress-register:
    backgroundColor: "{colors.structural-ink}"
    textColor: "{colors.paper-field}"
    typography: "{typography.label}"
    rounded: "{rounded.structural}"
    padding: "24px 32px 20px"
    height: "auto"
---

# Design System: Logotype

## Overview

**Creative North Star: "The Living Release Sheet"**

Logotype treats a software proposal as a release proof in motion: information is registered, aligned, connected, and marked complete. The visual world combines the structural honesty of prepress artifacts with software architecture diagrams, using typography, rules, connectors, registration marks, and state color instead of stock imagery or decorative chrome.

The public site is the expressive Persuade surface. It uses architectural typography, full-width color fields, asymmetric composition, and varied editorial pacing to make the academic narrative memorable. The configurator is the calmer Operate expression of the same system: each answer becomes another registered layer of the project brief, while the progress rail and final summary make state explicit.

**Key Characteristics:**

- Bone and paper reading fields interrupted by committed near-black, vermilion, or chartreuse regions.
- Oversized compressed uppercase display type paired with a humanist system reading stack.
- One-pixel structural rules, square controls, registration axes, nodes, and connectors.
- Signal vermilion for decisions and acid chartreuse for live, selected, complete, or successful states.
- Purposeful transform-and-opacity motion with reduced-motion handling at the application root.

## Colors

The palette behaves like a proofing system: neutrals carry content, vermilion records decisions, and chartreuse confirms live state.

### Primary

- **Signal Vermilion** (`signal-vermilion`): decisive actions, registration axes, active annotations, required marks, and saturated narrative fields.

### Secondary

- **Live Chartreuse** (`live-chartreuse`): selected options, completed progress, success marks, live indicators, and the public primary action.

### Neutral

- **Bone Ground** (`bone-ground`): primary page ground and neutral hover field.
- **Paper Field** (`paper-field`): quieter reading surfaces, form workspace, and light text over dark or vermilion fields.
- **Structural Ink** (`structural-ink`): primary text, dark fields, borders, and architectural lines.
- **Muted Ink** (`muted-ink`): secondary explanatory copy on light fields.
- **Structural Line** (`structural-line`): lower-emphasis dividers where a full ink rule would be too strong.
- **Subdued on Dark** (`subdued-on-dark`): secondary copy over near-black fields.
- **Future Step** (`future-step`): inactive configurator progress labels.
- **Error Ink / Error Field** (`error-ink`, `error-field`): recoverable form and submission error treatment.

**The State Color Rule.** Vermilion means decide or attend; chartreuse means selected, live, complete, or successful. Do not swap those meanings for decoration.

**The Full-Field Rule.** Saturated colors may own whole sections or controls. Do not dilute them into scattered ornamental accents.

## Typography

**Display Font:** `"Franklin Gothic Medium", "Arial Narrow", sans-serif`  
**Body Font:** `"Trebuchet MS", "Segoe UI", sans-serif`

**Character:** The display stack is compressed, forceful, and architectural; the body stack is open and humanist enough for academic explanation and guided form copy. Both are local system stacks, with no font network dependency.

### Hierarchy

- **Display** (800, `clamp(3.1rem, 7vw, 6rem)`, 0.86): public section headings; uppercase and tightly composed.
- **Hero Wordmark** (900, `clamp(6.4rem, 17vw, 15.5rem)`, 0.66): public first-viewport signature only; one outlined layer creates registration depth.
- **Headline** (900, `clamp(2.7rem, 6vw, 5.5rem)`, 0.9): configurator step prompts and major completion states.
- **Title** (800, `1.35rem`, 1): option titles, organizational nodes, and compact interface headings.
- **Body** (`1rem`, 1.55): reading copy and form guidance, generally constrained between 46ch and 67ch.
- **Label** (800, `0.68rem`–`0.78rem`, `0.025em`–`0.14em`, uppercase): controls, progress, codes, and metadata.

**The Compression Rule.** Display text may be tight and uppercase; body text must remain conventionally spaced and readable. Never apply display compression to paragraphs or form values.

## Layout

The public shell is fluid with a maximum width of 1380px and 48px total viewport inset, reducing to 32px below 760px and 24px below 480px. Public sections use vertical padding from `clamp(88px, 11vw, 168px)`. Their internal composition alternates asymmetrical two-column grids, 12-column spans, ruled lists, and full-width color fields rather than repeating equal cards.

The configurator uses a 1280px maximum shell with the same 48px desktop inset, reducing to 32px below 820px and 20px below 520px. Its workspace is a single bordered field. A sticky horizontal seven-step register remains visible on desktop; below 820px it becomes a compact “Paso N de 7” label and a three-pixel progress line. Form and summary grids collapse to one column at that breakpoint, while actions stack below 520px.

Public breakpoints are 1080px, 760px, and 480px. Configurator breakpoints are 820px and 520px. Responsive rules convert composition rather than merely shrinking it: navigation becomes a menu, hero and narrative grids stack, the system sidebar becomes horizontally scrollable, and multi-column infrastructure and summary structures collapse.

**The Continuous Sheet Rule.** Adjacent material should read as one evolving document. Use shared edges, rules, and field changes instead of isolated floating panels.

## Elevation & Depth

The system is flat by default. Hierarchy comes from field color, overlap, line weight, and spatial scale—not stacked shadows. Shadows are restricted to small status nodes and the protected floating panel-access control: `0 3px 10px rgba(94, 125, 0, 0.28)`, `0 3px 10px rgba(130, 180, 0, 0.22)`, `0 3px 10px rgba(83, 112, 0, 0.28)`, and `0 8px 24px rgba(23, 23, 19, 0.24)`.

**The Flat-by-Default Rule.** Do not add ambient card shadows. A shadow is reserved for a live/status point or a control that must remain visibly above the document.

## Shapes

Rectangles and controls use square corners (`0` radius). One-pixel rules are the dominant enclosure and divider language; two- and three-pixel strokes are reserved for active underlines, the registration axis, or focus emphasis. Circles appear only as registration targets and status nodes (`50%` radius), never as generic icon containers.

Outlined and filled states share the same geometry so state changes feel like proof marks being applied, not components changing families. The public hero's split outlined wordmark, crosshair success mark, and connected organization nodes are signature forms.

## Components

### Buttons

- **Shape:** square, one-pixel border, uppercase compact label, minimum height of 46px publicly and 50px in the configurator.
- **Public primary:** chartreuse field with structural-ink text and `11px 16px` padding.
- **Configurator primary:** vermilion field with paper text and `12px 18px` padding.
- **Secondary / line:** transparent field with a one-pixel current-color border.
- **Hover / tap:** restrained two-pixel translation and 0.98 tap scale through Framer Motion; focus uses a three-pixel visible outline.
- **Disabled:** remains legible at 0.4 opacity and does not animate.

### Chips

- **Style:** square, one-pixel structural-ink border, `9px 14px` padding, and a minimum 44px touch height.
- **State:** transparent at rest; chartreuse when selected. The leading plus/check state marker uses vermilion.

### Cards / Containers

- **Corner Style:** square; do not introduce rounded card shells.
- **Background:** bone, paper, near-black, vermilion, or chartreuse according to narrative/state role.
- **Shadow Strategy:** flat by default; use the documented exceptions only.
- **Border:** one-pixel structural rules create tables, organization nodes, option matrices, and summaries.
- **Internal Padding:** typically 24px–34px, expanding responsively in major narrative fields.

### Inputs / Fields

- **Style:** transparent field, no side or top border, one-pixel ink baseline, square corners, `13px 14px` padding, and 52px minimum height.
- **Focus:** baseline changes to vermilion and the field receives the bone ground; the global focus-visible outline remains available for keyboard navigation.
- **Error:** error-ink text below the field; submission-level errors use the error field with a one-pixel current-color border.

### Navigation

Public and configurator headers are sticky 72px ruled bars, reducing to 64px on the smallest breakpoint. Wordmarks use the display stack with the `/TYPE` fragment in vermilion. Public navigation uses compact uppercase labels, a ruled hover state, and a vermilion action. Below 1080px it becomes a grid menu; below 480px it becomes one column. The configurator keeps only wordmark and close action so the task remains focused.

### Registration Progress

The configurator's near-black progress register is sticky below the header. A three-pixel chartreuse line scales from the left; complete labels become chartreuse, the current label remains paper with a vermilion underline, and future labels use the future-step neutral. Mobile replaces the seven labels with the current step name and “Paso N de 7.”

### Motion

The root `MotionConfig` uses `reducedMotion="user"` and the standard exponential ease `[0.16, 1, 0.3, 1]`. Public reveals use `whileInView` once, typically over 650ms. Configurator step transitions use 320ms horizontal offsets of 28px; progress uses 450ms scaleX movement. CSS reduced-motion rules reduce animation and transition duration to `0.01ms`.

## Do's and Don'ts

### Do:

- **Do** make color carry state or own a full region.
- **Do** connect related information with one-pixel rules, shared edges, registration marks, and deliberate alignment.
- **Do** vary public section density while keeping the same palette, typography, and line language.
- **Do** preserve keyboard focus, readable contrast, reduced motion, and Spanish voseo across both surfaces.
- **Do** keep the public `site-` system and configurator `cfg-` system scoped away from protected panel styles.

### Don't:

- **Don't** use gradients, glass, decorative blur, stock imagery, or generic icon tiles.
- **Don't** build the page from repeated equal cards or nest cards inside cards.
- **Don't** add rounded SaaS controls or ambient shadows to soften the structural language.
- **Don't** use vermilion and chartreuse interchangeably; their decision/live meanings are fixed.
- **Don't** restyle the internal panel through public or configurator selectors.
