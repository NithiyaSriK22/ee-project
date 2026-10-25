import {
  AssembledSummaryInput,
  SummaryInputItem,
  SummarySections,
  SummarySectionType,
  SummarySectionDto,
  SummaryStatementDto,
  ModelStructuredOutput,
} from '../summary.types.js';

export class TemplateSummaryBuilder {
  public static readonly ALL_SECTIONS: SummarySectionType[] = [
    SummarySections.CHIEF_COMPLAINT,
    SummarySections.HISTORY_OF_PRESENT_ILLNESS,
    SummarySections.PAST_MEDICAL_HISTORY,
    SummarySections.MEDICATIONS_AND_ALLERGIES,
    SummarySections.FAMILY_AND_PERSONAL_HISTORY,
    SummarySections.REVIEW_OF_SYSTEMS,
    SummarySections.PRIOR_INVESTIGATIONS,
  ];

  /**
   * Builds a safe, deterministic, template-only clinical summary.
   * Zero LLM calls, zero prose generation, 100% grounded in code.
   */
  public static buildFallbackSummary(assembledInput: AssembledSummaryInput): SummarySectionDto[] {
    const sectionsDto: SummarySectionDto[] = [];
    const itemsBySection = this.groupItemsBySection(assembledInput.items);

    let secOrder = 1;
    for (const section of this.ALL_SECTIONS) {
      const sectionItems = itemsBySection.get(section) || [];
      const statements: SummaryStatementDto[] = [];
      let stmtOrder = 1;

      // 1. Process items in this section
      if (sectionItems.length > 0) {
        for (const item of sectionItems) {
          const stmt = this.formatItemStatement(item, stmtOrder++);
          statements.push(stmt);
        }
      }

      // 2. Insert any conflict warnings for this section
      const sectionConflicts = assembledInput.conflicts.filter((c) => c.section === section);
      for (const conflict of sectionConflicts) {
        statements.push({
          text: conflict.conflictMessage,
          origin: 'CODE_TEMPLATE',
          order: stmtOrder++,
          sources: [
            ...(conflict.interviewItem
              ? [
                  {
                    sourceType: conflict.interviewItem.sourceType,
                    sourceRef: conflict.interviewItem.sourceRef,
                    sourceItemId: conflict.interviewItem.itemId,
                  },
                ]
              : []),
            ...(conflict.documentItem
              ? [
                  {
                    sourceType: conflict.documentItem.sourceType,
                    sourceRef: conflict.documentItem.sourceRef,
                    sourceItemId: conflict.documentItem.itemId,
                  },
                ]
              : []),
          ],
        });
      }

      // 3. If section is empty, insert deterministic empty placeholder
      if (statements.length === 0) {
        statements.push({
          text: '[No information collected]',
          origin: 'CODE_TEMPLATE',
          order: 1,
          sources: [],
        });
      }

      sectionsDto.push({
        section,
        order: secOrder++,
        statements,
      });
    }

    return sectionsDto;
  }

