"""Flask application factory for MultiChatbot."""

import os

# Ensure SSL certificates on Windows work reliably with Google/OpenAI endpoints
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

from flask import Flask, jsonify
from config import config_by_name
from backend.extensions import db, cors


def create_app(config_name: str = None) -> Flask:
    """Create and configure the Flask application."""
    if not config_name:
        config_name = os.environ.get("FLASK_ENV", "development").lower()

    config_class = config_by_name.get(config_name, config_by_name["default"])

    app = Flask(
        __name__,
        template_folder=config_class.TEMPLATE_FOLDER,
        static_folder=config_class.STATIC_FOLDER,
    )
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from backend.routes import main_bp, api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    # Global error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Resource not found", "status": 404}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal server error occurred", "status": 500}), 500

    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

    # Create SQLite database tables if they do not exist
    with app.app_context():
        db.create_all()

    return app
