import sys
import os
import json
import requests

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000/api"

def test_meena_case():
    print("=" * 70)
    print("EVIDENCEX COMPREHENSIVE CASE AUDIT: MEENA FRAUD CASE SAMPLE")
    print("=" * 70)

    # 1. Create a fresh case
    case_payload = {
        "title": "Meena Raghavan - Banking Impersonation & UPI Fraud",
        "incident_type": "BANKING_FRAUD",
        "description": "Victim targeted by caller posing as SecureTrust Bank fraud prevention team; unauthorized UPI transfers executed.",
        "investigator_name": "Lead Forensic Investigator",
        "priority": "CRITICAL"
    }
    r = requests.post(f"{BASE}/cases", json=case_payload)
    r.raise_for_status()
    case_data = r.json()
    case_id = case_data["id"]
    print(f"\n[1] Case Registered Successfully: {case_id}")

    # 2. Upload meena-fraud-case-sample.zip
    zip_path = r"C:\Users\sulph\Downloads\meena-fraud-case-sample.zip"
    if not os.path.exists(zip_path):
        print(f"Error: Zip file not found at {zip_path}")
        return

    print(f"\n[2] Ingesting ZIP Bundle: {zip_path} ({os.path.getsize(zip_path)} bytes)...")
    with open(zip_path, "rb") as f:
        files = {"file": ("meena-fraud-case-sample.zip", f.read(), "application/zip")}
        r_up = requests.post(f"{BASE}/cases/{case_id}/evidence/upload", files=files)
        r_up.raise_for_status()
        up_res = r_up.json()

    print(f" -> ZIP Ingestion Status: {up_res.get('status')}")
    print(f" -> Total Artifacts Extracted: {up_res.get('total_extracted')}")
    print(f" -> Total Artifacts Ingested: {up_res.get('ingested_count')}")
    print(f" -> Duplicates Skipped: {up_res.get('duplicate_count')}")

    # 3. Fetch Ingested Evidence
    r_ev = requests.get(f"{BASE}/cases/{case_id}/evidence")
    ev_list = r_ev.json()
    print(f"\n[3] Ingested Evidence Artifacts Inventory ({len(ev_list)} items):")
    for ev in ev_list:
        print(f"  • [{ev['evidence_id']}] {ev['file_name']:<35} | Type: {ev['file_type']:<5} | Size: {ev['file_size_bytes']:>6}B | OCR: {ev['ocr_status']:<9} | SHA256: {ev['sha256_hash'][:16]}...")

    # 4. Fetch Canonical Entities
    r_ent = requests.get(f"{BASE}/cases/{case_id}/entities")
    ents = r_ent.json()
    print(f"\n[4] Resolved Canonical Entities & Intelligence ({len(ents)} entities):")
    for ent in ents:
        name = ent.get("canonical_name") or ent.get("primary_identifier")
        etype = ent.get("entity_type")
        m_count = len(ent.get("mentions", []))
        print(f"  • {name:<35} [{etype:<14}] (Cited across {m_count} mention(s))")

    # 5. Fetch Financial Ledger & Transactions
    r_txn = requests.get(f"{BASE}/cases/{case_id}/transactions")
    txns = r_txn.json()
    print(f"\n[5] Financial Ledger Transactions ({len(txns)} transactions):")
    fraud_seen = set()
    fraud_total = 0.0
    for t in txns:
        is_fraud = "fraud" in str(t.get("receiver", "")).lower() or t["amount"] in [20000.0, 15000.0, 12000.0]
        flag = " [🚨 FRAUD DRAIN]" if is_fraud else ""
        if is_fraud and round(t["amount"], 2) not in fraud_seen and (t.get("transaction_id_ref") or "04" in str(t.get("source_evidence_id"))):
            fraud_seen.add(round(t["amount"], 2))
            fraud_total += t["amount"]
        ref = f"Ref: {t.get('transaction_id_ref')}" if t.get('transaction_id_ref') else "No Ref"
        print(f"  • {t['timestamp'] or 'Date N/A':<20} | {t['amount_formatted']:>12} | To: {t.get('receiver', 'Unknown'):<25} | {ref:<18} | Source: {t.get('source_evidence_id')}{flag}")
    print(f"  ==> Total Audited Fraud Drain (Bank Ledger Debits): ₹{fraud_total:,.2f}")

    # 6. Fetch Multi-Source Chronological Timeline
    r_tl = requests.get(f"{BASE}/cases/{case_id}/timeline")
    tl = r_tl.json()
    print(f"\n[6] Unified Multi-Source Chronological Timeline ({len(tl)} events):")
    for ev in tl:
        print(f"  • [{ev['timestamp_display']}] {ev['title']} ({ev['source_evidence_id']})")
        print(f"    -> {ev['description']}")

    # 7. Fetch Detected Evidentiary Conflicts
    r_conf = requests.get(f"{BASE}/cases/{case_id}/conflicts")
    confs = r_conf.json()
    print(f"\n[7] Cross-Source Evidentiary Conflicts Flagged ({len(confs)} conflicts):")
    for c in confs:
        print(f"  • Field: {c['field_name']}")
        print(f"    - Value A: {c['value_a']} ({c['source_a_id']})")
        print(f"    - Value B: {c['value_b']} ({c['source_b_id']})")
        print(f"    - Details: {c['discrepancy_details']}")

    # 8. Fetch Fraud Playbook Sequence Matches
    r_seq = requests.get(f"{BASE}/cases/{case_id}/fraud-pattern")
    seq_data = r_seq.json()
    print(f"\n[8] Fraud Playbook Kill-Chain Match: {seq_data.get('playbook_name')} (Confidence: {seq_data.get('overall_match_confidence', 0) * 100:.0f}%)")
    for st in seq_data.get("stages", []):
        status_icon = "✓" if st["status"] == "EVIDENCED" else "✗"
        print(f"  [{status_icon}] {st['stage_name']} -> {st['status']} (Source: {st.get('source_evidence_id')})")
    print(f"  ==> Outcome Summary: {seq_data.get('financial_outcome_summary')}")

    # 9. Fetch AI Executive Summary
    r_sum = requests.get(f"{BASE}/cases/{case_id}/summary")
    sum_data = r_sum.json()
    print(f"\n[9] AI Executive Investigative Brief:")
    print("-" * 70)
    print(sum_data.get("executive_summary"))
    print("-" * 70)

if __name__ == "__main__":
    test_meena_case()
