# Admin Backlog Decomposition

Objective: improve administrator backlog generation from confirmed client stories without migrations or live Gemini calls. Branch: `feat/ai-advisor`; delivery: no commit/no push; forecast: 250–400 authored lines. Test runner: focused Node tests under `backend/tests`.

## Specs

### S1 — Functional decomposition and source truth

“Las HU confirmadas en la captura de requerimientos del cliente son la fuente de verdad funcional, pero NO necesariamente las tarjetas finales del backlog.”

Gemini must: “Tomar todas las HU confirmadas del cliente”, “Analizar cada una y decidir si necesita descomponerse”, divide broad stories into “varias HU implementables, pequeñas y coherentes”, keep “trazabilidad explícita entre cada HU generada y la HU original del cliente”, and generate the technical work required to implement them. “Una HU del cliente puede producir 1 o varias HU del backlog.” “Toda HU del cliente confirmada debe quedar cubierta por al menos una tarjeta del backlog.”

### S2 — Card kinds, approval, and traceability

Differentiate clearly: “historia de usuario funcional”, “tarea técnica”, and “spike, solo si realmente hace falta investigación”. Preserve equivalent metadata for `tipo`, `origen`, and the parent requirement/HU using the existing persisted fields through the user-approved “Convención sin migración”. “No inventar nuevas funcionalidades de negocio como si estuvieran aprobadas por el cliente.” Additional useful business functionality must remain `propuesta` or `pendiente de aprobación`, never approved backlog scope. “Toda tarjeta funcional debe poder trazarse a una HU/requerimiento confirmado.”

### S3 — Quality rules

“No duplicar historias.” “No convertir cada detalle técnico en HU falsa tipo ‘Como desarrollador…’.” “Las tareas técnicas deben seguir siendo tareas técnicas.” “No sobrefragmentar: dividir solo cuando mejora implementación/estimación.” Preserve acceptance criteria, priority, and Fibonacci estimation. Stories `a_completar`, `supuesta`, or otherwise unconfirmed “no deben transformarse en alcance aprobado sin tratamiento explícito.”

### S4 — Scope and compatibility

“Sin commit ni push.” “CERO llamadas reales a Gemini.” “Solo tests focalizados.” Do not touch requirements capture, advisor behavior, client panel, viability, migrations, or `frontend/dist`. Projects without advisor data must keep the legacy backlog flow working. Keep the current persisted schema and public response contract unless an unavoidable incompatibility is proven.

### S5 — Required proof

Cover: broad client HU → multiple implementable HUs; simple HU → one HU; associated technical tasks; traceability on all derived HUs; no unapproved business functionality accepted; proposals separated; no duplicates; existing estimate/priority/acceptance criteria behavior; legacy projects without advisor. Verify focused backend backlog and persistence tests, frontend admin/backlog only if the contract changes, ESLint, Prettier, and `git diff --check`.

### S6 — Semantic false-negative correction and safe diagnostics

- Reproduce Proyecto Librería Norte with the three confirmed stories quoted in L6 and a mixed generated backlog containing functional user stories, technical tasks, a spike, traceability, priority, Fibonacci estimation, and acceptance criteria.
- Functional cards must remain valid user stories; derived functional stories may vary harmless punctuation while retaining a valid `Como ..., quiero ..., para ...` structure. Technical tasks and spikes must not be forced into that structure, but empty, garbage, and fake technical user stories remain invalid.
- Preserve traceability and approval boundaries: missing/unknown parents fail, and new business functionality remains `propuesta`, never approved automatically.
- For `semantic_validation`, development diagnostics must expose only sanitized `index`, `cardType`, `rule`, `origin`, `parent`, and `field`; never prompts or complete card text.
- Do not change schemas, prompts, advisor logic, backlog persistence shape, viability, migrations, or `frontend/dist`. Zero real Gemini calls; no commit or push.

### S7 — Observable functional-story semantic failures without behavior changes

- Investigate the exact `Gemini → parseo → normalización → Zod → validación semántica` flow for `functional_user_story_required` without changing prompt, generation, repair/retry, payload, Advisor, viability, Kanban, persistence, HTTP status, provider-call count, or any semantic rule.
- On `semantic_validation`, diagnostics for rejected cards retain sanitized `index`, `cardType`, `origin`, `parent`, `rule`, and `field`, and add the rejected field value plus its normalized value only when a relevant transformation occurred. For `functional_user_story_required`, the diagnostic must show what `historia_usuario` contained.
- Bound diagnostic strings and exclude the complete prompt, API keys, secrets, complete provider response, unrelated card fields, and unnecessary project data.
- Focused proof keeps a valid functional story passing, keeps an invalid functional story failing under the same rule/status and without persistence or extra provider calls, includes the relevant rejected value, and excludes unrelated sensitive values. Real Gemini calls, commits, and pushes are prohibited.

