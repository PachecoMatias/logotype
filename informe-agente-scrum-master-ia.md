# Agente de planificación automática (Scrum Master IA) — Logotype

**Informe de diseño para revisión del equipo**
Estado: propuesta para discusión — no implementado todavía

---

## 1. Origen y objetivo

El profesor pidió incorporar al proyecto un **agente de IA tipo Scrum Master** que:

1. Recopile la información del cliente (ya lo hace el configurador de proyectos del sitio).
2. Le confirme al cliente si lo que pidió es viable / si falta información.
3. Divida el proyecto en tareas, ubicadas en el tiempo (fechas/períodos).
4. Reparta esas tareas entre los responsables de cada área del equipo.

Este documento describe **cómo lo vamos a construir**, con qué herramientas, qué datos vamos a guardar, y qué decisiones de diseño ya tomamos (y cuáles siguen abiertas).

---

## 2. Idea central

No es un solo "agente autónomo" mágico. Es un **flujo de pasos**, donde cada paso hace una sola cosa:

```
Cliente completa el configurador (sitio público)
        ↓
Se guarda el proyecto en la base de datos (estado: "nuevo")
        ↓
[PASO 1 - IA] Analiza el pedido: ¿es viable? ¿falta información?
        ↓
[PASO 2 - IA] Si está OK, genera el backlog: historias de usuario,
              con prioridad, criterios de aceptación, alcance técnico
              y estimación en Fibonacci
        ↓
[PASO 3 - Código, no IA] Calcula fechas estimadas según la estimación
              y el plazo que eligió el cliente en el formulario
        ↓
Las historias quedan visibles en un tablero Kanban propio,
para que el equipo las tome y trabaje
```

**Regla de diseño importante:** la IA decide *qué hay que hacer y qué tan grande es cada cosa* (texto, análisis, estimación). El cálculo de **fechas exactas** lo hace código nuestro (JavaScript), no la IA — los modelos de lenguaje no son confiables haciendo aritmética de fechas de forma consistente.

---

## 3. Dónde vive esto en la aplicación

Esto **no va en la página principal** del sitio (esa sigue siendo la landing pública para el cliente). Es una herramienta **interna**, separada, para uso del equipo de Logotype.

Se plantea como una sección aparte (ej: `/panel`), con tres pantallas:

| Pantalla | Ruta (ejemplo) | Qué muestra |
|---|---|---|
| **A — Solicitudes recibidas** | `/panel/solicitudes` | Lista de proyectos enviados por clientes desde el configurador |
| **B — Análisis del proyecto** | `/panel/solicitudes/:id` | Resultado del análisis de viabilidad de la IA + botón para generar el backlog |
| **C — Tablero del proyecto** | `/panel/proyectos/:id/tablero` | El Kanban con todas las historias de usuario generadas |

---

## 4. Tablero Kanban — construido por nosotros, sin API externa

### Decisión: tablero propio, no integración con Trello

Se evaluó usar la API de Trello y se descartó. Motivos:

- La API de Trello es gratuita para uso básico (crear tableros/tarjetas), pero **agrega una dependencia externa innecesaria**: si el servicio falla el día de la demo, el proyecto no funciona.
- Necesitamos campos propios en cada tarjeta (historia de usuario, criterios de aceptación, alcance técnico, estimación Fibonacci) que son más simples de manejar en nuestra propia base de datos que adaptando Custom Fields de Trello.
- Cada persona del equipo tendría que existir también como usuario de Trello — overhead sin beneficio real para el objetivo académico.
- Construir nuestro propio tablero (con estética similar a Trello: columnas, tarjetas, drag & drop, avatar del responsable, etiqueta de prioridad con color) es alcanzable con nuestro stack (React) y demuestra más dominio técnico en la defensa del proyecto.

### Columnas del tablero

```
Backlog → To Do → In Progress → In Code Review → In QA → Done
```

### ¿Quién mueve las tarjetas? — **pendiente de definir en equipo**

Quedó una pregunta abierta que conviene charlar entre todos antes de implementar:

- Una opción es que **cada responsable mueva su propia tarjeta** a medida que avanza (el dev la pasa a "In Code Review" cuando termina, el QA la pasa a "Done" cuando la valida). Es el modelo más parecido a cómo se usa un Kanban real en un equipo de desarrollo.
- Otra opción es que el **Project Manager / PO sea el único que mueve tarjetas**, centralizando el control del flujo.

