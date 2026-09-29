import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import (
    Case, Evidence, EvidenceText, CaseEntity, EntityMention,
    Transaction, TimelineEvent, Conflict, MissingInfoItem,
    StructuralFlag, ThreatIntelLookup, CaseSummary, CaseStatusHistory
)
from services.ingestion import IngestionService
from services.threat_intel import ThreatIntelService
from services.sequence_engine import SequenceEngine
from services.missing_info import MissingInfoService
from services.fingerprint_engine import FingerprintEngine
from services.summary_generator import SummaryGeneratorService

class DemoCaseSeeder:
    @classmethod
    def seed_demo_case(cls, db: Session) -> str:
        case_id = "CASE-2026-8841"

        # Check if already exists and clear to reseed fresh
        existing = db.query(Case).filter(Case.id == case_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        # 1. Create Case
        case = Case(
            id=case_id,
            title="Simulated Banking Phishing & Unauthorized UPI Debit Incident",
            incident_type="Impersonation & KYC Credential Phishing",
            description="Complainant reported receiving urgent SMS claiming SBI KYC suspension, leading to external phishing portal access and unauthorized funds extraction.",
            incident_date="14 Oct 2026",
            investigator_name="Insp. Vikram Rathore (Cyber Crime Cell)",
            priority="HIGH",
            status="Under Review",
            is_demo_case=True,
            created_at=datetime.utcnow()
        )
        db.add(case)
        db.flush()

        # Log initial status history
        sh = CaseStatusHistory(
            case_id=case_id,
            previous_status="Open",
            new_status="Under Review",
            changed_by="Insp. Vikram Rathore",
            notes="Case ingested from victim initial cyber complaint portal. Multi-modal evidence verified."
        )
        db.add(sh)

        # 2. Define Evidence Items
        evidence_defs = [
            {
                "ev_id": "EV-001",
                "file_name": "WhatsApp_Chat_Screenshot.png",
                "file_type": "IMAGE",
                "mime_type": "image/png",
                "content": (
                    b"[OCR WhatsApp Chat Log]\n"
                    b"14 Oct 2026, 10:30 AM - Suspect (+91 98765 43210): Dear Customer, I am Rahul Sharma, SBI Account Verification Executive. Your NetBanking KYC is expired.\n"
                    b"14 Oct 2026, 10:35 AM - Suspect: Click https://secure-sbi-kyc-update.com to verify PAN immediately.\n"
                    b"14 Oct 2026, 10:45 AM - Victim: I received debit alert for Rs 5,000 to rahul.sharma@okhdfcbank. Why was this debited?\n"
                    b"14 Oct 2026, 11:00 AM - Suspect: Server technical hold. Please transfer additional Rs 2,000 refundable security fee."
                )
            },
            {
                "ev_id": "EV-002",
                "file_name": "Phishing_SMS_Alert.txt",
                "file_type": "TEXT",
                "mime_type": "text/plain",
                "content": (
                    b"URGENT ALERT: Dear SBI Customer, your NetBanking access will be suspended within 24 hours due to pending KYC mandate.\n"
                    b"Visit https://secure-sbi-kyc-update.com immediately to update your Aadhaar and PAN.\n"
                    b"Helpline Desk: +91 98765 43210. Ref: SBI-KYC-9981."
                )
            },
            {
                "ev_id": "EV-003",
                "file_name": "Phishing_Portal_URL_Record.url",
                "file_type": "URL",
                "mime_type": "text/uri-list",
                "content": b"https://secure-sbi-kyc-update.com/verify-pan"
            },
            {
                "ev_id": "EV-004",
                "file_name": "Bank_Account_Statement_Oct2026.pdf",
                "file_type": "PDF",
                "mime_type": "application/pdf",
                "content": (
                    b"STATE BANK OF INDIA - SAVINGS ACCOUNT STATEMENT\n"
                    b"Account Number: A/c 309988219034 | Branch: Connaught Place, New Delhi\n"
                    b"Opening Balance: Rs. 15,000.00\n"
                    b"14/10/2026 10:45:12 AM - UPI/DR/529910482019/rahul.sharma@okhdfcbank/Debit - Rs. 7,000.00\n"
                    b"Closing Balance: Rs. 8,000.00"
                )
            },
            {
                "ev_id": "EV-005",
                "file_name": "Victim_Device_Browser_History.csv",
                "file_type": "CSV",
                "mime_type": "text/csv",
                "content": (
                    b"Timestamp,Action,URL_Domain,IP_Address\n"
                    b"14-10-2026 10:35:10,SMS_RECEIVED,IM-SBIPAY,+91 98765 43210\n"
                    b"14-10-2026 10:42:04,BROWSER_VISIT,https://secure-sbi-kyc-update.com,192.168.1.45\n"
                    b"14-10-2026 10:45:00,PAYMENT_GATEWAY_SUBMIT,https://secure-sbi-kyc-update.com/pay,192.168.1.45"
                )
            }
        ]

        for item in evidence_defs:
            sha256 = IngestionService.compute_sha256(item["content"])
            storage_path, _ = IngestionService.store_file(case_id, item["ev_id"], item["file_name"], item["content"])
            tamper = IngestionService.check_tamper_signals(item["file_name"], item["content"])

            ev = Evidence(
                case_id=case_id,
                evidence_id=item["ev_id"],
                file_name=item["file_name"],
                file_type=item["file_type"],
                mime_type=item["mime_type"],
                file_size_bytes=len(item["content"]),
                sha256_hash=sha256,
                storage_path=storage_path,
                ocr_status="COMPLETED",
                extraction_status="COMPLETED",
                tamper_signals=json.dumps(tamper),
                uploaded_at=datetime.utcnow()
            )
            db.add(ev)
            db.flush()

            raw_text = item["content"].decode('utf-8', errors='ignore')
            ev_text = EvidenceText(
                evidence_id=ev.id,
                raw_ocr_text=raw_text,
                normalized_text=raw_text,
                engine_confidence=0.96,
                word_count=len(raw_text.split())
            )
            db.add(ev_text)

        # 3. Seed Canonical Entities & Mentions
        entities_data = [
            ("PERSON", "Rahul Sharma", ["Rahul Sharma", "SBI Account Verification Executive", "Executive Rahul"], "+91 98765 43210", [
                ("EV-001", "Rahul Sharma", "Rahul Sharma", 0.94, "Line 2 - Intro statement"),
                ("EV-001", "SBI Account Verification Executive", "SBI Account Verification Executive", 0.90, "Line 2 - Header")
            ]),
            ("PHONE", "+91 98765 43210", ["+91 98765 43210", "9876543210"], "+91 98765 43210", [
                ("EV-001", "+91 98765 43210", "98******10", 0.98, "Line 2 - Sender MSISDN"),
                ("EV-002", "+91 98765 43210", "98******10", 0.98, "Line 3 - Helpline number")
            ]),
            ("UPI_ID", "rahul.sharma@okhdfcbank", ["rahul.sharma@okhdfcbank"], "rahul.sharma@okhdfcbank", [
                ("EV-001", "rahul.sharma@okhdfcbank", "rah***@okhdfcbank", 0.96, "Line 4 - Debit recipient"),
                ("EV-004", "rahul.sharma@okhdfcbank", "rah***@okhdfcbank", 0.96, "Line 4 - UPI settlement tag")
            ]),
            ("URL", "https://secure-sbi-kyc-update.com", ["https://secure-sbi-kyc-update.com", "secure-sbi-kyc-update.com"], "https://secure-sbi-kyc-update.com", [
                ("EV-001", "https://secure-sbi-kyc-update.com", "https://secure-sbi-kyc-update.com", 0.97, "Line 3 - Link payload"),
                ("EV-002", "https://secure-sbi-kyc-update.com", "https://secure-sbi-kyc-update.com", 0.97, "Line 2 - Phishing URL"),
                ("EV-003", "https://secure-sbi-kyc-update.com/verify-pan", "https://secure-sbi-kyc-update.com/verify-pan", 0.99, "URL Ingest Object"),
                ("EV-005", "https://secure-sbi-kyc-update.com", "https://secure-sbi-kyc-update.com", 0.95, "Row 2 - Browser History")
            ]),
            ("BANK_ACCOUNT", "A/c 309988219034", ["309988219034", "A/c 309988219034"], "309988219034", [
                ("EV-004", "309988219034", "********9034", 0.95, "Statement Header A/c tag")
            ]),
            ("TXN_ID", "529910482019", ["529910482019"], "529910482019", [
                ("EV-004", "529910482019", "529910482019", 0.96, "Line 4 - Bank Statement UTR Reference")
            ])
        ]

        for etype, cname, aliases, p_id, mentions in entities_data:
            canon = CaseEntity(
                case_id=case_id,
                canonical_name=cname,
                entity_type=etype,
                aliases_json=json.dumps(aliases),
                primary_identifier=p_id,
                is_confirmed_by_analyst=False
            )
            db.add(canon)
            db.flush()

            for ev_id, raw_v, masked_v, conf, ev_ref in mentions:
                em = EntityMention(
                    case_id=case_id,
                    canonical_entity_id=canon.id,
                    source_evidence_id=ev_id,
                    entity_type=etype,
                    raw_value=raw_v,
                    masked_value=masked_v,
                    confidence=conf,
                    confidence_breakdown_json=json.dumps({
                        "ocr_clarity": 0.96,
                        "match_strength": conf,
                        "corroboration_count": len(mentions),
                        "rationale": f"Corroborated across {len(mentions)} independent evidence files."
                    }),
                    evidence_reference=ev_ref,
                    extraction_status="FOUND",
                    grounding_verified=True
                )
                db.add(em)

        # 4. Seed Transactions (with intentional CONFLICT between EV-001 ₹5000 and EV-004 ₹7000)
        t1 = Transaction(
            case_id=case_id,
            source_evidence_id="EV-001",
            amount=5000.0,
            amount_formatted="₹5,000.00",
            currency="INR",
            sender="Victim Account",
            receiver="rahul.sharma@okhdfcbank",
            payment_method="UPI",
            transaction_id_ref=None,
            timestamp="14-10-2026 10:45 AM",
            original_text="debit alert for Rs 5,000",
            confidence=0.94,
            confidence_breakdown_json=json.dumps({
                "ocr_clarity": 0.96,
                "match_strength": 0.94,
                "corroboration_count": 1,
                "rationale": "Parsed from WhatsApp message conversation context."
            }),
            evidence_reference="EV-001 Line 4",
            extraction_status="FOUND",
            reconciliation_status="CONTESTED",
            matched_statement_ev_id="EV-004"
        )
        t2 = Transaction(
            case_id=case_id,
            source_evidence_id="EV-004",
            amount=7000.0,
            amount_formatted="₹7,000.00",
            currency="INR",
            sender="Victim A/c 309988219034",
            receiver="rahul.sharma@okhdfcbank",
            payment_method="UPI",
            transaction_id_ref="529910482019",
            timestamp="14-10-2026 10:45:12 AM",
            original_text="UPI/DR/529910482019/rahul.sharma@okhdfcbank/Debit - Rs. 7,000.00",
            confidence=0.98,
            confidence_breakdown_json=json.dumps({
                "ocr_clarity": 0.99,
                "match_strength": 0.98,
                "corroboration_count": 1,
                "rationale": "Extracted from official bank ledger statement record."
            }),
            evidence_reference="EV-004 Line 4",
            extraction_status="FOUND",
            reconciliation_status="CONTESTED",
            matched_statement_ev_id="EV-004"
        )
        db.add(t1)
        db.add(t2)

        # 5. Seed Cross-Evidence Conflict
        conf = Conflict(
            case_id=case_id,
            field_name="Transaction Amount Discrepancy",
            value_a="₹5,000.00 (Stated in WhatsApp Chat EV-001)",
            source_a_id="EV-001",
            source_a_ref="EV-001 - WhatsApp Message #4",
            value_b="₹7,000.00 (Stated in Official Bank Statement EV-004)",
            source_b_id="EV-004",
            source_b_ref="EV-004 - Line 4 Ledger Row",
            discrepancy_details="Discrepancy of ₹2,000.00 identified between victim's chat statement (₹5,000) and actual bank statement debit (₹7,000). Both sources preserved; requires formal bank log verification.",
            is_reviewed=False
        )
        db.add(conf)

        # 6. Seed Timeline Events
        timeline_events_data = [
            ("EV-002", "14-10-2026 10:30 AM", "10:30 AM, 14 Oct 2026", "Phishing SMS Alert Received", "Victim received deceptive SMS impersonating State Bank of India claiming immediate account suspension.", "SYSTEM_ALERT", 0.98, "EV-002 Body", False, 1),
            ("EV-001", "14-10-2026 10:35 AM", "10:35 AM, 14 Oct 2026", "Malicious Link Delivered via WhatsApp", "Suspect posing as 'Rahul Sharma' contacted victim and transmitted phishing URL https://secure-sbi-kyc-update.com.", "MESSAGE", 0.96, "EV-001 Msg 2", False, 2),
            ("EV-005", "14-10-2026 10:42 AM", "10:42 AM, 14 Oct 2026", "Victim Device Accessed Phishing Portal", "Browser history logs confirm victim accessed https://secure-sbi-kyc-update.com from mobile device IP.", "URL_VISIT", 0.97, "EV-005 Row 2", False, 3),
            ("EV-001", "14-10-2026 10:45 AM", "10:45 AM, 14 Oct 2026", "Unauthorized Debit Occurred", "Victim alerted suspect regarding unauthorized debit to VPA rahul.sharma@okhdfcbank.", "TRANSACTION", 0.95, "EV-001 Msg 3", False, 4),
            ("EV-001", "14-10-2026 11:00 AM", "11:00 AM, 14 Oct 2026", "Secondary Fee Solicitation", "Suspect demanded an additional ₹2,000 under pretext of refundable verification clearance.", "MESSAGE", 0.92, "EV-001 Msg 4", False, 5)
        ]

        for ev_id, ts, ts_disp, title, desc, etype, conf_score, ref, victim_stated, order_idx in timeline_events_data:
            te = TimelineEvent(
                case_id=case_id,
                source_evidence_id=ev_id,
                timestamp=ts,
                timestamp_display=ts_disp,
                time_unconfirmed=False,
                title=title,
                description=desc,
                event_type=etype,
                confidence=conf_score,
                confidence_breakdown_json=json.dumps({
                    "ocr_clarity": 0.97,
                    "match_strength": conf_score,
                    "corroboration_count": 1,
                    "rationale": "Aligned with UTC normalized timestamp."
                }),
                evidence_reference=ref,
                is_victim_stated=victim_stated,
                sequence_order=order_idx
            )
            db.add(te)

        # 7. Seed Threat Intel Lookups
        ti_result = ThreatIntelService.check_url("https://secure-sbi-kyc-update.com/verify-pan")
        ti = ThreatIntelLookup(
            case_id=case_id,
            source_evidence_id="EV-003",
            url_or_domain="https://secure-sbi-kyc-update.com/verify-pan",
            source_feed=ti_result["source_feed"],
            result_status=ti_result["result_status"],
            risk_score=ti_result["risk_score"],
            details_json=json.dumps(ti_result["details"]),
            checked_at=datetime.utcnow()
        )
        db.add(ti)

        # 8. Seed Structural Flags
        sf1 = StructuralFlag(
            case_id=case_id,
            source_evidence_id="EV-004",
            scope="SINGLE_DOCUMENT",
            flag_type="ARITHMETIC_GAP",
            title="Running Balance Arithmetic Discrepancy",
            observation="Opening Balance (₹15,000) minus single listed Debit (₹5,000 in chat / ₹7,000 in statement) shows ledger differential with closing balance of ₹8,000.",
            expected_basis="Authentic core-banking statements maintain strict mathematical ledger continuity between transactions and closing balances.",
            confidence=0.96,
            confidence_breakdown_json=json.dumps({
                "ocr_clarity": 0.98,
                "match_strength": 0.95,
                "corroboration_count": 1,
                "rationale": "Mathematical variance identified in statement closing balance calculation."
            }),
            evidence_reference="EV-004 Statement Ledger"
        )
        sf2 = StructuralFlag(
            case_id=case_id,
            source_evidence_id="EV-002",
            scope="SINGLE_DOCUMENT",
            flag_type="MISSING_REQUIRED_FIELD",
            title="Missing Mandatory Banking Regulatory Disclaimer",
            observation="SMS alert demands urgent identity verification but omits mandatory RBI statutory non-disclosure advisory.",
            expected_basis="RBI Cyber Security Circular (2024/77) mandates explicit 'Never share OTP/credentials' advisory on automated dispatches.",
            confidence=0.88,
            confidence_breakdown_json=json.dumps({
                "ocr_clarity": 0.95,
                "match_strength": 0.88,
                "corroboration_count": 1,
                "rationale": "Statutory warning tokens absent."
            }),
            evidence_reference="EV-002 SMS Body"
        )
        db.add(sf1)
        db.add(sf2)

        db.commit()

        # 9. Run Pipeline Engines (Missing Info, Sequence & Playbook, Fingerprinting, Summary)
        MissingInfoService.scan_case_missing_info(db, case_id)
        SequenceEngine.evaluate_playbook_matches(db, case_id)
        FingerprintEngine.match_case_against_profiles(db, case_id)
        SummaryGeneratorService.generate_or_update_summary(db, case_id)

        return case_id