### S8 — Align functional-card generation with the semantic contract

- Correct only the backlog-generation prompt so every card with `tipo/cardType = historia_usuario` places a complete user story in `historia_usuario` using exactly the compatible structure `Como <rol>, quiero/necesito/deseo <necesidad>, para <beneficio>.` Do not relax or remove `functional_user_story_required`, and do not automatically rewrite invalid titles.
- Explicitly prohibit titles, functionality names, noun phrases, imperatives, descriptions without a role, need, or benefit, and texts omitting `Como`, `quiero`/`necesito`/`deseo`, or `para`. Include the invalid example `Envío Directo de Recordatorios de Turno por WhatsApp` and the valid example `Como administrador, quiero enviar recordatorios de turnos por WhatsApp, para reducir las ausencias de los clientes.` as illustrations only, without domain-specific runtime logic.
- Preserve confirmed client stories as functional truth, decomposition and parent traceability, proposal boundaries, technical tasks, spikes, Fibonacci estimates, priorities, acceptance criteria, metadata, Kanban, persistence, Advisor, viability, model, timeout, retry/repair, HTTP behavior, and provider-call count. Technical tasks and spikes retain direct titles and must not be forced into user-story grammar.
- Focused deterministic tests prove the prompt contract, a valid functional story passes, the observed title remains rejected by `functional_user_story_required`, technical tasks and spikes retain direct titles, traceability metadata is unchanged, and one user action still makes one mocked provider call. Real Gemini calls, commits, pushes, and `frontend/dist` writes are prohibited.

## Tasks

- [x] T1 — S1–S3 — Route: inline after delegated read-only map; RED observed for the missing semantics module and prompt contract, then GREEN with 14/14 focused units. Commit: forbidden by user.
- [x] T2 — S1–S5 — Route: inline; controlled provider and persistence doubles pass, and guarded DB backlog integration passes 6/6. Commit: forbidden by user.
- [x] T3 — S4–S5 — Route: inline checks plus independent verifier for Risk items 1 and 3; ESLint, Prettier, `git diff --check`, and verifier recheck pass. Commit: forbidden by user.
- [x] T4 — S6 — Route: inline after delegated read-only mapping; test-first correction in semantic validation and sanitized diagnostics. Risk: items 1 and 3 because the validator gates persisted backlog and changes an existing consumed validation contract. Commit and push forbidden; real Gemini calls forbidden. Evidence: RED reproduced exact `[0|2|4, "historia_usuario"]` failures for harmless punctuation changes, the overbroad technical `^como` rejection, missing functional outcome clauses, and punctuation-only technical titles; GREEN focused units 20/20 and guarded persistence integration 2/2; ESLint, Prettier, and `git diff --check` pass; independent blocker recheck 2/2 passes.
- [x] T5 — S7 — Diagnosed `functional_user_story_required` and added bounded rejected-field observability without changing validation or backlog behavior. Route: inline after bounded flow inspection because validator, diagnostic sanitizer, and two focused test files form one contained instrumentation change; no writer trigger applied. Risk: item 2 because rejected values enter development logs and therefore require credential redaction. Commit and push forbidden; real Gemini calls forbidden. Evidence: RED proved missing values, truncation and quoted-credential/Basic-auth leaks; GREEN focused units 18/18, targeted ESLint and Prettier pass, `git diff --check` passes with existing line-ending warnings, and direct credential probes redact JSON, Basic/Bearer, token, password and secret forms. Independent verifier found the credential blocker; the bounded correction passed locally, but its targeted independent recheck was unavailable because the provider usage limit was reached.
- [x] T6 — S8 — Aligned only the backlog-generation prompt with the existing functional-story semantic contract and pinned it with focused prompt, semantic, traceability and provider-call-count tests. Route: inline because the prompt and focused backlog contract/semantic tests form one contained provider-contract correction; no writer trigger applied. Risk: item 3 because the prompt is a provider-consumed generation contract. Commit and push forbidden; real Gemini calls forbidden. Evidence: RED proved the prompt omitted the required grammar; GREEN focused prompt/semantic/diagnostic units 22/22, targeted ESLint and Prettier pass, `git diff --check` passes with existing line-ending warnings, and independent verification passed 22/22 with no blockers.

