import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

/**
 * Accessible replacement for window.prompt().
 * Resolves through onSubmit(value) / onClose() so callers can await a promise.
 */
export default function PromptModal({
  open,
  title = "Input required",
  label,
  description,
  placeholder = "",
  defaultValue = "",
  required = false,
  multiline = false,
  type = "text",
  submitText = "Continue",
  cancelText = "Cancel",
  danger = false,
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTouched(false);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open, defaultValue]);

  const trimmed = value.trim();
  const invalid = required && !trimmed;

  const submit = (e) => {
    e?.preventDefault();
    setTouched(true);
    if (invalid) return;
    onSubmit?.(trimmed);
  };

  const inputClass =
    "input py-2.5 " +
    (touched && invalid
      ? "!border-[var(--red)] !bg-[var(--red-soft)]/40 focus:!shadow-[0_0_0_4px_rgba(220,38,38,0.12)]"
      : "");

  return (
    <Modal open={open} title={title} onClose={onClose} width="max-w-md">
      <form onSubmit={submit} className="space-y-6">
        {description && (
          <p className="text-sm leading-relaxed text-[var(--mute)]">{description}</p>
        )}

        <div>
          {label && (
            <label
              htmlFor="prompt-modal-input"
              className="mb-2 block text-[13px] font-bold tracking-wide text-[var(--ink)]"
            >
              {label}
              {required && <span className="ml-0.5 text-[var(--red)]">*</span>}
            </label>
          )}
          {multiline ? (
            <textarea
              id="prompt-modal-input"
              ref={inputRef}
              rows={3}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
              aria-invalid={touched && invalid}
            />
          ) : (
            <input
              id="prompt-modal-input"
              ref={inputRef}
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              className={inputClass}
              aria-invalid={touched && invalid}
            />
          )}
          {touched && invalid && (
            <p className="mt-1.5 text-xs font-semibold text-[var(--red)]">This field is required.</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            {cancelText}
          </button>
          <button
            type="submit"
            className={
              danger
                ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--red)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(220,38,38,0.25)] transition hover:-translate-y-px hover:bg-red-700"
                : "btn-primary"
            }
          >
            {submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
