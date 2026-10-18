import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, Cake, ChevronDown, ClipboardList, CalendarCheck,
  Timer, GitPullRequest, Flag, BarChart3, Bug, Rocket, BookOpen, Video,
  FileBarChart, Code2, MessageSquare, Fingerprint, Award, ScrollText,
  Target, Briefcase, FileText, MessageCircleWarning, LayoutDashboard,
  LogOut, Search, X, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { getTodayBirthdays, markNotificationsRead } from "../../services/notificationService";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useHrAuth } from "../../context/HrAuthContext";

export const IT_MODULES = [
  { title: "Task Assignment", path: "/it/tasks", icon: ClipboardList, desc: "Manage your task assignment easily", category: "Work" },
  { title: "Daily Work Submission", path: "/it/daily-work", icon: CalendarCheck, desc: "Manage your daily work submission easily", category: "Work" },
  { title: "Timesheet", path: "/it/timesheet", icon: Timer, desc: "Manage your timesheet easily", category: "Work" },
  { title: "Code Review Status", path: "/it/code-reviews", icon: GitPullRequest, desc: "Manage your code review status easily", category: "Quality" },
  { title: "Project Milestone Tracker", path: "/it/milestones", icon: Flag, desc: "Manage your project milestone tracker easily", category: "Delivery" },
  { title: "Performance Reporting", path: "/it/performance-report", icon: BarChart3, desc: "Your tasks, hours, merged PRs and bugs at a glance", category: "Insights" },
  { title: "Bug Reporting", path: "/it/bugs", icon: Bug, desc: "Manage your bug reporting easily", category: "Quality" },
  { title: "Feature Deployment Log", path: "/it/deployments", icon: Rocket, desc: "Manage your feature deployment log easily", category: "Delivery" },
  { title: "SOP Management", path: "/it/sop", icon: BookOpen, desc: "Manage your SOP management easily", category: "Knowledge" },
  { title: "Video Documentation", path: "/it/videos", icon: Video, desc: "Manage your video documentation easily", category: "Knowledge" },
  { title: "Project Reports", path: "/it/project-reports", icon: FileBarChart, desc: "Manage your project reports easily", category: "Insights" },
  { title: "Source Code", path: "/it/source-code", icon: Code2, desc: "Manage your source code easily", category: "Quality" },
  { title: "Chat", path: "/chat", icon: MessageSquare, desc: "Manage your chat easily", category: "Work" },
  { title: "Automated Attendance", path: "/attendance", icon: Fingerprint, desc: "Manage your automated attendance easily", category: "Work" },
  { title: "Performance", path: "/my-performance", icon: Award, desc: "Your HR performance reviews and ratings", category: "Insights" },
  { title: "Work Policy", path: "/work-policy", icon: ScrollText, desc: "Manage your work policy easily", category: "Knowledge" },
  { title: "My Targets", path: "/my-targets", icon: Target, desc: "Manage your my targets easily", category: "Work" },
  { title: "My assignments", path: "/my-assignments", icon: Briefcase, desc: "Manage your my assignments easily", category: "Work" },
  { title: "EOD", path: "/my-eod", icon: FileText, desc: "Manage your eod easily", category: "Work" },
  { title: "Complaint box", path: "/complaint", icon: MessageCircleWarning, desc: "Manage your complaint box easily", category: "Quality" },
];

export const IT_MENU_ITEMS = IT_MODULES.map(m => [m.title, m.path, m.icon]);

