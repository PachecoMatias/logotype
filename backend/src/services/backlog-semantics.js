const confirmedAdvisorStates = new Set(['entendida', 'con_pendientes', 'editada_cliente']);
const metadataPattern =
  /^\[BACKLOG tipo=(historia_usuario|tarea_tecnica|spike); origen=(cliente|derivada_ia|tecnica); padre=([A-Za-z0-9][A-Za-z0-9._:-]{0,99}); aprobacion=(aprobada|propuesta)\]\s+(.+)$/s;

function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

function normalizeSourceStory(value) {
  return normalizeText(value)
    .normalize('NFC')
    .replace(/[,:;!?](?=\s|$)/gu, ' ')
    .replace(/[¿¡]/gu, '')
    .replace(/[.!?]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasUserStoryIntentShape(value) {
  return /^como\s+.+?(?:,\s*|\s+)(?:quiero|necesito|deseo)\s+.+$/iu.test(
    normalizeUserStoryForValidation(value),
  );
}

function hasUserStoryShape(value) {
  return /^como\s+.+?(?:,\s*|\s+)(?:quiero|necesito|deseo)\s+.+?(?:,\s*|\s+)para\s+.+$/iu.test(
    normalizeUserStoryForValidation(value),
  );
}

function normalizeUserStoryForValidation(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function hasMeaningfulTechnicalTitle(value) {
  const words = value.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.length >= 2 && words.join('').length >= 6;
}

function createIssue(
  path,
  message,
  { index = null, metadata = null, rule, field, receivedValue, normalizedValue } = {},
) {
  return {
    code: 'custom',
    path,
    message,
    semantic: {
      index: Number.isInteger(index) ? index : null,
      cardType: metadata?.tipo ?? null,
      rule,
      origin: metadata?.origen ?? null,
      parent: metadata?.padre ?? null,
      field: field ?? (typeof path.at(-1) === 'string' ? path.at(-1) : null),
      ...(typeof receivedValue === 'string' ? { receivedValue } : {}),
      ...(typeof normalizedValue === 'string' ? { normalizedValue } : {}),
    },
  };
}

function getReceivedStoryValue(rawBacklog, card, index) {
  const rawValue = rawBacklog?.[index]?.historia_usuario;
  return typeof rawValue === 'string' ? rawValue : card.historia_usuario;
}

export function getAdvisorBacklogSources(payload) {
  const stories = Array.isArray(payload?.asesoramiento?.historias)
    ? payload.asesoramiento.historias.filter(
        (story) =>
          typeof story?.id === 'string' &&
          story.id.trim() &&
          typeof story?.texto === 'string' &&
          story.texto.trim(),
      )
    : [];
  const confirmed = [];
  const unconfirmed = [];

  for (const story of stories) {
    const hasCurrentState = typeof story.estado === 'string' && story.estado.trim();
    const isConfirmed = hasCurrentState
      ? confirmedAdvisorStates.has(story.estado)
      : story.aDetallar !== true;
    (isConfirmed ? confirmed : unconfirmed).push(story);
  }

  return { all: stories, confirmed, unconfirmed };
}

export function parseBacklogMetadata(description) {
  if (typeof description !== 'string') return null;
  const match = description.match(metadataPattern);
  if (!match) return null;

  return {
    tipo: match[1],
    origen: match[2],
    padre: match[3],
    aprobacion: match[4],
    descripcion: match[5].trim(),
  };
}

export function validateProjectBacklogSemantics(backlog, payload, { rawBacklog = backlog } = {}) {
  const sources = getAdvisorBacklogSources(payload);
  if (sources.all.length === 0) return { success: true, issues: [] };

  const issues = [];
  const knownById = new Map(sources.all.map((story) => [story.id, story]));
  const confirmedIds = new Set(sources.confirmed.map((story) => story.id));
  const coveredConfirmedIds = new Set();
  const seenTitles = new Map();
  let approvedTechnicalTasks = 0;

  backlog.forEach((card, index) => {
    const metadata = parseBacklogMetadata(card.descripcion);
    const normalizedTitle = normalizeText(card.historia_usuario);
    const receivedStoryValue = getReceivedStoryValue(rawBacklog, card, index);
    const duplicateIndex = seenTitles.get(normalizedTitle);
    if (duplicateIndex !== undefined) {
      issues.push(
        createIssue(
          [index, 'historia_usuario'],
          `Duplicate backlog title also used at index ${duplicateIndex}`,
          {
            index,
            metadata,
            rule: 'duplicate_title',
            receivedValue: receivedStoryValue,
            normalizedValue: normalizedTitle,
          },
        ),
      );
    } else {
      seenTitles.set(normalizedTitle, index);
    }

    if (!metadata) {
      issues.push(
        createIssue([index, 'descripcion'], 'Missing or invalid backlog metadata', {
          index,
          rule: 'invalid_metadata',
        }),
      );
      return;
    }

    const parent = knownById.get(metadata.padre);
    if (!parent) {
      issues.push(
        createIssue([index, 'descripcion'], 'Unknown parent advisor story', {
          index,
          metadata,
          rule: 'unknown_parent',
        }),
      );
      return;
    }

    if (metadata.aprobacion === 'aprobada' && !confirmedIds.has(metadata.padre)) {
      issues.push(
        createIssue(
          [index, 'descripcion'],
          'Unconfirmed advisor stories cannot create approved scope',
          { index, metadata, rule: 'unconfirmed_approved_scope' },
        ),
      );
    }

    if (metadata.tipo === 'historia_usuario') {
      if (!['cliente', 'derivada_ia'].includes(metadata.origen)) {
        issues.push(
          createIssue([index, 'descripcion'], 'Functional stories need a functional origin', {
            index,
            metadata,
            rule: 'functional_origin_required',
          }),
        );
      }
      if (!hasUserStoryShape(card.historia_usuario)) {
        issues.push(
          createIssue([index, 'historia_usuario'], 'Functional cards must be user stories', {
            index,
            metadata,
            rule: 'functional_user_story_required',
            receivedValue: receivedStoryValue,
            normalizedValue: normalizeUserStoryForValidation(card.historia_usuario),
          }),
        );
      }
      if (metadata.aprobacion === 'aprobada' && confirmedIds.has(metadata.padre)) {
        coveredConfirmedIds.add(metadata.padre);
      }
      if (
        metadata.origen === 'cliente' &&
        (metadata.aprobacion !== 'aprobada' ||
          normalizeSourceStory(card.historia_usuario) !== normalizeSourceStory(parent.texto))
      ) {
        issues.push(
          createIssue(
            [index, 'historia_usuario'],
            'Client-origin stories must retain the confirmed source story text',
            {
              index,
              metadata,
              rule: 'client_story_changed',
              receivedValue: receivedStoryValue,
              normalizedValue: normalizeSourceStory(card.historia_usuario),
            },
          ),
        );
      }
    } else {
      if (metadata.origen !== 'tecnica') {
        issues.push(
          createIssue([index, 'descripcion'], 'Technical cards need tecnica origin', {
            index,
            metadata,
            rule: 'technical_origin_required',
          }),
        );
      }
      if (!hasMeaningfulTechnicalTitle(card.historia_usuario)) {
        issues.push(
          createIssue([index, 'historia_usuario'], 'Technical cards need a meaningful title', {
            index,
            metadata,
            rule: 'technical_title_required',
            receivedValue: receivedStoryValue,
            normalizedValue: normalizeUserStoryForValidation(card.historia_usuario),
          }),
        );
      }
      if (hasUserStoryIntentShape(card.historia_usuario)) {
        issues.push(
          createIssue(
            [index, 'historia_usuario'],
            'Technical cards must not masquerade as user stories',
            {
              index,
              metadata,
              rule: 'technical_user_story_forbidden',
              receivedValue: receivedStoryValue,
              normalizedValue: normalizeUserStoryForValidation(card.historia_usuario),
            },
          ),
        );
      }
      if (metadata.tipo === 'tarea_tecnica' && metadata.aprobacion === 'aprobada') {
        approvedTechnicalTasks += 1;
      }
    }

    if (metadata.aprobacion === 'propuesta' && metadata.origen === 'cliente') {
      issues.push(
        createIssue([index, 'descripcion'], 'Proposals cannot claim client origin', {
          index,
          metadata,
          rule: 'proposal_client_origin_forbidden',
        }),
      );
    }
  });

  for (const story of sources.confirmed) {
    if (!coveredConfirmedIds.has(story.id)) {
      issues.push(
        createIssue(
          ['asesoramiento', 'historias', story.id],
          'Confirmed advisor story lacks approved functional coverage',
          { rule: 'confirmed_story_uncovered', field: 'historia_usuario' },
        ),
      );
    }
  }

  if (sources.confirmed.length > 0 && approvedTechnicalTasks === 0) {
    issues.push(
      createIssue(['backlog'], 'Advisor backlog lacks approved technical tasks', {
        rule: 'approved_technical_task_required',
        field: 'backlog',
      }),
    );
  }

  return { success: issues.length === 0, issues };
}
