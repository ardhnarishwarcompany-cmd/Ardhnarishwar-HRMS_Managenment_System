export default function Select({ label, value, onChange, options = [] }) {
  return (
    <div>
      {label && (
        <label className="text-[13px] font-bold tracking-wide text-[var(--ink)]">
          {label}
        </label>
      )}

      <select
        value={value}
        onChange={onChange}
        className="input mt-2 cursor-pointer py-2.5 pr-10"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
