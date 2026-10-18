import urllib.request
import urllib.parse
import http.cookiejar
import json

BASE_URL = "http://127.0.0.1:5000"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "VerificationTester/1.0"})
    with opener.open(req) as resp:
        return resp.status, resp.read().decode("utf-8")

def post_json(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "User-Agent": "VerificationTester/1.0"
    })
    try:
        with opener.open(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def verify_all_rendered_pages():
    print("=== 1. Verifying Live Server Landing Page ===")
    status, html = fetch(f"{BASE_URL}/landing")
    assert status == 200
    assert "Enterprise Onboarding" in html, "Missing Enterprise Onboarding in header"
    assert "Enterprise Registration" in html, "Missing Enterprise Registration in hero"
    assert "Enterprise Tier 1" in html, "Missing Enterprise Tier 1 in sub-tabs"
    print("[PASS] Landing Page: All Enterprise links and buttons verified successfully.")

    print("\n=== 2. Verifying Enterprise Registration Route ===")
    status, html = fetch(f"{BASE_URL}/register/enterprise")
    assert status == 200
    assert "Enterprise Corporate Onboarding" in html, "Missing Enterprise title"
    assert "rent-id" in html, "Missing Enterprise Workspace ID input"
    assert "rent-workforce" in html, "Missing Workforce Headcount select"
    assert "rent-branches" in html, "Missing Branches input"
    assert "rent-app1-name" in html, "Missing Approver P1 input"
    assert "rent-lat" in html, "Missing Geofence Lat input"
    assert "rent-wifi" in html, "Missing Wi-Fi input"
    assert "handleRegisterEnterprise" in html, "Missing handleRegisterEnterprise JS function"
    print("[PASS] Enterprise Registration Page: All form fields, layout, and JS handlers verified successfully.")

    print("\n=== 3. Verifying Organization Portal HTML ===")
    status, html = fetch(f"{BASE_URL}/portal/organization")
    assert status == 200
    assert "Set Attendance Policy &amp; Working Shifts" in html or "Set Attendance Policy & Working Shifts" in html, "Missing Policy section"
    assert "orgPolicyForm" in html, "Missing orgPolicyForm"
    assert "cfgShiftStart" in html, "Missing Shift Start field"
    assert "cfgGraceMins" in html, "Missing Grace period field"
    assert "methodFace" in html, "Missing Face verification checkbox"
    assert "handleSavePolicy" in html, "Missing handleSavePolicy JS handler"
    assert "handleSaveOfficeConfig" in html, "Missing handleSaveOfficeConfig JS handler"
    print("[PASS] Organization Portal: Policy form and JS save handlers verified successfully.")

    print("\n=== 4. Verifying Super Admin Dashboard HTML ===")
    login_st, login_res = post_json(f"{BASE_URL}/api/login", {
        "role": "super_admin",
        "email": "superadmin@ardhnarishwar.com",
        "password": "superadmin123"
    })
    assert login_st == 200 and login_res.get("ok"), "Super Admin login failed"
    status, html = fetch(f"{BASE_URL}/admin/dashboard")
    assert status == 200
    assert "Role Permissions Matrix" in html, "Missing Role Permissions Matrix"
    assert "perm-company_admin-portal_access" in html, "Missing permissions interactive checkbox"
    assert "company-policy-modal" in html, "Missing company policy modal"
    assert "openCompanyPolicyModal" in html, "Missing openCompanyPolicyModal JS handler"
    assert "handleSaveCompanyPolicy" in html, "Missing handleSaveCompanyPolicy JS handler"
    assert "loadPermissionsMatrix" in html, "Missing loadPermissionsMatrix JS handler"
    assert "savePermissionsMatrix" in html, "Missing savePermissionsMatrix JS handler"
    print("[PASS] Super Admin Dashboard: Permissions matrix, policy modal, and tab-loaders verified successfully.")

    print("\n=== 5. Verifying Enterprise Registration Live API Submission ===")
    status, res = post_json(f"{BASE_URL}/api/auth/register-company", {
        "plan": "Enterprise Global",
        "company_id": "GLOBAL_VERIFY_CORP",
        "company_name": "Global Verify Technologies Corp",
        "industry": "Information Technology",
        "workforce_size": "500 - 2,500 Employees",
        "branches_count": 8,
        "country": "India",
        "timezone": "Asia/Kolkata",
        "admin_name": "Chief Executive Admin",
        "admin_email": "admin@globalverify.com",
        "admin_phone": "9822334455",
        "admin_password": "superSecureEnterprise123!",
        "approver1_name": "HR VP Approver",
        "approver1_email": "approver@globalverify.com",
        "approver1_phone": "9822334456",
        "office_lat": 28.5355,
        "office_lng": 77.3910,
        "office_radius_m": 150,
        "office_subnet": "192.168.10.0/24"
    })
    print(f"API Response: status={status}, result={res}")
    assert status == 200
    assert res.get("ok") is True
    print("[PASS] Enterprise Registration API: Workspace registered and pending activation.")

    print("\n=======================================================")
    print(" ALL LIVE HTTP & RENDERED TEMPLATE VERIFICATIONS PASSED! ")
    print("=======================================================")

if __name__ == "__main__":
    verify_all_rendered_pages()
