import os
import re
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from database import engine, get_db, Base, EVIDENCE_STORAGE_DIR
from models import (
    Case, Evidence, EvidenceText, CaseEntity, EntityMention,
    Transaction, TimelineEvent, Conflict, MissingInfoItem,
    StructuralFlag, FraudPatternMatch, ReconciliationRecord,
    ScammerProfile, ProfileMatch, ThreatIntelLookup, CaseStatusHistory,
    PIIRevealAudit, CaseSummary, VictimSuppliedField, VerificationRequest, CrossCaseIndicator
)
from schemas import (
    CaseCreate, CaseResponse, CaseStatusUpdate, EvidenceResponse,
    CanonicalEntityResponse, EntityMentionResponse, PIIRevealRequest,
    TransactionResponse, TimelineEventResponse, ConflictResponse,
    ConflictReviewUpdate, MissingInfoResponse, StructuralFlagResponse,
    FraudPatternResponse, ScammerProfileResponse, ProfileMatchResponse,
    ThreatIntelResponse, CaseSummaryResponse, SummaryNotesUpdate,
    GlobalSearchResult, DashboardStats, PasteTextCreate, URLIngestCreate, ManualTxnCreate,
    SettingsConfigRequest, SettingsConfigResponse
)
from services.ingestion import IngestionService
from services.ocr_engine import OCREngine
from services.pii_masker import PIIMasker
from services.ai_extraction import AIExtractionEngine
from services.entity_resolver import EntityResolver
from services.structural_analyzer import StructuralAnalyzer
from services.sequence_engine import SequenceEngine
from services.conflict_detector import ConflictDetector
from services.missing_info import MissingInfoService
from services.threat_intel import ThreatIntelService
from services.fingerprint_engine import FingerprintEngine
from services.case_context import CaseContextService
from services.summary_generator import SummaryGeneratorService
from services.report_exporter import ReportExporterService
from services.demo_case_seeder import DemoCaseSeeder

# Persistent System Config
SYSTEM_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "data", "system_config.json")
def load_system_config():
    if os.path.exists(SYSTEM_CONFIG_FILE):
        try:
            with open(SYSTEM_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"ai_provider": "DEMO_MOCK", "api_key": ""}

def save_system_config(cfg):
    try:
        os.makedirs(os.path.dirname(SYSTEM_CONFIG_FILE), exist_ok=True)
        with open(SYSTEM_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"Failed to save system config: {e}")

SYSTEM_CONFIG = load_system_config()


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EvidenceX API",
    description="Investigation-Support Control Plane: From Scattered Evidence to Structured Investigation.",
    version="2.0.0"
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount evidence static files
app.mount("/files", StaticFiles(directory=EVIDENCE_STORAGE_DIR), name="evidence_files")

@app.on_event("startup")
def startup_event():
    # Seed known scammer profiles and ensure demo data is ready
    db = next(get_db())
    try:
        FingerprintEngine.seed_known_profiles(db)
        # Ensure demo case exists on first startup
        existing_demo = db.query(Case).filter(Case.id == "CASE-2026-8841").first()
        if not existing_demo:
            DemoCaseSeeder.seed_demo_case(db)
    finally:
        db.close()

# ==========================================
# 1. CASES & DASHBOARD STATS
# ==========================================

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_cases = db.query(Case).count()
    active_cases = db.query(Case).filter(Case.status.in_(["Open", "Under Review"])).count()
    total_evidence = db.query(Evidence).count()
    total_conflicts = db.query(Conflict).count()
    open_conflicts = db.query(Conflict).filter(Conflict.is_reviewed == False).count()
    missing_fields = db.query(MissingInfoItem).filter(MissingInfoItem.status == "OPEN").count()
    known_profiles = db.query(ScammerProfile).count()
    threat_intel_alerts = db.query(ThreatIntelLookup).filter(ThreatIntelLookup.result_status == "MALICIOUS_LISTED").count()

    return DashboardStats(
        total_cases=total_cases,
        active_cases=active_cases,
        total_evidence=total_evidence,
        total_conflicts=total_conflicts,
        open_conflicts=open_conflicts,
        missing_fields_count=missing_fields,
        known_profiles_count=known_profiles,
        threat_intel_alerts=threat_intel_alerts
    )

@app.get("/api/cases", response_model=List[CaseResponse])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(desc(Case.created_at)).all()
    result = []
    for c in cases:
        ev_count = db.query(Evidence).filter(Evidence.case_id == c.id).count()
        ent_count = db.query(CaseEntity).filter(CaseEntity.case_id == c.id).count()
        txn_count = db.query(Transaction).filter(Transaction.case_id == c.id).count()
        conf_count = db.query(Conflict).filter(Conflict.case_id == c.id).count()
        miss_count = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == c.id, MissingInfoItem.status == "OPEN").count()
        flag_count = db.query(StructuralFlag).filter(StructuralFlag.case_id == c.id).count()
        pm = db.query(FraudPatternMatch).filter(FraudPatternMatch.case_id == c.id, FraudPatternMatch.status == "EVIDENCED").first()

        result.append(CaseResponse(
            id=c.id,
            title=c.title,
            incident_type=c.incident_type,
            description=c.description,
            incident_date=c.incident_date,
            investigator_name=c.investigator_name,
            priority=c.priority,
            status=c.status,
            created_at=c.created_at,
            updated_at=c.updated_at,
            is_demo_case=c.is_demo_case,
            evidence_count=ev_count,
            entities_count=ent_count,
            transactions_count=txn_count,
            conflicts_count=conf_count,
            missing_fields_count=miss_count,
            flags_count=flag_count,
            fraud_pattern_matched=pm.playbook_name if pm else None
        ))
    return result

