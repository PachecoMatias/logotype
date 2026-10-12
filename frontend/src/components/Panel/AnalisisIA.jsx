const criterionLabels = {
  completitud: "Completitud de la información",
  ajuste_servicios: "Ajuste a los servicios",
  alcance_vs_plazo: "Alcance frente al plazo",
  presupuesto_vs_alcance: "Presupuesto frente al alcance",
  capacidad_equipo: "Capacidad del equipo",
  riesgos_tecnicos: "Riesgos técnicos",
};

const stateLabels = {
  cumple: "Cumple",
  atencion: "Atención",
  no_cumple: "No cumple",
  sin_datos: "Sin datos",
};

const impactOrder = { alto: 3, medio: 2, bajo: 1 };

function formatValue(value) {
  if (value === null || value === undefined) return "Sin dato";
  if (Array.isArray(value))
    return value.length > 0 ? value.join(", ") : "Ninguna";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value).replaceAll("_", " ");
}

function TextList({ items, ordered = false }) {
  if (!items?.length)
    return <p className="adm-ai__empty">Sin elementos informados.</p>;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="adm-ai__list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </Tag>
  );
}

function LegacyAnalysis({ analisis, canReanalyze, reanalyzing, onReanalyze }) {
  return (
    <section
      className="adm-ai adm-ai--legacy"
      aria-labelledby="legacy-analysis-title"
    >
      <div className="adm-ai__head">
        <div>
          <span className="adm-ai__orientation">Análisis anterior</span>
          <h3 className="adm-ai__title" id="legacy-analysis-title">
            Criterio desactualizado
          </h3>
        </div>
      </div>
      <div className="adm-ai__section">
        <p className="adm-alert adm-alert--warning">
          Este análisis fue generado con el criterio anterior y puede incluir un
          veredicto de IA.
        </p>
        {analisis.observaciones && (
          <p className="adm-ai__prose">{analisis.observaciones}</p>
        )}
        {canReanalyze && (
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={onReanalyze}
            disabled={reanalyzing}
          >
            {reanalyzing
              ? "Re-analizando…"
              : "Re-analizar con el nuevo criterio"}
          </button>
        )}
      </div>
    </section>
  );
}

