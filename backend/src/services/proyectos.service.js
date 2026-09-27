import { parseEnvironment } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { geminiGateway } from '../integrations/gemini.gateway.js';
import { buildProjectViabilityPrompt } from '../prompts/project-viability.prompt.js';
import { proyectosRepository } from '../repositories/proyectos.repository.js';
import { projectAnalysisSchema } from '../schemas/project-analysis.schema.js';

function createInternalError() {
  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
}

function createAnalysisFailure() {
  return new AppError(502, 'AI_ANALYSIS_FAILED', 'AI analysis failed');
}

export function createProyectosService({
  repository = proyectosRepository,
  geminiGateway: analysisGateway = geminiGateway,
  getConfiguration = parseEnvironment,
  buildPrompt = buildProjectViabilityPrompt,
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

  return { createProject, listProjects, getProjectById, analyzeProject };
}

export const proyectosService = createProyectosService();

export const { createProject, listProjects, getProjectById, analyzeProject } = proyectosService;
