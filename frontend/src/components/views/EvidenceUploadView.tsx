import React, { useState, useRef } from 'react';
import {
  Upload, FileText, Globe, DollarSign, MessageSquare,
  CheckCircle2, AlertCircle, ShieldCheck, Loader2, Plus, ArrowRight,
  Archive, File, Image, Trash2, X
} from 'lucide-react';
import { api } from '../../services/api';

interface EvidenceUploadViewProps {
  caseId: string;
  onEvidenceIngested: () => void;
}

export const EvidenceUploadView: React.FC<EvidenceUploadViewProps> = ({ caseId, onEvidenceIngested }) => {
  const [activeTab, setActiveTab] = useState<'FILE' | 'TEXT' | 'URL' | 'TXN' | 'VICTIM'>('FILE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-file upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileMessage, setFileMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
    details?: { ingested?: any[]; duplicates?: any[]; errors?: any[] };
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Paste Text state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);

  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // Manual Txn state
  const [amount, setAmount] = useState('');
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [txnId, setTxnId] = useState('');
  const [txnLoading, setTxnLoading] = useState(false);

  const addFilesToQueue = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const filtered = newFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...filtered];
    });
    setFileMessage(null);
  };

  const removeFileFromQueue = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'zip') return { label: 'ZIP ARCHIVE', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Archive };
    if (ext === 'pdf') return { label: 'PDF DOC', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: FileText };
    if (['png', 'jpg', 'jpeg'].includes(ext)) return { label: 'IMAGE', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Image };
    return { label: ext.toUpperCase() || 'FILE', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: File };
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setFileLoading(true);
    setFileMessage(null);

    try {
      if (selectedFiles.length === 1) {
        const res = await api.uploadEvidenceFile(caseId, selectedFiles[0]);
        if (res.is_archive) {
          setFileMessage({
            type: 'success',
            text: `ZIP Archive Unpacked: ${res.ingested_count || 0} evidence files ingested, ${res.duplicate_count || 0} duplicates skipped.`,
            details: { ingested: res.ingested, duplicates: res.duplicates }
          });
        } else if (res.status === 'DUPLICATE_DETECTED') {
          setFileMessage({
            type: 'warning',
            text: `File already exists in this case as ${res.evidence_id} (SHA-256 match).`
          });
        } else {
          setFileMessage({
            type: 'success',
            text: `Artifact ${res.evidence_id || ''} ingested & hashed (SHA-256: ${res.sha256 ? res.sha256.substring(0, 16) + '...' : ''}). Pipeline processing complete!`
          });
        }
      } else {
        const res = await api.uploadBatchEvidenceFiles(caseId, selectedFiles);
        setFileMessage({
          type: 'success',
          text: `Batch Upload Complete: ${res.ingested_count || 0} files ingested, ${res.duplicate_count || 0} duplicate(s) skipped, ${res.error_count || 0} error(s).`,
          details: { ingested: res.ingested, duplicates: res.duplicates, errors: res.errors }
        });
      }

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onEvidenceIngested();
    } catch (err: any) {
      setFileMessage({ type: 'error', text: err.message || 'Evidence upload failed' });
    } finally {
      setFileLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTitle || !textContent) return;
    setTextLoading(true);
    try {
      await api.pasteTextEvidence(caseId, textTitle, textContent);
      setTextTitle('');
      setTextContent('');
      onEvidenceIngested();
    } catch (err) {
      console.error(err);
    } finally {
      setTextLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    setUrlLoading(true);
    try {
      await api.ingestUrlEvidence(caseId, urlInput);
      setUrlInput('');
      onEvidenceIngested();
    } catch (err) {
      console.error(err);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleTxnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setTxnLoading(true);
    try {
      await api.addManualTransaction(caseId, {
        amount: parseFloat(amount),
        currency: 'INR',
        sender,
        receiver,
        payment_method: paymentMethod,
        transaction_id: txnId
      });
      setAmount('');
      setSender('');
      setReceiver('');
      setTxnId('');
      onEvidenceIngested();
    } catch (err) {
      console.error(err);
    } finally {
      setTxnLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Multi-Modal Evidence Ingestion Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Simultaneous multi-file ingestion across Images, PDFs, TXT, CSV, and ZIP Archives. SHA-256 checksums are calculated immediately upon receipt.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-3 text-xs overflow-x-auto">
        {[
          { id: 'FILE', label: 'Multi-File & Archive Upload', icon: Upload },
          { id: 'TEXT', label: 'Paste Text / Chat Logs', icon: FileText },
          { id: 'URL', label: 'Target URL Ingest', icon: Globe },
          { id: 'TXN', label: 'Manual Transaction Form', icon: DollarSign }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium cursor-pointer transition-all ${
                isActive
                  ? 'glass-btn-active'
                  : 'glass-btn text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: File Upload */}
      {activeTab === 'FILE' && (
        <form onSubmit={handleFileUpload} className="glass-card p-6 sm:p-8 rounded-3xl space-y-5 text-xs text-slate-200">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              addFilesToQueue(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                : 'border-white/[0.12] hover:border-cyan-400/60 bg-slate-950/40'
            }`}
          >
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit mx-auto shadow-inner">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Drag & Drop multiple files or click to browse
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports Images (PNG, JPG), PDF Documents, Text/CSV, and <span className="text-amber-400 font-semibold">ZIP Archives</span> (Up to 50MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => addFilesToQueue(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Queued Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-300">
                  Upload Queue ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {selectedFiles.map((file, idx) => {
                  const badge = getFileBadge(file.name);
                  const BadgeIcon = badge.icon;
                  return (
                    <div
                      key={`${file.name}_${idx}`}
                      className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.08] flex items-center justify-between text-xs transition-all hover:border-white/[0.15]"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={`p-1.5 rounded-lg border flex items-center gap-1 text-[10px] font-mono font-medium ${badge.color}`}>
                          <BadgeIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </div>
                        <span className="text-slate-200 font-mono truncate max-w-xs sm:max-w-md">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-400 text-[11px] font-mono">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFileFromQueue(idx);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {fileMessage && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              fileMessage.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300'
                : fileMessage.type === 'warning'
                ? 'bg-amber-950/50 border-amber-800/80 text-amber-300'
                : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {fileMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{fileMessage.text}</span>
              </div>
              {fileMessage.details?.ingested && fileMessage.details.ingested.length > 0 && (
                <div className="pt-2 border-t border-emerald-800/40 text-[11px] font-mono space-y-1">
                  <div className="font-semibold text-emerald-200">Ingested Artifacts:</div>
                  <div className="flex flex-wrap gap-2">
                    {fileMessage.details.ingested.map((item: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.evidence_id}: {item.file_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || fileLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-[0_0_20px_-3px_rgba(56,189,248,0.45)] disabled:opacity-50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {fileLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Ingesting {selectedFiles.length} file(s) & running pipeline...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Ingest & Extract All ({selectedFiles.length})
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Paste Text */}
      {activeTab === 'TEXT' && (
        <form onSubmit={handleTextSubmit} className="glass-card p-6 sm:p-8 rounded-3xl space-y-4 text-xs text-slate-200">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Artifact Title</label>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              required
              placeholder="e.g. WhatsApp Suspect Chat Transcript"
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Raw Message / Chat Content</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              required
              rows={6}
              placeholder="Paste raw conversation, SMS text, or system log lines..."
              className="w-full px-4 py-3 font-mono bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={textLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-[0_0_20px_-3px_rgba(56,189,248,0.45)] cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {textLoading ? 'Processing...' : 'Ingest & Correlate Text'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Target URL */}
      {activeTab === 'URL' && (
        <form onSubmit={handleUrlSubmit} className="glass-card p-6 sm:p-8 rounded-3xl space-y-4 text-xs text-slate-200">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Phishing / Malicious Target URL</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required
              placeholder="https://secure-sbi-kyc-update.com/verify-pan"
              className="w-full px-4 py-2.5 font-mono bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            EvidenceX will ingest this URL as an immutable evidence record and automatically query Threat Intelligence feeds for domain risk indicators.
          </p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={urlLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-[0_0_20px_-3px_rgba(56,189,248,0.45)] cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {urlLoading ? 'Querying Feeds...' : 'Ingest URL & Check Threat Intel'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Manual Transaction */}
      {activeTab === 'TXN' && (
        <form onSubmit={handleTxnSubmit} className="glass-card p-6 sm:p-8 rounded-3xl space-y-4 text-xs text-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Transaction Amount (INR) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="5000.00"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all"
              >
                <option value="UPI">UPI (Unified Payments Interface)</option>
                <option value="IMPS">IMPS Immediate Payment</option>
                <option value="NEFT">NEFT National Electronic Funds</option>
                <option value="DEBIT_CARD">Debit / Credit Card</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Sender Identifier</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="e.g. Victim Savings Account"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Receiver / VPA Identifier</label>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                placeholder="e.g. rahul.sharma@okhdfcbank"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Banking UTR / RRN Reference (Optional)</label>
            <input
              type="text"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="e.g. 529910482019"
              className="w-full px-4 py-2.5 font-mono bg-slate-950/80 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-all"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={txnLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-[0_0_20px_-3px_rgba(56,189,248,0.45)] cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {txnLoading ? 'Recording...' : 'Record Transaction Record'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
