import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { redflagsApi } from '../api/redflags.api';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

export const RuleEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [ruleCode, setRuleCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severityTier, setSeverityTier] = useState('IMMEDIATE');
  const [raiseOnIndeterminate, setRaiseOnIndeterminate] = useState(true);
  const [recommendedStaffAction, setRecommendedStaffAction] = useState('');
  const [groupOperator, setGroupOperator] = useState<'AND' | 'OR'>('AND');

  // Condition leaves
  const [conditions, setConditions] = useState<Array<{ fact: string; operator: string; value: any }>>([
    { fact: 'chest_pain', operator: 'EQUALS', value: true },
    { fact: 'breathing_difficulty', operator: 'EQUALS', value: true },
  ]);

  const addCondition = () => {
    setConditions([...conditions, { fact: 'loss_of_consciousness', operator: 'EQUALS', value: true }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, key: string, val: any) => {
    const updated = [...conditions];
    (updated[index] as any)[key] = val;
    setConditions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);

      const conditionTree = {
        operator: groupOperator,
        conditions: conditions.map((c) => ({
          fact: c.fact,
          operator: c.operator,
          value: c.value === 'true' ? true : c.value === 'false' ? false : c.value,
        })),
      };

      const testCases = [
        {
          name: 'All positive conditions test',
          facts: conditions.reduce((acc, c) => {
            acc[c.fact] = { state: 'KNOWN', value: c.value === 'false' ? false : true };
            return acc;
          }, {} as any),
          expectedOutcome: 'TRIGGERED',
        },
      ];

      await redflagsApi.createRule({
        ruleCode,
        name,
        description,
        severityTier,
        conditionTree,
        testCases,
        raiseOnIndeterminate,
        recommendedStaffAction,
        isIllustrative: false,
      });

      navigate('/redflags/rules');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to author rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/redflags/rules')}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Author Red-Flag Rule</h1>
          <p className="text-xs text-slate-500">Structured condition builder (no free-form executable code permitted).</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Rule Code</label>
            <input
              type="text"
              value={ruleCode}
              onChange={(e) => setRuleCode(e.target.value.toUpperCase())}
              placeholder="e.g. RF-ACS-001"
              required
              className="w-full px-3 py-2 border rounded-xl font-mono text-sm uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Severity Tier</label>
            <select
              value={severityTier}
              onChange={(e) => setSeverityTier(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
            >
              <option value="IMMEDIATE">IMMEDIATE (Assess right now)</option>
              <option value="URGENT">URGENT (Ahead of queue)</option>
              <option value="STAFF_CHECK">STAFF_CHECK (Verify missing detail)</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Rule Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acute Coronary Syndrome Screening"
            required
            className="w-full px-3 py-2 border rounded-xl text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Clinical Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Clinical rationale explaining symptom constellation..."
            required
            className="w-full px-3 py-2 border rounded-xl text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Recommended Staff Action</label>
          <input
            type="text"
            value={recommendedStaffAction}
            onChange={(e) => setRecommendedStaffAction(e.target.value)}
            placeholder="e.g. Immediate triage assessment, check SpO2 & BP, ECG referral"
            required
            className="w-full px-3 py-2 border rounded-xl text-sm"
          />
        </div>

        {/* Structured Condition Tree Builder */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Condition Group</h3>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span>Logical Operator:</span>
              <select
                value={groupOperator}
                onChange={(e) => setGroupOperator(e.target.value as any)}
                className="px-2 py-1 border rounded-lg bg-white"
              >
                <option value="AND">AND (All conditions must hold)</option>
                <option value="OR">OR (Any condition matches)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {conditions.map((cond, idx) => (
              <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200">
                <select
                  value={cond.fact}
                  onChange={(e) => updateCondition(idx, 'fact', e.target.value)}
                  className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-mono bg-white"
                >
                  <option value="chest_pain">chest_pain (BOOLEAN)</option>
                  <option value="breathing_difficulty">breathing_difficulty (BOOLEAN)</option>
                  <option value="loss_of_consciousness">loss_of_consciousness (BOOLEAN)</option>
                  <option value="severe_headache">severe_headache (BOOLEAN)</option>
                  <option value="cough_blood">cough_blood (BOOLEAN)</option>
                  <option value="systolic_bp">systolic_bp (NUMBER)</option>
                  <option value="oxygen_saturation">oxygen_saturation (NUMBER)</option>
                </select>

                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-xs bg-white"
                >
                  <option value="EQUALS">EQUALS</option>
                  <option value="NOT_EQUALS">NOT_EQUALS</option>
                  <option value="GREATER_THAN">GREATER_THAN</option>
                  <option value="LESS_THAN">LESS_THAN</option>
                </select>

                <input
                  type="text"
                  value={cond.value}
                  onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                  placeholder="Target value"
                  className="w-24 px-3 py-1.5 border rounded-lg text-xs"
                />

                <button
                  type="button"
                  onClick={() => removeCondition(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 text-xs font-bold text-slate-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Condition Item</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="raiseOnIndeterminate"
            checked={raiseOnIndeterminate}
            onChange={(e) => setRaiseOnIndeterminate(e.target.checked)}
            className="w-4 h-4 rounded text-sky-600"
          />
          <label htmlFor="raiseOnIndeterminate" className="text-xs font-bold text-slate-700">
            Sensitivity Bias: Raise STAFF_CHECK alert if any critical condition is UNKNOWN (skipped / unread)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/redflags/rules')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Draft Rule'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
