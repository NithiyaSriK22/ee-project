"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntheticAudioGenerator = void 0;
const prng_js_1 = require("./prng.js");
class SyntheticAudioGenerator {
    /**
     * Generates a synthetic audio utterance fixture with simulated environmental noise overlays.
     */
    static generateUtterance(params) {
        const seed = params.seed || 5001;
        const prng = new prng_js_1.SeededPRNG(seed);
        const lang = params.language || 'en';
        const text = params.text || 'I have had a high fever and headache since yesterday morning.';
        const noiseType = params.noiseType || prng.pickOne(['CLEAN', 'CLINIC_BABBLE', 'AC_HUM', 'COUGH_BURST']);
        // Determine simulated SNR (Signal-to-Noise Ratio) in decibels
        let snrDb;
        let simulatedAsrConfidence;
        switch (noiseType) {
            case 'CLEAN':
                snrDb = prng.nextInt(25, 35);
                simulatedAsrConfidence = 0.96;
                break;
            case 'AC_HUM':
                snrDb = prng.nextInt(15, 22);
                simulatedAsrConfidence = 0.88;
                break;
            case 'CLINIC_BABBLE':
                snrDb = prng.nextInt(8, 14);
                simulatedAsrConfidence = 0.74;
                break;
            case 'COUGH_BURST':
                snrDb = prng.nextInt(4, 9);
                simulatedAsrConfidence = 0.58;
                break;
        }
        const words = text.split(/\s+/).length;
        const waveformDurationSec = Math.round((words * 0.35 + 0.5) * 10) / 10;
        return {
            utteranceId: `syn_audio_${seed}_${prng.nextInt(1000, 9999)}`,
            language: lang,
            text,
            snrDb,
            noiseType,
            simulatedAsrConfidence,
            waveformDurationSec,
            syntheticTtsEngine: 'SIMULATED_NEURAL_TTS',
        };
    }
    /**
     * Generates a multilingual test cohort of audio utterances.
     */
    static generateAudioTestSet(seed = 6001) {
        const testCases = [
            { lang: 'en', text: 'Severe pain in my left chest radiating to shoulder', noise: 'CLEAN' },
            { lang: 'hi', text: 'Mujhe teen din se tez bukhar aur khansi hai', noise: 'CLINIC_BABBLE' },
            { lang: 'ta', text: 'Enakku rendu naala thalaivali irukku', noise: 'AC_HUM' },
            { lang: 'en', text: 'I feel dizzy whenever I stand up quickly', noise: 'COUGH_BURST' },
        ];
        return testCases.map((tc, idx) => this.generateUtterance({
            seed: seed + idx * 100,
            text: tc.text,
            language: tc.lang,
            noiseType: tc.noise,
        }));
    }
}
exports.SyntheticAudioGenerator = SyntheticAudioGenerator;
