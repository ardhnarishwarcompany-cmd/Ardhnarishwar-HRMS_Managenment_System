import { useEffect, useState, useCallback } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Send,
  XCircle,
  Sun,
  Clock,
  PlusCircle,
} from "lucide-react";

const STATUS_STYLE = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

export default function MyLeave() {
  const [balance, setBalance] = useState([]);
  const [types, setTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [compOffs, setCompOffs] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leave_type_id: "",
    from_date: "",
    to_date: "",
    reason: "",
  });
  const [coForm, setCoForm] = useState({ worked_date: "", reason: "" });
  const [otForm, setOtForm] = useState({ ot_date: "", hours: "", reason: "" });
  const [overtimes, setOvertimes] = useState([]);
  const [otTotals, setOtTotals] = useState({ approvedHours: 0, pendingHours: 0 });

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      API.get("/leave/my-balance"),
      API.get("/leave/types"),
      API.get("/leave/my-applications"),
      API.get("/leave/holidays"),
      API.get("/leave/my-comp-offs"),
      API.get("/overtime/my"),
    ]);
    const [b, t, a, h, c, o] = results.map((r) =>
      r.status === "fulfilled" ? r.value : null
    );
    setBalance(Array.isArray(b?.data) ? b.data : []);
    setTypes(Array.isArray(t?.data) ? t.data : []);
    setApplications(Array.isArray(a?.data) ? a.data : []);
    setHolidays(Array.isArray(h?.data) ? h.data : []);
    setCompOffs(Array.isArray(c?.data) ? c.data : []);
    const od = o?.data?.data || o?.data;
    setOvertimes(Array.isArray(od?.requests) ? od.requests : Array.isArray(od) ? od : []);
    setOtTotals({
      approvedHours: Number(od?.totals?.approvedHours) || 0,
      pendingHours: Number(od?.totals?.pendingHours) || 0,
    });
    const failedCount = results.slice(0, 5).filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      toast.error(`Some leave data failed to load (${failedCount} of 5 requests)`);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = async (e) => {
    e.preventDefault();
    if (!form.leave_type_id || !form.from_date || !form.to_date) {
      toast.error("Select leave type and dates");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await API.post("/leave/apply", form);
      toast.success(`Leave applied (${data.days} day${data.days > 1 ? "s" : ""})`);
      setForm({ leave_type_id: "", from_date: "", to_date: "", reason: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelApp = async (id) => {
    if (!window.confirm("Cancel this leave application?")) return;
    try {
      await API.put(`/leave/cancel/${id}`);
      toast.success("Application cancelled");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  const requestCompOff = async (e) => {
    e.preventDefault();
    if (!coForm.worked_date) {
      toast.error("Select the date you worked");
      return;
    }
    try {
      await API.post("/leave/comp-off", coForm);
      toast.success("Comp-off requested");
      setCoForm({ worked_date: "", reason: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request");
    }
  };

  const requestOvertime = async (e) => {
    e.preventDefault();
    if (!otForm.ot_date || !otForm.hours) {
      toast.error("Select the date and hours worked");
      return;
    }
    try {
      await API.post("/overtime/apply", otForm);
      toast.success("Overtime requested");
      setOtForm({ ot_date: "", hours: "", reason: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request overtime");
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "-");
  const upcomingHolidays = holidays.filter(
    (h) => new Date(h.holiday_date) >= new Date(new Date().toDateString())
  );

  return (
    <div className="w-full space-y-6">

        {/* Balance cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {balance.map((b) => {
            const remaining = Number(b.allocated) - Number(b.used);
            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
              >
                <p className="text-xs font-medium text-gray-500 truncate">{b.leave_type}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{remaining}</p>
                <p className="text-xs text-gray-400">
                  of {Number(b.allocated)} left {b.is_paid ? "" : "(unpaid)"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Apply form */}
          <form
            onSubmit={apply}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 h-fit"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Send size={16} className="text-purple-600" /> Apply for Leave
            </h3>
            <select
              value={form.leave_type_id}
              onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
              required
            >
              <option value="">Leave type...</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">From</label>
                <input
                  type="date"
                  value={form.from_date}
                  onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">To</label>
                <input
                  type="date"
                  value={form.to_date}
                  onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1"
                  required
                />
              </div>
            </div>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason (optional)"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white rounded-xl py-2.5 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.99] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #c026d3)",
                boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)",
              }}
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>

            {/* Comp-off request */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <PlusCircle size={15} className="text-emerald-500" /> Request Comp-Off
              </h4>
              <p className="text-xs text-gray-400">
                Worked on a holiday/weekend? Request a compensatory day off.
              </p>
              <input
                type="date"
                value={coForm.worked_date}
                onChange={(e) => setCoForm({ ...coForm, worked_date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={coForm.reason}
                onChange={(e) => setCoForm({ ...coForm, reason: e.target.value })}
                placeholder="What did you work on?"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={requestCompOff}
                type="button"
                className="w-full text-white rounded-xl py-2.5 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  boxShadow: "0 8px 18px rgba(16, 185, 129, 0.25)",
                }}
              >
                Request Comp-Off
              </button>
            </div>

            {/* Overtime request */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock size={15} className="text-purple-600" /> Request Overtime
              </h4>
              <p className="text-xs text-gray-400">
                Worked extra hours? Log them for approval.
              </p>
              <input
                type="date"
                value={otForm.ot_date}
                onChange={(e) => setOtForm({ ...otForm, ot_date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={otForm.hours}
                onChange={(e) => setOtForm({ ...otForm, hours: e.target.value })}
                placeholder="Hours worked (e.g. 2.5)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={otForm.reason}
                onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                placeholder="What did you work on?"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={requestOvertime}
                type="button"
                className="w-full text-white rounded-xl py-2.5 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.99]"
                style={{
                  background: "linear-gradient(135deg, #6d28d9, #c026d3)",
                  boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)",
                }}
              >
                Request Overtime
              </button>
            </div>
          </form>

          {/* Applications + comp-offs + holidays */}
          <div className="lg:col-span-2 space-y-6">
            {/* My applications */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Clock size={15} className="text-gray-400" /> My Applications
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">From</th>
                      <th className="px-4 py-2.5">To</th>
                      <th className="px-4 py-2.5">Days</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          No applications yet
                        </td>
                      </tr>
                    )}
                    {applications.map((a) => (
                      <tr key={a.id} className="border-t border-gray-100">
                        <td className="px-4 py-2.5 font-medium text-gray-700">{a.leave_type}</td>
                        <td className="px-4 py-2.5">{fmt(a.from_date)}</td>
                        <td className="px-4 py-2.5">{fmt(a.to_date)}</td>
                        <td className="px-4 py-2.5">{Number(a.days)}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              STATUS_STYLE[a.status] || "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {a.status}
                          </span>
                          {a.approver_note && (
                            <div className="text-xs text-gray-400 mt-0.5">{a.approver_note}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {(a.status === "Pending" || a.status === "Approved") && (
                            <button
                              onClick={() => cancelApp(a.id)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                              title="Cancel"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Comp-off requests */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 text-sm">
                  My Comp-Off Requests
                </div>
                <div className="divide-y divide-gray-100">
                  {compOffs.length === 0 && (
                    <p className="px-4 py-6 text-center text-gray-400 text-sm">No requests</p>
                  )}
                  {compOffs.map((c) => (
                    <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{fmt(c.worked_date)}</p>
                        <p className="text-xs text-gray-400">{c.reason || "-"}</p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_STYLE[c.status] || "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overtime requests */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 text-sm">
                  My Overtime Requests
                </div>
                <div className="divide-y divide-gray-100">
                  {overtimes.length === 0 && (
                    <p className="px-4 py-6 text-center text-gray-400 text-sm">No requests</p>
                  )}
                  {overtimes.map((o) => (
                    <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {fmt(o.ot_date)} &middot; {Number(o.hours)}h
                        </p>
                        <p className="text-xs text-gray-400">{o.reason || "-"}</p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_STYLE[o.status] || "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming holidays */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 text-sm flex items-center gap-2">
                  <Sun size={15} className="text-amber-500" /> Upcoming Holidays
                </div>
                <div className="divide-y divide-gray-100">
                  {upcomingHolidays.length === 0 && (
                    <p className="px-4 py-6 text-center text-gray-400 text-sm">
                      No upcoming holidays
                    </p>
                  )}
                  {upcomingHolidays.slice(0, 6).map((h) => (
                    <div key={h.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{h.name}</p>
                        <p className="text-xs text-gray-400">{h.description || ""}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-600">
                        {fmt(h.holiday_date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
