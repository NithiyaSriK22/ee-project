export interface SummarizationProviderResponse {
  rawOutput: string;
  modelId: string;
  modelVersion: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface SummarizationProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly isMock?: boolean;
  generate(userPayload: string, systemPrompt: string): Promise<SummarizationProviderResponse>;
}
