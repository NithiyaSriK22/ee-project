import { SummarizationProvider, SummarizationProviderResponse } from '../summarization-provider.js';

export interface LocalLlmConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

export class LocalLlmAdapter implements SummarizationProvider {
  public readonly providerId = 'LOCAL_LLM';
  public readonly modelId: string;
  public readonly modelVersion = '2026.01';

  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(config: LocalLlmConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.modelId = config.model;
    this.timeoutMs = config.timeoutMs || 30000;
  }

  public async generate(
    userPayload: string,
    systemPrompt: string
  ): Promise<SummarizationProviderResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPayload },
          ],
          temperature: 0.0, // Strictly deterministic
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Local LLM server returned HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '{}';

      return {
        rawOutput: content,
        modelId: this.modelId,
        modelVersion: this.modelVersion,
        tokensUsed: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        latencyMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
