import React, { useState } from 'react';
import {
  GitCompare, AlertTriangle, CheckCircle2, Shield,
  ArrowRight, Activity, MessageSquare, Check, X
} from 'lucide-react';
import { ConflictItem } from '../../types';
import { api } from '../../services/api';

interface ConflictsViewProps {
  caseId: string;
  conflicts: ConflictItem[];
  onConflictUpdated: () => void;
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
}

export const ConflictsView: React.FC<ConflictsViewProps> = ({
  caseId,
  conflicts,
  onConflictUpdated,
  onInspectTraceability
}) => {
  const [reviewNotes, setReviewNotes] = useState<{ [key: number]: string }>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleToggleReview = async (conflict: ConflictItem) => {
    setLoadingId(conflict.id);
    try {
      await api.reviewConflict(
        caseId,
        conflict.id,
        !conflict.is_reviewed,
        reviewNotes[conflict.id] || conflict.review_notes || 'Reviewed by lead cyber investigator.'
      );
      onConflictUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-white/[0.08] pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-rose-400" />
          Cross-Evidence Conflict & Contradiction Registry
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Section 5.6 & Non-Goals: EvidenceX never auto-resolves contradictions. Discrepancies are surfaced side-by-side for human investigator judgment.
        </p>
      </div>

      <div className="space-y-6">
        {conflicts.length > 0 ? (
          conflicts.map((c) => (
            <div
              key={c.id}
              className={`p-6 rounded-3xl border transition-all space-y-5 ${
                c.is_reviewed
                  ? 'glass-panel opacity-80'
                  : 'glass-panel border-rose-500/40 shadow-2xl'
              }`}
            >
              {/* Conflict Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl border ${
                    c.is_reviewed ? 'bg-white/[0.06] text-slate-400 border-white/[0.08]' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-mono">{c.field_name}</h3>
                    <p className="text-xs text-slate-400 font-mono">Contradictory values asserted by independent artifacts</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    c.is_reviewed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {c.is_reviewed ? 'INVESTIGATOR REVIEWED' : 'UNRESOLVED (Action Required)'}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source A */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-sky-400">
                      Source A: [{c.source_a_id}]
                    </span>
                    <button
                      onClick={() => onInspectTraceability(c.field_name, c.value_a, c.source_a_id, 0.94)}
                      className="glass-btn px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer"
                    >
                      Trace Provenance
                    </button>
                  </div>
                  <div className="text-base font-bold text-slate-100 font-mono break-words">
                    {c.value_a}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Ref: {c.source_a_ref || "Direct Document Extract"}
                  </div>
                </div>

                {/* Source B */}
                <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-purple-400">
                      Source B: [{c.source_b_id}]
                    </span>
                    <button
                      onClick={() => onInspectTraceability(c.field_name, c.value_b, c.source_b_id, 0.98)}
                      className="glass-btn px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer"
                    >
                      Trace Provenance
                    </button>
                  </div>
                  <div className="text-base font-bold text-slate-100 font-mono break-words">
                    {c.value_b}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Ref: {c.source_b_ref || "Direct Document Extract"}
                  </div>
                </div>
              </div>

              {/* Discrepancy Details */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/[0.06] text-xs text-slate-300 font-mono">
                <span className="text-rose-400 font-bold">Variance Analysis: </span>
                {c.discrepancy_details}
              </div>

              {/* Review Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Add investigator review resolution note..."
                    value={reviewNotes[c.id] ?? (c.review_notes || '')}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [c.id]: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-black/60 border border-white/[0.1] rounded-xl text-slate-200 focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                <button
                  onClick={() => handleToggleReview(c)}
                  disabled={loadingId === c.id}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    c.is_reviewed
                      ? 'glass-btn'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/25'
                  }`}
                >
                  {c.is_reviewed ? (
                    <>
                      <X className="w-4 h-4" /> Mark Unreviewed
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Mark as Reviewed & Acknowledged
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs glass-panel rounded-2xl font-mono">
            No contradictory facts detected across current evidence inventory.
          </div>
        )}
      </div>
    </div>
  );
};
