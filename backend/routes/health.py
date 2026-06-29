"""
============================================================
StudyAI Backend — Health & Version Routes
============================================================
Provides:
    GET  /api/health    — Liveness probe with service status
    GET  /api/version   — App metadata
"""

from flask import Blueprint, jsonify
from firebase.firebase_config import validate_connection as firebase_status, is_firebase_available
from services.groq_service import GroqService
from services.local_storage import LocalStorage
from utils.helpers import success_response, utc_now_iso
from utils.logger import get_logger
from config import get_config

logger = get_logger(__name__)
Config = get_config()

health_bp = Blueprint("health", __name__)

# Singleton Groq service (no API calls until validate_connection() is called)
_groq = GroqService()


@health_bp.get("/health")
def health_check():
    """
    Liveness and readiness probe.

    Checks Firebase, Groq, and local storage availability.
    """
    fb_available = is_firebase_available()
    groq_available = Config.is_groq_configured()
    
    # Database is available if we can initialize local storage or Firestore
    db_available = False
    try:
        _store = LocalStorage("materials")
        db_available = True
    except Exception:
        db_available = False

    return jsonify({
        "firebase": fb_available,
        "groq": groq_available,
        "database": db_available,
        "success": True,
        "message": "backend running"
    })


@health_bp.get("/version")
def version():
    """Return application version and metadata."""
    return success_response(
        data={
            "name": Config.APP_NAME,
            "version": Config.APP_VERSION,
            "environment": Config.FLASK_ENV,
            "python_backend": "Flask 3.0",
            "ai_model": Config.GROQ_MODEL,
            "timestamp": utc_now_iso(),
        },
        message="StudyAI API is running",
    )
