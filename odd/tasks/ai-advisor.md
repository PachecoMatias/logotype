# AI requirements advisor

Build a stateless, public requirements-advisor round engine in three user-defined units. Branch: `feat/ai-advisor`. Delivery: one commit per unit, no push, `frontend/dist` excluded. Unit 1 route: inline (the repository map was delegated because the required pre-write reading exceeded the inline evidence budget; no writer trigger applies). Test runner: Node test runner through focused backend npm commands only. Forecast: Unit 1 is expected to exceed 400 authored lines because the required endpoint, pure engine, provider boundary, protections, and focused tests form one indivisible user-requested commit; delivery strategy: `exception-ok` under the explicit one-commit-per-unit constraint.

## Specs

### S1 — Product model and ownership

- Replace the current late AI interaction with an **"ASESOR de IA que, desde la idea del cliente, arma historias de usuario (HU) y le hace preguntas guiadas, UNA funcionalidad por vez, hasta que el cliente confirma."**
- The backend is stateless: **"el cliente envía el estado completo en cada ronda. No se guarda la conversación (sin migración)."**
- **"El CÓDIGO decide el foco, las preguntas pendientes y cuándo termina; GEMINI solo redacta preguntas, actualiza HU y sugiere mejoras."**
- One round makes one Gemini call and asks about one focused HU only.
- HUs are independent; ordering is represented by `etapa`.
- A client-edited or client-created locked HU is never rewritten by AI.
- Editable aspects per HU: `quien_la_usa`, `beneficio`, `comportamiento`, `datos_previos`, `volumen`, `restricciones`.
- Detail at most 6 functionalities per session; later ones use `aDetallar=true`.
- Return at most 4 questions, 2 suggestions, and 12 total HUs.
- Never provide prices, deadlines, viability, commitments, minimum budgets, capacity, or team details.

### S2 — Editable configuration and safe public context

Create `backend/src/config/advisor-config.js`, with editable comments, exporting:

- `aspectos`
- `topeFuncionalidades=6`
- `maxPreguntasPorRonda=4`
- `maxSugerenciasPorRonda=2`
- `maxHistorias=12`
- `maxLargoIdea=3000`
- `maxLargoHistoria=400`
- `maxLargoRespuesta=1600`
- `maxRespuestas=60`
- `maxRondasSesion=15`
- `limiteIp={ventanaMs:3600000, max:40}`
- `contextoPublico`, explicitly projecting only Logotype public services and `fueraDeAlcance` from `company-context.js`; never expose budgets, capacity, or team data, and do not modify `company-context.js`.

### S3 — Public round endpoint contract

Add unauthenticated `POST /api/asesor/ronda` without changing existing endpoints.

Request body:

```text
{ sesionId, cerrar?, estado }
estado = {
  idea,
  datosIniciales: { funcionalidades[], plataformas[], tiposUsuario[],
    cantidadUsuarios },
  historias: [{ id, texto, estado, bloqueada, etapa, aDetallar,
    funcionalidad|null }],
  respuestas: [{ preguntaId, historiaId, aspecto, pregunta,
    respuesta, noSabe, integrada }],
  sugerenciasRechazadas: [string]
}
```

HU states: `entendida | supuesta | editada_cliente | sugerida_ia`.

Uniform success-envelope `data`:

```text
{
  historias: [...lista completa actualizada...],
  foco: { historiaId } | null,
  preguntas: [{ id, aspecto, tipo, texto, opciones[] }],
  sugerencias: [{ id, tipo, texto }],
  progreso: { detalladas, total, completas, tope },
  completo: boolean,
  motivoCierre: 'completo' | 'cerrado_por_cliente' | 'limite' | null
}
```

Question types: `opcion | texto | mixta`; `opcion` and `mixta` carry 2–6 options. Suggestion types: `mejora | complementaria | etapas | definir`.

### S4 — Deterministic server engine

Implement pure, testable functions under `backend/src/services/advisor/`:

1. Validate the complete body and configured sizes with Zod; invalid requests return the uniform 400 envelope.
2. An aspect is covered when any response exists for the HU and aspect, including `noSabe`; an HU is complete when all configured aspects are covered.
3. Preserve array order. Any non-complete HU after the sixth detailed HU becomes `aDetallar=true`. Focus is the first incomplete HU not marked `aDetallar`. Request at most four pending aspects from that focus.
4. `INICIAL`: with no HUs, Gemini creates HUs from idea and initial data, ordered by importance, and asks about the first one. `CONTINUAR`: integrate `integrada=false` answers into unlocked HUs, then ask about the new focus. `CIERRE`: with no focus or `cerrar=true`, integrate pending answers without new questions; if there are no pending answers, do not call Gemini.
5. With `cerrar=true` or session rounds above `maxRondasSesion`, treat pending aspects as assumptions, set `completo=true`, and set `motivoCierre` to `cerrado_por_cliente` or `limite`.
6. Any unlocked HU with a `noSabe` answer becomes `supuesta`, enforced by the server.
7. Gemini may return `duda_critica`. If present and that HU has not previously had a follow-up, return only that text as a question with aspect `aclaracion`, type `texto`, and focus that HU; ignore other generated questions. Ask it only once.
8. Postprocess Gemini output defensively: restore every locked HU text, assign IDs to new items, reject questions for unrequested aspects, apply all maxima, discard repeated/rejected suggestions and invalid items, and fail only when the overall provider structure is unrecoverable.

### S5 — Gemini boundary and prompt

- Reuse the existing gateway.
- Provider response schema remains SIMPLE (`string`, `array`, `object`, `required`; no enums or min/max):

```text
{
  historias:[{id,texto,estado,etapa}],
  preguntas:[{aspecto,tipo,texto,opciones:[]}],
  sugerencias:[{tipo,texto}],
  duda_critica
}
```

- Strict Zod validation follows provider parsing.
- Configure enough `maxOutputTokens` and thinking budget to avoid truncated output, following existing analysis settings.
- Reuse the exact viability-prompt untrusted-zone mechanism: serialized once, UTF-8 byte length, `BEGIN_UNTRUSTED_PROJECT_PAYLOAD_JSON`, payload, and a final standalone `END_UNTRUSTED_PROJECT_PAYLOAD_JSON` marker.
- Every client-authored value (idea, answers, and HU text) belongs inside the untrusted zone. `contextoPublico`, mode, focus, and requested aspects remain outside as trusted data.
- Prompt rules: neutral approachable Spanish, simple nontechnical questions, no repetition, HUs in `"Como [rol], quiero [acción], para [beneficio]"` with at most 30 words, autonomous independent HUs, no edits to locked HUs, concrete evidence-based suggestions limited to Logotype services, no prices/deadlines/viability, and `duda_critica` alone when critical clarification is needed.
- Add deterministic exact-text and adversarial-marker/instruction tests.

### S6 — Protections and public failures

- Enforce an in-memory per-IP limit from `advisor-config` and a per-`sesionId` maximum-call limit, with an injectable clock for tests.
- Exceeded limits return HTTP 429 with `RATE_LIMITED` in the uniform error envelope.
- Gemini quota 429, 5xx, timeout, or irrecoverable JSON returns HTTP 503 with `ADVISOR_UNAVAILABLE`, without internal details, while retaining existing sanitized gateway diagnostics.

### S7 — Required focused proof and delivery

- Gemini is mocked in every automated test.
- Pure logic tests cover aspect coverage, focus, top-six behavior, `aDetallar`, locked-HU restoration, clipping, `supuesta` on `noSabe`, one-time follow-up, and closure.
- Endpoint tests cover `INICIAL`, `CONTINUAR`, `CIERRE` without a provider call, `cerrar=true`, session limit, size validation 400, IP/session 429 `RATE_LIMITED`, provider 503 `ADVISOR_UNAVAILABLE`, and unauthenticated access.
- Run only focused tests, formatting/lint for touched code, and `git diff --check`; do not run the known hanging full suite or fix migration 005 rollback.
- Make at most two real Gemini calls: one initial short hardware-store idea and one continuation. Report only HUs, questions, and suggestions. If credentials or a safe harness are unavailable, report the check as skipped rather than weakening the limit.
- Commit Unit 1 exactly as `feat(advisor): requirements advisor rounds endpoint`; do not push and do not commit `frontend/dist`.

### S8 — Repository conventions found during exploration

- Use ESM, camelCase, Node's test runner, Supertest, factory injection, Zod request middleware, and the established `{ success, data }` / `{ success, error }` envelopes.
- Keep provider JSON schemas simple and local Zod schemas authoritative.
- Mount the advisor router before not-found/error middleware; existing API routes have no authentication middleware.
- No reusable rate limiter or ID helper currently exists, so Unit 1 may add small advisor-local injectable utilities without a dependency or migration.
- Preserve the exact functionality labels read from `frontend/src/data/projectOptions.js`; do not edit that frontend catalog in Unit 1.

### S9 — Unit 2 frontend flow

- Replace the seven-step configurator behind the existing `configurador` entry with five screens: `INICIO`, `PANTALLA DIVIDIDA`, `CONFIRMACIÓN`, `DATOS FINALES`, and the reused success screen.
- `INICIO` requires only the free-form idea. Its optional section is titled **"Ayudanos a entender mejor tu idea"** and collects catalog functionalities (including **"Otra"**), platforms, user types, and approximate user quantity. **"Empezar"** sends the initial advisor round.
- The split screen shows focused questions on the left under **"Sobre: [HU en foco]"**, renders `opcion`, `texto`, and `mixta`, always offers **"No sé"**, and provides **"Enviar respuestas"**, **"Sugerencias"**, **"Agregar a mi idea"**, **"No, gracias"**, and **"Ya está, armá el resumen"**.
- The right side is titled **"Tu idea, hasta ahora"** and shows only each HU's main text, state badge, stage, inline edit, confirmed deletion, and **"+ Agregar historia"**. Mobile moves HUs to a **"Mi idea (n)"** tab.
- Show **"Funcionalidad 2 de 4"** and **"3 de 4 completas"** progress. `Agregar funcionalidad` uses a fixed frontend relationship table over the real catalog and supports **"Otra"** free text; it creates a local unlocked base HU for refinement on the next round.
- Editing or manually creating an HU sets `bloqueada=true` and `estado='editada_cliente'`; accepting a suggestion creates `estado='sugerida_ia'` and remains unlocked. Client changes never call Gemini directly and travel in the next complete round state.
- On advisor completion, show assumptions and **"Está todo bien, enviar"** / **"Quiero ajustar algo"**. Adjustment reopens only a subsequently added or changed functionality.
- Final details collect company, contact, email, phone, industry plus other, budget, timeline, and additional information, reusing `validateEmpresa` and `validatePresupuesto`. The current success screen remains unchanged.

### S10 — Failure, state, and accessibility behavior

- On `503 ADVISOR_UNAVAILABLE`, `429`, or network failure, show **"Reintentar"** and **"Continuar sin asesor"**. The fallback reaches final details and submits accumulated idea, selected functionalities, and existing HUs with `asesoramiento.sinAsesor=true`.
- Keep all advisor state in memory. Successfully sent answers become `integrada=true`; rejected suggestion text is retained. Warn before page abandonment after progress exists.
- Add an `aria-live` region for new questions, focus the first new question, label every control, keep touch targets at least 44px, meet AA contrast, and design **"La IA está pensando…"** plus error states.

### S11 — Project payload and required legacy fields

- Add pure `frontend/src/utils/asesorPayload.js` and preserve the current `POST /api/proyectos` shape for `empresa`, `proyecto`, `problema`, `funcionalidades`, `alcance`, and `presupuesto`.
- Map `problemaActual=idea`, catalog selections into `funcionalidades.seleccionadas`, and initial platforms, quantity, and user types into `alcance`, with `necesitaTiposUsuario='Sí'` when user types exist.
- Add `asesoramiento: { version:1, ideaOriginal, historias, respuestas, sugerencias:{aceptadas[],rechazadas[]}, completo, rondas, sinAsesor }` with only the fields named in the request.
- Because the real project schema requires data not otherwise gathered, collect `proyecto.tipoProyecto`, `problema.procesoActual`, and at least one `problema.objetivos` value with minimal controls rather than defaults. Keep conditional `rubroOtro`, functionality `otra`, objective `objetivosOtro`, and user-type `tiposUsuarioOtro` valid when their corresponding **"Otro/Otra"** selection is used.
- Verify a representative mapped payload against the real backend schema with an uncommitted temporary script.

### S12 — Design, motion, and isolation

- Preserve the Engineering Blueprint identity, tokens, and typography from `DESIGN.md`. Put new styles only in `frontend/src/styles/advisor.css` under the `adv-` prefix; do not alter shared tokens/classes or panel styles.
- Do not use Framer Motion in this flow. CSS-only screen, question, new-HU, and updated-HU motion uses only transform and opacity, remains brief and visible without flicker, respects `prefers-reduced-motion`, and avoids cards nested inside cards.
- Preserve `App.jsx` navigation behavior and the panel. Never commit `frontend/dist`.

### S13 — Unit 2 proof and delivery

- No real Gemini calls and no independent verification subagent.
- Build to a temporary directory, verify no horizontal scroll at 375/768/1280px, validate a mapped payload, preserve site navigation, and leave the panel unchanged.
- Commit Unit 2 exactly as `feat(advisor): client advisor screens`; do not push.

### S14 — Unit 3 persistence and admin presentation

- Preserve `payload.asesoramiento` completely through `POST /api/proyectos`, persistence, list, and detail retrieval. Projects without `payload.asesoramiento` must retain their previous behavior exactly.
- Keep every existing required project field and validation rule. If the optional advisor subtree is validated, add maximums only; do not weaken existing schemas.
- Present advisor context as a readable section in the existing administrator project detail rather than as raw nested data: original idea, stories and their state/stage/detail flag, answers, accepted/rejected suggestions, completion, rounds, and advisor fallback state.
- Extend only `frontend/src/styles/panel.css` with `adm-` classes. Use plain CSS without Framer Motion and preserve the existing administrator decision controls.

### S15 — Advisor-aware viability analysis

- Add a concise advisor summary to the viability prompt only when `payload.asesoramiento` exists. Every advisor-derived value remains inside the existing byte-counted untrusted project-payload zone, preserving its delimiters and language rules.
- Calculate three trusted deterministic signals in code: total advisor stories, stories with `estado='supuesta'`, and stories with `aDetallar=true`.
- Legacy projects without advisor context must keep the previous prompt and signal behavior exactly.

### S16 — Advisor-aware backlog generation

- When advisor stories exist, instruct backlog generation to use those stories as its base and cover every advised story with at least one detailed backlog story.
- Keep the provider response schema and the administrator-controlled exact `VIABLE` gate unchanged.
- Legacy projects without advisor context must keep the previous backlog prompt and generation behavior exactly.

### S17 — Unit 3 focused proof and delivery

- Mock Gemini in every automated test and make no real Gemini calls.
- Focused tests cover exact advisor passthrough, unchanged required validation, legacy payloads without advisor context, deterministic advisor signals, untrusted prompt placement, advisor-aware backlog instructions, the unchanged `VIABLE` gate, and readable admin presentation data.
- Run only focused tests, a frontend build into a temporary directory, formatting/lint for touched code, and `git diff --check`; do not run the known hanging full suite or modify `frontend/dist`.
- Commit Unit 3 exactly as `feat(advisor): admin view and advisor-aware analysis`; do not push.

### S18 — Continuation regression correction

- Trace and prove the exact sequence **"frontend click → payload enviado a POST /api/asesor/ronda → modo/foco calculado por backend → respuesta del endpoint → actualización del estado round en frontend → decisión que hace que se renderice \"Continuar con el asesor\""** before changing behavior.
- Reproduce with a mocked provider only; **"Gemini real: 0 llamadas durante diagnóstico y corrección."**
- Cover exactly: **"INICIAL → devuelve al menos una HU → HU todavía incompleta → usuario continúa → el servidor selecciona esa HU como foco → devuelve las preguntas pendientes → el frontend puede renderizar esas preguntas."**
- Verify `historias`, `respuestas`, `integrada`, `foco`, pending aspects, returned questions, `progreso`, `completo`, `motivoCierre`, and the frontend continuation condition.
- Correct only the proven root cause. Do not change the public contract unless a contract defect is demonstrated.

### S19 — Compact advisor workspace

- Preserve the Engineering Blueprint identity while making the advisor a denser Operate workspace. At 1280px and 1366px, the first viewport must simultaneously reveal the header, focused HU, progress, the start of the left questions, and the first right-side stories.
- Reduce hero height, vertical padding, title dominance, separator/control height, badges, stage and edit/delete chrome, action height, and empty space. Keep the desktop title approximately 36–48px and responsive; integrate progress compactly; keep **"Sobre: [HU]"** visible below it.
- Preserve two clear desktop columns, favoring the story side around 46/54 or 45/55 when useful; constrain long text lines; keep **"Agregar historia"** and **"Agregar funcionalidad"** visible without unnecessary height; avoid cards inside cards.
- Preserve mobile tabs **"Preguntas / Mi idea"** rather than showing both columns simultaneously. Keep readable type and touch targets.
- Use CSS-only motion with no flicker and `prefers-reduced-motion`. Isolate changes to `adv-` classes and advisor files where possible; do not change global, public-site, or administrator styles.

### S20 — Scoped correction proof and boundaries

- Run focused bug tests, existing advisor tests, a temporary frontend build, responsive checks at 375/768/1280/1366px with no horizontal scroll, visual workspace inspection, ESLint, Prettier, and `git diff --check`.
- Do not call real Gemini, push, commit, or modify `frontend/dist`, `company-context.js`, migrations, viability analysis, administrator decision behavior, or backlog generation.
- If a real Gemini check appears necessary after green tests, stop and ask before making it.

### S21 — Dark advisor workspace

- Keep the complete advisor workspace in the site's dark Engineering Blueprint identity: **"fondo general navy/graphite; superficies internas apenas diferenciadas, no blancas; texto principal claro; texto secundario slate/gris azulado; bordes técnicos finos; cyan/blueprint solo para foco, progreso, selección y acciones; contraste AA; sin cards dentro de cards; evitar grandes bloques rellenos innecesarios."**
- Keep the two columns distinct through a divider, typography hierarchy, and only small surface shifts where useful.
- Change only `adv-` classes and `advisor.css` where possible. Do not modify global tokens or panel styles.

### S22 — Explicit current functionality and story identity

- Replace the ambiguous focus header with the compact hierarchy **"FUNCIONALIDAD ACTUAL"**, the current functionality name, **"HU 1 DE 4"**, and the full focused story text.
- When `funcionalidad` is `null`, derive a human fallback from the HU without displaying `null` or technical identifiers.
- In **"Tu idea, hasta ahora"**, show the total counter **"4 HU"**, number each story as **"HU 1 · Gestión de ventas"**, include the functionality when present, and mark the focused story with **"EN DETALLE AHORA"**.
- Preserve the existing human state/origin labels: `entendida`, `supuesta`, `editada por vos`, `sugerida por la IA`, and `a detallar con el equipo`. Do not add nested cards.
- Do not invent stages. If **"ETAPA BORRADOR"** is only a generic frontend presentation rather than a legitimate stage, replace that presentation without changing the public contract unnecessarily.

### S23 — Suggestion flow proof and presentation

- Trace and classify the real flow before fixing it: mocked Gemini response → backend postprocessing → endpoint `response.sugerencias` → frontend `round.sugerencias` → `AdvisorWorkspace` render condition, choosing exactly A, B, C, or D from the user request.
- Keep the current contract of at most two suggestions per round. When suggestions exist, render **"SUGERENCIAS"**, their human type label and text, plus **"AGREGAR A MI IDEA"** and **"NO, GRACIAS"** below the questions. Do not render an empty section.
- Preserve existing behavior: accepting creates an unlocked `sugerida_ia` HU; rejecting records the text to prevent repetition; neither action calls the advisor by itself.
- Focused proof must cover a valid endpoint suggestion, frontend receipt/preservation, acceptance, rejection, and an empty suggestion list without UI failure. Gemini remains fully mocked.
- Verify focused backend/frontend tests, a temporary build, 375/768/1280/1366 px without horizontal scrolling, visual inspection, Prettier, and `git diff --check`. Do not commit or push.

### S24 — Preserve explicit initial functionalities

- Trace the complete initial path before changing behavior: `AdvisorStart` → `initialData.funcionalidades` → `requestAdvisorRound` payload → `POST /api/asesor/ronda` body → `estado.datosIniciales.funcionalidades` → INICIAL service/engine → provider response → postprocessing → final stories → frontend `setHistories`.
- For the exact input `datosIniciales.funcionalidades = ["Gestión de ventas", "Gestión de stock"]`, every explicit functionality must remain represented by one initial HU with the exact value in `historia.funcionalidad`.
- Gemini may improve story wording but may not omit an explicit client selection. If the provider returns only one HU for two selected functionalities, the server must deterministically append the missing explicit functionality without inventing another one.
- Preserve explicit functionality order, `maxHistorias`, and `topeFuncionalidades`. Do not change the public or provider contract.
- Regression proof: INICIAL with two explicit functionalities → mocked provider returns only one story → final endpoint response contains both stories and functionality associations.

### S25 — Distinct AI suggestion block

- Preserve the existing suggestion behavior and limits: maximum two; acceptance creates an unlocked `sugerida_ia` HU; rejection records the text; neither action calls Gemini; an empty array remains valid and renders nothing.
- When suggestions exist, show a clearly distinct dark block below the questions with **"SUGERENCIA DE LA IA"**, the human type (`Mejora`, `Complementaria`, `Etapas`, or `Definir`), suggestion text, **"AGREGAR A MI IDEA"**, and **"NO, GRACIAS"**.
- Use a slightly differentiated dark surface, thin cyan/blueprint accent, AA contrast, a discrete textual marker, pure CSS, `adv-` classes, no unnecessary nested card, and legible mobile behavior.
- Verify focused backend/frontend tests, the exact two-functionality omission fixture, valid and empty suggestion paths, a temporary build, 375/768/1280/1366 px without horizontal scrolling, Prettier, and `git diff --check`. Gemini real calls remain zero. Do not commit or push.

### S26 — Preserve confirmed HU refinement across focus advance

- Trace the complete CONTINUAR flow before changing behavior: user answers → frontend payload → `markPendingAnswersIntegrated` → Gemini prompt → provider story → postprocessing → `processed.historias` → endpoint → frontend state → right-side HU render.
- When useful confirmed answers are submitted for an unlocked HU, allow the provider's refined text for that answered HU to survive even when question focus advances to the next HU.
- Provider refinement may use only confirmed client information, must remain human and short, and must not add assumptions, technical details, acceptance criteria, or `No sé` content.
- `editada_cliente`/locked stories remain byte-for-byte protected. Do not infer or author story refinements deterministically in server code.
- Regression proof: user answers HU1 → provider returns a refined HU1 while focus advances to HU2 → endpoint and frontend-visible state preserve the refined text.

### S27 — Contextual provider and fallback questions

- Keep all six existing aspects and one question per aspect, with the current maximum.
- Instruct Gemini to contextualize each question to the focused functionality or HU without inventing requirements or using technical vocabulary.
- If provider questions are missing, generic, or invalid and deterministic fallback is required, include the exact focused `historia.funcionalidad` safely when present; otherwise retain a neutral fallback.
- Preserve the untrusted-state boundary. Client-authored story/functionality text remains data, never instructions.
- Add exact tests for contextual deterministic fallback and prompt instructions.

### S28 — Actively evaluate grounded suggestions

- Adjust the Gemini prompt so **"la IA siempre intente devolver sugerencias de mejora, con máximo 2 por ronda"**. If there is a reasonable grounded opportunity, return one or two suggestions; never exceed two.
- When the provider yields no usable suggestion, apply a safe server-side fallback grounded only in known client context so the list does not remain systematically empty. Never invent absurd or unrelated content, repeat content already present in the HU/answers, repeat `sugerenciasRechazadas`, or expose technical details.
- Preserve the public contract, rejection filtering, acceptance behavior, and recently implemented presentation.
- Verify deterministic mocked valid/fallback/rejected suggestion paths, focused backend/frontend tests, targeted ESLint, temporary build, Prettier, and `git diff --check`. Gemini real calls remain zero. Do not commit or push.

### S29 — Visible suggestion acceptance feedback

- When the client chooses **"incluir"** / **"AGREGAR A MI IDEA"**, show a visible, clear confirmation such as **"agregada / incorporada / aplicada"** before the suggestion disappears or changes state.
- Preserve the existing acceptance behavior: create one unlocked `sugerida_ia` HU without calling Gemini.
- Cover the feedback state with a focused frontend regression.

### S30 — Latest refined HU in the right column

- **"Tu idea, hasta ahora"** must always render the latest server-refined text for every HU, including the previously focused HU after advancing from HU1 to HU2.
- Preserve locked-story protection and the public round contract.
- Cover the full transition in focused backend and frontend state regressions.

### S31 — Safe suggestion fallback and cap

- Review prompt, postprocessing, and fallback so a reasonable grounded improvement produces one or two usable suggestions, never more than two.
- If the provider returns no usable suggestion, generate a safe server-side fallback only from known advisor state; do not invent unrelated functionality.
- Keep suggestion type and response envelope unchanged.

### S32 — Emphasized current functionality strip

- Make the upper **"Funcionalidad actual"** area clearly distinct from the questions using the existing dark Engineering Blueprint language.
- Preserve the layout, avoid nested cards, use advisor-only CSS, and verify the distinction structurally and through a temporary build.

### S33 — Suggestions remain bound to the focused HU

- Every suggestion must use the focused HU as its primary context. If focus is HU2 **"Gestión de stock"**, use HU2 text and HU2 answers; never build a suggestion primarily from HU1 answers.
- Another HU may be referenced only when it provides a clear improvement to the current focus, such as **"Actualizar el stock automáticamente al registrar una venta."**
- Preserve the maximum of two suggestions, safe fallback behavior, rejected-suggestion filtering, and the no-invention rule.
- Regression proof: HU1 sales complete plus HU2 stock focused must never produce a suggestion whose primary context comes from HU1.

### S34 — Id-less provider refinement survives focus advance

- Trace the real sequential flow from focused HU1 through CONTINUAR, provider output, postprocessing, endpoint response, `applyAdvisorRoundResult`, `setHistories`, and `AdvisorWorkspace` rendering.
- When the provider returns the authorized HU1 refinement without an ID while focus advances to HU2, safely associate that refinement with HU1 instead of retaining the original HU1 and appending a duplicate.
- Preserve `editada_cliente`, locked stories, and `noSabe` protections.
- Regression proof must assert the endpoint and frontend-visible story list contain the refined HU1 text after focus advances to HU2.

### S35 — Explicit refinement acknowledgement contract

- For each round, the server computes `aRefinar` from unlocked HUs with `integrada=false` answers and sends a separate untrusted prompt block containing each HU `id`, current `texto`, and new answers.
- Accept a refined text from `refinadas:[{id,texto}]` or an updated item in `historias`. Map by unique ID, with positional fallback only when the candidate and target counts match. A valid text is non-empty, at most 400 characters, and follows `"Como…, quiero…, para…"`.
- Missing, duplicate, ambiguous, malformed, or protected refinements remain pending. Optional dedicated retry is controlled by `refinamientoReintento=false` and is disabled by default, so production performs no automatic second Gemini call.
- Return `integradas:[preguntaId]` only for answers whose target HU received a valid non-empty refinement, including an identical valid text. Answers not acknowledged remain pending and are resent.
- `response.data.historias` remains the complete source-of-truth list. Locked and `editada_cliente` stories remain byte-for-byte protected; `noSabe` marks an unlocked story `supuesta` without inventing content. Closure never marks an unrefined pending answer integrated.

### S36 — Frontend server acknowledgements and edit-race protection

- `applyAdvisorRoundResult` marks only IDs listed in `data.integradas`; it never marks answers integrated merely because a request was sent.
- Use `data.historias` as source of truth for unlocked stories and preserve locally blocked stories when applying a response, so a client edit completed while a request is in flight cannot be overwritten.
- The next request carries every unacknowledged answer and the latest refined story text.
- Verify the complete state path through `applyAdvisorRoundResult`, `setHistories`, next request construction, and `AdvisorWorkspace` rendered markup using pure `node:test` helpers and `react-dom/server` already installed.
- `entendida` identifies stories derived from the idea or a client-selected functionality; `supuesta` remains for `noSabe` or insufficient information; `editada_cliente` remains client-authored; `sugerida_ia` is exclusive to a suggestion accepted through **"Agregar a mi idea"**.

### S37 — Deterministic suggestion policy

- Return at most two suggestions about the focused HU from its first round. First-round grounding is the idea, focused HU text, and initial selected functionalities/platforms/users; later rounds require a new answer from that same HU.
- Other HUs appear only as `id` plus functionality/title for duplicate detection, never with answers or full text as generative context.
- Postprocessing discards suggestions that repeat an existing HU or were rejected or accepted. If the first-round provider returns none, the backend may emit at most one deterministic suggestion from the existing fixed related-functionality catalog; unsupported zero remains valid.
- Suggestion copy uses natural second person, one sentence of at most 25 words, grounded in the allowed focus context, without technical or meta-language.
- Each round response replaces unresolved suggestions from the previous round. The UI labels the block with the focused HU and preserves acceptance/rejection actions and visible acceptance feedback.

### S38 — Sequential refinement matrix and scoped verification

- Reproduce before fixing with a scripted sequence: initial HU1, first four answers, second answer batch, valid HU1 refinement, focus advance to HU2, endpoint acknowledgement, frontend application, render, and next request.
- Run the same mapping proof for valid ID, empty/missing ID, mixed IDs, refinement in `historias`, omitted HU1, duplicate IDs, and invalid text. Omitted/ambiguous/invalid refinements leave their answers pending with no second call by default; separately prove the optional mocked retry.
- Verify locked HU protection, `noSabe -> supuesta`, exclusive `sugerida_ia` assignment, first-round focused suggestions, deterministic fallback, focused-answer isolation, similarity/rejection/acceptance filtering, maximum two, and zero real Gemini calls.
- With `ADVISOR_TRACE=1`, write one sanitized JSONL record per round to `backend/logs/advisor-trace.jsonl`; keep tracing off by default and ignore that file in Git.
- Run focused backend/frontend tests only, targeted ESLint, Prettier, a temporary frontend build, and `git diff --check`; do not commit or push.

