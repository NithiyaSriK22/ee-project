"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockSummarizationProvider = exports.MockSummarizationProvider = void 0;
class MockSummarizationProvider {
    providerId = 'MOCK_PROVIDER';
    modelId = 'medikiosk-constrained-summary-v1';
    modelVersion = '2026.04';
    isMock = true;
    behaviorMode = 'NORMAL';
    setBehaviorMode(mode) {
        this.behaviorMode = mode;
    }
    async generate(userPayload, _systemPrompt) {
        const startTime = Date.now();
        if (this.behaviorMode === 'PROVIDER_DOWN') {
            throw new Error('LLM Provider connection timed out: host unreachable');
        }
        if (this.behaviorMode === 'MALFORMED_JSON') {
            return {
                rawOutput: '{ "sections": [ broken_json...',
                modelId: this.modelId,
                modelVersion: this.modelVersion,
                tokensUsed: { promptTokens: 120, completionTokens: 15, totalTokens: 135 },
                latencyMs: Date.now() - startTime,
            };
        }
        // Extract clinical items from XML payload
        const clinicalDataMatch = userPayload.match(/<clinical_data>([\s\S]*?)<\/clinical_data>/);
        let items = [];
        if (clinicalDataMatch && clinicalDataMatch[1]) {
            try {
                items = JSON.parse(clinicalDataMatch[1]);
            }
            catch {
                items = [];
            }
        }
        const sectionsMap = new Map();
        // Group available verified items by section and produce grounded statements
        for (const item of items) {
            const list = sectionsMap.get(item.section) || [];
            let statementText = '';
            if (this.behaviorMode === 'INVENTED_DOSE' && item.section === 'MEDICATIONS_AND_ALLERGIES') {
                statementText = `Patient takes ${item.value || 'Amoxicillin'} 1200mg three times daily.`; // Invented 1200mg!
            }
            else if (this.behaviorMode === 'DIAGNOSTIC_LANGUAGE') {
                statementText = `Patient presentation likely indicates acute bacterial bronchitis; recommend starting Azithromycin.`;
            }
            else if (this.behaviorMode === 'WITHHELD_CITATION') {
                // Cites a non-existent or withheld item id
                list.push({
                    text: `Patient has severe penicillin allergy with rash.`,
                    source_item_ids: ['itm_doc_withheld_unreadable'],
                });
                sectionsMap.set(item.section, list);
                continue;
            }
            else if (this.behaviorMode === 'ABSENCE_AS_NEGATIVE') {
                statementText = `Patient has no known allergies and no symptoms.`;
            }
            else {
                // NORMAL grounded statement
                if (item.section === 'CHIEF_COMPLAINT') {
                    statementText = `Reports chief complaint: ${item.value}`;
                }
                else if (item.section === 'HISTORY_OF_PRESENT_ILLNESS') {
                    statementText = `History notes: ${item.value}`;
                }
                else if (item.section === 'MEDICATIONS_AND_ALLERGIES') {
                    statementText = `Current medication recorded: ${item.value}`;
                }
                else {
                    statementText = `${item.label}: ${item.value}`;
                }
            }
            list.push({
                text: statementText,
                source_item_ids: [item.item_id],
            });
            sectionsMap.set(item.section, list);
        }
        const sectionsOutput = Array.from(sectionsMap.entries()).map(([section, statements]) => ({
            section,
            statements,
        }));
        // Ensure at least one section exists if items were empty
        if (sectionsOutput.length === 0) {
            sectionsOutput.push({
                section: 'CHIEF_COMPLAINT',
                statements: [],
            });
        }
        const responsePayload = JSON.stringify({ sections: sectionsOutput }, null, 2);
        return {
            rawOutput: responsePayload,
            modelId: this.modelId,
            modelVersion: this.modelVersion,
            tokensUsed: { promptTokens: 350, completionTokens: 180, totalTokens: 530 },
            latencyMs: Date.now() - startTime,
        };
    }
}
exports.MockSummarizationProvider = MockSummarizationProvider;
exports.mockSummarizationProvider = new MockSummarizationProvider();
