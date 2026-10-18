"""
ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM — MYSQL SETUP & MIGRATION TOOL
Initializes Database 'smart_attendance', creates all relational tables & indexes,
and seeds initial Super Admin account.
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config import (
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
    SUPER_ADMIN_EMAIL, SUPER_ADMIN_MOBILE, SUPER_ADMIN_PASS, SUPER_ADMIN_COMPANY
)
from mysql_db import MySQLDatabase
from database import hash_password, get_utc_iso_string

def run_mysql_setup():
    print("=" * 70)
    print("  ARDHNARISHWAR GLOBAL PLATFORM — MYSQL DATABASE SETUP & MIGRATION")
    print("=" * 70)
    print(f"Target Server: {MYSQL_HOST}:{MYSQL_PORT}")
    print(f"Target User:   {MYSQL_USER}")
    print(f"Database:      {MYSQL_DATABASE}")
    print("-" * 70)

    db = MySQLDatabase(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE
    )

    print("[*] Connecting to MySQL Server...")
    success = db.connect()
    if not success:
        print("\n[✕] FAILED TO CONNECT TO MYSQL SERVER!")
        print("    Possible causes:")
        print("    1. MySQL80 Windows Service is not running. (Run 'start_mysql.bat')")
        print("    2. Root password is required. (Edit MYSQL_PASSWORD in .env)")
        print("    3. MySQL is running on a different port than 3306.")
        return False

    print("\n[✓] Successfully connected to MySQL Server!")
    print(f"[✓] Database '{MYSQL_DATABASE}' verified / created.")
    
    # Verify tables
    print("\n[*] Initializing relational tables:")
    for tbl in db.TABLES:
        cnt = db.get_collection(tbl).count_documents()
        print(f"    - Table `{tbl}`: Ready ({cnt} rows)")

    # Seed Super Admin if missing
    users_col = db.get_collection("users")
    super_admin = users_col.find_one({"role": "super_admin"})
    if not super_admin:
        admin_doc = {
            "name": "Ardhnarishwar Super Admin",
            "email": SUPER_ADMIN_EMAIL,
            "mobile": SUPER_ADMIN_MOBILE,
            "password": hash_password(SUPER_ADMIN_PASS),
            "role": "super_admin",
            "company_id": "ARDHNARISHWAR",
            "status": "active",
            "created_at": get_utc_iso_string()
        }
        users_col.insert_one(admin_doc)
        print(f"\n[✓] Bootstrapped Super Admin into MySQL: {SUPER_ADMIN_EMAIL}")
    else:
        print(f"\n[✓] Super Admin already exists in MySQL: {super_admin.get('email')}")

    print("\n" + "=" * 70)
    print("  ALL MYSQL TABLES & CREDENTIALS INITIALIZED SUCCESSFULLY!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    run_mysql_setup()
