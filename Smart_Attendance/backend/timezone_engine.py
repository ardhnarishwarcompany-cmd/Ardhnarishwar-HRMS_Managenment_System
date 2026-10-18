from datetime import datetime, timezone, time
import pytz

# Standard Global Timezones list with country associations
GLOBAL_TIMEZONES = [
    {"code": "Asia/Kolkata", "label": "India (IST, UTC+05:30)", "country": "India"},
    {"code": "America/New_York", "label": "USA - Eastern (EST/EDT, UTC-05:00/04:00)", "country": "USA"},
    {"code": "America/Chicago", "label": "USA - Central (CST/CDT, UTC-06:00/05:00)", "country": "USA"},
    {"code": "America/Denver", "label": "USA - Mountain (MST/MDT, UTC-07:00/06:00)", "country": "USA"},
    {"code": "America/Los_Angeles", "label": "USA - Pacific (PST/PDT, UTC-08:00/07:00)", "country": "USA"},
    {"code": "Europe/London", "label": "UK / London (GMT/BST, UTC+00:00/01:00)", "country": "United Kingdom"},
    {"code": "Europe/Berlin", "label": "Germany / Central Europe (CET/CEST, UTC+01:00/02:00)", "country": "Germany"},
    {"code": "Europe/Paris", "label": "France / Paris (CET/CEST, UTC+01:00/02:00)", "country": "France"},
    {"code": "Asia/Dubai", "label": "UAE / Gulf (GST, UTC+04:00)", "country": "United Arab Emirates"},
    {"code": "Asia/Singapore", "label": "Singapore (SGT, UTC+08:00)", "country": "Singapore"},
    {"code": "Asia/Tokyo", "label": "Japan (JST, UTC+09:00)", "country": "Japan"},
    {"code": "Australia/Sydney", "label": "Australia - Sydney (AEST/AEDT, UTC+10:00/11:00)", "country": "Australia"},
    {"code": "America/Sao_Paulo", "label": "Brazil (BRT, UTC-03:00)", "country": "Brazil"},
    {"code": "America/Toronto", "label": "Canada - Eastern (EST/EDT, UTC-05:00/04:00)", "country": "Canada"},
    {"code": "Africa/Johannesburg", "label": "South Africa (SAST, UTC+02:00)", "country": "South Africa"},
    {"code": "UTC", "label": "Coordinated Universal Time (UTC)", "country": "Global"}
]

GLOBAL_COUNTRIES = [
    "India", "USA", "United Kingdom", "Germany", "France", 
    "United Arab Emirates", "Singapore", "Japan", "Australia", 
    "Canada", "Brazil", "South Africa", "Netherlands", "Saudi Arabia"
]


def get_utc_now() -> datetime:
    """Return current datetime in timezone-aware UTC."""
    return datetime.now(timezone.utc)


