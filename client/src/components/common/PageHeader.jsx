import { isValidElement } from "react";

// Renders icon prop whether it is a component reference (icon={Users})
// or an already-created element (icon={<Users size={22} />}).
function RenderIcon({ icon, size }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon;
  return <Icon size={size} strokeWidth={1.8} />;
}

// Shared page header: gradient icon tile + large title + subtitle + actions slot.
// Wraps gracefully on mobile (actions drop below the title).
export default function PageHeader({ icon, title, subtitle, desc, actions }) {
  const sub = subtitle || desc;
  return (
    <div className="page-header animate-fadeUp">
      <div className="page-header-main">
        {icon ? (
          <span className="page-header-icon">
            <RenderIcon icon={icon} size={26} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="page-header-title text-balance">{title}</h1>
          {sub ? (
            <p className="page-header-subtitle text-pretty">{sub}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
