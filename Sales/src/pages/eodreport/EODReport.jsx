import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import EODFilters from "../../components/eodreport/EODFilters";
import EODTable from "../../components/eodreport/EODTable";
import EODForm from "../../components/eodreport/EODForm";
import API from "../../api/axios";

export default function EODReport() {
  const [stats, setStats] = useState({
    submitted: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "",
    department: "",
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.date) params.append("date", filters.date);
      if (filters.status) params.append("status", filters.status);
      if (filters.department) params.append("department", filters.department);

      const res = await API.get(`/sales/eod-reports?${params}`);

      const data = res?.data?.data || res?.data || [];
      setRows(data);
      calculateStats(data);
    } catch (err) {
      toast.error(`EOD reports fetch error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const submitted = data.filter((r) => r.status === "submitted").length;
    const pending = data.filter((r) => r.status === "pending").length;
    const approved = data.filter((r) => r.status === "approved").length;
    const rejected = data.filter((r) => r.status === "rejected").length;

    setStats({ submitted, pending, approved, rejected });
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  return (
    <div className="space-y-6">
      <PageHeader title="EOD Report" desc="Track daily work summaries" />
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Create EOD
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Submitted Today"
          value={stats.submitted}
          subText="Reports submitted"
          gradient="bg-gradient-to-tr from-blue-500 to-cyan-500"
          icon="📤"
        />

        <StatCard
          title="Pending Review"
          value={stats.pending}
          subText="Awaiting approval"
          gradient="bg-gradient-to-tr from-yellow-500 to-orange-500"
          icon="⏳"
        />

        <StatCard
          title="Approved"
          value={stats.approved}
          subText="Reports approved"
          gradient="bg-gradient-to-tr from-emerald-500 to-teal-500"
          icon="✅"
        />

        <StatCard
          title="Rejected"
          value={stats.rejected}
          subText="Need revision"
          gradient="bg-gradient-to-tr from-red-500 to-pink-500"
          icon="❌"
        />
      </div>
      <EODTable rows={rows} loading={loading} onRefresh={fetchReports} />

      {showForm && (
        <EODForm onClose={() => setShowForm(false)} onSuccess={fetchReports} />
      )}
    </div>
  );
}
