"""
Backend WSGI entrypoint for subfolder executions.
"""
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app as application, seed_global_system  # noqa: E402

try:
    seed_global_system()
except Exception as exc:
    print(f"[!] Warning during seeding: {exc}")

app = application

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 5000))
    try:
        from waitress import serve
        serve(application, host=host, port=port, threads=8)
    except ImportError:
        application.run(host=host, port=port, threaded=True)
