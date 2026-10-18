"""
Ardhnarishwar Global SaaS Attendance Platform — PDF Documentation Generator
Builds a high-impact, comprehensive architectural and workflow specification PDF.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y' on all pages."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Don't draw running header on cover page (page 1)
        if self._pageNumber > 1:
            # Running Header
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(40, 755, 572, 755)
            self.drawString(40, 760, "ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM • WORKFLOW & ARCHITECTURE SPECIFICATION")
            self.drawRightString(572, 760, "CONFIDENTIAL & PROPRIETARY")

        # Running Footer on all pages
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(40, 42, 572, 42)
        self.drawString(40, 30, "Ardhnarishwar Global Enterprise SaaS Engine v2.4 (2026) • Single-URL Architecture")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 30, page_str)
        self.restoreState()


def build_pdf(filename="Ardhnarishwar_Global_Attendance_Platform_Workflow_and_Architecture_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0F172A")    # Deep Navy
    SECONDARY = colors.HexColor("#1E293B")  # Slate 800
    ACCENT_INDIGO = colors.HexColor("#4338CA") # Deep Indigo
    ACCENT_CYAN = colors.HexColor("#0284C7")   # Deep Cyan
    EMERALD = colors.HexColor("#047857")       # Emerald Green
    AMBER = colors.HexColor("#B45309")         # Amber
    MUTED = colors.HexColor("#475569")         # Slate 600
    BG_CARD = colors.HexColor("#F8FAFC")       # Ultra Light Gray
    BORDER = colors.HexColor("#CBD5E1")        # Slate 300

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=ACCENT_INDIGO,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=ACCENT_INDIGO,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.2,
        leading=13.2,
        textColor=SECONDARY,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=SECONDARY,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
        textColor=PRIMARY
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11,
        textColor=SECONDARY
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=11,
        textColor=PRIMARY
    )

    story = []

    # ══════════════════════════════════════════════════════════════════════════
    #  COVER / HERO HEADER
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM", title_style))
    story.append(Paragraph("Enterprise SaaS System Architecture, Multi-Tenant Workflows & Operational Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT_INDIGO, spaceBefore=2, spaceAfter=12))

    # Executive Metadata Box
    meta_data = [
        [
            Paragraph("<b>Target Host / URL:</b> http://localhost:5000 (Single URL Entrypoint)", table_cell_style),
            Paragraph("<b>Release Version:</b> v2.4.0 Global SaaS Production", table_cell_style)
        ],
        [
            Paragraph("<b>Core Backend:</b> Python 3.14 + Flask + Waitress/Gunicorn", table_cell_style),
            Paragraph("<b>Active Database:</b> MySQL 8.0 Dual-Mode Engine (High-Availability)", table_cell_style)
        ],
        [
            Paragraph("<b>Biometrics & AI:</b> 128-d Face Embeddings + Anti-Spoof Liveness", table_cell_style),
            Paragraph("<b>Security:</b> 30-Day Persistent JWT + 60-Day Refresh Rotation", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[266, 266])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_CARD),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 1: EXECUTIVE SUMMARY & PLATFORM IDENTITY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Executive Summary & Platform Identity", h1_style))
    story.append(Paragraph(
        "The <b>Ardhnarishwar Global Attendance Management System</b> is a mission-critical, enterprise-grade "
        "SaaS solution engineered to address multi-tenant, distributed, and hybrid workforce management. "
        "Unlike conventional attendance systems that require separate mobile apps, third-party hardware, or distinct "
        "URLs for disparate administrative departments, Ardhnarishwar runs on a unified, single URL entrypoint "
        "(<code>http://localhost:5000</code>). It seamlessly serves modern glassmorphic web dashboards, native camera "
        "biometrics, real-time geofencing, IP verification rules, and automated approval chains.",
        body_style
    ))
    story.append(Paragraph(
        "The platform natively supports five distinct attendance methods: <b>Biometric Facial Recognition with Active 3D Liveness Challenges</b>, "
        "<b>Work From Office (WFO) Geofencing and Wi-Fi IP Subnet Verification</b>, <b>Work From Home (WFH) Static IP and Dynamic ISP Fallback</b>, "
        "<b>High-Precision Anti-Mock Sales Field Tracking</b>, and an <b>Executive 4-Member Approval Authority with OTP Fallback</b>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 2: THE SINGLE-URL ARCHITECTURE & UNIFIED ROUTING
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. The Single-URL Unified Portal Architecture", h1_style))
    story.append(Paragraph(
        "A cornerstone engineering achievement of the platform is its <b>Unified Dynamic URL Router</b>. "
        "All end users—regardless of organizational hierarchy—access the platform through one URL: <b><code>/dashboard</code></b> "
        "(or root <b><code>/</code></b>). The server extracts the authenticated session or persistent JWT token, resolves the user's role "
        "and company workspace, and dynamically dispatches the appropriate responsive UI portal without requiring distinct subdomains or ports.",
        body_style
    ))

    url_table_data = [
        [Paragraph("Path / Route", table_header_style), Paragraph("Target Role & Description", table_header_style), Paragraph("Resolved View / Portal", table_header_style)],
        [Paragraph("<code>/</code> or <code>/login</code>", table_cell_bold), Paragraph("Public / Unauthenticated users. Complete sign-in with email/phone & password. Auto-redirects if already logged in.", table_cell_style), Paragraph("Unified Login Portal (<code>login.html</code>)", table_cell_style)],
        [Paragraph("<code>/dashboard</code>", table_cell_bold), Paragraph("<b>Master Unified URL:</b> Dynamically evaluates session role and renders dedicated dashboard in place.", table_cell_style), Paragraph("Role-Aware Dynamic Dispatch", table_cell_style)],
        [Paragraph("<code>/admin/dashboard</code>", table_cell_bold), Paragraph("<b>Super Admin Portal:</b> Global tenant monitoring, company approvals, immutable audit logs, system config.", table_cell_style), Paragraph("Global SaaS Command (<code>super_admin.html</code>)", table_cell_style)],
        [Paragraph("<code>/portal/organization</code>", table_cell_bold), Paragraph("<b>Company Admin & HR:</b> Department, branch, shift, employee, policy, and 4-member authority management.", table_cell_style), Paragraph("Enterprise Workspace (<code>portal_organization.html</code>)", table_cell_style)],
        [Paragraph("<code>/portal/employee</code>", table_cell_bold), Paragraph("<b>Employee Self-Service:</b> Facial check-in, WFO/WFH/Field punch, leave application, correction logs.", table_cell_style), Paragraph("Employee Portal (<code>portal_employee.html</code>)", table_cell_style)],
        [Paragraph("<code>/register</code>", table_cell_bold), Paragraph("<b>Self-Registration:</b> Employee onboarding into an approved company with facial enrollment.", table_cell_style), Paragraph("Registration Screen (<code>register.html</code>)", table_cell_style)],
        [Paragraph("<code>/status</code>", table_cell_bold), Paragraph("<b>Tracker:</b> Track approval status of employee registrations, leave requests, and IP changes.", table_cell_style), Paragraph("Status Tracker (<code>register.html#status</code>)", table_cell_style)],
        [Paragraph("<code>/api/ip-info</code>", table_cell_bold), Paragraph("<b>Network Diagnostics:</b> Returns real public/private client IP and evaluations against office Wi-Fi rules.", table_cell_style), Paragraph("JSON Network Telemetry", table_cell_style)],
        [Paragraph("<code>/health</code>", table_cell_bold), Paragraph("<b>System Health Check:</b> Real-time database status, UTC timestamp, environment telemetry.", table_cell_style), Paragraph("JSON Health Status", table_cell_style)]
    ]
    url_table = Table(url_table_data, colWidths=[120, 240, 172])
    url_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_CARD]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(url_table)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 3: SYSTEM ROLES & ACCESS HIERARCHY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. System Roles & Multi-Tenant Access Control", h1_style))
    story.append(Paragraph(
        "Security in Ardhnarishwar is enforced via strict, server-side route guards, persistent HTTP-only JWTs, "
        "and company workspace tenant isolation. All database operations strictly filter by <code>company_id</code>.",
        body_style
    ))

    roles_data = [
        [Paragraph("Role", table_header_style), Paragraph("Authority Level", table_header_style), Paragraph("Key Permissions & Scope", table_header_style)],
        [Paragraph("<b>Super Admin</b>", table_cell_bold), Paragraph("Platform Owner (Global)", table_cell_style), Paragraph("Approve/suspend company workspaces; inspect global attendance; configure global platform policies; review immutable audit trail across all tenants.", table_cell_style)],
        [Paragraph("<b>Company Admin</b>", table_cell_bold), Paragraph("Tenant Workspace Master", table_cell_style), Paragraph("Manage company departments, branches (GPS coords & radius), shifts, attendance rules, configure the 4 designated approvers, approve new employees.", table_cell_style)],
        [Paragraph("<b>Designated Approver</b>", table_cell_bold), Paragraph("Executive Authority (4 Quorum)", table_cell_style), Paragraph("One of 4 designated authorities per tenant with power to approve OTP attendance punches, leave applications, attendance corrections, and WFH IP changes.", table_cell_style)],
        [Paragraph("<b>HR / Manager</b>", table_cell_bold), Paragraph("Operational Manager", table_cell_style), Paragraph("View company muster roll, departmental attendance analytics, generate payroll summaries, review shift assignments, initial review of leave requests.", table_cell_style)],
        [Paragraph("<b>Employee</b>", table_cell_bold), Paragraph("End-User Workforce", table_cell_style), Paragraph("Clock-in/out via facial recognition, WFO Wi-Fi, WFH static IP, or Field GPS; apply for leaves; submit attendance correction requests; view personal logs.", table_cell_style)]
    ]
    roles_table = Table(roles_data, colWidths=[100, 130, 302])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT_INDIGO),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_CARD]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(roles_table)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 4: THE 5 CORE ATTENDANCE WORKFLOWS (STEP-BY-STEP)
    # ══════════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("4. The 5 Core Attendance Workflows (Step-by-Step)", h1_style))
    story.append(Paragraph(
        "Ardhnarishwar eliminates attendance fraud (buddy punching, GPS spoofing, proxy check-ins) by combining "
        "multiple cryptographic, biometric, and network verification layers:",
        body_style
    ))

    # Workflow 1
    story.append(Paragraph("Workflow 1: Biometric Face Recognition with Active 3D Liveness Detection", h2_style))
    story.append(Paragraph("<b>Primary Use Case:</b> Ultra-secure, touchless biometric check-in for on-premise and remote staff.", body_style))
    story.append(Paragraph("<b>Step 1: Ephemeral Challenge Issuance:</b> The client initiates a check-in request. The server generates a random, cryptographically signed liveness challenge (<code>BLINK</code>, <code>TURN_LEFT</code>, <code>TURN_RIGHT</code>, or <code>SMILE</code>) accompanied by a single-use nonce with a strict 60-second Time-To-Live (TTL).", bullet_style))
    story.append(Paragraph("<b>Step 2: Interactive Camera Execution:</b> The employee performs the instructed gesture in real-time. The browser captures live video frames and biometric metadata.", bullet_style))
    story.append(Paragraph("<b>Step 3: Anti-Spoofing & Virtual Camera Verification:</b> The backend inspects video frames for virtual camera emulators (e.g. OBS VirtualCam, ManyCam), photo printouts, screen replays, and frame-rate tampering.", bullet_style))
    story.append(Paragraph("<b>Step 4: Vector Matching & Atomic Session Invalidation:</b> OpenCV extracts the 128-dimensional facial feature vector and computes the Euclidean distance against the enrolled biometric template (tolerance ≤ 0.50). Concurrently, the liveness token is atomically consumed to defeat replay attacks.", bullet_style))
    story.append(Paragraph("<b>Step 5: Event Recording:</b> Attendance record is logged with UTC timestamp, match confidence score, camera metadata, and check-in type (IN/OUT).", bullet_style))
    story.append(Spacer(1, 8))

    # Workflow 2
    story.append(Paragraph("Workflow 2: Work From Office (WFO) Geofencing & Wi-Fi IP Subnet Rules", h2_style))
    story.append(Paragraph("<b>Primary Use Case:</b> Mandatory on-premise attendance verification for corporate offices and factory branches.", body_style))
    story.append(Paragraph("<b>Rule 1 - Geofence Calculation:</b> Device coordinates (latitude, longitude) are compared against the registered branch office coordinates using the Haversine spherical distance formula. The distance must be within the configured office perimeter (default: 50m to 100m).", bullet_style))
    story.append(Paragraph("<b>Rule 2 - Wi-Fi / IP Subnet Verification:</b> The client's originating IP is extracted via <code>X-Forwarded-For</code>, <code>X-Real-IP</code>, or direct socket connection. The IP is checked against the company's authorized office IP or CIDR block (e.g., <code>192.168.29.0/24</code> or corporate gateway static IP).", bullet_style))
    story.append(Paragraph("<b>Outcome:</b> If both GPS geofence AND IP subnet match, check-in is instantly verified as <code>PRESENT (WFO)</code>. If either condition fails, the request is rejected with a clear diagnostic explanation.", bullet_style))
    story.append(Spacer(1, 8))

    # Workflow 3
    story.append(Paragraph("Workflow 3: Work From Home (WFH) & Dynamic ISP Rotation Fallback", h2_style))
    story.append(Paragraph("<b>Primary Use Case:</b> Secure remote work compliance without sacrificing employee flexibility.", body_style))
    story.append(Paragraph("<b>Step 1 - Home Base Perimeter:</b> Employee onboards with registered residential coordinates. Check-in requires GPS proximity within 200 meters of the registered home base.", bullet_style))
    story.append(Paragraph("<b>Step 2 - Static IP Verification:</b> Originating IP is matched against the employee's assigned static home IP registered during onboarding.", bullet_style))
    story.append(Paragraph("<b>Step 3 - Dynamic ISP Rotation Fallback:</b> In developing markets where consumer broadband rotates public IPs daily, the employee is blocked from direct punch but can submit an <b>Instant IP Change Request</b> directly from the portal.", bullet_style))
    story.append(Paragraph("<b>Step 4 - 4-Member Authority Sign-off:</b> The request appears in the organization approver queue. Any designated approver reviews the new ISP gateway and approves with one click, updating the employee's assigned IP.", bullet_style))
    story.append(Spacer(1, 8))

    # Workflow 4
    story.append(Paragraph("Workflow 4: Sales Field & Client Meeting Attendance Tracker", h2_style))
    story.append(Paragraph("<b>Primary Use Case:</b> On-the-road sales executives, site engineers, and field technicians visiting multiple clients.", body_style))
    story.append(Paragraph("<b>Anti-Mock GPS Engine:</b> The client verifies device sensor telemetry and rejects Android/iOS Mock Location flags or simulated GPS injections.", bullet_style))
    story.append(Paragraph("<b>Client Visit Logging:</b> When checking in from the field, the employee enters the Client Name, Meeting Purpose, and Notes. The system geotags the exact street address, coordinates, and timestamp into an immutable visit log.", bullet_style))
    story.append(Spacer(1, 8))

    # Workflow 5
    story.append(Paragraph("Workflow 5: 4-Member Approval Authority & OTP Attendance Fallback", h2_style))
    story.append(Paragraph("<b>Primary Use Case:</b> Failsafe check-in when an employee has hardware camera defects, low lighting, or connectivity issues.", body_style))
    story.append(Paragraph("<b>Step 1:</b> Employee requests an emergency OTP check-in. The system records an attendance event in <code>PENDING_APPROVAL</code> status.", bullet_style))
    story.append(Paragraph("<b>Step 2:</b> An alert is dispatched to the tenant's designated 4-member executive authority quorum.", bullet_style))
    story.append(Paragraph("<b>Step 3:</b> Any designated approver logs into the Organization Portal, reviews the timestamp and rationale, and clicks <b>Approve</b>. Status converts to <code>APPROVED</code> with the approver's identity and timestamp recorded.", bullet_style))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 5: THE 4-MEMBER DESIGNATED APPROVAL AUTHORITY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. The 4-Member Executive Approval Authority Engine", h1_style))
    story.append(Paragraph(
        "To prevent bottlenecks while preventing unauthorized overrides, Ardhnarishwar enforces a strict "
        "<b>4-Member Designated Approval Authority</b> model for every corporate workspace. "
        "Organizations configure up to 4 high-trust executive approvers (e.g. Managing Director, HR Head, Operations Director, Plant Head).",
        body_style
    ))

    approver_rules = [
        [Paragraph("Feature / Rule", table_header_style), Paragraph("Specification & Architectural Enforcement", table_header_style)],
        [Paragraph("<b>Strict 4-Member Quorum</b>", table_cell_bold), Paragraph("A company workspace can have at most 4 active designated approvers. Attempting to add a 5th is blocked by the API.", table_cell_style)],
        [Paragraph("<b>Unified Jurisdiction</b>", table_cell_bold), Paragraph("Designated approvers hold enterprise-wide authority over OTP attendance punches, leave requests, attendance regularizations, and WFH IP rotation requests.", table_cell_style)],
        [Paragraph("<b>Audit Trail Signing</b>", table_cell_bold), Paragraph("When an approval or rejection is executed, the approver's full name, email, IP address, and UTC timestamp are immutably signed to the record.", table_cell_style)],
        [Paragraph("<b>Self-Approval Prevention</b>", table_cell_bold), Paragraph("An approver cannot approve their own personal leave or attendance corrections; another member of the 4-person quorum must approve.", table_cell_style)]
    ]
    approver_table = Table(approver_rules, colWidths=[150, 382])
    approver_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_CARD]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(approver_table)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 6: LEAVE MANAGEMENT & ATTENDANCE CORRECTION
    # ══════════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("6. Leave Management & Attendance Regularization Workflow", h1_style))
    story.append(Paragraph(
        "Employees can submit leave applications and attendance correction requests directly from their portal. "
        "The system calculates working day impact, checks policy balances, and updates the muster roll upon approval.",
        body_style
    ))

    story.append(Paragraph("Leave Application & Approval Lifecycle:", h2_style))
    story.append(Paragraph("1. <b>Application:</b> Employee selects Leave Type (Casual, Sick, Privilege, Maternity, Compensatory), Start Date, End Date, and Reason.", bullet_style))
    story.append(Paragraph("2. <b>Validation:</b> System verifies date ranges, ensures no overlapping active leaves, and logs state as <code>PENDING</code>.", bullet_style))
    story.append(Paragraph("3. <b>Review & Decision:</b> Designated approver reviews the application in the Organization Portal. Clicking <b>Approve</b> or <b>Reject</b> updates the record.", bullet_style))
    story.append(Paragraph("4. <b>Muster Roll Sync:</b> Approved leave dates automatically mark the employee as <code>ON_LEAVE</code> in daily attendance calculations, avoiding false absence marks.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Attendance Regularization / Correction Workflow:", h2_style))
    story.append(Paragraph("1. <b>Submission:</b> If an employee forgets to clock out or experiences network failure, they submit a correction request detailing the target date, actual in/out times, and justification.", bullet_style))
    story.append(Paragraph("2. <b>Audit Review:</b> Approvers inspect the original punch record, IP diagnostics, and justification.", bullet_style))
    story.append(Paragraph("3. <b>Override:</b> Upon approval, the primary attendance record is updated with corrected hours, and the correction log is sealed with an audit trail.", bullet_style))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 7: DATABASE ARCHITECTURE & HIGH AVAILABILITY DUAL-MODE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Database Architecture & High-Availability Dual-Mode", h1_style))
    story.append(Paragraph(
        "To ensure 100% platform availability across both local developer workstations and enterprise production clouds, "
        "Ardhnarishwar incorporates a proprietary <b>Dual-Mode Enterprise Database Engine</b>:",
        body_style
    ))

    db_data = [
        [Paragraph("Engine Mode", table_header_style), Paragraph("Architecture & Storage Details", table_header_style), Paragraph("Operational SLA", table_header_style)],
        [
            Paragraph("<b>Native MySQL 8.0</b><br/>(Primary Live Mode)", table_cell_bold),
            Paragraph("Stores data across 17 structured relational tables (<code>companies</code>, <code>users</code>, <code>employees</code>, <code>attendance</code>, <code>branches</code>, <code>leaves</code>, <code>audit_logs</code>, etc.). Optimized with B-Tree indexes on <code>company_id</code>, <code>emp_id</code>, and UTC dates.", table_cell_style),
            Paragraph("Enterprise Production persistence with full ACID compliance & relational integrity.", table_cell_style)
        ],
        [
            Paragraph("<b>Embedded Dual-Mode</b><br/>(Automated Fallback)", table_cell_bold),
            Paragraph("If the local MySQL Windows Service (MySQL80) is stopped or offline, the platform automatically falls back to an embedded in-memory dual-mode engine with sub-second zero-downtime detection. Zero crashes, zero downtime.", table_cell_style),
            Paragraph("100% Platform Uptime guarantee for demos, development, and offline deployments.", table_cell_style)
        ]
    ]
    db_table = Table(db_data, colWidths=[120, 262, 150])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_CARD]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(db_table)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 8: CORE API ENDPOINTS DIRECTORY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("8. Core REST API Endpoints Directory", h1_style))
    story.append(Paragraph(
        "The backend exposes clean, structured JSON REST APIs powering both the web interfaces and mobile integration:",
        body_style
    ))

    api_data = [
        [Paragraph("HTTP Method & Endpoint", table_header_style), Paragraph("Category", table_header_style), Paragraph("Description & Output", table_header_style)],
        [Paragraph("<code>POST /api/login</code>", table_cell_bold), Paragraph("Authentication", table_cell_style), Paragraph("Authenticates Super Admin, Company Admin, or Employee; returns persistent JWT, refresh token, and user profile.", table_cell_style)],
        [Paragraph("<code>GET /api/me</code>", table_cell_bold), Paragraph("Authentication", table_cell_style), Paragraph("Validates active token/session and returns authenticated user identity.", table_cell_style)],
        [Paragraph("<code>POST /api/attendance/workmode-checkin</code>", table_cell_bold), Paragraph("Attendance", table_cell_style), Paragraph("Core punch engine verifying WFO, WFH, or Field conditions with GPS, IP, and biometric parameters.", table_cell_style)],
        [Paragraph("<code>GET /api/attendance/liveness-challenge</code>", table_cell_bold), Paragraph("Biometrics", table_cell_style), Paragraph("Generates random single-use liveness challenge with 60-second TTL.", table_cell_style)],
        [Paragraph("<code>POST /api/attendance/quick-punch</code>", table_cell_bold), Paragraph("Attendance", table_cell_style), Paragraph("One-click punch for verified employees with automatic status calculation.", table_cell_style)],
        [Paragraph("<code>GET /api/organization/approvers</code>", table_cell_bold), Paragraph("Approvals", table_cell_style), Paragraph("Returns current 4-member designated approval authority team for company.", table_cell_style)],
        [Paragraph("<code>POST /api/organization/approvers</code>", table_cell_bold), Paragraph("Approvals", table_cell_style), Paragraph("Configures designated approver quorum (max 4 members enforced).", table_cell_style)],
        [Paragraph("<code>POST /api/leaves/apply</code>", table_cell_bold), Paragraph("Leaves", table_cell_style), Paragraph("Submits employee leave application into approval queue.", table_cell_style)],
        [Paragraph("<code>POST /api/approver/action</code>", table_cell_bold), Paragraph("Approvals", table_cell_style), Paragraph("Designated approver signs off (APPROVE/REJECT) on leave, correction, or IP request.", table_cell_style)],
        [Paragraph("<code>GET /api/ip-info</code>", table_cell_bold), Paragraph("Diagnostics", table_cell_style), Paragraph("Returns real client IP, proxy headers, office Wi-Fi match status, and explanations.", table_cell_style)],
        [Paragraph("<code>GET /health</code>", table_cell_bold), Paragraph("System", table_cell_style), Paragraph("Production health check endpoint verifying database connectivity and UTC time.", table_cell_style)]
    ]
    api_table = Table(api_data, colWidths=[150, 95, 287])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_CARD]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(api_table)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 9: OPERATIONS & STEP-BY-STEP USER RUNBOOK
    # ══════════════════════════════════════════════════════════════════════════
    story.append(PageBreak())
    story.append(Paragraph("9. Operations & Step-by-Step User Runbook", h1_style))
    story.append(Paragraph(
        "This section outlines standard procedures for day-to-day operation, server launching, and troubleshooting.",
        body_style
    ))

    story.append(Paragraph("Procedure 1: Starting the Platform on a Single URL", h2_style))
    story.append(Paragraph("• Double-click <b><code>run_app.bat</code></b> or execute <b><code>python run_app.py</code></b> in terminal.", bullet_style))
    story.append(Paragraph("• The platform boots instantly, seeds default accounts, verifies database connectivity, and binds to <b><code>http://localhost:5000</code></b>.", bullet_style))
    story.append(Paragraph("• The default web browser automatically launches to <code>http://localhost:5000/dashboard</code>.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Procedure 2: Administering via Super Admin Portal", h2_style))
    story.append(Paragraph("• Visit <code>http://localhost:5000/login</code> and enter credentials: <b><code>superadmin@ardhnarishwar.com</code></b> / <b><code>superadmin123</code></b>.", bullet_style))
    story.append(Paragraph("• You are automatically redirected to <b><code>/admin/dashboard</code></b>.", bullet_style))
    story.append(Paragraph("• Review pending company workspace registrations, inspect tenant audit logs, toggle global feature switches, and inspect global analytics.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Procedure 3: Managing a Company Workspace", h2_style))
    story.append(Paragraph("• Sign in as a Company Admin (or register a new company via <code>/register-company</code>).", bullet_style))
    story.append(Paragraph("• Access <b><code>/portal/organization</code></b>.", bullet_style))
    story.append(Paragraph("• Step 1: Configure branches with latitude, longitude, and geofence radius.", bullet_style))
    story.append(Paragraph("• Step 2: Configure shift schedules (e.g. Morning 09:00 - 18:00 with grace periods).", bullet_style))
    story.append(Paragraph("• Step 3: Designate the 4-member executive approval authority quorum.", bullet_style))
    story.append(Paragraph("• Step 4: Register or approve employees and set their workforce mode (WFO, WFH, Sales Field).", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Procedure 4: Employee Daily Check-In Experience", h2_style))
    story.append(Paragraph("• Employee opens <code>http://localhost:5000/dashboard</code> on smartphone, tablet, or PC.", bullet_style))
    story.append(Paragraph("• System auto-detects assigned work mode. Employee taps <b>Punch In</b>.", bullet_style))
    story.append(Paragraph("• For face punch: camera opens, performs interactive challenge (e.g. smile or blink), verifies identity in under 1 second.", bullet_style))
    story.append(Paragraph("• Success toast confirms check-in time and updates daily timer and shift status.", bullet_style))

    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    #  SECTION 10: TROUBLESHOOTING & FREQUENTLY ASKED QUESTIONS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("10. Troubleshooting & Technical FAQ", h1_style))

    faq_data = [
        [Paragraph("Question / Issue", table_header_style), Paragraph("Diagnostic Cause & Recommended Action", table_header_style)],
        [
            Paragraph("<b>MySQL Service is Stopped</b>", table_cell_bold),
            Paragraph("The platform is designed with 100% resilience. If the Windows Service 'MySQL80' is stopped, the platform automatically operates in Dual-Mode embedded storage with zero downtime. To activate live persistent MySQL tables, run <code>start_mysql.bat</code> with administrator privileges.", table_cell_style)
        ],
        [
            Paragraph("<b>WFO Attendance: 'Wi-Fi IP Mismatch'</b>", table_cell_bold),
            Paragraph("The employee's network gateway IP does not match the office IP configured in the Organization Profile. Visit <code>http://localhost:5000/api/ip-info</code> to see the employee's current detected IP. Ensure the corporate router's public static IP or office subnet (e.g. 192.168.29.0/24) is saved in the company's Office Wi-Fi settings.", table_cell_style)
        ],
        [
            Paragraph("<b>WFH Attendance: 'Outside Home Perimeter'</b>", table_cell_bold),
            Paragraph("The employee is further than 200m from their registered home GPS location. Have the employee update their location coordinates or request temporary Sales Field / OTP authorization.", table_cell_style)
        ],
        [
            Paragraph("<b>Session Expiry / Logout Behavior</b>", table_cell_bold),
            Paragraph("The platform employs 30-day persistent authentication. If cookies are cleared or a browser private window is opened, the user must re-enter credentials at <code>/login</code>, after which they are redirected back to their previous page.", table_cell_style)
        ]
    ]
    faq_table = Table(faq_data, colWidths=[150, 382])
    faq_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_CARD]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(faq_table)
    story.append(Spacer(1, 18))

    # Concluding Signature Block
    story.append(Paragraph("<b>Document Certification & Authority:</b>", body_style))
    story.append(Paragraph(
        "This specification is certified for the Ardhnarishwar Global SaaS Attendance Management Platform (Release v2.4). "
        "All workflows, security policies, algorithms, and endpoints documented herein correspond directly to the production code "
        "deployed at <code>http://localhost:5000</code>.",
        ParagraphStyle('CertText', parent=body_style, fontSize=8.5, fontName='Helvetica-Oblique', textColor=MUTED)
    ))

    # Build the document using the NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Successfully generated comprehensive PDF: {filename}")


if __name__ == "__main__":
    out_pdf = "Ardhnarishwar_Global_Attendance_Platform_Workflow_and_Architecture_Guide.pdf"
    build_pdf(out_pdf)
