import React, { useState } from 'react';
import {
  DollarSign, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, ExternalLink, Activity, HelpCircle, Filter
} from 'lucide-react';
import { TransactionItem } from '../../types';

interface TransactionsViewProps {
  transactions: TransactionItem[];
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onInspectTraceability
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredTransactions = transactions.filter(t => {
    if (filterStatus === 'ALL') return true;
    return t.reconciliation_status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Financial Losses & Structured Transaction Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Section 6.1 Structured Join Reconciliation: Cross-matches chat mentioned transfers against official bank statement debits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Section Pills */}
          <div className="flex gap-1.5 p-1 rounded-2xl text-[11px] font-mono">
            {['ALL', 'RECONCILED', 'PENDING', 'CONTESTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'glass-btn-active'
                    : 'glass-btn'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="p-2.5 px-4 rounded-2xl glass-card flex items-center gap-3">
            <div className="text-xs text-slate-400 font-mono">Total Ledger:</div>
            <div className="text-base font-mono font-black text-emerald-400">
              ₹{transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#030407]/90 text-slate-400 uppercase font-mono text-[10px] border-b border-white/[0.08]">
              <tr>
                <th className="py-3.5 px-4">Source ID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Sender Account</th>
                <th className="py-3.5 px-4">Recipient Beneficiary</th>
                <th className="py-3.5 px-4">Method / Channel</th>
                <th className="py-3.5 px-4">UTR / Ref</th>
                <th className="py-3.5 px-4">Reconciliation Status</th>
                <th className="py-3.5 px-4 text-right">Confidence & Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onInspectTraceability("Financial Transaction", t.amount_formatted, t.source_evidence_id, t.confidence)}
                      className="px-2.5 py-0.5 rounded-lg bg-sky-950/80 text-sky-300 hover:bg-sky-900 border border-sky-800 font-bold cursor-pointer transition-colors"
                    >
                      {t.source_evidence_id}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-sm font-bold text-slate-100">
                    {t.amount_formatted}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-sans">
                    {t.sender || "Victim Account"}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">
                    {t.receiver || "Unknown Recipient"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-slate-300 text-[10px]">
                      {t.payment_method || "UPI"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {t.transaction_id_ref || (
                      <span className="text-amber-400/80 italic text-[11px]">Pending UTR</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.reconciliation_status === 'RECONCILED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      t.reconciliation_status === 'CONTESTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-white/[0.06] text-slate-400 border border-white/[0.08]'
                    }`}>
                      {t.reconciliation_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onInspectTraceability(`Transaction ${t.amount_formatted}`, t.original_text || t.amount_formatted, t.source_evidence_id, t.confidence)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-btn text-xs font-sans cursor-pointer hover:border-sky-400/40"
                    >
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      {Math.round(t.confidence * 100)}% Trace
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