### S39 — Explicit degraded-round contract

- Questions and suggestions expose `origen: 'ia' | 'respaldo'`. Every endpoint round exposes `degradado` and `motivoDegradado` using `rate_limit | cuota | validacion | timeout | vacio | otro`.
- Provider errors, section validation failures, empty useful output, trace data, and one sanitized console line identify the degradation reason without exposing client content or secrets.
- Degraded rounds preserve every submitted answer with `integrada=false`, including closure, and the frontend shows **"El asesor está con problemas: te mostramos preguntas básicas"** plus **"Reintentar esta ronda"**.

### S40 — Section-tolerant provider parsing and bounded retry

- Parse `historias`, `refinadas`, `preguntas`, and `sugerencias` independently so one invalid section does not discard valid sibling sections.
- Retry a 429 or transient provider failure exactly once after the configurable advisor backoff. A persistent failure returns a degraded round instead of silently presenting provider-authored output.
- The optional dedicated refinement retry remains one grouped call for all unresolved HUs and never runs after a failed/degraded provider round.

### S41 — Two focused suggestions with truthful fallback copy

- Keep at most two suggestions per eligible round, provider suggestions first, then fixed related-functionality fallbacks until two or the relevant catalog is exhausted.
- Exclude existing HUs, all initially selected functionalities, rejected suggestions, and accepted suggestions. Never invent unrelated options.
- Fallback copy is exactly **"[Funcionalidad en foco] suele ir junto con [Relacionada]. ¿Querés sumarla a tu idea?"**, type `complementaria`, origin `respaldo`; provider items use origin `ia`.

### S42 — Browser-symptom reproduction and focused proof

- Before implementation, confirm whether the available trace exists, then exercise mocked provider modes: valid, 429, invalid section, and valid envelope with empty sections.
- Preserve the sequential HU1→HU2 refinement/render/next-request proof and protected `editada_cliente`, `bloqueada`, and `noSabe` behavior.
- Count calls for a two-HU session, persistent transient retries, and grouped refinement fallback; run only focused backend/frontend tests and the requested static checks.

### S43 — Captured provider shape and strict-validation evidence

- Make at most one real Gemini call through a temporary script for a neutral two-functionality INICIAL idea, then remove the script. Report only exact field names, value types, list lengths, literal enum-like `aspecto`/`tipo` values, and strict Zod issue paths/codes; never report provider-authored prose.
- Preserve the sanitized captured response as a focused test fixture because it contains no client data. If any sensitive content appears, retain structure only.
- Distinguish pre-provider focus from final effective focus so an INICIAL trace does not leave the only `focusId` as `null` after stories and focus exist.

### S44 — Item-level validation telemetry

- Trace each provider section with received count, valid count, and bounded discard diagnostics containing section, item path, and Zod code without provider content.
- `invalidSections` must not remain empty when `motivoDegradado='validacion'`; item-validation failures count as section validation evidence.
- Record `origen: 'ia' | 'respaldo'` for every returned question, suggestion, and applied refinement.

### S45 — Tolerant normalization before strict validation

- Normalize enum-like values to lowercase ASCII snake_case and map requested synonyms, including `"quién la usa" -> quien_la_usa`, `"complementario/a" -> complementaria`, `"etapa" -> etapas`, and `"mejoras" -> mejora`.
- Unknown suggestion types become `complementaria`; unknown question types become `texto`, or `mixta` when options exist. Unknown keys are stripped before strict Zod validation.
- Trim strings, coerce numeric strings where the strict target is numeric, and split option strings on `|`, newlines, or commas.
- Server-owned IDs, HU state, and derivable stage do not depend on Gemini correctness. Questions use the requested aspect by position when the normalized returned aspect does not match. Stories/refinements map by ID and use positional fallback only when counts match.
- Validate independently per item and per section: one invalid item never removes valid siblings, and one invalid section never removes valid sibling sections.

### S46 — Partial fallback and degradation semantics

- Set `degradado=true` only when no valid AI question remains after normalization. Preserve valid AI questions and fill only missing requested aspects with `origen='respaldo'`.
- Return up to two suggestions, prioritizing valid AI items and filling remaining capacity from deterministic fallback.
- Apply every valid refined HU text, record refinement origin, and acknowledge only the answers actually integrated.

### S47 — Real-shape sequential regression and scoped proof

- Use the captured provider shape plus variants covering accents, uppercase, extra keys, option strings, empty IDs, natural-language aspects, unknown types, one invalid item among valid siblings, and one invalid section among valid siblings.
- Prove the captured response is not degraded, returns at least two AI-origin questions and two AI-origin suggestions, and emits complete sanitized telemetry.
- Preserve the sequential HU1 first-answer batch, second-answer batch, provider refinement, HU2 focus advance, endpoint acknowledgements, pure frontend state/render preservation, and next-request resend, including `editada_cliente`, `bloqueada`, and `noSabe` protections.
- Run focused advisor backend tests, focused frontend tests, temporary build, ESLint, Prettier, and `git diff --check`; no verification subagent, dependencies, commit, push, or forbidden-surface changes.

### S48 — Gemini-only visible questions

- Every visible question is provider-authored and carries `origen='ia'`; remove all deterministic question templates and never fill missing aspects with server copy.
- The prompt lists requested aspects numerically and requires **"EXACTAMENTE N preguntas, una por aspecto, en este orden, cada una adaptada a la HU en foco"**. Positional mapping remains defensive.
- Partial valid questions remain visible; missing aspects remain pending for the same focused HU and are requested in the next round.
- When zero valid IA questions survive after the optional repair, return `degradado=true`, no questions, and keep submitted answers pending. The UI preserves **"Reintentar"**, **"Continuar sin asesor"**, and **"Ya está, armá el resumen"**.

### S49 — Gemini-only suggestions and shown-history contract

- Remove fixed-table suggestion fallback from provider postprocessing without changing the client-owned **"Agregar funcionalidad"** selector.
- Request one or two focused suggestions in every round from the first round of each HU. One is required as best effort; a second is allowed only when equally grounded.
- Add bounded `estado.sugerenciasMostradas` to the request contract. The frontend accumulates every displayed suggestion text and resends it alongside rejected suggestions; Gemini and server filtering reject repetitions and paraphrases.
- When no suggestion survives after optional repair, return none, trace `sin_sugerencias`, and never invent content.

### S50 — One bounded repair call

- Add `reparacionFaltantes=true` to advisor config. After call 1 validation, if requested questions are missing or zero suggestions survive, allow exactly one small repair call asking only for missing content with the same context and untrusted delimiters.
- Call 2 is shared with transient retry and any optional refinement retry: a round never exceeds two provider calls. Never repair after call 2 and never issue a second retry.
- Merge only valid repaired items, preserve valid call-1 items, and return partial/empty provider output without server-authored fallback when repair fails.
- Trace `reparacion: { usada, resultado }` and total attempts.

### S51 — Citation-based suggestion grounding

- Provider suggestions add `basado_en:string`; the provider JSON schema remains simple and string-only.
- Validate `basado_en`, not suggestion copy: normalize lowercase, accents, punctuation, basic Spanish singular/plural, synonyms, and stopwords. Accept exact containment or at least configurable 60% meaningful-word overlap.
- Allowed grounding context for the first HU round is idea, focused HU text, initial functionalities/platforms/users, and catalog names. Later rounds add only answers from that focused HU; never answers from other HUs.
- Continue rejecting existing/accepted/rejected/previously shown duplicates or paraphrases, out-of-scope services, and price/deadline/viability content, with one specific discard reason per item instead of generic `custom_not_grounded`.
- In development only, when `ADVISOR_TRACE=1`, trace `discardDetail` with truncated suggestion text, reason, and normalized allowed context. Never emit this content in production.

### S52 — Telemetry, development UI, and model configuration

- Trace `preguntasPedidas`, `preguntasRecibidas`, `preguntasValidas`, `aspectosPendientes`, `sugerenciasRecibidas`, `sugerenciasValidas`, repair usage/result, and specific discards.
- Endpoint questions/suggestions never expose `origen='respaldo'`. Partial questions do not show degradation UI; zero valid questions do. In DEV, the existing degradation notice shows `motivoDegradado`.
- Use the runtime `GEMINI_MODEL` without hardcoding a model name. Validate advisor-only `maxOutputTokens` and thinking configuration through the authorized real calls without changing analysis or backlog generation settings.

### S53 — Focused proof and call budget

- Mock 2/4 questions, 0 questions, repair success/failure, one/two suggestions, grounding accent/singular/synonym cases, nonexistent citations, every repetition class, no fixed-table visible suggestion, unchanged add-functionality selector, sequential HU1→HU2 refinement, and at most two provider calls per round.
- Capture one neutral real librería ventas/stock reproduction fixture with discarded suggestion detail, then use at most one second real call to validate the corrected advisor request. Remove temporary scripts and raw outputs.
- Run only focused backend/frontend tests, temporary frontend build, targeted ESLint/Prettier, and `git diff --check`; no dependencies, verification subagent, commit, push, or forbidden-surface changes.

### S54 — One Gemini call per HU transition

- **"al entrar en una HU, Gemini genera todas las preguntas necesarias para comprenderla"**; **"mínimo 4 preguntas"**; **"máximo 7 preguntas"**; **"Gemini decide cuántas necesita entre 4 y 7 según la HU"**; **"deben cubrir completamente los aspectos relevantes de esa HU"**.
- **"no dividir artificialmente una misma HU en otra ronda solo porque faltaban volumen/restricciones"**. The normal transition is exactly **"HU1 → Gemini genera 4–7 preguntas → usuario responde → siguiente llamada: - refina HU1; - decide estado final; - prepara las 4–7 preguntas de HU2."**
- **"Mantener reparación únicamente como recuperación excepcional del contrato Gemini, respetando el máximo absoluto de llamadas ya definido en AIADV-18."**
- **"No generar preguntas server-side."**

### S55 — Single and multiple option selection

- Add explicit provider/client support for **"selección única"** and **"selección múltiple"** using `"seleccion": "unica"` or `"seleccion": "multiple"`; **"Gemini debe decidir cuál corresponde."**
- **"Para `multiple`, el usuario debe poder marcar varias opciones."** Use the minimum alternative compatible with the current `respuesta` contract without breaking refinement or integration, and ensure **"El backend y Gemini deben recibir claramente todas las opciones seleccionadas."**
- **"Mantener texto libre/“Otro” si ya existe."**
- Prove **"single select"**, **"multi select"**, **"persistencia en estado"**, **"envío al backend"**, and **"refinamiento usando varias opciones."**

### S56 — Separate HU origin and state

- **"No mezclar procedencia con comprensión."** ORIGEN is exactly `cliente` or `ia`. ESTADO is exactly `a_completar`, `en_detalle`, `entendida`, `con_pendientes`, or `supuesta`.
- `a_completar`: **"necesidad/HU todavía no detallada."** `en_detalle`: **"HU actualmente enfocada."** `entendida`: **"intención funcional principal suficientemente confirmada y sin pendientes relevantes."**
- `con_pendientes`: **"HU entendida, pero existen aspectos secundarios pendientes o respuestas `noSabe`."** and **"una sola respuesta `No sé`, especialmente volumen/restricciones, NO debe convertir la HU en `supuesta`."**
- `supuesta`: **"solo cuando para construir/refinar la HU fue necesario asumir información importante no confirmada por el cliente."**
- **"Preservar compatibilidad del contrato donde sea razonable, pero dejar semántica clara y testeada."**

### S57 — Accepted suggestions become clean needs

- On suggestion acceptance: **"origen = `ia`;"**, **"estado = `a_completar`;"**, **"guardar funcionalidad/título limpio;"**, and **"guardar una descripción breve de la necesidad;"**.
- **"NO guardar literalmente “¿Querés agregar...?” como HU;"** and **"NO inventar todavía rol/beneficio/formato HU si no están confirmados."**
- Preserve the concrete example: `HU 3 · Facturación`, `ORIGEN: IA`, `ESTADO: A COMPLETAR`, **"Agregar facturación asociada a la gestión de ventas."**
- **"Cuando llegue su turno: - pasa a `en_detalle`; - Gemini genera 4–7 preguntas; - luego se refina a formato HU real."**
- Minimum proof also covers: one HU receives 4–7 questions in one round; no second normal same-HU round for missing aspects; HU1→HU2 refines HU1 and asks HU2; multi-select end to end; secondary `No sé` → `con_pendientes`; important assumption → `supuesta`; complete HU → `entendida`; accepted suggestion → IA + `a_completar` + clean text; turn arrival → `en_detalle`; AIADV-18 remains intact.
- Verification is limited to focused backend advisor unit/integration, focused frontend advisor state/workspace/API, ESLint, Prettier, temporary build, and `git diff --check`, with **"CERO llamadas reales a Gemini para desarrollar/tests. Solo mocks/fixtures."**

### S58 — Multi-select answers with Otra and exclusive No sé

- For every `opcion` and `mixta` question, use the same checkbox interface inside a `fieldset` with `legend`, 44px targets, an always-present final **"Otra"** choice, and an always-present exclusive **"No sé"** choice.
- Checking **"Otra"** reveals a required free-text field limited to 250 characters. Checking **"No sé"** clears every option and **"Otra"**; checking any other choice clears **"No sé"**. `texto` remains a free-text field with **"No sé"**.
- Preserve the current rule that every question must count as answered before **"Enviar respuestas"** is enabled/submitted. A choice, valid **"Otra"**, `noSabe`, or text answers its applicable question.
- Keep `respuesta` as a string. Serialize selected options as `"A; B; Otra: texto"`; `noSabe=true` keeps an empty response or **"No sé"** as today. Provide pure serialization and deserialization helpers.
- The selection must survive ordinary rerenders without focus loss. The question list is mounted with the round ID, while question and story items use stable IDs rather than indexes or answer values.

### S59 — Provider wording and option sanitization

- Tell Gemini that options are not mutually exclusive, several answers should read naturally, and received responses may contain selections separated by `"; "` plus an `"Otra: …"` fragment.
- Provider options must not include **"Otra"**, **"Otro"**, **"Ninguna"**, **"No sé"**, **"Ninguno de los anteriores"**, or normalized equivalents; remove those values server-side and deduplicate normalized duplicates.
- If fewer than two usable options remain, convert the question to `texto`. Preserve endpoint types `opcion | texto | mixta`, round/refinement/suggestion behavior, request state, and `payload.asesoramiento` shape.
- Raise `maxLargoRespuesta` only as needed for multiple choices plus custom text, and cover the deterministic prompt and sanitizer with mocked focused tests.

### S60 — Complete advisor dark theme and compact question layout

- Inventory start, split workspace, degradation/error notices, confirmation, final details, success, and **"Continuar sin asesor"** before editing. Every advisor screen uses the dark Engineering Blueprint tokens from `DESIGN.md`; shared classes and global/public/admin styles remain unchanged.
- Scope every visual override to `adv-`/`advisor.css`. Inputs, selects, checkboxes, chips, buttons, warnings, and errors need AA contrast, clear `focus-visible`, amber degradation, and restrained red errors.
- Each question is one non-nested block with a thin border, subtly raised background, **"Pregunta N de M"** on the same row as its 16px question text, and a subtle answered state.
- Use a maximum width near 1440px, `clamp(16px, 3vw, 48px)` horizontal padding, balanced columns, question measure near 70ch, 15px body, 16px questions, 12px uppercase labels, and no readable text below 14px except those labels. Preserve **"Mi idea (n)"** on mobile and prevent horizontal scroll at 375/768/1024/1280px.

### S61 — Advisor-only CSS motion

- Use CSS only in `advisor.css`, without Framer Motion, `AnimatePresence`, `MotionConfig`, or `IntersectionObserver`. Entry animations use `animation-fill-mode: backwards`, never base `opacity: 0`/transform, never animate layout properties, and have no exit animation.
- Round questions enter at 0.3s with a capped six-step `--i` stagger of 60ms; screens enter at 0.3s; new HUs enter from 12px at 0.35s using stable HU IDs.
- Add `useChangeFlag(value)` to flash changed HU text for about 1.3s without changing its key. Accepted suggestions receive brief feedback and their new HU enters plus flashes. Checkbox marks pop for 0.15s; advisor buttons scale 1.02/0.98 in 0.12s; only **"La IA está pensando…"** may animate infinitely.
- `prefers-reduced-motion: reduce` removes translation/scale, limits entry fades to 0.15s, preserves a short non-spatial flash, and makes thinking static or very slow. Focused static tests enforce the CSS and import constraints.

### S62 — Scoped proof and boundaries

- Use `node:test` and `renderToStaticMarkup` only: serialization/deserialization, exclusive **"No sé"**, required **"Otra"**, exact `"A; B; Otra: texto"`, submit readiness, checkbox/Otra/No sé rendering, dark scoped styles, stable keys, CSS motion contract, and no advisor Framer Motion imports.
- Backend proof covers option removal/deduplication, fewer-than-two fallback to text, and deterministic prompt text. Gemini is mocked in every test; real calls remain zero.
- Run focused advisor backend/frontend tests, temporary-directory frontend build, targeted ESLint and Prettier, `git diff --check`, and responsive no-overflow checks at 375/768/1024/1280px. No dependencies, verification subagent, commit, push, `frontend/dist`, `company-context.js`, panel/admin, viability, backlog, or migration changes.

### S63 — Valid HU transition must survive provider processing

- Reproduce the complete backend path **"provider response → parse → normalizeProviderOutput → Zod/schema → postprocessAdvisorOutput → validación de preguntas/refinadas/sugerencias → cálculo de `degradado` → clasificación de `motivoDegradado`"** with mocks/fixtures only.
- For HU1 **"Como usuario, quiero usar gestión de ventas, para facilitar mi trabajo."**, six confirmed answers, a valid HU1 refinement/state, four to seven valid HU2 questions, and an optional valid suggestion, the endpoint integrates HU1, advances to HU2, returns HU2 questions, and exposes `degradado:false` plus `motivoDegradado:null` in one request.
- Preserve AIADV-18/19: no server-authored visible content, no broader schema relaxation, no extra retries, and valid refinements/questions survive optional empty sections, option sanitization, and partial repair.

### S64 — Specific degradation diagnostics

- **"No dejar `\"otro\"` para errores que sí podemos identificar."** Classify known provider, validation, incomplete-question, and refinement failures specifically while preserving useful sibling content.
- A refinement failure does not degrade a round that still has valid questions; it remains visible through refinement mapping/validation telemetry. An optional empty suggestion section does not degrade otherwise valid questions.
- Keep errors observable through `providerError`, `invalidSections`, item-level discarded telemetry, `questionItems`, `refinementMappings`, question counts, repair state, and the final degradation reason; do not hide failures.

### S65 — Scoped proof and boundaries

- Add focused backend unit/integration proof for one-attempt HU1→HU2, valid refinement retention, four-to-seven valid questions, optional empty sections, option sanitization, partial repair retention, and known reasons never becoming `otro`.
- Run backend advisor unit/integration tests, targeted ESLint, Prettier, and `git diff --check`. Frontend verification is required only if the visible contract changes.
- Real Gemini calls, extra retries, commit, push, UI/design, backlog, viability, admin, migrations, and `frontend/dist` are prohibited.

### S66 — Accepted AI suggestion transition parity

- Compare **"transición HU cliente → HU cliente"** with **"transición HU cliente → HU sugerida por IA aceptada"** through request state, Zod, focus selection, `aRefinar`, prompt construction, gateway call, postprocessing, and trace.
- An accepted suggestion must reach the backend with a valid ID, `origen:"ia"`, `estado:"a_completar"`, clean functionality and description, no conversational **"¿Querés agregar... ?"** copy, then become `en_detalle` when focused and receive four to seven valid questions.
- The newly focused suggested HU must not be included in `aRefinar` or require a refinement mapping before it has answers. `aRefinarIds` must contain only previously answered unlocked HUs.

### S67 — Sanitized provider failure diagnostics

- Keep public `motivoDegradado:"provider"` when the failure is provider-side, while internal trace distinguishes status HTTP, code, stage (`configuration | provider | response_text`), sanitized message category, finish reason, response-text presence, raw error name, network code, and 429/500/503 or empty-response paths.
- Never trace raw provider messages, prompts, histories, answers, credentials, response bodies, or client content. Diagnostic values must be bounded and allowlisted or numeric.
- A response without usable text is a gateway `response_text` failure rather than an ambiguous empty content result. Do not add retries or relax schemas.

### S68 — Focused proof and boundaries

- Mock and test client→client, client→accepted-IA suggestion, promotion to `en_detalle`, four-to-seven questions, no premature refinement mapping, provider 500, provider 503, 429, response without text, and valid non-degraded response.
- Run focused backend advisor unit/integration tests, targeted ESLint, Prettier, and `git diff --check`; frontend tests are permitted only as read-only evidence for the existing accepted-suggestion shape.
- Real Gemini calls, commit, push, UI changes, backlog, viability, migrations, and `frontend/dist` are prohibited.

### S69 — Exact TypeError origin on the Gemini boundary

- Diagnose the reported manual-retry failure: `providerAttempts:1`, `stage:"provider"`, `statusCode:null`, `symbolicStatus:null`, `rawErrorName:"TypeError"`, `networkCode:null`, `finishReason:null`, `hasResponseText:null`, `messageSanitized:"provider_failure"`.
- Do not assume another external failure. Determine whether the TypeError came from (a) our gateway/postprocessing code, (b) the SDK call or `response.text` access, (c) `fetch`/undici network failure, or (d) an incomplete response shape.
- Capture a bounded error chain (`cause`, `cause.cause`, network codes, `AbortError`/`TimeoutError`) and a closed `errorOrigin` enum: `configuration | network | provider_api | provider_sdk | sdk_type_error | response_access | response_shape`.
- Read `response`, `response.candidates`, and `response.text` defensively: null/undefined response, missing candidates, throwing `text` getter, and missing text must each produce a distinct, controlled `response_text` failure with `hasCandidates`, `finishReason`, and `hasResponseText` evidence.
- Keep public `motivoDegradado:"provider"` and the existing two-attempt maximum unchanged. `messageSanitized` must stop labeling a TypeError as generic `provider_failure`; it must expose `network_failure`, `sdk_type_error`, `missing_response_text`, or `unreadable_response_text` as applicable.
- Prove with mocked providers only: 503 `UNAVAILABLE`, SDK/fetch TypeError, throwing `response.text`, null/undefined response, response without candidates, manual retry after degradation, and a valid response after a 503. Zero real Gemini calls, no schema changes, no advisor functional changes, no commit, no push.

### S70 — Single provider call per action and clear degraded copy

- Remove the automatic provider retry: one user action must make at most one Gemini call when the first call fails. No second immediate call for 503 `UNAVAILABLE`, network failure, timeout, or provider error.
- On failure, return the existing degraded round, preserve the current advisor state, and let the manual `Reintentar` button trigger a new independent action with exactly one new provider call.
- Keep `motivoDegradado`, `providerFailure`, `errorOrigin`, `Reintentar`, `Continuar sin asesor`, and `Ya está, armá el resumen` unchanged.
- Frontend copy by reason, never exposing raw reason, status, symbolic status, gateway names, or SDK detail:
  - `provider`: "El servicio de IA no está disponible temporalmente." / "Podés reintentar más tarde o continuar sin el asesor."
  - `quota`: "Se alcanzó temporalmente el límite de uso del servicio de IA."
  - `rate_limit`: "Hay demasiadas solicitudes al servicio de IA en este momento."
  - `timeout`: "El servicio de IA tardó demasiado en responder."
  - `validation` / `incomplete_questions`: "No pudimos procesar correctamente la respuesta del asesor."
- Do not change schemas, prompts, refinement functional logic, HU states, internal tracing, backlog, viability, or `frontend/dist`.
- Prove with mocked providers only: 503, network, timeout, valid response, manual retry recovery, frontend `provider`, and frontend `quota`/`rate_limit`/`timeout`; zero real Gemini calls, no commit, no push.

### S71 — Capture remaining project context at advisor start

- The first screen requires the idea, **"¿Cómo realizan actualmente este proceso?"**, catalog functionalities, platforms, user types, approximate user quantity, and **"Tipo de solución"** with the six backend values plus **"No estoy seguro"**.
- Process help is exactly **"Si hoy no existe un proceso, contanos cómo lo resolvés actualmente, por ejemplo 'de forma manual' o 'no lo hacemos'"** and uses the backend-compatible minimum and maximum.
- `procesoActual` travels in `estado.datosIniciales` and remains client-authored data inside `BEGIN_UNTRUSTED_PROJECT_PAYLOAD_JSON` / `END_UNTRUSTED_PROJECT_PAYLOAD_JSON`.
- Missing or uncertain project type maps to `personalizada` and sets `asesoramiento.tipoInferido=true`.

### S72 — Reduced final details form

- Final details retain only company name, contact person, email, phone, industry with other, budget, timeline, and additional information.
- Remove solution type, current process, objectives, functionalities, platforms, user quantity, and user types from final details while preserving validation for retained fields.

### S73 — Grounded inferred objectives without extra calls

- Every provider round may return `objetivos:[{texto,basado_en}]`; the client resends current `objetivos:[{texto,basadoEn}]` in every round.
- Return at most five unique objectives, each at most twelve words, beginning with an infinitive verb, containing no prices, timelines, or viability, and grounded only in client evidence. Empty is valid and never triggers repair, degradation, or another provider call.
- Validate `basado_en` with the same configurable normalization, accents, plurals, stopwords, and overlap mechanism used by suggestions. Project-level objective context is idea, `procesoActual`, current HU text, and every current-HU answer.
- Revalidate current objectives every round and on call-free closure. Invalid provider output must not remove still-grounded current objectives. Endpoint output and sanitized trace include received, valid, and discarded objectives with reasons.

### S74 — Version 2 project payload

- Preserve the existing project payload shape. `empresa` and `presupuesto` come from final details; project type, process, scope, and catalog selections come from the first screen; `problema.objetivos` contains validated objective texts.
- Catalog functionality output is the deduplicated union of current HU catalog functionality values and initial selections still represented by a current HU. If empty, fall back to initial selections; never invent a functionality. HU without catalog functionality remains only in `asesoramiento`.
- Emit optional-compatible `asesoramiento.version=2` with objectives, `procesoActual`, and `tipoInferido`; without advisor, preserve first-screen capture, use empty objectives, and set `sinAsesor=true`.

### S75 — Minimal project schema compatibility

- Relax only `problema.objetivos` to allow an empty list. `tipoProyecto` remains required and every other existing validation remains unchanged.
- Accept bounded optional v2 advisor fields. Existing projects without advisor data or with version 1 remain readable without migration.
- Prove the actual `POST /api/proyectos` schema accepts three frontend-built payloads: advisor with objectives, advisor without objectives, and without advisor.

### S76 — Compatible administrator business summary

- The summary reads company/industry from final details; key problem from idea; current process, platforms, users, and user types from the first screen; objectives from inference; catalog functionalities from the payload; and budget/timeline/additional information from final details.
- New inferred objectives show **"Inferidos por IA a partir del relevamiento"**; no inferred objectives show **"Sin objetivos respaldados por el relevamiento"**; inferred project type shows **"Tipo de solución: no especificado por el cliente"**.
- Omit optional empty fields, never render empty rows, keep catalog functionalities out of the guided-advisor detail, and keep objectives only in the summary. Legacy version 1/manual objectives retain current presentation without inferred labeling.

### S77 — Scoped proof and boundaries

- Frontend uses `node:test` and `renderToStaticMarkup` without new libraries for payload mapping, deleted-functionality filtering, start/final validation, reduced-form rendering, confirmation objectives, and new/empty/no-advisor/legacy admin summaries.
- Backend uses a mocked provider for grounded/ungrounded objectives, revalidation after HU deletion, empty-provider preservation, no repair/calls caused by objectives, deterministic prompt text, trace telemetry, and real project-schema acceptance.
- Existing viability signal tests remain green without logic changes; short `procesoActual` still counts as empty. Real Gemini calls, verification subagents, dependencies, commits, pushes, `frontend/dist`, `company-context.js`, backlog, migrations, and viability-logic changes are prohibited.

### S78 — Advisor form hierarchy and accessible optional details

- Remove only **"El administrador verá estos objetivos junto con el relevamiento."** from objective confirmation while preserving its title, list, and design.
- The first screen initially shows only **"Contanos tu idea"** and **"¿Cómo realizan actualmente este proceso?"**. A closed-by-default accordion titled **"Agregar más detalles del proyecto"** contains solution type, imagined functionalities, platforms, approximate user quantity, and user types.
- The accordion uses a real button with `aria-expanded`, `aria-controls`, visible focus, pure `adv-` CSS motion, and `prefers-reduced-motion`; closing it preserves mounted controls and values. Validation remains unchanged, and an internal required-field error opens it automatically before showing/focusing the error.
- Make current process visually equivalent to the main idea control, align **"Tipo de solución"** with **"Funcionalidades que ya imaginás"**, and use a coherent spacing scale across the first screen without changing fields, values, validation, logic, or payload.
- Improve final-form inputs, textarea, and selects with dark-theme field surfaces, borders, radius, padding, typography, contrast, hover/focus/focus-visible, label/help/control spacing, and a robust select chevron without fragile native-option styling. Preserve all options, values, validation, logic, and payload.

### S79 — Human administrator summary and balanced responsive grid

- Humanize every real `tipoProyecto` enum with one explicit mapper, including **`gestion` → `Sistema de gestión`**, without changing persisted values or payloads. Unknown non-empty legacy values use a safe human-readable fallback.
- Render every project objective on its own line/list item rather than joining with `·`. Preserve **"Inferidos por IA a partir del relevamiento"** for inferred objectives and preserve old projects without advisor v2 data.
- Balance the lower summary entries for Plataformas, Usuarios estimados, Tipos de usuario, Presupuesto, and Plazo at 375px, 768px, 1024px, and 1280px without isolated cards, horizontal scrolling, or content changes.

### S80 — Concise evidence-based HU refinement and focused proof

