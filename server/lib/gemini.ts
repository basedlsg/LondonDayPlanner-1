// Gemini Client - handles model selection and API interactions

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getConfig } from '../config';

export type GeminiModelType = 'gemini-2.0-flash' | 'gemini-1.5-pro';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private models: Map<GeminiModelType, GenerativeModel> = new Map();

  constructor(apiKey?: string) {
    const key = apiKey || getConfig().geminiApiKey;
    this.genAI = new GoogleGenerativeAI(key);
  }

  /**
   * Get a model instance, creating it if necessary
   */
  getModel(modelType: GeminiModelType): GenerativeModel {
    if (!this.models.has(modelType)) {
      // Map model types to actual model IDs
      const modelId = this.getModelId(modelType);
      const model = this.genAI.getGenerativeModel({ model: modelId });
      this.models.set(modelType, model);
    }
    return this.models.get(modelType)!;
  }

  /**
   * Get a model with Google Search grounding enabled
   */
  getGroundedModel(): GenerativeModel {
    return this.genAI.getGenerativeModel({
      model: this.getModelId('gemini-2.0-flash'),
      tools: [{ googleSearch: {} } as any] // Enable Google Search grounding
    });
  }

  /**
   * Map our model types to actual Google model IDs
   */
  private getModelId(modelType: GeminiModelType): string {
    switch (modelType) {
      case 'gemini-2.0-flash':
        return 'gemini-2.0-flash-exp'; // Use experimental for grounding support
      case 'gemini-1.5-pro':
        return 'gemini-1.5-pro';
      default:
        return 'gemini-2.0-flash-exp';
    }
  }

  /**
   * Generate content with a specific model
   */
  async generateContent(
    prompt: string,
    modelType: GeminiModelType = 'gemini-2.0-flash',
    options: {
      temperature?: number;
      maxOutputTokens?: number;
    } = {}
  ): Promise<string> {
    const model = this.getModel(modelType);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
      },
    });

    return result.response.text();
  }

  /**
   * Generate content with Google Search grounding for real-time information
   */
  async generateGroundedContent(
    prompt: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
    } = {}
  ): Promise<string> {
    const model = this.getGroundedModel();

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
      },
    });

    return result.response.text();
  }

  /**
   * Parse JSON from Gemini response, handling markdown code blocks
   */
  static parseJsonResponse<T>(response: string): T {
    // Try to extract JSON from markdown code blocks
    let jsonText = response;

    // Check for ```json blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Check for ``` blocks without language specifier
      const codeMatch = response.match(/```\n([\s\S]*?)\n```/);
      if (codeMatch) {
        jsonText = codeMatch[1];
      } else {
        // Try to find raw JSON object/array
        const rawJsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (rawJsonMatch) {
          jsonText = rawJsonMatch[1];
        }
      }
    }

    // Clean up common issues
    jsonText = jsonText
      .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
      .replace(/\n/g, ' ')             // Remove newlines within JSON
      .trim();

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', jsonText);
      throw new Error(`Failed to parse Gemini response as JSON: ${error}`);
    }
  }
}

// Singleton export
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    geminiClient = new GeminiClient();
  }
  return geminiClient;
}
