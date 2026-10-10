# Editorial Motion System Upgrade

## Objective

Elevate the whole public site to the Hero's motion quality and eliminate the
remaining flicker in scroll reveals and configurator step changes, without
changing colors, layout, or content.

## Problem

- Section titles only fade in; the rest of the site reads far below the Hero.
- Scroll reveals flicker: `whileInView` animated the element back to its hidden
  state as it left the viewport (a visible reverse animation), and the same
  machinery double-fired where reveals were nested.
- The attempted replay-safe viewport calibration did not solve the real browser
  flicker. Large blocks and titles can still return to `hidden` during scroll,
  so threshold tuning is no longer an accepted solution.
- The configurator step change flickered: `AnimatePresence mode="wait"` left an
  empty stage between exit and enter, and the entering `.cfg-step` ran a second
  full fade on top of the outer transition (a remount + double animation).

## Why

The Hero is the authored set piece; every other section must feel like it
belongs to the same studio. Flicker during scroll and step changes breaks the
premium feel and reads as jank.

## Scope

- In: `frontend/src/motion/*`, `frontend/src/components/common/SectionTitle.jsx`,
  the site sections' reveal wiring, `frontend/src/components/Hero/Hero.jsx`,
  `frontend/src/components/ProjectConfigurator/ProjectConfigurator.jsx`,
  `ProgressBar.jsx`, `SuccessMessage.jsx`, and the added `.split-text` CSS.
- Out: colors, layout, copy, data, configurator payload/validation/API, panel.

## Constraints

- transform + opacity only (clip-path allowed for compositor-friendly masks).
- 60 FPS, no layout shift, no flicker.
- Respect `prefers-reduced-motion` with a meaningful alternative.
- Do not change colors, layout, or content.
- No new dependencies.

## Motion thesis

Focal moment stays the Hero construction sequence and runs once on mount. Public
internal content is stable and visible by default: titles retain word-level
editorial markup, but sections, cards, diagrams, and copy do not wait for scroll
observation or pass through hidden states. Configurator navigation uses spatial
continuity without opacity fades or exits.

T11 safe layer: with the stable baseline preserved, motion is added only where
it explains feedback, state, or continuity. Feedback is CSS-only (hover, focus,
press) on interactive controls; the configurator progress markers ease between
future/current/complete states; teal verified/live dots carry a slow pulse that
never touches text; the step accent bar draws on entry; and the Hero keeps its
mount-only focal sequence with a text-clip swapped for a transform reveal.

## Tasks

- [x] T1 Flicker root cause: instant reset on leave.
      `revealVariants` hidden + `Stagger` hidden now carry `transition: { duration: 0 }`;
      Hero, OrganizationChart, SystemPrototype and ProblemSolution local trees use a
      `RESET = { duration: 0 }` on every hidden state.
- [x] T2 Editorial titles: `SplitText` word-mask reveal added; `SectionTitle` uses it
      and delays the subtitle (`delay + 0.16`).
- [x] T3 `SplitText.jsx` written with a clip-path mask (units consistent so the mask
      interpolates) and a reduced-motion fade fallback; `.split-word` CSS added.
- [x] T4 Configurator fluidity: `AnimatePresence mode="wait"` removed from the step
      swap; the incoming step now mounts with an object-based entrance
      (`opacity`+`x`, `DURATION.state`) and the outgoing step unmounts immediately.
- [x] T5 Instant reset applied to ProgressBar-adjacent trees, OrganizationChart and
      SystemPrototype (`ProgressBar`/`SuccessMessage` are mount-only, no reset needed).
- [x] T6 Infrastructure node now scales in with its card (subtle diagram motion).
- [x] T7 Verify: see Verification.
- [x] T8 DESIGN.md Motion paragraph updated to the shipped truth.
- [ ] T9 Stabilize real-browser motion. Replace replaying section/title reveals
      with one-shot entrances, prevent mounted content from returning to
      `opacity: 0` or a clipped mask, remove nested/double viewport triggers,
      verify the configurator uses one entrance per step, and leave the worktree
      uncommitted for user browser QA. Route: delegated direct (multi-file motion
      architecture correction). Implementation and source checks are complete;
      checkbox remains pending until user browser QA.
