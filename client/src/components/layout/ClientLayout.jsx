import { Outlet } from "react-router-dom";
import { useState } from "react";
import ClientSidebar from "./ClientSidebar";
import ClientNavbar from "./ClientNavbar";

// Floating-card shell: rounded white sidebar + transparent main column over the
// soft violet gradient canvas (see .cp-* classes in index.css).
export default function ClientLayout() {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop sidebar hidden

  const toggleSidebar = () => {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (isMobile) setOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <div className={`cp-shell ${collapsed ? "cp-shell--collapsed" : ""}`}>
      <ClientSidebar open={open} setOpen={setOpen} />

      <div className="cp-main">
        <ClientNavbar setOpen={setOpen} onToggleSidebar={toggleSidebar} />

        <main className="cp-content animate-fadeUp">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
