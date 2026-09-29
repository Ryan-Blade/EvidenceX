import re
import os
from typing import Tuple

class OCREngine:
    @staticmethod
    def normalize_text(text: str) -> str:
        if not text:
            return ""
        # Standardize curly quotes and hyphens
        normalized = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
        normalized = normalized.replace("—", "-").replace("–", "-")
        # Standardize Indian currency representations for normalization
        normalized = re.sub(r'INR\s*\([nI]\)', 'INR', normalized)
        normalized = re.sub(r'(?:^|[\s(])[nI]([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)', r' Rs. \1', normalized)
        normalized = re.sub(r'₹\s*', 'Rs. ', normalized)
        normalized = re.sub(r'INR\s*', 'Rs. ', normalized)
        # Collapse excessive whitespace
        normalized = re.sub(r'[ \t]+', ' ', normalized)
        normalized = re.sub(r'\n\s*\n', '\n\n', normalized)
        return normalized.strip()

    @classmethod
    def extract_text_from_file(cls, file_path: str, file_type: str) -> Tuple[str, str, float, int]:
        """
        Extracts structured text from raw evidence file.
        Supports: PDF, Images (PNG/JPG/JPEG via RapidOCR), Excel (XLSX/XLS), Word (DOCX/DOC), Text/CSV/JSON/LOG.
        Returns: (raw_text, normalized_text, confidence_score, word_count)
        """
        if not os.path.exists(file_path):
            return "", "", 0.0, 0

        ext = os.path.splitext(file_path)[1].lower()

        # 1. Plain Text, CSV, JSON, LOG
        if ext in [".txt", ".csv", ".json", ".log"]:
            try:
                raw_text = ""
                for enc in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
                    try:
                        with open(file_path, "r", encoding=enc) as f:
                            raw_text = f.read()
                            break
                    except UnicodeDecodeError:
                        continue
                if not raw_text:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        raw_text = f.read()
                norm = cls.normalize_text(raw_text)
                words = len(norm.split())
                return raw_text, norm, 0.99, words
            except Exception as e:
                return f"[Text extraction error: {str(e)}]", "", 0.0, 0

        # 2. Excel Spreadsheets (XLSX, XLS)
        if ext in [".xlsx", ".xls"]:
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, data_only=True)
                lines = []
                for sheetname in wb.sheetnames:
                    ws = wb[sheetname]
                    lines.append(f"=== Sheet: {sheetname} ===")
                    for row in ws.iter_rows(values_only=True):
                        if any(c is not None and str(c).strip() != "" for c in row):
                            row_vals = [str(c).strip() if c is not None else "" for c in row]
                            lines.append(" | ".join(row_vals))
                    lines.append("")
                raw_text = "\n".join(lines).strip()
                norm = cls.normalize_text(raw_text)
                return raw_text, norm, 0.98, len(norm.split())
            except Exception as e:
                return f"[Excel extraction error: {str(e)}]", "", 0.0, 0

        # 3. Word Documents (DOCX, DOC)
        if ext in [".docx", ".doc"]:
            try:
                import docx
                doc = docx.Document(file_path)
                lines = []
                for p in doc.paragraphs:
                    if p.text.strip():
                        lines.append(p.text)
                for table in doc.tables:
                    for row in table.rows:
                        row_vals = [c.text.strip() for c in row.cells if c.text.strip()]
                        if row_vals:
                            lines.append(" | ".join(row_vals))
                raw_text = "\n\n".join(lines).strip()
                norm = cls.normalize_text(raw_text)
                return raw_text, norm, 0.98, len(norm.split())
            except Exception as e:
                return f"[DOCX extraction error: {str(e)}]", "", 0.0, 0

        # 4. PDF Documents
        if ext == ".pdf":
            try:
                extracted_pages = []
                extracted_tables_text = []

                # Extract using pdfplumber
                try:
                    import pdfplumber
                    with pdfplumber.open(file_path) as pdf:
                        for page in pdf.pages:
                            page_text = page.extract_text()
                            if page_text:
                                extracted_pages.append(page_text)
                            
                            tables = page.extract_tables()
                            for tbl in tables:
                                for row in tbl:
                                    clean_row = [str(c).strip() for c in row if c is not None]
                                    if clean_row:
                                        extracted_tables_text.append(" | ".join(clean_row))
                except Exception:
                    pass

                # Fallback to PyMuPDF (fitz)
                if not extracted_pages:
                    try:
                        import fitz
                        doc = fitz.open(file_path)
                        for page in doc:
                            t = page.get_text()
                            if t:
                                extracted_pages.append(t)
                    except Exception:
                        pass

                full_text = "\n\n".join(extracted_pages)
                if extracted_tables_text:
                    full_text += "\n\n--- STRUCTURED TABLE EXTRACT ---\n" + "\n".join(extracted_tables_text)

                if len(full_text.strip()) > 10:
                    norm = cls.normalize_text(full_text)
                    return full_text, norm, 0.98, len(norm.split())
                else:
                    # PDF has empty text layer (scanned image inside PDF) -> OCR the pages
                    try:
                        import fitz
                        from rapidocr_onnxruntime import RapidOCR
                        ocr = RapidOCR()
                        doc = fitz.open(file_path)
                        ocr_lines = []
                        for page in doc:
                            pix = page.get_pixmap()
                            img_bytes = pix.tobytes("png")
                            ocr_res, _ = ocr(img_bytes)
                            if ocr_res:
                                for line in ocr_res:
                                    ocr_lines.append(line[1])
                        if ocr_lines:
                            full_text = "\n".join(ocr_lines)
                            norm = cls.normalize_text(full_text)
                            return full_text, norm, 0.92, len(norm.split())
                    except Exception:
                        pass
                    return "[PDF empty text layer]", "", 0.0, 0
            except Exception as e:
                return f"[PDF parsing error: {str(e)}]", "", 0.0, 0

        # 5. Images (PNG / JPG / JPEG) via RapidOCR
        if ext in [".png", ".jpg", ".jpeg"]:
            try:
                from rapidocr_onnxruntime import RapidOCR
                ocr = RapidOCR()
                result, elapse = ocr(file_path)
                if result:
                    lines = [line[1] for line in result]
                    raw_text = "\n".join(lines)
                    avg_conf = sum(line[2] for line in result) / len(result)
                    norm = cls.normalize_text(raw_text)
                    return raw_text, norm, float(avg_conf), len(norm.split())
                else:
                    return f"[No text detected in image {os.path.basename(file_path)}]", "", 0.0, 0
            except Exception as e:
                return f"[Image OCR error: {str(e)}]", "", 0.0, 0

        return "", "", 0.0, 0
