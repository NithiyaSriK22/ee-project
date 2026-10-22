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
            const interviewItems = keyItems.filter((i) => i.sourceType === 'INTERVIEW');
            const docItems = keyItems.filter((i) => i.sourceType === 'DOCUMENT');
            if (interviewItems.length === 0 || docItems.length === 0) {
                continue;
            }
            for (const intItem of interviewItems) {
                for (const docItem of docItems) {
                    if (this.isFactualConflict(intItem, docItem)) {
                        conflicts.push({
                            itemKey,
                            section: intItem.section,
                            interviewItem: intItem,
                            documentItem: docItem,
                            conflictMessage: `⚠ Conflict: interview and document differ — verify (${intItem.label} vs ${docItem.label})`,
                        });
                    }
                }
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
