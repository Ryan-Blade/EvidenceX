from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(50), primary_key=True, index=True) # e.g. CASE-2026-001
    title = Column(String(255), nullable=False)
    incident_type = Column(String(100), nullable=False) # e.g. UPI Phishing, Impersonation Fraud
    description = Column(Text, nullable=True)
    incident_date = Column(String(50), nullable=True)
    investigator_name = Column(String(100), default="Lead Cyber Investigator")
    priority = Column(String(20), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="Open") # Open, Under Review, Confirmed, Closed, Escalated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_demo_case = Column(Boolean, default=False)

    # Relationships
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    canonical_entities = relationship("CaseEntity", back_populates="case", cascade="all, delete-orphan")
    entity_mentions = relationship("EntityMention", back_populates="case", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="case", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="case", cascade="all, delete-orphan")
    conflicts = relationship("Conflict", back_populates="case", cascade="all, delete-orphan")
    missing_info = relationship("MissingInfoItem", back_populates="case", cascade="all, delete-orphan")
    structural_flags = relationship("StructuralFlag", back_populates="case", cascade="all, delete-orphan")
    fraud_patterns = relationship("FraudPatternMatch", back_populates="case", cascade="all, delete-orphan")
    status_history = relationship("CaseStatusHistory", back_populates="case", cascade="all, delete-orphan")
    threat_intel_lookups = relationship("ThreatIntelLookup", back_populates="case", cascade="all, delete-orphan")
    summary = relationship("CaseSummary", back_populates="case", uselist=False, cascade="all, delete-orphan")
    victim_fields = relationship("VictimSuppliedField", back_populates="case", cascade="all, delete-orphan")
    verification_requests = relationship("VerificationRequest", back_populates="case", cascade="all, delete-orphan")
    profile_matches = relationship("ProfileMatch", back_populates="case", cascade="all, delete-orphan")
    reconciliations = relationship("ReconciliationRecord", back_populates="case", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    evidence_id = Column(String(20), nullable=False, index=True) # EV-001, EV-002
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False) # IMAGE, PDF, TEXT, URL, MANUAL_TXN
    mime_type = Column(String(100), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    sha256_hash = Column(String(64), nullable=False, index=True)
    storage_path = Column(String(500), nullable=True)
    ocr_status = Column(String(50), default="QUEUED") # QUEUED, PROCESSING, COMPLETED, UNAVAILABLE, FAILED
    extraction_status = Column(String(50), default="QUEUED") # QUEUED, COMPLETED, FAILED
    tamper_signals = Column(Text, nullable=True) # JSON of EXIF/heuristic authenticity signals (signal, not proof)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="evidence_items")
    text_data = relationship("EvidenceText", back_populates="evidence", uselist=False, cascade="all, delete-orphan")

class EvidenceText(Base):
    __tablename__ = "evidence_text"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id"), nullable=False, unique=True)
    raw_ocr_text = Column(Text, nullable=True)
    normalized_text = Column(Text, nullable=True)
    ocr_engine = Column(String(50), default="Tesseract-OCR / Hybrid Extractor")
    engine_confidence = Column(Float, default=0.95)
    word_count = Column(Integer, default=0)

    evidence = relationship("Evidence", back_populates="text_data")

class CaseEntity(Base):
    __tablename__ = "case_entities"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    canonical_name = Column(String(255), nullable=False)
    entity_type = Column(String(50), nullable=False) # PERSON, PHONE, EMAIL, UPI_ID, BANK_ACCOUNT, TXN_ID, URL, HANDLE, LOCATION
    aliases_json = Column(Text, default="[]") # List of aliases / variants
    primary_identifier = Column(String(255), nullable=True)
    is_confirmed_by_analyst = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="canonical_entities")
    mentions = relationship("EntityMention", back_populates="canonical_entity")

