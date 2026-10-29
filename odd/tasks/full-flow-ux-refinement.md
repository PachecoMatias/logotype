# Full Flow UX Refinement

Objective: refine the client intake, confirmation, admin guided survey, AI opinion, backlog, and AI-error surfaces while preserving the existing blueprint/dark system and business contracts. Branch: `feat/ai-advisor`; delivery: `exception-ok` because commits/pushes are explicitly forbidden; forecast: 600–900 authored changed lines. Test runner: focused Node tests plus a temporary Vite build outside `frontend/dist`.

## Specs

### S1 — Client start form

- Increase visual separation and hierarchy around “Cantidad aproximada de usuarios”.
- Make the idea/current-process writing field clearer and more comfortable for long-form reading and writing.
- Functionalities remain a selector/dropdown but are required before the advisor starts, with visible, accessible validation when empty.

### S2 — Client confirmation

- Keep the final screen brief and avoid repeating already collected information.
- HU confirmation must distinguish functionality/topic from story description and show origin/state clearly.
- Preserve “una vista clara, breve y útil para validar antes de enviar”.

### S3 — Admin guided survey and business summary

- “Historias asesoradas” must separate functionality/title from HU description and strengthen origin/state hierarchy.
- “Respuestas relevadas” must visually separate IA question from client answer.
- Remove or drastically reduce “Detalle de solicitud”; replace it with a curated structured summary showing scope, company, key problem, budget, deadline, and other important available data only.

### S4 — Separate AI opinion

- “Opinión de la IA” must no longer be embedded in project detail. Provide a separate panel view opened from a sibling access alongside board/HU views.
- The separate view must prioritize risk, summary, decision keys, and important observations without adding a backend endpoint.

### S5 — Backlog presentation and AI errors

- Hide raw `[BACKLOG ...]` metadata everywhere in UI, including read and edit surfaces; preserve it when editing and present available type/origin/approval as clean badges.
- Keep approved and proposed cards together; do not implement proposal separation.
- Backlog generation and AI analysis provider failures must display exactly: “El servicio de IA no está disponible temporalmente. Intentá nuevamente más tarde.” Never show raw “AI analysis failed” in UI.

### S6 — Design and verification constraints

- Preserve blueprint/dark consistency, keyboard focus, readable contrast, responsive behavior, and current interactions.
- No Framer Motion, visual dependencies, migrations, advisor logic changes, semantic backlog-generation changes, or `frontend/dist` writes.
- Any frontend/backend contract adjustment must be minimal and backward compatible.
- Verify focused frontend/backend tests, temporary build, ESLint, Prettier, and `git diff --check`.

### S7 — Respuestas relevadas agrupadas por HU
- Después de “Historias asesoradas”, “Respuestas relevadas” muestra una lista limpia con el título de cada HU creada y un botón “Ver preguntas y respuestas”.
- Cada modal muestra en la parte superior el título y la descripción completa de la HU, y debajo solo las preguntas/respuestas de esa HU.
- Se conserva el diseño actual de cada bloque pregunta/respuesta, la distinción visual pregunta/respuesta y el aspecto correspondiente.
- Cierre por botón/ícono, Escape y clic fuera; bloqueo del scroll de fondo; scroll interno del contenido; retorno exacto a la posición previa.
- Debe funcionar en desktop y mobile, con el estilo dark/engineering blueprint del panel.

### S8 — Jerarquía visual de “Opinión de la IA”
- Resumen, claves para decidir, señales objetivas, criterios, fortalezas/debilidades, riesgos, información faltante, condiciones, preguntas y supuestos deben diferenciarse visualmente.
- Cada riesgo es un bloque independiente con nombre, descripción, impacto y mitigación claramente separados; se conservan los badges de impacto.
- No cambia el contenido generado por la IA, solo su presentación.

### S9 — Acciones principales al final del detalle
- “Ver opinión de la IA”, “Ver tablero” y “Ver historias de usuario” dejan de estar arriba y aparecen al final del contenido principal del detalle.
- Deben ser más grandes, llamativos, separados y consistentes con el estilo del panel.

### S10 — Compactación vertical y jerarquía de títulos del cliente
- Reducir huecos verticales excesivos arriba y al final de “Asesoramiento de IA”, antes y después de “Resumen del proyecto”, revisando padding, margin, min-height, grids y wrappers sin ocultar contenido.
- Unificar los títulos del formulario del cliente con la jerarquía visual de “Cantidad aproximada de usuarios”, especialmente idea/proceso, funcionalidades, plataformas y tipos de usuario.

### S11 — Estabilidad visual durante scroll en “Opinión de la IA”
- Corregir la causa real del bloque/franja blanca o lateral que aparece al hacer scroll; la vista debe permanecer estable.
- Evitar CSS global que rompa otras vistas; preferir selectores scoped.

### S12 — Verificación acotada
- Tests frontend focalizados para agrupación por HU, modal aislado, contenido completo de IA, riesgos separados, acciones al final, títulos/jerarquía, compactación y ausencia del artefacto de scroll.
- Ejecutar build temporal, Prettier, ESLint aplicable y `git diff --check`.
- Sin commit, push, Gemini real, cambios de lógica, persistencia, contratos, migraciones ni `frontend/dist`.

### S13 — Unified internal-panel visual system
- Use the current “Resumen del proyecto” treatment as the reference for the whole internal admin panel while preserving each section's content and role.
- Apply consistent dark secondary surfaces, borders, radii, accents, spacing, color, and hierarchy to “Asesoramiento de IA”, “Decisión del administrador”, “Opinión de la IA”, “Señales objetivas”, “Criterios”, “Fortalezas”, “Debilidades”, “Riesgos”, “Historias de usuario”, “Backlog”, and equivalent internal sections.
- Preserve the special visual treatment of “Riesgos”; do not flatten every section into an identical card and do not introduce light blocks.

