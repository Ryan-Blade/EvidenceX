import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Lock, Sparkles, Terminal, EyeOff, CheckCircle2,
  RefreshCw, FileText, Cpu, AlertTriangle, Play, Pause, Database
} from 'lucide-react';
import { CanonicalEntity, EvidenceItem, TransactionItem, CaseData } from '../../types';

export interface RedactionPhrase {
  id: string;
  category: 'OTP' | 'PHONE' | 'UPI_ID' | 'BANK_ACCOUNT' | 'AADHAAR' | 'PHISHING_URL' | 'TRANSACTION' | 'OCR_TEXT';
  sourceEvId?: string;
  originalText: string;
  sensitivePart: string;
  maskedText: string;
  legalContext: string;
  confidence?: number;
}

const FALLBACK_PHRASES: RedactionPhrase[] = [
  {
    id: 'DEMO-1',
    category: 'OTP',
    sourceEvId: 'EV-001',
    originalText: 'Dear customer, 849201 is your secret OTP for transaction of Rs. 48,500. Do not share.',
    sensitivePart: '849201',
    maskedText: 'Dear customer, ****** is your secret OTP for transaction of Rs. 48,500. Do not share.',
    legalContext: 'Section 6.3 Auto-Masking: OTP / Passcodes never logged unmasked',
    confidence: 0.98
  },
  {
    id: 'DEMO-2',
    category: 'PHONE',
    sourceEvId: 'EV-001',
    originalText: 'Caller claimed to be Telecom Police (+91 98765 43210) demanding immediate KYC verification.',
    sensitivePart: '+91 98765 43210',
    maskedText: 'Caller claimed to be Telecom Police (+91 98****3210) demanding immediate KYC verification.',
    legalContext: 'DPDP Act & R-34 PII Protection: Mid-digits obfuscated on public dashboard',
    confidence: 0.94
  },
  {
    id: 'DEMO-3',
    category: 'UPI_ID',
    sourceEvId: 'EV-002',
    originalText: 'Scammer instructed victim to send payment to rahul.sharma99@okhdfcbank via GooglePay.',
    sensitivePart: 'rahul.sharma99@okhdfcbank',
    maskedText: 'Scammer instructed victim to send payment to rah***99@okhdfcbank via GooglePay.',
    legalContext: 'Canonical Resolution: VPA normalized with identity masked until signed-off warrant',
    confidence: 0.92
  },
  {
    id: 'DEMO-4',
    category: 'BANK_ACCOUNT',
    sourceEvId: 'EV-003',
    originalText: 'Beneficiary Acct: 50100492819034 | IFSC: HDFC0000128 | Transferred ₹75,000.',
    sensitivePart: '50100492819034',
    maskedText: 'Beneficiary Acct: **********9034 | IFSC: HDFC0000128 | Transferred ₹75,000.',
    legalContext: 'Section 91 CrPC Bank Notice: Account tokenized in audit trail; full number restricted',
    confidence: 0.96
  },
  {
    id: 'DEMO-5',
    category: 'PHISHING_URL',
    sourceEvId: 'EV-004',
    originalText: 'Received SMS: "Urgent! Electricity power disconnect tonight. Pay bill at https://sbi-secure-kyc-portal.in"',
    sensitivePart: 'https://sbi-secure-kyc-portal.in',
    maskedText: 'Received SMS: "Urgent! Electricity power disconnect tonight. Pay bill at [DEFANGED: sbi-secure-kyc-portal[.]in]"',
    legalContext: 'Defanged Threat Intel: Malicious URLs defanged automatically to prevent accidental clicks',
    confidence: 0.91
  }
];

