import json
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from models import (
    Case, CaseEntity, Transaction, TimelineEvent,
    Conflict, MissingInfoItem, CaseContextSnapshot
)

class CaseContextService:
    @classmethod
    def assemble_snapshot(cls, db: Session, case_id: str) -> Dict[str, Any]:
        """
        Builds the RAG-style Case Context Object: compact structured snapshot of sourced facts.
        """
        case = db.query(Case).filter(Case.id == case_id).first()
        entities = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()
        transactions = db.query(Transaction).filter(Transaction.case_id == case_id).all()
        events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).order_by(TimelineEvent.sequence_order).all()
        conflicts = db.query(Conflict).filter(Conflict.case_id == case_id).all()
        missing = db.query(MissingInfoItem).filter(MissingInfoItem.case_id == case_id).all()

        snapshot = {
            "case_id": case_id,
            "title": case.title if case else "",
            "canonical_entities": [
                {
                    "name": e.canonical_name,
                    "type": e.entity_type,
                    "aliases": json.loads(e.aliases_json) if e.aliases_json else []
                }
                for e in entities
            ],
            "transactions": [
                {
                    "amount": t.amount_formatted,
                    "sender": t.sender,
                    "receiver": t.receiver,
                    "source": t.source_evidence_id
                }
                for t in transactions
            ],
            "timeline_events": [
                {
                    "time": ev.timestamp_display,
                    "title": ev.title,
                    "source": ev.source_evidence_id
                }
                for ev in events
            ],
            "open_conflicts": [
                {
                    "field": c.field_name,
                    "val_a": c.value_a,
                    "val_b": c.value_b
                }
                for c in conflicts if not c.is_reviewed
            ],
            "open_missing_info": [m.field_name for m in missing if m.status == "OPEN"]
        }

        # Store snapshot version in DB
        snap_row = CaseContextSnapshot(
            case_id=case_id,
            snapshot_json=json.dumps(snapshot),
            updated_at=datetime.utcnow()
        )
        db.add(snap_row)
        db.commit()

        return snapshot
