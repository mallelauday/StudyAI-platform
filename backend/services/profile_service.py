"""
============================================================
StudyAI Backend — Profile Storage Service
============================================================
Manages profile photo uploads to Firebase Storage or local
fallback directory. Handles extension verification, size limit,
filename generation, and file cleanup.
"""

import os
from pathlib import Path
from firebase_admin import storage
from config import get_config
from utils.logger import get_logger
from firebase.firebase_config import is_firebase_available

logger = get_logger(__name__)
Config = get_config()

ALLOWED_PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def allowed_photo(filename: str) -> bool:
    """Return True if filename has an allowed photo extension."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_PHOTO_EXTENSIONS


def get_photo_size(file) -> int:
    """Determine size of the upload file object in bytes."""
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    return size


def get_storage_bucket():
    """Return the Firebase Storage bucket or None if unavailable."""
    if not is_firebase_available():
        return None
    try:
        # Try default bucket name first
        return storage.bucket()
    except Exception:
        try:
            # Construct standard project bucket name
            bucket_name = f"{Config.FIREBASE_PROJECT_ID}.appspot.com"
            return storage.bucket(bucket_name)
        except Exception as exc:
            logger.error("Could not obtain Firebase Storage bucket: %s", exc)
            return None


def save_profile_photo(user_id: str, file) -> tuple[str | None, str | None]:
    """
    Save the profile photo to Firebase Storage, or local disk fallback.

    Args:
        user_id: The ID of the authenticated user.
        file: A werkzeug FileStorage object.

    Returns:
        A tuple of (public_url_or_path, error_message).
    """
    # ── 1. Validate File ──────────────────────────────────────
    if not file or not file.filename:
        return None, "No file provided."

    if not allowed_photo(file.filename):
        allowed = ", ".join(sorted(ALLOWED_PHOTO_EXTENSIONS))
        return None, f"Invalid file format. Allowed formats: {allowed}."

    try:
        size = get_photo_size(file)
        if size > MAX_PHOTO_SIZE_BYTES:
            return None, "File size exceeds the 5 MB limit."
    except Exception as exc:
        logger.error("Failed to read file size: %s", exc)
        return None, "Failed to process the uploaded file."

    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{user_id}.{ext}"

    # ── 2. Attempt Firebase Storage ───────────────────────────
    bucket = get_storage_bucket()
    if bucket:
        try:
            # Cleanup any existing profile photos for this user in Firebase
            # Since the user might change their format (e.g. from png to jpg),
            # check and delete existing files starting with the user_id prefix.
            blobs = list(bucket.list_blobs(prefix="profile_photos/"))
            for b in blobs:
                # e.g., profile_photos/USER_ID.png
                base_name = b.name.split("/")[-1]
                if base_name.startswith(f"{user_id}."):
                    try:
                        b.delete()
                        logger.info("Deleted old Firebase blob: %s", b.name)
                    except Exception as e:
                        logger.warning("Could not delete old Firebase blob: %s", e)

            # Upload the new blob
            blob_path = f"profile_photos/{filename}"
            blob = bucket.blob(blob_path)
            blob.upload_from_file(file, content_type=f"image/{ext}")
            blob.make_public()

            logger.info("Uploaded profile photo to Firebase Storage: %s", blob_path)
            return blob.public_url, None

        except Exception as exc:
            logger.error("Firebase Storage upload failed, falling back to local: %s", exc)

    # ── 3. Local Fallback ─────────────────────────────────────
    try:
        # Create profile_photos subdirectory in config uploads folder
        profile_photos_dir = Path(Config.PROFILE_PHOTOS_FOLDER)
        profile_photos_dir.mkdir(parents=True, exist_ok=True)

        # Cleanup existing local files for this user
        for item in profile_photos_dir.glob(f"{user_id}.*"):
            try:
                item.unlink()
                logger.info("Deleted old local photo: %s", item)
            except Exception as e:
                logger.warning("Could not delete old local photo %s: %s", item, e)

        # Save new file
        save_path = profile_photos_dir / filename
        file.save(save_path)
        logger.info("Saved profile photo locally to %s", save_path)

        # Relative route path that Flask serves
        local_url = f"/api/profile/photo/{user_id}"
        return local_url, None

    except Exception as exc:
        logger.exception("Local photo save failed")
        return None, "Failed to save profile photo locally."


def delete_profile_photo(user_id: str) -> bool:
    """
    Remove any profile photos for the user in Firebase Storage and local fallback.

    Returns:
        True on success, False if no photo was deleted or if error occurred.
    """
    deleted_any = False

    # ── 1. Delete from Firebase ───────────────────────────────
    bucket = get_storage_bucket()
    if bucket:
        try:
            blobs = list(bucket.list_blobs(prefix="profile_photos/"))
            for b in blobs:
                base_name = b.name.split("/")[-1]
                if base_name.startswith(f"{user_id}."):
                    b.delete()
                    logger.info("Deleted Firebase photo blob: %s", b.name)
                    deleted_any = True
        except Exception as exc:
            logger.error("Failed to delete from Firebase Storage: %s", exc)

    # ── 2. Delete from Local ──────────────────────────────────
    try:
        profile_photos_dir = Path(Config.PROFILE_PHOTOS_FOLDER)
        if profile_photos_dir.is_dir():
            for item in profile_photos_dir.glob(f"{user_id}.*"):
                item.unlink()
                logger.info("Deleted local photo file: %s", item)
                deleted_any = True
    except Exception as exc:
        logger.error("Failed to delete local photo files: %s", exc)

    return deleted_any
