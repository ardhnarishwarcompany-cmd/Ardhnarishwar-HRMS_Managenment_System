import { useRef, useState } from "react";

/**
 * MagicCard — premium card with a mouse-tracked spotlight glow on the border
 * and a soft radial highlight on the surface. Matches the lavender/purple theme.
 */
export default function MagicCard({
  children,
  className = "",
  glow = "124 58 237",
  as: Tag = "div",
  style: styleProp = {},
  ...rest
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: -999, y: -999, o: 0 });

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top, o: 1 });
  };
  const onLeave = () => setPos((p) => ({ ...p, o: 0 }));

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        "--mx": `${pos.x}px`,
        "--my": `${pos.y}px`,
        "--mo": pos.o,
        "--glow": glow,
        ...styleProp,
      }}
      className={`magic-card relative rounded-[24px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] transition-all duration-200 ${className}`}
      {...rest}
    >
      {/* border glow layer */}
      <span
        aria-hidden
        className="magic-card__border pointer-events-none absolute inset-0 rounded-[24px]"
      />
      {/* surface */}
      <div className="magic-card__surface relative h-full rounded-[23px] bg-[var(--card)]">
        {/* spotlight */}
        <span
          aria-hidden
          className="magic-card__spot pointer-events-none absolute inset-0 rounded-[23px]"
        />
        <div className="relative h-full">{children}</div>
      </div>
    </Tag>
  );
}

/* Small KPI tile built on MagicCard */
export function MagicStat({ label, value, hint, icon: Icon, glow = "124 58 237", accent = "text-purple-600 bg-purple-50 dark:bg-purple-950/40" }) {
  return (
    <MagicCard glow={glow} className="h-full">
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[var(--mute)]">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-[var(--ink)] tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 text-xs text-[var(--mute)] truncate">{hint}</p>
          )}
        </div>
        {Icon && (
          <span className={`shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent} shadow-sm`}>
            <Icon size={22} />
          </span>
        )}
      </div>
    </MagicCard>
  );
}

/* Premium empty-state used inside cards */
export function MagicEmpty({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
          <Icon size={26} />
        </span>
      )}
      <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
      {text && <p className="mt-1 text-xs text-[var(--mute)] max-w-xs">{text}</p>}
    </div>
  );
}
