import {
  ConditionTree,
  GroupCondition,
  LeafCondition,
  ThreeStateValue,
  ThreeStateValues,
  ClinicalFact,
  FactStates,
} from '../redflags.types.js';

export class ThreeStateEvaluator {
  /**
   * Three-State Logic: AND
   * - If ANY is FALSE -> FALSE
   * - If ALL are TRUE -> TRUE
   * - Else -> UNKNOWN
   */
  public static and(operands: ThreeStateValue[]): ThreeStateValue {
    if (operands.length === 0) return ThreeStateValues.TRUE;
    if (operands.some((v) => v === ThreeStateValues.FALSE)) {
      return ThreeStateValues.FALSE;
    }
    if (operands.every((v) => v === ThreeStateValues.TRUE)) {
      return ThreeStateValues.TRUE;
    }
    return ThreeStateValues.UNKNOWN;
  }

  /**
   * Three-State Logic: OR
   * - If ANY is TRUE -> TRUE
   * - If ALL are FALSE -> FALSE
   * - Else -> UNKNOWN
   */
  public static or(operands: ThreeStateValue[]): ThreeStateValue {
    if (operands.length === 0) return ThreeStateValues.FALSE;
    if (operands.some((v) => v === ThreeStateValues.TRUE)) {
      return ThreeStateValues.TRUE;
    }
    if (operands.every((v) => v === ThreeStateValues.FALSE)) {
      return ThreeStateValues.FALSE;
    }
    return ThreeStateValues.UNKNOWN;
  }

  /**
   * Three-State Logic: NOT
   * - TRUE -> FALSE
   * - FALSE -> TRUE
   * - UNKNOWN -> UNKNOWN
   */
  public static not(operand: ThreeStateValue): ThreeStateValue {
    if (operand === ThreeStateValues.TRUE) return ThreeStateValues.FALSE;
    if (operand === ThreeStateValues.FALSE) return ThreeStateValues.TRUE;
    return ThreeStateValues.UNKNOWN;
  }

  /**
   * Evaluates an arbitrary condition tree (Group or Leaf) recursively
   */
  public static evaluateTree(
    node: ConditionTree,
    facts: Record<string, ClinicalFact>,
    triggeringFacts: Set<string>,
    unknownCriticalFacts: Set<string>
  ): ThreeStateValue {
    if ('operator' in node && (node.operator === 'AND' || node.operator === 'OR' || node.operator === 'NOT')) {
      const group = node as GroupCondition;
      const childResults = (group.conditions || []).map((child) =>
        this.evaluateTree(child, facts, triggeringFacts, unknownCriticalFacts)
      );

      switch (group.operator) {
        case 'AND':
          return this.and(childResults);
        case 'OR':
          return this.or(childResults);
        case 'NOT':
          const single = childResults[0] ?? ThreeStateValues.UNKNOWN;
          return this.not(single);
        default:
          return ThreeStateValues.UNKNOWN;
      }
    }

    // Leaf condition
    return this.evaluateLeaf(node as LeafCondition, facts, triggeringFacts, unknownCriticalFacts);
  }

  /**
   * Evaluates a leaf condition against available facts
   */
  public static evaluateLeaf(
    leaf: LeafCondition,
    facts: Record<string, ClinicalFact>,
    triggeringFacts: Set<string>,
    unknownCriticalFacts: Set<string>
  ): ThreeStateValue {
    const fact = facts[leaf.fact];

    // Handling EXISTS / NOT_EXISTS
    if (leaf.operator === 'EXISTS') {
      const exists = fact && fact.state === FactStates.KNOWN;
      if (exists) triggeringFacts.add(leaf.fact);
      return exists ? ThreeStateValues.TRUE : ThreeStateValues.FALSE;
    }

    if (leaf.operator === 'NOT_EXISTS') {
      const notExists = !fact || fact.state !== FactStates.KNOWN;
      return notExists ? ThreeStateValues.TRUE : ThreeStateValues.FALSE;
    }

    // If fact is missing, unasked, skipped, or uncertain
    if (!fact || fact.state === FactStates.UNKNOWN) {
      if (fact?.isCritical) {
        unknownCriticalFacts.add(leaf.fact);
      }
      return ThreeStateValues.UNKNOWN;
    }

    if (fact.state === FactStates.NOT_APPLICABLE) {
      return ThreeStateValues.FALSE;
    }

    // Factual evaluation for KNOWN state
    const result = this.evaluateOperator(leaf, fact.value);
    if (result) {
      triggeringFacts.add(leaf.fact);
      return ThreeStateValues.TRUE;
    }
    return ThreeStateValues.FALSE;
  }

  private static evaluateOperator(leaf: LeafCondition, factValue: any): boolean {
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
