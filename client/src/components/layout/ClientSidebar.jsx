import { NavLink } from "react-router-dom";
import { CLIENT_MENU } from "../../config/clientMenu.config";
import FeatureGuard from "../featureToggle/FeatureGuard";
import { useClientAuth } from "../../context/ClientAuthContext";

const initialOf = (value) =>
  String(value || "A")
    .trim()
    .charAt(0)
    .toUpperCase() || "A";

export default function ClientSidebar({ open, setOpen }) {
  const { client } = useClientAuth();

  const displayName =
    client?.company_name || client?.name || client?.full_name || "Client";
  const isEmployee =
    String(client?.role || "").toUpperCase() === "CLIENT_EMPLOYEE";
  const roleLabel = isEmployee ? "Employee" : "Client";

  return (
    <>
      {/* Overlay (mobile drawer) */}
      <div
        className={`cp-overlay ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className={`cp-aside ${open ? "is-open" : ""}`}>
        {/* Brand */}
        <div className="cp-brand">
          <div className="cp-logo" aria-hidden="true">
            <img src="/logo.jpeg" alt="Ardhnarishwar" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <b>ARDHNARISHWAR</b>
            <small>HRMS CLIENT PANEL</small>
          </div>
        </div>

        {/* Menu */}
        <nav className="cp-nav" aria-label="Client navigation">
          {CLIENT_MENU.map((item) => {
            const Icon = item.icon;

            return (
              <FeatureGuard key={item.key} featureKey={item.key}>
                <NavLink
                  to={item.path}
                  onClick={() => setOpen(false)} // auto close on mobile
                  className={({ isActive }) =>
                    `cp-nav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </FeatureGuard>
            );
          })}
        </nav>

        {/* Signed-in user card */}
        <div className="cp-user">
          <div className="cp-avatar" aria-hidden="true">
            {initialOf(displayName)}
          </div>
          <div className="min-w-0">
            <b className="truncate">{displayName}</b>
            <small className="truncate">
              {roleLabel}
              {client?.client_code ? ` · ${client.client_code}` : ""}
            </small>
          </div>
        </div>
      </aside>
    </>
  );
}