def get_utc_iso_string() -> str:
    """Return current UTC time formatted as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def get_localized_time(tz_name: str = "UTC", utc_dt = None) -> tuple[str, str, str]:
    """
    Given a timezone string (e.g. 'Asia/Kolkata', 'America/New_York') and optional UTC datetime,
    returns (date_str 'YYYY-MM-DD', time_str 'HH:MM:SS', formatted_label '01 Sep 2026, 03:30 PM')
    Accepts (tz_name, utc_dt) or (utc_dt, tz_name).
    """
    # Check if arguments are reversed, e.g. get_localized_time(dt, "Asia/Kolkata")
    if isinstance(tz_name, (datetime, str)) and isinstance(utc_dt, str) and not isinstance(tz_name, str):
        utc_dt, tz_name = tz_name, utc_dt
    elif isinstance(tz_name, str) and isinstance(utc_dt, str) and ("/" in utc_dt or utc_dt in ("UTC", "GMT")):
        # If tz_name looks like ISO date and utc_dt looks like tz_name
        if "T" in tz_name or "-" in tz_name:
            utc_dt, tz_name = tz_name, utc_dt

    if utc_dt is None:
        utc_dt = datetime.now(timezone.utc)
    elif isinstance(utc_dt, str):
        try:
            utc_dt = datetime.fromisoformat(utc_dt.replace("Z", "+00:00"))
        except Exception:
            utc_dt = datetime.now(timezone.utc)

    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)

    try:
        tz = pytz.timezone(str(tz_name)) if tz_name else pytz.timezone("UTC")
    except Exception:
        tz = pytz.timezone("UTC")

    local_dt = utc_dt.astimezone(tz)
    date_str = local_dt.strftime("%Y-%m-%d")
    time_str = local_dt.strftime("%H:%M:%S")
    formatted = local_dt.strftime("%d %b %Y, %I:%M %p")
    return date_str, time_str, formatted



def format_utc_to_tz(utc_iso_str: str, tz_name: str = "UTC") -> dict:
    """Convert stored UTC ISO string into target timezone format dictionary."""
    if not utc_iso_str:
        return {"date": "", "time": "", "formatted": ""}
    try:
        dt = datetime.fromisoformat(utc_iso_str.replace("Z", "+00:00"))
        date_str, time_str, formatted = get_localized_time(tz_name, dt)
        return {
            "date": date_str,
            "time": time_str,
            "formatted": formatted,
            "timezone": tz_name
        }
    except Exception:
        return {"date": "", "time": "", "formatted": utc_iso_str, "timezone": tz_name}


def parse_time_str(t_str: str) -> int:
    """Parse 'HH:MM' or 'HH:MM:SS' into minutes from midnight."""
    if not t_str:
        return 0
    parts = t_str.split(":")
    h = int(parts[0]) if len(parts) > 0 else 0
    m = int(parts[1]) if len(parts) > 1 else 0
    return h * 60 + m


def evaluate_attendance_status(local_time_str: str, policy: dict, work_type: str = "Office") -> str:
    """
    Dynamically evaluate attendance status based on company policy.
    Statuses: Present, Late, Half Day, WFH, Field
    """
    if work_type == "Field":
        return "Field"
    
    if not policy:
        # Default fallback standard
        policy = {
            "shift_start": "09:30",
            "grace_period_mins": 15,
            "half_day_after": "13:00"
        }

    shift_start_mins = parse_time_str(policy.get("shift_start", "09:30"))
    grace_mins = int(policy.get("grace_period_mins", 15))
    half_day_mins = parse_time_str(policy.get("half_day_after", "13:00"))
    
    check_mins = parse_time_str(local_time_str)

    if half_day_mins > 0 and check_mins >= half_day_mins:
        return "Half Day"
    elif check_mins > (shift_start_mins + grace_mins):
        return "Late"
    else:
        return "Present"


def resolve_entity_timezone(employee: dict = None, branch: dict = None, company: dict = None, default_tz: str = "Asia/Kolkata", **kwargs) -> str:
    """
    Hierarchical timezone resolution:
    1. Employee-specific timezone (for remote/distributed staff)
    2. Branch/Location-specific timezone
    3. Company/Tenant default timezone
    4. Default fallback timezone ("Asia/Kolkata" or "UTC")
    Supports direct company dictionary or company_id keyword argument.
    """
    comp_obj = company
    if comp_obj is None and "company_id" in kwargs:
        comp_id = kwargs.get("company_id")
        if comp_id:
            try:
                from database import companies_col
                comp_obj = companies_col.find_one({"company_id": str(comp_id).upper()})
            except Exception:
                pass

    if employee and isinstance(employee, dict) and employee.get("timezone"):
        return employee.get("timezone").strip()
    if branch and isinstance(branch, dict) and branch.get("timezone"):
        return branch.get("timezone").strip()
    if comp_obj and isinstance(comp_obj, dict) and comp_obj.get("timezone"):
        return comp_obj.get("timezone").strip()
    return default_tz


def get_utc_date_range_for_local_date(local_date_str: str, tz_name: str = "UTC") -> tuple[str, str]:
    """
    Given a local date 'YYYY-MM-DD' and an IANA timezone identifier,
    returns the UTC start and end ISO-8601 strings covering the local calendar day (00:00:00 to 23:59:59.999999).
    """
    try:
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = pytz.timezone("UTC")

    try:
        dt_start = datetime.strptime(local_date_str, "%Y-%m-%d")
        local_start = tz.localize(datetime(dt_start.year, dt_start.month, dt_start.day, 0, 0, 0))
        local_end = tz.localize(datetime(dt_start.year, dt_start.month, dt_start.day, 23, 59, 59, 999999))
        utc_start = local_start.astimezone(timezone.utc).isoformat()
        utc_end = local_end.astimezone(timezone.utc).isoformat()
        return utc_start, utc_end
    except Exception:
        return f"{local_date_str}T00:00:00+00:00", f"{local_date_str}T23:59:59.999999+00:00"