- Change only the HU-refinement instruction so confirmed answers and prior confirmed context may contribute one or two relevant functional details while preserving **"Como [rol], quiero [necesidad], para [beneficio]."**
- Refinement must not become a long paragraph, include acceptance criteria, enumerate all answers, invent functionality, add unconfirmed constraints, or duplicate information. Evidence is limited to questions/answers, the prior HU, and confirmed context; no provider call or refinement stage is added.
- Deterministic prompt proof covers the new wording. Frontend focused proof covers initial idea/process visibility, closed secondary accordion, mounted fields and value preservation, automatic error opening, unchanged final-form behavior, removed confirmation sentence, objective lists, humanized type values, and legacy compatibility.
- Run only focused tests, targeted ESLint on modified files, a frontend build outside `frontend/dist`, the Impeccable detector, and `git diff --check`. Real Gemini calls, Edge/CDP, long visual audits, dependencies, commits, pushes, checkout/reset/clean/stash, prior-change reverts, payload/schema/version changes, backlog, Kanban, migrations, viability, and grounding changes are prohibited.

## Tasks

- [x] AIADV-1 (S1–S8) — Unit 1 backend round engine, public endpoint, protections, prompt/provider boundary, and focused tests. Route: inline after delegated read-only mapping; writer trigger absent. Commit: this Unit 1 commit, `feat(advisor): requirements advisor rounds endpoint`.
- [x] AIADV-2 (S9–S13) — Unit 2 frontend advisor flow, pure project payload, fallback, accessibility, responsive UI, and focused proof. Route: inline after delegated read-only mapping; writer trigger absent. Commit: this Unit 2 commit, `feat(advisor): client advisor screens`.
- [x] AIADV-3 (S14–S17) — Unit 3 persistence proof, readable admin advisor detail, advisor-aware viability signals/prompt, and advisor-aware backlog prompt. Route: inline after delegated read-only mapping; writer trigger absent. Commit: this Unit 3 commit, `feat(advisor): admin view and advisor-aware analysis`.
- [x] AIADV-4 (S18, S20) — Reproduced and fixed the continuation regression with a sequential mocked round and frontend renderability proof. Route: inline after delegated end-to-end mapping; writer trigger absent because the bug correction and its proof are one coupled behavior. Commit: prohibited for this correction. Evidence: RED empty continuation questions / missing frontend helper; GREEN backend 25/25 and frontend advisor 6/6.
- [x] AIADV-5 (S19–S20) — Compacted the advisor-only workspace and verified responsive behavior at 375/768/1280/1366px. Route: inline after the mapped bug task because both units touch the workspace component; parallel writers would overlap edit surfaces. Commit: prohibited for this correction. Evidence: temporary build, Edge/CDP screenshots and measurements, no horizontal overflow, mobile tabs preserved, reduced-motion duration `0.01ms`.
- [x] AIADV-6 (S21–S22) — Keep the advisor workspace dark and make current functionality, HU numbering, focus, status, and stage presentation explicit. Route: inline after delegated mapping; no writer trigger because the coupled visual/state change shares the workspace component and advisor CSS. Commit: prohibited by the current request. Evidence: dark computed surfaces and responsive Edge screenshots at 375/768/1280/1366; human focus fallback, HU identity, current marker, total counter, and generic draft suppression covered by focused tests/readback.
- [x] AIADV-7 (S23) — Prove the exact suggestion flow classification and add focused endpoint/frontend lifecycle coverage without real Gemini calls. Route: inline after delegated mapping; no writer trigger because the proof and UI behavior overlap AIADV-6 surfaces. Commit: prohibited by the current request. Evidence: mocked valid suggestion survives endpoint and frontend unchanged; acceptance/rejection/empty-list tests pass; visual harness observes type, text, and both actions at every requested width.
- [x] AIADV-8 (S24) — Reconcile explicit initial functionalities with provider stories and prove the exact two-selected/one-returned regression. Route: inline after delegated mapping; no writer trigger because this is one coupled backend invariant and endpoint proof. Commit: prohibited by the current request. Evidence: exact endpoint fixture sends two explicit functionalities while the provider returns one story; final response preserves two ordered HUs with exact functionality labels and 2/2 progress.
- [x] AIADV-9 (S25) — Refine the existing suggestion section into a distinct dark AI-suggestion block and verify responsive/empty behavior. Route: inline after AIADV-8; no writer trigger because it is a small advisor-only JSX/CSS refinement. Commit: prohibited by the current request. Evidence: headless Edge readback at 375/768/1280/1366 confirms the labeled dark block, type/text/actions, mobile tabs, and no horizontal overflow; empty-list safety remains covered by the focused frontend test.
- [x] AIADV-10 (S26) — Preserve provider refinement of the just-answered unlocked HU when question focus advances, with endpoint and frontend-state regression proof. Route: inline after delegated mapping; no writer trigger because service, postprocessing, endpoint, and state proof are one coupled behavior. Commit: prohibited by the current request. Evidence: useful pending answers authorize only their unlocked HU IDs; endpoint CONTINUAR and frontend-state regression tests preserve refined HU1 while focus advances to HU2; focused backend 28/28 and frontend 12/12 pass.
- [x] AIADV-11 (S27) — Contextualize provider instructions and deterministic fallback questions using the current HU safely. Route: inline with AIADV-10 because both share prompt/postprocessing context and focused tests. Commit: prohibited by the current request. Evidence: exact generic provider questions are replaced by functionality-specific deterministic fallbacks, missing/invalid questions use the same path, prompt tests preserve the untrusted boundary, and focused backend 28/28 passes.
- [x] AIADV-12 (S28) — Make suggestion opportunity evaluation explicit in the prompt while preserving valid zero/rejected behavior and current presentation. Route: inline because this is a bounded prompt/test change on the same round contract. Commit: prohibited by the current request. Evidence: prompt requires active grounded-opportunity evaluation without a quota; mocked endpoint valid suggestion, frontend preservation, acceptance/rejection, and empty-list paths pass; temporary Vite build transforms 440 modules.
- [x] AIADV-13 (S28–S32) — Add visible suggestion acceptance feedback, preserve prior-HU refinement, guarantee bounded safe suggestion fallback, and emphasize the current-functionality strip. Route: inline because the four regressions are already mapped to one coupled advisor round/workspace flow and no writer or verification-subagent trigger applies. Commit: prohibited until explicit user approval. Evidence: RED reproduced missing feedback, empty fallback, old prompt wording, and insufficient current-strip styling; GREEN backend advisor 30/30 and frontend advisor/API 12/12, temporary Vite build (440 modules), Impeccable detector `[]`, targeted backend ESLint, Prettier, and `git diff --check` all pass.
- [x] AIADV-14 (S33–S34) — Bind provider and fallback suggestions to the focused HU and preserve an authorized id-less HU refinement through the real endpoint/frontend render flow. Route: inline because both regressions share the advisor postprocessor and sequential round fixture; no writer or verification-subagent trigger applies. Commit: prohibited. Evidence: RED reproduced HU1-based fallback under HU2 focus and an id-less HU1 refinement appended as a duplicate; GREEN backend advisor 32/32 and frontend advisor/API 14/14, targeted ESLint, Prettier, temporary Vite build (440 modules), and `git diff --check` pass.
- [x] AIADV-15 (S35–S38) — Completed the revised refinement fallback/retry, exclusive story-state semantics, first-round suggestion policy, deterministic server fallback, and opt-in trace. Route: inline because all changes share the advisor-round contract and the user prohibited verification subagents; no writer trigger applies. Risk: item 3, changed public advisor response semantics consumed by the frontend. Commit: prohibited. Evidence: RED failed at postprocessing when a valid HU refinement existed only in `historias`, accepted malformed refinement text, suppressed first-round suggestions, and labeled a client-selected functionality `sugerida_ia`; GREEN proves tolerant exact/positional mapping, pending acknowledgements, optional retry, closure state, first-round/focused suggestion policy, exclusive state origins, edit-race preservation, and sequential HU1→HU2 continuity. Focused backend 44/44 and frontend 16/16 pass; targeted ESLint, source Prettier, temporary Vite build (441 modules), and `git diff --check` pass. Independent verification subagent intentionally omitted by explicit user instruction.
- [x] AIADV-16 (S39–S42) — Added explicit degraded-round behavior, section-tolerant parsing, one bounded transient retry, truthful origin metadata, two focused suggestions, and browser-symptom proof. Route: inline because parsing, fallback, acknowledgement, trace, and UI retry share one round contract; the user prohibited verification subagents and no writer trigger applies. Risk: item 3, changes the public advisor response consumed by the frontend. Commit: prohibited. Evidence: RED reproduced silent fallback for empty valid sections, 429 as `ADVISOR_UNAVAILABLE`, all-or-nothing section validation, and no visible degraded notice; GREEN proves valid/429/invalid-section/empty modes, pending acknowledgements under degradation, safe one-line logs, provider-first suggestions completed to two, five provider calls for a normal two-HU session, and closure integration without false degradation. Focused backend 49/49 and frontend 19/19 pass; backend ESLint, source Prettier, temporary Vite build (442 modules), and `git diff --check` pass. The full backend suite was attempted once but its unrelated migration tests encountered pre-existing database state and the command timed out; no migration files were touched. Independent verification was omitted by explicit instruction. Native review was granted but could not create authority because the accumulated 5,842-line candidate exceeded the lens context budget.
- [x] AIADV-17 (S43–S47) — Captured one real provider shape, added tolerant item normalization and sanitized item-level telemetry, corrected effective focus tracing, and preserved the sequential HU1 refinement contract. Route: inline after delegated read-only mapping because normalization, telemetry, degradation, and sequential proof share one provider-round contract; no writer trigger applies, and the user explicitly prohibited verification subagents. Risk: item 3, changes advisor response processing and trace semantics consumed by the frontend. Commit: prohibited. Evidence: RED reproduced full fallback for the real `multiple_choice` / `funcionalidad` enum variants; GREEN proves the captured fixture remains non-degraded with four IA questions, partial item/section recovery, two valid IA suggestions in the tolerant variant, sanitized section/item diagnostics, effective INICIAL focus, positional id-less HU1 refinement, endpoint acknowledgements, frontend preservation/render/next request, and protected stories/noSabe. Focused backend 53/53 and frontend 17/17 pass; targeted ESLint and Prettier pass; temporary Vite build transformed 442 modules and was removed; `git diff --check` passes. One real Gemini call was used and its temporary script/output were removed. Native review was granted but unavailable because the accumulated uncommitted candidate exceeded the lens context budget; no review authority was created. Independent verification was omitted by explicit instruction.
- [x] AIADV-18 (S48–S53) — Replaced all server-authored visible questions/suggestions with Gemini-only partial output, added one bounded repair call, citation-based grounding, shown-suggestion history, development diagnostics, and model-aware advisor generation proof. Route: inline after delegated read-only mapping because prompt, provider validation, repair budget, trace, request contract, and frontend state are one coupled round behavior; no writer trigger applies, and the user explicitly prohibited verification subagents. Risk: item 3, changes the public advisor request/response behavior consumed by the frontend. Commit: prohibited. Evidence: RED proved partial provider questions were padded and bounded repair was absent; GREEN backend advisor 58/58 and frontend advisor 18/18; targeted ESLint and Prettier passed; temporary Vite build transformed 442 modules outside `frontend/dist`; Impeccable detector returned no findings; `git diff --check` passed; real Gemini validation returned 4/4 IA questions and 1 grounded IA suggestion in one call using runtime `gemini-3.8-flash`, `maxOutputTokens=16384`, and `thinkingBudget=1024`.
- [x] AIADV-19 (S54–S57) — Replaced per-aspect batching with one 4–7-question Gemini batch per normal HU transition, added single/multiple selection, separated HU origin from comprehension state, and turned accepted suggestions into clean pending needs. Route: inline after delegated read-only mapping because round transition, provider schema, answer serialization, lifecycle state, suggestion acceptance, and focused proof are one coupled behavior; no parallel writer trigger applies. Risk: item 3, changes the public advisor request/response contracts consumed by the frontend. Commit: prohibited. Evidence: focused backend advisor unit/integration 60 passed with one obsolete two-batch test skipped; focused frontend advisor state/workspace/API 20/20 passed; targeted backend ESLint, source Prettier, temporary Vite build (442 modules), and `git diff --check` passed. Independent verification found two blockers; the bounded correction and recheck resolved both.
- [ ] AIADV-20 (S58–S62) — Unify option questions as multi-select with Otra/No sé, sanitize provider options, complete the advisor dark theme, and add bounded CSS-only motion with focused proof. Route: inline after one delegated read-only inventory because behavior, stable identity, theme, motion, and focused tests share the advisor round/workspace surfaces; no parallel writer trigger applies. Risk: item 3, changes answer serialization consumed by the existing public advisor endpoint. Commit and push: prohibited by the current request. Implementation and automated checks complete; pending only the requested live horizontal-overflow observation because both installed headless browsers exited with environment code 13 before exposing CDP. Evidence: RED missing serialization helpers/component and failing sanitizer/prompt/limit assertions; GREEN backend 62 passed + 1 obsolete skip, frontend 25/25, temporary Vite build (443 modules), targeted ESLint, Prettier, Impeccable detector `[]`, static motion/import/dark-scope checks, and `git diff --check` pass. Real Gemini calls: 0.
- [x] AIADV-21 (S63–S65) — Diagnosed the reported HU1→HU2 degradation, proved valid AIADV-19/20 output survives in one provider attempt, preserved useful partial content, and replaced known `otro` outcomes with specific reasons. Route: inline after delegated read-only mapping because provider parsing, postprocessing, repair, degradation, endpoint proof, and diagnostics are one coupled backend behavior; no writer trigger applies. Risk: item 3, refines the public `motivoDegradado` contract consumed by the frontend. Commit and push: prohibited. Evidence: RED reproduced known 5xx and response-text gateway failures as `otro`, empty question batches as `vacio`, and item validation as `validacion`; GREEN backend advisor unit/integration 66 passed with one obsolete skip, ESLint and Prettier passed, `git diff --check` passed, and independent verification reported pass with no blockers. Real Gemini calls: 0.
- [x] AIADV-22 (S66–S68) — Compared client and accepted-IA focus transitions and added sanitized provider failure detail without changing the public `provider` reason. Route: inline after delegated read-only mapping because accepted-suggestion state, focus/refinement selection, gateway failure capture, service trace, and focused proof are one coupled backend behavior; no writer trigger applies. Risk: item 3, the shared Gemini gateway failure boundary also serves analysis/backlog callers even though their public behavior was not changed. Commit and push: prohibited. Evidence: accepted IA HU becomes `en_detalle`, receives four questions in one attempt, and stays outside `aRefinar`; gateway/service tests cover 429/500/503 and missing response text; focused backend advisor tests 72 passed with one obsolete skip; ESLint, Prettier, `git diff --check`, and independent verification passed. Real Gemini calls: 0.
- [x] AIADV-23 (S69) — Pin the exact TypeError origin on the Gemini boundary and replace the opaque `provider_failure` label. Route: inline because the gateway failure boundary, bounded error-chain capture, response-shape guards, trace classification, and mocked proof are one coupled diagnostic change; no writer trigger applies. Risk: item 3, the shared gateway failure object also serves analysis/backlog callers, although their public behavior must not change. Commit and push: prohibited. Real Gemini calls: prohibited. Evidence: RED reproduced the opaque `provider_failure` label and lost `cause`; GREEN proves `provider_api`, `network` with `causeCode:EAI_AGAIN`, `sdk_type_error`, `response_access`, `response_shape`, a manual retry with `providerAttempts:1`, and a valid round after 503. Focused backend unit 94/94, advisor integration 17 pass + 1 pre-existing skip; targeted ESLint, Prettier, and `git diff --check` pass. Full `npm test` stalled on pre-existing DB migration tests; no migration or DB code touched.
- [x] AIADV-24 (S70) — Remove the automatic provider retry and replace the opaque degraded copy with reason-specific messages. Route: inline because the retry loop, service trace assertions, endpoint proof, and one presentational notice are one coupled quota/UX correction; no writer trigger applies. Risk: item 3, removes an existing public behavior (`providerAttempts:2`) and changes visible advisor copy. Commit and push: prohibited. Real Gemini calls: prohibited. Evidence: RED reproduced 2 calls for 429/500/503 and the generic notice; GREEN proves 503/network/timeout failures stop at `providerAttempts:1`, valid rounds stay at 1, and each manual retry makes one new call and recovers. Backend focused unit 96/96, advisor integration 17 pass + 1 pre-existing skip, frontend advisor 32/32, backend ESLint and Prettier pass.
- [x] AIADV-25 (S71–S77) — Move all previously captured project context to the first screen, infer and ground objectives without extra provider calls, emit payload v2, minimally relax the project schema, and keep the administrator summary compatible. Route: inline after one delegated read-only map because prompt/schema/service, configurator state, payload mapper, project schema, and admin summary form one coupled contract; no parallel writer trigger applies. Risk: item 3, changes the public advisor request/response and persisted optional advisor contract consumed by frontend/admin readers. Commit and push: prohibited. Real Gemini calls and independent verification subagents: prohibited. Evidence: L48.
- [x] AIADV-26 (S78–S80) — Restore the accessible first-screen details accordion, refine advisor/final-form visuals, humanize and rebalance the administrator summary, and strengthen the deterministic HU-refinement instruction. Route: inline after one delegated read-only map because the three bounded work units overlap the existing advisor/admin surfaces and no parallel writer trigger applies. Risk: item 3, the shared refinement prompt is a provider-consumed contract; frontend/admin presentation remains backward compatible. Commit and push: prohibited. Real Gemini calls and Edge/CDP: prohibited. Evidence: L50.

## Log

### L41 — Final form and grounded objectives refactor (2026-10-28, verbatim)

```text
Usá ODD (no SDD). Refactor acotado sobre feat/ai-advisor. Avanzá directo
y gastá la menor cuota posible.

REGLAS
- git status primero. Hay trabajo previo sin commitear del asesor en la
  rama: no lo reviertas ni lo pises (nada de checkout, clean ni
  stash); trabajá encima. Sin commit ni push. No tocar frontend/dist,
  company-context.js, la lógica de viabilidad más allá de lo indicado,
  backlog ni migraciones. No hace falta migración: el payload es JSON.
- No lances subagentes de verificación (gentle-ai-verify).
- CERO llamadas reales a Gemini: proveedor mockeado. Yo pruebo a mano.
  Solo tests focalizados. Sin dependencias nuevas.
- Animaciones: solo CSS puro (advisor.css, prefijo adv-). No uses
  Framer Motion en el flujo del asesor.
- Leé odd/tasks/ai-advisor.md, utils/asesorPayload.js, las pantallas del
  flujo, el schema de POST /api/proyectos, el prompt y la sanitización
  del asesor, y cómo el panel admin arma "Resumen del proyecto". Lo
  que no encuentres o te sorprenda, reportalo; no lo supongas.

OBJETIVO
Simplificar el formulario final: que solo pida lo que todavía no se
capturó. Todo lo demás sale de etapas anteriores y llega igual al
backend. Sin perder datos, sin duplicar y sin inventar.

=== 1. FORMULARIO FINAL ===
Queda solo:
- Empresa y contacto: nombre de la empresa, persona de contacto,
  email, teléfono, rubro (con "otro").
- Presupuesto y plazos: presupuesto, plazo, información adicional.
Eliminá del formulario final: tipo de solución, proceso actual,
objetivos, funcionalidades, plataformas, cantidad de usuarios y tipos
de usuario. Mantené las validaciones de los campos que quedan.

=== 2. PRIMERA PANTALLA ===
Concentra el contexto inicial. Obligatorios: la idea y el nuevo campo
"¿Cómo realizan actualmente este proceso?" (texto libre, mínimo
razonable según lo que exige hoy el backend; con ayuda: "Si hoy no
existe un proceso, contanos cómo lo resolvés actualmente, por ejemplo
'de forma manual' o 'no lo hacemos'"). Obligatorias: funcionalidades
(catálogo), plataformas, tipos de usuario, cantidad aproximada y un
selector "Tipo de solución" (los 6 tipos del backend, más "No estoy
seguro"). Trasladá a esta pantalla las validaciones que antes vivían
en los pasos eliminados (por ejemplo la del proceso actual).
Si no elige tipo, el payload usa 'personalizada' y se marca
asesoramiento.tipoInferido=true. Verificá cómo y dónde se usa
tipoProyecto (señales de viabilidad, resumen del admin) y reportalo.
Agregá procesoActual a datosIniciales del estado del asesor (el
backend lo valida con tope de longitud; es texto del cliente: va
dentro de la zona NO CONFIABLE del prompt, como la idea).

=== 3. OBJETIVOS INFERIDOS (sin llamada extra) ===
- Provider: sumá a la respuesta de cada ronda objetivos:[{texto,
  basado_en}] (schema del proveedor simple, solo strings). Máximo 5,
  cada uno de hasta 12 palabras, redactados con verbo en infinitivo
  ("Reducir errores de carga"), sin repetirse entre sí. Instruí: solo
  objetivos respaldados por lo que dijo el cliente, no inventes
  ninguno; si no hay evidencia, devolvé la lista vacía; no incluyas
  precios, plazos ni viabilidad.
- Estado: el cliente envía objetivos:[{texto, basadoEn}] (los vigentes)
  en cada ronda, para que Gemini los mantenga o refine.
- Validación en el servidor, con el MISMO mecanismo de grounding que
  las sugerencias (normalización, tildes, plurales, stopwords, umbral
  configurable). Contexto permitido para los objetivos (nivel
  proyecto): idea, procesoActual, textos de las HU vigentes y
  respuestas de todas las HU. Un objetivo es válido si su basado_en
  está en ese contexto.
- En CADA ronda, y también en el CIERRE sin llamada, revalidá los
  objetivos vigentes contra el contexto actual: si el cliente editó o
  eliminó lo que los respaldaba, caen. Si el proveedor devuelve una
  lista vacía o inválida, conservá los vigentes que sigan respaldados
  (no los borres por una ronda mala).
- La falta de objetivos NUNCA dispara reparación ni llamadas extra, ni
  cuenta como degradación.
- La respuesta del endpoint incluye objetivos (lista validada).
  Actualizá el contrato en odd/tasks/ai-advisor.md, el test del prompt
  determinístico y el trace (recibidos, válidos, descartados con
  motivo).
- Pantalla de confirmación: sección de solo lectura "Objetivos que
  entendimos" (si hay), con la nota de que el administrador los verá.
  Si no hay, no se muestra la sección.

=== 4. PAYLOAD (utils/asesorPayload.js, función pura) ===
Mantené el shape actual. Fuente de cada campo:
- empresa: formulario final.
- proyecto.tipoProyecto: selector de la primera pantalla o
  'personalizada' (con tipoInferido).
- problema.problemaActual: idea. problema.procesoActual: campo nuevo de
  la primera pantalla. problema.objetivos: textos de los objetivos
  validados (array de strings, puede ser vacío).
- funcionalidades.seleccionadas: funcionalidades del catálogo de las
  HU vigentes (HU.funcionalidad no nula, sin duplicados) más las
  elegidas en la primera pantalla que sigan teniendo una HU vigente. Si
  el cliente eliminó la HU de una funcionalidad, esa funcionalidad
  sale. Si queda vacía, usá las elegidas en la primera pantalla; si
  tampoco hay, mirá qué exige el backend y reportámelo (no inventes
  funcionalidades). Las HU sin funcionalidad del catálogo no entran
  acá: viajan en asesoramiento.
- alcance: plataformas, cantidadUsuarios y tiposUsuario de la primera
  pantalla (necesitaTiposUsuario 'Sí' si hay tipos).
- presupuesto: presupuesto, plazo e infoAdicional del formulario final.
- asesoramiento: versión 2, con objetivos:[{texto, basadoEn}],
  procesoActual y tipoInferido. Los lectores (panel admin, análisis,
  backlog) aceptan versión 1 y 2; los campos nuevos son opcionales.
Con "Continuar sin asesor": el payload se arma igual con lo capturado
en la primera pantalla, objetivos vacíos y sinAsesor=true.

=== 5. BACKEND ===
- Relajá SOLO lo necesario: problema.objetivos puede ser una lista
  vacía. No debilites ninguna otra validación (tipoProyecto sigue
  siendo requerido; el frontend lo completa). Aceptá en el subobjeto
  asesoramiento los campos nuevos, con tamaños máximos.
- Verificá con un test que el payload armado por el frontend pasa el
  schema real de POST /api/proyectos, en los tres casos: con asesor y
  objetivos, con asesor sin objetivos, y sin asesor.
- Los proyectos ya guardados siguen leyéndose igual (sin migración).

=== 6. PANEL ADMIN: RESUMEN DEL PROYECTO ===
Como el payload conserva el shape, el resumen debería leer las mismas
claves. Verificalo y ajustá solo lo necesario:
- Origen de cada dato según la tabla: Empresa y Rubro (formulario
  final); problema clave (idea); proceso actual (primera pantalla);
  objetivos (inferidos); funcionalidades; plataformas, usuarios y
  tipos (primera pantalla); presupuesto, plazo e información adicional
  (formulario final).
- Los objetivos inferidos llevan la etiqueta "Inferidos por IA a
  partir del relevamiento"; si no hay: "Sin objetivos respaldados por
  el relevamiento" (nunca una fila vacía). Si tipoInferido, mostrá
  "Tipo de solución: no especificado por el cliente".
- Sin filas vacías por esta refactorización: un campo opcional sin dato
  se omite; uno requerido sin dato no debería existir (reportá si
  aparece).
- Sin duplicación: las funcionalidades del resumen son las del
  catálogo; el detalle de las HU sigue solo en "Relevamiento guiado".
  Los objetivos aparecen en el resumen, no repetidos en otro bloque.
- Proyectos viejos (sin asesoramiento o versión 1, con objetivos
  elegidos a mano por el cliente): se ven como hoy, sin la etiqueta de
  "inferidos".
- El análisis de viabilidad no cambia su lógica; el payload completo
  sigue viajando como hoy. Verificá que las señales siguen
  calculándose con los campos nuevos (por ejemplo, que procesoActual
  corto se marque como campo vacío) y que los tests de señales siguen
  verdes.

=== TESTS ===
Frontend (node:test y renderToStaticMarkup, sin librerías nuevas):
asesorPayload en los tres casos y con funcionalidad eliminada;
validaciones de la primera pantalla (proceso actual obligatorio) y del
formulario final reducido; render del formulario final sin los campos
eliminados; sección de objetivos en la confirmación; render del
resumen admin con proyecto nuevo, nuevo sin objetivos, sin asesor y
viejo (versión 1), sin filas vacías.
Backend (proveedor mockeado): objetivos con basado_en válido se
aceptan; sin evidencia se descartan; revalidación cuando cae la HU
que los respaldaba; lista vacía del proveedor conserva los vigentes
respaldados; sin llamadas ni reparación por falta de objetivos; el
schema de POST acepta los tres payloads armados por el frontend;
el prompt determinístico y el trace incluyen el nuevo contrato; las
señales de viabilidad siguen verdes.

Sin commit ni push. Cero llamadas reales a Gemini.
```

### L39 — Multi-select and complete dark advisor refinement (2026-10-25)

- User authorized direct ODD implementation on `feat/ai-advisor`, with no commit/push, no real Gemini calls, no dependencies, no verification subagent, and focused tests only.
- Exact required public strings and formats are preserved in S58–S62: **"Otra"**, **"No sé"**, **"Enviar respuestas"**, **"Pregunta 1 de 4"**, **"Mi idea (n)"**, **"La IA está pensando…"**, `"A; B; Otra: texto"`, and the 375/768/1024/1280px responsive set.
- Pre-write inventory found the light start/confirmation/final/success surfaces come from `.adv-screen` using `--cfg-surface`; degradation uses light `--cfg-selection`; errors use light `--cfg-error-surface`; the split workspace already overrides itself to dark. `Continuar sin asesor` reaches the same light final-details screen.
- CodeGraph initialization was attempted first but the upstream `codegraph` executable is unavailable; bounded filesystem mapping was used as the documented fallback.
- Next step: observe focused RED tests for serialization, rendering, prompt/sanitization, and CSS motion contracts before implementation.

### L40 — AIADV-20 implementation evidence (2026-10-25)

- RED: frontend failed because `deserializeAdvisorAnswer` and `AdvisorQuestion.js` did not exist; backend failed reserved-option sanitization, the 1600-character response limit, and the new deterministic prompt requirements.
- GREEN: option/mixta questions now share checkbox UI with required 250-character Otra and exclusive No sé; pure serialization is `A; B; Otra: texto`; provider options are normalized, reserved values removed, duplicates collapsed, and fewer than two options become text.
- Visual result: all advisor screens use advisor-local graphite/navy surfaces, semantic dark warnings/errors, 1440px shell, 15px body/16px questions/12px uppercase labels, stable round/question/story identities, answered question blocks, CSS-only entries/feedback, and reduced-motion overrides.
- Verification: backend advisor unit/integration 62 passed, 1 obsolete legacy test skipped; frontend state/workspace/API 25/25; temporary build transformed 443 modules; targeted ESLint and Prettier passed; Impeccable detector returned `[]`; static tests prove visible animation defaults, backwards fill, one infinite animation, no advisor Framer Motion import, and dark scoped CSS; `git diff --check` passed. Gemini calls, commits, pushes, and dependencies: 0.
- Responsive runtime proof remains pending: Edge and Chrome both exited with environment code 13 before CDP opened, so 375/768/1024/1280 live `scrollWidth` measurements could not be captured. The user already owns manual verification; no source or repository state was changed by the failed probes.

### L22 — Scoped advisor workspace correction (2026-10-22, verbatim)

