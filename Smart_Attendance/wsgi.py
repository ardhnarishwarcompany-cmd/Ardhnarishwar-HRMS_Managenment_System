"""
════════════════════════════════════════════════════════════════════════════════
 Ardhnarishwar Global SaaS Attendance Platform — Universal Production WSGI Entry
 Compatible with: Gunicorn, Waitress, uWSGI, Docker, Render, Railway, Heroku, AWS
════════════════════════════════════════════════════════════════════════════════
"""
import os
import sys

# Ensure backend folder is on system path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.app import app as application, seed_global_system  # noqa: E402

# Seed global admin, executive approvers, and platform structure upon worker init
try:
    seed_global_system()
except Exception as exc:
    print(f"[!] Warning during initial database seeding: {exc}")

# Expose both 'application' and 'app' for various WSGI runners
app = application

if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 5000))
    print(f"[*] Booting Ardhnarishwar Global Attendance WSGI Server on http://{host}:{port} ...")
    try:
        from waitress import serve
        print(f"[✓] Serving with high-performance Waitress WSGI engine (8 threads)")
        serve(application, host=host, port=port, threads=8)
    except ImportError:
        print(f"[!] Waitress not found. Falling back to multi-threaded WSGI runner")
        application.run(host=host, port=port, threaded=True)
