import React, { useState, useEffect } from 'react';
import { Navbar } from './components/shared/Navbar';
import { TraceabilityDrawer } from './components/shared/TraceabilityDrawer';
import { PIIModal } from './components/shared/PIIModal';
import { GlobalSearchModal } from './components/shared/GlobalSearchModal';
import { SignOffModal } from './components/shared/SignOffModal';

import { LandingView } from './components/views/LandingView';
import { DashboardView } from './components/views/DashboardView';
import { CreateCaseView } from './components/views/CreateCaseView';
import { CaseOverviewView } from './components/views/CaseOverviewView';
import { EvidenceUploadView } from './components/views/EvidenceUploadView';
import { EvidenceAnalysisView } from './components/views/EvidenceAnalysisView';
import { EntitiesView } from './components/views/EntitiesView';
import { TransactionsView } from './components/views/TransactionsView';
import { TimelineView } from './components/views/TimelineView';
import { ConflictsView } from './components/views/ConflictsView';
import { MissingInfoView } from './components/views/MissingInfoView';
import { AISummaryView } from './components/views/AISummaryView';
import { FinalReportView } from './components/views/FinalReportView';
import { SettingsView } from './components/views/SettingsView';
import ConstellationGrid from './components/ui/constellation-grid';

import { api } from './services/api';
import {
  CaseData, DashboardStatsData, EvidenceItem, CanonicalEntity,
  TransactionItem, TimelineEventItem, ConflictItem, MissingInfoItemData,
  FraudPatternData, ProfileMatchItem, CaseSummaryData, TraceabilityData,
  GlobalSearchResultItem
} from './types';

