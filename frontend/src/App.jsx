import { useCallback, useState } from 'react'
import Header from './components/Header/Header.jsx'
import Hero from './components/Hero/Hero.jsx'
import Company from './components/Company/Company.jsx'
import Objectives from './components/Objectives/Objectives.jsx'
import OrganizationChart from './components/OrganizationChart/OrganizationChart.jsx'
import Services from './components/Services/Services.jsx'
import ProblemSolution from './components/ProblemSolution/ProblemSolution.jsx'
import SystemPrototype from './components/SystemPrototype/SystemPrototype.jsx'
import Infrastructure from './components/Infrastructure/Infrastructure.jsx'
import ProjectConfigurator from './components/ProjectConfigurator/ProjectConfigurator.jsx'
import Conclusions from './components/Conclusions/Conclusions.jsx'
import Footer from './components/Footer/Footer.jsx'
import PanelSolicitudes from './components/Panel/PanelSolicitudes.jsx'
import PanelDetalle from './components/Panel/PanelDetalle.jsx'
import PanelHistorias from './components/Panel/PanelHistorias.jsx'
import PanelTablero from './components/Panel/PanelTablero.jsx'

function App() {
  // 'home' = página principal | 'configurador' = formulario dedicado
  // 'panel-solicitudes' = listado interno (Pantalla A) | 'panel-detalle' = detalle de un proyecto (Pantalla B)
  const [view, setView] = useState('home')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [backlogsByProject, setBacklogsByProject] = useState({})

  const selectedBacklog = selectedProjectId
    ? backlogsByProject[selectedProjectId]
    : undefined

  const handleBacklogLoaded = useCallback((projectId, stories) => {
    setBacklogsByProject((current) => ({
      ...current,
      [projectId]: stories,
    }))
  }, [])

  const handleHistoriaActualizada = useCallback((projectId, actualizada) => {
    setBacklogsByProject((current) => ({
      ...current,
      [projectId]: current[projectId]?.map((historia) =>
        historia.id === actualizada.id
          ? { ...historia, ...actualizada, fase: historia.fase }
          : historia
      ),
    }))
  }, [])

  const handleNavigate = (id) => {
    if (id === 'configurador') {
      setView('configurador')
      window.scrollTo({ top: 0 })
      return
    }

    if (view !== 'home') {
      setView('home')
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
      return
    }

    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleBackHome = () => {
    setView('home')
    window.scrollTo({ top: 0 })
  }

  const handleOpenPanel = () => {
    setView('panel-solicitudes')
    window.scrollTo({ top: 0 })
  }

  const handleSelectProject = (id) => {
    setSelectedProjectId(id)
    setView('panel-detalle')
    window.scrollTo({ top: 0 })
  }

  const handleBackToPanel = () => {
    setSelectedProjectId(null)
    setView('panel-solicitudes')
    window.scrollTo({ top: 0 })
  }

  const handleViewBoard = (id) => {
    setSelectedProjectId(id)
    setView('panel-tablero')
    window.scrollTo({ top: 0 })
  }

  const handleViewStories = (id) => {
    setSelectedProjectId(id)
    setView('panel-historias')
    window.scrollTo({ top: 0 })
  }

  if (view === 'configurador') {
    return (
      <div className="configurator-standalone">
        <header className="configurator-topbar">
          <div className="container configurator-topbar-inner">
            <button className="logo configurator-topbar-logo" onClick={handleBackHome}>
              LOGO<span>TYPE</span>
            </button>
            <button className="configurator-close" onClick={handleBackHome}>
              ✕ Cerrar
            </button>
          </div>
        </header>
        <ProjectConfigurator onBack={handleBackHome} />
      </div>
    )
  }

  if (view === 'panel-solicitudes') {
    return (
      <div className="configurator-standalone panel-standalone">
        <header className="configurator-topbar">
          <div className="container configurator-topbar-inner">
            <button className="logo configurator-topbar-logo" onClick={handleBackHome}>
              LOGO<span>TYPE</span>
            </button>
            <button className="configurator-close" onClick={handleBackHome}>
              ✕ Cerrar
            </button>
          </div>
        </header>
        <PanelSolicitudes onSelectProject={handleSelectProject} />
      </div>
    )
  }

  if (view === 'panel-detalle') {
    return (
      <div className="configurator-standalone panel-standalone">
        <header className="configurator-topbar">
          <div className="container configurator-topbar-inner">
            <button className="logo configurator-topbar-logo" onClick={handleBackHome}>
              LOGO<span>TYPE</span>
            </button>
            <button className="configurator-close" onClick={handleBackHome}>
              ✕ Cerrar
            </button>
          </div>
        </header>
        <PanelDetalle
          projectId={selectedProjectId}
          historias={selectedBacklog}
          onBack={handleBackToPanel}
          onBacklogLoaded={handleBacklogLoaded}
          onViewBoard={handleViewBoard}
          onViewStories={handleViewStories}
        />
      </div>
    )
  }

  if (view === 'panel-historias') {
    return (
      <div className="configurator-standalone panel-standalone">
        <header className="configurator-topbar">
          <div className="container configurator-topbar-inner">
            <button className="logo configurator-topbar-logo" onClick={handleBackHome}>
              LOGO<span>TYPE</span>
            </button>
            <button className="configurator-close" onClick={handleBackHome}>
              ✕ Cerrar
            </button>
          </div>
        </header>
        <PanelHistorias
          historias={selectedBacklog}
          onHistoriaActualizada={(historia) =>
            handleHistoriaActualizada(selectedProjectId, historia)
          }
          onBack={() => setView('panel-detalle')}
        />
      </div>
    )
  }

  if (view === 'panel-tablero') {
    return (
      <div className="app-panel-wrapper">
        <PanelTablero
          projectId={selectedProjectId}
          historias={selectedBacklog}
          onHistoriaActualizada={(historia) =>
            handleHistoriaActualizada(selectedProjectId, historia)
          }
          onBack={() => setView('panel-detalle')}
        />
      </div>
    )
  }

  return (
    <>
      <Header onNavigate={handleNavigate} />
      <Hero onNavigate={handleNavigate} />
      <Company />
      <Objectives />
      <OrganizationChart />
      <Services />
      <ProblemSolution />
      <SystemPrototype />
      <Infrastructure />
      <Conclusions />
      <Footer />
      <button
        className="panel-fab"
        onClick={handleOpenPanel}
        title="Panel interno de solicitudes"
        aria-label="Abrir panel interno de solicitudes"
      >
        ⚙
      </button>
    </>
  )
}

export default App
