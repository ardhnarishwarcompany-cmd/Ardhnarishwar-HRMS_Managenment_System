import { LogOut, PanelLeft } from "lucide-react";
import { useClientAuth } from "../../context/ClientAuthContext";

export default function ClientNavbar({ setOpen, onToggleSidebar }) {
  const { client, logout } = useClientAuth();

  const handleToggle = () => {
    if (onToggleSidebar) onToggleSidebar();
    else setOpen?.(true);
  };

  const displayName =
    client?.company_name || client?.name || client?.full_name || "Client Portal";

  return (
    <header className="cp-top">
      <button
        type="button"
        onClick={handleToggle}
        className="cp-ib"
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={19} strokeWidth={1.8} />
      </button>

      <div className="cp-welcome">
        <b>Welcome back</b>
        <span>
          {displayName}
          {client?.client_code && (
            <i className="cp-cid">{client.client_code}</i>
          )}
        </span>
      </div>

      <div className="cp-sp" />

      <button type="button" onClick={logout} className="cp-logout">
        <LogOut size={18} strokeWidth={1.8} />
        <span>Logout</span>
      </button>
    </header>
  );
}