function AnalisisIA({
  analisis,
  canReanalyze = false,
  reanalyzing = false,
  onReanalyze,
}) {
  if (!analisis) return null;
  if (analisis.version !== 2) {
    return (
      <LegacyAnalysis
        analisis={analisis}
        canReanalyze={canReanalyze}
        reanalyzing={reanalyzing}
        onReanalyze={onReanalyze}
      />
    );
  }

  const counts = { cumple: 0, atencion: 0, no_cumple: 0, sin_datos: 0 };
  for (const criterion of analisis.criterios || []) {
    if (Object.hasOwn(counts, criterion.estado)) counts[criterion.estado] += 1;
  }
  const risks = [...(analisis.riesgos || [])].sort(
    (left, right) =>
      (impactOrder[right.impacto] || 0) - (impactOrder[left.impacto] || 0),
  );

  return (
    <article className="adm-ai" aria-labelledby="analysis-title">
      <header className="adm-ai__head">
        <div>
          <span className="adm-ai__orientation">
            Opinión de la IA · orientativa
          </span>
          <h3 className="adm-ai__title" id="analysis-title">
            Análisis del proyecto
          </h3>
        </div>
        <div className="adm-ai__risk-summary">
          <span
            className={`adm-ai-badge adm-ai-badge--${analisis.nivel_de_riesgo}`}
          >
            Riesgo {analisis.nivel_de_riesgo}
          </span>
          <p>{analisis.razon_nivel_riesgo}</p>
        </div>
      </header>

      <section
        className="adm-ai__section adm-ai__reading"
        aria-labelledby="general-reading-title"
      >
        <h4 id="general-reading-title">Lectura general</h4>
        {analisis.lectura_general.split(/\n\s*\n/).map((paragraph, index) => (
          <p className="adm-ai__prose" key={`${paragraph}-${index}`}>
            {paragraph}
          </p>
        ))}
      </section>

      <section className="adm-ai__section" aria-labelledby="signals-title">
        <div className="adm-ai__section-head">
          <h4 id="signals-title">Señales objetivas</h4>
          <span className="adm-ai__calculated">calculado por reglas</span>
        </div>
        <dl className="adm-ai__signals">
          {Object.entries(analisis.senales || {}).map(([key, value]) => (
            <div key={key}>
              <dt>{key.replaceAll("_", " ")}</dt>
              <dd>{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="adm-ai__section" aria-labelledby="criteria-title">
        <div className="adm-ai__section-head">
          <h4 id="criteria-title">Criterios</h4>
          <p className="adm-ai__counter">
            {counts.cumple} cumple · {counts.atencion} atención ·{" "}
            {counts.no_cumple} no cumple · {counts.sin_datos} sin datos
          </p>
        </div>
        <div className="adm-ai__criteria">
          {(analisis.criterios || []).map((criterion) => (
            <div className="adm-ai__criterion" key={criterion.id}>
              <div>
                <h5>{criterionLabels[criterion.id]}</h5>
                <p>{criterion.justificacion}</p>
              </div>
              <span
                className={`adm-ai-badge adm-ai-badge--${criterion.estado}`}
              >
                {stateLabels[criterion.estado]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="adm-ai__section adm-ai__two-columns"
        aria-label="Fortalezas y debilidades"
      >
        <div>
          <h4>Fortalezas</h4>
          {(analisis.fortalezas || []).map((item) => (
            <div className="adm-ai__named-item" key={item.titulo}>
              <h5>{item.titulo}</h5>
              <p>{item.detalle}</p>
            </div>
          ))}
        </div>
        <div>
          <h4>Debilidades</h4>
          {(analisis.debilidades || []).map((item) => (
            <div className="adm-ai__named-item" key={item.titulo}>
              <h5>{item.titulo}</h5>
              <p>{item.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-ai__section" aria-labelledby="risks-title">
        <h4 id="risks-title">Riesgos</h4>
        <div className="adm-ai__risks">
          {risks.map((risk) => (
            <div
              className="adm-ai__risk"
              key={`${risk.titulo}-${risk.detalle}`}
            >
              <div className="adm-ai__risk-title">
                <h5>{risk.titulo}</h5>
                <span className={`adm-ai-badge adm-ai-badge--${risk.impacto}`}>
                  Impacto {risk.impacto}
                </span>
              </div>
              <p>{risk.detalle}</p>
              <p>
                <strong>Mitigación:</strong> {risk.mitigacion}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="adm-ai__section" aria-labelledby="missing-title">
        <h4 id="missing-title">Información faltante</h4>
        {(analisis.informacion_faltante || []).map((item) => (
          <div className="adm-ai__named-item" key={item.dato}>
            <h5>{item.dato}</h5>
            <p>{item.por_que_importa}</p>
          </div>
        ))}
      </section>

      <section className="adm-ai__section" aria-labelledby="conditions-title">
        <h4 id="conditions-title">Condiciones para avanzar</h4>
        <TextList items={analisis.condiciones_para_avanzar} ordered />
      </section>

      <section
        className="adm-ai__section adm-ai__secondary"
        aria-label="Preguntas y supuestos"
      >
        <div>
          <h4>Preguntas para el cliente</h4>
          <TextList items={analisis.preguntas_para_el_cliente} />
        </div>
        <div>
          <h4>Supuestos</h4>
          <TextList items={analisis.supuestos} />
        </div>
      </section>

      <footer className="adm-ai__footer">
        Opinión de la IA, orientativa. Decide el administrador.
      </footer>
    </article>
  );
}

export default AnalisisIA;
