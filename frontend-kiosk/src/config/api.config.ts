export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeoutMs: 15000,
  enableVoiceGuidance: import.meta.env.VITE_ENABLE_VOICE_GUIDANCE === 'true',
};