### S14 — Integrated headers, typography, and vertical rhythm
- Section headers must visually belong to their host section and consistently compose eyebrow, main title, description, optional status badge, and decorative accent.
- Enforce a clear role hierarchy: section title, description, block/card title, content, then metadata.
- Keep title/description/content and consecutive major-section spacing compact but clearly separated, without restoring the previous large empty gaps.
- Prevent horizontal overflow and preserve desktop/mobile readability.

### S15 — Cohesive AI Opinion presentation
- Keep content, order, and the current Risks design unchanged.
- Give Summary, decision keys, objective signals, criteria, strengths, weaknesses, and assumptions/missing information a coherent family of dark secondary surfaces, borders, restrained accents, consistent padding, clear titles, and uniform spacing.

### S16 — Kanban visual integration
- Apply the shared panel identity to the board header, columns, column titles, story counters, cards, badges, inter-column spacing, contrast, and existing hover states.
- Preserve all current states, data, drag/drop behavior if present, and interactions; presentation only.

### S17 — Perceptible one-shot entrance motion
- Review `.adm-animate`, `adm-animate--advisor`, `adm-animate--summary`, and equivalent analysis/board/story classes.
- Use approximately one-second CSS entrances with visible but moderate displacement, visible fade, smooth easing, and light stagger between major blocks where appropriate.
- Apply motion to project detail, AI Opinion, populated Kanban, user stories, and relevant major sections.
- Motion is one-shot per mounted view, must not replay on scroll, flicker, use `clip-path`, or leave content hidden if JavaScript fails; respect `prefers-reduced-motion`; do not use Framer Motion.

### S18 — Scope and bounded verification
- Frontend/UI only. Do not touch backend, Gemini, advisor logic, backlog generation, contracts, persistence, migrations, `frontend/dist`, dependencies, or functional refactors.
- Avoid global CSS unless strictly necessary and make no real Gemini call.
- Close with the already-observed temporary frontend compile, a quick active Vite compilation check, and the already-observed `git diff --check`; do not repeat the build or start browser automation.
- Desktop/mobile aesthetics, console behavior inside the panel, perceptible motion, and horizontal overflow remain explicitly pending for the user's manual validation.
- No commit or push.

### S19 — Progressive panel entrances and decision spacing correction

- Correct the internal spacing of “Decisión del administrador” so its heading, eyebrow, title, description, badge, controls, and saved note are not visually compressed by the shared section reset.
- Replace simultaneous whole-view entrances with a mount-triggered progressive sequence across Requests, Project Detail, AI Opinion, Kanban, and User Stories.
- Sequence major blocks only: headings first, then sections, rows, phases, or columns; do not animate individual Kanban cards.
- Preserve CSS-only one-shot behavior, replay on route remount but never on scroll, and disable all entrance motion under `prefers-reduced-motion`.
- Frontend/UI only. No backend, Gemini, advisor, backlog, data, contract, persistence, migration, dependency, `frontend/dist`, commit, or push changes.

### S20 — Runtime diagnosis of invisible panel motion

- Confirm in runtime, not only source, whether `PanelSolicitudes`, `PanelDetalle`, `PanelAnalisis`, `PanelTablero`, and `PanelHistorias` mount a visible root with `adm-view-enter`.
- Capture the root's computed animation name, duration, delay, play state, opacity, transform, active reduced-motion media query, React key, and actual DOM-node replacement across navigation.
- Run and remove one temporary 2000ms proof using opacity `0.1 → 1` and `translateY(80px → 0)`; do not ship it or override an active accessibility preference.
- Keep final non-reduced root motion within 700–900ms, opacity 0.25–0.35 to 1, and 24–32px to 0; keep internal blocks within 650–850ms and 100–130ms stagger.
- Do not add Framer Motion, AnimatePresence, IntersectionObserver, scroll animation, timers, content-hiding hacks, commits, or pushes.

## Tasks