- [x] T10 Remove public scroll reveals. Browser QA rejected the one-shot
      `whileInView` architecture as still unstable. Make internal sections,
      titles, stagger groups, and supporting diagrams visible by default with no
      viewport observer, hidden state, exit animation, clip mask, or scroll
      reset. Keep only a stable mount animation in the Hero and safe
      microinteractions. Keep configurator steps visible with transform-only
      navigation. Route: delegated direct (multi-file motion simplification).
      User confirmed the current version no longer flickers; stability is now
      the accepted baseline to preserve.
- [ ] T11 Safe animation layer over the stable version (`/impeccable animate`,
      code mode). Add only flicker-proof motion: CSS hover/focus/active
      transitions on interactive controls (nav links, buttons, chips, options,
      inputs, summary edit), a smooth transition on the configurator progress
      markers, a purposeful live-state pulse on the teal verified/live dots, a
      decorative accent-bar draw on step entry, and a Hero timing polish that
      swaps the text clip-path reveal for a transform reveal. No `whileInView`,
      no `AnimatePresence`, no exit animations, no resets to hidden, no
      `opacity: 0` on visible sections/titles, no clip-path on text, no masks
      that can hide content. Main content visible from first render. Route:
      delegated direct (multi-file CSS + Hero motion). Implementation and
      automated source/build verification here; checkbox remains pending until
      user browser QA.
- [ ] T12 Professional one-shot section reveals (`/impeccable animate`, code
      mode), using Panda Digital Pro only as a conceptual timing reference. Add
      one shared `IntersectionObserver` for public sections and the footer:
      arm pending state synchronously before paint, reveal title, description,
      then internal blocks with restrained stagger, unobserve on first entry,
      and never restore pending state. CSS defaults remain visible so reduced
      motion, unsupported observers, and script failure cannot hide content.
      Configurator intro and keyed steps use mount-only choreography rather than
      viewport observation; options remain legible throughout and the parent
      step transition stays horizontal with no exit phase. Route: delegated
      direct (shared hook, app wiring, reveal wrappers, CSS, configurator).
      Automated checks may complete here; checkbox remains pending until user
      browser QA confirms zero flicker and clearly perceptible entrances.
      Browser QA found the first implementation stable but visually ineffective:
      the observer watched padded section boxes, so transitions could finish
      before their titles entered the viewport, while public/configurator
      staggers were too compressed. Correct T12 without changing its one-shot
       architecture by observing existing title/footer-inner trigger nodes,
       keeping state on the owning section/footer, and increasing safe
       opacity/translation deltas and 80–140ms sequencing. No commit is
       authorized for this correction.
- [x] T13 Shared/public Framer Motion system. Route: `delegated direct`;
      trigger evidence: multi-file write. Replace the T10-T12 observer-only
      architecture with the latest explicitly requested one-shot Framer Motion
      design: shared parent/child variants, `Reveal`, `RevealGroup`,
      `SectionReveal`, decorative bounded `Parallax`, header and Hero motion,
      staged public sections, interactive feedback, and scroll progress. Every
      viewport entrance is one-shot and transform/opacity-only. Acceptance:
      public content keeps the current visual design and copy, all
      `whileInView` usage includes `viewport={{ once: true, amount: 0.3 }}` (or
      the exact shared equivalent), no Framer/CSS transform ownership conflict
      remains, obsolete native observer wiring is removed, and the production
       build passes. Test-first exception: this is a visual-only motion migration
       with no meaningful deterministic RED; use bounded source-contract checks
       before/after and a production build. Delivery: `single-pr` on the
       user-named feature branch `redesign/public-motion`; no push requested.
       Evidence: commit `f5e8af4` (`feat(frontend): orchestrate public site
       motion`).
- [x] T14 Configurator Framer Motion continuity. Route: `delegated direct`;
      trigger evidence: multi-file write. Use keyed `AnimatePresence
      mode="wait"` directional step transitions, mount-driven child cascades,
      transform-based progress fill, a shared-layout current marker, animated
      validation feedback, and a scale/check-draw success entrance. Acceptance:
      there is no viewport observation inside the configurator, reduced motion
      renders complete content without spatial movement, progress never animates
      width, and payload/API/state/validators remain byte-for-byte behaviorally
      unchanged. Test-first exception: this is a visual-only motion migration
       with no meaningful deterministic RED; use bounded source-contract checks
       before/after and a production build. Delivery: `single-pr` on
       `redesign/public-motion`; no push requested. Evidence: commit `d9b19fc`
       (`feat(configurator): animate directional step continuity`).
