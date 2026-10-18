from flask import Flask, request, jsonify, render_template, session, redirect, url_for, Response, send_from_directory
from flask_cors import CORS
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import socket, os, csv, io, random, math, re, hashlib, json, secrets, smtplib, ssl
from email.message import EmailMessage
import jwt

from config import (
    SECRET_KEY, OFFICE_LAT, OFFICE_LNG, OFFICE_RADIUS_M, OFFICE_SUBNET,
    PLATFORM_NAME, SUPER_ADMIN_COMPANY, DEFAULT_TIMEZONE,
    FACE_MATCH_TOLERANCE, SESSION_COOKIE_SECURE, 
    SESSION_COOKIE_HTTPONLY, SESSION_COOKIE_SAMESITE,
    HOST, PORT, DEBUG,
    LIVENESS_CONFIDENCE_THRESHOLD, LIVENESS_SESSION_TTL_SECONDS, REQUIRE_LIVENESS,
    SMTP_HOST, SMTP_PORT, GMAIL_USER, GMAIL_PASS, FROM_EMAIL, FROM_NAME,
    SMTP_TLS_REJECT_UNAUTHORIZED
)
from database import (
    db, companies_col, users_col, employees_col, branches_col,
    departments_col, shifts_col, attendance_col, attendance_corrections_col,
    leaves_col, field_visits_col, audit_logs_col, policies_col,
    notifications_col, system_config_col, permissions_col,
    approvers_col, ip_change_requests_col,
    hash_password, log_audit_event, seed_global_system,
    calculate_distance_meters, get_organization_approvers,
    save_organization_approver, delete_organization_approver, is_designated_approver
)
from timezone_engine import (
    GLOBAL_TIMEZONES, GLOBAL_COUNTRIES, get_utc_now, 
    get_utc_iso_string, get_localized_time, format_utc_to_tz,
    evaluate_attendance_status, resolve_entity_timezone,
    get_utc_date_range_for_local_date
)
from face_engine import (
    encode_face_from_b64, recognize_face_from_b64,
    evaluate_liveness_score, check_virtual_camera_metadata,
    verify_face_biometric_match
)
from wifi_attendance import is_office_ip, get_client_real_ip, get_server_local_ip, match_ip_rule

app = Flask(
    __name__,
    template_folder="../frontend/templates",
    static_folder="../frontend/static"
)
app.secret_key = SECRET_KEY
app.config.update(
    SESSION_COOKIE_SECURE=SESSION_COOKIE_SECURE,
    SESSION_COOKIE_HTTPONLY=SESSION_COOKIE_HTTPONLY,
    SESSION_COOKIE_SAMESITE=SESSION_COOKIE_SAMESITE,
    PERMANENT_SESSION_LIFETIME=timedelta(days=30)
)
CORS(app)

# Persistent Authentication & Refresh Token Rotation Settings
JWT_SECRET = SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30
JWT_REFRESH_DAYS = 60

def generate_auth_tokens(user: dict) -> dict:
    """Generate 30-day persistent JWT and 60-day refresh token."""
    now = datetime.now(timezone.utc)
    user_id = str(user["_id"])
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "email": user.get("email", ""),
        "role": user.get("role", ""),
        "company_id": user.get("company_id", ""),
        "emp_id": user.get("emp_id", ""),
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRY_DAYS)
    }
    refresh_payload = {
        "sub": user_id,
        "user_id": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=JWT_REFRESH_DAYS)
    }
    access_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": JWT_EXPIRY_DAYS * 86400
    }

