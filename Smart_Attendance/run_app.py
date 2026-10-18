"""
Ardhnarishwar Global SaaS Attendance Management System — Root Launcher
Execute this script to start the server directly from the root workspace directory.
Single URL Entrypoint: http://localhost:5000 or http://127.0.0.1:5000
"""
import os
import sys
import threading
import time
import webbrowser

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(BASE_DIR, "backend")
if not os.path.exists(backend_path):
    backend_path = os.path.join(BASE_DIR, "Smart_Attendance", "Smart_Attendance", "backend")

sys.path.insert(0, backend_path)
os.chdir(backend_path)

from app import app, HOST, PORT, DEBUG, seed_global_system
from database import ACTIVE_DB_ENGINE

def open_browser(url):
    time.sleep(1.2)
    try:
        webbrowser.open(url)
    except Exception:
        pass

if __name__ == "__main__":
    seed_global_system()
    url = f"http://localhost:{PORT}"
    
    print("\n" + "=" * 70)
    print(" [*] ARDHNARISHWAR GLOBAL SAAS ATTENDANCE PLATFORM")
    print(f" [*] DATABASE ENGINE: {ACTIVE_DB_ENGINE}")
    print("=" * 70)
    print(f" [*] ONE UNIFIED DASHBOARD URL (Role-Based Dynamic Access):")
    print(f"     >>> {url}/dashboard")
    print(f"     >>> http://127.0.0.1:{PORT}/dashboard")
    print(f" [*] ATTENDANCE IP ADDRESS DIAGNOSTICS:")
    print(f"     >>> {url}/api/ip-info")
    print("-" * 70)
    print(" [*] DEFAULT SUPER ADMIN ACCESS:")
    print("     Email:    superadmin@ardhnarishwar.com")
    print("     Password: superadmin123")
    print("-" * 70)
    print(" [*] AVAILABLE PORTALS & DIRECT LINKS:")
    print(f"     - Org Enterprise Portal:{url}/portal/organization")
    print(f"     - Employee Portal (SS): {url}/portal/employee")
    print(f"     - Portal & Sign-In:     {url}/login")
    print(f"     - Enterprise Landing:   {url}/landing")
    print(f"     - Super Admin Portal:   {url}/admin/dashboard")
    print(f"     - Company Admin Portal: {url}/workspace/dashboard")
    print(f"     - Self-Registration:    {url}/register")
    print(f"     - Status Tracker:       {url}/status")
    print(f"     - System Health API:    {url}/health")
    print("=" * 70 + "\n")

    # Automatically launch browser in background thread
    threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    app.run(host=HOST, port=PORT, debug=DEBUG)
