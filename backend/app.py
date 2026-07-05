"""
============================================================
StudyAI Backend — Flask Application Entry Point
============================================================
"""

from flask import Flask, request
from flask_cors import CORS

from config import get_config
from utils.logger import get_logger
from utils.helpers import error_response
from firebase.firebase_config import init_firebase, ensure_collections, is_firebase_available
from services.local_storage import init_local_storage

# ── Bootstrap ─────────────────────────────────────────────
Config = get_config()
Config.ensure_directories()

logger = get_logger("studyai.app")


def _validate_startup_config() -> None:
    """Log configuration status at startup."""
    if not Config.is_groq_configured():
        logger.error("Missing required environment variable: GROQ_API_KEY")
        return

    if is_firebase_available():
        logger.info("Groq and Firebase configuration look good.")
    elif Config.USE_LOCAL_STORAGE:
        logger.info(
            "Groq configured. Firebase unavailable — using local JSON storage."
        )
    else:
        logger.error(
            "Firebase credentials missing and USE_LOCAL_STORAGE is disabled."
        )


# ── Application Factory ───────────────────────────────────
def create_app() -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["DEBUG"] = Config.DEBUG
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
    app.config["UPLOAD_FOLDER"] = str(Config.UPLOAD_FOLDER)

    CORS(
        app,
        resources={r"/*": {"origins": Config.CORS_ORIGINS}},
        supports_credentials=True,
    )
    logger.info("CORS enabled for: %s", Config.CORS_ORIGINS)

    try:
        init_firebase()
        ensure_collections()
        if is_firebase_available():
            logger.info("Firebase initialized successfully")
        elif Config.USE_LOCAL_STORAGE:
            logger.warning("Firebase unavailable — continuing with local storage")
        else:
            logger.error("Firebase init failed and local storage is disabled")
    except Exception as e:
        logger.error("Firebase init failed: %s", str(e))

    try:
        init_local_storage()
        logger.info("Local storage initialized")
    except Exception as e:
        logger.error("Local storage init failed: %s", str(e))

    _register_blueprints(app)
    _register_error_handlers(app)
    _register_request_hooks(app)

    logger.info(
        "%s v%s ready — env: %s | %s:%s",
        Config.APP_NAME,
        Config.APP_VERSION,
        Config.FLASK_ENV,
        Config.HOST,
        Config.PORT,
    )

    return app


# ── Blueprints ───────────────────────────────────────────
def _register_blueprints(app: Flask) -> None:
    from routes.health import health_bp
    from routes.auth import auth_bp
    from routes.upload import upload_bp
    from routes.summary import summary_bp
    from routes.flashcards import flashcards_bp
    from routes.quiz import quiz_bp
    from routes.schedule import schedule_bp
    from routes.analytics import analytics_bp
    from routes.export import export_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(summary_bp, url_prefix="/api")
    app.register_blueprint(flashcards_bp, url_prefix="/api")
    app.register_blueprint(quiz_bp, url_prefix="/api")
    app.register_blueprint(schedule_bp, url_prefix="/api")
    app.register_blueprint(analytics_bp, url_prefix="/api")
    app.register_blueprint(export_bp, url_prefix="/api")

    logger.info("Blueprints registered successfully")


# ── Error Handlers ───────────────────────────────────────
def _register_error_handlers(app: Flask) -> None:

    @app.errorhandler(400)
    def bad_request(e):
        return error_response("Bad request", 400)

    @app.errorhandler(401)
    def unauthorized(e):
        return error_response("Unauthorized", 401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response("Forbidden", 403)

    @app.errorhandler(404)
    def not_found(e):
        return error_response(f"Route not found: {request.path}", 404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return error_response("Method not allowed", 405)

    @app.errorhandler(413)
    def too_large(e):
        return error_response("File too large", 413)

    @app.errorhandler(429)
    def too_many(e):
        return error_response("Too many requests", 429)

    @app.errorhandler(500)
    def internal_error(e):
        logger.exception("Server error at %s", request.path)
        return error_response("Internal server error", 500)


# ── Request logging ──────────────────────────────────────
def _register_request_hooks(app: Flask) -> None:

    @app.before_request
    def log_request():
        logger.debug("→ %s %s", request.method, request.path)

    @app.after_request
    def log_response(response):
        logger.debug("← %s %s → %s", request.method, request.path, response.status_code)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response


# ── WSGI entry point (gunicorn: app:app) ─────────────────
app = create_app()
_validate_startup_config()


if __name__ == "__main__":
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
    )
