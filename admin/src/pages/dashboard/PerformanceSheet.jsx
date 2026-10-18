import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  Download,
  Plus,
  Edit2,
  Trash2,
  Star,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  Target,
  Award,
  Clock,
  FileText,
  Eye,
  X,
  Loader2,
} from "lucide-react";

import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import ConfirmModal from "../../components/ui/ConfirmModal";
import StatCard from "../../components/common/StatCard";
import * as performanceService from "../../services/performanceService.js";

const PERFORMANCE_CRITERIA = [
  { id: "quality", name: "Work Quality", maxScore: 10 },
  { id: "productivity", name: "Productivity", maxScore: 10 },
  { id: "communication", name: "Communication", maxScore: 10 },
  { id: "teamwork", name: "Teamwork", maxScore: 10 },
  { id: "attendance", name: "Attendance & Punctuality", maxScore: 10 },
  { id: "initiative", name: "Initiative & Innovation", maxScore: 10 },
  { id: "deadline", name: "Meeting Deadlines", maxScore: 10 },
  { id: "adaptability", name: "Adaptability", maxScore: 10 },
];

const DEFAULT_SCORES = Object.fromEntries(
  PERFORMANCE_CRITERIA.map((c) => [c.id, 5]),
);

const DEPARTMENTS = [
  { id: 0, name: "All Departments" },
  { id: 1, name: "Engineering" },
  { id: 2, name: "HR" },
  { id: 3, name: "Sales" },
  { id: 4, name: "Marketing" },
  { id: 5, name: "Finance" },
];

// barColor must be a literal class name: Tailwind only generates classes it
// can see in source, so building "bg-red-700" at runtime from textColor
// produced a class that did not exist and the filled bar segments rendered
// transparent.
const STATUS_CONFIG = {
  excellent: {
    label: "Excellent",
    color: "bg-green-100 text-green-700",
    borderColor: "border-green-500",
    bgGlow: "bg-green-50",
    barColor: "bg-green-500",
    icon: CheckCircle,
    textColor: "text-green-700",
  },
  good: {
    label: "Good",
    color: "bg-yellow-100 text-yellow-700",
    borderColor: "border-yellow-500",
    bgGlow: "bg-yellow-50",
    barColor: "bg-yellow-500",
    icon: AlertCircle,
    textColor: "text-yellow-700",
  },
  needs_improvement: {
    label: "Needs Improvement",
    color: "bg-red-100 text-red-700",
    borderColor: "border-red-500",
    bgGlow: "bg-red-50",
    barColor: "bg-red-500",
    icon: XCircle,
    textColor: "text-red-700",
  },
};

const getPerformanceStatus = (avgScore) => {
  if (avgScore >= 8) return "excellent";
  if (avgScore >= 6) return "good";
  return "needs_improvement";
};

const getStatusBadge = (status) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${config.color}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
};

