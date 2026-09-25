export function createValidProjectPayload() {
  return {
    empresa: {
      nombreEmpresa: 'Acme Commerce',
      contacto: 'Alex Rivera',
      email: 'alex@acme.example',
      telefono: '+54 11 5555 0100',
      rubro: 'Comercio',
      futureEmpresaField: 'preserved',
    },
    proyecto: {
      tipoProyecto: 'web',
      futureProyectoField: 'preserved',
    },
    problema: {
      problemaActual: 'Orders are tracked in spreadsheets.',
      procesoActual: 'The team manually copies data between tools.',
      objetivos: ['Reducir tiempos'],
      futureProblemaField: 'preserved',
    },
    funcionalidades: {
      seleccionadas: ['Gestión de pedidos'],
      futureFuncionalidadesField: 'preserved',
    },
    alcance: {
      plataformas: ['Web'],
      cantidadUsuarios: '10 - 50',
      necesitaTiposUsuario: 'No',
      futureAlcanceField: 'preserved',
    },
    presupuesto: {
      presupuesto: 'USD 1.000 - 5.000',
      plazo: '1 - 3 meses',
      futurePresupuestoField: 'preserved',
    },
    estado: 'client-value',
    futureRootField: 'preserved',
  };
}

export function createConditionalProjectPayload() {
  const payload = createValidProjectPayload();

  payload.empresa.rubro = 'Otro';
  payload.empresa.rubroOtro = 'Cooperative';
  payload.problema.objetivos = ['Otro'];
  payload.problema.objetivosOtro = 'Improve fulfilment visibility';
  payload.funcionalidades.seleccionadas = ['Otra'];
  payload.funcionalidades.otra = 'Supplier portal';
  payload.alcance.necesitaTiposUsuario = 'Sí';
  payload.alcance.tiposUsuario = ['Otro'];
  payload.alcance.tiposUsuarioOtro = 'Auditor';

  return payload;
}
