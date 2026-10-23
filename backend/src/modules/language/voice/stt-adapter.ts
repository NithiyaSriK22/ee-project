import { logger } from '../../../config/logger.js';

export interface STTRequest {
  language: string; // e.g. 'ta', 'en', 'hi'
  audioBase64?: string;
  mimeType?: string;
  transcriptHint?: string; // e.g. for testing or client-transcribed Web Speech API
}

export interface STTResponse {
  transcript: string;
  confidence: number; // 0.0 to 1.0
  isSilenceOrNoise: boolean;
  languageDetected: string;
}

export class STTAdapter {
  /**
   * Transient transcription service.
   * HARD PRIVACY RULE: Audio is NEVER stored on disk by default.
   * Transcripts and patient identifiers are NEVER logged.
   */
  public static async transcribeAudio(req: STTRequest): Promise<STTResponse> {
    const { language, audioBase64, transcriptHint } = req;

    // Zero patient identifiers or audio logged
    logger.info('STT transcription initiated', {
      language,
      hasAudioPayload: Boolean(audioBase64),
    });

    // 1. If direct transcript hint provided (e.g. from local Web Speech API on kiosk or test suite)
    if (transcriptHint !== undefined) {
      const trimmed = transcriptHint.trim();
      if (!trimmed || trimmed.toLowerCase() === 'noise' || trimmed.toLowerCase() === 'inaudible') {
        return {
          transcript: '',
          confidence: 0.1,
          isSilenceOrNoise: true,
          languageDetected: language,
        };
      }

      return {
        transcript: trimmed,
        confidence: 0.95,
        isSilenceOrNoise: false,
        languageDetected: language,
      };
    }

    // 2. Mock audio processing for base64 audio
    if (audioBase64) {
      try {
        // Decode transiently in-memory
        const decoded = Buffer.from(audioBase64, 'base64').toString('utf-8');
        if (decoded.includes('SILENCE') || decoded.length < 5) {
          return {
            transcript: '',
            confidence: 0.0,
            isSilenceOrNoise: true,
            languageDetected: language,
          };
        }

        // Extract synthetic test speech if encoded
        const match = decoded.match(/SPOKEN:(.+)/);
        const text = (match && match[1]) ? match[1].trim() : decoded;

        return {
          transcript: text,
          confidence: 0.92,
          isSilenceOrNoise: false,
          languageDetected: language,
        };
      } catch {
        return {
          transcript: '',
          confidence: 0.0,
          isSilenceOrNoise: true,
          languageDetected: language,
        };
      }
    }

    // No input provided -> silence
    return {
      transcript: '',
      confidence: 0.0,
      isSilenceOrNoise: true,
      languageDetected: language,
    };
  }
}
