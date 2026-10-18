# 🌐 Ardhnarishwar Global SaaS Attendance Platform

**Enterprise Multi-Tenant Global Workforce Attendance & Approval Management Platform**

[![Python 3.10+](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.14-blue.svg)](https://www.python.org/downloads/)
[![Flask 3.0](https://img.shields.io/badge/framework-Flask%203.0-green.svg)](https://flask.palletsprojects.com/)
[![MySQL 8.0](https://img.shields.io/badge/primary%20database-MySQL%208.0-orange.svg)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/fallback%20database-MongoDB%20%2F%20Atlas-brightgreen.svg)](https://www.mongodb.com/)
[![WSGI Production](https://img.shields.io/badge/WSGI-Waitress%20%7C%20Gunicorn-blueviolet.svg)](https://docs.pylonsproject.org/projects/waitress/en/stable/)
[![Docker Ready](https://img.shields.io/badge/deployment-Docker%20%7C%20Compose-blue.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/tests-53%20passed%20%28100%25%29-success.svg)](./tests)

An enterprise-grade, multi-tenant global attendance platform featuring biometric Face AI recognition, cryptographic SHA-256 password salting, office router IP auto-detection, GPS satellite geofencing (Haversine $\le 100\text{m}$), 4 Executive Approvers workflow (P1, P2, P3, P4), full IANA global timezone resolution, and dual-engine persistence (MySQL 8.0 + MongoDB).

---

## 🚀 Quick Launch (1-Click Local & Production)

### 1. Windows (1-Click Production Server)
Double-click `deploy_windows.bat` or run:
```powershell
.\deploy_windows.bat
```
*Automatically validates Python dependencies, checks MySQL80 Windows Service, executes automated test suite, and starts Waitress WSGI on [http://localhost:5000](http://localhost:5000).*

### 2. Docker & Docker Compose (1-Click Containerized Stack)
Double-click `deploy_docker.bat` or run:
```bash
docker compose up --build -d
```
*Spins up the Web application, MySQL 8.0 server, and MongoDB 7.0 server with persistent data volumes.*

### 3. Standard Development Server
```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python run_app.py
```
Navigate to: **[http://localhost:5000](http://localhost:5000)**

---

## 🔑 Default Roles & Access Portals

All workflows and portals run under a unified server on Port 5000:

| Role / Portal | Canonical URL | Default Credentials | Description |
| :--- | :--- | :--- | :--- |
| **Unified Login** | `/login` | N/A | Dynamic single sign-on redirecting to appropriate role dashboard |
| **Super Admin Portal** | `/portal/superadmin` | `superadmin@ardhnarishwar.com` / `superadmin123` | System-wide company registration, analytics, audit logs |
| **Organization Portal** | `/portal/organization` | Registered Company Admin Mobile / Password | Branch management, employee onboarding, live company reports |
| **Employee Portal** | `/portal/employee` | Employee ID / Registered Password | Mark attendance (Face AI + GPS Geofence + Router IP), request leaves |
| **Executive Approvers** | `/portal/approver` | Approver Email (P1–P4) / Password | One-time registered 4 Executive Approvers (WF Home & Sales) |
| **System Health API** | `/health` | Public | Real-time JSON health check for Docker, load balancers, and monitoring |

### Portal Links & Check-In / Check-Out Timings (Oct 2026 update)

| Portal | What was added |
| :--- | :--- |
| **Company Admin Portal** (`/workspace/dashboard`) | **🏛️ Organization Enterprise Portal ↗** button (opens `/portal/organization`; carries `?company_id=` when a Super Admin is viewing a workspace) and a **🕒 Check-In / Check-Out Timings** tab for all employees |
| **Candidate / Employee Portal** (`/employee/portal`) | **🧑‍💼 Employee Self Portal ↗** button (opens `/portal/employee`) and a working daily check-in / check-out table |
| **Super Admin Portal** (`/portal/superadmin?tab=timings`) | **🕒 Check-In / Check-Out (All Companies)** tab — every employee of every company, filter by company / day / status, CSV export |
| **Organization Enterprise Portal** (`/portal/organization`) | **Employee Check-In & Check-Out Timings** panel for all employees of the organization |
| **Employee Self Portal** (`/portal/employee`) | **My Check-In & Check-Out Timings** card (today + last 7 days) |

Each row shows the first check-in, last check-out, hours worked and a shift state: *Checked In (on duty)*, *Checked Out*, *Not Checked In*, *Awaiting Approval*, *Missed Check-Out*, *Missing Check-In*, *On Leave*, *Rejected*. Rejected punches are ignored; "Today" uses each company's own timezone.

APIs (all accept `date=YYYY-MM-DD` or `from=&to=` (max 62 days), `search`, `state`, `emp_id`, `include_absent=false`, `format=csv`):

- `GET /api/superadmin/checkin-checkout` — Super Admin, all companies (optional `company_id`)
- `GET /api/company/checkin-checkout` and `GET /api/organization/checkin-checkout` — Company Admin / HR / Manager, own company only (Super Admin may pass `company_id`)
- `GET /api/employee/daily-records` — employee's own paired timings

---

## 🏗️ Production Architecture & Workflows

```
┌────────────────────────────────────────────────────────┐
│               Employee Mobile / Browser                │
│  - Face AI Camera Capture (OpenCV Liveness)            │
│  - Satellite GPS (Latitude, Longitude)                 │
│  - Browser Client IP Telemetry                         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Ardhnarishwar Backend Gateway               │
│  - Office Router IP Auto-Detection                     │
│  - Geofence Haversine Formula (<= 100m Approved)       │
│  - SHA-256 + Salt Password Verification                │
└───────────────────────────┬────────────────────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│     MySQL 8.0 Primary   │   │    MongoDB Fallback     │
│  - Companies, Employees │   │  - Auto-failover engine │
│  - 4 Executive Approvers│   │  - Atlas Cloud support  │
│  - Attendance & Leaves  │   │  - Mock embedded memory │
└─────────────────────────┘   └─────────────────────────┘
```

### 1. Zero Manual IP Allocation
Employees are **never** given manual IP addresses. When marking attendance via office Wi-Fi, the backend inspects `X-Forwarded-For` or `request.remote_addr` to verify approved corporate subnet ranges automatically.

### 2. High-Precision Geofencing ($\le 100\text{m}$)
- $\text{Distance} \le 100\text{m} \implies \textbf{APPROVED} \text{ (In-Office)}$
- $\text{Distance} > 100\text{m} \implies \textbf{REJECTED} \text{ (Geofence Breach)}$
- Field sales / WF Home employees initiate one-touch requests routed to the 4 Executive Approvers.

### 3. 4 Executive Approvers Workflow
4 designated Executive Approvers (P1, P2, P3, P4) are registered with Name, Gmail, and Mobile number.
When an employee requests Work-From-Home or Sales Field attendance, real-time approval polling synchronizes decisions with the portal.

---

## 🚢 Deployment Strategies

### Option A: Cloud PaaS (Render.com / Railway / Heroku)
1. Fork or push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), create a **New Blueprint Instance**.
3. Render reads `render.yaml` automatically:
   - Sets Python 3.11 runtime.
   - Installs `requirements.txt`.
   - Boots Gunicorn via `wsgi:application`.
   - Attaches `/health` endpoint health checks.
4. Set `MONGO_URI` to your MongoDB Atlas connection string.

### Option B: Linux Cloud VPS (Ubuntu 20.04 / 22.04 / 24.04 LTS)
Run the automated deployment script on your VPS:
```bash
chmod +x deploy_linux.sh
./deploy_linux.sh
```
This script automatically:
- Installs Python 3, venv, libgl1, libglib2.0-0, Nginx.
- Creates Python virtual environment and installs dependencies.
- Generates and enables `/etc/systemd/system/ardhnarishwar-attendance.service`.
- Launches Gunicorn WSGI workers behind Systemd with auto-restart on crash.

### Option C: Windows Server (Waitress WSGI Engine)
```powershell
python run_production.py
```
Waitress delivers native Windows multi-threaded concurrency (8 worker threads) without requiring Linux emulation.

---

## 🧪 Automated Test Suite (53/53 Passed)

To execute all unit, integration, and security tests:
```bash
python -m pytest -v
```

Test coverage includes:
- `test_production_workflow_spec.py`: IP auto-detection, SHA-256 passwords, geofence threshold ($\le 100\text{m}$), 4 Executive Approvers.
- `test_leave_approval_workflow.py`: Leave balances, approval cycles, email notifications.
- `test_anti_spoofing_and_liveness.py`: Biometric liveness check and cascade defenses.
- `test_role_portals_comprehensive.py`: Super Admin, Company Admin, and Employee portal security.
- `test_target_company_registration_fix.py`: Multi-tenant workspace provisioning.

---

## 📄 License
Enterprise Commercial License. © 2026 Ardhnarishwar Global SaaS Attendance Platform. All rights reserved.

## Email OTP Attendance (Updated)

Attendance OTP verification now dispatches the OTP through configured Gmail SMTP to the company's registered authorized HR/Manager/attendance-authority email addresses. See `EMAIL_OTP_ATTENDANCE_WORKFLOW.md` for the complete workflow and SMTP configuration.
