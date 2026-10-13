import { splitIntoSentencePairs } from "../../utils/analysis-text.js";

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

const signalLabels = {
  cantidad_funcionalidades: "Cantidad de funcionalidades",
  cantidad_plataformas: "Cantidad de plataformas",
  escala_usuarios: "Escala de usuarios",
  tamano_estimado: "Tamaño estimado",
  duracion_referencia_semanas: "Duración de referencia",
  plazo_solicitado_semanas: "Plazo solicitado",
  plazo_compatible: "Compatibilidad del plazo",
  presupuesto_solicitado_usd: "Presupuesto solicitado",
  presupuesto_minimo_referencia_usd: "Presupuesto mínimo de referencia",
  presupuesto_compatible: "Compatibilidad del presupuesto",
  funcionalidades_sensibles: "Funcionalidades sensibles",
  rubro_sensible: "Rubro sensible",
  requiere_revision_seguridad: "Requiere revisión de seguridad",
  plataformas_fuera_de_foco: "Plataformas fuera de foco",
  campos_vacios: "Campos que requieren más detalle",
  cuelloDeBotella: "Cuello de botella",
};

const currencySignalKeys = new Set([
  "presupuesto_solicitado_usd",
  "presupuesto_minimo_referencia_usd",
]);
const weekSignalKeys = new Set([
  "duracion_referencia_semanas",
  "plazo_solicitado_semanas",
]);
const signalValueLabels = {
  si: "Sí",
  no: "No",
  ajustado: "Ajustado",
  insuficiente: "Insuficiente",
  compatible: "Compatible",
  fuera_de_rango: "Fuera de rango",
};

function formatNumber(value) {
  return new Intl.NumberFormat("es-AR").format(value);
}

function formatRange(value, suffix = "") {
  const values = Array.isArray(value) ? value : [value];
  const formatted = values
    .map(formatNumber)
    .join(values.length > 1 ? " a " : "");
  return `${formatted}${suffix}`;
}