```text
Usá ODD (no SDD). Hacé una corrección acotada sobre el flujo del asesor. Gastá la menor cuota posible. Sin push. Sin commit hasta mi aprobación. No commitear frontend/dist. No lances subagentes de verificación. No hagas llamadas reales a Gemini: todo con mocks/tests.

Primero revisá git status. Si hay cambios sin commitear, frená y avisame.

OBJETIVO
Corregir 4 problemas del workspace del asesor:

1. SUGERENCIAS
Ahora las sugerencias ya aparecen, pero cuando toco “incluir” desaparecen sin feedback. Quiero que el usuario vea claramente que la sugerencia fue agregada.
Necesito una confirmación visible y clara (por ejemplo estado agregado / incorporada / aplicada, o feedback equivalente) antes de que desaparezca o cambie de estado.

2. HU DE LA DERECHA NO SE ACTUALIZA
Cuando avanzo de HU1 a HU2, la HU anterior en la columna derecha sigue mostrando el texto viejo, como al inicio.
Quiero que la columna “Tu idea, hasta ahora” refleje siempre la última versión refinada de cada HU, incluyendo la HU anterior cuando ya fue enriquecida con las respuestas del cliente.

3. SUGERENCIAS SIEMPRE PRESENTES
Quiero que la IA siempre intente devolver sugerencias de mejora, con máximo 2 por ronda.
Revisá prompt, postprocesado y fallback.
Objetivo de comportamiento:
- si hay oportunidad razonable de mejora, mostrar 1 o 2 sugerencias;
- máximo 2;
- no romper el contrato público;
- no inventar contenido absurdo;
- si el proveedor no devuelve sugerencias útiles, resolvelo del lado servidor de forma segura para no dejar siempre la lista vacía.

4. RESALTAR “FUNCIONALIDAD ACTUAL”
La franja superior que muestra “Funcionalidad actual” y la HU enfocada debe quedar visualmente más destacada para que el cliente la diferencie claramente del bloque de preguntas.
Quiero un destaque visual claro, coherente con el tema oscuro actual, sin romper el layout ni meter cards dentro de cards.

ALCANCE
Podés tocar únicamente lo necesario en:
- backend del advisor
- frontend del advisor workspace
- estilos advisor.css
- tests relacionados
- odd/tasks/ai-advisor.md si hace falta documentar

NO tocar:
- panel interno
- company-context.js
- endpoints no relacionados
- migraciones
- frontend/dist

VERIFICACIÓN
Quiero que:
- reproduzcas la causa exacta de cada problema;
- agregues regresiones/tests focalizados;
- verifiques que al aceptar una sugerencia haya feedback visible;
- verifiques que la HU previa quede actualizada al pasar a la siguiente;
- verifiques que existan sugerencias utilizables en la ronda, con tope 2;
- verifiques que el bloque “Funcionalidad actual” quede claramente diferenciado visualmente;
- build temporal correcto;
- git diff --check correcto.

ENTREGA
Al final mostrame solo:
1. causa exacta de cada problema;
2. archivos modificados;
3. tests agregados/actualizados y resultado;
4. resumen breve de los cambios visuales;
5. si quedó listo para probar manualmente;
6. riesgo.

Sin commit todavía.
```

### L23 — Continuation authorization (2026-10-22, verbatim)

```text
segui normal, dsp subo todo junto
```

The pre-existing uncommitted advisor changes were explicitly accepted as the working baseline. No commit or push is authorized; `frontend/dist` remains excluded.

### L24 — AIADV-13 correction evidence (2026-10-22)

- Root causes: suggestion acceptance removed the item without retaining a UI-visible status; the cross-focus provider merge previously authorized only the new focus instead of the answered HU; postprocessing returned an empty list whenever provider suggestions were absent/invalid; and `.adv-current` used only a subtle top rule on the same graphite header field.
- RED: focused frontend tests failed because acceptance returned no feedback and the workspace rendered no status; visual structure lacked a distinct background/full border. Focused backend tests failed because empty provider suggestions stayed empty and the prompt still allowed passive evaluation.
- GREEN: acceptance now returns and renders a persistent `role="status"` confirmation; complete endpoint story replacement preserves the refined prior HU while focus advances; prompt requests one or two grounded suggestions and postprocessing creates at most two safe `definir` fallbacks only from confirmed role/benefit/detail data; the current-functionality strip has its own raised dark field and one-pixel accent border.
- Verification: mocked backend advisor tests 30/30; frontend state/workspace/API tests 12/12; temporary Vite build transformed 440 modules outside `frontend/dist`; Impeccable detector returned `[]`; targeted backend ESLint, Prettier, and `git diff --check` passed. Real Gemini calls: 0. Commits/pushes: 0.

### L25 — Focus-bound suggestions and id-less refinement correction (2026-10-22, verbatim)

```text
Usá ODD. Hacé una corrección acotada sobre feat/ai-advisor.

Sin push ni commit.
No tocar frontend/dist, company-context.js, panel admin, viabilidad, backlog ni migraciones.
No hacer llamadas reales a Gemini. Usar mocks.

Hay 2 bugs confirmados en prueba manual.

============================================================
1. SUGERENCIAS DE HU2 USAN CONTEXTO DE HU1
============================================================

Caso real:
- HU1 = Gestión de ventas.
- HU2 = Gestión de stock.
- Al pasar a HU2, las preguntas sí hablan de stock.
- Pero las sugerencias hablan de ventas, ingresos, productos vendidos y datos respondidos en HU1.

Rastreá:
focus actual
→ prompt
→ respuestas usadas
→ fallback de sugerencias
→ postprocess
→ respuesta endpoint
→ frontend.

Regla:
Toda sugerencia debe estar ligada a la HU enfocada.

Si focus = HU2 Gestión de stock:
- usar contexto de HU2;
- usar respuestas de HU2;
- no construir sugerencias desde respuestas de HU1.

Puede relacionar otra HU sólo si aporta una mejora clara al foco actual.
Ejemplo válido:
“Actualizar el stock automáticamente al registrar una venta.”

Ejemplo inválido:
crear otra HU centrada en ventas mientras el foco es stock.

Agregar test:
HU1 ventas completa + HU2 stock enfocada
→ ninguna sugerencia debe generarse usando HU1 como contexto principal.

Mantener:
- máximo 2 sugerencias;
- fallback;
- sugerencias rechazadas;
- sin inventar datos.

============================================================
2. HU1 SIGUE SIN ACTUALIZARSE AL PASAR A HU2
============================================================

Después de responder HU1 y avanzar a HU2, la columna
“Tu idea, hasta ahora” sigue mostrando el texto inicial de HU1.

La corrección anterior no resolvió el flujo real.

Hacé un test secuencial:

HU1 enfocada
→ cliente responde
→ CONTINUAR
→ proveedor devuelve HU1 refinada
→ foco avanza a HU2
→ endpoint devuelve HU1 refinada
→ frontend conserva HU1 refinada
→ AdvisorWorkspace muestra HU1 refinada.

Verificá especialmente:
- raw provider;
- postprocess;
- data.historias;
- applyAdvisorRoundResult;
- setHistories;
- render.

No asumir que el problema sigue siendo focusId.
Revisar también normalización/reconciliación si el provider devuelve HU sin id.

Mantener protegidas:
- editada_cliente;
- bloqueada;
- respuestas noSabe.

============================================================
VERIFICACIÓN
============================================================

Sin Gemini real.

Tests mínimos:
- HU1 refinada persiste al pasar a HU2.
- HU2 recibe sugerencias de stock, no de ventas.
- máximo 2 sugerencias.
- rechazadas no reaparecen.
- editada_cliente no se reescribe.

Ejecutar:
- tests focalizados backend/frontend;
- ESLint;
- Prettier;
- build temporal;
- git diff --check.

No ejecutar suite backend completa.
No commit.

Al final mostrar:
1. causa exacta de ambos bugs;
2. archivos modificados;
3. tests agregados;
4. resultados;
5. riesgo residual.
```

### L26 — AIADV-14 correction evidence (2026-10-22)

- Exact suggestion cause: postprocessing selected `rewriteStoryIds` as fallback-suggestion context. When HU1 answers completed it while the deterministic focus advanced to HU2, `rewriteStoryIds=["hu-1"]`; empty/invalid provider suggestions therefore generated deterministic sales suggestions from HU1 instead of stock suggestions from HU2.
- Exact stale-HU cause: provider stories were indexed only by a truthy `id`. An authorized HU1 refinement returned with `id=""` was excluded from `providerById`, appended as a new story, and left the original HU1 unchanged at index 0; endpoint/frontend correctly preserved that stale list.
- Correction: prompt rules and postprocessing now require focus grounding; provider suggestions that omit the focused explicit functionality are discarded, and fallback reads only the focused story plus answers with that exact `historiaId`. Anonymous provider stories are associated positionally, or with the sole unmatched authorized rewrite ID, before merge. The service no longer authorizes focus rewriting when there is no useful refinable answer.
- Sequential proof: HU1 sales completes, raw provider returns refined HU1 without ID, focus advances to HU2 stock, endpoint returns exactly two stories with refined HU1, frontend state stores the complete list, and workspace rows render `story.texto`. Locked/editada_cliente and noSabe protections remain covered.
- Verification: mocked backend advisor tests 32/32; frontend advisor/workspace/API tests 14/14; targeted backend ESLint and Prettier pass; temporary Vite build transforms 440 modules outside `frontend/dist`; `git diff --check` passes. Real Gemini calls, commits, and pushes: 0.

### L27 — Explicit refinement and suggestion policy correction (2026-10-22, verbatim)

```text
Usá ODD (no SDD). Corrección acotada sobre feat/ai-advisor. Avanzá
directo y gastá la menor cuota posible.

REGLAS
- git status primero. Sin commit ni push (lo pruebo antes). No
  tocar frontend/dist, company-context.js, panel admin, viabilidad,
  backlog, migraciones ni el shape de payload.asesoramiento.
- No lances subagentes de verificación (gentle-ai-verify).
- CERO llamadas reales a Gemini (tengo 20 por día): el proveedor
  siempre mockeado. Solo tests focalizados, no la suite completa. No
  agregues dependencias.
- Mantené las sugerencias de IA: forman parte de la experiencia.
- Leé odd/tasks/ai-advisor.md y el código real: servicio del asesor
  (normalización, mergeStories, postprocess), prompt, schemas,
  controller, y en el frontend applyAdvisorRoundResult, el estado de
  historias y AdvisorWorkspace.

CASO REAL
HU1 inicial: "Como empleado, quiero registrar las ventas del día,
para controlar lo que se vende." El cliente responde la primera tanda
(4 preguntas); sigue el foco en HU1 con la segunda tanda; al
completarla, el foco pasa a HU2. En "Tu idea, hasta ahora" HU1 sigue
mostrando el texto inicial.

PASO 0: REPRODUCIR ANTES DE ARREGLAR
Escribí primero el test secuencial (ver Tests) y mostrame que FALLA,
indicando en qué etapa exacta se pierde el texto: proveedor crudo,
normalización, mergeStories, postprocess, response.data.historias,
applyAdvisorRoundResult, setHistories o el render. No adivines la
causa. Hipótesis a verificar, y decime cuáles se confirman:
 H1. El frontend marca integrada=true al ENVIAR las respuestas; si el
     proveedor no refina esa HU en esa llamada, esas respuestas no se
     vuelven a integrar nunca.
 H2. Mapeo por id: el proveedor devuelve id vacío, distinto o repetido,
     o directamente omite HU1.
 H3. En la ronda en que el foco pasa a HU2, el prompt pide preguntas
     de HU2 pero no pide explícitamente refinar HU1.
 H4. El frontend reemplaza HU1 por la versión enviada en el request
     al aplicar la respuesta, o una ronda posterior reenvía el texto
     viejo.
 H5. El postprocess restaura el texto viejo por un flag bloqueada
     mal calculado.

PASO 1: ARREGLO Y ENDURECIMIENTOS (obligatorios aunque la causa sea otra)
a) Refinamiento explícito. En cada ronda el servidor calcula aRefinar
   = HU no bloqueadas con respuestas integrada=false, y las envía al
   prompt en un bloque separado: id, texto actual y respuestas nuevas.
   Gemini responde un campo nuevo refinadas:[{id, texto}], aparte de
   preguntas y sugerencias (schema del proveedor simple, sin enums).
   Se refina en toda ronda que traiga respuestas nuevas, y
   obligatoriamente cuando una HU se completa, también cuando el foco
   pasa a otra HU.
b) Mapeo robusto. Por id. Si el id falta o no coincide, respaldo
   posicional SOLO si la cantidad de refinadas coincide con la de
   aRefinar (mismo orden). Si no, se descarta con log sanitizado y las
   respuestas siguen pendientes.
c) Control de integradas por el servidor. La respuesta del endpoint
   incluye integradas: [preguntaId] con las respuestas realmente
   reflejadas (HU con texto refinado válido y no vacío, aunque sea
   idéntico). El frontend deja de marcar integrada=true al enviar:
   marca solo las de integradas. Las demás se reenvían en la ronda
   siguiente, así ninguna respuesta se pierde.
d) response.data.historias es la lista completa con los textos
   refinados aplicados; las HU bloqueadas (editada_cliente o creadas
   por el cliente) no se tocan.
e) Frontend: applyAdvisorRoundResult usa data.historias como fuente
   de verdad para las HU no bloqueadas y nunca reenvía el texto viejo.
   Si el cliente edita una HU mientras hay una ronda en curso, esa
   edición no debe perderse al llegar la respuesta: elegí la solución
   más simple (bloquear la edición mientras carga, o mezclar por flag
   bloqueada) y decime cuál.
f) Actualizá el contrato en odd/tasks/ai-advisor.md con los campos
   nuevos (refinadas e integradas) y el test determinístico del
   prompt.
Mantené protegidas: editada_cliente, bloqueada y noSabe.

PASO 2: POLÍTICA DE SUGERENCIAS (decidida por código)
- Máximo 2 por ronda, siempre sobre la HU en foco.
- Primera ronda de una HU (todavía sin respuestas): ninguna.
  Desde la segunda ronda de esa HU: permitidas, usando SOLO las
  respuestas de esa HU como contexto. Las respuestas y textos de otras
  HU se pasan únicamente como títulos, nunca como base para sugerir.
- El servidor envía al prompt sugerenciasPermitidas (true o false) y,
  en el postproceso, descarta toda sugerencia si no están permitidas,
  si repite o se parece a una HU existente, si ya fue rechazada o ya
  fue aceptada. No obligues a generar sugerencias vacías o sin
  fundamento: cero es válido.
- Redacción natural: segunda persona, una frase de hasta 25 palabras
  que apoye la idea en algo que el cliente respondió (por ejemplo
  "Como llevás el stock en Excel, ¿querés poder importar esa
  planilla?"), sin lenguaje técnico ni meta-lenguaje ("sugerencia de
  tipo...").
- Al cambiar el foco, las sugerencias sin resolver se descartan: lo
  que llega en la respuesta de cada ronda las reemplaza.
- UI: bloque "Sugerencias" debajo de las preguntas, rotulado con la HU
  en foco; mantener "Agregar a mi idea", "No, gracias" y el feedback
  visible al aceptar.

TESTS (proveedor mockeado)
Backend, endpoint con el proveedor guionado ronda por ronda:
 1. HU1 inicial. 2. Primera tanda de respuestas. 3. Segunda tanda.
 4. El proveedor devuelve HU1 refinada y el foco pasa a HU2.
 5. El endpoint devuelve HU1 refinada e integradas con los ids
    correctos. 6. El siguiente request lleva el texto refinado.
Repetí la secuencia con estos proveedores: id válido; id=""; ids
mezclados; HU1 omitida (las respuestas deben quedar pendientes y
reenviarse); ids repetidos; texto vacío. Comprobá además: HU
bloqueada intacta, noSabe pasa a supuesta, y las sugerencias
(ninguna en la primera ronda de una HU, descartadas si repiten o
fueron rechazadas, y verificá sobre el texto del prompt que no incluye
las respuestas de otras HU).
Frontend: sin librerías nuevas. Extraé la lógica de applyAdvisorRoundResult
a funciones puras testeables con node:test, y para el render usá
renderToStaticMarkup con react-dom (ya instalado). Comprobá: el estado
conserva HU1 refinada, el render la muestra, el siguiente request la
lleva, solo se marcan integradas las de integradas, y la edición del
cliente se conserva.

VERIFICACIÓN: backend advisor focalizado, frontend focalizado, build a
un directorio temporal, ESLint, Prettier, git diff --check.

REPORTE FINAL (corto)
1. Causa exacta (qué hipótesis se confirmó y con qué evidencia: el
   test que fallaba antes). 2. Cómo quedó la política de sugerencias.
3. Archivos modificados. 4. Tests agregados. 5. Resultados.
6. Riesgo residual. Sugerí un mensaje de commit.
```

### L1 — Original Unit 1 request (2026-10-20, verbatim)

```text
Usá ODD (no SDD). Avanzá directo y gastá la menor cuota posible.
Esta es la UNIDAD 1 de 3 (backend del asesor de requerimientos).

REGLAS
- Revisá git status: si hay cambios sin commitear, frená y avisame.
  Creá la rama feat/ai-advisor desde la rama actual. Un commit por
  unidad. Sin push. No commitear frontend/dist.
- No lances subagentes de verificación (gentle-ai-verify): la
  verificación funcional la hago yo.
- No toques company-context.js (los valores son míos), no arregles el
  known issue del rollback de la migración 005 ni el cuelgue de la
  suite completa. Solo tests focalizados. Sin migraciones nuevas.
- Tengo un límite de 20 llamadas diarias a Gemini: en tests Gemini
  siempre mockeado. Llamadas reales en esta unidad: máximo 2.
- Antes de escribir código leé: gateway de Gemini, prompts y schemas
  Zod existentes, service/controller/routes de proyectos, tests,
  company-context.js (solo lectura) y frontend/src/data/
  projectOptions.js (catálogo de funcionalidades). Respetá las
  convenciones (envelope uniforme, camelCase, etc.).
- Guardá el contrato de abajo, ajustado a lo que encuentres, en
  odd/tasks/ai-advisor.md: las unidades 2 y 3 lo van a leer.

OBJETIVO
Hoy el cliente completa un formulario de 7 pasos y la IA recién entra
al final. Nuevo enfoque: un ASESOR de IA que, desde la idea del
cliente, arma historias de usuario (HU) y le hace preguntas guiadas,
UNA funcionalidad por vez, hasta que el cliente confirma. Esta unidad
es el motor: un endpoint público de "ronda".

DISEÑO (ya decidido, no lo vuelvas a preguntar)
- Backend SIN estado: el cliente envía el estado completo en cada
  ronda. No se guarda la conversación (sin migración).
- El CÓDIGO decide el foco, las preguntas pendientes y cuándo termina;
  GEMINI solo redacta preguntas, actualiza HU y sugiere mejoras.
- Una ronda = una llamada a Gemini = preguntas de UNA sola HU (el foco).
- HU independientes entre sí: el orden se expresa con "etapa".
- Una HU bloqueada (editada o creada por el cliente) NUNCA la
  reescribe la IA.
- Aspectos a cubrir por HU (constante editable): quien_la_usa,
  beneficio, comportamiento, datos_previos, volumen, restricciones.
- Tope de 6 funcionalidades detalladas por sesión. Las demás quedan
  con aDetallar=true ("a detallar con el equipo").
- Máximo 4 preguntas y 2 sugerencias por ronda, y 12 HU en total.
- Sin precios, plazos, viabilidad ni compromisos; ni datos internos
  (presupuestos mínimos, capacidad, equipo).

CONFIG: backend/src/config/advisor-config.js (todo editable, con
comentarios): aspectos, topeFuncionalidades=6, maxPreguntasPorRonda=4,
maxSugerenciasPorRonda=2, maxHistorias=12, maxLargoIdea=3000,
maxLargoHistoria=400, maxLargoRespuesta=600, maxRespuestas=60,
maxRondasSesion=15, limiteIp={ventanaMs:3600000, max:40}.
También exportá contextoPublico: SOLO servicios de Logotype y
fueraDeAlcance, tomados de company-context.js sin modificarlo; nunca
presupuestos, capacidad ni equipo.

ENDPOINT PÚBLICO (sin autenticación): POST /api/asesor/ronda
Body: { sesionId, cerrar?, estado } con
estado = {
  idea,
  datosIniciales: { funcionalidades[], plataformas[], tiposUsuario[],
    cantidadUsuarios },
  historias: [{ id, texto, estado, bloqueada, etapa, aDetallar,
    funcionalidad|null }],
  respuestas: [{ preguntaId, historiaId, aspecto, pregunta,
    respuesta, noSabe, integrada }],
  sugerenciasRechazadas: [string]
}
estado de HU: entendida | supuesta | editada_cliente | sugerida_ia.
Respuesta (envelope uniforme) data = {
  historias: [...lista completa actualizada...],
  foco: { historiaId } | null,
  preguntas: [{ id, aspecto, tipo, texto, opciones[] }],
  sugerencias: [{ id, tipo, texto }],
  progreso: { detalladas, total, completas, tope },
  completo: boolean,
  motivoCierre: 'completo' | 'cerrado_por_cliente' | 'limite' | null
}
tipo de pregunta: opcion | texto | mixta (opciones de 2 a 6 en opcion
y mixta). tipo de sugerencia: mejora | complementaria | etapas | definir.

LÓGICA DEL SERVIDOR (funciones puras y testeables, en
backend/src/services/advisor/)
1. Validar con Zod el body y los tamaños; 400 uniforme si no cumple.
2. Un aspecto está cubierto para una HU si existe una respuesta
   (aunque sea noSabe) con ese historiaId y aspecto. HU completa =
   todos los aspectos cubiertos.
3. Orden = orden del array. Las HU más allá de la sexta no completa
   quedan aDetallar=true. Foco = primera HU incompleta que no sea
   aDetallar. Preguntas pedidas = hasta 4 aspectos pendientes del foco.
4. Modos: INICIAL (sin HU): crea las HU desde idea y datosIniciales,
   ordenadas por importancia, y pregunta sobre la primera.
   CONTINUAR: integra las respuestas con integrada=false en las HU no
   bloqueadas y pregunta sobre el nuevo foco. CIERRE (no hay foco o
   cerrar=true): integra respuestas pendientes SIN preguntar; si no hay
   respuestas sin integrar, NO llames a Gemini.
5. cerrar=true o sesión por encima de maxRondasSesion: los aspectos
   pendientes se tratan como supuestos, completo=true y motivoCierre
   'cerrado_por_cliente' o 'limite'.
6. Si una HU tiene alguna respuesta noSabe y no está bloqueada, su
   estado pasa a 'supuesta' (lo fuerza el servidor, no la IA).
7. Repregunta: la IA puede devolver duda_critica (string, vacío si no
   hay) cuando una respuesta abre una duda crítica o contradice una HU
   bloqueada. Si viene y esa HU no tuvo repregunta antes, la ronda
   devuelve SOLO esa pregunta (aspecto 'aclaracion', tipo texto) con
   foco en esa HU y se ignoran las otras preguntas.
8. Postproceso de lo que devuelve Gemini: restaurar el texto de toda
   HU bloqueada (defensa aunque la IA lo cambie); asignar ids a lo
   nuevo; descartar preguntas cuyo aspecto no fue pedido; recortar a
   los máximos; descartar sugerencias repetidas o ya rechazadas;
   descartar ítems inválidos y seguir (solo falla si la estructura es
   irrecuperable).

GEMINI
- Reutilizá el gateway. Respuesta JSON con schema del proveedor SIMPLE
  (solo string, array, object y required; sin enums ni min/max, porque
  Gemini ya rechazó un schema complejo): {
  historias:[{id,texto,estado,etapa}],
  preguntas:[{aspecto,tipo,texto,opciones[]}],
  sugerencias:[{tipo,texto}], duda_critica }. Zod hace la validación
  estricta después. Verificá maxOutputTokens y el thinking budget para
  que la respuesta no llegue cortada.
- Prompt: usá EXACTO el mecanismo de zona no confiable del prompt de
  viabilidad (BEGIN/END_UNTRUSTED..., largo en bytes, último marcador
  standalone). Todo lo que escribe el cliente (idea, respuestas, texto
  de las HU) va en esa zona; contextoPublico, el modo, el foco y los
  aspectos pedidos van fuera, como datos confiables. Instrucciones:
  español neutro y cercano, preguntas simples sin tecnicismos, no
  repetir lo respondido, HU en formato "Como [rol], quiero [acción],
  para [beneficio]" de hasta 30 palabras, autónomas e independientes,
  nunca tocar HU bloqueadas, sugerencias concretas y basadas en lo
  que dijo el cliente, solo sobre servicios de Logotype, sin
  precios/plazos/viabilidad; si hay duda crítica, devolverla en
  duda_critica y NO preguntar sobre otra HU.
- Test determinístico del prompt (texto exacto) y caso adversarial
  (el cliente escribe el marcador de cierre o "ignorá las
  instrucciones").

PROTECCIONES
- Límite por IP (advisor-config) y por sesionId (máx. de llamadas por
  sesión), en memoria, con reloj inyectable para tests. Excedido: 429
  con código RATE_LIMITED en el envelope uniforme.
- Si Gemini falla (429 de cuota, 5xx, timeout, JSON irrecuperable):
  503 con código ADVISOR_UNAVAILABLE, sin detalles internos, para que
  el frontend ofrezca continuar sin asesor. Registrá la causa
  sanitizada como ya hace el gateway.
- No cambies ningún endpoint existente.

TESTS (Gemini mockeado)
Lógica pura (cobertura de aspectos, foco, tope de 6, aDetallar,
restauración de HU bloqueadas, recortes, estado supuesta por noSabe,
repregunta una sola vez, cierre) y endpoint (INICIAL, CONTINUAR,
CIERRE sin llamada, cerrar=true, límite de sesión, 400 por tamaño,
429 RATE_LIMITED, 503 ante fallo del proveedor, endpoint accesible
sin autenticación). Hacé como máximo 2 llamadas reales a Gemini (una
ronda INICIAL con una idea corta de una ferretería y una CONTINUAR) y
mostrame solo: HU, preguntas y sugerencias.

CIERRE: lint y prettier de lo tocado, git diff --check, tests
focalizados. Commit: "feat(advisor): requirements advisor rounds
endpoint". Reporte corto: archivos, tests, la muestra real y los
valores de advisor-config.
```

### L2 — Start evidence (2026-10-20)

- Initial dirty-worktree blocker was resolved by the user.
- Started `feat/ai-advisor` from `feat/admin-workflow` at `ad49a09`.
- CodeGraph lazy initialization was attempted and failed because the `codegraph` executable is unavailable; repository mapping therefore used read-only filesystem tools.
- Required pre-write surfaces were mapped with path/line evidence. The project uses simple provider schemas plus strict local Zod, a byte-counted final-marker untrusted zone, uniform envelopes, ESM/camelCase, Node tests, and no existing auth or reusable rate limiter.

### L3 — Unit 1 verification evidence (2026-10-20)

- RED: the two focused test files failed with `ERR_MODULE_NOT_FOUND` before the advisor implementation existed.
- GREEN: `npm test -- tests/unit/advisor-round.test.js tests/integration/advisor.api.test.js tests/unit/project-analysis.test.js` — 25/25 passed.
- `npx eslint` over every touched backend JavaScript file — passed with zero warnings.
- `npx prettier --check` over every touched source, test, and task file — passed.
- `git diff --check` — passed; Git emitted only the repository's LF-to-CRLF working-copy notice for two pre-existing tracked files.
- One authorized real INICIAL attempt returned the public `ADVISOR_UNAVAILABLE` failure with a sanitized provider-stage diagnostic and no HU payload. The CONTINUAR attempt was intentionally not made to avoid spending another Gemini call after an unclassified provider failure.
- No migration, `company-context.js`, `frontend/dist`, existing endpoint behavior, migration rollback, or full-suite execution was touched.

### L4 — Native review correction (2026-10-20)

- `R3-detail-cap-bypass`: the positional six-functionality cap now keeps every later HU at `aDetallar=true`, even when client-supplied answers cover all aspects.
- `R3-nonfocus-rewrite`: provider output may update only the server-selected `focusId`; other existing unlocked HUs remain unchanged.
- RED: both regression tests failed against `d3753a5`; GREEN: the focused unit file passed 13/13 after the bounded correction.
- Final focused backend proof passed 27/27; targeted ESLint, Prettier check, and `git diff --check` also passed.

### L5 — Original Unit 2 request (2026-10-20, verbatim)

