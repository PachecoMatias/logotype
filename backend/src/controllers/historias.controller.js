import { updateStory } from '../services/historias.service.js';

export async function update(request, response) {
  const story = await updateStory(request.params.id, request.body);

  response.status(200).json({ success: true, data: story });
}
