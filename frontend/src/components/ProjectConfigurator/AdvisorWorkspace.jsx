import { useEffect, useRef, useState } from "react";

import {
  getStoryFunctionalityLabel,
  getStoryStageLabel,
  hasAdvisorDraftAnswer,
  hasAdvisorQuestions,
  hasAdvisorSuggestions,
  serializeAdvisorAnswer,
} from "../../utils/advisorState.js";
import { AdvisorDegradedNotice } from "./AdvisorDegradedNotice.js";
import { AdvisorQuestion } from "./AdvisorQuestion.js";
import { AdvisorStoryText } from "./AdvisorStoryText.js";

const statusLabels = {
  a_completar: "A completar",
  en_detalle: "En detalle",
  entendida: "Entendida",
  con_pendientes: "Con pendientes",
  supuesta: "Supuesta",
};

const originLabels = { cliente: "Cliente", ia: "IA" };

const suggestionTypeLabels = {
  mejora: "Mejora",
  complementaria: "Complementaria",
  etapas: "Etapas",
  definir: "Definir",
};

function getMotionDuration(variable, fallback) {
  if (typeof document === "undefined") return fallback;
  const root = document.querySelector(".adv-main") || document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(variable).trim();
  const duration = Number.parseFloat(value);
  if (!Number.isFinite(duration)) return fallback;
  return value.endsWith("ms") ? duration : duration * 1000;
}

function useChangeFlag(value) {
  const [changed, setChanged] = useState(false);
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return undefined;
    }
    setChanged(true);
    const timeout = setTimeout(
      () => setChanged(false),
      getMotionDuration("--adv-motion-flash", 1600),
    );
    return () => clearTimeout(timeout);
  }, [value]);

  return changed;
}

