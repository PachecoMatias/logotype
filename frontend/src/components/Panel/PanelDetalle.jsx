import { useCallback, useEffect, useRef, useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import AnalisisIA from "./AnalisisIA.jsx";
import DecisionBadge from "./DecisionBadge.jsx";
import { apiRequest } from "../../utils/api.js";
import { adaptarHistorias } from "../../utils/backlog.js";
import "../../styles/panel.css";

function formatLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function ValorCampo({ valor }) {
  if (valor === null || valor === undefined || valor === "") {
    return <span className="adm-empty-field">—</span>;
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return <span className="adm-empty-field">—</span>;
    return (
      <ul className="adm-list-values">
        {valor.map((item, i) => (
          <li key={i}>
            {typeof item === "object" && item !== null ? (
              <SeccionPayload titulo={null} datos={item} />
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof valor === "object") {
    return <SeccionPayload titulo={null} datos={valor} />;
  }

  if (typeof valor === "boolean") {
    return <span>{valor ? "Sí" : "No"}</span>;
  }

  return <span>{String(valor)}</span>;
}

function SeccionPayload({ titulo, datos }) {
  const entradas = Object.entries(datos || {});

  const lista = (
    <dl className="adm-dl">
      {entradas.map(([key, value]) => (
        <div className="adm-dl__row" key={key}>
          <dt>{formatLabel(key)}</dt>
          <dd>
            <ValorCampo valor={value} />
          </dd>
        </div>
      ))}
    </dl>
  );

  if (!titulo) return lista;

  return (
    <section className="adm-spec__section">
      <h4 className="adm-spec__label">{formatLabel(titulo)}</h4>
      {lista}
    </section>
  );
}

function PanelDetalle({
  projectId,
  historias,
  onBack,
  onBacklogLoaded,
  onViewBoard,
  onViewStories,
}) {
  const [proyecto, setProyecto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [analizando, setAnalizando] = useState(false);
  const [errorAnalisis, setErrorAnalisis] = useState(null);

  const [guardandoDecision, setGuardandoDecision] = useState(false);
  const [motivoDecision, setMotivoDecision] = useState("");
  const [mostrandoMotivo, setMostrandoMotivo] = useState(false);
  const [errorDecision, setErrorDecision] = useState(null);

  const [generandoBacklog, setGenerandoBacklog] = useState(false);
  const [errorBacklog, setErrorBacklog] = useState(null);
  const cargaPlanificadaIntentada = useRef(null);

  useEffect(() => {
    let cancelado = false;

    const cargarProyecto = async () => {
      setLoading(true);
      setError(null);
      try {
        const project = await apiRequest(`/api/proyectos/${projectId}`);

        if (!cancelado) {
          setProyecto(project);
          setMotivoDecision(project.decisionMotivo || "");
        }
      } catch (err) {
        if (!cancelado) {
          setError(err.message || "Error de red al cargar la solicitud.");
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    };

    if (projectId) {
      cargarProyecto();
    }

    return () => {
      cancelado = true;
    };
  }, [projectId]);

  const handleAnalizar = async () => {
    setAnalizando(true);
    setErrorAnalisis(null);
    try {
      const analysis = await apiRequest(
        `/api/proyectos/${projectId}/analizar`,
        {
          method: "POST",
        },
      );

      setProyecto((prev) => ({
        ...prev,
        estado: "analizado",
        analisisIa: analysis,
      }));
    } catch (err) {
      setErrorAnalisis(err.message || "Error de red al analizar la solicitud.");
    } finally {
      setAnalizando(false);
    }
  };

  const handleGenerarBacklog = useCallback(async () => {
    setGenerandoBacklog(true);
    setErrorBacklog(null);
    try {
      const stories = await apiRequest(`/api/proyectos/${projectId}/backlog`, {
        method: "POST",
      });

      onBacklogLoaded(projectId, adaptarHistorias(stories, projectId));
      setProyecto((prev) => (prev ? { ...prev, estado: "planificado" } : prev));
    } catch (err) {
      setErrorBacklog(err.message || "Error de red al generar el backlog.");
    } finally {
      setGenerandoBacklog(false);
    }
  }, [onBacklogLoaded, projectId]);

  const handleDecision = async (decision) => {
    const motivo = motivoDecision.trim();
    if (decision === "NO_VIABLE" && motivo.length < 10) {
      setErrorDecision("El motivo debe tener al menos 10 caracteres.");
      return;
    }

    const label = decision === "VIABLE" ? "viable" : "no viable";
    if (
      !window.confirm(
        `¿Confirmar la decisión y marcar el proyecto como ${label}?`,
      )
    )
      return;

    setGuardandoDecision(true);
    setErrorDecision(null);
    try {
      const project = await apiRequest(`/api/proyectos/${projectId}/decision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(motivo ? { motivo } : {}) }),
      });
      setProyecto(project);
      setMotivoDecision(project.decisionMotivo || "");
      setMostrandoMotivo(false);
    } catch (err) {
      setErrorDecision(err.message || "No se pudo guardar la decisión.");
    } finally {
      setGuardandoDecision(false);
    }
  };

  // Si el proyecto ya está planificado (por ejemplo, entrando directo por refresh),
  // pedimos el backlog existente: el endpoint lo devuelve sin regenerar.
  useEffect(() => {
    if (
      proyecto?.estado === "planificado" &&
      historias === undefined &&
      cargaPlanificadaIntentada.current !== projectId
    ) {
      cargaPlanificadaIntentada.current = projectId;
      handleGenerarBacklog();
    }
  }, [handleGenerarBacklog, historias, projectId, proyecto?.estado]);

  const tieneBacklog = Array.isArray(historias) && historias.length > 0;
  const analisisV2 = proyecto?.analisisIa?.version === 2;
  const puedeDecidir =
    analisisV2 && proyecto?.estado !== "planificado" && !tieneBacklog;
  const decisionFecha = proyecto?.decisionFecha
    ? new Date(proyecto.decisionFecha).toLocaleString("es-AR")
    : null;
  const decisionMigrada =
    proyecto?.decisionViabilidad === "VIABLE" &&
    !proyecto?.decisionMotivo &&
    !analisisV2;

  return (
    <section className="adm-section">
      <div className="adm-container">
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--sm adm-back"
          onClick={onBack}
        >
          ← Volver
        </button>

        {loading && <p className="adm-state">Cargando solicitud...</p>}

        {!loading && error && (
          <p className="adm-state adm-state--error">
            Ocurrió un error: {error}
          </p>
        )}

        {!loading && !error && proyecto && (
          <>
            <div className="adm-detail-head">
              <div className="adm-page-head">
                <span className="adm-eyebrow">Detalle de solicitud</span>
                <h2 className="adm-page-title">
                  {proyecto.payload?.empresa?.nombreEmpresa ||
                    `Solicitud #${proyecto.id}`}
                </h2>
              </div>
              <StatusBadge estado={proyecto.estado} />
            </div>

            <div className="adm-spec">
              {Object.entries(proyecto.payload || {}).map(
                ([seccion, datos]) => (
                  <SeccionPayload
                    key={seccion}
                    titulo={seccion}
                    datos={datos}
                  />
                ),
              )}
            </div>

            {proyecto.estado === "nuevo" && (
              <div className="adm-actions">
                <div className="adm-actions__stack">
                  <button
                    type="button"
                    className="adm-btn adm-btn--primary"
                    onClick={handleAnalizar}
                    disabled={analizando}
                  >
                    {analizando ? "Analizando…" : "Analizar con IA"}
                  </button>
                  {errorAnalisis && (
                    <p className="adm-alert adm-alert--error">
                      {errorAnalisis}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(proyecto.estado === "analizado" ||
              proyecto.estado === "planificado") && (
              <AnalisisIA
                analisis={proyecto.analisisIa}
                canReanalyze={proyecto.estado === "analizado" && !tieneBacklog}
                reanalyzing={analizando}
                onReanalyze={handleAnalizar}
              />
            )}

            {(proyecto.estado === "analizado" ||
              proyecto.estado === "planificado") && (
              <section
                className="adm-decision"
                aria-labelledby="decision-title"
              >
                <div className="adm-decision__head">
                  <div>
                    <h3 id="decision-title">Decisión del administrador</h3>
                    <p>La IA no decide: la decisión es del administrador</p>
                    {!proyecto.decisionViabilidad && (
                      <p className="adm-decision__pending-note">
                        Para generar el backlog, primero registrá una decisión
                        administrativa.
                      </p>
                    )}
                  </div>
                  <DecisionBadge decision={proyecto.decisionViabilidad} />
                </div>

                {proyecto.decisionViabilidad && (
                  <dl className="adm-decision__saved">
                    {decisionMigrada && (
                      <div>
                        <dt>Origen</dt>
                        <dd>
                          Decisión registrada automáticamente al migrar: el
                          proyecto ya estaba planificado
                        </dd>
                      </div>
                    )}
                    {proyecto.decisionMotivo && (
                      <div>
                        <dt>Motivo</dt>
                        <dd>{proyecto.decisionMotivo}</dd>
                      </div>
                    )}
                    {decisionFecha && (
                      <div>
                        <dt>
                          {decisionMigrada ? "Fecha de migración" : "Fecha"}
                        </dt>
                        <dd>{decisionFecha}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {!proyecto.decisionViabilidad && !analisisV2 && (
                  <p className="adm-alert adm-alert--warning">
                    Requiere un análisis con el nuevo criterio antes de
                    registrar una decisión.
                  </p>
                )}

                {puedeDecidir && (
                  <div className="adm-decision__controls">
                    <div className="adm-decision__buttons">
                      <button
                        type="button"
                        className="adm-btn adm-btn--primary"
                        onClick={() => handleDecision("VIABLE")}
                        disabled={guardandoDecision}
                      >
                        Marcar como viable
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn--ghost"
                        onClick={() => setMostrandoMotivo(true)}
                        disabled={guardandoDecision}
                      >
                        Marcar como no viable
                      </button>
                    </div>

                    {mostrandoMotivo && (
                      <div className="adm-decision__reason">
                        <label htmlFor="decision-motivo">
                          Motivo de la decisión
                        </label>
                        <textarea
                          id="decision-motivo"
                          className="adm-control"
                          value={motivoDecision}
                          onChange={(event) =>
                            setMotivoDecision(event.target.value)
                          }
                          rows={4}
                          minLength={10}
                          disabled={guardandoDecision}
                        />
                        <button
                          type="button"
                          className="adm-btn adm-btn--primary"
                          onClick={() => handleDecision("NO_VIABLE")}
                          disabled={guardandoDecision}
                        >
                          {guardandoDecision
                            ? "Guardando…"
                            : "Confirmar no viable"}
                        </button>
                      </div>
                    )}
                    {errorDecision && (
                      <p className="adm-alert adm-alert--error">
                        {errorDecision}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}

            {proyecto.estado === "analizado" && !tieneBacklog && (
              <div className="adm-actions">
                <div className="adm-actions__stack">
                  <button
                    type="button"
                    className="adm-btn adm-btn--primary"
                    onClick={handleGenerarBacklog}
                    disabled={
                      generandoBacklog ||
                      proyecto.decisionViabilidad !== "VIABLE"
                    }
                  >
                    {generandoBacklog ? "Generando…" : "Generar backlog"}
                  </button>
                  {proyecto.decisionViabilidad !== "VIABLE" && (
                    <p className="adm-actions__hint">
                      Requiere marcar el proyecto como viable
                    </p>
                  )}
                  {errorBacklog && (
                    <p className="adm-alert adm-alert--error">{errorBacklog}</p>
                  )}
                </div>
              </div>
            )}

            {proyecto.estado === "planificado" &&
              !tieneBacklog &&
              generandoBacklog && (
                <p className="adm-state">Cargando backlog...</p>
              )}

            {proyecto.estado === "planificado" &&
              !tieneBacklog &&
              errorBacklog && (
                <p className="adm-alert adm-alert--error">{errorBacklog}</p>
              )}

            {tieneBacklog && (
              <div className="adm-actions">
                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  onClick={() => onViewBoard(projectId)}
                >
                  Ver tablero
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  onClick={() => onViewStories(projectId)}
                >
                  Ver historias de usuario
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default PanelDetalle;
