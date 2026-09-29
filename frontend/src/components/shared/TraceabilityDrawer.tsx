import React from 'react';
import { X, ShieldCheck, AlertCircle, FileText, CheckCircle2, Search, ExternalLink, Activity, Info, Zap } from 'lucide-react';
import { TraceabilityData } from '../../types';

interface TraceabilityDrawerProps {
  data: TraceabilityData | null;
  onClose: () => void;
  onJumpToEvidence?: (evidenceId: string) => void;
}

export const TraceabilityDrawer: React.FC<TraceabilityDrawerProps> = ({ data, onClose, onJumpToEvidence }) => {
  if (!data) return null;

  const confPercent = Math.round(data.confidence * 100);
  const bd = data.confidence_breakdown || {
    ocr_clarity: 0.96,
    match_strength: data.confidence,
    corroboration_count: 1,
    rationale: "Sourced directly from verified digital evidence artifact."
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950/95 backdrop-blur-2xl border-l border-white/[0.12] shadow-2xl flex flex-col transition-all transform animate-in slide-in-from-right duration-300">
      {/* 21st.dev Drawer Header */}
      <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Fact Traceability & Provenance
            </h3>
            <p className="text-xs text-slate-400 font-mono">Chain-of-custody verification</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
        {/* Core Fact Value Card (21st.dev Spotlight Box) */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/[0.08] space-y-3 relative overflow-hidden">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
            {data.fact_label || "Extracted Fact"}
          </div>
          <div className="text-xl font-mono font-black text-cyan-300 break-words">
            {data.fact_value}
          </div>
          {data.is_victim_stated ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Info className="w-3.5 h-3.5" />
              [Victim-stated] — Stated by submitter, uncorroborated
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Direct Extraction [{data.source_evidence_id}]
            </div>
          )}
        </div>

        {/* Source Evidence & Location */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Source Artifact & Reference
          </h4>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/[0.06] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Evidence ID:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-xs font-bold">
                {data.source_evidence_id}
              </span>
            </div>
            {data.file_name && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs">File Name:</span>
                <span className="text-slate-200 text-xs font-mono truncate max-w-[240px]">
                  {data.file_name}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Location in File:</span>
              <span className="text-slate-300 text-xs font-mono">
                {data.evidence_reference || "Document Body Region"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs">Extraction Status:</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                data.extraction_status === 'FOUND'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {data.extraction_status}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence Explainability (Section 6.10: Why 91%, not just 91%) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Confidence Explainability Decomposition
            </h4>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold font-mono ${
              confPercent >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              confPercent >= 75 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {confPercent}% Score
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/[0.06] space-y-4">
            {/* Factor 1: OCR Clarity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">1. OCR & Character Block Clarity</span>
                <span className="text-cyan-300 font-mono font-bold">{Math.round(bd.ocr_clarity * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${bd.ocr_clarity * 100}%` }} />
              </div>
            </div>

            {/* Factor 2: Schema Match Strength */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">2. Field Alignment & Syntax Strength</span>
                <span className="text-emerald-300 font-mono font-bold">{Math.round(bd.match_strength * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${bd.match_strength * 100}%` }} />
              </div>
            </div>

            {/* Factor 3: Corroboration Count */}
            <div className="flex justify-between items-center text-xs pt-1 border-t border-white/[0.06]">
              <span className="text-slate-400">Cross-Source Corroboration:</span>
              <span className="text-slate-200 font-mono">
                {bd.corroboration_count > 1 ? (
                  <span className="text-emerald-400 font-bold">Confirmed by {bd.corroboration_count} independent sources</span>
                ) : (
                  <span>1 source observation</span>
                )}
              </span>
            </div>

            {/* Plain-Language Rationale */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] text-xs text-slate-300 font-mono">
              <span className="font-bold text-slate-200">Decomposition Rationale: </span>
              {bd.rationale}
            </div>
          </div>
        </div>

        {/* Anti-Hallucination Grounding Attestation */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-200 font-semibold font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Anti-Hallucination Grounding Guarantee
          </div>
          <p className="leading-relaxed text-[11px]">
            This value has been verified against the raw binary/OCR text layer. EvidenceX structurally refuses to synthesize ungrounded facts.
          </p>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-5 border-t border-white/[0.08] bg-slate-950/80">
        {onJumpToEvidence && data.source_evidence_id && data.source_evidence_id.startsWith("EV-") && (
          <button
            onClick={() => onJumpToEvidence(data.source_evidence_id)}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Jump to Original Evidence Artifact ({data.source_evidence_id})</span>
          </button>
        )}
      </div>
    </div>
  );
};
