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
- `maxLargoRespuesta=600`
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

## Tasks

- [x] AIADV-1 (S1–S8) — Unit 1 backend round engine, public endpoint, protections, prompt/provider boundary, and focused tests. Route: inline after delegated read-only mapping; writer trigger absent. Commit: this Unit 1 commit, `feat(advisor): requirements advisor rounds endpoint`.
- [x] AIADV-2 (S9–S13) — Unit 2 frontend advisor flow, pure project payload, fallback, accessibility, responsive UI, and focused proof. Route: inline after delegated read-only mapping; writer trigger absent. Commit: this Unit 2 commit, `feat(advisor): client advisor screens`.
- [x] AIADV-3 (S14–S17) — Unit 3 persistence proof, readable admin advisor detail, advisor-aware viability signals/prompt, and advisor-aware backlog prompt. Route: inline after delegated read-only mapping; writer trigger absent. Commit: this Unit 3 commit, `feat(advisor): admin view and advisor-aware analysis`.

## Log

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
