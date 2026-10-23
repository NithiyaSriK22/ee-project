"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLlmAdapter = void 0;
exports.createDefaultLocalLlmAdapter = createDefaultLocalLlmAdapter;
class LocalLlmAdapter {
    providerId = 'LOCAL_LLM';
    modelId;
    modelVersion = '2026.01';
    isMock = false;
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
                const errorText = await response.text().catch(() => '');
                throw new Error(`Local LLM server returned HTTP ${response.status}: ${errorText}`);
            }
            let data;
            try {
                data = await response.json();
            }
            catch (jsonErr) {
                throw new Error(`LLM provider returned non-JSON response payload: ${jsonErr.message}`);
            }
            const content = data.choices?.[0]?.message?.content;
            if (!content || typeof content !== 'string' || !content.trim()) {
                throw new Error('LLM provider returned empty response payload');
            }
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
        catch (err) {
            if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
                throw new Error(`LLM provider request timed out after ${this.timeoutMs}ms`);
            }
            if (err.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
                throw new Error(`LLM provider service unavailable at ${this.baseUrl}: ${err.message}`);
            }
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
exports.LocalLlmAdapter = LocalLlmAdapter;
function createDefaultLocalLlmAdapter() {
    return new LocalLlmAdapter({
        baseUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1',
        model: process.env.LOCAL_LLM_MODEL || 'llama3-8b-instruct',
        apiKey: process.env.LOCAL_LLM_API_KEY,
        timeoutMs: parseInt(process.env.LOCAL_LLM_TIMEOUT_MS || '30000', 10),
    });
}
