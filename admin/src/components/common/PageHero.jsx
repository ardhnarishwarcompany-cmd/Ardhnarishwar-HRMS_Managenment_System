/**
 * PageHero — shared lavender gradient page header.
 *
 * Props:
 *  - title      : string (required)
 *  - subtitle   : string
 *  - chips      : [{ icon: <LucideIcon size={12}/>, label: "6 Departments" }]
 *  - actions    : ReactNode (buttons rendered on the right)
 *  - size       : "lg" for the dashboard overview (bigger type),
 *                 "sm" for pages whose table must fit beneath the hero
 */
export default function PageHero({ title, subtitle, chips = [], actions, size }) {
  const sizeClass = size === "lg" ? "adm-hero-lg" : size === "sm" ? "adm-hero-sm" : "";
  return (
    <div className={`adm-hero mb-6 ${sizeClass}`}>
      <div className="min-w-0 flex-1 basis-[320px]">
        <h1 className="adm-hero-title">{title}</h1>
        {subtitle && <p className="adm-hero-sub">{subtitle}</p>}
        {chips.length > 0 && (
          <div className="adm-hero-chips">
            {chips.map((chip, i) => (
              <span key={i} className="adm-chip">
                {chip.icon}
                {chip.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {actions && <div className="adm-hero-actions">{actions}</div>}
    </div>
  );
}
