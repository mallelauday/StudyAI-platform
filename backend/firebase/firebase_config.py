"""
============================================================
StudyAI Backend — Firebase Configuration & Firestore Client
============================================================
Initialises Firebase Admin SDK using serviceAccountKey.json
and provides Firestore client.
"""

import os
import firebase_admin
from firebase_admin import credentials, firestore

from utils.logger import get_logger

logger = get_logger(__name__)

# ── Module-level singletons ───────────────────────────────
_firebase_app = None
_firestore_client = None
_firebase_available = False


def init_firebase():
    """
    Initialise Firebase using serviceAccountKey.json
    """

    global _firebase_app, _firestore_client, _firebase_available

    try:
        from config import get_config
        Config = get_config()

        if not Config.is_firebase_configured():
            logger.error("❌ Firebase environment variables are incomplete.")
            _firebase_available = False
            return

        # Firebase config dictionary built from environment variables
        firebase_config = {
                            "type": "service_account",
                "project_id": "studyai-fc82c",
                "private_key_id": "bec1f98545ee3c93e3ba9da07759240560332f60",
                "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaJy5jCDDfH/bw\n/R81yArg6i6gay4gcUFB1N/EQCclF3sPwiznOZD9pqWFJnh4rfLq9jLyFiHfNWQ9\nXyn6vovIBUimRhvVZAJUP2VQ6sDcUhBoqcCQAGFmNK6UnZCG3LS69XTtK+KaKDna\nPgeozzXwg6ekPdvtPATQ9Z9pNUulwQMLXTvLvrXq8E17VBjMD3MDVFlwhtUN9Uq1\nkCNPfVgzCyfEByEI/pNDvEdVEJEoqaNz3o5bj4yl9gW7JpFzDHemC1cpzCBMyAqP\nai/kp+AjW0pKHPlynAt35qjsxNeN23zK66whN70P92TiM0D/4hCNL7vnuAZ4g3dd\nioUwBItrAgMBAAECggEAWDbBzi/wuzkMvTRN24yRwZNQ2XOdymahscIn3g7nBVuy\nWpP1Xmbr13X8tpPw4TPN5+84eKY0ejL33s1Nh2Rn17EzSHFPLgHr4y9jg835wN26\nXuhNwq00tYSWF+iDGdXDi1pYNtOpJRchFbxBkqR/tks2jfapqQu9EtZP6NYxScu8\njuXx40Tsa3knjx51nMWskuUsvEi7D/drzVtuPb4ZIU9+3duv6Fhb4p1DGqOPpExL\ndpAXgsDEpzMkcKcB8uJ6yJjBvn+Wamyu0CYwzZCLSa2fpbsc9uT6d7silfk8yKxL\nwsNJ8MX3HTie+vhv8YGb7X7Gn3Od+1HM4FESmE/KyQKBgQDwD1BvHT4jqPxUA00d\n9jT/rICMVUsaFjIuUTZ989s+fJ9ZBsN+Qpm3iijGMAELN49IlByxsUhC7ZyIsjWS\n0XKCsij4gFfrjEGkmjCEaUlRJfZ2IsdS8C09TcpV35BkomLPsAojNZHHIM2xASCH\nHR19kjzwn96GWPVVr0Ovyv1/HQKBgQDoo3ttlh9HVyQ8UEG+iQs2AJNVdnLFDkjd\nnRwz1PC78tQsMk8pmXZya96fmo8A8bFc06Xd1eQHBJ4KEraGxVbcke+ondRpNK+J\nuIz6b4DmvT4ZPRdbH2iZoGHL0exPbgaT3OHvC6mYC/i77g/UNbt9Uk6IuJHqZMfs\n75ucVsGGJwKBgBYhs06rKYFsIOc17rQmcLhplOhbLLNY/INcpWNzSfE22BIDF57a\nUQWkzSGIZ3A7TRBp50NSjtDsyxOnKl1AxgfamQBgBLsIkTy1omdytXmvwEsf5bR1\nxBX0yASmuc8tUWLIXgbk922eTphU/ES4oHFlPA0LEB7esK+XmuvoEPrZAoGAaoYZ\nSXe5QNh1Hiz9vbpQ6NxgmnyPVw4QbXG4bT9vMBCj+MzclMbRhtk/6kNCggMp3MCJ\nLcf4DwKdPy2MaK/J81vbqpECp13Zly1rWG1gT8eNvM7NeAsswVPAFC0+kKxn1KMK\nzYPAl3+72InMs7Ya8OqUTWR+ZB7bsPGShobvPHcCgYEA2x+3dKUtl3Z2+zukoQ3O\n0r9XtygFQIno6wLINDwflCZmriyxVDJunNr+FCgc3kgevBd+3z1bgC+c5YvHWC41\nz4Erp/MrRtKmaH8gknSoNIVm+LPeuulXvbVDGOw32lH+X0B6hvMNK+5ScMWppaml\n//eT8lN8JQzO06+tJKYJCbg=\n-----END PRIVATE KEY-----\n",
                "client_email": "firebase-adminsdk-fbsvc@studyai-fc82c.iam.gserviceaccount.com",
                "client_id": "103495567446639930848",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studyai-fc82c.iam.gserviceaccount.com",
                }

        # Initialize credentials
        cred = credentials.Certificate(firebase_config)

        # Initialize Firebase only once
        if not firebase_admin._apps:
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            _firebase_app = firebase_admin.get_app()

        # Firestore client
        _firestore_client = firestore.client()
        _firebase_available = True

        logger.info("🔥 Firebase initialized successfully — Firestore ACTIVE")

    except Exception as exc:
        _firebase_available = False
        logger.error("❌ Firebase initialization failed: %s", exc)


# ── Firestore Access ───────────────────────────────────────

def get_firestore():
    """Return Firestore client or None"""
    return _firestore_client


def is_firebase_available() -> bool:
    """Check if Firebase is active"""
    return _firebase_available


# ── Connection Test ────────────────────────────────────────

def validate_connection() -> dict:
    """
    Lightweight test to check Firestore connection
    """

    if not _firebase_available or _firestore_client is None:
        return {"connected": False, "error": "Firebase not initialized"}

    try:
        list(_firestore_client.collections())
        return {"connected": True}
    except Exception as exc:
        return {"connected": False, "error": str(exc)}


# ── Collection Helper ───────────────────────────────────────

def get_collection(name: str):
    """
    Get Firestore collection safely
    """

    if not _firebase_available or _firestore_client is None:
        return None

    return _firestore_client.collection(name)


# ── Collection Info ─────────────────────────────────────────

def ensure_collections() -> None:
    """
    Firestore auto-creates collections, so this is only logging
    """

    if not _firebase_available:
        return

    logger.info("📦 Firestore is ready (collections will auto-create)")