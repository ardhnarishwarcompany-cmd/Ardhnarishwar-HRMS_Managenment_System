import express from "express";
import cors from "cors";

import { errorMiddleware } from "./middleware/error.middleware.js";
import checkPortalStatus from "./middleware/checkPortalStatus.js";

// API Gateway — unified backend: proxies EVS / HR Robo / Smart Attendance
import { mountGateway } from "./modules/gateway/gateway.proxy.js";

// EMERGENCY
import emergencyRoutes from "./modules/common/emergency/emergency.routes.js";

// Forms
import formsRoutes from "./modules/common/forms/forms.routes.js";

// Calling
import testTwilioRoute from "./routes/testTwilio.route.js";

// complaints
import complaintsBox from "./modules/complaint/complaint.routes.js";

//Birthday notification
import birthdayNotification from "./modules/birthday/birthday.route.js";

// Client Agreement
import clientAgreementsRoutes from "./modules/superAdmin/clientAgreements/clientAgreements.routes.js";

// Super-Admin import
import portalRoutes from "./routes/portalRoutes.js";
import invoiceRoutes from "./modules/superAdmin/invoices/invoice.routes.js";
import superAdminUsersRoutes from "./modules/superAdmin/users/users.routes.js";
import adminPayrollRoutes from "./modules/superAdmin/payroll/adminPayroll.routes.js";
import superAdminAuthRoutes from "./modules/superAdmin/auth/superAdminAuth.routes.js";
import superAdminSalesRoutes from "./modules/superAdmin/sales/superAdminSales.routes.js";
import superAdminSalesOverviewRoutes from "./modules/superAdmin/salesOverview/salesOverview.routes.js";
import superAdminClientsRoutes from "./modules/superAdmin/clients/superAdminClients.routes.js";
import superAdminStatusesRoutes from "./modules/superAdmin/statuses/superAdminStatuses.routes.js";
import superAdminDepartmentsRoutes from "./modules/superAdmin/departments/superAdminDepartments.routes.js";
import superAdminEmployeesRoutes from "./modules/superAdmin/employees/superAdminEmployees.routes.js";
import superAdminCandidateRoutes from "./modules/superAdmin/candidates/superAdminCandidates.routes.js";
import superAdminDesignationsRoutes from "./modules/superAdmin/designations/superAdminDesignations.routes.js";
import superAdminCandidateStatusRoutes from "./modules/superAdmin/candidateStatuses/superAdminCandidateStatuses.routes.js";
import adminJoiningRoutes from "./modules/superAdmin/joining/adminJoining.routes.js";
import superAdminExitRoutes from "./modules/superAdmin/exit/superAdminExit.routes.js";
import financeRoutes from "./modules/superAdmin/finance/finance.routes.js";
import superAdminEmailRoutes from "./modules/superAdmin/email/email.routes.js";
import teamDashboardRoutes from "./modules/superAdmin/teamDashboard/teamDashboard.routes.js";
import leaveRoutes from "./modules/leave/leave.routes.js";
import overtimeRoutes from "./modules/overtime/overtime.routes.js";
import compensationRoutes from "./modules/compensation/compensation.routes.js";
import salaryRoutes from "./modules/salary/salary.routes.js";
import documentsRoutes from "./modules/documents/documents.routes.js";
import { searchRouter, clientSearchRouter } from "./modules/search/search.routes.js";
import clientLeaveOfferRoutes from "./modules/client/leaveOffer/leaveOffer.routes.js";
import sopRoutes from "./modules/sop/sop.routes.js";
import itdevRoutes from "./modules/itdev/itdev.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import benefitsRoutes from "./modules/benefits/benefits.routes.js";
import complianceRoutes from "./modules/compliance/compliance.routes.js";
import verificationRoutes from "./modules/verification/verification.routes.js";
import onboardingRoutes from "./modules/onboarding/onboarding.routes.js";
import geoAttendanceRoutes from "./modules/geoAttendance/geoAttendance.routes.js";
import webFormsRoutes from "./modules/webForms/webForms.routes.js";
import aiRecruitRoutes from "./modules/aiRecruit/aiRecruit.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import otpAuthRoutes from "./modules/otpAuth/otpAuth.routes.js";
import assistantRoutes from "./modules/assistant/assistant.routes.js";
import jobBoardRoutes from "./modules/jobBoard/jobBoard.routes.js";
import visitorsRoutes from "./modules/visitors/visitors.routes.js";
import branchesRoutes from "./modules/branches/branches.routes.js";
import docExpiryRoutes from "./modules/docExpiry/docExpiry.routes.js";
import revenueRoutes from "./modules/superAdmin/revenueTracker/revenue.routes.js";
import expenseRoutes from "./modules/superAdmin/revenueTracker/expense.routes.js";
import profitRoutes from "./modules/superAdmin/revenueTracker/profit.routes.js";
import cashFlowRoutes from "./modules/superAdmin/revenueTracker/cashflow.routes.js";
import superAdminInterviewsRoutes from "./modules/superAdmin/interviews/superAdminInterviews.routes.js";
import jobPositionsRoutes from "./modules/superAdmin/jobPositions/jobPositions.routes.js";
import resetPassword from "./modules/superAdmin/resetPassword/superAdminReset.routes.js";
import superAdminAttendanceRoutes from "./modules/superAdmin/attendance/superAdminAttendance.routes.js";
import loginSettingsRoutes from "./modules/superAdmin/loginSettings/loginSettings.routes.js";
import securityRoutes from "./modules/superAdmin/security/security.routes.js";
import policiesRoutes from "./modules/superAdmin/policies/policies.routes.js";
import targetsRoutes from "./modules/superAdmin/targets/targets.routes.js";
import performanceRoutes from "./modules/superAdmin/performance/performance.routes.js";
import workRoutes from "./modules/superAdmin/workReport/work.routes.js";
import clientPoliciesRoutes from "./modules/superAdmin/clientPolicies/clientPolicies.routes.js";
import candidatePoliciesRoutes from "./modules/superAdmin/candidatePolicies/candidatePolicies.routes.js";
import leadsRoutes from "./modules/superAdmin/leads/lead.route.js";
import languagesRoutes from "./modules/superAdmin/languages/languages.routes.js";
import locationsRoutes from "./modules/superAdmin/locations/locations.routes.js";
import servicesRoutes from "./modules/superAdmin/services/admin.services.routes.js";
import proposalsRoutes from "./modules/proposals/proposals.routes.js";
import evsSsoRoutes from "./modules/superAdmin/evs/evsSso.routes.js";
import evsRoutes from "./modules/evs/evs.routes.js";
import hrRoboRoutes from "./modules/hrRobo/hrRobo.routes.js";
import attendanceRoutes from "./modules/attendance/attendance.routes.js";
import smartAttendanceV2Routes from "./modules/smartAttendanceV2/smartAttendanceV2.routes.js";
import clientProposalsRoutes from "./modules/proposals/proposalsClient.routes.js";
import salesProposalsRoutes from "./modules/sales/proposals/salesProposals.routes.js";

