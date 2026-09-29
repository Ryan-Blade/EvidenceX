import requests
import json

pdf_path = r'C:\Users\sulph\Downloads\mock_bank_statement_single_case.pdf'

# 1. Create a new case
create_payload = {
    'title': 'Aarav Mehta Unauthorized Bank Exfiltration',
    'incident_type': 'E-Commerce Payment Fraud',
    'description': 'Victim observed unauthorized debit of ₹24,999 from SBI Account XXXX XXXX 4821.',
    'incident_date': '2026-09-24',
    'investigator_name': 'Insp. Vikram Rathore',
    'priority': 'HIGH',
    'victim_initial_notes': 'Complainant reports they never authorized the 24,999 payment to Online Electronics.'
}
res_c = requests.post('http://127.0.0.1:8000/api/cases', json=create_payload)
print('1. Case Creation Status:', res_c.status_code, res_c.json()['id'])
case_id = res_c.json()['id']

# 2. Upload the mock_bank_statement_single_case.pdf
with open(pdf_path, 'rb') as f:
    files = {'file': ('mock_bank_statement_single_case.pdf', f, 'application/pdf')}
    res_up = requests.post(f'http://127.0.0.1:8000/api/cases/{case_id}/evidence/upload', files=files)
print('2. Evidence Upload Status:', res_up.status_code, res_up.json())

# 3. Check all section endpoints
sections = {
    'Overview': f'http://127.0.0.1:8000/api/cases/{case_id}',
    'Evidence': f'http://127.0.0.1:8000/api/cases/{case_id}/evidence',
    'Entities': f'http://127.0.0.1:8000/api/cases/{case_id}/entities',
    'Transactions': f'http://127.0.0.1:8000/api/cases/{case_id}/transactions',
    'Timeline': f'http://127.0.0.1:8000/api/cases/{case_id}/timeline',
    'Conflicts': f'http://127.0.0.1:8000/api/cases/{case_id}/conflicts',
    'Missing Info': f'http://127.0.0.1:8000/api/cases/{case_id}/missing-info',
    'Structural Flags': f'http://127.0.0.1:8000/api/cases/{case_id}/structural-flags',
    'Fraud Pattern': f'http://127.0.0.1:8000/api/cases/{case_id}/fraud-pattern',
    'Summary': f'http://127.0.0.1:8000/api/cases/{case_id}/summary'
}

print(f"\n=== SECTION DATA AUDIT FOR {case_id} ===")
for name, url in sections.items():
    r = requests.get(url)
    data = r.json()
    count_info = len(data) if isinstance(data, list) else (len(data.keys()) if isinstance(data, dict) else 'N/A')
    print(f"[{name}]: HTTP {r.status_code} | Records/Keys: {count_info}")
    if name == 'Entities':
        print("   Extracted Entities:", [e['canonical_name'] + ' (' + e['entity_type'] + ')' for e in data])
    elif name == 'Transactions':
        total_amt = sum(t['amount'] for t in data)
        print(f"   Total Txns: {len(data)}, Cumulative: INR {total_amt:,.2f}")
        for t in data[:5]:
            amt_clean = t['amount_formatted'].replace('₹', 'INR ')
            print(f"     * {amt_clean} | {t['sender']} -> {t['receiver']} | Method: {t['payment_method']} | Ref: {t['transaction_id_ref']}")

    elif name == 'Timeline':
        print(f"   Total Timeline Nodes: {len(data)}")
        for ev in data[:4]:
            t_clean = ev['title'].replace('₹', 'INR ')
            print(f"     * [{ev['source_evidence_id']}] {ev['timestamp_display']}: {t_clean}")
    elif name == 'Summary':
        s_clean = data.get('executive_summary', '').replace('₹', 'INR ')
        print("   Executive Summary:\n  ", s_clean[:300] + "...")

# 4. Multi-Case Switch Isolation Test
print("\n=== MULTI-CASE ISOLATION CHECK (PREVIOUS vs NEW CASE) ===")
cases_to_compare = ['CASE-2026-8841', case_id]
for cid in cases_to_compare:
    c_info = requests.get(f'http://127.0.0.1:8000/api/cases/{cid}').json()
    c_txns = requests.get(f'http://127.0.0.1:8000/api/cases/{cid}/transactions').json()
    c_ents = requests.get(f'http://127.0.0.1:8000/api/cases/{cid}/entities').json()
    print(f"Case {cid} ('{c_info['title']}'): {len(c_ents)} entities, {len(c_txns)} transactions, Status: {c_info['status']}")

print("\nAudit completed successfully!")

