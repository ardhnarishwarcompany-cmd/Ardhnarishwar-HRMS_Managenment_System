import { useEffect, useState, useCallback } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import { Wallet, Gift, Plus, XCircle, Shield } from "lucide-react";

const CATEGORIES = ["Travel", "Food", "Accommodation", "Medical", "Office Supplies", "Other"];

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const money = (n) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const Badge = ({ status }) => {
  const map = {
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-green-50 text-green-700",
    Rejected: "bg-red-50 text-red-600",
    Paid: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${map[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
};

export default function MyCompensation() {
  const [loading, setLoading] = useState(true);
  const [reimbursements, setReimbursements] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [insurance, setInsurance] = useState([]);
  const [form, setForm] = useState({
    category: "",
    amount: "",
    expense_date: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, w, i] = await Promise.all([
        API.get("/compensation/reimbursements/my"),
        API.get("/compensation/rewards/my"),
        API.get("/compensation/insurance/my").catch(() => ({ data: { data: [] } })),
      ]);
      setReimbursements(r.data?.data || []);
      setRewards(w.data?.data || []);
      setInsurance(i.data?.data || []);
    } catch (err) {
      console.error("MyCompensation load:", err);
      toast.error("Failed to load compensation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitReimbursement = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || !form.expense_date) {
      toast.error("Category, amount and expense date are required");
      return;
    }
    try {
      await API.post("/compensation/reimbursements/apply", form);
      toast.success("Reimbursement submitted");
      setForm({ category: "", amount: "", expense_date: "", description: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit reimbursement");
    }
  };

  const cancelReimbursement = async (id) => {
    if (!window.confirm("Cancel this pending reimbursement?")) return;
    try {
      await API.put(`/compensation/reimbursements/cancel/${id}`);
      toast.success("Reimbursement cancelled");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  const totalPaid = rewards
    .filter((w) => w.status === "Paid")
    .reduce((s, w) => s + Number(w.amount || 0), 0);

  return (
    <div className="w-full space-y-6 pb-12">

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Reimbursement form */}
          <form
            onSubmit={submitReimbursement}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 h-fit"
          >
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Plus size={16} /> Request Reimbursement
            </h2>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              required
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount (₹)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              required
            />
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-xl text-white px-4 py-2.5 text-sm font-bold shadow-md hover:opacity-95 transition active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #c026d3)",
                boxShadow: "0 8px 18px rgba(124, 58, 237, 0.25)",
              }}
            >
              Submit Request
            </button>
          </form>

          {/* My reimbursements */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h2 className="text-sm font-bold text-gray-900">My Reimbursements</h2>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Expense Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {!loading && reimbursements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                        No reimbursement requests yet
                      </td>
                    </tr>
                  )}
                  {reimbursements.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.category}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{money(r.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{fmt(r.expense_date)}</td>
                      <td className="px-4 py-3">
                        <Badge status={r.status} />
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-gray-500">
                        {r.remarks || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "Pending" && (
                          <button
                            onClick={() => cancelReimbursement(r.id)}
                            className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* My rewards */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Gift size={16} /> My Incentives &amp; Bonuses
            </h2>
            <span className="text-xs font-bold text-gray-500">
              Total received: <span className="text-gray-900">{money(totalPaid)}</span>
            </span>
          </div>
          <div className="max-h-[45vh] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date / Period</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rewards.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      No incentives or bonuses yet
                    </td>
                  </tr>
                )}
                {rewards.map((w) => (
                  <tr key={w.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{w.reward_type}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-700">{w.title}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{money(w.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {w.award_date ? fmt(w.award_date) : w.period || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* My insurance */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Shield size={16} /> My Insurance Policies
            </h2>
          </div>
          <div className="max-h-[45vh] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Provider / Policy No.</th>
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3">Premium</th>
                  <th className="px-4 py-3">Validity</th>
                  <th className="px-4 py-3">Nominee</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && insurance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      No insurance policies yet
                    </td>
                  </tr>
                )}
                {insurance.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-800">{p.policy_type}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{p.provider}</div>
                      <div className="text-xs text-gray-500">{p.policy_number || "—"}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{money(p.coverage_amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{money(p.premium_amount)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.start_date ? fmt(p.start_date) : "—"} → {p.end_date ? fmt(p.end_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.nominee || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
