import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Users from "../pages/users/Users";
import NotFound from "../pages/NotFound";
import Settings from "../pages/settings/Settings";
import Dashboard from "../pages/dashboard/Dashboard";
import AdminLayout from "../components/layout/AdminLayout";
import Departments from "../pages/departments/Departments";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import ClientManagement from "../pages/dashboard/ClientManagement";
import EmployeeManagement from "../pages/dashboard/EmployeeManagement";
import CandidateManagement from "../pages/dashboard/CandidateManagement";
import InterviewScheduling from "../pages/dashboard/InterviewScheduling";
import AttendanceTracker from "../pages/dashboard/AttendanceTracker";
import LeaveManagement from "../pages/dashboard/LeaveManagement";
import HRDocuments from "../pages/dashboard/HRDocuments";
import Compensation from "../pages/dashboard/Compensation";
import SalaryRevisions from "../pages/dashboard/SalaryRevisions";
import AdvancedSearch from "../pages/dashboard/AdvancedSearch";
import JobBoardATS from "../pages/recruitment/JobBoardATS";
import VisitorManagement from "../pages/visitors/VisitorManagement";
import BranchManagement from "../pages/branches/BranchManagement";
import DocumentExpiry from "../pages/documents/DocumentExpiry";
import AutomatedAttendance from "../pages/dashboard/AutomatedAttendance";
import ShiftTimings from "../pages/dashboard/ShiftTimings";
import AutomatedPolicyMail from "../pages/dashboard/AutomatedPolicyMail";
import PerformanceSheet from "../pages/dashboard/PerformanceSheet";
import AIChatbot from "../pages/dashboard/AIChatbot";
import WorkReportSystem from "../pages/dashboard/WorkReportSystem";
import LoginTimeSettings from "../pages/dashboard/LoginTimeSettings";
import CompanyPolicies from "../pages/dashboard/CompanyPolicies";
import WorkPolicyTarget from "../pages/dashboard/WorkPolicyTarget";
import ManagementDiscussionPolicy from "../pages/dashboard/ManagementDiscussionPolicy";
import AIChatHub from "../pages/dashboard/AIChatHub";
import SubscriptionPlans from "../pages/dashboard/SubscriptionPlans";
import ClientCandidatePolicies from "../pages/dashboard/ClientCandidatePolicies";
import HRCallingDetails from "../pages/dashboard/HRCallingDetails";
import ExitManagement from "../pages/dashboard/ExitManagement";
import SalesReports from "../pages/dashboard/SalesReports";
import SalesManagement from "../pages/dashboard/SalesManagement";
import OfferLetter from "../pages/dashboard/OfferLetter";
import EmailSystem from "../pages/dashboard/EmailSystem";
import Security from "../pages/dashboard/Security";
import AdminPayroll from "../pages/dashboard/AdminPayroll";

import CreateInvoice from "../pages/invoices/CreateInvoice";
import InvoicePreview from "../pages/invoices/InvoicePreview";
import Invoices from "../pages/invoices/Invoices";

import Proposals from "../pages/proposals/Proposals";
import CreateProposal from "../pages/proposals/CreateProposal";
import ProposalPreview from "../pages/proposals/ProposalPreview";
import JoiningManagement from "../pages/dashboard/JoiningManagement";

import ComplaintList from "../pages/complaint/ComplaintList";
import ComplaintDetail from "../pages/complaint/ComplaintDetail";
import ResolvedComplaints from "../pages/complaint/ResolvedComplaints";
import LeadAssigner from "../pages/leads/LeadAssigner";
import LeadBatchDetail from "../pages/leads/LeadBatchDetail";
import ServiceManagement from "../pages/dashboard/ServiceManagement";
import ServiceTemplate from "../components/service-management/ServiceTemplate";
import JoinedCandidates from "../pages/dashboard/JoinedCandidates";
import ClientDecisions from "../pages/dashboard/ClientDecisions";
import ClientAgreements from "../pages/dashboard/ClientAgreements";

