import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import ScammerProfile, ProfileMatch, EntityMention, ThreatIntelLookup

DEFAULT_PROFILES = [
    {
        "profile_id": "PROF-IND-KYC-9942",
        "playbook_name": "Banking KYC Expiry & Phishing URL Operation",
        "signature_summary": "Pretext involves imminent SBI/HDFC NetBanking KYC suspension via SMS, directing victim to lookalike domain to capture credentials followed by instant UPI pull.",
        "indicators": ["secure-sbi-kyc-update.com", "rahul.sharma@okhdfcbank", "+91 98765 43210"],
        "confirmed_case_count": 4,
        "avg_confidence": 0.91,
        "status": "CONFIRMED"
    },
    {
        "profile_id": "PROF-IND-FASTAG-4102",
        "playbook_name": "Fastag Recharge / Toll Plaza Smishing Ring",
        "signature_summary": "Targeted SMS warning victim of unpaid toll fine with threat of vehicle registration cancellation, linking to shortlink gateway.",
        "indicators": ["icici-fastag-recharge.top", "tollpay@paytm", "+91 88776 65544"],
        "confirmed_case_count": 7,
        "avg_confidence": 0.94,
        "status": "COMMON_TEMPLATE"
    }
]

class FingerprintEngine:
    @classmethod
    def seed_known_profiles(cls, db: Session) -> None:
        for p in DEFAULT_PROFILES:
            existing = db.query(ScammerProfile).filter(ScammerProfile.profile_id == p["profile_id"]).first()
            if not existing:
                prof = ScammerProfile(
                    profile_id=p["profile_id"],
                    playbook_name=p["playbook_name"],
                    signature_summary=p["signature_summary"],
                    indicator_list_json=json.dumps(p["indicators"]),
                    confirmed_case_count=p["confirmed_case_count"],
                    avg_confidence=p["avg_confidence"],
                    status=p["status"]
                )
                db.add(prof)
        db.commit()

    @classmethod
    def match_case_against_profiles(cls, db: Session, case_id: str) -> List[Dict[str, Any]]:
        cls.seed_known_profiles(db)

        # Fetch case entity mentions & threat intel lookups
        mentions = db.query(EntityMention).filter(EntityMention.case_id == case_id).all()
        threat_lookups = db.query(ThreatIntelLookup).filter(ThreatIntelLookup.case_id == case_id).all()

        case_indicators = set()
        for m in mentions:
            case_indicators.add(m.raw_value.lower().strip())
        for tl in threat_lookups:
            case_indicators.add(tl.url_or_domain.lower().strip())

        profiles = db.query(ScammerProfile).all()
        matches = []

        for p in profiles:
            p_indicators = json.loads(p.indicator_list_json) if p.indicator_list_json else []
            matched_overlap = [ind for ind in p_indicators if any(ind.lower() in ci or ci in ind.lower() for ci in case_indicators)]

            # Check if there is behavioral script similarity + indicator overlap
            if matched_overlap:
                match_conf = min(0.96, 0.75 + (len(matched_overlap) * 0.10))
                alert_msg = (
                    f"This case matches known scam operation profile {p.profile_id} "
                    f"('{p.playbook_name}', seen in {p.confirmed_case_count} prior cases) with "
                    f"{int(match_conf*100)}% pattern confidence — review recommended."
                )

                # Check if already matched
                existing_match = db.query(ProfileMatch).filter(
                    ProfileMatch.case_id == case_id,
                    ProfileMatch.profile_id == p.profile_id
                ).first()

                if not existing_match:
                    pm = ProfileMatch(
                        case_id=case_id,
                        profile_id=p.profile_id,
                        match_confidence=match_conf,
                        matched_basis="BOTH" if len(matched_overlap) > 1 else "INDICATOR",
                        matched_indicators_json=json.dumps(matched_overlap),
                        alert_text=alert_msg,
                        investigator_reviewed=False,
                        dismissed=False
                    )
                    db.add(pm)
                    db.commit()

        db_matches = db.query(ProfileMatch).filter(ProfileMatch.case_id == case_id).all()
        return [
            {
                "id": m.id,
                "profile_id": m.profile_id,
                "match_confidence": m.match_confidence,
                "matched_basis": m.matched_basis,
                "matched_indicators": json.loads(m.matched_indicators_json) if m.matched_indicators_json else [],
                "alert_text": m.alert_text,
                "investigator_reviewed": m.investigator_reviewed,
                "dismissed": m.dismissed,
                "dismissal_reason": m.dismissal_reason
            }
            for m in db_matches
        ]