```text
Usá ODD (no SDD). Avanzá directo y gastá la menor cuota posible.
UNIDAD 2 de 3: frontend del asesor. Verificá que la unidad 1 esté
commiteada (rama feat/ai-advisor); si no, frená. Sin push. No
commitear frontend/dist. No lances subagentes de verificación. No hagas
llamadas reales a Gemini en esta unidad: yo lo pruebo a mano.

Leé primero: odd/tasks/ai-advisor.md (contrato), el endpoint de ronda,
el ProjectConfigurator actual y sus componentes, utils/api.js,
validation.js, data/projectOptions.js, App.jsx, DESIGN.md, PRODUCT.md,
y los estilos del sitio público y del configurador.

OBJETIVO
Reemplazar el configurador de 7 pasos por el flujo con asesor. App.jsx
debe seguir navegando igual (mismo punto de entrada).

PANTALLAS
A) INICIO. Solo la descripción libre de la idea es obligatoria. Cuadros
   opcionales con el título "Ayudanos a entender mejor tu idea":
   funcionalidades (el catálogo existente, con "Otra"), plataformas,
   tipo de usuarios del sistema y cantidad aproximada. Botón
   "Empezar": primera ronda (INICIAL).
B) PANTALLA DIVIDIDA. Izquierda: preguntas de la ronda (rótulo "Sobre:
   [HU en foco]"), cada una según su tipo (opciones, texto o mixta),
   con "No sé" siempre disponible; botón "Enviar respuestas"; bloque
   "Sugerencias" debajo, con "Agregar a mi idea" y "No, gracias". Debajo,
   "Ya está, armá el resumen". Derecha: "Tu idea, hasta ahora": solo
   el texto principal de cada HU (nunca criterios ni alcance), badge de
   estado (entendida, supuesta, editada por vos, sugerida por la IA,
   "a detallar con el equipo"), etapa, editar en el lugar, eliminar
   (con confirmación) y "+ Agregar historia" (texto libre).
   Progreso visible: "Funcionalidad 2 de 4" y "3 de 4 completas".
   Botón "Agregar funcionalidad": selector con sugeridas por relación
   (tabla fija en el frontend, sin llamar a Gemini; por ejemplo Gestión
   de stock → Gestión de proveedores, Gestión de compras, Reportes y
   estadísticas; Gestión de ventas → Facturación, Gestión de clientes,
   Reportes y estadísticas; Gestión de pedidos → Notificaciones,
   Gestión de clientes; Login y autenticación → Roles y permisos,
   Gestión de usuarios; completá el resto con ese criterio sobre el
   catálogo real) y "Otra" con texto libre. Al agregar, se crea una HU
   local con un texto base simple, sin bloquear, y la IA la refina en
   la ronda siguiente.
   Reglas: editar o crear una HU la marca bloqueada y 'editada_cliente'
   (aceptar una sugerencia la crea como 'sugerida_ia', no bloqueada);
   NINGÚN cambio del cliente dispara una llamada; todo viaja en el
   estado de la ronda siguiente; marcar integrada=true en las
   respuestas ya enviadas; guardar sugerencias rechazadas. En mobile,
   las HU pasan a una pestaña "Mi idea (n)".
C) CONFIRMACIÓN (cuando completo=true): lista de HU con los supuestos
   resaltados y dos botones: "Está todo bien, enviar" y "Quiero ajustar
   algo" (vuelve a B; si el cliente agrega o cambia algo, solo se
   reabre esa funcionalidad).
D) DATOS FINALES: empresa, contacto, email, teléfono, rubro (+otro),
   presupuesto, plazo e información adicional. REUTILIZÁ las
   validaciones existentes (validateEmpresa, validatePresupuesto).
E) ÉXITO: reutilizá la pantalla actual.

FALLBACK SIN ASESOR: ante 503 ADVISOR_UNAVAILABLE, 429 o error de red,
mostrar un aviso claro con "Reintentar" y "Continuar sin asesor", que
lleva a D y envía el pedido con lo que haya (idea, funcionalidades
elegidas y las HU existentes), marcando asesoramiento.sinAsesor=true.

PAYLOAD (puro, en utils/asesorPayload.js)
Construí el payload de POST /api/proyectos con el mismo shape que hoy
(empresa, proyecto, problema, funcionalidades, alcance, presupuesto):
problemaActual = idea; funcionalidades.seleccionadas = funcionalidades
del catálogo elegidas o agregadas; alcance.plataformas, cantidadUsuarios
y tiposUsuario (necesitaTiposUsuario 'Sí' si hay tipos); presupuesto y
empresa desde D. Agregá la clave nueva "asesoramiento": { version:1,
ideaOriginal, historias[{id,texto,estado,etapa,aDetallar,
funcionalidad}], respuestas[{historiaId,aspecto,pregunta,respuesta,
noSabe}], sugerencias:{aceptadas[],rechazadas[]}, completo, rondas,
sinAsesor }. Leé el schema real de POST /api/proyectos: NO debilites
ninguna validación ni inventes contenido para campos que el backend
exija y el nuevo flujo no recoja (por ejemplo tipoProyecto, objetivos
o procesoActual): pedilos con un control mínimo en la pantalla A o D y
decime exactamente qué agregaste. Verificá con un script temporal (no
lo commitees) que un payload mapeado pasa el schema del backend.

DISEÑO
Mantené la identidad del sitio público (tokens y tipografías de
DESIGN.md). Estilos nuevos en frontend/src/styles/advisor.css con
prefijo adv-; no modifiques tokens ni clases compartidas ni el panel.

NO usar Framer Motion.
Las animaciones de este flujo deben hacerse con CSS puro:
- transición breve entre pantallas;
- entrada suave de preguntas;
- entrada suave de HU nuevas;
- resaltado breve cuando una HU se actualiza;
- solo transform y opacity;
- sin ocultar contenido de forma prolongada;
- respetar prefers-reduced-motion.

El contenido debe permanecer visible y no debe haber flicker.
Sin cards dentro de cards.

Accesibilidad:
- región con aria-live que anuncie las preguntas nuevas;
- mover el foco a la primera pregunta nueva;
- labels en todos los controles;
- objetivos táctiles de al menos 44px;
- contraste AA;
- estados de carga ("La IA está pensando…") y de error diseñados;
- avisar antes de abandonar la página si hay progreso.

El estado vive en memoria.
VERIFICACIÓN: build a un directorio temporal, sin scroll horizontal a
375/768/1280px, payload válido, la navegación del sitio intacta y el
panel sin cambios. Commit: "feat(advisor): client advisor screens".
Reporte corto: archivos, campos que agregaste por exigencia del backend
y cómo probarlo a mano.
```

### L6 — Unit 2 start evidence (2026-10-20)

- Verified clean `feat/ai-advisor` at Unit 1 commit `598032e` before any Unit 2 write.
- CodeGraph lazy initialization failed because the `codegraph` executable is unavailable; a bounded read-only explorer mapped the frontend, API contracts, and project schema instead.
- The implementation route is inline after mapping because no writer trigger applies. The established `exception-ok` strategy and one-commit-per-unit constraint remain in force.

### L7 — Unit 2 verification evidence (2026-10-20)

- RED: the focused frontend tests failed with `ERR_MODULE_NOT_FOUND` before `asesorPayload.js` and `advisorState.js` existed, and the API test failed before `ApiRequestError` was exported. GREEN: `node --test tests/api.test.js tests/asesorPayload.test.js tests/advisorState.test.js` passed 4/4.
- A representative payload produced by `buildAdvisorProjectPayload` passed the real backend `projectBodySchema` with `asesoramiento.version=1`.
- `npm run build -- --outDir C:\Users\Susana Horia\AppData\Local\Temp\opencode\logotype-advisor-build --emptyOutDir` completed successfully with 439 modules transformed; no `frontend/dist` output was created or changed.
- A temporary Edge/CDP harness with a mocked advisor response opened the existing `configurador` navigation entry and exercised start, workspace, confirmation, and final-details screens at 375, 768, and 1280 px. Every measured screen reported `scrollWidth <= innerWidth`.
- Visual readback confirmed the mobile questions/`Mi idea (n)` tabs, desktop split workspace, readable state/progress hierarchy, and the corrected final-details heading contrast. `impeccable detect --json` returned no findings.
- Required legacy fields added to final details: `tipoProyecto`, `procesoActual`, at least one `objetivos` value, and any missing required functionality, platform, and user-range values not supplied in the optional start context. Conditional other-industry, other-objective, other-functionality, and other-user-type text remains explicit.
- Prettier check and `git diff --check` passed. `frontend/src/App.jsx`, panel components, `frontend/src/styles/panel.css`, and `frontend/dist` remained unchanged. No real Gemini call or verification subagent was used.
- Native assessment for the Unit 2 commit returned `medium` with `review_due=false` and `review_due_reason=under_budget`; no review lifecycle was started.

### L8 — Unit 3 start evidence (2026-10-21)

- Recovered the authorized Unit 3 requirements from the session compaction summary; the original pre-compaction request text was not available verbatim, so this log does not fabricate a verbatim copy.
- Verified a clean `feat/ai-advisor` at `2c7ae11`, with Unit 1 at `598032e`, before the first Unit 3 write.
- CodeGraph lazy initialization was attempted and failed because the `codegraph` executable is unavailable; a bounded read-only explorer mapped the admin, persistence, viability, backlog, and focused-test surfaces instead.
- Existing loose project schemas and repository serialization already preserve the complete advisor payload. Unit 3 will add regression proof rather than unnecessary production transformations.
- The implementation route is inline because there is one coupled work unit and no writer trigger. No independent verification subagent or real Gemini call is authorized.

### L9 — Unit 3 verification evidence (2026-10-21)

- RED: the advisor signal, viability-summary, and backlog-baseline assertions failed before implementation; the frontend detail test failed with `ERR_MODULE_NOT_FOUND` before `advisorDetail.js` existed.
- GREEN: focused validation, viability-signal, analysis-prompt, and backlog-contract tests passed 22/22; the advisor-detail test passed 1/1.
- Focused integration proof passed for exact advisor payload POST/persistence/list/detail round-trip and the unchanged administrator `VIABLE` backlog gate, 2/2.
- The broader combined focused command timed out after 120 seconds after its first 12 API tests had passed. A separately run pre-existing backlog-diagnostics file still fails 4/4 because its fixture omits `decisionViabilidad: 'VIABLE'` and reaches the unchanged gate with 409 instead of its expected downstream 502; Unit 3 did not modify that fixture or gate.
- The temporary frontend production build completed with 440 modules transformed at `C:\Users\Susana Horia\AppData\Local\Temp\opencode\logotype-advisor-unit3-build`; `frontend/dist` remained unchanged.
- Targeted ESLint passed, Prettier check passed, `git diff --check` passed, and `impeccable detect --json` returned no findings.
- No real Gemini call, independent verification subagent, migration, provider schema change, administrator decision change, `company-context.js` edit, or push was performed.

### L10 — Scoped correction request (2026-10-21, verbatim)

```text
Usá ODD. Quiero una corrección ACOTADA sobre feat/ai-advisor.
No hagas push. No tocar frontend/dist. No tocar company-context.js,
migraciones, análisis de viabilidad, decisión administrativa ni backlog.

Hay dos problemas encontrados durante la prueba manual del asesor.

============================================================
1. BUG: "CONTINUAR CON EL ASESOR" NO CONTINÚA
============================================================

Situación real:

Después de la ronda inicial aparece una HU, por ejemplo:

"Como empleado, quiero registrar las ventas, para mantener un control
de lo vendido."

La pantalla muestra:

- Funcionalidad 1 de 1
- 0 de 1 completas
- botón "CONTINUAR CON EL ASESOR"

Al pulsarlo:
1. aparece un estado tipo "Preparando las preguntas...";
2. termina la carga;
3. no aparecen preguntas;
4. vuelve a mostrarse "CONTINUAR CON EL ASESOR".

No arregles esto por intuición.

Primero rastreá exactamente:

frontend click
→ payload enviado a POST /api/asesor/ronda
→ modo/foco calculado por backend
→ respuesta del endpoint
→ actualización del estado round en frontend
→ decisión que hace que se renderice "Continuar con el asesor".

Reproducilo con provider/Gemini MOCKEADO para no gastar llamadas reales.

Verificá especialmente:
- historias enviadas;
- respuestas;
- integrada;
- foco;
- aspectos pendientes;
- preguntas devueltas;
- progreso;
- completo;
- motivoCierre;
- qué condición del frontend muestra "Continuar con el asesor".

Encontrá la causa raíz y corregí solamente esa causa.

Agregá un test de regresión que cubra exactamente:

INICIAL
→ devuelve al menos una HU
→ HU todavía incompleta
→ usuario continúa
→ el servidor selecciona esa HU como foco
→ devuelve las preguntas pendientes
→ el frontend puede renderizar esas preguntas.

No cambies el contrato público salvo que exista un error demostrado en
el contrato.

Gemini real: 0 llamadas durante diagnóstico y corrección.
Si después de tener tests verdes necesitás una comprobación real,
frená y decime antes.

============================================================
2. HACER MÁS COMPACTA LA PANTALLA DEL ASESOR
============================================================

Las capturas reales muestran que la interfaz desperdicia demasiado
espacio vertical.

El encabezado "DÉMOSLE FORMA A TU PROYECTO" es demasiado grande y hace
que preguntas e historias queden fuera del primer viewport.

Quiero conservar la identidad Engineering Blueprint, pero convertir
esta pantalla en un workspace mucho más compacto y funcional.

OBJETIVO DESKTOP

En 1280/1366px de ancho debe poder verse simultáneamente:

- encabezado;
- HU en foco;
- progreso;
- comienzo de las preguntas de la izquierda;
- primera/s HU de la derecha;

sin tener que hacer scroll para recién entender qué está pasando.

Cambios:

- Reducir fuertemente la altura del hero/header del workspace.
- El título no debe dominar la pantalla.
- Usar un título aproximado de 36–48px en desktop, responsive.
- Reducir paddings verticales.
- Integrar progreso en el encabezado de forma compacta.
- Mantener "Sobre: [HU]" visible debajo del título, pero compacto.
- Hacer que la división Preguntas / Tu idea empiece mucho más arriba.
- Mantener dos columnas claras en desktop.
- Dar ligeramente más espacio a "Tu idea, hasta ahora" si mejora
  legibilidad, aprox. 46/54 o 45/55.
- Limitar anchos de texto para evitar líneas excesivamente largas.
- Compactar badges, etapa, Editar/Eliminar y separadores.
- "Agregar historia" y "Agregar funcionalidad" deben seguir visibles,
  pero no ocupar alturas innecesarias.
- El botón principal no debe ser desproporcionadamente grande.
- Evitar grandes zonas vacías.
- No usar cards dentro de cards.

IMPORTANTE:
No reduzcas el tamaño hasta perjudicar legibilidad.
La intención es mayor densidad útil, no hacer todo diminuto.

MOBILE
Conservar las pestañas Preguntas / Mi idea.
No intentar mostrar las dos columnas simultáneamente en mobile.

ANIMACIONES
CSS puro.
No Framer Motion en este flujo.
Sin flicker.
Respetar prefers-reduced-motion.

AISLAMIENTO
Modificar solo clases adv- y archivos del asesor cuando sea posible.
No cambiar estilos globales, sitio público ni panel administrativo.

============================================================
VERIFICACIÓN
============================================================

- tests focalizados del bug;
- tests existentes del advisor;
- build temporal;
- comprobar 375 / 768 / 1280 / 1366 px;
- sin scroll horizontal;
- inspección visual del workspace;
- ESLint;
- Prettier;
- git diff --check.

NO hagas commit todavía.

Al terminar mostrame:
1. causa exacta del bug "Continuar con el asesor";
2. archivos modificados;
3. test de regresión;
4. resultados de tests/build;
5. qué cambiaste visualmente;
6. si quedó alguna advertencia.
```

### L11 — Scoped correction start evidence (2026-10-21)

- Verified a clean `feat/ai-advisor` at `dc30aaf` before the first write; no push or commit is authorized.
- CodeGraph lazy initialization was attempted and failed because the `codegraph` executable is unavailable; one read-only explorer mapped the complete continuation flow and advisor-only visual surfaces.
- The mapped failure gap is an incomplete focused HU coexisting with an empty postprocessed question list; the frontend label depends only on `round.preguntas.length === 0`. A sequential mocked regression must reproduce the real state transition before the correction is selected.
- Implementation remains inline: the two correction tasks overlap `AdvisorWorkspace.jsx`, so the parallel-writer trigger does not apply.

### L12 — Scoped correction verification evidence (2026-10-21)

- Root cause reproduced with a mocked sequential INICIAL→CONTINUAR endpoint test: postprocessing could discard or receive no provider questions and returned the successful state with an incomplete focus, `completo=false`, `motivoCierre=null`, and `preguntas=[]`; the frontend selected **"Continuar con el asesor"** solely from the empty question list.
- RED: the sequential endpoint test received no continuation questions; the frontend test failed because the shared `hasAdvisorQuestions` render predicate did not exist. GREEN: postprocessing now preserves valid provider questions and deterministically backfills every missing requested aspect, while the component and pure test share the exact render predicate.
- Existing focused advisor proof passed: backend unit + integration tests 25/25; frontend advisor/API/payload/detail tests 6/6. No real Gemini call was made.
- The temporary Vite production build completed with 440 modules at `C:\Users\Susana Horia\AppData\Local\Temp\opencode\logotype-advisor-correction-build`; `frontend/dist` remained untouched.
- Headless Edge/CDP with a mocked advisor response verified 375/768/1280/1366px. Every viewport had `scrollWidth <= innerWidth`; mobile showed one tab panel at a time and switched to visible stories; at 1280/1366 the header, focus, compact progress, first question, and first two stories appeared together in the 768px viewport. Desktop title sizes were 40.96px and 43.712px. Reduced motion computed to `0.01ms`.
- Backend targeted ESLint passed. Frontend ESLint is unavailable because that package has neither an ESLint dependency nor an `eslint.config.*`; invoking `npx eslint` fetched ESLint 10 transiently and failed before linting. No dependency or configuration was added for this scoped correction.
- `impeccable detect --json --scope layout` returned no findings. Final Prettier check, `git diff --check`, and prohibited-surface status are recorded at closure.
- Risk: none. The public response shape is unchanged, fallback questions use existing allowed question fields/types, and focused regression tests cover the changed shared postprocessing path.

### L13 — Dark workspace and suggestion-proof request (2026-10-22, verbatim)

```text
Usá ODD. Hacé una corrección acotada sobre feat/ai-advisor.
Sin push. No tocar frontend/dist. No tocar company-context.js,
migraciones, análisis de viabilidad, decisión administrativa ni backlog.

Hay dos ajustes de UX y una verificación funcional pendiente en el
workspace del asesor.

============================================================
1. MANTENER EL WORKSPACE EN TEMA OSCURO
============================================================

Actualmente, después del encabezado oscuro, las columnas de preguntas
y "Tu idea, hasta ahora" pasan a un fondo blanco/gris muy claro.

Quiero que TODO el workspace mantenga la identidad oscura Engineering
Blueprint del sitio.

Objetivo:
- fondo general navy/graphite;
- superficies internas apenas diferenciadas, no blancas;
- texto principal claro;
- texto secundario slate/gris azulado;
- bordes técnicos finos;
- cyan/blueprint solo para foco, progreso, selección y acciones;
- contraste AA;
- sin cards dentro de cards;
- evitar grandes bloques rellenos innecesarios.

Las dos columnas deben seguir distinguiéndose claramente por:
- borde divisor;
- jerarquía tipográfica;
- pequeños cambios de superficie si hace falta.

No modificar tokens globales ni estilos del panel.
Solo clases adv- y advisor.css cuando sea posible.

============================================================
2. HACER EXPLÍCITA LA HU / FUNCIONALIDAD ACTUAL
============================================================

Ahora el cliente ve:

"Sobre: Como empleado..."

pero no queda suficientemente claro qué funcionalidad está detallando.

Quiero que el encabezado compacto muestre algo como:

FUNCIONALIDAD ACTUAL
Gestión de ventas

HU 1 DE 4
Como empleado, quiero registrar las ventas realizadas,
para tener un control del flujo de dinero.

Si funcionalidad es null, usar un fallback humano basado en la HU,
sin mostrar null ni nombres técnicos.

En "Tu idea, hasta ahora":

- mostrar contador total: "4 HU";
- numerar cada historia:
  HU 1 · Gestión de ventas
  HU 2 · Gestión de productos
  HU 3 · Gestión de stock
  ...
- si funcionalidad existe, mostrarla junto al número;
- destacar visualmente la HU que está siendo detallada:
  "EN DETALLE AHORA";
- mantener badge de origen/estado:
  entendida, supuesta, editada por vos, sugerida por la IA,
  a detallar con el equipo;
- no agregar cards anidadas.

Revisá también el significado de "ETAPA BORRADOR".
No cambies el contrato sin necesidad, pero si el frontend está usando
"borrador" como fallback genérico que no representa una etapa real,
reemplazalo por una presentación más clara.
No inventes etapas.

============================================================
3. SUGERENCIAS DE MEJORA NO APARECEN
============================================================

En la prueba real no aparecen sugerencias debajo de las preguntas,
aunque forman parte del contrato del asesor.

NO lo arregles por intuición.

Rastreá:

respuesta de Gemini mockeada
→ postprocesamiento backend
→ response.sugerencias del endpoint
→ round.sugerencias en frontend
→ condición de render de AdvisorWorkspace.

Determiná primero cuál de estos casos ocurre:

A) Gemini/proveedor devuelve sugerencias pero backend las descarta.
B) Backend devuelve sugerencias pero frontend no las renderiza.
C) Gemini devuelve realmente sugerencias: [].
D) Existe otra causa.

El contrato actual permite hasta 2 sugerencias por ronda.

Cuando existan, deben verse debajo de las preguntas:

SUGERENCIAS

[Mejora]
"Como actualmente usás Excel, podrías importar los productos
iniciales desde una planilla."

[ AGREGAR A MI IDEA ]   [ NO, GRACIAS ]

Reglas existentes:
- aceptar crea HU sugerida_ia, no bloqueada;
- rechazar guarda el texto para no repetirla;
- aceptar/rechazar NO dispara una llamada por sí solo;
- no mostrar sección vacía si no existen sugerencias.

Agregá tests focalizados para:
- endpoint con sugerencias válidas;
- frontend recibe y conserva sugerencias;
- sugerencia aceptada;
- sugerencia rechazada;
- lista vacía no rompe la UI.

No hagas llamadas reales a Gemini para diagnosticar esto.

============================================================
VERIFICACIÓN
============================================================

- tests focalizados backend/frontend;
- build temporal;
- 375 / 768 / 1280 / 1366 px;
- sin scroll horizontal;
- inspección visual;
- Prettier;
- git diff --check.

No hagas commit todavía.

Al terminar mostrame:
1. causa exacta de que no aparecieran sugerencias;
2. archivos modificados;
3. tests agregados;
4. resultado de tests/build;
5. resumen de cambios visuales;
6. si "ETAPA BORRADOR" tenía una causa legítima o era solo presentación.
```

### L14 — Dark workspace and suggestion-proof start evidence (2026-10-22)

- Recovered the existing uncommitted AIADV-4/5 correction and preserved its seven changed files; the new work continues on top without commit or push.
- CodeGraph initialization was attempted once and remains unavailable because the `codegraph` executable is absent; one bounded read-only explorer mapped the current suggestion, focus, story, stage, and advisor-only CSS flows.
- The mapped suggestion path preserves a valid mocked suggestion through backend postprocessing, endpoint envelope, frontend `setRound`, and the existing non-empty render condition. Focused RED assertions are required before classifying the real missing-suggestion case conclusively.
- Implementation remains inline because the visual changes and suggestion lifecycle share `AdvisorWorkspace.jsx`, `ProjectConfigurator.jsx`, advisor state helpers, and their focused tests; parallel writers would overlap edit surfaces.

### L15 — Dark workspace and suggestion-proof verification evidence (2026-10-22)

- RED: frontend focused tests failed because suggestion lifecycle, suggestion renderability, focus-label fallback, and stage-presentation helpers did not exist. The initial endpoint assertion also exposed that suggestion IDs are intentionally generated rather than stable fixture IDs; the corrected contract assertion verifies the generated prefix plus exact type/text.
- GREEN: backend advisor unit + integration proof passed 25/25. Frontend API/state/payload/detail proof passed 11/11, including endpoint preservation, acceptance as unlocked `sugerida_ia`, rejection persistence, and empty-list render safety. Gemini real calls remained zero.
- Suggestion classification: a valid mocked provider suggestion survives `processSuggestions`, the endpoint envelope, `requestAdvisorRound`, `setRound`, and the non-empty render predicate. Therefore A and B are false for valid contract data. The contract permits an empty provider array, and that C path intentionally hides the empty section; the historical real provider payload was not persisted, so it cannot be reconstructed more narrowly without another real call.
- The temporary Vite production build completed with 440 modules at `C:\Users\Susana Horia\AppData\Local\Temp\opencode\logotype-advisor-dark-build`; `frontend/dist` remained untouched.
- Headless Edge/CDP with a fully mocked round verified 375/768/1280/1366 px. Every viewport had `scrollWidth <= innerWidth`; mobile preserved one tab panel at a time; desktop preserved both columns; computed workspace/question surfaces were `rgb(16, 25, 35)`, the story surface was `rgb(21, 31, 42)`, and primary text was `rgb(243, 246, 248)`.
- Visual readback confirmed the compact current-functionality hierarchy, `HU 1 de 4`, `4 HU`, numbered functionality labels, `EN DETALLE AHORA`, origin/state badges, visible suggestion type/text/actions, and no displayed `Borrador` stage. The Impeccable detector reported one side-stripe warning; the single correction replaced it with a one-pixel full focus inset, and the final responsive confirmation remained green.
- Prettier and `git diff --check` passed. Prohibited surfaces remained unchanged. Risk: none; the public API shape and provider contract are unchanged, advisor-only state behavior is pinned by focused tests, and styling is scoped to the advisor workspace.

### L16 — Initial-functionality and suggestion-emphasis request (2026-10-22, verbatim)

```text
Usá ODD. Hacé una corrección ACOTADA sobre feat/ai-advisor.
Sin push. No tocar frontend/dist. No tocar company-context.js,
migraciones, análisis de viabilidad, decisión administrativa ni backlog.

Hay dos problemas encontrados en la prueba manual real.

============================================================
1. LAS FUNCIONALIDADES ELEGIDAS AL INICIO NO SE RESPETAN
============================================================

Caso reproducido:

En la pantalla inicial seleccioné 2 funcionalidades:
- Gestión de ventas
- Gestión de stock

Pero después de iniciar el asesor, el workspace mostró:

Funcionalidad 1 de 1
1 HU

y solo creó una HU.

Esto indica que una o más funcionalidades seleccionadas en
datosIniciales.funcionalidades se están perdiendo antes o durante la
ronda INICIAL.

NO lo arregles por intuición.

Rastreá exactamente:

AdvisorStart
→ initialData.funcionalidades
→ payload enviado por requestAdvisorRound
→ body recibido por POST /api/asesor/ronda
→ estado.datosIniciales.funcionalidades
→ lógica INICIAL del advisor-service/engine
→ respuesta del proveedor
→ postprocesamiento
→ historias finales devueltas
→ setHistories en ProjectConfigurator.

Verificá con mock determinístico este caso exacto:

datosIniciales.funcionalidades = [
  "Gestión de ventas",
  "Gestión de stock"
]

Resultado requerido:
- ambas funcionalidades deben quedar representadas en las HU iniciales;
- ninguna selección explícita del cliente debe desaparecer;
- Gemini puede mejorar/redactar la HU, pero no omitir una funcionalidad
  elegida explícitamente por el cliente;
- cada funcionalidad seleccionada debe quedar asociada a una HU mediante
  historia.funcionalidad;
- respetar maxHistorias y topeFuncionalidades existentes.

IMPORTANTE:
Si el proveedor devuelve solo una HU aunque el cliente haya elegido dos
funcionalidades, el servidor debe preservar/completar determinísticamente
las funcionalidades explícitas faltantes, sin inventar nuevas.

Agregá test de regresión:
INICIAL con dos funcionalidades explícitas
→ proveedor devuelve solo una
→ respuesta final conserva las dos HU.

No cambies el contrato público.

============================================================
2. SUGERENCIAS DE MEJORA DEBEN DESTACARSE VISUALMENTE
============================================================

Actualmente las preguntas normales están claras, pero la sección de
sugerencias no se distingue suficientemente o directamente no aparece
cuando no hay sugerencias en esa ronda.

Primero conservá la lógica existente:
- máximo 2 sugerencias por ronda;
- aceptar → crea HU sugerida_ia, desbloqueada;
- rechazar → guarda el texto;
- aceptar/rechazar no llama a Gemini;
- si sugerencias=[] no inventar sugerencias.

Cuando existan sugerencias, quiero que se muestren claramente debajo
de las preguntas como un bloque visual diferente.

Ejemplo visual:

SUGERENCIA DE LA IA
MEJORA

"Como manejás stock, podrías agregar una alerta cuando un producto
esté por agotarse."

[ AGREGAR A MI IDEA ]   [ NO, GRACIAS ]

Requisitos visuales:
- fondo ligeramente distinto del resto del panel;
- borde/acento cyan o blueprint;
- ícono o rótulo textual discreto, no decorativo;
- texto "SUGERENCIA DE LA IA";
- mostrar tipo: Mejora / Complementaria / Etapas / Definir;
- no confundir con una pregunta;
- mantener tema oscuro;
- contraste AA;
- sin card anidada innecesaria;
- CSS puro, clases adv-;
- mobile sigue siendo legible.

Si sugerencias=[]:
- no mostrar un bloque vacío;
- no inventar contenido.

Además, cuando no haya sugerencias en una ronda, no debe interpretarse
como error: Gemini puede devolver cero.

============================================================
VERIFICACIÓN
============================================================

- tests focalizados backend/frontend;
- caso exacto con 2 funcionalidades iniciales;
- provider mock que omite una HU;
- sugerencia válida renderizada;
- sugerencias=[] seguro;
- build temporal;
- 375/768/1280/1366;
- sin scroll horizontal;
- Prettier;
- git diff --check.

Gemini real: 0 llamadas durante diagnóstico.
No hagas commit todavía.

Al terminar mostrame:
1. causa exacta de que se perdiera la segunda funcionalidad;
2. archivos modificados;
3. test de regresión;
4. resultado de tests/build;
5. cómo quedó el bloque de sugerencias;
6. cualquier riesgo o advertencia.
```

### L17 — Initial-functionality correction start evidence (2026-10-22)

- Preserved the existing uncommitted AIADV-4 through AIADV-7 correction on `feat/ai-advisor`; no commit or push is authorized.
- The complete frontend/request path preserves both selected values. The exact loss occurs after the provider response: new provider stories have `funcionalidad:null`, INICIAL validates only that at least one story exists, and no code reconciles returned stories against explicit `datosIniciales.funcionalidades`.
- The existing endpoint fixture already sends `Gestión de ventas` and `Gestión de stock` while its provider mock returns only one story, making it the exact RED surface.
- Implementation remains inline: AIADV-8 is one backend invariant plus endpoint proof, and AIADV-9 is a small refinement of the existing advisor-only suggestion markup/CSS. No writer trigger applies.

### L18 — Initial-functionality and suggestion-emphasis verification (2026-10-22)

