import { createProject, getProjectById, listProjects } from '../services/proyectos.service.js';

export async function create(request, response) {
  const project = await createProject(request.body);

  response.status(201).json({ success: true, data: project });
}

export async function list(request, response) {
  const projects = await listProjects();

  response.status(200).json({ success: true, data: projects });
}

export async function getById(request, response) {
  const project = await getProjectById(request.params.id);

  response.status(200).json({ success: true, data: project });
}
