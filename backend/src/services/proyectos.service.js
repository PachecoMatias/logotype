import { parseEnvironment } from '../config/env.js';
import { companyContext } from '../config/company-context.js';
import { AppError } from '../errors/app-error.js';
import { geminiGateway } from '../integrations/gemini.gateway.js';
import { buildProjectBacklogPrompt } from '../prompts/project-backlog.prompt.js';
import { buildProjectViabilityPrompt } from '../prompts/project-viability.prompt.js';
import { historiasRepository } from '../repositories/historias.repository.js';
import { proyectosRepository } from '../repositories/proyectos.repository.js';
import { projectAnalysisSchema } from '../schemas/project-analysis.schema.js';
import { projectBacklogSchema } from '../schemas/project-backlog.schema.js';
import { validateProjectBacklogSemantics } from './backlog-semantics.js';
import { calcularSenales } from './viability-signals.js';

function createInternalError() {
  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
}

function createAnalysisFailure() {
  return new AppError(
    502,
    'AI_ANALYSIS_FAILED',
    'El servicio de IA no está disponible temporalmente. Intentá nuevamente más tarde.',
  );
}

const backlogFailureStages = new Set([
  'configuration',
  'provider',
  'response_text',
  'json_parse',
  'schema_validation',
  'semantic_validation',
  'prompt_construction',
]);
const providerReasons = new Set([
  'response_schema_too_complex',
  'invalid_response_schema',
  'invalid_model',
  'invalid_api_key',
  'other_invalid_argument',
]);
const semanticCardTypes = new Set(['historia_usuario', 'tarea_tecnica', 'spike']);
const semanticOrigins = new Set(['cliente', 'derivada_ia', 'tecnica']);
const semanticFields = new Set(['historia_usuario', 'descripcion', 'backlog']);
const semanticRules = new Set([
  'duplicate_title',
  'invalid_metadata',
  'unknown_parent',
  'unconfirmed_approved_scope',
  'functional_origin_required',
  'functional_user_story_required',
  'client_story_changed',
  'technical_origin_required',
  'technical_title_required',
  'technical_user_story_forbidden',
  'proposal_client_origin_forbidden',
  'confirmed_story_uncovered',
  'approved_technical_task_required',
]);
const semanticDiagnosticValueMaxLength = 240;

function sanitizeErrorName(name) {
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(name) ? name : 'Error';
}

function sanitizeNetworkCode(code) {
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,31}$/.test(code) ? code : undefined;
}

function sanitizeProviderSymbolicStatus(status) {
  return typeof status === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(status) ? status : undefined;
}

function sanitizeModel(model) {
  return typeof model === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(model)
    ? model
    : undefined;
}

function replaceControlCharacters(value) {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : character;
  }).join('');
}

