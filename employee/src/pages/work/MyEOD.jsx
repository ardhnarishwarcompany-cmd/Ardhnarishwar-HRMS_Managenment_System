import React, { useEffect, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { FileText, Plus, Clock, CheckCircle, XCircle, AlertCircle, Eye, Edit, Calendar, X, Download } from "lucide-react";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { generateEodPdf } from "../../utils/eodPdf";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

export default function MyEOD() {
  const { employee } = useEmployeeAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    tomorrowPlan: "",
    notes: "",
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get("/employee/eod");
      setReports(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const resetForm = () => {
    setEditId(null);
    setForm({ date: dayjs().format("YYYY-MM-DD"), tasksCompleted: "", tasksInProgress: "", blockers: "", tomorrowPlan: "", notes: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tasksCompleted.trim()) return toast.error("Tasks completed is required");
    try {
      if (editId) {
        await API.patch(`/employee/eod/${editId}`, form);
        toast.success("EOD updated successfully");
      } else {
        await API.post("/employee/eod", form);
        toast.success("EOD submitted successfully");
      }
      setOpenModal(false);
      resetForm();
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Action failed");
    }
  };

  const handleDownload = (report) => {
    try {
      generateEodPdf(report, employee);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleEdit = (report) => {
    setEditId(report.id);
    setForm({
      date: dayjs(report.date).format("YYYY-MM-DD"),
      tasksCompleted: report.tasksCompleted || "",
      tasksInProgress: report.tasksInProgress || "",
      blockers: report.blockers || "",
      tomorrowPlan: report.tomorrowPlan || "",
      notes: report.notes || "",
    });
    setOpenModal(true);
  };

  return (
    <>
      <div className="employee-eod-page">
        <div className="employee-content-max">
          <div className="employee-page-hero">
            <div className="employee-page-hero-icon"><FileText size={21} /></div>
            <div>
              <h1>My EOD Reports</h1>
              <p>Submit, review and manage your daily end-of-day reports.</p>
            </div>
            <button className="employee-page-action primary" onClick={() => { resetForm(); setOpenModal(true); }}>
              <Plus size={15} /> Submit EOD
            </button>
          </div>

          {loading ? (
            <div className="employee-page-hero justify-center"><p>Loading EOD reports...</p></div>
          ) : reports.length === 0 ? (
            <div className="employee-page-hero justify-center text-center">
              <div><h1>No EOD reports yet</h1><p>Submit your first end-of-day report using the button above.</p></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {reports.map((report) => {
                const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <article key={report.id} className="employee-eod-card">
                    <div className="employee-eod-card-head">
                      <div>
                        <h2>EOD Report</h2>
                        <div className="employee-eod-date"><Calendar size={13} /> {dayjs(report.date).format("MMM D, YYYY")}</div>
                      </div>
                      <span className={`employee-pill status ${cfg.color}`}><StatusIcon size={12} /> {cfg.label}</span>
                    </div>
                    <div className="employee-eod-body">
                      <div className="employee-eod-section"><div className="employee-eod-label">Tasks completed</div><div className="employee-eod-value line-clamp-3">{report.tasksCompleted || "Not provided"}</div></div>
                      <div className="employee-eod-section"><div className="employee-eod-label">Tasks in progress</div><div className="employee-eod-value line-clamp-2">{report.tasksInProgress || "Not provided"}</div></div>
                      <div className="employee-eod-section"><div className="employee-eod-label">Tomorrow plan</div><div className="employee-eod-value line-clamp-3">{report.tomorrowPlan || "Not provided"}</div></div>
                      {report.blockers ? <div className="employee-eod-section"><div className="employee-eod-label">Blockers</div><div className="employee-eod-value line-clamp-2">{report.blockers}</div></div> : null}
                    </div>
                    <div className="employee-eod-actions">
                      <button type="button" onClick={() => { setSelectedReport(report); setViewModal(true); }}><Eye size={15} /> View details</button>
                      {report.status !== "approved" && report.status !== "rejected" ? <button type="button" onClick={() => handleEdit(report)}><Edit size={15} /> Edit report</button> : <button type="button" disabled>Locked</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b bg-white">
              <div><h2 className="text-xl font-extrabold">{editId ? "Edit EOD Report" : "Submit EOD Report"}</h2><p className="text-xs text-gray-500 mt-1">Keep your daily work update clear and detailed.</p></div>
              <button type="button" onClick={() => { setOpenModal(false); resetForm(); }} className="w-9 h-9 rounded-xl bg-gray-100 grid place-items-center"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <Field label="Report date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              <Field label="Tasks completed" required><textarea rows={4} value={form.tasksCompleted} onChange={(e) => setForm({ ...form, tasksCompleted: e.target.value })} placeholder="What did you complete today?" /></Field>
              <Field label="Tasks in progress"><textarea rows={3} value={form.tasksInProgress} onChange={(e) => setForm({ ...form, tasksInProgress: e.target.value })} placeholder="What is still in progress?" /></Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Blockers"><textarea rows={3} value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} placeholder="Any issue or blocker?" /></Field>
                <Field label="Tomorrow plan"><textarea rows={3} value={form.tomorrowPlan} onChange={(e) => setForm({ ...form, tomorrowPlan: e.target.value })} placeholder="What will you work on tomorrow?" /></Field>
              </div>
              <Field label="Additional notes"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional comments..." /></Field>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setOpenModal(false); resetForm(); }} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold">{editId ? "Update report" : "Submit report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewModal && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl">
            <div className="px-7 py-6 text-white bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 flex items-start justify-between">
              <div><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-white/15 grid place-items-center"><FileText size={22} /></div><div><h2 className="text-2xl font-extrabold">EOD Report</h2><p className="text-xs text-white/70">{dayjs(selectedReport.date).format("MMMM D, YYYY")}</p></div></div></div>
              <button onClick={() => setViewModal(false)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 grid place-items-center"><X size={19} /></button>
            </div>
            <div className="p-6 md:p-7 overflow-y-auto max-h-[70vh] grid gap-5 md:grid-cols-2">
              <Detail title="Tasks Completed" text={selectedReport.tasksCompleted} icon={<CheckCircle size={20} />} />
              <Detail title="Tasks In Progress" text={selectedReport.tasksInProgress} icon={<Clock size={20} />} />
              <Detail title="Blockers" text={selectedReport.blockers} icon={<AlertCircle size={20} />} />
              <Detail title="Tomorrow Plan" text={selectedReport.tomorrowPlan} icon={<Calendar size={20} />} />
              <div className="md:col-span-2"><Detail title="Additional Notes" text={selectedReport.notes} icon={<Edit size={20} />} /></div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => handleDownload(selectedReport)}
                className="px-5 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 shadow-md hover:opacity-95 transition active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)" }}
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                onClick={() => setViewModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, required, children }) {
  return <label className="block"><span className="block mb-1.5 text-xs font-bold text-slate-600">{label}{required ? " *" : ""}</span>{React.cloneElement(children, { className: "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" })}</label>;
}

function Detail({ title, text, icon }) {
  return <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 grid place-items-center">{icon}</div><div><h3 className="font-extrabold text-slate-900">{title}</h3><p className="text-[10px] text-slate-400">Daily work information</p></div></div><p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">{text || "No information provided."}</p></section>;
}
