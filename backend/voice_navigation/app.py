"""Gunicorn entry point kept stable while the implementation lives in api.app."""

from api.app import create_app


if __name__ == "__main__":
    from config import Settings

    settings = Settings()
    create_app(settings).run(host=settings.host, port=settings.port, debug=False)
