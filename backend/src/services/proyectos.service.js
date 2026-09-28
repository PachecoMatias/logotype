import { parseEnvironment } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { geminiGateway } from '../integrations/gemini.gateway.js';
import { buildProjectBacklogPrompt } from '../prompts/project-backlog.prompt.js';
import { buildProjectViabilityPrompt } from '../prompts/project-viability.prompt.js';
import { historiasRepository } from '../repositories/historias.repository.js';
import { proyectosRepository } from '../repositories/proyectos.repository.js';
import { projectAnalysisSchema } from '../schemas/project-analysis.schema.js';
import { projectBacklogSchema } from '../schemas/project-backlog.schema.js';

function createInternalError() {
  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
}

function createAnalysisFailure() {
  return new AppError(502, 'AI_ANALYSIS_FAILED', 'AI analysis failed');
}

const backlogFailureStages = new Set([
  'configuration',
  'provider',
  'response_text',
  'json_parse',
  'schema_validation',
  'prompt_construction',
]);
const providerReasons = new Set([
  'response_schema_too_complex',
  'invalid_response_schema',
  'invalid_model',
  'invalid_api_key',
  'other_invalid_argument',
]);

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

    if (project.estado === 'analizado' && project.analisisIa !== null) {
      return project.analisisIa;
    }

    if (project.estado !== 'nuevo' || project.analisisIa !== null) {
      throw createInternalError();
    }

    const prompt = buildPrompt(project.payload);
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

      analysis = result.data;
    } catch {
      throw createAnalysisFailure();
    }

    const stored = await repository.storeAnalysisIfPending(configuration, id, analysis);

    if (stored.updated) {
      return analysis;
    }

    const winningProject = await repository.findById(configuration, id);

    if (winningProject?.estado === 'analizado' && winningProject.analisisIa !== null) {
      return winningProject.analisisIa;
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

    throw createInternalError();
  }

  return { createProject, listProjects, getProjectById, analyzeProject, generateProjectBacklog };
}

export const proyectosService = createProyectosService();

export const {
  createProject,
  listProjects,
  getProjectById,
  analyzeProject,
  generateProjectBacklog,
} = proyectosService;
