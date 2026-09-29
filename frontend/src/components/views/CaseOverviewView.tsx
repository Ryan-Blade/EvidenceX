import React from 'react';
import {
  FileText, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle,
  Cpu, Users, DollarSign, Clock, GitCompare, Fingerprint, Sparkles,
  ArrowRight, Activity, ExternalLink, ShieldAlert, Check, Compass,
  ChevronRight, AlertCircle, Zap
} from 'lucide-react';
import { CaseData, FraudPatternData, ProfileMatchItem } from '../../types';

interface CaseOverviewViewProps {
  caseData: CaseData;
  fraudPattern: FraudPatternData | null;
  fingerprints: ProfileMatchItem[];
  onOpenSignOff: () => void;
  onNavigate: (view: string) => void;
  onInspectTraceability: (factLabel: string, factValue: string, evId: string, conf: number) => void;
}

export const CaseOverviewView: React.FC<CaseOverviewViewProps> = ({
  caseData,
  fraudPattern,
  fingerprints,
  onOpenSignOff,
  onNavigate,
  onInspectTraceability
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. 21st.dev Incident Status Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/[0.08] relative overflow-hidden space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-400/30">
                {caseData.id}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                caseData.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' :
                'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              }`}>
                {caseData.priority} Priority
              </span>
              {caseData.is_demo_case && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                  Demo Simulation
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {caseData.title}
            </h1>

            <p className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Classification: <b className="text-slate-200">{caseData.incident_type}</b></span>
              <span>Investigator: <b className="text-slate-200">{caseData.investigator_name}</b></span>
              <span>Incident Date: <b className="text-slate-200">{caseData.incident_date || '14 Oct 2026'}</b></span>
            </p>
          </div>

          {/* Lifecycle Action Pill & Sign-Off Trigger */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-2.5 px-4 rounded-2xl bg-black/60 border border-white/[0.08] text-xs font-mono flex items-center gap-2">
              <span className="text-slate-400">Lifecycle State:</span>
              <span className={`font-bold ${
                caseData.status === 'Confirmed' ? 'text-emerald-400' :
                caseData.status === 'Under Review' ? 'text-sky-400' : 'text-indigo-400'
              }`}>
                {caseData.status}
              </span>
            </div>

            <button
              onClick={onOpenSignOff}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Investigator Sign-Off</span>
            </button>
          </div>
        </div>

        {caseData.description && (
          <p className="text-xs text-slate-300 pt-3 border-t border-white/[0.06] leading-relaxed max-w-4xl font-sans">
            {caseData.description}
          </p>
        )}
      </div>

      {/* 2. 21st.dev Known Scammer Operation Profile Alert Banner */}
      {fingerprints.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900/40 to-black/60 border border-amber-500/40 shadow-xl space-y-4 relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  Known Scammer Operation Profile Match (Section 6.4)
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Cross-case behavioral signature embedding & indicator correlation
                </p>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 w-fit">
              {Math.round(fingerprints[0].match_confidence * 100)}% Pattern Match
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] space-y-2.5 text-xs">
            <p className="text-slate-200 font-mono leading-relaxed">
              {fingerprints[0].alert_text}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-slate-400 font-mono text-[11px]">Matched Identifiers:</span>
              {fingerprints[0].matched_indicators.map((ind, i) => (
                <span
                  key={i}
                  onClick={() => onInspectTraceability("Correlated Scammer Indicator", ind, "PROFILE_MATCH", fingerprints[0].match_confidence)}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono text-xs cursor-pointer hover:bg-amber-900 transition-colors"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-amber-400/80 italic font-mono">
            * Pattern-match signal for investigator review — attribution to the same individual is not claimed as script kits are frequently resold.
          </p>
        </div>
      )}

      {/* 3. 21st.dev Bento Quick Access Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-xs">
        {[
          { label: 'Evidence Files', val: `${caseData.evidence_count} Ingested`, view: 'upload', icon: Cpu, color: 'text-sky-400 bg-sky-500/10 border-sky-400/30' },
          { label: 'Entities & PII', val: `${caseData.entities_count} Resolved`, view: 'entities', icon: Users, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-400/30' },
          { label: 'Ledger Txns', val: `${caseData.transactions_count} Tracked`, view: 'transactions', icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30' },
          { label: 'Conflicts', val: `${caseData.conflicts_count} Unresolved`, view: 'conflicts', icon: GitCompare, color: caseData.conflicts_count > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-400/30' : 'text-slate-400 bg-white/[0.04] border-white/[0.08]' },
          { label: 'Missing Info', val: `${caseData.missing_fields_count} Checklist Items`, view: 'missing-info', icon: HelpCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-400/30' },
          { label: 'Structural Flags', val: `${caseData.flags_count} Anomalies`, view: 'ai-summary', icon: Activity, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-400/30' }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(item.view)}
              className="p-4 rounded-2xl glass-card border border-white/[0.08] cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium">{item.label}</span>
                <div className={`p-1.5 rounded-lg border ${item.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-sm font-bold font-mono text-white">{item.val}</div>
            </div>
          );
        })}
      </div>

      {/* 4. 21st.dev Fraud Playbook Progression Pipeline */}
      {fraudPattern && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/[0.08] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <Activity className="w-5 h-5 text-sky-400" />
                Fraud Pattern Playbook: {fraudPattern.playbook_name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Section 6.1 Kill-Chain Sequence-Completeness Evaluation
              </p>
            </div>
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-400/30 w-fit">
              {Math.round(fraudPattern.overall_match_confidence * 100)}% Playbook Alignment
            </span>
          </div>

          {/* Stage Progression Cards */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 font-mono">Kill-Chain Stage Evidentiary Support:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {fraudPattern.stages.map((st) => (
                <div
                  key={st.stage_id}
                  className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                    st.status === 'EVIDENCED'
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-black/40 border-white/[0.06] text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold tracking-wider">Stage {st.stage_order}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      st.status === 'EVIDENCED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.04] text-slate-500'
                    }`}>
                      {st.status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-100 text-xs truncate">{st.stage_name}</div>
                  {st.source_evidence_id ? (
                    <button
                      onClick={() => onInspectTraceability(st.stage_name, st.match_basis || "Evidenced", st.source_evidence_id!, st.confidence)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      Source: [{st.source_evidence_id}] ({Math.round(st.confidence * 100)}%)
                    </button>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">No evidence found for this stage</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Structured Financial Outcome line */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Financial Loss Evidentiary Status:</span>
            <span className="font-bold text-emerald-400">{fraudPattern.financial_outcome_summary}</span>
          </div>

          <p className="text-[11px] text-slate-500 italic font-mono">
            * {fraudPattern.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
};