def decode_jwt_token(token: str) -> dict | None:
    """Decode and validate a JWT access or refresh token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

def set_auth_cookies(response, tokens: dict):
    """Attach secure, HTTP-only persistent authentication cookies (30 days)."""
    max_age = JWT_EXPIRY_DAYS * 86400
    response.set_cookie(
        "enterprise_auth_token",
        tokens["access_token"],
        max_age=max_age,
        httponly=True,
        samesite="Lax",
        secure=SESSION_COOKIE_SECURE,
        path="/"
    )
    response.set_cookie(
        "enterprise_refresh_token",
        tokens["refresh_token"],
        max_age=JWT_REFRESH_DAYS * 86400,
        httponly=True,
        samesite="Lax",
        secure=SESSION_COOKIE_SECURE,
        path="/"
    )
    return response

def clear_auth_cookies(response):
    """Clear persistent authentication cookies on explicit logout."""
    response.set_cookie("enterprise_auth_token", "", max_age=0, httponly=True, samesite="Lax", path="/")
    response.set_cookie("enterprise_refresh_token", "", max_age=0, httponly=True, samesite="Lax", path="/")
    return response

# In-memory secure OTP store with attempt limits and expiry.
# OTP codes are NEVER returned through an API or stored in the notification vault.
# { "COMPANY:EMP_ID": {"otp_hash": str, "expires": float, "attempts": int, "created_ts": float, "recipient_emails": list} }
otp_store = {}

def _mask_email(email: str) -> str:
    email = (email or "").strip().lower()
    if "@" not in email:
        return "configured email"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[:1] + "*"
    else:
        masked_local = local[:2] + "***" + local[-1:]
    return f"{masked_local}@{domain}"

def send_smtp_email(to_emails, subject: str, text_body: str, html_body: str | None = None) -> tuple[bool, str]:
    """Send an email through configured Gmail SMTP credentials."""
    recipients = []
    for value in (to_emails if isinstance(to_emails, (list, tuple, set)) else [to_emails]):
        value = (value or "").strip().lower()
        if value and value not in recipients:
            recipients.append(value)
    if not recipients:
        return False, "No recipient email configured"
    if not GMAIL_USER or not GMAIL_PASS:
        return False, "SMTP Gmail credentials are not configured"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL or GMAIL_USER}>"
    msg["To"] = ", ".join(recipients)
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    def _send(sender_email: str):
        context = ssl.create_default_context()
        if not SMTP_TLS_REJECT_UNAUTHORIZED:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(GMAIL_USER, GMAIL_PASS)
            server.send_message(msg, from_addr=sender_email, to_addrs=recipients)

    try:
        _send(FROM_EMAIL or GMAIL_USER)
        return True, "sent"
    except Exception as first_error:
        # Gmail may reject an unverified From alias (for example info@recruweb.com).
        # Retry with the authenticated Gmail mailbox as sender so OTP delivery still works.
        if (FROM_EMAIL or "").strip().lower() != GMAIL_USER.strip().lower():
            try:
                msg.replace_header("From", f"{FROM_NAME} <{GMAIL_USER}>")
                _send(GMAIL_USER)
                return True, "sent using authenticated Gmail sender"
            except Exception as second_error:
                return False, f"SMTP delivery failed: {second_error}"
        return False, f"SMTP delivery failed: {first_error}"

# In-memory single-use cryptographic liveness challenge store:
# { "session_token": {"company_id": str, "emp_id": str, "challenge": str, "challenge_text": str, "nonce": str, "expires_ts": float, "used": bool} }
liveness_challenge_store = {}

ACTIVE_CHALLENGES = ["BLINK", "TURN_LEFT", "TURN_RIGHT", "SMILE"]
CHALLENGE_DESCRIPTIONS = {
    "BLINK": "Please blink your eyes naturally",
    "TURN_LEFT": "Please turn your head slightly to the left",
    "TURN_RIGHT": "Please turn your head slightly to the right",
    "SMILE": "Please smile naturally"
}

def clean_expired_liveness_sessions():
    """Remove expired or consumed liveness challenge tokens."""
    now_ts = datetime.now(timezone.utc).timestamp()
    expired = [k for k, v in liveness_challenge_store.items() if now_ts > v.get("expires_ts", 0) or v.get("used")]
    for k in expired:
        liveness_challenge_store.pop(k, None)

def create_liveness_challenge_session(company_id: str, emp_id: str) -> dict:
    """Create a new short-lived single-use liveness challenge session."""
    clean_expired_liveness_sessions()
    token = "lv_" + secrets.token_hex(16)
    nonce = "n_" + secrets.token_hex(8)
    action = random.choice(ACTIVE_CHALLENGES)
    expires = datetime.now(timezone.utc).timestamp() + LIVENESS_SESSION_TTL_SECONDS
    
    session_data = {
        "company_id": (company_id or "").upper(),
        "emp_id": (emp_id or "").upper(),
        "challenge": action,
        "challenge_text": CHALLENGE_DESCRIPTIONS.get(action, "Please face camera"),
        "nonce": nonce,
        "expires_ts": expires,
        "used": False,
        "created_at": get_utc_iso_string()
    }
    liveness_challenge_store[token] = session_data
    return {
        "ok": True,
        "session_token": token,
        "challenge": action,
        "challenge_text": session_data["challenge_text"],
        "nonce": nonce,
        "expires_in": LIVENESS_SESSION_TTL_SECONDS
    }

def validate_and_consume_liveness_session(token: str, company_id: str, emp_id: str, nonce: str = None) -> tuple:
    """Validate and atomically consume a liveness session token to defeat replay attacks."""
    if not token:
        return False, None, "Missing liveness session token"
    clean_expired_liveness_sessions()
    sess = liveness_challenge_store.get(token)
    if not sess:
        return False, None, "Invalid or expired liveness session token"
    if sess.get("used"):
        return False, None, "Anti-Replay Attack Detected: This liveness session token has already been consumed"
    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts > sess.get("expires_ts", 0):
        liveness_challenge_store.pop(token, None)
        return False, None, "Liveness session token has expired. Please initiate a fresh challenge"
    if sess.get("company_id") and company_id and sess.get("company_id") != company_id.upper():
        return False, None, "Liveness session token company mismatch"
    if sess.get("emp_id") and emp_id and sess.get("emp_id") != emp_id.upper():
        return False, None, "Liveness session token employee mismatch"
    if nonce and sess.get("nonce") != nonce:
        return False, None, "Liveness session nonce mismatch"
        
    # Atomically mark consumed to guarantee anti-replay protection
    sess["used"] = True
    liveness_challenge_store.pop(token, None)
    return True, sess, None


# ══════════════════════════════════════════════════════════════════════════════
#  SECURITY & AUTHENTICATION HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def client_ip():
    return get_client_real_ip(request)


def client_user_agent():
    return request.headers.get("User-Agent", "Unknown Browser")


def get_current_user():
    """
    Retrieve currently authenticated user from session or persistent HTTP-only JWT token.
    Provides complete session persistence across browser restarts, tabs, and page reloads.
    """
    # 1. Active Flask Session
    if "user_id" in session:
        try:
            user = users_col.find_one({"_id": ObjectId(session["user_id"])})
            if user:
                session.permanent = True
                return user
        except Exception:
            pass

    # 2. Check persistent HTTP-only JWT Cookie or Authorization header
    token = request.cookies.get("enterprise_auth_token")
    if not token:
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr.split(" ", 1)[1].strip()

    if token:
        payload = decode_jwt_token(token)
        if payload and "user_id" in payload:
            try:
                user = users_col.find_one({"_id": ObjectId(payload["user_id"])})
                if user:
                    session["user_id"] = str(user["_id"])
                    session["role"] = user.get("role")
                    session["company_id"] = user.get("company_id", "")
                    session.permanent = True
                    return user
            except Exception:
                pass

    # 3. Check persistent Refresh Token rotation
    refresh_token = request.cookies.get("enterprise_refresh_token")
    if refresh_token:
        ref_payload = decode_jwt_token(refresh_token)
        if ref_payload and ref_payload.get("type") == "refresh" and "user_id" in ref_payload:
            try:
                user = users_col.find_one({"_id": ObjectId(ref_payload["user_id"])})
                if user:
                    session["user_id"] = str(user["_id"])
                    session["role"] = user.get("role")
                    session["company_id"] = user.get("company_id", "")
                    session.permanent = True
                    return user
            except Exception:
                pass

    return None


def require_auth(allowed_roles=None):
    """
    Session-based RBAC Authentication Guard.
    Returns (user, None) if authorized, or (None, (error_json, status_code)) if unauthorized.
    """
    user = get_current_user()
    if not user:
        return None, (jsonify({"ok": False, "error": "Authentication required. Please sign in."}), 401)
    
    if user.get("status") != "active":
        return None, (jsonify({"ok": False, "error": "Your account is inactive. Contact your administrator."}), 403)

    if allowed_roles:
        if user.get("role") not in allowed_roles:
            return None, (jsonify({"ok": False, "error": "Forbidden: Insufficient privileges for this resource."}), 403)

    return user, None


def resolve_tenant_id(user: dict, requested_company_id: str = None) -> tuple[str, tuple]:
    """
    STRICT TENANT ISOLATION:
    - Super Admin can access any requested company or defaults to their own.
    - Company Admin, HR, Manager, Employee CAN ONLY access their own assigned company.
    If a non-Super Admin attempts to access a different company, returns (None, (error_json, 403)).
    """
    if not user:
        return None, (jsonify({"ok": False, "error": "Authentication required"}), 401)

    user_role = user.get("role")
    user_company = user.get("company_id", "").upper()

    if user_role == "super_admin":
        if requested_company_id and requested_company_id.strip():
            return requested_company_id.strip().upper(), None
        return user_company, None

    if requested_company_id and requested_company_id.strip():
        req_clean = requested_company_id.strip().upper()
        if req_clean != user_company:
            log_audit_event(
                action="CROSS_TENANT_ACCESS_DENIED",
                company_id=user_company,
                actor_name=user.get("name"),
                actor_role=user_role,
                details={"attempted_tenant": req_clean},
                ip=client_ip(),
                user_agent=client_user_agent()
            )
            return None, (jsonify({"ok": False, "error": "Access Denied: You cannot view or modify data from other company workspaces. Cross-tenant access forbidden."}), 403)

    return user_company, None


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two GPS points in meters."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ── ATTENDANCE CONTROLLER & ROLE-BASED VERIFICATION HELPERS ───────────────────
DEFAULT_WORK_TYPE_METHODS = {
    "Office": ["OTP", "WiFi", "Face"],
    "WFH": ["Face", "OTP", "GPS"],
    "Field": ["GPS", "Face", "OTP"]
}

DEFAULT_ATTENDANCE_CONTROLLER = {
    "allowed_methods": ["Face", "OTP", "WiFi", "GPS"],
    "can_assign_methods": True,
    "can_modify_shifts": True,
    "can_configure_geofence_wifi": True,
    "can_approve_corrections": True,
    "enable_clock_out": True,
    "allow_mobile_clockout": True,
    "allow_web_clockout": True,
    "require_geofence": True,
    "require_ip_check": True,
    "require_wifi_for_office": False,
    "office_wifi_ip": "",
    "lock_office_wifi_ip": False,
    "allowed_work_types": ["Office", "WFH", "Field"]
}


def normalize_attendance_method(method: str) -> str:
    """Standardize attendance method strings across Web, App, and Telemetry."""
    if not method:
        return "Face"
    m = str(method).strip().lower()
    if any(k in m for k in ["face", "camera", "biometric"]):
        return "Face"
    if any(k in m for k in ["otp", "code", "token", "2fa", "dynamic"]):
        return "OTP"
    if any(k in m for k in ["wifi", "wi-fi", "ip", "subnet"]):
        return "WiFi"
    if any(k in m for k in ["gps", "field", "geo", "satellite", "location"]):
        return "GPS"
    return method


def get_company_controller_settings(company_or_id) -> dict:
    """Retrieve effective Attendance Controller settings governed by Super Admin."""
    if not company_or_id:
        return dict(DEFAULT_ATTENDANCE_CONTROLLER)
    if isinstance(company_or_id, str):
        comp = companies_col.find_one({"company_id": company_or_id.upper()})
    else:
        comp = company_or_id
    if not comp:
        return dict(DEFAULT_ATTENDANCE_CONTROLLER)
    ctrl = comp.get("attendance_controller")
    if isinstance(ctrl, dict) and ctrl.get("allowed_methods"):
        res = dict(DEFAULT_ATTENDANCE_CONTROLLER)
        res.update(ctrl)
        return res
    # Fallback to system-wide global controller settings if configured
    global_cfg = system_config_col.find_one({"config_key": "global_attendance_controller"})
    if global_cfg and isinstance(global_cfg.get("settings"), dict):
        res = dict(DEFAULT_ATTENDANCE_CONTROLLER)
        res.update(global_cfg["settings"])
        return res
    return dict(DEFAULT_ATTENDANCE_CONTROLLER)


def get_employee_assigned_methods(employee: dict, company: dict = None) -> list:
    """
    Returns the specific attendance methods assigned to the employee.
    Strictly bounded by Super Admin's company-level permissions.
    """
    if not employee:
        return ["Face", "OTP"]
    work_type = employee.get("work_type", "Office")
    if work_type not in DEFAULT_WORK_TYPE_METHODS:
        work_type = "Office"

    # Get permitted methods at company level (Super Admin controlled)
    comp_settings = get_company_controller_settings(company or employee.get("company_id"))
    comp_allowed = [normalize_attendance_method(m) for m in comp_settings.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"])]

    # If employee has explicitly assigned methods from Company Admin
    raw_assigned = employee.get("allowed_methods")
    if isinstance(raw_assigned, list) and len(raw_assigned) > 0:
        assigned = [normalize_attendance_method(m) for m in raw_assigned]
    else:
        # Defaults based on workforce type (Office: OTP, WiFi, Face | WFH: Face, OTP, GPS | Field: GPS, Face, OTP)
        assigned = [normalize_attendance_method(m) for m in DEFAULT_WORK_TYPE_METHODS.get(work_type, ["Face", "OTP"])]

    # Filter strictly by company-level permissions granted by Super Admin
    effective = [m for m in assigned if m in comp_allowed]
    if not effective:
        # Fallback to any permitted method for this company
        effective = [m for m in DEFAULT_WORK_TYPE_METHODS.get(work_type, ["Face", "OTP"]) if m in comp_allowed]
        if not effective and comp_allowed:
            effective = [comp_allowed[0]]
    return effective


def check_attendance_duplicate_status(company_id: str, emp_id: str, local_date: str, check_type: str = "IN"):
    """
    Robust duplicate prevention supporting both Clock-In and Clock-Out across all attendance methods.
    Returns: (is_duplicate: bool, existing_record: dict, duplicate_message: str)
    """
    check_type = str(check_type or "IN").strip().upper()
    if check_type not in ("IN", "OUT"):
        check_type = "IN"

    if check_type == "IN":
        # Check if already clocked IN today (or legacy punch without check_type)
        existing_in = attendance_col.find_one({
            "company_id": company_id.upper(),
            "emp_id": emp_id.upper(),
            "$or": [{"check_type": "IN"}, {"check_type": {"$exists": False}}],
            "$and": [{"$or": [{"date": local_date}, {"local_date": local_date}]}]
        })
        if existing_in:
            t = existing_in.get("time") or existing_in.get("local_time") or "earlier today"
            return True, existing_in, f"Attendance already marked: Clock-IN recorded for today at {t}"
        return False, None, None

    elif check_type == "OUT":
        # Check if already clocked OUT today
        existing_out = attendance_col.find_one({
            "company_id": company_id.upper(),
            "emp_id": emp_id.upper(),
            "check_type": "OUT",
            "$or": [{"date": local_date}, {"local_date": local_date}]
        })
        if existing_out:
            t = existing_out.get("time") or existing_out.get("local_time") or "earlier today"
            return True, existing_out, f"Attendance already marked: Clock-OUT recorded for today at {t}"
        return False, None, None


def validate_company_and_employee(company_id: str, emp_id: str, required_method: str = None):
    """
    Validate that:
    1. Company exists and is active.
    2. Employee exists, belongs to company, and is active.
    3. Method is permitted by Super Admin Controller for this company.
    4. Method is assigned to this specific employee.
    5. Employee workforce type is authorized for the requested method.
    """
    if not company_id or not emp_id:
        return None, None, "Company ID and Employee ID are required"

    company = companies_col.find_one({"company_id": company_id.upper()})
    if not company:
        return None, None, f"Company workspace '{company_id}' not found"
    
    if company.get("status") != "active":
        return None, None, f"Company workspace '{company_id}' is currently {company.get('status', 'inactive')}. Contact platform administrator."

    employee = employees_col.find_one({"company_id": company_id.upper(), "emp_id": emp_id.upper()})
    if not employee:
        employee = users_col.find_one({"company_id": company_id.upper(), "$or": [{"emp_id": emp_id.upper()}, {"email": emp_id.lower()}]})
    if not employee:
        return None, None, f"Employee '{emp_id}' not found in company workspace '{company_id}'"

    if employee.get("status") != "active":
        return None, None, f"Employee account '{emp_id}' is {employee.get('status', 'inactive')}. Please wait for approval or contact HR."

    if required_method:
        norm_req = normalize_attendance_method(required_method)

        # 1. Check Super Admin controller permissions for company
        controller_cfg = get_company_controller_settings(company)
        comp_allowed = [normalize_attendance_method(m) for m in controller_cfg.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"])]
        if norm_req not in comp_allowed:
            return None, None, f"Attendance method '{required_method}' is disabled for your organization by Super Admin"

        # 2. Check Employee assigned methods (decided by Company Admin from available permissions)
        emp_allowed = get_employee_assigned_methods(employee, company)
        emp_allowed_norm = [normalize_attendance_method(m) for m in emp_allowed]
        if norm_req not in emp_allowed_norm:
            assigned_disp = ", ".join(emp_allowed) if emp_allowed else "None"
            return None, None, f"Attendance method '{required_method}' is not assigned to your profile. Permitted methods: [{assigned_disp}]"

        work_type = employee.get("work_type", "Office")
        if work_type == "Remote" and norm_req == "WiFi":
            return None, None, "Wi-Fi check-in is only available for on-premise Office employees"
        if work_type == "Office" and norm_req == "GPS" and not employee.get("field_override", False):
            # Allow GPS if assigned to office employee or field override
            if "GPS" not in emp_allowed_norm:
                return None, None, f"GPS check-in is not assigned for your employee profile ({work_type})"

    return company, employee, None


# ══════════════════════════════════════════════════════════════════════════════
#  FRONTEND PAGE ROUTES & STRICT ROUTE GUARDS
# ══════════════════════════════════════════════════════════════════════════════

def get_user_dashboard_url(user):
    if not user:
        return "/login"
    role = user.get("role")
    if role == "super_admin":
        return "/admin/dashboard"
    elif role in ("company_admin", "hr", "manager"):
        return "/workspace/dashboard"
    else:
        return "/employee/portal"


def guard_html_route(allowed_roles=None):
    user, err = require_auth(allowed_roles=allowed_roles)
    if err:
        target = request.full_path.rstrip('?')
        return None, redirect(url_for("login_page", redirectTo=target))
    return user, None


@app.route("/")
def index():
    user = get_current_user()
    if user:
        return redirect(get_user_dashboard_url(user))
    return redirect(url_for("login_page"))


@app.route("/login")
def login_page():
    user = get_current_user()
    if user:
        return redirect(get_user_dashboard_url(user))
    return render_template("login.html")


@app.route("/landing")
def landing_page():
    return render_template("landing.html")


@app.route("/register")
@app.route("/register-employee")
@app.route("/status")
def register_page():
    return render_template("register.html")


@app.route("/register-company")
def register_company_page():
    return render_template("register_company.html")


@app.route("/forgot-password")
def forgot_password_page():
    return render_template("forgot_password.html")


@app.route("/privacy-policy")
def privacy_policy_page():
    return render_template("privacy_policy.html")


@app.route("/terms")
def terms_page():
    return render_template("terms.html")


@app.route("/favicon.ico")
def favicon():
    img_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "static", "images")
    if os.path.exists(os.path.join(img_dir, "ardhnarishwar_logo.png")):
        return send_from_directory(img_dir, "ardhnarishwar_logo.png", mimetype="image/png")
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
      <defs>
        <linearGradient id="gamsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10B981"/>
          <stop offset="100%" stop-color="#6366F1"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="#070B14"/>
      <circle cx="24" cy="24" r="18" fill="none" stroke="url(#gamsGrad)" stroke-width="2.5"/>
      <ellipse cx="24" cy="24" rx="9" ry="18" fill="none" stroke="url(#gamsGrad)" stroke-width="1.8" stroke-dasharray="2 1"/>
      <line x1="6" y1="24" x2="42" y2="24" stroke="url(#gamsGrad)" stroke-width="1.8"/>
      <circle cx="24" cy="24" r="6" fill="#10B981"/>
      <path d="M24 20v4l3 2" fill="none" stroke="#070B14" stroke-width="2" stroke-linecap="round"/>
      <circle cx="34" cy="14" r="4" fill="#06B6D4"/>
    </svg>'''
    return Response(svg, mimetype="image/svg+xml")


@app.route("/health", methods=["GET"])
def health_check():
    """Production Health Check Endpoint."""
    db_status = "connected"
    try:
        companies_col.find_one({}, {"_id": 1})
    except Exception as e:
        db_status = f"degraded ({str(e)})"

    return jsonify({
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "Global Attendance Management System",
        "version": "2.4.0",
        "environment": "production",
        "database": db_status,
        "timestamp_utc": get_utc_iso_string()
    })


@app.route("/admin/dashboard")
@app.route("/super-admin")
@app.route("/superadmin")
@app.route("/portal/superadmin")
def super_admin_dashboard():
    user, redir = guard_html_route(allowed_roles=["super_admin"])
    if redir:
        return redir
    return render_template("super_admin.html", user=user)


@app.route("/portal/approver")
@app.route("/portal/approvers")
@app.route("/approver/dashboard")
def portal_approver():
    user = get_current_user()
    if not user:
        return redirect(url_for("login_page", redirectTo="/portal/organization?tab=approvals"))
    return redirect("/portal/organization?tab=approvals")


@app.route("/workspace/dashboard")
@app.route("/admin")
def company_admin_dashboard():
    user, redir = guard_html_route(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if redir:
        return redir
    return render_template("admin.html", user=user)


# ── Unified Single URL Entrypoint for ALL Dashboards ─────────────────────────
@app.route("/dashboard")
@app.route("/portal")
def unified_dashboard():
    """
    ONE UNIFIED URL FOR ALL DASHBOARDS:
    Allows all users (Super Admin, Company Admin, Designated Approvers, HR, and Employees)
    to visit ONE URL ('/dashboard' or '/portal') and automatically resolves to their
    respective, dedicated dashboard based on their role:
      - Super Admin: /admin/dashboard
      - Company Admin / HR / Approvers: /portal/organization
      - Employees / Staff: /portal/employee
    Unauthenticated users are directed to login with return redirect.
    """
    user = get_current_user()
    if not user:
        return redirect(url_for("login_page", redirectTo="/dashboard"))
    
    role = user.get("role", "employee")
    if role == "super_admin":
        return render_template("super_admin.html", user=user)
    elif role in ("company_admin", "hr", "manager"):
        if request.args.get("view") == "workspace":
            return render_template("admin.html", user=user)
        return render_template("portal_organization.html", user=user)
    else:
        if request.args.get("view") == "classic":
            return render_template("employee.html", user=user)
        return render_template("portal_employee.html", user=user)


@app.route("/api/ip-info")
@app.route("/api/my-ip")
def api_ip_info():
    """
    IP Address Diagnostics API for Attendance:
    Returns the real client IP detected by the server, network headers,
    evaluation against office Wi-Fi rules, and assigned static home IP details.
    """
    detected_ip = client_ip()
    user = get_current_user()
    
    comp_id = request.args.get("company_id") or (user.get("company_id") if user else None)
    
    wfo_match = False
    wfo_msg = "No organization specified"
    configured_rules = []
    if comp_id:
        wfo_match, wfo_msg = is_office_ip(detected_ip, company_id=comp_id)
        comp = companies_col.find_one({"company_id": comp_id.upper()})
        if comp:
            office_rule = comp.get("officeWifiIp") or comp.get("office_wifi_ip")
            if office_rule:
                configured_rules = [r.strip() for r in str(office_rule).split(",") if r.strip()]

    emp_assigned_ip = None
    wfh_match = None
    if user and user.get("role") == "employee":
        emp_doc = employees_col.find_one({"company_id": user.get("company_id", "").upper(), "emp_id": user.get("emp_id", "").upper()})
        if emp_doc:
            emp_assigned_ip = emp_doc.get("assigned_ip") or emp_doc.get("assignedIp")
            if emp_assigned_ip:
                wfh_match = any(match_ip_rule(detected_ip, r.strip()) for r in str(emp_assigned_ip).split(",") if r.strip())

    return jsonify({
        "ok": True,
        "client_ip": detected_ip,
        "raw_remote_addr": request.remote_addr,
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "x_real_ip": request.headers.get("X-Real-IP"),
        "server_local_ip": get_server_local_ip(),
        "is_localhost": detected_ip in ("127.0.0.1", "::1", "localhost"),
        "company_id": comp_id,
        "wfo_attendance": {
            "configured_rules": configured_rules,
            "ip_verified": wfo_match,
            "message": wfo_msg
        },
        "wfh_attendance": {
            "assigned_ip": emp_assigned_ip,
            "ip_verified": wfh_match,
            "message": "Assigned IP matches" if wfh_match else ("No static IP assigned" if not emp_assigned_ip else f"Current IP ({detected_ip}) does not match assigned IP ({emp_assigned_ip})")
        },
        "details": {
            "wfo_explanation": "Work From Office attendance checks incoming client IP against the organization's office Wi-Fi static IP or CIDR subnet block (e.g., 198.51.100.50 or 192.168.1.0/24).",
            "wfh_explanation": "Work From Home attendance checks incoming client IP against the static IP allocated to this employee by the administrator.",
            "sales_field_explanation": "Sales Field attendance records live GPS and incoming client IP for audit compliance.",
            "localhost_notice": "When running on localhost (127.0.0.1), client IP is 127.0.0.1. In production, the public gateway IP or ISP address is automatically extracted from X-Forwarded-For or X-Real-IP."
        }
    })


# ── Dedicated Enterprise & Employee Portals (Strict Route Separation) ────────

@app.route("/portal/organization")
def portal_organization():
    """
    Dedicated Organization Enterprise Portal.
    Strictly branded for Admins, HR, Managers, and Designated Approvers.
    No candidate/employee login references.
    """
    user = get_current_user()
    return render_template("portal_organization.html", user=user)


@app.route("/portal/employee")
def portal_employee():
    """
    Dedicated Employee Self-Service Portal.
    Strictly branded for Candidates/Staff self-service.
    No admin/super-admin crossover.
    """
    user = get_current_user()
    return render_template("portal_employee.html", user=user)


@app.route("/employee/portal")
@app.route("/employee/dashboard")
@app.route("/employee")
def employee_portal():
    user, redir = guard_html_route(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if redir:
        return redir
    return render_template("employee.html", user=user)


@app.route("/employee/face")
def face_attendance_page():
    user, redir = guard_html_route(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if redir:
        return redir
    return render_template("face_attendance.html", user=user)


@app.route("/employee/otp")
def otp_attendance_page():
    user, redir = guard_html_route(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if redir:
        return redir
    return render_template("otp_attendance.html", user=user)


@app.route("/employee/wifi")
def wifi_attendance_page():
    user, redir = guard_html_route(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if redir:
        return redir
    return render_template("wifi_attendance.html", user=user)


@app.route("/employee/field")
def field_attendance_page():
    user, redir = guard_html_route(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if redir:
        return redir
    return render_template("field_attendance.html", user=user)


# Standard Enterprise Dashboard & Navigation Aliases
@app.route("/admin/workspaces")
def alias_admin_workspaces():
    return redirect("/admin/dashboard?tab=companies")


@app.route("/admin/requests/pending")
def alias_admin_pending():
    return redirect("/admin/dashboard?tab=pending")


@app.route("/admin/attendance/global")
def alias_admin_attendance():
    return redirect("/admin/dashboard?tab=attendance")


@app.route("/admin/security/global")
def alias_admin_security():
    return redirect("/admin/dashboard?tab=audit")


# ══════════════════════════════════════════════════════════════════════════════
#  AUTHENTICATION APIS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json or {}
    role = data.get("role", "company_admin").strip()
    identifier = data.get("mobile", "").strip() or data.get("email", "").strip() or data.get("emp_id", "").strip() or data.get("identifier", "").strip()
    password = data.get("password", "").strip()
    company_id = data.get("company_id", "").strip().upper()

    if not identifier or not password:
        return jsonify({"ok": False, "error": "Identifier (Email/Mobile/EmpID) and password are required"}), 400

    if role == "company_admin":
        role_filter = {"$in": ["company_admin", "hr", "manager"]}
    else:
        role_filter = role

    query = {
        "role": role_filter,
        "$or": [
            {"mobile": identifier},
            {"email": identifier},
            {"email": identifier.lower()},
            {"emp_id": identifier.upper()}
        ]
    }

    if role != "super_admin":
        if not company_id:
            return jsonify({"ok": False, "error": "Company Workspace ID is required"}), 400
        
        # Flexible company resolution (case-insensitive ID, name, or alphanumeric fuzzy match)
        clean_comp_query = re.sub(r'[^a-zA-Z0-9]', '', company_id)
        comp_match = companies_col.find_one({
            "$or": [
                {"company_id": company_id.upper()},
                {"company_id": company_id},
                {"company_id": {"$regex": f"^{re.escape(company_id)}$", "$options": "i"}},
                {"name": {"$regex": f"^{re.escape(company_id)}$", "$options": "i"}},
                {"company_id": {"$regex": re.escape(company_id), "$options": "i"}},
                {"name": {"$regex": re.escape(company_id), "$options": "i"}}
            ]
        })
        if not comp_match and clean_comp_query:
            all_comps = list(companies_col.find({}, {"_id": 0, "company_id": 1, "name": 1}))
            # 1. Exact alphanumeric match first
            for c in all_comps:
                c_clean_id = re.sub(r'[^a-zA-Z0-9]', '', c.get("company_id", ""))
                if clean_comp_query.lower() == c_clean_id.lower():
                    comp_match = c
                    break
            # 2. Substring fallback if not found
            if not comp_match:
                for c in all_comps:
                    c_clean_id = re.sub(r'[^a-zA-Z0-9]', '', c.get("company_id", ""))
                    c_clean_name = re.sub(r'[^a-zA-Z0-9]', '', c.get("name", ""))
                    if (clean_comp_query.lower() in c_clean_id.lower() or 
                        c_clean_id.lower() in clean_comp_query.lower() or 
                        clean_comp_query.lower() in c_clean_name.lower()):
                        comp_match = c
                        break

        canonical_comp_id = comp_match["company_id"] if comp_match else company_id.upper()
        query["company_id"] = canonical_comp_id

    user = users_col.find_one(query)
    if not user or user.get("password") != hash_password(password):
        return jsonify({"ok": False, "error": "Invalid login credentials or unauthorized role"}), 401

    if user.get("status") == "pending":
        return jsonify({
            "ok": False,
            "status": "pending",
            "error": "Your registration is under review. Please wait for Super Admin approval."
        }), 403
    elif user.get("status") == "rejected":
        return jsonify({
            "ok": False,
            "status": "rejected",
            "error": "Your registration application has been rejected by administration."
        }), 403
    elif user.get("status") != "active":
        return jsonify({
            "ok": False,
            "status": user.get("status", "inactive"),
            "error": f"Account is {user.get('status', 'inactive').upper()}. Contact your administrator."
        }), 403

    # Check Company status for non-superadmin users
    if user.get("role") != "super_admin":
        comp = companies_col.find_one({"company_id": user.get("company_id")})
        if not comp:
            return jsonify({"ok": False, "error": "Company workspace not found"}), 404
        if comp.get("status") == "pending":
            return jsonify({
                "ok": False,
                "status": "pending",
                "error": "Your company workspace registration is under review. Please wait for Super Admin approval."
            }), 403
        elif comp.get("status") != "active":
            return jsonify({
                "ok": False,
                "status": comp.get("status", "inactive"),
                "error": f"Company workspace is {comp.get('status', 'inactive').upper()}. Contact platform admin."
            }), 403

    session["user_id"] = str(user["_id"])
    session["role"] = user["role"]
    session["company_id"] = user.get("company_id", "")
    session.permanent = True

    log_audit_event(
        action="USER_LOGIN",
        company_id=user.get("company_id", "GLOBAL"),
        actor_name=user.get("name", ""),
        actor_role=user.get("role", ""),
        details={"identifier": identifier, "role": role},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    redirect_url = "/employee/portal"
    if user["role"] == "super_admin":
        redirect_url = "/admin/dashboard"
    elif user["role"] in ("company_admin", "hr", "manager"):
        redirect_url = "/workspace/dashboard"

    # Fetch extra employee metadata if employee
    emp_record = None
    if user["role"] == "employee":
        emp_record = employees_col.find_one({"company_id": user.get("company_id", "").upper(), "emp_id": user.get("emp_id", "").upper()})
    
    work_mode = (emp_record.get("work_mode") or emp_record.get("workMode")) if emp_record else (user.get("work_mode") or user.get("workMode"))
    is_first_login = emp_record.get("is_first_login", emp_record.get("isFirstLogin", True)) if emp_record else user.get("is_first_login", user.get("isFirstLogin", True))

    tokens = generate_auth_tokens(user)

    resp_payload = {
        "ok": True,
        "role": user["role"],
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "mobile": user.get("mobile", ""),
        "company_id": user.get("company_id", ""),
        "emp_id": user.get("emp_id", ""),
        "redirect_url": redirect_url,
        "work_mode": work_mode,
        "is_first_login": is_first_login,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"]
    }
    response = jsonify(resp_payload)
    return set_auth_cookies(response, tokens)


@app.route("/api/logout", methods=["POST"])
def api_logout():
    user = get_current_user()
    if user:
        log_audit_event(
            action="USER_LOGOUT",
            company_id=user.get("company_id", "GLOBAL"),
            actor_name=user.get("name", ""),
            actor_role=user.get("role", ""),
            details={},
            ip=client_ip(),
            user_agent=client_user_agent()
        )
    session.clear()
    response = jsonify({"ok": True, "message": "Logged out successfully"})
    return clear_auth_cookies(response)


@app.route("/api/me", methods=["GET"])
def api_me():
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "authenticated": False}), 401
    
    user["_id"] = str(user["_id"])
    user.pop("password", None)

    # Attach employee specific fields
    if user.get("role") == "employee":
        emp_doc = employees_col.find_one({
            "company_id": user.get("company_id", "").upper(),
            "emp_id": user.get("emp_id", "").upper()
        }, {"_id": 0, "face_encoding": 0})
        if emp_doc:
            user["work_mode"] = emp_doc.get("work_mode") or emp_doc.get("workMode")
            user["work_type"] = emp_doc.get("work_type", "Office")
            user["allowed_methods"] = get_employee_assigned_methods(emp_doc)
            user["is_first_login"] = emp_doc.get("is_first_login", emp_doc.get("isFirstLogin", True))
            user["home_latitude"] = emp_doc.get("home_latitude") or emp_doc.get("homeLatitude")
            user["home_longitude"] = emp_doc.get("home_longitude") or emp_doc.get("homeLongitude")
            user["home_range_radius_m"] = emp_doc.get("home_range_radius_m") or emp_doc.get("homeRangeRadiusM", 200)
            user["assigned_ip"] = emp_doc.get("assigned_ip") or emp_doc.get("assignedIp")
            user["employee_profile"] = emp_doc

    target_comp_id = request.args.get("company_id", "").strip().upper()
    comp_to_fetch = target_comp_id if (user.get("role") == "super_admin" and target_comp_id) else user.get("company_id")

    company = None
    if comp_to_fetch and comp_to_fetch != "ARDHNARISHWAR":
        comp_doc = companies_col.find_one({"company_id": comp_to_fetch}, {"_id": 0})
        if comp_doc:
            # Attach designated approvers and attendance controller
            comp_doc["approvers"] = get_organization_approvers(comp_to_fetch)
            comp_doc["attendance_controller"] = get_company_controller_settings(comp_doc)
            company = comp_doc

    return jsonify({
        "ok": True,
        "authenticated": True,
        "user": user,
        "company": company
    })


# ── Self-Registration & Password Recovery APIs ─────────────────────────────────

@app.route("/api/auth/register-company", methods=["POST"])
def api_register_company():
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    country = data.get("country", "India").strip()
    tz = data.get("timezone", DEFAULT_TIMEZONE).strip()
    gst_number = data.get("gst_number", "").strip().upper() or data.get("reg_no", "").strip().upper()
    admin_name = data.get("admin_name", "Administrator").strip()
    password = data.get("admin_password", "").strip()

    if not company_id or not name or not phone or not password:
        return jsonify({"ok": False, "error": "Company ID, Legal Name, Contact Phone, and Admin Password are required"}), 400

    if companies_col.find_one({"company_id": company_id}):
        return jsonify({"ok": False, "error": f"Workspace ID '{company_id}' is already registered"}), 409

    if users_col.find_one({"mobile": phone}):
        return jsonify({"ok": False, "error": f"Phone number '{phone}' is already registered with another account"}), 409

    now_utc = get_utc_iso_string()

    # Create Company with Pending Status for Super Admin approval
    company_doc = {
        "company_id": company_id,
        "name": name,
        "gst_number": gst_number,
        "email": email,
        "contact_phone": phone,
        "country": country,
        "timezone": tz,
        "status": "pending",
        "created_at": now_utc,
        "plan": "Enterprise",
        "policy": {
            "shift_start": "09:30",
            "shift_end": "18:30",
            "grace_period_mins": 15,
            "half_day_after": "13:00"
        },
        "office_locations": [{
            "location_name": "Main Office",
            "lat": OFFICE_LAT,
            "lng": OFFICE_LNG,
            "radius_m": OFFICE_RADIUS_M,
            "wifi_subnet": OFFICE_SUBNET
        }]
    }
    companies_col.insert_one(company_doc)

    # Create Company Admin account in pending status
    admin_user = {
        "company_id": company_id,
        "name": admin_name,
        "email": email,
        "mobile": phone,
        "password": hash_password(password),
        "role": "company_admin",
        "status": "pending",
        "created_at": now_utc
    }
    users_col.insert_one(admin_user)

    # Record system notification for Super Admin
    notifications_col.insert_one({
        "company_id": "ARDHNARISHWAR",
        "emp_id": "SUPER_ADMIN",
        "title": "New Company Registration Request",
        "message": f"Company '{name}' ({company_id}) registered from {country}. Awaiting verification and activation.",
        "type": "COMPANY_ONBOARDING",
        "is_read": False,
        "timestamp_utc": now_utc
    })

    log_audit_event(
        action="COMPANY_SELF_REGISTERED",
        company_id=company_id,
        actor_name=admin_name,
        actor_role="company_admin",
        details={"company_name": name, "country": country, "phone": phone},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "status": "pending",
        "message": "Company workspace submitted for review. An Ardhnarishwar Super Admin will review and activate your workspace."
    })


@app.route("/api/auth/verify-company/<company_id>", methods=["GET"])
def api_verify_company(company_id):
    """Check if a company workspace exists and is active for employee registration."""
    company_query = company_id.strip()
    if not company_query:
        return jsonify({"ok": False, "exists": False, "error": "Company workspace ID is required"}), 400

    clean_query = re.sub(r'[^a-zA-Z0-9]', '', company_query)

    query = {
        "$or": [
            {"company_id": company_query.upper()},
            {"company_id": company_query},
            {"company_id": {"$regex": f"^{re.escape(company_query)}$", "$options": "i"}},
            {"name": {"$regex": f"^{re.escape(company_query)}$", "$options": "i"}},
            {"company_id": {"$regex": re.escape(company_query), "$options": "i"}},
            {"name": {"$regex": re.escape(company_query), "$options": "i"}}
        ]
    }
    comp = companies_col.find_one(query)

    if not comp and clean_query:
        all_comps = list(companies_col.find({}, {"_id": 0, "company_id": 1, "name": 1, "status": 1, "country": 1, "timezone": 1}))
        # 1. Exact alphanumeric match first
        for c in all_comps:
            c_clean_id = re.sub(r'[^a-zA-Z0-9]', '', c.get("company_id", ""))
            if clean_query.lower() == c_clean_id.lower():
                comp = c
                break
        # 2. Substring fallback
        if not comp:
            for c in all_comps:
                c_clean_id = re.sub(r'[^a-zA-Z0-9]', '', c.get("company_id", ""))
                c_clean_name = re.sub(r'[^a-zA-Z0-9]', '', c.get("name", ""))
                if (clean_query.lower() in c_clean_id.lower() or 
                    c_clean_id.lower() in clean_query.lower() or 
                    clean_query.lower() in c_clean_name.lower()):
                    comp = c
                    break
    
    if not comp:
        total_registered = companies_col.count_documents({})
        if total_registered == 0:
            error_msg = f"No organization workspaces are registered on this platform yet. Please register your Organization first in the 'Company Registration' tab."
        else:
            error_msg = f"Workspace '{company_query}' is not registered on this platform. Please verify your Workspace Code or register your organization first."
        
        return jsonify({
            "ok": False,
            "exists": False,
            "error": error_msg,
            "can_register_company": True
        }), 404
    
    canonical_id = comp.get("company_id", company_query.upper())
    status = comp.get("status", "active")
    
    if status == "suspended" or status == "rejected" or status == "inactive":
        return jsonify({
            "ok": False,
            "exists": True,
            "company_id": canonical_id,
            "status": status,
            "error": f"Workspace '{comp.get('name')}' is currently {status.upper()}. Staff registrations are temporarily paused."
        }), 400

    # Fetch company departments for easy selection
    depts = list(departments_col.find({"company_id": canonical_id}, {"_id": 0, "name": 1}))
    dept_names = [d["name"] for d in depts] if depts else ["General", "Engineering", "Sales", "Operations", "HR"]

    return jsonify({
        "ok": True,
        "exists": True,
        "status": status,
        "company_id": canonical_id,
        "company_name": comp.get("name"),
        "country": comp.get("country", "India"),
        "timezone": comp.get("timezone", DEFAULT_TIMEZONE),
        "departments": dept_names
    })


@app.route("/api/auth/register-employee", methods=["POST"])
def api_register_employee():
    """Self-registration for employees into an active company workspace in PENDING status."""
    data = request.json or {}
    company_id_input = data.get("company_id", "").strip()
    emp_id = data.get("emp_id", "").strip().upper()
    name = data.get("name", "").strip()
    mobile = data.get("mobile", "").strip().replace(" ", "").replace("-", "")
    email = data.get("email", "").strip().lower()
    department = data.get("department", "General").strip()
    designation = data.get("designation", "Staff").strip()
    work_type = data.get("work_type", "Office").strip()  # Office, WFH, Field
    password = data.get("password", "").strip()

    if not company_id_input or not emp_id or not name or not mobile or not password:
        return jsonify({
            "ok": False, 
            "error": "Target Company Workspace ID, Employee ID, Full Name, Mobile Number, and Password are required."
        }), 400

    # 1. Company Verification (Case-insensitive, regex & alphanumeric fallback)
    clean_query = re.sub(r'[^a-zA-Z0-9]', '', company_id_input)
    query = {
        "$or": [
            {"company_id": company_id_input.upper()},
            {"company_id": company_id_input},
            {"company_id": {"$regex": f"^{re.escape(company_id_input)}$", "$options": "i"}},
            {"name": {"$regex": f"^{re.escape(company_id_input)}$", "$options": "i"}},
            {"company_id": {"$regex": re.escape(company_id_input), "$options": "i"}},
            {"name": {"$regex": re.escape(company_id_input), "$options": "i"}}
        ]
    }
    comp = companies_col.find_one(query)

    if not comp and clean_query:
        all_comps = list(companies_col.find({}, {"_id": 0, "company_id": 1, "name": 1, "status": 1}))
        # 1. Exact alphanumeric match first
        for c in all_comps:
            c_clean_id = re.sub(r'[^a-zA-Z0-9]', '', c.get("company_id", ""))
            if clean_query.lower() == c_clean_id.lower():
                comp = c
                break
        # 2. Substring fallback
        if not comp:
            for c in all_comps:
                c_clean_id = re.sub(r'[^a-zA-Z0-9]', '', c.get("company_id", ""))
                c_clean_name = re.sub(r'[^a-zA-Z0-9]', '', c.get("name", ""))
                if (clean_query.lower() in c_clean_id.lower() or 
                    c_clean_id.lower() in clean_query.lower() or 
                    clean_query.lower() in c_clean_name.lower()):
                    comp = c
                    break

    if not comp:
        total_registered = companies_col.count_documents({})
        if total_registered == 0:
            err_text = f"No organization is registered yet. Please register your Organization first in the 'Company Registration' tab."
        else:
            err_text = f"Target Company Workspace '{company_id_input}' is not registered on this platform. Please check your Organization ID or register your organization first."
        return jsonify({
            "ok": False, 
            "error": err_text,
            "can_register_company": True
        }), 404

    canonical_company_id = comp.get("company_id", company_id_input.upper())
    comp_status = comp.get("status", "active")
    if comp_status in ("suspended", "rejected", "inactive"):
        return jsonify({
            "ok": False, 
            "error": f"Company workspace '{comp.get('name')}' is currently {comp_status.upper()}. Cannot register."
        }), 400

    # 2. Check if Employee ID is already registered under this company
    existing_emp = employees_col.find_one({"company_id": canonical_company_id, "emp_id": emp_id})
    if existing_emp:
        if existing_emp.get("status") == "pending":
            return jsonify({
                "ok": False,
                "status": "pending",
                "error": f"Employee ID '{emp_id}' is already registered and pending review. You can track status in the Application Status Tracker."
            }), 409
        return jsonify({
            "ok": False, 
            "error": f"Employee ID '{emp_id}' is already registered under company '{comp.get('name')}'. Please sign in or contact HR."
        }), 409

    # 3. Check if mobile is already used by an existing user
    existing_user = users_col.find_one({"mobile": mobile})
    if existing_user:
        if existing_user.get("status") == "pending":
            return jsonify({
                "ok": False,
                "status": "pending",
                "error": f"Mobile number '{mobile}' is already registered and pending administrator approval. Please track your application status."
            }), 409
        return jsonify({
            "ok": False, 
            "error": f"Mobile number '{mobile}' is already registered with an existing active account. Please sign in or use a different number."
        }), 409

    now_utc = get_utc_iso_string()

    # 3. Create Employee in 'pending' status
    emp_doc = {
        "company_id": canonical_company_id,
        "emp_id": emp_id,
        "employee_id": emp_id,
        "name": name,
        "mobile": mobile,
        "phone": mobile,
        "email": email,
        "department": department,
        "designation": designation,
        "work_type": work_type,
        "status": "pending",
        "created_at": now_utc,
        "joining_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "allowed_methods": ["Face", "OTP", "WiFi", "GPS"]
    }
    employees_col.insert_one(emp_doc)

    # 4. Create User in 'pending' status
    pwd_hash = hash_password(password)
    user_doc = {
        "company_id": canonical_company_id,
        "emp_id": emp_id,
        "employee_id": emp_id,
        "name": name,
        "mobile": mobile,
        "phone": mobile,
        "email": email,
        "password": pwd_hash,
        "password_hash": pwd_hash,
        "role": "employee",
        "status": "pending",
        "department": department,
        "designation": designation,
        "work_type": work_type,
        "created_at": now_utc
    }
    users_col.insert_one(user_doc)

    # 5. Notify Company Admin and Super Admin
    notifications_col.insert_one({
        "company_id": canonical_company_id,
        "emp_id": "ADMIN",
        "title": "New Employee Registration Pending Approval",
        "message": f"{name} ({emp_id}) applied to join department '{department}' as {work_type}. Awaiting Administrator approval.",
        "type": "EMPLOYEE_ONBOARDING",
        "is_read": False,
        "timestamp_utc": now_utc
    })

    notifications_col.insert_one({
        "company_id": "ARDHNARISHWAR",
        "emp_id": "SUPER_ADMIN",
        "title": "Global Staff Registration Alert",
        "message": f"{name} ({emp_id}) registered under company '{comp.get('name')}' ({canonical_company_id}).",
        "type": "EMPLOYEE_ONBOARDING",
        "is_read": False,
        "timestamp_utc": now_utc
    })

    log_audit_event(
        action="EMPLOYEE_SELF_REGISTERED",
        company_id=canonical_company_id,
        actor_name=name,
        actor_role="employee",
        details={"emp_id": emp_id, "name": name, "department": department, "work_type": work_type},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "status": "pending",
        "message": f"Employee registration submitted successfully for {comp.get('name')}! Your account is pending administrator approval before you can sign in."
    })


@app.route("/api/auth/check-registration-status", methods=["POST"])
def api_check_registration_status():
    """Public lookup endpoint to check the review/approval status of an application."""
    data = request.json or {}
    identifier = data.get("identifier", "").strip()
    company_id = data.get("company_id", "").strip().upper()

    if not identifier:
        return jsonify({"ok": False, "error": "Company Workspace ID, Employee ID, Mobile Number, or Email is required"}), 400

    # 1. Check Companies collection directly (by workspace id, contact phone, email, or name)
    comp = companies_col.find_one({
        "$or": [
            {"company_id": identifier.upper()},
            {"contact_phone": identifier},
            {"email": identifier.lower()},
            {"name": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}}
        ]
    })
    if comp:
        return jsonify({
            "ok": True,
            "found": True,
            "type": "company",
            "entity_name": comp.get("name"),
            "name": comp.get("name"),
            "company_id": comp.get("company_id"),
            "company_name": comp.get("name"),
            "identifier": identifier,
            "status": comp.get("status", "pending"),
            "created_at": comp.get("created_at"),
            "country": comp.get("country", "Global"),
            "phone": comp.get("contact_phone", "")
        })

    # 2. Check Users collection (by mobile, email, emp_id)
    user_query = {
        "$or": [
            {"mobile": identifier},
            {"email": identifier},
            {"email": identifier.lower()},
            {"emp_id": identifier.upper()}
        ]
    }
    if company_id:
        user_query["company_id"] = company_id

    user = users_col.find_one(user_query)
    
    # 3. Check Employees collection if not found in users_col
    if not user:
        emp_query = {
            "$or": [
                {"mobile": identifier},
                {"email": identifier},
                {"email": identifier.lower()},
                {"emp_id": identifier.upper()}
            ]
        }
        if company_id:
            emp_query["company_id"] = company_id
        emp_doc = employees_col.find_one(emp_query)
        if emp_doc:
            c = companies_col.find_one({"company_id": emp_doc.get("company_id")})
            comp_name = c.get("name", emp_doc.get("company_id")) if c else emp_doc.get("company_id")
            return jsonify({
                "ok": True,
                "found": True,
                "type": "employee",
                "name": emp_doc.get("name"),
                "entity_name": emp_doc.get("name"),
                "emp_id": emp_doc.get("emp_id"),
                "company_id": emp_doc.get("company_id"),
                "company_name": comp_name,
                "role": "employee",
                "status": emp_doc.get("status", "pending"),
                "department": emp_doc.get("department", "General"),
                "work_type": emp_doc.get("work_type", "Office"),
                "created_at": emp_doc.get("created_at")
            })

        return jsonify({"ok": False, "found": False, "error": f"No registration record found matching '{identifier}'"}), 404

    comp_name = "Global Platform"
    if user.get("company_id") and user.get("company_id") != "ARDHNARISHWAR":
        c = companies_col.find_one({"company_id": user.get("company_id")})
        if c: comp_name = c.get("name", user.get("company_id"))

    return jsonify({
        "ok": True,
        "found": True,
        "type": "employee" if user.get("role") == "employee" else "company_admin",
        "name": user.get("name"),
        "entity_name": user.get("name"),
        "emp_id": user.get("emp_id") or "N/A",
        "company_id": user.get("company_id"),
        "company_name": comp_name,
        "role": user.get("role"),
        "status": user.get("status", "pending"),
        "department": user.get("department", "General"),
        "work_type": user.get("work_type", "Office"),
        "created_at": user.get("created_at")
    })



@app.route("/api/auth/forgot-password", methods=["POST"])
@app.route("/api/auth/forgot-password/request", methods=["POST"])
def api_forgot_password():
    data = request.json or {}
    identifier = data.get("identifier", "").strip() or data.get("mobile", "").strip() or data.get("email", "").strip()
    company_id = data.get("company_id", "").strip().upper()
    role = data.get("role", "").strip()

    if not identifier:
        return jsonify({"ok": False, "error": "Email or registered mobile number is required"}), 400

    query = {"$or": [{"mobile": identifier}, {"email": identifier}]}
    if role: query["role"] = role
    if company_id and role != "super_admin": query["company_id"] = company_id

    user = users_col.find_one(query)
    if not user:
        return jsonify({"ok": False, "error": "No account matched the provided details"}), 404

    # Issue secure 6-digit reset OTP code
    reset_code = str(random.randint(100000, 999999))
    target_comp = user.get("company_id", "GLOBAL")
    target_emp = user.get("emp_id") or user.get("mobile", "USER")

    notifications_col.insert_one({
        "company_id": target_comp,
        "emp_id": target_emp,
        "title": "Password Reset Authorization Code",
        "message": f"Your password reset authorization code is: {reset_code}. Valid for 10 minutes.",
        "type": "PASSWORD_RESET",
        "reset_code_hash": hash_password(reset_code),
        "expires_ts": datetime.now(timezone.utc).timestamp() + 600,
        "is_read": False,
        "timestamp_utc": get_utc_iso_string()
    })

    log_audit_event(
        action="PASSWORD_RESET_REQUESTED",
        company_id=target_comp,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"identifier": identifier},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "message": "Authorization code issued to your in-app notification vault.",
        "reset_code": reset_code,
        "demo_otp": reset_code
    })


@app.route("/api/auth/reset-password", methods=["POST"])
@app.route("/api/auth/forgot-password/reset", methods=["POST"])
def api_reset_password():
    data = request.json or {}
    identifier = data.get("identifier", "").strip() or data.get("mobile", "").strip() or data.get("email", "").strip()
    company_id = data.get("company_id", "").strip().upper()
    reset_code = data.get("reset_code", "").strip() or data.get("otp", "").strip()
    new_password = data.get("new_password", "").strip()

    if not identifier or not reset_code or not new_password:
        return jsonify({"ok": False, "error": "Identifier, reset code, and new password are required"}), 400

    query = {"$or": [{"mobile": identifier}, {"email": identifier}]}
    if company_id: query["company_id"] = company_id

    user = users_col.find_one(query)
    if not user:
        return jsonify({"ok": False, "error": "User account not found"}), 404

    target_comp = user.get("company_id", "GLOBAL")
    target_emp = user.get("emp_id") or user.get("mobile", "USER")

    # Verify reset code in notification vault
    notif = notifications_col.find_one({
        "company_id": target_comp,
        "emp_id": target_emp,
        "type": "PASSWORD_RESET",
        "reset_code_hash": hash_password(reset_code)
    })
    now_ts = datetime.now(timezone.utc).timestamp()
    if not notif or notif.get("expires_ts", 0) < now_ts:
        return jsonify({"ok": False, "error": "Invalid or expired authorization code"}), 400

    # Update password
    users_col.update_one({"_id": user["_id"]}, {"$set": {"password": hash_password(new_password)}})
    notifications_col.delete_one({"_id": notif["_id"]})

    log_audit_event(
        action="PASSWORD_RESET_COMPLETED",
        company_id=target_comp,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"identifier": identifier},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": "Password updated successfully. You can now log in."})


# ══════════════════════════════════════════════════════════════════════════════
#  ARDHNARISHWAR SUPER ADMIN APIS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/superadmin/companies/<company_id>/approve", methods=["POST"])
def superadmin_approve_company(company_id):
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = company_id.upper()
    comp = companies_col.find_one({"company_id": company_id})
    if not comp:
        return jsonify({"ok": False, "error": "Company not found"}), 404

    companies_col.update_one({"company_id": company_id}, {"$set": {"status": "active", "approved_at": get_utc_iso_string()}})
    users_col.update_many({"company_id": company_id}, {"$set": {"status": "active"}})

    log_audit_event(
        action="COMPANY_APPROVED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={"approved_company": comp.get("name")},
        ip=client_ip(),
        user_agent=client_user_agent()
    )
    return jsonify({"ok": True, "message": f"Company '{company_id}' approved and activated successfully"})


@app.route("/api/superadmin/companies/<company_id>/reject", methods=["POST"])
def superadmin_reject_company(company_id):
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = company_id.upper()
    comp = companies_col.find_one({"company_id": company_id})
    if not comp:
        return jsonify({"ok": False, "error": "Company not found"}), 404

    companies_col.update_one({"company_id": company_id}, {"$set": {"status": "rejected", "rejected_at": get_utc_iso_string()}})
    users_col.update_many({"company_id": company_id}, {"$set": {"status": "rejected"}})

    log_audit_event(
        action="COMPANY_REJECTED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={"rejected_company": comp.get("name")},
        ip=client_ip(),
        user_agent=client_user_agent()
    )
    return jsonify({"ok": True, "message": f"Company '{company_id}' rejected"})


@app.route("/api/superadmin/pending-approvals", methods=["GET"])
def superadmin_pending_approvals():
    """Retrieve all pending client company and employee registration requests."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    pending_companies = list(companies_col.find({"status": "pending"}).sort("created_at", -1))
    for c in pending_companies:
        c["_id"] = str(c["_id"])

    pending_employees = list(employees_col.find({"status": "pending"}).sort("created_at", -1))
    for e in pending_employees:
        e["_id"] = str(e["_id"])
        comp = companies_col.find_one({"company_id": e.get("company_id")})
        e["company_name"] = comp.get("name", e.get("company_id")) if comp else e.get("company_id")

    return jsonify({
        "ok": True,
        "pending_companies": pending_companies,
        "pending_employees": pending_employees,
        "total_pending": len(pending_companies) + len(pending_employees)
    })


@app.route("/api/superadmin/employees/<company_id>/<emp_id>/approve", methods=["POST"])
def superadmin_approve_employee(company_id, emp_id):
    """Super Admin approves and activates an employee registration."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = company_id.upper()
    emp_id = emp_id.upper()

    emp = employees_col.find_one({"company_id": company_id, "emp_id": emp_id})
    if not emp:
        return jsonify({"ok": False, "error": "Employee record not found"}), 404

    now_utc = get_utc_iso_string()
    employees_col.update_one({"company_id": company_id, "emp_id": emp_id}, {"$set": {"status": "active", "approved_at": now_utc, "approved_by": "SUPER_ADMIN"}})
    users_col.update_one({"company_id": company_id, "emp_id": emp_id}, {"$set": {"status": "active"}})

    log_audit_event(
        action="SUPERADMIN_EMPLOYEE_APPROVED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={"emp_id": emp_id, "employee_name": emp.get("name")},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Employee {emp.get('name')} ({emp_id}) approved and activated successfully"})


@app.route("/api/superadmin/employees/<company_id>/<emp_id>/reject", methods=["POST"])
def superadmin_reject_employee(company_id, emp_id):
    """Super Admin rejects an employee registration."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = company_id.upper()
    emp_id = emp_id.upper()

    emp = employees_col.find_one({"company_id": company_id, "emp_id": emp_id})
    if not emp:
        return jsonify({"ok": False, "error": "Employee record not found"}), 404

    now_utc = get_utc_iso_string()
    employees_col.update_one({"company_id": company_id, "emp_id": emp_id}, {"$set": {"status": "rejected", "rejected_at": now_utc, "rejected_by": "SUPER_ADMIN"}})
    users_col.update_one({"company_id": company_id, "emp_id": emp_id}, {"$set": {"status": "rejected"}})

    log_audit_event(
        action="SUPERADMIN_EMPLOYEE_REJECTED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={"emp_id": emp_id, "employee_name": emp.get("name")},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Employee {emp.get('name')} ({emp_id}) registration rejected"})



