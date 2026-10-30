"""MultiChatbot - Main Application Entrypoint."""

import os
from backend import create_app

app = create_app(os.environ.get("FLASK_ENV", "development"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")
    debug = os.environ.get("FLASK_DEBUG", "True").lower() in ("true", "1")

    print("=" * 60)
    print("  MULTICHATBOT - Your AI Friend. Always Within Reach.")
    print("=" * 60)
    print(f"  * Running on http://{host}:{port}/")
    print(f"  * Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print("=" * 60)

    app.run(host=host, port=port, debug=debug)
