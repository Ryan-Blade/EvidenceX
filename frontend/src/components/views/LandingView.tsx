import React from 'react';
import {
  Shield, Sparkles, ArrowRight, CheckCircle2, Lock, FileSearch,
  Activity, AlertTriangle, Fingerprint, GitCompare, HelpCircle,
  FileCheck, Layers, Cpu, Terminal, ChevronRight, Zap, Check
} from 'lucide-react';
import { AnimatedRedactionTyper } from '../shared/AnimatedRedactionTyper';
import { CanonicalEntity, EvidenceItem, TransactionItem, CaseData } from '../../types';

interface LandingViewProps {
  onLoadDemo: () => void;
  onGoToDashboard: () => void;
  onCreateCase: () => void;
  isDemoLoading: boolean;
  entities?: CanonicalEntity[];
  evidenceList?: EvidenceItem[];
  transactions?: TransactionItem[];
  caseData?: CaseData | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onLoadDemo,
  onGoToDashboard,
  onCreateCase,
  isDemoLoading,
  entities,
  evidenceList,
  transactions,
  caseData
}) => {
  return (
    <div className="relative space-y-20 pb-24 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-16 pb-6 text-center space-y-7 max-w-4xl mx-auto px-4">
        {/* 21st.dev Cyber Chip Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-sky-400/30 text-sky-300 text-xs font-mono font-medium shadow-lg shadow-black/60 backdrop-blur-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
          </span>
          <span className="tracking-wide">EvidenceX Intelligence Control Plane • SIH26104</span>
        </div>

        {/* 21st.dev Gradient Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
          From Scattered Evidence to{' '}
          <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent underline decoration-sky-400/30 decoration-wavy underline-offset-8">
            Structured Investigation.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Transforms fragmented screenshots, chats, bank statements, and URLs into an auditable,
          chronological, and traceable incident record — <span className="text-sky-300 font-semibold">without ever deciding guilt or fabricating facts.</span>
        </p>

        {/* 21st.dev Hero Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onLoadDemo}
            disabled={isDemoLoading}
            className="relative group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 font-black text-sm shadow-xl shadow-sky-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
            <span>{isDemoLoading ? 'Loading Simulation...' : 'Load 1-Click Demo Case (3-5 Min)'}</span>
            <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onGoToDashboard}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-sky-400/50 text-slate-200 font-bold text-sm transition-all cursor-pointer backdrop-blur-xl shadow-lg"
          >
            Open Case Registry
          </button>
        </div>

        {/* Live Animated Redaction UI/UX showcase */}
        <div className="pt-6 max-w-3xl mx-auto text-left">
          <AnimatedRedactionTyper
            entities={entities}
            evidenceList={evidenceList}
            transactions={transactions}
            caseData={caseData}
          />
        </div>

        {/* 21st.dev Invariants Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left max-w-4xl mx-auto">
          {[
            { title: 'Analyzer, Not Detector', desc: 'Outputs structured flags, never system guilt verdicts' },
            { title: '100% Sourced Facts', desc: 'Every claim links directly to its source EV-### artifact' },
            { title: 'Anti-Hallucination', desc: 'Post-hoc substring grounding validates OCR text match' },
            { title: 'Immutable Custody', desc: 'SHA-256 pre-processing hashing guarantees file integrity' }
          ].map((p, idx) => (
            <div key={idx} className="p-4 rounded-2xl glass-card space-y-1.5">
              <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {p.title}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 21st.dev Pipeline Cards (Interactive Step Diagram) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-sky-400 font-bold">
            Processing Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Sequential Forensics Processing Pipeline
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Strictly sequential per evidence file with incremental case-wide synthesis on every newly landed artifact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Ingest & Hash',
              desc: 'Accepts images, PDFs, text logs, URLs. Computes SHA-256 hash before processing to preserve custody.',
              icon: Layers,
              color: 'sky'
            },
            {
              step: '02',
              title: 'OCR & Schema Extract',
              desc: 'Schema-locked entity extraction (Phones, UPI, Txns, Bank Accounts) with substring grounding validation.',
              icon: Cpu,
              color: 'blue'
            },
            {
              step: '03',
              title: 'Correlate & Flag',
              desc: 'Cross-evidence conflict diffing, sequence completeness checks against known playbooks, ThreatIntel URL feeds.',
              icon: Activity,
              color: 'indigo'
            },
            {
              step: '04',
              title: 'Sign-Off & Report',
              desc: 'Referenced Chronological Narrative with inline [EV-###] citations, court-admissible PDF report, and manifest.',
              icon: FileCheck,
              color: 'emerald'
            }
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="p-5 rounded-2xl glass-card space-y-3 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-700 group-hover:text-slate-500 transition-colors">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 21st.dev Bento Grid Feature Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-sky-400 font-bold">
            Core Differentiators
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Investigation-Support Superpowers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bento Card 1 (Large) */}
          <div className="md:col-span-2 p-6 rounded-3xl glass-card space-y-4 relative overflow-hidden">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 w-fit">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Scammer Signature Fingerprinting ("Have We Seen This Before?")</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Section 6.4 Innovation: Matches scammer operations across cases via behavioral sequence embeddings and indicator overlap without ever leaking victim PII or making automated accusations.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] text-xs font-mono text-amber-300">
              Matched Profile PROF-IND-KYC-9942 • Seen in 4 prior cases • 91% Pattern Confidence
            </div>
          </div>

          {/* Bento Card 2 */}
          <div className="p-6 rounded-3xl glass-card space-y-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 w-fit">
              <GitCompare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Cross-Evidence Conflict Diffing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Spots discrepancies across evidence (e.g. ₹5,000 in chat vs ₹7,000 on bank ledger) and presents them side-by-side unresolved by design.
            </p>
          </div>

          {/* Bento Card 3 */}
          <div className="p-6 rounded-3xl glass-card space-y-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 w-fit">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Actionable Section 91 CrPC Drafts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects missing banking IFSCs or CDR logs and auto-generates pre-filled formal requisition notices ready to dispatch to telecom and bank nodal desks.
            </p>
          </div>

          {/* Bento Card 4 (Large) */}
          <div className="md:col-span-2 p-6 rounded-3xl glass-card space-y-4">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit">
              <FileSearch className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Universal Click-Through Traceability & Confidence Decomposition</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Section 5.8 & 6.10: Click ANY fact across ANY screen to see its exact file location, grounding status, and 3-factor confidence breakdown (OCR clarity, syntax match, and corroboration count).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
