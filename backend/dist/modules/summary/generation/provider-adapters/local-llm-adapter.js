"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLlmAdapter = void 0;
class LocalLlmAdapter {
    providerId = 'LOCAL_LLM';
    modelId;
    modelVersion = '2026.01';
    baseUrl;
    apiKey;
    timeoutMs;
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey;
        this.modelId = config.model;
        this.timeoutMs = config.timeoutMs || 30000;
    }
    async generate(userPayload, systemPrompt) {
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
            const data = (await response.json());
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
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.LocalLlmAdapter = LocalLlmAdapter;