## Log

### L1 — Original request — 2026-10-25

Usá ODD. Mejora acotada sobre `feat/ai-advisor`.

Sin commit ni push.
CERO llamadas reales a Gemini.
Solo tests focalizados.
No tocar captura de requerimientos, advisor, panel cliente, viabilidad, migraciones ni `frontend/dist`.

Objetivo: mejorar la generación del backlog del administrador.

REGLA PRINCIPAL

Las HU confirmadas en la captura de requerimientos del cliente son la fuente de verdad funcional, pero NO necesariamente las tarjetas finales del backlog.

Al generar backlog, Gemini debe:

1. Tomar todas las HU confirmadas del cliente.
2. Analizar cada una y decidir si necesita descomponerse.
3. Si una HU es demasiado amplia, dividirla en varias HU implementables, pequeñas y coherentes.
4. Mantener trazabilidad explícita entre cada HU generada y la HU original del cliente.
5. Generar también las tareas técnicas necesarias para implementar esas HU.
6. Diferenciar claramente:
   - historia de usuario funcional;
   - tarea técnica;
   - spike, solo si realmente hace falta investigación.
7. No inventar nuevas funcionalidades de negocio como si estuvieran aprobadas por el cliente.
8. Si detecta una funcionalidad de negocio adicional útil pero no confirmada, debe quedar como `propuesta` o `pendiente de aprobación`, nunca como backlog aprobado automáticamente.

MODELO ESPERADO

Ejemplo:

HU cliente:
“Como cajero, quiero registrar ventas para agilizar la atención.”

Puede derivar en:

- HU: Registrar productos y cantidades de una venta
- HU: Calcular total automáticamente
- HU: Registrar medio de pago
- HU: Actualizar stock al confirmar la venta
- HU: Consultar historial de ventas

Y tareas técnicas asociadas:

- endpoint de ventas
- persistencia de detalle
- transacción venta-stock
- validaciones
- tests

Cada tarjeta debe conservar trazabilidad, por ejemplo:

- `tipo`: `historia_usuario | tarea_tecnica | spike`
- `origen`: `cliente | derivada_ia | tecnica`
- `requerimientoPadreId` o equivalente
- referencia a la HU original del cliente

No hace falta usar exactamente esos nombres si el modelo actual ya tiene campos equivalentes; adaptalo con el menor cambio posible.

REGLAS DE CALIDAD

- No duplicar historias.
- No convertir cada detalle técnico en HU falsa tipo “Como desarrollador…”.
- Las tareas técnicas deben seguir siendo tareas técnicas.
- No sobrefragmentar: dividir solo cuando mejora implementación/estimación.
- Mantener criterios de aceptación, prioridad y estimación Fibonacci donde ya corresponda.
- Una HU del cliente puede producir 1 o varias HU del backlog.
- Toda HU del cliente confirmada debe quedar cubierta por al menos una tarjeta del backlog.
- Toda tarjeta funcional debe poder trazarse a una HU/requerimiento confirmado.
- Las HU `a_completar`, `supuesta` o no confirmadas no deben transformarse en alcance aprobado sin tratamiento explícito.

TESTS MÍNIMOS

- 1 HU amplia del cliente → varias HU implementables.
- 1 HU simple → puede mantenerse como una sola.
- se generan tareas técnicas asociadas.
- todas las HU derivadas conservan trazabilidad.
- no se crean funcionalidades de negocio nuevas como aprobadas.
- propuestas no confirmadas quedan separadas.
- no hay duplicados.
- estimación/prioridad/criterios existentes siguen funcionando.
- proyectos legacy sin advisor siguen funcionando.

Verificación:

- backend backlog focalizado;
- tests de generación/persistencia;
- frontend admin/backlog solo si el contrato cambia;
- ESLint;
- Prettier;
- `git diff --check`.

Al final reportá:

1. cómo quedó la descomposición;
2. cómo quedó la trazabilidad;
3. cómo se diferencian HU/tarea/spike/propuesta;
4. archivos modificados;
5. tests/resultados;
6. riesgo residual.

Sin commit.

### L2 — Product decision — 2026-10-25

User selected “Convención sin migración (Recommended)”: preserve type, origin, and parent traceability through an explicit validated convention inside the existing persisted fields.

