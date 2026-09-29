import React from 'react';
import {
  FolderLock, FileText, AlertTriangle, HelpCircle, ShieldAlert,
  Fingerprint, PlusCircle, Sparkles, ArrowRight, Clock, User,
  Activity, ShieldCheck, CheckCircle2, ChevronRight
} from 'lucide-react';
import { CaseData, DashboardStatsData } from '../../types';

interface DashboardViewProps {
  stats: DashboardStatsData | null;
  cases: CaseData[];
  onSelectCase: (caseId: string) => void;
  onCreateCase: () => void;
  onLoadDemo: () => void;
  isDemoLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  cases,
  onSelectCase,
  onCreateCase,
  onLoadDemo,
  isDemoLoading
}) => {
  const statCards = [
    { label: 'Active Cases', value: stats?.active_cases ?? 3, icon: FolderLock, color: 'text-sky-400 bg-sky-500/10 border-sky-400/30' },
    { label: 'Evidence Ingested', value: stats?.total_evidence ?? 12, icon: FileText, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-400/30' },
    { label: 'Unresolved Conflicts', value: stats?.open_conflicts ?? 1, icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10 border-rose-400/30' },
    { label: 'Missing Info Items', value: stats?.missing_fields_count ?? 9, icon: HelpCircle, color: 'text-amber-400 bg-amber-500/10 border-amber-400/30' },
    { label: 'Scammer Fingerprints', value: stats?.known_profiles_count ?? 2, icon: Fingerprint, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/30' },
    { label: 'Threat-Intel Alerts', value: stats?.threat_intel_alerts ?? 3, icon: ShieldAlert, color: 'text-purple-400 bg-purple-500/10 border-purple-400/30' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Investigation Incident Command
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
              LIVE MONITOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Real-time digital forensics case status, SHA-256 evidence custody hashes, and cross-case pattern alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLoadDemo}
            disabled={isDemoLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:text-amber-100 hover:bg-amber-500/20 text-xs font-semibold shadow-lg shadow-amber-500/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isDemoLoading ? 'Loading...' : 'Reset Demo Case'}</span>
          </button>

          <button
            onClick={onCreateCase}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 font-black text-xs shadow-xl shadow-sky-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Create Incident Case</span>
          </button>
        </div>
      </div>

      {/* 21st.dev Bento Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="p-4 rounded-2xl glass-card space-y-2 border border-white/[0.08]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">{c.label}</span>
                <div className={`p-1.5 rounded-lg border ${c.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* 21st.dev Case Registry Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <FileText className="w-4 h-4 text-sky-400" />
              Active Incident Dossiers ({cases.length})
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08] font-mono">
              REAL-TIME
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Click a case row to inspect structured evidence</span>
        </div>

        {/* 21st.dev Table Container */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#030407]/90 text-slate-400 uppercase font-mono text-[10px] border-b border-white/[0.08]">
                <tr>
                  <th className="py-3.5 px-4">Case ID</th>
                  <th className="py-3.5 px-4">Incident Title & Classification</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Lifecycle State</th>
                  <th className="py-3.5 px-4">Evidence</th>
                  <th className="py-3.5 px-4">Conflicts</th>
                  <th className="py-3.5 px-4">Investigator</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c.id)}
                    className="hover:bg-white/[0.05] cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 font-bold text-sky-300 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className={`inline-flex rounded-full h-2 w-2 ${
                          c.status === 'Confirmed' ? 'bg-emerald-400' :
                          c.status === 'Under Review' ? 'bg-sky-400' : 'bg-indigo-400'
                        }`} />
                      </span>
                      {c.id}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-sans font-bold text-slate-100 text-xs group-hover:text-sky-200 transition-colors">
                        {c.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">{c.incident_type}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' :
                        c.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800/80 text-slate-300 border border-slate-700'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                        c.status === 'Under Review' ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30' :
                        c.status === 'Closed' ? 'bg-slate-800 text-slate-400' :
                        'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-300">{c.evidence_count} files</td>
                    <td className="py-4 px-4">
                      {c.conflicts_count > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          {c.conflicts_count} Unresolved
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-sans text-slate-400">{c.investigator_name}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1 text-sky-400 group-hover:text-sky-200 font-sans font-semibold text-xs group-hover:translate-x-1 transition-all">
                        Inspect <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
