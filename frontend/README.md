# Logotype — Frontend React

## 🚀 Cómo ejecutar el proyecto

Sigue estos pasos para instalar y correr el proyecto en tu entorno local. 

### 1. Pre-requisitos
Asegúrate de tener instalado **Node.js** (versión 18 o superior).

### 2. Instalación de dependencias
Abre una terminal en la carpeta raíz del proyecto (`logotype-react/`) y ejecuta el siguiente comando:
```bash
npm install
```

### 3. Servidor de Desarrollo
Para levantar el entorno local con recarga rápida (Hot Module Replacement), ejecuta:
```bash
npm run dev
```
> **Nota:** El sitio estará disponible por defecto en tu navegador en: `http://localhost:5173`

### 4. Build de Producción (Opcional)
Si deseas generar la versión optimizada para producción y probarla localmente:
```bash
npm run build
npm run preview
```

---

## 🏗️ Estructura del proyecto

```text
logotype-react/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── data/
    │   ├── company.js            (empresa, objetivos, organigrama)
    │   ├── content.js             (servicios, problemática, dashboard, infraestructura, conclusiones, nav)
    │   └── projectOptions.js      (opciones y estado inicial del configurador)
    └── components/
        ├── common/
        │   ├── SectionTitle.jsx
        │   ├── AnimatedSection.jsx
        │   ├── Button.jsx
        │   └── Card.jsx
        ├── Header/Header.jsx
        ├── Hero/Hero.jsx
        ├── Company/Company.jsx
        ├── Objectives/Objectives.jsx
        ├── OrganizationChart/OrganizationChart.jsx
        ├── Services/Services.jsx
        ├── ProblemSolution/ProblemSolution.jsx
        ├── SystemPrototype/SystemPrototype.jsx
        ├── Infrastructure/Infrastructure.jsx
        ├── Conclusions/Conclusions.jsx
        ├── Footer/Footer.jsx
        └── ProjectConfigurator/
            ├── ProjectConfigurator.jsx   (orquestador: estado, pasos, submit)
            ├── ProgressBar.jsx
            ├── OptionCard.jsx
            ├── Chip.jsx
            ├── StepCompany.jsx
            ├── StepProject.jsx
            ├── StepProblem.jsx
            ├── StepFeatures.jsx
            ├── StepScope.jsx
            ├── StepBudget.jsx
            ├── ProjectSummary.jsx
            ├── SuccessMessage.jsx
            └── validation.js
```

---

## ⚙️ Arquitectura (Resumen)

* **Componentización:** Cada sección es un componente independiente. El contenido repetible se extrae de `src/data/` para facilitar modificaciones sin tocar el código JSX.
* **Estado del Configurador:** `ProjectConfigurator.jsx` centraliza el estado de los pasos y los datos del formulario multi-step.
* **Validaciones:** `validation.js` evalúa los datos ingresados antes de permitir avanzar al siguiente paso.
* **Animaciones:** Implementadas con **Framer Motion** para transiciones de secciones, botones y el flujo del configurador.
* **Integración:** El envío final está simulado (delay de carga y mensaje de éxito), pero los datos (`projectData`) quedan estructurados en un objeto plano y listos para ser enviados a una API real en el futuro.