### L3 — Initial evidence — 2026-10-25

The current generated backlog has eight strict provider fields and no dedicated metadata columns. Existing cached backlog takes precedence. Mapping found no equivalent persisted metadata fields, so the approved convention must remain within those eight fields and preserve legacy projects.

### L4 — Implementation and proof — 2026-10-25

Backlog descriptions now begin with validated metadata `[BACKLOG tipo=...; origen=...; padre=...; aprobacion=...]`. The prompt distinguishes retained/decomposed functional stories, technical tasks, spikes, and proposals; runtime validation enforces confirmed-parent coverage, proposal boundaries, type/origin combinations, duplicate rejection, technical-task presence, and legacy no-advisor compatibility before atomic persistence. `editada_cliente` is accepted as legacy confirmed source truth. RED was observed before implementation. Final focused unit tests passed 14/14; guarded backlog integration passed 6/6 with a mocked provider; targeted ESLint, Prettier, and `git diff --check` passed. Independent verification concluded S1–S5 MET with no blockers. No live Gemini call, migration, frontend change, commit, or push occurred. Residual: semantic relevance of arbitrary natural-language decomposition remains Gemini-owned; deterministic guards cannot prove meaning without another model or manual approval.

### L5 — Native review — 2026-10-25

The user granted native four-lens review, but START stopped before creating authority with `lens_context_budget_exceeded` because the accumulated 24-file dirty candidate exceeded the immutable reviewer context budget. Retrying the same candidate cannot succeed; reducing it would require smaller commit/staged boundaries, which were not created because the user prohibited commits and the existing unrelated worktree must remain untouched.

### L6 — Semantic validation correction request — 2026-10-27

```text
Usá ODD. Corrección puntual sobre `feat/ai-advisor`.

Sin commit ni push.
CERO llamadas reales a Gemini.

PROBLEMA REAL OBSERVADO

Al generar backlog para un proyecto válido con 3 HU confirmadas del advisor, el primer intento falló así:

`backlog_generation_failed`
- stage: `semantic_validation`
- errorName: `BacklogSemanticError`
- zodIssues:
  - `[0, "historia_usuario"]`
  - `[2, "historia_usuario"]`
  - `[4, "historia_usuario"]`

El segundo intento fue un 503 UNAVAILABLE real del provider y no forma parte de este bug.

OBJETIVO

Encontrar exactamente qué regla semántica está rechazando esas tarjetas y corregir falsos negativos sin relajar indiscriminadamente la validación.

INVESTIGAR

Seguí el flujo:

respuesta Gemini
→ schema/Zod
→ normalización
→ backlog-semantics
→ validación semántica
→ persistencia

Revisar específicamente las reglas aplicadas sobre `historia_usuario`.

Comprobar si actualmente:
- se exige de forma demasiado rígida el formato literal `Como ..., quiero ..., para ...`;
- se valida `historia_usuario` incluso cuando la tarjeta es `tarea_tecnica` o `spike`;
- una HU derivada válida puede ser rechazada por pequeñas variaciones de redacción;
- la metadata `[BACKLOG ...]` afecta la validación;
- la descomposición reciente genera una shape válida pero incompatible con reglas legacy;
- las reglas nuevas de `tipo`, `origen`, `padre`, `aprobacion` están interfiriendo con validaciones previas.

CASO REAL A REPRODUCIR

Proyecto Librería Norte.

HU confirmadas:

1.
Como vendedor o administrador, quiero registrar las ventas de libros en el sistema web, para agilizar la atención, evitar errores de cobro y controlar las ventas del día.

2.
Como administrador o vendedor, quiero controlar el stock de libros, para evitar faltantes y mantener actualizado el inventario.

3.
Como administrador, quiero recibir alertas de stock mínimo de libros, para reponer ejemplares a tiempo.

Simular una respuesta de backlog que incluya:
- HU derivadas funcionales;
- tareas técnicas;
- trazabilidad a esas 3 HU;
- prioridad;
- estimación Fibonacci;
- criterios de aceptación.

REQUISITOS

- Las historias funcionales deben seguir siendo historias de usuario.
- Las tareas técnicas NO deben ser obligadas a usar formato “Como desarrollador...”.
- Los spikes tampoco.
- No aceptar texto vacío o basura.
- No eliminar trazabilidad.
- No permitir funcionalidades nuevas de negocio como aprobadas.
- No bajar la calidad de validación solo para hacer pasar el test.

MEJORA DE DIAGNÓSTICO

Cuando falle semantic_validation, agregar al log dev información sanitizada suficiente para saber:
- índice;
- tipo de tarjeta;
- regla semántica fallida;
- origen;
- padre;
- campo rechazado.

No loggear prompts ni contenido sensible completo.

TESTS MÍNIMOS

1. HU funcional válida en formato estándar → pasa.
2. HU derivada válida → pasa.
3. tarea_tecnica válida → no se rechaza por no tener formato HU.
4. spike válido → idem.
5. HU mal formada → se rechaza.
6. HU sin trazabilidad → se rechaza.
7. funcionalidad nueva no aprobada → queda propuesta/no aprobada.
8. caso mixto de backlog con HU + tareas + spike → pasa completo.
9. caso Librería Norte → no produce `BacklogSemanticError`.

Verificación:
- tests focalizados backlog;
- integración de generación/persistencia;
- ESLint;
- Prettier;
- git diff --check.

Al final reportá:
1. regla exacta que fallaba;
2. por qué rechazaba los índices 0/2/4;
3. fix;
4. archivos modificados;
5. tests/resultados;
6. riesgo residual.

Sin commit ni push.
```

