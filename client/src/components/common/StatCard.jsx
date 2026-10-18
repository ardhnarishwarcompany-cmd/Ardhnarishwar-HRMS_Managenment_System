import { isValidElement } from "react";

// Renders icon prop whether it is a component reference (icon={Users})
// or an already-created element (icon={<Users size={18} />}).
function RenderIcon({ icon, size }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon;
  return <Icon size={size} strokeWidth={1.8} />;
}

// Shared KPI card: coloured top accent bar + solid gradient icon tile on the left,
// uppercase label, large value, muted hint.
// accent: indigo | violet | emerald | amber | rose | sky | slate
// Accepts label/hint or title/subText prop aliases; optional onClick + active.
export default function StatCard({
  label,
  title,
  value,
  hint,
  subText,
  icon,
  accent = "indigo",
  active = false,
  onClick,
}) {
  const heading = label || title;
  const sub = hint || subText;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={`stat-card stat-accent-${accent} text-left w-full ${
        onClick ? "cursor-pointer" : ""
      } ${active ? "is-active" : ""}`}
    >
      {icon ? (
        <span className="stat-card-icon">
          <RenderIcon icon={icon} size={22} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <small className="stat-card-label">{heading}</small>
        <strong className="stat-card-value">{value}</strong>
        {sub ? <em className="stat-card-sub">{sub}</em> : null}
      </div>
    </Tag>
  );
}
