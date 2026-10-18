/* Lavender hero band — violet → magenta gradient, 30px radius.
   Same prop API as before (title, desc) so all existing pages upgrade automatically.
   Optional: icon (lucide component), actions (right-side node). */
export default function PageHeader({ title, desc, icon: Icon, actions }) {
  return (
    <div className="adm-hero mb-6">
      <div className="adm-hero-main">
        {Icon ? (
          <span className="adm-hero-icon">
            <Icon size={24} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="adm-hero-title">{title}</h1>
          {desc && <p className="adm-hero-sub">{desc}</p>}
        </div>
      </div>
      {actions ? <div className="adm-hero-actions">{actions}</div> : null}
    </div>
  );
}
