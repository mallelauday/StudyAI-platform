import logging
import traceback
from concurrent.futures import ThreadPoolExecutor

from services.file_parser import parse_file
from services.firebase_service import StorageRouter
from models.study_material import StudyMaterial
from utils.helpers import utc_now_iso
from utils.logger import get_logger

logger = get_logger(__name__)

# Global thread pool executor (adjust max_workers as needed)
_executor = ThreadPoolExecutor(max_workers=4)

def schedule_parsing(doc_id: str, file_path: str, user_id: str) -> None:
    """Schedule asynchronous parsing of an uploaded file.

    The upload endpoint already creates a placeholder document, so this function
    simply enqueues the background parsing task.
    """
    logger.info("Scheduled background parsing for document %s", doc_id)
    _executor.submit(_parse_and_update, doc_id, file_path, user_id)

def _parse_and_update(doc_id: str, file_path: str, user_id: str) -> None:
    """Background worker that parses the file and updates Firestore.

    On success sets status "processed" and stores extracted data.
    On failure sets status "failed" and records the error message.
    """
    import os
    router = StorageRouter("materials")

    # If the user deleted the document before parsing started, abort
    if not router.exists(doc_id):
        logger.warning("Document %s was deleted before processing started. Aborting.", doc_id)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass
        return

    try:
        parsed = parse_file(file_path)
        material_data = {
            "title": parsed.get("title", "Untitled"),
            "content": parsed.get("text", ""),
            "word_count": parsed.get("word_count", 0),
            "char_count": parsed.get("char_count", 0),
            "page_count": parsed.get("page_count", 1),
            "status": "processed",
            "updated_at": utc_now_iso(),
        }

        # Check again if document still exists before updating
        if router.exists(doc_id):
            router.update(doc_id, material_data)
            logger.info("Document %s processed successfully", doc_id)
        else:
            logger.warning("Document %s was deleted during processing. Cleaning up file.", doc_id)
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass
    except Exception as exc:
        logger.error("Error processing document %s: %s", doc_id, exc)
        logger.debug(traceback.format_exc())

        if router.exists(doc_id):
            router.update(
                doc_id,
                {
                    "status": "failed",
                    "error_message": str(exc),
                    "updated_at": utc_now_iso(),
                },
            )

        # Clean up file on failure
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass
