from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Traceability & Confidence Schema ---
class ConfidenceBreakdown(BaseModel):
    ocr_clarity: float = Field(default=0.95, description="Clarity and sharpness of extracted character block")
    match_strength: float = Field(default=0.90, description="Field alignment with regex/schema syntax")
    corroboration_count: int = Field(default=1, description="Number of independent evidence files confirming fact")
    rationale: str = Field(default="Sourced directly from document text", description="Plain-language explanation")

class TraceabilityInfo(BaseModel):
    fact_label: str
    fact_value: str
    source_evidence_id: str
    evidence_reference: Optional[str] = None
    confidence: float
    confidence_breakdown: Optional[ConfidenceBreakdown] = None
    extraction_status: str
    is_victim_stated: bool = False
    grounding_verified: bool = True
    storage_path: Optional[str] = None
    file_name: Optional[str] = None

# --- Case Schemas ---
class CaseCreate(BaseModel):
    title: str
    incident_type: str
    description: Optional[str] = None
    incident_date: Optional[str] = None
    investigator_name: Optional[str] = "Lead Cyber Investigator"
    priority: Optional[str] = "HIGH"
    victim_initial_notes: Optional[str] = None

class CaseStatusUpdate(BaseModel):
    new_status: str # Open, Under Review, Confirmed, Closed, Escalated
    notes: Optional[str] = None
    changed_by: Optional[str] = "Lead Cyber Investigator"

class CaseResponse(BaseModel):
    id: str
    title: str
    incident_type: str
    description: Optional[str] = None
    incident_date: Optional[str] = None
    investigator_name: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
    is_demo_case: bool
    evidence_count: int = 0
    entities_count: int = 0
    transactions_count: int = 0
    conflicts_count: int = 0
    missing_fields_count: int = 0
    flags_count: int = 0
    fraud_pattern_matched: Optional[str] = None

# --- Evidence Schemas ---
class EvidenceResponse(BaseModel):
    id: int
    case_id: str
    evidence_id: str
    file_name: str
    file_type: str
    mime_type: Optional[str] = None
    file_size_bytes: int
    sha256_hash: str
    ocr_status: str
    extraction_status: str
    tamper_signals: Optional[str] = None
    uploaded_at: datetime
    raw_text_preview: Optional[str] = None
    storage_url: Optional[str] = None

class ManualTxnCreate(BaseModel):
    amount: float
    currency: str = "INR"
    sender: Optional[str] = None
    receiver: Optional[str] = None
    payment_method: Optional[str] = "UPI"
    transaction_id: Optional[str] = None
    timestamp: Optional[str] = None
    notes: Optional[str] = None

class PasteTextCreate(BaseModel):
    title: str
    text_content: str
    file_type: str = "TEXT" # TEXT or CHAT_LOG

class URLIngestCreate(BaseModel):
    url: str
    notes: Optional[str] = None

class VictimFieldCreate(BaseModel):
    field_name: str
    value: str
    notes: Optional[str] = None

# --- Entities & PII Schemas ---
class EntityMentionResponse(BaseModel):
    id: int
    source_evidence_id: str
    entity_type: str
    raw_value: str
    masked_value: str
    confidence: float
    confidence_breakdown: Optional[Dict[str, Any]] = None
    evidence_reference: Optional[str] = None
    extraction_status: str
    grounding_verified: bool

class CanonicalEntityResponse(BaseModel):
    id: int
    canonical_name: str
    entity_type: str
    aliases: List[str]
    primary_identifier: Optional[str]
    is_confirmed_by_analyst: bool
    mentions: List[EntityMentionResponse]

class PIIRevealRequest(BaseModel):
    entity_type: str
    entity_id: Optional[int] = None
    masked_value: str
    reason: str
    revealed_by: Optional[str] = "Lead Cyber Investigator"

# --- Transactions Schemas ---
class TransactionResponse(BaseModel):
    id: int
    source_evidence_id: str
    amount: float
    amount_formatted: str
    currency: str
    sender: Optional[str]
    receiver: Optional[str]
    payment_method: Optional[str]
    transaction_id_ref: Optional[str]
    timestamp: Optional[str]
    original_text: Optional[str]
    confidence: float
    confidence_breakdown: Optional[Dict[str, Any]] = None
    evidence_reference: Optional[str]
    extraction_status: str
    reconciliation_status: str
    matched_statement_ev_id: Optional[str]

# --- Timeline Schemas ---
class TimelineEventResponse(BaseModel):
    id: int
    source_evidence_id: str
    timestamp: Optional[str]
    timestamp_display: Optional[str]
    time_unconfirmed: bool
    title: str
    description: str
    event_type: str
    confidence: float
    confidence_breakdown: Optional[Dict[str, Any]] = None
    evidence_reference: Optional[str]
    is_victim_stated: bool
    sequence_order: int

