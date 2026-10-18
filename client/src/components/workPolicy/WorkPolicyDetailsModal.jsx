import { Download, FileText, Building2, Zap, CalendarClock, BadgePercent } from "lucide-react";
import Modal from "../ui/Modal";

const TYPE_META = {
  attendance: { cls: "badge-info", label: "Attendance" },
  leave: { cls: "badge-success", label: "Leave" },
  behavior: { cls: "badge-warning", label: "Behavior" },
  meal_management: { cls: "badge-danger", label: "Meal Management" },
  general: { cls: "badge-neutral", label: "General" },
};

const isOn = (v) => v === 1 || v === true || v === "1";

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function MetaItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[var(--soft)] px-4 py-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--p)] shadow-sm">
        <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="label-premium !mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-[var(--ink)] text-pretty">{children}</div>
      </div>
    </div>
  );
}

export default function WorkPolicyDetailsModal({ open, policy, departmentName, onClose, onDownload }) {
  if (!policy) return null;

  const type = TYPE_META[policy.type] || TYPE_META.general;
  const active = isOn(policy.isActive);
  const automated = isOn(policy.isAutomated);
  const autoApply = isOn(policy.autoApply);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={policy.title || "Work Policy"}
      width="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary-premium">
            Close
          </button>
          <button type="button" onClick={() => onDownload(policy)} className="btn-primary-premium">
            <Download size={16} aria-hidden="true" />
            Download PDF
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--mute)]">
            Work policy
          </span>
          <span className={`badge-premium ${type.cls}`}>{type.label}</span>
          <span className={`badge-premium ${active ? "badge-success" : "badge-danger"}`}>
            {active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetaItem icon={Building2} label="Applies to">
            {policy.departmentId ? departmentName || "Department" : "All departments"}
          </MetaItem>
          <MetaItem icon={Zap} label="Enforcement">
            {automated ? "Automated" : "Manual"}
            <span className="ml-2 text-xs font-medium text-[var(--mute)]">
              · Auto apply {autoApply ? "on" : "off"}
            </span>
          </MetaItem>
          <MetaItem icon={BadgePercent} label="Auto deduction">
            {policy.autoDeduction ? policy.autoDeduction : "Not configured"}
          </MetaItem>
          <MetaItem icon={CalendarClock} label="Last updated">
            {fmtDate(policy.updatedAt || policy.updated_at || policy.createdAt || policy.created_at)}
          </MetaItem>
        </div>

        <section aria-labelledby="policy-description-heading">
          <div className="mb-2 flex items-center gap-2">
            <FileText size={15} className="text-[var(--p)]" aria-hidden="true" />
            <h3 id="policy-description-heading" className="text-sm font-bold text-[var(--ink)]">
              Policy description
            </h3>
          </div>
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white px-5 py-4 text-sm leading-relaxed text-[var(--ink-2)] whitespace-pre-wrap scrollbar-thin-premium">
            {policy.description?.trim() ? policy.description : "No policy description has been added yet."}
          </div>
        </section>
      </div>
    </Modal>
  );
}
