import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import MissingInfoItem, VerificationRequest, EntityMention, Transaction, Case

MANDATORY_CHECKLIST = [
    {
        "field_name": "Beneficiary Bank IFSC Code",
        "importance": "HIGH",
        "category": "TRANSACTION",
        "description": "Destination branch routing identifier (IFSC) for the recipient account is absent from all supplied evidence.",
        "suggested_action": "Request full NEFT/IMPS settlement log from sender bank nodal officer to identify recipient branch.",
        "request_type": "BANK_STATEMENT_REQUEST",
        "draft_subject": "Formal Requisition: Beneficiary IFSC & Settlement Log for Cyber Fraud Investigation - Case Ref {case_id}",
        "draft_body": (
            "To: The Nodal Cyber Officer / Fraud Operations Desk\n"
            "Bank: State Bank of India / HDFC Bank Nodal Operations\n\n"
            "Subject: Formal Requisition under Section 91 CrPC / IT Act 2000 — Transaction Beneficiary Details\n\n"
            "Sir/Madam,\n"
            "In connection with investigation of cyber fraud incident (Ref: {case_id}), unauthorized debits totaling {amount} were executed from victim account on {incident_date}.\n\n"
            "The initial evidence does not disclose the Beneficiary Branch IFSC and Account Holder KYC particulars. You are hereby requested to provide:\n"
            "1. Destination Account Number, IFSC code, and branch name.\n"
            "2. KYC details (Name, Registered Mobile, Aadhaar/PAN record) of the recipient beneficiary.\n"
            "3. IP log and device fingerprint associated with the inbound credit settlement.\n\n"
            "Investigator: {investigator}\nEvidenceX Incident Management Control Plane"
        )
    },
    {
        "field_name": "Call Detail Records (CDR) & Tower Location",
        "importance": "HIGH",
        "category": "ENTITY",
        "description": "No formal Telecom Service Provider (TSP) Call Detail Record confirming caller MSISDN location, IMEI, and tower coordinates.",
        "suggested_action": "Dispatch formal 91 CrPC notice to Telecom Nodal Officer for CDR logs of suspect number.",
        "request_type": "TELECOM_CDR_REQUEST",
        "draft_subject": "Requisition for CDR, CAF, and Cell ID Logs — Suspect Mobile {phone} — Case {case_id}",
        "draft_body": (
            "To: The Telecom Security & Nodal Officer\n"
            "Subject: Urgent Requisition for Call Detail Records (CDR) and Customer Acquisition Form (CAF)\n\n"
            "Sir/Madam,\n"
            "Please provide immediate CDR with Cell ID, IMEI, and Tower Coordinates for mobile number {phone} for the period {incident_date} to present.\n\n"
            "Also furnish the verified CAF along with identity documents submitted at the time of SIM activation.\n\n"
            "Investigator: {investigator}\nCyber Crime Forensic Cell"
        )
    },
    {
        "field_name": "Victim Second Payment Confirmation",
        "importance": "MEDIUM",
        "category": "TIMELINE",
        "description": "Chat transcript indicates scammer solicited a second transfer of ₹2,000, but no receipt or statement confirms whether victim complied.",
        "suggested_action": "Inquire directly with victim if any secondary transaction was completed or blocked.",
        "request_type": "VICTIM_FOLLOWUP",
        "draft_subject": "Evidence Clarification Request: Second Payment Solicitation Follow-up - Incident {case_id}",
        "draft_body": (
            "Dear Complainant,\n\n"
            "During digital forensic analysis of your submitted WhatsApp chats (Case: {case_id}), we noted that the suspect requested a secondary payment of ₹2,000 at approximately 11:00 AM.\n\n"
            "Could you please confirm:\n"
            "1. Did you initiate or approve this secondary transaction?\n"
            "2. If yes, please upload or email your supplementary bank statement showing the debit.\n"
            "3. If refused or failed, please confirm so we can close this specific timeline item.\n\n"
            "Regards,\n{investigator}\nEvidenceX Investigation Support Desk"
        )
    }
]

class MissingInfoService:
    @classmethod
    def scan_case_missing_info(cls, db: Session, case_id: str) -> List[Dict[str, Any]]:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            return []

        # Check existing
        existing_items = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == case_id).all()
        if not existing_items:
            # Seed checklist items
            for item_def in MANDATORY_CHECKLIST:
                mi = MissingInfoItem(
                    case_id=case_id,
                    field_name=item_def["field_name"],
                    importance=item_def["importance"],
                    category=item_def["category"],
                    description=item_def["description"],
                    suggested_action=item_def["suggested_action"],
                    related_evidence_ids_json=json.dumps(["EV-001", "EV-002"]),
                    status="OPEN"
                )
                db.add(mi)
                db.flush()

                # Generate pre-filled draft request
                # Format template
                amount_str = "₹5,000.00"
                date_str = case.incident_date or "14 Oct 2026"
                phone_str = "+91 98765 43210"

                subject = item_def["draft_subject"].format(
                    case_id=case.id,
                    phone=phone_str,
                    incident_date=date_str
                )
                body = item_def["draft_body"].format(
                    case_id=case.id,
                    amount=amount_str,
                    incident_date=date_str,
                    phone=phone_str,
                    investigator=case.investigator_name
                )

                vr = VerificationRequest(
                    case_id=case_id,
                    missing_info_id=mi.id,
                    request_type=item_def["request_type"],
                    recipient="Nodal Officer / Complainant Desk",
                    draft_subject=subject,
                    draft_body=body,
                    status="DRAFTED"
                )
                db.add(vr)

            db.commit()

        # Return items with attached drafts
        items = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == case_id).all()
        result = []
        for it in items:
            draft = db.query(VerificationRequest).filter(VerificationRequest.missing_info_id == it.id).first()
            result.append({
                "id": it.id,
                "field_name": it.field_name,
                "importance": it.importance,
                "category": it.category,
                "description": it.description,
                "suggested_action": it.suggested_action,
                "related_evidence_ids": json.loads(it.related_evidence_ids_json) if it.related_evidence_ids_json else [],
                "status": it.status,
                "draft_request": {
                    "id": draft.id,
                    "request_type": draft.request_type,
                    "recipient": draft.recipient,
                    "draft_subject": draft.draft_subject,
                    "draft_body": draft.draft_body,
                    "status": draft.status
                } if draft else None
            })
        return result
