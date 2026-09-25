import { parseEnvironment } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { proyectosRepository } from '../repositories/proyectos.repository.js';

export async function createProject(payload) {
  return proyectosRepository.insert(parseEnvironment(), payload);
}

export async function listProjects() {
  return proyectosRepository.findAll(parseEnvironment());
}

export async function getProjectById(id) {
  const project = await proyectosRepository.findById(parseEnvironment(), id);

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  return project;
}
