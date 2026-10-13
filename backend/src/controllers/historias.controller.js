import { updateStory, updateStoryColumn } from '../services/historias.service.js';

export async function updateColumn(request, response) {
  const story = await updateStoryColumn(request.params.id, request.body.columna_tablero);

  response.status(200).json({ success: true, data: story });
}

export async function update(request, response) {
  const story = await updateStory(request.params.id, request.body);

  response.status(200).json({ success: true, data: story });
}