export default function PerformanceSheet() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    period: dayjs().format("YYYY-MM"),
    scores: { ...DEFAULT_SCORES },
    remarks: "",
    overallRating: 0,
  });

  useEffect(() => {
    fetchRecords();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await performanceService.getEmployees();
      setEmployees(res.data.data);
    } catch (err) {
      toast.error("Failed to load employees");
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await performanceService.getPerformanceRecords();
      setRecords(res.data.data); // follow your backend response format
    } catch (err) {
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = records.length;
    const excellent = records.filter((r) => r.status === "excellent").length;
    const good = records.filter((r) => r.status === "good").length;
    const needsImprovement = records.filter(
      (r) => r.status === "needs_improvement",
    ).length;
    // avgScore arrives as a DECIMAL string from MySQL; coerce before summing
    // or the reduce concatenates strings and the stat shows NaN.
    const avgAll =
      total > 0
        ? (
            records.reduce((sum, r) => sum + (Number(r.avgScore) || 0), 0) /
            total
          ).toFixed(1)
        : "0.0";

    return { total, excellent, good, needsImprovement, avgAll };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        search === "" ||
        r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(search.toLowerCase());

      const matchDept =
        departmentFilter === 0 || r.departmentId === departmentFilter;

      const matchStatus = statusFilter === "all" || r.status === statusFilter;

      const matchPeriod = periodFilter === "all" || r.period === periodFilter;

      return matchSearch && matchDept && matchStatus && matchPeriod;
    });
  }, [records, search, departmentFilter, statusFilter, periodFilter]);

  const periods = useMemo(() => {
    // Always offer the last 12 months, plus any periods found in records
    const recent = Array.from({ length: 12 }, (_, i) =>
      dayjs().subtract(i, "month").format("YYYY-MM"),
    );
    const fromRecords = records.map((r) => r.period).filter(Boolean);
    const unique = [...new Set([...recent, ...fromRecords])].sort().reverse();
    return [
      { value: "all", label: "All Periods" },
      ...unique.map((p) => ({ value: p, label: dayjs(p).format("MMM YYYY") })),
    ];
  }, [records]);

  const calculateAvgScore = (scores) => {
    const values = Object.values(scores).filter((v) => v > 0);

    if (values.length === 0) return 0;

    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(2);
  };

  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setFormData({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: record.department,
      period: record.period,
      scores: { ...DEFAULT_SCORES, ...record.scores },
      remarks: record.remarks,
      overallRating: record.avgScore,
    });
    setOpenEditModal(true);
  };

  const handleOpenView = (record) => {
    setSelectedRecord(record);
    setOpenViewModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();

    const scoreValues = Object.values(formData.scores || {}).filter(
      (v) => v > 0,
    );

    if (scoreValues.length === 0) {
      toast.error("Please select at least one performance criteria");
      return;
    }
    const avgScore = calculateAvgScore(formData.scores);
    const status = getPerformanceStatus(parseFloat(avgScore));

    const newRecord = {
      id: Date.now(),
      employeeId: formData.employeeId,
      employeeName: formData.employeeName,
      department: formData.department,
      departmentId:
        DEPARTMENTS.find((d) => d.name === formData.department)?.id || 0,
      period: formData.period,
      scores: { ...formData.scores },
      avgScore: parseFloat(avgScore),
      status,
      remarks: formData.remarks,
      reviewedBy: "Admin",
      reviewedAt: dayjs().format("YYYY-MM-DD"),
    };

    await performanceService.createPerformanceRecord(newRecord);
    await fetchRecords();
    toast.success("Performance record added successfully!");
    setOpenAddModal(false);
    resetForm();
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();

    const avgScore = calculateAvgScore(formData.scores);
    const status = getPerformanceStatus(parseFloat(avgScore));

    const updated = {
      ...selectedRecord,
      scores: { ...formData.scores },
      avgScore: parseFloat(avgScore),
      status,
      remarks: formData.remarks,
      reviewedAt: dayjs().format("YYYY-MM-DD"),
    };

    await performanceService.updatePerformanceRecord(
      selectedRecord.id,
      updated,
    );
    await fetchRecords();

    toast.success("Performance record updated successfully!");
    setOpenEditModal(false);
    setSelectedRecord(null);
    resetForm();
  };

  const handleDelete = async () => {
    try {
      await performanceService.deletePerformanceRecord(deleteId);
      await fetchRecords();
      toast.success("Record deleted successfully!");
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setOpenDeleteModal(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      department: "",
      period: dayjs().format("YYYY-MM"),
      scores: { ...DEFAULT_SCORES },
      remarks: "",
      overallRating: 0,
    });
  };

  const handleScoreChange = (criteriaId, value) => {
    setFormData((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [criteriaId]: parseInt(value) || 0,
      },
    }));
  };

  const renderScoreInput = (criteria, value = 5) => {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => handleScoreChange(criteria.id, e.target.value)}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max="10"
            value={value}
            onChange={(e) => handleScoreChange(criteria.id, e.target.value)}
            className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-center font-semibold"
          />
          <span className="text-xs text-gray-500">/10</span>
        </div>
      </div>
    );
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const header = [
      "Employee ID",
      "Employee",
      "Department",
      "Period",
      "Overall Score",
      "Status",
      ...PERFORMANCE_CRITERIA.map((c) => c.name),
      "Remarks",
      "Reviewed By",
      "Reviewed At",
    ];
    const rows = filteredRecords.map((r) => [
      r.employeeId,
      r.employeeName,
      r.department,
      r.period,
      r.avgScore,
      STATUS_CONFIG[r.status]?.label || r.status,
      ...PERFORMANCE_CRITERIA.map((c) => r.scores?.[c.id] ?? ""),
      r.remarks,
      r.reviewedBy,
      r.reviewedAt,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `performance-reviews-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredRecords.length} record(s)`);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "records", label: "All Records", icon: FileText },
  ];

  return (
    <div>
      <PageHeader
        title="Employee Performance Sheet"
        desc="Track and evaluate employee performance with color-coded ratings."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          title="Total Reviews"
          value={stats.total}
          icon={<Users size={20} />}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Excellent"
          value={stats.excellent}
          icon={<CheckCircle size={20} />}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Good"
          value={stats.good}
          icon={<AlertCircle size={20} />}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          title="Needs Improvement"
          value={stats.needsImprovement}
          icon={<XCircle size={20} />}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          title="Avg Score"
          value={stats.avgAll}
          icon={<Award size={20} />}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name or ID..."
            aria-label="Search by employee name or ID"
            className="w-full md:flex-1 md:min-w-[220px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black"
          />

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(Number(e.target.value))}
            aria-label="Filter by department"
            className="w-full md:w-44 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="w-full md:w-44 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
          >
            <option value="all">All Status</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="needs_improvement">Needs Improvement</option>
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            aria-label="Filter by review period"
            className="w-full md:w-36 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2 md:ml-auto">
            <button
              type="button"
              onClick={handleExport}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition"
            >
              <Download size={18} />
              Export
            </button>
            <button
              type="button"
              onClick={() => setOpenAddModal(true)}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-900 text-white rounded-xl font-semibold transition whitespace-nowrap"
            >
              <Plus size={18} />
              Add Review
            </button>
          </div>
        </div>
      </div>

      {/* Overview Tab - Performance Cards */}
      {activeTab === "overview" && loading && records.length === 0 && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 py-16 flex items-center justify-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading performance data...</span>
        </div>
      )}

      {activeTab === "overview" && !loading && filteredRecords.length === 0 && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 py-16 px-6 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
            <Target size={26} />
          </div>
          <p className="font-bold text-gray-900">No performance reviews found</p>
          <p className="text-sm text-gray-500 max-w-sm text-pretty">
            {records.length === 0
              ? "Start by adding a review for an employee."
              : "No records match the current search or filters."}
          </p>
          {records.length === 0 && (
            <button
              type="button"
              onClick={() => setOpenAddModal(true)}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-900 text-white rounded-xl font-semibold transition"
            >
              <Plus size={18} />
              Add Review
            </button>
          )}
        </div>
      )}

      {activeTab === "overview" && filteredRecords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const statusConfig = STATUS_CONFIG[record.status];
            const StatusIcon = statusConfig.icon;
            const filledSegments = Math.round(record.avgScore);

            return (
              <article
                key={record.id}
                className={`bg-white rounded-2xl shadow border-l-4 ${statusConfig.borderColor} overflow-hidden min-w-0 flex flex-col`}
              >
                <div className="p-5 flex flex-col flex-1 gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1 basis-40">
                      <h3 className="font-bold text-gray-900 text-pretty">
                        {record.employeeName}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {record.employeeId} • {record.department}
                      </p>
                    </div>
                    <div className="shrink-0">{getStatusBadge(record.status)}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Overall Score</p>
                      <p className="text-3xl font-extrabold leading-tight">
                        <span className={statusConfig.textColor}>
                          {Number(record.avgScore).toFixed(2)}
                        </span>
                        <span className="text-sm font-normal text-gray-400">
                          /10
                        </span>
                      </p>
                    </div>
                    <div
                      className={`w-14 h-14 shrink-0 rounded-xl ${statusConfig.bgGlow} flex items-center justify-center`}
                    >
                      <StatusIcon
                        size={28}
                        className={statusConfig.textColor}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Period: {dayjs(record.period).format("MMM YYYY")}</span>
                      <span>{filledSegments}/10</span>
                    </div>
                    <div
                      className="flex gap-1"
                      role="img"
                      aria-label={`Score ${record.avgScore} out of 10`}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <div
                          key={score}
                          className={`flex-1 h-2 rounded-full ${
                            score <= filledSegments
                              ? statusConfig.barColor
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="min-h-[2.5rem]">
                    {record.remarks ? (
                      <p className="text-sm text-gray-600 line-clamp-2 text-pretty">
                        <span className="font-semibold text-gray-700">Remarks: </span>
                        {record.remarks}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No remarks added</p>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleOpenView(record)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(record)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteId(record.id);
                        setOpenDeleteModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Records Tab - Table View */}
      {activeTab === "records" && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <p className="font-semibold text-gray-900">
              Showing {filteredRecords.length} of {records.length} records
            </p>
          </div>

          <div className="w-full overflow-auto max-h-[60vh]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold">
                    Employee
                  </th>
                  <th className="text-left px-5 py-4 font-semibold">
                    Department
                  </th>
                  <th className="text-left px-5 py-4 font-semibold">Period</th>
                  <th className="text-left px-5 py-4 font-semibold">Score</th>
                  <th className="text-left px-5 py-4 font-semibold">Status</th>
                  <th className="text-left px-5 py-4 font-semibold">
                    Reviewed By
                  </th>
                  <th className="text-left px-5 py-4 font-semibold">Date</th>
                  <th className="text-right px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {record.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.employeeId}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {record.department}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {dayjs(record.period).format("MMM YYYY")}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-lg font-bold">
                        {record.avgScore}
                        <span className="text-sm font-normal text-gray-400">
                          /10
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {record.reviewedBy}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {record.reviewedAt}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenView(record)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(record)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteId(record.id);
                            setOpenDeleteModal(true);
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={openAddModal || openEditModal}
        title={
          openEditModal ? "Edit Performance Review" : "Add Performance Review"
        }
        onClose={() => {
          setOpenAddModal(false);
          setOpenEditModal(false);
          setSelectedRecord(null);
          resetForm();
        }}
        width="max-w-3xl"
      >
        <form
          onSubmit={openEditModal ? handleSubmitEdit : handleSubmitAdd}
          className="space-y-5"
        >
          {!openEditModal && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Employee
              </label>

              <select
                value={formData.employeeId}
                onChange={(e) => {
                  const emp = employees.find(
                    (el) => el.employeeCode === e.target.value,
                  );
                  setFormData({
                    ...formData,
                    employeeId: emp.employeeCode,
                    employeeName: emp.name,
                    department: emp.departmentName,
                    departmentId: emp.departmentId,
                  });
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
                required
              >
                <option value="">Select Employee</option>

                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employeeCode}>
                    {emp.employeeCode} - {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Review Period"
              type="month"
              value={formData.period}
              onChange={(e) =>
                setFormData({ ...formData, period: e.target.value })
              }
              required
            />
            <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Calculated Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculateAvgScore(formData.scores || {}) || "0"}/10
                </p>
              </div>
              {formData.scores &&
                Object.keys(formData.scores).length > 0 &&
                getStatusBadge(
                  getPerformanceStatus(
                    parseFloat(calculateAvgScore(formData.scores)),
                  ),
                )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">
              Performance Criteria
            </h4>
            <div className="space-y-3">
              {PERFORMANCE_CRITERIA.map((criteria) => (
                <div
                  key={criteria.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-xl"
                >
                  <span className="sm:w-44 shrink-0 text-sm font-medium text-gray-700">
                    {criteria.name}
                  </span>
                  <div className="flex-1">
                    {renderScoreInput(
                      criteria,
                      formData.scores?.[criteria.id] || 5,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks / Feedback
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Enter feedback and comments..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setOpenAddModal(false);
                setOpenEditModal(false);
                setSelectedRecord(null);
                resetForm();
              }}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-black hover:bg-gray-900 text-white font-semibold transition"
            >
              {openEditModal ? "Update Review" : "Submit Review"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        open={openViewModal}
        title="Performance Review Details"
        onClose={() => {
          setOpenViewModal(false);
          setSelectedRecord(null);
        }}
        width="max-w-2xl"
      >
        {selectedRecord && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-900 truncate">
                  {selectedRecord.employeeName}
                </h3>
                <p className="text-gray-500 truncate">
                  {selectedRecord.employeeId} • {selectedRecord.department}
                </p>
              </div>
              <div className="shrink-0">{getStatusBadge(selectedRecord.status)}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Review Period</p>
                <p className="font-semibold text-gray-900">
                  {dayjs(selectedRecord.period).format("MMMM YYYY")}
                </p>
              </div>
              <div
                className={`p-4 rounded-xl ${STATUS_CONFIG[selectedRecord.status].bgGlow}`}
              >
                <p className="text-sm text-gray-500">Overall Score</p>
                <p className="text-2xl font-bold">
                  <span className={STATUS_CONFIG[selectedRecord.status].textColor}>
                    {Number(selectedRecord.avgScore).toFixed(2)}
                  </span>
                  <span className="text-sm font-normal text-gray-400">/10</span>
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Criteria Breakdown
              </h4>
              <div className="space-y-2.5">
                {PERFORMANCE_CRITERIA.filter(
                  (c) => selectedRecord.scores?.[c.id] !== undefined,
                ).map((criteria) => {
                  const value = Number(selectedRecord.scores[criteria.id]) || 0;
                  return (
                    <div
                      key={criteria.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3"
                    >
                      <span className="sm:w-44 shrink-0 text-sm text-gray-600">
                        {criteria.name}
                      </span>
                      <div className="flex flex-1 items-center gap-3">
                        <div
                          className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={10}
                          aria-valuenow={value}
                          aria-label={criteria.name}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${
                              value >= 8
                                ? "bg-green-500"
                                : value >= 6
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${value * 10}%` }}
                          />
                        </div>
                        <span className="w-12 text-sm font-semibold text-right text-gray-900">
                          {value}
                          <span className="text-xs font-normal text-gray-400">/10</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Remarks</h4>
              {selectedRecord.remarks ? (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-xl whitespace-pre-line text-pretty">
                  {selectedRecord.remarks}
                </p>
              ) : (
                <p className="text-gray-400 italic bg-gray-50 p-4 rounded-xl">
                  No remarks were added for this review.
                </p>
              )}
            </div>

            <div className="flex justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
              <span>Reviewed by: {selectedRecord.reviewedBy}</span>
              <span>Date: {selectedRecord.reviewedAt}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setDeleteId(null);
        }}
        title="Delete Performance Record"
        message="Are you sure you want to delete this performance record? This action cannot be undone."
        confirmText="Yes, Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
