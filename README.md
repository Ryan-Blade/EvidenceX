# EvidenceX — Cyber Incident Forensics & Evidence Structuring Plane

EvidenceX is a digital forensics and investigation-support system designed to ingest, parse, correlate, and structure multi-source evidence from online financial fraud incidents.

When cyber incidents occur, evidence is often scattered across chat exports, call logs, bank statements, SMS alert screenshots, spreadsheets, and Word documents. EvidenceX consolidates these disparate files into a unified case dossier with digital chain-of-custody verification, an audited financial ledger, resolved entity intelligence graphs, cross-source conflict detection, scam kill-chain matching, and redacted court-ready exports.

---

## Key Features

- **Multi-Format Ingestion**: Supports `.pdf`, `.png`, `.jpg`, `.jpeg`, `.xlsx`, `.docx`, `.txt`, `.csv`, `.json`, and `.zip` archive packages up to 50MB.
- **Digital Chain of Custody**: Computes immutable SHA-256 cryptographic hashes immediately upon ingestion to anchor file integrity before parsing.
- **Embedded OCR & Table Extraction**: Uses local `RapidOCR`, `PyMuPDF`, `openpyxl`, and `python-docx` for reliable offline text and tabular data extraction without external binary dependencies.
- **Source-Grounded Entity Resolution**: Extracts and clusters telephone numbers, UPI Virtual Payment Addresses (VPAs), bank accounts, transaction reference numbers (UTRs), email addresses, and suspect URLs with substring verification against raw source text.
- **Reconciled Financial Ledger**: Parses transaction rows from statements, SMS notifications, and spreadsheets into an audited chronological ledger with running-balance and UTR matching.
- **Cross-Source Conflict Detection**: Automatically identifies evidentiary contradictions (e.g., victim recollection estimates vs. audited statement sums, or caller identities vs. published bank helplines).
- **Fraud Kill-Chain Playbooks**: Evaluates incident progression against standard fraud playbooks (e.g., Banking Impersonation & Credential Harvesting, Task/Investment Scams, Electricity Bill Phishing) across discrete evidenced stages.
- **Privacy-by-Design PII Redaction**: Masks phone numbers, emails, accounts, and VPAs across all views and report exports in compliance with data protection regulations. PINs and OTPs are permanently redacted (`****`).
- **Multi-Format Export Engine**: Generates court-admissible PDF dossiers with inline source citations, RFC 4180-compliant CSV forensic ledgers, SHA-256 Chain-of-Custody text manifests, and JSON case graphs.
- **Offline First**: Runs completely locally with deterministic heuristics. Optional LLM enhancement available for Google Gemini or OpenAI when API keys are configured.

---

## Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │        Multi-Modal Evidence Intake     │
                        │ (PDF, JPG, PNG, XLSX, DOCX, TXT, ZIP)  │
                        └───────────────────┬────────────────────┘
                                            │
                                  [SHA-256 Integrity]
                                            ▼
                        ┌────────────────────────────────────────┐
                        │      OCR & Document Parsing Engine     │
                        │ (RapidOCR / PyMuPDF / OpenPyXL / Docx) │
                        └───────────────────┬────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │      Extraction & Entity Resolver      │
                        │    (Grounding Verification & PII)      │
                        └─────────┬───────────────────┬──────────┘
                                  │                   │
                  ┌───────────────┴─────────┐         └────────────────────────┐
                  ▼                         ▼                                  ▼
        ┌───────────────────┐     ┌───────────────────┐              ┌───────────────────┐
        │  Financial Ledger │     │ Entity Graph &    │              │ Chronological     │
        │ & Reconciliation  │     │ Contradiction Diff│              │ Timeline Engine   │
        └─────────┬─────────┘     └─────────┬─────────┘              └─────────┬─────────┘
                  │                         │                                  │
                  └─────────────────────────┼──────────────────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │      Fraud Playbook Matcher & RAG      │
                        │     (Kill-Chain Sequence Analysis)     │
                        └───────────────────┬────────────────────┘
                                            │
                                            ▼
                        ┌────────────────────────────────────────┐
                        │       Redacted Multi-Format Export     │
                        │     (PDF / CSV / JSON / Manifest)      │
                        └────────────────────────────────────────┘