- [x] T1 — S1–S2 — Client start and confirmation UX. Route: delegated in parallel with T3 because edit surfaces are disjoint and both are multi-file behavior units. Commit/push forbidden. Evidence: `AdvisorStart.jsx`, `AdvisorConfirmation.jsx`, `ProjectConfigurator.jsx`, `advisor.css`, `validation.js`; `advisorWorkspace.test.js` + `asesorPayload.test.js` 19/19.
- [x] T2 — S3–S4 — Admin guided-survey refinement and separate AI-opinion view. Route: inline after T3 because it shares `panel.css`; parent owns navigation seams. Commit/push forbidden. Evidence: `PanelDetalle.jsx`, `PanelAnalisis.jsx`, `App.jsx`, `advisorDetail.js`, `panel.css`, `advisorDetail.test.js` 3/3; live Edge audit: summary 13 items, 3 story cards, 18 answer cards, no inline AI opinion, no horizontal overflow at 1440 and 390.
- [x] T3 — S5 — Backlog metadata presentation and AI-error copy. Route: delegated in parallel with T1; exact metadata must round-trip through editing without backend semantic changes. Commit/push forbidden. Evidence: `backlogMetadata.js`, `HistoriaModal.jsx`, `HistoriaEditor.jsx`, `PanelHistorias.jsx`, `api.js`; `api.test.js` + `backlogMetadata.test.js` 9/9; backend `project-backlog-diagnostics.test.js` 8/8.
- [x] T4 — S6 — Cross-surface seam, focused tests, temporary build, responsive/visual inspection, and final evidence. Route: inline; no independent verifier unless a final Risk item applies. Commit/push forbidden. Evidence: frontend 44/44; build OK outside `frontend/dist`; Prettier check OK; ESLint OK with a temporary generic JSX config (repo has no frontend ESLint config); `git diff --check` clean; live desktop/mobile layout audit OK. Screenshots generated; the agent model cannot render images, so aesthetic screenshot review remains for the user.
- [x] T5 — S7 — Group answers by HU and add the isolated answers modal with scroll lock, focus return, Escape, outside click and internal scrolling. Route: inline (shares `panel.css` with T6/T7). Commit/push forbidden. Evidence: `advisorDetail.js` `buildAnswerGroups`, `AdvisorAnswersModal.jsx`, `PanelDetalle.jsx`, `panel.css`; unit test proves exclusive grouping, unmatched bucket and modal contract; live desktop audit: 3 HU groups (6 answers each), modal shows only 1 HU, internal scroll 120 px, Escape and backdrop close, scroll restored from 500 to 500, body overflow restored, no horizontal overflow; mobile 390 px: modal and answers fit, internal scroll works, no horizontal overflow.
- [x] T6 — S8 — Reinforce AI-opinion section hierarchy and render each risk as an independent labeled block. Route: inline (shares `panel.css`). Commit/push forbidden. Evidence: `AnalisisIA.jsx` risk cards with `Descripción`, `Mitigación`, numbered risk and impact badge; `panel.css` risk cards, separators, reading/keys/criteria hierarchy; source contract test; live desktop audit: 3 risk cards, labels and impact badge present.
- [x] T7 — S9–S10 — Move the three navigation actions to the end of detail, enlarge them, compact vertical spacing and unify client form title hierarchy. Route: inline. Commit/push forbidden. Evidence: actions rendered only in `.adm-view-actions` after summary/content, old top links removed, 3 large buttons; `.adm-section`, detail head, advisor, summary and AI spacing reduced; client form labels/legends share `font-family`, 1rem size, accent color and no uppercase; live desktop/mobile audit: actions after summary, single-column on mobile, no horizontal overflow; form title audit: all 5 labels share identical computed hierarchy.
- [x] T8 — S11–S12 — Fix the scroll artifact at its real cause and run focused verification. Route: inline. Commit/push forbidden. Evidence: global `header` rule scoped to `.site-header`; panel body/html dark theme via `useLayoutEffect` body class; live audit at 1440 and 390 px: analysis header `position: static`, topbar stays sticky, body/html `rgb(8, 17, 29)`, no horizontal overflow at scroll 0/300/700/1200; frontend 48/48; temporary build OK outside `frontend/dist`; Prettier default OK on `AdvisorAnswersModal.jsx`, `AnalisisIA.jsx`, `PanelDetalle.jsx`, `advisorDetail.js`; `App.jsx` keeps its pre-existing legacy formatting and was not reformatted; ESLint temporary config OK; `git diff --check` clean.

- [x] T9 — S13–S14 — Establish the shared panel surface/header/type/spacing system across detail, requests, stories, and backlog. Route: inline because all affected views share `panel.css`; no Writer trigger applies. Commit/push forbidden. RED exception: passive visual refinement has no meaningful deterministic behavior failure. Evidence: shared summary-led surface tokens and scoped panel selectors; integrated headers, role hierarchy, moderate section rhythm, rounded dark secondary surfaces, borders, accents, and responsive rules in `panel.css`; presentational class wiring only in panel components.
- [x] T10 — S15 — Unify AI Opinion while preserving content order and protected Risks styling. Route: inline because it shares `panel.css` and `AnalisisIA.jsx` with T9. Commit/push forbidden. Evidence: common section surfaces, typography, padding, gaps, criteria/keys/signals treatment, and integrated article eyebrow; risk markup and impact-specific treatment preserved.
- [x] T11 — S16–S17 — Integrate Kanban visuals and wire perceptible one-shot motion to populated panel views. Route: inline because board and motion selectors share `panel.css`; no behavior changes. Commit/push forbidden. Evidence: board heading, columns, counts, cards, badges, spacing, hover, and populated-board animation classes; CSS entrances use 920–1020ms durations, 30px displacement, visible fade, exponential ease-out, bounded stagger, and reduced-motion cancellation.
- [x] T12 — S18 — Close with bounded technical evidence and explicitly defer aesthetic validation to the user. Route: inline. Commit/push forbidden. Evidence: temporary Vite production build passed (447 modules, 6.48s, output outside `frontend/dist`); Vite dev server remains active with HTTP 200 and empty stderr; previously executed `git diff --check` completed without errors. Desktop/mobile aesthetics, in-panel console behavior, perceptible motion, and horizontal overflow were not automated and remain manual.
- [x] T13 — S19 — Correct the decision-section spacing and replace simultaneous root motion with explicit major-block staggering in the five internal panel views. Route: inline because the correction is bounded, fully understood, and shares `panel.css`; no Writer trigger applies. Commit/push forbidden. Evidence: `.adm-shell .adm-decision` wins over the shared section reset; computed desktop padding is 32px block / 28px inline with 7px eyebrow-to-title, 9px title-to-description, and 20px saved-note separation. Browser runtime inspection observed sequential 80ms–1180ms delays, partial-progress opacity/translation states, route-remount replay, and reduced-motion emulation disabled for the probe. Vite HTTP 200; no application console errors (only missing `favicon.ico`); `git diff --check` completed without whitespace errors, with line-ending warnings only. Native review assessment was unavailable because the accumulated no-commit worktree requires an explicit untracked inventory and cannot isolate this correction without violating the user's no-commit constraint.
- [x] T14 — S20 — Diagnose the actual runtime suppression, prove the mechanism with the temporary extreme animation, retain accessibility behavior, align final non-reduced values, and record concrete runtime evidence. Route: inline because the affected CSS and route roots are already known; no Mapping or Writer trigger applies. Commit/push forbidden. Evidence: unforced visible Edge returned `prefers-reduced-motion: reduce = true`; all five roots carried `adm-view-enter` and distinct runtime React keys, but computed `animation-name: none`, `duration: 0s`, `opacity: 1`, and `transform: none`. Every route transition disconnected the previous root and mounted a different DOM node. The temporary 2000ms proof remained suppressed under the real preference, then progressed from 0.1/80px through 0.544/40.5px to 1/0 under diagnostic no-preference emulation; the proof style was removed and the real preference restored. Final non-reduced root values are 800ms, 0.32→1, and 28px→0; item values remain 780ms with 110ms stagger increments.

