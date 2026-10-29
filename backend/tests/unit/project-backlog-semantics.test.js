import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseBacklogMetadata,
  validateProjectBacklogSemantics,
} from '../../src/services/backlog-semantics.js';

const advisorPayload = {
  asesoramiento: {
    historias: [
      {
        id: 'hu-wide',
        texto: 'Como cajero, quiero registrar ventas para agilizar la atención.',
        estado: 'entendida',
        aDetallar: false,
      },
      {
        id: 'hu-simple',
        texto: 'Como gerente, quiero consultar el historial diario, para revisar las ventas.',
        estado: 'con_pendientes',
        aDetallar: false,
      },
      {
        id: 'hu-assumed',
        texto: 'Como cliente, quiero pagar con criptomonedas.',
        estado: 'supuesta',
        aDetallar: true,
      },
      {
        id: 'hu-open',
        texto: 'Como operador, quiero configurar promociones.',
        estado: 'a_completar',
        aDetallar: true,
      },
    ],
  },
};

function createCard({
  title,
  type = 'historia_usuario',
  origin = 'derivada_ia',
  parent = 'hu-wide',
  approval = 'aprobada',
}) {
  return {
    fase: 'Desarrollo Backend',
    prioridad: 'Alta',
    historia_usuario: title,
    descripcion: `[BACKLOG tipo=${type}; origen=${origin}; padre=${parent}; aprobacion=${approval}] Descripción verificable.`,
    criterios_aceptacion: ['El resultado puede verificarse.'],
    alcance_tecnico: 'Implementación acotada.',
    estimacion_fibonacci: 3,
    rol_sugerido: 'Backend',
  };
}

function createValidAdvisorBacklog() {
  return [
    createCard({
      title: 'Como cajero, quiero registrar productos y cantidades, para completar una venta.',
    }),
    createCard({
      title: 'Como cajero, quiero calcular el total de la venta, para cobrar el importe correcto.',
    }),
    createCard({
      title: 'Como cajero, quiero registrar el medio de pago, para completar el cobro.',
    }),
    createCard({
      title: advisorPayload.asesoramiento.historias[1].texto,
      origin: 'cliente',
      parent: 'hu-simple',
    }),
    createCard({ title: 'Crear endpoint de ventas', type: 'tarea_tecnica', origin: 'tecnica' }),
    createCard({
      title: 'Persistir detalle de venta',
      type: 'tarea_tecnica',
      origin: 'tecnica',
    }),
    createCard({
      title: 'Asegurar transacción venta-stock',
      type: 'tarea_tecnica',
      origin: 'tecnica',
    }),
    createCard({
      title: 'Agregar validaciones de venta',
      type: 'tarea_tecnica',
      origin: 'tecnica',
    }),
    createCard({ title: 'Probar flujo de venta', type: 'tarea_tecnica', origin: 'tecnica' }),
    createCard({
      title: 'Investigar conciliación del medio de pago',
      type: 'spike',
      origin: 'tecnica',
    }),
    createCard({
      title: 'Implementar consulta diaria',
      type: 'tarea_tecnica',
      origin: 'tecnica',
      parent: 'hu-simple',
    }),
    createCard({
      title: 'Como cliente, quiero pagar con criptomonedas, para ampliar las opciones de pago.',
      parent: 'hu-assumed',
      approval: 'propuesta',
    }),
  ];
}

test('accepts decomposition, a retained simple story, technical work, a justified spike, and a separated proposal', () => {
  const backlog = createValidAdvisorBacklog();
  const result = validateProjectBacklogSemantics(backlog, advisorPayload);

  assert.deepEqual(result, { success: true, issues: [] });
  assert.equal(
    backlog.filter(
      (card) =>
        parseBacklogMetadata(card.descripcion)?.padre === 'hu-wide' &&
        parseBacklogMetadata(card.descripcion)?.tipo === 'historia_usuario',
    ).length,
    3,
  );
  assert.equal(
    backlog.filter((card) => parseBacklogMetadata(card.descripcion)?.tipo === 'tarea_tecnica')
      .length,
    6,
  );
  assert.equal(parseBacklogMetadata(backlog.at(-1).descripcion)?.aprobacion, 'propuesta');
});

