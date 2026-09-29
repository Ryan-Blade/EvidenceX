import React, { useState } from 'react';
import {
  Users, Shield, Eye, Lock, CheckCircle2, AlertTriangle,
  Search, ExternalLink, Activity, Filter, Info, EyeOff
} from 'lucide-react';
import { CanonicalEntity, EntityMention, EvidenceItem, TransactionItem } from '../../types';
import { AnimatedRedactionTyper } from '../shared/AnimatedRedactionTyper';

interface EntitiesViewProps {
  entities: CanonicalEntity[];
  caseId?: string;
  evidenceList?: EvidenceItem[];
  transactions?: TransactionItem[];
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
  onOpenPIIModal: (entityType: string, maskedValue: string, entityId?: number) => void;
}

export const EntitiesView: React.FC<EntitiesViewProps> = ({
  entities,
  caseId,
  evidenceList,
  transactions,
  onInspectTraceability,
  onOpenPIIModal
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSandbox, setShowSandbox] = useState(true);

  const entityTypes = ['ALL', 'PERSON', 'PHONE', 'UPI_ID', 'BANK_ACCOUNT', 'URL', 'TXN_ID'];

  const filteredEntities = entities.filter(e => {
    const matchesType = filterType === 'ALL' || e.entity_type === filterType;
    const matchesSearch = !searchQuery ||
      e.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            Canonical Entities & Privacy Masking Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Section 6.2a Entity Resolution Graph: Raw mentions organized under verified canonical identities with strict anti-false-merge guards.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter entities or aliases..."
              className="px-3 py-1.5 text-xs bg-black/50 border border-white/[0.1] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl text-[11px] font-mono">
            {entityTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filterType === t
                    ? 'glass-btn-active'
                    : 'glass-btn'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Animated Redaction Sandbox */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400">
            <EyeOff className="w-4 h-4 text-sky-400" />
            <span>REAL-TIME PII REDACTION & ZERO-KNOWLEDGE STREAM</span>
          </div>
          <button
            onClick={() => setShowSandbox(s => !s)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {showSandbox ? 'Hide Demo Stream' : 'Show Demo Stream'}
          </button>
        </div>
        {showSandbox && (
          <AnimatedRedactionTyper
            entities={entities}
            evidenceList={evidenceList}
            transactions={transactions}
            caseId={caseId}
          />
        )}
      </div>

      {/* Entities Table */}
      <div className="glass-panel border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#030407]/90 text-slate-400 uppercase font-mono text-[10px] border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Canonical Identity</th>
                <th className="py-3 px-4">Observed Aliases / Variants</th>
                <th className="py-3 px-4">Source Mentions & References</th>
                <th className="py-3 px-4">Privacy Masking Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {filteredEntities.map((ent) => {
                const primaryMention = ent.mentions[0];
                const isMaskable = ['PHONE', 'EMAIL', 'UPI_ID', 'BANK_ACCOUNT'].includes(ent.entity_type);
                return (
                  <tr key={ent.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ent.entity_type === 'PERSON' ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800' :
                        ent.entity_type === 'PHONE' ? 'bg-sky-950/80 text-sky-300 border border-sky-800' :
                        ent.entity_type === 'UPI_ID' ? 'bg-purple-950/80 text-purple-300 border border-purple-800' :
                        ent.entity_type === 'URL' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                        'bg-white/[0.06] text-slate-300'
                      }`}>
                        {ent.entity_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-100 font-sans">
                      {isMaskable && primaryMention ? primaryMention.masked_value : ent.canonical_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {ent.aliases.map((a, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-black/60 border border-white/[0.08] text-[10px] text-slate-400 font-sans">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {ent.mentions.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => onInspectTraceability(ent.canonical_name, m.masked_value, m.source_evidence_id, m.confidence)}
                            className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 hover:bg-sky-900 border border-sky-800 text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            [{m.source_evidence_id}] {Math.round(m.confidence * 100)}%
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isMaskable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                          <Lock className="w-3 h-3" /> Masked by Default
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono">Unrestricted</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isMaskable ? (
                        <button
                          onClick={() => onOpenPIIModal(ent.entity_type, primaryMention?.masked_value || ent.canonical_name, primaryMention?.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-sky-300 font-sans text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Reveal (Audited)
                        </button>
                      ) : (
                        <button
                          onClick={() => onInspectTraceability(ent.canonical_name, ent.canonical_name, ent.mentions[0]?.source_evidence_id || 'EV-001', 0.95)}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-300 font-sans text-xs cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" /> Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
