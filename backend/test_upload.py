import urllib.request
import json
import os

def test_single_case_ingestion():
    # 1. Create a fresh test case
    req_data = json.dumps({
        "title": "Aarav Mehta Online Banking Discrepancy",
        "incident_type": "Banking Discrepancy & Impersonation",
        "description": "Case initiated to investigate unusual card transaction of Rs. 24,999 on 14 Sep 2026.",
        "incident_date": "14 Sep 2026",
        "investigator_name": "Insp. Vikram Rathore (Cyber Crime Cell)",
        "priority": "HIGH"
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/cases",
        data=req_data,
        headers={"Content-Type": "application/json"}
    )

    with urllib.request.urlopen(req) as resp:
        case_res = json.loads(resp.read().decode("utf-8"))
        case_id = case_res["id"]
        print("1. Created Case:", case_id, "-", case_res["title"])

    # 2. Upload mock_bank_statement_single_case.pdf
    file_path = r"C:\Users\sulph\Downloads\mock_bank_statement_single_case.pdf"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    delimiter = f"--{boundary}\r\n".encode("utf-8")
    header = (
        f'Content-Disposition: form-data; name="file"; filename="mock_bank_statement_single_case.pdf"\r\n'
        f'Content-Type: application/pdf\r\n\r\n'
    ).encode("utf-8")
    footer = f"\r\n--{boundary}--\r\n".encode("utf-8")
    
    body = delimiter + header + file_bytes + footer

    upload_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/cases/{case_id}/evidence/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    with urllib.request.urlopen(upload_req) as resp:
        upload_res = json.loads(resp.read().decode("utf-8"))
        print("2. Upload Response:", upload_res)

    # 3. Check Entities
    with urllib.request.urlopen(f"http://127.0.0.1:8000/api/cases/{case_id}/entities") as resp:
        entities = json.loads(resp.read().decode("utf-8"))
        print(f"\n3. Entities ({len(entities)} found):")
        for ent in entities:
            print(f"   • [{ent['entity_type']}] {ent['canonical_name']} (Mentions: {len(ent['mentions'])})")

    # 4. Check Transactions
    with urllib.request.urlopen(f"http://127.0.0.1:8000/api/cases/{case_id}/transactions") as resp:
        transactions = json.loads(resp.read().decode("utf-8"))
        print(f"\n4. Transactions ({len(transactions)} parsed):")
        for t in transactions:
            amt = str(t['amount_formatted']).replace('\u20b9', 'Rs. ')
            print(f"   * {t['timestamp']} | {t['payment_method']} | To: {t['receiver']} | {amt} | Status: {t['reconciliation_status']} | Ref: {t['transaction_id_ref']}")

    # 5. Check Timeline
    with urllib.request.urlopen(f"http://127.0.0.1:8000/api/cases/{case_id}/timeline") as resp:
        timeline = json.loads(resp.read().decode("utf-8"))
        print(f"\n5. Timeline Events ({len(timeline)} events):")
        for ev in timeline:
            desc = str(ev['description']).replace('\u20b9', 'Rs. ')
            title = str(ev['title']).replace('\u20b9', 'Rs. ')
            print(f"   * [{ev['timestamp_display']}] {title} - {desc}")

    # 6. Check AI Summary
    with urllib.request.urlopen(f"http://127.0.0.1:8000/api/cases/{case_id}/summary") as resp:
        summary = json.loads(resp.read().decode("utf-8"))
        print(f"\n6. Dynamic AI Executive Summary:")
        exec_sum = str(summary.get('executive_summary', '')).replace('\u20b9', 'Rs. ')
        print(f"   {exec_sum}")

if __name__ == "__main__":
    test_single_case_ingestion()
