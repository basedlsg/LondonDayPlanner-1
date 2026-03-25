// Gemini Client - handles model selection and API interactions

import { getConfig } from '../config/index.js';

// Use the stable Gemini 2.5 Flash release in production.
// Preview models can be tested explicitly later without becoming the default path.
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';

export type GeminiModelType = 'gemini-2.5-flash' | 'gemini-3-flash-preview';
type GeminiThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export class GeminiClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getConfig().geminiApiKey;
  }

  /**
   * Generate content with a specific model.
   */
  async generateContent(
    prompt: string,
    modelType: GeminiModelType = DEFAULT_GEMINI_FLASH_MODEL,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
      thinkingLevel?: GeminiThinkingLevel;
      timeoutMs?: number;
    } = {}
  ): Promise<string> {
    return this.generate(prompt, modelType, {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      thinkingLevel: options.thinkingLevel ?? 'low',
      timeoutMs: options.timeoutMs ?? 10_000,
    });
  }

  /**
   * Generate content with Google Search grounding for real-time information.
   */
  async generateGroundedContent(
    prompt: string,
    options: {
      temperature?: number;
      maxOutputTokens?: number;
      thinkingLevel?: GeminiThinkingLevel;
      timeoutMs?: number;
    } = {}
  ): Promise<string> {
    return this.generate(prompt, DEFAULT_GEMINI_FLASH_MODEL, {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      thinkingLevel: options.thinkingLevel ?? 'minimal',
      timeoutMs: options.timeoutMs ?? 12_000,
      useGoogleSearch: true,
    });
  }

  private async generate(
    prompt: string,
    modelType: GeminiModelType,
    options: {
      temperature: number;
      maxOutputTokens: number;
      thinkingLevel: GeminiThinkingLevel;
      timeoutMs: number;
      useGoogleSearch?: boolean;
    }
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const endpoint = `${this.baseUrl}/${modelType}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      const requestBody: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        },
      };

      // Gemini 3 preview accepts thinkingConfig; stable Gemini 2.5 Flash does not.
      if (modelType.startsWith('gemini-3')) {
        (requestBody.generationConfig as Record<string, unknown>).thinkingConfig = {
          thinkingLevel: options.thinkingLevel,
        };
      }

      if (options.useGoogleSearch) {
        requestBody.tools = [{ googleSearch: {} }];
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const data = (await response.json()) as GeminiGenerateResponse;
      if (!response.ok || data.error) {
        const message = data.error?.message || `Gemini request failed with ${response.status}`;
        throw new Error(message);
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

      if (text) {
        return text;
      }

      const finishReason = data.candidates?.[0]?.finishReason || 'UNKNOWN';
      throw new Error(`Gemini returned no text output (finishReason=${finishReason})`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${options.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Parse JSON from Gemini response, handling markdown code blocks.
   */
  static parseJsonResponse<T>(response: string): T {
    let jsonText = response;

    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      const codeMatch = response.match(/```\n([\s\S]*?)\n```/);
      if (codeMatch) {
        jsonText = codeMatch[1];
      } else {
        const rawJsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (rawJsonMatch) {
          jsonText = rawJsonMatch[1];
        }
      }
    }

    jsonText = jsonText
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\n/g, ' ')
      .trim();

    try {
      return JSON.parse(jsonText) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', jsonText);
      throw new Error(`Failed to parse Gemini response as JSON: ${error}`);
    }
  }
}

let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    geminiClient = new GeminiClient();
  }
  return geminiClient;
}
