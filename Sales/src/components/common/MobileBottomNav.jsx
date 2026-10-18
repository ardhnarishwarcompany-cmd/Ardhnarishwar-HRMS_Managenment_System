import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, X } from "lucide-react";
import { NAV_ITEMS, activeNavItem } from "../../config/salesNav";

const PINNED = ["Dashboard", "Leads & Pipeline", "Calls & Follow-ups", "Clients"];

/**
 * Phone-only bottom navigation (hidden from md up).
 * Four pinned modules plus a "More" sheet listing every other route.
 * Sits at z-30 so page modals (z-50) always cover it.
 */
export default function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const current = activeNavItem(pathname);

  const pinned = PINNED.map((label) => NAV_ITEMS.find((i) => i.label === label)).filter(Boolean);
  const rest = NAV_ITEMS.filter((i) => !pinned.includes(i));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 shadow-float">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">All modules</h3>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rest.map((item) => {
                const Icon = item.icon;
                const active = item === current;
                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center text-[11px] font-semibold leading-tight ${
                      active
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-slate-100 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-30 rounded-3xl border border-white/70 bg-white shadow-float md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch px-1 py-1.5">
          {pinned.map((item) => {
            const Icon = item.icon;
            const active = item === current;
            const short = item.label.split(" ")[0].replace("&", "").trim();
            return (
              <NavLink
                key={item.label}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition ${
                  active ? "bg-brand-gradient text-white shadow-brand" : "text-slate-500"
                }`}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{short}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold text-slate-500"
          >
            <LayoutGrid size={19} aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
