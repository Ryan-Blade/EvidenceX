import React, { useState } from 'react';
import {
  HelpCircle, FileText, Send, Copy, Check, ShieldAlert,
  AlertTriangle, ArrowRight, Building, PhoneCall, UserCheck
} from 'lucide-react';
import { MissingInfoItemData } from '../../types';

interface MissingInfoViewProps {
  missingItems: MissingInfoItemData[];
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
}

export const MissingInfoView: React.FC<MissingInfoViewProps> = ({
  missingItems,
  onInspectTraceability
}) => {
  const [selectedItem, setSelectedItem] = useState<MissingInfoItemData | null>(missingItems[0] || null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-white/[0.08] pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          Missing Information Checklist & Actionable Requisition Generator
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Section 5.7 & 6.8: Surfaces true case-wide evidentiary gaps and generates pre-filled Section 91 CrPC requisitions for banks and telecoms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Missing Items List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Evidentiary Gaps ({missingItems.length})
          </h2>

          <div className="space-y-2.5">
            {missingItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400/50 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40'
                      : 'glass-card hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      item.importance === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {item.importance} PRIORITY
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-xs">{item.field_name}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Actionable Requisition Generator */}
        {selectedItem ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Gap Overview Card */}
            <div className="p-5 rounded-2xl glass-panel border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                    selectedItem.importance === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedItem.importance}
                  </span>
                  <h2 className="text-base font-bold text-slate-100">{selectedItem.field_name}</h2>
                </div>
                <span className="text-xs font-mono text-sky-300">
                  Category: {selectedItem.category}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedItem.description}
              </p>

              <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] space-y-1 text-xs font-mono">
                <span className="text-amber-400 font-bold">Suggested Investigative Action: </span>
                <span className="text-slate-300">{selectedItem.suggested_action}</span>
              </div>
            </div>

            {/* Section 6.8 Pre-filled Actionable Draft Requisition */}
            {selectedItem.draft_request && (
              <div className="p-5 rounded-2xl glass-panel border border-sky-400/40 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/40">
                      {selectedItem.draft_request.request_type === 'BANK_STATEMENT_REQUEST' ? <Building className="w-5 h-5" /> :
                       selectedItem.draft_request.request_type === 'TELECOM_CDR_REQUEST' ? <PhoneCall className="w-5 h-5" /> :
                       <UserCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">
                        Section 6.8 Actionable Draft Requisition
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Target Recipient: <span className="text-sky-300">{selectedItem.draft_request.recipient}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(`${selectedItem.draft_request?.draft_subject}\n\n${selectedItem.draft_request?.draft_body}`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-sky-500/20"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Draft Request'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    Subject: {selectedItem.draft_request.draft_subject}
                  </div>
                  <div className="p-4 rounded-xl bg-black/70 border border-white/[0.08] font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {selectedItem.draft_request.draft_body}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic font-mono">
                  * Note: EvidenceX drafts this notice for investigator verification and dispatch. The system never executes autonomous outbound contact.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-slate-500 text-xs font-mono glass-panel rounded-2xl">
            Select a checklist item from the left panel to generate draft requisitions.
          </div>
        )}
      </div>
    </div>
  );
};