- [x] T15 Bounded independent-verifier correction. Route: `delegated direct`;
      trigger evidence: multi-file motion correction. Remove all scoped infinite
      animations, make configurator mount groups explicitly transition from
      `hidden` to `visible`, represent public title → subtitle → content ordering
      through nested parent/child variants, normalize shared/Hero entrances to
      the motion contract, add one-shot reduced-motion-safe counters for real
      prototype and infrastructure values, remove reduced-motion header scaling,
      normalize chip press feedback, and recheck transform ownership. Acceptance:
      scoped sources contain no `Infinity`/`infinite`; counters preserve exact
      visible formatting with one-shot amount `0.3`; configurator uses no viewport
      observation; shared/Hero entrances use `[0.22, 1, 0.36, 1]`, 0.5–0.8s and
      24–40px translation where spatial entrance applies; reduced motion has no
      spatial travel; protected contracts remain unchanged. Test-first exception:
      this is a visual-only correction with no meaningful deterministic RED;
      use bounded source scans and a production build. Source correction, bounded
       checks, and the production build are complete after the user explicitly
       authorized temporary generated `frontend/dist` output; generated files
       remain unstaged. Correction evidence is contained in commits `f5e8af4`
       and `d9b19fc`.

### Latest architecture supersession

T13-T14 supersede only the obsolete architecture constraints in T10-T12 that
forbade `whileInView` and `AnimatePresence`, required a native
`IntersectionObserver`, or prohibited an exit phase. Their history and browser
findings remain evidence. The latest user contract instead requires one-shot
Framer viewport reveals on the public site and `AnimatePresence mode="wait"`
only for configurator step continuity. The accepted no-flicker outcome remains
a quality constraint, not an implementation constraint.

### T13-T14 exact authorized edit surface

`odd/tasks/editorial-motion-system.md`; `frontend/src/App.jsx`;
`frontend/src/main.jsx`; `frontend/src/motion/{variants.js,Reveal.jsx,RevealGroup.jsx,SectionReveal.jsx,Parallax.jsx,SplitText.jsx,tokens.js,useOneShotReveal.js}`;
`frontend/src/components/common/{AnimatedSection.jsx,SectionTitle.jsx}`;
`frontend/src/components/{Header/Header.jsx,Hero/Hero.jsx,Company/Company.jsx,Objectives/Objectives.jsx,OrganizationChart/OrganizationChart.jsx,Services/Services.jsx,ProblemSolution/ProblemSolution.jsx,SystemPrototype/SystemPrototype.jsx,Infrastructure/Infrastructure.jsx,Conclusions/Conclusions.jsx,Footer/Footer.jsx}`;
`frontend/src/components/ProjectConfigurator/{ProjectConfigurator.jsx,ProgressBar.jsx,SuccessMessage.jsx,StepCompany.jsx,StepProject.jsx,StepProblem.jsx,StepFeatures.jsx,StepScope.jsx,StepBudget.jsx,ProjectSummary.jsx,Chip.jsx,OptionCard.jsx}`;
`frontend/src/styles/{site.css,configurator.css}`. Panel, detail, board, story
modal, backend, API, validation rules, payload shape, business state, shared
`index.css`, `DESIGN.md`, and hidden tool/config directories are excluded.

## Acceptance criteria

The criteria below through the historical verification record describe the
earlier iterations. For T13-T14, the latest acceptance criteria recorded in
those tasks and in Latest architecture supersession take precedence wherever
they conflict with observer-only or no-exit language.

- No flicker during scroll or step change.
- Public sections may use one-shot viewport entry only through the shared native
  observer; after first intersection the visible state is irreversible for that
  mount and the node is immediately unobserved.
- CSS defaults remain visible. Pending opacity/transform styles exist only after
  the supported observer is armed synchronously before paint; reduced motion and
  unsupported observers never receive pending state.
- Each section reveals title, description, and internal blocks in order without
  clipping or masking text, nested observers, exits, or scroll replay.
- The Hero is the only authored content entrance and uses mount animation rather
  than viewport observation; decorative scroll linkage cannot hide content.
