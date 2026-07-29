"""
Text extraction from uploaded resume files (PDF/DOCX). Pure synchronous
logic, no AI calls here -- those live in tasks/resume_tasks.py.
"""

import io

import pypdf
from docx import Document

from app.core.logging import get_logger

logger = get_logger(__name__)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs)


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    if not filename:
        raise ValueError("Filename is required")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError(f"File exceeds {MAX_FILE_SIZE_BYTES} byte limit")

    lower = filename.lower()
    if lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif lower.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        raise ValueError("Unsupported file type. Only PDF and DOCX are accepted.")

    if not text.strip():
        raise ValueError(
            "Could not extract any text from this file. "
            "It may be a scanned image without OCR text."
        )

    logger.info("Extracted resume text: filename=%s chars=%d", filename, len(text))
    return text
