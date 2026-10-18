import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Cake,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getTodayBirthdays, markNotificationsRead } from "../services/notificationService";
import SalesSidebar from "../components/common/SalesSidebar";
import MobileBottomNav from "../components/common/MobileBottomNav";
import { NAV_ITEMS } from "../config/salesNav";

/* ---------- Workspace search: jump to any module ---------- */
function WorkspaceSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return NAV_ITEMS.filter(
      (i) => i.label.toLowerCase().includes(term) || (i.keywords || "").includes(term),
    ).slice(0, 6);
  }, [q]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (item) => {
    navigate(item.to);
    setQ("");
    setFocused(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229 && results[0]) go(results[0]);
    if (e.key === "Escape") setFocused(false);
  };

  const showList = focused && q.trim().length > 0;

  return (
    <div ref={wrapRef} className="relative w-full max-w-xs sm:max-w-sm">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={onKeyDown}
        placeholder="Search workspace"
        aria-label="Search workspace modules"
        className="h-11 w-full rounded-2xl border border-white/70 bg-white pl-11 pr-4 text-sm text-slate-800 shadow-card outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
      />
      {showList && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-2xl border border-white/70 bg-white p-1.5 shadow-float"
        >
          {results.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-slate-400">No module matches &ldquo;{q}&rdquo;</li>
          )}
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Icon size={16} aria-hidden="true" className="text-slate-400" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Top bar ---------- */
function Topbar({ setOpen, collapsed, setCollapsed }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    (async () => {
      try {
        const res = await getTodayBirthdays();
        setNotifications(res?.data?.data || []);
      } catch (err) {
        console.log(err);
      }
    })();
  }, []);

  const handleBellClick = async () => {
    setNotifOpen((v) => !v);
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.log(err);
    }
  };

  const doLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between gap-3 px-3 pb-3 pt-3 sm:px-5 sm:pt-4 lg:px-6 lg:pt-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="icon-btn shrink-0 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="icon-btn hidden shrink-0 lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <WorkspaceSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={handleBellClick}
            aria-label="Notifications"
            className="icon-btn relative"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-float">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <Cake size={15} aria-hidden="true" className="text-brand-600" />
                  <span className="text-xs font-bold text-slate-800">Birthdays today</span>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-slate-400">No notifications today</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-slate-700">
                        Happy birthday, {n.name}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <button type="button" onClick={doLogout} aria-label="Logout" title="Logout" className="icon-btn hover:text-rose-600">
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}

/* ---------- Shell ---------- */
export default function SalesLayout({ children }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="sp-shell flex h-[100dvh] overflow-hidden">
      <SalesSidebar open={open} collapsed={collapsed} setOpen={setOpen} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar setOpen={setOpen} collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 pt-1 sm:px-5 lg:px-6">
          <div className="sp-rise">{children}</div>
          {/* keeps the last row clear of the floating phone nav */}
          <div className="h-20 md:hidden" aria-hidden="true" />
        </main>
      </div>
      {/* Rendered outside <main> so no transformed/scrolling ancestor breaks position: fixed */}
      <MobileBottomNav />
    </div>
  );
}