## Log

### L1 — Original request — 2026-10-27

```text
Usá ODD. Corrección acotada, directa y sin alargar el alcance.

REGLAS
- Sin commit ni push.
- Sin llamadas reales a Gemini.
- No tocar la lógica ya validada del asesor, la generación semántica del backlog ni migraciones, salvo lo mínimo indispensable para mostrar mejor los datos o mejorar copy/validaciones de UI.
- Prioridad: UX/UI y representación visual.
- Mantener consistencia dark mode en todo el flujo.
- Si necesitás tocar contrato frontend/backend, que sea mínimo y compatible.

OBJETIVO
Mejorar la UX visual del flujo completo:
1) formulario inicial del cliente,
2) confirmación/final del cliente,
3) detalle del proyecto / relevamiento guiado del administrador,
4) backlog,
5) análisis / opinión de IA,
6) mensajes de error de IA.

MEJORAS PEDIDAS

A. FORMULARIO INICIAL DEL CLIENTE
1. Corregir la sección “Cantidad aproximada de usuarios”: está demasiado pegada a la pregunta anterior. Mejorar spacing, separación visual y jerarquía.
2. Mejorar el cuadro/campo donde el cliente describe su idea o proceso actual. Debe verse más claro, mejor diseñado y más cómodo para escribir/leer.
3. Hacer obligatoria la selección de funcionalidades desde el inicio.
   - Debe seguir viéndose con selector/desplegable como ahora.
   - Ya no debe quedar como opcional.
   - Validar visualmente el campo si no se completa.

B. PANTALLA FINAL DEL CLIENTE
4. Simplificar la pantalla final para no repetir información ya relevada.
5. Mejorar el resumen de confirmación de HU:
   - mostrar mejor origen/estado;
   - diferenciar claramente nombre/tema de la HU vs descripción;
   - mejor distribución visual y mejor jerarquía.
6. Mantener una vista clara, breve y útil para validar antes de enviar.

C. DETALLE DEL PROYECTO / RELEVAMIENTO GUIADO (ADMIN)
7. Mejorar la interfaz de “Historias asesoradas”:
   - diferenciar mejor el título/funcionalidad (ej. Gestión de ventas) de la descripción de la HU;
   - reforzar origen/estado si aplica;
   - mejorar colores, espaciado y legibilidad.
8. Mejorar la interfaz de “Respuestas relevadas”:
   - la pregunta debe verse claramente distinta de la respuesta;
   - usar mejor jerarquía visual, spacing, color y layout;
   - que el administrador comprenda rápido qué preguntó la IA y qué respondió el cliente.
9. Sacar “Detalle de solicitud” o reducirlo drásticamente si ya no aporta valor.
10. Después del bloque de relevamiento guiado, mostrar un resumen de los datos empresariales/importantes cargados por el cliente:
   - alcance,
   - empresa,
   - problema clave,
   - presupuesto,
   - plazo,
   - y demás datos importantes estructurados.
   Mostrar solo lo importante, bien distribuido y fácil de escanear.

D. OPINIÓN DE LA IA
11. La “Opinión de la IA” debe pasar a una interfaz separada.
   - No dejarla incrustada como ahora dentro de la misma vista.
   - Debe abrirse desde un botón o acceso similar al de tablero / HU / vistas relacionadas.
   - Diseñarla mejor para que el administrador entienda rápidamente:
     - riesgo,
     - resumen,
     - claves para decidir,
     - observaciones importantes.
   - Mejor distribución, jerarquía y legibilidad.

E. BACKLOG
12. Ocultar completamente el bloque textual `[BACKLOG ...]` de las tarjetas.
   - Esa metadata no debe verse cruda en la UI.
   - Si hace falta, parsearla y mostrar badges/campos visuales limpios.
13. No implementar la separación de propuestas pendientes vs backlog aprobado.
   - Mantener todo junto por ahora.
   - Solo mejorar la presentación visual de tipo/origen/estado si ya existe información disponible.

F. MENSAJES DE ERROR IA
14. En generación del backlog y en análisis de IA, cuando falle el proveedor, mostrar el mensaje:
   “El servicio de IA no está disponible temporalmente. Intentá nuevamente más tarde.”
15. Evitar mensajes técnicos crudos o confusos como “AI analysis failed” en la UI.

CRITERIOS DE DISEÑO
- Mejorar distribución, contraste, jerarquía y escaneabilidad.
- Evitar bloques visualmente densos o repetitivos.
- Mantener coherencia con el estilo blueprint/dark del proyecto.
- No introducir Framer Motion ni nuevas librerías visuales si no hacen falta.
- Si ajustás tipografías, tamaños, gaps o cards, dejá los valores fáciles de ubicar para futuras modificaciones.

VERIFICACIÓN
- Tests focalizados frontend/backend según corresponda.
- Build temporal.
- ESLint.
- Prettier.
- git diff --check.

REPORTE FINAL
1. Qué vistas cambiaste.
2. Qué mejoró en cada una.
3. Si eliminaste o simplificaste “Detalle de solicitud”.
4. Cómo quedó la nueva vista separada de Opinión de IA.
5. Cómo ocultaste `[BACKLOG ...]`.
6. Archivos tocados.
7. Tests y resultados.
8. Riesgo residual.
```