class EntityMention(Base):
    __tablename__ = "entity_mentions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    canonical_entity_id = Column(Integer, ForeignKey("case_entities.id"), nullable=True)
    source_evidence_id = Column(String(20), nullable=False) # EV-001
    entity_type = Column(String(50), nullable=False)
    raw_value = Column(String(500), nullable=False)
    masked_value = Column(String(500), nullable=False)
    confidence = Column(Float, default=0.90) # 0.0 to 1.0
    confidence_breakdown_json = Column(Text, default="{}") # {ocr_clarity, match_strength, corroboration_count, rationale}
    evidence_reference = Column(String(255), nullable=True) # e.g. "Line 4, Top-Right Screenshot"
    extraction_status = Column(String(50), default="FOUND") # FOUND, INFERRED, UNCERTAIN, CONFLICTING
    grounding_verified = Column(Boolean, default=True) # Checked against source OCR text

    case = relationship("Case", back_populates="entity_mentions")
    canonical_entity = relationship("CaseEntity", back_populates="mentions")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    source_evidence_id = Column(String(20), nullable=False) # EV-001
    amount = Column(Float, nullable=False)
    amount_formatted = Column(String(50), nullable=False) # ₹5,000.00
    currency = Column(String(10), default="INR")
    sender = Column(String(255), nullable=True)
    receiver = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True) # UPI, IMPS, NEFT, CARD, NETBANKING
    transaction_id_ref = Column(String(100), nullable=True) # UTR / RRN
    timestamp = Column(String(100), nullable=True) # Normalized timestamp
    original_text = Column(Text, nullable=True)
    confidence = Column(Float, default=0.92)
    confidence_breakdown_json = Column(Text, default="{}")
    evidence_reference = Column(String(255), nullable=True)
    extraction_status = Column(String(50), default="FOUND") # FOUND, INFERRED, UNCERTAIN
    reconciliation_status = Column(String(50), default="UNRECONCILED") # RECONCILED, CONTESTED, UNRECONCILED
    matched_statement_ev_id = Column(String(20), nullable=True)

    case = relationship("Case", back_populates="transactions")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    source_evidence_id = Column(String(20), nullable=False) # EV-001 or [Victim-stated]
    timestamp = Column(String(100), nullable=True) # ISO or formatted datetime
    timestamp_display = Column(String(100), nullable=True) # 10:30 AM, 14 Oct 2026
    time_unconfirmed = Column(Boolean, default=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    event_type = Column(String(50), default="MESSAGE") # MESSAGE, URL_VISIT, TRANSACTION, OTP_EVENT, SYSTEM_ALERT, USER_NOTE
    confidence = Column(Float, default=0.90)
    confidence_breakdown_json = Column(Text, default="{}")
    evidence_reference = Column(String(255), nullable=True)
    is_victim_stated = Column(Boolean, default=False)
    sequence_order = Column(Integer, default=0)

    case = relationship("Case", back_populates="timeline_events")

class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False) # e.g. Transaction Amount, Sender Name
    value_a = Column(String(500), nullable=False)
    source_a_id = Column(String(20), nullable=False) # EV-001
    source_a_ref = Column(String(255), nullable=True)
    value_b = Column(String(500), nullable=False)
    source_b_id = Column(String(20), nullable=False) # EV-004
    source_b_ref = Column(String(255), nullable=True)
    discrepancy_details = Column(Text, nullable=True)
    is_reviewed = Column(Boolean, default=False)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)

    case = relationship("Case", back_populates="conflicts")

class MissingInfoItem(Base):
    __tablename__ = "missing_info_items"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    importance = Column(String(20), default="HIGH") # HIGH, MEDIUM, LOW
    category = Column(String(50), default="TRANSACTION") # TRANSACTION, ENTITY, TIMELINE, DOCUMENTATION
    description = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    related_evidence_ids_json = Column(Text, default="[]")
    status = Column(String(50), default="OPEN") # OPEN, RESOLVED, WAIVED

    case = relationship("Case", back_populates="missing_info")
    verification_requests = relationship("VerificationRequest", back_populates="missing_item")

class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    missing_info_id = Column(Integer, ForeignKey("missing_info_items.id"), nullable=True)
    request_type = Column(String(50), nullable=False) # BANK_STATEMENT_REQUEST, TELECOM_CDR_REQUEST, VICTIM_FOLLOWUP
    recipient = Column(String(255), nullable=False)
    draft_subject = Column(String(255), nullable=False)
    draft_body = Column(Text, nullable=False)
    status = Column(String(50), default="DRAFTED") # DRAFTED, READY, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="verification_requests")
    missing_item = relationship("MissingInfoItem", back_populates="verification_requests")

class StructuralFlag(Base):
    __tablename__ = "structural_flags"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    source_evidence_id = Column(String(20), nullable=True) # EV-001 or EV-SEQUENCE
    scope = Column(String(50), default="SINGLE_DOCUMENT") # SINGLE_DOCUMENT or SEQUENCE
    flag_type = Column(String(50), nullable=False) # ARITHMETIC_GAP, MISSING_REQUIRED_FIELD, FORMAT_INCONSISTENCY, TIMELINE_GAP
    title = Column(String(255), nullable=False)
    observation = Column(Text, nullable=False)
    expected_basis = Column(Text, nullable=False) # Why genuine documents expect this
    confidence = Column(Float, default=0.88)
    confidence_breakdown_json = Column(Text, default="{}")
    evidence_reference = Column(String(255), nullable=True)

    case = relationship("Case", back_populates="structural_flags")