// Client import
import clientAuthRoutes from "./modules/client/auth/clientAuth.routes.js";
import clientMastersRoutes from "./modules/client/masters/clientMasters.routes.js";
import clientEmployeeRoutes from "./modules/client/employees/clientEmployees.routes.js";
import clientEmployeeAuthRoutes from "./modules/client/auth/clientEmployeeAuth.routes.js";
import clientAttendanceRoutes from "./modules/client/attendance/clientAttendance.routes.js";
import clientInterviewRoutes from "./modules/client/interviews/interviews.routes.js";
import clientPayrollRoutes from "./modules/client/payroll/clientPayroll.routes.js";
import clientSalesRoutes from "./modules/client/sales/clientSales.routes.js";
import clientExpenseRoutes from "./modules/client/finance/expense.routes.js";
import clientRevenueRoutes from "./modules/client/finance/revenue.routes.js";
import clientLedgerRoutes from "./modules/client/finance/ledger.routes.js";
import clientProfitRoutes from "./modules/client/finance/profit.routes.js";
import clientSalesReportRoutes from "./modules/client/salesReport/clientSalesReport.routes.js";
import clientFieldSalesRoutes from "./modules/client/fieldSales/fieldSales.route.js";
import clientInvoiceRoutes from "./modules/client/invoices/clientInvoice.routes.js";
import serviceRoutes from "./modules/client/services/services.routes.js";

