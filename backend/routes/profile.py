"""
============================================================
StudyAI Backend — Profile Routes
============================================================
Provides endpoints for uploading, retrieving, and removing
profile photos:
    POST   /api/profile/upload-photo
    GET    /api/profile/photo/<user_id>
    DELETE /api/profile/photo
"""

import time
from pathlib import Path
from collections import defaultdict
from flask import Blueprint, request, g, send_from_directory, redirect, jsonify

from middleware.auth_middleware import login_required
from services.firebase_service import StorageRouter
from services.profile_service import save_profile_photo, delete_profile_photo
from utils.helpers import success_response, error_response
from utils.logger import get_logger
from config import get_config

logger = get_logger(__name__)
Config = get_config()

profile_bp = Blueprint("profile", __name__)

# Cooldown dictionary to limit upload frequency: user_id -> timestamp
last_upload_times = defaultdict(float)
UPLOAD_COOLDOWN_SECONDS = 5.0  # 5-second cooldown between uploads


@profile_bp.post("/profile/upload-photo")
@login_required
def upload_profile_photo():
    """
    Upload profile photo. Protected.
    Validates file format, size, and rate limits.
    """
    user_id = g.user_id

    # ── 1. Limit Upload Frequency ─────────────────────────────
    now = time.time()
    if now - last_upload_times[user_id] < UPLOAD_COOLDOWN_SECONDS:
        remaining = int(UPLOAD_COOLDOWN_SECONDS - (now - last_upload_times[user_id]))
        return error_response(
            f"Please wait {remaining} second(s) before uploading another photo.",
            429
        )

    last_upload_times[user_id] = now

    # ── 2. Check File Part ────────────────────────────────────
    if "file" not in request.files:
        return error_response("No file part in the request. Use field name 'file'.", 400)

    file = request.files["file"]

    # ── 3. Save File (Firebase / Local Fallback) ──────────────
    url_or_path, err = save_profile_photo(user_id, file)
    if err:
        return error_response(err, 400)

    # ── 4. Update Database User Document ──────────────────────
    user_router = StorageRouter("users")
    user_doc = user_router.get(user_id)

    if not user_doc:
        # Create user document if it doesn't exist for some reason
        user_doc = {
            "uid": user_id,
            "email": g.user_email,
            "display_name": g.token_payload.get("name", ""),
            "role": g.user_role,
        }
        user_doc["profile_picture"] = url_or_path
        user_doc["avatar_url"] = url_or_path
        user_router.create(user_id, user_doc)
    else:
        user_doc["profile_picture"] = url_or_path
        user_doc["avatar_url"] = url_or_path
        user_router.update(user_id, {
            "profile_picture": url_or_path,
            "avatar_url": url_or_path
        })

    # Return updated user details
    user_data = {
        "uid": user_id,
        "email": user_doc.get("email", g.user_email),
        "display_name": user_doc.get("display_name") or user_doc.get("name") or g.token_payload.get("name", ""),
        "role": user_doc.get("role", g.user_role),
        "profile_picture": url_or_path,
        "avatar_url": url_or_path
    }

    logger.info("Successfully updated profile photo for user %s to %s", user_id, url_or_path)

    return jsonify({
        "success": True,
        "user": user_data,
        "data": {
            "user": user_data,
            "profile_picture": url_or_path
        },
        "error": None
    })


@profile_bp.get("/profile/photo/<user_id>")
def get_profile_photo(user_id):
    """
    Retrieve/serve the profile photo for the given user_id. Public.
    If it's stored on Firebase, redirects to Firebase URL.
    If local, sends the file.
    """
    # ── 1. Check Local File First ─────────────────────────────
    profile_photos_dir = Path(Config.PROFILE_PHOTOS_FOLDER)
    found_file = None
    if profile_photos_dir.is_dir():
        for item in profile_photos_dir.glob(f"{user_id}.*"):
            found_file = item.name
            break

    if found_file:
        logger.debug("Serving local photo file for user %s: %s", user_id, found_file)
        return send_from_directory(str(profile_photos_dir), found_file)

    # ── 2. Fallback: Retrieve Database URL ────────────────────
    user_router = StorageRouter("users")
    user_doc = user_router.get(user_id)
    if user_doc:
        profile_pic = user_doc.get("profile_picture") or user_doc.get("avatar_url")
        if profile_pic and profile_pic.startswith("http"):
            logger.debug("Redirecting to Firebase Storage for user %s: %s", user_id, profile_pic)
            return redirect(profile_pic)

    # ── 3. Return 404 if no image exists ──────────────────────
    return error_response("Profile picture not found.", 404)


@profile_bp.delete("/profile/photo")
@login_required
def remove_profile_photo():
    """
    Delete the current user's profile photo from storage and database. Protected.
    """
    user_id = g.user_id

    # ── 1. Delete from storage/fallback folder ────────────────
    delete_profile_photo(user_id)

    # ── 2. Update Database user document ──────────────────────
    user_router = StorageRouter("users")
    user_doc = user_router.get(user_id)

    if user_doc:
        user_doc["profile_picture"] = ""
        user_doc["avatar_url"] = ""
        user_router.update(user_id, {
            "profile_picture": "",
            "avatar_url": ""
        })

    # Return updated user details
    user_data = {
        "uid": user_id,
        "email": (user_doc or {}).get("email", g.user_email),
        "display_name": (user_doc or {}).get("display_name") or (user_doc or {}).get("name") or g.token_payload.get("name", ""),
        "role": (user_doc or {}).get("role", g.user_role),
        "profile_picture": "",
        "avatar_url": ""
    }

    logger.info("Successfully removed profile photo for user %s", user_id)

    return jsonify({
        "success": True,
        "user": user_data,
        "data": {
            "user": user_data,
            "profile_picture": ""
        },
        "error": None
    })
