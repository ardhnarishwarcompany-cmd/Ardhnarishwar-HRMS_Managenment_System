import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Target } from "lucide-react";

import AddWorkTargetModal from "../../components/workTarget/AddWorkTargetModal";
import EditWorkTargetModal from "../../components/workTarget/EditWorkTargetModal";

import {
  getWorkTargets,
  createWorkTarget,
  updateWorkTarget,
  deleteWorkTarget,
} from "../../services/workTargetService";

import {
  getDepartments,
} from "../../services/masterService";

import {
  getEmployees,
} from "../../services/employeesService";
import { useClientAuth } from "../../context/ClientAuthContext";

export default function WorkTarget() {
  const { client } = useClientAuth();
  const isEmployee = String(client?.role || "").toUpperCase() === "CLIENT_EMPLOYEE";

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [targets, setTargets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTarget, setSelectedTarget] = useState(null);

  const [form, setForm] = useState({
    employeeId: 0,
    departmentId: 0,
    targetTitle: "",
    targetDescription: "",
    targetType: "daily",
    targetValue: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  useEffect(() => {
    const fetchAll = async () => {
      // The employee directory is admin-only (403 for CLIENT_EMPLOYEE); load each
      // dataset independently so one failure cannot blank the whole page.
      const [targetRes, deptRes, empRes] = await Promise.allSettled([
        getWorkTargets(),
        getDepartments(),
        isEmployee ? Promise.resolve({ data: { data: [] } }) : getEmployees(),
      ]);

      if (targetRes.status === "fulfilled") setTargets(targetRes.value.data?.data ?? []);
      else toast.error(targetRes.reason?.response?.data?.message || "Failed to load targets");

      if (deptRes.status === "fulfilled") setDepartments(deptRes.value.data?.data || []);
      if (empRes.status === "fulfilled") setEmployees(empRes.value.data?.data || []);
    };

    fetchAll();
  }, [isEmployee]);

  const deptById = useMemo(() => {
    const obj = {};
    departments.forEach((d) => (obj[d.id] = d));
    return obj;
  }, [departments]);

  const empById = useMemo(() => {
    const obj = {};
    employees.forEach((e) => (obj[e.id] = e));
    return obj;
  }, [employees]);

  const departmentOptions = [
    { value: 0, label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const employeeOptions = [
    { value: 0, label: "Select Employee (Optional)" },
    ...employees.map((e) => ({ value: e.id, label: `${e.employeeCode} - ${e.name}` })),
  ];

  const deptFilterOptions = [
    { value: 0, label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const targetTypeOptions = [
    { value: "all", label: "All Types" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const formTargetTypeOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
  ];

  const filteredTargets = (targets || []).filter((t) => {
    if (!t) return false;

    const q = (search || "").toLowerCase();

    const emp = empById[t.employeeId] || {};
    
    const matchSearch =
      (t.targetTitle || "").toLowerCase().includes(q) ||
      (t.targetDescription || "").toLowerCase().includes(q) ||
      (emp.name || "").toLowerCase().includes(q) ||
      (emp.employeeCode || "").toLowerCase().includes(q);

    const matchDept =
      deptFilter === 0 ? true : Number(t.departmentId) === Number(deptFilter);

    const isActive = t.isActive === 1 || t.isActive === true;
    const matchStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? isActive : !isActive;

    return matchSearch && matchDept && matchStatus;
  });

  const resetForm = () => {
    setForm({
      employeeId: 0,
      departmentId: 0,
      targetTitle: "",
      targetDescription: "",
      targetType: "daily",
      targetValue: "",
      startDate: "",
      endDate: "",
      isActive: true,
    });
  };

  const openAddModal = () => {
    resetForm();
    setOpenAdd(true);
  };

  const openEditModal = (target) => {
    setSelectedTarget(target);
    setForm({
      employeeId: Number(target.employeeId || 0),
      departmentId: Number(target.departmentId || 0),
      targetTitle: target.targetTitle || "",
      targetDescription: target.targetDescription || "",
      targetType: target.targetType || "daily",
      targetValue: target.targetValue || "",
      startDate: target.startDate ? String(target.startDate).slice(0, 10) : "",
      endDate: target.endDate ? String(target.endDate).slice(0, 10) : "",
      isActive: target.isActive === 1 || target.isActive === true,
    });
    setOpenEdit(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        employeeId: Number(form.employeeId) || null,
        departmentId: Number(form.departmentId) || null,
        targetTitle: form.targetTitle,
        targetDescription: form.targetDescription,
        targetType: form.targetType,
        targetValue: form.targetValue,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive ? 1 : 0,
      };

      const res = await createWorkTarget(payload);
      setTargets((prev) => [res.data.data, ...prev]);
      toast.success("Work target created");
      setOpenAdd(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create target");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTarget) return;

    try {
      const payload = {
        employeeId: Number(form.employeeId) || null,
        departmentId: Number(form.departmentId) || null,
        targetTitle: form.targetTitle,
        targetDescription: form.targetDescription,
        targetType: form.targetType,
        targetValue: form.targetValue,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: form.isActive ? 1 : 0,
      };

      const res = await updateWorkTarget(selectedTarget.id, payload);
      setTargets((prev) =>
        prev.map((x) => (x.id === selectedTarget.id ? res.data.data : x))
      );
      toast.success("Work target updated");
      setOpenEdit(false);
      setSelectedTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update target");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this target?")) return;

    try {
      await deleteWorkTarget(id);
      setTargets((prev) => prev.filter((x) => x.id !== id));
      toast.success("Work target deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete target");
    }
  };

  const getTypeBadge = (type) => {
    const types = {
      daily: { bg: "bg-blue-100", text: "text-blue-700", label: "Daily" },
      weekly: { bg: "bg-purple-100", text: "text-purple-700", label: "Weekly" },
      monthly: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Monthly" },
      quarterly: { bg: "bg-orange-100", text: "text-orange-700", label: "Quarterly" },
      yearly: { bg: "bg-teal-100", text: "text-teal-700", label: "Yearly" },
    };
    return types[type] || types.daily;
  };

  const statCounts = useMemo(() => {
    const active = targets.filter((t) => t.isActive === 1 || t.isActive === true).length;
    const inactive = targets.length - active;
    return { active, inactive, total: targets.length };
  }, [targets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="page-header-main">
          <span className="page-header-icon">
            <Target size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="page-header-title">Work Target</h1>
            <p className="page-header-subtitle">
              {isEmployee
                ? "Targets assigned to you by your company."
                : "Set and manage work targets for employees."}
            </p>
          </div>
        </div>

        {!isEmployee && (
          <button onClick={openAddModal} className="btn-primary btn-inline">
            + Add Target
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
          <p className="text-sm text-gray-500 font-medium">Total Targets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{statCounts.total}</p>
        </div>
        <div className="bg-green-50 rounded-2xl shadow border border-green-200 p-4">
          <p className="text-sm text-green-600 font-medium">Active</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{statCounts.active}</p>
        </div>
        <div className="bg-red-50 rounded-2xl shadow border border-red-200 p-4">
          <p className="text-sm text-red-600 font-medium">Inactive</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{statCounts.inactive}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 border border-gray-100 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, description or employee..."
          className="w-full xl:w-[420px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black"
        />

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(Number(e.target.value))}
          className="w-full xl:w-[200px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
        >
          {deptFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full xl:w-[160px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-900">
            Total Targets: {filteredTargets.length}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <div className="w-full overflow-auto max-h-[60vh]">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold">Target</th>
                  <th className="text-left px-5 py-4 font-semibold">Type</th>
                  <th className="text-left px-5 py-4 font-semibold">Department</th>
                  <th className="text-left px-5 py-4 font-semibold">Employee</th>
                  <th className="text-left px-5 py-4 font-semibold">Target Value</th>
                  <th className="text-left px-5 py-4 font-semibold">Duration</th>
                  <th className="text-left px-5 py-4 font-semibold">Status</th>
                  {!isEmployee && (
                    <th className="text-right px-5 py-4 font-semibold">Action</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredTargets.map((t) => {
                  const deptName = deptById[t.departmentId]?.name || "All";
                  // Employees have no directory access; the only assigned target they can see is their own.
                  const emp =
                    empById[t.employeeId] ||
                    (isEmployee && Number(t.employeeId) === Number(client?.id)
                      ? { name: client?.name, employeeCode: client?.employeeCode }
                      : {});
                  const badge = getTypeBadge(t.targetType);
                  const isActive = t.isActive === 1 || t.isActive === true;

                  return (
                    <tr
                      key={t.id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{t.targetTitle}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]" title={t.targetDescription}>
                            {t.targetDescription || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                        {t.departmentId ? deptName : "All"}
                      </td>

                      <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                        {t.employeeId ? (
                          <div>
                            <p className="font-semibold text-gray-900">{emp.name || "UNKNOWN"}</p>
                            <p className="text-xs text-gray-500">{emp.employeeCode || "-"}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">All Employees</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                        {t.targetValue || "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                        <div className="text-xs">
                          <p>Start: {t.startDate ? String(t.startDate).slice(0, 10) : "-"}</p>
                          <p>End: {t.endDate ? String(t.endDate).slice(0, 10) : "-"}</p>
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {!isEmployee && (
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(t)}
                            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold transition"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(t.id)}
                            className="ml-2 px-3 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredTargets.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-5 py-10 text-center text-gray-500">
                      No targets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddWorkTargetModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleCreate}
        departmentOptions={departmentOptions}
        employeeOptions={employeeOptions}
        targetTypeOptions={formTargetTypeOptions}
      />

      <EditWorkTargetModal
        open={openEdit}
        target={selectedTarget}
        onClose={() => {
          setOpenEdit(false);
          setSelectedTarget(null);
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleUpdate}
        departmentOptions={departmentOptions}
        employeeOptions={employeeOptions}
        targetTypeOptions={formTargetTypeOptions}
      />
    </div>
  );
}
