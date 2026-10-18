export default function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--line-strong)]">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[var(--ink)]">{label}</p>
        {desc && <p className="mt-0.5 text-[13px] text-[var(--mute)]">{desc}</p>}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          value ? "bg-[var(--p)] shadow-[0_6px_14px_rgba(124,58,237,0.3)]" : "bg-[var(--line-strong)]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--card)] shadow-sm transition-all duration-200 ${
            value ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
