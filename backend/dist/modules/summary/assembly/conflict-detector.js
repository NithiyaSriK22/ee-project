"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictDetector = void 0;
class ConflictDetector {
    /**
     * Deterministically scans assembled input items for conflicting factual assertions
     * between interview answers and document extractions.
     * NEVER resolves conflicts or chooses a winner.
     */
    static detectConflicts(items) {
        const conflicts = [];
        // Group items by itemKey
        const itemsByKey = new Map();
        for (const item of items) {
            if (!item.itemKey)
                continue;
            const existing = itemsByKey.get(item.itemKey) || [];
            existing.push(item);
            itemsByKey.set(item.itemKey, existing);
        }
        for (const [itemKey, keyItems] of itemsByKey.entries()) {
            if (keyItems.length < 2) {
                continue;
            }
            for (let i = 0; i < keyItems.length; i++) {
                for (let j = i + 1; j < keyItems.length; j++) {
                    const itemA = keyItems[i];
                    const itemB = keyItems[j];
                    if (!itemA || !itemB) {
                        continue;
                    }
                    if (this.isFactualConflict(itemA, itemB)) {
                        const intItem = itemA.sourceType === 'INTERVIEW' ? itemA : itemB.sourceType === 'INTERVIEW' ? itemB : undefined;
                        const docItem = itemA.sourceType === 'DOCUMENT' ? itemA : itemB.sourceType === 'DOCUMENT' ? itemB : undefined;
                        const conflictMsg = intItem && docItem
                            ? `⚠ Conflict: interview and document differ — verify (${intItem.label} vs ${docItem.label})`
                            : `⚠ Conflict: records differ on '${itemKey}' — verify (${itemA.label}: "${itemA.value}" vs ${itemB.label}: "${itemB.value}")`;
                        conflicts.push({
                            itemKey,
                            section: itemA.section,
                            interviewItem: intItem,
                            documentItem: docItem,
                            conflictMessage: conflictMsg,
                        });
                    }
                }
            }
        }
        // Cross-key check: General "no known allergies" vs specific documented allergy
        const generalNegAllergies = items.filter((i) => i.itemKey === 'allergy_general' && this.isExplicitNegative(i.value || ''));
        const specificPosAllergies = items.filter((i) => i.itemKey?.startsWith('allergy_') &&
            i.itemKey !== 'allergy_general' &&
            !this.isExplicitNegative(i.value || '') &&
            (i.value || '').trim().length > 0);
        for (const genItem of generalNegAllergies) {
            for (const specItem of specificPosAllergies) {
                const intItem = genItem.sourceType === 'INTERVIEW' ? genItem : specItem.sourceType === 'INTERVIEW' ? specItem : undefined;
                const docItem = genItem.sourceType === 'DOCUMENT' ? genItem : specItem.sourceType === 'DOCUMENT' ? specItem : undefined;
                conflicts.push({
                    itemKey: specItem.itemKey,
                    section: specItem.section,
                    interviewItem: intItem,
                    documentItem: docItem,
                    conflictMessage: `⚠ Conflict: Patient reported "${genItem.value}" but records document "${specItem.value}" — verify`,
                });
            }
        }
        return conflicts;
    }
    /**
     * Evaluates if two items on the same clinical key state contradictory facts
     */
    static isFactualConflict(itemA, itemB) {
        const valA = (itemA.value || '').toLowerCase().trim();
        const valB = (itemB.value || '').toLowerCase().trim();
        // Check for explicit "none" / "no" in one source vs active medication/allergy in other
        const isNegativeA = this.isExplicitNegative(valA);
        const isNegativeB = this.isExplicitNegative(valB);
        if (isNegativeA !== isNegativeB) {
            return true;
        }
        // Check if one states an allergy / drug was verified and other states none
        if (itemA.itemKey?.startsWith('allergy') && itemB.itemKey?.startsWith('allergy')) {
            if ((isNegativeA && !isNegativeB && valB.length > 0) || (isNegativeB && !isNegativeA && valA.length > 0)) {
                return true;
            }
            // If one is UNREADABLE/MISMATCH while patient said NONE
            if (isNegativeA && (itemB.status === 'UNREADABLE' || itemB.status === 'MISMATCH_FLAGGED')) {
                return true;
            }
            if (isNegativeB && (itemA.status === 'UNREADABLE' || itemA.status === 'MISMATCH_FLAGGED')) {
                return true;
            }
        }
        // Check if both are medications on same key but differ in dosage
        if (itemA.itemKey?.startsWith('med_') && itemB.itemKey?.startsWith('med_')) {
            const numA = (itemA.value || itemA.rawText || '').match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml)\b/i)?.[0];
            const numB = (itemB.value || itemB.rawText || '').match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml)\b/i)?.[0];
            if (numA && numB && numA.toLowerCase().replace(/\s+/g, '') !== numB.toLowerCase().replace(/\s+/g, '')) {
                return true;
            }
        }
        return false;
    }
    static isExplicitNegative(val) {
        const clean = val.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const explicitNegatives = [
            'none',
            'no',
            'nil',
            'no allergies',
            'no known allergies',
            'no medicine allergies',
            'no drug allergies',
            'nka',
            'nkda',
            'denies',
            'not present',
        ];
        return explicitNegatives.includes(clean);
    }
}
exports.ConflictDetector = ConflictDetector;
