import Modal from "./Modal";

export default function ConfirmModal({
  open,
  onClose,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  onConfirm,
  danger = true,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="max-w-md">
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-[var(--mute)]">{message}</p>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--red)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(220,38,38,0.25)] transition hover:-translate-y-px hover:bg-red-700"
                : "btn-primary"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
