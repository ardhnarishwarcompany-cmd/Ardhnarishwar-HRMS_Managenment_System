"""
════════════════════════════════════════════════════════════════════════════════
 Ardhnarishwar Global Attendance Platform — Production Launcher
 Multi-threaded Production WSGI Server (Waitress / Gunicorn)
════════════════════════════════════════════════════════════════════════════════
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(BASE_DIR, "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)
os.chdir(backend_path)

from app import app, HOST, PORT, seed_global_system

def start_production():
    effective_host = os.environ.get("HOST", HOST)
    effective_port = int(os.environ.get("PORT", PORT))

    print("=" * 78)
    print("  🚀 ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM — PRODUCTION LAUNCHER")
    print("=" * 78)
    print(f" [*] Working Directory  : {backend_path}")
    print(f" [*] Host Binding       : {effective_host}")
    print(f" [*] Listening Port     : {effective_port}")
    print(f" [*] Main URL           : http://{effective_host}:{effective_port}")
    print(f" [*] Portal URL         : http://{effective_host}:{effective_port}/login")
    print(f" [*] Health Check       : http://{effective_host}:{effective_port}/health")
    print("-" * 78)

    # Database bootstrap
    try:
        seed_global_system()
        print(" [✓] Database seeded and verified.")
    except Exception as exc:
        print(f" [!] Database initialization notice: {exc}")

    print("-" * 78)
    try:
        from waitress import serve
        print(f" [✓] Starting Waitress Multi-Threaded Production WSGI Server (8 threads)...")
        print(f" [*] Ready to accept incoming production requests.")
        serve(app, host=effective_host, port=effective_port, threads=8)
    except ImportError:
        print(f" [!] Waitress not detected. Falling back to multi-threaded Flask engine...")
        app.run(host=effective_host, port=effective_port, threaded=True)

if __name__ == "__main__":
    start_production()