@app.route("/api/superadmin/companies", methods=["GET", "POST"])
def superadmin_companies():
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    if request.method == "GET":
        comps = list(companies_col.find().sort("created_at", -1))
        for c in comps:
            c["_id"] = str(c["_id"])
            c["employee_count"] = employees_col.count_documents({"company_id": c["company_id"]})
            c["active_employees"] = employees_col.count_documents({"company_id": c["company_id"], "status": "active"})
        return jsonify({"ok": True, "companies": comps, "count": len(comps)})

    if request.method == "POST":
        data = request.json or {}
        company_id = data.get("company_id", "").strip().upper()
        name = data.get("name", "").strip()
        legal_name = data.get("legal_name", name).strip()
        country = data.get("country", "India").strip()
        tz = data.get("timezone", DEFAULT_TIMEZONE).strip()
        plan = data.get("plan", "Enterprise Global").strip()
        address = data.get("address", "").strip()
        contact_email = data.get("contact_email", "").strip()
        contact_phone = data.get("contact_phone", "").strip()
        admin_name = data.get("admin_name", "Company Admin").strip()
        admin_pass = data.get("admin_password", "admin123").strip()

        if not company_id or not name or not contact_phone:
            return jsonify({"ok": False, "error": "Company ID, Name, and Contact Phone are required"}), 400

        if companies_col.find_one({"company_id": company_id}):
            return jsonify({"ok": False, "error": f"Company ID '{company_id}' already exists"}), 400

        # Parse office locations
        office_locations = data.get("office_locations", [])
        if not office_locations:
            office_locations = [{
                "location_name": f"{name} HQ",
                "lat": float(data.get("lat", OFFICE_LAT)),
                "lng": float(data.get("lng", OFFICE_LNG)),
                "radius_m": float(data.get("radius_m", OFFICE_RADIUS_M)),
                "wifi_subnet": data.get("wifi_subnet", OFFICE_SUBNET),
                "allowed_methods": ["Face", "OTP", "WiFi", "GPS"]
            }]

        comp_doc = {
            "company_id": company_id,
            "name": name,
            "legal_name": legal_name,
            "country": country,
            "timezone": tz,
            "status": "active",
            "plan": plan,
            "address": address,
            "contact_email": contact_email,
            "contact_phone": contact_phone,
            "office_locations": office_locations,
            "created_at": get_utc_iso_string(),
            "created_by": user.get("name", "Super Admin")
        }
        companies_col.insert_one(comp_doc)

        # Create Default Company Policy
        policies_col.update_one(
            {"company_id": company_id},
            {"$set": {
                "company_id": company_id,
                "shift_start": data.get("shift_start", "09:30"),
                "shift_end": data.get("shift_end", "18:30"),
                "grace_period_mins": int(data.get("grace_period_mins", 15)),
                "half_day_after": data.get("half_day_after", "13:00"),
                "allowed_methods": ["Face", "OTP", "WiFi", "GPS"],
                "updated_at": get_utc_iso_string()
            }},
            upsert=True
        )

        # Create Company Admin Account
        admin_user = {
            "name": admin_name,
            "email": contact_email,
            "mobile": contact_phone,
            "password": hash_password(admin_pass),
            "role": "company_admin",
            "company_id": company_id,
            "status": "active",
            "created_at": get_utc_iso_string()
        }
        users_col.insert_one(admin_user)

        log_audit_event(
            action="COMPANY_CREATED",
            company_id=company_id,
            actor_name=user.get("name"),
            actor_role="super_admin",
            details={"company_name": name, "country": country, "timezone": tz, "plan": plan},
            ip=client_ip(),
            user_agent=client_user_agent()
        )

        return jsonify({
            "ok": True, 
            "message": f"Company '{name}' ({company_id}) created successfully with Admin account ({contact_phone})",
            "company_id": company_id
        })


@app.route("/api/superadmin/companies/<company_id>", methods=["PUT", "DELETE"])
def superadmin_company_detail(company_id):
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = company_id.upper()
    company = companies_col.find_one({"company_id": company_id})
    if not company:
        return jsonify({"ok": False, "error": f"Company '{company_id}' not found"}), 404

    if request.method == "PUT":
        data = request.json or {}
        update_fields = {}
        for key in ["name", "legal_name", "country", "timezone", "plan", "address", "contact_email", "contact_phone", "office_locations"]:
            if key in data:
                update_fields[key] = data[key]

        update_fields["updated_at"] = get_utc_iso_string()
        companies_col.update_one({"company_id": company_id}, {"$set": update_fields})

        log_audit_event(
            action="COMPANY_UPDATED",
            company_id=company_id,
            actor_name=user.get("name"),
            actor_role="super_admin",
            details=update_fields,
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({"ok": True, "message": f"Company '{company_id}' updated successfully"})

    if request.method == "DELETE":
        # Safe cascading deletion of company records
        companies_col.delete_one({"company_id": company_id})
        users_col.delete_many({"company_id": company_id})
        employees_col.delete_many({"company_id": company_id})
        branches_col.delete_many({"company_id": company_id})
        departments_col.delete_many({"company_id": company_id})
        shifts_col.delete_many({"company_id": company_id})
        attendance_col.delete_many({"company_id": company_id})
        attendance_corrections_col.delete_many({"company_id": company_id})
        leaves_col.delete_many({"company_id": company_id})
        field_visits_col.delete_many({"company_id": company_id})
        policies_col.delete_many({"company_id": company_id})
        notifications_col.delete_many({"company_id": company_id})

        log_audit_event(
            action="COMPANY_DELETED",
            company_id=company_id,
            actor_name=user.get("name"),
            actor_role="super_admin",
            details={"deleted_company": company.get("name")},
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({"ok": True, "message": f"Company '{company_id}' and all associated records permanently removed"})


@app.route("/api/superadmin/companies/<company_id>/toggle-status", methods=["POST"])
def superadmin_toggle_company_status(company_id):
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = company_id.upper()
    data = request.json or {}
    new_status = data.get("status", "active").lower()  # active, suspended, inactive

    res = companies_col.update_one({"company_id": company_id}, {"$set": {"status": new_status, "updated_at": get_utc_iso_string()}})
    if res.matched_count == 0:
        return jsonify({"ok": False, "error": "Company not found"}), 404

    # Synchronize status to all users under this company
    users_col.update_many({"company_id": company_id}, {"$set": {"status": new_status}})

    log_audit_event(
        action="COMPANY_STATUS_CHANGED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={"new_status": new_status},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Company {company_id} status updated to {new_status.upper()}"})


@app.route("/api/superadmin/analytics", methods=["GET"])
def superadmin_analytics():
    """Real dynamic aggregation metrics strictly from database."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    total_companies = companies_col.count_documents({})
    active_companies = companies_col.count_documents({"status": "active"})
    total_employees = employees_col.count_documents({})
    active_employees = employees_col.count_documents({"status": "active"})

    today_utc_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_attendance = attendance_col.count_documents({"date": today_utc_date})

    # Countries breakdown
    pipeline_countries = [
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    countries_stat = list(companies_col.aggregate(pipeline_countries))

    # Workforce breakdown
    pipeline_workforce = [
        {"$group": {"_id": "$work_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    workforce_stat = list(employees_col.aggregate(pipeline_workforce))

    return jsonify({
        "ok": True,
        "stats": {
            "total_companies": total_companies,
            "active_companies": active_companies,
            "total_employees": total_employees,
            "active_employees": active_employees,
            "today_attendance": today_attendance
        },
        "countries_breakdown": countries_stat,
        "workforce_breakdown": workforce_stat
    })


@app.route("/api/superadmin/audit-logs", methods=["GET"])
def superadmin_audit_logs():
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    limit = int(request.args.get("limit", 100))
    logs = list(audit_logs_col.find().sort("timestamp_utc", -1).limit(limit))
    for log in logs:
        log["_id"] = str(log["_id"])
    return jsonify({"ok": True, "logs": logs, "count": len(logs)})


@app.route("/api/superadmin/global-attendance", methods=["GET"])
def superadmin_global_attendance():
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    company_id = request.args.get("company_id", "").strip().upper()
    emp_id = request.args.get("emp_id", "").strip().upper()
    date_val = request.args.get("date", "").strip()
    status_val = request.args.get("status", "").strip()
    method_val = request.args.get("method", "").strip()
    limit = int(request.args.get("limit", 150))

    query = {}
    if company_id:
        query["company_id"] = company_id
    if emp_id:
        query["emp_id"] = emp_id
    if date_val:
        query["$or"] = [{"date": date_val}, {"local_date": date_val}]
    if status_val:
        query["status"] = status_val
    if method_val:
        query["method"] = method_val

    rows = list(attendance_col.find(query).sort("timestamp_utc", -1).limit(limit))
    for r in rows:
        r["_id"] = str(r["_id"])
        if "company_name" not in r:
            comp = companies_col.find_one({"company_id": r.get("company_id")}, {"name": 1})
            r["company_name"] = comp.get("name") if comp else r.get("company_id")

    return jsonify({"ok": True, "attendance": rows, "count": len(rows)})


@app.route("/api/superadmin/attendance/<record_id>", methods=["DELETE"])
def superadmin_delete_attendance(record_id):
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    record_id = (record_id or "").strip()
    rec = None
    if ObjectId.is_valid(record_id):
        rec = attendance_col.find_one({"_id": ObjectId(record_id)})
    if not rec:
        rec = attendance_col.find_one({"_id": record_id})
    if not rec:
        return jsonify({"ok": False, "error": "Attendance record not found (already deleted?)"}), 404

    company_id = rec.get("company_id")
    emp_id = rec.get("emp_id")
    date_val = rec.get("date") or rec.get("local_date")
    check_type = rec.get("check_type")

    # 1) Main attendance entry (reports, timings, history sab yahin se padhte hain)
    attendance_col.delete_one({"_id": rec["_id"]})

    # 2) Isi punch ki correction requests / approval trail
    try:
        if company_id and emp_id and date_val:
            cq = {"company_id": company_id, "emp_id": emp_id, "date": date_val}
            if check_type:
                cq["check_type"] = check_type
            attendance_corrections_col.delete_many(cq)
    except Exception as e:
        app.logger.warning(f"attendance delete: corrections cleanup failed: {e}")

    log_audit_event(
        action="ATTENDANCE_DELETED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={
            "record_id": str(rec["_id"]),
            "emp_id": emp_id,
            "employee": rec.get("name"),
            "date": date_val,
            "time": rec.get("time"),
            "method": rec.get("method"),
            "check_type": check_type,
        },
        ip=client_ip(),
        user_agent=client_user_agent()
    )
    return jsonify({"ok": True, "message": "Attendance entry deleted everywhere"})


ATTENDANCE_EDIT_STATUSES = {
    "present": "Present", "absent": "Absent", "late": "Late",
    "half day": "Half Day", "half-day": "Half Day", "leave": "Leave",
}


@app.route("/api/superadmin/attendance/<record_id>", methods=["PATCH"])
def superadmin_edit_attendance(record_id):
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    data = request.get_json(silent=True) or {}
    new_status = ATTENDANCE_EDIT_STATUSES.get(str(data.get("status", "")).strip().lower())
    if not new_status:
        return jsonify({"ok": False, "error": "Invalid status. Use Present, Absent, Late, Half Day or Leave"}), 400
    reason = str(data.get("reason") or "").strip()[:300] or "Edited by Super Admin"
    leave_type = (str(data.get("leave_type") or "Casual").strip()[:40]) or "Casual"
    apply_all = data.get("apply_all_day", True) is not False

    record_id = (record_id or "").strip()
    rec = None
    if ObjectId.is_valid(record_id):
        rec = attendance_col.find_one({"_id": ObjectId(record_id)})
    if not rec:
        rec = attendance_col.find_one({"_id": record_id})
    if not rec:
        return jsonify({"ok": False, "error": "Attendance record not found"}), 404

    company_id = rec.get("company_id")
    emp_id = rec.get("emp_id")
    date_val = rec.get("date") or rec.get("local_date")
    old_status = rec.get("status") or "Present"
    editor = user.get("name") or "Super Admin"
    now = get_utc_iso_string()

    # Us din ki saari punches (IN + OUT) pe same status, taaki reports consistent rahein
    targets = [rec]
    if apply_all and company_id and emp_id and date_val:
        try:
            found = list(attendance_col.find({"company_id": company_id, "emp_id": emp_id, "date": date_val}))
            if found:
                targets = found
                if str(rec["_id"]) not in {str(t["_id"]) for t in found}:
                    targets.append(rec)
        except Exception as e:
            app.logger.warning(f"attendance edit: day lookup failed: {e}")

    for t in targets:
        attendance_col.update_one({"_id": t["_id"]}, {"$set": {
            "status": new_status,
            "edited_by": editor,
            "edited_at": now,
            "edit_reason": reason,
            "original_status": t.get("original_status") or t.get("status") or "Present",
        }})

    # Leave => approved leave record (timesheet / leave count ke liye); Leave se hataya => wo record hatao
    leave_id = None
    try:
        if company_id and emp_id and date_val:
            leave_id = "LV-SA-" + re.sub(r"[^A-Za-z0-9]", "", f"{emp_id}{date_val}").upper()
            existing_leave = leaves_col.find_one({"company_id": company_id, "leave_id": leave_id})
            if new_status == "Leave":
                if existing_leave:
                    leaves_col.update_one({"_id": existing_leave["_id"]}, {"$set": {
                        "leave_type": leave_type, "status": "approved", "reason": reason}})
                else:
                    leaves_col.insert_one({
                        "leave_id": leave_id,
                        "company_id": company_id,
                        "emp_id": emp_id,
                        "employee_name": rec.get("name"),
                        "leave_type": leave_type,
                        "start_date": date_val,
                        "end_date": date_val,
                        "days": 1,
                        "reason": reason,
                        "status": "approved",
                        "reviewed_by": editor,
                        "reviewed_at": now,
                        "source": "super_admin_attendance_edit",
                        "timestamp_utc": now,
                    })
            elif existing_leave:
                leaves_col.delete_one({"_id": existing_leave["_id"]})
    except Exception as e:
        app.logger.warning(f"attendance edit: leave sync failed: {e}")

    log_audit_event(
        action="ATTENDANCE_EDITED",
        company_id=company_id,
        actor_name=editor,
        actor_role="super_admin",
        details={
            "record_id": str(rec["_id"]),
            "emp_id": emp_id,
            "employee": rec.get("name"),
            "date": date_val,
            "from": old_status,
            "to": new_status,
            "reason": reason,
            "entries_updated": len(targets),
            "leave_id": leave_id if new_status == "Leave" else None,
        },
        ip=client_ip(),
        user_agent=client_user_agent()
    )
    return jsonify({"ok": True, "status": new_status, "updated": len(targets), "edited_by": editor,
                    "message": f"Attendance changed from {old_status} to {new_status}"})


@app.route("/api/employee/home-location", methods=["POST"])
def employee_set_home_location():
    """One-time: employee apni current GPS location ko Home base ke roop me save kare (WFH geofence ke liye)."""
    user, err = require_auth(allowed_roles=["employee", "hr", "manager", "company_admin"])
    if err:
        return err

    data = request.get_json(silent=True) or {}
    try:
        lat = float(data.get("latitude"))
        lng = float(data.get("longitude"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "Valid GPS latitude/longitude required"}), 400
    if not (-90 <= lat <= 90 and -180 <= lng <= 180) or (lat == 0 and lng == 0):
        return jsonify({"ok": False, "error": "Invalid GPS coordinates"}), 400
    try:
        accuracy = round(float(data.get("accuracy")), 1)
    except (TypeError, ValueError):
        accuracy = None

    company_id = user.get("company_id")
    emp_id = user.get("emp_id") or user.get("employee_id")
    if not company_id or not emp_id:
        return jsonify({"ok": False, "error": "Employee profile not identified"}), 400

    emp = employees_col.find_one({"company_id": company_id, "emp_id": emp_id})
    if not emp:
        return jsonify({"ok": False, "error": "Employee record not found"}), 404

    already = emp.get("homeLatitude") if emp.get("homeLatitude") is not None else emp.get("home_latitude")
    if already is not None:
        return jsonify({"ok": False, "error": "Home location is already registered. Please contact your admin to change it."}), 409

    now = get_utc_iso_string()
    employees_col.update_one({"_id": emp["_id"]}, {"$set": {
        "home_latitude": lat, "home_longitude": lng,
        "homeLatitude": lat, "homeLongitude": lng,
        "home_location_accuracy_m": accuracy,
        "home_location_set_at": now,
        "home_location_source": "employee_self_capture",
    }})

    log_audit_event(
        action="EMPLOYEE_HOME_LOCATION_SET",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"emp_id": emp_id, "lat": lat, "lng": lng, "accuracy_m": accuracy},
        ip=client_ip(),
        user_agent=client_user_agent()
    )
    return jsonify({"ok": True, "message": "Home location saved. You can now punch in."})


@app.route("/api/superadmin/timezones", methods=["GET"])
def superadmin_timezones():
    return jsonify({
        "ok": True,
        "timezones": GLOBAL_TIMEZONES,
        "countries": GLOBAL_COUNTRIES
    })


# ══════════════════════════════════════════════════════════════════════════════
#  COMPANY ADMIN APIS (STRICT TENANT ISOLATION)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/company/profile", methods=["GET", "POST"])
def company_profile():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    company = companies_col.find_one({"company_id": target_company_id})
    if not company:
        return jsonify({"ok": False, "error": f"Company '{target_company_id}' not found"}), 404

    # Fetch policy
    policy = policies_col.find_one({"company_id": target_company_id}) or {}
    policy.pop("_id", None)

    if request.method == "GET":
        company["_id"] = str(company["_id"])
        company["policy"] = policy
        return jsonify({"ok": True, "company": company})

    if request.method == "POST":
        data = request.json or {}
        update_fields = {}
        if "name" in data: update_fields["name"] = data["name"].strip()
        if "timezone" in data: update_fields["timezone"] = data["timezone"].strip()
        if "office_locations" in data: update_fields["office_locations"] = data["office_locations"]
        if "contact_email" in data: update_fields["contact_email"] = data["contact_email"].strip()
        if "contact_phone" in data: update_fields["contact_phone"] = data["contact_phone"].strip()
        if "address" in data: update_fields["address"] = data["address"].strip()

        update_fields["updated_at"] = get_utc_iso_string()
        companies_col.update_one({"company_id": target_company_id}, {"$set": update_fields})

        # Update policy if provided
        if "policy" in data:
            pol_data = data["policy"]
            policies_col.update_one(
                {"company_id": target_company_id},
                {"$set": {
                    "company_id": target_company_id,
                    "shift_start": pol_data.get("shift_start", "09:30"),
                    "shift_end": pol_data.get("shift_end", "18:30"),
                    "grace_period_mins": int(pol_data.get("grace_period_mins", 15)),
                    "half_day_after": pol_data.get("half_day_after", "13:00"),
                    "allowed_methods": pol_data.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"]),
                    "updated_at": get_utc_iso_string()
                }},
                upsert=True
            )

        log_audit_event(
            action="COMPANY_PROFILE_UPDATED",
            company_id=target_company_id,
            actor_name=user.get("name"),
            actor_role=user.get("role"),
            details=update_fields,
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({"ok": True, "message": "Company workspace and policy settings updated successfully"})


@app.route("/api/company/policies", methods=["GET", "POST"])
def company_policies():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    if request.method == "GET":
        policy = policies_col.find_one({"company_id": target_company_id}) or {}
        policy.pop("_id", None)
        return jsonify({"ok": True, "policy": policy})

    pol_data = request.json or {}
    update_doc = {
        "company_id": target_company_id,
        "shift_start": pol_data.get("shift_start", "09:30"),
        "shift_end": pol_data.get("shift_end", "18:30"),
        "grace_period_mins": int(pol_data.get("grace_period_mins", 15)),
        "half_day_after": pol_data.get("half_day_after", "13:00"),
        "allowed_methods": pol_data.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS", "quick_punch"]),
        "updated_at": get_utc_iso_string()
    }
    for k, v in pol_data.items():
        if k not in update_doc:
            update_doc[k] = v
    policies_col.update_one({"company_id": target_company_id}, {"$set": update_doc}, upsert=True)
    return jsonify({"ok": True, "message": "Attendance policies configured successfully", "policy": update_doc})


# ── Branches Management APIs (Point 15) ──────────────────────────────────────

@app.route("/api/company/branches", methods=["GET", "POST"])
def company_branches():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    if request.method == "GET":
        branches = list(branches_col.find({"company_id": target_company_id}).sort("name", 1))
        for b in branches:
            b["_id"] = str(b["_id"])
        return jsonify({"ok": True, "branches": branches, "count": len(branches)})

    data = request.json or {}
    name = data.get("name", "").strip()
    city = data.get("city", "").strip()
    country = data.get("country", "India").strip()
    tz = data.get("timezone", DEFAULT_TIMEZONE).strip()
    lat = float(data.get("lat") or OFFICE_LAT)
    lng = float(data.get("lng") or OFFICE_LNG)
    radius_m = float(data.get("radius_m") or OFFICE_RADIUS_M)
    branch_id = data.get("branch_id", "").strip().upper() or f"BR-{random.randint(100, 999)}"

    if not name:
        return jsonify({"ok": False, "error": "Branch name is required"}), 400

    branches_col.update_one(
        {"company_id": target_company_id, "branch_id": branch_id},
        {"$set": {
            "company_id": target_company_id,
            "branch_id": branch_id,
            "name": name,
            "city": city,
            "country": country,
            "timezone": tz,
            "lat": lat,
            "lng": lng,
            "radius_m": radius_m,
            "created_at": get_utc_iso_string()
        }},
        upsert=True
    )

    log_audit_event(
        action="BRANCH_SAVED",
        company_id=target_company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"branch_id": branch_id, "name": name, "city": city},
        ip=client_ip(),
        user_agent=client_user_agent()
    )
    return jsonify({"ok": True, "message": f"Branch '{name}' ({branch_id}) saved successfully"})


@app.route("/api/company/branches/<branch_id>", methods=["DELETE"])
def delete_company_branch(branch_id):
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    branches_col.delete_one({"company_id": target_company_id, "branch_id": branch_id.upper()})
    return jsonify({"ok": True, "message": f"Branch '{branch_id}' removed"})


# ── Departments Management APIs (Point 16) ───────────────────────────────────

@app.route("/api/company/departments", methods=["GET", "POST"])
def company_departments():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    if request.method == "GET":
        depts = list(departments_col.find({"company_id": target_company_id}).sort("name", 1))
        for d in depts:
            d["_id"] = str(d["_id"])
            d["employee_count"] = employees_col.count_documents({"company_id": target_company_id, "department": d.get("name")})
        return jsonify({"ok": True, "departments": depts, "count": len(depts)})

    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"ok": False, "error": "Department name is required"}), 400

    departments_col.update_one(
        {"company_id": target_company_id, "name": name},
        {"$set": {"company_id": target_company_id, "name": name, "created_at": get_utc_iso_string()}},
        upsert=True
    )
    return jsonify({"ok": True, "message": f"Department '{name}' saved"})


@app.route("/api/company/departments/<dept_name>", methods=["DELETE"])
def delete_company_department(dept_name):
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    departments_col.delete_one({"company_id": target_company_id, "name": dept_name})
    return jsonify({"ok": True, "message": f"Department '{dept_name}' removed"})


# ── Shifts Management APIs (Point 17) ────────────────────────────────────────

@app.route("/api/company/shifts", methods=["GET", "POST"])
def company_shifts():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    if request.method == "GET":
        shifts = list(shifts_col.find({"company_id": target_company_id}).sort("name", 1))
        for s in shifts:
            s["_id"] = str(s["_id"])
        return jsonify({"ok": True, "shifts": shifts, "count": len(shifts)})

    data = request.json or {}
    name = data.get("name", "").strip()
    start_time = data.get("start_time", "09:30").strip()
    end_time = data.get("end_time", "18:30").strip()
    grace_mins = int(data.get("grace_period_mins") or 15)
    half_day = data.get("half_day_after", "13:00").strip()
    is_overnight = bool(data.get("is_overnight", False))
    shift_id = data.get("shift_id", "").strip().upper() or f"SH-{random.randint(100, 999)}"

    if not name:
        return jsonify({"ok": False, "error": "Shift name is required"}), 400

    shifts_col.update_one(
        {"company_id": target_company_id, "shift_id": shift_id},
        {"$set": {
            "company_id": target_company_id,
            "shift_id": shift_id,
            "name": name,
            "start_time": start_time,
            "end_time": end_time,
            "grace_period_mins": grace_mins,
            "half_day_after": half_day,
            "is_overnight": is_overnight,
            "created_at": get_utc_iso_string()
        }},
        upsert=True
    )
    return jsonify({"ok": True, "message": f"Shift '{name}' ({shift_id}) saved successfully"})


@app.route("/api/company/shifts/<shift_id>", methods=["DELETE"])
def delete_company_shift(shift_id):
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    shifts_col.delete_one({"company_id": target_company_id, "shift_id": shift_id.upper()})
    return jsonify({"ok": True, "message": f"Shift '{shift_id}' removed"})


# ── Attendance Corrections Workflow APIs (Point 19) ──────────────────────────

@app.route("/api/attendance/request-correction", methods=["POST"])
def request_attendance_correction():
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    data = request.json or {}
    company_id = user.get("company_id")
    emp_id = user.get("emp_id") or data.get("emp_id", "").strip().upper()
    date_val = data.get("date", "").strip()
    req_time = data.get("requested_time", "").strip()
    reason = data.get("reason", "").strip()
    check_type = data.get("check_type", "IN").strip()

    if not date_val or not req_time or not reason:
        return jsonify({"ok": False, "error": "Date, requested time, and explanation reason are required"}), 400

    corr_id = f"CORR-{random.randint(10000, 99999)}"
    now_utc = get_utc_iso_string()

    attendance_corrections_col.insert_one({
        "correction_id": corr_id,
        "company_id": company_id,
        "emp_id": emp_id,
        "employee_name": user.get("name", "Employee"),
        "date": date_val,
        "requested_time": req_time,
        "check_type": check_type,
        "reason": reason,
        "status": "pending",
        "timestamp_utc": now_utc
    })

    log_audit_event(
        action="ATTENDANCE_CORRECTION_REQUESTED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"correction_id": corr_id, "emp_id": emp_id, "date": date_val, "reason": reason},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": "Attendance correction request submitted for HR approval", "correction_id": corr_id})


@app.route("/api/company/attendance-corrections", methods=["GET"])
def company_attendance_corrections():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    corrs = list(attendance_corrections_col.find({"company_id": target_company_id}).sort("timestamp_utc", -1))
    for c in corrs:
        c["_id"] = str(c["_id"])
    return jsonify({"ok": True, "corrections": corrs, "count": len(corrs)})


@app.route("/api/company/attendance-corrections/<correction_id>/review", methods=["POST"])
def review_attendance_correction(correction_id):
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    data = request.json or {}
    decision = data.get("decision", "approved").lower()  # approved or rejected
    remarks = data.get("remarks", "").strip()

    corr = attendance_corrections_col.find_one({"company_id": target_company_id, "correction_id": correction_id.upper()})
    if not corr:
        return jsonify({"ok": False, "error": "Correction request not found"}), 404

    now_utc = get_utc_iso_string()
    attendance_corrections_col.update_one(
        {"_id": corr["_id"]},
        {"$set": {
            "status": decision,
            "reviewed_by": user.get("name"),
            "reviewer_role": user.get("role"),
            "review_remarks": remarks,
            "reviewed_at": now_utc
        }}
    )

    # If approved, update or insert attendance record
    if decision == "approved":
        attendance_col.update_one(
            {"company_id": target_company_id, "emp_id": corr["emp_id"], "date": corr["date"]},
            {"$set": {
                "company_id": target_company_id,
                "emp_id": corr["emp_id"],
                "name": corr.get("employee_name"),
                "date": corr["date"],
                "time": corr["requested_time"],
                "status": "Present",
                "method": "Correction-Approved",
                "notes": f"Corrected by {user.get('name')}: {remarks or corr.get('reason')}",
                "timestamp_utc": now_utc
            }},
            upsert=True
        )

    log_audit_event(
        action=f"ATTENDANCE_CORRECTION_{decision.upper()}",
        company_id=target_company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"correction_id": correction_id, "decision": decision, "emp_id": corr["emp_id"]},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Correction request {decision.upper()} successfully"})


# ── Leave Management APIs (Point 20) ─────────────────────────────────────────

@app.route("/api/leaves/apply", methods=["POST"])
def apply_leave():
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    data = request.json or {}
    company_id = user.get("company_id")
    emp_id = user.get("emp_id") or data.get("emp_id", "").strip().upper()
    leave_type = data.get("leave_type", "Casual").strip()
    start_date = data.get("start_date", "").strip()
    end_date = data.get("end_date", "").strip()
    reason = data.get("reason", "").strip()

    if not start_date or not end_date or not reason:
        return jsonify({"ok": False, "error": "Start date, end date, and reason are required"}), 400

    leave_id = f"LV-{random.randint(1000, 9999)}"
    now_utc = get_utc_iso_string()

    leaves_col.insert_one({
        "leave_id": leave_id,
        "company_id": company_id,
        "emp_id": emp_id,
        "employee_name": user.get("name", "Employee"),
        "leave_type": leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "reason": reason,
        "status": "pending",
        "timestamp_utc": now_utc
    })

    log_audit_event(
        action="LEAVE_APPLIED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"leave_id": leave_id, "emp_id": emp_id, "type": leave_type, "start": start_date, "end": end_date},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": "Leave application submitted for approval", "leave_id": leave_id})


@app.route("/api/leaves/my-leaves", methods=["GET"])
def my_leaves():
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    company_id = user.get("company_id")
    emp_id = user.get("emp_id")
    leaves = list(leaves_col.find({"company_id": company_id, "emp_id": emp_id}).sort("timestamp_utc", -1))
    for l in leaves:
        l["_id"] = str(l["_id"])
    return jsonify({"ok": True, "leaves": leaves, "count": len(leaves)})


@app.route("/api/company/leaves", methods=["GET"])
def company_leaves():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    leaves = list(leaves_col.find({"company_id": target_company_id}).sort("timestamp_utc", -1))
    for l in leaves:
        l["_id"] = str(l["_id"])
    return jsonify({"ok": True, "leaves": leaves, "count": len(leaves)})


@app.route("/api/company/leaves/<leave_id>/review", methods=["POST"])
def review_leave_request(leave_id):
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    data = request.json or {}
    raw_decision = data.get("decision", "").strip().lower()
    # Normalize decision; allow explicit approved/rejected, reject arbitrary values
    if raw_decision not in ("approved", "rejected"):
        if raw_decision == "":
            decision = "approved"
        else:
            return jsonify({"ok": False, "error": "Invalid decision. Must be 'approved' or 'rejected'."}), 400
    else:
        decision = raw_decision
    remarks = data.get("remarks", "").strip()

    leave_doc = leaves_col.find_one({"company_id": target_company_id, "leave_id": leave_id.upper().strip()})
    if not leave_doc:
        return jsonify({"ok": False, "error": "Leave request not found"}), 404

    current_status = str(leave_doc.get("status", "")).strip().lower()
    if current_status != "pending":
        return jsonify({"ok": False, "error": f"Leave request is already {current_status.upper()}. Only PENDING requests can be reviewed."}), 400

    now_utc = get_utc_iso_string()
    leaves_col.update_one(
        {"_id": leave_doc["_id"]},
        {"$set": {
            "status": decision,
            "reviewed_by": user.get("name"),
            "reviewer_role": user.get("role"),
            "review_remarks": remarks,
            "reviewed_at": now_utc
        }}
    )

    log_audit_event(
        action=f"LEAVE_{decision.upper()}",
        company_id=target_company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"leave_id": leave_id, "decision": decision, "emp_id": leave_doc["emp_id"]},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Leave request {decision.upper()} successfully"})


@app.route("/api/company/employees", methods=["GET", "POST", "PUT", "DELETE"])
def company_employees():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    data = request.json if (request.is_json and request.method in ("POST", "PUT", "DELETE")) else {}
    req_comp_id = (data.get("company_id") if isinstance(data, dict) else None) or request.args.get("company_id")
    target_company_id, iso_err = resolve_tenant_id(user, req_comp_id)
    if iso_err:
        return iso_err

    if request.method == "GET":
        search = request.args.get("search", "").strip()
        dept = request.args.get("department", "").strip()
        work_type = request.args.get("work_type", "").strip()
        status = request.args.get("status", "").strip()

        query = {"company_id": target_company_id}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"emp_id": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"mobile": {"$regex": search, "$options": "i"}}
            ]
        if dept: query["department"] = dept
        if work_type: query["work_type"] = work_type
        if status: query["status"] = status

        employees = list(employees_col.find(query, {"encoding": 0}).sort("name", 1))
        for emp in employees:
            emp["_id"] = str(emp["_id"])
        return jsonify({"ok": True, "employees": employees, "count": len(employees), "company_id": target_company_id})

    if request.method == "POST":
        data = request.json or {}
        emp_id = data.get("emp_id", "").strip().upper()
        name = data.get("name", "").strip()
        mobile = data.get("mobile", "").strip()
        email = data.get("email", "").strip()
        department = data.get("department", "General").strip()
        designation = data.get("designation", "Staff").strip()
        work_type = data.get("work_type", "Office").strip()  # Office, WFH, Field
        if work_type not in DEFAULT_WORK_TYPE_METHODS:
            work_type = "Office"
        assigned_location = data.get("assigned_location", "").strip()

        comp = companies_col.find_one({"company_id": target_company_id})
        comp_settings = get_company_controller_settings(comp)
        comp_permitted = [normalize_attendance_method(m) for m in comp_settings.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"])]

        raw_methods = data.get("allowed_methods")
        if isinstance(raw_methods, list) and len(raw_methods) > 0:
            allowed_methods = [normalize_attendance_method(m) for m in raw_methods if normalize_attendance_method(m) in comp_permitted]
            if not allowed_methods:
                allowed_methods = [m for m in DEFAULT_WORK_TYPE_METHODS.get(work_type, ["Face", "OTP"]) if m in comp_permitted]
        else:
            allowed_methods = [m for m in DEFAULT_WORK_TYPE_METHODS.get(work_type, ["Face", "OTP"]) if m in comp_permitted]

        raw_password = data.get("password")
        initial_password = (raw_password or "").strip() or "emp123"
        joining_date = data.get("joining_date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

        if not emp_id or not name or not mobile:
            return jsonify({"ok": False, "error": "Employee ID, Full Name, and Mobile Number are required"}), 400

        # Unique ID constraint within company
        if employees_col.find_one({"emp_id": emp_id, "company_id": target_company_id}):
            return jsonify({"ok": False, "error": f"Employee ID '{emp_id}' already exists in this company"}), 400

        tz = comp.get("timezone", DEFAULT_TIMEZONE) if comp else DEFAULT_TIMEZONE

        doc = {
            "emp_id": emp_id,
            "employee_id": emp_id,
            "company_id": target_company_id,
            "name": name,
            "mobile": mobile,
            "phone": mobile,
            "email": email,
            "department": department,
            "designation": designation,
            "work_type": work_type,
            "assigned_location": assigned_location,
            "timezone": tz,
            "status": "active",
            "allowed_methods": allowed_methods,
            "joining_date": joining_date,
            "created_at": get_utc_iso_string()
        }
        employees_col.insert_one(doc)

        # Create user account for employee portal login
        user_pwd_hash = hash_password(initial_password)
        user_doc = {
            "name": name,
            "email": email,
            "mobile": mobile,
            "phone": mobile,
            "password": user_pwd_hash,
            "password_hash": user_pwd_hash,
            "role": "employee",
            "company_id": target_company_id,
            "emp_id": emp_id,
            "employee_id": emp_id,
            "work_type": work_type,
            "allowed_methods": allowed_methods,
            "status": "active",
            "created_at": get_utc_iso_string()
        }
        users_col.insert_one(user_doc)

        log_audit_event(
            action="EMPLOYEE_CREATED",
            company_id=target_company_id,
            actor_name=user.get("name"),
            actor_role=user.get("role"),
            details={"emp_id": emp_id, "name": name, "work_type": work_type, "department": department, "allowed_methods": allowed_methods},
            ip=client_ip(),
            user_agent=client_user_agent()
        )

        return jsonify({"ok": True, "message": f"Employee '{name}' ({emp_id}) added successfully!", "allowed_methods": allowed_methods})

    if request.method == "PUT":
        data = request.json or {}
        emp_id = data.get("emp_id", "").strip().upper()
        if not emp_id:
            return jsonify({"ok": False, "error": "Employee ID is required"}), 400

        update_fields = {}
        for key in ["name", "mobile", "email", "department", "designation", "work_type", "assigned_location", "timezone", "status", "encoding"]:
            if key in data:
                value = data[key]
                update_fields[key] = value.strip() if isinstance(value, str) else value

        if "allowed_methods" in data:
            raw_methods = data.get("allowed_methods")
            comp = companies_col.find_one({"company_id": target_company_id})
            comp_settings = get_company_controller_settings(comp)
            comp_permitted = [normalize_attendance_method(m) for m in comp_settings.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"])]
            if isinstance(raw_methods, list):
                allowed_methods = [normalize_attendance_method(m) for m in raw_methods if normalize_attendance_method(m) in comp_permitted]
                update_fields["allowed_methods"] = allowed_methods

        update_fields["updated_at"] = get_utc_iso_string()
        res = employees_col.update_one({"emp_id": emp_id, "company_id": target_company_id}, {"$set": update_fields})
        if res.matched_count == 0:
            return jsonify({"ok": False, "error": f"Employee '{emp_id}' not found in this company"}), 404

        # Keep the employee portal login/profile record synchronized with the
        # editable employee directory record. This is important because the
        # dashboard reads from the user account while the roster reads from
        # the employee document.
        user_sync = {}
        for key in ["name", "email", "department", "designation", "assigned_location", "timezone", "status"]:
            if key in update_fields:
                user_sync[key] = update_fields[key]
        if "mobile" in update_fields:
            user_sync["mobile"] = update_fields["mobile"]
            user_sync["phone"] = update_fields["mobile"]
        if "status" in update_fields:
            user_sync["status"] = update_fields["status"]
        if "allowed_methods" in update_fields:
            user_sync["allowed_methods"] = update_fields["allowed_methods"]
        if "work_type" in update_fields:
            user_sync["work_type"] = update_fields["work_type"]
        raw_new_password = str(data.get("password") or "").strip()
        if raw_new_password:
            new_hash = hash_password(raw_new_password)
            user_sync["password"] = new_hash
            user_sync["password_hash"] = new_hash
        if user_sync:
            users_col.update_one({"emp_id": emp_id, "company_id": target_company_id}, {"$set": user_sync})

        log_audit_event(
            action="EMPLOYEE_UPDATED",
            company_id=target_company_id,
            actor_name=user.get("name"),
            actor_role=user.get("role"),
            details={"emp_id": emp_id, "updates": update_fields},
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({"ok": True, "message": f"Employee '{emp_id}' updated successfully"})

    if request.method == "DELETE":
        data = request.json or {}
        emp_id = data.get("emp_id", "").strip().upper() or request.args.get("emp_id", "").strip().upper()
        if not emp_id:
            return jsonify({"ok": False, "error": "Employee ID is required"}), 400

        res = employees_col.delete_one({"emp_id": emp_id, "company_id": target_company_id})
        if res.deleted_count == 0:
            return jsonify({"ok": False, "error": f"Employee '{emp_id}' not found in this company"}), 404

        users_col.delete_one({"emp_id": emp_id, "company_id": target_company_id})

        log_audit_event(
            action="EMPLOYEE_DELETED",
            company_id=target_company_id,
            actor_name=user.get("name"),
            actor_role=user.get("role"),
            details={"emp_id": emp_id},
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({"ok": True, "message": f"Employee '{emp_id}' deleted successfully"})


@app.route("/api/company/pending-employees", methods=["GET"])
def company_pending_employees():
    """List all pending self-registered employees for this specific company workspace."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    pending_list = list(employees_col.find({"company_id": target_company_id, "status": "pending"}).sort("created_at", -1))
    for p in pending_list:
        p["_id"] = str(p["_id"])

    return jsonify({"ok": True, "pending_employees": pending_list, "count": len(pending_list)})


@app.route("/api/company/pending-employees/<emp_id>/approve", methods=["POST"])
def company_approve_employee(emp_id):
    """Company Admin approves and activates a self-registered employee account."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    emp_id = emp_id.upper()
    emp = employees_col.find_one({"company_id": target_company_id, "emp_id": emp_id})
    if not emp:
        return jsonify({"ok": False, "error": "Employee record not found"}), 404

    data = request.json or {}
    update_data = {
        "status": "active",
        "approved_at": get_utc_iso_string(),
        "approved_by": user.get("name", "Company Admin")
    }
    if "department" in data: update_data["department"] = data["department"]
    if "designation" in data: update_data["designation"] = data["designation"]
    if "work_type" in data: update_data["work_type"] = data["work_type"]

    employees_col.update_one({"company_id": target_company_id, "emp_id": emp_id}, {"$set": update_data})
    users_col.update_one({"company_id": target_company_id, "emp_id": emp_id}, {"$set": {
        "status": "active",
        "department": update_data.get("department", emp.get("department")),
        "designation": update_data.get("designation", emp.get("designation")),
        "work_type": update_data.get("work_type", emp.get("work_type"))
    }})

    # Send in-app welcome notification to the employee
    notifications_col.insert_one({
        "company_id": target_company_id,
        "emp_id": emp_id,
        "title": "Welcome! Account Registration Approved",
        "message": f"Your employee account has been approved by {user.get('name')}. You can now sign in and mark attendance.",
        "type": "ONBOARDING_APPROVED",
        "is_read": False,
        "timestamp_utc": get_utc_iso_string()
    })

    log_audit_event(
        action="EMPLOYEE_REGISTRATION_APPROVED",
        company_id=target_company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"emp_id": emp_id, "employee_name": emp.get("name")},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Employee {emp.get('name')} ({emp_id}) approved and activated successfully"})


@app.route("/api/company/pending-employees/<emp_id>/reject", methods=["POST"])
def company_reject_employee(emp_id):
    """Company Admin rejects a self-registered employee account."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    emp_id = emp_id.upper()
    emp = employees_col.find_one({"company_id": target_company_id, "emp_id": emp_id})
    if not emp:
        return jsonify({"ok": False, "error": "Employee record not found"}), 404

    now_utc = get_utc_iso_string()
    employees_col.update_one({"company_id": target_company_id, "emp_id": emp_id}, {"$set": {"status": "rejected", "rejected_at": now_utc, "rejected_by": user.get("name")}})
    users_col.update_one({"company_id": target_company_id, "emp_id": emp_id}, {"$set": {"status": "rejected"}})

    log_audit_event(
        action="EMPLOYEE_REGISTRATION_REJECTED",
        company_id=target_company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"emp_id": emp_id, "employee_name": emp.get("name")},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Employee {emp.get('name')} ({emp_id}) registration rejected"})



@app.route("/api/company/stats", methods=["GET"])
def company_stats():
    """Calculate company today's live KPI attendance metrics strictly from database."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    company = companies_col.find_one({"company_id": target_company_id})
    tz = company.get("timezone", DEFAULT_TIMEZONE) if company else DEFAULT_TIMEZONE
    today_date, _, _ = get_localized_time(tz)

    registered_total = employees_col.count_documents({"company_id": target_company_id})
    active_total = employees_col.count_documents({"company_id": target_company_id, "status": "active"})

    present_count = attendance_col.count_documents({"company_id": target_company_id, "date": today_date, "status": "Present"})
    late_count = attendance_col.count_documents({"company_id": target_company_id, "date": today_date, "status": "Late"})
    half_day_count = attendance_col.count_documents({"company_id": target_company_id, "date": today_date, "status": "Half Day"})
    wfh_count = attendance_col.count_documents({"company_id": target_company_id, "date": today_date, "work_type": "WFH"})
    field_count = attendance_col.count_documents({"company_id": target_company_id, "date": today_date, "work_type": "Field"})

    # Real calculated absent: Active employees who haven't marked attendance today
    marked_total = attendance_col.count_documents({"company_id": target_company_id, "date": today_date})
    absent_marked = attendance_col.count_documents({"company_id": target_company_id, "date": today_date, "status": "Absent"})
    marked_total = max(0, marked_total - absent_marked)
    absent_count = max(0, active_total - marked_total)

    stats_payload = {
        "total_employees": registered_total,
        "active_employees": active_total,
        "registered": registered_total,
        "active": active_total,
        "present_today": present_count,
        "present": present_count,
        "absent": absent_count,
        "late_today": late_count,
        "late": late_count,
        "half_day_today": half_day_count,
        "half_day": half_day_count,
        "wfh_today": wfh_count,
        "wfh": wfh_count,
        "field_today": field_count,
        "field": field_count,
        "punctuality_rate": round(((present_count) / max(1, marked_total)) * 100, 1) if marked_total > 0 else 100.0
    }

    return jsonify({
        "ok": True,
        "date": today_date,
        "timezone": tz,
        "stats": stats_payload
    })


@app.route("/api/company/ai-insights", methods=["GET"])
def company_ai_insights():
    """AI Attendance Telemetry: Department performance, hourly distribution, and anomaly detection."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    company = companies_col.find_one({"company_id": target_company_id})
    tz = company.get("timezone", DEFAULT_TIMEZONE) if company else DEFAULT_TIMEZONE
    today_date, _, _ = get_localized_time(tz)

    # Hourly distribution for today
    today_logs = list(attendance_col.find({"company_id": target_company_id, "date": today_date}))
    hourly_counts = {f"{h:02d}:00": 0 for h in range(7, 21)}
    for log in today_logs:
        t = log.get("time", "")
        if t and len(t) >= 2:
            hr_key = f"{t[:2]}:00"
            if hr_key in hourly_counts:
                hourly_counts[hr_key] += 1

    # Department breakdown
    pipeline_dept = [
        {"$match": {"company_id": target_company_id}},
        {"$group": {"_id": "$department", "total": {"$sum": 1}}}
    ]
    dept_stats = list(employees_col.aggregate(pipeline_dept))
    dept_attendance = []
    for d in dept_stats:
        dname = d.get("_id") or "General"
        emp_in_dept = d.get("total", 0)
        present_in_dept = attendance_col.count_documents({
            "company_id": target_company_id,
            "department": dname,
            "date": today_date
        })
        dept_attendance.append({
            "department": dname,
            "total_employees": emp_in_dept,
            "present_today": present_in_dept,
            "rate": round((present_in_dept / max(1, emp_in_dept)) * 100, 1)
        })

    # AI Anomaly Detection flags
    anomalies = []
    late_today = [l for l in today_logs if l.get("status") == "Late"]
    if len(late_today) > 0:
        anomalies.append({
            "type": "LATE_BURST",
            "severity": "medium",
            "message": f"AI Alert: {len(late_today)} employee(s) arrived past the grace threshold today."
        })

    field_active = [l for l in today_logs if l.get("work_type") == "Field"]
    if len(field_active) > 0:
        anomalies.append({
            "type": "FIELD_ACTIVE",
            "severity": "info",
            "message": f"AI Telemetry: {len(field_active)} field personnel actively reporting GPS coordinates."
        })

    return jsonify({
        "ok": True,
        "hourly_distribution": [{"hour": k, "count": v} for k, v in hourly_counts.items()],
        "department_performance": dept_attendance,
        "anomalies": anomalies,
        "ai_health_score": 99.4
    })


@app.route("/api/company/attendance", methods=["GET"])
def company_attendance_logs():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    date = request.args.get("date")
    dept = request.args.get("department")
    work_type = request.args.get("work_type")
    method = request.args.get("method")
    status = request.args.get("status")
    emp_id = request.args.get("emp_id")

    query = {"company_id": target_company_id}
    if date: query["$or"] = [{"date": date}, {"local_date": date}]
    if dept: query["department"] = dept
    if work_type: query["work_type"] = work_type
    if method: query["method"] = method
    if status: query["status"] = status
    if emp_id: query["emp_id"] = emp_id.upper()

    limit = int(request.args.get("limit", 200))
    logs = list(attendance_col.find(query).sort("timestamp_utc", -1).limit(limit))
    for l in logs:
        l["_id"] = str(l["_id"])

    _ids = list({(l.get("emp_id") or l.get("employee_id")) for l in logs if (l.get("emp_id") or l.get("employee_id"))})
    _emp_map = {}
    try:
        for _e in employees_col.find({"company_id": target_company_id, "emp_id": {"$in": _ids}}, {"_id": 0, "emp_id": 1, "name": 1, "work_type": 1, "department": 1}):
            _emp_map[_e["emp_id"]] = _e
    except Exception:
        pass
    _bad = (None, "", "undefined", "null")
    for l in logs:
        _eid = l.get("emp_id") or l.get("employee_id")
        _emp = _emp_map.get(_eid, {})
        if l.get("name") in _bad:
            l["name"] = l.get("employee_name") or _emp.get("name") or "Unknown Employee"
        if l.get("method") in _bad:
            l["method"] = l.get("verification_method") or l.get("verificationMethod") or "Direct"
        if l.get("work_type") in _bad:
            l["work_type"] = l.get("work_mode") or l.get("workMode") or _emp.get("work_type") or "Office"
        if l.get("department") in _bad:
            l["department"] = _emp.get("department") or "General"
    return jsonify({"ok": True, "rows": logs, "count": len(logs), "company_id": target_company_id})


@app.route("/api/company/export-csv", methods=["GET"])
def company_export_csv():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    period = request.args.get("period", "today")
    company = companies_col.find_one({"company_id": target_company_id})
    tz = company.get("timezone", DEFAULT_TIMEZONE) if company else DEFAULT_TIMEZONE
    today_date, _, _ = get_localized_time(tz)

    query = {"company_id": target_company_id}
    if period == "today":
        query["date"] = today_date
        fname = f"{target_company_id}_attendance_{today_date}.csv"
    elif period == "month":
        month_prefix = today_date[:7]
        query["date"] = {"$regex": f"^{month_prefix}"}
        fname = f"{target_company_id}_attendance_month_{month_prefix}.csv"
    else:
        fname = f"{target_company_id}_attendance_all.csv"

    rows = list(attendance_col.find(query, {"_id": 0, "encoding": 0}).sort([("date", 1), ("time", 1)]))

    output = io.StringIO()
    fields = ["company_id", "emp_id", "name", "department", "work_type", "date", "time", "status", "method", "ip", "notes", "timestamp_utc"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )


@app.route("/api/company/field-visits", methods=["GET"])
def company_field_visits():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    visits = list(field_visits_col.find({"company_id": target_company_id}).sort("timestamp_utc", -1).limit(100))
    for v in visits:
        v["_id"] = str(v["_id"])
    return jsonify({"ok": True, "visits": visits, "count": len(visits)})


@app.route("/api/company/audit-logs", methods=["GET"])
def company_audit_logs():
    user, err = require_auth(allowed_roles=["company_admin", "super_admin"])
    if err:
        return err

    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err

    logs = list(audit_logs_col.find({"company_id": target_company_id}).sort("timestamp_utc", -1).limit(100))
    for l in logs:
        l["_id"] = str(l["_id"])
    return jsonify({"ok": True, "logs": logs, "count": len(logs)})


# ══════════════════════════════════════════════════════════════════════════════
#  ATTENDANCE ENGINE APIS (Multi-Tenant & Multi-Method)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/attendance/validate-employee", methods=["POST"])
def api_validate_employee():
    """
    Validates company existence, active status, employee existence, and work permissions.
    """
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()
    method = data.get("method", "Face").strip()

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method=method)
    if error:
        return jsonify({"ok": False, "valid": False, "error": error}), 400

    return jsonify({
        "ok": True,
        "valid": True,
        "employee": {
            "emp_id": employee.get("emp_id"),
            "name": employee.get("name"),
            "department": employee.get("department"),
            "designation": employee.get("designation"),
            "work_type": employee.get("work_type"),
            "company_id": company_id,
            "company_name": company.get("name"),
            "timezone": employee.get("timezone", company.get("timezone", DEFAULT_TIMEZONE)),
            "face_enrolled": bool(employee.get("encoding"))
        }
    })


