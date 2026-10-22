"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeStateEvaluator = void 0;
const redflags_types_js_1 = require("../redflags.types.js");
class ThreeStateEvaluator {
    /**
     * Three-State Logic: AND
     * - If ANY is FALSE -> FALSE
     * - If ALL are TRUE -> TRUE
     * - Else -> UNKNOWN
     */
    static and(operands) {
        if (operands.length === 0)
            return redflags_types_js_1.ThreeStateValues.TRUE;
        if (operands.some((v) => v === redflags_types_js_1.ThreeStateValues.FALSE)) {
            return redflags_types_js_1.ThreeStateValues.FALSE;
        }
        if (operands.every((v) => v === redflags_types_js_1.ThreeStateValues.TRUE)) {
            return redflags_types_js_1.ThreeStateValues.TRUE;
        }
        return redflags_types_js_1.ThreeStateValues.UNKNOWN;
    }
    /**
     * Three-State Logic: OR
     * - If ANY is TRUE -> TRUE
     * - If ALL are FALSE -> FALSE
     * - Else -> UNKNOWN
     */
    static or(operands) {
        if (operands.length === 0)
            return redflags_types_js_1.ThreeStateValues.FALSE;
        if (operands.some((v) => v === redflags_types_js_1.ThreeStateValues.TRUE)) {
            return redflags_types_js_1.ThreeStateValues.TRUE;
        }
        if (operands.every((v) => v === redflags_types_js_1.ThreeStateValues.FALSE)) {
            return redflags_types_js_1.ThreeStateValues.FALSE;
        }
        return redflags_types_js_1.ThreeStateValues.UNKNOWN;
    }
    /**
     * Three-State Logic: NOT
     * - TRUE -> FALSE
     * - FALSE -> TRUE
     * - UNKNOWN -> UNKNOWN
     */
    static not(operand) {
        if (operand === redflags_types_js_1.ThreeStateValues.TRUE)
            return redflags_types_js_1.ThreeStateValues.FALSE;
        if (operand === redflags_types_js_1.ThreeStateValues.FALSE)
            return redflags_types_js_1.ThreeStateValues.TRUE;
        return redflags_types_js_1.ThreeStateValues.UNKNOWN;
    }
    /**
     * Evaluates an arbitrary condition tree (Group or Leaf) recursively
     */
    static evaluateTree(node, facts, triggeringFacts, unknownCriticalFacts) {
        if ('operator' in node && (node.operator === 'AND' || node.operator === 'OR' || node.operator === 'NOT')) {
            const group = node;
            const childResults = (group.conditions || []).map((child) => this.evaluateTree(child, facts, triggeringFacts, unknownCriticalFacts));
            switch (group.operator) {
                case 'AND':
                    return this.and(childResults);
                case 'OR':
                    return this.or(childResults);
                case 'NOT':
                    const single = childResults[0] ?? redflags_types_js_1.ThreeStateValues.UNKNOWN;
                    return this.not(single);
                default:
                    return redflags_types_js_1.ThreeStateValues.UNKNOWN;
            }
        }
        // Leaf condition
        return this.evaluateLeaf(node, facts, triggeringFacts, unknownCriticalFacts);
    }
    /**
     * Evaluates a leaf condition against available facts
     */
    static evaluateLeaf(leaf, facts, triggeringFacts, unknownCriticalFacts) {
        const fact = facts[leaf.fact];
        // Handling EXISTS / NOT_EXISTS
        if (leaf.operator === 'EXISTS') {
            const exists = fact && fact.state === redflags_types_js_1.FactStates.KNOWN;
            if (exists)
                triggeringFacts.add(leaf.fact);
            return exists ? redflags_types_js_1.ThreeStateValues.TRUE : redflags_types_js_1.ThreeStateValues.FALSE;
        }
        if (leaf.operator === 'NOT_EXISTS') {
            const notExists = !fact || fact.state !== redflags_types_js_1.FactStates.KNOWN;
            return notExists ? redflags_types_js_1.ThreeStateValues.TRUE : redflags_types_js_1.ThreeStateValues.FALSE;
        }
        // If fact is missing, unasked, skipped, or uncertain
        if (!fact || fact.state === redflags_types_js_1.FactStates.UNKNOWN) {
            if (fact?.isCritical) {
                unknownCriticalFacts.add(leaf.fact);
            }
            return redflags_types_js_1.ThreeStateValues.UNKNOWN;
        }
        if (fact.state === redflags_types_js_1.FactStates.NOT_APPLICABLE) {
            return redflags_types_js_1.ThreeStateValues.FALSE;
        }
        // Factual evaluation for KNOWN state
        const result = this.evaluateOperator(leaf, fact.value);
        if (result) {
            triggeringFacts.add(leaf.fact);
            return redflags_types_js_1.ThreeStateValues.TRUE;
        }
        return redflags_types_js_1.ThreeStateValues.FALSE;
    }
    static evaluateOperator(leaf, factValue) {
        const op = leaf.operator;
        const target = leaf.value;
        switch (op) {
            case 'EQUALS':
                return String(factValue).toLowerCase() === String(target).toLowerCase();
            case 'NOT_EQUALS':
                return String(factValue).toLowerCase() !== String(target).toLowerCase();
            case 'GREATER_THAN':
                return Number(factValue) > Number(target);
            case 'GREATER_THAN_OR_EQUAL':
                return Number(factValue) >= Number(target);
            case 'LESS_THAN':
                return Number(factValue) < Number(target);
            case 'LESS_THAN_OR_EQUAL':
                return Number(factValue) <= Number(target);
            case 'IN':
                if (Array.isArray(target)) {
                    return target.some((item) => String(item).toLowerCase() === String(factValue).toLowerCase());
                }
                return false;
            case 'NOT_IN':
                if (Array.isArray(target)) {
                    return !target.some((item) => String(item).toLowerCase() === String(factValue).toLowerCase());
                }
                return true;
            case 'BETWEEN':
                const val = Number(factValue);
                const min = Number(target);
                const max = Number(leaf.secondaryValue);
                return val >= min && val <= max;
            default:
                return false;
        }
    }
}
exports.ThreeStateEvaluator = ThreeStateEvaluator;
