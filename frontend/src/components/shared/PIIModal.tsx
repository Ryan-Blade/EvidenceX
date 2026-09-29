import React, { useState } from 'react';
import { X, Lock, Eye, AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { api } from '../../services/api';

interface PIIModalProps {
  caseId: string;
  entityType: string;
  entityId?: number;
  maskedValue: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (revealedValue: string) => void;
}

export const PIIModal: React.FC<PIIModalProps> = ({
  caseId,
  entityType,
  entityId,
  maskedValue,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('Authorized cybercrime case forensic verification');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOTP = ['OTP', 'PIN', 'PASSWORD', 'CVV'].includes(entityType.toUpperCase());

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOTP) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.revealPII(caseId, {
        entity_type: entityType,
        entity_id: entityId,
        masked_value: maskedValue,
        reason: reason
      });
      onSuccess(res.raw_value);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authorize PII reveal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden text-slate-100 border border-white/[0.12]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Authorized PII Reveal</h3>
              <p className="text-xs text-slate-400">Audited Investigator Action</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          {isOTP ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                Permanent Security Redaction Enforced
              </div>
              <p className="text-xs text-rose-200">
                Authentication secrets (OTP, PINs, Passwords) are strictly non-revealable to anyone at any privilege level.
                Only the event provenance is preserved in EvidenceX.
              </p>
            </div>
          ) : (
            <form onSubmit={handleReveal} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/[0.08] space-y-1">
                <span className="text-xs text-slate-400 uppercase font-mono">Entity Type: {entityType}</span>
                <div className="text-base font-mono font-bold text-cyan-300">{maskedValue}</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Investigative Justification (Mandatory Audit Log):
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2.5 text-xs bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
                  placeholder="Enter reason for uncovering masked identity field..."
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-white/[0.06] text-xs text-slate-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  This action will be permanently recorded in the forensic case audit log with your investigator ID and timestamp.
                </span>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                  {error}
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
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-[0_0_20px_-3px_rgba(56,189,248,0.45)] transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Eye className="w-4 h-4" />
                  {loading ? 'Authorizing...' : 'Authorize & Reveal'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