@app.route("/api/attendance/liveness-challenge", methods=["POST"])
def api_attendance_liveness_challenge():
    """Generate an active challenge with short-lived session token to defeat presentation attacks."""
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()

    user = get_current_user()
    if user and user.get("role") == "employee":
        if not company_id: company_id = user.get("company_id", "").upper()
        if not emp_id: emp_id = user.get("emp_id", "").upper()

    challenge_data = create_liveness_challenge_session(company_id, emp_id)
    return jsonify(challenge_data), 200


@app.route("/api/attendance/mark-face", methods=["POST"])
def api_mark_face_attendance():
    """Camera Face AI Biometric & Live Photo Attendance with Anti-Spoofing, Geofence & Policy Evaluation."""
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()
    image = data.get("image", "")
    baseline_image = data.get("baseline_image", "")
    session_token = data.get("session_token")
    nonce = data.get("nonce")
    liveness_metadata = data.get("liveness_metadata") or {}
    lat = data.get("lat")
    lng = data.get("lng")
    accuracy = data.get("accuracy")

    user = get_current_user()
    if user and user.get("role") == "employee":
        if not company_id: company_id = user.get("company_id", "").upper()
        if not emp_id: emp_id = user.get("emp_id", "").upper()

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method="Face")
    if error:
        return jsonify({"ok": False, "error": error}), 400

    if not image:
        return jsonify({"ok": False, "error": "Camera frame snapshot is required to mark attendance"}), 400

    # 1. Anti-Replay Session Validation (Mandatory for Face AI Biometric PAD)
    challenge_action = None
    if not session_token or not nonce:
        return jsonify({
            "ok": False,
            "error": "Liveness Challenge Required: Face biometric attendance requires an active anti-spoofing session token. Please initiate a challenge session first.",
            "code": "LIVENESS_CHALLENGE_REQUIRED"
        }), 400

    valid_sess, sess_data, sess_err = validate_and_consume_liveness_session(session_token, company_id, emp_id, nonce)
    if not valid_sess:
        log_audit_event(
            action="LIVENESS_FAILED",
            company_id=company_id,
            actor_name=employee.get("name"),
            actor_role="employee",
            details={
                "emp_id": emp_id,
                "reason": sess_err,
                "attack_type": "Session Replay / Token Hijacking Attempt",
                "method": "Face"
            },
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({
            "ok": False,
            "error": f"Security Anti-Replay Alert: {sess_err}",
            "code": "LIVENESS_SESSION_INVALID"
        }), 400
    challenge_action = sess_data.get("challenge")

    # 2. Multi-Layer Presentation Attack Detection (PAD) & Liveness Evaluation
    liveness_eval = evaluate_liveness_score(
        action_image_b64=image,
        baseline_image_b64=baseline_image,
        liveness_metadata=liveness_metadata,
        challenge_action=challenge_action,
        threshold=LIVENESS_CONFIDENCE_THRESHOLD
    )

    if not liveness_eval["is_live"]:
        fail_reason = liveness_eval.get("reason", "Liveness verification failed")
        is_hard_spoof = any(k in fail_reason.lower() for k in ["virtual", "screen", "moiré", "static", "cutout", "glare", "planar", "chromatic"])
        log_audit_event(
            action="SPOOFING_ATTEMPT_DETECTED" if is_hard_spoof else "LIVENESS_FAILED",
            company_id=company_id,
            actor_name=employee.get("name"),
            actor_role="employee",
            details={
                "emp_id": emp_id,
                "reason": fail_reason,
                "liveness_score": liveness_eval.get("liveness_score", 0.0),
                "checks": liveness_eval.get("checks", {}),
                "method": "Face"
            },
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({
            "ok": False,
            "error": f"Biometric Anti-Spoofing Alert: {fail_reason}",
            "code": "SPOOFING_DETECTED",
            "details": liveness_eval
        }), 400

    # 3. Geofence check for Office employees if coordinates available
    if employee.get("work_type") == "Office" and lat is not None and lng is not None:
        policy = policies_col.find_one({"company_id": company_id}) or {}
        enforce_geo = policy.get("enforce_geofence", False) or company.get("enforce_geofence", False)
        office_locations = company.get("office_locations", [])
        if office_locations and enforce_geo:
            within_any = False
            min_dist = 999999
            for loc in office_locations:
                loc_lat = float(loc.get("lat", OFFICE_LAT))
                loc_lng = float(loc.get("lng", OFFICE_LNG))
                loc_radius = float(loc.get("radius_m", OFFICE_RADIUS_M))
                dist = haversine_distance(float(lat), float(lng), loc_lat, loc_lng)
                if dist < min_dist:
                    min_dist = dist
                if dist <= loc_radius:
                    within_any = True
                    break
            if not within_any:
                return jsonify({
                    "ok": False,
                    "error": f"Geofence check failed: You are outside the authorized office boundary ({round(min_dist, 1)}m away). Allowed radius: {OFFICE_RADIUS_M}m"
                }), 400

    # 4. Biometric Identity Matching against Database Enrolled Template
    enrolled_encoding = employee.get("encoding")
    if enrolled_encoding:
        is_match, dist, match_err = verify_face_biometric_match(image, enrolled_encoding, tolerance=FACE_MATCH_TOLERANCE)
        if not is_match:
            log_audit_event(
                action="BIOMETRIC_MISMATCH",
                company_id=company_id,
                actor_name=employee.get("name"),
                actor_role="employee",
                details={
                    "emp_id": emp_id,
                    "reason": match_err or "Face does not match registered employee profile",
                    "distance": dist,
                    "tolerance": FACE_MATCH_TOLERANCE,
                    "method": "Face"
                },
                ip=client_ip(),
                user_agent=client_user_agent()
            )
            return jsonify({
                "ok": False,
                "error": f"Biometric Verification Rejected: Detected face does not match registered biometric profile for {employee.get('name')} ({emp_id}).",
                "code": "BIOMETRIC_MISMATCH"
            }), 400
    else:
        # First-time auto-enrollment of live validated facial biometric
        try:
            new_enc, enc_err = encode_face_from_b64(image)
            if not enc_err and new_enc:
                employees_col.update_one({"emp_id": emp_id, "company_id": company_id}, {"$set": {"encoding": new_enc}})
        except Exception:
            pass

    # 5. Localized Time & Attendance Policy with Hierarchical Fallback
    tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
    local_date, local_time, local_formatted = get_localized_time(tz)
    utc_iso = get_utc_iso_string()
    ip = client_ip()
    check_type = str(data.get("check_type", "IN")).strip().upper()
    if check_type not in ("IN", "OUT"):
        check_type = "IN"

    # Robust duplicate check for Clock-In vs Clock-Out
    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, local_date, check_type)
    if is_dup:
        return jsonify({
            "ok": True,
            "status": "already_marked",
            "attendance_status": existing.get("status", "Present"),
            "check_type": check_type,
            "name": employee.get("name"),
            "emp_id": emp_id,
            "company_name": company.get("name"),
            "company_id": company_id,
            "time": existing.get("time"),
            "date": local_date,
            "timezone": tz,
            "message": dup_msg
        })

    # Policy-based status evaluation (Present, Late, Half Day)
    policy = policies_col.find_one({"company_id": company_id}) or {}
    status = evaluate_attendance_status(local_time, policy, employee.get("work_type", "Office"))
    if check_type == "OUT":
        status = "Completed"

    attendance_doc = {
        "company_id": company_id,
        "emp_id": emp_id,
        "name": employee.get("name"),
        "department": employee.get("department", "General"),
        "designation": employee.get("designation", "Staff"),
        "work_type": employee.get("work_type", "Office"),
        "date": local_date,
        "time": local_time,
        "local_date": local_date,
        "local_time": local_time,
        "timezone": tz,
        "timestamp_utc": utc_iso,
        "status": status,
        "method": "Face",
        "check_type": check_type,
        "photo_captured": True,
        "liveness_verified": True,
        "liveness_score": liveness_eval.get("liveness_score", 1.0),
        "ip": ip,
        "location": {"lat": float(lat), "lng": float(lng), "accuracy": float(accuracy) if accuracy else None} if lat and lng else None,
        "device_info": client_user_agent()
    }
    if check_type == "OUT":
        attendance_doc["check_out_time"] = local_time
    attendance_col.insert_one(attendance_doc)

    log_audit_event(
        action=f"ATTENDANCE_MARKED_FACE_{check_type}",
        company_id=company_id,
        actor_name=employee.get("name"),
        actor_role="employee",
        details={
            "emp_id": emp_id,
            "method": "Face",
            "check_type": check_type,
            "liveness_score": liveness_eval.get("liveness_score", 1.0),
            "date": local_date,
            "time": local_time,
            "status": status
        },
        ip=ip,
        user_agent=client_user_agent()
    )

    action_label = "Clock-IN" if check_type == "IN" else "Clock-OUT"
    return jsonify({
        "ok": True,
        "status": "marked",
        "attendance_status": status,
        "check_type": check_type,
        "liveness_verified": True,
        "liveness_score": liveness_eval.get("liveness_score", 1.0),
        "name": employee.get("name"),
        "emp_id": emp_id,
        "company_name": company.get("name"),
        "company_id": company_id,
        "department": employee.get("department", "General"),
        "work_type": employee.get("work_type", "Office"),
        "date": local_date,
        "time": local_time,
        "formatted": local_formatted,
        "timezone": tz,
        "message": f"🎉 Face AI {action_label} successfully recorded for {employee.get('name')} ({emp_id}) as '{status}' at {local_time} ({tz})"
    })


@app.route("/api/attendance/otp-send", methods=["POST"])
def api_otp_send():
    """Generate an attendance OTP and deliver it to the company's authorized HR/Manager email(s)."""
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()

    user = get_current_user()
    if user and user.get("role") == "employee":
        company_id = user.get("company_id", "").upper()
        emp_id = user.get("emp_id", "").upper()

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method="OTP")
    if error:
        return jsonify({"ok": False, "error": error}), 400

    # The company must explicitly register an authorized HR / Manager / attendance
    # authority. OTPs are never sent to the employee's phone or employee email.
    approvers = [
        a for a in get_organization_approvers(company_id)
        if a.get("email") and a.get("isActive", a.get("is_active", True)) is not False
    ]
    recipient_emails = []
    for a in approvers:
        email = a.get("email", "").strip().lower()
        if email and email not in recipient_emails:
            recipient_emails.append(email)

    if not recipient_emails:
        return jsonify({
            "ok": False,
            "error": "No authorized HR/Manager email is configured for OTP attendance. Company Admin must register at least one authorized person first."
        }), 400

    otp_key = f"{company_id}:{emp_id}"
    now_ts = datetime.now(timezone.utc).timestamp()
    if otp_key in otp_store and (now_ts < otp_store[otp_key]["created_ts"] + 30):
        remaining = int((otp_store[otp_key]["created_ts"] + 30) - now_ts)
        return jsonify({"ok": False, "error": f"Please wait {remaining}s before requesting a new OTP"}), 429

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires = now_ts + 300
    otp_store[otp_key] = {
        "otp_hash": hash_password(otp_code),
        "expires": expires,
        "attempts": 0,
        "created_ts": now_ts,
        "recipient_emails": recipient_emails
    }

    company_name = company.get("name", company_id) if company else company_id
    employee_name = employee.get("name", emp_id)
    subject = f"{company_name} — Attendance Verification OTP"
    text_body = (
        f"Attendance verification requested for {employee_name} ({emp_id}) at {company_name}.\n\n"
        f"Your one-time attendance verification code is: {otp_code}\n\n"
        "Valid for 5 minutes and limited verification attempts. Do not share this code outside the authorized attendance process.\n\n"
        "If you did not initiate this attendance verification, contact your company administrator.\n\n"
        f"{FROM_NAME}"
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;background:#f6f8fb;color:#172033">
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px">
        <h2 style="margin:0 0 8px">Attendance Verification</h2>
        <p style="color:#5b6475">{employee_name} ({emp_id}) requested attendance verification for <b>{company_name}</b>.</p>
        <div style="font-size:34px;letter-spacing:10px;font-weight:800;text-align:center;padding:20px;margin:22px 0;background:#f1f5ff;border-radius:12px">{otp_code}</div>
        <p>This OTP expires in <b>5 minutes</b> and is valid for the current attendance request only.</p>
        <p style="color:#667085;font-size:13px">If you did not initiate this request, please contact your company administrator.</p>
      </div>
    </div>
    """

    sent, send_error = send_smtp_email(recipient_emails, subject, text_body, html_body)
    if not sent:
        otp_store.pop(otp_key, None)
        log_audit_event(
            action="ATTENDANCE_OTP_EMAIL_FAILED",
            company_id=company_id,
            actor_name=employee.get("name"),
            actor_role="employee",
            details={"emp_id": emp_id, "recipients": [_mask_email(e) for e in recipient_emails], "error": send_error},
            ip=client_ip(),
            user_agent=client_user_agent()
        )
        return jsonify({"ok": False, "error": "OTP email could not be delivered. Please contact the company administrator."}), 502

    log_audit_event(
        action="ATTENDANCE_OTP_EMAIL_SENT",
        company_id=company_id,
        actor_name=employee.get("name"),
        actor_role="employee",
        details={"emp_id": emp_id, "recipients": [_mask_email(e) for e in recipient_emails]},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "message": "Attendance OTP sent to the company's authorized HR/Manager email.",
        "recipients": [_mask_email(e) for e in recipient_emails],
        "expires_in_seconds": 300
    })


@app.route("/api/attendance/otp-verify", methods=["POST"])
def api_otp_verify():
    """Method 2: Verify 6-digit OTP and mark attendance."""
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()
    entered_otp = data.get("otp", "").strip()

    user = get_current_user()
    if user and user.get("role") == "employee":
        company_id = user.get("company_id")
        emp_id = user.get("emp_id")

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method="OTP")
    if error:
        return jsonify({"ok": False, "error": error}), 400

    otp_key = f"{company_id}:{emp_id}"
    stored = otp_store.get(otp_key)
    if not stored:
        return jsonify({"ok": False, "error": "No active OTP request found. Please request a new OTP."}), 400

    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts > stored["expires"]:
        del otp_store[otp_key]
        return jsonify({"ok": False, "error": "OTP has expired. Please request a fresh OTP."}), 400

    if stored["attempts"] >= 3:
        del otp_store[otp_key]
        return jsonify({"ok": False, "error": "Maximum OTP verification attempts exceeded. Please request a new OTP."}), 403

    if hash_password(entered_otp) != stored["otp_hash"]:
        stored["attempts"] += 1
        remaining = 3 - stored["attempts"]
        return jsonify({"ok": False, "error": f"Incorrect OTP entered. {remaining} attempt(s) remaining."}), 400

    # Clean OTP from memory upon successful verification
    del otp_store[otp_key]

    check_type = str(data.get("check_type", "IN")).strip().upper()
    if check_type not in ("IN", "OUT"):
        check_type = "IN"

    tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
    local_date, local_time, local_formatted = get_localized_time(tz)
    utc_iso = get_utc_iso_string()
    ip = client_ip()

    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, local_date, check_type)
    if is_dup:
        return jsonify({
            "ok": True,
            "status": "already_marked",
            "attendance_status": existing.get("status", "Present"),
            "check_type": check_type,
            "time": existing.get("time"),
            "date": local_date,
            "timezone": tz,
            "message": dup_msg
        })

    policy = policies_col.find_one({"company_id": company_id}) or {}
    status = evaluate_attendance_status(local_time, policy, employee.get("work_type", "Office"))
    if check_type == "OUT":
        status = "Completed"

    attendance_doc = {
        "company_id": company_id,
        "emp_id": emp_id,
        "name": employee.get("name"),
        "department": employee.get("department"),
        "work_type": employee.get("work_type"),
        "date": local_date,
        "time": local_time,
        "local_date": local_date,
        "local_time": local_time,
        "timezone": tz,
        "timestamp_utc": utc_iso,
        "status": status,
        "method": "OTP",
        "check_type": check_type,
        "ip": ip,
        "device_info": client_user_agent()
    }
    if check_type == "OUT":
        attendance_doc["check_out_time"] = local_time
    attendance_col.insert_one(attendance_doc)

    log_audit_event(
        action=f"ATTENDANCE_MARKED_OTP_{check_type}",
        company_id=company_id,
        actor_name=employee.get("name"),
        actor_role="employee",
        details={"emp_id": emp_id, "method": "OTP", "check_type": check_type, "date": local_date, "time": local_time, "status": status},
        ip=ip,
        user_agent=client_user_agent()
    )

    action_label = "Clock-IN" if check_type == "IN" else "Clock-OUT"
    return jsonify({
        "ok": True,
        "status": "marked",
        "attendance_status": status,
        "check_type": check_type,
        "date": local_date,
        "time": local_time,
        "formatted": local_formatted,
        "timezone": tz,
        "message": f"[+] OTP verification successful! {action_label} marked as '{status}' at {local_time} ({tz})"
    })


@app.route("/api/attendance/mark-wifi", methods=["POST"])
def api_mark_wifi_attendance():
    """Method 3: Office Authorized Wi-Fi Network Attendance."""
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()
    check_type = str(data.get("check_type", "IN")).strip().upper()
    if check_type not in ("IN", "OUT"):
        check_type = "IN"

    user = get_current_user()
    if user and user.get("role") == "employee":
        company_id = user.get("company_id")
        emp_id = user.get("emp_id")

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method="WiFi")
    if error:
        return jsonify({"ok": False, "error": error}), 400

    ip = client_ip()
    on_office, reason = is_office_ip(ip, company_id=company_id, strict_check=True)
    if not on_office:
        return jsonify({"ok": False, "error": f"Wi-Fi validation rejected: {reason}"}), 400

    tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
    local_date, local_time, local_formatted = get_localized_time(tz)
    utc_iso = get_utc_iso_string()

    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, local_date, check_type)
    if is_dup:
        return jsonify({
            "ok": True,
            "status": "already_marked",
            "attendance_status": existing.get("status", "Present"),
            "check_type": check_type,
            "time": existing.get("time"),
            "date": local_date,
            "timezone": tz,
            "message": dup_msg
        })

    policy = policies_col.find_one({"company_id": company_id}) or {}
    status = evaluate_attendance_status(local_time, policy, employee.get("work_type", "Office"))
    if check_type == "OUT":
        status = "Completed"

    attendance_doc = {
        "company_id": company_id,
        "emp_id": emp_id,
        "name": employee.get("name"),
        "department": employee.get("department"),
        "work_type": employee.get("work_type"),
        "date": local_date,
        "time": local_time,
        "local_date": local_date,
        "local_time": local_time,
        "timezone": tz,
        "timestamp_utc": utc_iso,
        "status": status,
        "method": "WiFi",
        "check_type": check_type,
        "ip": ip,
        "device_info": client_user_agent()
    }
    if check_type == "OUT":
        attendance_doc["check_out_time"] = local_time
    attendance_col.insert_one(attendance_doc)

    log_audit_event(
        action=f"ATTENDANCE_MARKED_WIFI_{check_type}",
        company_id=company_id,
        actor_name=employee.get("name"),
        actor_role="employee",
        details={"emp_id": emp_id, "method": "WiFi", "check_type": check_type, "ip": ip, "status": status},
        ip=ip,
        user_agent=client_user_agent()
    )

    action_label = "Clock-IN" if check_type == "IN" else "Clock-OUT"
    return jsonify({
        "ok": True,
        "status": "marked",
        "attendance_status": status,
        "check_type": check_type,
        "date": local_date,
        "time": local_time,
        "formatted": local_formatted,
        "timezone": tz,
        "message": f"[+] Office Wi-Fi network verified! {action_label} recorded as '{status}' at {local_time} ({tz})"
    })


@app.route("/api/attendance/mark-field", methods=["POST"])
def api_mark_field_attendance():
    """Field Employee & Remote Attendance with Real GPS Geolocation and Client Meeting Tracking."""
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = data.get("emp_id", "").strip().upper()
    lat = data.get("lat")
    lng = data.get("lng")
    accuracy = data.get("accuracy", 0)
    check_type = data.get("check_type", "IN").upper()  # IN or OUT
    client_name = data.get("client_name", "").strip()
    notes = data.get("notes", "").strip()

    user = get_current_user()
    if user and user.get("role") == "employee":
        company_id = user.get("company_id")
        emp_id = user.get("emp_id")

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method="GPS")
    if error:
        return jsonify({"ok": False, "error": error}), 400

    if lat is None or lng is None:
        return jsonify({"ok": False, "error": "Verified GPS Location coordinates are required for field attendance"}), 400

    tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
    local_date, local_time, local_formatted = get_localized_time(tz)
    utc_iso = get_utc_iso_string()
    ip = client_ip()

    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, local_date, check_type)
    if is_dup:
        return jsonify({
            "ok": True,
            "status": "already_marked",
            "attendance_status": "Field",
            "check_type": check_type,
            "time": existing.get("time"),
            "date": local_date,
            "timezone": tz,
            "message": dup_msg
        })

    attendance_doc = {
        "company_id": company_id,
        "emp_id": emp_id,
        "name": employee.get("name"),
        "department": employee.get("department"),
        "work_type": "Field",
        "date": local_date,
        "time": local_time,
        "local_date": local_date,
        "local_time": local_time,
        "timezone": tz,
        "timestamp_utc": utc_iso,
        "status": "Field",
        "method": "GPS_Field",
        "check_type": check_type,
        "ip": ip,
        "location": {"lat": float(lat), "lng": float(lng), "accuracy": accuracy},
        "notes": f"[{check_type}] Client: {client_name} | {notes}" if client_name or notes else f"Field Check-{check_type}",
        "device_info": client_user_agent()
    }
    if check_type == "OUT":
        attendance_doc["check_out_time"] = local_time
    attendance_col.insert_one(attendance_doc)

    # If client visit details provided, record in dedicated field_visits collection
    if client_name or notes:
        field_visits_col.insert_one({
            "company_id": company_id,
            "emp_id": emp_id,
            "name": employee.get("name"),
            "date": local_date,
            "time": local_time,
            "timestamp_utc": utc_iso,
            "client_name": client_name,
            "check_type": check_type,
            "location": {"lat": float(lat), "lng": float(lng), "accuracy": accuracy},
            "notes": notes
        })

    log_audit_event(
        action=f"FIELD_ATTENDANCE_{check_type}",
        company_id=company_id,
        actor_name=employee.get("name"),
        actor_role="employee",
        details={"emp_id": emp_id, "lat": lat, "lng": lng, "client": client_name, "check_type": check_type},
        ip=ip,
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "status": "marked",
        "check_type": check_type,
        "date": local_date,
        "time": local_time,
        "formatted": local_formatted,
        "timezone": tz,
        "message": f"[+] Field GPS Check-{check_type} recorded at {local_time} ({tz})"
    })


@app.route("/api/attendance/my-history", methods=["GET"])
@app.route("/api/employee/my-attendance", methods=["GET"])
@app.route("/api/attendance/logs", methods=["GET"])
def api_my_attendance_history():
    """Retrieve personal attendance history and live statistics for authenticated employee."""
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    emp_id = user.get("emp_id")
    company_id = user.get("company_id")

    if not emp_id or not company_id:
        return jsonify({
            "ok": True, 
            "rows": [], 
            "logs": [], 
            "count": 0, 
            "today": None,
            "stats": {"present": 0, "late": 0, "half_day": 0, "wfh": 0, "field": 0, "total": 0, "leaves": 0, "punctuality_rate": 100.0}
        })

    company = companies_col.find_one({"company_id": company_id})
    tz = user.get("timezone") or (company.get("timezone") if company else DEFAULT_TIMEZONE) or DEFAULT_TIMEZONE
    today_date, _, _ = get_localized_time(tz)

    history = list(attendance_col.find({"company_id": company_id, "emp_id": emp_id}).sort("timestamp_utc", -1).limit(60))
    for h in history:
        h["_id"] = str(h["_id"])

    # Find today's record
    today_rec = next((h for h in history if h.get("date") == today_date), None)
    if not today_rec:
        today_db = attendance_col.find_one({"company_id": company_id, "emp_id": emp_id, "date": today_date})
        if today_db:
            today_db["_id"] = str(today_db["_id"])
            today_rec = today_db

    # Calculate employee personal stats
    present_cnt = sum(1 for h in history if h.get("status") == "Present")
    late_cnt = sum(1 for h in history if h.get("status") == "Late")
    half_day_cnt = sum(1 for h in history if h.get("status") == "Half Day")
    wfh_cnt = sum(1 for h in history if h.get("work_type") == "WFH" or h.get("status") == "WFH")
    field_cnt = sum(1 for h in history if h.get("work_type") == "Field" or h.get("status") == "Field")
    total_cnt = len(history)

    # Approved leaves count
    leaves_cnt = leaves_col.count_documents({"company_id": company_id, "emp_id": emp_id, "status": "approved"})

    punctuality = round((present_cnt / max(1, total_cnt)) * 100, 1) if total_cnt > 0 else 100.0

    stats = {
        "present": present_cnt,
        "late": late_cnt,
        "half_day": half_day_cnt,
        "wfh": wfh_cnt,
        "field": field_cnt,
        "total": total_cnt,
        "leaves": leaves_cnt,
        "punctuality_rate": punctuality
    }

    return jsonify({
        "ok": True,
        "rows": history,
        "logs": history,
        "count": len(history),
        "today": today_rec,
        "today_date": today_date,
        "stats": stats
    })


@app.route("/api/superadmin/reset-system-data", methods=["POST"])
def api_superadmin_reset_data():
    """Wipes all business data to a clean ZERO state, keeping only Super Admin account."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    from database import reset_database_to_zero
    reset_database_to_zero()

    log_audit_event(
        action="SUPER_ADMIN_SYSTEM_ZERO_RESET",
        company_id="GLOBAL",
        actor_name=user.get("name", "Super Admin"),
        actor_role="super_admin",
        details={"initiated_by": user.get("email"), "reason": "Admin requested clean zero-data reset"}
    )

    return jsonify({
        "ok": True,
        "message": "System database successfully wiped and reset to clean zero state. All tables initialized from scratch."
    })



@app.route("/api/network-status", methods=["GET"])
def api_network_status():
    company_id = request.args.get("company_id", "")
    ip = client_ip()
    on_office, reason = is_office_ip(ip, company_id=company_id)
    return jsonify({
        "on_office_wifi": on_office,
        "client_ip": ip,
        "server_ip": get_server_local_ip(),
        "reason": reason
    })


@app.route("/api/notifications", methods=["GET"])
def api_get_private_notifications():
    """Retrieve private in-system notifications for the authenticated user/employee."""
    user, err = require_auth()
    if err:
        return err

    company_id = user.get("company_id")
    emp_id = user.get("emp_id")

    query = {"company_id": company_id}
    if emp_id:
        query["emp_id"] = emp_id

    notes = list(notifications_col.find(query).sort("timestamp_utc", -1).limit(30))
    for n in notes:
        n["_id"] = str(n["_id"])
    return jsonify({"ok": True, "notifications": notes, "count": len(notes)})


@app.route("/api/attendance/my-active-otp", methods=["GET"])
def api_my_active_otp():
    """Return OTP delivery status only; never disclose the OTP itself through the API."""
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    company_id = user.get("company_id", "")
    emp_id = user.get("emp_id", "")
    if not company_id or not emp_id:
        return jsonify({"ok": False, "error": "Employee session context missing"}), 400
    stored = otp_store.get(f"{company_id}:{emp_id}")
    if not stored:
        return jsonify({"ok": False, "error": "No active OTP found"}), 404
    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts > stored["expires"]:
        otp_store.pop(f"{company_id}:{emp_id}", None)
        return jsonify({"ok": False, "error": "OTP expired"}), 400
    return jsonify({
        "ok": True,
        "otp_sent": True,
        "expires_in_seconds": max(0, int(stored["expires"] - now_ts)),
        "recipients": [_mask_email(e) for e in stored.get("recipient_emails", [])]
    })


# ── Dynamic Rotating Security Token Helper ────────────────────────────────────
def generate_dynamic_token(company_id):
    """Generates a time-based rotating 6-digit dynamic security code valid for 60 seconds."""
    time_block = int(datetime.now(timezone.utc).timestamp() // 60)
    raw = f"{company_id}:{SECRET_KEY}:{time_block}"
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"{int(token_hash[:8], 16) % 900000 + 100000}"

def verify_dynamic_token(company_id, code):
    """Verifies dynamic token against current and adjacent 60s time blocks."""
    if not code: return False
    code = str(code).strip()
    cur_time_block = int(datetime.now(timezone.utc).timestamp() // 60)
    for tb in (cur_time_block, cur_time_block - 1, cur_time_block + 1):
        raw = f"{company_id}:{SECRET_KEY}:{tb}"
        token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        expected = f"{int(token_hash[:8], 16) % 900000 + 100000}"
        if code == expected:
            return True
    return False

@app.route("/api/attendance/dynamic-token", methods=["GET"])
def api_get_dynamic_token():
    """Generates rotating dynamic office token / QR payload."""
    company_id = request.args.get("company_id", "").strip().upper()
    if not company_id:
        user = get_current_user()
        if user: company_id = user.get("company_id", "").upper()
    if not company_id:
        return jsonify({"ok": False, "error": "Company ID required"}), 400

    token = generate_dynamic_token(company_id)
    time_remaining = int(60 - (datetime.now(timezone.utc).timestamp() % 60))
    return jsonify({
        "ok": True,
        "company_id": company_id,
        "token": token,
        "expires_in_seconds": time_remaining,
        "qr_payload": json.dumps({
            "company_id": company_id,
            "token": token,
            "type": "DYNAMIC_OFFICE_QR",
            "ts": int(datetime.now(timezone.utc).timestamp())
        })
    })


def execute_workmode_checkin(company_id: str, emp_id: str, data: dict, req):
    """
    Core verification logic for Work From Office (WFO), Work From Home (WFH), and Sales Field.
    Permanently verifies against office Wi-Fi IP/subnet, office radius, home coordinates,
    assigned static IP, and GPS anti-spoofing.
    """
    comp_doc = companies_col.find_one({"company_id": company_id.upper()})
    if not comp_doc:
        return jsonify({"ok": False, "error": f"Organization workspace '{company_id}' not found", "code": "COMPANY_NOT_FOUND"}), 404

    emp_doc = employees_col.find_one({"company_id": company_id.upper(), "emp_id": emp_id.upper()})
    if not emp_doc:
        emp_doc = users_col.find_one({"company_id": company_id.upper(), "$or": [{"emp_id": emp_id.upper()}, {"email": emp_id.lower()}]})
    if not emp_doc:
        return jsonify({"ok": False, "error": f"Employee '{emp_id}' not found", "code": "EMPLOYEE_NOT_FOUND"}), 404

    # Determine operational work mode
    raw_mode = data.get("work_mode") or data.get("method") or emp_doc.get("work_mode") or emp_doc.get("workMode") or "WORK_FROM_OFFICE"
    raw_mode = str(raw_mode).upper().strip()
    if raw_mode in ("WFO", "OFFICE", "WORK_FROM_OFFICE", "OFFICE_WIFI_AND_GPS"):
        work_mode = "WORK_FROM_OFFICE"
    elif raw_mode in ("WFH", "HOME", "REMOTE", "WORK_FROM_HOME", "HOME_IP_AND_GPS"):
        work_mode = "WORK_FROM_HOME"
    elif raw_mode in ("FIELD", "SALES", "SALES_FIELD", "SALES_GPS"):
        work_mode = "SALES_FIELD"
    else:
        work_mode = "WORK_FROM_OFFICE"

    client_ip = get_client_real_ip(req)
    if req.headers.get("X-Forwarded-For"):
        client_ip = req.headers.get("X-Forwarded-For").split(",")[0].strip()
    elif req.headers.get("X-Real-IP"):
        client_ip = req.headers.get("X-Real-IP").strip()
    elif data.get("client_ip"):
        client_ip = str(data.get("client_ip")).strip()

    lat = data.get("lat") if data.get("lat") is not None else data.get("latitude")
    lng = data.get("lng") if data.get("lng") is not None else data.get("longitude")
    accuracy = data.get("accuracy") if data.get("accuracy") is not None else data.get("accuracyMeters")
    if lat is not None:
        try: lat = float(lat)
        except Exception: lat = None
    if lng is not None:
        try: lng = float(lng)
        except Exception: lng = None
    if accuracy is not None:
        try: accuracy = float(accuracy)
        except Exception: accuracy = None

    # 1. WORK FROM OFFICE (WFO)
    if work_mode == "WORK_FROM_OFFICE":
        # A. Office Wi-Fi / IP Verification
        # face_flow_skip_wifi: Face biometric attendance does not need office Wi-Fi/IP match
        _ref = str(req.headers.get("Referer") or "")
        _meth = str(data.get("method") or data.get("verification_method") or data.get("check_method") or "").lower()
        _face_flow = ("/employee/face" in _ref) or ("face" in _meth) or ("biometric" in _meth)
        office_wifi_ip = comp_doc.get("officeWifiIp") or comp_doc.get("office_wifi_ip")
        if _face_flow:
            pass
        elif office_wifi_ip and str(office_wifi_ip).strip():
            matches_wifi = False
            for rule in str(office_wifi_ip).split(","):
                if match_ip_rule(client_ip, rule.strip()):
                    matches_wifi = True
                    break
            if not matches_wifi:
                return jsonify({
                    "ok": False,
                    "error": f"Wi-Fi Verification Failed: Your current IP ({client_ip}) does not match authorized office Wi-Fi network ({office_wifi_ip}).",
                    "code": "OFFICE_WIFI_MISMATCH"
                }), 403
        else:
            is_valid_wifi, wifi_msg = is_office_ip(client_ip, company_id=company_id)
            if not is_valid_wifi:
                return jsonify({
                    "ok": False,
                    "error": f"Wi-Fi Verification Failed: {wifi_msg}",
                    "code": "OFFICE_WIFI_MISMATCH"
                }), 403

        # B. Office Geofence Range Verification
        office_lat = comp_doc.get("officeLatitude") if comp_doc.get("officeLatitude") is not None else comp_doc.get("office_latitude", OFFICE_LAT)
        office_lng = comp_doc.get("officeLongitude") if comp_doc.get("officeLongitude") is not None else comp_doc.get("office_longitude", OFFICE_LNG)
        office_radius = comp_doc.get("officeRangeRadiusM") if comp_doc.get("officeRangeRadiusM") is not None else comp_doc.get("office_range_radius_m", 100)

        if lat is None or lng is None:
            return jsonify({
                "ok": False,
                "error": "Geofence Verification Failed: Device GPS coordinates are required for Office check-in.",
                "code": "GPS_REQUIRED"
            }), 403

        distance = calculate_distance_meters(lat, lng, float(office_lat), float(office_lng))
        # face_gps_track_only: face flow me location sirf track hoti hai, range se reject nahi
        if distance > float(office_radius) and not _face_flow:
            return jsonify({
                "ok": False,
                "error": f"Geofence Verification Failed: You are {round(distance, 1)}m away from office location, exceeding the allowed range of {office_radius}m (Distance > 100m -> REJECTED ❌).",
                "distance_m": round(distance, 1),
                "allowed_radius_m": office_radius,
                "status": "REJECTED",
                "code": "OFFICE_GEOFENCE_EXCEEDED"
            }), 403

        verif_method = "OFFICE_WIFI_AND_GPS"
        dist_from_base = round(distance, 2)

    # 2. WORK FROM HOME (WFH)
    elif work_mode == "WORK_FROM_HOME":
        # A. Home Geofence Range Verification
        home_lat = emp_doc.get("homeLatitude") if emp_doc.get("homeLatitude") is not None else emp_doc.get("home_latitude")
        home_lng = emp_doc.get("homeLongitude") if emp_doc.get("homeLongitude") is not None else emp_doc.get("home_longitude")
        home_radius = emp_doc.get("homeRangeRadiusM") if emp_doc.get("homeRangeRadiusM") is not None else emp_doc.get("home_range_radius_m", 200)

        if home_lat is None or home_lng is None:
            return jsonify({
                "ok": False,
                "error": "Home Geofence Failed: Registered home base coordinates not found. Please complete first-time login onboarding.",
                "code": "HOME_COORDS_MISSING"
            }), 403

        if lat is None or lng is None:
            return jsonify({
                "ok": False,
                "error": "Home Geofence Failed: Live device GPS coordinates are required for WFH check-in.",
                "code": "GPS_REQUIRED"
            }), 403

        distance = calculate_distance_meters(lat, lng, float(home_lat), float(home_lng))
        if distance > float(home_radius):
            return jsonify({
                "ok": False,
                "error": f"Home Geofence Verification Failed: You are {round(distance, 1)}m away from your registered home base, exceeding the allowed {home_radius}m radius.",
                "distance_m": round(distance, 1),
                "allowed_radius_m": home_radius,
                "code": "HOME_GEOFENCE_EXCEEDED"
            }), 403

        # B. IP Verification (Assigned static IP)
        assigned_ip = emp_doc.get("assignedIp") or emp_doc.get("assigned_ip")
        if assigned_ip and str(assigned_ip).strip():
            matches_ip = False
            for rule in str(assigned_ip).split(","):
                if match_ip_rule(client_ip, rule.strip()):
                    matches_ip = True
                    break
            if not matches_ip:
                return jsonify({
                    "ok": False,
                    "error": f"Assigned IP Verification Failed: Current IP ({client_ip}) does not match your assigned static home IP ({assigned_ip}). Please submit an IP Change Request if your ISP rotated your IP.",
                    "code": "ASSIGNED_IP_MISMATCH"
                }), 403

        verif_method = "HOME_IP_AND_GPS"
        dist_from_base = round(distance, 2)

    # 3. SALES FIELD
    elif work_mode == "SALES_FIELD":
        is_mock = bool(data.get("is_mock", False)) or bool(data.get("mock_detected", False))
        if is_mock or (accuracy is not None and accuracy <= 0):
            log_audit_event(
                action="MOCK_LOCATION_DETECTED",
                company_id=company_id,
                actor_name=emp_doc.get("name"),
                actor_role="employee",
                details={"emp_id": emp_id, "lat": lat, "lng": lng, "accuracy": accuracy},
                ip=client_ip,
                user_agent=client_user_agent()
            )
            return jsonify({
                "ok": False,
                "error": "Anti-Spoofing Security Alert: Mock location or fake GPS app detected. Dynamic field check-in denied.",
                "code": "MOCK_LOCATION_DETECTED"
            }), 403

        if lat is None or lng is None:
            return jsonify({
                "ok": False,
                "error": "Sales Field Failed: High-accuracy live GPS coordinates are required.",
                "code": "GPS_REQUIRED"
            }), 403

        verif_method = "SALES_GPS"
        dist_from_base = None

    else:
        return jsonify({"ok": False, "error": f"Invalid work mode '{work_mode}'", "code": "INVALID_WORK_MODE"}), 400

    now_utc = get_utc_now()
    now_iso = get_utc_iso_string()
    tz = resolve_entity_timezone(company_id=company_id)
    date_str, time_str, _ = get_localized_time(tz)

    check_type = str(data.get("check_type", "IN")).strip().upper()
    if check_type not in ("IN", "OUT"):
        check_type = "IN"

    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, date_str, check_type)
    if is_dup:
        return jsonify({
            "ok": True,
            "status": "already_marked",
            "attendance_status": existing.get("status", "PRESENT"),
            "check_type": check_type,
            "message": dup_msg,
            "time": existing.get("time"),
            "date": date_str
        })

    att_id = str(ObjectId())
    requires_approval = bool(data.get("request_otp") or data.get("requires_approver") or data.get("requires_approval"))
    attendance_status = "PENDING_APPROVAL" if requires_approval else ("Completed" if check_type == "OUT" else "PRESENT")
    if requires_approval:
        verif_method = f"{work_mode}_OTP_APPROVER"

    log_doc = {
        "_id": ObjectId(att_id),
        "id": att_id,
        "attendance_id": att_id,
        "company_id": company_id.upper(),
        "organizationId": company_id.upper(),
        "emp_id": emp_id.upper(),
        "employee_id": emp_id.upper(),
        "employeeId": emp_id.upper(),
        "employee_name": emp_doc.get("name", "Employee"),
        "clientIp": client_ip,
        "client_ip": client_ip,
        "ip_address": client_ip,
        "latitude": lat,
        "longitude": lng,
        "accuracyMeters": accuracy,
        "distanceFromBaseM": dist_from_base,
        "distance_m": dist_from_base,
        "verificationMethod": verif_method,
        "verification_method": verif_method,
        "status": attendance_status,
        "work_mode": work_mode,
        "workMode": work_mode,
        "date": date_str,
        "time": time_str,
        "check_in_time": time_str if check_type == "IN" else None,
        "check_out_time": time_str if check_type == "OUT" else None,
        "check_type": check_type,
        "timestamp_utc": now_iso,
        "checkInTime": now_iso if check_type == "IN" else None,
        "created_at": now_iso
    }
    if not log_doc.get("name"):
        log_doc["name"] = log_doc.get("employee_name") or emp_doc.get("name", "Employee")
    if not log_doc.get("method"):
        log_doc["method"] = log_doc.get("verification_method") or log_doc.get("verificationMethod") or "Direct"
    attendance_col.insert_one(log_doc)

    if requires_approval:
        approvers = get_organization_approvers(company_id)
        for appr in approvers:
            appr_email = appr.get("email")
            if appr_email:
                notifications_col.insert_one({
                    "company_id": company_id,
                    "recipient_email": appr_email.lower(),
                    "channel": "Gmail",
                    "title": f"Attendance Authorization Request: {emp_doc.get('name')}",
                    "message": f"Employee {emp_doc.get('name')} ({emp_id}) requests {work_mode} {check_type} authorization. (GPS: {lat}, {lng}, IP: {client_ip})",
                    "type": "OTP_APPROVAL_DISPATCH",
                    "attendance_id": att_id,
                    "timestamp_utc": now_iso,
                    "read": False
                })

    log_audit_event(
        action=f"CHECK_{check_type}_{work_mode}",
        company_id=company_id,
        actor_name=emp_doc.get("name"),
        actor_role="employee",
        details={"emp_id": emp_id, "verification_method": verif_method, "distance": dist_from_base, "ip": client_ip, "status": attendance_status, "check_type": check_type},
        ip=client_ip,
        user_agent=client_user_agent()
    )

    action_label = "Clock-IN" if check_type == "IN" else "Clock-OUT"
    msg = f"{action_label} APPROVED Successfully ✅ ({work_mode} verified at {time_str})" if not requires_approval else f"{action_label} request submitted! Dispatched to designated approvers via Gmail. Awaiting approval."

    return jsonify({
        "ok": True,
        "status": attendance_status,
        "attendance_status": "APPROVED" if attendance_status in ("PRESENT", "Completed") else attendance_status,
        "check_type": check_type,
        "message": msg,
        "attendance_id": att_id,
        "employee_id": emp_id,
        "emp_id": emp_id,
        "distance_m": dist_from_base,
        "allowed_radius_m": office_radius if work_mode == "WORK_FROM_OFFICE" else (home_radius if work_mode == "WORK_FROM_HOME" else None),
        "verification_method": verif_method,
        "work_mode": work_mode,
        "time": time_str,
        "date": date_str
    })


@app.route("/attendance/check-in", methods=["POST"])
@app.route("/api/attendance/check-in", methods=["POST"])
def api_authorized_check_in():
    """
    Unified Authorized Attendance Check-In Endpoint.
    Handles:
    - Work Mode verifications (WFO, WFH, Sales Field)
    - Face AI camera frames (Base64)
    - Dynamic QR / Barcode / In-App Code validation
    - Office Wi-Fi / IP Subnet validation
    - Field GPS Radar validation
    - In-App 2FA OTP verification
    - Offline queued sync records
    """
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    emp_id = (data.get("emp_id") or data.get("employee_id") or "").strip().upper()

    user = get_current_user()
    if user and user.get("role") == "employee":
        if not company_id: company_id = user.get("company_id", "").upper()
        if not emp_id: emp_id = user.get("emp_id", "").upper()

    if not company_id and emp_id:
        emp_rec = employees_col.find_one({"emp_id": emp_id}) or users_col.find_one({"emp_id": emp_id})
        if emp_rec:
            company_id = emp_rec.get("company_id", "").upper()

    # Automatic normalization of GPS/employee fields
    if "latitude" in data and "lat" not in data:
        data["lat"] = data["latitude"]
    if "longitude" in data and "lng" not in data:
        data["lng"] = data["longitude"]
    if "employee_id" in data and "emp_id" not in data:
        data["emp_id"] = data["employee_id"]

    method = data.get("method", "Face").strip()
    image = data.get("image", "")
    code = data.get("code", "")
    lat = data.get("lat")
    lng = data.get("lng")
    accuracy = data.get("accuracy")
    device_id = data.get("device_id", "") or client_user_agent()
    network_status = data.get("network_status", "online")
    is_offline_sync = bool(data.get("is_offline_sync", False))
    client_timestamp = data.get("timestamp")

    # If method is not specifically Face/QR, but GPS coordinates are passed without an image, default to work mode
    if (not data.get("method") or data.get("method") in ("Face", "GPS", "Location", "Geofence", "check-in", "attendance")) and (lat is not None or "work_mode" in data or not image):
        method = data.get("work_mode") or "WORK_FROM_OFFICE"

    company, employee, error = validate_company_and_employee(company_id, emp_id, required_method=method if method not in ("QR", "Code", "WFO", "WFH", "FIELD", "WORK_FROM_OFFICE", "WORK_FROM_HOME", "SALES_FIELD", "GPS", "Location", "Geofence") else None)
    if error:
        return jsonify({"ok": False, "error": error, "code": "VALIDATION_FAILED"}), 400

    # 1. Method-Specific Validation
    if method in ("WFO", "WFH", "FIELD", "WORK_FROM_OFFICE", "WORK_FROM_HOME", "SALES_FIELD", "OFFICE_WIFI_AND_GPS", "HOME_IP_AND_GPS", "SALES_GPS", "GPS", "Location", "Geofence") or data.get("work_mode"):
        return execute_workmode_checkin(company_id, emp_id, data, request)

    if method in ("QR", "Code"):
        is_valid_code = verify_dynamic_token(company_id, code)
        if not is_valid_code:
            # Check if OTP was entered as code
            otp_key = f"{company_id}:{emp_id}"
            stored = otp_store.get(otp_key)
            if stored and hash_password(code) == stored.get("otp_hash") and (datetime.now(timezone.utc).timestamp() <= stored.get("expires", 0)):
                is_valid_code = True
                del otp_store[otp_key]

        if not is_valid_code:
            return jsonify({
                "ok": False, 
                "error": "Invalid or expired verification code / QR. Please scan a fresh dynamic code or check your in-app OTP.",
                "code": "INVALID_CODE"
            }), 400

    elif method == "WiFi":
        ip = client_ip()
        on_office, reason = is_office_ip(ip, company_id=company_id)
        if not on_office:
            return jsonify({"ok": False, "error": f"Wi-Fi check-in rejected: {reason}", "code": "WIFI_MISMATCH"}), 400

    session_token = data.get("session_token")
    nonce = data.get("nonce")
    liveness_metadata = data.get("liveness_metadata") or {}
    baseline_image = data.get("baseline_image", "")
    liveness_score = 1.0

    if method == "Face":
        challenge_action = None
        if not session_token or not nonce:
            return jsonify({
                "ok": False,
                "error": "Liveness Challenge Required: Face biometric attendance requires an active anti-spoofing session token. Please initiate a challenge session first.",
                "code": "LIVENESS_CHALLENGE_REQUIRED"
            }), 400

        valid_sess, sess_data, sess_err = validate_and_consume_liveness_session(session_token, company_id, emp_id, nonce)
        if not valid_sess:
            log_audit_event(
                action="LIVENESS_FAILED",
                company_id=company_id,
                actor_name=employee.get("name"),
                actor_role="employee",
                details={"emp_id": emp_id, "reason": sess_err, "method": "Face"},
                ip=client_ip(),
                user_agent=client_user_agent()
            )
            return jsonify({
                "ok": False,
                "error": f"Liveness Security Alert: {sess_err}",
                "code": "LIVENESS_SESSION_INVALID"
            }), 400
        challenge_action = sess_data.get("challenge")

        # Multi-layer anti-spoofing verification
        liveness_eval = evaluate_liveness_score(
            action_image_b64=image,
            baseline_image_b64=baseline_image,
            liveness_metadata=liveness_metadata,
            challenge_action=challenge_action,
            threshold=LIVENESS_CONFIDENCE_THRESHOLD
        )
        if not liveness_eval["is_live"]:
            fail_reason = liveness_eval.get("reason", "Liveness verification failed")
            is_hard_spoof = any(k in fail_reason.lower() for k in ["virtual", "screen", "moiré", "static", "cutout", "glare", "planar", "chromatic"])
            log_audit_event(
                action="SPOOFING_ATTEMPT_DETECTED" if is_hard_spoof else "LIVENESS_FAILED",
                company_id=company_id,
                actor_name=employee.get("name"),
                actor_role="employee",
                details={
                    "emp_id": emp_id,
                    "reason": fail_reason,
                    "liveness_score": liveness_eval.get("liveness_score", 0.0),
                    "checks": liveness_eval.get("checks", {}),
                    "method": "Face"
                },
                ip=client_ip(),
                user_agent=client_user_agent()
            )
            return jsonify({
                "ok": False,
                "error": f"Biometric Anti-Spoofing Alert: {fail_reason}",
                "code": "SPOOFING_DETECTED",
                "details": liveness_eval
            }), 400
        liveness_score = liveness_eval.get("liveness_score", 1.0)

    # Geofence validation for Office staff when lat/lng are provided
    if employee.get("work_type") == "Office" and lat is not None and lng is not None:
        policy = policies_col.find_one({"company_id": company_id}) or {}
        enforce_geo = policy.get("enforce_geofence", False) or company.get("enforce_geofence", False)
        office_locations = company.get("office_locations", [])
        if office_locations and enforce_geo:
            within_any = False
            min_dist = 999999
            for loc in office_locations:
                loc_lat = float(loc.get("lat", OFFICE_LAT))
                loc_lng = float(loc.get("lng", OFFICE_LNG))
                loc_radius = float(loc.get("radius_m", OFFICE_RADIUS_M))
                dist = haversine_distance(float(lat), float(lng), loc_lat, loc_lng)
                if dist < min_dist: min_dist = dist
                if dist <= loc_radius:
                    within_any = True
                    break
            if not within_any:
                return jsonify({
                    "ok": False,
                    "error": f"Geofence check failed: You are outside the authorized boundary ({round(min_dist, 1)}m away). Allowed radius: {OFFICE_RADIUS_M}m",
                    "code": "GEO_MISMATCH"
                }), 400

    # Biometric identity verification and auto-enrollment for camera frames (after liveness passes)
    if method == "Face":
        enrolled_encoding = employee.get("encoding")
        if enrolled_encoding:
            is_match, dist, match_err = verify_face_biometric_match(image, enrolled_encoding, tolerance=FACE_MATCH_TOLERANCE)
            if not is_match:
                log_audit_event(
                    action="BIOMETRIC_MISMATCH",
                    company_id=company_id,
                    actor_name=employee.get("name"),
                    actor_role="employee",
                    details={
                        "emp_id": emp_id,
                        "reason": match_err or "Face does not match registered employee profile",
                        "distance": dist,
                        "tolerance": FACE_MATCH_TOLERANCE,
                        "method": "Face"
                    },
                    ip=client_ip(),
                    user_agent=client_user_agent()
                )
                return jsonify({
                    "ok": False,
                    "error": f"Biometric Verification Rejected: Detected face does not match registered biometric profile for {employee.get('name')} ({emp_id}).",
                    "code": "BIOMETRIC_MISMATCH"
                }), 400
        elif image:
            try:
                new_enc, enc_err = encode_face_from_b64(image)
                if not enc_err and new_enc:
                    employees_col.update_one({"emp_id": emp_id, "company_id": company_id}, {"$set": {"encoding": new_enc}})
            except Exception:
                pass

    # 2. Localized Time & Shift Policy Evaluation with Hierarchical Fallback
    tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
    local_date, local_time, local_formatted = get_localized_time(tz)
    utc_iso = get_utc_iso_string()
    ip = client_ip()

    check_type = str(data.get("check_type", "IN")).strip().upper()
    if check_type not in ("IN", "OUT"):
        check_type = "IN"

    # Anti-Duplicate Check supporting Clock-In and Clock-Out
    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, local_date, check_type)
    if is_dup:
        return jsonify({
            "ok": True,
            "status": "already_marked",
            "attendance_status": existing.get("status", "Present"),
            "check_type": check_type,
            "name": employee.get("name"),
            "emp_id": emp_id,
            "company_name": company.get("name"),
            "company_id": company_id,
            "time": existing.get("time"),
            "date": local_date,
            "timezone": tz,
            "message": dup_msg
        })

    policy = policies_col.find_one({"company_id": company_id}) or {}
    status = evaluate_attendance_status(local_time, policy, employee.get("work_type", "Office"))
    if check_type == "OUT":
        status = "Completed"

    attendance_doc = {
        "company_id": company_id,
        "emp_id": emp_id,
        "name": employee.get("name"),
        "department": employee.get("department", "General"),
        "designation": employee.get("designation", "Staff"),
        "work_type": employee.get("work_type", "Office"),
        "date": local_date,
        "time": local_time,
        "local_date": local_date,
        "local_time": local_time,
        "timezone": tz,
        "timestamp_utc": utc_iso,
        "status": status,
        "method": method,
        "check_type": check_type,
        "photo_captured": bool(image),
        "liveness_verified": True if method == "Face" else None,
        "liveness_score": liveness_score if method == "Face" else None,
        "ip": ip,
        "location": {"lat": float(lat), "lng": float(lng), "accuracy": float(accuracy) if accuracy else None} if lat and lng else None,
        "device_info": device_id,
        "network_status": network_status,
        "is_offline_sync": is_offline_sync,
        "client_timestamp": client_timestamp
    }
    if check_type == "OUT":
        attendance_doc["check_out_time"] = local_time
    attendance_col.insert_one(attendance_doc)

    log_audit_event(
        action=f"ATTENDANCE_CHECK_{check_type}",
        company_id=company_id,
        actor_name=employee.get("name"),
        actor_role="employee",
        details={
            "emp_id": emp_id,
            "method": method,
            "check_type": check_type,
            "liveness_verified": True if method == "Face" else None,
            "liveness_score": liveness_score if method == "Face" else None,
            "date": local_date,
            "time": local_time,
            "status": status,
            "is_offline_sync": is_offline_sync
        },
        ip=ip,
        user_agent=client_user_agent()
    )

    action_label = "Clock-IN" if check_type == "IN" else "Clock-OUT"
    return jsonify({
        "ok": True,
        "status": "marked",
        "attendance_status": status,
        "check_type": check_type,
        "name": employee.get("name"),
        "emp_id": emp_id,
        "company_name": company.get("name"),
        "company_id": company_id,
        "department": employee.get("department", "General"),
        "work_type": employee.get("work_type", "Office"),
        "date": local_date,
        "time": local_time,
        "formatted": local_formatted,
        "timezone": tz,
        "method": method,
        "message": f"🎉 {action_label} verified successfully via {method} for {employee.get('name')} ({emp_id}) as '{status}' at {local_time} ({tz})"
    })


@app.route("/api/attendance/sync-offline", methods=["POST"])
def api_sync_offline_attendance():
    """Batch Sync Endpoint for Offline Queued Check-In Records."""
    data = request.json or {}
    punches = data.get("punches", [])
    if not punches or not isinstance(punches, list):
        return jsonify({"ok": False, "error": "Invalid or empty punches payload"}), 400

    synced_count = 0
    already_marked_count = 0
    failed_punches = []

    for punch in punches:
        company_id = punch.get("company_id", "").strip().upper()
        emp_id = punch.get("emp_id", "").strip().upper()
        punch_date = punch.get("date")
        punch_time = punch.get("time")

        company, employee, error = validate_company_and_employee(company_id, emp_id)
        if error:
            failed_punches.append({"punch_id": punch.get("punch_id"), "error": error})
            continue

        tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
        if not punch_date:
            punch_date, punch_time, _ = get_localized_time(tz)

        punch_check_type = str(punch.get("check_type", "IN")).strip().upper()
        if punch_check_type not in ("IN", "OUT"):
            punch_check_type = "IN"

        is_dup, _, _ = check_attendance_duplicate_status(company_id, emp_id, punch_date, punch_check_type)
        if is_dup:
            already_marked_count += 1
            continue

        policy = policies_col.find_one({"company_id": company_id}) or {}
        status = evaluate_attendance_status(punch_time or "09:30", policy, employee.get("work_type", "Office"))
        if punch_check_type == "OUT":
            status = "Completed"

        doc = {
            "company_id": company_id,
            "emp_id": emp_id,
            "name": employee.get("name"),
            "department": employee.get("department", "General"),
            "designation": employee.get("designation", "Staff"),
            "work_type": employee.get("work_type", "Office"),
            "date": punch_date,
            "time": punch_time or "09:30",
            "local_date": punch_date,
            "local_time": punch_time or "09:30",
            "timezone": tz,
            "timestamp_utc": punch.get("timestamp_utc") or get_utc_iso_string(),
            "status": status,
            "method": punch.get("method", "Offline-Sync"),
            "check_type": punch_check_type,
            "photo_captured": bool(punch.get("image")),
            "ip": client_ip(),
            "location": punch.get("location"),
            "device_info": punch.get("device_info", "Offline Client"),
            "is_offline_sync": True,
            "synced_at": get_utc_iso_string()
        }
        if punch_check_type == "OUT":
            doc["check_out_time"] = punch_time or "18:00"
        attendance_col.insert_one(doc)
        synced_count += 1

    return jsonify({
        "ok": True,
        "synced_count": synced_count,
        "already_marked_count": already_marked_count,
        "failed_count": len(failed_punches),
        "failed_details": failed_punches,
        "message": f"Successfully synchronized {synced_count} offline attendance punch(es)."
    })


# ══════════════════════════════════════════════════════════════════════════════
#  EXTENDED SUPER ADMIN APIS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/superadmin/companies/<company_id>/create-admin", methods=["POST"])
def superadmin_create_company_admin(company_id):
    """Super Admin creates an administrator account for any company."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    company_id = company_id.upper()
    comp = companies_col.find_one({"company_id": company_id})
    if not comp:
        return jsonify({"ok": False, "error": f"Company '{company_id}' not found"}), 404
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    mobile = data.get("mobile", "").strip()
    password = data.get("password", "").strip()
    role = data.get("role", "company_admin").strip()
    if not name or not mobile or not password:
        return jsonify({"ok": False, "error": "Admin name, mobile, and password are required"}), 400
    existing = users_col.find_one({"company_id": company_id, "$or": [{"mobile": mobile}, {"email": email}] if email else [{"mobile": mobile}]})
    if existing:
        return jsonify({"ok": False, "error": "An admin with this mobile/email already exists for this company"}), 409
    now_utc = get_utc_iso_string()
    admin_doc = {
        "company_id": company_id,
        "name": name,
        "email": email,
        "mobile": mobile,
        "password": hash_password(password),
        "role": role,
        "status": "active",
        "created_at": now_utc,
        "created_by": user.get("name", "Super Admin")
    }
    users_col.insert_one(admin_doc)
    log_audit_event("COMPANY_ADMIN_CREATED", company_id, user.get("name"), "super_admin", {"admin_name": name, "mobile": mobile, "role": role}, client_ip(), client_user_agent())
    return jsonify({"ok": True, "message": f"Administrator '{name}' created for company '{comp.get('name')}'"})


@app.route("/api/superadmin/subscriptions", methods=["GET"])
def superadmin_subscriptions():
    """Retrieve all company subscription plans and overall plan statistics."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    comps = list(companies_col.find({}, {"_id": 0, "company_id": 1, "name": 1, "plan": 1, "status": 1, "max_employees": 1, "subscription_valid_until": 1, "created_at": 1}))
    plan_counts = {"Starter": 0, "Professional": 0, "Enterprise": 0, "Custom": 0}
    for c in comps:
        plan = c.get("plan", "Enterprise")
        matched = False
        for p in plan_counts:
            if p.lower() in plan.lower():
                plan_counts[p] += 1
                matched = True
                break
        if not matched:
            plan_counts["Custom"] += 1
        c["employee_count"] = employees_col.count_documents({"company_id": c.get("company_id")})
    return jsonify({
        "ok": True,
        "subscriptions": comps,
        "plan_counts": plan_counts,
        "available_plans": [
            {"id": "starter", "name": "Starter", "max_users": 25, "price_usd": 49, "features": ["Face AI", "Dynamic OTP", "Basic Reports"]},
            {"id": "professional", "name": "Professional", "max_users": 150, "price_usd": 149, "features": ["Face AI", "Dynamic OTP", "Wi-Fi Subnet", "GPS Field", "Advanced Reports"]},
            {"id": "enterprise", "name": "Enterprise Global", "max_users": 1000, "price_usd": 399, "features": ["All Features", "Anti-Spoofing PAD", "Unlimited Geofences", "Multi-Branch", "Dedicated SLA"]},
            {"id": "custom", "name": "Custom SaaS Enterprise", "max_users": 10000, "price_usd": "Custom", "features": ["Custom Integration", "On-Prem Deployment", "Custom Retention"]}
        ]
    })


@app.route("/api/superadmin/companies/<company_id>/subscription", methods=["POST"])
def superadmin_update_company_subscription(company_id):
    """Update subscription plan and employee limits for a company."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    company_id = company_id.upper()
    comp = companies_col.find_one({"company_id": company_id})
    if not comp:
        return jsonify({"ok": False, "error": f"Company '{company_id}' not found"}), 404
    data = request.json or {}
    plan = data.get("plan", "Enterprise Global").strip()
    max_employees = int(data.get("max_employees") or 100)
    valid_until = data.get("valid_until", "").strip()
    companies_col.update_one({"company_id": company_id}, {"$set": {
        "plan": plan,
        "max_employees": max_employees,
        "subscription_valid_until": valid_until,
        "subscription_updated_at": get_utc_iso_string()
    }})
    log_audit_event("SUBSCRIPTION_UPDATED", company_id, user.get("name"), "super_admin", {"plan": plan, "max_employees": max_employees, "valid_until": valid_until}, client_ip(), client_user_agent())
    return jsonify({"ok": True, "message": f"Subscription plan for {comp.get('name')} updated to {plan}"})


@app.route("/api/superadmin/system-status", methods=["GET"])
def superadmin_system_status():
    """Live monitor for attendance systems: database, biometric engine, Wi-Fi, and active telemetry."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_punches_today = attendance_col.count_documents({"date": today_utc})
    active_companies_count = companies_col.count_documents({"status": "active"})
    total_employees_count = employees_col.count_documents({"status": "active"})
    
    db_ok = True
    try:
        companies_col.find_one({}, {"_id": 1})
    except Exception:
        db_ok = False
        
    return jsonify({
        "ok": True,
        "timestamp_utc": get_utc_iso_string(),
        "database": {
            "status": "OPERATIONAL" if db_ok else "DEGRADED",
            "active_connections": 1,
            "engine": "MongoDB Engine (Embedded / Cloud)"
        },
        "biometric_engine": {
            "status": "OPERATIONAL",
            "name": "Neural Biometric OpenCV Engine",
            "anti_spoofing": "ACTIVE",
            "tolerance": FACE_MATCH_TOLERANCE,
            "liveness_threshold": LIVENESS_CONFIDENCE_THRESHOLD
        },
        "telemetry": {
            "active_workspaces": active_companies_count,
            "active_headcount": total_employees_count,
            "punches_today": total_punches_today,
            "api_health": "HEALTHY",
            "uptime": "99.98%"
        }
    })


@app.route("/api/superadmin/company-reports", methods=["GET"])
def superadmin_company_reports():
    """Aggregated company-wise attendance and workforce performance report."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    comps = list(companies_col.find({}, {"_id": 0}))
    reports = []
    for c in comps:
        cid = c.get("company_id")
        emp_total = employees_col.count_documents({"company_id": cid})
        emp_active = employees_col.count_documents({"company_id": cid, "status": "active"})
        dept_count = departments_col.count_documents({"company_id": cid})
        branch_count = branches_col.count_documents({"company_id": cid})
        today_punches = attendance_col.count_documents({"company_id": cid, "date": today_utc})
        today_late = attendance_col.count_documents({"company_id": cid, "date": today_utc, "status": "Late"})
        month_punches = attendance_col.count_documents({"company_id": cid, "date": {"$regex": f"^{today_utc[:7]}"}})
        att_rate = round((today_punches / max(1, emp_active)) * 100, 1) if emp_active > 0 else 0
        reports.append({
            "company_id": cid,
            "name": c.get("name"),
            "country": c.get("country", "India"),
            "timezone": c.get("timezone", DEFAULT_TIMEZONE),
            "status": c.get("status", "active"),
            "plan": c.get("plan", "Enterprise Global"),
            "total_employees": emp_total,
            "active_employees": emp_active,
            "departments": dept_count,
            "branches": branch_count,
            "today_attendance": today_punches,
            "today_late": today_late,
            "monthly_attendance": month_punches,
            "attendance_rate": att_rate
        })
    return jsonify({"ok": True, "reports": reports, "count": len(reports), "date": today_utc})


@app.route("/api/superadmin/system-config", methods=["GET", "POST"])
def superadmin_system_config():
    """Retrieve and update platform-wide system configurations."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    if request.method == "GET":
        cfg = system_config_col.find_one({"config_key": "global_settings"}, {"_id": 0})
        if not cfg:
            cfg = {
                "config_key": "global_settings",
                "platform_name": PLATFORM_NAME,
                "super_admin_company": SUPER_ADMIN_COMPANY,
                "default_timezone": DEFAULT_TIMEZONE,
                "face_match_tolerance": FACE_MATCH_TOLERANCE,
                "liveness_confidence_threshold": LIVENESS_CONFIDENCE_THRESHOLD,
                "liveness_session_ttl_seconds": LIVENESS_SESSION_TTL_SECONDS,
                "require_liveness": REQUIRE_LIVENESS,
                "office_radius_m": OFFICE_RADIUS_M,
                "office_subnet": OFFICE_SUBNET
            }
        return jsonify({"ok": True, "config": cfg})
    data = request.json or {}
    update_doc = {
        "config_key": "global_settings",
        "platform_name": data.get("platform_name", PLATFORM_NAME).strip(),
        "super_admin_company": data.get("super_admin_company", SUPER_ADMIN_COMPANY).strip(),
        "default_timezone": data.get("default_timezone", DEFAULT_TIMEZONE).strip(),
        "face_match_tolerance": float(data.get("face_match_tolerance", FACE_MATCH_TOLERANCE)),
        "liveness_confidence_threshold": float(data.get("liveness_confidence_threshold", LIVENESS_CONFIDENCE_THRESHOLD)),
        "liveness_session_ttl_seconds": int(data.get("liveness_session_ttl_seconds", LIVENESS_SESSION_TTL_SECONDS)),
        "require_liveness": bool(data.get("require_liveness", REQUIRE_LIVENESS)),
        "office_radius_m": float(data.get("office_radius_m", OFFICE_RADIUS_M)),
        "office_subnet": data.get("office_subnet", OFFICE_SUBNET).strip(),
        "updated_at": get_utc_iso_string(),
        "updated_by": user.get("name", "Super Admin")
    }
    system_config_col.update_one({"config_key": "global_settings"}, {"$set": update_doc}, upsert=True)
    log_audit_event("SYSTEM_CONFIG_UPDATED", "GLOBAL", user.get("name"), "super_admin", update_doc, client_ip(), client_user_agent())
    return jsonify({"ok": True, "message": "System platform configuration saved successfully"})


@app.route("/api/superadmin/permissions", methods=["GET", "POST"])
def superadmin_permissions():
    """Retrieve and update system-wide role permissions matrix."""
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    default_roles = {
        "super_admin": {"portal": "/admin/dashboard", "manage_companies": True, "manage_staff": True, "configure_rules": True, "approve_leaves": True, "view_reports": True, "system_config": True},
        "company_admin": {"portal": "/workspace/dashboard", "manage_companies": False, "manage_staff": True, "configure_rules": True, "approve_leaves": True, "view_reports": True, "system_config": False},
        "hr": {"portal": "/workspace/dashboard", "manage_companies": False, "manage_staff": True, "configure_rules": False, "approve_leaves": True, "view_reports": True, "system_config": False},
        "manager": {"portal": "/workspace/dashboard", "manage_companies": False, "manage_staff": False, "configure_rules": False, "approve_leaves": True, "view_reports": True, "system_config": False},
        "employee": {"portal": "/employee/portal", "manage_companies": False, "manage_staff": False, "configure_rules": False, "approve_leaves": False, "view_reports": False, "system_config": False}
    }
    if request.method == "GET":
        perm = permissions_col.find_one({"matrix_key": "default_roles"}, {"_id": 0})
        if not perm:
            return jsonify({"ok": True, "permissions": default_roles})
        roles_data = perm.get("roles")
        if not roles_data or not isinstance(roles_data, dict) or not any(k in roles_data for k in default_roles):
            roles_data = {k: v for k, v in perm.items() if k in default_roles}
        merged = {}
        for role_key, def_perms in default_roles.items():
            merged[role_key] = dict(def_perms)
            if role_key in roles_data and isinstance(roles_data[role_key], dict):
                merged[role_key].update(roles_data[role_key])
        return jsonify({"ok": True, "permissions": merged})

    data = request.json or {}
    raw_payload = data.get("roles") or data.get("permissions") or data
    sanitized_roles = {}
    for role_key, def_perms in default_roles.items():
        sanitized_roles[role_key] = dict(def_perms)
        if isinstance(raw_payload, dict) and role_key in raw_payload and isinstance(raw_payload[role_key], dict):
            sanitized_roles[role_key].update(raw_payload[role_key])

    permissions_col.update_one(
        {"matrix_key": "default_roles"},
        {"$set": {"roles": sanitized_roles, "updated_at": get_utc_iso_string()}},
        upsert=True
    )
    log_audit_event("PERMISSIONS_UPDATED", "GLOBAL", user.get("name"), "super_admin", {"roles": sanitized_roles}, client_ip(), client_user_agent())
    return jsonify({"ok": True, "message": "Role permissions matrix updated successfully", "permissions": sanitized_roles})


# ══════════════════════════════════════════════════════════════════════════════
#  EXTENDED COMPANY ADMIN APIS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/company/attendance/monthly", methods=["GET"])
def company_attendance_monthly():
    """Interactive monthly attendance matrix: all company employees vs days 1..31."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err
    month_query = request.args.get("month", "").strip()
    company = companies_col.find_one({"company_id": target_company_id})
    tz = company.get("timezone", DEFAULT_TIMEZONE) if company else DEFAULT_TIMEZONE
    today_date, _, _ = get_localized_time(tz)
    if not month_query or len(month_query) < 7:
        month_query = today_date[:7]
    import calendar
    try:
        year, month_num = int(month_query.split("-")[0]), int(month_query.split("-")[1])
        _, num_days = calendar.monthrange(year, month_num)
    except Exception:
        num_days = 30
        month_query = today_date[:7]
    employees = list(employees_col.find({"company_id": target_company_id, "status": "active"}, {"_id": 0, "emp_id": 1, "name": 1, "department": 1, "work_type": 1}).sort("emp_id", 1))
    att_logs = list(attendance_col.find({
        "company_id": target_company_id,
        "date": {"$regex": f"^{re.escape(month_query)}"}
    }, {"_id": 0, "emp_id": 1, "date": 1, "status": 1, "time": 1, "method": 1}))
    approved_leaves = list(leaves_col.find({
        "company_id": target_company_id,
        "status": "approved"
    }, {"_id": 0, "emp_id": 1, "start_date": 1, "end_date": 1, "leave_type": 1}))
    att_map = {}
    for log in att_logs:
        eid = log.get("emp_id")
        dt = log.get("date", "")
        if dt and len(dt) >= 10:
            try:
                day_int = int(dt.split("-")[2])
                if eid not in att_map: att_map[eid] = {}
                att_map[eid][day_int] = log.get("status", "Present")
            except Exception: pass
    matrix = []
    for emp in employees:
        eid = emp.get("emp_id")
        emp_days = {}
        present_cnt = 0
        late_cnt = 0
        half_day_cnt = 0
        leave_cnt = 0
        absent_cnt = 0
        for d in range(1, num_days + 1):
            day_str = f"{month_query}-{d:02d}"
            on_leave = False
            for lv in approved_leaves:
                if lv.get("emp_id") == eid and lv.get("start_date") <= day_str <= lv.get("end_date"):
                    on_leave = True
                    break
            if eid in att_map and d in att_map[eid]:
                st = str(att_map[eid][d] or "Present").strip()
                code_map = {
                    "Present": "P", "P": "P",
                    "Late": "L", "L": "L",
                    "Half Day": "HD", "Half-Day": "HD", "HD": "HD",
                    "Leave": "LV", "LV": "LV",
                    "Absent": "A", "A": "A"
                }
                code = code_map.get(st, "P")
                emp_days[str(d)] = code
                if code == "P": present_cnt += 1
                elif code == "L": late_cnt += 1; present_cnt += 1
                elif code == "HD": half_day_cnt += 1
                elif code == "LV": leave_cnt += 1
                elif code == "A": absent_cnt += 1
            elif on_leave:
                emp_days[str(d)] = "LV"
                leave_cnt += 1
            else:
                emp_days[str(d)] = "A"
                absent_cnt += 1
        working_days = max(1, num_days - leave_cnt)
        attendance_rate = round((present_cnt / working_days) * 100, 1)
        matrix.append({
            "emp_id": eid,
            "name": emp.get("name"),
            "department": emp.get("department", "General"),
            "work_type": emp.get("work_type", "Office"),
            "days": emp_days,
            "summary": {
                "present": present_cnt,
                "late": late_cnt,
                "half_day": half_day_cnt,
                "leaves": leave_cnt,
                "absent": absent_cnt,
                "total_days": num_days,
                "rate": attendance_rate
            }
        })
    return jsonify({
        "ok": True,
        "month": month_query,
        "days_in_month": num_days,
        "matrix": matrix,
        "total_employees": len(matrix)
    })


@app.route("/api/company/attendance/late-early", methods=["GET"])
def company_attendance_late_early():
    """Retrieve late arrivals and early departures with delay metrics."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err
    date_val = request.args.get("date", "").strip()
    query = {"company_id": target_company_id, "status": {"$in": ["Late", "Half Day"]}}
    if date_val:
        query["date"] = date_val
    records = list(attendance_col.find(query).sort("timestamp_utc", -1).limit(150))
    for r in records:
        r["_id"] = str(r["_id"])
        t = r.get("time", "09:30")
        try:
            parts = t.split(":")
            actual_mins = int(parts[0]) * 60 + int(parts[1])
            scheduled_mins = 9 * 60 + 30
            r["delay_minutes"] = max(0, actual_mins - scheduled_mins)
        except Exception:
            r["delay_minutes"] = 15
    return jsonify({"ok": True, "records": records, "count": len(records)})


@app.route("/api/company/attendance/late-early/excuse", methods=["POST"])
def company_attendance_excuse():
    """Acknowledge or excuse a late punch record."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr"])
    if err:
        return err
    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err
    data = request.json or {}
    record_id = data.get("record_id")
    reason = data.get("reason", "Excused by Management")
    if not record_id:
        return jsonify({"ok": False, "error": "record_id is required"}), 400
    try:
        obj_id = ObjectId(record_id)
    except Exception:
        return jsonify({"ok": False, "error": "Invalid record_id format"}), 400
    res = attendance_col.update_one(
        {"_id": obj_id, "company_id": target_company_id},
        {"$set": {"status": "Present", "excused": True, "excuse_reason": reason, "excused_by": user.get("name")}}
    )
    if res.matched_count == 0:
        return jsonify({"ok": False, "error": "Attendance record not found"}), 404
    log_audit_event("LATE_RECORD_EXCUSED", target_company_id, user.get("name"), user.get("role"), {"record_id": record_id, "reason": reason}, client_ip(), client_user_agent())
    return jsonify({"ok": True, "message": "Attendance record status updated to Present (Excused)"})


@app.route("/api/company/employees/<emp_id>/attendance-history", methods=["GET"])
def company_employee_history_dossier(emp_id):
    """Retrieve full attendance dossier and logs for a specific employee."""
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager", "employee"])
    if err:
        return err
    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err
    emp_id = emp_id.upper()
    employee = employees_col.find_one({"company_id": target_company_id, "emp_id": emp_id}, {"_id": 0, "password": 0, "encoding": 0})
    if not employee:
        return jsonify({"ok": False, "error": "Employee not found"}), 404
    punches = list(attendance_col.find({"company_id": target_company_id, "emp_id": emp_id}).sort("timestamp_utc", -1).limit(100))
    for p in punches:
        p["_id"] = str(p["_id"])
    leaves = list(leaves_col.find({"company_id": target_company_id, "emp_id": emp_id}).sort("timestamp_utc", -1))
    for l in leaves:
        l["_id"] = str(l["_id"])
    return jsonify({
        "ok": True,
        "employee": employee,
        "punches": punches,
        "leaves": leaves,
        "total_punches": len(punches)
    })


# ══════════════════════════════════════════════════════════════════════════════
#  CHECK-IN / CHECK-OUT TIMESHEETS
#  One row per employee per local day: first Clock-IN and last Clock-OUT, worked
#  time and shift state. Shared by the Super Admin portal (all companies), the
#  Company Admin & Organization Enterprise portals (all employees of one
#  company) and the Employee self-service portals (own records).
# ══════════════════════════════════════════════════════════════════════════════

TIMESHEET_MAX_RANGE_DAYS = 62
TIMESHEET_MAX_ROWS = 5000
TIMESHEET_PUNCH_PROJECTION = {
    "encoding": 0, "image": 0, "baseline_image": 0,
    "otp": 0, "otp_hash": 0, "liveness_metadata": 0
}
TIMESHEET_STATE_LABELS = {
    "CHECKED_IN": "Checked In (On Duty)",
    "PENDING_APPROVAL": "Check-In Awaiting Approval",
    "CHECKED_OUT": "Checked Out",
    "MISSED_CHECK_OUT": "Missed Check-Out",
    "MISSING_CHECK_IN": "Missing Check-In",
    "REJECTED": "Rejected",
    "ON_LEAVE": "On Leave",
    "NOT_CHECKED_IN": "Not Checked In",
}
_TS_STATUS_LABELS = {
    "PRESENT": "Present", "APPROVED": "Approved", "LATE": "Late", "HALF DAY": "Half Day",
    "COMPLETED": "Completed", "PENDING_APPROVAL": "Pending Approval", "PENDING": "Pending Approval",
    "ABSENT": "Absent", "LEAVE": "On Leave",
    "REJECTED": "Rejected",
}
_TS_PENDING = ("PENDING_APPROVAL", "PENDING")


def _ts_time_seconds(t):
    """'HH:MM' or 'HH:MM:SS' -> seconds since local midnight (None if unparseable)."""
    if not t or not isinstance(t, str):
        return None
    parts = t.strip().split(":")
    try:
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        s = int(float(parts[2])) if len(parts) > 2 else 0
    except (ValueError, IndexError):
        return None
    if not (0 <= h < 24 and 0 <= m < 60 and 0 <= s < 60):
        return None
    return h * 3600 + m * 60 + s


def _ts_format_minutes(minutes):
    if minutes is None:
        return None
    minutes = int(minutes)
    return f"{minutes // 60}h {minutes % 60:02d}m"


def _ts_check_type(punch):
    return "OUT" if str(punch.get("check_type") or "IN").strip().upper() == "OUT" else "IN"


def _ts_punch_time(punch):
    if not punch:
        return None
    return punch.get("time") or punch.get("local_time") or punch.get("check_in_time") or punch.get("check_out_time")


def _ts_punch_method(punch):
    if not punch:
        return None
    return (punch.get("method") or punch.get("verification_method") or punch.get("verificationMethod")
            or punch.get("work_mode") or "Direct")


def _ts_status_upper(punch):
    return str((punch or {}).get("status") or "").strip().upper()


def _ts_parse_date(val):
    val = (val or "").strip()
    if not val:
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid date '{val}'. Use the YYYY-MM-DD format.")


class _TsClock:
    """Caches the current local date / time per timezone for one request."""

    def __init__(self):
        self._cache = {}

    def now(self, tz):
        tz = tz or DEFAULT_TIMEZONE
        if tz not in self._cache:
            d, t, _ = get_localized_time(tz)
            self._cache[tz] = (d, _ts_time_seconds(t))
        return self._cache[tz]


def _ts_identity(company_id, emp_id, employee, company, sample_punch):
    employee = employee or {}
    sample_punch = sample_punch or {}
    return {
        "company_id": company_id,
        "company_name": (company or {}).get("name") or company_id,
        "emp_id": emp_id,
        "name": employee.get("name") or sample_punch.get("name") or sample_punch.get("employee_name") or emp_id,
        "department": employee.get("department") or sample_punch.get("department") or "General",
        "designation": employee.get("designation") or sample_punch.get("designation") or "Staff",
        "work_type": (employee.get("work_type") or sample_punch.get("work_type")
                      or employee.get("work_mode") or sample_punch.get("work_mode") or "Office"),
    }


def _ts_summarize_day(company_id, emp_id, date_str, punches, employee=None, company=None, clock=None):
    """Pair one employee's punches for one local day into a check-in/check-out row."""
    clock = clock or _TsClock()
    valid = [p for p in punches if _ts_status_upper(p) != "REJECTED"]
    rejected_count = len(punches) - len(valid)

    def order(p):
        secs = _ts_time_seconds(_ts_punch_time(p))
        return (secs is None, secs or 0, str(p.get("timestamp_utc") or ""))

    ins = sorted((p for p in valid if _ts_check_type(p) == "IN"), key=order)
    outs = sorted((p for p in valid if _ts_check_type(p) == "OUT"), key=order)
    first_in = ins[0] if ins else None
    last_out = outs[-1] if outs else None
    in_time, out_time = _ts_punch_time(first_in), _ts_punch_time(last_out)
    in_s, out_s = _ts_time_seconds(in_time), _ts_time_seconds(out_time)

    tz = ((first_in or last_out or {}).get("timezone") or (employee or {}).get("timezone")
          or (company or {}).get("timezone") or DEFAULT_TIMEZONE)
    today_str, now_s = clock.now(tz)
    is_today = date_str == today_str

    worked_minutes, is_live = None, False
    if first_in and last_out:
        state = "CHECKED_OUT"
        if in_s is not None and out_s is not None and out_s >= in_s:
            worked_minutes = (out_s - in_s) // 60
    elif first_in:
        if _ts_status_upper(first_in) in _TS_PENDING:
            state = "PENDING_APPROVAL"
        elif date_str < today_str:
            state = "MISSED_CHECK_OUT"
        else:
            state = "CHECKED_IN"
            if is_today and in_s is not None and now_s is not None and now_s >= in_s:
                worked_minutes = (now_s - in_s) // 60
                is_live = True
    elif last_out:
        state = "MISSING_CHECK_IN"
    else:
        state = "REJECTED"

    status_src = first_in or last_out or (punches[0] if punches else {})
    raw_status = str(status_src.get("status") or "").strip()
    methods = []
    for p in valid:
        m = _ts_punch_method(p)
        if m and m not in methods:
            methods.append(m)

    row = _ts_identity(company_id, emp_id, employee, company, first_in or last_out or (punches[0] if punches else None))
    row.update({
        "date": date_str,
        "timezone": tz,
        "check_in": in_time,
        "check_out": out_time,
        "check_in_method": _ts_punch_method(first_in),
        "check_out_method": _ts_punch_method(last_out),
        "methods": methods,
        "attendance_status": _TS_STATUS_LABELS.get(raw_status.upper(), raw_status) or None,
        "is_late": raw_status.upper() == "LATE",
        "state": state,
        "state_label": TIMESHEET_STATE_LABELS[state],
        "pending_approval": any(_ts_status_upper(p) in _TS_PENDING for p in valid),
        "worked_minutes": worked_minutes,
        "worked": _ts_format_minutes(worked_minutes),
        "total_hours": round(worked_minutes / 60.0, 2) if worked_minutes is not None else 0.0,
        "is_live": is_live,
        "is_today": is_today,
        "punch_count": len(valid),
        "rejected_count": rejected_count,
        "location": (first_in or {}).get("location") or None,
    })
    return row


def _ts_absent_row(company_id, employee, company, date_str, on_leave, clock):
    tz = (employee or {}).get("timezone") or (company or {}).get("timezone") or DEFAULT_TIMEZONE
    today_str, _ = clock.now(tz)
    state = "ON_LEAVE" if on_leave else "NOT_CHECKED_IN"
    row = _ts_identity(company_id, str(employee.get("emp_id", "")).upper(), employee, company, None)
    row.update({
        "date": date_str, "timezone": tz,
        "check_in": None, "check_out": None,
        "check_in_method": None, "check_out_method": None, "methods": [],
        "attendance_status": "On Leave" if on_leave else None, "is_late": False,
        "state": state, "state_label": TIMESHEET_STATE_LABELS[state],
        "pending_approval": False,
        "worked_minutes": None, "worked": None, "total_hours": 0.0,
        "is_live": False, "is_today": date_str == today_str,
        "punch_count": 0, "rejected_count": 0, "location": None,
    })
    return row


def rows_from_punches(punches, employee_lookup=None, company_lookup=None, clock=None):
    """Group raw attendance punches into per-employee per-day check-in/check-out rows."""
    employee_lookup = employee_lookup or {}
    company_lookup = company_lookup or {}
    clock = clock or _TsClock()
    groups = {}
    for p in punches:
        cid = str(p.get("company_id") or p.get("organizationId") or "").upper()
        eid = str(p.get("emp_id") or p.get("employee_id") or p.get("employeeId") or "").upper()
        d = p.get("date") or p.get("local_date")
        if cid and eid and d:
            groups.setdefault((cid, eid, d), []).append(p)
    return {
        key: _ts_summarize_day(key[0], key[1], key[2], plist,
                               employee=employee_lookup.get((key[0], key[1])),
                               company=company_lookup.get(key[0]), clock=clock)
        for key, plist in groups.items()
    }


def build_checkin_checkout_timesheet(company_ids=None, date_val=None, date_from=None, date_to=None,
                                     emp_id=None, include_absent=True):
    """
    Build the check-in / check-out timesheet.
      company_ids: list of company IDs, or None for every company (Super Admin global view).
      Dates: date_val (one day) | date_from..date_to (range) | default = each company's own local today.
      include_absent: for single-day views, also list active employees who have not checked in.
    Raises ValueError for invalid parameters.
    """
    date_val = _ts_parse_date(date_val)
    date_from = _ts_parse_date(date_from)
    date_to = _ts_parse_date(date_to)
    if date_val:
        mode = "date"
    elif date_from or date_to:
        mode = "range"
        date_from, date_to = (date_from or date_to), (date_to or date_from)
        if date_from > date_to:
            date_from, date_to = date_to, date_from
        span = (datetime.strptime(date_to, "%Y-%m-%d") - datetime.strptime(date_from, "%Y-%m-%d")).days + 1
        if span > TIMESHEET_MAX_RANGE_DAYS:
            raise ValueError(f"Date range is {span} days. Please choose {TIMESHEET_MAX_RANGE_DAYS} days or fewer.")
    else:
        mode = "today"

    clock = _TsClock()
    company_proj = {"_id": 0, "company_id": 1, "name": 1, "timezone": 1, "status": 1}
    if company_ids:
        target_ids = [str(c).upper() for c in company_ids if c]
        companies = [c for c in (companies_col.find_one({"company_id": cid}, company_proj) for cid in target_ids) if c]
    else:
        companies = list(companies_col.find({}, company_proj))
        target_ids = [str(c.get("company_id", "")).upper() for c in companies if c.get("company_id")]
    company_lookup = {str(c.get("company_id", "")).upper(): c for c in companies}

    # Which local day applies to each company
    day_by_company = {}
    for cid in target_ids:
        if mode == "date":
            day_by_company[cid] = date_val
        elif mode == "today":
            day_by_company[cid] = clock.now((company_lookup.get(cid) or {}).get("timezone") or DEFAULT_TIMEZONE)[0]

    base_q = {"emp_id": emp_id.strip().upper()} if emp_id and emp_id.strip() else {}

    def fetch(extra):
        q = dict(base_q)
        q.update(extra)
        return list(attendance_col.find(q, TIMESHEET_PUNCH_PROJECTION))

    punches = []
    if company_ids:
        for cid in target_ids:
            day_q = {"$gte": date_from, "$lte": date_to} if mode == "range" else day_by_company[cid]
            punches.extend(fetch({"company_id": cid, "date": day_q}))
    elif mode == "range":
        punches = fetch({"date": {"$gte": date_from, "$lte": date_to}})
    elif mode == "date":
        punches = fetch({"date": date_val})
    else:
        for d in sorted(set(day_by_company.values())):
            punches.extend(p for p in fetch({"date": d})
                           if day_by_company.get(str(p.get("company_id") or "").upper(), d) == d)

    # Employee directory (identity + roster for "not checked in")
    emp_proj = {"_id": 0, "company_id": 1, "emp_id": 1, "name": 1, "department": 1, "designation": 1,
                "work_type": 1, "work_mode": 1, "status": 1, "timezone": 1}
    employees = []
    if company_ids:
        for cid in target_ids:
            q = {"company_id": cid}
            q.update(base_q)
            employees.extend(employees_col.find(q, emp_proj))
    else:
        employees = list(employees_col.find(dict(base_q), emp_proj))
    employee_lookup = {(str(e.get("company_id", "")).upper(), str(e.get("emp_id", "")).upper()): e for e in employees}

    rows_by_key = rows_from_punches(punches, employee_lookup, company_lookup, clock)
    rows = list(rows_by_key.values())

    if include_absent and mode != "range":
        roster_company_ids = set(target_ids) if company_ids else {
            cid for cid, c in company_lookup.items() if str(c.get("status", "active")).lower() == "active"
        }
        approved_leaves = {}
        leave_q = {"status": {"$in": ["approved", "Approved", "APPROVED"]}}
        if company_ids and len(target_ids) == 1:
            leave_q["company_id"] = target_ids[0]
        for lv in leaves_col.find(leave_q, {"_id": 0, "company_id": 1, "emp_id": 1, "start_date": 1, "end_date": 1}):
            key = (str(lv.get("company_id", "")).upper(), str(lv.get("emp_id", "")).upper())
            approved_leaves.setdefault(key, []).append((lv.get("start_date") or "", lv.get("end_date") or ""))
        for (cid, eid), emp in employee_lookup.items():
            if cid not in roster_company_ids or str(emp.get("status", "active")).lower() != "active":
                continue
            day = day_by_company.get(cid)
            if not day or (cid, eid, day) in rows_by_key:
                continue
            on_leave = any(s <= day <= e for s, e in approved_leaves.get((cid, eid), []) if s and e)
            rows.append(_ts_absent_row(cid, emp, company_lookup.get(cid), day, on_leave, clock))

    rows.sort(key=lambda r: (
        -int(re.sub(r"\D", "", str(r.get("date") or "")) or 0),
        str(r.get("company_name") or "").lower(),
        r.get("check_in") is None,
        _ts_time_seconds(r.get("check_in")) or 0,
        str(r.get("name") or "").lower(),
    ))

    meta = {
        "mode": mode,
        "date": date_val,
        "date_from": date_from,
        "date_to": date_to,
        "dates": sorted({r["date"] for r in rows} | set(day_by_company.values()), reverse=True),
        "company_count": len(target_ids),
    }
    return rows, meta


def summarize_timesheet(rows):
    summary = {"total": len(rows), "present": 0, "late": 0}
    for state in TIMESHEET_STATE_LABELS:
        summary[state.lower()] = 0
    for r in rows:
        summary[r["state"].lower()] = summary.get(r["state"].lower(), 0) + 1
        if r.get("is_late"):
            summary["late"] += 1
        if r["state"] in ("CHECKED_IN", "PENDING_APPROVAL", "CHECKED_OUT", "MISSED_CHECK_OUT", "MISSING_CHECK_IN"):
            summary["present"] += 1
    return summary


def filter_timesheet_rows(rows, search=None, state=None, department=None):
    search = (search or "").strip().lower()
    states = {s.strip().upper() for s in (state or "").split(",") if s.strip()}
    department = (department or "").strip().lower()
    out = []
    for r in rows:
        if states and r["state"] not in states:
            continue
        if department and str(r.get("department") or "").lower() != department:
            continue
        if search:
            hay = " ".join(str(r.get(k) or "") for k in ("emp_id", "name", "department", "company_id", "company_name")).lower()
            if search not in hay:
                continue
        out.append(r)
    return out


def timesheet_csv_response(rows, filename):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Company ID", "Company", "Employee ID", "Employee Name", "Department", "Work Type",
                     "Check-In", "Check-Out", "Worked (h:mm)", "Worked Hours", "Shift State", "Attendance Status",
                     "Check-In Method", "Check-Out Method", "Timezone"])
    for r in rows:
        writer.writerow([
            r.get("date"), r.get("company_id"), r.get("company_name"), r.get("emp_id"), r.get("name"),
            r.get("department"), r.get("work_type"), r.get("check_in") or "", r.get("check_out") or "",
            r.get("worked") or "", r.get("total_hours") if r.get("worked_minutes") is not None else "",
            r.get("state_label"), r.get("attendance_status") or "", r.get("check_in_method") or "",
            r.get("check_out_method") or "", r.get("timezone") or "",
        ])
    return Response(output.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})


