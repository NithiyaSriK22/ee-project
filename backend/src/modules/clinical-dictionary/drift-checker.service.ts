import { DictionaryStore } from './dictionary-store.js';
import { TerminologyStatuses } from './dictionary.types.js';
import { DEFAULT_GENERAL_OPD_QUESTIONS } from '../interview/seed-templates.js';
import { ILLUSTRATIVE_SEED_RULES } from '../redflags/seed/illustrative-rules.js';
import { FieldTypes } from '../documents/documents.types.js';
import { SummarySections } from '../summary/summary.types.js';
import { logger } from '../../config/logger.js';

export interface DriftViolation {
  module: string;
  code: string;
  category: string;
  reason: 'UNKNOWN_CODE' | 'RETIRED_CODE' | 'NON_ACTIVE_CODE' | 'MISMATCHED_MAPPING';
  detail: string;
}

export interface DriftScanResult {
  isClean: boolean;
  timestamp: Date;
  scannedCount: number;
  violations: DriftViolation[];
}

export class DriftCheckerService {
  /**
   * Scans all production modules, seeds, and fixtures for terminology drift against the active dictionary
   */
  public static scanAllModules(): DriftScanResult {
    const violations: DriftViolation[] = [];
    let scannedCount = 0;

    // 1. Scan Interview Questions & Option Codes
    for (const q of DEFAULT_GENERAL_OPD_QUESTIONS) {
      scannedCount++;
      const entry = DictionaryStore.getEntry(q.questionCode);
      if (!entry) {
        violations.push({
          module: 'Module 3 (Interview)',
          code: q.questionCode,
          category: 'QUESTIONS',
          reason: 'UNKNOWN_CODE',
          detail: `Question code "${q.questionCode}" is not registered in Clinical Data Dictionary.`,
        });
      } else if (entry.status !== TerminologyStatuses.ACTIVE) {
        violations.push({
          module: 'Module 3 (Interview)',
          code: q.questionCode,
          category: 'QUESTIONS',
          reason: 'NON_ACTIVE_CODE',
          detail: `Question code "${q.questionCode}" is in status "${entry.status}" (must be ACTIVE).`,
        });
      }

      // Check linked fact key if present
      const qEntry = entry as any;
      if (qEntry?.linkedFactKey) {
        scannedCount++;
        const factEntry = DictionaryStore.getEntry(qEntry.linkedFactKey);
        if (!factEntry) {
          violations.push({
            module: 'Module 3 (Interview)',
            code: qEntry.linkedFactKey,
            category: 'FACT_KEYS',
            reason: 'UNKNOWN_CODE',
            detail: `Linked fact key "${qEntry.linkedFactKey}" in question "${q.questionCode}" does not exist in dictionary.`,
          });
        }
      }

      // Check answer options
      if (q.answerOptions) {
        for (const opt of q.answerOptions) {
          scannedCount++;
          const optCode = typeof opt === 'string' ? opt : opt.code;
          const optEntry = DictionaryStore.getEntry(optCode);
          if (!optEntry) {
            violations.push({
              module: 'Module 3 (Interview)',
              code: optCode,
              category: 'OPTION_CODES',
              reason: 'UNKNOWN_CODE',
              detail: `Option code "${optCode}" for question "${q.questionCode}" is not in dictionary.`,
            });
          }
        }
      }
    }

    // 2. Scan Red-Flag Rules and Fact Keys
    for (const rule of ILLUSTRATIVE_SEED_RULES) {
      const inspectConditions = (conds: any[]) => {
        for (const cond of conds) {
          if (cond.fact) {
            scannedCount++;
            const fact = DictionaryStore.getEntry(cond.fact);
            if (!fact) {
              violations.push({
                module: 'Module 6 (Red-Flags)',
                code: cond.fact,
                category: 'FACT_KEYS',
                reason: 'UNKNOWN_CODE',
                detail: `Fact key "${cond.fact}" in rule "${rule.ruleCode}" is not in dictionary.`,
              });
            } else if (fact.status !== TerminologyStatuses.ACTIVE) {
              violations.push({
                module: 'Module 6 (Red-Flags)',
                code: cond.fact,
                category: 'FACT_KEYS',
                reason: 'NON_ACTIVE_CODE',
                detail: `Fact key "${cond.fact}" in rule "${rule.ruleCode}" is in status "${fact.status}".`,
              });
            }
          }
          if (cond.conditions) {
            inspectConditions(cond.conditions);
          }
        }
      };

      if ((rule.conditionTree as any)?.conditions) {
        inspectConditions((rule.conditionTree as any).conditions);
      }
    }

    // 3. Scan Document Field Types
    for (const field of Object.values(FieldTypes)) {
      scannedCount++;
      const fieldEntry = DictionaryStore.getEntry(field);
      if (!fieldEntry) {
        violations.push({
          module: 'Module 4 (Documents)',
          code: field,
          category: 'DOCUMENT_FIELD_TYPES',
          reason: 'UNKNOWN_CODE',
          detail: `Field type "${field}" is not registered in Clinical Data Dictionary.`,
        });
      } else if (fieldEntry.status !== TerminologyStatuses.ACTIVE) {
        violations.push({
          module: 'Module 4 (Documents)',
          code: field,
          category: 'DOCUMENT_FIELD_TYPES',
          reason: 'NON_ACTIVE_CODE',
          detail: `Field type "${field}" is in status "${fieldEntry.status}".`,
        });
      }
    }

    // 4. Scan Summary Sections
    for (const sec of Object.values(SummarySections)) {
      scannedCount++;
      const secEntry = DictionaryStore.getEntry(sec);
      // If section is one of the seed sections, check active status
      if (secEntry && secEntry.status !== TerminologyStatuses.ACTIVE) {
        violations.push({
          module: 'Module 5 (Summary)',
          code: sec,
          category: 'SECTIONS',
          reason: 'NON_ACTIVE_CODE',
          detail: `Summary section "${sec}" is in status "${secEntry.status}".`,
        });
      }
    }

    const isClean = violations.length === 0;

    if (!isClean) {
      logger.error('[TERMINOLOGY_DRIFT_DETECTED]', {
        totalViolations: violations.length,
        violations: violations.slice(0, 5),
      });
    } else {
      logger.info('[TERMINOLOGY_DRIFT_SCAN_PASSED]', { scannedCount });
    }

    return {
      isClean,
      timestamp: new Date(),
      scannedCount,
      violations,
    };
  }

  public static assertNoDrift(): void {
    const result = this.scanAllModules();
    if (!result.isClean) {
      throw new Error(
        `Terminology drift check failed with ${result.violations.length} violations: ${JSON.stringify(
          result.violations,
          null,
          2
        )}`
      );
    }
  }
}
