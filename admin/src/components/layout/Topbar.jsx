import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LogOut,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Cake,
} from "lucide-react";
import {
  getTodayBirthdays,
  markNotificationsRead,
  getNotifications,
} from "../../services/notificationService.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "/api";

export default function Topbar({ onToggleSidebar, sidebarCollapsed = false }) {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [sysNotifs, setSysNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  // const [birthdays, setBirthdays] = useState([]);
  const [slides, setSlides] = useState([]);

  const [openDropdown, setOpenDropdown] = useState(false);

  // const unreadCount = notifications.filter((n) => !n.is_read).length;
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      const list = res?.data?.data || [];
      setNotifications(list);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchBirthdays = async () => {
    try {
      const res = await getTodayBirthdays();
      const list = res?.data?.data || [];

      // setBirthdays(list);
      setNotifications(list);

      const todayKey = `birthday_seen_${new Date().toDateString()}`;
      const alreadySeen = localStorage.getItem(todayKey);

      if (!alreadySeen && list.length > 0) {
        const newSlides = [];

        list.forEach((b, index) => {
          const isMe = Number(b.id) === Number(auth?.user?.id);

          newSlides.push({
            id: b.id,
            message: isMe
              ? "🎂 Happy Birthday to you!"
              : `🎉 Happy Birthday ${b.name}`,
          });
        });

        setSlides(newSlides);

        const ANIMATION_DURATION = 10000; // 10s
        const DELAY_PER_SLIDE = 2000; // 2s

        setTimeout(
          () => {
            setSlides([]);
          },
          ANIMATION_DURATION + list.length * DELAY_PER_SLIDE,
        );
        localStorage.setItem(todayKey, "true");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchSystemNotifs = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("hrms_admin_token")}`,
          },
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      setSysNotifs(data.notifications || []);
      setUnread(data.unread || 0);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchBirthdays();
    fetchNotifications();
    fetchSystemNotifs();
    const t = setInterval(fetchSystemNotifs, 60000);
    return () => clearInterval(t);
  }, []);

  const handleBellClick = async () => {
    setOpenDropdown(!openDropdown);

    try {
      await markNotificationsRead();

      // update UI instantly
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.log(err);
    }

    try {
      await fetch(
        `${API_BASE_URL}/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("hrms_admin_token")}`,
          },
        },
      );
      setUnread(0);
      setSysNotifs((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <header className="adm-top">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="adm-ib"
          aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>

        <div className="adm-title">
          <b>Admin Dashboard</b>
          <span>HRMS Control Center</span>
        </div>

        <div className="adm-sp" />

        {/* Notifications */}
        <button
          type="button"
          onClick={handleBellClick}
          className="adm-ib"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell size={20} />
          {unread > 0 && <span className="adm-badge">{unread}</span>}
        </button>

        <div className="adm-who">
          <b>{auth?.user?.name || "Admin"}</b>
          <small>{auth?.user?.email || "admin@hrms.com"}</small>
        </div>

        <button type="button" onClick={handleLogout} className="adm-lo">
          <LogOut size={18} />
          <span>Logout</span>
        </button>

        {/* Birthday slide-across banners */}
        <div className="pointer-events-none fixed left-0 top-24 z-50 w-full">
          {slides.map((s, index) => (
            <div
              key={s.id}
              className="animate-slide-across absolute left-0 rounded-2xl border px-4 py-3 text-sm font-semibold"
              style={{
                top: `${index * 60}px`,
                animationDelay: `${index * 1.5}s`,
                background: "var(--card)",
                borderColor: "var(--line)",
                boxShadow: "var(--shadow-lg)",
                color: "var(--ink)",
              }}
            >
              {s.message}
            </div>
          ))}
        </div>
      </header>

      {/* Notifications drawer */}
      <aside
        className={`adm-drawer ${openDropdown ? "is-open" : ""}`}
        aria-label="Notifications"
        aria-hidden={!openDropdown}
      >
        <div className="adm-drawer-h">
          <div className="flex items-center gap-3">
            <span className="adm-card-ic" style={{ width: 40, height: 40, borderRadius: 12 }}>
              <Cake size={18} />
            </span>
            <b>Notifications</b>
          </div>
          <button
            type="button"
            onClick={() => setOpenDropdown(false)}
            className="adm-ib"
            style={{ width: 40, height: 40, borderRadius: 12, boxShadow: "none", background: "var(--soft)" }}
            aria-label="Close notifications"
          >
            <X size={16} />
          </button>
        </div>

        <div className="adm-drawer-b">
          {sysNotifs.length > 0 && (
            <>
              <p className="adm-eyebrow">System</p>
              {sysNotifs.slice(0, 30).map((n) => (
                <button
                  key={`sys-${n.id}`}
                  type="button"
                  onClick={() => {
                    setOpenDropdown(false);
                    if (n.link) navigate(n.link);
                  }}
                  className={`adm-note ${n.is_read ? "" : "is-unread"}`}
                >
                  <span className="block font-bold">{n.title}</span>
                  {n.body && <small>{n.body}</small>}
                  <small>{new Date(n.created_at).toLocaleString()}</small>
                </button>
              ))}
            </>
          )}

          <p className="adm-eyebrow mt-2">Birthdays today</p>
          {notifications.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--mute)" }}>
              No birthdays today
            </p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="adm-note">
                <span className="block font-bold">{n.name || "No Name"}</span>
                <small>{n.email || "No Email"}</small>
              </div>
            ))
          )}
        </div>
      </aside>

      {openDropdown && (
        <div className="adm-overlay" onClick={() => setOpenDropdown(false)} aria-hidden="true" />
      )}
    </>
  );
}
