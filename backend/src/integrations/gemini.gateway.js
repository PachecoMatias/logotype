import { GoogleGenAI } from '@google/genai';

import { parseGeminiEnvironment } from '../config/env.js';
import { projectAnalysisJsonSchema } from '../schemas/project-analysis.schema.js';

export function createGeminiGateway({
  createClient = (options) => new GoogleGenAI(options),
  getConfiguration = parseGeminiEnvironment,
  captureExchange,
} = {}) {
  return {
    async generateProjectAnalysis(prompt) {
      const { apiKey, model } = getConfiguration();
      const client = createClient({ apiKey });
      const config = {
        responseMimeType: 'application/json',
        responseJsonSchema: projectAnalysisJsonSchema,
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
    },
  };
}

export const geminiGateway = createGeminiGateway();
