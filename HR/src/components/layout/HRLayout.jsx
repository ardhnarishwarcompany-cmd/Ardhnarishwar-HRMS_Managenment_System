import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, UserPlus, Users, Bot, MessageSquare, ClipboardCheck, BriefcaseBusiness,
  BarChart3, BookOpen, Search, Globe, Target, Laptop, FileEdit,
  MessageCircleWarning, PanelLeft, Bell, LogOut
} from "lucide-react";
import { useHrAuth } from "../../context/HrAuthContext";

const navGroups = [
  {
    title: "WORKSPACE",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "HR OPERATIONS",
    items: [
      { to: "/leads", label: "Lead Assigned to you", icon: BriefcaseBusiness },
      { to: "/new-joining", label: "New Joining", icon: UserPlus },
      { to: "/interview-management", label: "Interview Management", icon: Users },
      { to: "/ai-interviews", label: "AI Robot Interviews", icon: Bot },
      { to: "/chat", label: "Chat", icon: MessageSquare },
      { to: "/attendance", label: "Automated Attendance", icon: ClipboardCheck },
      { to: "/my-performance", label: "Performance", icon: BarChart3 },
      { to: "/work-policy", label: "Work Policy", icon: BookOpen },
      { to: "/advanced-search", label: "Advanced Search", icon: Search },
      { to: "/web-forms", label: "Website Forms", icon: Globe },
      { to: "/sop-management", label: "SOP Management", icon: BookOpen },
      { to: "/my-targets", label: "My Targets", icon: Target },
      { to: "/my-assignments", label: "My Assignments", icon: Laptop },
      { to: "/my-eod", label: "EOD", icon: FileEdit },
      { to: "/complaint", label: "Complaint Box", icon: MessageCircleWarning },
    ],
  },
];

const titles = {
  "/dashboard": ["HR Dashboard", "Human Resources Management"],
  "/new-joining": ["New Joining", "HR Operations"],
  "/interview-management": ["Interview Management", "HR Operations"],
  "/ai-interviews": ["AI Robot Interviews", "AI Interview Management"],
  "/chat": ["Chat", "HR Messaging"],
  "/attendance": ["Attendance", "Attendance Management"],
  "/my-performance": ["Performance", "Performance Management"],
  "/work-policy": ["Work Policy", "Company policies and guidelines"],
  "/sop-management": ["SOP Management", "Standard operating procedures"],
  "/web-forms": ["Website Forms", "Website submissions"],
  "/advanced-search": ["Advanced Search", "Search HR records"],
  "/complaint": ["Complaint Box", "HR complaints and concerns"],
  "/complaints": ["Complaint Box", "HR complaints and concerns"],
  "/work-assignment": ["Work Assignment", "Assigned work"],
  "/work-target": ["Work Target", "Targets and milestones"],
  "/my-targets": ["My Targets", "Your targets"],
  "/my-assignments": ["My Assignments", "Your assigned work"],
  "/my-eod": ["My EOD", "End-of-day reporting"],
  "/eod-report": ["EOD Reports", "Daily reporting"],
  "/leads": ["Leads", "Lead management"],
};

const DESKTOP_BREAKPOINT = 1024;

export default function HRLayout() {
  const { employee, logout } = useHrAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  // detail routes that live under a different prefix than their nav item
  const navAliases = { "/complaint": "/complaints/" };

  const [title, subtitle] = useMemo(() => {
    const exact = titles[location.pathname];
    if (exact) return exact;
    const found = Object.entries(titles).find(
      ([p]) => p !== "/dashboard" && location.pathname.startsWith(p + "/")
    );
    return found ? found[1] : ["HR Dashboard", "Human Resources Management"];
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleSidebar = () => {
    if (window.innerWidth < DESKTOP_BREAKPOINT) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  const displayName = employee?.name || "HR User";
  const displayEmail = employee?.email || "hr@hrms.com";

  return (
    <div className={`hr-layout ${collapsed ? "is-collapsed" : ""}`}>
      <aside className={`hr-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="hr-sidebar-brand">
          <div className="hr-brand-logo" aria-hidden="true">
            <img src="/logo.jpeg" alt="Ardhnarishwar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1>ARDHNARISHWAR</h1>
            <p>HRMS HR Panel</p>
          </div>
        </div>

        <div className="hr-sidebar-content hr-sidebar-scroll">
          {navGroups.map((group) => (
            <section className="hr-nav-group" key={group.title}>
              <div className="hr-nav-title">{group.title}</div>
              <nav>
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/dashboard"}
                    className={({ isActive }) => {
                      const aliasActive =
                        navAliases[to] &&
                        location.pathname.startsWith(navAliases[to]);
                      return `hr-nav-link ${isActive || aliasActive ? "active" : ""}`;
                    }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </section>
          ))}
        </div>

        <div className="hr-sidebar-footer">
          <span className="hr-online-dot" />
          <span>HR Workspace</span>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="hr-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="hr-shell">
        <header className="hr-topbar">
          <button
            className="hr-icon-button"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
            aria-expanded={!collapsed}
          >
            <PanelLeft size={20} strokeWidth={1.8} />
          </button>

          <div className="hr-topbar-title">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="hr-topbar-spacer" />

          <div className="hr-dropdown-wrap">
            <button
              className="hr-icon-button"
              onClick={() => {
                setNotifOpen((v) => !v);
              }}
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>
            {notifOpen && (
              <div className="hr-popover hr-notif-popover">
                <strong>Notifications</strong>
                <span>No new notifications</span>
              </div>
            )}
          </div>

          <div className="hr-user">
            <div className="hr-user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hr-user-text">
              <strong>{displayName}</strong>
              <span>{displayEmail}</span>
            </div>
          </div>

          <button className="hr-logout" onClick={handleLogout}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </header>

        <main className="hr-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
