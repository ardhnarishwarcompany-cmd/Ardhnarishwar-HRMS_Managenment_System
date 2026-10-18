import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  Palmtree,
  Target,
  UserCircle2,
  WalletCards,
  X,
  BarChart3,
  BookOpen,
  MessageSquare,
  CheckCheck,
} from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../api/notifications.js";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assignments", label: "My Assignments", icon: ClipboardList },
  { to: "/eod", label: "My EOD", icon: FileText },
  { to: "/targets", label: "My Targets", icon: Target },
  { to: "/performance", label: "Performance", icon: BarChart3 },
  { to: "/sops", label: "SOP Library", icon: BookOpen },
  { to: "/attendance", label: "Attendance", icon: Fingerprint },
  { to: "/leave", label: "Leave Management", icon: CalendarDays },
  { to: "/compensation", label: "Compensation", icon: WalletCards },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/profile", label: "My Profile", icon: UserCircle2 },
];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function EmployeeNavbar({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { employee, logout } = useEmployeeAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const pollRef = useRef(null);


  useEffect(() => {
    setMobileOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  const loadNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await fetchNotifications();
      setNotifications(res.data?.data || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    pollRef.current = setInterval(loadNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleBellClick = () => {
    setNotifOpen((open) => !open);
  };

  const handleNotifClick = async (n) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: 1 } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Failed to mark notification read", err);
      }
    }
    if (n.link) {
      setNotifOpen(false);
      navigate(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const pageTitle = useMemo(() => {
    const found = NAV_ITEMS.find((item) => item.to === pathname);
    return found?.label || "Dashboard";
  }, [pathname]);

  const initials = (employee?.name || "Employee")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AS";


  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    if (window.innerWidth > 900) {
      setSidebarVisible((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  };

  return (
    <>
      {sidebarVisible && (
        <aside className="employee-sidebar" aria-label="Employee navigation">
          <div className="brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
            <div className="logo">
              <img src="/logo.jpeg" alt="Ardhnarishwar" className="w-full h-full object-cover" />
            </div>
            <div>
              <b>ARDHNARISHWAR</b>
              <small>HRMS EMPLOYEE PORTAL</small>
            </div>
          </div>

          <div className="lbl">WORKSPACE</div>
          <nav className="employee-nav">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `employee-nav-link ${isActive ? "is-active on" : ""}`}
              >
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="user" onClick={() => navigate("/profile")} role="button" tabIndex={0}>
            <div className="av">{initials}</div>
            <div>
              <b>{employee?.name || "Aarav Sharma"}</b>
              <small>{employee?.department || "IT"}</small>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-72 bg-[var(--card)] p-5 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
              <div className="brand p-0">
                <div className="logo">
                  <img src="/logo.jpeg" alt="Ardhnarishwar" className="w-full h-full object-cover" />
                </div>
                <div><b>ARDHNARISHWAR</b><small>EMPLOYEE PORTAL</small></div>
              </div>
              <button className="ib w-9 h-9 rounded-xl" onClick={() => setMobileOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lbl mt-3">WORKSPACE</div>
            <nav className="employee-nav flex-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `employee-nav-link ${isActive ? "is-active on" : ""}`}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="user mt-auto" onClick={() => { setMobileOpen(false); navigate("/profile"); }}>
              <div className="av">{initials}</div>
              <div>
                <b>{employee?.name || "Aarav Sharma"}</b>
                <small>{employee?.department || "IT"}</small>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main app content column */}
      <main className="employee-app-content">
        <header className="top">
          <button className="ib" id="tg" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg className="i" viewBox="0 0 24 24" style={{ width: 19, height: 19, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M15 9l-3 3 3 3" />
            </svg>
          </button>

          <div className="wl">
            <b id="pt">{pageTitle}</b>
            <span>Employee Workspace</span>
          </div>

          <div className="sp" />


          <div className="relative">
            <button className="ib" onClick={handleBellClick} aria-label="Notifications" title="Notifications">
              <Bell size={20} />
              {unreadCount > 0 && <span className="dot" />}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+10px)] w-80 max-h-96 overflow-y-auto bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl z-50 p-2">
                  <div className="flex justify-between items-center p-3 border-b border-[var(--line)]">
                    <strong className="text-sm font-bold text-[var(--ink)]">Notifications</strong>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-xs text-[var(--p)] font-bold hover:underline"
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  {loadingNotifs && (
                    <div className="p-4 text-xs text-[var(--mute)] text-center">Loading...</div>
                  )}

                  {!loadingNotifs && notifications.length === 0 && (
                    <div className="p-6 text-xs text-[var(--mute)] text-center">No notifications yet</div>
                  )}

                  {!loadingNotifs &&
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`p-3 rounded-xl border-b border-[var(--line)] last:border-0 cursor-pointer transition ${
                          n.isRead ? "hover:bg-[var(--soft)]" : "bg-purple-50/50 hover:bg-purple-50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <strong className="text-xs font-bold text-[var(--ink)]">{n.title}</strong>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[var(--p)] shrink-0 mt-1" />
                          )}
                        </div>
                        {n.message && (
                          <div className="text-xs text-[var(--mute)] mt-1">{n.message}</div>
                        )}
                        <div className="text-[10px] text-[var(--mute)] mt-1">{timeAgo(n.createdAt)}</div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>

          <div className="chip-user" onClick={() => navigate("/profile")} role="button" tabIndex={0}>
            <div className="av">{initials}</div>
            <div>
              <b>{employee?.name || "Aarav Sharma"}</b>
              <small>{employee?.email || "aarav@demo.hrms"}</small>
            </div>
          </div>

          <button className="lo" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </header>

        {children}
      </main>
    </>
  );
}