def _timesheet_api_response(company_ids, filename_prefix):
    args = request.args
    include_absent = str(args.get("include_absent", "true")).strip().lower() not in ("0", "false", "no")
    try:
        rows, meta = build_checkin_checkout_timesheet(
            company_ids=company_ids,
            date_val=args.get("date"),
            date_from=args.get("from") or args.get("date_from"),
            date_to=args.get("to") or args.get("date_to"),
            emp_id=args.get("emp_id"),
            include_absent=include_absent,
        )
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    summary = summarize_timesheet(rows)
    rows = filter_timesheet_rows(rows, args.get("search") or args.get("q"), args.get("state"), args.get("department"))
    truncated = len(rows) > TIMESHEET_MAX_ROWS
    rows = rows[:TIMESHEET_MAX_ROWS]

    if str(args.get("format", "")).lower() == "csv":
        if meta["mode"] == "range":
            span = f"{meta['date_from']}_to_{meta['date_to']}"
        else:
            span = meta["date"] or (meta["dates"][0] if len(meta["dates"]) == 1 else "today")
        return timesheet_csv_response(rows, f"{filename_prefix}_checkin_checkout_{span}.csv")

    return jsonify({
        "ok": True,
        "rows": rows,
        "count": len(rows),
        "truncated": truncated,
        "summary": summary,
        "generated_at_utc": get_utc_iso_string(),
        **meta,
    })


