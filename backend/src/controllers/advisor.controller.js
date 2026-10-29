import { advisorService } from '../services/advisor/advisor-service.js';

export async function round(request, response) {
  const result = await advisorService.round(request.body, { ip: request.ip });

  response.status(200).json({ success: true, data: result });
}