- Initial diagnosis: issue paths alone cannot identify the rule because diagnostics discard semantic messages. Index 0 rules out duplicate-title as the shared cause. The likely reproduced path is the `origen=cliente` exact normalized-title comparison, which treats harmless punctuation differences as changed source text; technical cards also have an overbroad `^como` guard. T4 will pin rule identifiers in sanitized diagnostics before relaxing only those false negatives.

### L7 — T4 implementation and verification — 2026-10-27

- Exact reproduced rule: `client_story_changed`. The previous client-source comparison lowercased and collapsed whitespace but retained punctuation, so the three retained Librería Norte stories at indices 0, 2, and 4 were rejected when Gemini omitted commas and terminal periods without changing any words. The historical log cannot prove the rule retroactively because it discarded semantic messages; the deterministic fixture reproduces the exact three paths.
- A separate false negative came from `^como\b` on technical cards: direct technical titles such as `Como configurar índices para las consultas de ventas` were rejected merely for starting with `Como`. The guard now detects actual role-plus-intent user-story language instead.
- Client-source comparison now ignores only clause punctuation followed by whitespace and terminal punctuation; it does not ignore or rewrite words, accents, numeric punctuation, parent IDs, origins, or approval metadata.
- Functional cards must satisfy `Como <rol>, quiero|necesito|deseo <objetivo>, para <resultado>`. Technical tasks and spikes use direct meaningful titles (at least two alphanumeric words and six alphanumeric characters) and still reject fake developer stories.
- Every semantic issue carries an internal rule identifier and bounded metadata. `semantic_validation` logs expose only `index`, `cardType`, `rule`, `origin`, `parent`, and `field`; prompts, titles, descriptions, criteria, and provider output remain excluded.
- Verification: focused backlog units 20/20; guarded DB generation/persistence integration 2/2; targeted ESLint, Prettier, and `git diff --check` pass. Independent verifier initially found two blockers (missing `para` accepted and garbage technical titles accepted); one bounded correction fixed both, and targeted recheck passed 2/2 with zero persistence calls and sanitized diagnostics.
- Native review assessment was high-risk, but no review authority was created: the accumulated dirty workspace required a provider-bound untracked-selection capture that this runtime could not materialize safely. Independent functional verification remains the available proof. No real Gemini call, commit, push, schema/prompt/migration/frontend change occurred.

### L8 — Semantic validation observability request — 2026-10-28 (verbatim)

