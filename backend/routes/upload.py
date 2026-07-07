"""
============================================================
StudyAI Backend — Upload Route
============================================================
POST /api/upload — Accept PDF/DOCX/TXT/MD files or raw text,
extract content, store in Firebase/local storage, and return
document metadata. Protected by authentication.
"""

from __future__ import annotations

from flask import Blueprint, request, g
from werkzeug.utils import secure_filename

from services.file_parser import parse_file, parse_raw_text
from services.firebase_service import StorageRouter
from models.study_material import StudyMaterial
from middleware.auth_middleware import login_required
from utils.helpers import generate_uuid, success_response, error_response
from utils.validators import validate_file_upload, validate_required_fields, sanitize_string
from utils.logger import get_logger
from config import get_config

logger = get_logger(__name__)
Config = get_config()

upload_bp = Blueprint("upload", __name__)


@upload_bp.post("/upload")
@login_required
def upload_document():
    """
    Upload a study document (file or raw text). Protected.

    Accepts:
        - Multipart file upload (PDF, DOCX, TXT, MD)
        - JSON body with ``raw_text`` and optional ``title``

    Returns:
        ``{ success, document_id, title, word_count, created_at }``
    """
    try:
        logger.debug("[TRACE upload_document] Starting upload_document()")
        logger.debug("[TRACE upload_document] request.method: %s", request.method)
        logger.debug("[TRACE upload_document] request.content_type: %s", request.content_type)
        logger.debug("[TRACE upload_document] request.content_length: %s", request.content_length)
        logger.debug("[TRACE upload_document] request.files.keys(): %s", list(request.files.keys()))
        logger.debug("[TRACE upload_document] request.form.keys(): %s", list(request.form.keys()))

        user_id = g.user_id

        # ── 1. Check if it's a multipart upload ───────────────
        is_multipart = request.content_type and "multipart/form-data" in request.content_type
        has_file = "file" in request.files

        if has_file or is_multipart:
            logger.debug("[TRACE upload_document] Routing to file upload handler")
            res = _handle_file_upload(user_id)
            logger.debug("[TRACE upload_document] File upload handler returned")
            return res

        # ── 2. Check if request.files is empty, process raw text ──
        if not request.files:
            # Check if it has JSON or json content type
            is_json = request.is_json or (request.content_type and "application/json" in request.content_type)
            if is_json:
                logger.debug("[TRACE upload_document] Routing to raw text handler")
                res = _handle_raw_text(user_id)
                logger.debug("[TRACE upload_document] Raw text handler returned")
                return res

        # ── 3. Fallback / Invalid Request ─────────────────────
        logger.warning("[TRACE upload_document] Request did not match file upload or raw text handler logic.")
        return error_response("Invalid request. Provide a file with key 'file' or JSON with 'raw_text'.", 400)

    except Exception as exc:
        logger.exception("Unexpected exception in upload_document: %s", exc)
        return error_response(f"An unexpected error occurred: {str(exc)}", 500)


# ── GET /api/upload/<doc_id> — retrieve a document ───────

@upload_bp.get("/upload/<doc_id>")
@login_required
def get_document(doc_id: str):
    """
    Retrieve a stored document by ID. Protected.
    """
    router = StorageRouter("materials")
    doc = router.get(doc_id)
    if doc is None:
        return error_response(f"Document '{doc_id}' not found.", 404)

    # Prevent cross-user data leakage
    if doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to access this document.", 403)

    material = StudyMaterial.from_dict(doc)
    return success_response(
        data=material.to_response_dict(),
        message="Document retrieved successfully.",
    )


@upload_bp.get("/upload")
@login_required
def list_documents():
    """
    List all documents for the authenticated user. Protected.
    """
    user_id = g.user_id
    router = StorageRouter("materials")
    docs = router.filter_by_user(user_id)
    materials = [StudyMaterial.from_dict(d).to_response_dict() for d in docs]

    return success_response(
        data={"documents": materials, "count": len(materials)},
        message=f"Found {len(materials)} document(s).",
    )


@upload_bp.get("/upload")
@login_required
def list_documents_stub():
    pass


@upload_bp.delete("/upload/<doc_id>")
@login_required
def delete_document(doc_id: str):
    """Delete a document by ID. Protected."""
    router = StorageRouter("materials")
    doc = router.get(doc_id)
    if doc is None:
        return error_response(f"Document '{doc_id}' not found.", 404)

    if doc.get("user_id") != g.user_id:
        return error_response("Unauthorized to delete this document.", 403)

    deleted = router.delete(doc_id)
    if not deleted:
        return error_response("Failed to delete document.", 500)

    logger.info("Document deleted: %s", doc_id)
    return success_response(message="Document deleted successfully.")


# ── Private helpers ───────────────────────────────────────

def _handle_raw_text(user_id: str):
    """Process a raw text submission from a JSON body."""
    body = request.json or {}
    raw_text = sanitize_string(body.get("raw_text", ""))
    title = sanitize_string(body.get("title", "Untitled"))

    if not raw_text:
        return error_response("'raw_text' is required for text submissions.", 400)
    if len(raw_text) < 20:
        return error_response("'raw_text' is too short (minimum 20 characters).", 400)
    if len(raw_text) > 500_000:
        return error_response("'raw_text' exceeds the 500,000 character limit.", 413)

    parsed = parse_raw_text(raw_text, title=title or "Untitled")
    tags = [t.strip() for t in body.get("tags", "").split(",") if t.strip()]
    return _save_and_respond(parsed, user_id, tags, filepath="", size_bytes=len(raw_text.encode()))


