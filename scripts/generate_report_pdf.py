import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and display total page count.
    """
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
        self.setFillColor(colors.HexColor("#64748b"))

        # Running header (on pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 810, "EcoPartnerHub — Week 1 Milestone Report (Authentication & RBAC)")
            self.drawRightString(559, 810, "Auth & Role Management")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 804, 559, 804)

        # Running footer
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 38, 559, 38)
        self.drawString(36, 26, "EcoPartnerHub © 2026 • Confidential Engineering Submission • Commit d350e77")
        self.drawRightString(559, 26, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46,
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2,
    )

    table_header = ParagraphStyle(
        "TH_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
    )

    table_cell = ParagraphStyle(
        "TD_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1e293b"),
    )

    table_cell_bold = ParagraphStyle(
        "TD_Bold",
        parent=table_cell,
        fontName="Helvetica-Bold",
    )

    table_cell_code = ParagraphStyle(
        "TD_Code",
        parent=table_cell,
        fontName="Courier",
        fontSize=7,
        leading=8.5,
    )

    badge_pass = ParagraphStyle(
        "Badge_Pass",
        parent=table_cell,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#166534"),
    )

    story = []

    # Title & Header
    header_data = [
        [
            Paragraph("<b>EcoPartnerHub Engineering</b><br/><font size='18'><b>Week 1 Milestone Report</b></font><br/><font color='#475569' size='9.5'>Authentication, Registration &amp; Role-Based Access Control Architecture</font>", title_style),
            Paragraph("<para align='right'><font color='#047857' size='10'><b>[✓ 100% VERIFIED]</b></font><br/><font color='#64748b' size='8'>23/23 Tests Passing<br/>Milestone Complete</font></para>", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 143])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#059669"), spaceBefore=2, spaceAfter=8))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>MODULE:</b> Authentication, Registration &amp; Role Management", body_style),
            Paragraph("<b>GIT BRANCH:</b> feature/akshay-auth...", body_style),
            Paragraph("<b>DATABASE:</b> Neon PostgreSQL", body_style),
            Paragraph("<b>FRAMEWORK:</b> Next.js 16 + Prisma", body_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[130, 131, 131, 131])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(Paragraph(
        "This submission fulfills all Week 1 backend and frontend foundation tasks for the Auth &amp; Role Management module of <b>EcoPartnerHub</b>. "
        "The architecture establishes a production-ready authentication foundation, multi-tier Role-Based Access Control (RBAC), "
        "session invalidation guards, standard Postman test artifacts, and verified Next.js client pages.",
        body_style
    ))
    story.append(Paragraph("• <b>Prisma Schema &amp; PostgreSQL:</b> Configured core entities (User, CustomerProfile, ProviderProfile, PasswordResetToken, AdminInvite, AuditLog) with Role &amp; AccountStatus enums deployed to Neon Cloud DB.", bullet_style))
    story.append(Paragraph("• <b>API Implementation:</b> Deployed 18+ endpoint routes for customer/provider registration, login, logout, password reset, profile management, and role-segregated dashboard telemetry.", bullet_style))
    story.append(Paragraph("• <b>RBAC Guard &amp; Session Invalidation:</b> Created centralized <code>authenticateRequest</code> middleware checking token format, signature, database user existence, account status, and <code>tokenVersion</code> for instant revocation.", bullet_style))
    story.append(Paragraph("• <b>Automated Test Matrix:</b> 23/23 end-to-end test scenarios executed against the production server and Neon DB with <b>100% pass rate</b>.", bullet_style))
    story.append(Paragraph("• <b>Postman Collection &amp; UI:</b> Delivered exportable Postman v2.1.0 collection/environment files along with responsive <code>/login</code>, <code>/register</code>, and <code>/dashboard</code> Next.js 16 pages.", bullet_style))

    story.append(Spacer(1, 10))

    # 2. Deliverables Checklist Table
    story.append(Paragraph("2. Deliverables Checklist &amp; Implementation Artifacts", h1_style))
    deliv_data = [
        [Paragraph("Deliverable Component", table_header), Paragraph("Target Requirement", table_header), Paragraph("Status", table_header), Paragraph("Artifact / Implementation Path", table_header)],
        [Paragraph("<b>Prisma Auth Schema</b>", table_cell), Paragraph("4 Roles, Status, AuditLog", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>prisma/schema.prisma</code> (Neon DB)", table_cell_code)],
        [Paragraph("<b>Super Admin Seed</b>", table_cell), Paragraph("Controlled initial setup", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>prisma/seed.mjs</code> (Bcrypt hashed)", table_cell_code)],
        [Paragraph("<b>Customer Registration API</b>", table_cell), Paragraph("201 Created &amp; JWT", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/auth/register/customer</code>", table_cell_code)],
        [Paragraph("<b>Provider Registration API</b>", table_cell), Paragraph("201 Created &amp; Profile", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/auth/register/provider</code>", table_cell_code)],
        [Paragraph("<b>Duplicate Email / Phone</b>", table_cell), Paragraph("409 Conflict rejection", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("Collision detection &amp; normalization", table_cell_code)],
        [Paragraph("<b>Login &amp; Password Validation</b>", table_cell), Paragraph("200 OK / 401 Unauthorized", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/auth/login</code> (Bcrypt 10 rounds)", table_cell_code)],
        [Paragraph("<b>Logout &amp; Invalidation API</b>", table_cell), Paragraph("Immediate token revocation", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/auth/logout</code> (increments tokenVersion)", table_cell_code)],
        [Paragraph("<b>Forgot &amp; Reset Password</b>", table_cell), Paragraph("Cryptographic hex tokens", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/auth/forgot-password</code> &amp; <code>reset</code>", table_cell_code)],
        [Paragraph("<b>User Details Management</b>", table_cell), Paragraph("GET &amp; PATCH profile", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/user/me</code>", table_cell_code)],
        [Paragraph("<b>Account Moderation API</b>", table_cell), Paragraph("Suspend &amp; reactivate users", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/admin/users/[id]/status</code>", table_cell_code)],
        [Paragraph("<b>Super Admin Invites API</b>", table_cell), Paragraph("Create authorized admins", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>/api/super-admin/admins</code>", table_cell_code)],
        [Paragraph("<b>Postman v2.1.0 Collection</b>", table_cell), Paragraph("Tests, scripts, assertions", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>postman/EcoPartnerHub-Auth...</code>", table_cell_code)],
        [Paragraph("<b>Frontend UI Pages</b>", table_cell), Paragraph("Login, Register, Dashboard", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>src/app/login, register, dashboard</code>", table_cell_code)],
        [Paragraph("<b>Automated Test Suite</b>", table_cell), Paragraph("23 matrix test cases", table_cell), Paragraph("<b>✅ Complete</b>", badge_pass), Paragraph("<code>npm run test:auth</code> (100% pass)", table_cell_code)],
    ]
    deliv_table = Table(deliv_data, colWidths=[120, 115, 68, 220])
    deliv_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(deliv_table)

    story.append(Spacer(1, 12))

    # 3. Test Verification Matrix Table
    story.append(Paragraph("3. Automated Test Verification Matrix (Live Neon DB Execution)", h1_style))
    test_matrix_data = [
        [Paragraph("API Test Scenario", table_header), Paragraph("Method", table_header), Paragraph("Expected", table_header), Paragraph("Actual", table_header), Paragraph("Status", table_header)],
        [Paragraph("Customer registration", table_cell), Paragraph("POST", table_cell_bold), Paragraph("201", table_cell), Paragraph("201", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Provider registration", table_cell), Paragraph("POST", table_cell_bold), Paragraph("201", table_cell), Paragraph("201", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Duplicate email collision check", table_cell), Paragraph("POST", table_cell_bold), Paragraph("409", table_cell), Paragraph("409", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Correct login authentication", table_cell), Paragraph("POST", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Incorrect password attempt", table_cell), Paragraph("POST", table_cell_bold), Paragraph("401", table_cell), Paragraph("401", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Get current logged-in user profile", table_cell), Paragraph("GET", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Access without bearer token", table_cell), Paragraph("GET", table_cell_bold), Paragraph("401", table_cell), Paragraph("401", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Customer accesses admin API (RBAC Guard)", table_cell), Paragraph("GET", table_cell_bold), Paragraph("403", table_cell), Paragraph("403", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Provider accesses customer-only API (RBAC Guard)", table_cell), Paragraph("GET", table_cell_bold), Paragraph("403", table_cell), Paragraph("403", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Provider accesses Provider Dashboard", table_cell), Paragraph("GET", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Super Admin platform dashboard access", table_cell), Paragraph("GET", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Super Admin creates Admin account", table_cell), Paragraph("POST", table_cell_bold), Paragraph("201", table_cell), Paragraph("201", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Operations Admin dashboard access", table_cell), Paragraph("GET", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Update user profile information", table_cell), Paragraph("PATCH", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Get user account status", table_cell), Paragraph("GET", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Admin suspends user account", table_cell), Paragraph("PATCH", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Suspended user login attempt blocked", table_cell), Paragraph("POST", table_cell_bold), Paragraph("403", table_cell), Paragraph("403", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Admin reactivates user account", table_cell), Paragraph("PATCH", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Change user password &amp; re-issue JWT", table_cell), Paragraph("POST", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Logout / session invalidation", table_cell), Paragraph("POST", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Access with revoked token blocked", table_cell), Paragraph("GET", table_cell_bold), Paragraph("401", table_cell), Paragraph("401", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Forgot password request (token generated)", table_cell), Paragraph("POST", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
        [Paragraph("Reset password with verification token", table_cell), Paragraph("POST", table_cell_bold), Paragraph("200", table_cell), Paragraph("200", table_cell), Paragraph("✅ PASS", badge_pass)],
    ]
    test_table = Table(test_matrix_data, colWidths=[243, 60, 60, 60, 100])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(test_table)

    summary_banner_data = [
        [Paragraph("<b>TOTAL TESTS: 23 &nbsp;|&nbsp; PASSED: 23 &nbsp;|&nbsp; FAILED: 0 &nbsp;|&nbsp; SUCCESS RATE: 100.0%</b>", badge_pass)]
    ]
    summary_banner = Table(summary_banner_data, colWidths=[523])
    summary_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(Spacer(1, 4))
    story.append(summary_banner)

    story.append(Spacer(1, 10))

    # 4. Security & Architecture Highlights
    story.append(Paragraph("4. Architecture &amp; Security Highlights", h1_style))
    story.append(Paragraph("• <b>Token Invalidation via <code>tokenVersion</code>:</b> Addresses stateless JWT security vulnerabilities. Each user record tracks an integer <code>tokenVersion</code>. Logout or password reset atomically increments this value, instantly invalidating all active tokens without waiting for standard expiration.", bullet_style))
    story.append(Paragraph("• <b>Suspension Shield:</b> When an administrator changes an account to <code>SUSPENDED</code>, the authorization guard immediately rejects active requests with <code>403 Forbidden</code> and blocks subsequent login attempts.", bullet_style))
    story.append(Paragraph("• <b>Password Security:</b> 10-round salted Bcrypt hashing with multi-factor complexity validation requiring uppercase, lowercase, numbers, and symbols.", bullet_style))

    story.append(Spacer(1, 10))

    # 5. Seeded Accounts
    story.append(Paragraph("5. Pre-Seeded Verification Accounts (Neon DB)", h1_style))
    seed_data = [
        [Paragraph("Role", table_header), Paragraph("Email Identifier", table_header), Paragraph("Default Password", table_header), Paragraph("Assigned Access Scope", table_header)],
        [Paragraph("<b>SUPER_ADMIN</b>", table_cell), Paragraph("<code>superadmin@ecopartnerhub.com</code>", table_cell_code), Paragraph("<code>SuperAdmin@2026</code>", table_cell_code), Paragraph("Full platform governance &amp; admin provisioning", table_cell)],
        [Paragraph("<b>ADMIN</b>", table_cell), Paragraph("<code>admin@ecopartnerhub.com</code>", table_cell_code), Paragraph("<code>AdminUser@2026</code>", table_cell_code), Paragraph("Operations panel, moderation, user suspend/reactivate", table_cell)],
        [Paragraph("<b>CUSTOMER</b>", table_cell), Paragraph("<code>customer@ecopartnerhub.com</code>", table_cell_code), Paragraph("<code>Customer@2026</code>", table_cell_code), Paragraph("Discovery, enquiry lifecycle, customer dashboard", table_cell)],
        [Paragraph("<b>PROVIDER</b>", table_cell), Paragraph("<code>provider@ecopartnerhub.com</code>", table_cell_code), Paragraph("<code>Provider@2026</code>", table_cell_code), Paragraph("Logistics management, provider dashboard", table_cell)],
    ]
    seed_table = Table(seed_data, colWidths=[90, 160, 110, 163])
    seed_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(seed_table)

    story.append(Spacer(1, 10))

    # 6. How to Run
    story.append(Paragraph("6. Local Commands &amp; Quality Gates", h1_style))
    story.append(Paragraph("<code>npm test</code> — Executes full PR CI gate: TypeScript check, ESLint code quality, and Next.js production build.<br/>"
                           "<code>npm run test:auth</code> — Executes automated 23-test API verification suite against live server and Neon DB.<br/>"
                           "<code>npm run dev</code> — Starts local development server at <b>http://localhost:3000</b> (UI available at <code>/login</code>, <code>/register</code>, <code>/dashboard</code>).", body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Successfully compiled PDF report: {filename} ({os.path.getsize(filename)} bytes)")

if __name__ == "__main__":
    output_pdf = r"c:\Users\Akshay\EcoPartnerHub\Week-1-Auth-Role-Management-Report.pdf"
    build_pdf(output_pdf)
