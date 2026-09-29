import React, { useState } from 'react';
import { PlusCircle, X, Shield, Calendar, User, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../../services/api';

interface CreateCaseViewProps {
  onCaseCreated: (caseId: string) => void;
  onCancel: () => void;
}

export const CreateCaseView: React.FC<CreateCaseViewProps> = ({ onCaseCreated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('UPI Phishing & Impersonation');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [investigatorName, setInvestigatorName] = useState('Insp. Vikram Rathore (Cyber Crime Cell)');
  const [priority, setPriority] = useState('HIGH');
  const [victimNotes, setVictimNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Please provide an incident case title');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.createCase({
        title,
        incident_type: incidentType,
        description,
        incident_date: incidentDate,
        investigator_name: investigatorName,
        priority,
        victim_initial_notes: victimNotes || undefined
      });
      onCaseCreated(res.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Register New Incident Case</h1>
            <p className="text-xs text-slate-400">Initiate a structured digital forensics investigation workspace</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-3xl space-y-5 text-xs text-slate-200">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Incident Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Unauthorized NetBanking Debit following Fake KYC SMS"
            className="w-full px-4 py-3 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 text-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Incident Classification *</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all"
            >
              <option value="UPI Phishing & Impersonation">UPI Phishing & Impersonation</option>
              <option value="Banking KYC Smishing">Banking KYC Smishing</option>
              <option value="Part-time Job / Task Investment Scam">Part-time Job / Task Investment Scam</option>
              <option value="Electricity / Utility Bill Phishing">Electricity / Utility Bill Phishing</option>
              <option value="Remote Access Trojan (RAT) Vishing">Remote Access Trojan (RAT) Vishing</option>
              <option value="E-Commerce Payment Fraud">E-Commerce Payment Fraud</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all"
            >
              <option value="CRITICAL">CRITICAL (Active Financial Exfiltration)</option>
              <option value="HIGH">HIGH (Standard Cyber Incident)</option>
              <option value="MEDIUM">MEDIUM (Attempted Phishing / Refused)</option>
              <option value="LOW">LOW (Informational / Uncorroborated)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Incident Occurrence Date</label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Investigator Name / Desk</label>
            <input
              type="text"
              value={investigatorName}
              onChange={(e) => setInvestigatorName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300">Incident Narrative & Background</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe initial circumstances, affected bank accounts, and suspect outreach channels..."
            className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
          />
        </div>

        {/* Section 6.9 Victim-Supplied Intake Notes (Provenance-Isolated) */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <FileText className="w-4 h-4" />
            Optional Complainant Intake Declaration (Section 6.9)
          </div>
          <p className="text-[11px] text-slate-400">
            Any statements entered here will be tagged as <span className="text-amber-300 font-mono">[Victim-stated]</span> and kept provenance-isolated from verified OCR extractions.
          </p>
          <textarea
            value={victimNotes}
            onChange={(e) => setVictimNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Victim states they received call at 10:30 AM from person claiming to be bank manager Rahul..."
            className="w-full px-3.5 py-2 bg-slate-900/90 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/50 transition-all"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onCancel}
            className="glass-btn px-4 py-2.5 rounded-xl text-slate-300 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-[0_0_20px_-3px_rgba(56,189,248,0.45)] disabled:opacity-50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Creating Workspace...' : 'Create Case & Ingest Evidence'}
          </button>
        </div>
      </form>
    </div>
  );
};