function formatSignalLabel(key) {
  if (signalLabels[key]) return signalLabels[key];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatValue(value, key) {
  if (value === null || value === undefined) return "Sin dato";
  if (currencySignalKeys.has(key)) return `USD ${formatRange(value)}`;
  if (weekSignalKeys.has(key)) return formatRange(value, " semanas");
  if (key === "campos_vacios" && Array.isArray(value)) {
    return value.length > 0
      ? value.map(formatSignalLabel).join(", ")
      : "Ninguno";
  }
  if (Array.isArray(value))
    return value.length > 0 ? value.join(", ") : "Ninguna";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (signalValueLabels[value]) return signalValueLabels[value];
  const text = String(value).replaceAll("_", " ");
  return text.replace(/^./, (character) => character.toUpperCase());
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

function DecisionKeys({ items }) {
  if (!items?.length) return null;

  return (
    <ul className="adm-ai__keys">
      {items.map((item, index) => {
        const separatorIndex = item.indexOf(":");
        const label =
          separatorIndex >= 0 ? item.slice(0, separatorIndex) : null;
        const detail =
          separatorIndex >= 0 ? item.slice(separatorIndex + 1).trim() : item;

        return (
          <li key={`${item}-${index}`}>
            {label && <strong>{label}:</strong>} {detail}
          </li>
        );
      })}
    </ul>
  );
}

function SentenceParagraphs({ value }) {
  const paragraphs = splitIntoSentencePairs(value);
  if (paragraphs.length === 0)
    return <p className="adm-ai__empty">Sin información registrada.</p>;

  return paragraphs.map((paragraph, index) => (
    <p className="adm-ai__prose" key={`${paragraph}-${index}`}>
      {paragraph}
    </p>
  ));
}

function LegacyAnalysis({ analisis, canReanalyze, reanalyzing, onReanalyze }) {
  return (
    <section
      className="adm-ai adm-ai--legacy"
      aria-labelledby="legacy-analysis-title"
    >
      <div className="adm-ai__head">
        <h3 className="adm-ai__title" id="legacy-analysis-title">
          Análisis anterior
        </h3>
      </div>
      <div className="adm-ai__section">
        <p className="adm-alert adm-alert--warning">
          Análisis anterior: no incluye las señales ni los criterios nuevos
        </p>
        <h4>Observaciones</h4>
        <SentenceParagraphs value={analisis.observaciones} />
      </div>
      <div className="adm-ai__section adm-ai__legacy-grid">
        <div>
          <h4>Completitud</h4>
          <p className="adm-ai__prose">{formatValue(analisis.completitud)}</p>
        </div>
        <div>
          <h4>Información faltante</h4>
          <TextList items={analisis.campos_faltantes} />
        </div>
      </div>
      <div className="adm-ai__section">
        <h4>Mensaje para el cliente</h4>
        <p className="adm-ai__prose">
          {formatValue(analisis.mensaje_para_cliente)}
        </p>
      </div>
      <div className="adm-ai__section adm-ai__legacy-verdict">
        <h4>Veredicto anterior de la IA (ya no se usa para decidir)</h4>
        <p>{analisis.viable ? "Afirmativo" : "Negativo"}</p>
      </div>
      {canReanalyze && (
        <div className="adm-ai__legacy-action">
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
        </div>
      )}
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
        <div className="adm-ai__head-top">
          <h3 className="adm-ai__title" id="analysis-title">
            Opinión de la IA · orientativa
          </h3>
          <span
            className={`adm-ai-badge adm-ai-badge--${analisis.nivel_de_riesgo}`}
          >
            Riesgo {analisis.nivel_de_riesgo}
          </span>
        </div>
        <p className="adm-ai__risk-reason">{analisis.razon_nivel_riesgo}</p>
      </header>

      <section
        className="adm-ai__section adm-ai__reading"
        aria-labelledby="summary-title"
      >
        <h4 id="summary-title">Resumen</h4>
        {analisis.sintesis ? (
          <p className="adm-ai__summary">{analisis.sintesis}</p>
        ) : (
          <SentenceParagraphs value={analisis.lectura_general} />
        )}
      </section>

      {analisis.claves_para_decidir?.length > 0 && (
        <section
          className="adm-ai__section"
          aria-labelledby="decision-keys-title"
        >
          <h4 id="decision-keys-title">Claves para decidir</h4>
          <DecisionKeys items={analisis.claves_para_decidir} />
        </section>
      )}

      <section className="adm-ai__section" aria-labelledby="signals-title">
        <div className="adm-ai__section-head">
          <h4 id="signals-title">Señales objetivas</h4>
          <span className="adm-ai__calculated">calculado por reglas</span>
        </div>
        <dl className="adm-ai__signals">
          {Object.entries(analisis.senales || {}).map(([key, value]) => (
            <div key={key}>
              <dt>{formatSignalLabel(key)}</dt>
              <dd>{formatValue(value, key)}</dd>
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
              <div className="adm-ai__criterion-head">
                <h5>{criterionLabels[criterion.id]}</h5>
                <span
                  className={`adm-ai-badge adm-ai-badge--compact adm-ai-badge--${criterion.estado}`}
                >
                  {stateLabels[criterion.estado]}
                </span>
              </div>
              <p>{criterion.justificacion}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="adm-ai__section adm-ai__two-columns"
        aria-label="Fortalezas y debilidades"
      >
        <div className="adm-ai__column adm-ai__column--strengths">
          <h4>Fortalezas</h4>
          {(analisis.fortalezas || []).map((item) => (
            <div className="adm-ai__named-item" key={item.titulo}>
              <h5>{item.titulo}</h5>
              <p>{item.detalle}</p>
            </div>
          ))}
        </div>
        <div className="adm-ai__column adm-ai__column--weaknesses">
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
              <p className="adm-ai__mitigation">
                <strong>Mitigación:</strong> {risk.mitigacion}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="adm-ai__section adm-ai__two-columns"
        aria-label="Información faltante y condiciones para avanzar"
      >
        <div>
          <h4>Información faltante</h4>
          {(analisis.informacion_faltante || []).map((item) => (
            <div className="adm-ai__named-item" key={item.dato}>
              <h5>{item.dato}</h5>
              <p>{item.por_que_importa}</p>
            </div>
          ))}
        </div>
        <div>
          <h4>Condiciones para avanzar</h4>
          <TextList items={analisis.condiciones_para_avanzar} ordered />
        </div>
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