const getInitials = (name = "") => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function ITSidebar({ collapsed, mobileOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const { employee } = useHrAuth();

  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("hrms_it_User") || "{}"); } catch { return {}; }
  }, []);
  const user = employee || stored || {};
  const displayName = user.name || user.fullName || user.employee_name || user.first_name || (user.email ? user.email.split("@")[0] : "") || "User";
  const initial = getInitials(displayName);

  return (
    <>
      {mobileOpen && <button aria-label="Close menu" onClick={onClose} className="it-sidebar-overlay" />}
      <aside className={`it-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
        <div className="brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
          <img src="/logo.jpeg" alt="Ardhnarishwar" className="logo object-cover" />
          {!collapsed && (
            <div>
              <b>ARDHNARISHWAR</b>
              <small>IT DASHBOARD</small>
            </div>
          )}
        </div>

        <div className="lbl">WORKSPACE</div>
        <button
          className="grp"
          aria-expanded={workspaceOpen}
          onClick={() => setWorkspaceOpen(v => !v)}
          title={collapsed ? "Workspace: Dashboard" : undefined}
        >
          <LayoutDashboard size={19} />
          {!collapsed && (
            <>
              <span>Dashboard</span>
              <ChevronDown className="ch" size={17} />
            </>
          )}
        </button>
        {workspaceOpen && !collapsed && (
          <div className="sub">
            <NavLink to="/dashboard" end onClick={onClose}>
              Overview
            </NavLink>
          </div>
        )}

        <div className="lbl">IT FEATURES</div>
        <nav className="it-nav-scroll">
          {IT_MODULES.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(`${item.path}/`));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={active ? "on" : ""}
                title={collapsed ? item.title : undefined}
              >
                <Icon size={19} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="user">
          <div className="av">{initial}</div>
          {!collapsed && (
            <div>
              <b>{displayName}</b>
              <small>{user.role || "IT Engineer"}</small>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function ITTopbar({ collapsed, setCollapsed, onMobileMenu, notifications, openNotifications }) {
  const { employee, logout } = useHrAuth();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState("");

  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("hrms_it_User") || "{}"); } catch { return {}; }
  }, []);
  const user = employee || stored || {};
  const displayName = user.name || user.fullName || user.employee_name || user.first_name || (user.email ? user.email.split("@")[0] : "") || "User";
  const displayEmail = user.email || "";
  const initial = getInitials(displayName);

  const handleLogout = () => { logout(); navigate("/"); };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        const input = document.getElementById("it-search-input");
        if (input) input.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" && searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const match = IT_MODULES.find(m => m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));
      if (match) {
        navigate(match.path);
        setSearchVal("");
      }
    }
  };

  return (
    <div className="top">
      <button className="ib" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar">
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>
      <label className="search" htmlFor="it-search-input">
        <Search size={18} />
        <input
          id="it-search-input"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleSearchSubmit}
          placeholder="Search IT features…"
          aria-label="Search IT features"
          autoComplete="off"
        />
        <kbd>/</kbd>
      </label>
      <div className="sp" />
      <button className="ib" onClick={openNotifications} aria-label="Notifications">
        <Bell size={20} />
        {notifications.length > 0 && <span className="dot" />}
      </button>
      <div className="chip-user">
        <div className="av">{initial}</div>
        <div>
          <b>{displayName}</b>
          <small>{displayEmail}</small>
        </div>
      </div>
      <button className="lo" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </div>
  );
}

export function ITLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);

  useEffect(() => {
    if (location.pathname === "/dashboard" || location.pathname === "/") {
      document.title = "IT Dashboard | Ardhnarishwar";
    } else {
      const match = IT_MODULES.find(m => m.path === location.pathname || (m.path !== "/dashboard" && location.pathname.startsWith(m.path)));
      const name = match ? match.title : "IT Dashboard";
      document.title = `${name} | Ardhnarishwar`;
    }
  }, [location.pathname]);

  useEffect(() => {
    getTodayBirthdays().then(res => setNotifications(res?.data?.data || [])).catch(() => {});
  }, []);

  const toggleNotifications = async () => {
    setOpenNotifications(v => !v);
    try {
      await markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  return (
    <div className={`it-layout-root ${collapsed ? "is-collapsed" : ""}`}>
      <ITSidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="it-main-content">
        <ITTopbar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onMobileMenu={() => setMobileOpen(true)}
          notifications={notifications}
          openNotifications={toggleNotifications}
        />

        {openNotifications && (
          <>
            <button className="it-sidebar-overlay" onClick={() => setOpenNotifications(false)} aria-label="Close notifications" />
            <aside className="it-notification-panel">
              <div className="it-notification-head">
                <div>
                  <strong>Today&apos;s Birthdays & Alerts</strong>
                  <small>Notifications & updates</small>
                </div>
                <button onClick={() => setOpenNotifications(false)}><X size={18} /></button>
              </div>
              <div className="it-notification-body">
                {notifications.length === 0 ? (
                  <p className="it-empty">No birthdays today</p>
                ) : (
                  notifications.map(n => (
                    <div className="it-birthday" key={n.id}>
                      <Cake size={17} />
                      <strong>{n.name}</strong>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 min-w-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function ITShell({ title, subtitle, icon: Icon, action, children }) {
  return (
    <div className="it-module-page">
      {(title || action) && (
        <div className="it-module-header">
          <div className="it-module-title-wrap">
            {Icon && (
              <div className="it-module-icon">
                <Icon size={24} />
              </div>
            )}
            <div>
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {action && <div className="it-module-actions">{action}</div>}
        </div>
      )}
      <div className="it-module-body">{children}</div>
    </div>
  );
}
