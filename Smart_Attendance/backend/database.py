from datetime import datetime, timezone
import hashlib
import os
import math
from bson import ObjectId

from config import (
    DB_TYPE, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MYSQL_FALLBACK,
    MONGO_URI, DATABASE_NAME, SUPER_ADMIN_COMPANY, 
    SUPER_ADMIN_EMAIL, SUPER_ADMIN_MOBILE, SUPER_ADMIN_PASS, 
    DEFAULT_TIMEZONE
)
from timezone_engine import get_utc_iso_string
from mysql_db import MySQLDatabase

db = None
ACTIVE_DB_ENGINE = "Unknown"

# ── Database Initialization (Primary: MySQL 8.0, Fallback: Embedded Dual-Mode) ──
if DB_TYPE.lower() == "mysql":
    mysql_engine = MySQLDatabase(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE
    )
    if mysql_engine.connect():
        db = mysql_engine
        ACTIVE_DB_ENGINE = "MySQL 8.0 (Live)"
        print(f"[*] Ardhnarishwar Platform active database engine: MySQL 8.0 (database: {MYSQL_DATABASE})")
    elif MYSQL_FALLBACK:
        print(f"[!] Local MySQL Server 8.0 on {MYSQL_HOST}:{MYSQL_PORT} is currently offline (Windows Service 'MySQL80' stopped).")
        print("[!] Dual Mode Active: Using embedded database to guarantee 100% platform uptime.")
        print("[!] To activate Live MySQL persistence, run 'start_mysql.bat' to start the MySQL80 service.")
        import mongomock
        client = mongomock.MongoClient()
        db = client[MYSQL_DATABASE or DATABASE_NAME]
        ACTIVE_DB_ENGINE = "MySQL Dual-Mode (Embedded Fallback Active)"
    else:
        raise ConnectionError(f"Cannot connect to MySQL server at {MYSQL_HOST}:{MYSQL_PORT} with user '{MYSQL_USER}'")
else:
    # MongoDB mode
    try:
        from pymongo import MongoClient
        c = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
        c.server_info()
        db = c[DATABASE_NAME]
        ACTIVE_DB_ENGINE = "MongoDB (Live)"
        print(f"[*] Connected to live MongoDB at {MONGO_URI}")
    except Exception as e:
        print(f"[!] Local MongoDB not reachable ({e}). Using embedded mongomock database...")
        import mongomock
        db = mongomock.MongoClient()[DATABASE_NAME]
        ACTIVE_DB_ENGINE = "MongoDB (Embedded Fallback)"

# ── Collections ─────────────────────────────────────────────────────────────
companies_col             = db["companies"]              # Company workspaces worldwide
users_col                 = db["users"]                  # System user accounts (Super Admin, Company Admin, HR, Manager, Employee)
employees_col             = db["employees"]              # Detailed employee records + face encodings + workforce type
branches_col              = db["branches"]               # Multi-branch / office locations per company
departments_col           = db["departments"]            # Company organizational departments
shifts_col                = db["shifts"]                 # Company shift schedules (fixed, flexible, overnight)
attendance_col            = db["attendance"]             # Multi-tenant attendance events with UTC timestamps
attendance_corrections_col= db["attendance_corrections"] # Employee attendance correction requests & approval trail
leaves_col                = db["leaves"]                 # Employee leave applications & approval workflow
field_visits_col          = db["field_visits"]           # Field employee visits, client meetings, GPS logs
audit_logs_col            = db["audit_logs"]             # Global & Tenant immutable audit trail
policies_col              = db["policies"]               # Company-specific attendance rules & thresholds
notifications_col         = db["notifications"]          # In-house private notification & message vault
system_config_col         = db["system_config"]          # Global platform settings & feature controls
permissions_col           = db["permissions"]            # Role-based permissions matrix
approvers_col             = db["organization_approvers"] # Designated 4-member approval authorities per org
ip_change_requests_col    = db["ip_change_requests"]     # Fallback IP change requests for WFH ISP rotations


