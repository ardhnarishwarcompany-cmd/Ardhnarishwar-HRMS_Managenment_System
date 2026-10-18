import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import VoiceAssistant from "../VoiceAssistant";

export default function AdminLayout() {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop hide
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) setOpen((v) => !v);
    else setCollapsed((v) => !v);
  };

  return (
    <div className="adm-shell">
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="adm-overlay lg:hidden"
          aria-hidden="true"
        />
      )}

      <div
        className={`adm-side ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <div className="adm-main">
        <Topbar onToggleSidebar={toggleSidebar} sidebarCollapsed={collapsed} />

        <main className="adm-content">
          <Outlet />
        </main>
      </div>

      <VoiceAssistant />
    </div>
  );
}
