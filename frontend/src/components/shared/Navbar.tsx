import React from 'react';
import {
  Shield, Search, PlusCircle, Sparkles, UserCheck,
  LayoutDashboard, FileText, Upload, Cpu, Users, DollarSign,
  Clock, GitCompare, HelpCircle, FileCheck, Sliders, AlertTriangle,
  ChevronDown, Terminal, Compass
} from 'lucide-react';
import { CaseData } from '../../types';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  cases: CaseData[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  onOpenSearch: () => void;
  onLoadDemo: () => void;
  onCreateCase: () => void;
  isDemoLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  cases,
  selectedCaseId,
  onSelectCase,
  onOpenSearch,
  onLoadDemo,
  onCreateCase,
  isDemoLoading
}) => {
  const uniqueCases = React.useMemo(() => {
    const seen = new Set<string>();
    return cases.filter((c) => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [cases]);

  const currentCase = uniqueCases.find(c => c.id === selectedCaseId);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'case-overview', label: 'Case Overview', icon: Compass, requiresCase: true },
    { id: 'upload', label: 'Upload Hub', icon: Upload, requiresCase: true },
    { id: 'analysis', label: 'Evidence & OCR', icon: Cpu, requiresCase: true },
    { id: 'entities', label: 'Entities & PII', icon: Users, requiresCase: true },
    { id: 'transactions', label: 'Transactions', icon: DollarSign, requiresCase: true },
    { id: 'timeline', label: 'Timeline', icon: Clock, requiresCase: true },
    { id: 'conflicts', label: 'Conflicts', icon: GitCompare, requiresCase: true, count: currentCase?.conflicts_count },
    { id: 'missing-info', label: 'Missing Info', icon: HelpCircle, requiresCase: true, count: currentCase?.missing_fields_count },
    { id: 'ai-summary', label: 'AI Narrative', icon: FileCheck, requiresCase: true },
    { id: 'final-report', label: 'Export & Report', icon: FileText, requiresCase: true },
    { id: 'settings', label: 'Settings & Audit', icon: Sliders }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#030407]/80 backdrop-blur-2xl border-b border-white/[0.08] text-slate-100 shadow-2xl shadow-black/60">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo with 21st.dev Celestial Neon Badge */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onViewChange('landing')}>
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative p-2 rounded-xl bg-[#080a0f] border border-sky-400/40 text-sky-400 font-black flex items-center justify-center shadow-lg shadow-sky-950/40">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
                EvidenceX
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono font-bold tracking-wider">
                CONTROL PLANE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">From Scattered Evidence to Structured Investigation</p>
          </div>
        </div>

        {/* Global Search Bar (21st.dev Command Palette Style) */}
        <div
          onClick={onOpenSearch}
          className="flex-1 max-w-md hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/[0.1] hover:border-sky-400/50 text-slate-400 hover:text-slate-100 cursor-pointer transition-all text-xs font-mono group shadow-inner"
        >
          <Search className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          <span className="flex-1">Search phones, UPI, txns, cases...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.06] text-slate-400 rounded-md border border-white/[0.1] group-hover:border-sky-400/40">⌘K</kbd>
        </div>

        {/* Case Selector & Actions */}
        <div className="flex items-center gap-2.5">
          {uniqueCases.length > 0 && (
            <div className="relative">
              <select
                value={selectedCaseId}
                onChange={(e) => {
                  onSelectCase(e.target.value);
                  if (currentView === 'landing') onViewChange('case-overview');
                }}
                className="px-3 py-1.5 text-xs font-mono bg-black/50 border border-white/[0.12] hover:border-sky-400/40 rounded-xl text-sky-300 focus:outline-none focus:border-sky-400 max-w-[170px] sm:max-w-[210px] truncate cursor-pointer shadow-sm"
              >
                {uniqueCases.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#080a0f] text-slate-200">
                    {c.id} — {c.title.substring(0, 22)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Load Demo Button */}
          <button
            onClick={onLoadDemo}
            disabled={isDemoLoading}
            className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/70 text-amber-300 hover:text-amber-100 text-xs font-semibold shadow-lg shadow-amber-500/10 transition-all cursor-pointer disabled:opacity-50 group"
            title="Load Bundled High-Fidelity Cyber Fraud Incident"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">{isDemoLoading ? 'Loading...' : 'Load Demo'}</span>
          </button>

          {/* New Case Primary Action Button */}
          <button
            onClick={onCreateCase}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 text-xs font-black shadow-lg shadow-sky-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">New Case</span>
          </button>

          {/* Investigator Profile Badge */}
          <div className="p-1 px-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-2 text-xs">
            <div className="w-5 h-5 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-bold text-[9px]">
              VR
            </div>
            <span className="text-slate-300 font-medium hidden lg:inline text-[11px]">Insp. Vikram</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-bar (21st.dev Floating Cyber Pill Strip) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center overflow-x-auto space-x-1.5 py-2 border-t border-white/[0.04] scrollbar-none text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all font-medium text-xs cursor-pointer ${
                isActive
                  ? 'glass-btn-active'
                  : 'glass-btn'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-300' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
