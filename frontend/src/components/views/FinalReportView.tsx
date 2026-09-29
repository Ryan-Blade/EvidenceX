import React, { useState } from 'react';
import {
  FileText, Download, ShieldCheck, Hash, Code, ExternalLink,
  Printer, Check, AlertCircle, FileCheck, FileSpreadsheet
} from 'lucide-react';
import { CaseData, CaseSummaryData, EvidenceItem, ConflictItem, MissingInfoItemData } from '../../types';

interface FinalReportViewProps {
  caseData: CaseData;
  summary: CaseSummaryData | null;
  evidenceList: EvidenceItem[];
  conflicts: ConflictItem[];
  missingItems: MissingInfoItemData[];
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
}

export const FinalReportView: React.FC<FinalReportViewProps> = ({
  caseData,
  summary,
  evidenceList,
  conflicts,
  missingItems,
  onInspectTraceability
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadPdf = () => {
    setDownloading('pdf');
    window.open(`/api/cases/${caseData.id}/report/pdf`, '_blank');
    setTimeout(() => setDownloading(null), 1000);
  };

  const handleDownloadCsv = () => {
    setDownloading('csv');
    window.open(`/api/cases/${caseData.id}/report/csv`, '_blank');
    setTimeout(() => setDownloading(null), 1000);
  };

  const handleDownloadManifest = () => {
    setDownloading('manifest');
    window.open(`/api/cases/${caseData.id}/report/manifest`, '_blank');
    setTimeout(() => setDownloading(null), 1000);
  };

  const handleDownloadJson = () => {
    setDownloading('json');
    window.open(`/api/cases/${caseData.id}/report/json`, '_blank');
    setTimeout(() => setDownloading(null), 1000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Final Digital Forensics Report & Chain-of-Custody Export
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Section 5.10 & 6.3: Export court-admissible dossiers, formatted CSV ledgers, SHA-256 integrity manifests, and machine-readable case graphs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-[0_0_25px_-5px_rgba(56,189,248,0.5)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>

          <button
            onClick={handleDownloadCsv}
            className="glass-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-emerald-300 hover:text-emerald-200 text-xs font-semibold cursor-pointer border border-emerald-500/30 hover:border-emerald-500/60"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Forensic Ledger (.csv)
          </button>

          <button
            onClick={handleDownloadManifest}
            className="glass-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Hash className="w-4 h-4 text-cyan-400" />
            SHA-256 Hash Manifest (.txt)
          </button>

          <button
            onClick={handleDownloadJson}
            className="glass-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Code className="w-4 h-4 text-blue-400" />
            Case Graph (.json)
          </button>
        </div>
      </div>

      {/* Live Formal Report Preview Container */}
      <div className="glass-card p-8 sm:p-12 rounded-3xl text-slate-200 space-y-8 font-sans">
        {/* Document Letterhead */}
        <div className="border-b-2 border-slate-700 pb-6 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-cyan-400 font-bold">
                EvidenceX Cyber Incident Control Plane
              </div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-1">
                FORENSIC INCIDENT INVESTIGATION DOSSIER
              </h2>
            </div>
            <div className="text-right text-xs font-mono text-slate-400">
              <div>Case ID: <span className="text-cyan-300 font-bold">{caseData.id}</span></div>
              <div>Status: <span className="text-emerald-400 font-bold">{caseData.status}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs font-mono text-slate-300 border-t border-slate-800">
            <div>Incident: <b className="text-slate-100">{caseData.incident_type}</b></div>
            <div>Priority: <b className="text-slate-100">{caseData.priority}</b></div>
            <div>Investigator: <b className="text-slate-100">{caseData.investigator_name}</b></div>
            <div>Date: <b className="text-slate-100">{caseData.incident_date || '14 Oct 2026'}</b></div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono">
            1. Executive Summary
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            {summary?.executive_summary || caseData.description}
          </p>
        </div>

        {/* 2. Chronological Incident Narrative */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono">
            2. Chronological Incident Narrative (Source Referenced)
          </h3>
          <div className="space-y-2 text-xs sm:text-sm">
            {summary?.narrative.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-cyan-300 font-mono">{item.timestamp_display} — </span>
                  <span className={item.is_unresolved_gap ? 'text-rose-300 font-semibold italic' : 'text-slate-200'}>
                    {item.event_text}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.evidence_references.map((r, ri) => (
                    <button
                      key={ri}
                      onClick={() => onInspectTraceability("Report Narrative Citation", item.event_text, r, 0.95)}
                      className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      [{r}]
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Evidence Inventory & SHA-256 Manifest */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-mono">
            3. Evidence Inventory & Digital Custody Manifest
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">SHA-256 Digital Fingerprint</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                {evidenceList.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 px-3 font-bold text-cyan-300">{e.evidence_id}</td>
                    <td className="py-2 px-3 text-slate-200">{e.file_name}</td>
                    <td className="py-2 px-3 text-slate-400">{e.file_type}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-400 break-all">{e.sha256_hash}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">{e.extraction_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Discrepancies & Missing Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-rose-400 font-mono uppercase">4. Forensic Conflicts</h4>
            {conflicts.length > 0 ? (
              conflicts.map(c => (
                <div key={c.id} className="text-slate-300 text-[11px] font-mono">
                  • <b>{c.field_name}:</b> [{c.source_a_id}] {c.value_a} vs [{c.source_b_id}] {c.value_b}
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-[11px]">No active discrepancies.</div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-amber-400 font-mono uppercase">5. Open Evidentiary Gaps</h4>
            {missingItems.length > 0 ? (
              missingItems.slice(0, 3).map(m => (
                <div key={m.id} className="text-slate-300 text-[11px] font-mono">
                  • <b>{m.field_name}:</b> {m.suggested_action}
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-[11px]">All checklist criteria satisfied.</div>
            )}
          </div>
        </div>

        {/* Legal Disclaimer Footer */}
        <div className="border-t border-slate-800 pt-4 text-xs font-mono text-rose-300">
          <b>LEGAL DISCLAIMER: </b>
          {summary?.disclaimer || "The information presented is extracted from supplied evidence and requires investigator verification."}
        </div>
      </div>
    </div>
  );
};
