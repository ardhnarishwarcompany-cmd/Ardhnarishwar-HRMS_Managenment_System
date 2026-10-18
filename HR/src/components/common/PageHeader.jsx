/* Shared module-page header: gradient icon tile + title + subtitle, with an
   optional right-hand slot for the page's existing action buttons.
   Styles live in App.css (.hr-ph*). */
export default function PageHeader({ icon: Icon, title, subtitle, children, className = "" }) {
  return (
    <div className={`hr-ph ${className}`.trim()}>
      {Icon && (
        <div className="hr-ph-icon" aria-hidden="true">
          <Icon size={26} strokeWidth={1.9} />
        </div>
      )}
      <div className="hr-ph-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="hr-ph-actions">{children}</div>}
    </div>
  );
}
