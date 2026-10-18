import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  width = "max-w-xl",
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "var(--overlay)", backdropFilter: "blur(3px)" }}
      />

      {/* Dialog */}
      <div
        className={`relative flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-[28px] border`}
        style={{
          background: "var(--card)",
          borderColor: "var(--line)",
          boxShadow: "0 30px 60px rgba(61, 20, 120, 0.28)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between gap-4 border-b px-7 py-5"
          style={{ borderColor: "var(--line)" }}
        >
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition hover:text-[var(--p)]"
            style={{ background: "var(--soft)", color: "var(--mute)" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
