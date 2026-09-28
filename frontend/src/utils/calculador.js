/**
 * calculador.js
 */

export const FIBONACCI_A_DIAS = {
  1: 0.5, 2: 1, 3: 1.5, 5: 2.5, 8: 4, 13: 6.5, 21: 10
};

export const EQUIPO_DEFAULT = {
  'Frontend': 3,
  'Backend': 3,
  'QA': 2,
  'Ciberseguridad': 1,
  'Analista de requerimientos': 2,
  'Project Manager': 1
};

// Instancia fechas sin desfasajes de zona horaria
function crearFechaLocal(fechaStr) {
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
      return new Date(partes[0], partes[1] - 1, partes[2]);
  }
  return new Date(fechaStr);
}

function formatearFecha(fecha) {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function moverADiaHabil(fecha) {
  const nuevaFecha = new Date(fecha.getTime());
  while (nuevaFecha.getDay() === 0 || nuevaFecha.getDay() === 6) {
    nuevaFecha.setDate(nuevaFecha.getDate() + 1);
  }
  return nuevaFecha;
}

function sumarDiasHabiles(fechaInicio, dias) {
  const fecha = new Date(fechaInicio.getTime());
  // Se descuenta 1 porque el día de inicio ya cuenta como día trabajado
  let diasASumar = Math.max(0, Math.ceil(dias) - 1);

  while (diasASumar > 0) {
    fecha.setDate(fecha.getDate() + 1);
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6) {
      diasASumar--;
    }
  }
  return fecha;
}

export function calcularCronograma(historias, fechaInicioStr, equipo = EQUIPO_DEFAULT, dependenciasFases = {}, tablaFibo = FIBONACCI_A_DIAS) {
  if (!historias || historias.length === 0) return [];

  const cronograma = [];
  const inicioProyecto = moverADiaHabil(crearFechaLocal(fechaInicioStr));

  // Disponibilidad: Arreglo de fechas donde cada índice es un integrante del rol
  const disponibilidadRol = {};
  const finDeFase = {};

  for (const [rol, cantidad] of Object.entries(equipo)) {
    disponibilidadRol[rol] = Array(cantidad).fill(new Date(inicioProyecto.getTime()));
  }

  for (const historia of historias) {
    if (!(historia.estimacion_fibonacci in tablaFibo)) {
      throw new Error(`Estimación Fibonacci inválida: ${historia.estimacion_fibonacci}`);
    }

    const rol = historia.rol_asignado;
    if (!disponibilidadRol[rol]) {
        // Fallback seguro si llega un rol inesperado
      disponibilidadRol[rol] = [new Date(inicioProyecto.getTime())];
    }

    // 1. Dependencias de fase
    let inicioPorFase = new Date(inicioProyecto.getTime());
    const fasesPrevias = dependenciasFases[historia.fase] || [];
    for (const fasePrevia of fasesPrevias) {
      if (finDeFase[fasePrevia] && finDeFase[fasePrevia] > inicioPorFase) {
        inicioPorFase = new Date(finDeFase[fasePrevia].getTime());
        inicioPorFase.setDate(inicioPorFase.getDate() + 1);
        inicioPorFase = moverADiaHabil(inicioPorFase);
      }
    }

    // 2. Disponibilidad del rol (paralelismo)
    disponibilidadRol[rol].sort((a, b) => a - b);
    const trabajadorDisponibleDesde = disponibilidadRol[rol][0];

    // La tarea inicia cuando la fase lo permite Y hay un trabajador libre
    let fechaInicioReal = new Date(Math.max(inicioPorFase, trabajadorDisponibleDesde));
    fechaInicioReal = moverADiaHabil(fechaInicioReal);

    // 3. Calcular fin saltando fines de semana
    const diasTrabajo = tablaFibo[historia.estimacion_fibonacci];
    const fechaFinReal = sumarDiasHabiles(fechaInicioReal, diasTrabajo);

    // 4. Actualizar disponibilidad del trabajador que tomó la tarea
    const proximaDisponibilidad = new Date(fechaFinReal.getTime());
    proximaDisponibilidad.setDate(proximaDisponibilidad.getDate() + 1);
    disponibilidadRol[rol][0] = moverADiaHabil(proximaDisponibilidad);

    // 5. Registrar el avance de la fase
    if (!finDeFase[historia.fase] || fechaFinReal > finDeFase[historia.fase]) {
      finDeFase[historia.fase] = fechaFinReal;
    }

    cronograma.push({
      ...historia,
      fecha_inicio: formatearFecha(fechaInicioReal),
      fecha_fin: formatearFecha(fechaFinReal)
    });
  }

  return cronograma;
}
