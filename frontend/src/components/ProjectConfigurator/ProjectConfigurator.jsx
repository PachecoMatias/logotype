import { useEffect, useMemo, useState } from "react";
import { featuresList, initialProjectData } from "../../data/projectOptions.js";
import { createProject, requestAdvisorRound } from "../../utils/api.js";
import { buildAdvisorProjectPayload } from "../../utils/asesorPayload.js";
import { validateAdvisorStart } from "../../utils/validation.js";
import {
  acceptSuggestion as acceptSuggestionState,
  addFeatureStory,
  addManualStory,
  applyIntegratedAnswers,
  buildAdvisorRoundState,
  deleteStory,
  editStory,
  getRelatedFeatures,
  mergeAdvisorHistories,
  rememberShownSuggestions,
  rejectSuggestion as rejectSuggestionState,
} from "../../utils/advisorState.js";
import AdvisorConfirmation from "./AdvisorConfirmation.jsx";
import AdvisorFinalDetails from "./AdvisorFinalDetails.jsx";
import AdvisorStart from "./AdvisorStart.jsx";
import AdvisorWorkspace from "./AdvisorWorkspace.jsx";
import SuccessMessage from "./SuccessMessage.jsx";

const emptyInitialData = {
  funcionalidades: [],
  otraFuncionalidad: "",
  otrasFuncionalidades: [],
  plataformas: [],
  tiposUsuario: [],
  tiposUsuarioOtro: "",
  cantidadUsuarios: "",
  procesoActual: "",
  tipoProyecto: "",
};

const emptyRound = {
  renderId: "round-initial",
  foco: null,
  preguntas: [],
  sugerencias: [],
  objetivos: [],
  integradas: [],
  degradado: false,
  motivoDegradado: null,
  progreso: { detalladas: 0, total: 0, completas: 0, tope: 6 },
  completo: false,
  motivoCierre: null,
};

const emptyFinalData = {
  empresa: { ...initialProjectData.empresa },
  presupuesto: { ...initialProjectData.presupuesto },
};

