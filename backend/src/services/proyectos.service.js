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

export function createProyectosService({
  repository = proyectosRepository,
  historiasRepository: storyRepository = historiasRepository,
  geminiGateway: analysisGateway = geminiGateway,
  getConfiguration = parseEnvironment,
  buildPrompt = buildProjectViabilityPrompt,
  buildBacklogPrompt = buildProjectBacklogPrompt,
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

    let stories;

    try {
      const prompt = buildBacklogPrompt(project.payload, project.analisisIa);
      const rawProviderText = await analysisGateway.generateProjectBacklog(prompt);

      if (typeof rawProviderText !== 'string' || !rawProviderText.trim()) {
        throw new Error('Gemini returned no backlog text');
      }

      const result = projectBacklogSchema.safeParse(JSON.parse(rawProviderText));

      if (!result.success) {
        throw new Error('Gemini returned an invalid backlog');
      }

      stories = result.data;
    } catch {
      throw createAnalysisFailure();
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

    throw createInternalError();
  }

  return { createProject, listProjects, getProjectById, analyzeProject, generateProjectBacklog };
}

export const proyectosService = createProyectosService();

export const { createProject, listProjects, getProjectById, analyzeProject, generateProjectBacklog } =
  proyectosService;
