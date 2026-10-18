import { isValidElement } from "react";

// Renders icon prop whether it is a component reference (icon={Users})
// or an already-created element (icon={<Users size={26} />}).
function RenderIcon({ icon, size }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon;
  return <Icon size={size} strokeWidth={1.8} />;
}

// Shared empty state: soft rounded icon box + message + optional action.
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      {icon ? (
        <span className="empty-state-icon">
          <RenderIcon icon={icon} size={30} />
        </span>
      ) : null}
      <div>
        <p className="empty-state-title">{title}</p>
        {message ? (
          <p className="empty-state-message text-pretty">{message}</p>
        ) : null}
      </div>
      {action || null}
    </div>
  );
}