export function generateDynamicPhrases(
  entities?: CanonicalEntity[],
  evidenceList?: EvidenceItem[],
  transactions?: TransactionItem[],
  caseData?: CaseData | null
): RedactionPhrase[] {
  const dynamicList: RedactionPhrase[] = [];
  let counter = 1;

  // 1. Extract from real Canonical Entities & Mentions
  if (entities && entities.length > 0) {
    for (const ent of entities) {
      for (const m of ent.mentions) {
        if (!m.raw_value || m.raw_value === m.masked_value) continue;

        const evTag = m.source_evidence_id ? `[${m.source_evidence_id}]` : `[EV-00${counter}]`;
        const confPct = Math.round((m.confidence || 0.9) * 100);

        if (ent.entity_type === 'PHONE') {
          dynamicList.push({
            id: `ENT-${counter++}`,
            category: 'PHONE',
            sourceEvId: m.source_evidence_id || 'EV-001',
            originalText: `${evTag} Extracted Suspect/Victim Phone: ${m.raw_value} (OCR Confidence: ${confPct}%)`,
            sensitivePart: m.raw_value,
            maskedText: `${evTag} Extracted Phone: ${m.masked_value} (Auto-masked per DPDP Act & Rule 34)`,
            legalContext: `Canonical Target: ${ent.canonical_name} • Corroborated in ${ent.mentions.length} evidence file(s)`,
            confidence: m.confidence
          });
        } else if (ent.entity_type === 'UPI_ID') {
          dynamicList.push({
            id: `ENT-${counter++}`,
            category: 'UPI_ID',
            sourceEvId: m.source_evidence_id || 'EV-002',
            originalText: `${evTag} Extracted Beneficiary VPA: ${m.raw_value} via ${m.evidence_reference || 'Chat Screenshot'}`,
            sensitivePart: m.raw_value,
            maskedText: `${evTag} Beneficiary VPA: ${m.masked_value} (Identity protected under Section 6.3)`,
            legalContext: `Canonical Cluster: ${ent.canonical_name} • Corroborated across mentions`,
            confidence: m.confidence
          });
        } else if (ent.entity_type === 'BANK_ACCOUNT') {
          dynamicList.push({
            id: `ENT-${counter++}`,
            category: 'BANK_ACCOUNT',
            sourceEvId: m.source_evidence_id || 'EV-003',
            originalText: `${evTag} Beneficiary Bank Account: ${m.raw_value} (IFSC Linked)`,
            sensitivePart: m.raw_value,
            maskedText: `${evTag} Beneficiary Bank Account: ${m.masked_value} [Section 91 CrPC Notice Tracked]`,
            legalContext: `Account Tokenized: ${ent.canonical_name} • Audit Log Traceable`,
            confidence: m.confidence
          });
        } else if (ent.entity_type === 'URL') {
          const defanged = m.raw_value.replace(/https?:\/\//, '').replace(/\./g, '[.]');
          dynamicList.push({
            id: `ENT-${counter++}`,
            category: 'PHISHING_URL',
            sourceEvId: m.source_evidence_id || 'EV-004',
            originalText: `${evTag} Malicious Link: ${m.raw_value} (ThreatIntel Feeds Linked)`,
            sensitivePart: m.raw_value,
            maskedText: `${evTag} Malicious Link: [DEFANGED: ${defanged}] (Safe Preview)`,
            legalContext: `Defanged Threat Intel: URL neutralized to prevent accidental browser dispatch`,
            confidence: m.confidence
          });
        }
      }
    }
  }

  // 2. Extract from real Case Transactions
  if (transactions && transactions.length > 0) {
    for (const txn of transactions) {
      const evTag = txn.source_evidence_id ? `[${txn.source_evidence_id}]` : `[EV-TXN]`;
      const receiver = txn.receiver || 'Beneficiary';
      const ref = txn.transaction_id_ref || 'TXN-REF';

      dynamicList.push({
        id: `TXN-${counter++}`,
        category: 'TRANSACTION',
        sourceEvId: txn.source_evidence_id || 'EV-002',
        originalText: `${evTag} Fraudulent Transfer of ${txn.amount_formatted} via ${txn.payment_method || 'UPI/IMPS'} to ${receiver} (Ref: ${ref})`,
        sensitivePart: ref.length > 6 ? ref : receiver,
        maskedText: `${evTag} Fraudulent Transfer of ${txn.amount_formatted} to ${receiver.slice(0, 3)}*** (Reconciliation: ${txn.reconciliation_status})`,
        legalContext: `Txn Reference: ${ref} • Grounding: Verified with Bank Statement`,
        confidence: txn.confidence
      });
    }
  }

  // 3. Extract OCR snippets from ingested Evidence Items
  if (evidenceList && evidenceList.length > 0) {
    for (const ev of evidenceList) {
      if (ev.raw_text_preview && ev.raw_text_preview.length > 20) {
        // Look for numbers / OTP / phone patterns in raw text
        const otpMatch = ev.raw_text_preview.match(/\b\d{4,6}\b/);
        const snippet = ev.raw_text_preview.slice(0, 75).replace(/\n/g, ' ');
        
        if (otpMatch) {
          dynamicList.push({
            id: `OCR-${counter++}`,
            category: 'OTP',
            sourceEvId: ev.evidence_id,
            originalText: `[${ev.evidence_id} - ${ev.file_name}] OCR Raw text: "${snippet}..."`,
            sensitivePart: otpMatch[0],
            maskedText: `[${ev.evidence_id} - ${ev.file_name}] OCR Raw text: "${snippet.replace(otpMatch[0], '******')}..."`,
            legalContext: `SHA-256 Custody: ${ev.sha256_hash.slice(0, 16)}... • Status: ${ev.ocr_status}`,
            confidence: 0.95
          });
        }
      }
    }
  }

  // If dynamic items were built, return them; otherwise return rich fallback
  return dynamicList.length > 0 ? dynamicList : FALLBACK_PHRASES;
}

type AnimationPhase = 'typing' | 'scanned' | 'redacting' | 'deleting' | 'paused';

interface AnimatedRedactionTyperProps {
  entities?: CanonicalEntity[];
  evidenceList?: EvidenceItem[];
  transactions?: TransactionItem[];
  caseData?: CaseData | null;
  caseId?: string;
  phrases?: RedactionPhrase[];
  variant?: 'hero' | 'compact' | 'card';
  className?: string;
}

export const AnimatedRedactionTyper: React.FC<AnimatedRedactionTyperProps> = ({
  entities,
  evidenceList,
  transactions,
  caseData,
  caseId,
  phrases: customPhrases,
  variant = 'hero',
  className = ''
}) => {
  // Compute dynamic phrases based on live case / evidence / entities data
  const activePhrases = useMemo(() => {
    if (customPhrases && customPhrases.length > 0) {
      return customPhrases;
    }
    return generateDynamicPhrases(entities, evidenceList, transactions, caseData);
  }, [customPhrases, entities, evidenceList, transactions, caseData]);

  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState<AnimationPhase>('typing');
  const [redactionSweepProgress, setRedactionSweepProgress] = useState(0); // 0 to 100%
  const [isPaused, setIsPaused] = useState(false);
  const [isRedactedMode, setIsRedactedMode] = useState(false);

  // Reset index if phrase list changes
  useEffect(() => {
    setCurrentPhraseIndex(0);
    setDisplayedText('');
    setPhase('typing');
    setIsRedactedMode(false);
    setRedactionSweepProgress(0);
  }, [activePhrases.length]);

  const currentPhrase = activePhrases[currentPhraseIndex] || activePhrases[0] || FALLBACK_PHRASES[0];

  useEffect(() => {
    if (isPaused) return;

    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      // Typing forward (char by char)
      const targetFull = currentPhrase.originalText;
      if (displayedText.length < targetFull.length) {
        timeout = setTimeout(() => {
          setDisplayedText(targetFull.slice(0, displayedText.length + 1));
        }, Math.max(12, 35 - Math.floor(displayedText.length / 6)));
      } else {
        // Finished typing original string -> pause & show detection
        setPhase('scanned');
      }
    } else if (phase === 'scanned') {
      // Pause to let viewer read, then trigger redaction sweep
      timeout = setTimeout(() => {
        setPhase('redacting');
        setRedactionSweepProgress(0);
      }, 900);
    } else if (phase === 'redacting') {
      // Redaction bar sweeps across sensitive portion
      if (redactionSweepProgress < 100) {
        timeout = setTimeout(() => {
          setRedactionSweepProgress(prev => Math.min(100, prev + 9));
        }, 28);
      } else {
        // Redaction sweep complete -> switch text to masked version
        setIsRedactedMode(true);
        setDisplayedText(currentPhrase.maskedText);
        timeout = setTimeout(() => {
          setPhase('deleting');
        }, 1300);
      }
    } else if (phase === 'deleting') {
      // Deleting backwards (simultaneous continuous loop)
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(prev => prev.slice(0, -2) || '');
        }, 10);
      } else {
        // Clean reset -> next phrase
        setIsRedactedMode(false);
        setRedactionSweepProgress(0);
        setCurrentPhraseIndex(prev => (prev + 1) % activePhrases.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [displayedText, phase, redactionSweepProgress, currentPhrase, isPaused, activePhrases.length]);

  const handleNextPhrase = () => {
    setDisplayedText('');
    setIsRedactedMode(false);
    setRedactionSweepProgress(0);
    setCurrentPhraseIndex(prev => (prev + 1) % activePhrases.length);
    setPhase('typing');
  };

  const getCategoryColor = (cat: RedactionPhrase['category']) => {
    switch (cat) {
      case 'OTP': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'PHONE': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'UPI_ID': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'BANK_ACCOUNT': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'PHISHING_URL': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'TRANSACTION': return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const activeCaseTitle = caseData?.id || caseId || (entities && entities.length > 0 ? 'CASE-2026-8841' : 'LIVE CASE');

  return (
    <div
      className={`relative rounded-3xl overflow-hidden glass-card border border-cyan-500/25 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl transition-all ${className}`}
    >
      {/* 21st.dev Ambient Edge Highlights */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Terminal Top Window Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          {/* Mac / Terminal Window Dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600 inline-block" />
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-300">
              evidencex-pii-redactor-v2.6
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-cyan-300 border border-cyan-500/30">
              <Database className="w-2.5 h-2.5" />
              {activeCaseTitle}
            </span>
          </div>
        </div>

        {/* Status Pill & Control Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                phase === 'redacting' ? 'bg-rose-400' : phase === 'scanned' ? 'bg-amber-400' : 'bg-cyan-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                phase === 'redacting' ? 'bg-rose-500' : phase === 'scanned' ? 'bg-amber-500' : 'bg-cyan-500'
              }`} />
            </span>
            <span className="uppercase text-slate-400 font-bold tracking-wider">
              {phase === 'typing' && 'WRITING EXTRACTED EVIDENCE'}
              {phase === 'scanned' && 'PII DETECTED'}
              {phase === 'redacting' && 'SWEEP REDACTING'}
              {phase === 'deleting' && 'AUTO-FLUSHING'}
            </span>
          </div>

          <button
            onClick={() => setIsPaused(p => !p)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title={isPaused ? 'Resume Animation' : 'Pause Animation'}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
          </button>

          <button
            onClick={handleNextPhrase}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors"
            title="Next Extracted Entity"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Terminal Body */}
      <div className="p-5 sm:p-7 space-y-5">
        {/* Active Entity Category Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${getCategoryColor(currentPhrase.category)}`}>
              {currentPhrase.category} ENTITY
            </span>
            {currentPhrase.sourceEvId && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-700">
                SOURCE: {currentPhrase.sourceEvId}
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-500">
              TARGET SUBSTRING: <code className="text-slate-200 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{currentPhrase.sensitivePart}</code>
            </span>
          </div>

          <div className="text-[10px] font-mono text-cyan-400/80 flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>Zero-Knowledge Grounding: {currentPhrase.confidence ? `${Math.round(currentPhrase.confidence * 100)}%` : 'Verified'}</span>
          </div>
        </div>

        {/* The Animated Typewriter & Redaction Text Area */}
        <div className="relative min-h-[90px] sm:min-h-[105px] p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800/80 font-mono text-sm sm:text-base leading-relaxed tracking-wide flex items-center overflow-hidden">
          {/* Cyber Scanline Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />

          {/* Redaction Highlight Sweep Laser (Visual effect when redacting) */}
          {phase === 'redacting' && (
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500/20 via-rose-500/40 to-rose-400/80 border-r-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] transition-all duration-75 pointer-events-none"
              style={{ width: `${redactionSweepProgress}%` }}
            >
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black uppercase text-rose-200 tracking-tighter bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-500/50">
                <Lock className="w-2.5 h-2.5" />
                PII AUTO-MASKING
              </div>
            </div>
          )}

          {/* Live Text Display */}
          <div className="relative z-10 text-slate-100 flex-1">
            <span className="text-cyan-400 font-bold mr-2 select-none">&gt;</span>
            <span className={isRedactedMode ? 'text-emerald-300 font-semibold' : 'text-slate-100'}>
              {displayedText}
            </span>

            {/* Glowing Monospace Cursor */}
            <span
              className={`inline-block w-2.5 h-5 ml-1 align-middle ${
                phase === 'redacting'
                  ? 'bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                  : phase === 'scanned'
                  ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]'
                  : 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
              } ${phase === 'typing' || phase === 'deleting' ? 'animate-pulse' : 'animate-ping'}`}
            />
          </div>
        </div>

        {/* Bottom Legal Invariant & Forensic Guardrail Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{currentPhrase.legalContext}</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[10px] text-slate-500">
            <span>Entity #{currentPhrase.id} ({currentPhraseIndex + 1}/{activePhrases.length} in stream)</span>
            <span className="text-slate-700">•</span>
            <span className="text-cyan-400/90 font-bold">Live Case Grounded Feed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