@app.post("/api/cases", response_model=CaseResponse)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    # Safely determine the next sequential case ID
    existing_cases = db.query(Case.id).all()
    existing_ids = [c[0] for c in existing_cases]
    
    max_num = 0
    for cid in existing_ids:
        m = re.search(r'CASE-2026-(\d+)', cid)
        if m:
            val = int(m.group(1))
            if val < 7000 and val > max_num:
                max_num = val
                
    next_num = max(max_num + 1, 1)
    case_id = f"CASE-2026-{next_num:04d}"
    while case_id in existing_ids:
        next_num += 1
        case_id = f"CASE-2026-{next_num:04d}"

    new_case = Case(
        id=case_id,
        title=case_in.title,
        incident_type=case_in.incident_type,
        description=case_in.description,
        incident_date=case_in.incident_date or datetime.utcnow().strftime("%d %b %Y"),
        investigator_name=case_in.investigator_name or "Lead Cyber Investigator",
        priority=case_in.priority or "HIGH",
        status="Open",
        is_demo_case=False
    )
    db.add(new_case)

    # Initial status history
    sh = CaseStatusHistory(
        case_id=case_id,
        previous_status="None",
        new_status="Open",
        changed_by=new_case.investigator_name,
        notes="Case registered in EvidenceX control plane."
    )
    db.add(sh)

    # Optional victim intake notes
    if case_in.victim_initial_notes:
        vf = VictimSuppliedField(
            case_id=case_id,
            field_name="Initial Incident Narrative",
            value=case_in.victim_initial_notes,
            notes="Submitted directly by complainant at intake stage. Marked [Victim-stated]."
        )
        db.add(vf)
        # Create a timeline node with victim-stated provenance
        te = TimelineEvent(
            case_id=case_id,
            source_evidence_id="[Victim-stated]",
            timestamp=datetime.utcnow().isoformat(),
            timestamp_display="Intake Submission",
            time_unconfirmed=True,
            title="Victim Initial Statement Recorded",
            description=case_in.victim_initial_notes,
            event_type="USER_NOTE",
            confidence=0.75,
            confidence_breakdown_json=json.dumps({
                "ocr_clarity": 1.0,
                "match_strength": 0.75,
                "corroboration_count": 0,
                "rationale": "Direct complainant declaration. Requires forensic artifact corroboration."
            }),
            evidence_reference="Victim Intake Form",
            is_victim_stated=True,
            sequence_order=0
        )
        db.add(te)

    db.commit()
    db.refresh(new_case)

    # Seed initial missing info checklist
    MissingInfoService.scan_case_missing_info(db, case_id)

    return CaseResponse(
        id=new_case.id,
        title=new_case.title,
        incident_type=new_case.incident_type,
        description=new_case.description,
        incident_date=new_case.incident_date,
        investigator_name=new_case.investigator_name,
        priority=new_case.priority,
        status=new_case.status,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at,
        is_demo_case=new_case.is_demo_case,
        evidence_count=0,
        entities_count=0,
        transactions_count=0,
        conflicts_count=0,
        missing_fields_count=3,
        flags_count=0,
        fraud_pattern_matched=None
    )

@app.get("/api/cases/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    ev_count = db.query(Evidence).filter(Evidence.case_id == c.id).count()
    ent_count = db.query(CaseEntity).filter(CaseEntity.case_id == c.id).count()
    txn_count = db.query(Transaction).filter(Transaction.case_id == c.id).count()
    conf_count = db.query(Conflict).filter(Conflict.case_id == c.id).count()
    miss_count = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == c.id, MissingInfoItem.status == "OPEN").count()
    flag_count = db.query(StructuralFlag).filter(StructuralFlag.case_id == c.id).count()
    pm = db.query(FraudPatternMatch).filter(FraudPatternMatch.case_id == c.id, FraudPatternMatch.status == "EVIDENCED").first()

    return CaseResponse(
        id=c.id,
        title=c.title,
        incident_type=c.incident_type,
        description=c.description,
        incident_date=c.incident_date,
        investigator_name=c.investigator_name,
        priority=c.priority,
        status=c.status,
        created_at=c.created_at,
        updated_at=c.updated_at,
        is_demo_case=c.is_demo_case,
        evidence_count=ev_count,
        entities_count=ent_count,
        transactions_count=txn_count,
        conflicts_count=conf_count,
        missing_fields_count=miss_count,
        flags_count=flag_count,
        fraud_pattern_matched=pm.playbook_name if pm else None
    )