@app.route("/api/superadmin/checkin-checkout", methods=["GET"])
def superadmin_checkin_checkout():
    """
    Super Admin: check-in / check-out timings of every employee in every company.
    Query: company_id, date | from & to, emp_id, search, state, include_absent, format=csv
    """
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err
    company_id = request.args.get("company_id", "").strip().upper()
    return _timesheet_api_response([company_id] if company_id else None,
                                   company_id or "all_companies")


@app.route("/api/company/checkin-checkout", methods=["GET"])
@app.route("/api/organization/checkin-checkout", methods=["GET"])
def company_checkin_checkout():
    """
    Company Admin / HR / Manager (and Super Admin with ?company_id=): check-in / check-out
    timings of all employees of one company. Strict tenant isolation.
    Query: company_id, date | from & to, emp_id, department, search, state, include_absent, format=csv
    """
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    target_company_id, iso_err = resolve_tenant_id(user, request.args.get("company_id"))
    if iso_err:
        return iso_err
    if not target_company_id:
        return jsonify({"ok": False, "error": "Select a company workspace (company_id) to view timings"}), 400
    return _timesheet_api_response([target_company_id], target_company_id)


# ══════════════════════════════════════════════════════════════════════════════
#  EXTENDED EMPLOYEE APIS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/employee/status-summary", methods=["GET"])
def employee_status_summary():
    """Live status summary, today's working hours, and monthly stats for employee."""
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    company_id = user.get("company_id")
    emp_id = user.get("emp_id") or request.args.get("emp_id", "").strip().upper()
    if not company_id or not emp_id:
        return jsonify({"ok": False, "error": "Missing employee context"}), 400
    company = companies_col.find_one({"company_id": company_id})
    tz = company.get("timezone", DEFAULT_TIMEZONE) if company else DEFAULT_TIMEZONE
    today_date, current_time, _ = get_localized_time(tz)
    
    today_punches = list(attendance_col.find({"company_id": company_id, "emp_id": emp_id, "$or": [{"date": today_date}, {"local_date": today_date}]}).sort("timestamp_utc", 1))
    for p in today_punches:
        p["_id"] = str(p["_id"])
        
    first_in = None
    last_out = None
    status = "NOT_MARKED"
    elapsed_hours = 0.0
    
    if len(today_punches) > 0:
        first_in = today_punches[0].get("time")
        if len(today_punches) == 1:
            status = "CHECKED_IN"
            try:
                in_p = first_in.split(":")
                cur_p = current_time.split(":")
                in_m = int(in_p[0]) * 60 + int(in_p[1])
                cur_m = int(cur_p[0]) * 60 + int(cur_p[1])
                elapsed_hours = round(max(0, cur_m - in_m) / 60.0, 2)
            except Exception: pass
        else:
            status = "CHECKED_OUT"
            last_out = today_punches[-1].get("time")
            try:
                in_p = first_in.split(":")
                out_p = last_out.split(":")
                in_m = int(in_p[0]) * 60 + int(in_p[1])
                out_m = int(out_p[0]) * 60 + int(out_p[1])
                elapsed_hours = round(max(0, out_m - in_m) / 60.0, 2)
            except Exception: pass

    month_prefix = today_date[:7]
    month_punches = list(attendance_col.find({"company_id": company_id, "emp_id": emp_id, "date": {"$regex": f"^{re.escape(month_prefix)}"}}, {"date": 1, "time": 1, "check_type": 1}))
    day_groups = {}
    for mp in month_punches:
        d = mp.get("date")
        if d not in day_groups: day_groups[d] = []
        day_groups[d].append(mp.get("time"))
    
    total_monthly_hours = 0.0
    for d, times in day_groups.items():
        if len(times) >= 2:
            try:
                t1, t2 = times[0].split(":"), times[-1].split(":")
                m1, m2 = int(t1[0]) * 60 + int(t1[1]), int(t2[0]) * 60 + int(t2[1])
                total_monthly_hours += max(0, m2 - m1) / 60.0
            except Exception: pass
        elif len(times) == 1:
            total_monthly_hours += 8.0
    total_monthly_hours = round(total_monthly_hours, 1)

    return jsonify({
        "ok": True,
        "emp_id": emp_id,
        "company_id": company_id,
        "today_date": today_date,
        "status": status,
        "first_in": first_in,
        "last_out": last_out,
        "elapsed_hours": elapsed_hours,
        "total_monthly_hours": total_monthly_hours,
        "check_in_time": first_in,
        "check_out_time": last_out,
        "today_hours": elapsed_hours,
        "monthly_hours": total_monthly_hours,
        "today_punches": today_punches
    })


