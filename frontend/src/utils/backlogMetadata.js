const metadataPattern =
  /^(\[BACKLOG tipo=(historia_usuario|tarea_tecnica|spike); origen=(cliente|derivada_ia|tecnica); padre=([A-Za-z0-9][A-Za-z0-9._:-]{0,99}); aprobacion=(aprobada|propuesta)\])(\s+)([\s\S]+)$/
const backlogEnvelopePattern = /^(\[BACKLOG[^\]]*\])(\s*)([\s\S]*)$/

const metadataLabels = {
  tipo: {
    historia_usuario: 'Historia de usuario',
    tarea_tecnica: 'Tarea técnica',
    spike: 'Spike',
  },
  origen: {
    cliente: 'Origen: cliente',
    derivada_ia: 'Origen: IA',
    tecnica: 'Origen: técnica',
  },
  aprobacion: {
    aprobada: 'Aprobada',
    propuesta: 'Propuesta',
  },
}

export function splitBacklogDescription(value) {
  const description = typeof value === 'string' ? value : ''
  const metadataMatch = description.match(metadataPattern)

  if (metadataMatch) {
    return {
      description: metadataMatch[7].trim(),
      metadata: {
        tipo: metadataMatch[2],
        origen: metadataMatch[3],
        padre: metadataMatch[4],
        aprobacion: metadataMatch[5],
      },
      prefix: `${metadataMatch[1]}${metadataMatch[6]}`,
    }
  }

  const envelopeMatch = description.match(backlogEnvelopePattern)
  if (envelopeMatch) {
    return {
      description: envelopeMatch[3].trim(),
      metadata: null,
      prefix: `${envelopeMatch[1]}${envelopeMatch[2]}`,
    }
  }

  return { description, metadata: null, prefix: '' }
}

export function joinBacklogDescription(prefix, description) {
  return `${prefix || ''}${description}`
}

export function formatBacklogMetadataBadges(metadata) {
  if (!metadata) return []

  return ['tipo', 'origen', 'aprobacion'].flatMap((key) => {
    const label = metadataLabels[key]?.[metadata[key]]
    return label ? [{ key, label }] : []
  })
}