# --- Conflict Schemas ---
class ConflictResponse(BaseModel):
    id: int
    field_name: str
    value_a: str
    source_a_id: str
    source_a_ref: Optional[str]
    value_b: str
    source_b_id: str
    source_b_ref: Optional[str]
    discrepancy_details: Optional[str]
    is_reviewed: bool
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]

class ConflictReviewUpdate(BaseModel):
    is_reviewed: bool
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = "Lead Cyber Investigator"

# --- Missing Information & Drafts Schemas ---
class MissingInfoResponse(BaseModel):
    id: int
    field_name: str
    importance: str
    category: str
    description: str
    suggested_action: str
    related_evidence_ids: List[str]
    status: str
    draft_request: Optional[Dict[str, Any]] = None

class VerificationRequestResponse(BaseModel):
    id: int
    missing_info_id: Optional[int]
    request_type: str
    recipient: str
    draft_subject: str
    draft_body: str
    status: str
    created_at: datetime

# --- Structural Flags Schemas ---
class StructuralFlagResponse(BaseModel):
    id: int
    source_evidence_id: Optional[str]
    scope: str
    flag_type: str
    title: str
    observation: str
    expected_basis: str
    confidence: float
    confidence_breakdown: Optional[Dict[str, Any]] = None
    evidence_reference: Optional[str]

# --- Fraud Playbook & Sequence Schemas ---
class FraudStageResponse(BaseModel):
    stage_id: str
    stage_name: str
    stage_order: int
    status: str # EVIDENCED, NOT_FOUND, REFUSED
    source_evidence_id: Optional[str]
    confidence: float
    confidence_breakdown: Optional[Dict[str, Any]] = None
    match_basis: Optional[str]

class FraudPatternResponse(BaseModel):
    playbook_name: str
    overall_match_confidence: float
    stages: List[FraudStageResponse]
    financial_outcome_summary: str
    reconciliations: List[Dict[str, Any]]
    disclaimer: str

# --- Scammer Profile Schemas ---
class ScammerProfileResponse(BaseModel):
    profile_id: str
    playbook_name: str
    signature_summary: str
    indicators: List[str]
    confirmed_case_count: int
    avg_confidence: float
    status: str

class ProfileMatchResponse(BaseModel):
    id: int
    profile_id: str
    match_confidence: float
    matched_basis: str
    matched_indicators: List[str]
    alert_text: str
    investigator_reviewed: bool
    dismissed: bool
    dismissal_reason: Optional[str]

# --- Threat Intel Schemas ---
class ThreatIntelResponse(BaseModel):
    id: int
    source_evidence_id: str
    url_or_domain: str
    source_feed: str
    result_status: str # MALICIOUS_LISTED, NO_LISTING_FOUND, LOOKUP_UNAVAILABLE
    risk_score: float
    details: Dict[str, Any]
    checked_at: datetime

# --- Summary & Report Schemas ---
class NarrativeEntry(BaseModel):
    timestamp_display: str
    event_text: str
    evidence_references: List[str]
    is_unresolved_gap: bool = False
    is_victim_stated: bool = False

class FinancialRollup(BaseModel):
    total_evidenced_loss: float
    total_evidenced_loss_formatted: str
    contested_amounts: List[Dict[str, Any]]
    transactions_list: List[Dict[str, Any]]

class CaseSummaryResponse(BaseModel):
    executive_summary: str
    narrative: List[NarrativeEntry]
    financial_rollup: FinancialRollup
    key_entities: List[Dict[str, Any]]
    structural_flags_summary: Optional[str]
    investigator_notes: Optional[str]
    disclaimer: str
    updated_at: datetime

class SummaryNotesUpdate(BaseModel):
    investigator_notes: str

# --- Search & Dashboard Stats ---
class GlobalSearchResult(BaseModel):
    case_id: str
    case_title: str
    result_type: str # ENTITY, TRANSACTION, EVIDENCE, CONFLICT, URL
    matched_text: str
    source_evidence_id: Optional[str]
    confidence: Optional[float]
    detail: Optional[str]

class DashboardStats(BaseModel):
    total_cases: int
    active_cases: int
    total_evidence: int
    total_conflicts: int
    open_conflicts: int
    missing_fields_count: int
    known_profiles_count: int
    threat_intel_alerts: int

# --- Settings & AI Config Schemas ---
class SettingsConfigRequest(BaseModel):
    ai_provider: str = "DEMO_MOCK" # DEMO_MOCK, GEMINI, OPENAI
    api_key: Optional[str] = None

class SettingsConfigResponse(BaseModel):
    ai_provider: str
    has_api_key: bool
    masked_api_key: Optional[str] = None
    status: str
    message: Optional[str] = None

