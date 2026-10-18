import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Plus, Search, Pencil, Trash2, Eye, Download } from "lucide-react";

import AddWorkPolicyModal from "../../components/workPolicy/AddWorkPolicyModal";
import EditWorkPolicyModal from "../../components/workPolicy/EditWorkPolicyModal";
import WorkPolicyDetailsModal from "../../components/workPolicy/WorkPolicyDetailsModal";

import {
  getWorkPolicies,
  createWorkPolicy,
  updateWorkPolicy,
  deleteWorkPolicy, downloadWorkPolicyPdf,
} from "../../services/workPolicyService";

import { useClientAuth } from "../../context/ClientAuthContext";

import { getDepartments } from "../../services/masterService";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

export default function WorkPolicy() {
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [policies, setPolicies] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [openView, setOpenView] = useState(false);
  const { client } = useClientAuth();
  const isEmployee = client?.role === "CLIENT_EMPLOYEE";

  const [form, setForm] = useState({
    title: "",
    type: "attendance",
    departmentId: 0,
    description: "",
    isActive: true,
    isAutomated: true,
    autoDeduction: "",
    autoApply: true,
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const policyRes = await getWorkPolicies();
        setPolicies(policyRes.data?.data ?? []);
      } catch (err) {
        toast.error("Failed to load policies");
      }

      try {
        const deptRes = await getDepartments();
        setDepartments(deptRes.data?.data || []);
      } catch (err) {
        console.warn("Departments not allowed");
      }
    };

    fetchAll();
  }, []);

  const deptById = useMemo(() => {
    const obj = {};
    departments.forEach((d) => (obj[d.id] = d));
    return obj;
  }, [departments]);

  const departmentOptions = [
    { value: 0, label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const deptFilterOptions = [
    { value: 0, label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "attendance", label: "Attendance" },
    { value: "leave", label: "Leave" },
    { value: "behavior", label: "Behavior" },
    { value: "meal_management", label: "Meal Management" },
    { value: "general", label: "General" },
  ];

  const policyTypeOptions = [
    { value: "attendance", label: "Attendance" },
    { value: "leave", label: "Leave" },
    { value: "behavior", label: "Behavior" },
    { value: "meal_management", label: "Meal Management" },
    { value: "general", label: "General" },
  ];

  const filteredPolicies = (policies || []).filter((p) => {
    if (!p) return false;

    const q = (search || "").toLowerCase();

    const matchSearch =
      (p.title || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    const matchDept =
      deptFilter === 0
        ? true
        : Number(p.departmentId || 0) === Number(deptFilter);

    const matchType = typeFilter === "all" ? true : p.type === typeFilter;

    return matchSearch && matchDept && matchType;
  });

  const resetForm = () => {
    setForm({
      title: "",
      type: "attendance",
      departmentId: 0,
      description: "",
      isActive: true,
      isAutomated: true,
      autoDeduction: "",
      autoApply: true,
    });
  };

  const openAddModal = () => {
    resetForm();
    setOpenAdd(true);
  };

  const handleView = (policy) => {
    setSelectedPolicy(policy);
    setOpenView(true);
  };

  const handleDownloadPdf = async (policy) => {
    try {
      const blob = await downloadWorkPolicyPdf(policy.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Work-Policy-${String(policy.title || "Policy").replace(/[^a-z0-9]+/gi, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Policy PDF downloaded");
    } catch (error) {
      console.error("DOWNLOAD POLICY PDF:", error);
      toast.error("Failed to download policy PDF");
    }
  };

  const openEditModal = (policy) => {
    setSelectedPolicy(policy);
    setForm({
      title: policy.title || "",
      type: policy.type || "attendance",
      departmentId: Number(policy.departmentId || 0),
      description: policy.description || "",
      isActive: policy.isActive === 1 || policy.isActive === true,
      isAutomated: policy.isAutomated === 1 || policy.isAutomated === true,
      autoDeduction: policy.autoDeduction || "",
      autoApply: policy.autoApply === 1 || policy.autoApply === true,
    });
    setOpenEdit(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        title: form.title,
        type: form.type,
        departmentId: Number(form.departmentId),
        description: form.description,
        isActive: form.isActive ? 1 : 0,
        isAutomated: form.isAutomated ? 1 : 0,
        autoDeduction: form.autoDeduction || null,
        autoApply: form.autoApply ? 1 : 0,
      };

      const res = await createWorkPolicy(payload);

      setPolicies((prev) => [res.data.data, ...prev]);

      toast.success("Work policy created");
      setOpenAdd(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create policy");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedPolicy) return;

    try {
      const payload = {
        title: form.title,
        type: form.type,
        departmentId: Number(form.departmentId),
        description: form.description,
        isActive: form.isActive ? 1 : 0,
        isAutomated: form.isAutomated ? 1 : 0,
        autoDeduction: form.autoDeduction || null,
        autoApply: form.autoApply ? 1 : 0,
      };

      const res = await updateWorkPolicy(selectedPolicy.id, payload);

      const updatedPolicy = res.data.policy || res.data.data;

      setPolicies((prev) =>
        prev.map((x) => (x.id === updatedPolicy.id ? updatedPolicy : x)),
      );

      toast.success("Work policy updated");
      setOpenEdit(false);
      setSelectedPolicy(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update policy");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;

    try {
      await deleteWorkPolicy(id);

      setPolicies((prev) => prev.filter((x) => x.id !== Number(id)));

      toast.success("Work policy deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  const getTypeBadge = (type) => {
    const types = {
      attendance: { cls: "badge-info", label: "Attendance" },
      leave: { cls: "badge-success", label: "Leave" },
      behavior: { cls: "badge-warning", label: "Behavior" },
      meal_management: { cls: "badge-danger", label: "Meal Mgmt" },
      general: { cls: "badge-neutral", label: "General" },
    };
    return types[type] || types.general;
  };

  const statCounts = useMemo(() => {
    const active = policies.filter(
      (p) => p.isActive === 1 || p.isActive === true,
    ).length;
    const inactive = policies.length - active;
    return { active, inactive, total: policies.length };
  }, [policies]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText size={22} />}
        title="Work Policy"
        desc={
          isEmployee
            ? "Read the work policies that apply to you and download them as PDF."
            : "Manage automated work policies for employees."
        }
        actions={
          !isEmployee && (
            <button onClick={openAddModal} className="btn-primary-premium">
              <Plus size={16} /> Add Policy
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-premium stat-accent-violet">
          <p className="stat-premium-label">Total Policies</p>
          <p className="stat-premium-value">{statCounts.total}</p>
        </div>
        <div className="stat-premium stat-accent-emerald">
          <p className="stat-premium-label text-emerald-600">Active</p>
          <p className="stat-premium-value">{statCounts.active}</p>
        </div>
        <div className="stat-premium stat-accent-rose">
          <p className="stat-premium-label text-rose-600">Inactive</p>
          <p className="stat-premium-value">{statCounts.inactive}</p>
        </div>
      </div>

      <div className="card-premium p-4 sm:p-5 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative w-full lg:flex-1 lg:min-w-[260px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or description..."
            className="input-premium pl-9 w-full"
            aria-label="Search policies"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:flex lg:shrink-0">
          <div className="w-full lg:w-52">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(Number(e.target.value))}
              className="input-premium w-full"
              aria-label="Filter by department"
            >
              {deptFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full lg:w-44">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-premium w-full"
              aria-label="Filter by policy type"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <p className="font-semibold text-gray-900">Policies</p>
          <span className="badge-premium badge-neutral">
            {filteredPolicies.length} of {policies.length}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[60vh] scrollbar-thin-premium">
          <table className="table-premium min-w-[960px] w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left px-5 py-4">Title</th>
                <th className="text-left px-5 py-4">Type</th>
                <th className="text-left px-5 py-4">Department</th>
                <th className="text-left px-5 py-4">Automated</th>
                <th className="text-left px-5 py-4">Auto Apply</th>
                <th className="text-left px-5 py-4">Status</th>
                <th className="text-right px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPolicies.map((p) => {
                const deptName = deptById[p.departmentId]?.name || "All";
                const badge = getTypeBadge(p.type);
                const isActive = p.isActive === 1 || p.isActive === true;

                return (
                  <tr key={p.id}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleView(p)}
                        className="font-semibold text-gray-900 hover:text-[var(--p)] transition-colors text-left"
                      >
                        {p.title}
                      </button>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`badge-premium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                      {p.departmentId ? deptName : "All"}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`badge-premium ${
                          p.isAutomated === 1 || p.isAutomated === true
                            ? "badge-info"
                            : "badge-neutral"
                        }`}
                      >
                        {p.isAutomated === 1 || p.isAutomated === true
                          ? "Auto"
                          : "Manual"}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`badge-premium ${
                          p.autoApply === 1 || p.autoApply === true
                            ? "badge-success"
                            : "badge-danger"
                        }`}
                      >
                        {p.autoApply === 1 || p.autoApply === true
                          ? "Yes"
                          : "No"}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`badge-premium ${
                          isActive ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(p)}
                          className="btn-secondary-premium btn-inline !px-3 !py-1.5 text-xs"
                        >
                          <Eye size={13} aria-hidden="true" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(p)}
                          className="btn-secondary-premium btn-inline !px-3 !py-1.5 text-xs"
                        >
                          <Download size={13} aria-hidden="true" />
                          PDF
                        </button>

                        {/* `sa-*` rows are Super Admin company policies merged in
                            from the `policies` table — view/PDF only from here. */}
                        {!isEmployee && !String(p.id).startsWith("sa-") && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="btn-secondary-premium btn-inline !px-3 !py-1.5 text-xs"
                            >
                              <Pencil size={13} aria-hidden="true" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="btn-danger-soft !px-3 !py-1.5 text-xs"
                            >
                              <Trash2 size={13} aria-hidden="true" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPolicies.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon={<FileText size={28} />}
                      title="No policies found"
                      desc="Add a work policy or adjust the filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddWorkPolicyModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleCreate}
        departmentOptions={departmentOptions}
        policyTypeOptions={policyTypeOptions}
      />

      <WorkPolicyDetailsModal
        open={openView && !!selectedPolicy}
        policy={selectedPolicy}
        departmentName={deptById[selectedPolicy?.departmentId]?.name}
        onClose={() => {
          setOpenView(false);
          setSelectedPolicy(null);
        }}
        onDownload={handleDownloadPdf}
      />

      <EditWorkPolicyModal
        open={openEdit}
        policy={selectedPolicy}
        onClose={() => {
          setOpenEdit(false);
          setSelectedPolicy(null);
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleUpdate}
        departmentOptions={departmentOptions}
        policyTypeOptions={policyTypeOptions}
      />
    </div>
  );
}
