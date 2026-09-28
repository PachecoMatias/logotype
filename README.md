# Logotype

Logotype es una aplicación full stack para recibir solicitudes de proyectos de software y convertirlas en un plan de trabajo asistido por IA. Incluye un sitio institucional, un configurador de requerimientos, un panel interno de solicitudes, análisis de viabilidad con Gemini, generación de backlog, visualización de historias de usuario y un tablero Kanban con fechas estimadas.

## Funcionalidades principales

- Sitio institucional con información de la empresa, servicios, objetivos e infraestructura.
- Configurador guiado para recopilar datos de empresa, problema, alcance, funcionalidades, presupuesto y plazo.
- Persistencia de solicitudes mediante una API REST.
- Panel interno para listar solicitudes y consultar su detalle.
- Análisis de viabilidad y completitud mediante Google Gemini.
- Generación idempotente de un backlog validado y persistido.
- Vista de historias de usuario agrupadas por fase.
- Tablero Kanban de seis columnas con detalle de historias y movimiento local entre estados.
- Cálculo frontend de fechas estimadas a partir de puntos Fibonacci y capacidad del equipo.

## Stack tecnológico

### Frontend

- React 18
- Vite 5
- Framer Motion
- JavaScript y CSS

### Backend

- Node.js 22
- Express 5
- MySQL 8
- `mysql2`
- Zod
- Google Gen AI SDK (`@google/genai`)
- Node Test Runner y Supertest
- ESLint y Prettier

## Requisitos previos

Antes de comenzar, instalá:

- [Git](https://git-scm.com/)
- **Node.js 22.x** (`>=22 <23`, requerido por el backend)
- npm
- **MySQL 8.0.16 o superior**
- Una API key de Google Gemini para utilizar el análisis y la generación de backlog

> [!IMPORTANT]
> La API no implementa autenticación. Está pensada para ejecución local o dentro de una red privada controlada; no debe exponerse públicamente sin agregar una capa de seguridad.

## Inicio rápido

El repositorio contiene dos proyectos npm independientes. El orden recomendado es:

1. Clonar el repositorio.
2. Preparar MySQL y las variables del backend.
3. Instalar, migrar, sembrar e iniciar el backend.
4. Instalar e iniciar el frontend.
5. Abrir la aplicación en el navegador.

### 1. Clonar el repositorio

```bash
git clone https://github.com/PachecoMatias/logotype.git
cd logotype
```

### 2. Configurar la base de datos

Creá manualmente una base de datos MySQL vacía para la aplicación y un usuario con permisos sobre ella. El repositorio no incluye un comando para crear la base de datos; podés hacerlo con MySQL Workbench, la CLI de MySQL u otra herramienta equivalente.

Recordá el host, puerto, usuario, contraseña y nombre elegidos: se utilizarán en el archivo de entorno del backend.

### 3. Configurar las variables de entorno

Desde `backend/`, copiá el archivo de ejemplo como `.env`:

```bash
cd backend
cp .env.example .env
```

En PowerShell:

```powershell
Set-Location backend
Copy-Item .env.example .env
```

Completá `.env` con los datos de tu entorno. No subas este archivo ni claves reales al repositorio.

```dotenv
NODE_ENV=development

HOST=127.0.0.1
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=<usuario_mysql>
MYSQL_PASSWORD=<contraseña_mysql>
MYSQL_DATABASE=<nombre_base_de_datos>
MYSQL_CONNECTION_LIMIT=10

GEMINI_API_KEY=<api_key_de_gemini>
GEMINI_MODEL=gemini-2.5-flash
```

| Variable | Requerida | Valor predeterminado | Uso |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Entorno de ejecución. |
| `HOST` | No | `127.0.0.1` | Host del servidor HTTP. |
| `PORT` | No | `3000` | Puerto del backend. |
| `MYSQL_HOST` | Sí | — | Host de MySQL. |
| `MYSQL_PORT` | No | `3306` | Puerto de MySQL. |
| `MYSQL_USER` | Sí | — | Usuario de la aplicación. |
| `MYSQL_PASSWORD` | Sí | — | Contraseña del usuario. La variable debe existir, aunque el entorno local use una contraseña vacía. |
| `MYSQL_DATABASE` | Sí | — | Base de datos creada manualmente. |
| `MYSQL_CONNECTION_LIMIT` | No | `10` | Máximo de conexiones del pool. |
| `GEMINI_API_KEY` | Para funciones de IA | — | Credencial para análisis y backlog. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Modelo utilizado por Gemini. |

La configuración de Gemini se evalúa al ejecutar una operación de IA. El backend puede iniciar sin invocar Gemini, pero los endpoints de análisis y backlog necesitan una API key válida.

### 4. Instalar y preparar el backend

Ejecutá estos comandos desde `backend/`:

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Las migraciones se aplican en este orden:

1. Proyectos
2. Historias de usuario
3. Equipo
4. Análisis de IA
5. Planificación del backlog

El backend verifica la conexión a MySQL antes de abrir el servidor HTTP. Si la base de datos o las credenciales no son válidas, el proceso no iniciará.

Una vez iniciado, queda disponible en:

```text
http://127.0.0.1:3000
```

### 5. Instalar e iniciar el frontend

En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
npm ci
npm run dev
```

Vite muestra la URL efectiva en la terminal. Por defecto, la aplicación queda disponible en:

```text
http://localhost:5173
```

Durante el desarrollo, Vite redirige las solicitudes `/api` hacia `http://127.0.0.1:3000`, por lo que no hace falta configurar CORS ni una URL adicional para el flujo local estándar.

## Acceso a la aplicación

1. Abrí [http://localhost:5173](http://localhost:5173).
2. Usá **Contanos tu proyecto** para completar una solicitud.
3. Volvé a la pantalla principal y abrí el panel interno mediante el botón flotante con el ícono de engranaje.

Las pantallas del configurador y del panel son vistas internas de React; no tienen rutas URL independientes.

## Flujo principal

1. El usuario completa y envía el configurador.
2. El frontend crea una solicitud en `POST /api/proyectos`.
3. El panel interno lista la solicitud y permite abrir su detalle.
4. **Analizar con IA** evalúa viabilidad, completitud y campos faltantes con Gemini.
5. **Generar backlog** crea y persiste historias de usuario para proyectos analizados.
6. Las historias pueden consultarse agrupadas por fase o visualizarse en el tablero Kanban.
7. El frontend calcula fechas estimadas usando puntos Fibonacci y capacidad por rol.

La generación de backlog es idempotente una vez persistida: solicitudes posteriores devuelven las historias existentes en lugar de volver a generarlas con Gemini.

## Variables opcionales del frontend

Para el desarrollo local estándar no necesitás crear un archivo de entorno en `frontend/` porque Vite utiliza el proxy configurado.

Si el backend se encuentra en otra URL, definí `VITE_API_URL` antes de construir o iniciar el frontend:

```dotenv
VITE_API_URL=http://127.0.0.1:3000
```

> [!NOTE]
> El proxy de `vite.config.js` solo existe durante `npm run dev`. En un despliegue de producción debés configurar un proxy de mismo origen o definir `VITE_API_URL` con la URL pública correspondiente.

## Scripts disponibles

### Frontend

Ejecutar desde `frontend/`:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Genera el build de producción en `frontend/dist/`. |
| `npm run preview` | Sirve localmente el build de producción. |

El frontend no tiene scripts configurados para tests, lint o formato.

### Backend

Ejecutar desde `backend/`:

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el backend con Node.js. |
| `npm run dev` | Inicia el backend con reinicio automático mediante `node --watch`. |
| `npm run db:migrate` | Aplica las migraciones pendientes. |
| `npm run db:rollback` | Revierte la última migración aplicada. |
| `npm run db:seed` | Inserta o actualiza los datos administrados del equipo. |
| `npm run db:migrate:test` | Aplica migraciones sobre la base de tests protegida. |
| `npm run db:rollback:test` | Revierte la última migración de la base de tests. |
| `npm run db:seed:test` | Ejecuta el seed sobre la base de tests. |
| `npm test` | Ejecuta los tests del backend en serie. |
| `npm run lint` | Ejecuta ESLint sin modificar archivos. |
| `npm run format` | Formatea archivos con Prettier. |
| `npm run format:check` | Comprueba el formato sin modificar archivos. |

## Tests del backend

Los tests utilizan una base MySQL independiente y pueden eliminar las tablas administradas dentro de ella. **Nunca apuntes los tests a la base de desarrollo o producción.**

Además de `MYSQL_DATABASE`, configurá:

```dotenv
MYSQL_TEST_HOST=127.0.0.1
MYSQL_TEST_PORT=3306
MYSQL_TEST_USER=<usuario_mysql_test>
MYSQL_TEST_PASSWORD=<contraseña_mysql_test>
MYSQL_TEST_DATABASE=<nombre_terminado_en_test>
TEST_DB_RESET_ALLOWED=true
```

`MYSQL_TEST_DATABASE` debe ser diferente de `MYSQL_DATABASE` y finalizar en `_test`.

Luego podés ejecutar, desde `backend/`:

```bash
npm run db:migrate:test
npm run db:seed:test
npm test
```

## Estructura del repositorio

```text
logotype/
├── frontend/                 # Aplicación React y configuración de Vite
│   └── src/
│       ├── components/       # Sitio, configurador y panel interno
│       ├── data/             # Contenido y opciones del frontend
│       └── utils/            # API, backlog y cálculo de fechas
├── backend/                  # API REST con Express
│   ├── migrations/           # Migraciones SQL versionadas
│   ├── scripts/              # Runner de migraciones y seed
│   ├── seeds/                # Datos administrados del equipo
│   ├── src/
│   │   ├── config/           # Entorno y conexión MySQL
│   │   ├── controllers/      # Adaptadores HTTP
│   │   ├── integrations/     # Integración con Gemini
│   │   ├── repositories/     # Persistencia MySQL
│   │   ├── routes/           # Endpoints de la API
│   │   ├── schemas/          # Validación con Zod
│   │   └── services/         # Casos de uso
│   └── tests/                # Tests unitarios e integración
└── openspec/                 # Historial técnico de cambios del proyecto
```

## Consideraciones actuales

- Frontend y backend requieren instalaciones independientes.
- El movimiento de tarjetas Kanban se mantiene en el estado de React y no se persiste en el backend.
- Las bases de datos deben crearse manualmente antes de ejecutar migraciones.
- El seed es repetible y debe ejecutarse después de las migraciones.
- La API no incluye autenticación.
