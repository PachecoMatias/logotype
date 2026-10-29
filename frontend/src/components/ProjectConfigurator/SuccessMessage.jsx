function SuccessMessage({ onRestart }) {
  return (
    <section
      className="cfg-success adv-screen adv-success"
      aria-labelledby="adv-success-title"
    >
      <div className="cfg-success__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <path
            d="M12 25.5 20.5 34 37 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>

      <h1 id="adv-success-title">¡Proyecto recibido!</h1>
      <p>
        Gracias por confiar en Logotype. Recibimos la información de tu proyecto
        y nuestro equipo analizará tus necesidades para preparar una propuesta
        personalizada.
      </p>

      <button
        className="adv-button adv-button--primary"
        type="button"
        onClick={onRestart}
      >
        Cargar otro proyecto <span aria-hidden="true">→</span>
      </button>
    </section>
  )
}

export default SuccessMessage