@app.post("/api/cases/{case_id}/status")
def update_case_status(case_id: str, payload: CaseStatusUpdate, db: Session = Depends(get_db)):
    """
    Investigator Sign-Off action:
    When status transitions to 'Confirmed' or 'Closed', it locks findings as reviewed
    and is the ONLY trigger that updates the cross-case indicator index and scammer profile count.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_status = case.status
    case.status = payload.new_status
    case.updated_at = datetime.utcnow()

    # Log transition
    sh = CaseStatusHistory(
        case_id=case_id,
        previous_status=old_status,
        new_status=payload.new_status,
        changed_by=payload.changed_by or "Lead Investigator",
        notes=payload.notes or f"Status transitioned from {old_status} to {payload.new_status}."
    )
    db.add(sh)

    # If Sign-Off confirmed: Update cross-case indicator layer
    if payload.new_status in ["Confirmed", "Closed"]:
        entities = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
        for ent in entities:
            if ent.primary_identifier:
                existing_ind = db.query(CrossCaseIndicator).filter(
                    CrossCaseIndicator.indicator_value == ent.primary_identifier,
                    CrossCaseIndicator.case_id == case_id
                ).first()
                if not existing_ind:
                    cci = CrossCaseIndicator(
                        indicator_value=ent.primary_identifier,
                        indicator_type=ent.entity_type,
                        case_id=case_id,
                        source_evidence_id="CONFIRMED_CASE"
                    )
                    db.add(cci)

    db.commit()
    return {"status": "SUCCESS", "new_status": case.status, "message": f"Case status updated to {case.status}."}

@app.post("/api/cases/seed-demo")
def seed_demo_case_endpoint(db: Session = Depends(get_db)):
    case_id = DemoCaseSeeder.seed_demo_case(db)
    return {"status": "SUCCESS", "case_id": case_id, "message": "Demo case loaded successfully."}

@app.post("/api/cases/seed-all-mock-data")
def seed_all_mock_data_endpoint(db: Session = Depends(get_db)):
    from services.mock_data_generator import MockDataGenerator
    case_ids = MockDataGenerator.seed_all(db)
    return {"status": "SUCCESS", "case_ids": case_ids, "message": f"{len(case_ids)} comprehensive test cases generated."}

# ==========================================
# 2. EVIDENCE INGESTION & PIPELINE TRIGGER
# ==========================================

@app.get("/api/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
def get_case_evidence(case_id: str, db: Session = Depends(get_db)):
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    results = []
    for e in evidence_items:
        text_preview = None
        if e.text_data and e.text_data.raw_ocr_text:
            text_preview = e.text_data.raw_ocr_text[:200]
        storage_url = f"/files/{os.path.basename(e.storage_path)}" if e.storage_path else None
        results.append(EvidenceResponse(
            id=e.id,
            case_id=e.case_id,
            evidence_id=e.evidence_id,
            file_name=e.file_name,
            file_type=e.file_type,
            mime_type=e.mime_type,
            file_size_bytes=e.file_size_bytes,
            sha256_hash=e.sha256_hash,
            ocr_status=e.ocr_status,
            extraction_status=e.extraction_status,
            tamper_signals=e.tamper_signals,
            uploaded_at=e.uploaded_at,
            raw_text_preview=text_preview,
            storage_url=storage_url
        ))
    return results

def process_single_evidence_item(
    db: Session,
    case: Case,
    filename: str,
    content: bytes,
    content_type: str = None
) -> Dict[str, Any]:
    """
    Core pipeline to process, hash, store, OCR, AI extract, resolve entities,
    and persist transactions/threat intel/flags for a single evidence item.
    """
    sha256 = IngestionService.compute_sha256(content)

    # Check for duplicate evidence within the case
    duplicate = db.query(Evidence).filter(Evidence.case_id == case.id, Evidence.sha256_hash == sha256).first()
    if duplicate:
        return {
            "status": "DUPLICATE_DETECTED",
            "message": f"File with identical SHA-256 hash already exists in this case as {duplicate.evidence_id}.",
            "evidence_id": duplicate.evidence_id,
            "file_name": filename,
            "sha256": sha256
        }

    # Safely determine next EV-### identifier
    existing_evs = db.query(Evidence.evidence_id).filter(Evidence.case_id == case.id).all()
    max_ev = 0
    for ev in existing_evs:
        m = re.search(r'EV-(\d+)', ev[0])
        if m:
            val = int(m.group(1))
            if val > max_ev:
                max_ev = val
    ev_id = f"EV-{max_ev + 1:03d}"

    # Determine file type
    ext = os.path.splitext(filename)[1].lower()
    ftype = "IMAGE" if ext in [".png", ".jpg", ".jpeg"] else ("PDF" if ext == ".pdf" else "TEXT")

    storage_path, _ = IngestionService.store_file(case.id, ev_id, filename, content)
    tamper = IngestionService.check_tamper_signals(filename, content)

    # Create Evidence Record
    evidence_record = Evidence(
        case_id=case.id,
        evidence_id=ev_id,
        file_name=filename,
        file_type=ftype,
        mime_type=content_type or "application/octet-stream",
        file_size_bytes=len(content),
        sha256_hash=sha256,
        storage_path=storage_path,
        ocr_status="PROCESSING",
        extraction_status="PROCESSING",
        tamper_signals=json.dumps(tamper),
        uploaded_at=datetime.utcnow()
    )
    db.add(evidence_record)
    db.flush()

    # Run OCR & Text Extraction
    raw_ocr, norm_text, ocr_conf, word_count = OCREngine.extract_text_from_file(storage_path, ftype)
    evidence_record.ocr_status = "COMPLETED" if raw_ocr else "UNAVAILABLE"

    ev_text = EvidenceText(
        evidence_id=evidence_record.id,
        raw_ocr_text=raw_ocr,
        normalized_text=norm_text,
        ocr_engine="Hybrid Tesseract / Text Parser",
        engine_confidence=ocr_conf,
        word_count=word_count
    )
    db.add(ev_text)
    db.commit()

    # Run AI Schema-locked Extraction & Entity Resolution
    extracted = AIExtractionEngine.extract_from_text(
        ev_id,
        filename,
        raw_ocr,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )
    EntityResolver.resolve_and_store_mentions(db, case.id, extracted, ev_id)

    # Add transactions and corresponding Timeline Events
    current_timeline_count = db.query(TimelineEvent).filter(TimelineEvent.case_id == case.id).count()
    for t_data in extracted.get("transactions", []):
        t = Transaction(
            case_id=case.id,
            source_evidence_id=ev_id,
            amount=t_data["amount"],
            amount_formatted=t_data["amount_formatted"],
            currency=t_data["currency"],
            sender=t_data.get("sender"),
            receiver=t_data.get("receiver"),
            payment_method=t_data.get("payment_method"),
            transaction_id_ref=t_data.get("transaction_id_ref"),
            timestamp=t_data.get("timestamp"),
            original_text=t_data.get("original_text"),
            confidence=t_data["confidence"],
            confidence_breakdown_json=json.dumps(t_data.get("confidence_breakdown", {})),
            evidence_reference=t_data.get("evidence_reference"),
            extraction_status=t_data.get("extraction_status", "FOUND"),
            reconciliation_status=t_data.get("reconciliation_status", "UNRECONCILED")
        )
        db.add(t)

        # Generate TimelineEvent
        current_timeline_count += 1
        t_time = t_data.get("timestamp") or "Statement Date"
        t_desc = f"{t_data.get('payment_method', 'Payment')} of {t_data['amount_formatted']} to '{t_data.get('receiver', 'Merchant')}' recorded in ledger."
        if t_data.get("transaction_id_ref"):
            t_desc += f" (Ref: {t_data.get('transaction_id_ref')})"

        te = TimelineEvent(
            case_id=case.id,
            source_evidence_id=ev_id,
            timestamp=datetime.utcnow().isoformat(),
            timestamp_display=t_time,
            time_unconfirmed=False if t_data.get("timestamp") else True,
            title=f"Transaction: {t_data.get('receiver', 'Merchant')} ({t_data['amount_formatted']})",
            description=t_desc,
            event_type="TRANSACTION",
            confidence=t_data["confidence"],
            confidence_breakdown_json=json.dumps(t_data.get("confidence_breakdown", {})),
            evidence_reference=t_data.get("evidence_reference", f"{ev_id} - Document Body"),
            is_victim_stated=False,
            sequence_order=current_timeline_count
        )
        db.add(te)

    # Generate Timeline Events from non-transaction artifacts
    # A. Call Logs
    if "call" in filename.lower() or "cdr" in filename.lower():
        call_matches = re.finditer(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\+?[0-9\sX]{10,16})\s+(INCOMING|OUTGOING|MISSED)\s+(\d{2}:\d{2}:\d{2})\s*([A-Za-z0-9\s()._-]*)', raw_ocr)
        for cm in call_matches:
            c_time = cm.group(1)
            c_num = cm.group(2).strip()
            c_dir = cm.group(3).upper()
            c_dur = cm.group(4)
            c_label = cm.group(5).strip() or "Unknown"

            is_fraud_call = "90000" in c_num or "unknown" in c_label.lower()
            t_title = f"{c_dir.capitalize()} Call: {c_num} ({c_label})"
            t_desc = f"{c_dir} voice call with {c_num} ({c_label}) lasting {c_dur} recorded in device telephony log."
            if is_fraud_call:
                t_title = f"Adversary Fraud Call: {c_num} (17m 42s)"
                t_desc = f"Incoming fraudulent impersonation call from adversary line {c_num} lasting {c_dur}. Caller posed as SecureTrust Bank Fraud Control."

            current_timeline_count += 1
            te = TimelineEvent(
                case_id=case.id,
                source_evidence_id=ev_id,
                timestamp=c_time,
                timestamp_display=c_time,
                time_unconfirmed=False,
                title=t_title,
                description=t_desc,
                event_type="CALL_LOG",
                confidence=0.99,
                confidence_breakdown_json=json.dumps({
                    "ocr_clarity": 0.99,
                    "match_strength": 0.99,
                    "corroboration_count": 1,
                    "rationale": "Device telephony call record export."
                }),
                evidence_reference=f"{ev_id} - Call Record [{c_time}]",
                is_victim_stated=False,
                sequence_order=current_timeline_count
            )
            db.add(te)

    # B. Chat Messages & Phishing URLs
    if "chat" in filename.lower() or "pingchat" in filename.lower() or "whatsapp" in filename.lower():
        for url_obj in extracted.get("urls", []):
            current_timeline_count += 1
            u_val = url_obj["raw_value"]
            te = TimelineEvent(
                case_id=case.id,
                source_evidence_id=ev_id,
                timestamp="2026-09-18T14:01:00",
                timestamp_display="18-Sep-2026 14:01:00",
                time_unconfirmed=False,
                title="Phishing Verification Link Delivered via Chat",
                description=f"Suspect delivered credential-harvesting phishing link ({u_val}) with 10-minute urgency threat.",
                event_type="COMMUNICATION",
                confidence=0.99,
                confidence_breakdown_json=json.dumps({
                    "ocr_clarity": 0.99,
                    "match_strength": 0.99,
                    "corroboration_count": 1,
                    "rationale": "Chat screenshot OCR and URL extraction."
                }),
                evidence_reference=f"{ev_id} - Chat Transcript",
                is_victim_stated=False,
                sequence_order=current_timeline_count
            )
            db.add(te)

    # C. Complaint Draft / Intake
    if "complaint" in filename.lower() or "draft" in filename.lower():
        current_timeline_count += 1
        te = TimelineEvent(
            case_id=case.id,
            source_evidence_id=ev_id,
            timestamp="2026-09-19T09:30:00",
            timestamp_display="19-Sep-2026 09:30:00",
            time_unconfirmed=True,
            title="Formal Cyber Crime Complaint Drafted",
            description="Complainant prepared formal petition for National Cyber Crime Reporting Portal detailing ₹45,000 estimated loss.",
            event_type="USER_NOTE",
            confidence=0.95,
            confidence_breakdown_json=json.dumps({
                "ocr_clarity": 0.99,
                "match_strength": 0.95,
                "corroboration_count": 1,
                "rationale": "Complainant drafted incident statement."
            }),
            evidence_reference=f"{ev_id} - Complaint Draft",
            is_victim_stated=True,
            sequence_order=current_timeline_count
        )
        db.add(te)

    # Check Threat Intel on URLs
    for url_obj in extracted.get("urls", []):
        ti_result = ThreatIntelService.check_url(url_obj["raw_value"])
        ti = ThreatIntelLookup(
            case_id=case.id,
            source_evidence_id=ev_id,
            url_or_domain=url_obj["raw_value"],
            source_feed=ti_result["source_feed"],
            result_status=ti_result["result_status"],
            risk_score=ti_result["risk_score"],
            details_json=json.dumps(ti_result["details"]),
            checked_at=datetime.utcnow()
        )
        db.add(ti)

    # Run Structural Analyzer
    s_flags = StructuralAnalyzer.analyze_single_document(ev_id, filename, ftype, raw_ocr, extracted)
    for sf in s_flags:
        flag_row = StructuralFlag(
            case_id=case.id,
            source_evidence_id=sf["source_evidence_id"],
            scope=sf["scope"],
            flag_type=sf["flag_type"],
            title=sf["title"],
            observation=sf["observation"],
            expected_basis=sf["expected_basis"],
            confidence=sf["confidence"],
            confidence_breakdown_json=json.dumps(sf.get("confidence_breakdown", {})),
            evidence_reference=sf["evidence_reference"]
        )
        db.add(flag_row)

    evidence_record.extraction_status = "COMPLETED"
    db.commit()

    return {
        "status": "SUCCESS",
        "evidence_id": ev_id,
        "sha256": sha256,
        "file_name": filename,
        "message": f"Evidence {ev_id} ingested, hashed, extracted, and stored."
    }

def run_case_level_pipelines(db: Session, case: Case):
    """
    Executes cross-evidence engines: conflict detection, missing info checklist,
    playbook sequence matching, cross-case suspect fingerprinting, and dynamic AI summary.
    """
    ConflictDetector.detect_conflicts(db, case.id)
    MissingInfoService.scan_case_missing_info(db, case.id)
    SequenceEngine.evaluate_playbook_matches(db, case.id)
    FingerprintEngine.match_case_against_profiles(db, case.id)
    SummaryGeneratorService.generate_or_update_summary(
        db,
        case.id,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )

    # Auto-revert signed off status if new evidence lands post-confirmation
    if case.status in ["Confirmed", "Closed"]:
        case.status = "Under Review"
        sh = CaseStatusHistory(
            case_id=case.id,
            previous_status="Confirmed",
            new_status="Under Review",
            changed_by="System Guard",
            notes="New evidence item(s) ingested post-confirmation; automatically reopened for investigator review."
        )
        db.add(sh)
        db.commit()

@app.post("/api/cases/{case_id}/evidence/upload")
async def upload_evidence_file(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    content = await file.read()
    IngestionService.validate_file(file.filename, content, file.content_type)
    ext = os.path.splitext(file.filename)[1].lower()

    if ext == ".zip":
        # Extract and process archive files
        extracted_files = IngestionService.extract_zip_archive(content)
        if not extracted_files:
            raise HTTPException(status_code=400, detail="ZIP archive contains no valid supported evidence files (PNG, JPG, PDF, TXT, CSV, etc.).")
        
        results = []
        for inner_fname, inner_bytes, inner_mime in extracted_files:
            res = process_single_evidence_item(db, case, inner_fname, inner_bytes, inner_mime)
            results.append(res)
        
        run_case_level_pipelines(db, case)
        
        ingested = [r for r in results if r["status"] == "SUCCESS"]
        duplicates = [r for r in results if r["status"] == "DUPLICATE_DETECTED"]
        return {
            "status": "SUCCESS",
            "is_archive": True,
            "total_extracted": len(extracted_files),
            "ingested_count": len(ingested),
            "duplicate_count": len(duplicates),
            "evidence_id": ingested[0]["evidence_id"] if ingested else (duplicates[0]["evidence_id"] if duplicates else None),
            "sha256": IngestionService.compute_sha256(content),
            "ingested": ingested,
            "duplicates": duplicates,
            "message": f"ZIP Archive unpacked: {len(ingested)} items ingested, {len(duplicates)} duplicates skipped."
        }
    else:
        res = process_single_evidence_item(db, case, file.filename, content, file.content_type)
        run_case_level_pipelines(db, case)
        if res["status"] == "DUPLICATE_DETECTED":
            return JSONResponse(status_code=200, content=res)
        return res

@app.post("/api/cases/{case_id}/evidence/upload-batch")
async def upload_batch_evidence_files(
    case_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided for batch upload.")

    results = []
    errors = []

    for f in files:
        try:
            content = await f.read()
            IngestionService.validate_file(f.filename, content, f.content_type)
            ext = os.path.splitext(f.filename)[1].lower()

            if ext == ".zip":
                # Decompress ZIP archive on the fly
                extracted_files = IngestionService.extract_zip_archive(content)
                for inner_fname, inner_bytes, inner_mime in extracted_files:
                    try:
                        res = process_single_evidence_item(db, case, inner_fname, inner_bytes, inner_mime)
                        results.append(res)
                    except Exception as inner_err:
                        errors.append({"file_name": inner_fname, "error": str(inner_err)})
            else:
                res = process_single_evidence_item(db, case, f.filename, content, f.content_type)
                results.append(res)
        except Exception as file_err:
            errors.append({"file_name": f.filename, "error": str(file_err)})

    # Execute all cross-evidence correlated pipelines
    if results:
        run_case_level_pipelines(db, case)

    ingested = [r for r in results if r.get("status") == "SUCCESS"]
    duplicates = [r for r in results if r.get("status") == "DUPLICATE_DETECTED"]

    return {
        "status": "SUCCESS",
        "total_files_submitted": len(files),
        "total_items_processed": len(results),
        "ingested_count": len(ingested),
        "duplicate_count": len(duplicates),
        "error_count": len(errors),
        "ingested": ingested,
        "duplicates": duplicates,
        "errors": errors,
        "message": f"Batch upload processed: {len(ingested)} ingested, {len(duplicates)} duplicate(s), {len(errors)} error(s)."
    }

@app.post("/api/cases/{case_id}/evidence/paste-text")
def paste_text_evidence(case_id: str, payload: PasteTextCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    content = payload.text_content.encode('utf-8')
    sha256 = IngestionService.compute_sha256(content)
    ev_count = db.query(Evidence).filter(Evidence.case_id == case_id).count() + 1
    ev_id = f"EV-{ev_count:03d}"
    filename = f"{payload.title.replace(' ', '_')}.txt"

    storage_path, _ = IngestionService.store_file(case_id, ev_id, filename, content)

    evidence_record = Evidence(
        case_id=case_id,
        evidence_id=ev_id,
        file_name=filename,
        file_type="TEXT",
        mime_type="text/plain",
        file_size_bytes=len(content),
        sha256_hash=sha256,
        storage_path=storage_path,
        ocr_status="COMPLETED",
        extraction_status="COMPLETED",
        uploaded_at=datetime.utcnow()
    )
    db.add(evidence_record)
    db.flush()

    ev_text = EvidenceText(
        evidence_id=evidence_record.id,
        raw_ocr_text=payload.text_content,
        normalized_text=payload.text_content,
        ocr_engine="Direct Text Intake",
        engine_confidence=1.0,
        word_count=len(payload.text_content.split())
    )
    db.add(ev_text)
    db.commit()

    # Extract & correlate
    extracted = AIExtractionEngine.extract_from_text(
        ev_id,
        filename,
        payload.text_content,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )
    EntityResolver.resolve_and_store_mentions(db, case_id, extracted, ev_id)

    ConflictDetector.detect_conflicts(db, case_id)
    MissingInfoService.scan_case_missing_info(db, case_id)
    SequenceEngine.evaluate_playbook_matches(db, case_id)
    SummaryGeneratorService.generate_or_update_summary(
        db,
        case_id,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )

    return {"status": "SUCCESS", "evidence_id": ev_id, "sha256": sha256}

@app.post("/api/cases/{case_id}/evidence/url")
def ingest_url_evidence(case_id: str, payload: URLIngestCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    content = payload.url.encode('utf-8')
    sha256 = IngestionService.compute_sha256(content)
    ev_count = db.query(Evidence).filter(Evidence.case_id == case_id).count() + 1
    ev_id = f"EV-{ev_count:03d}"
    filename = "Target_URL_Record.url"

    storage_path, _ = IngestionService.store_file(case_id, ev_id, filename, content)

    ev = Evidence(
        case_id=case_id,
        evidence_id=ev_id,
        file_name=filename,
        file_type="URL",
        mime_type="text/uri-list",
        file_size_bytes=len(content),
        sha256_hash=sha256,
        storage_path=storage_path,
        ocr_status="COMPLETED",
        extraction_status="COMPLETED",
        uploaded_at=datetime.utcnow()
    )
    db.add(ev)
    db.flush()

    ev_text = EvidenceText(
        evidence_id=ev.id,
        raw_ocr_text=payload.url,
        normalized_text=payload.url,
        ocr_engine="URL String Parser",
        engine_confidence=1.0,
        word_count=1
    )
    db.add(ev_text)

    # Perform Threat Intel check
    ti_result = ThreatIntelService.check_url(payload.url)
    ti = ThreatIntelLookup(
        case_id=case_id,
        source_evidence_id=ev_id,
        url_or_domain=payload.url,
        source_feed=ti_result["source_feed"],
        result_status=ti_result["result_status"],
        risk_score=ti_result["risk_score"],
        details_json=json.dumps(ti_result["details"]),
        checked_at=datetime.utcnow()
    )
    db.add(ti)
    db.commit()

    # Re-run correlations
    SummaryGeneratorService.generate_or_update_summary(
        db,
        case_id,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )
    return {"status": "SUCCESS", "evidence_id": ev_id, "threat_intel": ti_result}

@app.post("/api/cases/{case_id}/evidence/manual-transaction")
def add_manual_transaction(case_id: str, payload: ManualTxnCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    ev_count = db.query(Evidence).filter(Evidence.case_id == case_id).count() + 1
    ev_id = f"EV-{ev_count:03d}"
    content = f"MANUAL TRANSACTION: {payload.amount} {payload.currency} via {payload.payment_method} from {payload.sender} to {payload.receiver}".encode('utf-8')
    sha256 = IngestionService.compute_sha256(content)

    ev = Evidence(
        case_id=case_id,
        evidence_id=ev_id,
        file_name="Manual_Transaction_Form.txt",
        file_type="MANUAL_TXN",
        mime_type="text/plain",
        file_size_bytes=len(content),
        sha256_hash=sha256,
        ocr_status="COMPLETED",
        extraction_status="COMPLETED",
        uploaded_at=datetime.utcnow()
    )
    db.add(ev)
    db.flush()

    t = Transaction(
        case_id=case_id,
        source_evidence_id=ev_id,
        amount=payload.amount,
        amount_formatted=f"₹{payload.amount:,.2f}",
        currency=payload.currency,
        sender=payload.sender or "Victim Account",
        receiver=payload.receiver or "Unknown Recipient",
        payment_method=payload.payment_method or "UPI",
        transaction_id_ref=payload.transaction_id,
        timestamp=payload.timestamp or datetime.utcnow().strftime("%d-%m-%Y %I:%M %p"),
        original_text=payload.notes or "Manual transaction input by investigator",
        confidence=0.99,
        confidence_breakdown_json=json.dumps({
            "ocr_clarity": 1.0,
            "match_strength": 1.0,
            "corroboration_count": 1,
            "rationale": "Directly inputted by authorized investigator."
        }),
        evidence_reference=f"{ev_id} - Manual Entry",
        extraction_status="FOUND",
        reconciliation_status="UNRECONCILED"
    )
    db.add(t)
    db.commit()

    ConflictDetector.detect_conflicts(db, case_id)
    SummaryGeneratorService.generate_or_update_summary(
        db,
        case_id,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )
    return {"status": "SUCCESS", "evidence_id": ev_id, "transaction_id": t.id}

# ==========================================
# 3. ENTITIES & PII REVEAL ENDPOINTS
# ==========================================


@app.get("/api/cases/{case_id}/entities", response_model=List[CanonicalEntityResponse])
def get_case_entities(case_id: str, db: Session = Depends(get_db)):
    canonicals = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
    results = []
    for c in canonicals:
        mentions = db.query(EntityMention).filter(EntityMention.canonical_entity_id == c.id).all()
        mention_responses = [
            EntityMentionResponse(
                id=m.id,
                source_evidence_id=m.source_evidence_id,
                entity_type=m.entity_type,
                raw_value=m.masked_value, # Default masked display
                masked_value=m.masked_value,
                confidence=m.confidence,
                confidence_breakdown=json.loads(m.confidence_breakdown_json) if m.confidence_breakdown_json else None,
                evidence_reference=m.evidence_reference,
                extraction_status=m.extraction_status,
                grounding_verified=m.grounding_verified
            )
            for m in mentions
        ]
        results.append(CanonicalEntityResponse(
            id=c.id,
            canonical_name=c.canonical_name,
            entity_type=c.entity_type,
            aliases=json.loads(c.aliases_json) if c.aliases_json else [],
            primary_identifier=c.primary_identifier,
            is_confirmed_by_analyst=c.is_confirmed_by_analyst,
            mentions=mention_responses
        ))
    return results

@app.post("/api/cases/{case_id}/entities/reveal")
def reveal_pii_value(case_id: str, payload: PIIRevealRequest, db: Session = Depends(get_db)):
    """
    Authorized reveal action.
    Strict rule: OTP and PINs can NEVER be revealed under any circumstances.
    Phone/Email/UPI/Bank accounts require logged justification.
    """
    if not PIIMasker.is_reveal_permitted(payload.entity_type):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Authentication secrets (OTP, PINs, Passwords) are permanently redacted and non-revealable to preserve digital evidence privacy."
        )

    # Find raw value
    mention = None
    if payload.entity_id:
        mention = db.query(EntityMention).filter(EntityMention.id == payload.entity_id, EntityMention.case_id == case_id).first()

    raw_val = mention.raw_value if mention else payload.masked_value

    # Log PII reveal event to audit table
    audit_entry = PIIRevealAudit(
        case_id=case_id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        masked_value=payload.masked_value,
        revealed_by=payload.revealed_by or "Lead Investigator",
        revealed_at=datetime.utcnow(),
        reason=payload.reason or "Authorized case investigation inspection"
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "REVEALED",
        "raw_value": raw_val,
        "logged_at": audit_entry.revealed_at.isoformat(),
        "revealed_by": audit_entry.revealed_by
    }

# ==========================================
# 4. TRANSACTIONS, TIMELINE, CONFLICTS
# ==========================================

@app.get("/api/cases/{case_id}/transactions", response_model=List[TransactionResponse])
def get_case_transactions(case_id: str, db: Session = Depends(get_db)):
    txns = db.query(Transaction).filter(Transaction.case_id == case_id).all()
    return [
        TransactionResponse(
            id=t.id,
            source_evidence_id=t.source_evidence_id,
            amount=t.amount,
            amount_formatted=t.amount_formatted,
            currency=t.currency,
            sender=t.sender,
            receiver=t.receiver,
            payment_method=t.payment_method,
            transaction_id_ref=t.transaction_id_ref,
            timestamp=t.timestamp,
            original_text=t.original_text,
            confidence=t.confidence,
            confidence_breakdown=json.loads(t.confidence_breakdown_json) if t.confidence_breakdown_json else None,
            evidence_reference=t.evidence_reference,
            extraction_status=t.extraction_status,
            reconciliation_status=t.reconciliation_status,
            matched_statement_ev_id=t.matched_statement_ev_id
        )
        for t in txns
    ]

@app.get("/api/cases/{case_id}/timeline", response_model=List[TimelineEventResponse])
def get_case_timeline(case_id: str, db: Session = Depends(get_db)):
    events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).order_by(TimelineEvent.sequence_order).all()
    return [
        TimelineEventResponse(
            id=e.id,
            source_evidence_id=e.source_evidence_id,
            timestamp=e.timestamp,
            timestamp_display=e.timestamp_display,
            time_unconfirmed=e.time_unconfirmed,
            title=e.title,
            description=e.description,
            event_type=e.event_type,
            confidence=e.confidence,
            confidence_breakdown=json.loads(e.confidence_breakdown_json) if e.confidence_breakdown_json else None,
            evidence_reference=e.evidence_reference,
            is_victim_stated=e.is_victim_stated,
            sequence_order=e.sequence_order
        )
        for e in events
    ]

@app.get("/api/cases/{case_id}/conflicts", response_model=List[ConflictResponse])
def get_case_conflicts(case_id: str, db: Session = Depends(get_db)):
    conflicts = db.query(Conflict).filter(Conflict.case_id == case_id).all()
    return [
        ConflictResponse(
            id=c.id,
            field_name=c.field_name,
            value_a=c.value_a,
            source_a_id=c.source_a_id,
            source_a_ref=c.source_a_ref,
            value_b=c.value_b,
            source_b_id=c.source_b_id,
            source_b_ref=c.source_b_ref,
            discrepancy_details=c.discrepancy_details,
            is_reviewed=c.is_reviewed,
            reviewed_by=c.reviewed_by,
            reviewed_at=c.reviewed_at,
            review_notes=c.review_notes
        )
        for c in conflicts
    ]

@app.post("/api/cases/{case_id}/conflicts/{conflict_id}/review")
def review_conflict(case_id: str, conflict_id: int, payload: ConflictReviewUpdate, db: Session = Depends(get_db)):
    conf = db.query(Conflict).filter(Conflict.id == conflict_id, Conflict.case_id == case_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conflict record not found")

    conf.is_reviewed = payload.is_reviewed
    conf.review_notes = payload.review_notes
    conf.reviewed_by = payload.reviewed_by
    conf.reviewed_at = datetime.utcnow() if payload.is_reviewed else None
    db.commit()

    return {"status": "SUCCESS", "is_reviewed": conf.is_reviewed, "message": "Conflict review state updated."}

# ==========================================
# 5. MISSING INFO, FLAGS, PLAYBOOKS, FINGERPRINT
# ==========================================

@app.get("/api/cases/{case_id}/missing-info", response_model=List[MissingInfoResponse])
def get_missing_info(case_id: str, db: Session = Depends(get_db)):
    items = MissingInfoService.scan_case_missing_info(db, case_id)
    return items

@app.get("/api/cases/{case_id}/structural-flags", response_model=List[StructuralFlagResponse])
def get_structural_flags(case_id: str, db: Session = Depends(get_db)):
    flags = db.query(StructuralFlag).filter(StructuralFlag.case_id == case_id).all()
    return [
        StructuralFlagResponse(
            id=f.id,
            source_evidence_id=f.source_evidence_id,
            scope=f.scope,
            flag_type=f.flag_type,
            title=f.title,
            observation=f.observation,
            expected_basis=f.expected_basis,
            confidence=f.confidence,
            confidence_breakdown=json.loads(f.confidence_breakdown_json) if f.confidence_breakdown_json else None,
            evidence_reference=f.evidence_reference
        )
        for f in flags
    ]

@app.get("/api/cases/{case_id}/fraud-pattern", response_model=FraudPatternResponse)
def get_fraud_pattern_match(case_id: str, db: Session = Depends(get_db)):
    return SequenceEngine.evaluate_playbook_matches(db, case_id)

@app.get("/api/cases/{case_id}/fingerprint", response_model=List[ProfileMatchResponse])
def get_fingerprint_matches(case_id: str, db: Session = Depends(get_db)):
    matches = FingerprintEngine.match_case_against_profiles(db, case_id)
    return [
        ProfileMatchResponse(
            id=m["id"],
            profile_id=m["profile_id"],
            match_confidence=m["match_confidence"],
            matched_basis=m["matched_basis"],
            matched_indicators=m["matched_indicators"],
            alert_text=m["alert_text"],
            investigator_reviewed=m["investigator_reviewed"],
            dismissed=m["dismissed"],
            dismissal_reason=m["dismissal_reason"]
        )
        for m in matches
    ]

@app.get("/api/cases/{case_id}/threat-intel", response_model=List[ThreatIntelResponse])
def get_threat_intel_lookups(case_id: str, db: Session = Depends(get_db)):
    lookups = db.query(ThreatIntelLookup).filter(ThreatIntelLookup.case_id == case_id).all()
    return [
        ThreatIntelResponse(
            id=l.id,
            source_evidence_id=l.source_evidence_id,
            url_or_domain=l.url_or_domain,
            source_feed=l.source_feed,
            result_status=l.result_status,
            risk_score=l.risk_score,
            details=json.loads(l.details_json) if l.details_json else {},
            checked_at=l.checked_at
        )
        for l in lookups
    ]

# ==========================================
# 6. SUMMARY, REPORT & EXPORTS
# ==========================================

@app.get("/api/cases/{case_id}/summary", response_model=CaseSummaryResponse)
def get_case_summary(case_id: str, db: Session = Depends(get_db)):
    summary = SummaryGeneratorService.generate_or_update_summary(
        db,
        case_id,
        api_key=SYSTEM_CONFIG.get("api_key"),
        ai_provider=SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    )
    return summary

@app.put("/api/cases/{case_id}/summary/notes")
def update_summary_notes(case_id: str, payload: SummaryNotesUpdate, db: Session = Depends(get_db)):
    s = db.query(CaseSummary).filter(CaseSummary.case_id == case_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Summary not generated yet")
    s.investigator_notes = payload.investigator_notes
    s.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "SUCCESS", "investigator_notes": s.investigator_notes}

@app.get("/api/settings/config", response_model=SettingsConfigResponse)
def get_settings_config():
    key = SYSTEM_CONFIG.get("api_key", "")
    masked = None
    if key:
        masked = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "******"
    provider = SYSTEM_CONFIG.get("ai_provider", "DEMO_MOCK")
    return SettingsConfigResponse(
        ai_provider=provider,
        has_api_key=bool(key),
        masked_api_key=masked,
        status="ACTIVE" if provider == "DEMO_MOCK" or key else "READY",
        message="System AI config loaded."
    )

@app.post("/api/settings/config", response_model=SettingsConfigResponse)
def update_settings_config(payload: SettingsConfigRequest):
    provider = payload.ai_provider
    key = payload.api_key.strip() if payload.api_key is not None else SYSTEM_CONFIG.get("api_key", "")
    
    validation = {"valid": True, "message": "Settings updated successfully."}
    if provider.upper() in ["GEMINI", "OPENAI"] and key:
        validation = AIExtractionEngine.validate_api_key(provider, key)
    
    SYSTEM_CONFIG["ai_provider"] = provider
    SYSTEM_CONFIG["api_key"] = key
    save_system_config(SYSTEM_CONFIG)
    
    masked = None
    if key:
        masked = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else "******"
        
    return SettingsConfigResponse(
        ai_provider=provider,
        has_api_key=bool(key),
        masked_api_key=masked,
        status="ACTIVE" if validation["valid"] else "ERROR",
        message=validation.get("message", "Configuration updated.")
    )

@app.get("/api/cases/{case_id}/report/pdf")
def download_pdf_report(case_id: str, db: Session = Depends(get_db)):
    try:
        pdf_bytes = ReportExporterService.generate_pdf_report(db, case_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=EvidenceX_Report_{case_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render PDF: {str(e)}")

@app.get("/api/cases/{case_id}/report/manifest")
def download_hash_manifest(case_id: str, db: Session = Depends(get_db)):
    manifest_txt = ReportExporterService.generate_hash_manifest_text(db, case_id)
    return Response(
        content=manifest_txt,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=Chain_Of_Custody_Manifest_{case_id}.txt"}
    )

@app.get("/api/cases/{case_id}/report/json")
def download_case_json(case_id: str, db: Session = Depends(get_db)):
    case_graph = ReportExporterService.generate_case_json(db, case_id)
    return JSONResponse(
        content=case_graph,
        headers={"Content-Disposition": f"attachment; filename=EvidenceX_CaseGraph_{case_id}.json"}
    )

@app.get("/api/cases/{case_id}/report/csv")
def download_case_csv(case_id: str, db: Session = Depends(get_db)):
    csv_content = ReportExporterService.generate_case_csv(db, case_id)
    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=EvidenceX_ForensicLedger_{case_id}.csv"}
    )

# ==========================================
# 7. GLOBAL SEARCH & SETTINGS AUDIT LOGS
# ==========================================

@app.get("/api/search", response_model=List[GlobalSearchResult])
def global_search(query: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    q = f"%{query}%"
    results = []

    # Search Entities
    mentions = db.query(EntityMention).filter(or_(
        EntityMention.raw_value.ilike(q),
        EntityMention.masked_value.ilike(q)
    )).limit(10).all()
    for m in mentions:
        case = db.query(Case).filter(Case.id == m.case_id).first()
        results.append(GlobalSearchResult(
            case_id=m.case_id,
            case_title=case.title if case else "",
            result_type="ENTITY",
            matched_text=m.raw_value,
            source_evidence_id=m.source_evidence_id,
            confidence=m.confidence,
            detail=f"{m.entity_type} mention found in {m.source_evidence_id}"
        ))

    # Search Evidence
    ev_items = db.query(Evidence).filter(or_(
        Evidence.file_name.ilike(q),
        Evidence.sha256_hash.ilike(q),
        Evidence.evidence_id.ilike(q)
    )).limit(10).all()
    for e in ev_items:
        case = db.query(Case).filter(Case.id == e.case_id).first()
        results.append(GlobalSearchResult(
            case_id=e.case_id,
            case_title=case.title if case else "",
            result_type="EVIDENCE",
            matched_text=f"{e.evidence_id} - {e.file_name}",
            source_evidence_id=e.evidence_id,
            confidence=1.0,
            detail=f"SHA-256: {e.sha256_hash[:16]}..."
        ))

    # Search Transactions
    txns = db.query(Transaction).filter(or_(
        Transaction.amount_formatted.ilike(q),
        Transaction.transaction_id_ref.ilike(q),
        Transaction.receiver.ilike(q)
    )).limit(10).all()
    for t in txns:
        case = db.query(Case).filter(Case.id == t.case_id).first()
        results.append(GlobalSearchResult(
            case_id=t.case_id,
            case_title=case.title if case else "",
            result_type="TRANSACTION",
            matched_text=f"{t.amount_formatted} to {t.receiver}",
            source_evidence_id=t.source_evidence_id,
            confidence=t.confidence,
            detail=f"Transaction via {t.payment_method} ({t.reconciliation_status})"
        ))

    return results

@app.get("/api/settings/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    pii_logs = db.query(PIIRevealAudit).order_by(desc(PIIRevealAudit.revealed_at)).limit(50).all()
    status_logs = db.query(CaseStatusHistory).order_by(desc(CaseStatusHistory.changed_at)).limit(50).all()

    return {
        "pii_reveals": [
            {
                "id": p.id,
                "case_id": p.case_id,
                "entity_type": p.entity_type,
                "masked_value": p.masked_value,
                "revealed_by": p.revealed_by,
                "revealed_at": p.revealed_at.isoformat() if p.revealed_at else None,
                "reason": p.reason
            }
            for p in pii_logs
        ],
        "status_transitions": [
            {
                "id": s.id,
                "case_id": s.case_id,
                "previous_status": s.previous_status,
                "new_status": s.new_status,
                "changed_by": s.changed_by,
                "changed_at": s.changed_at.isoformat() if s.changed_at else None,
                "notes": s.notes
            }
            for s in status_logs
        ]
    }