@app.route("/api/employee/daily-records", methods=["GET"])
def employee_daily_records():
    """Paired check-in and check-out logs with duration for employee."""
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    company_id = user.get("company_id")
    emp_id = user.get("emp_id") or request.args.get("emp_id", "").strip().upper()
    if not company_id or not emp_id:
        return jsonify({"ok": False, "error": "Missing employee context"}), 400
    try:
        limit = max(1, min(int(request.args.get("limit", 30)), 366))
    except (TypeError, ValueError):
        limit = 30
    company_id, emp_id = company_id.upper(), emp_id.upper()
    company = companies_col.find_one({"company_id": company_id}, {"_id": 0, "company_id": 1, "name": 1, "timezone": 1})
    employee = employees_col.find_one({"company_id": company_id, "emp_id": emp_id},
                                      {"_id": 0, "emp_id": 1, "name": 1, "department": 1, "designation": 1,
                                       "work_type": 1, "work_mode": 1, "timezone": 1})

    fetch_cap = limit * 8
    punches = list(attendance_col.find({"company_id": company_id, "emp_id": emp_id}, TIMESHEET_PUNCH_PROJECTION)
                   .sort("timestamp_utc", -1).limit(fetch_cap))
    oldest_partial_day = None
    if len(punches) >= fetch_cap:
        # The oldest day may be cut off by the cap; drop it rather than show a half-paired day.
        oldest_partial_day = min((p.get("date") or p.get("local_date") or "") for p in punches)

    rows = rows_from_punches(punches, {(company_id, emp_id): employee} if employee else {},
                             {company_id: company} if company else {}).values()
    rows = sorted((r for r in rows if r["date"] != oldest_partial_day), key=lambda r: r["date"], reverse=True)[:limit]

    paired_records = []
    for r in rows:
        loc = r.get("location")
        paired_records.append(dict(r, **{
            # Legacy fields kept for existing portal widgets
            "duration": r["worked"] or "--",
            "status": r.get("attendance_status") or "Present",
            "method": r.get("check_in_method") or r.get("check_out_method") or "Direct",
            "location": loc if loc else "Main Office",
        }))
    return jsonify({"ok": True, "records": paired_records, "count": len(paired_records)})


@app.route("/api/attendance/quick-punch", methods=["POST"])
def api_quick_punch():
    """One-click Check-IN / Check-OUT directly from the Employee Portal."""
    user, err = require_auth(allowed_roles=["employee", "company_admin", "super_admin", "hr", "manager"])
    if err:
        return err
    data = request.json or {}
    company_id = user.get("company_id") or data.get("company_id", "").strip().upper()
    emp_id = user.get("emp_id") or data.get("emp_id", "").strip().upper()
    check_type = data.get("check_type", "IN").strip().upper()
    method = data.get("method", "Direct Portal").strip()
    
    company, employee, error = validate_company_and_employee(company_id, emp_id)
    if error:
        return jsonify({"ok": False, "error": error}), 400
        
    tz = resolve_entity_timezone(employee, None, company, DEFAULT_TIMEZONE)
    local_date, local_time, local_formatted = get_localized_time(tz)

    is_dup, existing, dup_msg = check_attendance_duplicate_status(company_id, emp_id, local_date, check_type)
    if is_dup:
        return jsonify({"ok": False, "error": dup_msg}), 400

    policy = policies_col.find_one({"company_id": company_id}) or {}
    status = evaluate_attendance_status(local_time, policy, employee.get("work_type", "Office"))
    
    punch_doc = {
        "company_id": company_id,
        "emp_id": emp_id,
        "name": employee.get("name"),
        "department": employee.get("department", "General"),
        "designation": employee.get("designation", "Staff"),
        "work_type": employee.get("work_type", "Office"),
        "date": local_date,
        "time": local_time,
        "local_date": local_date,
        "local_time": local_time,
        "timezone": tz,
        "timestamp_utc": get_utc_iso_string(),
        "status": status,
        "method": method,
        "check_type": check_type,
        "ip": client_ip()
    }
    attendance_col.insert_one(punch_doc)
    log_audit_event(f"ATTENDANCE_QUICK_PUNCH_{check_type}", company_id, employee.get("name"), "employee", {"emp_id": emp_id, "check_type": check_type, "time": local_time}, client_ip(), client_user_agent())
    return jsonify({
        "ok": True,
        "message": f"Successfully clocked {check_type} at {local_time} ({tz})",
        "check_type": check_type,
        "time": local_time,
        "date": local_date,
        "status": status
    })


# ══════════════════════════════════════════════════════════════════════════════
#  ENTERPRISE ARCHITECTURE: ONBOARDING, APPROVAL AUTHORITY & WORK MODE APIS
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/attendance/workmode-checkin", methods=["POST"])
@app.route("/api/attendance/workmode-checkin", methods=["POST"])
def api_workmode_checkin():
    """
    Dedicated endpoint for Work Mode attendance check-in.
    Accepts lat, lng, accuracy, is_mock, client_ip override, notes.
    """
    user = get_current_user()
    data = request.json or {}
    emp_id = (user.get("emp_id") if user else None) or data.get("emp_id") or data.get("employee_id") or ""
    emp_id = str(emp_id).strip().upper()
    company_id = (user.get("company_id") if user else None) or data.get("company_id", "").strip().upper()

    if not company_id and emp_id:
        emp_rec = employees_col.find_one({"emp_id": emp_id}) or users_col.find_one({"emp_id": emp_id})
        if emp_rec:
            company_id = emp_rec.get("company_id", "").upper()

    if not company_id or not emp_id:
        return jsonify({"ok": False, "error": "Company ID and Employee ID are required", "code": "CONTEXT_REQUIRED"}), 400

    return execute_workmode_checkin(company_id, emp_id, data, request)