```text
Usá ODD sobre `feat/ai-advisor`. Esta tarea es SOLO de diagnóstico y observabilidad del error de validación semántica del backlog.

CONTEXTO

En una generación anterior apareció:

`stage: "semantic_validation"`
`errorName: "BacklogSemanticError"`
`rule: "functional_user_story_required"`

Fallaron varias tarjetas:
- `cardType: "historia_usuario"`
- `origin: "derivada_ia"`
- campo: `historia_usuario`

No conservamos la respuesta exacta de Gemini que produjo el error, y en intentos posteriores el backlog llegó a generarse correctamente.

OBJETIVO

Investigar por qué puede dispararse `functional_user_story_required` y mejorar el logging para que, si vuelve a ocurrir, tengamos evidencia suficiente para determinar si el problema está en:
- salida de Gemini;
- prompt;
- parseo/normalización;
- o validador semántico.

REGLAS

- `git status` primero.
- No commit ni push.
- No tocar cambios previos.
- No relajar ni modificar las reglas de validación.
- No modificar el prompt de generación todavía.
- No modificar generación, repair/retry, payload, Advisor, viabilidad ni Kanban.
- CERO llamadas reales a Gemini.
- No intentar “arreglar” el error sin evidencia.
- Tests focalizados únicamente.

INVESTIGACIÓN

Seguí el flujo:

Gemini → parseo → normalización → Zod → validación semántica.

Localizá `functional_user_story_required` y reportá exactamente:

1. Qué condiciones debe cumplir `historia_usuario`.
2. Qué normalizaciones ocurren antes de validarla.
3. Qué salidas plausibles de Gemini podrían provocar esa regla.
4. Si existe alguna diferencia entre lo que exige el prompt y lo que exige el validador.
5. Si una HU semánticamente razonable podría ser rechazada por una regla demasiado estricta.

No cambies nada de esos puntos todavía.

OBSERVABILIDAD

Cuando falle `semantic_validation`, ampliar el log existente para incluir, SOLO para las tarjetas rechazadas, información suficiente para diagnosticar el problema.

Registrar de forma sanitizada:
- index;
- cardType;
- origin;
- parent;
- rule;
- field;
- valor recibido del campo que falló;
- valor después de normalización, si existe transformación relevante.

Para `functional_user_story_required`, necesitamos poder ver concretamente qué contenía `historia_usuario`.

No loguear:
- prompt completo;
- API keys;
- secretos;
- respuesta completa del proveedor;
- datos innecesarios del proyecto.

Limitar/truncar strings si corresponde para mantener logs seguros y legibles.

IMPORTANTE

La instrumentación NO debe cambiar:
- resultado de la validación;
- status HTTP;
- cantidad de llamadas a Gemini;
- retries/repair;
- comportamiento del usuario.

Agregar tests focalizados que demuestren que:
1. una HU válida sigue pasando;
2. una HU inválida sigue fallando igual;
3. el diagnóstico incluye el valor relevante que provocó el fallo;
4. no se expone información innecesaria.

No ejecutar Gemini real.

REPORTE FINAL BREVE

1. Dónde está implementada `functional_user_story_required`.
2. Condición exacta que exige.
3. Posibles causas del fallo de ayer.
4. Si detectaste alguna inconsistencia prompt ↔ validador.
5. Qué información nueva quedará registrada si vuelve a ocurrir.
6. Archivos modificados.
7. Tests ejecutados y resultados.
8. Confirmar que la validación y comportamiento del backlog NO fueron modificados.
9. Confirmar llamadas reales a Gemini: 0.
10. Mensaje de commit sugerido, sin hacer commit.
```

### L9 — Functional-story prompt alignment request — 2026-10-29 (verbatim)

````text
Quiero corregir un error real detectado durante la generación del backlog del proyecto Logotype.

Trabajá con ODD sobre la rama actual `feat/ai-advisor`.

IMPORTANTE:
- Primero ejecutá `git status` y revisá el estado actual del workspace.
- Hay cambios acumulados de tareas anteriores: NO los reviertas, NO los sobrescribas y NO los mezcles innecesariamente.
- NO hagas commit.
- NO hagas push.
- NO hagas llamadas reales a Gemini.
- Usá mocks/fixtures/tests determinísticos.
- No modifiques `frontend/dist`.
- Evitá verificaciones globales innecesarias si existen problemas conocidos fuera de este alcance.
- No te quedes en loops de verificación o herramientas externas si fallan; priorizá tests focalizados.

## CONTEXTO

Durante una prueba E2E real del flujo completo, la generación del backlog falló con este diagnóstico:

```json
{
  "event": "backlog_generation_failed",
  "stage": "semantic_validation",
  "errorName": "BacklogSemanticError",
  "projectId": 7,
  "zodIssues": [
    {
      "code": "custom",
      "path": [7, "historia_usuario"]
    }
  ],
  "semanticIssues": [
    {
      "index": 7,
      "cardType": "historia_usuario",
      "rule": "functional_user_story_required",
      "origin": "derivada_ia",
      "parent": "hu-3b42e307-e1eb-40d9-8d21-47651a0e81dc",
      "field": "historia_usuario",
      "receivedValue": "Envío Directo de Recordatorios de Turno por WhatsApp"
    }
  ]
}
```

