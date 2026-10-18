import { useEffect, useMemo, useRef, useState } from "react";
import SuggestPortal from "./SuggestPortal";
import { hasOption, makeKey, mergeOptions, normalizeValue } from "./normalize";
import { saveExtra, useExtras } from "./suggestApi";

export default function SuggestField({
  label,
  name,
  value,
  baseOptions = [],
  extraType,
  placeholder = "Start typing",
  inputClassName,
  onChange,
  hideLabel = false,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const extras = useExtras(extraType);
  const options = useMemo(() => mergeOptions(baseOptions, extras), [baseOptions, extras]);

  const matches = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return [];
    const qk = makeKey(q);
    const starts = [];
    const contains = [];
    for (const o of options) {
      const lo = o.toLowerCase();
      const ok = makeKey(o);
      if (lo.startsWith(q) || (qk && ok.startsWith(qk))) starts.push(o);
      else if (lo.includes(q) || (qk && ok.includes(qk))) contains.push(o);
    }
    return [...starts, ...contains].slice(0, 10);
  }, [value, options]);

  useEffect(() => {
    const onDown = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inList = listRef.current && listRef.current.contains(e.target);
      if (!inWrap && !inList) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (o) => {
    onChange(o);
    setOpen(false);
  };

  // On leaving the field: fix spelling / capitalisation, and remember brand-new values for everyone.
  const commit = async () => {
    setOpen(false);
    const raw = (value || "").trim();
    if (!raw) return;
    const clean = normalizeValue(raw, options);
    if (clean !== value) onChange(clean);
    if (extraType && clean.length >= 3 && /[A-Za-z]{3}/.test(clean) && clean.length <= 150 && !hasOption(options, clean)) {
      const saved = await saveExtra(extraType, clean);
      if (saved && saved !== clean) onChange(saved);
    }
  };

  const onKeyDown = (e) => {
    if (!open || !matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
    }
  };

  const showList = open && matches.length > 0;

  return (
    <div className="flex flex-col" ref={wrapRef}>
      {!hideLabel && (
        <label htmlFor={`nj-${name}`} className="mb-1.5 text-sm font-medium text-slate-600">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={`nj-${name}`}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        value={value ?? ""}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <SuggestPortal anchorRef={inputRef} open={showList} listRef={listRef}>
        {matches.map((o, i) => (
          <li
            key={o}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(o);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-center px-3 py-2 text-sm ${
              i === active ? "bg-violet-50 text-violet-700" : "text-slate-700"
            }`}
          >
            <span className="font-semibold">{o}</span>
          </li>
        ))}
      </SuggestPortal>
    </div>
  );
}