test('rejects duplicates, approved scope from unconfirmed stories, missing traceability, and fake developer stories', () => {
  const cases = [
    (backlog) => {
      backlog[1].historia_usuario = backlog[0].historia_usuario.toUpperCase();
    },
    (backlog) => {
      backlog[0].descripcion = backlog[0].descripcion.replace('padre=hu-wide', 'padre=hu-open');
    },
    (backlog) => {
      backlog[0].descripcion = 'Descripción sin metadata.';
    },
    (backlog) => {
      backlog[4].historia_usuario = 'Como desarrollador, quiero crear un endpoint.';
    },
  ];

  for (const mutate of cases) {
    const backlog = createValidAdvisorBacklog();
    mutate(backlog);
    assert.equal(validateProjectBacklogSemantics(backlog, advisorPayload).success, false);
  }
});

test('does not impose advisor metadata on legacy projects', () => {
  const backlog = [createCard({ title: 'Legacy item' })].map((card) => ({
    ...card,
    descripcion: 'Legacy description without metadata.',
  }));

  assert.deepEqual(validateProjectBacklogSemantics(backlog, { proyecto: { tipo: 'web' } }), {
    success: true,
    issues: [],
  });
});

test('treats a legacy client-edited story as confirmed source truth', () => {
  const payload = {
    asesoramiento: {
      historias: [
        {
          id: 'hu-edited',
          texto: 'Como cajero, quiero registrar ventas, para controlar los ingresos.',
          estado: 'editada_cliente',
          bloqueada: true,
          aDetallar: false,
        },
      ],
    },
  };
  const backlog = [
    createCard({
      title: 'Como cajero, quiero registrar ventas, para controlar los ingresos.',
      origin: 'cliente',
      parent: 'hu-edited',
    }),
    createCard({
      title: 'Crear endpoint de ventas',
      type: 'tarea_tecnica',
      origin: 'tecnica',
      parent: 'hu-edited',
    }),
  ];

  assert.deepEqual(validateProjectBacklogSemantics(backlog, payload), {
    success: true,
    issues: [],
  });
});

test('accepts functional user stories while technical tasks and spikes keep direct titles', () => {
  const backlog = createValidAdvisorBacklog();
  backlog[0].historia_usuario =
    'Como administrador, quiero enviar recordatorios de turnos, para reducir las ausencias de los clientes.';
  backlog[4].historia_usuario = 'Como configurar índices para las consultas de ventas';
  backlog[9].historia_usuario = 'Investigar estrategia de concurrencia para actualizar stock';

  assert.deepEqual(validateProjectBacklogSemantics(backlog, advisorPayload), {
    success: true,
    issues: [],
  });
});

test('rejects malformed functional stories and fake technical user stories with explicit rules', () => {
  const observedFunctionalTitle = createValidAdvisorBacklog();
  observedFunctionalTitle[0].historia_usuario =
    'Envío Directo de Recordatorios de Turno por WhatsApp';
  const observedTitleResult = validateProjectBacklogSemantics(
    observedFunctionalTitle,
    advisorPayload,
  );

  assert.equal(observedTitleResult.success, false);
  assert.ok(
    observedTitleResult.issues.some(
      (issue) => issue.semantic?.rule === 'functional_user_story_required',
    ),
  );

  const malformedFunctional = createValidAdvisorBacklog();
  malformedFunctional[0].historia_usuario = '  Como   cajero, quiero registrar ventas  ';
  const malformedResult = validateProjectBacklogSemantics(malformedFunctional, advisorPayload);
  const malformedIssue = malformedResult.issues.find(
    (issue) => issue.semantic?.rule === 'functional_user_story_required',
  );

  assert.equal(malformedResult.success, false);
  assert.equal(malformedIssue.path.join('.'), '0.historia_usuario');
  assert.equal(malformedIssue.semantic.receivedValue, '  Como   cajero, quiero registrar ventas  ');
  assert.equal(malformedIssue.semantic.normalizedValue, 'Como cajero, quiero registrar ventas');

  const incompleteFunctional = createValidAdvisorBacklog();
  incompleteFunctional[0].historia_usuario = 'Como cajero, quiero vender libros';
  const incompleteResult = validateProjectBacklogSemantics(incompleteFunctional, advisorPayload);

  assert.equal(incompleteResult.success, false);
  assert.ok(
    incompleteResult.issues.some(
      (issue) =>
        issue.path.join('.') === '0.historia_usuario' &&
        issue.semantic?.rule === 'functional_user_story_required',
    ),
  );

  const fakeTechnicalStory = createValidAdvisorBacklog();
  fakeTechnicalStory[4].historia_usuario =
    'Como desarrollador, quiero crear un endpoint para registrar ventas.';
  const fakeTechnicalResult = validateProjectBacklogSemantics(fakeTechnicalStory, advisorPayload);

  assert.equal(fakeTechnicalResult.success, false);
  assert.ok(
    fakeTechnicalResult.issues.some(
      (issue) =>
        issue.path.join('.') === '4.historia_usuario' &&
        issue.semantic?.rule === 'technical_user_story_forbidden',
    ),
  );

  const garbageTechnical = createValidAdvisorBacklog();
  garbageTechnical[4].historia_usuario = '...';
  const garbageTechnicalResult = validateProjectBacklogSemantics(garbageTechnical, advisorPayload);

  assert.equal(garbageTechnicalResult.success, false);
  assert.ok(
    garbageTechnicalResult.issues.some(
      (issue) =>
        issue.path.join('.') === '4.historia_usuario' &&
        issue.semantic?.rule === 'technical_title_required',
    ),
  );
});