La nueva observabilidad funcionó correctamente y ahora tenemos evidencia concreta.

Gemini clasificó la tarjeta como:

- `cardType = historia_usuario`
- `origin = derivada_ia`

pero en el campo `historia_usuario` devolvió:

`Envío Directo de Recordatorios de Turno por WhatsApp`

Eso es un título o nombre funcional, NO una historia de usuario válida.

El validador `functional_user_story_required` exige una estructura equivalente a:

`Como <rol>, quiero/necesito/deseo <necesidad>, para <beneficio>.`

Por ejemplo:

`Como administrador, quiero enviar recordatorios de turnos por WhatsApp, para reducir las ausencias de los clientes.`

## OBJETIVO

Corregir la inconsistencia entre el prompt/contrato de generación del backlog y el validador semántico.

Si Gemini genera una tarjeta cuyo tipo sea `historia_usuario`, el campo `historia_usuario` DEBE contener una historia de usuario completa compatible con `functional_user_story_required`.

## 1. INVESTIGÁ ANTES DE MODIFICAR

Trazá específicamente:

Gemini → prompt de generación del backlog → respuesta estructurada → parse/normalización → validación Zod → validación semántica.

Localizá:

- dónde se construye actualmente el prompt del backlog;
- qué instrucciones recibe Gemini para tarjetas `historia_usuario`;
- qué estructura exacta exige `functional_user_story_required`;
- si el prompt actual permite implícitamente devolver títulos como el del error;
- si existen ejemplos dentro del prompt que puedan inducir ese comportamiento.

No cambies código hasta entender el contrato actual.

## 2. CORREGÍ EL PROMPT, NO EL VALIDADOR

NO relajes `functional_user_story_required`.

NO elimines esta validación.

NO conviertas automáticamente cualquier título en una HU inventando rol, necesidad o beneficio.

La corrección principal debe realizarse en el contrato/prompt que genera el backlog.

Para toda tarjeta con:

`tipo/cardType = historia_usuario`

el prompt debe exigir explícitamente que `historia_usuario` siga esta estructura:

`Como <rol>, quiero/necesito/deseo <necesidad>, para <beneficio>.`

Debe quedar explícitamente prohibido devolver en ese campo:

- títulos;
- nombres de funcionalidades;
- frases nominales;
- imperativos;
- descripciones sin rol;
- textos sin necesidad;
- textos sin beneficio;
- textos que omitan `Como`;
- textos que omitan `quiero`, `necesito` o `deseo`;
- textos que omitan `para`.

Ejemplo inválido:

`Envío Directo de Recordatorios de Turno por WhatsApp`

Ejemplo válido:

`Como administrador, quiero enviar recordatorios de turnos por WhatsApp, para reducir las ausencias de los clientes.`

IMPORTANTE: el ejemplo es únicamente ilustrativo. No hardcodees peluquerías, WhatsApp ni este dominio en la lógica.

## 3. MANTENÉ LA ARQUITECTURA ACTUAL DEL BACKLOG

No cambies las decisiones ya implementadas:

- las HU confirmadas por el cliente siguen siendo la fuente funcional de verdad;
- Gemini puede conservar o descomponer una HU amplia;
- las HU funcionales derivadas deben mantener trazabilidad con su HU padre;
- las funcionalidades nuevas no confirmadas siguen siendo propuestas;
- tareas técnicas siguen siendo `tarea_tecnica`;
- investigaciones siguen siendo `spike`;
- no conviertas trabajo técnico en falsas historias tipo `Como desarrollador...`;
- mantené Fibonacci, prioridad, criterios de aceptación y metadata existente;
- mantené `origen`, `padre` y `aprobacion`;
- no cambies Kanban ni persistencia.

Una `tarea_tecnica` o `spike` NO necesita adoptar formato de historia de usuario.

La regla aplica específicamente a tarjetas funcionales clasificadas como `historia_usuario`.

## 4. NO CAMBIES LA ORQUESTACIÓN DE GEMINI

Esta tarea NO debe:

- agregar llamadas a Gemini;
- cambiar cantidad de intentos;
- cambiar retry;
- cambiar repair;
- cambiar timeout;
- cambiar modelo;
- cambiar política frente a 503;
- cambiar códigos HTTP;
- cambiar degradación;
- modificar Advisor;
- modificar análisis de viabilidad.

Una acción del usuario debe seguir teniendo exactamente la misma política de llamadas que antes.

