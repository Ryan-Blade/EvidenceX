import React, { useState, useEffect } from 'react';
import {
  Sliders, Shield, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle,
  History, Server, Sparkles, RefreshCw, Key, Check, ArrowRight, Activity
} from 'lucide-react';
import { api } from '../../services/api';

export const SettingsView: React.FC = () => {
  const [aiProvider, setAiProvider] = useState('DEMO_MOCK');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({
    type: 'idle',
    message: ''
  });

  const [auditLogs, setAuditLogs] = useState<{ pii_reveals: any[]; status_transitions: any[] }>({
    pii_reveals: [],
    status_transitions: []
  });
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load existing configuration from backend & localStorage
  const fetchConfig = async () => {
    try {
      const cfg = await api.getSettingsConfig();
      if (cfg) {
        setAiProvider(cfg.ai_provider || 'DEMO_MOCK');
        if (cfg.masked_api_key) {
          setMaskedKey(cfg.masked_api_key);
        }
      }
    } catch (err) {
      console.warn('Could not load backend config, checking localStorage:', err);
      const savedProvider = localStorage.getItem('evidencex_ai_provider');
      const savedKey = localStorage.getItem('evidencex_api_key');
      if (savedProvider) setAiProvider(savedProvider);
      if (savedKey) setApiKey(savedKey);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.getAuditLogs();
      setAuditLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const handleSaveConfig = async (providerOverride?: string) => {
    const providerToSave = providerOverride || aiProvider;
    setIsSaving(true);
    setSaveStatus({ type: 'idle', message: '' });

    try {
      const res = await api.updateSettingsConfig({
        ai_provider: providerToSave,
        api_key: apiKey.trim() || undefined
      });

      // Persist locally
      localStorage.setItem('evidencex_ai_provider', providerToSave);
      if (apiKey.trim()) {
        localStorage.setItem('evidencex_api_key', apiKey.trim());
      }

      if (res.masked_api_key) {
        setMaskedKey(res.masked_api_key);
      }
      setAiProvider(res.ai_provider);

      if (res.status === 'ACTIVE' || res.status === 'READY') {
        setSaveStatus({
          type: 'success',
          message: res.message || `Successfully activated ${providerToSave} provider!`
        });
      } else {
        setSaveStatus({
          type: 'error',
          message: res.message || 'Key validation failed. Reverted to safe deterministic offline mode.'
        });
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to save configuration.'
      });
    } finally {
      setIsSaving(false);
      // Auto-clear message after 4s
      setTimeout(() => {
        setSaveStatus((prev) => (prev.type === 'success' ? { type: 'idle', message: '' } : prev));
      }, 4000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveConfig();
    }
  };

  const handleSelectProvider = (provId: string) => {
    setAiProvider(provId);
    if (provId === 'DEMO_MOCK') {
      handleSaveConfig('DEMO_MOCK');
    }
  };

  const isConfigActive = aiProvider === 'DEMO_MOCK' || Boolean(maskedKey || apiKey);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* View Header */}
      <div className="border-b border-white/[0.08] pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            System Settings & AI Extraction Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure LLM inference providers, active API secret keys, privacy masking invariants, and view forensic audit logs.
          </p>
        </div>

        {/* Live Active Engine Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.1] text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConfigActive ? 'bg-emerald-400' : 'bg-amber-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isConfigActive ? 'bg-emerald-500' : 'bg-amber-500'
            }`}></span>
          </span>
          <span className="text-slate-300">Active Engine:</span>
          <span className="text-sky-300 font-bold">
            {aiProvider === 'DEMO_MOCK'
              ? 'Offline Deterministic'
              : aiProvider === 'GEMINI'
              ? 'Google Gemini 2.0'
              : 'OpenAI GPT-4o'}
          </span>
        </div>
      </div>

      {/* 1. Extraction Engine & API Key Configuration */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            AI Extraction Provider & Secret Key
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 border border-white/[0.1]">Enter</kbd> to save
          </span>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {[
            {
              id: 'DEMO_MOCK',
              label: 'Deterministic Offline Engine',
              badge: 'Zero API Key Required',
              desc: 'High-precision regex, structured tabular OCR parser, and grounded entity resolution. 100% offline & reproducible.'
            },
            {
              id: 'GEMINI',
              label: 'Google Gemini 2.0 Flash / Pro',
              badge: 'Google AI Studio Key',
              desc: 'Real-time multi-modal schema extraction, narrative synthesis, and unstructured text reasoning.'
            },
            {
              id: 'OPENAI',
              label: 'OpenAI GPT-4o Forensics',
              badge: 'OpenAI Platform Key',
              desc: 'Structured JSON schema outputs, multi-document financial ledger reconciliation, and entity correlation.'
            }
          ].map((p) => {
            const isSelected = aiProvider === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleSelectProvider(p.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative group flex flex-col justify-between ${
                  isSelected
                    ? 'glass-btn-active ring-1 ring-sky-400/50'
                    : 'glass-btn text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                      {p.badge}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                  </div>
                  <div className="font-bold text-xs font-mono text-slate-100">{p.label}</div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Input Section */}
        {aiProvider !== 'DEMO_MOCK' && (
          <div className="pt-2 space-y-3 bg-black/30 p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                {aiProvider === 'GEMINI' ? 'Google Gemini API Key' : 'OpenAI Secret API Key'}:
              </label>
              {maskedKey && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Key: {maskedKey}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={maskedKey ? `Current Key: ${maskedKey} (paste new key to replace)...` : 'Paste your API key here and press Enter...'}
                  className="w-full px-4 py-2.5 pr-10 text-xs font-mono bg-black/60 border border-white/[0.12] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={() => handleSaveConfig()}
                disabled={isSaving || (!apiKey && !maskedKey)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply & Save Key</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Status Notification */}
            {saveStatus.message && (
              <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{saveStatus.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Demo Mode Notice */}
        {aiProvider === 'DEMO_MOCK' && (
          <div className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/20 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>
                Deterministic mode is active. All extractions, entity recognition, and narrative summaries are powered by internal high-precision analyzers.
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold">READY</span>
          </div>
        )}
      </div>

      {/* 2. Privacy & PII Masking Reference Policy (Section 5.9) */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          Section 5.9 Privacy & PII Masking Invariants
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-white/[0.08]">
              <tr>
                <th className="py-2.5 px-3">Field Class</th>
                <th className="py-2.5 px-3">Default Display Masking</th>
                <th className="py-2.5 px-3">Authorized Reveal Available?</th>
                <th className="py-2.5 px-3">Auditing Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Phone / MSISDN</td>
                <td className="py-2.5 px-3 text-sky-300 font-mono">98******10</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-slate-400">Logged (Who / When / Reason)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Email Address</td>
                <td className="py-2.5 px-3 text-sky-300 font-mono">ni***@gmail.com</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-slate-400">Logged (Who / When / Reason)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">UPI ID / VPA</td>
                <td className="py-2.5 px-3 text-sky-300 font-mono">rah***@okhdfcbank</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-slate-400">Logged (Who / When / Reason)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-slate-200">Bank Account No.</td>
                <td className="py-2.5 px-3 text-sky-300 font-mono">********8990</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">YES</td>
                <td className="py-2.5 px-3 text-slate-400">Logged (Who / When / Reason)</td>
              </tr>
              <tr className="bg-rose-950/20">
                <td className="py-2.5 px-3 font-bold text-rose-300">OTP / One-Time PIN / CVV</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">**** (Fully Redacted)</td>
                <td className="py-2.5 px-3 text-rose-400 font-bold">NO — NEVER REVEALED</td>
                <td className="py-2.5 px-3 text-rose-300">Permanent redaction; only event provenance preserved</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Audit Logs Registry */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            Forensic Case Audit Trail (PII Reveals & Lifecycle Transitions)
          </h2>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="glass-btn inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono px-3 py-1.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
        </div>

        {/* PII Reveals Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase font-mono">PII Reveal Events</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Entity Type</th>
                  <th className="py-2.5 px-3">Investigator</th>
                  <th className="py-2.5 px-3">Justification Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-[11px]">
                {auditLogs.pii_reveals.length > 0 ? (
                  auditLogs.pii_reveals.map((p, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 text-slate-400">{p.revealed_at ? new Date(p.revealed_at).toLocaleString() : 'N/A'}</td>
                      <td className="py-2.5 px-3 text-sky-300 font-bold">{p.case_id}</td>
                      <td className="py-2.5 px-3 text-slate-200">{p.entity_type}</td>
                      <td className="py-2.5 px-3 text-slate-300">{p.revealed_by}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans">{p.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500 text-xs">
                      No PII reveal events recorded in this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Transitions Table */}
        <div className="space-y-2 pt-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase font-mono">Case Status Lifecycle Transitions</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase border-b border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Transition</th>
                  <th className="py-2.5 px-3">Authorized By</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-[11px]">
                {auditLogs.status_transitions.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 text-slate-400">{s.changed_at ? new Date(s.changed_at).toLocaleString() : 'N/A'}</td>
                    <td className="py-2.5 px-3 text-sky-300 font-bold">{s.case_id}</td>
                    <td className="py-2.5 px-3 text-slate-200">{s.previous_status} → <span className="text-emerald-400 font-bold">{s.new_status}</span></td>
                    <td className="py-2.5 px-3 text-slate-300">{s.changed_by}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans">{s.notes}</td>
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
