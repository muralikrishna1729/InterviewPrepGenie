"""
Per-user default resume stored on disk (no DB column needed).

Layout: <uploads_dir>/<user_id>/resume<ext>
A user has at most one default resume; uploading a new one replaces it.
Filename is preserved so the client can show a friendly name.
"""

from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


def _user_dir(user_id: str) -> Path:
    return UPLOADS_DIR / user_id


def _resume_path(user_id: str) -> Path:
    """Current resume path for a user (first matching extension)."""
    udir = _user_dir(user_id)
    for ext in ALLOWED_EXTENSIONS:
        p = udir / f"resume{ext}"
        if p.exists():
            return p
    return udir / "resume.pdf"  # default target path when uploading


def save_default_resume(user_id: str, filename: str, file_bytes: bytes) -> str:
    """Save (or replace) a user's default resume. Returns the stored filename."""
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File exceeds 5 MB limit")

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported file type. Only PDF and DOCX are accepted.")

    udir = _user_dir(user_id)
    udir.mkdir(parents=True, exist_ok=True)
    # Remove any previous resume file
    for old in udir.glob("resume.*"):
        old.unlink(missing_ok=True)

    target = udir / f"resume{ext}"
    target.write_bytes(file_bytes)
    logger.info("Default resume saved: user_id=%s filename=%s", user_id, filename)
    return filename


def get_default_resume(user_id: str) -> tuple[str | None, str | None]:
    """Return (stored_filename, bytes) or (None, None) if no default resume."""
    path = _resume_path(user_id)
    if not path.exists():
        return None, None
    return path.name, path.read_bytes()


def delete_default_resume(user_id: str) -> bool:
    """Remove a user's default resume. Returns True if one was removed."""
    udir = _user_dir(user_id)
    removed = False
    for old in udir.glob("resume.*"):
        old.unlink(missing_ok=True)
        removed = True
    if removed:
        logger.info("Default resume removed: user_id=%s", user_id)
    return removed
