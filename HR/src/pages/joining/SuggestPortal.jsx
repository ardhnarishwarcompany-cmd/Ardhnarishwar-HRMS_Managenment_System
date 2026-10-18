import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SuggestPortal({ anchorRef, open, listRef, children }) {
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <ul
      ref={listRef}
      role="listbox"
      style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }}
      className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
    >
      {children}
    </ul>,
    document.body
  );
}
