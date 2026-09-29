import json
from datetime import datetime
from sqlalchemy.orm import Session
from models import (
    Case, Evidence, EvidenceText, CaseEntity, EntityMention,
    Transaction, TimelineEvent, Conflict, MissingInfoItem,
    StructuralFlag, ThreatIntelLookup, CaseSummary, CaseStatusHistory, ScammerProfile
)
from services.ingestion import IngestionService
from services.threat_intel import ThreatIntelService
from services.sequence_engine import SequenceEngine
from services.missing_info import MissingInfoService
from services.fingerprint_engine import FingerprintEngine
from services.summary_generator import SummaryGeneratorService

class MockDataGenerator:
    @classmethod
    def seed_case_1_kyc_phishing(cls, db: Session) -> str:
        """Case 1: Simulated Banking Phishing & Unauthorized UPI Debit Incident"""
        case_id = "CASE-2026-8841"
        existing = db.query(Case).filter(Case.id == case_id).first()
        if existing:
            db.delete(existing)
            db.commit()

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

        sh = CaseStatusHistory(
            case_id=case_id,
            previous_status="Open",
            new_status="Under Review",
            changed_by="Insp. Vikram Rathore",
            notes="Case ingested from victim initial cyber complaint portal. Multi-modal evidence verified."
        )
        db.add(sh)

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

        # Seed Entities
        entities_data = [
            ("PERSON", "Rahul Sharma", ["Rahul Sharma", "SBI Account Verification Executive"], "+91 98765 43210", [
                ("EV-001", "Rahul Sharma", "Rahul Sharma", 0.94, "Line 2 - Intro")
            ]),
            ("PHONE", "+91 98765 43210", ["+91 98765 43210", "9876543210"], "+91 98765 43210", [
                ("EV-001", "+91 98765 43210", "98******10", 0.98, "Line 2 - Sender"),
                ("EV-002", "+91 98765 43210", "98******10", 0.98, "Line 3 - Helpline")
            ]),
            ("UPI_ID", "rahul.sharma@okhdfcbank", ["rahul.sharma@okhdfcbank"], "rahul.sharma@okhdfcbank", [
                ("EV-001", "rahul.sharma@okhdfcbank", "rah***@okhdfcbank", 0.96, "Line 4 - Debit recipient"),
                ("EV-004", "rahul.sharma@okhdfcbank", "rah***@okhdfcbank", 0.96, "Line 4 - UPI settlement")
            ]),
            ("URL", "https://secure-sbi-kyc-update.com", ["https://secure-sbi-kyc-update.com"], "https://secure-sbi-kyc-update.com", [
                ("EV-001", "https://secure-sbi-kyc-update.com", "https://secure-sbi-kyc-update.com", 0.97, "Line 3 - Link"),
                ("EV-002", "https://secure-sbi-kyc-update.com", "https://secure-sbi-kyc-update.com", 0.97, "Line 2 - Phishing URL"),
                ("EV-003", "https://secure-sbi-kyc-update.com/verify-pan", "https://secure-sbi-kyc-update.com/verify-pan", 0.99, "URL Object")
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

        # Seed Transactions (with intentional conflict ₹5000 vs ₹7000)
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
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.96, "match_strength": 0.94, "corroboration_count": 1, "rationale": "WhatsApp chat context"}),
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
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.99, "match_strength": 0.98, "corroboration_count": 1, "rationale": "Bank statement record"}),
            evidence_reference="EV-004 Line 4",
            extraction_status="FOUND",
            reconciliation_status="CONTESTED",
            matched_statement_ev_id="EV-004"
        )
        db.add(t1)
        db.add(t2)

        conf = Conflict(
            case_id=case_id,
            field_name="Transaction Amount Discrepancy",
            value_a="₹5,000.00 (Stated in WhatsApp Chat EV-001)",
            source_a_id="EV-001",
            source_a_ref="EV-001 - Msg #4",
            value_b="₹7,000.00 (Stated in Official Bank Statement EV-004)",
            source_b_id="EV-004",
            source_b_ref="EV-004 - Line 4",
            discrepancy_details="Discrepancy of ₹2,000.00 identified between victim's chat statement (₹5,000) and actual bank statement debit (₹7,000). Both sources preserved.",
            is_reviewed=False
        )
        db.add(conf)

        # Timeline
        timeline_data = [
            ("EV-002", "14-10-2026 10:30 AM", "10:30 AM, 14 Oct 2026", "Phishing SMS Alert Received", "Victim received deceptive SMS claiming NetBanking KYC suspension.", "SYSTEM_ALERT", 0.98, "EV-002 Body", 1),
            ("EV-001", "14-10-2026 10:35 AM", "10:35 AM, 14 Oct 2026", "Malicious Link Delivered via WhatsApp", "Suspect delivered phishing link https://secure-sbi-kyc-update.com.", "MESSAGE", 0.96, "EV-001 Msg 2", 2),
            ("EV-005", "14-10-2026 10:42 AM", "10:42 AM, 14 Oct 2026", "Victim Device Accessed Phishing Portal", "Browser history logs confirm access to lookalike portal from mobile IP.", "URL_VISIT", 0.97, "EV-005 Row 2", 3),
            ("EV-001", "14-10-2026 10:45 AM", "10:45 AM, 14 Oct 2026", "Unauthorized Debit Occurred", "Victim alerted suspect regarding unauthorized debit to rahul.sharma@okhdfcbank.", "TRANSACTION", 0.95, "EV-001 Msg 3", 4),
            ("EV-001", "14-10-2026 11:00 AM", "11:00 AM, 14 Oct 2026", "Secondary Fee Solicitation", "Suspect demanded additional ₹2,000 under pretext of refundable verification.", "MESSAGE", 0.92, "EV-001 Msg 4", 5)
        ]
        for ev_id, ts, ts_disp, title, desc, etype, conf_score, ref, order_idx in timeline_data:
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
                confidence_breakdown_json=json.dumps({"ocr_clarity": 0.97, "match_strength": conf_score, "corroboration_count": 1, "rationale": "UTC timestamp"}),
                evidence_reference=ref,
                is_victim_stated=False,
                sequence_order=order_idx
            )
            db.add(te)

        # Threat Intel
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

        db.commit()

        MissingInfoService.scan_case_missing_info(db, case_id)
        SequenceEngine.evaluate_playbook_matches(db, case_id)
        FingerprintEngine.match_case_against_profiles(db, case_id)
        SummaryGeneratorService.generate_or_update_summary(db, case_id)

        return case_id

    @classmethod
    def seed_case_2_investment_task_scam(cls, db: Session) -> str:
        """Case 2: Telegram Part-Time Investment & Prepaid Freeze Fraud"""
        case_id = "CASE-2026-9102"
        existing = db.query(Case).filter(Case.id == case_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        case = Case(
            id=case_id,
            title="Telegram High-Yield Part-Time Task & Prepaid Crypto Freeze Scam",
            incident_type="Part-Time Job & Task Investment Fraud",
            description="Victim recruited via WhatsApp and transferred to Telegram channel 'Global VIP Media Earners', enticed with small payouts for YouTube likes then frozen upon investing ₹47,500.",
            incident_date="20 Sep 2026",
            investigator_name="Insp. Vikram Rathore (Cyber Crime Cell)",
            priority="CRITICAL",
            status="Under Review",
            is_demo_case=True,
            created_at=datetime.utcnow()
        )
        db.add(case)
        db.flush()

        evidence_defs = [
            {
                "ev_id": "EV-001",
                "file_name": "Telegram_Task_Chat_History.txt",
                "file_type": "TEXT",
                "mime_type": "text/plain",
                "content": (
                    b"[Telegram Chat Transcript - Global VIP Media Group]\n"
                    b"20-09-2026 09:15 AM - Admin (@TetherManager_Pooja): Welcome to Level-3 Dispatch. Like 3 YouTube videos and receive Rs 300 instant commission.\n"
                    b"20-09-2026 10:20 AM - Admin: Tier-1 Prepaid Task available. Deposit Rs 12,500 to UPI pay.crypto.invest@icici to earn Rs 18,750 (50% bonus).\n"
                    b"20-09-2026 11:30 AM - Admin: System error on withdrawal. Account flagged for high-frequency trading. Deposit Rs 35,000 security bond to unlock."
                )
            },
            {
                "ev_id": "EV-002",
                "file_name": "UPI_First_Deposit_Receipt.png",
                "file_type": "IMAGE",
                "mime_type": "image/png",
                "content": (
                    b"[GPay Payment Receipt OCR]\n"
                    b"To: pay.crypto.invest@icici\n"
                    b"Amount: Rs. 12,500.00\n"
                    b"Status: Payment Successful\n"
                    b"UPI Ref ID / UTR: 429103847291\n"
                    b"20 Sep 2026, 10:25:40 AM"
                )
            },
            {
                "ev_id": "EV-003",
                "file_name": "UPI_Second_Deposit_Receipt.png",
                "file_type": "IMAGE",
                "mime_type": "image/png",
                "content": (
                    b"[PhonePe Payment Receipt OCR]\n"
                    b"To: merchant.settle@axisbank\n"
                    b"Amount: Rs. 35,000.00\n"
                    b"Status: Successful\n"
                    b"Txn ID: T2609201138402910482\n"
                    b"20 Sep 2026, 11:38:12 AM"
                )
            },
            {
                "ev_id": "EV-004",
                "file_name": "Fake_Crypto_Trading_Portal.url",
                "file_type": "URL",
                "mime_type": "text/uri-list",
                "content": b"https://tether-earn-rewards.top/dashboard"
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
                engine_confidence=0.97,
                word_count=len(raw_text.split())
            )
            db.add(ev_text)

        # Entities
        entities_data = [
            ("PERSON", "@TetherManager_Pooja", ["@TetherManager_Pooja", "Admin Pooja"], "@TetherManager_Pooja", [
                ("EV-001", "@TetherManager_Pooja", "@TetherManager_Pooja", 0.96, "Line 2 - Group Admin Handle")
            ]),
            ("UPI_ID", "pay.crypto.invest@icici", ["pay.crypto.invest@icici"], "pay.crypto.invest@icici", [
                ("EV-001", "pay.crypto.invest@icici", "pay***@icici", 0.95, "Line 3 - Task deposit"),
                ("EV-002", "pay.crypto.invest@icici", "pay***@icici", 0.98, "GPay Receipt")
            ]),
            ("UPI_ID", "merchant.settle@axisbank", ["merchant.settle@axisbank"], "merchant.settle@axisbank", [
                ("EV-003", "merchant.settle@axisbank", "mer***@axisbank", 0.98, "PhonePe Receipt")
            ]),
            ("URL", "https://tether-earn-rewards.top", ["https://tether-earn-rewards.top"], "https://tether-earn-rewards.top", [
                ("EV-004", "https://tether-earn-rewards.top/dashboard", "https://tether-earn-rewards.top/dashboard", 0.99, "URL Ingest")
            ]),
            ("TXN_ID", "429103847291", ["429103847291"], "429103847291", [
                ("EV-002", "429103847291", "429103847291", 0.99, "UTR Reference")
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
                    confidence_breakdown_json=json.dumps({"ocr_clarity": 0.98, "match_strength": conf, "corroboration_count": len(mentions), "rationale": "High-fidelity receipt capture"}),
                    evidence_reference=ev_ref,
                    extraction_status="FOUND",
                    grounding_verified=True
                )
                db.add(em)

        # Transactions (Total ₹47,500)
        t1 = Transaction(
            case_id=case_id,
            source_evidence_id="EV-002",
            amount=12500.0,
            amount_formatted="₹12,500.00",
            currency="INR",
            sender="Victim GPay Account",
            receiver="pay.crypto.invest@icici",
            payment_method="UPI",
            transaction_id_ref="429103847291",
            timestamp="20-09-2026 10:25:40 AM",
            original_text="Rs. 12,500.00 Payment Successful",
            confidence=0.98,
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.99, "match_strength": 0.98, "corroboration_count": 1, "rationale": "Receipt screenshot OCR"}),
            evidence_reference="EV-002 Body",
            extraction_status="FOUND",
            reconciliation_status="RECONCILED"
        )
        t2 = Transaction(
            case_id=case_id,
            source_evidence_id="EV-003",
            amount=35000.0,
            amount_formatted="₹35,000.00",
            currency="INR",
            sender="Victim PhonePe Account",
            receiver="merchant.settle@axisbank",
            payment_method="UPI",
            transaction_id_ref="T2609201138402910482",
            timestamp="20-09-2026 11:38:12 AM",
            original_text="Amount: Rs. 35,000.00 Status: Successful",
            confidence=0.98,
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.99, "match_strength": 0.98, "corroboration_count": 1, "rationale": "Receipt screenshot OCR"}),
            evidence_reference="EV-003 Body",
            extraction_status="FOUND",
            reconciliation_status="RECONCILED"
        )
        db.add(t1)
        db.add(t2)

        # Timeline
        timeline_data = [
            ("EV-001", "20-09-2026 09:15 AM", "09:15 AM, 20 Sep 2026", "Telegram Task Group Onboarding", "Victim added to 'Global VIP Media' channel and completed test YouTube like task for initial commission.", "MESSAGE", 0.95, "EV-001 Msg 1", 1),
            ("EV-002", "20-09-2026 10:25 AM", "10:25 AM, 20 Sep 2026", "Tier-1 Prepaid Task Deposit (₹12,500)", "Victim transferred ₹12,500 via GPay to pay.crypto.invest@icici to unlock high-yield commission.", "TRANSACTION", 0.98, "EV-002 Receipt", 2),
            ("EV-004", "20-09-2026 11:00 AM", "11:00 AM, 20 Sep 2026", "Dashboard Displayed Virtual Balance", "Victim logged into tether-earn-rewards.top showing simulated virtual wallet balance of ₹18,750.", "URL_VISIT", 0.94, "EV-004 Dashboard", 3),
            ("EV-003", "20-09-2026 11:38 AM", "11:38 AM, 20 Sep 2026", "Prepaid Freeze & Unlock Deposit (₹35,000)", "Suspect claimed system freeze and induced second transfer of ₹35,000 to merchant.settle@axisbank.", "TRANSACTION", 0.98, "EV-003 Receipt", 4),
            ("EV-001", "20-09-2026 12:15 PM", "12:15 PM, 20 Sep 2026", "Further Tax Demands & Group Removal", "Suspect demanded additional 30% tax clearance fee of ₹25,000 before removing victim from channel.", "MESSAGE", 0.92, "EV-001 Footer", 5)
        ]

        for ev_id, ts, ts_disp, title, desc, etype, conf_score, ref, order_idx in timeline_data:
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
                confidence_breakdown_json=json.dumps({"ocr_clarity": 0.98, "match_strength": conf_score, "corroboration_count": 1, "rationale": "High-confidence temporal record"}),
                evidence_reference=ref,
                is_victim_stated=False,
                sequence_order=order_idx
            )
            db.add(te)

        # Threat Intel for .top domain
        ti_result = ThreatIntelService.check_url("https://tether-earn-rewards.top/dashboard")
        ti = ThreatIntelLookup(
            case_id=case_id,
            source_evidence_id="EV-004",
            url_or_domain="https://tether-earn-rewards.top/dashboard",
            source_feed=ti_result["source_feed"],
            result_status="MALICIOUS_LISTED",
            risk_score=0.96,
            details_json=json.dumps({
                "category": "Fictitious Cryptocurrency / Task Scam Investment Platform",
                "authority_source": "Global Threat Feed Aggregator",
                "first_listed": "2026-09-18"
            }),
            checked_at=datetime.utcnow()
        )
        db.add(ti)

        # Structural Flag (Missing official merchant invoice & differing recipient VPAs)
        sf = StructuralFlag(
            case_id=case_id,
            source_evidence_id="EV-003",
            scope="SINGLE_DOCUMENT",
            flag_type="FORMAT_INCONSISTENCY",
            title="Rapid Beneficiary VPA Rotation Across Sequential Deposits",
            observation="Victim was instructed to send first payment to pay.crypto.invest@icici and second payment to merchant.settle@axisbank within 1 hour.",
            expected_basis="Legitimate investment and merchant escrow platforms maintain unified, static corporate settlement accounts.",
            confidence=0.94,
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.98, "match_strength": 0.94, "corroboration_count": 2, "rationale": "Cross-receipt beneficiary VPA shift"}),
            evidence_reference="EV-002 vs EV-003 Beneficiary Headers"
        )
        db.add(sf)

        db.commit()

        MissingInfoService.scan_case_missing_info(db, case_id)
        SequenceEngine.evaluate_playbook_matches(db, case_id)
        FingerprintEngine.match_case_against_profiles(db, case_id)
        SummaryGeneratorService.generate_or_update_summary(db, case_id)

        return case_id

    @classmethod
    def seed_case_3_utility_disconnection_smishing(cls, db: Session) -> str:
        """Case 3: State Electricity Board Power Disconnection Smishing"""
        case_id = "CASE-2026-7734"
        existing = db.query(Case).filter(Case.id == case_id).first()
        if existing:
            db.delete(existing)
            db.commit()

        case = Case(
            id=case_id,
            title="State Electricity Board Urgent Power Disconnection Smishing",
            incident_type="Utility Bill & APK Smishing Fraud",
            description="Victim received threatening SMS claiming electricity disconnection at 9:30 PM due to unpaid bill, induced to call fake officer number and install malicious support APK.",
            incident_date="05 Sep 2026",
            investigator_name="Insp. Vikram Rathore (Cyber Crime Cell)",
            priority="HIGH",
            status="Open",
            is_demo_case=True,
            created_at=datetime.utcnow()
        )
        db.add(case)
        db.flush()

        evidence_defs = [
            {
                "ev_id": "EV-001",
                "file_name": "Urgent_Electricity_Disconnection_SMS.txt",
                "file_type": "TEXT",
                "mime_type": "text/plain",
                "content": (
                    b"Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from electricity office because your previous month bill was not updated.\n"
                    b"Please immediately contact our Electricity Officer at +91 88776 65544 or update bill via https://icici-fastag-recharge.top/bijli.\n"
                    b"Power Board Helpline Ref: EB-DEL-9841."
                )
            },
            {
                "ev_id": "EV-002",
                "file_name": "Malicious_APK_Download_URL.url",
                "file_type": "URL",
                "mime_type": "text/uri-list",
                "content": b"https://apk-download-pay.me/suvidha-bill.apk"
            },
            {
                "ev_id": "EV-003",
                "file_name": "Bank_Debit_Alert_SMS.txt",
                "file_type": "TEXT",
                "mime_type": "text/plain",
                "content": (
                    b"HDFC Bank Alert: Rs 19,999.00 debited from A/c **4412 on 05-Sep-2026 08:45 PM to tollpay@paytm via NetBanking.\n"
                    b"Ref: 994810294810. If not you, call 18002586161."
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
                engine_confidence=0.98,
                word_count=len(raw_text.split())
            )
            db.add(ev_text)

        # Entities
        entities_data = [
            ("PHONE", "+91 88776 65544", ["+91 88776 65544", "8877665544"], "+91 88776 65544", [
                ("EV-001", "+91 88776 65544", "88******44", 0.98, "Line 2 - Suspect Helpline")
            ]),
            ("UPI_ID", "tollpay@paytm", ["tollpay@paytm"], "tollpay@paytm", [
                ("EV-003", "tollpay@paytm", "tol***@paytm", 0.97, "Debit recipient")
            ]),
            ("URL", "https://apk-download-pay.me", ["https://apk-download-pay.me"], "https://apk-download-pay.me", [
                ("EV-002", "https://apk-download-pay.me/suvidha-bill.apk", "https://apk-download-pay.me/suvidha-bill.apk", 0.99, "APK Payload URL")
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
                    confidence_breakdown_json=json.dumps({"ocr_clarity": 0.98, "match_strength": conf, "corroboration_count": 1, "rationale": "SMS body token"}),
                    evidence_reference=ev_ref,
                    extraction_status="FOUND",
                    grounding_verified=True
                )
                db.add(em)

        # Transaction ₹19,999
        t1 = Transaction(
            case_id=case_id,
            source_evidence_id="EV-003",
            amount=19999.0,
            amount_formatted="₹19,999.00",
            currency="INR",
            sender="HDFC Bank A/c **4412",
            receiver="tollpay@paytm",
            payment_method="NetBanking",
            transaction_id_ref="994810294810",
            timestamp="05-09-2026 08:45 PM",
            original_text="Rs 19,999.00 debited from A/c **4412 to tollpay@paytm",
            confidence=0.97,
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.98, "match_strength": 0.97, "corroboration_count": 1, "rationale": "Official bank SMS"}),
            evidence_reference="EV-003 Body",
            extraction_status="FOUND",
            reconciliation_status="RECONCILED"
        )
        db.add(t1)

        # Structural Flag: Missing Consumer CA Number in Disconnection Notice
        sf = StructuralFlag(
            case_id=case_id,
            source_evidence_id="EV-001",
            scope="SINGLE_DOCUMENT",
            flag_type="MISSING_REQUIRED_FIELD",
            title="Absence of 10-Digit Consumer Account (CA) Number",
            observation="Disconnection SMS threatens power cut tonight but omits victim's unique consumer service connection (CA/K-Number) identifier.",
            expected_basis="State electricity distribution utilities strictly bind disconnection notices to specific meter CA numbers.",
            confidence=0.95,
            confidence_breakdown_json=json.dumps({"ocr_clarity": 0.98, "match_strength": 0.95, "corroboration_count": 1, "rationale": "Missing mandatory utility account identifier"}),
            evidence_reference="EV-001 SMS Text"
        )
        db.add(sf)

        # Threat Intel on APK URL
        ti = ThreatIntelLookup(
            case_id=case_id,
            source_evidence_id="EV-002",
            url_or_domain="https://apk-download-pay.me/suvidha-bill.apk",
            source_feed="VirusTotal & Cert-In Mobile Malware Radar",
            result_status="MALICIOUS_LISTED",
            risk_score=0.99,
            details_json=json.dumps({
                "category": "Android Remote Access Trojan (RAT) / SMS Forwarder Payload",
                "authority_source": "Cert-In Advisory CIAD-2026-441",
                "first_listed": "2026-09-01"
            }),
            checked_at=datetime.utcnow()
        )
        db.add(ti)

        db.commit()

        MissingInfoService.scan_case_missing_info(db, case_id)
        SequenceEngine.evaluate_playbook_matches(db, case_id)
        FingerprintEngine.match_case_against_profiles(db, case_id)
        SummaryGeneratorService.generate_or_update_summary(db, case_id)

        return case_id

    @classmethod
    def seed_all(cls, db: Session):
        c1 = cls.seed_case_1_kyc_phishing(db)
        c2 = cls.seed_case_2_investment_task_scam(db)
        c3 = cls.seed_case_3_utility_disconnection_smishing(db)
        return [c1, c2, c3]
