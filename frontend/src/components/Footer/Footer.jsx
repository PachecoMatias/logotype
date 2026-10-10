import { Stagger, StaggerItem } from '../../motion/Reveal.jsx'

function Footer() {
  return (
    <footer className="site-footer">
      <Stagger className="site-shell site-footer__inner" stagger={0.1} delayChildren={0.08} viewport>
        <StaggerItem mode="rise" className="site-footer__brand">
          LOGO<span>/TYPE</span>
        </StaggerItem>
        <StaggerItem mode="rise" className="site-footer__copy">
          <p>Soluciones informáticas para empresas y comercios.</p>
          <p>Proyecto Integrador 2026 — UTN FRT</p>
        </StaggerItem>
        <StaggerItem as="a" mode="rise" className="site-footer__return" href="#inicio" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          Volver al inicio ↑
        </StaggerItem>
      </Stagger>
    </footer>
  )
}

export default Footer
