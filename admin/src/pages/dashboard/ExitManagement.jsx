import { useState, useEffect } from "react";
import ExportButton from "../../components/common/ExportButton";
import PageHeader from "../../components/common/PageHeader";
import toast from "react-hot-toast";
import API from "../../services/api";
import { exportCSV } from "../../utils/exportUtils";
import { 
  UserMinus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Search,
  Loader2,
  X,
  Eye,
  Trash2,
  Download,
  Calendar,
  AlertCircle,
  Building,
  Mail,
  Phone
} from "lucide-react";

export default function ExitManagement() {
  const [exitRequests, setExitRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [exitForm, setExitForm] = useState({
    employee_id: "",
    employee_name: "",
    resignation_date: "",
    notice_period_days: 30,
    reason: "",
    exit_date: "",
    exit_type: "voluntary"
  });
  const [statusModal, setStatusModal] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "",
    hr_remarks: "",
    exit_interview_date: "",
    final_settlement_date: ""
  });

useEffect(() => {
  fetchExitRequests();
  fetchStats();
}, [statusFilter, searchTerm]);

useEffect(() => {
  fetchEmployees();
}, []);

  const fetchExitRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
      
      const res = await API.get(`/super-admin/exit`);
      console.log(res.data)
      setExitRequests(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch exit requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      let res = await API.get("/super-admin/employees");
      if (res.data.employees && res.data.employees.length > 0) {
        setEmployees(res.data.employees);
        setEmployeesLoading(false);
        return;
      }
    } catch (err) {
      console.error(`Failed to fetch employees: ${err}`);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/super-admin/exit/stats");
      setStats(res.data.data || null);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e.id === Number(employeeId));
    if (employee) {
      setExitForm({
        ...exitForm,
        employee_id: employeeId,
        employee_name: employee.name
      });
    }
  };

  const handleSubmitExit = async (e) => {
    e.preventDefault();
    
    if (!exitForm.employee_id || !exitForm.resignation_date || !exitForm.notice_period_days) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/super-admin/exit", exitForm);
      if (res.data.success) {
        toast.success("Exit request submitted successfully!");
        setShowModal(false);
        setExitForm({
          employee_id: "",
          employee_name: "",
          resignation_date: "",
          notice_period_days: 30,
          reason: "",
          exit_date: "",
          exit_type: "voluntary"
        });
        fetchExitRequests();
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit exit request");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    
    if (!statusForm.status) {
      toast.error("Please select a status");
      return;
    }

    setLoading(true);
    try {
      const res = await API.put(`/super-admin/exit/${selectedRequest.id}/status`, statusForm);
      if (res.data.success) {
        toast.success(`Exit request ${statusForm.status}!`);
        setStatusModal(false);
        setSelectedRequest(null);
        setStatusForm({
          status: "",
          hr_remarks: "",
          exit_interview_date: "",
          final_settlement_date: ""
        });
        fetchExitRequests();
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExit = async (exitId) => {
    if (!window.confirm("Are you sure you want to delete this exit request?")) return;
    
    setLoading(true);
    try {
      const res = await API.delete(`/super-admin/exit/${exitId}`);
      if (res.data.success) {
        toast.success("Exit request deleted successfully!");
        fetchExitRequests();
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete exit request");
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (request) => {
    setSelectedRequest(request);
    setStatusForm({
      status: request.status,
      hr_remarks: request.hr_remarks || "",
      exit_interview_date: request.exit_interview_date ? request.exit_interview_date.split('T')[0] : "",
      final_settlement_date: request.final_settlement_date ? request.final_settlement_date.split('T')[0] : ""
    });
    setStatusModal(true);
  };

  const openDetailModal = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const calculateRemainingDays = (exitDate) => {
    if (!exitDate) return null;
    const exit = new Date(exitDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exit.setHours(0, 0, 0, 0);
    const diffTime = exit - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 10);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  const getStatusConfig = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "pending":
        return {
          label: "Pending",
          className: "bg-amber-50 text-amber-700 border-amber-200/80",
          dot: "bg-amber-500",
          icon: Clock,
        };
      case "approved":
        return {
          label: "Approved",
          className: "bg-blue-50 text-blue-700 border-blue-200/80",
          dot: "bg-blue-500",
          icon: CheckCircle,
        };
      case "processing":
        return {
          label: "Processing",
          className: "bg-purple-50 text-purple-700 border-purple-200/80",
          dot: "bg-purple-500",
          icon: Clock,
        };
      case "completed":
        return {
          label: "Completed",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          dot: "bg-emerald-500",
          icon: CheckCircle,
        };
      case "rejected":
        return {
          label: "Rejected",
          className: "bg-rose-50 text-rose-700 border-rose-200/80",
          dot: "bg-rose-500",
          icon: XCircle,
        };
      default:
        return {
          label: status || "Unknown",
          className: "bg-gray-50 text-gray-700 border-gray-200/80",
          dot: "bg-gray-400",
          icon: Clock,
        };
    }
  };

  const exportToCSV = () =>
    exportCSV(
      exitRequests.map((req) => ({
        employee: req.employee_name || "",
        employee_code: req.employeeCode || "",
        resignation_date: req.resignation_date ? new Date(req.resignation_date).toLocaleDateString() : "",
        notice_period: `${req.notice_period_days} days`,
        exit_date: req.exit_date ? new Date(req.exit_date).toLocaleDateString() : "",
        type: req.exit_type || "",
        status: req.status || "",
        reason: req.reason || "",
      })),
      `exit_requests_${new Date().toISOString().split("T")[0]}`,
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Exit Management"
        desc="Manage employee resignations, notice periods, and exit workflows."
      />

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
              <UserMinus size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Exits</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stats?.total ?? exitRequests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-100/60 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600/80">Pending</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stats?.pending ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-100/60 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600/80">Processing</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stats?.processing ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100/60 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/80">Completed</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stats?.completed ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-100/60 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0 border border-rose-100">
              <XCircle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600/80">Rejected</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stats?.rejected ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search employee or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition shadow-sm"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={() => {
                if (employees.length === 0) {
                  fetchEmployees();
                }
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition hover:shadow whitespace-nowrap"
            >
              <Plus size={15} />
              New Exit Request
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="animate-spin text-violet-600" size={30} />
              <p className="text-sm font-medium">Loading exit requests...</p>
            </div>
          ) : exitRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <UserMinus size={44} className="mx-auto mb-2.5 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No exit requests found</p>
              <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Employee</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Resignation Date</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Notice Period</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Exit Date</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Remaining</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exitRequests.map((request) => {
                  const statusConf = getStatusConfig(request.status);
                  const remaining = calculateRemainingDays(request.exit_date);
                  const isDone = request.status === "completed" || request.status === "rejected";

                  return (
                    <tr key={request.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white shadow-sm text-xs">
                            {(request.employee_name || "E").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 leading-tight">
                              {request.employee_name || "—"}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {request.employeeCode || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Resignation Date */}
                      <td className="px-5 py-4 text-gray-700 font-medium">
                        {formatDate(request.resignation_date)}
                      </td>

                      {/* Notice Period */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          {request.notice_period_days || 0} days
                        </span>
                      </td>

                      {/* Exit Date */}
                      <td className="px-5 py-4 text-gray-700 font-medium">
                        {formatDate(request.exit_date)}
                      </td>

                      {/* Remaining */}
                      <td className="px-5 py-4">
                        {request.exit_date && !isDone && remaining !== null ? (
                          remaining < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                              <AlertCircle size={12} /> Expired
                            </span>
                          ) : remaining === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                              <Clock size={12} /> Today
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <Clock size={12} /> {remaining} {remaining === 1 ? "day left" : "days left"}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                          {request.exit_type || "Voluntary"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConf.className}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDetailModal(request)}
                            className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openStatusModal(request)}
                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Update Status"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteExit(request.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            Showing <strong className="text-gray-700 font-semibold">{exitRequests.length}</strong> exit {exitRequests.length === 1 ? "request" : "requests"}
          </span>
          <div className="flex items-center gap-4">
            <span>Pending: <strong className="text-amber-700 font-semibold">{stats?.pending ?? 0}</strong></span>
            <span>Processing: <strong className="text-purple-700 font-semibold">{stats?.processing ?? 0}</strong></span>
            <span>Completed: <strong className="text-emerald-700 font-semibold">{stats?.completed ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">New Exit Request</h3>
                <p className="text-xs text-gray-500 mt-0.5">Record an employee resignation or offboarding workflow</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitExit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={exitForm.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  required
                  disabled={employeesLoading}
                >
                  <option value="">
                    {employeesLoading ? "Loading employees..." : employees.length === 0 ? "No employees found" : "Select Employee"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} {emp.employeeCode ? `- ${emp.employeeCode}` : ""}
                    </option>
                  ))}
                </select>
                {employees.length === 0 && !employeesLoading && (
                  <p className="text-xs text-rose-500 mt-1">Please ensure employees are added in the system.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Resignation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={exitForm.resignation_date}
                    onChange={(e) => setExitForm({ ...exitForm, resignation_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Notice Period (Days) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={exitForm.notice_period_days}
                    onChange={(e) => setExitForm({ ...exitForm, notice_period_days: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Expected Exit Date
                  </label>
                  <input
                    type="date"
                    value={exitForm.exit_date}
                    onChange={(e) => setExitForm({ ...exitForm, exit_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Exit Type
                  </label>
                  <select
                    value={exitForm.exit_type}
                    onChange={(e) => setExitForm({ ...exitForm, exit_type: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition capitalize"
                  >
                    <option value="voluntary">Voluntary</option>
                    <option value="resignation">Resignation</option>
                    <option value="termination">Termination</option>
                    <option value="retirement">Retirement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Reason for Leaving
                </label>
                <textarea
                  value={exitForm.reason}
                  onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition resize-none"
                  placeholder="Enter reason for leaving..."
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {loading && <Loader2 className="animate-spin" size={15} />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Update Exit Request</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update offboarding status and settlement dates</p>
              </div>
              <button onClick={() => setStatusModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition capitalize"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Exit Interview Date
                  </label>
                  <input
                    type="date"
                    value={statusForm.exit_interview_date}
                    onChange={(e) => setStatusForm({ ...statusForm, exit_interview_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Final Settlement Date
                  </label>
                  <input
                    type="date"
                    value={statusForm.final_settlement_date}
                    onChange={(e) => setStatusForm({ ...statusForm, final_settlement_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  HR Remarks
                </label>
                <textarea
                  value={statusForm.hr_remarks}
                  onChange={(e) => setStatusForm({ ...statusForm, hr_remarks: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50/50 focus:bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition resize-none"
                  placeholder="Add remarks..."
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStatusModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {loading && <Loader2 className="animate-spin" size={15} />}
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Exit Request Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Employee offboarding record and timeline</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-base">
                  {(selectedRequest.employee_name || "E").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-gray-900 leading-tight">{selectedRequest.employee_name}</h4>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedRequest.employeeCode}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600">
                    {selectedRequest.email && (
                      <span className="flex items-center gap-1.5"><Mail size={13} className="text-gray-400" /> {selectedRequest.email}</span>
                    )}
                    {selectedRequest.phone && (
                      <span className="flex items-center gap-1.5"><Phone size={13} className="text-gray-400" /> {selectedRequest.phone}</span>
                    )}
                  </div>
                </div>
                {(() => {
                  const conf = getStatusConfig(selectedRequest.status);
                  const Icon = conf.icon;
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${conf.className}`}>
                      <Icon size={13} />
                      {conf.label}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Resignation Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedRequest.resignation_date)}
                  </p>
                </div>
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Notice Period</p>
                  <p className="font-medium text-gray-900">{selectedRequest.notice_period_days} days</p>
                </div>
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Expected Exit Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedRequest.exit_date)}
                  </p>
                </div>
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Exit Type</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedRequest.exit_type || "Voluntary"}</p>
                </div>
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Exit Interview Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedRequest.exit_interview_date)}
                  </p>
                </div>
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Final Settlement Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedRequest.final_settlement_date)}
                  </p>
                </div>
              </div>

              {selectedRequest.reason && (
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Reason for Leaving</p>
                  <p className="text-gray-700 text-sm">{selectedRequest.reason}</p>
                </div>
              )}

              {selectedRequest.hr_remarks && (
                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">HR Remarks</p>
                  <p className="text-gray-700 text-sm">{selectedRequest.hr_remarks}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openStatusModal(selectedRequest);
                  }}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  <CheckCircle size={16} />
                  Update Status
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleDeleteExit(selectedRequest.id);
                  }}
                  className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-sm font-semibold transition"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