import clientPerformanceRoutes from "./modules/client/performance/clientPerformance.routes.js";
import clientWorkPolicyRoutes from "./modules/client/workPolicy/workPolicy.routes.js";
import clientInventoryRoutes from "./modules/client/finance/inventory/inventory.routes.js";
import clientAssetRoutes from "./modules/client/finance/assets/asset.routes.js";
import clientPurchaseOrderRoutes from "./modules/client/finance/purchaseOrders/purchaseOrder.routes.js";
import clientTaxRoutes from "./modules/client/finance/tax/tax.routes.js";
import clientAuditLogRoutes from "./modules/client/auditLogs/auditLog.routes.js";
import clientWorkAssignmentRoutes from "./modules/client/workAssignment/workAssignment.routes.js";
import clientLeadRoutes from "./modules/client/leads/clientLead.routes.js";

// HR import
import hrAuthRoutes from "./modules/hr/auth/hrAuth.routes.js";
import hrInterviewRoutes from "./modules/hr/interviews/hrInterviews.routes.js";
import hrJoiningRoutes from "./modules/hr/form/hrJoining.routes.js";
import hrAttendanceRoutes from "./modules/hr/attendance/attendance.routes.js";
import hrDepartmentsRoutes from "./modules/hr/departments/hrDepartments.routes.js";
import hrWorkAssignmentRoutes from "./modules/hr/workAssignment/workAssignment.routes.js";
import hrWorkPolicyRoutes from "./modules/hr/workPolicy/workPolicy.routes.js";
import hrWorkTargetRoutes from "./modules/hr/workTarget/workTarget.routes.js";
import hrPerformanceRoutes from "./modules/hr/performance/performance.routes.js";
import hrLeadsRoutes from "./modules/hr/leads/lead.route.js";
import hrWorkRoutes from "./modules/hr/workAssignment_tome/work.routes.js";
import hrEodRoutes from "./modules/hr/eod/eod.routes.js";
import hrEodReportsRoutes from "./modules/hr/eodReports/eodReports.routes.js";
import hrOfficeLocationsRoutes from "./modules/hr/officeLocations/officeLocations.routes.js";

// Sales
import salesAuthRoutes from "./modules/sales/auth/salesAuth.routes.js";
import salesReportRoutes from "./modules/sales/reports/salesReport.routes.js";
import salesCallsRoutes from "./modules/sales/calls/salesCalls.routes.js";
import salesWorkAssignmentRoutes from "./modules/sales/workAssignment/workAssignment.routes.js";
import salesWorkPolicyRoutes from "./modules/sales/workPolicy/workPolicy.routes.js";
import salesPerformanceRoutes from "./modules/sales/performance/performance.routes.js";
import salesEodRoutes from "./modules/sales/eod/eod.routes.js";
import salesEodReportsRoutes from "./modules/sales/eodReports/eodReports.routes.js";
import fieldSalesRoutes from "./modules/sales/fieldSales/fieldSales.routes.js";
import salesServicesRoutes from "./modules/sales/services/salesServices.routes.js";
import salesInvoiceRoutes from "./modules/sales/invoices/invoice.routes.js";
import salesWorkRoutes from "./modules/sales/workAssignment_tome/work.routes.js";
import salesClientsRoutes from "./modules/sales/clients/salesClients.routes.js";
import salesInventoryRoutes from "./modules/sales/inventory/salesInventory.routes.js";
import sopsLibraryRoutes from "./modules/common/sops/sops.routes.js";
import itDeliverablesRoutes from "./modules/common/deliverables/deliverables.routes.js";
import itRoutes from "./modules/it/it.routes.js";


// Employees
import employeeAuthRoutes from "./modules/employee/auth/employeeAuth.routes.js";
import employeeWorkRoutes from "./modules/employee/workAssignment/work.routes.js";
import employeeEodRoutes from "./modules/employee/eod/eod.routes.js";
import employeeTargetRoutes from "./modules/employee/targets/targets.routes.js";
import employeePerformanceRoutes from "./modules/employee/performance/performance.routes.js";
import employeeProfileRoutes from "./modules/employee/profile/employeeProfile.routes.js";
import employeeVerificationRoutes from "./modules/employee/verification/employeeVerification.routes.js";
import employeeNotificationRoutes from "./modules/employee/notifications/notifications.routes.js";