export function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [cases, setCases] = useState<CaseData[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('CASE-2026-8841');
  const [stats, setStats] = useState<DashboardStatsData | null>(null);

  // Case Data Sub-states
  const [currentCase, setCurrentCase] = useState<CaseData | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [entities, setEntities] = useState<CanonicalEntity[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingInfoItemData[]>([]);
  const [fraudPattern, setFraudPattern] = useState<FraudPatternData | null>(null);
  const [fingerprints, setFingerprints] = useState<ProfileMatchItem[]>([]);
  const [summary, setSummary] = useState<CaseSummaryData | null>(null);

  // Modals & Drawers
  const [traceabilityData, setTraceabilityData] = useState<TraceabilityData | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [piiModalData, setPiiModalData] = useState<{
    isOpen: boolean;
    entityType: string;
    maskedValue: string;
    entityId?: number;
  }>({
    isOpen: false,
    entityType: '',
    maskedValue: ''
  });

  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Fetch Cases and Dashboard stats
  const refreshCasesAndStats = async () => {
    try {
      const [casesData, statsData] = await Promise.all([
        api.getCases(),
        api.getDashboardStats()
      ]);
      const uniqueCases = casesData.filter(
        (c: CaseData, index: number, self: CaseData[]) =>
          index === self.findIndex((t: CaseData) => t.id === c.id)
      );
      setCases(uniqueCases);
      setStats(statsData);

      if (uniqueCases.length > 0 && !uniqueCases.some((c: CaseData) => c.id === selectedCaseId)) {
        setSelectedCaseId(uniqueCases[0].id);
      }
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  // Fetch full details for selected case
  const refreshCaseDetails = async (caseId: string) => {
    if (!caseId) return;
    try {
      const [
        caseObj,
        evData,
        entData,
        txnData,
        timeData,
        confData,
        missData,
        fpData,
        fingData,
        sumData
      ] = await Promise.all([
        api.getCase(caseId),
        api.getEvidence(caseId),
        api.getEntities(caseId),
        api.getTransactions(caseId),
        api.getTimeline(caseId),
        api.getConflicts(caseId),
        api.getMissingInfo(caseId),
        api.getFraudPattern(caseId).catch(() => null),
        api.getFingerprints(caseId).catch(() => []),
        api.getSummary(caseId).catch(() => null)
      ]);

      setCurrentCase(caseObj);
      setEvidenceList(evData);
      setEntities(entData);
      setTransactions(txnData);
      setTimelineEvents(timeData);
      setConflicts(confData);
      setMissingItems(missData);
      setFraudPattern(fpData);
      setFingerprints(fingData);
      setSummary(sumData);
    } catch (err) {
      console.error('Error fetching case details:', err);
    }
  };

  useEffect(() => {
    refreshCasesAndStats();
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      refreshCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId]);

  // Handle 1-Click Load Demo Case
  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
      const res = await api.seedDemoCase();
      await refreshCasesAndStats();
      setSelectedCaseId(res.case_id);
      await refreshCaseDetails(res.case_id);
      setCurrentView('case-overview');
    } catch (err) {
      console.error('Failed to load demo case:', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Handle Inspect Traceability
  const handleInspectTraceability = (
    factLabel: string,
    factValue: string,
    evId: string,
    conf: number
  ) => {
    const matchingEv = evidenceList.find(e => e.evidence_id === evId);
    setTraceabilityData({
      fact_label: factLabel,
      fact_value: factValue,
      source_evidence_id: evId,
      evidence_reference: matchingEv ? `${evId} - File Body` : undefined,
      confidence: conf,
      confidence_breakdown: {
        ocr_clarity: 0.96,
        match_strength: conf,
        corroboration_count: 1,
        rationale: `Verified extraction linked to source custody record ${evId}.`
      },
      extraction_status: 'FOUND',
      is_victim_stated: evId === '[Victim-stated]',
      grounding_verified: true,
      file_name: matchingEv?.file_name
    });
  };

  // Jump to evidence view from traceability drawer
  const handleJumpToEvidence = (evId: string) => {
    setTraceabilityData(null);
    setCurrentView('analysis');
  };

  // Handle Search item selection
  const handleSelectSearchResult = (caseId: string, item: GlobalSearchResultItem) => {
    setSelectedCaseId(caseId);
    if (item.result_type === 'ENTITY') setCurrentView('entities');
    else if (item.result_type === 'TRANSACTION') setCurrentView('transactions');
    else if (item.result_type === 'EVIDENCE') setCurrentView('analysis');
    else setCurrentView('case-overview');
  };

  return (
    <div className="relative min-h-screen bg-[#030407] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 21st.dev Dynamic Interactive Kinetic Constellation Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ConstellationGrid showOverlay={false} transparent={false} />
      </div>

      {/* Top Navigation */}
      <div className="relative z-20">
        <Navbar
          currentView={currentView}
          onViewChange={setCurrentView}
          cases={cases}
          selectedCaseId={selectedCaseId}
          onSelectCase={(id) => {
            setSelectedCaseId(id);
            if (currentView === 'landing') setCurrentView('case-overview');
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onLoadDemo={handleLoadDemo}
          onCreateCase={() => setCurrentView('create-case')}
          isDemoLoading={isDemoLoading}
        />
      </div>

      {/* Main Content View Switcher */}
      <main className="relative z-10 flex-1">
        {currentView === 'landing' && (
          <LandingView
            onLoadDemo={handleLoadDemo}
            onGoToDashboard={() => setCurrentView('dashboard')}
            onCreateCase={() => setCurrentView('create-case')}
            isDemoLoading={isDemoLoading}
            entities={entities}
            evidenceList={evidenceList}
            transactions={transactions}
            caseData={currentCase}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            stats={stats}
            cases={cases}
            onSelectCase={(id) => {
              setSelectedCaseId(id);
              setCurrentView('case-overview');
            }}
            onCreateCase={() => setCurrentView('create-case')}
            onLoadDemo={handleLoadDemo}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentView === 'create-case' && (
          <CreateCaseView
            onCaseCreated={(newCaseId) => {
              refreshCasesAndStats();
              setSelectedCaseId(newCaseId);
              setCurrentView('case-overview');
            }}
            onCancel={() => setCurrentView(cases.length > 0 ? 'dashboard' : 'landing')}
          />
        )}

        {currentView === 'case-overview' && currentCase && (
          <CaseOverviewView
            caseData={currentCase}
            fraudPattern={fraudPattern}
            fingerprints={fingerprints}
            onOpenSignOff={() => setIsSignOffOpen(true)}
            onNavigate={setCurrentView}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'upload' && (
          <EvidenceUploadView
            caseId={selectedCaseId}
            onEvidenceIngested={() => {
              refreshCasesAndStats();
              refreshCaseDetails(selectedCaseId);
            }}
          />
        )}

        {currentView === 'analysis' && (
          <EvidenceAnalysisView
            evidenceList={evidenceList}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'entities' && (
          <EntitiesView
            entities={entities}
            caseId={selectedCaseId}
            evidenceList={evidenceList}
            transactions={transactions}
            onInspectTraceability={handleInspectTraceability}
            onOpenPIIModal={(entityType, maskedValue, entityId) => {
              setPiiModalData({
                isOpen: true,
                entityType,
                maskedValue,
                entityId
              });
            }}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'timeline' && (
          <TimelineView
            timelineEvents={timelineEvents}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'conflicts' && (
          <ConflictsView
            caseId={selectedCaseId}
            conflicts={conflicts}
            onConflictUpdated={() => {
              refreshCasesAndStats();
              refreshCaseDetails(selectedCaseId);
            }}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'missing-info' && (
          <MissingInfoView
            missingItems={missingItems}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'ai-summary' && (
          <AISummaryView
            caseId={selectedCaseId}
            summary={summary}
            onInspectTraceability={handleInspectTraceability}
            onSummaryUpdated={() => refreshCaseDetails(selectedCaseId)}
          />
        )}

        {currentView === 'final-report' && currentCase && (
          <FinalReportView
            caseData={currentCase}
            summary={summary}
            evidenceList={evidenceList}
            conflicts={conflicts}
            missingItems={missingItems}
            onInspectTraceability={handleInspectTraceability}
          />
        )}

        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Global Modals & Drawers */}
      <TraceabilityDrawer
        data={traceabilityData}
        onClose={() => setTraceabilityData(null)}
        onJumpToEvidence={handleJumpToEvidence}
      />

      <PIIModal
        caseId={selectedCaseId}
        entityType={piiModalData.entityType}
        entityId={piiModalData.entityId}
        maskedValue={piiModalData.maskedValue}
        isOpen={piiModalData.isOpen}
        onClose={() => setPiiModalData({ ...piiModalData, isOpen: false })}
        onSuccess={(revealed) => {
          refreshCaseDetails(selectedCaseId);
          alert(`Authorized PII Unmasked:\n${revealed}\n\nThis reveal event has been recorded in the forensic case audit log.`);
        }}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      {currentCase && (
        <SignOffModal
          caseId={selectedCaseId}
          currentStatus={currentCase.status}
          isOpen={isSignOffOpen}
          onClose={() => setIsSignOffOpen(false)}
          onStatusUpdated={() => {
            refreshCasesAndStats();
            refreshCaseDetails(selectedCaseId);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[11px] font-mono text-slate-500">
        EvidenceX Incident Management Control Plane • "From Scattered Evidence to Structured Investigation" • Auditable Digital Forensics Standard
      </footer>
    </div>
  );
}

export default App;
