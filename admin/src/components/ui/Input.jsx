export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  readOnly = false,
  suffix = null, // optional right-side element (e.g. password eye toggle)
}) {
  return (
    <div>
      {label && (
        <label className="text-[13px] font-bold tracking-wide text-[var(--ink)]">
          {label}
        </label>
      )}

      <div className="relative mt-2">
        <input
          type={type}
          value={value ?? ""}   // ✅ important fix
          onChange={disabled || readOnly ? undefined : onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`input py-2.5 disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-[var(--soft)] ${
            suffix ? "pr-11" : ""
          }`}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-2 flex items-center text-[var(--mute)]">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}
