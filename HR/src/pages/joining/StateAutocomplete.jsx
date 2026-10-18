import { useEffect, useMemo, useRef, useState } from "react";
import { STATES } from "./cities";
import SuggestPortal from "./SuggestPortal";

export default function StateAutocomplete({ label, name, value, onTextChange, onSelect, inputClassName }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const matches = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return [];
    const starts = STATES.filter((s) => s.toLowerCase().startsWith(q));
    const contains = STATES.filter((s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 8);
  }, [value]);

  useEffect(() => {
    const onDown = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inList = listRef.current && listRef.current.contains(e.target);
      if (!inWrap && !inList) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (c) => {
    onSelect(c);
    setOpen(false);
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
      <label htmlFor={`nj-${name}`} className="mb-1.5 text-sm font-medium text-slate-600">
        {label}
      </label>
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
        placeholder="Type state name"
        className={inputClassName}
        onChange={(e) => {
          onTextChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <SuggestPortal anchorRef={inputRef} open={showList} listRef={listRef}>
        {matches.map((c, i) => (
          <li
            key={c}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(c);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-center px-3 py-2 text-sm ${
              i === active ? "bg-violet-50 text-violet-700" : "text-slate-700"
            }`}
          >
            <span className="font-semibold">{c}</span>
          </li>
        ))}
      </SuggestPortal>
    </div>
  );
}
