import React, { useState, useEffect } from 'react';
import { Search, X, Shield, FileText, ArrowRight, DollarSign, Database, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { GlobalSearchResultItem } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (caseId: string, item: GlobalSearchResultItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchGlobal(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-white/[0.12]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/[0.08] flex items-center gap-3 bg-slate-950/50">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search across phone numbers, UPI VPAs, bank A/cs, transaction UTRs, filenames, cases..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-800/80 text-slate-400 rounded-lg border border-white/[0.08]">ESC</kbd>
          )}
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-white/[0.04]">
          {results.length > 0 ? (
            results.map((r, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelectResult(r.case_id, r);
                  onClose();
                }}
                className="p-3.5 hover:bg-white/[0.06] rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5 shadow-inner">
                    {r.result_type === 'ENTITY' && <Shield className="w-4 h-4" />}
                    {r.result_type === 'EVIDENCE' && <FileText className="w-4 h-4" />}
                    {r.result_type === 'TRANSACTION' && <DollarSign className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-300">{r.matched_text}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {r.result_type}
                      </span>
                      {r.source_evidence_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 font-mono">
                          {r.source_evidence_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{r.detail}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Case: {r.case_id} — {r.case_title}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            ))
          ) : query.length >= 2 && !loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No investigative matches found for "{query}".
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs space-y-1">
              <p className="font-semibold text-slate-300">Universal Digital Forensics Search</p>
              <p>Type at least 2 characters to search across all cases, entities, and evidence artifacts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