- Root cause: the frontend and request body preserved both explicit selections, but the provider schema did not carry `funcionalidad`; new provider stories were postprocessed with `funcionalidad:null`, and INICIAL only required at least one surviving story. No reconciliation restored explicit selections omitted by the provider.
- RED: the exact existing endpoint fixture sent `Gestión de ventas` and `Gestión de stock`, the provider returned only its sales story, and the response contained one HU instead of two.
- GREEN: INICIAL now associates provider stories positionally with explicit client selections, appends deterministic base HUs only for missing explicit selections, retains provider-only extras within `maxHistorias`, and reapplies `topeFuncionalidades`. The public and provider contracts remain unchanged.
- Backend focused tests passed 25/25 after preserving the previous no-selection/empty-provider diagnostic fixture. Targeted backend ESLint passed. Frontend suggestion/API state tests passed 9/9. Gemini real calls remained zero.
- The temporary Vite production build completed with 440 modules at `C:\Users\Susana Horia\AppData\Local\Temp\opencode\logotype-advisor-functions-build`; `frontend/dist` remained untouched.
- Headless Edge harness selected the two initial functionality controls before submitting and observed the exact request array at every viewport. The workspace displayed `HU 1 de 2`, `2 HU`, `HU 1 · Gestión de ventas`, and `HU 2 · Gestión de stock` at 375/768/1280/1366 px with no horizontal overflow.
- The suggestion section renders as a single differentiated dark surface (`rgb(27, 40, 53)`) with a thin blueprint border (`rgb(143, 183, 240)`), **Sugerencia de la IA**, **Mejora**, text, and both actions. Mobile remains legible; individual suggestions stay separator rows rather than nested cards. Impeccable detection returned no findings.
- Risk: none. The invariant is INICIAL-only, bounded by existing maxima, uses exact client labels without inventing functionality names, and is covered at the public endpoint. Final Prettier and `git diff --check` are recorded at closure.

### L19 — Refinement, contextual-question, and suggestion-prompt request (2026-10-22, verbatim)

```text
Usá ODD. Trabajá sobre feat/ai-advisor.

No push.
No tocar frontend/dist.
No tocar company-context.js.
No tocar análisis de viabilidad, decisión administrativa ni backlog.

En una prueba real del asesor detecté tres comportamientos que quiero
revisar de punta a punta antes de cambiar código.

CASO REAL

HU 1:
"Como la persona de la librería, quiero registrar las ventas,
para tener un control claro de los ingresos."

Respondí las preguntas de:
- quién la usa;
- beneficio;
- comportamiento;
- información necesaria;
- volumen;
- restricciones.

Después el sistema pasó correctamente a:

HU 2:
"Como la persona de la librería, quiero controlar el stock de los libros,
para saber qué tengo disponible."

Pero observé:

1. La HU1 visible a la derecha siguió mostrando prácticamente el texto
   inicial; no percibí ningún refinamiento después de responderla.

2. Para HU2 aparecieron exactamente las mismas preguntas genéricas:
   - ¿Quién va a usar esta funcionalidad?
   - ¿Qué beneficio necesitás obtener con esta funcionalidad?
   - ¿Qué debería poder hacer esta funcionalidad?
   - ¿Qué información necesita para funcionar?

3. No apareció ninguna sugerencia de mejora durante HU1 ni al comenzar HU2.

============================================================
1. VERIFICAR POR QUÉ LA HU NO SE REFINA
============================================================

Rastreá:

respuestas del usuario
→ payload CONTINUAR
→ markPendingAnswersIntegrated
→ prompt a Gemini
→ historia enfocada devuelta por proveedor
→ postprocesamiento
→ processed.historias
→ estado frontend
→ render de la HU derecha.

Quiero determinar si:

A) Gemini devuelve una HU refinada pero el backend la descarta.
B) Backend la conserva pero frontend no actualiza.
C) Gemini devuelve exactamente el texto original.
D) El diseño actual directamente no le pide/refuerza suficientemente
   que refine la HU.
E) Otra causa.

No asumir.

Comportamiento deseado:

Cuando el cliente responde información útil sobre una HU no bloqueada,
la siguiente ronda puede mejorar su redacción utilizando ÚNICAMENTE
información confirmada por el cliente.

Ejemplo:

Inicial:
"Como la persona de la librería, quiero registrar las ventas,
para tener un control claro de los ingresos."

Respuestas:
- la usan empleados y administrador;
- registrar productos, cantidades, precios y total;
- 30–50 ventas por día.

Una HU refinada válida podría ser:

"Como empleado de la librería, quiero registrar cada venta con sus
productos, cantidades, precios y total, para mantener un control claro
de los ingresos."

No incorporar:
- supuestos no confirmados;
- detalles técnicos;
- criterios de aceptación;
- información que el cliente marcó "No sé".

IMPORTANTE:
- HU editada_cliente permanece bloqueada;
- nunca reescribir intención del cliente;
- no convertir una HU en una especificación enorme;
- mantener formato humano y corto.

Agregá un test de regresión con proveedor mock:
respuesta del usuario → proveedor devuelve HU refinada →
la siguiente respuesta del endpoint y el frontend muestran el nuevo texto.

============================================================
2. PREGUNTAS CONTEXTUALIZADAS POR HU
============================================================

Los aspectos pueden seguir siendo los mismos para cada HU.
NO quiero eliminar:

- quien_la_usa
- beneficio
- comportamiento
- datos_previos
- volumen
- restricciones

Lo que quiero evitar es que la experiencia parezca un formulario
idéntico repetido.

Revisá cómo se construye el prompt y cómo Gemini genera las preguntas.

Las preguntas deben mencionar o contextualizar la funcionalidad actual.

Ejemplo para "Gestión de stock":

En vez de:
"¿Quién va a usar esta funcionalidad?"

Preferir:
"Para gestionar el stock, ¿quién va a consultar o actualizar las
existencias?"

En vez de:
"¿Qué debería poder hacer esta funcionalidad?"

Preferir:
"En la gestión de stock, ¿qué acciones necesitás realizar con los libros?"

En vez de:
"¿Qué información necesita para funcionar?"

Preferir:
"Para controlar el stock, ¿qué datos necesitás guardar de cada libro?"

Mantener:
- lenguaje simple;
- una pregunta por aspecto;
- sin vocabulario técnico innecesario;
- máximo actual de preguntas;
- no inventar requisitos.

Si Gemini devuelve una pregunta genérica o inválida y el backend debe
hacer fallback determinístico, ese fallback también debe incorporar de
forma segura el nombre de la funcionalidad cuando exista.

Agregá tests.

============================================================
3. SUGERENCIAS DE MEJORA
============================================================

En varias rondas reales Gemini está devolviendo:

sugerencias: []

El pipeline ya fue probado y funciona cuando existe una sugerencia.
El problema práctico es que el usuario nunca está viendo esta capacidad.

Revisá el prompt actual y explicame por qué el modelo puede terminar
sistemáticamente en [].

Quiero ajustar la instrucción de Gemini así:

- evaluar activamente si existe una mejora útil para la HU actual;
- si existe una mejora razonable y basada en el contexto, devolver
  1 sugerencia;
- máximo 2 según contrato actual;
- no inventar una sugerencia únicamente para cumplir una cuota;
- no repetir algo que ya esté en la HU o en respuestas;
- no sugerir funcionalidades fuera del objetivo;
- no sugerir detalles técnicos al cliente.

Una sugerencia buena para este ejemplo podría ser:

HU Gestión de stock:
"Como también registrás ventas, podrías hacer que el stock se actualice
cuando se registra una venta."

Pero SOLO si esa relación es compatible con la información conocida.

IMPORTANTE:
No quiero una sugerencia obligatoria falsa.
Quiero que el prompt favorezca activamente producir una mejora cuando
haya una oportunidad evidente, en vez de elegir [] por defecto.

También verificá que sugerenciasRechazadas se siga respetando.

============================================================
4. PRESENTACIÓN DE LA SUGERENCIA
============================================================

Cuando exista, mantener el diseño recientemente implementado:

SUGERENCIA DE LA IA
MEJORA

Texto...

[ AGREGAR A MI IDEA ] [ NO, GRACIAS ]

Debe destacarse claramente de las preguntas normales.

No mostrar sección si sugerencias=[].

============================================================
VERIFICACIÓN
============================================================

No hagas llamadas reales a Gemini.

Usá mocks determinísticos para probar:

1. HU inicial.
2. Usuario responde aspectos.
3. Gemini devuelve HU refinada.
4. Endpoint conserva refinamiento.
5. Frontend muestra el nuevo texto.
6. HU2 recibe preguntas contextualizadas.
7. Gemini devuelve una sugerencia válida.
8. Sugerencia aparece correctamente.
9. [] sigue siendo permitido y seguro.
10. editada_cliente nunca se reescribe.

Ejecutar:
- tests focalizados backend/frontend;
- ESLint;
- build temporal;
- Prettier;
- git diff --check.

No hagas commit.

Al terminar mostrame:
1. causa exacta de que la HU no pareciera actualizarse;
2. por qué las preguntas eran genéricas;
3. por qué Gemini tendía a devolver sugerencias=[];
4. archivos modificados;
5. tests agregados;
6. resultado final.
```

### L20 — Refinement/context/suggestion diagnosis (2026-10-22)

- The full CONTINUAR trace preserves every answer field; `markPendingAnswersIntegrated` changes only `integrada` and the complete answers remain in the prompt.
- With all six HU1 aspects covered, focus advances to HU2 before the provider call. Current postprocessing rewrites only `story.id === focusId`, so a provider-returned refined HU1 is deterministically discarded. Endpoint, frontend state, and right-side render otherwise preserve returned story text.
- The prompt simultaneously tells Gemini to work only on HU2, so it does not clearly authorize refining the just-answered HU1. The correction must separate refinable answered story IDs from the next question focus without generating server-authored refinements.
- Generic repetition comes from deterministic fallback texts that receive requested aspects but no focused story/functionality context.
- `sugerencias: []` is valid because the prompt only constrains suggestion quality and never instructs Gemini to actively evaluate whether a grounded opportunity exists. Existing filtering still enforces invalid/duplicate/rejected removal and max two.
- Implementation remains inline: service, prompt, postprocessing, endpoint regression, and frontend transition proof form one coupled advisor-round behavior. No writer trigger applies.

### L21 — Refinement/context/suggestion implementation and verification (2026-10-22)

- Added `getRefinableStoryIds` so only unlocked HUs with useful new confirmed answers can retain provider-authored rewrites; `noSabe`, integrated answers, and client-locked HUs do not authorize refinement.
- Kept question focus independent from refinement authorization. `mergeStories` accepts the authorized HU ID set, while the existing no-new-answer path still permits only the focused HU rewrite.
- Added focused-HU context to prompt construction and deterministic question fallback. Exact generic provider questions are discarded and rebuilt with the focused functionality when available; neutral fallback remains available when context is absent.
- Updated the prompt to require active evaluation of grounded suggestion opportunities while preserving valid `[]`, rejection filtering, and the existing maximum.
- Added frontend `applyAdvisorRoundResult` and routed continuation results through it so provider-refined story text is preserved in visible state.
- Verification after Prettier normalization: backend advisor unit/integration 28/28; frontend complete Node suite 12/12; targeted ESLint passed; temporary Vite production build transformed 440 modules; `git diff --check` passed; no real Gemini calls, commit, push, migration, or `frontend/dist` write occurred.
- The one attempted complete backend suite was not accepted as proof: migration tests encountered pre-existing/incompatible test-database schema state and the command timed out. A migration-excluded run reached 35 passing tests before the runner also timed out; excluded migration code was not changed.

### L28 — Explicit refinement acknowledgement and deterministic suggestion verification (2026-10-22)

- Exact refinement cause: the previous provider response overloaded `historias` for both complete-list generation and answer-driven rewrites. A missing or mismatched provider story ID could therefore leave the original HU unchanged while answers were treated as integrated without explicit provider acknowledgement.
- Exact frontend race cause: round completion previously treated every submitted answer as integrated and replaced local histories wholesale, so an unacknowledged answer or a client edit made during an in-flight request could be overwritten.
- Correction: the provider now returns `refinadas`, the server maps only authorized `aRefinar` targets by unique exact ID or equal-length positional fallback, and the endpoint returns only successfully acknowledged `integradas` IDs. Invalid, missing, duplicate, empty, protected, and unsupported `noSabe` refinements remain pending and emit reason-only diagnostics.
- Suggestion policy: the first round for a focused HU returns none; later rounds accept at most two natural second-person suggestions of at most 25 words grounded in answers for that exact HU. Other HUs expose titles only, and postprocessing removes invalid, repeated, rejected, accepted-as-story, or similar content without generating fallback suggestions.
- Sequential proof: round two acknowledges the first HU1 answer batch without changing its text; the frontend-style next request marks only those IDs integrated while retaining the second batch pending; round three positionally maps a mismatched provider ID, refines HU1, acknowledges only the second batch, advances focus to HU2, and preserves the refined HU1 in endpoint/frontend rendering.
- Verification after final Prettier normalization: focused backend advisor unit/integration tests 39/39; frontend advisor state/workspace/API tests 15/15; targeted backend ESLint passed; Prettier check passed; temporary Vite production build transformed 441 modules outside `frontend/dist` and its scratch output was removed; `git diff --check` passed. Real Gemini calls, dependencies, commits, pushes, migrations, and `frontend/dist` writes: 0.
- Native review: the user granted the four pertinent lenses, but `review.start` stopped with `lens_context_budget_exceeded` before creating authority because the accumulated workspace candidate contains 15 paths and 4,098 changed lines. The provider requires smaller reviewable candidates; no retry, review authority, or repository mutation occurred.

### L29 — Native review disposition (2026-10-22, verbatim)

```text
Leave candidate unreviewed
```

The completed, uncommitted candidate remains available for manual testing. Native review created no authority, and the user explicitly chose not to split the candidate into local reviewable commits.

### L30 — Revised refinement, state, suggestion, retry, and trace policy (2026-10-24, verbatim)

```text
Usá ODD (no SDD). Corrección acotada sobre feat/ai-advisor. Avanzá
directo y gastá la menor cuota posible.

REGLAS
- git status primero. Sin commit ni push. No tocar frontend/dist,
  company-context.js, panel admin, viabilidad, backlog ni migraciones.
- No lances subagentes de verificación (gentle-ai-verify).
- CERO llamadas reales a Gemini (tengo 20 por día): proveedor siempre
  mockeado. Solo tests focalizados. Sin dependencias nuevas.
- Leé odd/tasks/ai-advisor.md y el código real del asesor (servicio,
  prompt, schemas, controller; en el frontend applyAdvisorRoundResult,
  el estado de historias y AdvisorWorkspace).

PROBLEMA 1 (principal): HU1 NO SE ACTUALIZA
Al completar HU1 y pasar a HU2, HU1 conserva el texto inicial. La UI
muestra "1 de 2 completas" pero el texto no incorpora las respuestas.
Ya se intentó un arreglo y el bug persiste, así que NO asumas la
causa.

Paso 0. Reproducir antes de arreglar. Escribí primero el test
secuencial (abajo) y mostrame que FALLA, indicando en qué etapa se
pierde el texto: proveedor crudo, normalización, mergeStories,
postprocess, response.data.historias, applyAdvisorRoundResult,
setHistories o render. Verificá además:
 H1. El frontend marca integrada=true al enviar las respuestas, aunque
     el servidor no haya refinado esa HU: esas respuestas no se
     vuelven a integrar nunca.
 H2. El mapeo por id falla: el proveedor devuelve id vacío, distinto,
     repetido, o devuelve la HU refinada en historias y no en
     refinadas.
 H3. El estado 'sugerida_ia' (o cualquier estado distinto de
     'entendida') hace que el servidor o el frontend traten la HU como
     protegida y no la refinen.
 H4. Una ronda posterior reenvía el texto viejo o pisa la HU refinada.

Paso 1. Arreglo y endurecimientos (obligatorios):
a) Refinamiento explícito: el servidor calcula aRefinar = HU no
   bloqueadas con respuestas integrada=false, y las envía al prompt
   (id, texto actual y respuestas nuevas). Se refina en toda ronda con
   respuestas nuevas y SIEMPRE cuando una HU se completa, incluso si
   el foco pasa a otra HU.
b) Parseo tolerante: aceptá el texto refinado venga en refinadas o
   como texto actualizado en historias. Mapeo por id; si falta, respaldo
   posicional solo si la cantidad coincide. Un texto es válido si no
   está vacío, tiene hasta 400 caracteres y respeta el formato
   "Como…, quiero…, para…".
	c) Respaldo dedicado:
	Si una HU que debía refinarse no obtuvo un texto válido, NO hagas
	automáticamente una segunda llamada en producción.

	Dejá las respuestas pendientes para la siguiente ronda.

	Podés implementar el mecanismo de reintento detrás de:
	refinamientoReintento=false

	Debe quedar DESACTIVADO por defecto.

	Los tests pueden verificarlo con mocks, pero la implementación normal
	no debe aumentar las llamadas a Gemini.
d) El servidor devuelve integradas:[preguntaId] solo con las respuestas
   realmente reflejadas en un texto válido. El frontend NO marca
   integrada=true al enviar: marca solo las de integradas. Las demás
   se reenvían en la ronda siguiente.

   En CIERRE NO marques automáticamente respuestas pendientes como
   integradas. Si no pudieron reflejarse en un refinamiento válido,
   conservá esa información pendiente y aplicá el estado
   supuesta/a revisar según las reglas existentes.
   e) response.data.historias es la fuente de verdad para las HU no
   bloqueadas. El frontend nunca reenvía el texto viejo. Una edición
   del cliente hecha mientras hay una ronda en curso no debe perderse
   (elegí la solución más simple y decime cuál).
f) Mantené protegidas: editada_cliente, bloqueada y noSabe.

PROBLEMA 2: ETIQUETA 'SUGERIDA POR LA IA' MAL APLICADA
Estados/origen:

entendida:
HU derivada de la idea o funcionalidad elegida explícitamente por el cliente.

supuesta:
HU donde hubo noSabe o información insuficiente según reglas existentes.

editada_cliente:
HU cuyo texto fue modificado manualmente por el cliente.

sugerida_ia:
EXCLUSIVAMENTE una nueva HU creada porque el cliente aceptó
"Agregar a mi idea" sobre una sugerencia de la IA.

Una HU redactada por Gemini a partir de una funcionalidad que el cliente
seleccionó NO es sugerida_ia.

PROBLEMA 3: SUGERENCIAS (cambia la política anterior)
Las sugerencias deben mostrarse desde la PRIMERA ronda de cada HU.
Ya no existe la regla "ninguna en la primera ronda"; eliminala.
- Máximo 2 por ronda, siempre sobre la HU en foco.
- Primera ronda de una HU: base = idea, texto de esa HU y datos
  iniciales (funcionalidades elegidas, plataformas, usuarios). Tipos:
  complementaria, etapas, mejora o definir. Debe haber al menos 1 si
  existe algo relevante para sugerir; si no, 0 es válido (sin
  fundamento, no).
- Rondas posteriores de esa HU: solo si una respuesta nueva de ESA HU
  lo justifica.
- Contexto: Las respuestas de otras HU nunca se incluyen como contexto generativo.
De otras HU solo enviar id + funcionalidad/título para detectar
duplicados, nunca como base para redactar una sugerencia.
- Respaldo por código:
Si en la primera ronda el proveedor devuelve 0 sugerencias, el BACKEND
puede generar hasta 1 sugerencia determinística usando el catálogo fijo
de funcionalidades relacionadas ya existente.

No generar sugerencias directamente en AdvisorWorkspace.

La respuesta debe salir por el mismo campo sugerencias[] del endpoint,
para que frontend tenga una única fuente de verdad.- Postproceso: descartar las que repiten una HU existente, las rechazadas y las ya aceptadas.
- Redacción: segunda persona, una frase de hasta 25 palabras apoyada
  en algo que dijo el cliente o en su idea ("Como llevás el stock en
  Excel, ¿querés poder importar esa planilla?"), sin tecnicismos ni
  meta-lenguaje.
- Al cambiar el foco, las sugerencias sin resolver se reemplazan por
  las de la ronda nueva. Mantené "Agregar a mi idea", "No, gracias" y
  el feedback visible al aceptar, y el bloque rotulado con la HU en
  foco.

DIAGNÓSTICO (apagado por defecto)
Variable ADVISOR_TRACE=1: el backend escribe en backend/logs/
advisor-trace.jsonl (agregalo al .gitignore) una línea por ronda con:
modo, foco, ids de aRefinar, ids y presencia de texto devueltos en
refinadas e historias, mapeo usado (id, posicional o descartado),
si hubo llamada de respaldo y su resultado, integradas devueltas,
cantidad de sugerencias del proveedor y de las descartadas con su
motivo. Sin claves ni datos de otros clientes.

TESTS (proveedor mockeado)
Backend, endpoint con el proveedor guionado ronda por ronda: HU1
inicial, primera y segunda tanda de respuestas, el proveedor devuelve
HU1 refinada y el foco pasa a HU2. Verificá que el endpoint devuelve
HU1 refinada e integradas correctas, y que el siguiente request lleva
el texto refinado. Repetí con proveedores: id válido, id="", ids
mezclados, refinamiento solo en historias, HU1 omitida:
- con refinamientoReintento=false: NO hacer segunda llamada; las
  respuestas quedan pendientes y se reenvían;
- testear aparte con mocks refinamientoReintento=true para comprobar
  que el mecanismo opcional funciona, sin habilitarlo por defecto
Comprobá: HU bloqueada intacta, noSabe pasa a supuesta, la etiqueta
'sugerida_ia' solo en sugerencias aceptadas, sugerencias presentes en
la primera ronda de cada HU, el respaldo por código, y que el prompt
de sugerencias no contiene respuestas de otras HU.
Frontend sin librerías nuevas: extraé la lógica de
applyAdvisorRoundResult a funciones puras con node:test y para el
render usá renderToStaticMarkup. Comprobá: el estado conserva la HU
refinada, el render la muestra, solo se marcan integradas las de
integradas, la edición del cliente se conserva y el siguiente request
lleva el texto refinado.

VERIFICACIÓN: backend advisor focalizado, frontend focalizado, build a
un directorio temporal, ESLint, Prettier, git diff --check.

REPORTE FINAL (corto)
1. Causa exacta (hipótesis confirmada y el test que fallaba antes).
2. Dónde se asignaba mal 'sugerida_ia'. 3. Política final de
sugerencias. 4. Archivos y tests. 5. Resultados. 6. Riesgo residual y
cuántas llamadas reales cuesta ahora una sesión de 2 funcionalidades.
Sugerí un mensaje de commit.
```

### L31 — Revised AIADV-15 implementation and verification (2026-10-24)

- RED located the remaining loss at postprocessing: a valid updated HU in provider `historias` was ignored whenever `refinadas` was empty, while malformed `refinadas` text was accepted. Separate REDs showed first-round suggestions were suppressed and client-selected functionality stories were labeled `sugerida_ia`.
- Hypotheses: H2 confirmed for missing/mismatched/duplicate IDs and `historias`-only refinement; H1 and H4 were already prevented by the current server-acknowledgement and blocked-client-merge path; H3 was rejected because unlocked `sugerida_ia` stories remain refinable.
- Refinement now accepts valid `refinadas` or updated `historias`, validates `"Como…, quiero…, para…"`, leaves failures pending, and performs no second call unless injected with `refinamientoReintento: true`. Closure preserves pending answers and marks the unlocked HU `supuesta`.
- Provider/selected-functionality stories are `entendida`; only a suggestion accepted through **"Agregar a mi idea"** creates `sugerida_ia`. Client edits remain protected through the existing `bloqueada` merge.
- Suggestions are allowed on the first round of every focused HU from idea/focus/initial data, and later only when that HU has new pending answers. Other HUs expose only IDs and titles. A first-round empty provider list may receive one deterministic related-functionality fallback from the fixed catalog.
- `ADVISOR_TRACE=1` writes sanitized round metadata to ignored `backend/logs/advisor-trace.jsonl`; tracing and dedicated retry are both off by default.
- Verification: mocked focused backend tests 44/44; focused frontend tests 16/16; targeted backend ESLint passed; source Prettier passed; temporary Vite build transformed 441 modules outside `frontend/dist` and was removed; `git diff --check` passed. Real Gemini calls, dependencies, commits, pushes, migrations, and `frontend/dist` writes: 0.
- Native assessment classified the accumulated workspace candidate high-risk, but review could not start because the runtime required a provider-bound intended-untracked selection capture that was unavailable. No review authority or repository mutation was created; the explicitly prohibited independent verification subagent was not launched.

### L32 — Explicit degradation and two-suggestion correction (2026-10-24, verbatim)

```text
Usá ODD (no SDD). Corrección acotada sobre feat/ai-advisor. Avanzá
directo y gastá la menor cuota posible.

REGLAS
- git status primero. Sin commit ni push. No tocar frontend/dist,
  company-context.js, panel admin, viabilidad, backlog ni migraciones.
- No lances subagentes de verificación (gentle-ai-verify).
- CERO llamadas reales a Gemini (tengo 20 por día): proveedor siempre
  mockeado. Solo tests focalizados. Sin dependencias nuevas.
- Leé odd/tasks/ai-advisor.md y el código real del asesor.

SÍNTOMAS (reproducidos en el navegador contra el backend real)
1. HU1 no se actualiza: después de responder todas las rondas de HU1 y
   pasar a HU2, HU1 mantiene su texto base (cambió el estado a
   "supuesta", que lo fuerza el servidor, pero no el texto).
2. En HU2 las preguntas son claramente de plantilla ("Pensando en
   Gestión de stock, ¿quién va a usar esta funcionalidad?", "¿qué
   beneficio necesitás obtener?"), ambas de texto libre, y la única
   sugerencia ("Como ya elegiste Gestión de stock, ¿querés sumar
   Gestión de proveedores?") es la del respaldo por tabla fija.
   Hipótesis: el proveedor no está aportando nada y el código lo
   tapa con plantillas sin avisar.
3. Aparece 1 sola sugerencia y quiero 2.

PASO 0: EVIDENCIA ANTES DE TOCAR CÓDIGO
Leé las últimas líneas de backend/logs/advisor-trace.jsonl (si
existe) y reportame, ronda por ronda, qué hizo el proveedor: ¿se
llamó?, ¿hubo error (429, 400, timeout)?, ¿la respuesta se descartó
por validación y en qué campo?, ¿qué devolvió en historias,
refinadas, preguntas y sugerencias?, ¿de dónde salió cada pregunta
(proveedor o plantilla)? Si el archivo no existe, decímelo y seguí
con los tests. Después reproducí el caso con el proveedor mockeado en
estos modos: (a) responde bien; (b) lanza error 429; (c) devuelve JSON
con una sección inválida; (d) devuelve vacío. Mostrame cuál de
ellos reproduce el síntoma.

PASO 1: SIN DEGRADACIÓN SILENCIOSA
a) Cada pregunta y sugerencia lleva origen: 'ia' | 'respaldo', y la
   respuesta del endpoint incluye degradado (boolean) y
   motivoDegradado (rate_limit | cuota | validacion | timeout |
   vacio | otro). El trace y un log de consola de una línea por ronda
   registran el motivo.
b) El frontend muestra un aviso visible, discreto y claro cuando
   degradado=true ("El asesor está con problemas: te mostramos
   preguntas básicas") con "Reintentar esta ronda". No se descartan
   las respuestas del cliente ni se marcan como integradas.
c) Parseo tolerante por sección: validá preguntas, sugerencias y
   refinadas por separado. Una sección inválida no descarta las
   demás (por ejemplo, si 'refinadas' falla, igual se usan las
   preguntas válidas, y el refinamiento queda pendiente).
d) 429 y errores transitorios: un único reintento con espera
   (backoff) corta y configurable en advisor-config. Si persiste, se
   marca degradado con su motivo. Revisá que la llamada de respaldo de
   refinamiento (agregada en la corrección anterior) no multiplique las
   llamadas por minuto: si hay varias HU que refinar, agrupalas en una
   sola llamada y usá el respaldo solo si esa llamada no devolvió un
   texto válido para alguna.
e) Con degradado=true, las respuestas del cliente de esa ronda se
   conservan con integrada=false para refinarlas cuando el proveedor
   vuelva a responder, y se refinan también al cierre.

PASO 2: REFINAMIENTO (si el Paso 0 muestra que el proveedor responde)
Si el proveedor sí devuelve texto refinado pero no se aplica, corregí
el punto exacto donde se pierde (id, mapeo, estado protegido,
integradas o frontend) y agregá el test secuencial multi-ronda:
HU1 inicial, primera tanda, segunda tanda, el proveedor devuelve HU1
refinada y el foco pasa a HU2; el endpoint devuelve HU1 refinada; el
frontend la conserva y la muestra; el siguiente request la reenvía.
Mantené protegidas editada_cliente, bloqueada y noSabe.

PASO 3: SUGERENCIAS (2 por ronda)
- Máximo 2 por ronda, sobre la HU en foco, desde la primera ronda.
- Prioridad: las del proveedor. Si trae menos de 2, completá con el
  respaldo de la tabla fija hasta llegar a 2 (nunca más de 2 en total).
- El respaldo excluye funcionalidades que ya son una HU, ya elegidas
  en datosIniciales, rechazadas o aceptadas, y solo ofrece
  relacionadas con la funcionalidad de la HU en foco (si no hay
  suficientes, devuelve menos de 2: no inventes).
- Nueva redacción del respaldo, sin afirmar nada del cliente:
  "[Funcionalidad en foco] suele ir junto con [Relacionada]. ¿Querés
  sumarla a tu idea?" (tipo complementaria). Prohibido "Como ya
  elegiste…" cuando la relacionada no la eligió el cliente.
- Las sugerencias sin resolver se reemplazan por las de la ronda
  nueva al cambiar el foco. Mantené "Agregar a mi idea", "No, gracias"
  y el feedback visible.
- La etiqueta 'sugerida_ia' solo para sugerencias aceptadas.

TESTS: proveedor mockeado en los cuatro modos del Paso 0; degradado y
motivo en la respuesta; aviso en el frontend con node:test +
renderToStaticMarkup; sección inválida que no descarta las demás;
llamadas por ronda (contá cuántas se hacen para 2 HU y que el
respaldo no las multiplique); las 2 sugerencias con y sin respaldo;
test secuencial del Paso 2.
VERIFICACIÓN: backend advisor focalizado, frontend focalizado, build a
un directorio temporal, ESLint, Prettier, git diff --check.

REPORTE FINAL (corto): 1. Qué mostró el Paso 0 (evidencia). 2. Causa
exacta de que HU1 no se actualizara. 3. Cómo quedó el aviso de
degradado. 4. Cuántas llamadas reales cuesta ahora una sesión de 2
funcionalidades. 5. Archivos, tests y resultados. 6. Riesgo residual.
Sugerí un mensaje de commit.
```

### L33 — Explicit degradation implementation and verification (2026-10-24)

