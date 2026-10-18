/**
 * Shared UI primitives for admin dashboard pages.
 * Design system: lavender canvas, violet → magenta hero band, white 28px cards.
 * Prop APIs are unchanged from the previous version.
 */

/* Gradient hero band shown at the top of every page.
   Props:
   - eyebrow: small uppercase label (e.g. "OPERATIONS")
   - title: page title
   - subtitle: one-line description
   - icon: optional lucide icon component rendered in a frosted tile
   - actions: right-side node (buttons, search, chips)
   - children: optional extra content below the header row (alerts, tabs) */
export function PageHero({ eyebrow, title, subtitle, icon: Icon, actions, children }) {
  return (
    <div className="adm-hero">
      <div className="adm-hero-main">
        {Icon ? (
          <span className="adm-hero-icon">
            <Icon size={24} />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="adm-hero-eyebrow">{eyebrow}</p> : null}
          <h1 className="adm-hero-title">{title}</h1>
          {subtitle ? <p className="adm-hero-sub">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="adm-hero-actions">{actions}</div> : null}
      {children ? <div className="adm-hero-extra">{children}</div> : null}
    </div>
  );
}

/* Frosted stat chip that sits inside the hero actions area. */
export function HeroStat({ label, value, tone = "default" }) {
  const tones = {
    default: "#fff",
    green: "#a7f3d0",
    amber: "#fde68a",
    red: "#fecdd3",
  };
  return (
    <span className="adm-chip">
      {label}
      <strong className="num" style={{ color: tones[tone] || tones.default }}>
        {value}
      </strong>
    </span>
  );
}

/* KPI card for grids below the hero.
   tone: indigo | green | amber | red | violet | slate */
const STAT_TONES = {
  indigo: { tile: "#ede9fe", fg: "#6d28d9", value: "var(--ink)" },
  violet: { tile: "#fae8ff", fg: "#a21caf", value: "var(--ink)" },
  green: { tile: "#d9f7e8", fg: "#047857", value: "#047857" },
  amber: { tile: "#fef3c7", fg: "#b45309", value: "#b45309" },
  red: { tile: "#fee2e2", fg: "#b91c1c", value: "#b91c1c" },
  slate: { tile: "var(--soft)", fg: "var(--mute)", value: "var(--ink)" },
};

export function StatCard({ label, value, sub, icon: Icon, tone = "indigo" }) {
  const t = STAT_TONES[tone] || STAT_TONES.indigo;
  return (
    <div className="adm-k is-s" style={{ "--k-tile": t.tile, "--k-fg": t.fg }}>
      <div className="adm-k-top">
        <p className="adm-k-label">{label}</p>
        {Icon ? (
          <span className="adm-k-ic">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
      <strong className="adm-k-value" style={{ color: t.value }}>
        {value}
      </strong>
      {sub ? <p className="adm-k-sub">{sub}</p> : null}
    </div>
  );
}

/* White elevated section card with optional header. */
export function SectionCard({ title, sub, actions, className = "", bodyClassName = "", children }) {
  const hasHeader = title || actions;
  return (
    <div className={`adm-card is-flush ${className}`}>
      {hasHeader ? (
        <div className="adm-card-h">
          <div className="min-w-0">
            {title ? <b>{title}</b> : null}
            {sub ? <small>{sub}</small> : null}
          </div>
          {actions ? <div className="adm-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName || "p-6"}>{children}</div>
    </div>
  );
}

/* Pill-style tab button used for filter rows under the hero. */
export function PillTab({ active, onClick, icon: Icon, children }) {
  return (
    <button type="button" onClick={onClick} className={`adm-pill ${active ? "on" : ""}`}>
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