- Configurator steps change fluidly with no double animation.
- Configurator intro and keyed step descendants animate on mount only; options
  stay legible and the stage never renders an empty fade frame.
- Public triggers cannot complete their sequence before the corresponding title
  enters the viewport; the visible order is title, description, then blocks.
- Public and configurator repeated items use perceptible 80–140ms staggering,
  with partially visible initial content and no empty frame.
- `npm run build` passes; no color/layout/content changes.

## Verification

- T1-T8 historical verification:
- `npm run build` OK twice: 434 modules, `dist/assets/index-BAFyAoom.css` 73.97 kB,
  `dist/assets/index-BjlZ01KT.js` 342.60 kB; `frontend/dist` reverted after each build.
- `git diff --check` clean (LF→CRLF warnings only).
- Impeccable detector: only the expected `codex-grid-background` advisory on the
  intentional blueprint grid (site.css); no new findings from the changes.
- No color/layout/content changed: edits are motion props only plus one `.split-word`
  rule (`display: inline-block`) and the DESIGN.md Motion paragraph.
- Runtime visual capture is not available in this environment (headless Chrome does
  not advance rAF under `--dump-dom`); reveal correctness rests on the code-level
  guarantees above.
- Craft-floor note: the Hero stays the single focal sequence; titles share one
  editorial voice while each section keeps a distinct body reveal.
- T9 build: `npm run build` OK, 434 modules;
  `dist/assets/index-BvsFpC6C.js` 337.21 kB and tracked `frontend/dist` reverted.
- T9 `git diff --check`: clean (LF→CRLF warnings only).
- T9 detector: the existing blueprint-grid advisories remain in `site.css:192`
  and `configurator.css:108`; neither line was changed by T9 and no new finding
  was introduced.
- T9 source contract: shared viewport tokens are `once: true`; all inspected
  public `whileInView` paths use those one-shot tokens or one-shot defaults; no
  scoped section/title path uses `once: false`. The configurator has one keyed,
  transform-only incoming transition and no step/option opacity entrances or
  conditional `AnimatePresence` exits.
- T9 manual visual verification remains pending. No browser PASS is claimed.
- T10 `npm run build`: OK, 434 modules;
  `dist/assets/index-BAFyAoom.css` 73.97 kB and
  `dist/assets/index-DDJEoeGm.js` 332.05 kB. Generated `frontend/dist` changes
  were reverted and untracked build output cleaned.
- T10 `git diff --check`: clean (LF-to-CRLF warnings only).
- T10 detector: only the existing intentional blueprint-grid advisories remain
  at `site.css:191` and `configurator.css:108`; no new finding was introduced.
- T10 source contract: zero `whileInView` matches under `frontend/src`; zero
  `AnimatePresence` matches in the configurator; zero hidden, opacity-zero,
  clip/mask matches in shared motion or configurator sources. The remaining
  component matches belong only to the authorized Hero mount sequence; the
  Header is default-visible and neither surface observes the viewport.
- T10 user confirmation: the user reported the current version no longer
  flickers and asked to preserve that stability as the T11 baseline.
- T11 verification:
  - `npm run build` OK, 434 modules; generated `frontend/dist` reverted from the
    repo root and untracked build output cleaned.
  - `git diff --check` clean (LF to CRLF warnings only).
  - Detector: only the two pre-existing intentional blueprint-grid advisories
    (`site.css` ~191, `configurator.css` ~108); no new finding.
  - Source contract: zero `whileInView`; zero `AnimatePresence`; the only
    `clipPath` in `frontend/src` is `Hero.jsx` `fieldIn` on the decorative
    `aria-hidden` grid field (no text). Hero text reveals are transform+opacity.
  - Reduced motion: `site.css` block now gates `animation-duration` and
    `animation-iteration-count`; the `configurator.css` block was completed with
    `animation-iteration-count: 1` to match, so the new live pulses stop.
  - T11 manual visual verification remains user-owned. No browser PASS is
    claimed and the checkbox stays open until user QA.