//offerletter 
import offerLetterRoutes from "./modules/superAdmin/offerLetter/offerLetter.routes.js";

// Chat
import chatRoutes from "./modules/chat/chat.routes.js";
// AI Chat
import aiChatRoutes from "./modules/aiChat/aiChat.routes.js";

// Automation
import automationRoutes from "./routes/automation/automation.routes.js";

import agreementTemplatesRoutes from "./modules/client/agreementTemplates/agreementTemplates.routes.js";
import clientWorkTargetRoutes from "./modules/client/workTarget/workTarget.routes.js";
import clientReportsRoutes from "./modules/client/reports/reports.routes.js";

import websiteBridgeRoutes from "./modules/website-bridge/websiteBridge.routes.js";
const app = express();

// CORS: in production set CORS_ORIGINS in .env to a comma-separated list
// (e.g. "https://hrms.yourdomain.com,https://attendance.yourdomain.com").
// When unset (development), all origins are allowed as before.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
/* ---------------- API GATEWAY (must be BEFORE body parsers) ----------------
   Single-backend mode: all portals call ONLY this Node backend. Requests to
   /api/evs/*, /api/hr-robo/*, /api/smart-attendance/* are streamed to the
   internal Python services (see modules/gateway/gateway.proxy.js). */
mountGateway(app);

app.use(express.json());

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.originalUrl);
  next();
});

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ success: true, message: `Backend Running` });
});


app.get("/test-agreement", (req, res) => {
  res.json({
    success: true,
    message: "Agreement Route Working",
  });
});
// serve uploaded files
app.use("/api/website-bridge", websiteBridgeRoutes);
app.use("/api/uploads", express.static("uploads"));
app.use("/uploads", express.static("uploads"));

// Calling
app.use("/api", testTwilioRoute);

//Emergency route
app.use("/api/emergency", emergencyRoutes);

// Forms
app.use("/api/forms", formsRoutes);

// Complaint
app.use("/api/complaints", complaintsBox);

//Birthday notification
app.use("/api/birthdays", birthdayNotification);

// Client Agreement <> Super Admin routes
app.use("/api/super-admin/client-agreements", clientAgreementsRoutes);

app.use(
  "/api/super-admin/agreement-templates",
  agreementTemplatesRoutes
);

// Super Admin routes
app.use("/api/admin/portal-settings", portalRoutes);
app.use("/api/super-admin/auth", superAdminAuthRoutes);
app.use("/api/super-admin/sales", superAdminSalesRoutes);
app.use("/api/super-admin/sales", superAdminSalesOverviewRoutes);
app.use("/api/super-admin/clients", superAdminClientsRoutes);
app.use("/api/super-admin/statuses", superAdminStatusesRoutes);
app.use("/api/super-admin/candidate-statuses", superAdminCandidateStatusRoutes);
app.use("/api/super-admin/designations", superAdminDesignationsRoutes);
app.use("/api/super-admin/departments", superAdminDepartmentsRoutes);
app.use("/api/super-admin/candidates", superAdminCandidateRoutes);
app.use("/api/super-admin/employees", superAdminEmployeesRoutes);
app.use("/api/super-admin/users", superAdminUsersRoutes);
app.use("/api/super-admin/joining", adminJoiningRoutes);
app.use("/api/super-admin/invoices", invoiceRoutes);
app.use("/api/super-admin/exit", superAdminExitRoutes);
app.use("/api/admin/payroll", adminPayrollRoutes);

app.use("/api/super-admin/attendance", superAdminAttendanceRoutes);
app.use("/api/super-admin/login-settings", loginSettingsRoutes);
app.use("/api/super-admin/security", securityRoutes);
app.use("/api/super-admin/policies", policiesRoutes);
app.use("/api/super-admin/targets", targetsRoutes);
app.use("/api/super-admin/email", superAdminEmailRoutes);
app.use("/api/super-admin/team-dashboard", teamDashboardRoutes);