### L2 — Mapping decision — 2026-10-27

- No backend contract is needed for client/admin presentation or backlog metadata badges. Existing payloads already carry the required data.
- “Detalle de solicitud” will be removed as a generic recursive dump and replaced by a curated business summary.
- Raw backlog metadata will be hidden in both read and edit UI while being recomposed unchanged on save.
- The only backend contract adjustment is the existing public AI failure message; status/code/diagnostics remain unchanged.

### L3 — T2 implemented and T4 closed — 2026-10-27

- Removed the recursive `SeccionPayload`/`ValorCampo` dump and the “Detalle de solicitud” eyebrow; detail now shows the guided survey, then a curated 13-item business summary.
- “Historias asesoradas” separates functionality/title, HU description, state chip, and metadata. “Respuestas relevadas” separates the AI question from the client answer with distinct hierarchy.
- AI opinion moved to `PanelAnalisis.jsx` and `App.jsx` view `panel-analisis`, opened from “Ver opinión de la IA” beside “Ver tablero” / “Ver historias de usuario”. No backend endpoint added.
- Automated visual audit against the live Vite + backend: desktop 1440 and mobile 390, no horizontal overflow, summary 5/1 columns, analysis view renders risk/summary/keys/signals/criteria.
- Verification: frontend 44/44; backend diagnostics 8/8 and 12 API integration tests passed before the runner timeout (no failure observed); temporary Vite build OK; Prettier OK; ESLint OK with a temporary generic JSX config because the repo has no frontend ESLint config; `git diff --check` clean.
- Residual: screenshot aesthetics were not reviewed by the agent (model cannot render images); screenshots are available under the temporary opencode folder. Native review remains impractical over this accumulated worktree without a declared untracked inventory.

### L4 — Bounded visual/UX correction — 2026-10-27

Verbatim request:
"Usá ODD. Corrección visual/UX acotada sobre el flujo del panel y formularios. Sin commit ni push. Sin llamadas reales a Gemini. No tocar lógica de negocio, persistencia, advisor engine, backlog semantics ni migraciones. Solo cambios de frontend/UI + tests focalizados.

1. RESPUESTAS RELEVADAS POR HU
En “Asesoramiento de IA”, después de “Historias asesoradas”, no mostrar todas las respuestas relevadas mezcladas de una. Quiero una sección “Respuestas relevadas” organizada por HU: lista con el nombre/título de cada HU creada; cada HU con botón “Ver preguntas y respuestas”; modal/flotante centrado; arriba nombre/título y descripción completa de la HU; debajo solo las preguntas/respuestas de ESA HU; mantener el diseño actual de cada bloque; diferenciar pregunta/respuesta; mantener el aspecto; cerrar con botón/X, Escape y clic fuera si no afecta accesibilidad; bloquear scroll de fondo; scroll interno sin desbordar; estilo dark/blueprint; desktop y mobile; volver exactamente a la posición anterior.

2. OPINIÓN DE LA IA: MEJOR JERARQUÍA VISUAL
Diferenciar resumen, claves para decidir, señales objetivas, criterios, fortalezas/debilidades, riesgos, información faltante/condiciones/preguntas/supuestos. Cada riesgo como bloque independiente, con nombre, descripción, impacto y mitigación claramente separados; mantener badges de impacto; escaneable. No cambiar contenido generado.

3. BOTONES PRINCIPALES DEL DETALLE
Mover Ver opinión de la IA, Ver tablero y Ver historias de usuario al final del contenido principal, debajo de información/relevamiento/resumen; más grandes, llamativos, mejor separados, dark/blueprint, acciones principales.

4. ELIMINAR ESPACIOS VACÍOS GRANDES
Reducir huecos arriba del título Asesoramiento de IA, al final de esa sección, antes y después de Resumen del proyecto. Revisar padding, margin, min-height, height, grids, wrappers, align-items, justify-content. No ocultar contenido.

5. UNIFICAR ESTILO DE TÍTULOS EN EL FORMULARIO DEL CLIENTE
Usar la jerarquía de “Cantidad aproximada de usuarios” para Describí tu idea o proceso actual, Funcionalidades que ya imaginás, Plataformas, Tipos de usuarios del sistema y equivalentes: tamaño, peso, separación respecto del campo anterior y de sus controles, color y jerarquía. No cambiar contenido funcional.

6. BUG VISUAL EN OPINIÓN DE LA IA AL HACER SCROLL
Corregir la causa real del bloque o franja blanca/lateral; no ocultar el artefacto con parche frágil; vista estable durante todo el scroll.

REGLAS: no modificar contenido funcional, contratos, generación de HU/backlog/análisis IA, persistencia, migraciones, frontend/dist; sin dependencias nuevas; sin Framer Motion; responsive; dark mode; evitar CSS global; preferir clases scoped; componentes pequeños si conviene.

TESTS/VERIFICACIÓN: agrupación por HU; abrir/cerrar una HU no afecta otras; las 3 HU actuales muestran solo sus respuestas; Opinión IA conserva toda la información; cada riesgo separado; sin artefacto blanco; botones al final y funcionando; espacios excesivos eliminados; títulos consistentes; responsive sin overflow. Ejecutar tests frontend focalizados, build temporal, Prettier, ESLint aplicable, git diff --check. Reportar cambios por punto, archivos, agrupación, presentación de riesgos, causa/solución del scroll, tests y riesgo residual. Sin commit ni push."

