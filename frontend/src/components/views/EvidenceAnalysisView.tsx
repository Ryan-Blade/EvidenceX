import React, { useState } from 'react';
import {
  Cpu, FileText, CheckCircle2, AlertTriangle, ShieldCheck,
  Eye, Hash, ExternalLink, Activity, Info
} from 'lucide-react';
import { EvidenceItem } from '../../types';

interface EvidenceAnalysisViewProps {
  evidenceList: EvidenceItem[];
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
}

export const EvidenceAnalysisView: React.FC<EvidenceAnalysisViewProps> = ({
  evidenceList,
  onInspectTraceability
}) => {
  const [selectedEv, setSelectedEv] = useState<EvidenceItem | null>(evidenceList[0] || null);

  React.useEffect(() => {
    if (evidenceList.length > 0) {
      if (!selectedEv || !evidenceList.some(e => e.id === selectedEv.id)) {
        setSelectedEv(evidenceList[0]);
      }
    } else {
      setSelectedEv(null);
    }
  }, [evidenceList]);

  const tamperInfo = selectedEv?.tamper_signals ? JSON.parse(selectedEv.tamper_signals) : null;


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-white/[0.08] pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-sky-400" />
          Evidence Inventory & OCR Text Extraction Analysis
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Inspect immutable SHA-256 digital custody hashes, raw OCR text layers, and image authenticity heuristics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Evidence List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Evidence Files ({evidenceList.length})
          </h2>
          <div className="space-y-2.5">
            {evidenceList.map((ev) => {
              const isSelected = selectedEv?.id === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEv(ev)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-400/50 shadow-lg shadow-sky-950/50 ring-1 ring-sky-400/30'
                      : 'glass-card hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-sky-950/80 border border-sky-800 text-sky-300 font-mono text-xs font-bold">
                      {ev.evidence_id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      {ev.ocr_status}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200 text-xs truncate">
                    {ev.file_name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{ev.file_type}</span>
                    <span>{(ev.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Evidence Deep Dive */}
        {selectedEv ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Header & Hash Bar */}
            <div className="p-5 rounded-2xl glass-panel border border-white/[0.08] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
                      {selectedEv.evidence_id}
                    </span>
                    <h2 className="text-base font-bold text-slate-100">{selectedEv.file_name}</h2>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    Uploaded: {new Date(selectedEv.uploaded_at).toUTCString()} | Format: {selectedEv.file_type}
                  </p>
                </div>
                <button
                  onClick={() => onInspectTraceability(selectedEv.file_name, selectedEv.sha256_hash, selectedEv.evidence_id, 0.99)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-sky-400/40 text-sky-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Inspect Traceability
                </button>
              </div>

              {/* SHA-256 Checksum */}
              <div className="p-3 rounded-xl bg-black/70 border border-white/[0.08] space-y-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-sky-400" />
                  SHA-256 Immutable Digital Custody Hash
                </div>
                <div className="text-xs font-mono text-sky-300 break-all select-all font-bold">
                  {selectedEv.sha256_hash}
                </div>
              </div>
            </div>

            {/* Tamper Signal Heuristics */}
            {tamperInfo && (
              <div className="p-4 rounded-xl glass-card border border-white/[0.08] space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-200 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Image Authenticity & EXIF Heuristics (Section 6.3)
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                  <div>EXIF Metadata Present: {tamperInfo.has_exif_metadata ? 'YES' : 'NO (Common for chat uploads)'}</div>
                  <div>Editor Software Detected: {tamperInfo.software_editor_detected || 'None (Native Device Capture)'}</div>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * {tamperInfo.verdict_disclaimer}
                </p>
              </div>
            )}

            {/* OCR Extracted Text Layer */}
            <div className="p-5 rounded-2xl glass-panel border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  Normalized OCR Text Layer
                </h3>
                <span className="text-[11px] font-mono text-emerald-400">
                  High-Confidence Extraction
                </span>
              </div>

              <div className="p-4 rounded-xl bg-black/70 border border-white/[0.08] text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {selectedEv.raw_text_preview || "OCR extraction unavailable."}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-slate-500 text-xs font-mono">
            Select an evidence item from the left panel to inspect OCR layers.
          </div>
        )}
      </div>
    </div>
  );
};
