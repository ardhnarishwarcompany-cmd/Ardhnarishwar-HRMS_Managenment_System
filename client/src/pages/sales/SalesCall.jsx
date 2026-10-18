import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import StatCard from "../../components/common/StatCard";
import { useNavigate } from "react-router-dom";
import {
  PhoneCall,
  TrendingUp,
  IndianRupee,
  BellRing,
  CalendarClock,
  AlertTriangle,
  Plus,
  Pencil,
  Search,
  ArrowRight,
  X,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
import { useClientAuth } from "../../context/ClientAuthContext";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

export default function SalesCall() {
  const token = localStorage.getItem("hrms_client_Token");
  const { client } = useClientAuth();
  const isEmployee = client?.role === "CLIENT_EMPLOYEE";

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [filters, setFilters] = useState({ search: "", status: "all" });
  const navigate = useNavigate();
  const emptyForm = {
    employee_id: "",
    call_id: "",
    customer_name: "",
    phone: "",
    email: "",
    call_time: "",
    call_date: "",
    status: "hold",
    follow_up_datetime: "",
    remarks: "",
    sold_date: "",
  };

  const [form, setForm] = useState(emptyForm);
  // ================= FETCH EMPLOYEES =================

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/client/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      toast.error("Employees fetch error:", err);
    }
  };

  // ================= FETCH =================
  const fetchList = async (extra = {}) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/client/sales`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...filters, ...extra },
      });
      if (res.data?.success) setList(res.data.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();

    if (!isEmployee) {
      fetchEmployees(); // only admin
    }
  }, []);
  // ================= STATS =================
  const now = new Date();
  const stats = {
    totalCalls: list.length,
    leadsGenerated: list.filter((r) => r.status === "accepted").length,
    totalSales: list.filter((r) => r.sold_date).length,
    needFollowups: list.filter(
      (r) =>
        r.follow_up_datetime &&
        new Date(r.follow_up_datetime) >= now &&
        r.status !== "rejected",
    ).length,
    totalFollowups: list.filter(
      (r) => r.follow_up_datetime && r.status !== "rejected",
    ).length,
    pendingFollowups: list.filter(
      (r) =>
        r.follow_up_datetime &&
        new Date(r.follow_up_datetime) < now &&
        r.status !== "rejected",
    ).length,
  };

  // ================= CARD FILTER =================
  const applyCardFilter = (type) => {
    setActiveFilter(type);
    if (type === "all") return fetchList();
    if (type === "leads") return fetchList({ status: "accepted" });
    return fetchList();
  };

  // ================= SEARCH =================
  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters((p) => ({ ...p, search: value }));
    fetchList({ search: value });
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setFilters((p) => ({ ...p, status: value }));
    fetchList({ status: value });
  };

  // ================= ADD =================
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BASE_URL}/client/sales`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Record added");
      setShowAdd(false);
      setForm(emptyForm);
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Add failed");
    }
  };

  // ================= EDIT =================

  const formatForInput = (val) => {
    if (!val) return "";
    return new Date(val).toISOString().slice(0, 16);
  };

  const openEdit = (row) => {
    setEditRow(row);

    setForm({
      ...row,
      call_date: row.call_date?.slice(0, 10) || "",
      sold_date: row.sold_date?.slice(0, 10) || "",
      follow_up_datetime: formatForInput(row.follow_up_datetime),
    });

    setShowEdit(true);
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${BASE_URL}/client/sales/${editRow.id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Record updated");
      setShowEdit(false);
      setEditRow(null);
      setForm(emptyForm);
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  // ================= DISPLAY FILTER =================
  let displayList = [...list];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    displayList = displayList.filter(
      (r) =>
        r.customer_name?.toLowerCase().includes(s) ||
        r.phone?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s) ||
        r.call_id?.toLowerCase().includes(s) ||
        r.employee_name?.toLowerCase().includes(s),
    );
  }

  if (activeFilter === "sales")
    displayList = displayList.filter((r) => r.sold_date);

  if (activeFilter === "followups")
    displayList = displayList.filter(
      (r) => r.follow_up_datetime && r.status !== "rejected",
    );

  if (activeFilter === "pending")
    displayList = displayList.filter(
      (r) =>
        r.follow_up_datetime &&
        new Date(r.follow_up_datetime) < now &&
        r.status !== "rejected",
    );

  if (activeFilter === "need")
    displayList = displayList.filter(
      (r) =>
        r.follow_up_datetime &&
        new Date(r.follow_up_datetime) >= now &&
        r.status !== "rejected",
    );

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "-";
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(h, m);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PhoneCall size={22} />}
        title="Sales Calls"
        desc="View sales analytics and subscription revenue."
        actions={
          <button onClick={() => navigate("/sales-report")} className="btn-secondary-premium">
            Go to Sales Reports
            <ArrowRight size={15} />
          </button>
        }
      />

      {/* ================= STAT CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Calls"
          value={stats.totalCalls}
          subText="All client calls"
          icon={<PhoneCall size={22} />}
          gradient="bg-gradient-to-r from-blue-500/90 to-indigo-500/90"
          active={activeFilter === "all"}
          onClick={() => applyCardFilter("all")}
        />
        <StatCard
          title="Lead Generated"
          value={stats.leadsGenerated}
          subText="Accepted leads"
          icon={<TrendingUp size={22} />}
          gradient="bg-gradient-to-r from-emerald-500/90 to-green-500/90"
          active={activeFilter === "leads"}
          onClick={() => applyCardFilter("leads")}
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          subText="Converted deals"
          icon={<IndianRupee size={22} />}
          gradient="bg-gradient-to-r from-purple-500/90 to-fuchsia-500/90"
          active={activeFilter === "sales"}
          onClick={() => applyCardFilter("sales")}
        />
        <StatCard
          title="Need Follow-ups"
          value={stats.needFollowups}
          subText="Upcoming follow-ups"
          icon={<BellRing size={22} />}
          gradient="bg-gradient-to-r from-orange-500/90 to-red-500/90"
          active={activeFilter === "need"}
          onClick={() => applyCardFilter("need")}
        />
        <StatCard
          title="Total Follow-ups"
          value={stats.totalFollowups}
          subText="All scheduled"
          icon={<CalendarClock size={22} />}
          gradient="bg-gradient-to-r from-cyan-500/90 to-sky-500/90"
          active={activeFilter === "followups"}
          onClick={() => applyCardFilter("followups")}
        />
        <StatCard
          title="Pending Follow-ups"
          value={stats.pendingFollowups}
          subText="Overdue tasks"
          icon={<AlertTriangle size={22} />}
          gradient="bg-gradient-to-r from-rose-500/90 to-pink-500/90"
          active={activeFilter === "pending"}
          onClick={() => applyCardFilter("pending")}
        />
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="card-premium p-4 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            />
            <input
              placeholder="Search name, phone, employee..."
              className="input-premium pl-9 w-full"
              value={filters.search}
              onChange={handleSearch}
            />
          </div>
          <select
            className="input-premium w-full sm:w-auto"
            value={filters.status}
            onChange={handleStatusChange}
          >
            <option value="all">All Status</option>
            <option value="hold">Hold</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <button
          onClick={() => {
            setForm(emptyForm);
            setEditRow(null);
            setShowAdd(true);
          }}
          className="btn-primary-premium w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Add Call
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] scrollbar-thin-premium">
          <table className="table-premium min-w-[1100px] w-full text-sm">
            {/* HEADER */}
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Call</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Follow Up</th>
                <th className="px-4 py-3 text-left">Remarks</th>
                <th className="px-4 py-3 text-left">Sold</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-14">
                    <div className="flex justify-center text-gray-500 dark:text-gray-400 text-sm">
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : displayList.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState
                      icon={<PhoneCall size={28} />}
                      title="No calls found"
                      desc="Add your first sales call or adjust the filters."
                    />
                  </td>
                </tr>
              ) : (
                displayList.map((row) => (
                  <tr key={row.id}>
                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="badge-code">#{row.call_id}</span>
                    </td>

                    {/* CUSTOMER */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {row.customer_name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {row.email || "-"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {row.phone}
                      </div>
                    </td>

                    {/* EMPLOYEE */}
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                      {row.employee_name}
                    </td>

                    {/* CALL DATE + TIME */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {formatTime(row.call_time)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(row.call_date)}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-3">
                      <span
                        className={`badge-premium capitalize ${
                          row.status === "accepted"
                            ? "badge-success"
                            : row.status === "rejected"
                              ? "badge-danger"
                              : "badge-warning"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* FOLLOW UP */}
                    <td className="px-4 py-3">
                      <span className="badge-premium badge-warning">
                        {formatDateTime(row.follow_up_datetime)}
                      </span>
                    </td>

                    {/* REMARKS */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                      {row.remarks || "-"}
                    </td>

                    {/* SOLD */}
                    <td className="px-4 py-3">
                      {row.sold_date ? (
                        <span className="badge-premium badge-success">
                          {formatDate(row.sold_date)}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(row)}
                        className="btn-primary-premium !px-3 !py-1.5 text-xs mx-auto"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD MODAL ================= */}
      {showAdd && (
        <Modal
          title="Add Call"
          onClose={() => setShowAdd(false)}
          onSubmit={handleAddSubmit}
          form={form}
          setForm={setForm}
          employees={employees}
        />
      )}

      {/* ================= EDIT MODAL ================= */}
      {showEdit && (
        <Modal
          title="Edit Call"
          onClose={() => setShowEdit(false)}
          onSubmit={handleEditSubmit}
          form={form}
          setForm={setForm}
          employees={employees}
        />
      )}
    </div>
  );
}

// ================= SHARED MODAL =================
function Modal({ title, onClose, onSubmit, form, setForm, employees }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="card-premium w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="overflow-y-auto scrollbar-thin-premium px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Employee */}
            <div className="flex flex-col">
              <label className="label-premium">Employee</label>
              <select
                name="employee_id"
                value={form.employee_id || ""}
                onChange={handleChange}
                className="input-premium"
                required
              >
                <option value="">Select Employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Call ID */}
            <div className="flex flex-col">
              <label className="label-premium">Call ID</label>
              <input
                name="call_id"
                placeholder="(optional)"
                className="input-premium"
                value={form.call_id || ""}
                onChange={handleChange}
              />
            </div>

            {/* Customer Name */}
            <div className="flex flex-col">
              <label className="label-premium">Customer Name</label>
              <input
                name="customer_name"
                className="input-premium"
                value={form.customer_name || ""}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col">
              <label className="label-premium">Phone</label>
              <input
                name="phone"
                className="input-premium"
                value={form.phone || ""}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <label className="label-premium">Email</label>
              <input
                name="email"
                type="email"
                className="input-premium"
                value={form.email || ""}
                onChange={handleChange}
              />
            </div>

            {/* Call Time */}
            <div className="flex flex-col">
              <label className="label-premium">Call Time</label>
              <input
                name="call_time"
                type="time"
                className="input-premium"
                value={form.call_time || ""}
                onChange={handleChange}
              />
            </div>

            {/* Call Date */}
            <div className="flex flex-col">
              <label className="label-premium">Call Date</label>
              <input
                name="call_date"
                type="date"
                className="input-premium"
                value={form.call_date || ""}
                onChange={handleChange}
              />
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <label className="label-premium">Status</label>
              <select
                name="status"
                className="input-premium"
                value={form.status || "hold"}
                onChange={handleChange}
              >
                <option value="hold">Hold</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Follow Up */}
            <div className="flex flex-col">
              <label className="label-premium">Follow Up Date &amp; Time</label>
              <input
                name="follow_up_datetime"
                type="datetime-local"
                className="input-premium"
                value={form.follow_up_datetime || ""}
                onChange={handleChange}
              />
            </div>

            {/* Sold Date */}
            <div className="flex flex-col">
              <label className="label-premium">Sold Date</label>
              <input
                name="sold_date"
                type="date"
                className="input-premium"
                value={form.sold_date || ""}
                onChange={handleChange}
              />
            </div>

            {/* Remarks */}
            <div className="flex flex-col sm:col-span-2">
              <label className="label-premium">Remarks</label>
              <textarea
                name="remarks"
                rows="3"
                className="input-premium resize-none"
                value={form.remarks || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary-premium">
              Cancel
            </button>
            <button type="submit" className="btn-primary-premium">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
