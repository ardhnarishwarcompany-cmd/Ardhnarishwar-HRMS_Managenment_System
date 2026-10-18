/**
 * Solid gradient stat tile.
 * `gradient` is a Tailwind background class string, e.g.
 * "bg-gradient-to-br from-blue-500 to-blue-700".
 */
export default function StatCard({
  title,
  value,
  subText,
  icon,
  gradient = "bg-gradient-to-br from-brand-600 to-magenta-600",
}) {
  return (
    <div
      className={`sp-tile group p-5 transition-transform duration-300 hover:-translate-y-1 ${gradient}`}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.14em] text-white/95">
          {title}
        </p>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 [&_svg]:h-[18px] [&_svg]:w-[18px]">
            {icon}
          </div>
        )}
      </div>

      <h2 className="relative z-10 mt-3 truncate text-4xl font-extrabold leading-none tracking-tight">
        {value}
      </h2>

      {subText && (
        <p className="relative z-10 mt-3 text-xs font-medium leading-relaxed text-white/85">
          {subText}
        </p>
      )}
    </div>
  );
}
