import { GoogleGenAI } from '@google/genai';

import { parseGeminiEnvironment } from '../config/env.js';
import { projectAnalysisJsonSchema } from '../schemas/project-analysis.schema.js';
import { projectBacklogJsonSchema } from '../schemas/project-backlog.schema.js';

export function createGeminiGateway({
  createClient = (options) => new GoogleGenAI(options),
  getConfiguration = parseGeminiEnvironment,
  captureExchange,
} = {}) {
  async function generateStructuredContent(prompt, responseJsonSchema) {
    const { apiKey, model } = getConfiguration();
    const client = createClient({ apiKey });
    const config = {
      responseMimeType: 'application/json',
      responseJsonSchema,
    };
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config,
    });
    const rawProviderText = response.text;

    if (captureExchange) {
      captureExchange({
        request: { contents: prompt, model, config },
        rawProviderText,
      });
    }

    return rawProviderText;
  }

  return {
    async generateProjectAnalysis(prompt) {
      return generateStructuredContent(prompt, projectAnalysisJsonSchema);
    },

    async generateProjectBacklog(prompt) {
      return generateStructuredContent(prompt, projectBacklogJsonSchema);
    },
  };
}

export const geminiGateway = createGeminiGateway();