- The trace file did not exist before implementation. Mocked evidence showed that a syntactically valid provider envelope with empty useful sections reproduced template questions and fixed-table suggestions; persistent 429 and invalid-section modes now remain distinguishable.
- Provider output is parsed section by section. Transient 429/5xx/timeout failures retry once after the configurable 200 ms backoff; persistent failures return an explicit degraded round instead of a 503.
- Every question and suggestion carries `origen`; every round carries `degradado` and `motivoDegradado`. Degraded rounds keep submitted answers pending, while valid CIERRE rounds integrate them without manufacturing fallback questions.
- Provider suggestions remain first and deterministic related-functionality suggestions fill only the remaining slots up to two, with the exact non-assertive copy from S41 and all required exclusions.
- The frontend renders the degraded notice and reuses the existing round retry path. The default failure log now excludes provider messages and stack traces so secret-like text cannot leak through console diagnostics.
- Verification after normalization: focused backend tests 49/49; all frontend tests 19/19; backend ESLint passed; Prettier check passed; temporary Vite build transformed 442 modules outside `frontend/dist` and was removed; `git diff --check` passed. A normal mocked two-HU session used five provider calls: initial round, two refinement rounds per HU, with no extra fallback-provider call.
- The full backend suite was run once but unrelated migration tests failed against pre-existing database schema/history state and the process timed out after 120 seconds. No migration code or data was changed as part of AIADV-16.
- Native review consent was granted, but START stopped with `lens_context_budget_exceeded` because the accumulated workspace candidate spans 5,842 changed lines. No review authority was created. The user-prohibited independent verification subagent was not launched.

### L34 — Real-shape normalization correction (2026-10-24, verbatim)

```text
Usá ODD (no SDD). Corrección acotada sobre feat/ai-advisor. Avanzá
directo y gastá la menor cuota posible.

REGLAS
- git status primero. Sin commit ni push. No tocar frontend/dist,
  company-context.js, panel admin, viabilidad, backlog ni migraciones.
- No lances subagentes de verificación (gentle-ai-verify).
- Solo tests focalizados. Sin dependencias nuevas.
- Llamadas reales a Gemini: tengo 20 por día. Máximo UNA, en un script
  temporal (no por la interfaz), con una idea de ejemplo neutra de
  dos funcionalidades, que borrás al terminar.

EVIDENCIA (trace real de una ronda INICIAL)
providerCalled=true, providerAttempts=1, providerError=null,
invalidSections=[], providerQuestionCount=4 con
questionOrigins={respaldo:4}, providerSuggestionCount=2 con
suggestionOrigins={respaldo:2} y discardedSuggestions={invalid_shape:2},
historias=[], refinadas=[], focusId=null, degradado=true,
motivoDegradado="validacion".
Lectura: el proveedor SÍ responde y NO hay error ni de cuota ni de
schema; nuestra validación o normalización descarta TODO lo que
devuelve (las 4 preguntas, las 2 sugerencias y los textos de HU) y lo
reemplaza por plantillas. Hipótesis: es la misma causa del bug
original "HU1 no se actualiza" (el texto refinado nunca llega porque
se descarta). Además hay un hueco de telemetría: motivo "validacion"
con invalidSections vacío.

PASO 0: CAPTURAR LA FORMA REAL
Con la única llamada real permitida, ejecutá una ronda INICIAL y
mostrame la ESTRUCTURA de lo que devuelve Gemini, no el contenido de
los textos: nombres exactos de los campos de cada sección
(historias, refinadas, preguntas, sugerencias, duda_critica), tipos
(string o array), longitudes de listas, y los valores literales de
los campos tipo enumerado (aspecto, tipo). Después corré el
validador estricto sobre esa respuesta y reportame cada incidencia de
Zod con path y código (por ejemplo "preguntas[0].aspecto:
invalid_enum_value, recibido 'Quién la usa'"). Guardá la respuesta
capturada, con la idea de ejemplo (no hay datos de clientes), como
fixture de tests. Si la idea o el contenido tuvieran algo sensible,
dejá solo la estructura.
Verificá además por qué focusId es null en INICIAL (¿orden de
escritura del trace o foco que no se calcula?).

PASO 1: TELEMETRÍA
El trace debe registrar, por sección y por ítem: cantidad recibida,
cantidad válida, y motivos de descarte con path y código de Zod (sin
contenido). invalidSections nunca debe quedar vacío cuando
motivoDegradado es "validacion". Registrá también el origen ('ia' o
'respaldo') de cada pregunta, sugerencia y refinamiento.

PASO 2: NORMALIZACIÓN TOLERANTE ANTES DE LA VALIDACIÓN ESTRICTA
Agregá una capa de normalización entre el JSON crudo y Zod:
- Valores enumerados (aspecto, tipo, estado): minúsculas, sin tildes,
  espacios y guiones a guion bajo, y mapa de sinónimos
  ("quién la usa" → quien_la_usa; "complementario/a" →
  complementaria; "etapa" → etapas; "mejoras" → mejora). Un tipo de
  sugerencia desconocido pasa a 'complementaria'; un tipo de
  pregunta desconocido pasa a 'texto' (o a 'mixta' si trae opciones).
- Claves desconocidas: ignorar (strip), no rechazar.
- Tipos laxos: opciones como string separado por "|", saltos de línea
  o comas pasa a lista; strings con espacios sobrantes pasan por trim;
  números como string pasan a número.
- Ids y campos que el servidor puede fijar: asignarlos el servidor
  (ids de preguntas y sugerencias, estado de las HU, etapa si es
  derivable). No dependas de que Gemini los devuelva bien.
- Mapeo de aspectos POSICIONAL: el servidor ya conoce la lista
  ordenada de aspectos pedidos; si el aspecto devuelto no coincide
  tras normalizar, asigná por posición (la pregunta i-ésima usa el
  aspecto i-ésimo pedido).
- Validación por ÍTEM y por SECCIÓN: un ítem inválido se descarta, el
  resto se conserva; una sección inválida no descarta las demás.
- Aplicá la misma tolerancia a historias y refinadas (ids vacíos o
  distintos: mapeo por id y, si falla, posicional cuando la cantidad
  coincide).

PASO 3: CUÁNDO SE DEGRADA
degradado=true solo si, DESPUÉS de normalizar, no queda ninguna
pregunta válida de la IA. Si quedan algunas válidas, usá esas y
completá con respaldo SOLO lo que falte, marcando el origen de cada
ítem. Las sugerencias: hasta 2, priorizando las de la IA válidas y
completando con el respaldo. Al integrar respuestas, si el texto
refinado de una HU es válido, aplicalo y marcá esas respuestas como
integradas.

PASO 4: HU1 (el bug original)
Con la forma real capturada como fixture, agregá el test secuencial:
HU1 inicial, primera tanda de respuestas, segunda tanda, el
proveedor devuelve HU1 refinada y el foco pasa a HU2; el endpoint
devuelve HU1 refinada con integradas correctas; el frontend
(funciones puras con node:test y renderToStaticMarkup) conserva y
muestra el texto refinado; el siguiente request lo reenvía. Mantené
protegidas editada_cliente, bloqueada y noSabe.

TESTS (proveedor mockeado): la respuesta real capturada; variantes
con tildes, mayúsculas, claves extra, opciones como string, ids
vacíos, aspecto en lenguaje natural, tipo desconocido, un ítem
inválido entre ítems válidos, una sección inválida entre secciones
válidas; que degradado sea false con la respuesta real; que se vean
2 preguntas o más de origen 'ia' y 2 sugerencias de origen 'ia'; y el
test secuencial del Paso 4.
VERIFICACIÓN: backend advisor focalizado, frontend focalizado, build a
un directorio temporal, ESLint, Prettier, git diff --check.

REPORTE FINAL (corto): 1. La forma real devuelta por Gemini y las
incidencias de Zod exactas. 2. Por qué focusId era null. 3. Causa
exacta de que se descartara todo y de que HU1 no se actualizara.
4. Qué normalizaste. 5. Llamadas reales usadas (máximo 1) y costo de
una sesión de 2 funcionalidades. 6. Archivos, tests y resultados.
7. Riesgo residual. Sugerí un mensaje de commit.
```

- `git status --short --branch` was run first and showed the existing uncommitted advisor baseline. CodeGraph initialization was attempted as required but the upstream `codegraph` executable is unavailable in PATH; focused filesystem inspection was used instead.
- Read-only mapping confirmed that envelope parsing accepts array sections while downstream strict item schemas silently reject full items, and that the INICIAL trace captures focus before provider stories exist rather than the final effective focus.

### L35 — Real-shape normalization evidence (2026-10-24)

- The single real INICIAL call returned top-level fields `historias`, `refinadas`, `preguntas`, `sugerencias`, and `duda_critica`. `historias` and `refinadas` were empty arrays; `preguntas` contained four objects with string `aspecto`, string `tipo`, string `texto`, and array `opciones`; `sugerencias` contained one object with string `tipo` and string `texto`; `duda_critica` was a string.
- Literal enum-like values were question aspects `quien_la_usa`, `beneficio`, `comportamiento`, `datos_previos`; question type `multiple_choice` four times; and suggestion type `funcionalidad` once.
- Strict pre-normalization Zod issues were exactly `preguntas[0..3].tipo: invalid_value` for `multiple_choice` and `sugerencias[0].tipo: invalid_value` for `funcionalidad`. The sanitized real response is stored at `backend/tests/fixtures/advisor-real-initial.json`.
- Root cause: the envelope parser accepted each array section, leaving `invalidSections=[]`, while downstream strict item schemas rejected enum variants and whole items. Questions and suggestions therefore became fallback items; the same all-item rejection path could prevent a provider HU/refinement from reaching the existing ID/positional merge and acknowledgement logic.
- Normalization now strips unknown keys, trims strings, canonicalizes accent/case/separators and requested synonyms, splits string options, supplies safe server defaults, assigns requested aspects positionally, and strictly validates each normalized item independently. There is no numeric provider field in the current strict contract; derivable stage remains server-normalized to its string contract.
- Degradation now depends on whether any valid IA question survives when questions were requested. Valid IA questions remain and only missing aspects use fallback; suggestions remain provider-first up to two; valid refinements integrate independently.
- `focusId` was null because trace initialization captured the pre-provider focus while INICIAL had no submitted stories. Trace now records the final effective focus after provider processing and reconciliation.
- Trace now records per-section received/valid counts, sanitized item paths/codes, non-empty `invalidSections` for validation degradation, and sanitized per-item origins for questions, suggestions, and applied refinements.
- Verification: focused backend advisor tests 53/53; focused frontend state/render/API tests 17/17; targeted ESLint passed; targeted Prettier passed; temporary Vite build transformed 442 modules outside `frontend/dist` and was removed; `git diff --check` passed. Real Gemini calls: 1. A normal two-functionality sequence remains five provider calls. No commit or push was made.
- Native review consent was granted. START stopped with `lens_context_budget_exceeded` on the accumulated 6,686-line uncommitted candidate, so no authority was created and retrying the same candidate would not succeed. No verification subagent was launched.

### L36 — Gemini-only visible advisor policy (2026-10-24, verbatim)

```text
Usá ODD (no SDD). Corrección acotada sobre feat/ai-advisor. Avanzá
directo y gastá la menor cuota posible.

REGLAS
- git status primero. Sin commit ni push. No tocar frontend/dist,
  company-context.js, panel admin, viabilidad, backlog ni migraciones.
- No lances subagentes de verificación (gentle-ai-verify).
- Solo tests focalizados. Sin dependencias nuevas.
- Llamadas reales a Gemini (tengo 20 por día): máximo 2, en un script
  temporal que borrás al terminar. Una para reproducir y otra para
  validar. Idea de prueba neutra (librería: ventas y stock).
- Leé odd/tasks/ai-advisor.md y el código real del asesor. El modelo
  sale de GEMINI_MODEL (hoy gemini-3.8-flash): no lo hardcodees, y
  verificá que maxOutputTokens y el thinking del asesor sean válidos
  para ese modelo sin tocar los del análisis ni los del backlog.

POLÍTICA NUEVA
Todo lo que el cliente ve en preguntas y sugerencias es SIEMPRE de
Gemini. El servidor nunca inventa contenido genérico.

1. PREGUNTAS
- Eliminá el relleno con preguntas de respaldo (las plantillas). El
  origen de lo que se muestra es siempre 'ia'.
- Prompt: listá los aspectos pedidos numerados y exigí "EXACTAMENTE N
  preguntas, una por aspecto, en este orden, cada una adaptada a la
  HU en foco". Mantené el mapeo posicional como defensa.
- Si Gemini devuelve menos de las pedidas: mostrá solo las válidas;
  los aspectos sin pregunta quedan pendientes y se piden en la ronda
  siguiente (mismo foco). Si hay reparación habilitada, ver punto 3.
- Si no queda NINGUNA pregunta válida de la IA: degradado=true con
  motivo, aviso visible, "Reintentar", "Continuar sin asesor" y "Ya
  está, armá el resumen". NO mostrar preguntas de plantilla en ningún
  caso. Las respuestas ya dadas se conservan como pendientes.

2. SUGERENCIAS
- Se acabó el respaldo por tabla fija: nunca completar hasta 2. La
  tabla de funcionalidades relacionadas queda SOLO para el selector
  "Agregar funcionalidad" (acción del cliente), sin cambios.
- Entre 1 y 2 por ronda, desde la primera ronda de cada HU y en todas
  las rondas, siempre sobre la HU en foco. El prompt exige al menos
  una (la mejor apoyada en lo que dijo el cliente) y permite una
  segunda solo si también está apoyada.
- Para no repetir entre rondas, el cliente envía en el estado
  sugerenciasMostradas (textos ya vistos, además de las rechazadas); la
  IA no puede repetirlas ni parafrasearlas. Actualizá el contrato.
- Si tras la validación no queda ninguna, ver reparación. Si sigue en
  cero: no se muestra nada, se registra 'sin_sugerencias' y NO se
  inventa. Dejá claro en el reporte que el mínimo de 1 es de mejor
  esfuerzo.

3. REPARACIÓN (una por ronda como máximo, advisor-config:
   reparacionFaltantes=true)
Si tras validar faltan preguntas respecto de las pedidas o hay 0
sugerencias, hacé UNA llamada pequeña que pida solo lo que falta, con
el mismo contexto y los mismos delimitadores, y sumá lo válido. Si
falla, mostrá lo que haya, sin respaldo y sin segundo reintento. En el
trace registrá si se usó y su resultado. El tope por ronda es de 2
llamadas.

4. GROUNDING (mantenelo, pero con sentido)
Primero reproducí: en el trace de desarrollo (solo NODE_ENV != production
y ADVISOR_TRACE=1) agregá discardDetail: el texto de cada sugerencia
descartada (truncado a 200 caracteres), el motivo, y el contexto
permitido normalizado. Hacé la 1ª llamada real, mostrame las
sugerencias descartadas por custom_not_grounded con su motivo, y
guardá lo capturado como fixture.
Rediseño:
- Gemini devuelve basado_en (string): la frase breve del cliente o de
  la HU en que se apoya la sugerencia. Schema del proveedor simple,
  solo strings.
- El servidor valida ESA cita, no el texto de la sugerencia: se
  normaliza (minúsculas, sin tildes, sin puntuación, singular/plural
  básico, stopwords en español) y es válida si está contenida en el
  contexto permitido o si al menos el 60% de sus palabras
  significativas aparecen en él (valor configurable).
- Contexto permitido, primera ronda de la HU: idea, texto de la HU,
  datosIniciales (funcionalidades, plataformas, usuarios) y nombres
  del catálogo. Rondas siguientes: lo anterior más las respuestas de
  ESA HU. Nunca las respuestas de otras HU.
- Siguen descartándose: duplicados de HU existentes, rechazadas,
  aceptadas, mostradas antes, fuera de los servicios de Logotype y las
  que mencionen precios, plazos o viabilidad.
- Cada descarte registra un motivo específico, y 'custom_not_grounded'
  ya no sirve como motivo genérico.

5. TELEMETRÍA Y UI
- Trace: preguntasPedidas, preguntasRecibidas, preguntasValidas,
  aspectosPendientes, sugerenciasRecibidas, sugerenciasValidas,
  reparacion {usada, resultado} y descartes con motivo.
  Las respuestas del endpoint ya no incluyen origen 'respaldo'.
- Frontend: aviso solo cuando degradado=true; con preguntas parciales
  no hay aviso, solo se muestran las válidas. En DEV, el aviso
  muestra el motivo.

TESTS (proveedor mockeado)
- 2 de 4 preguntas: se muestran 2, ninguna de plantilla, los otros 2
  aspectos quedan pendientes y se piden en la ronda siguiente.
- 0 preguntas: degradado, ninguna plantilla, respuestas conservadas.
- Reparación: se activa con preguntas faltantes o 0 sugerencias,
  máximo una por ronda, y su falla no inventa nada.
- Sugerencias: 1 válida se muestra sola; 2 válidas se muestran;
  singular/plural, tildes y sinónimos pasan el grounding; basado_en
  inexistente se descarta; repetida, rechazada, aceptada o mostrada se
  descarta; ninguna sugerencia visible sale de la tabla fija; el fixture
  real capturado pasa.
- El selector "Agregar funcionalidad" sigue igual.
- Test secuencial multi-ronda: HU1 sigue refinándose y el foco pasa a
  HU2.
- Contá las llamadas por ronda: ≤ 2.
VERIFICACIÓN: backend advisor focalizado, frontend focalizado, build a
un directorio temporal, ESLint, Prettier, git diff --check.

REPORTE FINAL (corto): 1. Causa exacta de custom_not_grounded y de que
Gemini devolviera menos preguntas. 2. Cómo quedó cada política.
3. Llamadas reales usadas y cuántas llamadas cuesta ahora una sesión de
2 funcionalidades (caso típico y peor caso). 4. Archivos, tests y
resultados. 5. Riesgo residual. Sugerí un mensaje de commit.
```

- `git status --short --branch` ran first and confirmed the existing uncommitted advisor baseline. CodeGraph remains unavailable because the upstream executable is not installed, so the correction uses the previously initialized focused fallback.
- Read-only mapping located deterministic question/suggestion fallback seams, the current three-call retry risk, `sugerenciasMostradas` state gaps, and the advisor-only generation configuration seam.
- AIADV-18 removed deterministic visible question and suggestion fillers while preserving the client-owned **"Agregar funcionalidad"** related-feature selector. Partial provider questions remain visible without degradation; zero valid questions remain empty and degraded with retry, fallback, and summary actions.
- The main provider call, transient retry, bounded missing-content repair, and optional refinement retry now share one strict two-attempt budget. Repair asks only for missing aspects and/or one missing suggestion, merges only validated items, and traces `{ usada, resultado }`.
- Suggestions now require `basado_en`; validation uses normalized citation containment or configurable 60% meaningful-word overlap with accent, basic singular/plural, stopword, and synonym handling. Specific reasons cover prior acceptance/rejection/display, story/round duplication, nonexistent citations, prohibited commercial content, and out-of-service content.
- The frontend remembers every displayed suggestion text (deduplicated, bounded to 60), resends it as `sugerenciasMostradas`, keeps the fixed related-feature selector unchanged, and exposes `motivoDegradado` only in the development notice.
- Final focused proof: backend advisor 58/58; frontend advisor state/workspace/API 18/18; targeted ESLint and Prettier passed; temporary Vite build transformed 442 modules outside `frontend/dist` and was removed; Impeccable detector returned `[]`; `git diff --check` passed. No dependency, commit, push, forbidden-surface edit, or verification subagent was used.
- Real Gemini usage finished at the authorized maximum of two total calls. The validation call used runtime model `gemini-3.8-flash` with advisor-only `maxOutputTokens: 16384` and `thinkingBudget: 1024`; it returned exactly 4 requested questions and 1 suggestion with `basado_en`, all accepted as `origen='ia'` without repair. A typical two-functionality session remains 5 provider calls; the worst case is 10 when every one of those rounds consumes its shared repair/retry slot.
- Residual risk: Gemini can still return unusable or incomplete content, in which case the product intentionally exposes partial output or the explicit degraded recovery path rather than fabricating copy. The catalog is an authorized grounding source, so a valid catalog citation does not by itself prove the client explicitly requested that functionality.

### L37 — One-call HU transitions and explicit lifecycle (2026-10-25, verbatim)

```text
Usá ODD. Continuá sobre `feat/ai-advisor`.

Sin commit ni push.
No tocar `frontend/dist`, panel admin, viabilidad, backlog, migraciones ni `company-context.js`.
No regresionar AIADV-18: preguntas/sugerencias visibles solo Gemini, grounding, trace, refinamiento HU1, límite de llamadas y degradación transparente.

Objetivo: implementar estas 4 mejoras relacionadas.

1. UNA LLAMADA GEMINI POR TRANSICIÓN DE HU

Cambiar el modelo actual de varias rondas pequeñas dentro de la misma HU.

Regla final:
- al entrar en una HU, Gemini genera todas las preguntas necesarias para comprenderla;
- mínimo 4 preguntas;
- máximo 7 preguntas;
- Gemini decide cuántas necesita entre 4 y 7 según la HU;
- deben cubrir completamente los aspectos relevantes de esa HU;
- no dividir artificialmente una misma HU en otra ronda solo porque faltaban volumen/restricciones;
- la siguiente llamada normal ocurre al terminar esa HU y pasar/refinar hacia la siguiente.

Flujo esperado:

HU1 → Gemini genera 4–7 preguntas → usuario responde → siguiente llamada:
- refina HU1;
- decide estado final;
- prepara las 4–7 preguntas de HU2.

Mantener reparación únicamente como recuperación excepcional del contrato Gemini, respetando el máximo absoluto de llamadas ya definido en AIADV-18.

No generar preguntas server-side.

2. SOPORTAR MULTIPLE CHOICE DE SELECCIÓN MÚLTIPLE

Actualmente una pregunta con opciones permite una sola respuesta.

Agregar soporte explícito para:
- selección única;
- selección múltiple.

Gemini debe decidir cuál corresponde.

Ejemplo conceptual:

{
  "tipo": "opcion",
  "seleccion": "unica"
}

o

{
  "tipo": "opcion",
  "seleccion": "multiple"
}

Para `multiple`, el usuario debe poder marcar varias opciones.

Analizá primero la alternativa mínima compatible con el contrato actual de `respuesta`; no romper refinamiento ni integración existente.

El backend y Gemini deben recibir claramente todas las opciones seleccionadas.

Mantener texto libre/“Otro” si ya existe.

Agregar tests de:
- single select;
- multi select;
- persistencia en estado;
- envío al backend;
- refinamiento usando varias opciones.

3. SEPARAR ORIGEN Y ESTADO DE HU

No mezclar procedencia con comprensión.

ORIGEN:
- `cliente`
- `ia`

ESTADO:
- `a_completar`
- `en_detalle`
- `entendida`
- `con_pendientes`
- `supuesta`

Reglas:

`a_completar`
- necesidad/HU todavía no detallada.

`en_detalle`
- HU actualmente enfocada.

`entendida`
- intención funcional principal suficientemente confirmada y sin pendientes relevantes.

`con_pendientes`
- HU entendida, pero existen aspectos secundarios pendientes o respuestas `noSabe`.
- una sola respuesta `No sé`, especialmente volumen/restricciones, NO debe convertir la HU en `supuesta`.

`supuesta`
- solo cuando para construir/refinar la HU fue necesario asumir información importante no confirmada por el cliente.

Preservar compatibilidad del contrato donde sea razonable, pero dejar semántica clara y testeada.

4. SUGERENCIA ACEPTADA → NECESIDAD LIMPIA

Actualmente aceptar una sugerencia puede guardar literalmente la pregunta conversacional.

Corregirlo.

Al aceptar una sugerencia:
- origen = `ia`;
- estado = `a_completar`;
- guardar funcionalidad/título limpio;
- guardar una descripción breve de la necesidad;
- NO guardar literalmente “¿Querés agregar...?” como HU;
- NO inventar todavía rol/beneficio/formato HU si no están confirmados.

Ejemplo:

HU 3 · Facturación
ORIGEN: IA
ESTADO: A COMPLETAR

“Agregar facturación asociada a la gestión de ventas.”

Cuando llegue su turno:
- pasa a `en_detalle`;
- Gemini genera 4–7 preguntas;
- luego se refina a formato HU real.

TESTS MÍNIMOS

- una HU recibe entre 4 y 7 preguntas en una sola ronda;
- no aparece una segunda ronda normal de la misma HU solo para aspectos faltantes;
- transición HU1→HU2 refina HU1 y genera preguntas HU2;
- selección múltiple funciona end-to-end;
- `No sé` secundario → `con_pendientes`;
- suposición importante → `supuesta`;
- HU completa → `entendida`;
- sugerencia aceptada → origen IA + `a_completar` + texto limpio;
- al llegar su turno → `en_detalle`;
- AIADV-18 sigue intacto.

Verificación:
- backend advisor unit/integration focalizados;
- frontend advisor state/workspace/api focalizados;
- ESLint;
- Prettier;
- build temporal;
- `git diff --check`.

CERO llamadas reales a Gemini para desarrollar/tests.
Solo mocks/fixtures.

Al final reportá:
1. modelo final de rondas por HU;
2. contrato single/multiple choice;
3. modelo origen/estado;
4. comportamiento de sugerencias aceptadas;
5. archivos modificados;
6. tests/resultados;
7. riesgos residuales.

Sin commit.
```

### L38 — AIADV-19 implementation and final verification (2026-10-25)

- Normal HU entry now asks Gemini for one complete 4–7-question batch covering the relevant aspects. Answering that batch drives the next normal call, which refines the answered HU, assigns its final comprehension state, advances focus, and prepares the next HU. Missing provider content may use the existing single exceptional repair attempt, while the AIADV-18 absolute limit remains two provider attempts per round and no visible question is generated server-side.
- Questions now carry `seleccion: 'unica' | 'multiple'`. The frontend renders radios or checkboxes accordingly; multiple selections plus optional free text are serialized as a JSON array in the existing string `respuesta`, preserved in state and requests, and delivered unchanged to refinement.
- HU lifecycle now separates `origen: 'cliente' | 'ia'` from `estado: 'a_completar' | 'en_detalle' | 'entendida' | 'con_pendientes' | 'supuesta'`. Focus promotes pending HUs to `en_detalle`; a secondary `volumen` or `restricciones` `noSabe` forces `con_pendientes`; `supuesta` remains available only for an explicit important provider assumption.
- Accepted suggestions create unlocked IA-origin needs in `a_completar`, using provider-supplied clean `funcionalidad` and `descripcion` rather than conversational question copy. When selected for detail they move to `en_detalle` and receive the same complete Gemini batch.
- Independent verification initially found two blockers: secondary `noSabe` could retain provider-authored `supuesta`, and `AdvisorStoryText.js` failed focused Prettier. Both were corrected; the targeted recheck reported both blockers resolved. The direct regression probes for secondary `noSabe`, explicit important assumption, and multi-select refinement passed, and focused Prettier passed.
- Final checks after the correction: backend focused advisor unit/integration `60 passed, 1 skipped, 0 failed`; the skipped `legacy two-batch flow is replaced by one complete batch per HU` test remains an obsolete advisory at `backend/tests/integration/advisor.api.test.js`; frontend focused advisor state/workspace/API `20/20`; targeted backend ESLint passed with zero warnings; temporary Vite production build transformed 442 modules outside `frontend/dist` and its output was removed; `git diff --check` passed. No real Gemini call, dependency install, commit, push, migration, forbidden-surface edit, or retained scratch artifact was used.
- Receipt-driven review remains unavailable for this accumulated worktree candidate. The required high-risk assessment returned `unassessable` because untracked files need an explicit declaration; canonical STATUS then requested the provider-bound `intended_untracked_selection` capture, which this runtime does not expose. No review START, authority, or repository mutation occurred.
- Residual risk: the legacy skipped two-batch fixture should eventually be deleted or rewritten, but active transition tests cover the one-batch behavior. Provider output can still require the bounded repair path; transparent degradation remains the intentional fallback when no valid question survives.

### L41 — Valid-round false degradation correction (2026-10-26, verbatim)

