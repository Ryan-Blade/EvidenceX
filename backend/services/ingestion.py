import hashlib
import os
import re
import shutil
from typing import Tuple, Dict, Any
from fastapi import UploadFile, HTTPException
from database import EVIDENCE_STORAGE_DIR

ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".pdf", ".txt", ".csv", ".json", ".log", ".zip",
    ".xlsx", ".xls", ".docx", ".doc"
}
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 # 50 MB

class IngestionService:
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        clean = os.path.basename(filename)
        clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', clean)
        return clean or "evidence_file"

    @classmethod
    def validate_file(cls, filename: str, content: bytes, mime_type: str = None) -> None:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '{ext}'. Allowed types: PNG, JPG, JPEG, PDF, TXT, CSV, JSON, LOG, XLSX, DOCX, ZIP."
            )
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum limit of 50MB. Actual size: {len(content)/(1024*1024):.2f}MB."
            )

    @classmethod
    def extract_zip_archive(cls, zip_content: bytes) -> list:
        """
        Extract valid evidence files from a ZIP archive in memory.
        Filters out directories, MacOS metadata files (__MACOSX, .DS_Store), and unsupported formats.
        Returns a list of tuples: (filename: str, file_bytes: bytes, mime_type: str)
        """
        import io
        import zipfile
        import mimetypes

        extracted_files = []
        valid_inner_exts = {
            ".png", ".jpg", ".jpeg", ".pdf", ".txt", ".csv", ".json", ".log",
            ".xlsx", ".xls", ".docx", ".doc"
        }

        try:
            with zipfile.ZipFile(io.BytesIO(zip_content)) as z:
                for file_info in z.infolist():
                    if file_info.is_dir():
                        continue
                    
                    # Normalize filename and path
                    filename = os.path.basename(file_info.filename)
                    if not filename or filename.startswith(".") or "__MACOSX" in file_info.filename:
                        continue
                    
                    ext = os.path.splitext(filename)[1].lower()
                    if ext not in valid_inner_exts:
                        continue

                    # Read content
                    file_bytes = z.read(file_info.filename)
                    if len(file_bytes) == 0:
                        continue

                    mime_type, _ = mimetypes.guess_type(filename)
                    extracted_files.append((filename, file_bytes, mime_type or "application/octet-stream"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to unpack ZIP archive: {str(e)}")

        return extracted_files

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @classmethod
    def check_tamper_signals(cls, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Lightweight authenticity-signal check (image metadata / heuristic check).
        EXPLICITLY LABELED AS 'signal, not proof' in UI, never a fraud/authenticity verdict.
        """
        ext = os.path.splitext(filename)[1].lower()
        signals = {
            "has_exif_metadata": False,
            "software_editor_detected": None,
            "suspicious_compression_artifact": False,
            "aspect_ratio_match_standard_mobile": True,
            "verdict_disclaimer": "Signal indicator only. Requires human digital forensics verification."
        }

        # Check for PNG/JPEG headers
        if ext in [".jpg", ".jpeg"]:
            try:
                # Basic string inspection in byte stream for common editing software
                content_str = content[:4096].decode("latin-1", errors="ignore")
                for tool in ["Photoshop", "Canva", "GIMP", "PicsArt", "Pixelmator"]:
                    if tool.lower() in content_str.lower():
                        signals["software_editor_detected"] = tool
                        break
                signals["has_exif_metadata"] = b"Exif" in content[:1024]
            except Exception:
                pass
        return signals

    @classmethod
    def store_file(cls, case_id: str, evidence_num_str: str, filename: str, content: bytes) -> Tuple[str, str]:
        sanitized = cls.sanitize_filename(filename)
        dest_filename = f"{case_id}_{evidence_num_str}_{sanitized}"
        dest_path = os.path.join(EVIDENCE_STORAGE_DIR, dest_filename)
        with open(dest_path, "wb") as f:
            f.write(content)
        return dest_path, dest_filename