```

---

## Project Structure

```
EvidenceX/
├── backend/
│   ├── data/                   # Database file and uploaded evidence directory
│   ├── services/
│   │   ├── ai_extraction.py    # Schema-locked fact extraction and grounding
│   │   ├── conflict_detector.py# Sourced contradiction and discrepancy engine
│   │   ├── entity_resolver.py  # Canonical entity linking and alias graph
│   │   ├── fingerprint_engine.py# Scammer profile and signature matching
│   │   ├── ingestion.py        # File validation, MIME check, and hash generation
│   │   ├── missing_info.py     # Evidentiary gap detection and Section 91 notices
│   │   ├── ocr_engine.py       # OCR, PDF raster fallback, Excel, and Docx parsing
│   │   ├── pii_masker.py       # Masking and irreversible redaction engine
│   │   ├── report_exporter.py  # PDF, CSV, JSON, and SHA-256 manifest generators
│   │   ├── sequence_engine.py  # Scam kill-chain playbook matching
│   │   ├── structural_analyzer.py # Document anomaly and balance checker
│   │   ├── summary_generator.py# Executive brief and RAG snapshot synthesizer
│   │   └── threat_intel.py     # Domain and URL threat correlation
│   ├── database.py             # SQLite / SQLAlchemy connection management
│   ├── models.py               # Relational schema (18 database models)
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── main.py                 # FastAPI application routes
│   └── requirements.txt        # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # Modular UI views and dialogs
│   │   ├── types/              # TypeScript interface definitions
│   │   ├── App.tsx             # Root application router and state
│   │   └── index.css           # Styling configuration
│   ├── package.json            # Frontend npm package manifest
│   └── vite.config.ts          # Vite bundler configuration
├── sample_evidence_files/      # Sample test transcripts and statement excerpts
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```

---

## Getting Started

### Prerequisites

- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: 18.x or later with `npm`

---

### Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI development server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

The API will be available at `http://127.0.0.1:8000`.
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Specifications**: `http://127.0.0.1:8000/redoc`

---

### Frontend Setup

1. Open a separate terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 3000
   ```

4. Open `http://127.0.0.1:3000` in your web browser.

---

## API Configuration & Offline Mode

- **Deterministic Offline Mode**: By default, EvidenceX uses regex and deterministic rule engines for OCR, parsing, entity extraction, conflict detection, and report generation without requiring any external network requests or API keys.
- **Optional LLM Integration**: If you wish to use Google Gemini or OpenAI for generative narrative drafting, you can supply your API key directly through the in-app **Settings** panel or via environment configuration. Keys are stored locally and are never transmitted to third parties or logged in public exports.

---

## Exporting Forensic Artifacts

From the **Final Report** view, investigators can download four standardized formats:

1. **PDF Forensic Dossier (`/api/cases/{case_id}/report/pdf`)**: Formatted multi-page case report containing executive findings, narrative timeline, audited ledger, and evidence tables.
2. **CSV Forensic Ledger (`/api/cases/{case_id}/report/csv`)**: Standardized CSV file detailing all transaction indices, UTRs, counterparties, chain-of-custody checksums, entities, conflicts, and narrative events with UTF-8 BOM encoding for direct spreadsheet analysis.
3. **SHA-256 Hash Manifest (`/api/cases/{case_id}/report/manifest`)**: Plaintext custody document certifying initial binary checksums for legal admissibility.
4. **JSON Case Graph (`/api/cases/{case_id}/report/json`)**: Structured, machine-readable JSON representation of the entire case graph.

*All export formats apply automated PII redaction by default to preserve victim and third-party privacy.*

---

## License

This project is released under the [MIT License](LICENSE).