Se puede empezar simple (cualquiera del equipo mueve tarjetas libremente) e ir agregando restricciones por rol más adelante si se considera necesario. **Este punto se deja para discutir con el equipo antes de programar los permisos.**

---

## 5. Equipo y roles (ya definidos en el organigrama del proyecto)

| Rol | Cantidad | Perfil |
|---|---|---|
| Desarrollador Frontend | 3 | Alto rendimiento |
| Desarrollador Backend | 3 | Alto rendimiento |
| Analista QA | 2 | Alto rendimiento |
| Analista de Ciberseguridad | 1 | Alto rendimiento |
| Analista de requerimientos | 2 | Administrativo |
| Project Manager | 1 | Administrativo |

*(Mejora futura, no incluida en el alcance inicial: en vez de asignar una historia a "Frontend" en general, asignarla a una persona concreta del equipo considerando cuánto trabajo tiene encima. Queda anotado como posible siguiente paso, no es parte de esta primera versión.)*

---

## 6. Historias de usuario — estructura de datos

Cada historia generada por la IA va a tener:

- **Prioridad**: Alta / Media / Baja
- **Historia de usuario**: formato estándar "Como [rol], quiero [acción], para [beneficio]"
- **Descripción**: contexto adicional
- **Criterios de aceptación**: lista de condiciones verificables para dar la historia por terminada
- **Alcance técnico**: qué partes del sistema toca (a nivel técnico, breve)
- **Estimación (Fibonacci)**: 1, 2, 3, 5, 8, 13, 21 — la escala estándar de Scrum
- **Rol sugerido**: a qué área del equipo le corresponde (Frontend, Backend, QA, Ciberseguridad, etc.)
- **Fase**: agrupador (Análisis, Diseño, Desarrollo Frontend, Desarrollo Backend, Testing, Despliegue)
- **Columna del tablero**: en qué estado está (Backlog, To Do, etc.)
- **Fechas estimadas**: calculadas por nuestro código a partir de la estimación y el plazo elegido por el cliente

---

## 7. Motor de IA a utilizar

Se usará la **API de Gemini** (Google), ya que el equipo tiene experiencia previa trabajando con ella. Un punto a favor puntual para este caso: Gemini permite forzar que la respuesta del modelo sea un JSON válido (`responseMimeType: application/json`), lo que simplifica bastante el manejo de la respuesta en el backend.

La arquitectura general (guardar el pedido → pedirle a la IA que valide → pedirle que genere el backlog → nuestro código calcula fechas) es independiente del proveedor de IA, así que si en el futuro se quisiera probar con otro modelo, no habría que rediseñar nada, solo cambiar la llamada puntual a la API.

### Los dos análisis que hace la IA

1. **Validación de viabilidad**: lee el JSON del formulario del configurador y devuelve si el pedido es viable, si falta información, y un mensaje pensado para comunicarle el estado al cliente.
2. **Generación del backlog**: a partir del mismo formulario, genera entre 12 y 25 historias de usuario con toda la estructura descripta en el punto 6.

---

## 8. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend público (landing + configurador) | React (ya implementado) |
| Frontend panel interno | React (nueva sección/app) |
| Backend / API REST | Node.js + Express |
| Base de datos | MySQL |
| IA | API de Gemini |
| Tablero Kanban | Componente propio en React (sin librerías/servicios externos de terceros) |

---

## 9. Próximos pasos propuestos

1. Cerrar en equipo la pregunta del punto 4 (quién puede mover tarjetas entre columnas).
2. Revisar y aprobar el modelo de datos (tablas `proyectos`, `historias`, `equipo`).
3. Definir la regla de conversión de puntos Fibonacci a días estimados (para el cálculo de fechas).
4. Armar la especificación técnica detallada (requisitos + criterios de aceptación + diseño) antes de empezar a programar, usando un flujo de trabajo estructurado (spec-driven) para que quede documentado en cada etapa.
5. Prototipar el prompt de generación de backlog con un caso real del configurador, para validar que la salida de la IA convence antes de integrarlo al flujo completo.

---

*Documento vivo — se puede seguir ajustando a medida que el equipo lo discuta.*