```text
Usá ODD. Corrección puntual sobre `feat/ai-advisor`.

Sin commit ni push.
CERO llamadas reales a Gemini.
Solo mocks/fixtures y tests focalizados.
No tocar UI, diseño, backlog, viabilidad, admin, migraciones ni `frontend/dist`.

PROBLEMA REAL

En prueba manual, la transición de HU1 a HU2 necesitó 3 reintentos.

La HU1 finalmente quedó bien refinada:

“Como vendedor o administrador, quiero registrar ventas cobrando con distintos medios, para agilizar la atención y actualizar el stock automáticamente.”

Esto indica que la calidad del provider es suficiente, pero alguna parte del backend/postproceso está rechazando o degradando rondas válidas antes de aceptar una.

OBJETIVO

Encontrar exactamente por qué una ronda válida termina en:

- “El asesor no pudo generar preguntas válidas”
- `motivoDegradado: "otro"`

y corregir la causa raíz.

NO quiero parches genéricos ni más retries.

INVESTIGAR

Rastreá el flujo completo:

provider response
→ parse
→ normalizeProviderOutput
→ Zod/schema
→ postprocessAdvisorOutput
→ validación de preguntas/refinadas/sugerencias
→ cálculo de `degradado`
→ clasificación de `motivoDegradado`

Revisar especialmente:

- `providerError`
- `invalidSections`
- `validation.preguntas.discarded`
- `validation.refinadas.discarded`
- `questionItems`
- `refinementMappings`
- `preguntasPedidas`
- `preguntasRecibidas`
- `preguntasValidas`
- `seleccion`
- `tipo`
- `opciones`
- `aspecto`
- `repairNeeded`
- `repairComplete`
- `degradationReason`
- fallback/classifyDegradation que termina en `"otro"`

PUNTOS SOSPECHOSOS A VALIDAR

1. Que el nuevo contrato AIADV-19:
   - 4–7 preguntas;
   - `seleccion: multiple`;
   - sugerencias con funcionalidad/descripcion;
   - refinamientos con estado;

   no esté siendo parcialmente rechazado por validaciones viejas.

2. Que una respuesta válida de Gemini no sea descartada porque:
   - falta un aspecto exacto aunque la HU ya esté suficientemente cubierta;
   - `seleccion` no coincide con lo esperado;
   - las opciones fueron sanitizadas y quedaron menos;
   - el refinamiento llegó válido pero el mapping lo descarta;
   - reparación incompleta fuerza degradación aunque haya contenido útil;
   - alguna sección vacía no obligatoria se trate como error.

3. Que `motivoDegradado:"otro"` se clasifique con un motivo específico cuando corresponda:
   - `validation`
   - `incomplete_questions`
   - `refinement_invalid`
   - `provider`
   - etc.

No dejar `"otro"` para errores que sí podemos identificar.

REPRODUCCIÓN

Crear fixture/mock que reproduzca el caso real:

HU1:
“Como usuario, quiero usar gestión de ventas, para facilitar mi trabajo.”

Respuestas:
- vendedor/administrador;
- varios beneficios;
- varios comportamientos;
- datos previos;
- volumen;
- restricciones.

Provider devuelve:
- refinamiento válido de HU1;
- estado válido;
- 4–7 preguntas válidas para HU2;
- sugerencia válida opcional.

El endpoint debe:
- integrar HU1;
- pasar a HU2;
- devolver preguntas HU2;
- `degradado:false`;
- `motivoDegradado:null`;
- sin necesidad de reintento manual.

TESTS MÍNIMOS

- transición HU1→HU2 válida en 1 intento;
- refinamiento válido no descartado;
- 4–7 preguntas válidas no degradan;
- sección opcional vacía no degrada;
- sanitización de opciones no invalida una ronda válida;
- repair parcial conserva contenido válido;
- motivoDegradado nunca queda `"otro"` si hay causa conocida;
- AIADV-18/19 siguen pasando.

IMPORTANTE

No aumentes cantidad de retries.
No relajes schemas indiscriminadamente.
No ocultes errores.
Corregí la condición exacta que está provocando falsos negativos.

VERIFICACIÓN

- backend advisor unit/integration focalizados;
- frontend solo si cambia contrato visible;
- ESLint;
- Prettier;
- `git diff --check`.

Al final reportá:
1. causa raíz exacta;
2. por qué provocaba varios reintentos;
3. archivos modificados;
4. tests/resultados;
5. cómo quedó `motivoDegradado`;
6. riesgo residual.

Sin commit.
```

- Pre-write mapping confirmed that current valid provider questions survive normalization/postprocessing and force `degradado=false`; the only current source of `motivoDegradado='otro'` is an unclassified gateway exception before parsing. CodeGraph was attempted first but unavailable because the upstream executable is not installed, so bounded filesystem mapping was used.
- Next step: add the focused transition fixture plus degradation-classification regressions, observe RED only for known gateway reasons collapsed to `otro`, then implement the narrow classifier/content-reason correction.

### L42 — AIADV-21 implementation and verification (2026-10-26)

- The real-shape mocked HU1→HU2 fixture passed before the classifier correction: HU1's six answers were integrated, its valid refinement/state survived, focus advanced to HU2, five questions survived option sanitization, and the response was non-degraded in exactly one provider attempt. This disproved the premise that current AIADV-19/20 normalization or postprocessing rejects that valid shape.
- The confirmed defect was `classifyDegradation`: persistent provider 5xx and known gateway `configuration`/`provider`/`response_text` stages fell through to `otro`. The UI therefore exposed an opaque reason and only offered the manual recovery path, even though the backend knew the failure was provider-side.
- The narrow correction classifies known gateway/provider failures as `provider`, JSON/schema/item failures as `validation`, and a completed provider/repair path with zero valid questions as `incomplete_questions`. Existing `rate_limit`, `quota`, and `timeout` remain specific; `otro` is reserved for genuinely unclassified exceptions.
- No retry count, provider schema, Zod item schema, normalization rule, postprocessing acceptance rule, or frontend behavior changed. A partial repair still preserves valid questions and remains non-degraded; invalid/empty optional refinements or suggestions do not override surviving valid questions.
- Test-first evidence: RED failed the new provider-5xx, response-text, incomplete-question, and English validation-reason assertions; GREEN focused backend advisor unit/integration finished with 66 passed, one obsolete legacy skip, and zero failures. Targeted ESLint, Prettier, and `git diff --check` passed.
- Independent verification in isolated temporary copies returned `pass`, reproduced all focused checks, verified the rejected-request fixture hash remained unchanged, and found no AIADV-21 blocker. All reported scratch directories were removed. Gemini calls, commits, pushes, UI/design edits, backlog/viability/admin/migration changes, and `frontend/dist` changes: 0.
- Residual risk: the historical failing manual request had no retained trace, so its precise upstream HTTP/stage cannot be reconstructed. The observed `otro` proves it entered the pre-parse gateway-error path, while the new classifier now distinguishes every gateway failure stage emitted by the production Gemini gateway.

### L43 — Accepted-suggestion transition and provider diagnostics (2026-10-26, verbatim)

```text
Usá ODD. Corrección puntual sobre `feat/ai-advisor`.

Sin commit ni push.
CERO llamadas reales a Gemini.
No tocar UI, backlog, viabilidad, migraciones ni `frontend/dist`.

CONTEXTO IMPORTANTE

La falla ocurrió después de responder HU2.

La siguiente HU NO era una HU original del cliente: era una sugerencia de IA que el usuario había aceptado previamente.

Por lo tanto, antes de asumir que el problema es solamente del gateway/provider, verificá también específicamente la transición:

HU cliente refinada
→ siguiente HU con `origen:"ia"`
→ `estado:"a_completar"`
→ generación de preguntas para esa HU sugerida

TRACE REAL

- providerCalled:true
- providerAttempts:1
- providerError:"provider"
- preguntasRecibidas:0
- preguntasValidas:0
- refinadas:0
- mapping descartado por `missing_mapping`
- reparacion:"sin_presupuesto"
- degradado:true
- motivoDegradado:"provider"

OBJETIVO

Determinar si el fallo fue:

A) error real del provider/gateway;

o

B) alguna diferencia en cómo se construye la request cuando la siguiente HU proviene de una sugerencia IA aceptada.

INVESTIGAR

Comparar explícitamente:

1. transición HU cliente → HU cliente;
2. transición HU cliente → HU sugerida por IA aceptada.

Verificar para la HU sugerida:
- id válido;
- `origen:"ia"`;
- `estado:"a_completar"`;
- funcionalidad limpia;
- descripción limpia;
- ausencia de texto conversacional tipo “¿Querés agregar...?”;
- inclusión correcta en el prompt;
- focusId correcto;
- aRefinarIds correcto;
- que no se espere mapping/refinamiento de la HU nueva antes de tiempo;
- que el prompt no genere una estructura inválida por diferencias de origen/estado.

Además, seguir investigando el error real del provider:

- status HTTP;
- código;
- stage:
  - configuration
  - provider
  - response_text
- message sanitizado;
- finishReason;
- hasResponseText;
- rawErrorName;
- 429/500/503;
- respuesta vacía.

TRACE

Mantener `motivoDegradado:"provider"` como contrato público si corresponde, pero agregar diagnóstico interno suficiente para distinguir la causa exacta.

TESTS MÍNIMOS

- HU cliente → HU cliente;
- HU cliente → HU sugerida IA aceptada;
- HU sugerida correctamente pasa a `en_detalle`;
- genera 4–7 preguntas válidas;
- no exige mapping incorrecto de la HU nueva;
- error provider 500;
- error 503;
- 429;
- response sin text;
- respuesta válida sin degradación.

IMPORTANTE

No aumentar retries.
No relajar schemas indiscriminadamente.
No ocultar el error.
No consumir Gemini real.

Al final reportá:
1. si el origen IA de la siguiente HU influía o no;
2. causa raíz exacta;
3. qué diferencia había entre transición normal y HU sugerida;
4. campos nuevos de trace;
5. tests/resultados;
6. riesgo residual.

Sin commit.
```

- Pre-write mapping found transition parity: accepted suggestions already carry a local ID, clean description/functionality, `origen:'ia'`, `estado:'a_completar'`, and use the same backend focus/prompt path as client stories. The newly focused suggestion is not in `aRefinar`; only the previously answered HU is.
- The supplied one-attempt `provider` trace rules out recognized numeric 429/5xx transient errors because those consume the existing second attempt. Remaining candidates are configuration, response-text extraction, a non-transient/no-status provider failure, or status propagation loss. Next step: lock both transitions and diagnostic fields with RED tests before the narrow gateway/trace change.

### L44 — AIADV-22 implementation and verification (2026-10-26)

- The accepted-IA origin did not influence the failure. The endpoint regression sends HU3 with a valid local ID, `origen:'ia'`, `estado:'a_completar'`, clean `funcionalidad:'Facturación'`, and declarative description. The server promotes it to `en_detalle`, serializes it as `historiaEnFoco`, requests four questions, and returns a non-degraded round in one provider attempt.
- Client→client and client→accepted-IA use the same focus, aspect, prompt, gateway, and postprocessing paths. The only material payload difference is the intended story metadata/content inside the untrusted state. `A_REFINAR` contains the previously answered HU2 only; the newly focused HU3 is not expected to produce a refinement mapping.
- The observed `missing_mapping` therefore belonged to the previously answered HU whose refinement never arrived after the provider failure. It was a downstream consequence, not evidence that the new suggested HU was prematurely refined.
- The supplied one-attempt trace confirms a pre-parse provider/gateway failure and rules out recognized numeric 429/500/503, because those retain the existing second attempt. The historical trace cannot distinguish configuration, response-text extraction, a non-transient/no-status provider error, or lost status metadata; no raw event remains from which to reconstruct that subtype.
- Gateway failures now preserve bounded metadata, and service trace exposes `providerFailure` with `stage`, `statusCode`, `symbolicStatus`, `reason`, `networkCode`, `rawErrorName`, `finishReason`, `hasResponseText`, and allowlisted `messageSanitized`. It never includes raw error messages, prompts, client state, credentials, response bodies, or model names. A response without usable text becomes a `response_text` provider failure with its bounded finish reason.
- No retry count or schema changed. RED reproduced absent `providerFailure`, absent gateway raw-name/status metadata, and a no-text response incorrectly resolving successfully. GREEN focused backend advisor tests passed 72 with one obsolete legacy skip; targeted ESLint, Prettier, and `git diff --check` passed.
- Independent verification returned `pass`, reproduced transition parity and diagnostics in scratch, found no blockers, confirmed the rejected-request fixture hash remained unchanged, and reported no forbidden-surface changes. Its scratch directory was removed. Gemini calls, commits, pushes, UI edits, backlog/viability/migration changes, and `frontend/dist` changes: 0.
- Residual risk: this instrumentation makes the next occurrence exact, but it cannot retroactively recover the missing status/stage from the already-recorded historical trace. Risk is item 3 because the shared gateway helper is also consumed by analysis and backlog generation.

### L45 — Exact TypeError origin on the Gemini boundary (2026-10-26, verbatim)

```text
Usá ODD. Corrección puntual sobre `feat/ai-advisor`.

Sin commit ni push.
CERO llamadas reales a Gemini.

Tenemos nueva evidencia real.

PRIMER FALLO:
- providerAttempts:2
- stage:"provider"
- statusCode:503
- symbolicStatus:"UNAVAILABLE"
- rawErrorName:"ApiError"

Eso es indisponibilidad real del provider.

SEGUNDO FALLO, al pulsar Reintentar:
- providerAttempts:1
- stage:"provider"
- statusCode:null
- symbolicStatus:null
- rawErrorName:"TypeError"
- networkCode:null
- finishReason:null
- hasResponseText:null
- messageSanitized:"provider_failure"

OBJETIVO

Encontrar la causa exacta de ese TypeError.

No asumir que es simplemente otro fallo externo.

INVESTIGAR

Revisar todo el gateway Gemini y especialmente:
- manejo de excepciones del SDK;
- acceso a response.text / response.candidates;
- optional chaining faltante;
- destructuring de respuestas incompletas;
- lectura de status/code sobre errores sin esa propiedad;
- errores de red convertidos en TypeError;
- parseo de respuesta vacía;
- tratamiento del resultado después de un 503;
- estado reutilizado entre retries;
- reutilización incorrecta de objetos/request;
- diferencias entre primer intento automático y reintento manual desde frontend.

Agregar diagnóstico interno suficiente para distinguir:
- TypeError generado por nuestro código;
- TypeError originado por fetch/SDK;
- error de red;
- response incompleta.

TESTS MÍNIMOS

Mockear:
1. 503 UNAVAILABLE.
2. TypeError lanzado por SDK/fetch.
3. TypeError provocado por response.text inexistente.
4. response undefined/null.
5. response sin candidates.
6. retry manual posterior a una degradación.
7. respuesta válida posterior a un 503.

IMPORTANTE

No aumentar retries.
No consumir Gemini real.
No cambiar schemas ni lógica funcional del advisor.
No ocultar el error detrás de "provider".

Al final reportá:
1. origen exacto del TypeError;
2. si es bug nuestro, SDK o red;
3. fix aplicado;
4. archivos modificados;
5. tests;
6. riesgo residual.

Sin commit.
```

- Exact origin determination: the TypeError was not produced by advisor postprocessing. The gateway wraps every exception thrown by `client.models.generateContent` as `stage:"provider"`, and only copies `error.name`/`error.status`/`error.code`. A TypeError with no status and no top-level code is an exception raised inside the SDK call before a typed `ApiError` existed. The two possibilities the old trace could not separate are `fetch`/undici `TypeError("fetch failed")` (network, with the real code on `error.cause`) and an SDK-internal TypeError. The old diagnostic discarded `cause`, so `networkCode:null` was a loss of evidence, not proof of a non-network failure.
- State reuse was ruled out structurally: every round rebuilds the prompt and every gateway call creates a fresh `GoogleGenAI` client with a fresh config object; no request/response object survives between the automatic retry and the manual frontend retry.
- Fix: bounded error-chain capture plus a closed `errorOrigin` enum in the gateway, defensive `response`/`candidates`/`text` reads, and trace fields `errorOrigin`, `causeName`, `causeCode`, `hasCandidates` with specific `messageSanitized` values. Public `motivoDegradado`, retry count, schemas, and advisor behavior stay unchanged.

### L46 — S69 implementation and verification (2026-10-26)

- Gateway: bounded `collectErrorChain` (max 3, follows `cause`), closed `errorOrigin` classification, `causeName`/`causeCode`, `readResponseShape`, and guarded `response`/`candidates`/`text` access. `failure.networkCode` still reads only top-level `error.code`, so `classifyDegradation` and retry decisions are unchanged.
- Service: trace now carries `errorOrigin`, `causeName`, `causeCode`, `hasCandidates`; `messageSanitized` distinguishes `network_failure`, `sdk_type_error`, `missing_response_text`, `unreadable_response_text`, and keeps `provider_failure` for typed provider API errors. Public `motivoDegradado:"provider"`, schemas, retries, and advisor logic unchanged.
- New `backend/tests/unit/gemini-gateway-origin.test.js` covers the seven required mocked cases, including a gateway-in-the-loop manual retry (2×503 then network TypeError) and a valid round after 503 with no state reuse. Exact trace expectations in `backend/tests/unit/advisor-round.test.js` were updated.
- Verification: focused backend unit 94/94 pass; advisor API integration 17 pass + 1 pre-existing skip; targeted ESLint, Prettier, and `git diff --check` pass. Full `npm test` was attempted once and stalled on pre-existing DB migration tests (failures 31/42/44 and 600s timeout); no migration or DB code was touched.
- Residual risk: item 3. The shared gateway failure object serves analysis/backlog callers; only additive fields were introduced and `networkCode` semantics were preserved deliberately. Zero real Gemini calls, no commit, no push.

### L47 — Single provider call and degraded copy (2026-10-26, verbatim)

```text
Usá ODD. Cambio puntual sobre `feat/ai-advisor`.

Sin commit ni push.
CERO llamadas reales a Gemini.

OBJETIVO 1 — ELIMINAR RETRY AUTOMÁTICO

Actualmente una sola acción del usuario puede hacer hasta 2 llamadas al provider cuando ocurre un fallo transitorio como:

- 503 UNAVAILABLE
- network error
- timeout
- provider error

Esto consume cuota innecesariamente, porque si Gemini está temporalmente caído, el segundo intento inmediato suele volver a fallar.

NUEVA REGLA

Cada acción del usuario debe hacer como máximo:

- 1 llamada real a Gemini.

Si falla:
- no hacer retry automático;
- devolver degradación normalmente;
- conservar el estado actual;
- permitir que el usuario use el botón manual “Reintentar”.

El botón “Reintentar” sí debe provocar una nueva llamada independiente, porque es una decisión explícita del usuario.

OBJETIVO 2 — MENSAJE CLARO EN FRONTEND

Actualmente, ante `motivoDegradado:"provider"`, el frontend muestra algo genérico como:

“El asesor no pudo generar preguntas válidas.”
“Motivo: provider”

Eso es incorrecto para casos confirmados como:

- 503 UNAVAILABLE
- error de red
- timeout
- fallo temporal del provider

Cambiar el mensaje visible según el motivo técnico.

CASO `provider`

Si `motivoDegradado === "provider"` mostrar un mensaje entendible, por ejemplo:

“El servicio de IA no está disponible temporalmente.”

Texto secundario:

“Podés reintentar más tarde o continuar sin el asesor.”

NO mostrar al usuario:
- `provider`
- `503`
- `UNAVAILABLE`
- nombres internos del gateway
- detalles técnicos del SDK

El detalle técnico debe quedar solamente en trace/logs.

OTROS MOTIVOS

Mantener mensajes diferenciados y claros cuando corresponda:

- quota:
  “Se alcanzó temporalmente el límite de uso del servicio de IA.”

- rate_limit:
  “Hay demasiadas solicitudes al servicio de IA en este momento.”

- timeout:
  “El servicio de IA tardó demasiado en responder.”

- validation / incomplete_questions:
  puede mantenerse un mensaje relacionado con que la respuesta no pudo procesarse correctamente.

Usar el menor cambio posible y respetar el estilo visual actual del advisor.

IMPORTANTE

No modificar:
- schemas;
- prompts;
- lógica funcional de refinamiento;
- estados de HU;
- tracing interno;
- backlog;
- viabilidad;
- `frontend/dist`.

Mantener:
- `motivoDegradado`;
- `providerFailure`;
- `errorOrigin`;
- botón manual “Reintentar”;
- “Continuar sin asesor”;
- “Ya está, armá el resumen”.

TESTS

Actualizar/agregar tests para comprobar:

1. 503 UNAVAILABLE:
   - providerAttempts = 1;
   - no segundo llamado automático.

2. network failure:
   - providerAttempts = 1.

3. timeout:
   - providerAttempts = 1.

4. respuesta válida:
   - providerAttempts = 1.

5. reintento manual:
   - una nueva acción genera exactamente 1 nueva llamada;
   - puede recuperarse correctamente.

6. frontend con `motivoDegradado:"provider"`:
   - muestra “El servicio de IA no está disponible temporalmente”;
   - NO muestra “El asesor no pudo generar preguntas válidas”;
   - NO muestra literalmente `provider`.

7. frontend con quota/rate_limit/timeout:
   - muestra mensajes claros y diferenciados.

Verificación:
- tests focalizados advisor/gateway;
- frontend advisor;
- integración advisor;
- ESLint;
- Prettier;
- git diff --check.

Al final reportá:
1. dónde estaba implementado el retry automático;
2. cómo quedó el máximo de llamadas por acción;
3. cómo quedó el mapeo de mensajes visibles;
4. archivos modificados;
5. tests/resultados;
6. riesgo residual.

Sin commit ni push.
```

- Automatic retry lived in the `for (let attempt = 1; attempt <= 2; attempt += 1)` loop inside `round()` in `advisor-service.js`, gated by `isTransientProviderError` (429, 5xx, timeout) with `advisorRetryBackoffMs`.
- Removed that loop, `isTransientProviderError`, the `sleep`/`retryBackoffMs` options, and the now-unused `advisorRetryBackoffMs` config export. One action now makes one `generateAdvisorRound` call; failures degrade immediately and the manual retry is a separate action with one call.
- Frontend now receives `round.motivoDegradado` in every build (it was DEV-only) and `AdvisorDegradedNotice` maps the reason to user-facing copy without printing the raw reason. The bounded repair call on a successful but incomplete response remains functional logic, not a failure retry.
- Verification: backend focused unit 96/96, advisor integration 17 pass + 1 pre-existing skip, frontend advisor 32/32, backend ESLint and Prettier pass.

### L48 — AIADV-25 implementation and verification (2026-10-28)

- Moved current process, solution type, catalog functionality, platforms, user types, and approximate user count to the required advisor start context; final details now retain only company/contact and budget/timeline data.
- Added provider and client objective state, shared citation grounding, per-round and call-free closure revalidation, invalid-output preservation, prompt context, response output, and sanitized objective trace counters without adding provider calls.
- Added project payload version 2, uncertain-type fallback, current-story functionality filtering, minimal empty-objective schema compatibility, and backward-compatible administrator summaries for v2, empty, no-advisor, and legacy projects.
- Focused verification passed: backend 89 pass / 1 obsolete skip; frontend 28/28; backend ESLint; temporary Vite build outside `frontend/dist`; and `git diff --check`. No real Gemini calls, dependency changes, migration changes, commit, or push occurred.
- Prettier check remained non-mutating and reported 12 accumulated files with style drift; broad formatting was intentionally avoided because the worktree contains unrelated prior edits. Native review was granted but no authority was created because the accumulated 17,480-line candidate exceeded the lens context budget.

### L49 — Advisor and administrator refinement request (2026-10-28, verbatim)

```text
Usá ODD sobre la rama `feat/ai-advisor`.
Antes de modificar:
- Ejecutá `git status`.
- No hagas commit, push, checkout, reset, clean ni stash.
- No reviertas cambios previos.
- No tocar `frontend/dist`.
- No agregar dependencias.
- No realizar llamadas reales a Gemini.
- No modificar backlog, Kanban, migraciones, viabilidad ni payloads salvo necesidad estricta.
- Mantener CSS puro con prefijo `adv-`, sin Framer Motion, respetando `prefers-reduced-motion`.
- Trabajar con cambios mínimos y focalizados.
Objetivo: aplicar las siguientes mejoras al Advisor y al resumen administrativo sin romper compatibilidad ni arquitectura.
1. Confirmación de objetivos
Eliminar únicamente la frase:
“El administrador verá estos objetivos junto con el relevamiento.”
Mantener el título, la lista y el diseño actual.
2. Formulario final
Mejorar visualmente inputs, textarea y selects:
- fondo, bordes, radius y padding;
- tipografía y contraste;
- estados hover, focus y focus-visible;
- separación entre label, ayuda y control;
- chevron del select si corresponde.
Mantener tema oscuro, opciones, valores, validaciones, lógica y payload. No depender de estilos frágiles sobre las opciones nativas del select.
3. Tipo de proyecto en el resumen admin
No mostrar valores internos como `gestion`. Crear o reutilizar un mapper explícito para todos los valores reales del enum.
Ejemplo:
`gestion` → `Sistema de gestión`
No modificar el valor persistido ni el payload. Agregar fallback seguro para valores desconocidos.
4. Objetivos del resumen admin
Mostrar cada objetivo en una línea o elemento separado, en lugar de una sola línea dividida por `·`.
Mantener la etiqueta “Inferidos por IA a partir del relevamiento” cuando corresponda y conservar compatibilidad con proyectos antiguos.
5. Grid inferior del resumen
Mejorar la distribución responsive de:
- Plataformas;
- Usuarios estimados;
- Tipos de usuario;
- Presupuesto;
- Plazo.
Evitar que una tarjeta quede aislada y que el diseño se vea desbalanceado. Verificar como mínimo 375px, 768px, 1024px y 1280px. No generar scroll horizontal ni cambiar el contenido.
6. HU refinadas
Modificar únicamente la instrucción de refinamiento de HU para que aproveche mejor las respuestas confirmadas del relevamiento.
Debe mantener la estructura:
“Como [rol], quiero [necesidad], para [beneficio].”
Puede incluir 1 o 2 detalles funcionales relevantes confirmados, pero no debe:
- convertirse en un párrafo extenso;
- incluir criterios de aceptación;
- enumerar todas las respuestas;
- inventar funcionalidades;
- agregar restricciones no confirmadas;
- duplicar información.
Ejemplo esperado:
Antes:
“Como administrativo o mecánico, quiero registrar y dar seguimiento a órdenes de reparación, para conocer el estado del vehículo sin demoras.”
Después:
“Como administrativo o mecánico, quiero registrar y dar seguimiento a órdenes de reparación con los datos del vehículo, trabajo asignado y estado, para conocer el avance de cada reparación y mantener un registro confiable.”
Usar solo evidencia de preguntas/respuestas, HU previa y contexto confirmado. No agregar llamadas a Gemini ni crear una nueva etapa de refinamiento. Actualizar el test determinístico del prompt si existe.
7. Estilo de “Tipo de solución”
Hacer que el label/título tenga el mismo color, peso, tamaño, espaciado y jerarquía visual que “Funcionalidades que ya imaginás”. No cambiar su funcionalidad.
8. Estilo de “Proceso actual”
Hacer que “¿Cómo realizan actualmente este proceso?” sea visualmente equivalente al campo principal “Contanos tu idea”:
- mismo tipo de control;
- fondo, borde, radius y padding;
- tipografía, ancho y presencia visual;
- estados hover/focus;
- placeholder coherente.
Mantener su label, ayuda y validación propios.
9. Espaciado de la primera pantalla
Revisar la separación y agrupación entre:
- idea;
- proceso actual;
- tipo de solución;
- funcionalidades;
- plataformas;
- cantidad de usuarios;
- tipos de usuario.
Usar una escala de spacing coherente, evitando márgenes arbitrarios y campos amontonados.
10. Recuperar el acordeón de la primera pantalla
La pantalla debe mostrar inicialmente solo:
- “Contanos tu idea”;
- “¿Cómo realizan actualmente este proceso?”
Debajo, agregar un acordeón cerrado inicialmente para:
- Tipo de solución;
- Funcionalidades que ya imaginás;
- Plataformas;
- Cantidad aproximada de usuarios;
- Tipos de usuario.
Reutilizar el patrón anterior si existe. Si no, usar como título “Agregar más detalles del proyecto”.
El acordeón debe:
- abrir y cerrar con click;
- conservar los valores al cerrarse;
- no desmontar ni resetear campos;
- usar un botón real;
- incluir `aria-expanded`, `aria-controls` y foco visible;
- animarse con CSS puro;
- respetar `prefers-reduced-motion`;
- no producir flicker.
Mantener las validaciones actuales. Si existe un error en un campo interno obligatorio, abrir automáticamente el acordeón y mostrar el error. No inventar campos obligatorios ni modificar el payload.
Compatibilidad
No modificar:
- `asesorPayload.js`, salvo necesidad estricta;
- schema de `POST /api/proyectos`;
- `asesoramiento.version=2`;
- grounding de objetivos;
- `procesoActual`;
- `tipoInferido`;
- viabilidad;
- generación o validación semántica del backlog;
- Kanban.
Tests y verificación
Ejecutar únicamente verificaciones focalizadas:
- primera pantalla: idea/proceso visibles y acordeón cerrado;
- campos secundarios dentro del acordeón;
- conservación de valores al abrir/cerrar;
- apertura automática ante errores internos, si corresponde;
- formulario final sin cambios funcionales;
- confirmación sin la frase eliminada;
- objetivos del admin como lista;
- `tipoProyecto` humanizado;
- compatibilidad con proyectos antiguos;
- test determinístico del prompt de HU;
- confirmar que no aumentan las llamadas al proveedor;
- build frontend en directorio temporal;
- ESLint sobre archivos modificados;
- `git diff --check`.
No ejecutar llamadas reales a Gemini, Edge/CDP ni auditorías visuales largas.
Reporte final breve:
1. Archivos modificados.
2. Comportamiento final del acordeón.
3. Cambio realizado en el prompt de HU.
4. Ejemplo antes → después usando fixture/mock.
5. Mapping de `tipoProyecto`.
6. Cambios del resumen admin.
7. Tests ejecutados y resultados.
8. Confirmación de llamadas reales a Gemini: 0.
9. Riesgos o puntos a validar visualmente.
10. Mensaje de commit sugerido, sin hacer commit.
```

### L50 — AIADV-26 implementation and verification (2026-10-28)

- Restored an initially closed, button-driven first-screen details accordion. Its controls remain mounted, preserve values, expose `aria-expanded`/`aria-controls`, are removed from interaction while collapsed, and open automatically when validation reports an internal error.
- Aligned the process textarea with the primary idea control, aligned solution-type hierarchy with functionality hierarchy, normalized spacing, polished final-form controls, and preserved pure `adv-` CSS with reduced-motion handling.
- Humanized all six real project types with a safe unknown/legacy fallback, rendered objectives as separate list items with v2 inferred and v1/manual compatibility, and balanced the lower summary metadata as three plus two cards above 640px and one column below it.
- Strengthened only the HU-refinement prompt so one or two confirmed functional details may be included while preserving the requested format and forbidding answer enumeration, long paragraphs, acceptance criteria, invented functionality, unconfirmed restrictions, and duplication. Provider call orchestration was untouched.
- RED was observed for missing accordion/helper, leaked admin enum/objective flattening, retained confirmation sentence, and missing prompt constraints. GREEN: nine focused frontend tests and three focused backend prompt/call-budget tests passed; temporary Vite build transformed 447 modules outside `frontend/dist`; backend and temporary frontend ESLint checks passed; `git diff --check` passed with line-ending warnings only; real Gemini calls were zero.
- Structural responsive proof covers 375px single-column and 768/1024/1280px six-track 3+2 balance without intrinsic overflow. Edge/CDP was intentionally not used. The Impeccable detector reported only four pre-existing `panel.css` advisories outside this task's lines.
- Independent verification found S78 and S79 met and the S80 implementation evidence sound; its own proof was partial only because it did not reuse parent-held build/lint/detector evidence. Native review was granted but could not create authority because the accumulated 19,008-line uncommitted candidate exceeded the lens context budget.