# ── Indexes ─────────────────────────────────────────────────────────────────
try:
    companies_col.create_index("company_id", unique=True)
    users_col.create_index([("company_id", 1), ("mobile", 1)])
    users_col.create_index([("company_id", 1), ("email", 1)])
    employees_col.create_index([("company_id", 1), ("emp_id", 1)], unique=True)
    branches_col.create_index([("company_id", 1), ("branch_id", 1)], unique=True)
    departments_col.create_index([("company_id", 1), ("name", 1)], unique=True)
    shifts_col.create_index([("company_id", 1), ("shift_id", 1)], unique=True)
    attendance_col.create_index([("company_id", 1), ("emp_id", 1), ("date", 1), ("check_type", 1)])
    attendance_col.create_index([("company_id", 1), ("date", 1)])
    attendance_col.create_index([("company_id", 1), ("timestamp_utc", -1)])
    attendance_corrections_col.create_index([("company_id", 1), ("emp_id", 1), ("timestamp_utc", -1)])
    leaves_col.create_index([("company_id", 1), ("emp_id", 1), ("timestamp_utc", -1)])
    field_visits_col.create_index([("company_id", 1), ("timestamp_utc", -1)])
    audit_logs_col.create_index([("company_id", 1), ("timestamp_utc", -1)])
    policies_col.create_index("company_id", unique=True)
    notifications_col.create_index([("company_id", 1), ("emp_id", 1), ("timestamp_utc", -1)])
    approvers_col.create_index([("company_id", 1), ("email", 1)], unique=True)
    ip_change_requests_col.create_index([("company_id", 1), ("emp_id", 1), ("timestamp_utc", -1)])
except Exception:
    pass