def _handle_file_upload(user_id: str):
    """Process a multipart file upload."""
    logger.debug("[TRACE _handle_file_upload] Starting _handle_file_upload() for user: %s", user_id)
    logger.debug("[TRACE _handle_file_upload] request.files keys: %s", list(request.files.keys()))
    if "file" not in request.files:
        logger.debug("[TRACE _handle_file_upload] No 'file' key in request.files. Keys present: %s", list(request.files.keys()))
        return error_response("No file part in the request. Use field name 'file'.", 400)

    file = request.files["file"]
    logger.debug("[TRACE _handle_file_upload] File received: name=%s", file.filename)

    # Validate the file
    logger.debug("[TRACE _handle_file_upload] Before validate_file_upload()")
    is_valid, err = validate_file_upload(file)
    logger.debug("[TRACE _handle_file_upload] After validate_file_upload(): is_valid=%s, err=%s", is_valid, err)
    if not is_valid:
        logger.debug("[TRACE _handle_file_upload] Validation failed: %s", err)
        return error_response(err, 400)

    # Generate a unique filename and save
    doc_id = generate_uuid()
    original_name = file.filename
    safe_name = secure_filename(original_name)
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    stored_filename = f"{doc_id}.{ext}"

    user_upload_dir = Config.UPLOAD_FOLDER / user_id
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = user_upload_dir / stored_filename

    logger.debug("[TRACE _handle_file_upload] Before file.save() to: %s", filepath)
    try:
        file.save(filepath)
        size_bytes = filepath.stat().st_size
        logger.debug("[TRACE _handle_file_upload] After file.save() success. size=%d bytes", size_bytes)
    except OSError as exc:
        logger.error("[TRACE _handle_file_upload] File save failed: %s", exc)
        return error_response("Failed to save file. Please try again.", 500)

    tags_raw = request.form.get("tags", "")
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
    logger.debug("[TRACE _handle_file_upload] tags extracted: %s", tags)

    # Create a placeholder document
    material = StudyMaterial(
        id=doc_id,
        user_id=user_id,
        title=original_name,
        filename=stored_filename,
        original_name=original_name,
        filepath=str(filepath),
        extension=ext,
        content="",
        word_count=0,
        char_count=0,
        page_count=0,
        size_bytes=size_bytes,
        tags=tags,
        status="processing",
    )

    router = StorageRouter("materials")
    logger.debug("[TRACE _handle_file_upload] Before StorageRouter.create() for doc_id: %s", doc_id)
    try:
        router.create(doc_id, material.to_dict())
        logger.debug("[TRACE _handle_file_upload] StorageRouter.create() completed successfully")
    except Exception as exc:
        logger.error("[TRACE _handle_file_upload] StorageRouter.create() failed: %s", exc)
        return error_response(f"Storage write failed: {exc}", 500)

    # Schedule background parsing
    logger.debug("[TRACE _handle_file_upload] Before schedule_parsing()")
    from services.background_worker import schedule_parsing
    try:
        schedule_parsing(doc_id, str(filepath), user_id)
        logger.debug("[TRACE _handle_file_upload] schedule_parsing() scheduled successfully")
    except Exception as exc:
        logger.error("[TRACE _handle_file_upload] schedule_parsing() scheduling failed: %s", exc)
        return error_response(f"Scheduling failed: {exc}", 500)

    logger.debug("[TRACE _handle_file_upload] Returning 202 Success response")
    return success_response(
        data={
            "document_id": doc_id,
            "title": material.title,
            "word_count": material.word_count,
            "char_count": material.char_count,
            "page_count": material.page_count,
            "extension": material.extension,
            "size_bytes": size_bytes,
            "tags": tags,
            "preview": "",
            "created_at": material.created_at,
            "status": "processing",
        },
        message="File uploaded and processing started.",
        status_code=202,
    )


def _save_and_respond(
    parsed: dict,
    user_id: str,
    tags: list[str],
    filepath: str,
    size_bytes: int,
    doc_id: str | None = None,
) -> tuple:
    """Build the StudyMaterial, save it, and return the API response."""
    doc_id = doc_id or generate_uuid()

    material = StudyMaterial(
        id=doc_id,
        user_id=user_id,
        title=parsed.get("title", "Untitled"),
        filename=parsed.get("filename", ""),
        original_name=parsed.get("original_name", ""),
        filepath=parsed.get("filepath", filepath),
        extension=parsed.get("extension", "txt"),
        content=parsed.get("text", ""),
        word_count=parsed.get("word_count", 0),
        char_count=parsed.get("char_count", 0),
        page_count=parsed.get("page_count", 1),
        size_bytes=size_bytes,
        tags=tags,
        status="processed",
    )

    router = StorageRouter("materials")
    saved = router.create(doc_id, material.to_dict())

    logger.info(
        "Document uploaded: %s | user: %s | words: %d",
        doc_id, user_id, material.word_count,
    )

    return success_response(
        data={
            "document_id": doc_id,
            "title": material.title,
            "word_count": material.word_count,
            "char_count": material.char_count,
            "page_count": material.page_count,
            "extension": material.extension,
            "size_bytes": size_bytes,
            "tags": tags,
            "preview": material.preview,
            "created_at": material.created_at,
        },
        message="Document uploaded and processed successfully.",
        status_code=201,
    )
