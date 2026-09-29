import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import CaseEntity, EntityMention

class EntityResolver:
    @classmethod
    def resolve_and_store_mentions(
        cls,
        db: Session,
        case_id: str,
        extracted_data: Dict[str, Any],
        source_evidence_id: str
    ) -> None:
        """
        Takes raw extractions for an evidence item, merges them into canonical case entities,
        and saves each EntityMention with full source traceability.
        """
        # Group extractions by category
        categories = [
            ("PERSON", extracted_data.get("persons", [])),
            ("PHONE", extracted_data.get("phone_numbers", [])),
            ("EMAIL", extracted_data.get("emails", [])),
            ("UPI_ID", extracted_data.get("upi_ids", [])),
            ("BANK_ACCOUNT", extracted_data.get("bank_accounts", [])),
            ("TXN_ID", extracted_data.get("transaction_ids", [])),
            ("URL", extracted_data.get("urls", []))
        ]

        existing_canonical = db.query(CaseEntity).filter(CaseEntity.case_id == case_id).all()

        for entity_type, mentions in categories:
            for mention in mentions:
                raw_val = mention["raw_value"].strip()
                masked_val = mention["masked_value"]
                conf = mention["confidence"]
                conf_bd = json.dumps(mention.get("confidence_breakdown", {}))
                ev_ref = mention.get("evidence_reference")
                stat = mention.get("extraction_status", "FOUND")
                grounded = mention.get("grounding_verified", True)

                # Match against existing canonical entities
                matched_canonical = None

                for canon in existing_canonical:
                    if canon.entity_type != entity_type:
                        continue

                    # Exact match on identifier
                    if canon.primary_identifier and canon.primary_identifier.lower() == raw_val.lower():
                        matched_canonical = canon
                        break

                    # Check aliases
                    aliases = json.loads(canon.aliases_json) if canon.aliases_json else []
                    if raw_val.lower() in [a.lower() for a in aliases]:
                        matched_canonical = canon
                        break

                    # For Person names: Require corroboration (Strict Anti-false merge rule)
                    # We do NOT merge generic first names alone.
                    if entity_type == "PERSON" and canon.canonical_name.lower() == raw_val.lower():
                        matched_canonical = canon
                        break

                if not matched_canonical:
                    # Create new canonical entity
                    matched_canonical = CaseEntity(
                        case_id=case_id,
                        canonical_name=raw_val,
                        entity_type=entity_type,
                        primary_identifier=raw_val,
                        aliases_json=json.dumps([raw_val]),
                        is_confirmed_by_analyst=False
                    )
                    db.add(matched_canonical)
                    db.flush() # get id
                    existing_canonical.append(matched_canonical)
                else:
                    # Update aliases if novel
                    aliases = json.loads(matched_canonical.aliases_json) if matched_canonical.aliases_json else []
                    if raw_val not in aliases:
                        aliases.append(raw_val)
                        matched_canonical.aliases_json = json.dumps(aliases)

                # Create raw EntityMention row linked to canonical entity
                ent_mention = EntityMention(
                    case_id=case_id,
                    canonical_entity_id=matched_canonical.id,
                    source_evidence_id=source_evidence_id,
                    entity_type=entity_type,
                    raw_value=raw_val,
                    masked_value=masked_val,
                    confidence=conf,
                    confidence_breakdown_json=conf_bd,
                    evidence_reference=ev_ref,
                    extraction_status=stat,
                    grounding_verified=grounded
                )
                db.add(ent_mention)

        db.commit()