## 5. TESTS FOCALIZADOS

Agregá o actualizá tests determinísticos que comprueben como mínimo:

1. El prompt establece explícitamente que `historia_usuario` debe usar la estructura requerida.

2. Una tarjeta funcional válida como:

`Como administrador, quiero enviar recordatorios de turnos, para reducir las ausencias de los clientes.`

sigue pasando `functional_user_story_required`.

3. Una tarjeta como:

`Envío Directo de Recordatorios de Turno por WhatsApp`

sigue siendo rechazada por `functional_user_story_required`.

4. Las tarjetas `tarea_tecnica` y `spike` no quedan obligadas artificialmente a utilizar formato `Como..., quiero..., para...`.

5. La trazabilidad `origin/padre/aprobacion` no cambia.

6. La generación no agrega llamadas adicionales a Gemini.

Usá mocks/fixtures. CERO llamadas reales a Gemini.

## 6. NO OCULTES EL ERROR

No quiero solucionar esto haciendo que el validador acepte:

`Envío Directo de Recordatorios de Turno por WhatsApp`

como una HU válida.

La intención es que Gemini reciba un contrato suficientemente claro para producir:

`Como ..., quiero ..., para ...`

cuando la tarjeta sea una `historia_usuario`.

La validación semántica debe continuar funcionando como barrera de seguridad si el proveedor vuelve a incumplir el contrato.

## 7. ODD

Actualizá únicamente la documentación ODD correspondiente a esta corrección.

Documentá la evidencia real:

`receivedValue = "Envío Directo de Recordatorios de Turno por WhatsApp"`

y que la decisión fue alinear el prompt con el contrato semántico existente, NO debilitar la validación.

## 8. VERIFICACIÓN

Ejecutá solamente las verificaciones focalizadas necesarias:

- tests del prompt/generación del backlog;
- tests de semántica del backlog;
- tests directamente afectados;
- ESLint/Prettier únicamente sobre archivos modificados si corresponde;
- `git diff --check`.

No uses Gemini real.

Al finalizar, NO hagas commit ni push.

## REPORTE FINAL

Entregame:

1. causa raíz confirmada;
2. inconsistencia exacta encontrada entre prompt y validador;
3. archivos modificados;
4. cambio realizado en el prompt;
5. estructura que ahora se exige para `historia_usuario`;
6. confirmación de que `functional_user_story_required` NO fue relajado;
7. confirmación de que tareas técnicas y spikes mantienen su comportamiento;
8. tests ejecutados y resultados;
9. cantidad de llamadas reales a Gemini (debe ser 0);
10. confirmación de que no cambió retry/repair/cantidad de llamadas;
11. riesgos o puntos que debamos validar manualmente;
12. mensaje de commit sugerido, pero NO ejecutes el commit.

No amplíes el alcance. El objetivo de esta tarea es únicamente corregir el contrato de generación que permitió que una tarjeta `historia_usuario` recibiera un título funcional en lugar de una HU válida.
````

### L10 — T6 implementation and proof — 2026-10-29

The confirmed root cause was a contract mismatch: the prompt classified functional cards and prohibited fake technical user stories, but never required `historia_usuario` to use the exact grammar already enforced by `functional_user_story_required`. It therefore permitted the observed provider value `Envío Directo de Recordatorios de Turno por WhatsApp`, a functionality title, even though the semantic barrier correctly rejected it.

The backlog-generation prompt now requires every `tipo=historia_usuario` value to use `Como <rol>, quiero/necesito/deseo <necesidad>, para <beneficio>.`, explicitly prohibits titles, functionality names, noun phrases, imperatives, missing role/need/benefit, and omitted required keywords, and includes the reported invalid value plus one valid illustration. No runtime conversion was added and the semantic validator was not relaxed. Technical tasks and spikes still use direct titles; traceability, proposals, metadata, orchestration, retry/repair, model, timeout, HTTP behavior, persistence, Advisor, viability, Kanban, and provider-call count remain unchanged.

Proof: RED reproduced the missing prompt contract. GREEN focused prompt/semantic/diagnostic tests passed 22/22; targeted ESLint and Prettier passed; `git diff --check` reported no errors and only pre-existing line-ending warnings. Independent verification passed the same 22/22 focused tests with no blockers. Native review assessment remained unavailable because the accumulated workspace has undeclared untracked files; no retry loop or review authority was created. Real Gemini calls: 0. Commit/push: 0.
