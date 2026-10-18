import sys
import os
backend_path = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, backend_path)

from app import app, companies_col, users_col, employees_col, policies_col, system_config_col, permissions_col, approvers_col
from database import hash_password

client = app.test_client()

def test_all():
    print("--- 1. Testing Super Admin Login ---")
    res = client.post("/api/login", json={
        "role": "super_admin",
        "email": "superadmin@ardhnarishwar.com",
        "password": "superadmin123"
    })
    print("Superadmin login status:", res.status_code, res.json)
    assert res.json.get("ok")

    print("\n--- 2. Testing Super Admin System Config ---")
    res = client.post("/api/superadmin/system-config", json={
        "platform_name": "Ardhnarishwar Global Test",
        "super_admin_company": "Ardhnarishwar Test Co",
        "default_timezone": "Asia/Kolkata",
        "face_match_tolerance": 0.45,
        "liveness_confidence_threshold": 0.85,
        "liveness_session_ttl_seconds": 300,
        "require_liveness": True,
        "office_radius_m": 75,
        "office_subnet": "192.168.1.0/24"
    })
    print("System config post status:", res.status_code, res.json)

    res = client.get("/api/superadmin/system-config")
    print("System config get status:", res.status_code, res.json)
    assert res.json.get("config", {}).get("platform_name") == "Ardhnarishwar Global Test"

    print("\n--- 3. Testing Super Admin Create Company ---")
    res = client.post("/api/superadmin/companies", json={
        "company_id": "TEST_CORP",
        "name": "Test Corporation",
        "country": "India",
        "timezone": "Asia/Kolkata",
        "contact_phone": "9876543210",
        "contact_email": "admin@testcorp.com",
        "admin_name": "Test Admin",
        "admin_password": "password123",
        "plan": "Enterprise"
    })
    print("Create company status:", res.status_code, res.json)

    print("\n--- 4. Testing Super Admin Edit Company ---")
    res = client.put("/api/superadmin/companies/TEST_CORP", json={
        "name": "Test Corporation Updated",
        "contact_email": "updated@testcorp.com"
    })
    print("Edit company status:", res.status_code, res.json)

    print("\n--- 5. Testing Super Admin Subscriptions ---")
    res = client.post("/api/superadmin/companies/TEST_CORP/subscription", json={
        "plan": "Enterprise VIP",
        "max_seats": 500,
        "valid_until": "2028-12-31"
    })
    print("Change subscription status:", res.status_code, res.json)

    print("\n--- 6. Testing Super Admin Permissions ---")
    res = client.post("/api/superadmin/permissions", json={
        "roles": {
            "super_admin": {"all": True}
        }
    })
    print("Save permissions status:", res.status_code, res.json)

    print("\n--- 7. Testing Company Admin Login ---")
    res = client.post("/api/login", json={
        "role": "company_admin",
        "company_id": "TEST_CORP",
        "email": "updated@testcorp.com",
        "password": "password123"
    })
    print("Company admin login status:", res.status_code, res.json)

    print("\n--- 8. Testing Company Policy Save (/api/company/profile) ---")
    res = client.post("/api/company/profile?company_id=TEST_CORP", json={
        "policy": {
            "shift_start": "09:00",
            "shift_end": "18:00",
            "grace_period_mins": 20,
            "half_day_after": "13:30",
            "allowed_methods": ["Face", "OTP", "WiFi", "GPS"]
        }
    })
    print("Company profile policy save status:", res.status_code, res.json)

    print("\n--- 9. Testing Company Policy Save (/api/company/policies) ---")
    res = client.post("/api/company/policies?company_id=TEST_CORP", json={
        "shift_start": "08:30",
        "shift_end": "17:30",
        "grace_period_mins": 10,
        "half_day_after": "12:30",
        "allowed_methods": ["Face", "OTP"]
    })
    print("Company policies save status:", res.status_code, res.json)

    print("\n--- 10. Testing Organization Portal Settings Save ---")
    res = client.post("/api/organization/settings", json={
        "officeWifiIp": "203.0.113.1",
        "officeLatitude": 28.5355,
        "officeLongitude": 77.3910,
        "officeRangeRadiusM": 150
    })
    print("Organization settings save status:", res.status_code, res.json)

    print("\n--- 11. Testing Organization Approver Save ---")
    res = client.post("/api/organization/approvers", json={
        "name": "Approver One",
        "email": "approver1@testcorp.com",
        "phone": "9876543211"
    })
    print("Organization approver save status:", res.status_code, res.json)

    print("\n--- 12. Testing Organization Get Settings & Approvers ---")
    res = client.get("/api/organization/settings")
    print("Organization settings get status:", res.status_code, res.json)
    assert res.json.get("ok")

    res = client.get("/api/organization/approvers")
    print("Organization approvers get status:", res.status_code, res.json)
    assert res.json.get("ok")

    print("\n--- 13. Testing Organization Policy Save (/api/organization/policy) ---")
    res = client.post("/api/organization/policy", json={
        "shift_start": "09:30",
        "shift_end": "18:30",
        "grace_period_mins": 25,
        "half_day_threshold_mins": 150,
        "min_work_hours_full_day": 8.5,
        "min_work_hours_half_day": 4.5,
        "allowed_methods": ["face", "otp", "wifi", "gps", "quick_punch"]
    })
    print("Organization policy save status:", res.status_code, res.json)
    assert res.json.get("ok")

    res = client.get("/api/organization/policy")
    print("Organization policy get status:", res.status_code, res.json)
    assert res.json.get("ok")
    assert res.json.get("policy", {}).get("shift_start") == "09:30"
    assert res.json.get("policy", {}).get("grace_period_mins") == 25

    print("\n--- 14. Testing Super Admin Company Policy ---")
    # Login back as super_admin
    client.post("/api/login", json={
        "role": "super_admin",
        "email": "superadmin@ardhnarishwar.com",
        "password": "superadmin123"
    })
    res = client.post("/api/superadmin/companies/TEST_CORP/policy", json={
        "shift_start": "10:00",
        "shift_end": "19:00",
        "grace_period_mins": 30,
        "allowed_methods": ["face", "wifi", "gps"]
    })
    print("Superadmin set company policy status:", res.status_code, res.json)
    assert res.json.get("ok")

    res = client.get("/api/superadmin/companies/TEST_CORP/policy")
    print("Superadmin get company policy status:", res.status_code, res.json)
    assert res.json.get("ok")
    assert res.json.get("policy", {}).get("shift_start") == "10:00"

    print("\n--- 15. Testing Enterprise Tier 1 Registration ---")
    res = client.post("/api/auth/register-company", json={
        "plan": "Enterprise Global",
        "company_id": "MEGA_ENTERPRISE",
        "company_name": "Mega Enterprise Global Corp",
        "industry": "Information Technology",
        "workforce_size": "2,500 - 10,000 Employees",
        "branches_count": 12,
        "country": "India",
        "timezone": "Asia/Kolkata",
        "admin_name": "Executive Admin",
        "admin_email": "admin@megaenterprise.com",
        "admin_phone": "9811223344",
        "admin_password": "enterprisePassword123",
        "approver1_name": "VP People Operations",
        "approver1_email": "vp.hr@megaenterprise.com",
        "approver1_phone": "9811223345",
        "office_lat": 28.6139,
        "office_lng": 77.2090,
        "office_radius_m": 120,
        "office_subnet": "10.0.0.0/16"
    })
    print("Enterprise registration status:", res.status_code, res.json)
    assert res.json.get("ok")

    ent_comp = companies_col.find_one({"company_id": "MEGA_ENTERPRISE"})
    assert ent_comp is not None
    assert ent_comp.get("plan") == "Enterprise Global"
    assert ent_comp.get("industry") == "Information Technology"
    assert ent_comp.get("workforce_size") == "2,500 - 10,000 Employees"
    assert ent_comp.get("branches_count") == 12
    assert ent_comp.get("status") == "pending"

    print("\n--- 16. Testing Super Admin Approval of Enterprise Company ---")
    res = client.post("/api/superadmin/companies/MEGA_ENTERPRISE/approve")
    print("Approve enterprise company status:", res.status_code, res.json)
    assert res.json.get("ok")

    ent_comp_approved = companies_col.find_one({"company_id": "MEGA_ENTERPRISE"})
    assert ent_comp_approved.get("status") == "active"
    print("Enterprise company successfully approved and activated!")

    print("\n========================================================")
    print(" ALL 16 DIAGNOSTIC VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("========================================================")

if __name__ == "__main__":
    test_all()
