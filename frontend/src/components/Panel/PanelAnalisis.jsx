import { useEffect, useState } from "react";
import { apiRequest } from "../../utils/api.js";
import "../../styles/panel.css";
import AnalisisIA from "./AnalisisIA.jsx";

function PanelAnalisis({ projectId, onBack }) {
  const [proyecto, setProyecto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const project = await apiRequest(`/api/proyectos/${projectId}`);
        if (!cancelled) setProyecto(project);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.message || "No pudimos cargar la opinión de la IA.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!projectId) {
      setLoading(false);
      setError("No se indicó un proyecto.");
      return () => {
        cancelled = true;
      };
    }

    loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    setAnalysisError(null);
    try {
      const analysis = await apiRequest(
        `/api/proyectos/${projectId}/analizar`,
        {
          method: "POST",
        },
      );
      setProyecto((current) =>
        current ? { ...current, analisisIa: analysis } : current,
      );
    } catch (requestError) {
      setAnalysisError(
        requestError.message || "No pudimos actualizar la opinión de la IA.",
      );
    } finally {
      setReanalyzing(false);
    }
  };

  const companyName = proyecto?.payload?.empresa?.nombreEmpresa;
  const canReanalyze = proyecto?.estado === "analizado";

  return (
    <section className="adm-section adm-analysis-view">
      <div className="adm-container">
        <button
          type="button"
          className="adm-btn adm-btn--ghost adm-btn--sm adm-back"
          onClick={onBack}
        >
          ← Volver al proyecto
        </button>

        <header
          className="adm-analysis-view__head adm-enter-item"
          style={{ "--adm-enter-order": 0 }}
        >
          <div>
            <span className="adm-eyebrow">Evaluación asistida</span>
            <h2 className="adm-page-title">Opinión de la IA</h2>
            <p>
              Lectura orientativa del proyecto. La decisión final siempre es del
              administrador.
            </p>
          </div>
          {companyName && (
            <span className="adm-analysis-view__company">{companyName}</span>
          )}
        </header>

        {loading && <p className="adm-state">Cargando opinión...</p>}
        {!loading && error && (
          <p className="adm-alert adm-alert--error">{error}</p>
        )}
        {analysisError && (
          <p className="adm-alert adm-alert--error">{analysisError}</p>
        )}
        {!loading && !error && !proyecto?.analisisIa && (
          <p className="adm-state">
            Todavía no hay una opinión de IA disponible para este proyecto.
          </p>
        )}
        {!loading && !error && proyecto?.analisisIa && (
          <AnalisisIA
            analisis={proyecto.analisisIa}
            canReanalyze={canReanalyze}
            reanalyzing={reanalyzing}
            onReanalyze={handleReanalyze}
          />
        )}

        {reanalyzing && (
          <p className="adm-state">Actualizando la opinión de la IA...</p>
        )}
      </div>
    </section>
  );
}

export default PanelAnalisis;