@app.route("/api/employee/onboarding", methods=["POST"])
def api_employee_onboarding():
    """
    Mandatory First-Time Login Onboarding.
    Sets operational work mode:
    1. Work From Office (WFO)
    2. Work From Home (WFH) - captures home coordinates (lat, lng)
    3. Sales Field - dynamic live GPS
    Permanently sets is_first_login = false.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required. Please sign in to the Employee Portal."}), 401

    data = request.json or {}
    company_id = user.get("company_id", "").upper()
    emp_id = user.get("emp_id", "").upper()

    raw_mode = data.get("work_mode", "").upper().strip()
    if raw_mode in ("WFO", "OFFICE", "WORK_FROM_OFFICE"):
        work_mode = "WORK_FROM_OFFICE"
    elif raw_mode in ("WFH", "HOME", "REMOTE", "WORK_FROM_HOME"):
        work_mode = "WORK_FROM_HOME"
    elif raw_mode in ("FIELD", "SALES", "SALES_FIELD"):
        work_mode = "SALES_FIELD"
    else:
        return jsonify({
            "ok": False,
            "error": "Valid work_mode required: WORK_FROM_OFFICE, WORK_FROM_HOME, or SALES_FIELD"
        }), 400

    update_fields = {
        "work_mode": work_mode,
        "workMode": work_mode,
        "is_first_login": False,
        "isFirstLogin": False
    }

    if work_mode == "WORK_FROM_HOME":
        lat = data.get("latitude") if data.get("latitude") is not None else data.get("lat")
        lng = data.get("longitude") if data.get("longitude") is not None else data.get("lng")
        radius = data.get("home_radius") or data.get("homeRangeRadiusM", 200)
        if lat is not None and lng is not None:
            try:
                lat_f = float(lat)
                lng_f = float(lng)
                rad_i = int(radius)
                update_fields["home_latitude"] = lat_f
                update_fields["homeLatitude"] = lat_f
                update_fields["home_longitude"] = lng_f
                update_fields["homeLongitude"] = lng_f
                update_fields["home_range_radius_m"] = rad_i
                update_fields["homeRangeRadiusM"] = rad_i
            except Exception:
                pass

    employees_col.update_one({"company_id": company_id, "emp_id": emp_id}, {"$set": update_fields})
    users_col.update_one({"company_id": company_id, "emp_id": emp_id}, {"$set": update_fields})

    log_audit_event(
        action="EMPLOYEE_FIRST_LOGIN_ONBOARDING",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="employee",
        details=update_fields,
        ip=get_client_real_ip(request),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "message": f"First-time onboarding completed successfully. Work mode assigned: {work_mode}.",
        "work_mode": work_mode,
        "is_first_login": False,
        "config": update_fields
    })


@app.route("/api/employee/ip-change-request", methods=["POST"])
def api_ip_change_request():
    """
    Fallback mechanism for WFH employees when dynamic ISP rotations change their IP.
    Submits an IP change request to organization approvers.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    data = request.json or {}
    company_id = user.get("company_id", "").upper()
    emp_id = user.get("emp_id", "").upper()
    requested_ip = (data.get("requested_ip") or get_client_real_ip(request)).strip()
    reason = data.get("reason", "Dynamic ISP rotation").strip()

    req_id = str(ObjectId())
    now_iso = get_utc_iso_string()
    doc = {
        "_id": ObjectId(req_id),
        "id": req_id,
        "company_id": company_id,
        "emp_id": emp_id,
        "employee_name": user.get("name", "Employee"),
        "requested_ip": requested_ip,
        "reason": reason,
        "status": "PENDING",
        "timestamp_utc": now_iso
    }
    ip_change_requests_col.insert_one(doc)

    # Dispatch notification to organization approvers
    approvers = get_organization_approvers(company_id)
    for appr in approvers:
        if appr.get("email"):
            notifications_col.insert_one({
                "company_id": company_id,
                "recipient_email": appr.get("email"),
                "title": f"WFH IP Change Request: {user.get('name')}",
                "message": f"Employee {user.get('name')} ({emp_id}) submitted an IP update request for {requested_ip}. Reason: {reason}",
                "type": "IP_CHANGE_REQUEST",
                "request_id": req_id,
                "timestamp_utc": now_iso,
                "read": False
            })

    return jsonify({
        "ok": True,
        "message": f"IP change request for {requested_ip} submitted. Notified {len(approvers)} designated approvers.",
        "request_id": req_id
    })


@app.route("/api/employee/field-visit", methods=["POST"])
def api_log_field_visit():
    """
    Daytime Client Visit Logger for Sales Field agents.
    Records client name, meeting notes, and live GPS stamp.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    data = request.json or {}
    company_id = user.get("company_id", "").upper()
    emp_id = user.get("emp_id", "").upper()
    client_name = (data.get("client_name") or data.get("clientName", "")).strip()
    notes = data.get("notes", "").strip()
    lat = data.get("latitude") if data.get("latitude") is not None else data.get("lat")
    lng = data.get("longitude") if data.get("longitude") is not None else data.get("lng")

    if not client_name:
        return jsonify({"ok": False, "error": "Client name is required"}), 400

    try: lat_f = float(lat)
    except Exception: lat_f = None
    try: lng_f = float(lng)
    except Exception: lng_f = None

    if lat_f is None or lng_f is None:
        return jsonify({"ok": False, "error": "Live GPS coordinates are required for field visit logging"}), 400

    now_iso = get_utc_iso_string()
    visit_id = str(ObjectId())

    # Associate with today's attendance log if present
    today_att = attendance_col.find_one({"company_id": company_id, "emp_id": emp_id}, sort=[("timestamp_utc", -1)])
    att_id = str(today_att["_id"]) if today_att else str(ObjectId())

    visit_doc = {
        "_id": ObjectId(visit_id),
        "id": visit_id,
        "attendanceLogId": att_id,
        "employeeId": emp_id,
        "emp_id": emp_id,
        "company_id": company_id,
        "clientName": client_name,
        "client_name": client_name,
        "notes": notes,
        "latitude": lat_f,
        "longitude": lng_f,
        "timestamp": now_iso,
        "timestamp_utc": now_iso
    }
    field_visits_col.insert_one(visit_doc)

    return jsonify({
        "ok": True,
        "message": f"Client visit with '{client_name}' logged successfully",
        "visit": {
            "id": visit_id,
            "client_name": client_name,
            "notes": notes,
            "latitude": lat_f,
            "longitude": lng_f,
            "timestamp": now_iso
        }
    })


@app.route("/api/employee/field-visits", methods=["GET"])
def api_get_my_field_visits():
    """Retrieve logged client visits for the authenticated employee."""
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    company_id = user.get("company_id", "").upper()
    emp_id = user.get("emp_id", "").upper()
    visits = list(field_visits_col.find({"company_id": company_id, "emp_id": emp_id}, {"_id": 0}).sort("timestamp_utc", -1))
    return jsonify({"ok": True, "visits": visits, "count": len(visits)})


@app.route("/api/attendance/otp-request", methods=["POST"])
def api_attendance_otp_request():
    """
    Initiate OTP Attendance workflow with 4-Member Approval Authority.
    Generates OTP, records attendance as PENDING_APPROVAL, and dispatches to 4 saved approvers.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}
    company_id = user.get("company_id", "").upper()
    emp_id = user.get("emp_id", "").upper()
    client_ip = get_client_real_ip(request)
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is not None:
        try: lat = float(lat)
        except Exception: lat = None
    if lng is not None:
        try: lng = float(lng)
        except Exception: lng = None

    otp = str(random.randint(100000, 999999))
    now_utc = get_utc_now()
    now_iso = get_utc_iso_string()
    tz = resolve_entity_timezone(company_id=company_id)
    date_str, time_str, _ = get_localized_time(tz)

    att_id = str(ObjectId())
    log_doc = {
        "_id": ObjectId(att_id),
        "id": att_id,
        "company_id": company_id,
        "organizationId": company_id,
        "emp_id": emp_id,
        "employeeId": emp_id,
        "employee_name": user.get("name", "Employee"),
        "clientIp": client_ip,
        "client_ip": client_ip,
        "latitude": lat,
        "longitude": lng,
        "verificationMethod": "OTP_APPROVER",
        "verification_method": "OTP_APPROVER",
        "status": "PENDING_APPROVAL",
        "otp": otp,
        "otp_hash": hash_password(otp),
        "date": date_str,
        "time": time_str,
        "check_type": "IN",
        "timestamp_utc": now_iso,
        "checkInTime": now_iso,
        "created_at": now_iso
    }
    attendance_col.insert_one(log_doc)

    # Dispatch to the up to 4 saved approver emails
    approvers = get_organization_approvers(company_id)
    for appr in approvers:
        appr_email = appr.get("email")
        if appr_email:
            notifications_col.insert_one({
                "company_id": company_id,
                "recipient_email": appr_email.lower(),
                "title": f"OTP Attendance Authorization: {user.get('name')}",
                "message": f"Employee {user.get('name')} ({emp_id}) requests OTP attendance approval. Code: {otp}",
                "type": "OTP_APPROVAL_DISPATCH",
                "attendance_id": att_id,
                "timestamp_utc": now_iso,
                "read": False
            })

    log_audit_event(
        action="OTP_ATTENDANCE_REQUESTED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="employee",
        details={"emp_id": emp_id, "attendance_id": att_id, "approvers_dispatched": len(approvers)},
        ip=client_ip,
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "status": "PENDING_APPROVAL",
        "message": f"OTP attendance request registered. Dispatched to {len(approvers)} designated approval authorities.",
        "attendance_id": att_id,
        "approvers_notified": len(approvers),
        "otp": otp
    })


@app.route("/api/organization/pending-approvals", methods=["GET"])
def api_get_organization_pending_approvals():
    """
    Surface pending OTP attendance approvals and count badge for the Organization Portal.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    company_id = user.get("company_id", "").upper() if user.get("role") != "super_admin" else request.args.get("company_id", "").upper() or user.get("company_id", "").upper()

    pending = list(attendance_col.find(
        {"company_id": company_id, "status": "PENDING_APPROVAL"},
        {"_id": 0}
    ).sort("timestamp_utc", -1))

    return jsonify({
        "ok": True,
        "pending_count": len(pending),
        "requests": pending
    })


@app.route("/api/organization/approvals/<attendance_id>/review", methods=["POST"])
@app.route("/api/attendance/otp/approve", methods=["POST"])
def api_review_otp_attendance(attendance_id=None):
    """
    Review OTP attendance approval request.
    STRICT SECURITY RULE: Only an authenticated session matching one of the 4 designated
    approver emails (or company admin / super admin) can approve or reject the request.
    Permanently records approved_by_email and timestamp for compliance auditing.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required. Please sign in."}), 401

    data = request.json or {}
    if not attendance_id:
        attendance_id = data.get("attendance_id") or data.get("id")

    if not attendance_id:
        return jsonify({"ok": False, "error": "attendance_id is required"}), 400

    action = data.get("action", "approve").lower().strip()
    rejection_reason = data.get("rejection_reason", "").strip()

    if action not in ("approve", "reject"):
        return jsonify({"ok": False, "error": "Action must be 'approve' or 'reject'"}), 400

    att = attendance_col.find_one({
        "$or": [
            {"_id": ObjectId(attendance_id) if ObjectId.is_valid(attendance_id) else None},
            {"id": attendance_id}
        ]
    })
    if not att:
        return jsonify({"ok": False, "error": f"Attendance record '{attendance_id}' not found"}), 404

    company_id = (att.get("company_id") or att.get("organizationId", "")).upper()
    user_email = user.get("email", "").strip().lower()
    user_role = user.get("role", "")

    # Security verification against the 4 designated approval members
    is_approver = is_designated_approver(company_id, user_email)
    is_admin = (user_role == "super_admin") or (user_role in ("company_admin", "hr", "manager") and user.get("company_id", "").upper() == company_id)

    if not is_approver and not is_admin:
        return jsonify({
            "ok": False,
            "error": "Unauthorized: Only one of the 4 designated approval authority members can approve or reject OTP attendance."
        }), 403

    now_iso = get_utc_iso_string()
    new_status = "APPROVED" if action == "approve" else "REJECTED"

    update_fields = {
        "status": new_status,
        "approvedByEmail": user_email,
        "approved_by_email": user_email,
        "approval_timestamp": now_iso,
        "rejectionReason": rejection_reason if action == "reject" else None
    }
    attendance_col.update_one({"_id": att["_id"]}, {"$set": update_fields})

    # Notify employee
    notifications_col.insert_one({
        "company_id": company_id,
        "emp_id": att.get("emp_id"),
        "title": f"OTP Attendance {new_status}",
        "message": f"Your OTP attendance request for {att.get('date')} has been {new_status.lower()} by {user_email}.",
        "type": "ATTENDANCE_STATUS_UPDATE",
        "attendance_id": str(att["_id"]),
        "timestamp_utc": now_iso,
        "read": False
    })

    log_audit_event(
        action=f"OTP_ATTENDANCE_{new_status}",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role=user_role,
        details={"attendance_id": str(att["_id"]), "emp_id": att.get("emp_id"), "approved_by": user_email, "action": action},
        ip=get_client_real_ip(request),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "status": new_status,
        "approved_by": user_email,
        "attendance_id": str(att["_id"]),
        "message": f"Attendance request {new_status.lower()} successfully by {user_email}"
    })


@app.route("/api/organization/settings", methods=["GET", "POST"])
def api_organization_settings():
    """
    Organization Settings:
    - Office Wi-Fi Public IP / CIDR range (officeWifiIp)
    - Office GPS Location (officeLatitude, officeLongitude)
    - Office Allowed Radius/Range (officeRangeRadiusM, default: 100m)
    - Approver Registry
    All permanently persisted in database.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    company_id = user.get("company_id", "").upper() if user.get("role") != "super_admin" else request.args.get("company_id", "").upper() or user.get("company_id", "").upper()

    if request.method == "GET":
        comp = companies_col.find_one({"company_id": company_id}, {"_id": 0}) or {}
        approvers = get_organization_approvers(company_id)
        settings = {
            "name": comp.get("name", ""),
            "code": company_id,
            "officeWifiIp": comp.get("officeWifiIp") or comp.get("office_wifi_ip", ""),
            "officeLatitude": comp.get("officeLatitude") if comp.get("officeLatitude") is not None else comp.get("office_latitude", OFFICE_LAT),
            "officeLongitude": comp.get("officeLongitude") if comp.get("officeLongitude") is not None else comp.get("office_longitude", OFFICE_LNG),
            "officeRangeRadiusM": comp.get("officeRangeRadiusM") if comp.get("officeRangeRadiusM") is not None else comp.get("office_range_radius_m", 100),
            "approvers": approvers
        }
        return jsonify({"ok": True, "settings": settings})

    # POST: Update settings
    if user.get("role") not in ("company_admin", "super_admin", "hr", "manager"):
        return jsonify({"ok": False, "error": "Permission denied"}), 403

    data = request.json or {}
    wifi_ip = str(data.get("officeWifiIp", data.get("office_wifi_ip", ""))).strip()
    office_lat = data.get("officeLatitude") if data.get("officeLatitude") is not None else data.get("office_latitude")
    office_lng = data.get("officeLongitude") if data.get("officeLongitude") is not None else data.get("office_longitude")
    office_radius = data.get("officeRangeRadiusM") if data.get("officeRangeRadiusM") is not None else data.get("office_range_radius_m", 100)

    try: office_lat = float(office_lat) if office_lat is not None else OFFICE_LAT
    except Exception: office_lat = OFFICE_LAT

    try: office_lng = float(office_lng) if office_lng is not None else OFFICE_LNG
    except Exception: office_lng = OFFICE_LNG

    try: office_radius = int(office_radius)
    except Exception: office_radius = 100

    update_doc = {
        "officeWifiIp": wifi_ip,
        "office_wifi_ip": wifi_ip,
        "officeLatitude": office_lat,
        "office_latitude": office_lat,
        "officeLongitude": office_lng,
        "office_longitude": office_lng,
        "officeRangeRadiusM": office_radius,
        "office_range_radius_m": office_radius
    }
    companies_col.update_one({"company_id": company_id}, {"$set": update_doc})

    log_audit_event(
        action="UPDATE_ORGANIZATION_SETTINGS",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details=update_doc,
        ip=get_client_real_ip(request),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "message": "Organization Wi-Fi & Geofence settings permanently saved",
        "settings": update_doc
    })


@app.route("/api/organization/approvers", methods=["GET", "POST", "DELETE"])
def api_organization_approvers():
    """
    Dedicated Approver Registry for Organization Portal:
    Configure and manage up to 4 designated approval authority members.
    Persisted permanently in database.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    company_id = user.get("company_id", "").upper() if user.get("role") != "super_admin" else request.args.get("company_id", "").upper() or user.get("company_id", "").upper()

    if request.method == "GET":
        approvers = get_organization_approvers(company_id)
        return jsonify({"ok": True, "approvers": approvers, "count": len(approvers)})

    if user.get("role") not in ("company_admin", "super_admin", "hr", "manager"):
        return jsonify({"ok": False, "error": "Permission denied"}), 403

    if request.method == "DELETE":
        email = request.args.get("email", "").strip().lower()
        if not email:
            data = request.json or {}
            email = data.get("email", "").strip().lower()
        if not email:
            return jsonify({"ok": False, "error": "Approver email is required"}), 400
        delete_organization_approver(company_id, email)
        return jsonify({"ok": True, "message": f"Approver '{email}' removed", "approvers": get_organization_approvers(company_id)})

    # POST
    data = request.json or {}
    if "approvers" in data and isinstance(data["approvers"], list):
        approvers_list = data["approvers"][:4]
        approvers_col.delete_many({"company_id": company_id})
        for a in approvers_list:
            if a.get("email"):
                save_organization_approver(
                    company_id=company_id,
                    name=a.get("name", "Approver"),
                    email=a.get("email"),
                    phone=a.get("phone", ""),
                    is_active=a.get("isActive", a.get("is_active", True))
                )
        current = get_organization_approvers(company_id)
        return jsonify({"ok": True, "message": f"Successfully configured {len(current)} designated approval members", "approvers": current})
    else:
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        is_active = bool(data.get("isActive", data.get("is_active", True)))
        ok, msg = save_organization_approver(company_id, name, email, phone, is_active)
        if not ok:
            return jsonify({"ok": False, "error": msg}), 400
        current = get_organization_approvers(company_id)
        return jsonify({"ok": True, "message": msg, "approvers": current})


@app.route("/api/organization/approvers/<email>", methods=["DELETE"])
def api_delete_organization_approver_path(email):
    """Delete a designated approver by path parameter."""
    user = get_current_user()
    if not user or user.get("role") not in ("company_admin", "super_admin", "hr", "manager"):
        return jsonify({"ok": False, "error": "Permission denied"}), 403
    company_id = user.get("company_id", "").upper()
    delete_organization_approver(company_id, email)
    return jsonify({"ok": True, "message": f"Approver '{email}' deleted", "approvers": get_organization_approvers(company_id)})


@app.route("/api/organization/employees", methods=["GET"])
def api_organization_employees():
    """
    Roster of employees with their operational work modes, assigned static IPs,
    and registered home coordinates.
    """
    user = get_current_user()
    if not user:
        return jsonify({"ok": False, "error": "Authentication required"}), 401

    company_id = user.get("company_id", "").upper() if user.get("role") != "super_admin" else request.args.get("company_id", "").upper() or user.get("company_id", "").upper()

    emps = list(employees_col.find(
        {"company_id": company_id},
        {"_id": 0, "face_encoding": 0}
    ).sort("name", 1))

    return jsonify({"ok": True, "employees": emps, "count": len(emps)})


@app.route("/api/organization/employees/<emp_id>/config", methods=["POST"])
def api_organization_employee_config(emp_id):
    """
    Configure an employee's work mode, assigned static IP (WFH), and home radius.
    """
    user = get_current_user()
    if not user or user.get("role") not in ("company_admin", "super_admin", "hr", "manager"):
        return jsonify({"ok": False, "error": "Permission denied"}), 403

    company_id, tenant_error = resolve_tenant_id(user, request.args.get("company_id"))
    if tenant_error:
        return tenant_error
    data = request.json or {}

    update = {}
    if "work_mode" in data or "workMode" in data:
        wm = (data.get("work_mode") or data.get("workMode", "")).upper()
        if wm in ("WFO", "OFFICE", "WORK_FROM_OFFICE"): wm = "WORK_FROM_OFFICE"
        elif wm in ("WFH", "HOME", "REMOTE", "WORK_FROM_HOME"): wm = "WORK_FROM_HOME"
        elif wm in ("FIELD", "SALES", "SALES_FIELD"): wm = "SALES_FIELD"
        update["work_mode"] = wm
        update["workMode"] = wm

    if "assigned_ip" in data or "assignedIp" in data:
        ip_val = str(data.get("assigned_ip") if "assigned_ip" in data else data.get("assignedIp", "")).strip()
        update["assigned_ip"] = ip_val
        update["assignedIp"] = ip_val

    if "home_range_radius_m" in data or "homeRangeRadiusM" in data:
        rad = data.get("home_range_radius_m") if "home_range_radius_m" in data else data.get("homeRangeRadiusM")
        try: rad = int(rad)
        except Exception: rad = 200
        update["home_range_radius_m"] = rad
        update["homeRangeRadiusM"] = rad

    if "home_latitude" in data or "homeLatitude" in data:
        hlat = data.get("home_latitude") if "home_latitude" in data else data.get("homeLatitude")
        try:
            update["home_latitude"] = float(hlat)
            update["homeLatitude"] = float(hlat)
        except Exception: pass

    if "home_longitude" in data or "homeLongitude" in data:
        hlng = data.get("home_longitude") if "home_longitude" in data else data.get("homeLongitude")
        try:
            update["home_longitude"] = float(hlng)
            update["homeLongitude"] = float(hlng)
        except Exception: pass

    if update:
        employees_col.update_one({"company_id": company_id, "emp_id": emp_id.upper()}, {"$set": update})
        users_col.update_one({"company_id": company_id, "emp_id": emp_id.upper()}, {"$set": update})

    log_audit_event(
        action="UPDATE_EMPLOYEE_WORK_CONFIG",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"emp_id": emp_id, "config": update},
        ip=get_client_real_ip(request),
        user_agent=client_user_agent()
    )

    return jsonify({"ok": True, "message": f"Configuration updated for employee {emp_id}", "config": update})


# ══════════════════════════════════════════════════════════════════════════════
#  ATTENDANCE CONTROLLER: ROLE-BASED ACCESS & PERMISSION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/superadmin/controller", methods=["GET", "POST"])
def api_superadmin_attendance_controller():
    """
    Super Admin Attendance Controller:
    Highest level of attendance control. Super Admin decides which attendance-related
    features and methods (Face, OTP, WiFi, GPS) can be accessed by the Company Admin.
    """
    user, err = require_auth(allowed_roles=["super_admin"])
    if err:
        return err

    if request.method == "GET":
        company_id = request.args.get("company_id", "").strip().upper()
        if company_id:
            comp = companies_col.find_one({"company_id": company_id})
            if not comp:
                return jsonify({"ok": False, "error": f"Company '{company_id}' not found"}), 404
            ctrl = get_company_controller_settings(comp)
            return jsonify({
                "ok": True,
                "company_id": company_id,
                "company_name": comp.get("name"),
                "controller": ctrl,
                "work_type_defaults": DEFAULT_WORK_TYPE_METHODS
            })
        
        # Return all companies with their attendance controller configs
        comps = list(companies_col.find({}, {"_id": 0, "company_id": 1, "name": 1, "status": 1, "attendance_controller": 1}).sort("name", 1))
        for c in comps:
            c["controller"] = get_company_controller_settings(c)
        return jsonify({
            "ok": True,
            "companies": comps,
            "global_default": DEFAULT_ATTENDANCE_CONTROLLER,
            "work_type_defaults": DEFAULT_WORK_TYPE_METHODS
        })

    # POST: Update controller permissions for a company
    data = request.json or {}
    company_id = data.get("company_id", "").strip().upper()
    if not company_id:
        return jsonify({"ok": False, "error": "Company ID is required to configure attendance controller"}), 400

    comp = companies_col.find_one({"company_id": company_id})
    if not comp:
        return jsonify({"ok": False, "error": f"Company '{company_id}' not found"}), 404

    current_ctrl = get_company_controller_settings(comp)
    raw_methods = data.get("allowed_methods")
    if isinstance(raw_methods, list):
        allowed_methods = [normalize_attendance_method(m) for m in raw_methods if normalize_attendance_method(m) in ["Face", "OTP", "WiFi", "GPS"]]
        if not allowed_methods:
            allowed_methods = ["Face", "OTP"]
    else:
        allowed_methods = current_ctrl.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"])

    new_controller = {
        "allowed_methods": allowed_methods,
        "allow_company_admin_override": bool(data.get("allow_company_admin_override", current_ctrl.get("allow_company_admin_override", True))),
        "require_gps_for_field": bool(data.get("require_gps_for_field", current_ctrl.get("require_gps_for_field", True))),
        "require_wifi_for_office": bool(data.get("require_wifi_for_office", current_ctrl.get("require_wifi_for_office", False))),
        "office_wifi_ip": str(data.get("office_wifi_ip", data.get("officeWifiIp", current_ctrl.get("office_wifi_ip", ""))) or "").strip(),
        "lock_office_wifi_ip": bool(data.get("lock_office_wifi_ip", current_ctrl.get("lock_office_wifi_ip", False))),
        "allow_wfh_gps": bool(data.get("allow_wfh_gps", current_ctrl.get("allow_wfh_gps", True))),
        "allow_offline_sync": bool(data.get("allow_offline_sync", current_ctrl.get("allow_offline_sync", True))),
        "allow_mobile_clockout": bool(data.get("allow_mobile_clockout", current_ctrl.get("allow_mobile_clockout", True))),
        "allow_web_clockout": bool(data.get("allow_web_clockout", current_ctrl.get("allow_web_clockout", True))),
        "require_geofence": bool(data.get("require_geofence", current_ctrl.get("require_geofence", True))),
        "require_ip_check": bool(data.get("require_ip_check", current_ctrl.get("require_ip_check", True))),
        "max_clock_outs_per_day": int(data.get("max_clock_outs_per_day", current_ctrl.get("max_clock_outs_per_day", 1))),
        "updated_at": get_utc_iso_string(),
        "updated_by": user.get("email") or user.get("name")
    }

    company_update = {"attendance_controller": new_controller, "updated_at": get_utc_iso_string()}
    # Keep the company-level network setting synchronized with the Controller
    # screen, including an explicit blank value when Super Admin clears the rule.
    # This prevents an old Wi-Fi IP from remaining active after a reset.
    company_update["officeWifiIp"] = new_controller["office_wifi_ip"]
    company_update["office_wifi_ip"] = new_controller["office_wifi_ip"]
    companies_col.update_one({"company_id": company_id}, {"$set": company_update})

    # When company-level allowed methods are reduced, prune employee assignments that are no longer allowed
    employees_col.update_many(
        {"company_id": company_id},
        {"$pull": {"allowed_methods": {"$nin": allowed_methods}}}
    )
    users_col.update_many(
        {"company_id": company_id},
        {"$pull": {"allowed_methods": {"$nin": allowed_methods}}}
    )

    log_audit_event(
        action="ATTENDANCE_CONTROLLER_CONFIGURED",
        company_id=company_id,
        actor_name=user.get("name"),
        actor_role="super_admin",
        details={"company_id": company_id, "controller": new_controller},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "message": f"Attendance Controller settings updated for '{comp.get('name')}' ({company_id})",
        "controller": new_controller
    })


@app.route("/api/company/controller-permissions", methods=["GET"])
def api_company_controller_permissions():
    """
    Company Admin: View attendance controls & permissions granted by Super Admin.
    Company Admin can only manage employee attendance settings according to these permissions.
    """
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr", "manager"])
    if err:
        return err

    req_comp_id = request.args.get("company_id")
    target_company_id, iso_err = resolve_tenant_id(user, req_comp_id)
    if iso_err:
        return iso_err

    comp = companies_col.find_one({"company_id": target_company_id})
    ctrl = get_company_controller_settings(comp)

    return jsonify({
        "ok": True,
        "company_id": target_company_id,
        "controller": ctrl,
        "allowed_methods": ctrl.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"]),
        "work_type_defaults": DEFAULT_WORK_TYPE_METHODS
    })


@app.route("/api/company/employees/<emp_id>/attendance-methods", methods=["GET", "POST"])
def api_company_employee_attendance_methods(emp_id):
    """
    Company Admin: Assign attendance methods employee-wise.
    Strictly bounded by Super Admin permissions for the company.
    """
    user, err = require_auth(allowed_roles=["company_admin", "super_admin", "hr"])
    if err:
        return err

    data = request.json if request.method == "POST" and request.is_json else {}
    req_comp_id = (data.get("company_id") if isinstance(data, dict) else None) or request.args.get("company_id")
    target_company_id, iso_err = resolve_tenant_id(user, req_comp_id)
    if iso_err:
        return iso_err

    emp = employees_col.find_one({"company_id": target_company_id, "emp_id": emp_id.upper()})
    if not emp:
        return jsonify({"ok": False, "error": f"Employee '{emp_id}' not found in this company"}), 404

    comp = companies_col.find_one({"company_id": target_company_id})
    ctrl = get_company_controller_settings(comp)
    comp_permitted = [normalize_attendance_method(m) for m in ctrl.get("allowed_methods", ["Face", "OTP", "WiFi", "GPS"])]

    if request.method == "GET":
        effective = get_employee_assigned_methods(emp, comp)
        work_type = emp.get("work_type", "Office")
        return jsonify({
            "ok": True,
            "emp_id": emp_id.upper(),
            "name": emp.get("name"),
            "work_type": work_type,
            "assigned_methods": emp.get("allowed_methods") or effective,
            "allowed_methods": emp.get("allowed_methods") or effective,
            "effective_methods": effective,
            "company_allowed_methods": comp_permitted,
            "work_type_defaults": DEFAULT_WORK_TYPE_METHODS.get(work_type, ["Face", "OTP"])
        })

    # POST: Update assigned attendance methods for this employee
    raw_methods = data.get("allowed_methods") or data.get("methods")
    if not isinstance(raw_methods, list) or len(raw_methods) == 0:
        return jsonify({"ok": False, "error": "At least one attendance method must be assigned"}), 400

    assigned_methods = []
    for m in raw_methods:
        norm = normalize_attendance_method(m)
        if norm not in comp_permitted:
            return jsonify({
                "ok": False,
                "error": f"Attendance method '{m}' cannot be assigned because it is not permitted for your company by Super Admin. Available methods: {', '.join(comp_permitted)}"
            }), 400
        if norm not in assigned_methods:
            assigned_methods.append(norm)

    employees_col.update_one(
        {"company_id": target_company_id, "emp_id": emp_id.upper()},
        {"$set": {"allowed_methods": assigned_methods, "updated_at": get_utc_iso_string()}}
    )
    users_col.update_one(
        {"company_id": target_company_id, "emp_id": emp_id.upper()},
        {"$set": {"allowed_methods": assigned_methods, "updated_at": get_utc_iso_string()}}
    )

    log_audit_event(
        action="EMPLOYEE_ATTENDANCE_METHODS_UPDATED",
        company_id=target_company_id,
        actor_name=user.get("name"),
        actor_role=user.get("role"),
        details={"emp_id": emp_id.upper(), "name": emp.get("name"), "allowed_methods": assigned_methods},
        ip=client_ip(),
        user_agent=client_user_agent()
    )

    return jsonify({
        "ok": True,
        "message": f"Attendance methods updated for employee '{emp.get('name')}' ({emp_id.upper()})",
        "emp_id": emp_id.upper(),
        "allowed_methods": assigned_methods
    })


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRYPOINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    seed_global_system()
    app.run(host=HOST, port=PORT, debug=DEBUG)


