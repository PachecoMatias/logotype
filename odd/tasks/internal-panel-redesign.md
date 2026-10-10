# ODD — Rediseño visual del panel interno (Logotype)

## Objetivo

Rediseñar la presentación del área interna de Logotype (solicitudes recibidas,
detalle + análisis IA, historias/backlog, formulario de edición, tablero Kanban
y modal de historia) para que se lea como una consola de ingeniería oscura,
densa y productiva, coherente con la identidad **Engineering Blueprint** del
sitio público. Solo cambia la presentación (CSS + clases/estructura de JSX).
La lógica, handlers, estados, contratos, API y backend quedan idénticos.

## Problema

El panel actual usa un lenguaje CRUD claro sobre tokens de `index.css`
(`.card`, `.status`, `.btn`, fondos blancos, radios redondeados, sombras),
desconectado del rediseño oscuro del sitio público. Las vistas internas
(solicitudes, detalle, backlog, tablero) no comparten shell ni jerarquía.

## Por qué

Etapa 2 de 2 del rediseño visual. La etapa 1 (sitio público) ya está en la
base `redesign/public-motion`. Esta etapa cierra la coherencia interna.

## Alcance

- Lista de solicitudes + estados (cargando / error / vacío).
- Detalle de solicitud + bloque de análisis de IA.
- Historias / backlog agrupado por fase + estado vacío/error.
- Formulario de edición de historia (inputs/selects/textarea oscuros).
- Tablero Kanban + modal de detalle + tarjetas + botones de mover.
- Shell / barra superior del área interna.

## Fuera de alcance (prohibido tocar)

Sitio público, configurador, backend, API, contratos, payload, validaciones,
lógica de negocio, estructura de datos, generación Gemini, handlers de
movimiento de tarjetas y estados reales del tablero.

## Restricciones

- Tokens reutilizados desde el sistema público; solo alias `--adm-*`.
- Crear `frontend/src/styles/panel.css`, prefijo `adm-`.
- No modificar `.btn`, `.status`, `.card`, `:root` de `index.css`.
- Retirar de `index.css` solo reglas viejas del panel/tablero que contradigan.
- Sin framer-motion en el panel; animación solo CSS (hover/focus/active/transiciones).
- Sin `opacity:0`, sin animaciones de entrada/salida/infinitas.
- `prefers-reduced-motion`: sin transform, solo color instantáneo.
- Sin scroll horizontal de página a 375 / 768 / 1280.
- Contraste AA; grises/negros tintados hacia el azul.
- No commitear `frontend/dist`. Sin commit final (lo prueba el usuario).

## Estrategia de ruta

Rediseño de una única superficie cohesiva (un sistema CSS + 12 archivos JSX
acoplados por los mismos nombres de clase). Un solo autor (orquestador) para
garantizar coherencia del sistema; delegar el CSS a un worker duplicaría todo
el contexto de diseño en el prompt y arriesgaría deriva visual. Verificación
por build + revisión estructural + serve local.

Presupuesto de líneas autoradas estimado: grande (>400), aceptado: es un
sistema de diseño nuevo sobre 12 archivos; no hay solución más pequeña sin
romper coherencia.

## Checklist

- [x] T1 — Sistema de diseño `panel.css` (`--adm-*`, shell, topbar, botones, badges, estados, tokens).
- [x] T2 — Shell/topbar interno en `App.jsx` + import de `panel.css`.
- [x] T3 — Lista de solicitudes: `PanelSolicitudes`, `ProjectCard`, `StatusBadge` + estados.
- [x] T4 — Detalle + análisis IA: `PanelDetalle`.
- [x] T5 — Backlog + editor: `PanelHistorias`, `HistoriaEditor`, `HistoriaContenido`.
- [x] T6 — Tablero + tarjeta + modal: `PanelTablero`, `KanbanColumn`, `KanbanCard`, `HistoriaModal`.
- [x] T7 — Limpieza de `index.css` (reglas viejas del panel/tablero) + sección "Panel interno" en `DESIGN.md`.
- [x] T8 — Verificación (build, sin framer-motion en panel, sin scroll horizontal, navegación, handlers) y reporte.

## Verificación

- `npm run build` (en `frontend/`) debe pasar.
- Grep: ningún archivo del panel importa `framer-motion`; sin `opacity:0` en contenido.
- Sin scroll horizontal a 375 / 768 / 1280 (tablero scrollea dentro de su contenedor).
- Navegación intacta: lista, detalle, historias, tablero, volver.
- `git diff` no toca backend, API, contratos, payload ni validaciones.

## Evidencia

- Rama: `redesign/internal-panel` (creada desde `redesign/public-motion`).
- Sin commits (según instrucción: el usuario prueba primero).
- `npm run build` (frontend): **OK** — 439 módulos, `dist/` regenerado (sin commitear).
- `panel.css` creado; `index.css` recortado: eliminadas las reglas viejas del
  panel/tablero (ex-líneas 1329–1753), conservado `.panel-fab` (FAB público).
- Grep en `Panel/*.jsx`: **0** matches de `framer-motion`, `opacity:0`,
  `whileInView`, `AnimatePresence`.
- Grep en `Panel/*.jsx`: **0** clases viejas residuales (`panel-*`, `kanban-*`,
  `tablero-*`, `historia-modal-*`, `form-group/form-control`).
- `git diff --name-only`: solo `DESIGN.md`, `frontend/src/**` y `frontend/dist/**`.
  Ningún archivo de backend/API/contratos/payload/validaciones.
- Contraste AA (calculado): `--adm-text`/`--adm-text-muted` y badges
  (warning/error/accent/primary/done) sobre `--adm-panel` ≈ 7:1 o más.
- Pendiente de validación visual humana (no medible en headless): scroll
  horizontal real y foco a 375/768/1280. Razonado en CSS: `.adm-shell` con
  `overflow-x: clip`, grillas con `minmax(0, …)` y tablero que scrollea dentro
  de `.adm-board__scroll`.