function createSessionId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `asesor-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function createLocalId(prefix = "hu") {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function isAdvisorFallback(error) {
  return (
    error.isNetworkError ||
    error.status === 429 ||
    error.status === 503 ||
    error.code === "ADVISOR_UNAVAILABLE"
  );
}

function ProjectConfigurator() {
  const [screen, setScreen] = useState("start");
  const [sessionId, setSessionId] = useState(createSessionId);
  const [idea, setIdea] = useState("");
  const [initialData, setInitialData] = useState(emptyInitialData);
  const [histories, setHistories] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState([]);
  const [shownSuggestions, setShownSuggestions] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [suggestionFeedback, setSuggestionFeedback] = useState(null);
  const [round, setRound] = useState(emptyRound);
  const [rounds, setRounds] = useState(0);
  const [withoutAdvisor, setWithoutAdvisor] = useState(false);
  const [startErrors, setStartErrors] = useState({});
  const [advisorError, setAdvisorError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [finalData, setFinalData] = useState(emptyFinalData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedCatalogFeatures = initialData.funcionalidades.filter(
    (item) => item !== "Otra",
  );
  const relatedFeatures = useMemo(() => {
    const related = getRelatedFeatures(selectedCatalogFeatures);
    if (related.length) return related;
    return featuresList
      .filter(
        (item) => item !== "Otra" && !selectedCatalogFeatures.includes(item),
      )
      .slice(0, 6);
  }, [selectedCatalogFeatures]);

  const hasProgress = Boolean(idea.trim() || histories.length || rounds);

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!hasProgress || submitted) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasProgress, submitted]);

  const buildRoundState = (
    stateAnswers = answers,
    stateHistories = histories,
  ) =>
    buildAdvisorRoundState({
      idea,
      initialData,
      selectedCatalogFeatures,
      histories: stateHistories,
      answers: stateAnswers,
      rejectedSuggestions,
      shownSuggestions,
      objectives,
    });

  const runRound = async ({
    closing = false,
    stateAnswers = answers,
    stateHistories = histories,
  } = {}) => {
    setLoading(true);
    setAdvisorError(null);
    setSuggestionFeedback(null);

    try {
      const data = await requestAdvisorRound({
        sesionId: sessionId,
        cerrar: closing,
        estado: buildRoundState(stateAnswers, stateHistories),
      });
      setAnswers((current) => applyIntegratedAnswers(current, data.integradas));
      setHistories((current) => mergeAdvisorHistories(current, data.historias));
      setShownSuggestions((current) =>
        rememberShownSuggestions(current, data.sugerencias || []),
      );
      setObjectives(data.objetivos || []);
      setRound({ ...data, renderId: createLocalId("round") });
      setRounds((current) => current + 1);
      setScreen(data.completo ? "confirmation" : "advisor");
    } catch (error) {
      setAdvisorError({
        message: error.message,
        canFallback: isAdvisorFallback(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const start = (event) => {
    event.preventDefault();
    const errors = validateAdvisorStart({
      idea,
      ...initialData,
    });
    setStartErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    runRound();
  };

  const updateInitialData = (data) => {
    setInitialData(data);
    setStartErrors((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(validateAdvisorStart({ idea, ...data })).map(([key, value]) => [
          key,
          current[key] ? value : "",
        ]),
      ),
    }));
  };

  const submitAnswers = (newAnswers) => {
    const nextAnswers = [...answers, ...newAnswers];
    setAnswers(nextAnswers);
    runRound({ stateAnswers: nextAnswers });
  };

  const acceptSuggestion = (suggestion) => {
    const result = acceptSuggestionState(
      { histories, acceptedSuggestions, round },
      suggestion,
      () => createLocalId("hu"),
    );
    setHistories(result.histories);
    setAcceptedSuggestions(result.acceptedSuggestions);
    setSuggestionFeedback(result.feedback);
    setRound(result.round);
  };

  const rejectSuggestion = (suggestion) => {
    const result = rejectSuggestionState(
      { rejectedSuggestions, round },
      suggestion,
    );
    setRejectedSuggestions(result.rejectedSuggestions);
    setSuggestionFeedback(null);
    setRound(result.round);
  };

  const addStory = (text) => {
    const result = addManualStory(histories, text, () => createLocalId("hu"));
    setHistories(result.histories);
    setRound((current) => ({ ...current, completo: false }));
  };

  const addFeature = (feature, isCustom) => {
    const result = addFeatureStory(histories, feature, () =>
      createLocalId("hu"),
    );
    setHistories(result.histories);
    setInitialData((current) => ({
      ...current,
      funcionalidades: isCustom
        ? [...new Set([...current.funcionalidades, "Otra"])]
        : [...new Set([...current.funcionalidades, feature])],
      otraFuncionalidad:
        isCustom && !current.otraFuncionalidad.trim()
          ? feature
          : current.otraFuncionalidad,
      otrasFuncionalidades: isCustom
        ? current.otraFuncionalidad.trim()
          ? [...new Set([...current.otrasFuncionalidades, feature])]
          : current.otrasFuncionalidades
        : current.otrasFuncionalidades,
    }));
    setRound((current) => ({ ...current, completo: false }));
  };

  const updateStory = (storyId, text) => {
    const result = editStory(histories, answers, storyId, text);
    setHistories(result.histories);
    setAnswers(result.answers);
    setRound((current) => ({ ...current, completo: false }));
  };

  const removeStory = (storyId) => {
    if (
      !window.confirm(
        "¿Querés eliminar esta historia? Esta acción no se puede deshacer.",
      )
    )
      return;
    const result = deleteStory(histories, answers, storyId);
    setHistories(result.histories);
    setAnswers(result.answers);
    setRound((current) => ({ ...current, completo: false }));
  };

  const continueWithoutAdvisor = () => {
    setWithoutAdvisor(true);
    setAdvisorError(null);
    setScreen("details");
  };

  const submitProject = async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = buildAdvisorProjectPayload({
        idea,
        initialData,
        histories,
        answers,
        acceptedSuggestions,
        rejectedSuggestions,
        complete: round.completo,
        rounds,
        withoutAdvisor,
        finalData,
        objectives,
      });
      await createProject(payload);
      setSubmitted(true);
      setScreen("success");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setScreen("start");
    setSessionId(createSessionId());
    setIdea("");
    setInitialData(emptyInitialData);
    setHistories([]);
    setAnswers([]);
    setAcceptedSuggestions([]);
    setRejectedSuggestions([]);
    setShownSuggestions([]);
    setObjectives([]);
    setSuggestionFeedback(null);
    setRound(emptyRound);
    setRounds(0);
    setWithoutAdvisor(false);
    setStartErrors({});
    setAdvisorError(null);
    setFinalData(emptyFinalData);
    setSubmitError("");
    setSubmitted(false);
  };

  const getViewEnterClass = () => {
    if (screen === "start") return "adv-view-enter";
    if (screen === "advisor") return "adv-view-enter adv-view-enter--forward";
    if (screen === "confirmation") return "adv-view-enter";
    if (screen === "details") return "adv-view-enter";
    if (screen === "success") return "adv-view-enter";
    return "adv-view-enter";
  };

  return (
    <main id="configurador" className="cfg-main adv-main">
      <div className="cfg-container adv-shell">
        <div className={getViewEnterClass()} key={screen}>
          {screen === "start" && (
            <AdvisorStart
              key="start"
              idea={idea}
              data={initialData}
              errors={startErrors}
              advisorError={advisorError}
              loading={loading}
              onIdeaChange={setIdea}
              onDataChange={updateInitialData}
              onStart={start}
              onRetry={() => runRound()}
              onFallback={continueWithoutAdvisor}
            />
          )}
          {screen === "advisor" && (
            <AdvisorWorkspace
              key={`advisor-${round.renderId}`}
              histories={histories}
              round={round}
              loading={loading}
              advisorError={advisorError}
              relatedFeatures={relatedFeatures}
              suggestionFeedback={suggestionFeedback}
              onSubmitAnswers={submitAnswers}
              onRetry={() => runRound()}
              onFallback={continueWithoutAdvisor}
              onAcceptSuggestion={acceptSuggestion}
              onRejectSuggestion={rejectSuggestion}
              onEditStory={updateStory}
              onDeleteStory={removeStory}
              onAddStory={addStory}
              onAddFeature={addFeature}
              onClose={() => runRound({ closing: true })}
            />
          )}
          {screen === "confirmation" && (
            <AdvisorConfirmation
              key="confirmation"
              histories={histories}
              objectives={objectives}
              onConfirm={() => setScreen("details")}
              onAdjust={() => setScreen("advisor")}
            />
          )}
          {screen === "details" && (
            <AdvisorFinalDetails
              key="details"
              finalData={finalData}
              submitting={submitting}
              submitError={submitError}
              onFinalDataChange={setFinalData}
              onSubmit={submitProject}
            />
          )}
          {screen === "success" && (
            <SuccessMessage key="success" onRestart={restart} />
          )}
        </div>
      </div>
    </main>
  );
}

export default ProjectConfigurator;