function sanitizeSemanticValue(value) {
  if (typeof value !== 'string') return null;
  const sanitized = replaceControlCharacters(value)
    .replace(
      /(["']?)(api[_-]?key|authorization|token|secret|password)\1\s*[:=]\s*(["'])[^"']*\3/giu,
      '$1$2$1:$3[REDACTED]$3',
    )
    .replace(
      /\bauthorization\b\s*[:=]\s*(?:basic|bearer)\s+[^\s,;]+/giu,
      'Authorization=[REDACTED]',
    )
    .replace(/\bbearer\s+[A-Za-z0-9._~-]+/giu, 'Bearer [REDACTED]')
    .replace(
      /\b(api[_-]?key|authorization|token|secret|password)\b\s*[:=]\s*[^\s,;]+/giu,
      '$1=[REDACTED]',
    )
    .trim();
  if (!sanitized) return null;
  if (sanitized.length <= semanticDiagnosticValueMaxLength) return sanitized;
  return `${sanitized.slice(0, semanticDiagnosticValueMaxLength - 1)}…`;
}

function sanitizeSemanticIssue(issue) {
  const semantic = issue?.semantic;
  if (!semantic || !semanticRules.has(semantic.rule)) return null;

  const sanitized = {
    index: Number.isInteger(semantic.index) && semantic.index >= 0 ? semantic.index : null,
    cardType: semanticCardTypes.has(semantic.cardType) ? semantic.cardType : null,
    rule: semantic.rule,
    origin: semanticOrigins.has(semantic.origin) ? semantic.origin : null,
    parent:
      typeof semantic.parent === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(semantic.parent)
        ? semantic.parent
        : null,
    field: semanticFields.has(semantic.field) ? semantic.field : null,
  };
  const receivedValue = sanitizeSemanticValue(semantic.receivedValue);
  const normalizedValue = sanitizeSemanticValue(semantic.normalizedValue);

  if (receivedValue) sanitized.receivedValue = receivedValue;
  if (normalizedValue && normalizedValue !== receivedValue) {
    sanitized.normalizedValue = normalizedValue;
  }

  return sanitized;
}

function createBacklogDiagnostic({ stage, error, issues, projectId }) {
  const diagnostic = {
    stage: backlogFailureStages.has(stage) ? stage : 'provider',
    errorName: sanitizeErrorName(error?.name),
    projectId,
  };
  const providerStatus = error?.providerStatus ?? error?.status ?? error?.statusCode;
  const providerSymbolicStatus = sanitizeProviderSymbolicStatus(error?.providerSymbolicStatus);
  const providerReason = providerReasons.has(error?.providerReason)
    ? error.providerReason
    : undefined;
  const networkCode = sanitizeNetworkCode(error?.networkCode ?? error?.code);
  const model = sanitizeModel(error?.configuredModel ?? error?.model);

  if (typeof providerStatus === 'number' && Number.isFinite(providerStatus)) {
    diagnostic.providerStatus = providerStatus;
  }

  if (providerSymbolicStatus) {
    diagnostic.providerSymbolicStatus = providerSymbolicStatus;
  }

  if (providerReason) {
    diagnostic.providerReason = providerReason;
  }

  if (networkCode) {
    diagnostic.networkCode = networkCode;
  }

  if (issues) {
    diagnostic.zodIssues = issues.map((issue) => ({ code: issue.code, path: issue.path }));
    if (diagnostic.stage === 'semantic_validation') {
      diagnostic.semanticIssues = issues.map(sanitizeSemanticIssue).filter(Boolean);
    }
  }

  if (model) {
    diagnostic.model = model;
  }

  return diagnostic;
}

function defaultBacklogFailureLogger(diagnostic) {
  console.error(JSON.stringify({ event: 'backlog_generation_failed', ...diagnostic }));
}

export function createProyectosService({
  repository = proyectosRepository,
  historiasRepository: storyRepository = historiasRepository,
  geminiGateway: analysisGateway = geminiGateway,
  getConfiguration = parseEnvironment,
  buildPrompt = buildProjectViabilityPrompt,
  buildBacklogPrompt = buildProjectBacklogPrompt,
  logBacklogFailure = defaultBacklogFailureLogger,
} = {}) {
  async function createProject(payload) {
    return repository.insert(getConfiguration(), payload);
  }

  async function listProjects() {
    return repository.findAll(getConfiguration());
  }

  async function getProjectById(id) {
    const project = await repository.findById(getConfiguration(), id);

    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }

    return project;
  }

  async function analyzeProject(id) {
    const configuration = getConfiguration();
    const project = await repository.findById(configuration, id);

    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }

    if (project.analisisIa?.version === 2) {
      return project.analisisIa;
    }

    if (project.analisisIa !== null) {
      if (['VIABLE', 'NO_VIABLE'].includes(project.decisionViabilidad)) return project.analisisIa;
      const storedStories = await storyRepository.findByProjectId(configuration, id);
      if (storedStories.length > 0) {
        return project.analisisIa;
      }
    } else if (project.estado !== 'nuevo') {
      throw createInternalError();
    }

    const signals = calcularSenales(project.payload, companyContext);
    const prompt = buildPrompt(project.payload, companyContext, signals);
    let analysis;

    try {
      const rawProviderText = await analysisGateway.generateProjectAnalysis(prompt);

      if (typeof rawProviderText !== 'string' || !rawProviderText.trim()) {
        throw new Error('Gemini returned no analysis text');
      }

      const result = projectAnalysisSchema.safeParse(JSON.parse(rawProviderText));

      if (!result.success) {
        throw new Error('Gemini returned an invalid analysis');
      }

      analysis = { version: 2, ...result.data, senales: signals };
    } catch {
      throw createAnalysisFailure();
    }

    const stored = await repository.storeAnalysisIfPending(configuration, id, analysis);

    if (stored.updated) {
      return analysis;
    }

    const winningProject = await repository.findById(configuration, id);

    if (winningProject?.analisisIa?.version === 2) {
      return winningProject.analisisIa;
    }

    if (winningProject?.analisisIa !== null) {
      if (['VIABLE', 'NO_VIABLE'].includes(winningProject.decisionViabilidad)) {
        return winningProject.analisisIa;
      }
      const storedStories = await storyRepository.findByProjectId(configuration, id);
      if (storedStories.length > 0) return winningProject.analisisIa;
    }

    throw createInternalError();
  }

  async function generateProjectBacklog(id) {
    const configuration = getConfiguration();
    const project = await repository.findById(configuration, id);

    if (!project) {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }

    const storedStories = await storyRepository.findByProjectId(configuration, id);

    if (storedStories.length > 0) {
      return storedStories;
    }

    if (project.estado !== 'analizado' || project.analisisIa === null) {
      throw new AppError(
        409,
        'PROJECT_NOT_ANALYZED',
        'Project must be analyzed before backlog generation',
      );
    }

    if (project.decisionViabilidad !== 'VIABLE') {
      throw new AppError(
        409,
        'PROJECT_VIABILITY_DECISION_REQUIRED',
        'Project must be marked viable before backlog generation',
      );
    }

    function failBacklog(stage, error, issues) {
      logBacklogFailure(createBacklogDiagnostic({ stage, error, issues, projectId: id }));
      throw createAnalysisFailure();
    }

    let prompt;

    try {
      prompt = buildBacklogPrompt(project.payload, project.analisisIa);
    } catch (error) {
      failBacklog('prompt_construction', error);
    }

    let rawProviderText;

    try {
      rawProviderText = await analysisGateway.generateProjectBacklog(prompt);
    } catch (error) {
      failBacklog(error?.backlogFailureStage, error);
    }

    if (typeof rawProviderText !== 'string' || !rawProviderText.trim()) {
      failBacklog('response_text', new TypeError('Invalid provider response text'));
    }

    let parsed;

    try {
      parsed = JSON.parse(rawProviderText);
    } catch (error) {
      failBacklog('json_parse', error);
    }

    const result = projectBacklogSchema.safeParse(parsed);

    if (!result.success) {
      failBacklog('schema_validation', result.error, result.error.issues);
    }

    const stories = result.data;
    const semanticResult = validateProjectBacklogSemantics(stories, project.payload, {
      rawBacklog: parsed,
    });

    if (!semanticResult.success) {
      const error = new Error('Generated backlog violates advisor semantics');
      error.name = 'BacklogSemanticError';
      failBacklog('semantic_validation', error, semanticResult.issues);
    }

    const persisted = await storyRepository.persistGeneratedBacklog(configuration, id, stories);

    if (persisted.outcome === 'committed' || persisted.outcome === 'existing') {
      return persisted.stories;
    }

    if (persisted.outcome === 'ineligible') {
      throw new AppError(
        409,
        'PROJECT_NOT_ANALYZED',
        'Project must be analyzed before backlog generation',
      );
    }

    if (persisted.outcome === 'decision_required') {
      throw new AppError(
        409,
        'PROJECT_VIABILITY_DECISION_REQUIRED',
        'Project must be marked viable before backlog generation',
      );
    }

    throw createInternalError();
  }

  async function setProjectViabilityDecision(id, input) {
    const reason = input.motivo?.trim() || null;
    const result = await repository.storeViabilityDecision(
      getConfiguration(),
      id,
      input.decision,
      reason,
    );

    if (result.outcome === 'missing') {
      throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    }
    if (result.outcome === 'analysis_required') {
      throw new AppError(
        409,
        'PROJECT_ANALYSIS_V2_REQUIRED',
        'Project requires a version 2 analysis before a decision',
      );
    }
    if (result.outcome === 'backlog_exists') {
      throw new AppError(
        409,
        'PROJECT_BACKLOG_ALREADY_EXISTS',
        'Project decision cannot change after backlog generation',
      );
    }

    return result.project;
  }

  return {
    createProject,
    listProjects,
    getProjectById,
    analyzeProject,
    generateProjectBacklog,
    setProjectViabilityDecision,
  };
}

export const proyectosService = createProyectosService();

export const {
  createProject,
  listProjects,
  getProjectById,
  analyzeProject,
  generateProjectBacklog,
  setProjectViabilityDecision,
} = proyectosService;
