import { useAuth } from "../../context/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SIDEBAR_PERMISSIONS } from "./sidebarPermissions";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  ChevronDown,
  Briefcase,
  UserRoundSearch,
  Wallet,
  CalendarDays,
  ClipboardCheck,
  PhoneCall,
  UserMinus,
  BarChart3,
  Bot,
  FileText,
  ShieldCheck,
  Mail,
  Form,
  TrendingUp,
  MessageSquare,
  CheckSquare,
  Clock,
  BookOpen,
  Target,
  Coffee,
  MessageCircle,
  CreditCard,
  UserCheck,
  AlertCircle,
  Users2,
  Code2,
  HeartHandshake,
  FileCheck2,
  Handshake,
  SlidersHorizontal,
  Navigation,
  Globe,
  BrainCircuit,
  DoorOpen,
  CalendarClock,
  GitPullRequest,
} from "lucide-react";

const linkClass = ({ isActive }) => `adm-link ${isActive ? "on" : ""}`;

export default function Sidebar({ onNavigate }) {
  const location = useLocation();

  const { auth } = useAuth();

  const role = auth?.user?.role;

  // ✅ Only one object to manage everything (scalable)
  const navItems = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard size={18} />,
        children: [
          {
            key: "overview",
            to: "/",
            label: "Overview",
            icon: <FileText size={18} />,
          },
          {
            key: "client-management",
            to: "/dashboard/client-management",
            label: "Client Management",
            icon: <Briefcase size={18} />,
          },
          {
            key: "employees",
            to: "/dashboard/employees",
            label: "Employee Management",
            icon: <Users size={18} />,
          },
          {
            key: "candidate-management",
            to: "/dashboard/candidate-management",
            label: "Candidate Management",
            icon: <UserRoundSearch size={18} />,
          },
          {
            key: "joined-candidates",
            to: "/dashboard/joined-candidates",
            label: "Joined Candidates",
            icon: <UserRoundSearch size={18} />,
          },
          {
            key: "interview-scheduling",
            to: "/dashboard/interview-scheduling",
            label: "Interview Scheduling",
            icon: <CalendarDays size={18} />,
          },
          {
            key: "client-decisions",
            to: "/dashboard/client-decisions",
            label: "Client Decisions",
            icon: <UserCheck size={18} />,
          },
          {
            key: "services",
            to: "/dashboard/services",
            label: "All Services",
            icon: <Briefcase size={18} />,
          },
          {
            key: "attendance",
            to: "/dashboard/attendance",
            label: "Attendance Tracker",
            icon: <ClipboardCheck size={18} />,
          },
          {
            key: "shift-timings",
            to: "/dashboard/shift-timings",
            label: "Shift Timings",
            icon: <Clock size={18} />,
          },
          {
            key: "leave-management",
            to: "/dashboard/leave-management",
            label: "Leave Management",
            icon: <CalendarDays size={18} />,
          },
          {
            key: "compensation",
            to: "/dashboard/compensation",
            label: "Compensation",
            icon: <Briefcase size={18} />,
          },
          {
            key: "salary-revisions",
            to: "/dashboard/salary-revisions",
            label: "Salary Revisions",
            icon: <TrendingUp size={18} />,
          },
          {
            key: "advanced-search",
            to: "/dashboard/advanced-search",
            label: "Advanced Search",
            icon: <UserCheck size={18} />,
          },
          {
            key: "job-board",
            to: "/dashboard/job-board",
            label: "Job Board & ATS",
            icon: <Briefcase size={18} />,
          },
          {
            key: "visitors",
            to: "/dashboard/visitors",
            label: "Visitors",
            icon: <DoorOpen size={18} />,
          },
          {
            key: "branches",
            to: "/dashboard/branches",
            label: "Branches",
            icon: <Building2 size={18} />,
          },
          {
            key: "doc-expiry",
            to: "/dashboard/doc-expiry",
            label: "Doc Expiry Alerts",
            icon: <CalendarClock size={18} />,
          },
          {
            key: "hr-documents",
            to: "/dashboard/hr-documents",
            label: "HR Documents",
            icon: <FileText size={18} />,
          },
          {
            key: "sop-management",
            to: "/dashboard/sop-management",
            label: "SOP Management",
            icon: <BookOpen size={18} />,
          },
          {
            key: "it-dev",
            to: "/dashboard/it-dev",
            label: "IT Developer",
            icon: <Code2 size={18} />,
          },
          {
            key: "analytics",
            to: "/dashboard/analytics",
            label: "Data Analytics",
            icon: <BarChart3 size={18} />,
          },
          {
            key: "benefits",
            to: "/dashboard/benefits",
            label: "Benefits & Upskilling",
            icon: <HeartHandshake size={18} />,
          },
          {
            key: "compliance",
            to: "/dashboard/compliance",
            label: "Compliance & Audit",
            icon: <ShieldCheck size={18} />,
          },
          {
            key: "verification",
            to: "/dashboard/verification",
            label: "Verification Portal",
            icon: <FileCheck2 size={18} />,
          },
          {
            key: "client-onboarding",
            to: "/dashboard/client-onboarding",
            label: "Client Onboarding",
            icon: <Handshake size={18} />,
          },
          {
            key: "master-control",
            to: "/dashboard/master-control",
            label: "Master Control",
            icon: <SlidersHorizontal size={18} />,
          },
          {
            key: "geo-attendance",
            to: "/dashboard/geo-attendance",
            label: "Geo Attendance",
            icon: <Navigation size={18} />,
          },
          {
            key: "web-forms",
            to: "/dashboard/web-forms",
            label: "Website Forms",
            icon: <Globe size={18} />,
          },
          {
            key: "ai-recruit",
            to: "/dashboard/ai-recruit",
            label: "AI Recruitment",
            icon: <BrainCircuit size={18} />,
          },
          {
            key: "ai-platform-audit",
            to: "/dashboard/ai-platform-audit",
            label: "AI Platform Audit",
            icon: <BrainCircuit size={18} />,
          },
          // {
          //   to: "/dashboard/automated-attendance",
          //   label: "Automated Attendance",
          //   icon: <Bot size={18} />,
          // },
          // {
          //   to: "/dashboard/policy-mail",
          //   label: "Policy Mail",
          //   icon: <Mail size={18} />,
          // },
          {
            key: "performance",
            to: "/dashboard/performance",
            label: "Performance Sheet",
            icon: <TrendingUp size={18} />,
          },
          {
            key: "chatbot",
            to: "/dashboard/chatbot",
            label: "AI Chatbot",
            icon: <MessageSquare size={18} />,
          },
          {
            key: "work-report",
            to: "/dashboard/work-report",
            label: "Work & EOD",
            icon: <CheckSquare size={18} />,
          },
          {
            key: "it-daily-work",
            to: "/dashboard/it-daily-work",
            label: "IT Daily Work",
            icon: <FileText size={18} />,
          },
          {
            key: "code-reviews",
            to: "/dashboard/code-reviews",
            label: "Code Review Status",
            icon: <GitPullRequest size={18} />,
          },
          {
            key: "client-agreements",
            to: "/client-agreements",
            label: "Client Agreements",
            icon: <FileText size={18} />,
          },
          {
            key: "login-time",
            to: "/dashboard/login-time",
            label: "Login Time",
            icon: <Clock size={18} />,
          },
          {
            key: "policies",
            to: "/dashboard/policies",
            label: "Company Policies",
            icon: <BookOpen size={18} />,
          },
          {
            key: "work-policy-target",
            to: "/dashboard/work-policy-target",
            label: "Work Policy & Target",
            icon: <Target size={18} />,
          },
          // {
          //   to: "/dashboard/discussion-policy",
          //   label: "Discussion Policy",
          //   icon: <Coffee size={18} />,
          // },
          // {
          //   to: "/dashboard/ai-chat-hub",
          //   label: "AI Chat Hub",
          //   icon: <MessageCircle size={18} />,
          // },
          // {
          //   to: "/dashboard/subscription-plans",
          //   label: "Subscription Plans",
          //   icon: <CreditCard size={18} />,
          // },
          {
            key: "client-candidate-policies",
            to: "/dashboard/client-candidate-policies",
            label: "Client & Candidate Policies",
            icon: <UserCheck size={18} />,
          },
          {
            key: "hr-calling",
            to: "/dashboard/hr-calling",
            label: "HR Calling Details",
            icon: <PhoneCall size={18} />,
          },
          {
            key: "joining",
            to: "/dashboard/joining",
            label: "Joining Form",
            icon: <Form size={18} />,
          },
          {
            key: "payroll",
            to: "/dashboard/payroll",
            label: "Payroll System",
            icon: <Wallet size={18} />,
          },
          {
            key: "exit-management",
            to: "/dashboard/exit-management",
            label: "Exit Management",
            icon: <UserMinus size={18} />,
          },
          {
            key: "sales-reports",
            to: "/dashboard/sales-reports",
            label: "Sales Reports",
            icon: <BarChart3 size={18} />,
          },
          {
            key: "sales-management",
            to: "/dashboard/sales-management",
            label: "Sales Management",
            icon: <TrendingUp size={18} />,
          },
          // {
          //   to: "/dashboard/ai-chatbot",
          //   label: "AI Chatbot",
          //   icon: <Bot size={18} />,
          // },
          {
            key: "offer-letter",
            to: "/dashboard/offer-letter",
            label: "Offer Letter & PDF",
            icon: <FileText size={18} />,
          },
          // {
          //   to: "/dashboard/security",
          //   label: "Secure & Reliable",
          //   icon: <ShieldCheck size={18} />,
          // },
          {
            key: "email-system",
            to: "/dashboard/email-system",
            label: "Email System",
            icon: <Mail size={18} />,
          },
          
           {
  key: "finance",
  to: "/dashboard/finance",
  label: "Finance Dashboard",
  icon: <Wallet size={18} />,
},
{
  key: "finance-expenses",
  to: "/dashboard/finance/expenses",
  label: "Expense Management",
  icon: <TrendingUp size={18} />,
},
{
  key: "finance-revenue",
  to: "/dashboard/finance/revenue",
  label: "Revenue Management",
  icon: <BarChart3 size={18} />,
},
{
  key: "revenue-advanced",
  to: "/dashboard/finance/revenue-advanced",
  label: "Revenue Advanced",
  icon: <TrendingUp size={18} />,
},
{
  key: "invoices",
  to: "/invoices",
  label: "Invoices",
  icon: <FileText size={18} />,
},
{
  key: "proposals",
  to: "/proposals",
  label: "Proposals",
  icon: <Handshake size={18} />,
},


        ],
        activePaths: ["/", "/dashboard"],
      },
      {
        key: "lead-assigner",
        to: "/lead-assigner",
        label: "Lead Assigner",
        icon: <Users2 size={18} />,
      },



      // Users (normal link for now)
      {
        key: "users",
        label: "Users",
        icon: <Users size={18} />,
        to: "/users",
      },

      // Departments (normal link)
      {
        key: "departments",
        label: "Departments",
        icon: <Building2 size={18} />,
        to: "/departments",
      },

      // Departments (normal link)
      {
        key: "complaints",
        label: "Complaints",
        icon: <AlertCircle size={18} />,
        to: "/complaints",
      },

      // Settings (normal link)
      {
        key: "settings",
        label: "Settings",
        icon: <Settings size={18} />,
        to: "/settings",
      },
    ],
    [],
  );

  // Dropdown open state
  const [openMenu, setOpenMenu] = useState(() => {
    const initial = {};
    navItems.forEach((item) => {
      if (item.children?.length) initial[item.key] = false;
    });
    return initial;
  });

  // Auto open dropdown when route matches
  useEffect(() => {
    navItems.forEach((item) => {
      if (!item.children?.length) return;

      const isActive = item.activePaths?.some((p) =>
        p === "/" ? location.pathname === "/" : location.pathname.startsWith(p),
      );

      if (isActive) {
        setOpenMenu((prev) => ({ ...prev, [item.key]: true }));
      }
    });
  }, [location.pathname, navItems]);

  const toggleMenu = (key) => {
    setOpenMenu((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isSectionActive = (item) => {
    if (item.to) return location.pathname === item.to;

    if (item.activePaths?.includes("/")) {
      if (location.pathname === "/") return true;
    }

    return item.activePaths?.some((p) =>
      p === "/" ? location.pathname === "/" : location.pathname.startsWith(p),
    );
  };

  const permissions =
  SIDEBAR_PERMISSIONS[role];

const filteredNavItems =
  navItems.filter((item) => {

    if (
      permissions?.nav === "ALL"
    ) {
      return true;
    }

    return permissions?.nav?.includes(
      item.key
    );
  });

const filteredDashboardChildren =
  navItems[0].children.filter(
    (child) => {

      if (
        permissions?.dashboard ===
        "ALL"
      ) {
        return true;
      }

      return permissions?.dashboard?.includes(
        child.key
      );
    }
  );
  
  return (
    <aside className="adm-aside" aria-label="Primary navigation">
      <div className="adm-brand">
        <div className="adm-logo" aria-hidden="true">
          <img
            src="/ardhnarishwar-logo.jpg"
            alt="Ardhnarishwar Logo"
            className="w-full h-full object-cover rounded-[15px]"
          />
        </div>
        <div className="min-w-0">
          <b>ARDHNARISHWAR</b>
          <small>HRMS Admin Panel</small>
        </div>
      </div>

      <nav className="adm-nav sidebar-scroll">
        {filteredNavItems.map((item) => {
          const hasChildren = !!item.children?.length;
          const active = isSectionActive(item);

          if (hasChildren) {
            const isOpen = !!openMenu[item.key];
            const children =
              item.key === "dashboard" ? filteredDashboardChildren : item.children;

            return (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.key)}
                  aria-expanded={isOpen}
                  aria-controls={`adm-sub-${item.key}`}
                  className={`adm-grp ${active ? "is-active" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <ChevronDown size={18} className="adm-ch" />
                </button>

                {isOpen && (
                  <div id={`adm-sub-${item.key}`} className="adm-sub mt-1.5">
                    {children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={child.to === "/dashboard/finance"}
                        className={linkClass}
                        onClick={onNavigate}
                      >
                        {child.icon}
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={item.to} className="adm-root">
              <NavLink to={item.to} className={linkClass} onClick={onNavigate}>
                {item.icon}
                {item.label}
              </NavLink>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
