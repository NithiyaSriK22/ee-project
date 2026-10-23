"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededPRNG = void 0;
/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% deterministic test and synthetic generation across all runs.
 */
class SeededPRNG {
    s;
    constructor(seed = 1337) {
        this.s = Math.floor(Math.abs(seed)) || 1337;
    }
    /**
     * Generates a deterministic float between [0, 1)
     */
    nextFloat() {
        let t = (this.s += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /**
     * Generates an integer in range [min, max] inclusive
     */
    nextInt(min, max) {
        const f = this.nextFloat();
        return Math.floor(f * (max - min + 1)) + min;
    }
    /**
     * Picks a single random item from an array deterministically
     */
    pickOne(items) {
        if (!items || items.length === 0) {
            throw new Error('Cannot pick from empty array');
        }
        const idx = this.nextInt(0, items.length - 1);
        const item = items[idx];
        if (item === undefined) {
            throw new Error('Index out of bounds in pickOne');
        }
        return item;
    }
    /**
     * Picks weighted item
     */
    pickWeighted(items, weights) {
        const total = weights.reduce((acc, w) => acc + w, 0);
        let randomVal = this.nextFloat() * total;
        for (let i = 0; i < items.length; i++) {
            const weight = weights[i] ?? 0;
            if (randomVal < weight) {
                const item = items[i];
                if (item !== undefined)
                    return item;
            }
            randomVal -= weight;
        }
        const fallback = items[items.length - 1];
        if (fallback === undefined) {
            throw new Error('Fallback item undefined in pickWeighted');
        }
        return fallback;
    }
}
exports.SeededPRNG = SeededPRNG;
