import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { TrendingUp, X, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NAV_SECTIONS, activeNavItem, getInitials } from "../../config/salesNav";

/**
 * Floating white sidebar card.
 * - lg+: static column with 1rem gutter, collapsible to an icon rail
 * - <lg: slide-in drawer with a backdrop
 */
export default function SalesSidebar({ open, collapsed, setOpen }) {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = activeNavItem(pathname);

  const userName = auth?.user?.name || auth?.user?.email || "Sales User";
  const initials = getInitials(auth?.user?.name || auth?.user?.email);

  const doLogout = () => {
    logout();
    setOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        aria-label="Sales navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col bg-white shadow-float transition-all duration-300 ease-out
          rounded-r-3xl lg:static lg:my-4 lg:ml-4 lg:h-[calc(100vh-2rem)] lg:rounded-3xl lg:border lg:border-white/70 lg:shadow-card
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-[88px]" : "lg:w-[268px]"}`}
      >
        {/* Brand */}
        <div className={`flex shrink-0 items-center gap-3 px-5 pb-5 pt-6 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient shadow-brand">
            <img src="/logo.jpeg" alt="Ardhnarishwar" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-extrabold tracking-tight text-slate-900">Sales Portal</div>
              <div className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700/70">HRMS Workspace</div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {section.title}
                </div>
              )}
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = item === current;
                  return (
                    <li key={item.label}>
                      <NavLink
                        to={item.to}
                        onClick={() => setOpen(false)}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-200
                          ${collapsed ? "lg:justify-center lg:px-0" : ""}
                          ${active
                            ? "bg-brand-gradient text-white shadow-brand"
                            : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"}`}
                      >
                        <Icon
                          size={18}
                          strokeWidth={2.2}
                          aria-hidden="true"
                          className={`shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-brand-600"}`}
                        />
                        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="shrink-0 p-3">
          <div
            className={`sp-user-card flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-50 to-pink-50 p-3 ${collapsed ? "lg:justify-center lg:p-2" : ""}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-extrabold text-white shadow-brand">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">{userName}</div>
                  <div className="truncate text-[11px] font-medium text-slate-500">Sales Executive</div>
                </div>
                <button
                  type="button"
                  onClick={doLogout}
                  aria-label="Logout"
                  title="Logout"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