- T12 verification:
  - `npm run build` OK, 435 modules (the new hook adds one module); generated
    `frontend/dist` was reverted and untracked output cleaned.
  - `git diff --check` clean (LF to CRLF warnings only).
  - Detector: only the two pre-existing intentional blueprint-grid advisories
    (`site.css:198`, `configurator.css:109`); no new finding.
  - Source contract: exactly one native `IntersectionObserver`; zero
    `whileInView`, `AnimatePresence`, or exit props; hook cleanup only
    disconnects/cancels pending frames and never resets reveal state. The only
    remaining `clipPath` is Hero `fieldIn` on its decorative `aria-hidden`
    field.
  - Reduced-motion and unsupported-observer paths never receive pending state;
    configurator reduced motion also clears animation delay and forces one
    near-instant iteration.
  - T12 manual browser verification remains pending. No visual PASS is claimed,
    and the checkbox remains open until the user confirms zero flicker.
- T12 bounded correction verification:
  - `git diff --check` completed without whitespace errors; only the existing
    LF-to-CRLF worktree warnings were emitted.
  - `npm run build` passed with 435 modules; Vite emitted
    `dist/assets/index-0HAVW88k.css` (81.44 kB) and
    `dist/assets/index-BnSRD1qD.js` (333.03 kB).
  - The three required `rg` source checks could not run because `rg` is not
    installed in this environment. Scoped source searches found no
    `whileInView`, `AnimatePresence`, exit prop, exact opacity-zero, clip-path,
    or mask match in the requested paths, and found the sole native observer
    constructor in `useOneShotReveal.js`.
  - Manual browser QA remains required for entrance timing and perceptibility;
    T12 remains unchecked. No commit was made, per the user request.
  - Independent verification passed the external production build (435 modules),
    structural source checks, reduced-motion review, and a parent
    `git diff --check` spot check. Native risk assessment was unavailable because
    the intentionally dirty worktree contains undeclared untracked files; no
    review candidate was started because the user has not authorized the
   required work-unit commit.
- T13 verification:
  - Pre-change source contract found the shared native observer in
    `useOneShotReveal.js`, its `App.jsx` wiring, CSS `data-reveal-state`
    choreography, and no active Framer viewport reveals.
  - Removed the observer import/wiring and deleted `useOneShotReveal.js` only
    after confirming its sole import was `App.jsx`; removed the matching CSS.
  - Added shared variants and the `Reveal`, `RevealGroup`, `SectionReveal`, and
    decorative bounded `Parallax` primitives. Public `whileInView` paths all use
    one-shot viewport configuration with amount `0.3`.
  - `npm run build` passed from `frontend/`: 437 modules;
    `dist/assets/index-DIGMsKxI.css` (79.09 kB) and
    `dist/assets/index-C7X5nn0W.js` (334.33 kB).
  - Browser viewport and reduced-motion visual QA remain pending; no visual PASS
    is claimed.
- T14 verification:
  - Added directional keyed `AnimatePresence mode="wait"` transitions with
    reduced-motion-safe zero spatial offset, retained the stage min-height, and
    used mount-driven `RevealGroup` cascades without viewport observation.
  - Progress continues to animate `scaleX`, now with the shared soft spring; the
    current marker uses `layoutId="cfg-current-step"`. Validation messages enter
    with opacity/short y motion, and success uses a bounded scale entrance plus
    SVG `pathLength` check draw.
  - Source inspection preserved the validator array/order and exact POST body
    `JSON.stringify(projectData)`; no validation, payload, API, or business-state
    source was edited.
  - `npm run build` passed from `frontend/`: 438 modules;
    `dist/assets/index-DRqqMCXX.css` (75.78 kB) and
    `dist/assets/index-BMhv72AP.js` (339.73 kB).
  - Browser checks at 375/768/1280 and reduced motion remain pending because no
    browser tooling was used; no visual PASS is claimed.
- T13-T14 final bounded verification:
  - `git diff --check` completed without whitespace errors; it emitted only the
    worktree's LF-to-CRLF warnings.
  - Public viewport scan found every `whileInView` path bound to
    `VIEWPORT_ONCE = { once: true, amount: 0.3 }` and found no `once: false`.
  - Scoped motion-prop scan found no animation of `width`, `height`, `top`,
    `boxShadow`, or `clipPath`. The success check's requested SVG `pathLength`
    draw is the only non-transform/opacity motion value.
  - `AnimatePresence mode="wait"` occurs only in
    `ProjectConfigurator.jsx`; configurator descendants contain no
    `whileInView` usage.
  - `git diff --exit-code` confirmed no changes to `validation.js`,
    `projectOptions.js`, or `utils/api.js`; the validator order and exact POST
    body `JSON.stringify(projectData)` remain present.
  - `git diff --cached --name-only` returned empty, proving panel/backend files
    and all other files are unstaged.
  - The single Impeccable detector pass reported only the two historical
    `codex-grid-background` advisories in `site.css:219` and
    `configurator.css:109`; no new finding was reported.
  - Production builds generated `frontend/dist` changes outside the authorized
    commit surface. They remain unstaged for the parent to discard without
    touching the source work units.
