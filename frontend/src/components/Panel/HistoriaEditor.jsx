import { useState } from 'react'
import { actualizarHistoria } from '../../utils/api.js'

const ESTIMACIONES = [1, 2, 3, 5, 8, 13, 21]
const PRIORIDADES = ['Alta', 'Media', 'Baja']
const ROLES = [
  'Frontend',
  'Backend',
  'QA',
  'Ciberseguridad',
  'Analista de requerimientos',
  'Project Manager',
]

function valoresIniciales(historia) {
  return {
    historia_usuario: historia.historia_usuario || '',
    descripcion: historia.descripcion || '',
    criterios_aceptacion: (historia.criterios_aceptacion || []).join('\n'),
    alcance_tecnico: historia.alcance_tecnico || '',
    estimacion_fibonacci: historia.estimacion_fibonacci || 1,
    prioridad: historia.prioridad || 'Media',
    rol_sugerido: historia.rol_sugerido || 'Frontend',
  }
}

function HistoriaEditor({ historia, onSaved, onCancel }) {
  const [valores, setValores] = useState(() => valoresIniciales(historia))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const fieldId = (nombre) => `historia-${historia.id}-${nombre}`

  const cambiar = (campo) => (event) => {
    setValores((actuales) => ({ ...actuales, [campo]: event.target.value }))
  }

  const guardar = async (event) => {
    event.preventDefault()
    if (guardando) return

    setGuardando(true)
    setError('')

    try {
      const actualizada = await actualizarHistoria(historia.id, {
        ...valores,
        criterios_aceptacion: valores.criterios_aceptacion
          .split('\n')
          .map((criterio) => criterio.trim())
          .filter(Boolean),
        estimacion_fibonacci: Number(valores.estimacion_fibonacci),
      })
      onSaved(actualizada)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la historia.')
      setGuardando(false)
    }
  }

  return (
    <form className="historia-editor" onSubmit={guardar}>
      <div className="form-group">
        <label htmlFor={fieldId('historia_usuario')}>Historia de usuario</label>
        <textarea
          id={fieldId('historia_usuario')}
          className="form-control"
          value={valores.historia_usuario}
          onChange={cambiar('historia_usuario')}
          disabled={guardando}
          autoFocus
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('descripcion')}>Descripción</label>
        <textarea
          id={fieldId('descripcion')}
          className="form-control"
          value={valores.descripcion}
          onChange={cambiar('descripcion')}
          disabled={guardando}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('criterios_aceptacion')}>Criterios de aceptación</label>
        <textarea
          id={fieldId('criterios_aceptacion')}
          className="form-control"
          value={valores.criterios_aceptacion}
          onChange={cambiar('criterios_aceptacion')}
          disabled={guardando}
          aria-describedby={fieldId('criterios-ayuda')}
          required
        />
        <p className="field-hint" id={fieldId('criterios-ayuda')}>
          Escribí un criterio por línea.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor={fieldId('alcance_tecnico')}>Alcance técnico</label>
        <textarea
          id={fieldId('alcance_tecnico')}
          className="form-control"
          value={valores.alcance_tecnico}
          onChange={cambiar('alcance_tecnico')}
          disabled={guardando}
          required
        />
      </div>

      <div className="historia-editor-selects">
        <div className="form-group">
          <label htmlFor={fieldId('estimacion_fibonacci')}>Estimación Fibonacci</label>
          <select
            id={fieldId('estimacion_fibonacci')}
            className="form-control"
            value={valores.estimacion_fibonacci}
            onChange={cambiar('estimacion_fibonacci')}
            disabled={guardando}
          >
            {ESTIMACIONES.map((estimacion) => (
              <option key={estimacion} value={estimacion}>{estimacion}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={fieldId('prioridad')}>Prioridad</label>
          <select
            id={fieldId('prioridad')}
            className="form-control"
            value={valores.prioridad}
            onChange={cambiar('prioridad')}
            disabled={guardando}
          >
            {PRIORIDADES.map((prioridad) => (
              <option key={prioridad} value={prioridad}>{prioridad}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={fieldId('rol_sugerido')}>Rol sugerido</label>
          <select
            id={fieldId('rol_sugerido')}
            className="form-control"
            value={valores.rol_sugerido}
            onChange={cambiar('rol_sugerido')}
            disabled={guardando}
          >
            {ROLES.map((rol) => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="historia-editor-error" role="alert">{error}</p>}

      <div className="historia-editor-actions">
        <button className="btn btn-primary" type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button className="btn btn-outline" type="button" onClick={onCancel} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default HistoriaEditor
