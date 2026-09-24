import { useState } from 'react'
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

function App() {
  // 'home' = página principal | 'configurador' = pantalla dedicada del formulario
  const [view, setView] = useState('home')

  const handleNavigate = (id) => {
    if (id === 'configurador') {
      setView('configurador')
      window.scrollTo({ top: 0 })
      return
    }

    if (view === 'configurador') {
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
    </>
  )
}

export default App