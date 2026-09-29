export interface ConfidenceBreakdown {
  ocr_clarity: number;
  match_strength: number;
  corroboration_count: number;
  rationale: string;
}

export interface TraceabilityData {
  fact_label: string;
  fact_value: string;
  source_evidence_id: string;
  evidence_reference?: string;
  confidence: number;
  confidence_breakdown?: ConfidenceBreakdown;
  extraction_status: string;
  is_victim_stated?: boolean;
  grounding_verified?: boolean;
  storage_path?: string;
  file_name?: string;
}

export interface CaseData {
  id: string;
  title: string;
  incident_type: string;
  description?: string;
  incident_date?: string;
  investigator_name: string;
  priority: string;
  status: string; // Open, Under Review, Confirmed, Closed, Escalated
  created_at: string;
  updated_at: string;
  is_demo_case: boolean;
  evidence_count: number;
  entities_count: number;
  transactions_count: number;
  conflicts_count: number;
  missing_fields_count: number;
  flags_count: number;
  fraud_pattern_matched?: string;
}

export interface EvidenceItem {
  id: number;
  case_id: string;
  evidence_id: string;
  file_name: string;
  file_type: string;
  mime_type?: string;
  file_size_bytes: number;
  sha256_hash: string;
  ocr_status: string;
  extraction_status: string;
  tamper_signals?: string;
  uploaded_at: string;
  raw_text_preview?: string;
  storage_url?: string;
}

export interface EntityMention {
  id: number;
  source_evidence_id: string;
  entity_type: string;
  raw_value: string;
  masked_value: string;
  confidence: number;
  confidence_breakdown?: ConfidenceBreakdown;
  evidence_reference?: string;
  extraction_status: string;
  grounding_verified: boolean;
}

export interface CanonicalEntity {
  id: number;
  canonical_name: string;
  entity_type: string;
  aliases: string[];
  primary_identifier?: string;
  is_confirmed_by_analyst: boolean;
  mentions: EntityMention[];
}

export interface TransactionItem {
  id: number;
  source_evidence_id: string;
  amount: number;
  amount_formatted: string;
  currency: string;
  sender?: string;
  receiver?: string;
  payment_method?: string;
  transaction_id_ref?: string;
  timestamp?: string;
  original_text?: string;
  confidence: number;
  confidence_breakdown?: ConfidenceBreakdown;
  evidence_reference?: string;
  extraction_status: string;
  reconciliation_status: string;
  matched_statement_ev_id?: string;
}

export interface TimelineEventItem {
  id: number;
  source_evidence_id: string;
  timestamp?: string;
  timestamp_display?: string;
  time_unconfirmed: boolean;
  title: string;
  description: string;
  event_type: string;
  confidence: number;
  confidence_breakdown?: ConfidenceBreakdown;
  evidence_reference?: string;
  is_victim_stated: boolean;
  sequence_order: number;
}

export interface ConflictItem {
  id: number;
  field_name: string;
  value_a: string;
  source_a_id: string;
  source_a_ref?: string;
  value_b: string;
  source_b_id: string;
  source_b_ref?: string;
  discrepancy_details?: string;
  is_reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface VerificationRequestItem {
  id: number;
  missing_info_id?: number;
  request_type: string;
  recipient: string;
  draft_subject: string;
  draft_body: string;
  status: string;
}

export interface MissingInfoItemData {
  id: number;
  field_name: string;
  importance: string;
  category: string;
  description: string;
  suggested_action: string;
  related_evidence_ids: string[];
  status: string;
  draft_request?: VerificationRequestItem;
}

export interface StructuralFlagItem {
  id: number;
  source_evidence_id?: string;
  scope: string;
  flag_type: string;
  title: string;
  observation: string;
  expected_basis: string;
  confidence: number;
  confidence_breakdown?: ConfidenceBreakdown;
  evidence_reference?: string;
}

export interface FraudStageItem {
  stage_id: string;
  stage_name: string;
  stage_order: number;
  status: string; // EVIDENCED, NOT_FOUND, REFUSED
  source_evidence_id?: string;
  confidence: number;
  confidence_breakdown?: ConfidenceBreakdown;
  match_basis?: string;
}

export interface FraudPatternData {
  playbook_name: string;
  overall_match_confidence: number;
  stages: FraudStageItem[];
  financial_outcome_summary: string;
  reconciliations: Array<{
    chat_transaction_ref: string;
    statement_evidence_id: string;
    amount: number;
    match_confidence: number;
    match_basis: string;
    status: string;
  }>;
  disclaimer: string;
}

export interface ProfileMatchItem {
  id: number;
  profile_id: string;
  match_confidence: number;
  matched_basis: string;
  matched_indicators: string[];
  alert_text: string;
  investigator_reviewed: boolean;
  dismissed: boolean;
  dismissal_reason?: string;
}

export interface ThreatIntelItem {
  id: number;
  source_evidence_id: string;
  url_or_domain: string;
  source_feed: string;
  result_status: string;
  risk_score: number;
  details: Record<string, any>;
  checked_at: string;
}

export interface NarrativeEntryData {
  timestamp_display: string;
  event_text: string;
  evidence_references: string[];
  is_unresolved_gap?: boolean;
  is_victim_stated?: boolean;
}

export interface CaseSummaryData {
  executive_summary: string;
  narrative: NarrativeEntryData[];
  financial_rollup: {
    total_evidenced_loss: number;
    total_evidenced_loss_formatted: string;
    contested_amounts: Array<any>;
    transactions_list: Array<any>;
  };
  key_entities: Array<{
    canonical_name: string;
    type: string;
    aliases: string[];
  }>;
  structural_flags_summary?: string;
  investigator_notes?: string;
  disclaimer: string;
  updated_at: string;
}

export interface GlobalSearchResultItem {
  case_id: string;
  case_title: string;
  result_type: string;
  matched_text: string;
  source_evidence_id?: string;
  confidence?: number;
  detail?: string;
}

export interface DashboardStatsData {
  total_cases: number;
  active_cases: number;
  total_evidence: number;
  total_conflicts: number;
  open_conflicts: number;
  missing_fields_count: number;
  known_profiles_count: number;
  threat_intel_alerts: number;
}