### L5 — Bounded visual/UX correction implemented — 2026-10-27

Implemented T5–T8 inline without touching backend logic, persistence, advisor engine, backlog semantics, migrations, `frontend/dist`, Gemini, commit or push.

Decisions:
- Answers are grouped in `buildAnswerGroups` by `historiaId`, preserving story order and moving orphan answers into a final "Sin HU asociada" bucket.
- The answers UI reuses the existing panel modal shell (`adm-modal*`) with a scoped `adm-modal--answers` layout, internal scrolling and body scroll lock with scrollbar compensation.
- The modal restores the prior scroll position explicitly and returns focus to the triggering element.
- The three project actions live only at the end in `.adm-view-actions`; the old top `.adm-view-links` surface was removed.
- The global legacy `header` rule was narrowed to `.site-header`; panel pages toggle `body.adm-body` in `useLayoutEffect` so the dark background applies before paint.
- Client form headings use one scoped hierarchy derived from `Cantidad aproximada de usuarios`.

Verification evidence:
- `frontend`: `node --test tests/*.test.js` → 48/48 pass.
- Focused `advisorDetail.test.js` → 7/7 pass, including RED before implementation.
- Temporary Vite build → 447 modules, built in 3.25s outside `frontend/dist`.
- Prettier default check → AdvisorAnswersModal.jsx, AnalisisIA.jsx, PanelDetalle.jsx and dvisorDetail.js pass; App.jsx keeps its pre-existing legacy formatting (single quotes, no semicolons) and was not reformatted to avoid a whole-file diff.
- ESLint with a temporary generic JSX config → no findings.
- `git diff --check` → clean.
- Desktop live audit (1440): 3 HU groups, 6 answers each; modal isolates one HU, 6 question/answer blocks, internal scroll 120 px, Escape/backdrop close, scrollY 500 → 500, body overflow restored; actions after summary, 3 buttons; 3 risk cards with description/mitigation; analysis header static, topbar sticky, body/html dark, no horizontal overflow.
- Mobile live audit (390): no horizontal overflow, single-column actions and groups, modal fits viewport with internal scroll, analysis header static, dark body/html.
- Focus return was validated through the modal effect; the automated click was programmatic and therefore did not leave browser focus on the trigger, so the manual focus-return check remains for the user.

Risk: none. The change is scoped UI/CSS plus a narrow header selector; no data, security, public contract, concurrency, delivery or environment surface changed. Shared CSS risk was checked with source contracts and live desktop/mobile audits. No commit or push performed.

### L6 — Unified internal-panel visual correction — 2026-10-27

Verbatim request:

