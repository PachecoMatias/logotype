import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

function formatLabel(key) {
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function AnswerBlock({ answer, index }) {
  const aspect = formatLabel(answer.aspecto || "Consulta");

  return (
    <div
      className="adm-advisor__answer adm-answers-modal__answer"
      key={`${answer.historiaId || "answer"}-${answer.aspecto || index}-${index}`}
    >
      <span className="adm-advisor__aspect">{aspect}</span>
      <dl className="adm-answers-modal__qa">
        <dt className="adm-advisor__answer-question">
          <span className="adm-advisor__field-label">Pregunta de la IA</span>
          {answer.pregunta || aspect}
        </dt>
        <dd className="adm-advisor__answer-response">
          <span className="adm-advisor__field-label">
            Respuesta del cliente
          </span>
          {answer.respuesta || (
            <span className="adm-empty-field">Sin respuesta</span>
          )}
        </dd>
      </dl>
    </div>
  );
}

function AdvisorAnswersModal({ group, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    closeButtonRef.current?.focus({ preventScroll: true });

    const getFocusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      window.scrollTo(0, scrollY);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  const answerCount = group.answers.length;
  const answerLabel =
    answerCount === 1 ? "1 respuesta" : `${answerCount} respuestas`;

  const modal = (
    <div
      className="adm-modal-backdrop adm-modal-backdrop--answers"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="adm-modal adm-modal--answers"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advisor-answers-title"
      >
        <div className="adm-modal__head adm-answers-modal__head">
          <div className="adm-answers-modal__heading">
            <span className="adm-eyebrow">Respuestas relevadas</span>
            <h2 id="advisor-answers-title" className="adm-modal__title">
              {group.title}
            </h2>
            <p className="adm-answers-modal__count">{answerLabel}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="adm-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar respuestas relevadas"
          >
            ×
          </button>
        </div>

        <div className="adm-modal__body adm-answers-modal__body">
          <section
            className="adm-answers-modal__story"
            aria-label="Historia de usuario consultada"
          >
            <span className="adm-advisor__field-label">
              Descripción de la HU
            </span>
            <p>
              {group.description || (
                <span className="adm-empty-field">
                  La historia no tiene descripción registrada.
                </span>
              )}
            </p>
            <div className="adm-answers-modal__meta">
              {group.estado && (
                <span className="adm-advisor__state">
                  {formatLabel(group.estado)}
                </span>
              )}
              {group.etapa && <span>Etapa: {group.etapa}</span>}
              {group.id && !group.unmatched && <span>ID: {group.id}</span>}
            </div>
          </section>

          {answerCount > 0 ? (
            <div className="adm-answers-modal__list">
              {group.answers.map((answer, index) => (
                <AnswerBlock
                  answer={answer}
                  index={index}
                  key={`${answer.historiaId || "answer"}-${answer.aspecto || index}-${index}`}
                />
              ))}
            </div>
          ) : (
            <p className="adm-empty-field">
              Esta historia todavía no tiene preguntas relevadas.
            </p>
          )}
        </div>

        <div className="adm-modal__foot adm-answers-modal__foot">
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default AdvisorAnswersModal;
