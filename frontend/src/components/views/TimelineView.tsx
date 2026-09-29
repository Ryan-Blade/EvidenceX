import React from 'react';
import {
  Clock, Shield, MessageSquare, Globe, DollarSign,
  AlertTriangle, CheckCircle2, ArrowRight, ExternalLink, Activity, Info
} from 'lucide-react';
import { TimelineEventItem } from '../../types';

interface TimelineViewProps {
  timelineEvents: TimelineEventItem[];
  onInspectTraceability: (label: string, value: string, evId: string, conf: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timelineEvents,
  onInspectTraceability
}) => {
  const orderedEvents = timelineEvents.filter(e => !e.time_unconfirmed);
  const unorderedEvents = timelineEvents.filter(e => e.time_unconfirmed);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'MESSAGE': return MessageSquare;
      case 'URL_VISIT': return Globe;
      case 'TRANSACTION': return DollarSign;
      case 'SYSTEM_ALERT': return AlertTriangle;
      default: return Clock;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div className="border-b border-white/[0.08] pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-sky-400" />
          Chronological Incident Reconstruction Feed
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Section 5.5 Normalized Timeline: Merged cross-evidence timestamped occurrences. Every node anchors to an immutable source artifact.
        </p>
      </div>

      {/* Main Chronological Stream */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-white/[0.1] space-y-8">
        {orderedEvents.map((ev) => {
          const Icon = getEventIcon(ev.event_type);
          return (
            <div key={ev.id} className="relative group">
              {/* Timeline Node Dot */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-[#030407] border-2 border-sky-400 flex items-center justify-center text-sky-400 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.6)] transition-all shadow-lg shadow-black/80">
                <Icon className="w-3 h-3" />
              </div>

              {/* Event Card */}
              <div className="p-5 rounded-2xl glass-card border border-white/[0.08] hover:border-sky-400/40 transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-300">
                      {ev.timestamp_display}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] border border-white/[0.08] text-slate-300">
                      {ev.event_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onInspectTraceability(ev.title, ev.description, ev.source_evidence_id, ev.confidence)}
                      className="px-2.5 py-0.5 rounded-lg bg-sky-950/80 text-sky-300 hover:bg-sky-900 border border-sky-800 font-mono text-xs font-bold transition-colors cursor-pointer"
                    >
                      Source [{ev.source_evidence_id}]
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {Math.round(ev.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100">{ev.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{ev.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unordered / Needs Manual Placement Bucket */}
      {unorderedEvents.length > 0 && (
        <div className="p-6 rounded-2xl glass-card border border-dashed border-amber-500/40 space-y-4">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono">
            <Info className="w-4 h-4" />
            <span>Unconfirmed Timestamps (Pending Cross-Corroboration)</span>
          </div>
          <div className="space-y-3">
            {unorderedEvents.map((ev) => (
              <div key={ev.id} className="p-4 rounded-xl bg-black/50 border border-white/[0.06] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-200">{ev.title}</div>
                  <div className="text-slate-400 text-[11px]">{ev.description}</div>
                </div>
                <button
                  onClick={() => onInspectTraceability(ev.title, ev.description, ev.source_evidence_id, ev.confidence)}
                  className="glass-btn px-2.5 py-1 rounded-lg text-xs cursor-pointer"
                >
                  [{ev.source_evidence_id}]
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
