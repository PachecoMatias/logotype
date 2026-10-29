import { useCallback, useEffect, useRef, useState } from "react";

import StatusBadge from "./StatusBadge.jsx";
import DecisionBadge from "./DecisionBadge.jsx";
import { apiRequest } from "../../utils/api.js";

import {
  buildAdvisorDetail,
  buildAnswerGroups,
  buildBusinessSummary,
} from "../../utils/advisorDetail.js";

import { adaptarHistorias } from "../../utils/backlog.js";
import AdvisorAnswersModal from "./AdvisorAnswersModal.jsx";

import "../../styles/panel.css";

function formatLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

const advisorStateLabels = {
  entendida: "Entendida",
  supuesta: "Supuesta",
  editada_cliente: "Editada por el cliente",
  sugerida_ia: "Sugerida por IA",
};

function AdvisorSuggestions({ title, items }) {
  return (
    <div className="adm-advisor__suggestion-group">
      <h5>{title}</h5>

      {items.length > 0 ? (
        <ul className="adm-list-values">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <span className="adm-empty-field">Ninguna</span>
      )}
    </div>
  );
}
function AsesoramientoDetalle({ asesoramiento }) {
  const [grupoRespuestas, setGrupoRespuestas] = useState(null);
  const detail = buildAdvisorDetail(asesoramiento);
  if (!detail) return null;
  const answerGroups = buildAnswerGroups(detail.historias, detail.respuestas);

  return (
    <>
      <section
        className="adm-advisor adm-enter-item"
        style={{ "--adm-enter-order": 1 }}
        aria-labelledby="advisor-detail-title"
      >
        <div className="adm-advisor__head">
          <div>
            <span className="adm-eyebrow">Relevamiento guiado</span>
            <h3 id="advisor-detail-title">Asesoramiento de IA</h3>
          </div>
          <dl className="adm-advisor__summary">
            <div>
              <dt>Versión</dt>
              <dd>{detail.version ?? "—"}</dd>
            </div>
            <div>
              <dt>Rondas</dt>
              <dd>{detail.rondas ?? "—"}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{detail.completo ? "Completo" : "Incompleto"}</dd>
            </div>
            <div>
              <dt>Modalidad</dt>
              <dd>{detail.sinAsesor ? "Continuó sin asesor" : "Con asesor"}</dd>
            </div>
          </dl>
        </div>

        <div className="adm-advisor__idea">
          <h4>Idea original</h4>
          <p>
            {detail.ideaOriginal || <span className="adm-empty-field">—</span>}
          </p>
        </div>

        <div className="adm-advisor__block">
          <div className="adm-advisor__block-head">
            <h4>Historias asesoradas</h4>
            <span>{detail.historias.length}</span>
          </div>
          {detail.historias.length > 0 ? (
            <ol className="adm-advisor__stories">
              {detail.historias.map((story, index) => (
                <li key={story.id || `advisor-story-${index}`}>
                  <div className="adm-advisor__story-head">
                    <strong>
                      {story.funcionalidad || `Historia ${index + 1}`}
                    </strong>
                    <span className="adm-advisor__state">
                      {advisorStateLabels[story.estado] ||
                        formatLabel(story.estado || "")}
                    </span>
                  </div>
                  <div className="adm-advisor__story-body">
                    <span className="adm-advisor__field-label">
                      Historia de usuario
                    </span>
                    <p>
                      {story.texto || (
                        <span className="adm-empty-field">Sin texto</span>
                      )}
                    </p>
                  </div>
                  <div className="adm-advisor__meta">
                    <span>Etapa: {story.etapa || "—"}</span>
                    {story.aDetallar && (
                      <span className="adm-advisor__pending">A detallar</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="adm-empty-field">No se registraron historias.</p>
          )}
        </div>

        <div className="adm-advisor__block">
          <div className="adm-advisor__block-head">
            <h4>Respuestas relevadas</h4>
            <span>{detail.respuestas.length}</span>
          </div>
          {answerGroups.length > 0 ? (
            <ul className="adm-advisor__answer-groups">
              {answerGroups.map((group) => (
                <li key={group.id}>
                  <div className="adm-advisor__answer-group-head">
                    <strong>{group.title}</strong>
                    <span>
                      {group.answers.length === 1
                        ? "1 respuesta"
                        : `${group.answers.length} respuestas`}
                    </span>
                  </div>
                  {group.unmatched && (
                    <p className="adm-advisor__answer-group-note">
                      Respuestas que no pudieron asociarse a una historia.
                    </p>
                  )}
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost adm-btn--sm"
                    onClick={() => setGrupoRespuestas(group)}
                    disabled={group.answers.length === 0}
                  >
                    Ver preguntas y respuestas
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty-field">No se registraron respuestas.</p>
          )}
        </div>

        <div className="adm-advisor__suggestions">
          <AdvisorSuggestions
            title="Sugerencias aceptadas"
            items={detail.sugerenciasAceptadas}
          />
          <AdvisorSuggestions
            title="Sugerencias rechazadas"
            items={detail.sugerenciasRechazadas}
          />
        </div>
      </section>

      {grupoRespuestas && (
        <AdvisorAnswersModal
          group={grupoRespuestas}
          onClose={() => setGrupoRespuestas(null)}
        />
      )}
    </>
  );
}

export function ResumenProyecto({ payload }) {
  const items = buildBusinessSummary(payload);
  if (items.length === 0) return null;

  return (
    <section
      className="adm-summary adm-enter-item"
      style={{ "--adm-enter-order": 2 }}
      aria-labelledby="project-summary-title"
    >
      <div className="adm-summary__head">
        <span className="adm-eyebrow">Datos del cliente</span>
        <h3 id="project-summary-title">Resumen del proyecto</h3>
        <p>Alcance y contexto relevantes para evaluar la solicitud.</p>
      </div>
      <dl className="adm-summary__grid">
        {items.map((item) => (
          <div
            className={`adm-summary__item${
              item.wide ? " adm-summary__item--wide" : ""
            }${item.layout ? ` adm-summary__item--${item.layout}` : ""}`}
            key={item.label}
          >
            <dt>{item.label}</dt>
            <dd>
              {item.values ? (
                <ul className="adm-summary__values">
                  {item.values.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
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
  onViewAnalysis,
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
  const tieneAcciones = Boolean(proyecto?.analisisIa) || tieneBacklog;
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
    <section className="adm-section adm-detail-view">
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
            <div
              className="adm-detail-head adm-enter-item"
              style={{ "--adm-enter-order": 0 }}
            >
              <div className="adm-page-head">
                <span className="adm-eyebrow">Proyecto</span>
                <h2 className="adm-page-title">
                  {proyecto.payload?.empresa?.nombreEmpresa ||
                    `Solicitud #${proyecto.id}`}
                </h2>
              </div>
              <StatusBadge estado={proyecto.estado} />
            </div>

            {proyecto.payload?.asesoramiento && (
              <AsesoramientoDetalle
                asesoramiento={proyecto.payload.asesoramiento}
              />
            )}

            <ResumenProyecto payload={proyecto.payload} />

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
              <section
                className="adm-decision adm-enter-item"
                style={{ "--adm-enter-order": 3 }}
                aria-labelledby="decision-title"
              >
                <div className="adm-decision__head">
                  <div>
                    <span className="adm-eyebrow">Criterio humano</span>
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

            {tieneAcciones && (
              <div
                className="adm-view-actions adm-enter-item"
                style={{ "--adm-enter-order": 4 }}
                aria-label="Acciones principales del proyecto"
              >
                <div className="adm-view-actions__intro">
                  <span className="adm-eyebrow">Continuar</span>
                  <p>
                    Consultá el análisis, el tablero o las historias de este
                    proyecto.
                  </p>
                </div>
                <div className="adm-view-actions__grid">
                  {proyecto.analisisIa && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--primary"
                      onClick={() => onViewAnalysis(projectId)}
                    >
                      Ver opinión de la IA
                    </button>
                  )}
                  {tieneBacklog && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      onClick={() => onViewBoard(projectId)}
                    >
                      Ver tablero
                    </button>
                  )}
                  {tieneBacklog && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      onClick={() => onViewStories(projectId)}
                    >
                      Ver historias de usuario
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default PanelDetalle;