```text
Usá ODD. Corrección visual acotada únicamente al panel interno del administrador.
Sin commit ni push.
Sin llamadas reales a Gemini.
No tocar lógica de negocio, contratos, persistencia, advisor, backlog ni análisis IA.
Solo frontend/UI.
OBJETIVO
Unificar visualmente TODO el panel interno tomando como referencia el diseño que quedó aplicado en “Resumen del proyecto”, porque actualmente cada sección tiene estilos distintos y la interfaz se ve inconsistente.
1. UNIFICAR EL DISEÑO DE TODAS LAS SECCIONES DEL PANEL
Tomar como referencia visual el nuevo diseño de “Resumen del proyecto” y aplicar una estética equivalente al resto de las secciones internas.
Aplicarlo especialmente a:
- Asesoramiento de IA
- Decisión del administrador
- Opinión de la IA
- Señales objetivas
- Criterios
- Fortalezas
- Debilidades
- Riesgos
- Historias de usuario
- Backlog
- cualquier otra sección equivalente del panel
IMPORTANTE:
- mantener el contenido actual;
- mantener el diseño especial de los bloques de “Riesgos”, porque esa parte sí me gusta;
- no convertir todas las secciones en exactamente la misma card, pero sí hacer que compartan la misma identidad visual;
- usar consistentemente bordes, fondos, radios, acentos, separación, colores y jerarquía.
Ahora mismo algunas secciones parecen pertenecer a interfaces distintas. Quiero que todo el panel se perciba como un único sistema visual.
2. MEJORAR TAMBIÉN LOS ENCABEZADOS DE LAS SECCIONES
“Resumen del proyecto” quedó mejorado internamente, pero el bloque del título/encabezado todavía quedó visualmente separado del rediseño.
Corregirlo.
Aplicar un criterio uniforme a todos los encabezados de sección:
- eyebrow/etiqueta superior;
- título principal;
- descripción/subtítulo;
- badge/estado si existe;
- línea/acento decorativo.
Los encabezados deben formar parte visualmente de la card/sección correspondiente y no parecer elementos sueltos.
3. CORREGIR JERARQUÍA DE TAMAÑOS
Actualmente en algunas zonas las descripciones o contenido se ven iguales o incluso más grandes que los títulos.
Corregir la jerarquía tipográfica en TODO el panel:
- título de sección: claramente más importante;
- subtítulo/descripción: menor;
- nombre de bloque/card: intermedio;
- contenido: menor;
- metadata: más pequeña.
Evitar que una descripción tenga más peso visual que el título que la contiene.
4. AGREGAR ESPACIADO ENTRE TÍTULOS Y BLOQUES
En varias partes los títulos aparecen demasiado pegados entre sí o pegados al contenido siguiente.
Agregar separación vertical consistente entre:
- título y descripción;
- descripción y contenido;
- encabezado de una subsección y la siguiente;
- tarjetas consecutivas;
- Criterios / Fortalezas / Debilidades / Riesgos;
- bloques dentro de Opinión de la IA.
No quiero grandes espacios vacíos como antes.
Objetivo:
- que no quede ni demasiado separado;
- ni demasiado pegado.
Buscar un ritmo vertical consistente para todo el panel.
5. MEJORAR ESPECIALMENTE “OPINIÓN DE LA IA”
Esta vista sigue siendo la más inconsistente visualmente.
Actualmente:
- Resumen tiene un diseño;
- Claves para decidir otro;
- Criterios otro;
- Fortalezas/Debilidades otro;
- Riesgos otro.
Unificar visualmente esa vista.
Mantener:
- contenido;
- orden;
- diseño de los riesgos.
Pero hacer que:
- Resumen;
- Claves para decidir;
- Señales objetivas;
- Criterios;
- Fortalezas;
- Debilidades;
- Supuestos/faltantes si existen;
compartan una estructura visual coherente.
Usar cards/bloques con:
- fondo oscuro secundario;
- borde;
- acento lateral/superior;
- padding consistente;
- títulos claros;
- spacing uniforme.
6. APLICAR EL MISMO SISTEMA VISUAL AL KANBAN
El tablero Kanban también debe adoptar esta nueva identidad visual.
Mejorar:
- encabezado del tablero;
- columnas;
- títulos de columnas;
- contador de historias;
- cards;
- badges;
- separación entre columnas;
- contraste;
- hover si ya existe.
Mantener completamente la funcionalidad actual del Kanban.
No cambiar:
- estados;
- drag/drop si existe;
- lógica;
- datos.
Solo presentación visual.
7. SECCIONES DEMASIADO PEGADAS
Después de la corrección anterior para eliminar huecos grandes, ahora algunas secciones quedaron demasiado juntas.
Ajustar el spacing global del panel.
Debe existir una separación visual clara entre bloques principales como:
- Asesoramiento de IA
- Resumen del proyecto
- Decisión del administrador
- Acciones “Continuar”
- bloques internos de Opinión IA
- Kanban
- Historias
No volver a introducir los grandes huecos anteriores.
Quiero un punto intermedio:
compacto, pero claramente separado.
8. ANIMACIONES: ACTUALMENTE NO SE PERCIBEN
Las animaciones implementadas prácticamente no se ven.
Revisar la implementación actual de:
- .adm-animate
- adm-animate--advisor
- adm-animate--summary
- y clases equivalentes de análisis/tablero/historias.
Hacer que las animaciones de entrada sean claramente perceptibles.
Quiero:
- duración aproximada de 1segundo;
- desplazamiento visible pero moderado;
- fade visible;
- easing suave;
- stagger leve entre bloques principales cuando corresponda.
No usar Framer Motion.
IMPORTANTE:
- one-shot;
- no replay al hacer scroll;
- no flicker;
- no clip-path;
- no ocultar permanentemente contenido si falla JS;
- respetar prefers-reduced-motion;
- evitar animaciones demasiado rápidas.
Aplicarlas a la entrada de:
- detalle del proyecto;
- Opinión de la IA;
- tablero Kanban;
- historias de usuario;
- secciones principales relevantes.
9. CONSISTENCIA GENERAL
Al terminar, revisar el panel completo y asegurarse de que:
- todos los títulos tengan jerarquía consistente;
- todas las cards tengan una identidad visual común;
- los fondos sean coherentes;
- no aparezcan bloques claros;
- no haya secciones demasiado pegadas;
- no haya huecos excesivos;
- los colores accent sean consistentes;
- no haya overflow horizontal;
- desktop y mobile mantengan buena lectura.
RESTRICCIONES
- No tocar backend.
- No tocar Gemini.
- No tocar lógica del advisor.
- No tocar generación del backlog.
- No tocar contratos.
- No tocar persistencia.
- No tocar migraciones.
- No modificar frontend/dist.
- No agregar dependencias.
- No usar Framer Motion.
- Evitar CSS global salvo que sea estrictamente necesario.
- No hacer refactors funcionales.
- No commit ni push.
VERIFICACIÓN
No pierdas tiempo ejecutando suites largas.
Solo:
- levantar/verificar que el frontend compile;
- revisar visualmente desktop;
- revisar visualmente mobile;
- comprobar que no haya errores en consola;
- comprobar que las animaciones ahora sean claramente visibles;
- git diff --check si es rápido.
AL FINAL REPORTAR
1. Qué sistema visual común aplicaste.
2. Qué secciones modificaste.
3. Qué cambiaste específicamente en Opinión de la IA.
4. Qué cambiaste en Kanban.
5. Cómo ajustaste spacing entre secciones.
6. Qué duración/movimiento tienen ahora las animaciones.
7. Archivos tocados.
8. Riesgo residual.
Sin commit ni push.
```

### L7 — Mapping and route decision — 2026-10-27

- CodeGraph lazy initialization was attempted and failed because the `codegraph` executable is unavailable in PATH; bounded filesystem inspection was used as the documented fallback.
- The current summary (`.adm-summary*`) is the visual reference. Protected risk blocks remain unchanged in structure and retain impact-specific treatment.
- The current CSS animation is 680–780ms and misses the populated Kanban, requests, and whole detail view; the correction will stay CSS-only and mount-triggered.
- PRODUCT/DESIGN panel exclusions and the old no-entrance-motion note are superseded for this panel-only continuation by the user's explicit request; `adm-` scoping remains authoritative.
- T9–T12 stay inline because the work shares `panel.css`; no parallel Writer trigger applies. No commit or push will be created.

### L8 — Verification stop and manual visual handoff — 2026-10-27

