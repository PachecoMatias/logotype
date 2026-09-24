const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmpresa(data) {
  const errors = {}

  if (!data.nombreEmpresa.trim()) errors.nombreEmpresa = 'Ingresá el nombre de tu empresa.'
  if (!data.contacto.trim()) errors.contacto = 'Ingresá una persona de contacto.'

  if (!data.email.trim()) {
    errors.email = 'Ingresá un email de contacto.'
  } else if (!emailRegex.test(data.email.trim())) {
    errors.email = 'Ingresá un email válido.'
  }

  if (!data.telefono.trim()) errors.telefono = 'Ingresá un teléfono de contacto.'
  if (!data.rubro) errors.rubro = 'Seleccioná un rubro.'
  if (data.rubro === 'Otro' && !data.rubroOtro.trim()) {
    errors.rubroOtro = 'Contanos cuál es tu rubro.'
  }

  return errors
}

export function validateProyecto(data) {
  const errors = {}
  if (!data.tipoProyecto) errors.tipoProyecto = 'Seleccioná el tipo de solución que buscás.'
  return errors
}

export function validateProblema(data) {
  const errors = {}
  if (!data.problemaActual.trim()) {
    errors.problemaActual = 'Contanos brevemente el problema que querés resolver.'
  }
  if (!data.procesoActual.trim()) {
    errors.procesoActual = 'Contanos cómo realizan este proceso actualmente.'
  }
  if (data.objetivos.length === 0) {
    errors.objetivos = 'Seleccioná al menos un objetivo.'
  }
  if (data.objetivos.includes('Otro') && !data.objetivosOtro.trim()) {
    errors.objetivosOtro = 'Contanos qué otra mejora esperás.'
  }
  return errors
}

export function validateFuncionalidades(data) {
  const errors = {}
  if (data.seleccionadas.length === 0) {
    errors.seleccionadas = 'Seleccioná al menos una funcionalidad (no es necesario tenerlas todas definidas).'
  }
  if (data.seleccionadas.includes('Otra') && !data.otra.trim()) {
    errors.otra = 'Contanos cuál es esa otra funcionalidad.'
  }
  return errors
}

export function validateAlcance(data) {
  const errors = {}
  if (data.plataformas.length === 0) errors.plataformas = 'Seleccioná al menos una plataforma.'
  if (!data.cantidadUsuarios) errors.cantidadUsuarios = 'Indicá la cantidad estimada de usuarios.'
  if (!data.necesitaTiposUsuario) {
    errors.necesitaTiposUsuario = 'Indicá si necesitás distintos tipos de usuarios.'
  }
  if (data.necesitaTiposUsuario === 'Sí' && data.tiposUsuario.length === 0) {
    errors.tiposUsuario = 'Seleccioná al menos un tipo de usuario.'
  }
  if (data.tiposUsuario.includes('Otro') && !data.tiposUsuarioOtro.trim()) {
    errors.tiposUsuarioOtro = 'Contanos cuál es ese otro tipo de usuario.'
  }
  return errors
}

export function validatePresupuesto(data) {
  const errors = {}
  if (!data.presupuesto) errors.presupuesto = 'Seleccioná un rango de presupuesto estimado.'
  if (!data.plazo) errors.plazo = 'Seleccioná un plazo esperado.'
  return errors
}