test('keeps traceability and proposal boundaries explicit', () => {
  const missingTraceability = createValidAdvisorBacklog();
  missingTraceability[0].descripcion = missingTraceability[0].descripcion.replace(
    'padre=hu-wide',
    'padre=hu-missing',
  );
  const missingResult = validateProjectBacklogSemantics(missingTraceability, advisorPayload);

  assert.equal(missingResult.success, false);
  assert.ok(
    missingResult.issues.some(
      (issue) =>
        issue.semantic?.rule === 'unknown_parent' && issue.semantic?.parent === 'hu-missing',
    ),
  );

  const valid = createValidAdvisorBacklog();
  const proposal = parseBacklogMetadata(valid.at(-1).descripcion);
  assert.equal(proposal?.aprobacion, 'propuesta');
  assert.equal(proposal?.padre, 'hu-assumed');
  assert.deepEqual(validateProjectBacklogSemantics(valid, advisorPayload), {
    success: true,
    issues: [],
  });
});

test('accepts Librería Norte retained stories with harmless punctuation variation', () => {
  const libraryPayload = {
    asesoramiento: {
      historias: [
        {
          id: 'hu-ventas',
          texto:
            'Como vendedor o administrador, quiero registrar las ventas de libros en el sistema web, para agilizar la atención, evitar errores de cobro y controlar las ventas del día.',
          estado: 'entendida',
        },
        {
          id: 'hu-stock',
          texto:
            'Como administrador o vendedor, quiero controlar el stock de libros, para evitar faltantes y mantener actualizado el inventario.',
          estado: 'entendida',
        },
        {
          id: 'hu-alertas',
          texto:
            'Como administrador, quiero recibir alertas de stock mínimo de libros, para reponer ejemplares a tiempo.',
          estado: 'entendida',
        },
        {
          id: 'hu-propuesta',
          texto: 'Como administrador, quiero pronosticar demanda, para anticipar compras.',
          estado: 'supuesta',
          aDetallar: true,
        },
      ],
    },
  };
  const retained = libraryPayload.asesoramiento.historias.slice(0, 3).map((story) =>
    createCard({
      title: story.texto.replace(/[,.]/g, (character) => (character === ',' ? ' ' : '')),
      origin: 'cliente',
      parent: story.id,
    }),
  );
  const backlog = [
    retained[0],
    createCard({
      title: 'Implementar persistencia transaccional de ventas',
      type: 'tarea_tecnica',
      origin: 'tecnica',
      parent: 'hu-ventas',
    }),
    retained[1],
    createCard({
      title: 'Sincronizar stock al confirmar una venta',
      type: 'tarea_tecnica',
      origin: 'tecnica',
      parent: 'hu-stock',
    }),
    retained[2],
    createCard({
      title: 'Investigar el canal de entrega de alertas',
      type: 'spike',
      origin: 'tecnica',
      parent: 'hu-alertas',
    }),
    createCard({
      title: 'Como administrador, quiero pronosticar demanda, para anticipar compras.',
      parent: 'hu-propuesta',
      approval: 'propuesta',
    }),
  ];

  assert.deepEqual(validateProjectBacklogSemantics(backlog, libraryPayload), {
    success: true,
    issues: [],
  });
});