function Story({ story, index, isFocused, isHighlighted, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(story.texto);
  const textChanged = useChangeFlag(story.texto);
  const label = story.aDetallar
    ? "A detallar con el equipo"
    : statusLabels[story.estado];
  const functionality = story.funcionalidad?.trim();
  const stageLabel = getStoryStageLabel(story.etapa);

  useEffect(() => setText(story.texto), [story.texto]);

  const save = () => {
    if (!text.trim()) return;
    onEdit(story.id, text);
    setEditing(false);
  };

  return (
    <article
      className={`adv-story adv-story-enter is-status-${story.estado}${isFocused ? " is-focused" : ""}${textChanged || isHighlighted ? " adv-flash" : ""}`}
    >
      <div className="adv-story__identity">
        <strong>
          HU {index + 1}
          {functionality ? ` · ${functionality}` : ""}
        </strong>
        {isFocused && <span>En detalle ahora</span>}
      </div>
      <div className="adv-story__meta">
        <span
          className={`adv-badge adv-badge--${story.aDetallar ? "deferred" : story.estado}`}
        >
          {label}
        </span>
        <span>Origen: {originLabels[story.origen] || "Cliente"}</span>
        {stageLabel && <span>{stageLabel}</span>}
      </div>

      {editing ? (
        <div className="adv-story__edit">
          <label htmlFor={`edit-${story.id}`}>Texto de la historia</label>
          <textarea
            id={`edit-${story.id}`}
            value={text}
            maxLength={400}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="adv-inline-actions">
            <button
              type="button"
              className="adv-button adv-button--small"
              onClick={save}
            >
              Guardar
            </button>
            <button
              type="button"
              className="adv-button adv-button--quiet"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <AdvisorStoryText story={story} />
      )}

      {!editing && (
        <div className="adv-story__actions">
          <button type="button" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" onClick={() => onDelete(story.id)}>
            Eliminar
          </button>
        </div>
      )}
    </article>
  );
}

function AdvisorWorkspace({
  histories,
  round,
  loading,
  advisorError,
  relatedFeatures,
  suggestionFeedback,
  onSubmitAnswers,
  onRetry,
  onFallback,
  onAcceptSuggestion,
  onRejectSuggestion,
  onEditStory,
  onDeleteStory,
  onAddStory,
  onAddFeature,
  onClose,
}) {
  const [drafts, setDrafts] = useState({});
  const [questionError, setQuestionError] = useState("");
  const [manualText, setManualText] = useState("");
  const [feature, setFeature] = useState("");
  const [otherFeature, setOtherFeature] = useState("");
  const [mobileTab, setMobileTab] = useState("questions");
  const firstQuestionRef = useRef(null);

  useEffect(() => {
    setDrafts({});
    setQuestionError("");
    if (round.preguntas.length)
      requestAnimationFrame(() => firstQuestionRef.current?.focus());
  }, [round.renderId]);

  const focusStory = histories.find(
    (story) => story.id === round.foco?.historiaId,
  );
  const focusIndex = Math.max(
    0,
    histories.findIndex((story) => story.id === round.foco?.historiaId),
  );
  const detailedTotal = Math.min(round.progreso.total, round.progreso.tope);
  const showsQuestions = hasAdvisorQuestions(round);
  const showsSuggestions = hasAdvisorSuggestions(round);
  const canSubmit =
    !showsQuestions ||
    round.preguntas.every((question) =>
      hasAdvisorDraftAnswer(question, drafts[question.id]),
    );
  const focusFunctionality = focusStory
    ? getStoryFunctionalityLabel(focusStory)
    : null;

  const submit = (event) => {
    event.preventDefault();
    const missing = round.preguntas.some((question) => {
      const draft = drafts[question.id];
      return !hasAdvisorDraftAnswer(question, draft);
    });

    if (missing) {
      setQuestionError("Respondé cada pregunta o elegí “No sé”.");
      return;
    }

    onSubmitAnswers(
      round.preguntas.map((question) => ({
        preguntaId: question.id,
        historiaId: round.foco?.historiaId,
        aspecto: question.aspecto,
        pregunta: question.texto,
        respuesta: serializeAdvisorAnswer(question, drafts[question.id]),
        noSabe: Boolean(drafts[question.id]?.noSabe),
        integrada: false,
      })),
    );
  };

  const addManual = () => {
    if (!manualText.trim()) return;
    onAddStory(manualText);
    setManualText("");
  };

  const addFeature = () => {
    const value = feature === "Otra" ? otherFeature.trim() : feature;
    if (!value) return;
    onAddFeature(value, feature === "Otra");
    setFeature("");
    setOtherFeature("");
  };

  return (
    <section
      className="adv-screen adv-screen--workspace"
      aria-labelledby="adv-work-title"
    >
      <header className="adv-work-header">
        <div>
          <h1 id="adv-work-title" className="adv-enter-item" style={{ "--adv-enter-order": 0 }}>Démosle forma a tu proyecto</h1>
          {focusStory ? (
            <div className="adv-current adv-enter-item" style={{ "--adv-enter-order": 1 }}>
              <span className="adv-current__label">Funcionalidad actual</span>
              <strong className="adv-current__name">
                {focusFunctionality}
              </strong>
              <span className="adv-current__story-label">
                HU {focusIndex + 1} de {histories.length}
              </span>
              <p>{focusStory.texto}</p>
            </div>
          ) : (
            <p className="adv-enter-item" style={{ "--adv-enter-order": 1 }}>Revisá tu idea antes de continuar.</p>
          )}
        </div>
        <div className="adv-progress adv-enter-item" style={{ "--adv-enter-order": 1 }} aria-label="Progreso del asesor">
          <strong>
            Funcionalidad {Math.min(focusIndex + 1, detailedTotal || 1)} de{" "}
            {detailedTotal || histories.length || 1}
          </strong>
          <span>
            {round.progreso.completas} de {round.progreso.total} completas
          </span>
        </div>
      </header>

      <div
        className="adv-mobile-tabs"
        role="tablist"
        aria-label="Vista del asesor"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "questions"}
          onClick={() => setMobileTab("questions")}
        >
          Preguntas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "stories"}
          onClick={() => setMobileTab("stories")}
        >
          Mi idea ({histories.length})
        </button>
      </div>

      <div className="adv-live adv-enter-item" style={{ "--adv-enter-order": 2 }} aria-live="polite">
        {showsQuestions
          ? `${round.preguntas.length} preguntas nuevas disponibles.`
          : "No hay preguntas pendientes."}
      </div>

      <div className="adv-split">
        <div
          className={`adv-questions${mobileTab !== "questions" ? " adv-mobile-hidden" : ""}`}
        >
          <AdvisorDegradedNotice
            degraded={round.degradado}
            loading={loading}
            onRetry={onRetry}
            onFallback={onFallback}
            onClose={onClose}
            reason={round.motivoDegradado}
          />
          {loading ? (
            <div className="adv-thinking" role="status">
              <span aria-hidden="true" />
              <strong>La IA está pensando…</strong>
              <p>
                Está integrando tus respuestas y preparando la siguiente
                pregunta.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="adv-question-list" key={round.renderId}>
                {round.preguntas.map((question, index) => (
                  <AdvisorQuestion
                    key={`${round.renderId}-${question.id}`}
                    question={question}
                    number={index + 1}
                    total={round.preguntas.length}
                    value={
                      drafts[question.id] || {
                        value: "",
                        selected: [],
                        otherSelected: false,
                        other: "",
                        noSabe: false,
                      }
                    }
                    onChange={(value) =>
                      setDrafts((current) => ({
                        ...current,
                        [question.id]: value,
                      }))
                    }
                    inputRef={index === 0 ? firstQuestionRef : undefined}
                  />
                ))}
              </div>
              {questionError && (
                <p className="adv-field-error" role="alert">
                  {questionError}
                </p>
              )}
              <button
                className="adv-button adv-button--primary adv-enter-item"
                style={{ "--adv-enter-order": Math.max(2, round.preguntas.length) }}
                type="submit"
                disabled={!canSubmit}
              >
                {showsQuestions
                  ? "Enviar respuestas"
                  : "Continuar con el asesor"}
              </button>
            </form>
          )}

          {advisorError && (
            <div className="adv-error" role="alert">
              <strong>No pudimos continuar con el asesor.</strong>
              <p>{advisorError.message}</p>
              <div className="adv-inline-actions">
                <button
                  type="button"
                  className="adv-button adv-button--line"
                  onClick={onRetry}
                >
                  Reintentar
                </button>
                {advisorError.canFallback && (
                  <button
                    type="button"
                    className="adv-button adv-button--quiet"
                    onClick={onFallback}
                  >
                    Continuar sin asesor
                  </button>
                )}
              </div>
            </div>
          )}

          {showsSuggestions && (
            <section
              className="adv-suggestions"
              aria-labelledby="adv-suggestions-title"
            >
              <h2 id="adv-suggestions-title" className="adv-enter-item" style={{ "--adv-enter-order": 0 }}>
                Sugerencias · {focusFunctionality}
              </h2>
              {round.sugerencias.map((suggestion, index) => (
                <div className="adv-suggestion adv-enter-item" style={{ "--adv-enter-order": index + 1 }} key={suggestion.id}>
                  <span className="adv-suggestion__type">
                    {suggestionTypeLabels[suggestion.tipo] || "Sugerencia"}
                  </span>
                  <p>{suggestion.texto}</p>
                  <div className="adv-inline-actions">
                    <button
                      type="button"
                      onClick={() => onAcceptSuggestion(suggestion)}
                    >
                      Agregar a mi idea
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion(suggestion)}
                    >
                      No, gracias
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {suggestionFeedback && (
            <p
              className="adv-suggestion-feedback adv-feedback-pulse"
              role="status"
            >
              {suggestionFeedback.message}
            </p>
          )}

          <button type="button" className="adv-finish-link adv-enter-item" style={{ "--adv-enter-order": Math.max(3, round.preguntas.length + 1) }} onClick={onClose}>
            Ya está, armá el resumen
          </button>
        </div>

        <aside
          className={`adv-stories${mobileTab !== "stories" ? " adv-mobile-hidden" : ""}`}
          aria-labelledby="adv-stories-title"
        >
          <div className="adv-stories__heading">
            <h2 id="adv-stories-title">Tu idea, hasta ahora</h2>
            <strong>{histories.length} HU</strong>
          </div>
          <div className="adv-story-list">
            {histories.map((story, index) => (
              <Story
                key={story.id}
                story={story}
                index={index}
                isFocused={story.id === focusStory?.id}
                isHighlighted={story.id === suggestionFeedback?.storyId}
                onEdit={onEditStory}
                onDelete={onDeleteStory}
              />
            ))}
          </div>

          <div className="adv-add-block">
            <label htmlFor="adv-new-story">Agregar historia</label>
            <textarea
              id="adv-new-story"
              value={manualText}
              maxLength={400}
              onChange={(event) => setManualText(event.target.value)}
              placeholder="Escribí la necesidad con tus palabras."
            />
            <button
              type="button"
              className="adv-button adv-button--line"
              onClick={addManual}
            >
              + Agregar historia
            </button>
          </div>

          <div className="adv-add-block">
            <label htmlFor="adv-related-feature">Agregar funcionalidad</label>
            <select
              id="adv-related-feature"
              value={feature}
              onChange={(event) => setFeature(event.target.value)}
            >
              <option value="">Seleccioná una opción</option>
              {relatedFeatures.map((item) => (
                <option key={item}>{item}</option>
              ))}
              <option>Otra</option>
            </select>
            {feature === "Otra" && (
              <label className="adv-field" htmlFor="adv-custom-feature">
                <span>Nombre de la funcionalidad</span>
                <input
                  id="adv-custom-feature"
                  value={otherFeature}
                  onChange={(event) => setOtherFeature(event.target.value)}
                />
              </label>
            )}
            <button
              type="button"
              className="adv-button adv-button--line"
              onClick={addFeature}
            >
              Agregar funcionalidad
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default AdvisorWorkspace;