- T15 bounded correction verification:
  - Scoped `Infinity|infinite` scan returned no matches after replacing the
    configurator loading loop with a finite 0.8s fill and making both live dots
    static.
  - `RevealGroup` mount mode now explicitly sets `initial="hidden"` through the
    `viewport || mount` branch and animates to `visible`; configurator callers
    remain `viewport={false}` and contain no viewport observation.
  - Public sequencing now uses nested parent/child staggering: `SectionReveal`
    stages the whole `SectionTitle` group before its content group;
    `SectionTitle` stages whole-title then subtitle children; content groups
    stagger their own items without loose item delays. `sectionItemVariants` was
    removed, scoped clip-mode callsites were removed, and unknown reveal modes
    now explicitly resolve to `rise`.
  - Shared/Hero source uses `MOTION_EASE = [0.22, 1, 0.36, 1]`, durations
    0.5/0.64/0.8s, and 24–40px spatial entrance offsets. The explicit short
    validation-error exception remains 0.24s/8px.
  - Added `AnimatedCounter.jsx`; SystemPrototype numeric statistics and all four
    infrastructure values now count from zero on first entry with
    `VIEWPORT_ONCE`, preserve prefixes/suffixes/grouping, reserve final width,
    and render final text immediately for reduced motion.
  - Reduced-motion CSS removes the header compact transform and configurator
    accent-bar transform animation. Chip press feedback is now `0.98`.
  - Scoped CSS inspection found no hover/transition transform on a
    Framer-managed element. Protected validation/options/API files remain
    unchanged and the staging area is empty.
  - The required final Impeccable detector pass reported only the two historical
    `codex-grid-background` advisories (`site.css:233`,
    `configurator.css:109`).
  - Production build: passed exactly once after the user explicitly authorized
    generated `frontend/dist` output. Vite transformed 439 modules and emitted
    `dist/assets/index-C9FJylwC.css` (75.76 kB) and
    `dist/assets/index-CpONQhGI.js` (345.65 kB) in 2.73s. Generated output remains
    unstaged; no source correction or rebuild was required.
  - Browser viewport/reduced-motion QA was not executed; no visual PASS is
    claimed.

## Delivery decision

`single-pr`: the user named the existing feature branch
`redesign/public-motion` and requested no push. Reviewability is preserved with
two work-unit commits when each unit verifies: shared/public motion first,
configurator motion second.

## Progress

T1-T8 were implemented and build-verified. Browser QA rejected both the replaying
viewport architecture and T9's one-shot `whileInView` correction. T10 removed
public scroll reveals and is source/build verified; the user then confirmed the
result no longer flickers, so that stable state is the accepted baseline. T11
added a flicker-proof microinteraction layer. T12 now adds progressive one-shot
section entrances through a shared irreversible observer and mount-only
configurator choreography. Current browser QA accepts the zero-flicker baseline
but rejected T12 visibility: the section-edge observer fired too early and the
stagger was too compressed. The bounded correction now observes title and
footer-inner triggers while retaining state on deduplicated section/footer
owners, and increases safe partial-opacity deltas and repeated-item sequencing.
T12 remains open for browser QA. No commit was made; do not commit until the
user completes QA and explicitly authorizes it. That final T12 instruction is
historical and is superseded by the user's explicit authorization for T13-T14
on the current feature branch. T13-T14 are now the active implementation units.
T13 and T14 are source/build verified, and final bounded contract checks plus
the single Impeccable detector pass are recorded above. Browser QA and the two
parent-owned work-unit commits remain pending. T15 source corrections, bounded
checks, detector pass, and production build are complete; generated build output
remains unstaged and browser QA remains pending.
