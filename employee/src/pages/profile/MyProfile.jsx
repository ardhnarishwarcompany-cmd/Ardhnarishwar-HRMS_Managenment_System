import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Camera,
  ExternalLink,
  FileText,
  GraduationCap,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  User,
  Users,
} from "lucide-react";

import API from "../../api/axios";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
const assetUrl = (p, cacheBust = "") => {
  if (!p) return null;
  const base = /^https?:/i.test(p) ? p : `${API_ORIGIN}${p}`;
  return cacheBust ? `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheBust)}` : base;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

const VERIFICATION = {
  verified: { label: "Verified", Icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  in_progress: { label: "In progress", Icon: ShieldQuestion, cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  attention: { label: "Needs attention", Icon: ShieldAlert, cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  not_started: { label: "Not started", Icon: ShieldQuestion, cls: "bg-gray-100 text-gray-600 ring-gray-200" },
};

export default function MyProfile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const load = async () => {
    try {
      const res = await API.get("/employee/profile");
      const next = res.data.data;
      // Keep the last successfully uploaded photo available even if an older
      // backend response temporarily omits the avatar field. Scope it per employee.
      const key = next?.employee?.id ? `employee-avatar-${next.employee.id}` : null;
      const savedAvatar = key ? localStorage.getItem(key) : null;
      if (next?.employee && !next.employee.avatar && savedAvatar) next.employee.avatar = savedAvatar;
      if (key && next?.employee?.avatar) localStorage.setItem(key, next.employee.avatar);
      setData(next);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load your profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="w-full pb-10">
      <main className="w-full">
        {loading ? (
          <ProfileSkeleton />
        ) : !data ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Profile unavailable. Please try again.
          </div>
        ) : (
          <>
            <HeroCard data={data} onAvatarChanged={load} onEdit={() => setEditing(true)} onPassword={() => setPwOpen(true)} />

            <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
              <div className="flex flex-col gap-5 lg:col-span-2">
                <Section title="Contact" icon={Phone} action={<TextBtn onClick={() => setEditing(true)}><Pencil size={13} /> Edit</TextBtn>}>
                  <Grid>
                    <Item label="Work email" value={data.employee.email} icon={Mail} />
                    <Item label="Phone" value={data.employee.phone} icon={Phone} />
                    <Item label="Alternate mobile" value={data.personal?.altMobile} />
                    <Item label="Address" value={data.employee.address} icon={MapPin} wide />
                  </Grid>
                </Section>

                <Section title="Emergency contact" icon={Users}>
                  <Grid>
                    <Item label="Name" value={data.employee.emergency.name} />
                    <Item label="Relation" value={data.employee.emergency.relation} />
                    <Item label="Mobile" value={data.employee.emergency.mobile} />
                  </Grid>
                </Section>

                {data.personal ? (
                  <Section title="Personal details" icon={User}>
                    <Grid>
                      <Item label="Full name" value={data.personal.fullName} />
                      <Item label="Date of birth" value={fmtDate(data.personal.dob)} />
                      <Item label="Gender" value={data.personal.gender} />
                      <Item label="Blood group" value={data.personal.bloodGroup} />
                      <Item label="Marital status" value={data.personal.maritalStatus} />
                      <Item label="Nationality" value={data.personal.nationality} />
                      <Item label="Father's name" value={data.personal.fatherName} />
                      <Item label="Mother's name" value={data.personal.motherName} />
                    </Grid>
                  </Section>
                ) : null}

                <Section title="Education" icon={GraduationCap}>
                  {data.education.length ? (
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="px-3 py-2">Level</th>
                            <th className="px-3 py-2">Qualification</th>
                            <th className="px-3 py-2">Board / University</th>
                            <th className="px-3 py-2">Year</th>
                            <th className="px-3 py-2">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.education.map((e) => (
                            <tr key={e.level} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-semibold text-gray-800">{e.level}</td>
                              <td className="px-3 py-2 text-gray-700">{e.qualification || "-"}</td>
                              <td className="px-3 py-2 text-gray-700">{e.institution || "-"}</td>
                              <td className="px-3 py-2 tabular-nums text-gray-700">{e.year || "-"}</td>
                              <td className="px-3 py-2 tabular-nums text-gray-700">{e.score || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty>No education records on file. HR can add these from your joining form.</Empty>
                  )}
                </Section>

                {data.experience ? (
                  <Section title="Previous experience" icon={Briefcase}>
                    <Grid>
                      <Item label="Type" value={data.experience.type} />
                      <Item label="Total experience" value={data.experience.total} />
                      <Item label="Last company" value={data.experience.lastCompany} />
                      <Item label="Last designation" value={data.experience.lastDesignation} />
                    </Grid>
                  </Section>
                ) : null}
              </div>

              <div className="flex flex-col gap-5">
                <Section title="Employment" icon={Building2}>
                  <Stack>
                    <Item label="Employee code" value={data.employee.employeeCode} mono />
                    <Item label="Department" value={data.employee.department} />
                    <Item label="Designation" value={data.employee.designation} />
                    <Item label="Status" value={data.employee.status} />
                    <Item label="Joining date" value={fmtDate(data.employee.joiningDate)} />
                  </Stack>
                </Section>

                <VerificationCard v={data.verification} documents={data.documents} />

                {data.bank ? (
                  <Section title="Salary account" icon={Landmark}>
                    <Stack>
                      <Item label="Account holder" value={data.bank.holder} />
                      <Item label="Bank" value={data.bank.bank} />
                      <Item label="Account" value={data.bank.accountMasked} mono />
                      <Item label="IFSC" value={data.bank.ifsc} mono />
                      <Item label="Branch" value={data.bank.branch} />
                    </Stack>
                    <p className="mt-3 text-[11px] text-gray-400">To change bank details, contact HR - they are verified before payroll.</p>
                  </Section>
                ) : null}

                <Section title="Security" icon={KeyRound}>
                  <button
                    type="button"
                    onClick={() => setPwOpen(true)}
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 px-4 py-2.5 text-sm font-bold text-purple-700 shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <KeyRound size={15} />
                    Change password
                  </button>
                </Section>
              </div>
            </div>
          </>
        )}
      </main>

      {editing && data ? <EditContactModal data={data} onClose={() => setEditing(false)} onSaved={load} /> : null}
      {pwOpen ? <PasswordModal onClose={() => setPwOpen(false)} /> : null}
    </div>
  );
}

/* ---------------- hero ---------------- */

function HeroCard({ data, onAvatarChanged, onEdit, onPassword }) {
  const { employee, verification } = data;
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const badge = VERIFICATION[verification.overall] || VERIFICATION.not_started;

  const pick = () => fileRef.current?.click();
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return toast.error("Choose a PNG, JPG or WEBP image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    const fd = new FormData();
    fd.append("photo", file);
    setUploading(true);
    try {
      const response = await API.post("/employee/profile/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const avatar = response?.data?.avatar;
      const employeeId = data?.employee?.id;
      if (employeeId && avatar) localStorage.setItem(`employee-avatar-${employeeId}`, avatar);
      toast.success("Photo updated");
      onAvatarChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-xl backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/80">
      <div className="h-28 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500" aria-hidden="true" />
      <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
          <div className="relative -mt-14 shrink-0">
            {employee.avatar ? (
              <>
              <img
                src={assetUrl(employee.avatar, employee.avatar_updated_at || employee.avatar)}
                alt={`${employee.name}'s photo`}
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg dark:border-gray-900"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="hidden flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-tr from-indigo-500 to-purple-500 text-3xl font-bold text-white shadow-lg dark:border-gray-900">
                {employee.name?.charAt(0)}
              </div>
              </>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-tr from-indigo-500 to-purple-500 text-3xl font-bold text-white shadow-lg dark:border-gray-900">
                {employee.name?.charAt(0)}
              </div>
            )}
            <button
              type="button"
              onClick={pick}
              disabled={uploading}
              aria-label="Change photo"
              className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shadow-md transition hover:bg-indigo-600 disabled:opacity-60"
            >
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
          </div>
          <div className="pt-1 text-center sm:pt-3 sm:text-left">
            <h1 className="text-2xl font-black capitalize tracking-tight text-gray-900 dark:text-white">{employee.name}</h1>
            <p className="mt-0.5 text-sm font-medium text-gray-500">
              {[...new Set([employee.designation, employee.department].filter(Boolean))].join(" \u2022 ") || "Employee"}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-700">{employee.employeeCode}</span>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge.cls}`}>
                <badge.Icon size={12} /> {badge.label}
              </span>
              {employee.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck size={12} /> Active
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-center sm:self-start sm:pt-3">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl text-white px-4 py-2 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 8px 18px rgba(124, 58, 237, 0.3)" }}
          >
            <Pencil size={14} /> Edit contact
          </button>
          <button
            type="button"
            onClick={onPassword}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-sm transition hover:bg-purple-50 active:scale-[0.98]"
          >
            <KeyRound size={14} /> Password
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- verification ---------------- */

function VerificationCard({ v, documents }) {
  const badge = VERIFICATION[v.overall] || VERIFICATION.not_started;
  const pill = (s) => {
    const t = String(s || "").toLowerCase();
    const cls = /verified|approved|complete/.test(t)
      ? "bg-emerald-50 text-emerald-700"
      : /reject|fail/.test(t)
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
    return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{s || "pending"}</span>;
  };

  return (
    <Section title="Verification" icon={badge.Icon} action={<span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${badge.cls}`}>{badge.label}</span>}>
      <Stack>
        {v.identity ? (
          <>
            <Row label={`Aadhaar ${v.identity.aadhaar_masked || ""}`}>{pill(v.identity.aadhaar_status)}</Row>
            <Row label={`PAN ${v.identity.pan_masked || ""}`}>{pill(v.identity.pan_status)}</Row>
          </>
        ) : (
          <Row label="Identity (Aadhaar / PAN)">{pill("not started")}</Row>
        )}
        {v.background.length ? (
          v.background.map((b, i) => <Row key={i} label={`Background - ${b.previous_company || "previous employer"}`}>{pill(b.status)}</Row>)
        ) : (
          <Row label="Background check">{pill("not started")}</Row>
        )}
        <Row label="Documents">
          <span className="text-xs font-semibold text-gray-700">{v.documentsVerified}/{v.documentsTotal} verified</span>
        </Row>
      </Stack>

      {documents.length ? (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-700">
                <FileText size={13} className="text-gray-400" /> {d.doc_type}
              </span>
              <span className="flex items-center gap-2">
                {pill(d.status)}
                {d.file_url ? (
                  <a href={assetUrl(d.file_url)} target="_blank" rel="noreferrer" aria-label={`Open ${d.doc_type}`} className="text-gray-400 hover:text-indigo-600">
                    <ExternalLink size={13} />
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

/* ---------------- modals ---------------- */

function EditContactModal({ data, onClose, onSaved }) {
  const e = data.employee;
  const [form, setForm] = useState({
    phone: e.phone || "",
    address: e.address || "",
    emergencyName: e.emergency.name || "",
    emergencyRelation: e.emergency.relation || "",
    emergencyMobile: e.emergency.mobile || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const setDigits = (k) => (ev) => {
    const digitsOnly = ev.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((f) => ({ ...f, [k]: digitsOnly }));
  };

  const save = async (ev) => {
    ev.preventDefault();
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      return toast.error("Phone number must be exactly 10 digits");
    }
    if (form.emergencyMobile && !/^\d{10}$/.test(form.emergencyMobile)) {
      return toast.error("Emergency mobile must be exactly 10 digits");
    }
    setSaving(true);
    try {
      await API.patch("/employee/profile", {
        phone: form.phone,
        address: form.address,
        emergency: { name: form.emergencyName, relation: form.emergencyRelation, mobile: form.emergencyMobile },
      });
      toast.success("Profile updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit contact details" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Phone" hint="10 digit mobile number"><input className={inputCls} value={form.phone} onChange={setDigits("phone")} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="9876543210" /></Field>
        <Field label="Address"><textarea className={`${inputCls} min-h-[72px]`} value={form.address} onChange={set("address")} maxLength={500} /></Field>
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Emergency contact</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name"><input className={inputCls} value={form.emergencyName} onChange={set("emergencyName")} /></Field>
          <Field label="Relation"><input className={inputCls} value={form.emergencyRelation} onChange={set("emergencyRelation")} placeholder="Spouse, Parent" /></Field>
          <Field label="Mobile"><input className={inputCls} value={form.emergencyMobile} onChange={setDigits("emergencyMobile")} inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="9876543210" /></Field>
        </div>
        <ModalActions onClose={onClose} saving={saving} label="Save changes" />
      </form>
    </Modal>
  );
}

function PasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  const save = async (ev) => {
    ev.preventDefault();
    if (form.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (form.next !== form.confirm) return toast.error("Passwords do not match");
    setSaving(true);
    try {
      await API.put("/employee/profile/password", { currentPassword: form.current, newPassword: form.next });
      toast.success("Password changed");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Current password"><input type="password" className={inputCls} value={form.current} onChange={set("current")} autoComplete="current-password" required /></Field>
        <Field label="New password" hint="At least 8 characters"><input type="password" className={inputCls} value={form.next} onChange={set("next")} autoComplete="new-password" required /></Field>
        <Field label="Confirm new password"><input type="password" className={inputCls} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required /></Field>
        <ModalActions onClose={onClose} saving={saving} label="Update password" />
      </form>
    </Modal>
  );
}

/* ---------------- primitives ---------------- */

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, saving, label }) {
  return (
    <div className="mt-4 flex justify-end gap-2.5">
      <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition active:scale-[0.98]">Cancel</button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl text-white px-5 py-2 text-sm font-bold shadow-md hover:opacity-95 transition disabled:opacity-60 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)" }}
      >
        {saving ? "Saving..." : label}
      </button>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

function Section({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-md backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><Icon size={14} /></span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const Grid = ({ children }) => <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
const Stack = ({ children }) => <dl className="flex flex-col gap-3">{children}</dl>;

function Item({ label, value, icon: Icon, wide, mono }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className={`mt-0.5 flex items-start gap-1.5 text-sm text-gray-800 dark:text-gray-200 ${mono ? "font-mono" : ""}`}>
        {Icon ? <Icon size={14} className="mt-0.5 shrink-0 text-gray-400" /> : null}
        <span className="break-words">{value || <span className="text-gray-400">Not provided</span>}</span>
      </dd>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-gray-600">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const TextBtn = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">{children}</button>
);

const Empty = ({ children }) => (
  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">{children}</p>
);

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 rounded-3xl bg-gray-200/70" />
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        <div className="h-64 rounded-2xl bg-gray-200/70 lg:col-span-2" />
        <div className="h-64 rounded-2xl bg-gray-200/70" />
      </div>
    </div>
  );
}
