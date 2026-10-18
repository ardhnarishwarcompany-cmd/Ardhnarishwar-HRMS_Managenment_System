import { useEffect, useMemo, useRef, useState } from "react";
import SuggestPortal from "./SuggestPortal";

const BOARDS = [
  "CBSE (Central Board of Secondary Education)",
  "CISCE (ICSE / ISC)",
  "NIOS (National Institute of Open Schooling)",
  "UP Board (UPMSP)",
  "Haryana Board (HBSE)",
  "Bihar Board (BSEB)",
  "Rajasthan Board (RBSE)",
  "MP Board (MPBSE)",
  "Punjab Board (PSEB)",
  "Himachal Pradesh Board (HPBOSE)",
  "Uttarakhand Board (UBSE)",
  "Delhi Board of School Education (DBSE)",
  "Gujarat Board (GSEB)",
  "Maharashtra Board (MSBSHSE)",
  "Karnataka Board (KSEAB)",
  "Tamil Nadu State Board",
  "Kerala Board (DHSE / SSLC)",
  "Andhra Pradesh Board (BSEAP)",
  "Telangana Board (BSE / TSBIE)",
  "West Bengal Board (WBBSE / WBCHSE)",
  "Odisha Board (BSE / CHSE)",
  "Assam Board (SEBA / AHSEC)",
  "Jharkhand Board (JAC)",
  "Chhattisgarh Board (CGBSE)",
  "Jammu and Kashmir Board (JKBOSE)",
  "Goa Board (GBSHSE)",
  "Meghalaya Board (MBOSE)",
  "Manipur Board (BSEM / COHSEM)",
  "Nagaland Board (NBSE)",
  "Tripura Board (TBSE)",
  "Mizoram Board (MBSE)",
  "Sikkim Board",
  "Arunachal Pradesh Board",
  "Haryana Open School (HOS)",
  "Cambridge International (CIE / IGCSE)",
  "IB (International Baccalaureate)",
  "Other",
];

export default function BoardAutocomplete({ label, name, value, onTextChange, onSelect, inputClassName }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const matches = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return [];
    const starts = BOARDS.filter((b) => b.toLowerCase().startsWith(q));
    const contains = BOARDS.filter((b) => !b.toLowerCase().startsWith(q) && b.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 10);
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

  const pick = (b) => {
    onSelect(b);
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
        placeholder="Type board name"
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
        {matches.map((b, i) => (
          <li
            key={b}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(b);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-center px-3 py-2 text-sm ${
              i === active ? "bg-violet-50 text-violet-700" : "text-slate-700"
            }`}
          >
            <span className="font-semibold">{b}</span>
          </li>
        ))}
      </SuggestPortal>
    </div>
  );
}
