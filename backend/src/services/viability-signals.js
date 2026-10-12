const deadlineRanges = {
  'Lo antes posible': [0, 4],
  '1 - 3 meses': [4, 13],
  '3 - 6 meses': [13, 26],
  'Más de 6 meses': [26, null],
  'No tenemos una fecha definida': null,
};

const budgetRanges = {
  'Menos de USD 1.000': [0, 1000],
  'USD 1.000 - 5.000': [1000, 5000],
  'USD 5.000 - 10.000': [5000, 10000],
  'Más de USD 10.000': [10000, null],
  'Todavía no lo definimos': null,
};

const sizeOrder = ['chico', 'mediano', 'grande'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function knownRange(table, value) {
  return typeof value === 'string' && Object.hasOwn(table, value) ? table[value] : null;
}

function sizeFromFeatureCount(count) {
  if (count >= 13) return 'grande';
  if (count >= 7) return 'mediano';
  return 'chico';
}

function sizeFromPlatformCount(count) {
  if (count >= 3) return 'grande';
  if (count >= 2) return 'mediano';
  return 'chico';
}

function largestSize(left, right) {
  return sizeOrder[Math.max(sizeOrder.indexOf(left), sizeOrder.indexOf(right))];
}

function deadlineCompatibility(requested, reference) {
  if (!requested || !Array.isArray(reference) || reference.length !== 2) return null;
  const [, requestedMax] = requested;
  const [referenceMin, referenceMax] = reference;
  if (requestedMax === null || requestedMax >= referenceMax) return 'si';
  if (requestedMax >= referenceMin) return 'ajustado';
  return 'no';
}

function budgetCompatibility(requested, reference) {
  if (!requested || typeof reference !== 'number') return null;
  const [requestedMin, requestedMax] = requested;
  if (requestedMin >= reference) return 'si';
  if (requestedMax === null || requestedMax >= reference) return 'ajustado';
  return 'no';
}

function isShort(value) {
  return typeof value !== 'string' || value.trim().length < 40;
}

export function calcularSenales(payload, contexto) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const trustedContext = contexto && typeof contexto === 'object' ? contexto : {};
  const features = asArray(source.funcionalidades?.seleccionadas);
  const platforms = asArray(source.alcance?.plataformas);
  const featureSize = sizeFromFeatureCount(features.length);
  const platformSize = sizeFromPlatformCount(platforms.length);
  const estimatedSize = largestSize(featureSize, platformSize);
  const referenceDuration = asArray(trustedContext.tamanos?.[estimatedSize]);
  const requestedDeadline = knownRange(deadlineRanges, source.presupuesto?.plazo);
  const requestedBudget = knownRange(budgetRanges, source.presupuesto?.presupuesto);
  const projectType = source.proyecto?.tipoProyecto;
  const minimumBudget =
    typeof projectType === 'string' &&
    typeof trustedContext.presupuestoMinimoUsdPorTipo?.[projectType] === 'number'
      ? trustedContext.presupuestoMinimoUsdPorTipo[projectType]
      : null;
  const sensitiveFeatures = features.filter((feature) =>
    asArray(trustedContext.funcionalidadesSensibles).includes(feature),
  );
  const sensitiveIndustry = asArray(trustedContext.rubrosSensibles).includes(source.empresa?.rubro);
  const emptyFields = [];

  if (isShort(source.problema?.problemaActual)) emptyFields.push('problemaActual');
  if (isShort(source.problema?.procesoActual)) emptyFields.push('procesoActual');
  if (
    typeof source.presupuesto?.infoAdicional !== 'string' ||
    source.presupuesto.infoAdicional.trim().length === 0
  ) {
    emptyFields.push('infoAdicional');
  }

  return {
    cantidad_funcionalidades: features.length,
    cantidad_plataformas: platforms.length,
    escala_usuarios:
      typeof source.alcance?.cantidadUsuarios === 'string' ? source.alcance.cantidadUsuarios : null,
    tamano_estimado: estimatedSize,
    duracion_referencia_semanas: referenceDuration.length === 2 ? referenceDuration : [0, 0],
    plazo_solicitado_semanas: requestedDeadline,
    plazo_compatible: deadlineCompatibility(requestedDeadline, referenceDuration),
    presupuesto_solicitado_usd: requestedBudget,
    presupuesto_minimo_referencia_usd: minimumBudget,
    presupuesto_compatible: budgetCompatibility(requestedBudget, minimumBudget),
    funcionalidades_sensibles: sensitiveFeatures,
    rubro_sensible: sensitiveIndustry,
    requiere_revision_seguridad: sensitiveFeatures.length > 0 || sensitiveIndustry,
    plataformas_fuera_de_foco: platforms.filter((platform) =>
      asArray(trustedContext.plataformasSinEquipoDedicado).includes(platform),
    ),
    campos_vacios: emptyFields,
  };
}