class FraudPatternMatch(Base):
    __tablename__ = "fraud_pattern_matches"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    playbook_name = Column(String(100), nullable=False) # OTP Phishing, Fake Bank Call, Investment Scam
    stage_id = Column(String(50), nullable=False) # stage_1_contact, stage_2_pretext, stage_3_otp_ask, etc.
    stage_name = Column(String(255), nullable=False)
    stage_order = Column(Integer, default=1)
    status = Column(String(50), default="NOT_FOUND") # EVIDENCED, NOT_FOUND, REFUSED
    source_evidence_id = Column(String(20), nullable=True) # EV-002
    confidence = Column(Float, default=0.0)
    confidence_breakdown_json = Column(Text, default="{}")
    match_basis = Column(Text, nullable=True) # Deterministic keyword / semantic exemplar match summary

    case = relationship("Case", back_populates="fraud_patterns")

class ReconciliationRecord(Base):
    __tablename__ = "reconciliation_records"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    chat_transaction_ref = Column(String(100), nullable=False) # Mention in EV-002
    statement_evidence_id = Column(String(20), nullable=False) # Debit in EV-004
    amount = Column(Float, nullable=False)
    match_confidence = Column(Float, default=0.95)
    match_basis = Column(Text, nullable=False) # Amount tolerance + Timestamp proximity join
    status = Column(String(50), default="MATCHED") # MATCHED, CONTESTED_AMOUNT, UNMATCHED

    case = relationship("Case", back_populates="reconciliations")

class ScammerProfile(Base):
    __tablename__ = "scammer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(String(50), unique=True, index=True) # PROF-IND-9942
    playbook_name = Column(String(100), nullable=False)
    signature_summary = Column(Text, nullable=False)
    indicator_list_json = Column(Text, default="[]") # Known phones, UPIs, URLs
    confirmed_case_count = Column(Integer, default=1)
    avg_confidence = Column(Float, default=0.91)
    status = Column(String(50), default="CONFIRMED") # NEW, CONFIRMED, COMMON_TEMPLATE
    created_at = Column(DateTime, default=datetime.utcnow)

class ProfileMatch(Base):
    __tablename__ = "profile_matches"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    profile_id = Column(String(50), nullable=False)
    match_confidence = Column(Float, default=0.91)
    matched_basis = Column(String(100), default="BOTH") # INDICATOR, BEHAVIORAL, BOTH
    matched_indicators_json = Column(Text, default="[]")
    alert_text = Column(Text, nullable=False)
    investigator_reviewed = Column(Boolean, default=False)
    dismissed = Column(Boolean, default=False)
    dismissal_reason = Column(Text, nullable=True)

    case = relationship("Case", back_populates="profile_matches")

class CrossCaseIndicator(Base):
    __tablename__ = "cross_case_indicators"

    id = Column(Integer, primary_key=True, index=True)
    indicator_value = Column(String(255), index=True, nullable=False)
    indicator_type = Column(String(50), nullable=False) # PHONE, UPI_ID, BANK_ACCOUNT, URL
    case_id = Column(String(50), nullable=False, index=True)
    source_evidence_id = Column(String(20), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)

class ThreatIntelLookup(Base):
    __tablename__ = "threat_intel_lookups"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    source_evidence_id = Column(String(20), nullable=False)
    url_or_domain = Column(String(500), nullable=False)
    source_feed = Column(String(100), default="ThreatIntel Global Blocklist & PhishTank Engine")
    result_status = Column(String(50), nullable=False) # MALICIOUS_LISTED, NO_LISTING_FOUND, LOOKUP_UNAVAILABLE
    risk_score = Column(Float, default=0.0)
    details_json = Column(Text, default="{}")
    checked_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="threat_intel_lookups")

class CaseStatusHistory(Base):
    __tablename__ = "case_status_history"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(String(100), default="Lead Investigator")
    changed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    case = relationship("Case", back_populates="status_history")

class PIIRevealAudit(Base):
    __tablename__ = "pii_reveal_audit"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    masked_value = Column(String(255), nullable=False)
    revealed_by = Column(String(100), default="Lead Investigator")
    revealed_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text, nullable=True)

class CaseContextSnapshot(Base):
    __tablename__ = "case_context_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), nullable=False, index=True)
    version = Column(Integer, default=1)
    snapshot_json = Column(Text, nullable=False) # Canonical facts snapshot for RAG prompt injection
    updated_at = Column(DateTime, default=datetime.utcnow)

class CaseSummary(Base):
    __tablename__ = "case_summaries"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, unique=True)
    executive_summary = Column(Text, nullable=False)
    narrative_json = Column(Text, nullable=False) # List of referenced chronological narrative entries
    financial_rollup_json = Column(Text, default="{}") # Financial totals and contested items
    key_entities_json = Column(Text, default="[]")
    structural_flags_summary = Column(Text, nullable=True)
    investigator_notes = Column(Text, nullable=True)
    disclaimer = Column(
        String(255),
        default="The information presented is extracted from supplied evidence and requires investigator verification."
    )
    updated_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="summary")

class VictimSuppliedField(Base):
    __tablename__ = "victim_supplied_fields"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    value = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="victim_fields")
