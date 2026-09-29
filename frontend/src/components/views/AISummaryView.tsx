import React, { useState } from 'react';
import {
  FileCheck, Shield, CheckCircle2, AlertTriangle, ExternalLink,
  DollarSign, Activity, Edit3, Save, Check, Info
} from 'lucide-react';
import { CaseSummaryData } from '../../types';
import { api } from '../../services/api';

interface AISummaryViewProps {
  caseId: string;
  summary: CaseSummaryData | null;
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
  onSummaryUpdated: () => void;
}

export const AISummaryView: React.FC<AISummaryViewProps> = ({
  caseId,
  summary,
  onInspectTraceability,
  onSummaryUpdated
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(summary?.investigator_notes || '');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setNotes(summary?.investigator_notes || '');
  }, [summary]);

  if (!summary) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center mx-auto text-sky-400">
          <FileCheck className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">No Summary Generated Yet for {caseId}</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Upload or paste evidence in the Upload Hub to automatically generate a grounded forensic narrative and executive summary.
        </p>
      </div>
    );
  }

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await api.updateSummaryNotes(caseId, notes);
      setIsEditingNotes(false);
      onSummaryUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="border-b border-white/[0.08] pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-sky-400" />

          Referenced Chronological Narrative & AI Incident Summary
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Section 5.10 Structural Constraint: Every sentence in the narrative spine is strictly anchored to an inline evidence reference [EV-###].
        </p>
      </div>

      {/* 1. Executive Summary */}
      <div className="p-6 rounded-3xl glass-panel border border-white/[0.08] space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400" />
          1. Executive Summary
        </h2>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {summary.executive_summary}
        </p>
      </div>

      {/* 2. Chronological Incident Narrative Spine */}
      <div className="p-6 rounded-3xl glass-panel border border-white/[0.08] space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            2. Chronological Incident Narrative (Source Referenced)
          </h2>
          <span className="text-[11px] text-sky-400 font-mono">
            Click any tag to inspect source custody
          </span>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {summary.narrative.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-sky-300 font-mono text-xs">
                  {item.timestamp_display}
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {item.evidence_references.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => onInspectTraceability("Narrative Citation", item.event_text, ref, 0.96)}
                      className="px-2.5 py-0.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800 font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      [{ref}]
                    </button>
                  ))}
                </div>
              </div>

              <p className={item.is_unresolved_gap ? 'text-amber-300 font-semibold italic' : 'text-slate-200'}>
                {item.event_text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Financial Summary Roll-up */}
      <div className="p-6 rounded-3xl glass-panel border border-white/[0.08] space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          3. Sourced Financial Roll-up
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-1">
            <span className="text-xs text-slate-400 font-mono">Total Evidenced Ledger Extraction:</span>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {summary.financial_rollup.total_evidenced_loss_formatted}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-1">
            <span className="text-xs text-slate-400 font-mono">Contested Amounts:</span>
            <div className="text-sm font-bold font-mono text-rose-400">
              {summary.financial_rollup.contested_amounts.length > 0
                ? `${summary.financial_rollup.contested_amounts.length} Discrepancies (See Conflicts)`
                : 'No Contested Amounts'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Structural Flags Summary */}
      {summary.structural_flags_summary && (
        <div className="p-5 rounded-2xl glass-card border border-white/[0.08] space-y-2 text-xs">
          <h2 className="font-bold uppercase tracking-wider text-slate-400 font-mono">
            4. Document & Sequence Structural Flags
          </h2>
          <p className="text-slate-300 leading-relaxed font-sans">
            {summary.structural_flags_summary}
          </p>
        </div>
      )}

      {/* 5. Investigator Notes & Annotations */}
      <div className="p-6 rounded-3xl glass-panel border border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-sky-400" />
            5. Investigator Annotations (Editable Layer)
          </h2>
          {!isEditingNotes ? (
            <button
              onClick={() => {
                setNotes(summary.investigator_notes || '');
                setIsEditingNotes(true);
              }}
              className="glass-btn px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-400" /> Edit Notes
            </button>
          ) : (
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Annotation'}
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3.5 py-2.5 bg-black/70 border border-white/[0.1] rounded-xl text-slate-200 text-xs focus:outline-none focus:border-sky-400 font-mono"
          />
        ) : (
          <p className="text-xs text-slate-300 font-mono leading-relaxed p-3.5 rounded-2xl bg-black/60 border border-white/[0.06]">
            {summary.investigator_notes || "No annotations recorded."}
          </p>
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 space-y-1 font-mono">
        <span className="font-bold">MANDATORY LEGAL DISCLAIMER: </span>
        <span>{summary.disclaimer}</span>
      </div>
    </div>
  );
};
