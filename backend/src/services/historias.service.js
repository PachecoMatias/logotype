import { parseEnvironment } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { historiasRepository } from '../repositories/historias.repository.js';

export function createHistoriasService({
  repository = historiasRepository,
  getConfiguration = parseEnvironment,
} = {}) {
  async function updateStory(id, changes) {
    const story = await repository.updateById(getConfiguration(), id, changes);

    if (!story) {
      throw new AppError(404, 'STORY_NOT_FOUND', 'Story not found');
    }

    return story;
  }

  async function updateStoryColumn(id, column) {
    const story = await repository.updateColumnById(getConfiguration(), id, column);

    if (!story) {
      throw new AppError(404, 'STORY_NOT_FOUND', 'Story not found');
    }

    return story;
  }

  return { updateStory, updateStoryColumn };
}

export const historiasService = createHistoriasService();
export const { updateStory, updateStoryColumn } = historiasService;