app.use("/api/finance", financeRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/overtime", overtimeRoutes);
app.use("/api/compensation", compensationRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/search", searchRouter);
app.use("/api/client/search", clientSearchRouter);
app.use("/api/client/leave-offer", clientLeaveOfferRoutes);
app.use("/api/sop", sopRoutes);
app.use("/api/itdev", itdevRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/benefits", benefitsRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/geo-attendance", geoAttendanceRoutes);
app.use("/api/web-forms", webFormsRoutes);
app.use("/api/ai-recruit", aiRecruitRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/otp-auth", otpAuthRoutes);

app.use("/api/assistant", assistantRoutes);
app.use("/api/job-board", jobBoardRoutes);
app.use("/api/visitors", visitorsRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/doc-expiry", docExpiryRoutes);
app.use("/api/revenues", revenueRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/profit", profitRoutes);
app.use("/api/cashflow", cashFlowRoutes);
app.use("/api/super-admin/interviews", superAdminInterviewsRoutes);
app.use("/api/super-admin/job-positions", jobPositionsRoutes);
app.use("/api/super-admin/reset-password", resetPassword);
app.use("/api/super-admin/performance", performanceRoutes);
app.use("/api/super-admin", workRoutes);
app.use("/api/super-admin/client-policies", clientPoliciesRoutes);
app.use("/api/super-admin/candidate-policies", candidatePoliciesRoutes);
app.use("/api/super-admin/leads", leadsRoutes);
app.use("/api/super-admin/languages", languagesRoutes);
app.use("/api/super-admin/locations", locationsRoutes);
app.use("/api/super-admin/services", servicesRoutes);
app.use("/api/super-admin/proposals", proposalsRoutes);
app.use("/api/super-admin/evs", evsSsoRoutes);
/* Employee Verification System — native Node module (replaces the Python
   FastAPI service on :8000; tables live in hrms_db with the evs_ prefix). */
app.use("/api/evs", evsRoutes);
/* HR Robo (AI Interview) — runs natively in this backend (replaces the
   FastAPI service on :8001; tables live in hrms_db with the robo_ prefix,
   recordings in uploads/hr-robo/video/, interview UI served at /api/hr-robo/). */
app.use("/api/hr-robo", hrRoboRoutes);
/* Smart Attendance V2 — exposed at /api/* only on the Smart Attendance domain.
   Other HRMS domains continue using their existing /api/* routes unchanged. */
app.use((req, res, next) => {
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();

  if (host === "ardhnarishwar-smart-attendance.recruweb.com") {
    return smartAttendanceV2Routes(req, res, next);
  }

  if (host === "ardhnarishwar-ai.hr-robo.recruweb.com" && req.url.startsWith("/api/hr-robo/api/")) {
    req.url = req.url.replace(/^\/api\/hr-robo/, "");
    return smartAttendanceV2Routes(req, res, next);
  }

  next();
});

/* Smart Attendance — legacy native Node module */
app.use("/api/smart-attendance", attendanceRoutes);
app.use("/api/client/proposals", clientProposalsRoutes);

// Client routes
app.use("/api/client", checkPortalStatus("CLIENT"));

app.use("/api/client/auth", clientAuthRoutes);
app.use("/api/client/auth", clientEmployeeAuthRoutes);
app.use("/api/client/payroll", clientPayrollRoutes);
app.use("/api/client/employees", clientEmployeeRoutes);
app.use("/api/client/interviews", clientInterviewRoutes);
app.use("/api/client/attendance", clientAttendanceRoutes);
app.use("/api/client/masters", clientMastersRoutes);
app.use("/api/client/invoices", clientInvoiceRoutes);

// -departments
app.use("/api/client/sales", clientSalesRoutes);
app.use("/api/client/expenses", clientExpenseRoutes);
app.use("/api/client/revenue", clientRevenueRoutes);
app.use("/api/client/ledger", clientLedgerRoutes);
// Alias mounts matching the client portal's financeService paths
app.use("/api/expense", clientExpenseRoutes);
app.use("/api/revenue", clientRevenueRoutes);
app.use("/api/ledger", clientLedgerRoutes);
app.use("/api/client/work-target", clientWorkTargetRoutes);
app.use("/api/client/reports", clientReportsRoutes);
app.use("/api/client/profit", clientProfitRoutes);

app.use("/api/client/performance", clientPerformanceRoutes);
app.use("/api/client/work-policy", clientWorkPolicyRoutes);
app.use("/api/client/inventory", clientInventoryRoutes);
app.use("/api/client/assets", clientAssetRoutes);
app.use("/api/client/purchase-orders", clientPurchaseOrderRoutes);
app.use("/api/client/tax", clientTaxRoutes);
app.use("/api/client/audit-logs", clientAuditLogRoutes);
app.use("/api/client/work-assignment", clientWorkAssignmentRoutes);
app.use("/api/client/leads", clientLeadRoutes);
app.use("/api/client/sales-report", clientSalesReportRoutes);
app.use("/api/client/field-sales", clientFieldSalesRoutes);
app.use("/api/client/services", serviceRoutes);

// HR route
app.use("/api/hr", checkPortalStatus("HR"));

app.use("/api/hr/auth", hrAuthRoutes);
app.use("/api/hr/interviews", hrInterviewRoutes);
app.use("/api/hr/joining", hrJoiningRoutes);
app.use("/api/hr/attendance", hrAttendanceRoutes);
app.use("/api/hr/departments", hrDepartmentsRoutes);
app.use("/api/hr/work-assignment", hrWorkAssignmentRoutes);
app.use("/api/hr/work-policies", hrWorkPolicyRoutes);
app.use("/api/hr/work-targets", hrWorkTargetRoutes);
app.use("/api/hr/performance", hrPerformanceRoutes);
app.use("/api/hr/leads", hrLeadsRoutes);
app.use("/api/hr/work-assignments", hrWorkRoutes);
app.use("/api/hr/eod", hrEodRoutes);
app.use("/api/hr/eod-reports", hrEodReportsRoutes);
app.use("/api/hr/office-locations", hrOfficeLocationsRoutes);

// Sales authentication must stay public. A disabled portal must not block
// the login endpoint itself with a 403; the portal status guard applies to
// protected Sales APIs after authentication.
app.use("/api/sales/auth", salesAuthRoutes);

// Sales route
app.use("/api/sales", checkPortalStatus("SALES"));
app.use("/api/sales/calls", salesCallsRoutes);
app.use("/api/sales/reports", salesReportRoutes);
app.use("/api/sales/work-assignment", salesWorkAssignmentRoutes);
app.use("/api/sales/work-policies", salesWorkPolicyRoutes);
app.use("/api/sales/performance", salesPerformanceRoutes);
app.use("/api/sales/eod", salesEodRoutes);
app.use("/api/sales/eod-reports", salesEodReportsRoutes);
app.use("/api/sales/field-sales", fieldSalesRoutes);
app.use("/api/sales/services", salesServicesRoutes);
app.use("/api/sales/invoices", salesInvoiceRoutes);
app.use("/api/sales/work-assignments", salesWorkRoutes);
app.use("/api/sales/clients", salesClientsRoutes);
app.use("/api/sales/inventory", salesInventoryRoutes);
app.use("/api/sales/proposals", salesProposalsRoutes);
app.use("/api/sops", sopsLibraryRoutes);
app.use("/api/it-deliverables", itDeliverablesRoutes);
app.use("/api/it", itRoutes);


// Employee
app.use("/api/employee/auth", employeeAuthRoutes);
app.use("/api/employee/work-assignment", employeeWorkRoutes);
app.use("/api/employee/eod", employeeEodRoutes);
app.use("/api/employee/targets", employeeTargetRoutes);
app.use("/api/employee/performance", employeePerformanceRoutes);
app.use("/api/employee/profile", employeeProfileRoutes);
app.use("/api/employee/verification", employeeVerificationRoutes);
app.use("/api/employee/notifications", employeeNotificationRoutes);

//offerlettr
app.use("/api/super-admin/offer-letter", offerLetterRoutes);
// Chat
app.use("/api/chat", chatRoutes);

app.use("/api/ai-chat", aiChatRoutes);

// Automation

app.use("/api/automation", automationRoutes);

import("./modules/integration/smartAttendance.routes.js").then(m => app.use("/api/integration", m.default));

app.use(errorMiddleware);

export default app;