```text
Continuá únicamente desde el estado actual.

Los cambios visuales ya están implementados y el build ya pasó correctamente.

No vuelvas a modificar la UI.
No rehagas las tareas T9–T11.
No vuelvas a levantar navegadores ni hagas una auditoría visual automatizada larga.
No repitas el build.

Vite ya quedó levantado correctamente con:

vite-ready=200

Quiero que cierres la tarea con lo que ya tenés.

Hacé únicamente:

1. Verificá rápidamente que no haya un error de compilación activo en Vite.
2. Ejecutá `git diff --check` solo si necesitás confirmar el resultado final.
3. Actualizá el documento ODD marcando como terminadas las tareas que realmente se completaron.
4. No marques como verificación visual automatizada algo que no llegaste a comprobar.
5. Indicá que la revisión estética final queda para validación manual del usuario.

Después dame el reporte final con:

- cambios realizados;
- archivos tocados;
- resultado del build;
- resultado de git diff --check;
- qué verificaciones visuales quedaron pendientes de revisión manual;
- riesgo residual.

Sin nuevos cambios de código.
Sin commit.
Sin push.
Sin llamadas a Gemini.
```

### L9 — T9–T12 closed with bounded evidence — 2026-10-27

- No UI source changed after the user's stop instruction; only this ODD document and its Engram mirror were updated for closure.
- Active Vite check: `http://127.0.0.1:5173` returned HTTP 200; stdout reports Vite 5.4.21 ready in 677ms; stderr is empty.
- Existing build evidence: `vite build --outDir C:\Users\Susana Horia\AppData\Local\Temp\opencode\logotype-admin-visual-build-20261027 --emptyOutDir` transformed 447 modules and completed in 6.48s outside `frontend/dist`.
- Existing `git diff --check` completed without errors; only line-ending warnings were printed.
- No automated desktop/mobile aesthetic audit was completed. In-panel console behavior, perceptible motion, and horizontal overflow remain for manual user validation.
- No commit, push, dependency install, or Gemini call was performed.

Risk: none under the ODD high-risk list. Residual visual risk remains because final desktop/mobile aesthetics, runtime console behavior inside each panel view, animation perception, and horizontal overflow were not manually validated by the agent after the stop instruction.

### L10 — Progressive panel entrance correction — 2026-10-27

- Root cause of the compressed decision section: `.adm-shell section { padding: 0; }` overrode the lower-specificity decision padding. The scoped `.adm-shell .adm-decision` selector now restores deliberate spacing without changing other sections.
- Root cause of the simultaneous entrance: one `.adm-view-enter` animation moved the complete route subtree, while a descendant rule explicitly disabled every `.adm-animate` animation. The descendant cancellation and obsolete animation classes were removed.
- Added `.adm-enter-item` with explicit `--adm-enter-order` values. Each major block uses a 780ms entrance, starts at 28% opacity and 24px downward displacement, and receives `80ms + order × 110ms` delay. The route root keeps a restrained 600ms supporting settle.
- Runtime evidence at approximately 340ms showed earlier blocks already progressing while later blocks remained at their initial state. Detail replayed after returning from AI Opinion because the keyed route remounted; no scroll observer, timer, or external animation dependency was introduced.
- Verified Project Detail, AI Opinion, Kanban, and User Stories in the active browser runtime; Requests wiring was checked in source through its heading, list header, and row order. `prefers-reduced-motion` disables both root and item animation.
- Impeccable detector reported only pre-existing protected side-tab warnings and the user-protected blueprint grid advisory; no matching design changes were made.
- Receipt-driven assessment could not produce a scoped candidate: the accumulated no-commit worktree contains unrelated tracked and untracked work and requested an explicit untracked selection for the whole workspace. No review was started and no inventory was guessed.
- No backend, Gemini, logic, data, contract, persistence, migration, dependency, `frontend/dist`, commit, or push change was made.

### L11 — Continuation authorization — 2026-10-27

```text
Continue if you have next steps, or stop and ask for clarification if you are unsure how to proceed.
```

Risk: none under the ODD high-risk list. Residual risk is limited to subjective motion preference and final mobile aesthetic review by the user.

### L12 — Runtime motion diagnosis — 2026-10-27

- The exact runtime cause is the active operating-system/browser reduced-motion preference. In the unforced visible Edge session, `window.matchMedia('(prefers-reduced-motion: reduce)').matches` returned `true`.
- `.adm-view-enter` was present on every visible root. Runtime React keys were `panel-solicitudes`, `panel-detalle-5`, `panel-analisis-5`, `panel-tablero-5`, and `panel-historias-5`.
- Navigation did remount correctly: for every measured transition, the old root became disconnected and the new root was a different DOM node.
- The suppressing rule is `@media (prefers-reduced-motion: reduce) { .adm-view-enter, .adm-enter-item { animation: none !important; } }`. Computed styles under the real preference were `animation-name: none`, `duration: 0s`, `delay: 0s`, `opacity: 1`, and `transform: none`.
- A runtime-only 2000ms proof used opacity `0.1→1` and `translateY(80px→0)`. It remained suppressed under the actual preference. Under diagnostic no-preference emulation, it measured 0.153/75.3px at 117ms, 0.544/40.5px at 987ms, and 1/0 at 2000ms. The injected style was removed and the actual preference restored.
- Accessibility was not bypassed. The final non-reduced rule now uses the requested 800ms, opacity `0.32→1`, and `translateY(28px→0)`; blocks retain 780ms duration and delays of 80ms plus 110ms per order.
- No component structure, design, dependency, backend behavior, commit, or push changed.

Risk: none under the ODD high-risk list. With reduced motion active, entrance animations intentionally remain disabled.
