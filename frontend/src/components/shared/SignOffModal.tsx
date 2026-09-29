import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, AlertCircle, Sparkles, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';

interface SignOffModalProps {
  caseId: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (newStatus: string) => void;
}

export const SignOffModal: React.FC<SignOffModalProps> = ({
  caseId,
  currentStatus,
  isOpen,
  onClose,
  onStatusUpdated
}) => {
  const [targetStatus, setTargetStatus] = useState<string>('Confirmed');
  const [notes, setNotes] = useState('Digital forensic findings, timeline provenance, and conflict records reviewed and verified.');
  const [investigator, setInvestigator] = useState('Insp. Vikram Rathore');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateCaseStatus(caseId, {
        new_status: targetStatus,
        notes: notes,
        changed_by: investigator
      });

      if (targetStatus === 'Confirmed' || targetStatus === 'Closed') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onStatusUpdated(targetStatus);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-slate-100 border border-white/[0.12]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Investigator Case Sign-Off</h3>
              <p className="text-xs text-slate-400">Formal status transition & audit checkpoint</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/[0.08] flex justify-between items-center text-xs">
            <span className="text-slate-400">Current Lifecycle State:</span>
            <span className="px-3 py-1 rounded-full font-mono font-bold bg-slate-800/80 text-cyan-300 border border-white/[0.08]">
              {currentStatus}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Transition State:</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'Under Review', label: 'Under Review', desc: 'Active investigation' },
                { id: 'Confirmed', label: 'Confirmed (Signed-off)', desc: 'Enables cross-case fingerprinting' },
                { id: 'Closed', label: 'Closed / Resolved', desc: 'Final dossier completed' },
                { id: 'Escalated', label: 'Escalated to LEA', desc: 'Handed to external agency' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTargetStatus(s.id)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    targetStatus === s.id
                      ? 'glass-btn-active'
                      : 'glass-btn text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold font-mono text-slate-100">{s.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Investigator Name / Badge:</label>
            <input
              type="text"
              value={investigator}
              onChange={(e) => setInvestigator(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-xs bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Formal Verification Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-2.5 text-xs bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
              placeholder="Record formal verification statement and rationale..."
            />
          </div>

          {targetStatus === 'Confirmed' && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <b>Cross-Case Learning Gate:</b> Signing off as Confirmed allows this case's verified indicators to safely update the shared Scammer Operation Fingerprint index.
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="glass-btn flex-1 py-2.5 rounded-xl text-slate-300 font-medium text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-xs shadow-[0_0_20px_-3px_rgba(16,185,129,0.45)] transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Processing...' : `Sign-Off & Transition to ${targetStatus}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