def hash_password(password: str) -> str:
    """Secure SHA-256 password hashing."""
    if not password:
        return ""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def log_audit_event(action: str, company_id: str, actor_name: str, actor_role: str, details: dict = None, ip: str = "", user_agent: str = ""):
    """
    Record an immutable audit trail event for security, compliance, and multi-tenant accountability.
    """
    try:
        audit_logs_col.insert_one({
            "action": action,
            "company_id": company_id or "GLOBAL",
            "actor_name": actor_name or "System",
            "actor_role": actor_role or "system",
            "details": details or {},
            "ip": ip or "127.0.0.1",
            "user_agent": user_agent or "",
            "timestamp_utc": get_utc_iso_string(),
            "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        })
    except Exception as e:
        print("[!] Audit logging error:", e)


# ── Exact Distance Calculation & Approvers Authority ───────────────────────
def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate Haversine distance in meters between two GPS coordinates.
    Matches exact mathematical formula specified in enterprise architecture.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    R = 6371e3  # Earth radius in meters
    to_rad = lambda val: (float(val) * math.pi) / 180.0
    d_lat = to_rad(lat2 - lat1)
    d_lon = to_rad(lon2 - lon1)
    a = (math.sin(d_lat / 2.0) ** 2 +
         math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return R * c


def get_organization_approvers(company_id: str) -> list:
    """
    Retrieve all designated approval members (up to 4) for an organization.
    Checks approvers_col first, fallback to company document.
    """
    if not company_id:
        return []
    comp_clean = company_id.upper()
    results = list(approvers_col.find({"company_id": comp_clean}, {"_id": 0}))
    if not results:
        comp = companies_col.find_one({"company_id": comp_clean})
        if comp and "approvers" in comp:
            results = comp.get("approvers", [])
    return results[:4]


def save_organization_approver(company_id: str, name: str, email: str, phone: str = "", is_active: bool = True) -> tuple[bool, str]:
    """
    Add or update a designated approver (max 4 per organization).
    Permanently persists in both approvers_col and companies_col.
    """
    if not company_id or not email:
        return False, "Company ID and Email are required"
    comp_clean = company_id.upper()
    email_clean = email.strip().lower()
    
    # Check current count excluding this email
    existing_other = approvers_col.count_documents({
        "company_id": comp_clean,
        "email": {"$ne": email_clean}
    })
    if existing_other >= 4:
        return False, "Maximum of 4 designated approval members permitted per organization"
    
    doc = {
        "company_id": comp_clean,
        "name": name.strip(),
        "email": email_clean,
        "phone": phone.strip() if phone else "",
        "isActive": is_active,
        "is_active": is_active,
        "updated_at": get_utc_iso_string()
    }
    approvers_col.update_one(
        {"company_id": comp_clean, "email": email_clean},
        {"$set": doc, "$setOnInsert": {"created_at": get_utc_iso_string(), "id": str(ObjectId())}},
        upsert=True
    )
    # Sync with company document
    all_apprs = list(approvers_col.find({"company_id": comp_clean}, {"_id": 0}))
    companies_col.update_one({"company_id": comp_clean}, {"$set": {"approvers": all_apprs[:4]}})
    return True, "Designated approver saved successfully"


def delete_organization_approver(company_id: str, email: str) -> bool:
    """Delete an approver by email from an organization."""
    if not company_id or not email:
        return False
    comp_clean = company_id.upper()
    email_clean = email.strip().lower()
    approvers_col.delete_one({"company_id": comp_clean, "email": email_clean})
    all_apprs = list(approvers_col.find({"company_id": comp_clean}, {"_id": 0}))
    companies_col.update_one({"company_id": comp_clean}, {"$set": {"approvers": all_apprs[:4]}})
    return True


def is_designated_approver(company_id: str, email: str) -> bool:
    """Verify if given email is an active designated approver for the organization."""
    if not company_id or not email:
        return False
    comp_clean = company_id.upper()
    email_clean = email.strip().lower()
    # Check approvers_col
    appr = approvers_col.find_one({
        "company_id": comp_clean,
        "email": email_clean,
        "$or": [{"isActive": True}, {"is_active": True}, {"isActive": {"$exists": False}}]
    })
    if appr:
        return True
    # Check company doc
    comp = companies_col.find_one({"company_id": comp_clean})
    if comp and "approvers" in comp:
        for a in comp.get("approvers", []):
            if a.get("email", "").strip().lower() == email_clean and a.get("isActive", a.get("is_active", True)) is not False:
                return True
    return False


# ── System Bootstrap (Super Admin Only — ZERO Demo Data) ─────────────────────
def seed_global_system():
    """
    Bootstraps the essential Global Super Admin account (Ardhnarishwar Company)
    if no Super Admin account exists in the database.
    
    STRICT PRODUCTION COMPLIANCE:
    - NO sample companies are created.
    - NO fake employees are created.
    - NO fake attendance records are created.
    - NO hardcoded demo stats are created.
    All business tables remain clean until real records are registered.
    """
    super_admin = users_col.find_one({"role": "super_admin"})
    if not super_admin:
        users_col.insert_one({
            "name": "Ardhnarishwar Super Admin",
            "email": SUPER_ADMIN_EMAIL,
            "mobile": SUPER_ADMIN_MOBILE,
            "password": hash_password(SUPER_ADMIN_PASS),
            "role": "super_admin",
            "company_id": "ARDHNARISHWAR",
            "status": "active",
            "created_at": get_utc_iso_string()
        })
        log_audit_event(
            action="SUPER_ADMIN_BOOTSTRAP",
            company_id="ARDHNARISHWAR",
            actor_name="System",
            actor_role="super_admin",
            details={"email": SUPER_ADMIN_EMAIL, "company": SUPER_ADMIN_COMPANY}
        )
        print(f"[*] Bootstrapped Global Super Admin ({SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_MOBILE})")


def reset_database_to_zero():
    """
    Completely wipes all business and operational data across all collections,
    leaving ONLY the pristine default Super Admin account (Ardhnarishwar Company).
    """
    companies_col.delete_many({})
    employees_col.delete_many({})
    branches_col.delete_many({})
    departments_col.delete_many({})
    shifts_col.delete_many({})
    attendance_col.delete_many({})
    attendance_corrections_col.delete_many({})
    leaves_col.delete_many({})
    field_visits_col.delete_many({})
    audit_logs_col.delete_many({})
    policies_col.delete_many({})
    notifications_col.delete_many({})
    approvers_col.delete_many({})
    ip_change_requests_col.delete_many({})
    users_col.delete_many({"role": {"$ne": "super_admin"}})
    seed_global_system()
    print("[*] Database successfully reset to ZERO state. Pure clean environment initialized.")


# Run safe bootstrap
seed_global_system()