  /**
   * Merges model-phrased statements with code-inserted placeholders for withheld/uncertain items,
   * conflicts, and empty sections.
   */
  public static mergeWithCodePlaceholders(
    modelOutput: ModelStructuredOutput,
    assembledInput: AssembledSummaryInput
  ): SummarySectionDto[] {
    const sectionsDto: SummarySectionDto[] = [];
    const modelSectionsMap = new Map<string, ModelStructuredOutput['sections'][0]>();
    for (const sec of modelOutput.sections) {
      modelSectionsMap.set(sec.section, sec);
    }

    const itemsMap = new Map<string, SummaryInputItem>();
    for (const item of assembledInput.items) {
      itemsMap.set(item.itemId, item);
    }

    const withheldItemsBySection = this.groupItemsBySection(
      assembledInput.items.filter((i) =>
        ['UNVERIFIED', 'UNREADABLE', 'MISMATCH_FLAGGED', 'DECLINED', 'NOT_ANSWERED', 'SKIPPED'].includes(
          i.status
        )
      )
    );

    let secOrder = 1;
    for (const section of this.ALL_SECTIONS) {
      const modelSec = modelSectionsMap.get(section);
      const statements: SummaryStatementDto[] = [];
      let stmtOrder = 1;

      // Add model statements
      if (modelSec && Array.isArray(modelSec.statements)) {
        for (const mStmt of modelSec.statements) {
          // Check if statement is a patient verbatim quote
          const isPatientQuote = mStmt.source_item_ids.some((id) => {
            const item = itemsMap.get(id);
            return item?.sourceType === 'INTERVIEW' && item?.rawText && item.rawText.length > 25;
          });

          statements.push({
            text: mStmt.text,
            origin: isPatientQuote ? 'PATIENT_QUOTE' : 'MODEL',
            order: stmtOrder++,
            sources: mStmt.source_item_ids.map((id) => {
              const item = itemsMap.get(id);
              return {
                sourceType: item?.sourceType || 'SYSTEM',
                sourceRef: item?.sourceRef || id,
                sourceItemId: id,
              };
            }),
          });
        }
      }

      // Add code-inserted placeholders for withheld / uncertain items in this section
      const withheld = withheldItemsBySection.get(section) || [];
      for (const item of withheld) {
        statements.push(this.formatItemStatement(item, stmtOrder++));
      }

      // Add code-inserted safety notices for any verified medication omitted by model statements
      if (section === SummarySections.MEDICATIONS_AND_ALLERGIES && modelSec?.statements) {
        const citedInSec = new Set<string>();
        for (const st of modelSec.statements) {
          for (const cid of st.source_item_ids || []) {
            citedInSec.add(cid);
          }
        }
        const sectionVerifiedItems = assembledInput.items.filter(
          (i) => i.section === section && (i.status === 'VERIFIED' || i.status === 'ANSWERED')
        );
        for (const vItem of sectionVerifiedItems) {
          if (!citedInSec.has(vItem.itemId)) {
            statements.push({
              text: `[Omitted from model summary — verify active regimen: ${vItem.label}: ${vItem.value}]`,
              origin: 'CODE_TEMPLATE',
              order: stmtOrder++,
              sources: [
                {
                  sourceType: vItem.sourceType,
                  sourceRef: vItem.sourceRef,
                  sourceItemId: vItem.itemId,
                },
              ],
            });
          }
        }
      }

      // Add conflict markers for this section
      const sectionConflicts = assembledInput.conflicts.filter((c) => c.section === section);
      for (const conflict of sectionConflicts) {
        statements.push({
          text: conflict.conflictMessage,
          origin: 'CODE_TEMPLATE',
          order: stmtOrder++,
          sources: [
            ...(conflict.interviewItem
              ? [
                  {
                    sourceType: conflict.interviewItem.sourceType,
                    sourceRef: conflict.interviewItem.sourceRef,
                    sourceItemId: conflict.interviewItem.itemId,
                  },
                ]
              : []),
            ...(conflict.documentItem
              ? [
                  {
                    sourceType: conflict.documentItem.sourceType,
                    sourceRef: conflict.documentItem.sourceRef,
                    sourceItemId: conflict.documentItem.itemId,
                  },
                ]
              : []),
          ],
        });
      }

      // If section is completely empty, insert standard placeholder
      if (statements.length === 0) {
        statements.push({
          text: '[No information collected]',
          origin: 'CODE_TEMPLATE',
          order: 1,
          sources: [],
        });
      }

      sectionsDto.push({
        section,
        order: secOrder++,
        statements,
      });
    }

    return sectionsDto;
  }

  private static formatItemStatement(item: SummaryInputItem, order: number): SummaryStatementDto {
    let text = '';
    let origin: 'CODE_TEMPLATE' | 'PATIENT_QUOTE' = 'CODE_TEMPLATE';

    switch (item.status) {
      case 'UNREADABLE':
        text = `[Illegible in original document — verify manually]`;
        break;
      case 'MISMATCH_FLAGGED':
        text = item.rawText
          ? `[Document text read as '${item.rawText}', did not match any known reference — verify against original]`
          : `[Document text flagged for verification mismatch — verify manually]`;
        break;
      case 'UNVERIFIED':
        text = `[Unverified document field: ${item.label} — verify against original]`;
        break;
      case 'DECLINED':
        text = `[Patient declined to answer: ${item.label}]`;
        break;
      case 'NOT_ANSWERED':
        text = `[Not answered: ${item.label}]`;
        break;
      case 'SKIPPED':
        text = `[Question skipped: ${item.label}]`;
        break;
      case 'VERIFIED':
      case 'ANSWERED':
      default:
        if (item.sourceType === 'INTERVIEW' && item.value) {
          text = `${item.label}: "${item.value}"`;
          origin = 'PATIENT_QUOTE';
        } else {
          text = `${item.label}: ${item.value || '[No value]'}`;
        }
        break;
    }

    return {
      text,
      origin,
      order,
      sources: [
        {
          sourceType: item.sourceType,
          sourceRef: item.sourceRef,
          sourceItemId: item.itemId,
        },
      ],
    };
  }

  private static groupItemsBySection(
    items: SummaryInputItem[]
  ): Map<SummarySectionType, SummaryInputItem[]> {
    const map = new Map<SummarySectionType, SummaryInputItem[]>();
    for (const item of items) {
      const list = map.get(item.section) || [];
      list.push(item);
      map.set(item.section, list);
    }
    return map;
  }
}