// ✅ Finance imports
import FinanceDashboard from "../pages/finance/FinanceDashboard";
import ExpenseManagement from "../pages/finance/ExpenseManagement";
import RevenueManagement from "../pages/finance/RevenueManagement";
import RevenueAdvanced from "../pages/finance/RevenueAdvanced";
import SopManagement from "../pages/sop/SopManagement";
import ItDevDashboard from "../pages/itdev/ItDevDashboard";
import DataAnalytics from "../pages/analytics/DataAnalytics";
import BenefitsUpskilling from "../pages/benefits/BenefitsUpskilling";
import ComplianceAudit from "../pages/compliance/ComplianceAudit";
import VerificationPortal from "../pages/verification/VerificationPortal";
import ClientOnboarding from "../pages/onboarding/ClientOnboarding";
import MasterControl from "../pages/masterControl/MasterControl";
import GeoAttendance from "../pages/geoAttendance/GeoAttendance";
import WebFormsInbox from "../pages/webForms/WebFormsInbox";
import AiRecruit from "../pages/aiRecruit/AiRecruit";
import AIPlatformAudit from "../pages/aiPlatform/AIPlatformAudit";
import PublicInterview from "../pages/aiRecruit/PublicInterview";
import ManagerDashboard from "../pages/team/ManagerDashboard";
import TLDashboard from "../pages/team/TLDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/interview/:token" element={<PublicInterview />} />

      {/* Admin Protected Area */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />
        <Route path="/tl-dashboard" element={<TLDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/create-invoice" element={<CreateInvoice />} />
        <Route path="/invoice/:id" element={<InvoicePreview />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/proposals/create" element={<CreateProposal />} />
        <Route path="/proposals/:id" element={<ProposalPreview />} />
        <Route path="departments" element={<Departments />} />

        <Route path="/dashboard/email-system" element={<EmailSystem />} />
        <Route path="dashboard/hr-calling" element={<HRCallingDetails />} />
        <Route path="/dashboard/employees" element={<EmployeeManagement />} />
        <Route path="/dashboard/exit-management" element={<ExitManagement />} />
        <Route path="/dashboard/attendance" element={<AttendanceTracker />} />
          <Route path="/dashboard/leave-management" element={<LeaveManagement />} />
          <Route path="/dashboard/hr-documents" element={<HRDocuments />} />
          <Route path="/dashboard/compensation" element={<Compensation />} />
          <Route path="/dashboard/salary-revisions" element={<SalaryRevisions />} />
          <Route path="/dashboard/advanced-search" element={<AdvancedSearch />} />
          
          <Route path="/dashboard/job-board" element={<JobBoardATS />} />
          <Route path="/dashboard/visitors" element={<VisitorManagement />} />
          <Route path="/dashboard/branches" element={<BranchManagement />} />
          <Route path="/dashboard/doc-expiry" element={<DocumentExpiry />} />
        <Route path="/dashboard/automated-attendance" element={<AutomatedAttendance />} />
        <Route path="/dashboard/shift-timings" element={<ShiftTimings />} />
        <Route path="/dashboard/policy-mail" element={<AutomatedPolicyMail />} />
        <Route path="/dashboard/performance" element={<PerformanceSheet />} />
        <Route path="/dashboard/chatbot" element={<AIChatbot />} />
        <Route path="/dashboard/work-report" element={<WorkReportSystem />} />
        <Route path="/dashboard/it-daily-work" element={<WorkReportSystem />} />
        <Route path="/dashboard/code-reviews" element={<WorkReportSystem />} />
        <Route path="/dashboard/eod" element={<WorkReportSystem />} />
        <Route path="/dashboard/login-time" element={<LoginTimeSettings />} />
        <Route path="/dashboard/policies" element={<CompanyPolicies />} />
        <Route path="/dashboard/work-policy-target" element={<WorkPolicyTarget />} />
        <Route path="/dashboard/discussion-policy" element={<ManagementDiscussionPolicy />} />
        <Route path="/dashboard/ai-chat-hub" element={<AIChatHub />} />
        <Route path="/dashboard/subscription-plans" element={<SubscriptionPlans />} />
        <Route path="/dashboard/client-candidate-policies" element={<ClientCandidatePolicies />} />
        <Route path="/dashboard/sales-reports" element={<SalesReports />} />
        <Route path="/dashboard/sales-management" element={<SalesManagement />} />
        <Route path="/dashboard/offer-letter" element={<OfferLetter />} />
        <Route path="/dashboard/payroll" element={<AdminPayroll />} />
        <Route path="/dashboard/security" element={<Security />} />
        <Route path="/dashboard/joining" element={<JoiningManagement />} />
        <Route path="/dashboard/joined-candidates" element={<JoinedCandidates />} />
        <Route path="/dashboard/client-decisions" element={<ClientDecisions />} />
        <Route path="/dashboard/services" element={<ServiceManagement />} />
        <Route path="/dashboard/services/:id" element={<ServiceTemplate />} />

        {/* ✅ Finance Routes */}
        <Route path="/dashboard/finance" element={<FinanceDashboard />} />
        <Route path="/dashboard/finance/expenses" element={<ExpenseManagement />} />
        <Route path="/dashboard/finance/revenue" element={<RevenueManagement />} />
          <Route path="/dashboard/finance/revenue-advanced" element={<RevenueAdvanced />} />
          <Route path="/dashboard/sop-management" element={<SopManagement />} />
          <Route path="/dashboard/it-dev" element={<ItDevDashboard />} />
          <Route path="/dashboard/analytics" element={<DataAnalytics />} />
          <Route path="/dashboard/benefits" element={<BenefitsUpskilling />} />
          <Route path="/dashboard/compliance" element={<ComplianceAudit />} />
          <Route path="/dashboard/verification" element={<VerificationPortal />} />
          <Route path="/dashboard/client-onboarding" element={<ClientOnboarding />} />
          <Route path="/dashboard/master-control" element={<MasterControl />} />
          <Route path="/dashboard/geo-attendance" element={<GeoAttendance />} />
          <Route path="/dashboard/web-forms" element={<WebFormsInbox />} />
          <Route path="/dashboard/ai-recruit" element={<AiRecruit />} />
          <Route path="/dashboard/ai-platform-audit" element={<AIPlatformAudit />} />

        <Route path="/complaints" element={<ComplaintList />} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/complaints/resolved" element={<ResolvedComplaints />} />
        <Route path="/lead-assigner" element={<LeadAssigner />} />
        <Route path="/lead-assigner/:id" element={<LeadBatchDetail />} />
        <Route path="/client-agreements" element={<ClientAgreements />} />
        <Route path="dashboard/client-management" element={<ClientManagement />} />
        <Route path="dashboard/candidate-management" element={<CandidateManagement />} />
        <Route path="dashboard/interview-scheduling" element={<InterviewScheduling />} />
      </Route>

      {/* Always last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}