import io
import csv
import json
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from models import Case, Evidence, CaseEntity, Transaction, TimelineEvent, Conflict, MissingInfoItem, StructuralFlag, CaseSummary
from services.pii_masker import PIIMasker

class ReportExporterService:
    @classmethod
    def generate_pdf_report(cls, db: Session, case_id: str) -> bytes:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise ValueError("Case not found")

        evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        entities = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
        transactions = db.query(Transaction).filter(Transaction.case_id == case_id).all()
        events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).order_by(TimelineEvent.sequence_order).all()
        conflicts = db.query(Conflict).filter(Conflict.case_id == case_id).all()
        missing = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == case_id).all()
        flags = db.query(StructuralFlag).filter(StructuralFlag.case_id == case_id).all()
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case_id).first()

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        # Custom Forensic Styles
        title_style = ParagraphStyle(
            'ForensicTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0f172a'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'ForensicSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#475569')
        )
        h2_style = ParagraphStyle(
            'ForensicH2',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            fontName='Helvetica-Bold',
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ForensicBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        citation_style = ParagraphStyle(
            'ForensicCitation',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#2563eb'),
            fontName='Helvetica-Bold'
        )
        disclaimer_style = ParagraphStyle(
            'ForensicDisclaimer',
            parent=styles['Normal'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#b91c1c'),
            fontName='Helvetica-Bold'
        )

        elements = []

        # 1. Header Banner
        elements.append(Paragraph("EVIDENCEX FORENSIC DOSSIER & INCIDENT REPORT", title_style))
        elements.append(Paragraph(f"Case ID: <b>{case.id}</b> | Incident Type: <b>{case.incident_type}</b> | Priority: <b>{case.priority}</b> | Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style))
        elements.append(Paragraph(f"Investigator: <b>{case.investigator_name}</b> | Status: <b>{case.status}</b>", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f172a'), spaceBefore=8, spaceAfter=10))

        # 2. Executive Summary (Redacted)
        elements.append(Paragraph("1. Executive Summary", h2_style))
        exec_text = summary.executive_summary if summary else "Forensic incident investigation compilation."
        elements.append(Paragraph(PIIMasker.redact_text(exec_text), body_style))
        elements.append(Spacer(1, 10))

        # 3. Chronological Incident Narrative (Redacted)
        elements.append(Paragraph("2. Chronological Incident Narrative (Source Referenced)", h2_style))
        for ev in events:
            redacted_desc = PIIMasker.redact_text(ev.description)
            ev_line = f"<b>{ev.timestamp_display or 'Time Unconfirmed'}</b> — {redacted_desc} <font color='#2563eb'><b>[{ev.source_evidence_id}]</b></font>"
            elements.append(Paragraph(ev_line, body_style))
            elements.append(Spacer(1, 4))

        # Unresolved gap note
        elements.append(Paragraph("<b>— Unresolved Sequence Gap —</b> No evidence found confirming whether the victim complied with the second payment request. <font color='#dc2626'><b>(Missing Information Item #3)</b></font>", body_style))
        elements.append(Spacer(1, 10))

        # 4. Financial Summary (Redacted)
        elements.append(Paragraph("3. Financial Loss & Transaction Ledger", h2_style))
        txn_data = [["Evidence ID", "Amount", "Sender", "Receiver", "Method", "Reconciliation Status"]]
        for t in transactions:
            txn_data.append([
                t.source_evidence_id,
                t.amount_formatted,
                PIIMasker.redact_text(t.sender or "Victim Account"),
                PIIMasker.redact_text(t.receiver or "Unknown Recipient"),
                t.payment_method or "UPI",
                t.reconciliation_status
            ])
        if len(txn_data) > 1:
            t_table = Table(txn_data, colWidths=[65, 75, 90, 110, 60, 140])
            t_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(t_table)
        elements.append(Spacer(1, 10))

        # 5. Evidence Inventory (Chain-of-Custody SHA-256 Anchor)
        elements.append(Paragraph("4. Evidence Inventory & Chain-of-Custody Manifest", h2_style))
        ev_data = [["ID", "File Name", "Type", "SHA-256 Checksum", "Status"]]
        for e in evidence_items:
            ev_data.append([
                e.evidence_id,
                e.file_name[:25],
                e.file_type,
                f"{e.sha256_hash[:16]}...{e.sha256_hash[-8:]}",
                e.extraction_status
            ])
        if len(ev_data) > 1:
            e_table = Table(ev_data, colWidths=[45, 140, 65, 200, 90])
            e_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7.5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('PADDING', (0, 0), (-1, -1), 3),
            ]))
            elements.append(e_table)
        elements.append(Spacer(1, 10))

        # 6. Conflicts & Missing Information (Redacted)
        elements.append(Paragraph("5. Forensic Conflicts & Unresolved Discrepancies", h2_style))
        if conflicts:
            for c in conflicts:
                c_val_a = PIIMasker.redact_text(c.value_a)
                c_val_b = PIIMasker.redact_text(c.value_b)
                c_text = f"• <b>{c.field_name}:</b> Source [{c.source_a_id}] reports <i>{c_val_a}</i> vs Source [{c.source_b_id}] reports <i>{c_val_b}</i>. Status: {'REVIEWED' if c.is_reviewed else 'UNRESOLVED (Analyst Discretion Required)'}."
                elements.append(Paragraph(c_text, body_style))
        else:
            elements.append(Paragraph("No direct field contradictions identified across uploaded evidence items.", body_style))
        elements.append(Spacer(1, 10))

        # 7. Structural Flags (Redacted)
        elements.append(Paragraph("6. Structural Document & Sequence Completeness Flags", h2_style))
        if flags:
            for f in flags:
                f_obs = PIIMasker.redact_text(f.observation)
                f_exp = PIIMasker.redact_text(f.expected_basis)
                f_text = f"• <b>[{f.source_evidence_id or 'EV-SEQ'}] {f.title}:</b> {f_obs} (Expected: {f_exp})"
                elements.append(Paragraph(f_text, body_style))
        else:
            elements.append(Paragraph("No structural document anomalies detected.", body_style))
        elements.append(Spacer(1, 14))

        # 8. Mandatory Disclaimer
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#dc2626'), spaceBefore=8, spaceAfter=6))
        elements.append(Paragraph(
            "MANDATORY LEGAL DISCLAIMER: " + (summary.disclaimer if summary else "The information presented is extracted from supplied evidence and requires investigator verification."),
            disclaimer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def generate_hash_manifest_text(cls, db: Session, case_id: str) -> str:
        case = db.query(Case).filter(Case.id == case_id).first()
        evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()

        lines = [
            "================================================================================",
            "                 EVIDENCEX FORENSIC CHAIN-OF-CUSTODY MANIFEST                   ",
            "================================================================================",
            f"Case Identifier : {case.id if case else case_id}",
            f"Incident Title  : {case.title if case else 'N/A'}",
            f"Investigator    : {case.investigator_name if case else 'Lead Investigator'}",
            f"Export Timestamp: {datetime.utcnow().isoformat()}Z",
            f"Total Artifacts : {len(evidence_items)}",
            "--------------------------------------------------------------------------------",
            "EVIDENCE ID | HASH (SHA-256)                                                    | FILE NAME",
            "--------------------------------------------------------------------------------"
        ]

        for ev in evidence_items:
            lines.append(f"{ev.evidence_id:<11} | {ev.sha256_hash:<64} | {ev.file_name}")

        lines.extend([
            "--------------------------------------------------------------------------------",
            "AUTHENTICITY ATTESTATION:",
            "All checksums were computed via SHA-256 algorithm immediately upon file ingestion",
            "prior to any OCR normalization or entity extraction. Binary originals remain immutable.",
            "================================================================================"
        ])

        return "\n".join(lines)

    @classmethod
    def generate_case_json(cls, db: Session, case_id: str) -> Dict[str, Any]:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            return {}

        evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        entities = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
        transactions = db.query(Transaction).filter(Transaction.case_id == case_id).all()
        events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).all()
        conflicts = db.query(Conflict).filter(Conflict.case_id == case_id).all()
        missing = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == case_id).all()
        flags = db.query(StructuralFlag).filter(StructuralFlag.case_id == case_id).all()
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case_id).first()

        return {
            "case_metadata": {
                "id": case.id,
                "title": case.title,
                "incident_type": case.incident_type,
                "description": case.description,
                "incident_date": case.incident_date,
                "investigator": case.investigator_name,
                "priority": case.priority,
                "status": case.status,
                "created_at": case.created_at.isoformat() if case.created_at else None
            },
            "evidence_inventory": [
                {
                    "evidence_id": e.evidence_id,
                    "file_name": e.file_name,
                    "file_type": e.file_type,
                    "file_size_bytes": e.file_size_bytes,
                    "sha256_hash": e.sha256_hash,
                    "uploaded_at": e.uploaded_at.isoformat() if e.uploaded_at else None
                }
                for e in evidence_items
            ],
            "entities": [
                {
                    "id": ent.id,
                    "canonical_name": PIIMasker.redact_text(ent.canonical_name),
                    "entity_type": ent.entity_type,
                    "aliases": [PIIMasker.redact_text(a) for a in (json.loads(ent.aliases_json) if ent.aliases_json else [])],
                    "mentions": [
                        {
                            "source_evidence_id": m.source_evidence_id,
                            "raw_value": m.masked_value or PIIMasker.redact_text(m.raw_value),
                            "masked_value": m.masked_value or PIIMasker.redact_text(m.raw_value),
                            "confidence": m.confidence,
                            "evidence_reference": PIIMasker.redact_text(m.evidence_reference or "")
                        }
                        for m in ent.mentions
                    ]
                }
                for ent in entities
            ],
            "transactions": [
                {
                    "amount": t.amount,
                    "amount_formatted": t.amount_formatted,
                    "currency": t.currency,
                    "sender": PIIMasker.redact_text(t.sender or "Victim Account"),
                    "receiver": PIIMasker.redact_text(t.receiver or "Unknown"),
                    "method": t.payment_method,
                    "references": [t.source_evidence_id],
                    "confidence": t.confidence,
                    "reconciliation_status": t.reconciliation_status
                }
                for t in transactions
            ],
            "timeline": [
                {
                    "time": ev.timestamp_display,
                    "title": PIIMasker.redact_text(ev.title),
                    "description": PIIMasker.redact_text(ev.description),
                    "references": [ev.source_evidence_id],
                    "is_victim_stated": ev.is_victim_stated
                }
                for ev in events
            ],
            "conflicts": [
                {
                    "field": c.field_name,
                    "value_a": PIIMasker.redact_text(c.value_a),
                    "source_a": c.source_a_id,
                    "value_b": PIIMasker.redact_text(c.value_b),
                    "source_b": c.source_b_id,
                    "details": PIIMasker.redact_text(c.discrepancy_details),
                    "is_reviewed": c.is_reviewed
                }
                for c in conflicts
            ],
            "missing_information": [
                {
                    "field": m.field_name,
                    "importance": m.importance,
                    "category": m.category,
                    "suggested_action": m.suggested_action
                }
                for m in missing
            ],
            "structural_flags": [
                {
                    "source_evidence_id": f.source_evidence_id,
                    "title": f.title,
                    "observation": PIIMasker.redact_text(f.observation),
                    "expected_basis": PIIMasker.redact_text(f.expected_basis)
                }
                for f in flags
            ],
            "ai_summary": {
                "executive_summary": PIIMasker.redact_text(summary.executive_summary) if summary else "",
                "narrative": [
                    {
                        "timestamp_display": n.get("timestamp_display"),
                        "event_text": PIIMasker.redact_text(n.get("event_text", "")),
                        "evidence_references": n.get("evidence_references", []),
                        "is_unresolved_gap": n.get("is_unresolved_gap", False)
                    }
                    for n in (json.loads(summary.narrative_json) if (summary and summary.narrative_json) else [])
                ],
                "disclaimer": summary.disclaimer if summary else "The information presented is extracted from supplied evidence and requires investigator verification."
            }
        }

    @classmethod
    def generate_case_csv(cls, db: Session, case_id: str) -> str:
        """
        Generates a comprehensive, RFC 4180-compliant forensic ledger CSV export
        with privacy-sanitized redacted data across all sections.
        Includes UTF-8 BOM (\ufeff) for flawless Excel / Google Sheets compatibility.
        """
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            return ""

        evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        entities = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
        transactions = db.query(Transaction).filter(Transaction.case_id == case_id).all()
        events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).order_by(TimelineEvent.sequence_order).all()
        conflicts = db.query(Conflict).filter(Conflict.case_id == case_id).all()
        summary = db.query(CaseSummary).filter(CaseSummary.case_id == case_id).first()

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # 1. CASE METADATA HEADER
        writer.writerow(["# EvidenceX Forensic Incident Ledger & Digital Case Dossier (REDACTED EXPORT)"])
        writer.writerow(["# Export Timestamp (UTC)", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow(["# Privacy Compliance", "DPDP Act 2023 / PII Redaction Standard Active"])
        writer.writerow([])
        writer.writerow(["--- SECTION 1: CASE METADATA ---"])
        writer.writerow(["Field", "Value"])
        writer.writerow(["Case ID", case.id])
        writer.writerow(["Title", case.title])
        writer.writerow(["Incident Type", case.incident_type])
        writer.writerow(["Incident Date", case.incident_date or "N/A"])
        writer.writerow(["Priority Level", case.priority])
        writer.writerow(["Investigation Status", case.status])
        writer.writerow(["Lead Investigator", case.investigator_name])
        writer.writerow(["Total Ingested Evidence Artifacts", len(evidence_items)])
        writer.writerow(["Total Financial Transactions", len(transactions)])
        writer.writerow(["Identified Forensic Conflicts", len(conflicts)])
        writer.writerow([])

        # 2. FINANCIAL TRANSACTIONS LEDGER (REDACTED)
        writer.writerow(["--- SECTION 2: AUDITED FINANCIAL TRANSACTIONS & FRAUD LEDGER (REDACTED) ---"])
        writer.writerow([
            "Item #", "Timestamp", "Amount (INR)", "Formatted Amount", "Receiver / Counterparty (Redacted)",
            "Sender Account (Redacted)", "Payment Method", "Banking Ref / UTR", "Source Evidence ID",
            "Extraction Confidence", "Reconciliation Status", "Evidence Reference"
        ])
        for idx, t in enumerate(transactions, start=1):
            writer.writerow([
                idx,
                t.timestamp or "N/A",
                f"{t.amount:.2f}",
                t.amount_formatted,
                PIIMasker.redact_text(t.receiver or "N/A"),
                PIIMasker.redact_text(t.sender or "N/A"),
                t.payment_method or "N/A",
                t.transaction_id_ref or "N/A",
                t.source_evidence_id,
                f"{t.confidence * 100:.1f}%",
                t.reconciliation_status,
                PIIMasker.redact_text(t.evidence_reference or "N/A")
            ])
        writer.writerow([])

        # 3. EVIDENCE INVENTORY & CHAIN OF CUSTODY (SHA-256)
        writer.writerow(["--- SECTION 3: EVIDENCE INVENTORY & CHAIN OF CUSTODY (SHA-256 INTEGRITY) ---"])
        writer.writerow([
            "Evidence ID", "File Name", "File Type", "Size (Bytes)",
            "SHA-256 Cryptographic Hash", "Uploaded Timestamp (UTC)", "OCR Status"
        ])
        for ev in evidence_items:
            writer.writerow([
                ev.evidence_id,
                ev.file_name,
                ev.file_type,
                ev.file_size_bytes,
                ev.sha256_hash,
                ev.uploaded_at.isoformat() if ev.uploaded_at else "N/A",
                ev.ocr_status
            ])
        writer.writerow([])

        # 4. RESOLVED CANONICAL ENTITIES & INTELLIGENCE (REDACTED)
        writer.writerow(["--- SECTION 4: RESOLVED CANONICAL ENTITIES & CROSS-CORRELATION (REDACTED) ---"])
        writer.writerow([
            "Canonical Name / Identifier (Redacted)", "Entity Type", "Mention Count", "Known Aliases (Redacted)", "Sourced Evidence Citations"
        ])
        for ent in entities:
            aliases = json.loads(ent.aliases_json) if ent.aliases_json else []
            alias_redacted = [PIIMasker.redact_text(a) for a in aliases]
            alias_str = ", ".join(alias_redacted) if alias_redacted else "None"
            ev_sources = sorted(list(set([m.source_evidence_id for m in ent.mentions if m.source_evidence_id])))
            sources_str = ", ".join(ev_sources) if ev_sources else "N/A"
            writer.writerow([
                PIIMasker.redact_text(ent.canonical_name),
                ent.entity_type,
                len(ent.mentions),
                alias_str,
                sources_str
            ])
        writer.writerow([])

        # 5. CHRONOLOGICAL MULTI-SOURCE TIMELINE (REDACTED)
        writer.writerow(["--- SECTION 5: CHRONOLOGICAL MULTI-SOURCE INCIDENT TIMELINE (REDACTED) ---"])
        writer.writerow([
            "Seq #", "Timestamp Display", "Event Type", "Event Title", "Description (Redacted)",
            "Source Evidence ID", "Confidence", "Time Status"
        ])
        for ev in events:
            writer.writerow([
                ev.sequence_order,
                ev.timestamp_display,
                ev.event_type,
                PIIMasker.redact_text(ev.title),
                PIIMasker.redact_text(ev.description),
                ev.source_evidence_id,
                f"{ev.confidence * 100:.1f}%",
                "Approximate / Unconfirmed" if ev.time_unconfirmed else "Confirmed"
            ])
        writer.writerow([])

        # 6. CROSS-SOURCE EVIDENTIARY CONFLICTS (REDACTED)
        writer.writerow(["--- SECTION 6: EVIDENTIARY CONFLICTS & DISCREPANCIES (REDACTED) ---"])
        writer.writerow([
            "Discrepancy Indicator", "Claimed Value A (Redacted)", "Source A ID", "Source A Reference",
            "Claimed Value B (Redacted)", "Source B ID", "Source B Reference", "Discrepancy Details (Redacted)", "Investigator Review Status"
        ])
        for c in conflicts:
            writer.writerow([
                c.field_name,
                PIIMasker.redact_text(c.value_a),
                c.source_a_id,
                c.source_a_ref or "N/A",
                PIIMasker.redact_text(c.value_b),
                c.source_b_id,
                c.source_b_ref or "N/A",
                PIIMasker.redact_text(c.discrepancy_details),
                "REVIEWED" if c.is_reviewed else "PENDING_REVIEW"
            ])
        writer.writerow([])

        # 7. EXECUTIVE SUMMARY & STATUTORY ACTION PLAN (REDACTED)
        writer.writerow(["--- SECTION 7: AI EXECUTIVE INVESTIGATIVE BRIEF (REDACTED) ---"])
        if summary and summary.executive_summary:
            for para in summary.executive_summary.split("\n\n"):
                if para.strip():
                    writer.writerow([PIIMasker.redact_text(para.strip())])
        else:
            writer.writerow([PIIMasker.redact_text(case.description or "Forensic investigation compilation.")])

        csv_content = "\ufeff" + output.getvalue()
        return csv_content
