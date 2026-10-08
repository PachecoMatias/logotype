# Public Site Redesign — Stage 1

## Objective

Replace the public Logotype site and seven-step configurator presentation with a distinctive editorial experience while preserving all academic content and every existing business contract.

## Problem and Why

The current public experience does not yet communicate the craft expected at a university exhibition. The redesign must make the company narrative and working prototype memorable without drifting into generic AI-generated or SaaS visual conventions.

## Scope

- Public home: header, hero, company, objectives, organization chart, services, problem and solution, functional prototype, infrastructure, conclusions, and footer.
- Seven-step project configurator: Empresa, Proyecto, Problema, Funcionalidades, Alcance, Presupuesto, Resumen.
- New scoped `site-` and `cfg-` styles and purposeful Framer Motion behavior.
- Product, visual-direction, responsive, build, and navigation evidence for this stage.

## Explicitly Out of Scope

- Requests panel, request detail, AI analysis, backlog, Kanban board, story modal.
- Backend, API calls, payload shape, validation rules, and business state.
- Push, pull request creation, merge, or changes on `main`.

## Constraints

- Work on `redesign/public-site` under `frontend/`, except Impeccable and ODD development artifacts at repository root.
- Preserve all existing academic content and Spanish voseo.
- Do not modify shared panel tokens or classes in `frontend/src/index.css`.
- No stock photography, generic placeholders, Tailwind, UI libraries, or typography-only dependencies.
- Use `MotionConfig reducedMotion="user"`, `whileInView` with `once: true`, and prioritize transform/opacity motion.

## Delivery Strategy

- Strategy: `single-pr` on the dedicated `redesign/public-site` branch; no push or PR is authorized in this session.
- Forecast: approximately 1,200–2,000 authored lines across two cohesive UI work units plus documentation. The scope is intentionally one stage and will remain one branch for the user's browser review.
- Native review boundary: each work-unit commit, subject to the repository's RDD mode and native assessment.

## Tasks

- [x] **PSR-1 — Establish product and visual direction**
  - Route: direct inline for product truth and tool-owned direction artifacts; delegated writer for implementation preparation.
  - Trigger evidence: the design implementation spans multiple non-trivial components and scoped styles, so subsequent writes require one bounded writer.
  - Acceptance: `PRODUCT.md`, code-first Impeccable setting, selected direction contract, and exact protected boundaries are recorded.
  - Checks: artifacts read back; branch confirmed as `redesign/public-site`.
  - Evidence: `PRODUCT.md` records audience, purpose, protected business contracts, brand commitments, responsive targets, and accessibility requirements. `.impeccable/config.json` records the code-first build path. `.impeccable/surfaces/frontend-src-app-jsx.md` records the selected `a5d1895f` “living release sheet” direction and protected boundaries. Branch inspection confirmed `redesign/public-site` before implementation.
- [x] **PSR-2 — Redesign the public site**
  - Route: delegated direct.
  - Trigger evidence: more than two non-trivial public components and new scoped CSS.
  - Acceptance: all public academic sections remain present; editorial identity, responsive composition, purposeful motion, header/footer navigation, configurator entry, and footer panel access work.
  - Checks: focused build; structural readback; desktop/mobile visual inspection.
  - Evidence: public composition rebuilt across the header, hero, company, objectives, organization chart, services, problem/solution, functional prototype, infrastructure, conclusions, and footer with scoped `site-` classes in `frontend/src/styles/site.css`. Every public text collection remains sourced from `company.js` and `content.js`; panel/configurator conditionals and handlers remain unchanged. Motion foundation is `MotionConfig reducedMotion="user"`; viewport reveals run once, the hero registration axis is scroll-linked, and controls use restrained hover/tap transforms. Responsive rules cover 375px, 768px, and 1280px without fixed page-width overflow. Production build passed. The implemented system pair is Franklin Gothic Medium/Arial Narrow for display and Trebuchet MS/Segoe UI for reading, using local system fonts only. Browser screenshot inspection remains intentionally assigned to PSR-4. Work-unit commit: `652ac8d` (`feat(frontend): redesign public site`).
- [x] **PSR-3 — Redesign the seven-step configurator**
  - Route: delegated direct.
  - Trigger evidence: multiple step components, progress UI, summary, transitions, and scoped CSS.
  - Acceptance: seven steps keep their order, payload and validations remain byte-for-behavior compatible, progress is responsive, transitions do not cause layout jumps, and summary clearly reflects entered values.
  - Checks: focused build; source contract comparison; desktop/mobile visual inspection.
  - Evidence: configurator presentation rebuilt with dedicated `cfg-` classes and `frontend/src/styles/configurator.css`; desktop keeps the seven-step horizontal register visible and mobile collapses it to “Paso N de 7” with a smoothly scaled progress line. All steps use guided Spanish voseo copy, semantic labels, visible selection/focus/error states, bounded `AnimatePresence` transitions, and restrained button/card motion under the root reduced-motion configuration. The review summary now exposes every entered value, including the current process and the conditional “Otro” values. Source-boundary comparison confirmed no changes to `projectOptions.js`, `validation.js`, or `utils/api.js`; `stepKeys`, validator order, `projectData`, `/api/proyectos`, POST JSON body, expected 201 status, and restart assignments remain unchanged. Production build passed. Browser responsive inspection remains pending for PSR-4; work-unit commit identity remains pending the parent transaction-controller commit.
- [ ] **PSR-4 — Close integrated quality evidence**
  - Route: delegated verification plus parent spot check.
  - Trigger evidence: full production build and responsive/browser checks would inflate the parent context.
  - Acceptance: build succeeds; 375px, 768px, and 1280px show no horizontal scroll; home/configurator/panel navigation works; panel presentation remains unchanged; Impeccable detector and finish review are resolved or reported exactly.
  - Checks: `npm run build`, responsive captures, navigation smoke test, protected-diff audit.
  - Evidence: pending.

## Progress

- Active task: PSR-4.
- Running authored line count: `652ac8d` plus the pending PSR-3 work unit.
- Reviewed boundary: branch point at `3b45b1b`.

## Next Step

Run integrated PSR-4 browser, navigation, responsive, protected-diff, detector, and finish-review evidence without changing protected panel behavior.
